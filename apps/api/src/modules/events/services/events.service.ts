import { ErpModuleCode, roundCurrency, TenantExecutionContext } from '@delta-erp/shared';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';

export interface RecordTicketSaleDto {
  eventId: string;
  ticketBatchId: string;
  quantity: number;
  paymentMethod: 'PIX' | 'CREDIT_CARD';
  buyerName: string;
  buyerTaxId: string;
}

export interface RequestProducerPayoutDto {
  eventId: string;
  requestedAmount: number;
  isAdvancePayout: boolean;
}

/**
 * Extensão Especializada: Eventos, Bilheteria e Portal do Produtor (`EVENTS`)
 * Implementa as regras de ouro da especificação:
 * 1. Venda de ingresso separa o Valor de Face (Passivo transitório do Produtor) da Taxa de Conveniência (Receita da Operadora).
 * 2. Solicitação de Repasse ou Antecipação deduz taxas contratuais, abre alçada no Workflow e gera Contas a Pagar ao Produtor.
 */
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Calcula o saldo líquido disponível para repasse ao produtor de um evento
   */
  static calculateProducerAvailableBalance(params: {
    grossTicketSales: number;
    totalAcquirerFees: number;
    totalChargebacks: number;
    totalAdvanced: number;
    totalPaidOut: number;
  }): number {
    return roundCurrency(
      params.grossTicketSales -
        params.totalAcquirerFees -
        params.totalChargebacks -
        params.totalAdvanced -
        params.totalPaidOut
    );
  }

  async recordTicketSale(context: TenantExecutionContext, dto: RecordTicketSaleDto) {
    if (dto.quantity <= 0) {
      throw new Error('INVALID_TICKET_QUANTITY: A quantidade de ingressos deve ser maior que zero.');
    }

    return this.prisma.executeInTenantTransaction(context.tenantId, context.companyId, async (tx) => {
      const event = await tx.event.findFirst({
        where: { id: dto.eventId, tenantId: context.tenantId },
        include: { producer: true },
      });

      if (!event) {
        throw new Error('EVENT_NOT_FOUND: Evento não localizado.');
      }

      const batch = await tx.ticketBatch.findFirst({
        where: { id: dto.ticketBatchId, eventId: event.id },
      });

      if (!batch) {
        throw new Error('BATCH_NOT_FOUND: Lote de ingressos não pertence ao evento informado.');
      }

      if (batch.soldQuantity + dto.quantity > batch.totalQuota) {
        throw new Error('QUOTA_EXCEEDED: Quantidade solicitada excede a cota disponível no lote.');
      }

      const faceTotal = roundCurrency(Number(batch.faceValue) * dto.quantity);
      const serviceFeeTotal = roundCurrency(Number(batch.serviceFee) * dto.quantity);
      const totalChargedFromBuyer = roundCurrency(faceTotal + serviceFeeTotal);
      // Taxa de adquirência: PIX = 0.85%, Cartão = 3.20%
      const acquirerRate = dto.paymentMethod === 'PIX' ? 0.0085 : 0.032;
      const acquirerFee = roundCurrency(totalChargedFromBuyer * acquirerRate);

      await tx.ticketBatch.update({
        where: { id: batch.id },
        data: { soldQuantity: { increment: dto.quantity } },
      });

      const updatedEvent = await tx.event.update({
        where: { id: event.id },
        data: {
          grossTicketSales: { increment: faceTotal },
          totalServiceFees: { increment: serviceFeeTotal },
          totalAcquirerFees: { increment: acquirerFee },
        },
        include: { producer: true, ticketBatches: true, settlements: true },
      });

      // Contabilização automática por partidas dobradas:
      // Débito: Bancos/Adquirente (Total cobrado)
      // Crédito 1: Passivo Custódia Produtor (Valor de Face)
      // Crédito 2: Receita de Taxa de Conveniência (Taxa de Serviço)
      const [assetAcc, custodyLiabilityAcc, feeRevenueAcc, lastEntry] = await Promise.all([
        tx.chartOfAccount.findFirst({
          where: { companyId: event.companyId, nature: 'ASSET', isAnalytical: true },
        }),
        tx.chartOfAccount.findFirst({
          where: { companyId: event.companyId, nature: 'LIABILITY', isAnalytical: true },
        }),
        tx.chartOfAccount.findFirst({
          where: { companyId: event.companyId, nature: 'REVENUE', isAnalytical: true },
        }),
        tx.journalEntry.findFirst({
          where: { companyId: event.companyId },
          orderBy: { entryNumber: 'desc' },
        }),
      ]);

      if (assetAcc && custodyLiabilityAcc && feeRevenueAcc) {
        await tx.journalEntry.create({
          data: {
            tenantId: context.tenantId,
            companyId: event.companyId,
            entryNumber: (lastEntry?.entryNumber ?? 0) + 1,
            competenceDate: new Date(),
            description: `Venda Ingressos (${dto.quantity}x ${batch.name}) — ${event.title}`,
            originModule: 'EVENTS',
            originReferenceId: event.id,
            totalDebit: totalChargedFromBuyer,
            totalCredit: totalChargedFromBuyer,
            status: 'POSTED',
            idempotencyKey: `je_tkt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            createdById: context.userId,
            lines: {
              create: [
                {
                  chartOfAccountId: assetAcc.id,
                  debitAmount: totalChargedFromBuyer,
                  creditAmount: 0,
                  memo: `Arrecadação Bilheteria (${dto.paymentMethod}) — ${dto.buyerName}`,
                },
                {
                  chartOfAccountId: custodyLiabilityAcc.id,
                  debitAmount: 0,
                  creditAmount: faceTotal,
                  memo: `Custódia a Repassar ao Produtor (${event.producer.tradeName})`,
                },
                {
                  chartOfAccountId: feeRevenueAcc.id,
                  debitAmount: 0,
                  creditAmount: serviceFeeTotal,
                  memo: `Receita Própria Taxa de Conveniência — ${event.code}`,
                },
              ],
            },
          },
        });
      }

      await this.auditService.record({
        context,
        moduleCode: ErpModuleCode.EVENTS,
        entityName: 'Event',
        entityId: event.id,
        action: 'UPDATE',
        previousValues: { grossTicketSales: Number(event.grossTicketSales) },
        newValues: {
          ticketSaleQuantity: dto.quantity,
          faceTotal,
          serviceFeeTotal,
          acquirerFee,
          newGrossTicketSales: Number(updatedEvent.grossTicketSales),
        },
      });

      return {
        event: updatedEvent,
        saleBreakdown: {
          quantity: dto.quantity,
          faceTotal,
          serviceFeeTotal,
          totalChargedFromBuyer,
          acquirerFee,
        },
      };
    });
  }

  async requestProducerPayout(context: TenantExecutionContext, dto: RequestProducerPayoutDto) {
    if (dto.requestedAmount <= 0) {
      throw new Error('INVALID_PAYOUT_AMOUNT: O valor solicitado para repasse deve ser positivo.');
    }

    return this.prisma.executeInTenantTransaction(context.tenantId, context.companyId, async (tx) => {
      const event = await tx.event.findFirst({
        where: { id: dto.eventId, tenantId: context.tenantId },
        include: { producer: true },
      });

      if (!event) {
        throw new Error('EVENT_NOT_FOUND: Evento não localizado.');
      }

      const availableBalance = EventsService.calculateProducerAvailableBalance({
        grossTicketSales: Number(event.grossTicketSales),
        totalAcquirerFees: Number(event.totalAcquirerFees),
        totalChargebacks: Number(event.totalChargebacks),
        totalAdvanced: Number(event.totalAdvanced),
        totalPaidOut: Number(event.totalPaidOut),
      });

      if (dto.requestedAmount > availableBalance) {
        throw new Error(
          `INSUFFICIENT_PRODUCER_BALANCE: Valor solicitado (R$ ${dto.requestedAmount.toFixed(
            2
          )}) supera o saldo líquido disponível no borderô (R$ ${availableBalance.toFixed(2)}).`
        );
      }

      const advanceFeePct = dto.isAdvancePayout ? Number(event.producer.advanceFeePct) : 0;
      const advanceFeeAmount = roundCurrency((dto.requestedAmount * advanceFeePct) / 100);
      const netPayoutAmount = roundCurrency(dto.requestedAmount - advanceFeeAmount);

      let category = await tx.financialCategory.findFirst({
        where: { companyId: event.companyId, code: 'REPASSE-PROD' },
      });
      if (!category) {
        category = await tx.financialCategory.create({
          data: {
            tenantId: context.tenantId,
            companyId: event.companyId,
            code: 'REPASSE-PROD',
            name: 'Repasse de Bilheteria a Produtores de Eventos',
            nature: 'EXPENSE',
          },
        });
      }

      const today = new Date();
      const payable = await tx.accountPayable.create({
        data: {
          tenantId: context.tenantId,
          companyId: event.companyId,
          categoryId: category.id,
          supplierName: event.producer.legalName,
          supplierTaxId: event.producer.taxId,
          documentNumber: `BORD-${event.code}-${Math.floor(100 + Math.random() * 900)}`,
          description: `${
            dto.isAdvancePayout ? 'Antecipação de Recebíveis' : 'Repasse de Borderô'
          } — Evento ${event.title}`,
          originModule: 'EVENTS',
          originReferenceId: event.id,
          issueDate: today,
          dueDate: today,
          competenceDate: today,
          grossAmount: dto.requestedAmount,
          discountAmount: advanceFeeAmount,
          interestAmount: 0,
          taxRetainedAmount: 0,
          netAmount: netPayoutAmount,
          paidAmount: 0,
          status: 'PENDING_APPROVAL',
          idempotencyKey: `payout_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          createdById: context.userId,
        },
      });

      const settlement = await tx.producerSettlement.create({
        data: {
          tenantId: context.tenantId,
          companyId: event.companyId,
          eventId: event.id,
          producerId: event.producerId,
          isAdvancePayout: dto.isAdvancePayout,
          requestedAmount: dto.requestedAmount,
          advanceFeeAmount,
          netPayoutAmount,
          status: 'PENDING',
          payableId: payable.id,
          requestedById: context.userId,
        },
      });

      await tx.event.update({
        where: { id: event.id },
        data: dto.isAdvancePayout
          ? { totalAdvanced: { increment: dto.requestedAmount } }
          : { totalPaidOut: { increment: dto.requestedAmount } },
      });

      await tx.workflowInstance.create({
        data: {
          tenantId: context.tenantId,
          companyId: event.companyId,
          moduleCode: 'EVENTS',
          entityType: 'ACCOUNT_PAYABLE',
          entityId: payable.id,
          referenceAmount: netPayoutAmount,
          status: 'PENDING',
          requestedById: context.userId,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: context.tenantId,
          companyId: event.companyId,
          aggregateType: 'ProducerSettlement',
          aggregateId: settlement.id,
          eventType: 'events.settlement.requested',
          payload: {
            settlementId: settlement.id,
            eventId: event.id,
            producerName: event.producer.tradeName,
            requestedAmount: dto.requestedAmount,
            advanceFeeAmount,
            netPayoutAmount,
            payableId: payable.id,
          },
        },
      });

      return { settlement, payable };
    });
  }
}
