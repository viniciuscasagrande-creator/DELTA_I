/**
 * ============================================================================
 * ENTERPRISE ERP — MÓDULOS 10 & 11: VENDAS, EXPEDIÇÃO, GATEWAYS PIX/CARTÃO E MDR
 * ============================================================================
 * Implementa:
 * 1. Emissão de Pedido de Venda (SalesOrder) com baixa integrada de Estoque (CMV),
 *    faturamento financeiro (AccountReceivable), cálculo de comissão e lançamento
 *    contábil (Receita de Vendas + CMV vs Estoque).
 * 2. Liquidação via Gateways de Pagamento (PIX Instantâneo BACEN / Cartão 1x ou Parcelado)
 *    com cálculo automático de taxa MDR (Merchant Discount Rate), crédito líquido
 *    no saldo bancário (BankAccount) e baixa do título a receber.
 * 3. Gestão de Disputa de Chargeback com estorno bancário e registro contábil.
 */

import { PrismaClient } from '@prisma/client';

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface CreateSalesOrderInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  customerId: string;
  inventoryItemId?: string;
  orderNumber: string;
  salespersonName: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  commissionRatePct?: number;
  dueDate: Date;
}

export interface CaptureGatewayPaymentInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  receivableId?: string;
  bankAccountId: string;
  gatewayProvider?: string;
  externalNsuCode: string;
  paymentMethod: 'PIX_INSTANT' | 'CREDIT_CARD_1X' | 'CREDIT_CARD_INSTALLMENTS';
  installments?: number;
  grossAmount: number;
  customMdrRatePct?: number;
}

export interface GatewaySettlementPreview {
  grossAmount: number;
  mdrRatePct: number;
  mdrFeeAmount: number;
  netSettledAmount: number;
}

export class SalesAndPaymentsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Calcula a taxa MDR (Merchant Discount Rate) e o valor líquido de liquidação
   * conforme modalidade (PIX Instantâneo ~ 0,89%, Cartão 1x ~ 2,49%, Parcelado ~ 2,99% + 0,35%/parcela).
   */
  public calculateGatewaySettlement(
    grossAmount: number,
    paymentMethod: 'PIX_INSTANT' | 'CREDIT_CARD_1X' | 'CREDIT_CARD_INSTALLMENTS',
    installments = 1,
    customMdrRatePct?: number
  ): GatewaySettlementPreview {
    if (grossAmount <= 0) {
      throw new Error('ENTERPRISE_PAYMENTS_ERROR: Valor bruto da transação deve ser maior que zero.');
    }

    let defaultRate = 0.89;
    if (paymentMethod === 'CREDIT_CARD_1X') {
      defaultRate = 2.49;
    } else if (paymentMethod === 'CREDIT_CARD_INSTALLMENTS') {
      defaultRate = Number((2.99 + Math.max(0, installments - 1) * 0.35).toFixed(4));
    }

    const mdrRatePct = customMdrRatePct !== undefined ? customMdrRatePct : defaultRate;
    const mdrFeeAmount = roundCurrency(grossAmount * (mdrRatePct / 100));
    const netSettledAmount = roundCurrency(grossAmount - mdrFeeAmount);

    return {
      grossAmount: roundCurrency(grossAmount),
      mdrRatePct,
      mdrFeeAmount,
      netSettledAmount,
    };
  }

  /**
   * Emite e fatura um Pedido de Venda (Módulo 10):
   * - Se vinculado a um item de estoque (InventoryItem), valida saldo, baixa o estoque (Kardex) e apura o CMV.
   * - Gera o título em Contas a Receber (AccountReceivable).
   * - Contabiliza no Livro Diário (Contas a Receber vs Receita de Vendas).
   */
  async createAndInvoiceSalesOrder(input: CreateSalesOrderInput) {
    if (input.quantity <= 0 || input.unitPrice <= 0) {
      throw new Error('ENTERPRISE_SALES_ERROR: Quantidade e preço unitário devem ser positivos.');
    }

    const grossAmount = roundCurrency(input.quantity * input.unitPrice);
    const discountAmount = roundCurrency(input.discountAmount ?? 0);
    const netAmount = roundCurrency(grossAmount - discountAmount);
    const commissionRatePct = input.commissionRatePct ?? 5;
    const commissionAmount = roundCurrency(netAmount * (commissionRatePct / 100));

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: input.customerId, companyId: input.companyId },
      });

      if (!customer) {
        throw new Error('ENTERPRISE_SALES_ERROR: Cliente não encontrado na empresa ativa.');
      }

      let cmvAmount = 0;
      let linkedStockMoveId: string | undefined;

      // Baixa opcional de estoque com apuração de CMV pelo Custo Médio Ponderado Móvel
      if (input.inventoryItemId) {
        const item = await tx.inventoryItem.findFirst({
          where: { id: input.inventoryItemId, companyId: input.companyId },
        });
        if (!item) {
          throw new Error('ENTERPRISE_SALES_ERROR: SKU de estoque não localizado.');
        }

        const currentStock = Number(item.quantityOnHand);
        if (currentStock < input.quantity) {
          throw new Error(
            `ENTERPRISE_SALES_ERROR: Saldo de estoque insuficiente para o SKU ${item.sku} (Disponível: ${currentStock}, Solicitado: ${input.quantity}).`
          );
        }

        const avgCost = Number(item.averageUnitCost);
        cmvAmount = roundCurrency(input.quantity * avgCost);
        const balanceAfter = Number((currentStock - input.quantity).toFixed(4));
        const totalValueAfter = roundCurrency(balanceAfter * avgCost);

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            quantityOnHand: balanceAfter,
            totalStockValue: totalValueAfter,
          },
        });

        const stockMove = await tx.stockMovement.create({
          data: {
            tenantId: input.tenantId,
            companyId: input.companyId,
            itemId: item.id,
            movementType: 'OUTBOUND_REQUISITION',
            quantity: input.quantity,
            unitCost: avgCost,
            totalMovementValue: cmvAmount,
            resultingQtyOnHand: balanceAfter,
            resultingAvgCost: avgCost,
            referenceDocument: input.orderNumber,
            notes: `Expedição de Pedido de Venda ${input.orderNumber} — Cliente ${customer.legalName}`,
          },
        });

        linkedStockMoveId = stockMove.id;
      }

      // Garante Categoria Financeira de Receita
      let revCategory = await tx.financialCategory.findFirst({
        where: { companyId: input.companyId, code: 'REC-01.01' },
      });
      if (!revCategory) {
        revCategory = await tx.financialCategory.create({
          data: {
            tenantId: input.tenantId,
            companyId: input.companyId,
            code: 'REC-01.01',
            name: 'Receita de Vendas e Faturamento Comercial',
            nature: 'REVENUE',
          },
        });
      }

      const receivable = await tx.accountReceivable.create({
        data: {
          tenantId: input.tenantId,
          companyId: input.companyId,
          categoryId: revCategory.id,
          customerName: customer.legalName,
          customerTaxId: customer.taxId,
          documentNumber: `FAT-${input.orderNumber}`,
          description: `Faturamento Pedido de Venda ${input.orderNumber} — ${customer.legalName}`,
          originModule: 'SALES',
          issueDate: new Date(),
          dueDate: input.dueDate,
          competenceDate: new Date(),
          grossAmount,
          discountAmount,
          netAmount,
          status: 'APPROVED',
          idempotencyKey: `AR-SLS-${input.companyId}-${input.orderNumber}-${Date.now()}`,
          createdById: input.actorUserId,
        },
      });

      // Contabilização (Débito: Clientes a Receber 1.1.02.001 / Crédito: Receita de Vendas 3.1.01.001)
      let debitReceivableAcc = await tx.chartOfAccount.findFirst({
        where: { companyId: input.companyId, code: '1.1.02.001' },
      });
      if (!debitReceivableAcc) {
        debitReceivableAcc = await tx.chartOfAccount.create({
          data: {
            tenantId: input.tenantId,
            companyId: input.companyId,
            code: '1.1.02.001',
            name: 'Clientes — Duplicatas a Receber',
            nature: 'ASSET',
            isAnalytical: true,
          },
        });
      }

      let creditSalesAcc = await tx.chartOfAccount.findFirst({
        where: { companyId: input.companyId, code: '3.1.01.001' },
      });
      if (!creditSalesAcc) {
        creditSalesAcc = await tx.chartOfAccount.create({
          data: {
            tenantId: input.tenantId,
            companyId: input.companyId,
            code: '3.1.01.001',
            name: 'Receita Bruta de Vendas e Ingressos',
            nature: 'REVENUE',
            isAnalytical: true,
          },
        });
      }

      const lastEntry = await tx.journalEntry.findFirst({
        where: { companyId: input.companyId },
        orderBy: { entryNumber: 'desc' },
      });
      const nextEntryNum = (lastEntry?.entryNumber ?? 5000) + 1;

      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId: input.tenantId,
          companyId: input.companyId,
          entryNumber: nextEntryNum,
          competenceDate: new Date(),
          postingDate: new Date(),
          description: `Faturamento Pedido de Venda ${input.orderNumber} — ${customer.legalName}`,
          originModule: 'SALES',
          idempotencyKey: `SLS-INV-${input.companyId}-${input.orderNumber}-${Date.now()}`,
          status: 'POSTED',
          totalDebit: netAmount,
          totalCredit: netAmount,
          createdById: input.actorUserId,
          lines: {
            create: [
              {
                chartOfAccountId: debitReceivableAcc.id,
                debitAmount: netAmount,
                creditAmount: 0,
                memo: `Direito creditório Pedido ${input.orderNumber}`,
              },
              {
                chartOfAccountId: creditSalesAcc.id,
                debitAmount: 0,
                creditAmount: netAmount,
                memo: `Receita de venda faturada Pedido ${input.orderNumber}`,
              },
            ],
          },
        },
      });

      const salesOrder = await tx.salesOrder.create({
        data: {
          tenantId: input.tenantId,
          companyId: input.companyId,
          customerId: customer.id,
          inventoryItemId: input.inventoryItemId,
          orderNumber: input.orderNumber,
          salespersonName: input.salespersonName,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          grossAmount,
          discountAmount,
          netAmount,
          cmvAmount,
          commissionAmount,
          status: 'INVOICED_DISPATCHED',
          linkedReceivableId: receivable.id,
          linkedStockMoveId,
          linkedJournalEntryId: journalEntry.id,
        },
        include: {
          customer: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          companyId: input.companyId,
          userId: input.actorUserId,
          moduleCode: 'SALES',
          action: 'SALES_ORDER_INVOICED',
          entityName: 'SalesOrder',
          entityId: salesOrder.id,
          newValues: {
            orderNumber: salesOrder.orderNumber,
            netAmount,
            cmvAmount,
            commissionAmount,
            receivableId: receivable.id,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: input.tenantId,
          companyId: input.companyId,
          aggregateType: 'SalesOrder',
          aggregateId: salesOrder.id,
          eventType: 'sales.order.invoiced',
          payload: {
            orderNumber: salesOrder.orderNumber,
            netAmount,
            cmvAmount,
            receivableId: receivable.id,
          },
          status: 'PENDING',
        },
      });

      return {
        salesOrder,
        receivable,
        journalEntry,
        grossMarginAmount: roundCurrency(netAmount - cmvAmount - commissionAmount),
      };
    });
  }

  /**
   * Captura e liquida uma transação de Gateway de Pagamento (PIX ou Cartão - Módulo 11):
   * - Calcula e deduz a taxa MDR.
   * - Credita o valor líquido na conta bancária (BankAccount) e cria a FinancialTransaction.
   * - Se vinculado a um AccountReceivable, baixa o título para PAID.
   * - Contabiliza no Livro Diário (Bancos + Despesa MDR vs Clientes a Receber).
   */
  async captureGatewayPayment(input: CaptureGatewayPaymentInput) {
    const preview = this.calculateGatewaySettlement(
      input.grossAmount,
      input.paymentMethod,
      input.installments ?? 1,
      input.customMdrRatePct
    );

    return this.prisma.$transaction(async (tx) => {
      const bankAccount = await tx.bankAccount.findFirst({
        where: { id: input.bankAccountId, companyId: input.companyId },
      });
      if (!bankAccount) {
        throw new Error('ENTERPRISE_PAYMENTS_ERROR: Conta bancária de liquidação não encontrada.');
      }

      if (input.receivableId) {
        const receivable = await tx.accountReceivable.findFirst({
          where: { id: input.receivableId, companyId: input.companyId },
        });
        if (receivable && receivable.status !== 'PAID') {
          await tx.accountReceivable.update({
            where: { id: receivable.id },
            data: {
              status: 'PAID',
              receivedAmount: preview.grossAmount,
              acquirerFeeAmount: preview.mdrFeeAmount,
            },
          });
        }
      }

      const newBankBalance = roundCurrency(Number(bankAccount.currentBalance) + preview.netSettledAmount);
      await tx.bankAccount.update({
        where: { id: bankAccount.id },
        data: {
          currentBalance: newBankBalance,
        },
      });

      const bankTx = await tx.financialTransaction.create({
        data: {
          tenantId: input.tenantId,
          companyId: input.companyId,
          bankAccountId: bankAccount.id,
          receivableId: input.receivableId,
          type: 'CREDIT',
          paymentMethod: input.paymentMethod.startsWith('PIX') ? 'PIX' : 'CREDIT_CARD',
          amount: preview.netSettledAmount,
          occurredAt: new Date(),
          externalBankRef: input.externalNsuCode,
          reconciliationStatus: 'MATCHED_AUTOMATIC',
          reconciledAt: new Date(),
          notes: `Liquidação Gateway (${input.paymentMethod}) NSU ${input.externalNsuCode} — Bruto R$ ${preview.grossAmount.toFixed(2)} | MDR (${preview.mdrRatePct}%): R$ ${preview.mdrFeeAmount.toFixed(2)}`,
          idempotencyKey: `FT-GW-${input.companyId}-${input.externalNsuCode}-${Date.now()}`,
          createdById: input.actorUserId,
        },
      });

      // Contabilização (Débito: Bancos pelo Líquido + Débito: Despesa MDR / Crédito: Clientes pelo Bruto)
      let bankChartAcc = await tx.chartOfAccount.findFirst({
        where: { companyId: input.companyId, code: '1.1.01.002' },
      });
      if (!bankChartAcc) {
        bankChartAcc = await tx.chartOfAccount.create({
          data: {
            tenantId: input.tenantId,
            companyId: input.companyId,
            code: '1.1.01.002',
            name: 'Bancos Conta Movimento Principal',
            nature: 'ASSET',
            isAnalytical: true,
          },
        });
      }

      let mdrExpenseAcc = await tx.chartOfAccount.findFirst({
        where: { companyId: input.companyId, code: '4.1.04.001' },
      });
      if (!mdrExpenseAcc) {
        mdrExpenseAcc = await tx.chartOfAccount.create({
          data: {
            tenantId: input.tenantId,
            companyId: input.companyId,
            code: '4.1.04.001',
            name: 'Despesas Financeiras — Taxas MDR Gateways e Adquirentes',
            nature: 'EXPENSE',
            isAnalytical: true,
          },
        });
      }

      let receivableChartAcc = await tx.chartOfAccount.findFirst({
        where: { companyId: input.companyId, code: '1.1.02.001' },
      });
      if (!receivableChartAcc) {
        receivableChartAcc = await tx.chartOfAccount.create({
          data: {
            tenantId: input.tenantId,
            companyId: input.companyId,
            code: '1.1.02.001',
            name: 'Clientes — Duplicatas a Receber',
            nature: 'ASSET',
            isAnalytical: true,
          },
        });
      }

      const lastEntry = await tx.journalEntry.findFirst({
        where: { companyId: input.companyId },
        orderBy: { entryNumber: 'desc' },
      });
      const nextEntryNum = (lastEntry?.entryNumber ?? 5500) + 1;

      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId: input.tenantId,
          companyId: input.companyId,
          entryNumber: nextEntryNum,
          competenceDate: new Date(),
          postingDate: new Date(),
          description: `Liquidação Gateway ${input.paymentMethod} NSU ${input.externalNsuCode}`,
          originModule: 'PAYMENTS',
          idempotencyKey: `PAY-GW-${input.companyId}-${input.externalNsuCode}-${Date.now()}`,
          status: 'POSTED',
          totalDebit: preview.grossAmount,
          totalCredit: preview.grossAmount,
          createdById: input.actorUserId,
          lines: {
            create: [
              {
                chartOfAccountId: bankChartAcc.id,
                debitAmount: preview.netSettledAmount,
                creditAmount: 0,
                memo: `Entrada líquida Gateway NSU ${input.externalNsuCode}`,
              },
              {
                chartOfAccountId: mdrExpenseAcc.id,
                debitAmount: preview.mdrFeeAmount,
                creditAmount: 0,
                memo: `Taxa MDR (${preview.mdrRatePct}%) retida na fonte NSU ${input.externalNsuCode}`,
              },
              {
                chartOfAccountId: receivableChartAcc.id,
                debitAmount: 0,
                creditAmount: preview.grossAmount,
                memo: `Baixa de recebível via Gateway NSU ${input.externalNsuCode}`,
              },
            ],
          },
        },
      });

      const gatewayTx = await tx.paymentGatewayTransaction.create({
        data: {
          tenantId: input.tenantId,
          companyId: input.companyId,
          receivableId: input.receivableId,
          gatewayProvider: input.gatewayProvider ?? 'STRIPE_PAGARME_PIX',
          externalNsuCode: input.externalNsuCode,
          paymentMethod: input.paymentMethod,
          installments: input.installments ?? 1,
          grossAmount: preview.grossAmount,
          mdrRatePct: preview.mdrRatePct,
          mdrFeeAmount: preview.mdrFeeAmount,
          netSettledAmount: preview.netSettledAmount,
          status: 'CAPTURED_SETTLED',
          linkedBankTxId: bankTx.id,
          linkedJournalEntryId: journalEntry.id,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          companyId: input.companyId,
          userId: input.actorUserId,
          moduleCode: 'PAYMENTS',
          action: 'GATEWAY_PAYMENT_CAPTURED',
          entityName: 'PaymentGatewayTransaction',
          entityId: gatewayTx.id,
          newValues: {
            externalNsuCode: gatewayTx.externalNsuCode,
            paymentMethod: gatewayTx.paymentMethod,
            grossAmount: preview.grossAmount,
            mdrFeeAmount: preview.mdrFeeAmount,
            netSettledAmount: preview.netSettledAmount,
            newBankBalance,
          },
        },
      });

      return {
        gatewayTx,
        bankTx,
        journalEntry,
        newBankBalance,
      };
    });
  }

  /**
   * Registra contestação de Chargeback em transação de cartão/gateway,
   * marcando status CHARGEBACK_DISPUTE e registrando trilha de auditoria.
   */
  async registerChargebackDispute(params: {
    tenantId: string;
    companyId: string;
    actorUserId: string;
    gatewayTransactionId: string;
    reason: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const gwTx = await tx.paymentGatewayTransaction.findFirst({
        where: { id: params.gatewayTransactionId, companyId: params.companyId },
      });

      if (!gwTx) {
        throw new Error('ENTERPRISE_PAYMENTS_ERROR: Transação de gateway não encontrada.');
      }
      if (gwTx.status === 'CHARGEBACK_DISPUTE') {
        throw new Error('ENTERPRISE_PAYMENTS_ERROR: Esta transação já está em disputa de Chargeback.');
      }

      const updated = await tx.paymentGatewayTransaction.update({
        where: { id: gwTx.id },
        data: {
          status: 'CHARGEBACK_DISPUTE',
          chargebackReason: params.reason,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: params.tenantId,
          companyId: params.companyId,
          userId: params.actorUserId,
          moduleCode: 'PAYMENTS',
          action: 'GATEWAY_CHARGEBACK_REGISTERED',
          entityName: 'PaymentGatewayTransaction',
          entityId: gwTx.id,
          newValues: {
            externalNsuCode: gwTx.externalNsuCode,
            reason: params.reason,
            status: 'CHARGEBACK_DISPUTE',
          },
        },
      });

      return updated;
    });
  }

  /**
   * Consolida indicadores e listagens dos Módulos 10 (Vendas) e 11 (Pagamentos/Gateways).
   */
  async getSalesAndPaymentsSummary(companyCode: string) {
    const company = await this.prisma.company.findFirst({
      where: { code: companyCode },
    });

    if (!company) {
      throw new Error(`Empresa ${companyCode} não encontrada.`);
    }

    const [orders, gatewayTxs, customers, items, bankAccounts, openReceivables] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where: { companyId: company.id },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paymentGatewayTransaction.findMany({
        where: { companyId: company.id },
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.customer.findMany({
        where: { companyId: company.id },
        orderBy: { legalName: 'asc' },
      }),
      this.prisma.inventoryItem.findMany({
        where: { companyId: company.id },
        orderBy: { sku: 'asc' },
      }),
      this.prisma.bankAccount.findMany({
        where: { companyId: company.id },
        orderBy: { name: 'asc' },
      }),
      this.prisma.accountReceivable.findMany({
        where: { companyId: company.id, status: 'APPROVED' },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    const totalInvoicedSales = roundCurrency(
      orders.reduce((acc, o) => acc + Number(o.netAmount), 0)
    );
    const totalCmvSales = roundCurrency(
      orders.reduce((acc, o) => acc + Number(o.cmvAmount), 0)
    );
    const totalGatewayCaptured = roundCurrency(
      gatewayTxs
        .filter((t) => t.status === 'CAPTURED_SETTLED')
        .reduce((acc, t) => acc + Number(t.grossAmount), 0)
    );
    const totalMdrFees = roundCurrency(
      gatewayTxs.reduce((acc, t) => acc + Number(t.mdrFeeAmount), 0)
    );
    const totalChargebacks = gatewayTxs.filter((t) => t.status === 'CHARGEBACK_DISPUTE').length;

    return {
      companyCode: company.code,
      kpis: {
        ordersCount: orders.length,
        totalInvoicedSales,
        totalCmvSales,
        totalGatewayCaptured,
        totalMdrFees,
        totalChargebacks,
      },
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customer.legalName,
        salespersonName: o.salespersonName,
        quantity: Number(o.quantity),
        unitPrice: Number(o.unitPrice),
        grossAmount: Number(o.grossAmount),
        discountAmount: Number(o.discountAmount),
        netAmount: Number(o.netAmount),
        cmvAmount: Number(o.cmvAmount),
        commissionAmount: Number(o.commissionAmount),
        status: o.status,
      })),
      gatewayTransactions: gatewayTxs.map((t) => ({
        id: t.id,
        gatewayProvider: t.gatewayProvider,
        externalNsuCode: t.externalNsuCode,
        paymentMethod: t.paymentMethod,
        installments: t.installments,
        grossAmount: Number(t.grossAmount),
        mdrRatePct: Number(t.mdrRatePct),
        mdrFeeAmount: Number(t.mdrFeeAmount),
        netSettledAmount: Number(t.netSettledAmount),
        status: t.status,
        chargebackReason: t.chargebackReason,
        occurredAt: t.occurredAt.toISOString(),
      })),
      customers: customers.map((c) => ({ id: c.id, legalName: c.legalName, taxId: c.taxId })),
      inventoryItems: items.map((i) => ({
        id: i.id,
        sku: i.sku,
        name: i.name,
        currentStock: Number(i.quantityOnHand),
        averageUnitCost: Number(i.averageUnitCost),
      })),
      bankAccounts: bankAccounts.map((b) => ({
        id: b.id,
        name: b.name,
        currentBalance: Number(b.currentBalance),
      })),
      openReceivables: openReceivables.map((r) => ({
        id: r.id,
        documentNumber: r.documentNumber,
        description: r.description,
        netAmount: Number(r.netAmount),
      })),
    };
  }
}
