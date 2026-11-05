import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { roundCurrency, TenantExecutionContext } from '@delta-erp/shared';
import { CoreSecurityPolicy } from '../../../core/permissions/permission.guard';

export interface QuotationMapInput {
  quote1Amount: number;
  quote2Amount?: number;
  quote3Amount?: number;
  freightAmount?: number;
}

export interface QuotationMapBreakdown {
  quote1Amount: number;
  quote2Amount: number;
  quote3Amount: number;
  highestQuoteAmount: number;
  lowestQuoteAmount: number;
  negotiatedSavings: number;
  savingsPct: number;
  freightAmount: number;
  totalAmount: number;
}

export class PurchasingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Motor de Mapa Comparativo de Cotações (3 Cotações):
   * Valida a menor proposta comercial, apura o Saving de Compras (economia negociada)
   * em relação à maior cotação concorrente e consolida o valor total com frete.
   */
  static evaluateQuotationMap(input: QuotationMapInput): QuotationMapBreakdown {
    const q1 = roundCurrency(input.quote1Amount);
    const q2 = roundCurrency(input.quote2Amount || 0);
    const q3 = roundCurrency(input.quote3Amount || 0);
    const freightAmount = roundCurrency(input.freightAmount || 0);

    if (q1 <= 0) {
      throw new Error('O valor da cotação vencedora deve ser maior que zero.');
    }
    if (freightAmount < 0) {
      throw new Error('O valor do frete não pode ser negativo.');
    }

    const validQuotes = [q1, q2, q3].filter((q) => q > 0);
    const lowestQuoteAmount = Math.min(...validQuotes);
    const highestQuoteAmount = Math.max(...validQuotes);

    if (q1 > lowestQuoteAmount) {
      throw new Error(
        `Política de Compras: A cotação selecionada (R$ ${q1.toFixed(
          2
        )}) é superior à menor cotação homologada no mapa comparativo (R$ ${lowestQuoteAmount.toFixed(
          2
        )}).`
      );
    }

    const negotiatedSavings = roundCurrency(highestQuoteAmount - lowestQuoteAmount);
    const savingsPct =
      highestQuoteAmount > 0
        ? roundCurrency((negotiatedSavings / highestQuoteAmount) * 100)
        : 0;
    const totalAmount = roundCurrency(lowestQuoteAmount + freightAmount);

    return {
      quote1Amount: q1,
      quote2Amount: q2,
      quote3Amount: q3,
      highestQuoteAmount,
      lowestQuoteAmount,
      negotiatedSavings,
      savingsPct,
      freightAmount,
      totalAmount,
    };
  }

  /**
   * Homologa um novo Fornecedor Corporativo com nota de SLA/Qualidade e Prazo de Pagamento.
   */
  async createSupplier(input: {
    companyCode: string;
    code: string;
    legalName: string;
    tradeName?: string;
    taxId: string;
    email: string;
    category?: string;
    ratingScore?: number;
    paymentTermsDays?: number;
  }) {
    const company = await this.prisma.company.findFirst({
      where: { code: input.companyCode },
    });
    if (!company) {
      throw new Error(`Empresa ${input.companyCode} não localizada.`);
    }

    const actor = await this.prisma.user.findFirst({
      where: { tenantId: company.tenantId },
      orderBy: { createdAt: 'asc' },
    });

    const ratingScore = roundCurrency(input.ratingScore ?? 9.5);
    const isHomologated = ratingScore >= 6.0;

    return this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          code: input.code.trim().toUpperCase(),
          legalName: input.legalName.trim(),
          tradeName: (input.tradeName || input.legalName).trim(),
          taxId: input.taxId.trim(),
          email: input.email.trim().toLowerCase(),
          category: input.category || 'CLOUD_INFRASTRUCTURE',
          ratingScore,
          isHomologated,
          paymentTermsDays: Number(input.paymentTermsDays || 30),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          userId: actor?.id,
          moduleCode: 'PURCHASING',
          action: 'HOMOLOGATE_SUPPLIER',
          entityName: 'Supplier',
          entityId: supplier.id,
          newValues: {
            code: supplier.code,
            legalName: supplier.legalName,
            ratingScore: Number(supplier.ratingScore),
            isHomologated: supplier.isHomologated,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          aggregateType: 'Supplier',
          aggregateId: supplier.id,
          eventType: 'purchasing.supplier.homologated',
          payload: {
            supplierId: supplier.id,
            code: supplier.code,
            legalName: supplier.legalName,
            ratingScore: Number(supplier.ratingScore),
          },
          status: 'PUBLISHED',
          processedAt: new Date(),
        },
      });

      return supplier;
    });
  }

  /**
   * Emite um Pedido de Compra (PurchaseOrder) após validar o Mapa de Cotações
   * e abre instância de aprovação no Motor de Workflow.
   */
  async createPurchaseOrder(input: {
    companyCode: string;
    supplierId: string;
    code: string;
    description: string;
    requesterName: string;
    quote1Amount: number;
    quote2Amount?: number;
    quote3Amount?: number;
    freightAmount?: number;
  }) {
    const company = await this.prisma.company.findFirst({
      where: { code: input.companyCode },
    });
    if (!company) {
      throw new Error(`Empresa ${input.companyCode} não localizada.`);
    }

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: input.supplierId, companyId: company.id },
    });
    if (!supplier) {
      throw new Error('Fornecedor não localizado para a empresa ativa.');
    }
    if (!supplier.isHomologated || Number(supplier.ratingScore) < 6.0) {
      throw new Error(
        `Fornecedor ${supplier.tradeName} bloqueado pelo compliance de suprimentos (Score ISO/SLA abaixo de 6.0).`
      );
    }

    const quotation = PurchasingService.evaluateQuotationMap({
      quote1Amount: input.quote1Amount,
      quote2Amount: input.quote2Amount,
      quote3Amount: input.quote3Amount,
      freightAmount: input.freightAmount,
    });

    const actor = await this.prisma.user.findFirst({
      where: { tenantId: company.tenantId },
      orderBy: { createdAt: 'asc' },
    });
    if (!actor) {
      throw new Error('Usuário operador não localizado.');
    }

    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          supplierId: supplier.id,
          code: input.code.trim().toUpperCase(),
          description: input.description.trim(),
          requesterName: input.requesterName.trim(),
          quote1Amount: quotation.quote1Amount,
          quote2Amount: quotation.quote2Amount,
          quote3Amount: quotation.quote3Amount,
          negotiatedSavings: quotation.negotiatedSavings,
          freightAmount: quotation.freightAmount,
          totalAmount: quotation.totalAmount,
          status: 'PENDING_APPROVAL',
          expectedDeliveryDate: new Date(Date.now() + 14 * 86400000),
        },
      });

      const workflow = await tx.workflowInstance.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          moduleCode: 'PURCHASING',
          entityType: 'PURCHASE_ORDER',
          entityId: po.id,
          referenceAmount: quotation.totalAmount,
          status: 'PENDING',
          requestedById: actor.id,
          decisionNotes: `Aprovar Pedido de Compra ${po.code} — ${supplier.tradeName} (Saving R$ ${quotation.negotiatedSavings.toFixed(
            2
          )})`,
        },
      });

      const updatedPo = await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { linkedWorkflowId: workflow.id },
      });

      await tx.auditLog.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          userId: actor.id,
          moduleCode: 'PURCHASING',
          action: 'CREATE_PURCHASE_ORDER',
          entityName: 'PurchaseOrder',
          entityId: po.id,
          newValues: {
            code: po.code,
            supplier: supplier.tradeName,
            totalAmount: quotation.totalAmount,
            negotiatedSavings: quotation.negotiatedSavings,
            workflowId: workflow.id,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          aggregateType: 'PurchaseOrder',
          aggregateId: po.id,
          eventType: 'purchasing.order.created',
          payload: {
            purchaseOrderId: po.id,
            code: po.code,
            supplierName: supplier.legalName,
            totalAmount: quotation.totalAmount,
            negotiatedSavings: quotation.negotiatedSavings,
          },
          status: 'PUBLISHED',
          processedAt: new Date(),
        },
      });

      return { purchaseOrder: updatedPo, quotation, workflow };
    });
  }

  /**
   * Aprova e Recebe o Pedido de Compra (PO) em transação ACID única:
   * 1. Valida Alçada ABAC do Perfil Operacional (maxApprovalAmount >= totalAmount);
   * 2. Gera Título em Contas a Pagar (AccountPayable — APPROVED) para o fornecedor;
   * 3. Contabiliza Partida Dobrada no Livro Diário / DRE (Suprimentos/Custos vs Fornecedores a Pagar);
   * 4. Atualiza o Pedido de Compra para RECEIVED.
   */
  async approveAndReceivePurchaseOrder(input: {
    purchaseOrderId: string;
    roleCode?: string;
    companyCode?: string;
    context?: TenantExecutionContext;
  }) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      include: { supplier: true, company: true },
    });
    if (!po) {
      throw new Error('Pedido de Compra (PO) não encontrado.');
    }
    if (input.context) {
      CoreSecurityPolicy.assertTenantAndCompanyIsolation(
        input.context,
        po.tenantId,
        po.companyId
      );
    }
    if (input.companyCode && po.company && po.company.code !== input.companyCode) {
      throw new Error(
        `FORBIDDEN_CROSS_COMPANY_ACCESS: Pedido de Compra (${po.id}) pertence a outra empresa.`
      );
    }
    if (po.status === 'RECEIVED') {
      throw new Error(`O Pedido de Compra ${po.code} já foi aprovado e recebido anteriormente.`);
    }

    const company = po.company;
    const roleCode = input.roleCode || 'FINANCIAL_MANAGER';
    const role = await this.prisma.role.findFirst({
      where: { tenantId: company.tenantId, code: roleCode },
    });
    const maxApprovalAmount = role
      ? Number(role.maxApprovalAmount)
      : roleCode === 'FINANCIAL_MANAGER'
      ? 50000
      : 999999999;

    const totalAmount = roundCurrency(Number(po.totalAmount));
    if (totalAmount > maxApprovalAmount) {
      throw new Error(
        `ABAC_LIMIT_EXCEEDED: O Pedido de Compra ${po.code} (R$ ${totalAmount.toFixed(
          2
        )}) excede a alçada de aprovação do perfil ${roleCode} (R$ ${maxApprovalAmount.toFixed(
          2
        )}). Selecione DIRECTOR ou SUPER_ADMIN.`
      );
    }

    const actor = await this.prisma.user.findFirst({
      where: { tenantId: company.tenantId },
      orderBy: { createdAt: 'asc' },
    });
    if (!actor) {
      throw new Error('Usuário operador não localizado.');
    }

    let expCategory = await this.prisma.financialCategory.findFirst({
      where: { companyId: company.id, nature: 'EXPENSE' },
    });
    if (!expCategory) {
      expCategory = await this.prisma.financialCategory.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          code: 'CAT-SUP-PO',
          name: 'Aquisição de Materiais, Tecnologia e Suprimentos',
          nature: 'EXPENSE',
        },
      });
    }

    let expenseAccount = await this.prisma.chartOfAccount.findFirst({
      where: { companyId: company.id, nature: 'EXPENSE', isAnalytical: true },
    });
    if (!expenseAccount) {
      expenseAccount = await this.prisma.chartOfAccount.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          code: '3.1.02.001',
          name: 'Custos e Despesas com Suprimentos e Infraestrutura',
          nature: 'EXPENSE',
          isAnalytical: true,
        },
      });
    }

    let supplierLiabilityAccount = await this.prisma.chartOfAccount.findFirst({
      where: { companyId: company.id, nature: 'LIABILITY', isAnalytical: true },
    });
    if (!supplierLiabilityAccount) {
      supplierLiabilityAccount = await this.prisma.chartOfAccount.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          code: '2.1.02.001',
          name: 'Fornecedores Nacionais a Pagar',
          nature: 'LIABILITY',
          isAnalytical: true,
        },
      });
    }

    const today = new Date();
    const dueDate = new Date(
      Date.now() + (po.supplier.paymentTermsDays || 30) * 86400000
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Cria Título Aprovado em Contas a Pagar para Liquidação na Tesouraria
      const payable = await tx.accountPayable.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          categoryId: expCategory.id,
          documentNumber: po.code,
          supplierName: po.supplier.legalName,
          supplierTaxId: po.supplier.taxId,
          description: `Recebimento Pedido de Compra ${po.code} — ${po.description}`,
          originModule: 'PURCHASING',
          originReferenceId: po.id,
          issueDate: today,
          dueDate,
          competenceDate: today,
          grossAmount: totalAmount,
          discountAmount: 0,
          interestAmount: 0,
          taxRetainedAmount: 0,
          netAmount: totalAmount,
          status: 'APPROVED',
          approvedById: actor.id,
          approvedAt: today,
          idempotencyKey: `PUR-PAY-${company.code}-${po.code}`,
          createdById: actor.id,
        },
      });

      if (po.linkedWorkflowId) {
        await tx.workflowInstance.update({
          where: { id: po.linkedWorkflowId },
          data: {
            status: 'APPROVED',
            decidedById: actor.id,
            decidedAt: today,
            decisionNotes: `Aprovado na alçada ${roleCode} e integrado ao Contas a Pagar`,
          },
        });
      }

      // 2. Contabiliza no Livro Diário / DRE
      const lastEntry = await tx.journalEntry.findFirst({
        where: { companyId: company.id },
        orderBy: { entryNumber: 'desc' },
      });
      const nextEntryNumber = (lastEntry?.entryNumber ?? 1000) + 1;

      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          entryNumber: nextEntryNumber,
          competenceDate: today,
          postingDate: today,
          originModule: 'PURCHASING',
          originReferenceId: po.id,
          description: `Recebimento Físico/Financeiro ${po.code} — ${po.supplier.tradeName}`,
          status: 'POSTED',
          totalDebit: totalAmount,
          totalCredit: totalAmount,
          idempotencyKey: `PUR-JE-${company.code}-${po.code}`,
          createdById: actor.id,
          lines: {
            create: [
              {
                chartOfAccountId: expenseAccount.id,
                memo: `Suprimentos/Serviços Recebidos ${po.code} (${po.description})`,
                debitAmount: totalAmount,
                creditAmount: 0,
              },
              {
                chartOfAccountId: supplierLiabilityAccount.id,
                memo: `Obrigação Fornecedor ${po.supplier.tradeName} (${po.code})`,
                debitAmount: 0,
                creditAmount: totalAmount,
              },
            ],
          },
        },
      });

      // 3. Atualiza Pedido de Compra para RECEIVED
      const updatedPo = await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: 'RECEIVED',
          receivedAt: today,
          linkedPayableId: payable.id,
          linkedJournalEntryId: journalEntry.id,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          userId: actor.id,
          moduleCode: 'PURCHASING',
          action: 'APPROVE_AND_RECEIVE_PO',
          entityName: 'PurchaseOrder',
          entityId: po.id,
          previousValues: { status: po.status },
          newValues: {
            status: 'RECEIVED',
            approvedByRole: roleCode,
            payableId: payable.id,
            journalEntryNumber: journalEntry.entryNumber,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          aggregateType: 'PurchaseOrder',
          aggregateId: po.id,
          eventType: 'purchasing.order.received',
          payload: {
            purchaseOrderCode: po.code,
            supplierName: po.supplier.legalName,
            totalAmount,
            payableId: payable.id,
            journalEntryId: journalEntry.id,
          },
          status: 'PUBLISHED',
          processedAt: new Date(),
        },
      });

      return {
        purchaseOrder: updatedPo,
        payable,
        journalEntry,
      };
    });
  }

  /**
   * Retorna resumo consolidado do Módulo 07 (Compras e Suprimentos).
   */
  async getPurchasingSummary(companyCode: string, context?: TenantExecutionContext) {
    const company = context
      ? await this.prisma.company.findFirst({
          where: { id: context.companyId, tenantId: context.tenantId },
        })
      : await this.prisma.company.findFirst({
          where: { code: companyCode },
        });
    if (!company) {
      throw new Error(`Empresa ${companyCode} não localizada.`);
    }
    if (context) {
      CoreSecurityPolicy.assertTenantAndCompanyIsolation(context, company.tenantId, company.id);
    }

    const [suppliers, orders] = await Promise.all([
      this.prisma.supplier.findMany({
        where: { tenantId: company.tenantId, companyId: company.id },
        orderBy: { code: 'asc' },
      }),
      this.prisma.purchaseOrder.findMany({
        where: { tenantId: company.tenantId, companyId: company.id },
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const pendingOrders = orders.filter((o) => o.status === 'PENDING_APPROVAL');
    const receivedOrders = orders.filter((o) => o.status === 'RECEIVED');

    const pendingOrdersTotal = roundCurrency(
      pendingOrders.reduce((acc, o) => acc + Number(o.totalAmount), 0)
    );
    const receivedOrdersTotal = roundCurrency(
      receivedOrders.reduce((acc, o) => acc + Number(o.totalAmount), 0)
    );
    const totalNegotiatedSavings = roundCurrency(
      orders.reduce((acc, o) => acc + Number(o.negotiatedSavings), 0)
    );

    return {
      kpis: {
        suppliersCount: suppliers.length,
        homologatedSuppliersCount: suppliers.filter((s) => s.isHomologated).length,
        pendingOrdersCount: pendingOrders.length,
        receivedOrdersCount: receivedOrders.length,
        pendingOrdersTotal,
        receivedOrdersTotal,
        totalNegotiatedSavings,
      },
      suppliers: suppliers.map((s) => ({
        id: s.id,
        code: s.code,
        legalName: s.legalName,
        tradeName: s.tradeName,
        taxId: s.taxId,
        email: s.email,
        category: s.category,
        ratingScore: Number(s.ratingScore),
        isHomologated: s.isHomologated,
        paymentTermsDays: s.paymentTermsDays,
      })),
      orders: orders.map((o) => ({
        id: o.id,
        code: o.code,
        description: o.description,
        supplierName: o.supplier.tradeName,
        supplierId: o.supplierId,
        requesterName: o.requesterName,
        quote1Amount: Number(o.quote1Amount),
        quote2Amount: Number(o.quote2Amount),
        quote3Amount: Number(o.quote3Amount),
        negotiatedSavings: Number(o.negotiatedSavings),
        freightAmount: Number(o.freightAmount),
        totalAmount: Number(o.totalAmount),
        status: o.status,
        linkedPayableId: o.linkedPayableId,
        linkedJournalEntryId: o.linkedJournalEntryId,
      })),
    };
  }
}
