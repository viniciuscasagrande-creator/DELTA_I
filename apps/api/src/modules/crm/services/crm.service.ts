import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { roundCurrency, TenantExecutionContext } from '@delta-erp/shared';
import { CoreSecurityPolicy } from '../../../core/permissions/permission.guard';

export interface ProposalPricingInput {
  grossAmount: number;
  discountAmount?: number;
  commissionRatePct?: number;
  probabilityPct?: number;
}

export interface ProposalPricingBreakdown {
  grossAmount: number;
  discountAmount: number;
  discountPct: number;
  netAmount: number;
  commissionRatePct: number;
  commissionAmount: number;
  probabilityPct: number;
  weightedForecastAmount: number;
}

export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Motor de Precificação Comercial, Desconto Máximo (Política Comercial <= 30%),
   * Comissão de Vendedores e Forecast Ponderado de Pipeline.
   */
  static calculateProposalPricing(input: ProposalPricingInput): ProposalPricingBreakdown {
    const grossAmount = roundCurrency(input.grossAmount);
    const discountAmount = roundCurrency(input.discountAmount || 0);
    if (grossAmount <= 0) {
      throw new Error('O valor bruto da proposta comercial deve ser maior que zero.');
    }
    if (discountAmount < 0 || discountAmount >= grossAmount) {
      throw new Error('Desconto comercial inválido para o valor da proposta.');
    }

    const discountPct = roundCurrency((discountAmount / grossAmount) * 100);
    if (discountPct > 30) {
      throw new Error(
        `Desconto comercial de ${discountPct}% excede o limite de política comercial (máximo 30%).`
      );
    }

    const netAmount = roundCurrency(grossAmount - discountAmount);
    const commissionRatePct = Number(input.commissionRatePct ?? 5.0);
    const commissionAmount = roundCurrency(netAmount * (commissionRatePct / 100));
    const probabilityPct = Math.min(100, Math.max(0, Math.round(input.probabilityPct ?? 60)));
    const weightedForecastAmount = roundCurrency(netAmount * (probabilityPct / 100));

    return {
      grossAmount,
      discountAmount,
      discountPct,
      netAmount,
      commissionRatePct,
      commissionAmount,
      probabilityPct,
      weightedForecastAmount,
    };
  }

  /**
   * Cadastra um novo Cliente Corporativo (B2B/B2C) com Limite de Crédito,
   * Auditoria e Evento de Domínio no Outbox.
   */
  async createCustomer(input: {
    companyCode: string;
    roleCode?: string;
    code: string;
    legalName: string;
    tradeName?: string;
    taxId: string;
    email: string;
    segment?: string;
    creditLimit: number;
  }) {
    const company = await this.prisma.company.findFirst({
      where: { code: input.companyCode },
    });
    if (!company) {
      throw new Error(`Empresa ${input.companyCode} não localizada.`);
    }

    const sub = await this.prisma.tenantModuleSubscription.findUnique({
      where: {
        tenantId_companyId_moduleCode: {
          tenantId: company.tenantId,
          companyId: company.id,
          moduleCode: 'CRM',
        },
      },
    });
    if (sub && !sub.isEnabled) {
      throw new Error(`O módulo CRM está desativado para a empresa ${company.code}.`);
    }

    const actor = await this.prisma.user.findFirst({
      where: { tenantId: company.tenantId },
      orderBy: { createdAt: 'asc' },
    });

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          code: input.code.trim().toUpperCase(),
          legalName: input.legalName.trim(),
          tradeName: (input.tradeName || input.legalName).trim(),
          taxId: input.taxId.trim(),
          email: input.email.trim().toLowerCase(),
          segment: input.segment || 'ENTERPRISE',
          creditLimit: roundCurrency(input.creditLimit),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          userId: actor?.id,
          moduleCode: 'CRM',
          action: 'CREATE_CUSTOMER',
          entityName: 'Customer',
          entityId: customer.id,
          newValues: {
            code: customer.code,
            legalName: customer.legalName,
            taxId: customer.taxId,
            creditLimit: Number(customer.creditLimit),
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          aggregateType: 'Customer',
          aggregateId: customer.id,
          eventType: 'crm.customer.created',
          payload: {
            customerId: customer.id,
            code: customer.code,
            legalName: customer.legalName,
            creditLimit: Number(customer.creditLimit),
          },
          status: 'PUBLISHED',
          processedAt: new Date(),
        },
      });

      return customer;
    });
  }

  /**
   * Cria uma nova Oportunidade / Proposta Comercial no Funil CRM com validação
   * de Limite de Crédito do Cliente e cálculo automático de Comissão.
   */
  async createOpportunity(input: {
    companyCode: string;
    roleCode?: string;
    customerId: string;
    code: string;
    title: string;
    salespersonName: string;
    stage?: 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION';
    probabilityPct?: number;
    grossAmount: number;
    discountAmount?: number;
    commissionRatePct?: number;
  }) {
    const company = await this.prisma.company.findFirst({
      where: { code: input.companyCode },
    });
    if (!company) {
      throw new Error(`Empresa ${input.companyCode} não localizada.`);
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: input.customerId, companyId: company.id },
    });
    if (!customer) {
      throw new Error('Cliente não encontrado para a empresa selecionada.');
    }

    const pricing = CrmService.calculateProposalPricing({
      grossAmount: input.grossAmount,
      discountAmount: input.discountAmount,
      commissionRatePct: input.commissionRatePct,
      probabilityPct: input.probabilityPct,
    });

    if (pricing.netAmount > Number(customer.creditLimit)) {
      throw new Error(
        `Valor líquido da proposta (R$ ${pricing.netAmount.toFixed(
          2
        )}) excede o limite de crédito aprovado do cliente ${customer.tradeName} (R$ ${Number(
          customer.creditLimit
        ).toFixed(2)}).`
      );
    }

    const actor = await this.prisma.user.findFirst({
      where: { tenantId: company.tenantId },
      orderBy: { createdAt: 'asc' },
    });

    return this.prisma.$transaction(async (tx) => {
      const opportunity = await tx.salesOpportunity.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          customerId: customer.id,
          code: input.code.trim().toUpperCase(),
          title: input.title.trim(),
          salespersonName: input.salespersonName.trim(),
          stage: input.stage || 'PROPOSAL',
          probabilityPct: pricing.probabilityPct,
          grossAmount: pricing.grossAmount,
          discountAmount: pricing.discountAmount,
          netAmount: pricing.netAmount,
          commissionRatePct: pricing.commissionRatePct,
          commissionAmount: pricing.commissionAmount,
          expectedCloseDate: new Date(Date.now() + 20 * 86400000),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          userId: actor?.id,
          moduleCode: 'CRM',
          action: 'CREATE_OPPORTUNITY',
          entityName: 'SalesOpportunity',
          entityId: opportunity.id,
          newValues: {
            code: opportunity.code,
            customer: customer.tradeName,
            stage: opportunity.stage,
            netAmount: pricing.netAmount,
            commissionAmount: pricing.commissionAmount,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          aggregateType: 'SalesOpportunity',
          aggregateId: opportunity.id,
          eventType: 'crm.opportunity.created',
          payload: {
            opportunityId: opportunity.id,
            code: opportunity.code,
            customerId: customer.id,
            netAmount: pricing.netAmount,
          },
          status: 'PUBLISHED',
          processedAt: new Date(),
        },
      });

      return { opportunity, pricing };
    });
  }

  /**
   * Fecha e Fatura uma Oportunidade Comercial (CLOSED_WON) em transação ACID única:
   * 1. Atualiza o estágio da oportunidade para CLOSED_WON (100% probabilidade);
   * 2. Gera Título em Contas a Receber (AccountReceivable) para o cliente;
   * 3. Gera Título em Contas a Pagar (AccountPayable) + Alçada Workflow para a Comissão do Vendedor;
   * 4. Posta Lançamento Contábil de Partidas Dobradas na DRE (Reconhecimento de Receita Operacional).
   */
  async winOpportunityAndBill(input: {
    opportunityId: string;
    roleCode?: string;
    companyCode?: string;
    context?: TenantExecutionContext;
  }) {
    const opp = await this.prisma.salesOpportunity.findUnique({
      where: { id: input.opportunityId },
      include: { customer: true, company: true },
    });

    if (!opp) {
      throw new Error('Oportunidade comercial não localizada.');
    }
    if (input.context) {
      CoreSecurityPolicy.assertTenantAndCompanyIsolation(
        input.context,
        opp.tenantId,
        opp.companyId
      );
    }
    if (input.companyCode && opp.company && opp.company.code !== input.companyCode) {
      throw new Error(
        `FORBIDDEN_CROSS_COMPANY_ACCESS: Oportunidade (${opp.id}) pertence a outra empresa.`
      );
    }
    if (opp.stage === 'CLOSED_WON') {
      throw new Error(`A oportunidade ${opp.code} já foi fechada e faturada anteriormente.`);
    }

    const company = opp.company;
    const actor = await this.prisma.user.findFirst({
      where: { tenantId: company.tenantId },
      orderBy: { createdAt: 'asc' },
    });
    if (!actor) {
      throw new Error('Usuário operador não localizado.');
    }

    let revCategory = await this.prisma.financialCategory.findFirst({
      where: { companyId: company.id, nature: 'REVENUE' },
    });
    if (!revCategory) {
      revCategory = await this.prisma.financialCategory.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          code: 'CAT-REC-CRM',
          name: 'Receita Comercial de Contratos & Licenciamento',
          nature: 'REVENUE',
        },
      });
    }

    let expCategory = await this.prisma.financialCategory.findFirst({
      where: { companyId: company.id, nature: 'EXPENSE' },
    });
    if (!expCategory) {
      expCategory = await this.prisma.financialCategory.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          code: 'CAT-COM-CRM',
          name: 'Comissões Comerciais sobre Vendas',
          nature: 'EXPENSE',
        },
      });
    }

    let clientAssetAccount = await this.prisma.chartOfAccount.findFirst({
      where: { companyId: company.id, nature: 'ASSET', isAnalytical: true },
      orderBy: { code: 'desc' },
    });
    if (!clientAssetAccount) {
      clientAssetAccount = await this.prisma.chartOfAccount.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          code: '1.1.02.001',
          name: 'Clientes — Contas a Receber Comercial',
          nature: 'ASSET',
          isAnalytical: true,
        },
      });
    }

    let revenueAccount = await this.prisma.chartOfAccount.findFirst({
      where: { companyId: company.id, nature: 'REVENUE', isAnalytical: true },
    });
    if (!revenueAccount) {
      revenueAccount = await this.prisma.chartOfAccount.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          code: '4.1.01.001',
          name: 'Receita Operacional Bruta de Vendas e Serviços',
          nature: 'REVENUE',
          isAnalytical: true,
        },
      });
    }

    const netAmount = roundCurrency(Number(opp.netAmount));
    const commissionAmount = roundCurrency(Number(opp.commissionAmount));
    const today = new Date();
    const dueDate = new Date(Date.now() + 15 * 86400000);

    return this.prisma.$transaction(async (tx) => {
      // 1. Cria Conta a Receber (AccountReceivable) do Faturamento Comercial
      const receivable = await tx.accountReceivable.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          categoryId: revCategory.id,
          documentNumber: `FAT-${opp.code}`,
          customerName: opp.customer.legalName,
          customerTaxId: opp.customer.taxId,
          description: `Faturamento Comercial ${opp.code} — ${opp.title}`,
          originModule: 'CRM',
          originReferenceId: opp.id,
          issueDate: today,
          dueDate,
          competenceDate: today,
          grossAmount: Number(opp.grossAmount),
          discountAmount: Number(opp.discountAmount),
          acquirerFeeAmount: 0,
          netAmount,
          status: 'APPROVED',
          idempotencyKey: `CRM-REC-${company.code}-${opp.code}`,
          createdById: actor.id,
        },
      });

      // 2. Cria Conta a Pagar (AccountPayable) + Workflow para a Comissão do Vendedor
      const commissionPayable = await tx.accountPayable.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          categoryId: expCategory.id,
          documentNumber: `COM-${opp.code}`,
          supplierName: `Comissão Comercial — ${opp.salespersonName}`,
          supplierTaxId: '000.000.000-00',
          description: `Comissão (${Number(opp.commissionRatePct)}%) s/ Contrato ${opp.code} (${opp.customer.tradeName})`,
          originModule: 'CRM',
          originReferenceId: opp.id,
          issueDate: today,
          dueDate,
          competenceDate: today,
          grossAmount: commissionAmount,
          discountAmount: 0,
          interestAmount: 0,
          taxRetainedAmount: 0,
          netAmount: commissionAmount,
          status: 'PENDING_APPROVAL',
          idempotencyKey: `CRM-COM-${company.code}-${opp.code}`,
          createdById: actor.id,
        },
      });

      const workflow = await tx.workflowInstance.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          moduleCode: 'CRM',
          entityType: 'ACCOUNT_PAYABLE',
          entityId: commissionPayable.id,
          referenceAmount: commissionAmount,
          status: 'PENDING',
          requestedById: actor.id,
          decisionNotes: `Aprovar Comissão Comercial ${opp.code} — ${opp.salespersonName}`,
        },
      });

      // 3. Contabiliza o Faturamento Comercial no Livro Diário / DRE (Partidas Dobradas)
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
          originModule: 'CRM',
          originReferenceId: opp.id,
          description: `Faturamento Comercial ${opp.code} — ${opp.customer.tradeName} (${opp.title})`,
          status: 'POSTED',
          totalDebit: netAmount,
          totalCredit: netAmount,
          idempotencyKey: `CRM-JE-${company.code}-${opp.code}`,
          createdById: actor.id,
          lines: {
            create: [
              {
                chartOfAccountId: clientAssetAccount.id,
                memo: `Contas a Receber Cliente ${opp.customer.tradeName} (${opp.code})`,
                debitAmount: netAmount,
                creditAmount: 0,
              },
              {
                chartOfAccountId: revenueAccount.id,
                memo: `Receita de Contrato Comercial ${opp.code} — ${opp.title}`,
                debitAmount: 0,
                creditAmount: netAmount,
              },
            ],
          },
        },
      });

      // 4. Atualiza Oportunidade para CLOSED_WON com os vínculos rastreáveis
      const updatedOpp = await tx.salesOpportunity.update({
        where: { id: opp.id },
        data: {
          stage: 'CLOSED_WON',
          probabilityPct: 100,
          closedAt: new Date(),
          linkedReceivableId: receivable.id,
          linkedPayableId: commissionPayable.id,
          linkedJournalEntryId: journalEntry.id,
        },
      });

      // 5. Auditoria e Outbox
      await tx.auditLog.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          userId: actor.id,
          moduleCode: 'CRM',
          action: 'WIN_OPPORTUNITY_AND_BILL',
          entityName: 'SalesOpportunity',
          entityId: opp.id,
          previousValues: { stage: opp.stage, probabilityPct: opp.probabilityPct },
          newValues: {
            stage: 'CLOSED_WON',
            netAmount,
            commissionAmount,
            receivableId: receivable.id,
            commissionPayableId: commissionPayable.id,
            journalEntryNumber: journalEntry.entryNumber,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          aggregateType: 'SalesOpportunity',
          aggregateId: opp.id,
          eventType: 'crm.opportunity.won',
          payload: {
            opportunityCode: opp.code,
            customerName: opp.customer.legalName,
            netAmount,
            commissionAmount,
            receivableId: receivable.id,
            commissionPayableId: commissionPayable.id,
            workflowId: workflow.id,
            journalEntryId: journalEntry.id,
          },
          status: 'PUBLISHED',
          processedAt: new Date(),
        },
      });

      return {
        opportunity: updatedOpp,
        receivable,
        commissionPayable,
        workflow,
        journalEntry,
      };
    });
  }

  /**
   * Retorna resumo consolidado do Módulo 06 (Comercial & CRM):
   * Clientes, Funil de Oportunidades, Forecast Ponderado, Receita Ganha e Comissões.
   */
  async getCrmSummary(companyCode: string, context?: TenantExecutionContext) {
    const company = context
      ? await this.prisma.company.findFirst({
          where: { id: context.companyId, tenantId: context.tenantId },
        })
      : await this.prisma.company.findFirst({
          where: { code: companyCode },
        });
    if (!company) {
      throw new Error(`Empresa ${companyCode} não encontrada.`);
    }
    if (context) {
      CoreSecurityPolicy.assertTenantAndCompanyIsolation(context, company.tenantId, company.id);
    }

    const [customers, opportunities] = await Promise.all([
      this.prisma.customer.findMany({
        where: { tenantId: company.tenantId, companyId: company.id },
        orderBy: { code: 'asc' },
      }),
      this.prisma.salesOpportunity.findMany({
        where: { tenantId: company.tenantId, companyId: company.id },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const openOpps = opportunities.filter(
      (o) => o.stage !== 'CLOSED_WON' && o.stage !== 'CLOSED_LOST'
    );
    const wonOpps = opportunities.filter((o) => o.stage === 'CLOSED_WON');

    const pipelineOpenTotal = roundCurrency(
      openOpps.reduce((acc, o) => acc + Number(o.netAmount), 0)
    );
    const weightedForecastTotal = roundCurrency(
      openOpps.reduce(
        (acc, o) => acc + Number(o.netAmount) * (o.probabilityPct / 100),
        0
      )
    );
    const wonRevenueTotal = roundCurrency(
      wonOpps.reduce((acc, o) => acc + Number(o.netAmount), 0)
    );
    const commissionsTotal = roundCurrency(
      opportunities.reduce((acc, o) => acc + Number(o.commissionAmount), 0)
    );

    return {
      kpis: {
        customersCount: customers.length,
        totalCreditLimit: roundCurrency(
          customers.reduce((acc, c) => acc + Number(c.creditLimit), 0)
        ),
        openOpportunitiesCount: openOpps.length,
        wonOpportunitiesCount: wonOpps.length,
        pipelineOpenTotal,
        weightedForecastTotal,
        wonRevenueTotal,
        commissionsTotal,
      },
      customers: customers.map((c) => ({
        id: c.id,
        code: c.code,
        legalName: c.legalName,
        tradeName: c.tradeName,
        taxId: c.taxId,
        email: c.email,
        segment: c.segment,
        creditLimit: Number(c.creditLimit),
      })),
      opportunities: opportunities.map((o) => ({
        id: o.id,
        code: o.code,
        title: o.title,
        customerName: o.customer.tradeName,
        customerId: o.customerId,
        salespersonName: o.salespersonName,
        stage: o.stage,
        probabilityPct: o.probabilityPct,
        grossAmount: Number(o.grossAmount),
        discountAmount: Number(o.discountAmount),
        netAmount: Number(o.netAmount),
        commissionRatePct: Number(o.commissionRatePct),
        commissionAmount: Number(o.commissionAmount),
        linkedReceivableId: o.linkedReceivableId,
        linkedPayableId: o.linkedPayableId,
        linkedJournalEntryId: o.linkedJournalEntryId,
      })),
    };
  }
}
