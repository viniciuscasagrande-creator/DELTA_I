import {
  ErpModuleCode,
  roundCurrency,
  TenantExecutionContext,
  EventApprovalStatus,
  EventPublicationStatus,
  EventSalesStatus,
  EventRealizationStatus,
  DiskIngressosEventState,
  formatTicketNumber,
  DiskIngressosTicketItem,
  EventOperationalStage,
  EventSeatStatus,
  SalesChannelType,
  EventMandatoryBlockQuestions,
  EventIndependentReview,
  EventProducerApproval,
  EventRevisionRecord,
  EventIntakeRecord,
  EventSeatBlockRecord,
  TicketCourtesyBatchRecord,
  TicketReceiptRecord,
  LotTransitionRecord,
  CriticalChangeType,
  CriticalEventChangeRequest,
  SupervisedRefundPlanItem,
  CommunicationPurpose,
  CommunicationPricingVersion,
  OfficialCommunicationTemplate,
  CustomerCommunicationDispatch,
} from '@delta-erp/shared';
import crypto from 'node:crypto';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';

export interface OperationalSectorSpec {
  id: string;
  name: string;
  capacity: number;
  hasNumberedSeats?: boolean;
  mapSeatCount?: number;
  soldCount: number;
  blockedCount: number;
  courtesyCount: number;
}

export interface OperationalLotSpec {
  id: string;
  sectorId: string;
  sectorName: string;
  name: string;
  facePrice: number;
  convenienceFee: number;
  quota: number;
  soldCount: number;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED';
  discountAppliesOnlyToFullPrice: boolean;
}

export interface OperationalEventAggregate {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  title: string;
  producerId: string;
  producerName: string;
  venueName: string;
  cityState: string;
  startsAt: string;
  endsAt: string;
  declaredCapacity: number;
  venuePermitCapacity: number;
  serviceFeePct: number;
  courtesyPrintingFeePerUnit: number;
  assembledByUserId: string;
  assembledByName: string;
  operationalStage: EventOperationalStage;
  approvalStatus: EventApprovalStatus;
  publicationStatus: EventPublicationStatus;
  salesStatus: EventSalesStatus;
  realizationStatus: EventRealizationStatus;
  enabledChannels: SalesChannelType[];
  restrictedLinkOnly: boolean;
  blockQuestions: EventMandatoryBlockQuestions;
  currentRevision: EventRevisionRecord;
  revisionHistory: EventRevisionRecord[];
  independentReviews: EventIndependentReview[];
  producerApproval?: EventProducerApproval;
  sectors: OperationalSectorSpec[];
  seats: Record<string, { seatCode: string; sectorId: string; status: EventSeatStatus; holderOrderId?: string }>;
  lots: OperationalLotSpec[];
  seatBlocks: EventSeatBlockRecord[];
  courtesyBatches: TicketCourtesyBatchRecord[];
  receipts: TicketReceiptRecord[];
  lotTransitions: LotTransitionRecord[];
  criticalChanges: CriticalEventChangeRequest[];
  refundPlan: SupervisedRefundPlanItem[];
  communications: CustomerCommunicationDispatch[];
  incidents: Array<{
    id: string;
    eventId: string;
    type:
      | 'INGRESSO_CANCELADO_PORTARIA'
      | 'MEIA_ENTRADA_SEM_DOCUMENTO'
      | 'FALSA_DUPLICIDADE'
      | 'EQUIPAMENTO_VALIDADOR'
      | 'SUSPEITA_FRAUDE'
      | 'DIVERGENCIA_CADASTRO';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    sectorName: string;
    ticketNumber8Digits?: string;
    description: string;
    resolution: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
    reportedBy: string;
    createdAt: string;
  }>;
  auditTrail: Array<{
    id: string;
    action: string;
    actorUserId: string;
    actorRole: string;
    reason: string;
    previousValues: unknown;
    newValues: unknown;
    occurredAt: string;
    hash: string;
  }>;
  // Dados internos confidenciais da DiskIngressos (nunca expostos ao perfil Produtor)
  internalFinancials: {
    grossTicketSales: number;
    totalServiceFees: number;
    totalAcquirerFees: number;
    internalDiskMarginPct: number;
    internalBankAccountCode: string;
    internalSettlementNotes: string;
  };
}


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
   * Validação estrita das 4 dimensões de estados do evento:
   * 1. Vendas NÃO podem ser abertas se a aprovação não for 'APPROVED'.
   * 2. Evento não pode ser publicado na vitrine se o status de aprovação for 'REJECTED'.
   * 3. Evento com realização 'CANCELLED' força vendas para 'CLOSED'.
   */
  static validateStateTransition(
    current: DiskIngressosEventState,
    updates: Partial<DiskIngressosEventState>
  ): DiskIngressosEventState {
    const next: DiskIngressosEventState = { ...current, ...updates };

    if (next.salesStatus === EventSalesStatus.OPEN && next.approvalStatus !== EventApprovalStatus.APPROVED) {
      throw new Error(
        'EVENT_SALES_NOT_ALLOWED: Vendas não podem ser abertas antes da aprovação/homologação do evento pela curadoria.'
      );
    }

    if (next.publicationStatus === EventPublicationStatus.PUBLISHED && next.approvalStatus === EventApprovalStatus.REJECTED) {
      throw new Error('EVENT_CANNOT_PUBLISH_REJECTED: Evento rejeitado não pode ser publicado na vitrine.');
    }

    if (next.realizationStatus === EventRealizationStatus.CANCELLED) {
      next.salesStatus = EventSalesStatus.CLOSED;
    }

    return next;
  }

  /**
   * Emissão de Ingressos com formato inegociável de 8 dígitos numéricos
   * e credencial criptográfica segura desacoplada (HMAC-SHA256) para a catraca.
   */
  static generateTickets(params: {
    eventId: string;
    eventName: string;
    batchId: string;
    batchName: string;
    sectorName: string;
    quantity: number;
    faceValue: number;
    convenienceFeeValue: number;
    buyerName: string;
    buyerTaxId: string;
    buyerEmail: string;
    paymentMethod: 'PIX' | 'CREDIT_CARD' | 'CASH_PDV';
    startSequenceNumber: number;
    hmacSecret?: string;
  }): DiskIngressosTicketItem[] {
    const secret = params.hmacSecret || process.env.ENCRYPTION_KEY || 'diskingressos-secret-key-2026';
    const tickets: DiskIngressosTicketItem[] = [];
    const issuedAt = new Date().toISOString();

    for (let i = 0; i < params.quantity; i++) {
      const sequence = params.startSequenceNumber + i;
      const ticketNumber = formatTicketNumber(sequence);

      // Credencial segura desacoplada para validação na catraca
      const rawPayload = `${params.eventId}:${ticketNumber}:${params.buyerTaxId}:${issuedAt}`;
      const validationHash = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

      tickets.push({
        id: `tkt_${params.eventId}_${ticketNumber}`,
        eventId: params.eventId,
        eventName: params.eventName,
        batchId: params.batchId,
        batchName: params.batchName,
        sectorName: params.sectorName,
        ticketNumber,
        validationHash,
        faceValue: params.faceValue,
        convenienceFeeValue: params.convenienceFeeValue,
        totalPaid: roundCurrency(params.faceValue + params.convenienceFeeValue),
        buyerName: params.buyerName,
        buyerTaxId: params.buyerTaxId,
        buyerEmail: params.buyerEmail,
        paymentMethod: params.paymentMethod,
        status: 'ISSUED',
        issuedAt,
      });
    }

    return tickets;
  }

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

  // ==========================================================================
  // PACOTES 01 A 06: MOTOR OPERACIONAL DE EVENTOS PONTA A PONTA (STE.PO / STE.IT)
  // ==========================================================================

  private operationalIntakes = new Map<string, EventIntakeRecord>();
  private operationalEvents = new Map<string, OperationalEventAggregate>();

  /**
   * Tabela versionada oficial de custos de comunicação (Resolve conflito documental R$ 0,51 vs R$ 0,61)
   */
  public static readonly DEFAULT_COMMUNICATION_PRICING_TABLE: CommunicationPricingVersion[] = [
    {
      id: 'prc-wa-info-2026-v1',
      versionCode: 'TAB-2026-WA-INFO-V1',
      channel: 'WHATSAPP',
      purpose: 'INFORMATIVO_ALTERACAO_CRITICA',
      providerName: 'Meta Cloud API Oficial (STE.PO.002 / Folheto 2026)',
      unitPriceBrl: 0.51,
      validFrom: '2026-01-01',
      contractReference: 'CTR-META-INFO-2026',
      isActive: true,
    },
    {
      id: 'prc-wa-promo-2026-v1',
      versionCode: 'TAB-2026-WA-PROMO-V1',
      channel: 'WHATSAPP',
      purpose: 'PROMOCIONAL_MARKETING',
      providerName: 'Meta Cloud API Marketing (Proposta Comercial 2026)',
      unitPriceBrl: 0.61,
      validFrom: '2026-01-01',
      contractReference: 'CTR-META-PROMO-2026',
      isActive: true,
    },
    {
      id: 'prc-email-op-2026-v1',
      versionCode: 'TAB-2026-EMAIL-OP-V1',
      channel: 'EMAIL',
      purpose: 'OPERACIONAL_EMAIL_TRANSACIONAL',
      providerName: 'AWS SES / SendGrid Transacional',
      unitPriceBrl: 0.0,
      validFrom: '2026-01-01',
      contractReference: 'CTR-EMAIL-SLA-2026',
      isActive: true,
    },
  ];

  /**
   * Biblioteca de Templates Oficiais Revisionados e Separados por Ocorrência
   * (Corrige o erro documental dos folhetos de 2026 que misturavam textos de cancelamento em adiamento)
   */
  public static readonly OFFICIAL_COMMUNICATION_TEMPLATES: OfficialCommunicationTemplate[] = [
    {
      id: 'tpl-cancelamento-v1',
      code: 'TPL-CANCELAMENTO-OFICIAL-V1',
      category: 'CANCELAMENTO',
      title: 'Comunicado Oficial de Cancelamento e Reembolso Integral',
      channel: 'WHATSAPP',
      bodyTemplate:
        'Comunicado Oficial DiskIngressos: O evento {{eventName}} foi CANCELADO. Você tem direito ao reembolso integral, incluindo taxas de conveniência.',
      reviewedByLegalOrSac: 'Jurídico & Coordenação SAC DiskIngressos',
      version: 1,
    },
    {
      id: 'tpl-adiamento-com-data-v1',
      code: 'TPL-ADIAMENTO-NOVA-DATA-V1',
      category: 'ADIAMENTO_COM_NOVA_DATA',
      title: 'Comunicado Oficial de Adiamento com Nova Data Confirmada',
      channel: 'WHATSAPP',
      bodyTemplate:
        'Comunicado Oficial DiskIngressos: O evento {{eventName}} foi ADIADO para {{newDate}}. Seus ingressos atuais permanecem 100% válidos para a nova data.',
      reviewedByLegalOrSac: 'Jurídico & Coordenação SAC DiskIngressos',
      version: 1,
    },
    {
      id: 'tpl-adiamento-sem-data-v1',
      code: 'TPL-ADIAMENTO-SEM-DATA-V1',
      category: 'ADIAMENTO_SEM_DATA',
      title: 'Comunicado Oficial de Adiamento (Nova Data em Definição)',
      channel: 'WHATSAPP',
      bodyTemplate:
        'Comunicado Oficial DiskIngressos: O evento {{eventName}} foi ADIADO e a nova data está em definição junto à produção. As vendas encontram-se pausadas.',
      reviewedByLegalOrSac: 'Jurídico & Coordenação SAC DiskIngressos',
      version: 1,
    },
    {
      id: 'tpl-mudanca-local-v1',
      code: 'TPL-MUDANCA-LOCAL-V1',
      category: 'MUDANCA_DE_LOCAL',
      title: 'Comunicado Oficial de Alteração de Local do Evento',
      channel: 'WHATSAPP',
      bodyTemplate:
        'Comunicado Oficial DiskIngressos: O evento {{eventName}} teve MUDANÇA DE LOCAL para {{newVenue}}. Seus ingressos permanecem válidos conforme política de setores.',
      reviewedByLegalOrSac: 'Jurídico & Coordenação SAC DiskIngressos',
      version: 1,
    },
  ];

  public static computeRevisionSnapshotHash(snapshot: EventRevisionRecord['materialFieldsSnapshot']): string {
    return crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
  }

  private static appendAudit(
    event: OperationalEventAggregate,
    params: {
      action: string;
      actorUserId: string;
      actorRole: string;
      reason: string;
      previousValues: unknown;
      newValues: unknown;
    }
  ) {
    const occurredAt = new Date().toISOString();
    const raw = JSON.stringify({ ...params, eventId: event.id, occurredAt });
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    event.auditTrail.push({
      id: `aud_${event.auditTrail.length + 1}_${Date.now()}`,
      action: params.action,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      reason: params.reason,
      previousValues: params.previousValues,
      newValues: params.newValues,
      occurredAt,
      hash,
    });
  }

  /**
   * CASO DE ACEITAÇÃO 1:
   * Produtor não enxerga evento de outro produtor nem dados internos da Disk (UI e API).
   */
  public static enforceProducerScopeAndSanitize(
    event: OperationalEventAggregate,
    context: Pick<TenantExecutionContext, 'userType' | 'roleCode' | 'externalEntityId' | 'tenantId'>
  ): Omit<OperationalEventAggregate, 'internalFinancials'> & { internalFinancials?: OperationalEventAggregate['internalFinancials'] } {
    if (event.tenantId !== context.tenantId) {
      throw new Error('FORBIDDEN_TENANT_ISOLATION: Evento não pertence ao tenant autenticado.');
    }

    const isProducerContext =
      context.userType === 'EXTERNAL_PRODUCER' || context.roleCode === 'PRODUCER' || context.roleCode === 'EXTERNAL_PRODUCER';

    if (isProducerContext) {
      if (!context.externalEntityId || event.producerId !== context.externalEntityId) {
        throw new Error(
          'FORBIDDEN_PRODUCER_SCOPE: Produtor não possui autorização para consultar ou operar eventos de outro produtor.'
        );
      }
      // Remove todos os dados financeiros internos da Disk (taxas internas, MDR, contas bancárias e margens)
      const { internalFinancials: _removed, ...sanitized } = event;
      return structuredClone(sanitized);
    }

    return structuredClone(event);
  }

  public static filterEventsForContext(
    events: OperationalEventAggregate[],
    context: Pick<TenantExecutionContext, 'userType' | 'roleCode' | 'externalEntityId' | 'tenantId'>
  ) {
    const isProducerContext =
      context.userType === 'EXTERNAL_PRODUCER' || context.roleCode === 'PRODUCER' || context.roleCode === 'EXTERNAL_PRODUCER';

    return events
      .filter((e) => {
        if (e.tenantId !== context.tenantId) return false;
        if (isProducerContext) {
          return Boolean(context.externalEntityId && e.producerId === context.externalEntityId);
        }
        return true;
      })
      .map((e) => EventsService.enforceProducerScopeAndSanitize(e, context));
  }

  /**
   * Cria um agregado operacional de evento na etapa inicial de montagem com versão 1 auditada.
   * CASO DE ACEITAÇÃO 15: Nenhum dado financeiro de teste é introduzido na base operacional.
   */
  public static createOperationalEvent(params: {
    id: string;
    tenantId: string;
    companyId: string;
    code: string;
    title: string;
    producerId: string;
    producerName: string;
    venueName: string;
    cityState: string;
    startsAt: string;
    endsAt: string;
    declaredCapacity: number;
    venuePermitCapacity: number;
    serviceFeePct: number;
    courtesyPrintingFeePerUnit?: number;
    assembledByUserId: string;
    assembledByName: string;
    sectors: OperationalSectorSpec[];
    seats?: Array<{ seatCode: string; sectorId: string; status?: EventSeatStatus }>;
    lots?: OperationalLotSpec[];
  }): OperationalEventAggregate {
    const sectorsTotalCapacity = params.sectors.reduce((acc, s) => acc + s.capacity, 0);
    const materialSnapshot: EventRevisionRecord['materialFieldsSnapshot'] = {
      title: params.title,
      venueName: params.venueName,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      declaredCapacity: params.declaredCapacity,
      sectorsTotalCapacity,
      serviceFeePct: params.serviceFeePct,
    };
    const snapshotHash = EventsService.computeRevisionSnapshotHash(materialSnapshot);
    const now = new Date().toISOString();

    const firstRevision: EventRevisionRecord = {
      version: 1,
      snapshotHash,
      assembledByUserId: params.assembledByUserId,
      assembledByName: params.assembledByName,
      reason: 'Montagem técnica inicial do evento (STE.IT.001)',
      createdAt: now,
      materialFieldsSnapshot: materialSnapshot,
    };

    const seatsMap: OperationalEventAggregate['seats'] = {};
    for (const s of params.seats || []) {
      seatsMap[s.seatCode] = {
        seatCode: s.seatCode,
        sectorId: s.sectorId,
        status: s.status || EventSeatStatus.DISPONIVEL,
      };
    }

    const aggregate: OperationalEventAggregate = {
      id: params.id,
      tenantId: params.tenantId,
      companyId: params.companyId,
      code: params.code,
      title: params.title,
      producerId: params.producerId,
      producerName: params.producerName,
      venueName: params.venueName,
      cityState: params.cityState,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      declaredCapacity: params.declaredCapacity,
      venuePermitCapacity: params.venuePermitCapacity,
      serviceFeePct: params.serviceFeePct,
      courtesyPrintingFeePerUnit: params.courtesyPrintingFeePerUnit ?? 2.5,
      assembledByUserId: params.assembledByUserId,
      assembledByName: params.assembledByName,
      operationalStage: EventOperationalStage.EM_MONTAGEM,
      approvalStatus: EventApprovalStatus.DRAFT,
      publicationStatus: EventPublicationStatus.UNPUBLISHED,
      salesStatus: EventSalesStatus.NOT_OPEN,
      realizationStatus: EventRealizationStatus.SCHEDULED,
      enabledChannels: [],
      restrictedLinkOnly: false,
      blockQuestions: {
        hasTechnicalProductionBlocks: null,
        hasVenueContractualCourtesyBlocks: null,
      },
      currentRevision: firstRevision,
      revisionHistory: [firstRevision],
      independentReviews: [],
      sectors: params.sectors,
      seats: seatsMap,
      lots: params.lots || [],
      seatBlocks: [],
      courtesyBatches: [],
      receipts: [],
      lotTransitions: [],
      criticalChanges: [],
      refundPlan: [],
      communications: [],
      incidents: [],
      auditTrail: [],
      // CASO 15: Saldos operacionais iniciam estritamente zerados sem dados financeiros fictícios
      internalFinancials: {
        grossTicketSales: 0,
        totalServiceFees: 0,
        totalAcquirerFees: 0,
        internalDiskMarginPct: params.serviceFeePct,
        internalBankAccountCode: 'BANK-DISK-CUSTODIA-01',
        internalSettlementNotes: 'Conta centralizadora DiskIngressos — Repasse posterior via borderô',
      },
    };

    EventsService.appendAudit(aggregate, {
      action: 'EVENT_ASSEMBLY_CREATED',
      actorUserId: params.assembledByUserId,
      actorRole: 'TECHNICAL_SUPPORT',
      reason: 'Criação da montagem inicial do evento',
      previousValues: null,
      newValues: { version: 1, snapshotHash, declaredCapacity: params.declaredCapacity },
    });

    return aggregate;
  }

  /**
   * CASO DE ACEITAÇÃO 2:
   * Perguntas obrigatórias de bloqueios (STE.IT.001, p. 8):
   * (a) bloqueios técnicos/reservas de produção?
   * (b) bloqueios contratuais para cortesias do espaço?
   * Cada resposta deve ser SIM ou NAO (e, se SIM, detalhar) antes de liberar publicação/venda.
   */
  public static answerMandatoryBlockQuestions(
    event: OperationalEventAggregate,
    input: {
      hasTechnicalProductionBlocks: 'SIM' | 'NAO' | null;
      technicalProductionBlocksDetail?: string;
      hasVenueContractualCourtesyBlocks: 'SIM' | 'NAO' | null;
      venueContractualCourtesyBlocksDetail?: string;
      actorUserId: string;
      actorRole: string;
    }
  ): OperationalEventAggregate {
    if (input.hasTechnicalProductionBlocks !== 'SIM' && input.hasTechnicalProductionBlocks !== 'NAO') {
      throw new Error(
        'BLOCK_QUESTIONS_INVALID: A pergunta de bloqueios técnicos/reservas de produção deve ser respondida com SIM ou NAO.'
      );
    }
    if (input.hasVenueContractualCourtesyBlocks !== 'SIM' && input.hasVenueContractualCourtesyBlocks !== 'NAO') {
      throw new Error(
        'BLOCK_QUESTIONS_INVALID: A pergunta de bloqueios contratuais para cortesias do espaço deve ser respondida com SIM ou NAO.'
      );
    }
    if (input.hasTechnicalProductionBlocks === 'SIM' && !input.technicalProductionBlocksDetail?.trim()) {
      throw new Error(
        'BLOCK_QUESTIONS_DETAIL_REQUIRED: Informe o detalhamento de assentos/quantidades para os bloqueios técnicos de produção.'
      );
    }
    if (input.hasVenueContractualCourtesyBlocks === 'SIM' && !input.venueContractualCourtesyBlocksDetail?.trim()) {
      throw new Error(
        'BLOCK_QUESTIONS_DETAIL_REQUIRED: Informe o detalhamento de assentos/quantidades para os bloqueios contratuais do espaço.'
      );
    }

    const previous = structuredClone(event.blockQuestions);
    event.blockQuestions = {
      hasTechnicalProductionBlocks: input.hasTechnicalProductionBlocks,
      technicalProductionBlocksDetail: input.technicalProductionBlocksDetail?.trim(),
      hasVenueContractualCourtesyBlocks: input.hasVenueContractualCourtesyBlocks,
      venueContractualCourtesyBlocksDetail: input.venueContractualCourtesyBlocksDetail?.trim(),
      answeredByUserId: input.actorUserId,
      answeredAt: new Date().toISOString(),
    };

    EventsService.appendAudit(event, {
      action: 'MANDATORY_BLOCK_QUESTIONS_ANSWERED',
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      reason: 'Registro obrigatório das perguntas de bloqueio técnico e contratual (STE.IT.001, p. 8)',
      previousValues: previous,
      newValues: event.blockQuestions,
    });

    return event;
  }

  /**
   * CASO DE ACEITAÇÃO 5:
   * Capacidade do mapa incompatível com setor/formulário bloqueia publicação (STE.IT.001, p. 6).
   */
  public static validateSectorAndMapCapacity(event: OperationalEventAggregate): void {
    if (!event.sectors || event.sectors.length === 0) {
      throw new Error('SECTOR_CAPACITY_MISMATCH: O evento deve possuir ao menos um setor configurado.');
    }

    const sumSectors = event.sectors.reduce((acc, s) => acc + s.capacity, 0);

    if (sumSectors !== event.declaredCapacity) {
      throw new Error(
        `SECTOR_CAPACITY_MISMATCH: Soma da capacidade dos setores (${sumSectors}) diverge da capacidade declarada no formulário (${event.declaredCapacity}).`
      );
    }

    if (sumSectors > event.venuePermitCapacity) {
      throw new Error(
        `SECTOR_CAPACITY_MISMATCH: Capacidade total (${sumSectors}) ultrapassa o alvará do espaço (${event.venuePermitCapacity}).`
      );
    }

    for (const sector of event.sectors) {
      if (sector.hasNumberedSeats && typeof sector.mapSeatCount === 'number' && sector.mapSeatCount !== sector.capacity) {
        throw new Error(
          `SECTOR_CAPACITY_MISMATCH: O setor numerado "${sector.name}" possui ${sector.mapSeatCount} assentos no mapa, mas capacidade cadastrada de ${sector.capacity}.`
        );
      }
    }
  }

  /**
   * CASO DE ACEITAÇÃO 3:
   * Duas pessoas diferentes do montador devem conferir e assinar eletronicamente as duas verificações (STE.PO.001, p. 3).
   * Não permitir que o montador se aprove nem que os conferentes sejam a mesma pessoa.
   */
  public static submitIndependentReview(
    event: OperationalEventAggregate,
    input: {
      reviewerUserId: string;
      reviewerName: string;
      reviewerRole: string;
      sectorsVerified: boolean;
      pricesAndFeesVerified: boolean;
      halfPriceRulesVerified: boolean;
      channelsAndPosVerified: boolean;
      blockQuestionsVerified: boolean;
      decision: 'APPROVED' | 'REJECTED';
      notes?: string;
    }
  ): EventIndependentReview {
    if (input.reviewerUserId === event.currentRevision.assembledByUserId || input.reviewerUserId === event.assembledByUserId) {
      throw new Error(
        'SELF_REVIEW_FORBIDDEN: O responsável pela montagem do evento não pode atuar como conferente da própria montagem (STE.PO.001, p. 3).'
      );
    }

    const currentVersionReviews = event.independentReviews.filter(
      (r) => r.revisionVersion === event.currentRevision.version && r.revisionHash === event.currentRevision.snapshotHash
    );

    if (currentVersionReviews.some((r) => r.reviewerUserId === input.reviewerUserId)) {
      throw new Error(
        'DUPLICATE_REVIEWER_FORBIDDEN: A segunda conferência deve ser realizada por um profissional distinto do primeiro conferente (STE.PO.001, p. 3).'
      );
    }

    if (
      input.decision === 'APPROVED' &&
      (!input.sectorsVerified ||
        !input.pricesAndFeesVerified ||
        !input.halfPriceRulesVerified ||
        !input.channelsAndPosVerified ||
        !input.blockQuestionsVerified)
    ) {
      throw new Error(
        'INCOMPLETE_REVIEW_CHECKLIST: Todos os itens do checklist de conferência devem estar verificados para aprovar a revisão.'
      );
    }

    const reviewerOrder = (currentVersionReviews.length + 1) as 1 | 2;
    const signedAt = new Date().toISOString();
    const signatureHash = crypto
      .createHash('sha256')
      .update(`${event.id}:${event.currentRevision.version}:${event.currentRevision.snapshotHash}:${input.reviewerUserId}:${signedAt}`)
      .digest('hex');

    const review: EventIndependentReview = {
      id: `rev_chk_${event.currentRevision.version}_${reviewerOrder}`,
      eventId: event.id,
      revisionVersion: event.currentRevision.version,
      revisionHash: event.currentRevision.snapshotHash,
      reviewerOrder,
      reviewerUserId: input.reviewerUserId,
      reviewerName: input.reviewerName,
      reviewerRole: input.reviewerRole,
      sectorsVerified: input.sectorsVerified,
      pricesAndFeesVerified: input.pricesAndFeesVerified,
      halfPriceRulesVerified: input.halfPriceRulesVerified,
      channelsAndPosVerified: input.channelsAndPosVerified,
      blockQuestionsVerified: input.blockQuestionsVerified,
      decision: input.decision,
      notes: input.notes,
      signedAt,
      signatureHash,
    };

    event.independentReviews.push(review);

    const approvedReviewsForCurrent = event.independentReviews.filter(
      (r) =>
        r.revisionVersion === event.currentRevision.version &&
        r.revisionHash === event.currentRevision.snapshotHash &&
        r.decision === 'APPROVED'
    );

    if (input.decision === 'REJECTED') {
      event.operationalStage = EventOperationalStage.EM_MONTAGEM;
      event.approvalStatus = EventApprovalStatus.PENDING_CORRECTION;
    } else if (approvedReviewsForCurrent.length >= 2) {
      event.operationalStage = EventOperationalStage.AGUARDANDO_PRODUTOR;
      event.approvalStatus = EventApprovalStatus.UNDER_REVIEW;
    } else {
      event.operationalStage = EventOperationalStage.EM_CONFERENCIA;
      event.approvalStatus = EventApprovalStatus.UNDER_REVIEW;
    }

    EventsService.appendAudit(event, {
      action: `INDEPENDENT_REVIEW_${reviewerOrder}_${input.decision}`,
      actorUserId: input.reviewerUserId,
      actorRole: input.reviewerRole,
      reason: input.notes || `${reviewerOrder}ª conferência independente executada`,
      previousValues: { stage: event.operationalStage },
      newValues: review,
    });

    return review;
  }

  /**
   * CASO DE ACEITAÇÃO 4:
   * Aprovação explícita do produtor vinculada à versão/hash exato da montagem antes de publicar ou vender.
   */
  public static submitProducerApproval(
    event: OperationalEventAggregate,
    input: {
      producerId: string;
      producerUserName: string;
      decision: 'APPROVED' | 'CORRECTION_REQUESTED';
      notes?: string;
    }
  ): EventProducerApproval {
    if (input.producerId !== event.producerId) {
      throw new Error('FORBIDDEN_PRODUCER_APPROVAL: Apenas o produtor titular do evento pode registrar o aceite da montagem.');
    }

    const approvedReviewsForCurrent = event.independentReviews.filter(
      (r) =>
        r.revisionVersion === event.currentRevision.version &&
        r.revisionHash === event.currentRevision.snapshotHash &&
        r.decision === 'APPROVED'
    );

    if (input.decision === 'APPROVED' && approvedReviewsForCurrent.length < 2) {
      throw new Error(
        'DUAL_INDEPENDENT_REVIEW_REQUIRED: O aceite final do produtor exige que as duas conferências independentes da versão atual estejam concluídas.'
      );
    }

    const decidedAt = new Date().toISOString();
    const evidenceHash = crypto
      .createHash('sha256')
      .update(`${event.id}:${input.producerId}:${event.currentRevision.version}:${event.currentRevision.snapshotHash}:${input.decision}:${decidedAt}`)
      .digest('hex');

    const producerApproval: EventProducerApproval = {
      id: `prod_app_v${event.currentRevision.version}_${Date.now()}`,
      eventId: event.id,
      producerId: input.producerId,
      producerUserName: input.producerUserName,
      revisionVersion: event.currentRevision.version,
      revisionHash: event.currentRevision.snapshotHash,
      decision: input.decision,
      notes: input.notes,
      decidedAt,
      evidenceHash,
    };

    event.producerApproval = producerApproval;

    if (input.decision === 'APPROVED') {
      event.operationalStage = EventOperationalStage.APROVADO;
      event.approvalStatus = EventApprovalStatus.APPROVED;
    } else {
      event.operationalStage = EventOperationalStage.EM_MONTAGEM;
      event.approvalStatus = EventApprovalStatus.PENDING_CORRECTION;
      event.publicationStatus = EventPublicationStatus.UNPUBLISHED;
      event.salesStatus = EventSalesStatus.NOT_OPEN;
      event.enabledChannels = [];
    }

    EventsService.appendAudit(event, {
      action: `PRODUCER_DECISION_${input.decision}`,
      actorUserId: input.producerId,
      actorRole: 'PRODUCER',
      reason: input.notes || 'Decisão formal do produtor sobre a versão da montagem',
      previousValues: null,
      newValues: producerApproval,
    });

    return producerApproval;
  }

  /**
   * Valida todas as pré-condições de governança (Casos 2, 3, 4 e 5) e publica/libera canais de forma coordenada.
   */
  public static validateAndPublishEventOmnichannel(
    event: OperationalEventAggregate,
    input: {
      channelsToEnable: SalesChannelType[];
      restrictedLinkOnly?: boolean;
      openSalesImmediately?: boolean;
      actorUserId: string;
      actorRole: string;
    }
  ): OperationalEventAggregate {
    // 1. Verifica Caso 2: Duas perguntas obrigatórias de bloqueio respondidas
    if (
      (event.blockQuestions.hasTechnicalProductionBlocks !== 'SIM' &&
        event.blockQuestions.hasTechnicalProductionBlocks !== 'NAO') ||
      (event.blockQuestions.hasVenueContractualCourtesyBlocks !== 'SIM' &&
        event.blockQuestions.hasVenueContractualCourtesyBlocks !== 'NAO')
    ) {
      throw new Error(
        'BLOCK_QUESTIONS_UNANSWERED: Evento sem resposta às duas perguntas obrigatórias de bloqueio (técnico e cortesia contratual) não pode ser publicado (STE.IT.001, p. 8).'
      );
    }

    // 2. Verifica Caso 5: Compatibilidade entre capacidade de setores, mapa e declaração
    EventsService.validateSectorAndMapCapacity(event);

    // 3. Verifica Caso 3: Dupla conferência independente na versão atual
    const validReviews = event.independentReviews.filter(
      (r) =>
        r.revisionVersion === event.currentRevision.version &&
        r.revisionHash === event.currentRevision.snapshotHash &&
        r.decision === 'APPROVED' &&
        r.reviewerUserId !== event.currentRevision.assembledByUserId
    );
    const uniqueReviewers = new Set(validReviews.map((r) => r.reviewerUserId));
    if (uniqueReviewers.size < 2) {
      throw new Error(
        'DUAL_INDEPENDENT_REVIEW_REQUIRED: Evento revisado por somente uma pessoa ou pelo próprio montador não pode ser publicado (STE.PO.001, p. 3).'
      );
    }

    // 4. Verifica Caso 4: Aceite explícito do produtor na versão atual
    if (
      !event.producerApproval ||
      event.producerApproval.decision !== 'APPROVED' ||
      event.producerApproval.revisionVersion !== event.currentRevision.version ||
      event.producerApproval.revisionHash !== event.currentRevision.snapshotHash
    ) {
      throw new Error(
        'PRODUCER_APPROVAL_REQUIRED: Evento sem aceite explícito do produtor na versão vigente não pode ser publicado nem vender em nenhum canal.'
      );
    }

    // 5. Verifica se não está cancelado
    if (event.realizationStatus === EventRealizationStatus.CANCELLED) {
      throw new Error('EVENT_CANCELLED_CANNOT_PUBLISH: Evento cancelado não pode ser publicado ou reaberto.');
    }

    // Se restrito somente por link, garante que PDV físico NÃO seja habilitado indevidamente (corrige falha legada STE.PO.001, p. 3)
    const restrictedLinkOnly = Boolean(input.restrictedLinkOnly);
    if (restrictedLinkOnly && input.channelsToEnable.includes('PDV')) {
      throw new Error(
        'RESTRICTED_LINK_PDV_CONFLICT: Evento configurado como restrito por link não pode habilitar vendas em PDV físico sem liberação explícita.'
      );
    }

    event.restrictedLinkOnly = restrictedLinkOnly;
    event.enabledChannels = [...new Set(input.channelsToEnable)];
    event.publicationStatus = EventPublicationStatus.PUBLISHED;
    event.operationalStage = input.openSalesImmediately
      ? EventOperationalStage.EM_OPERACAO
      : EventOperationalStage.PUBLICADO;
    event.salesStatus = input.openSalesImmediately ? EventSalesStatus.OPEN : EventSalesStatus.NOT_OPEN;

    EventsService.appendAudit(event, {
      action: 'EVENT_PUBLISHED_OMNICHANNEL',
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      reason: `Publicação autorizada nos canais: ${event.enabledChannels.join(', ')}`,
      previousValues: { publicationStatus: EventPublicationStatus.UNPUBLISHED },
      newValues: {
        publicationStatus: event.publicationStatus,
        salesStatus: event.salesStatus,
        enabledChannels: event.enabledChannels,
        restrictedLinkOnly: event.restrictedLinkOnly,
      },
    });

    return event;
  }

  /**
   * Trava Central Server-Side Omnicanal (Casos 4 e 9):
   * Impede vendas em QUALQUER canal (Site, App, PDV físico, API parceira, Link restrito)
   * se o evento não tiver dupla conferência, aceite vigente do produtor, vendas abertas e canal habilitado.
   */
  public static assertChannelSaleAllowed(
    event: OperationalEventAggregate,
    channel: SalesChannelType
  ): void {
    if (event.realizationStatus === EventRealizationStatus.CANCELLED) {
      throw new Error('EVENT_CANCELLED_SALES_BLOCKED: Evento cancelado não permite novos pedidos em site, PDV ou integração.');
    }

    if (
      !event.producerApproval ||
      event.producerApproval.decision !== 'APPROVED' ||
      event.producerApproval.revisionVersion !== event.currentRevision.version ||
      event.producerApproval.revisionHash !== event.currentRevision.snapshotHash
    ) {
      throw new Error(
        `PRODUCER_APPROVAL_REQUIRED_FOR_${channel}: Venda bloqueada no canal ${channel}. O evento não possui aceite válido do produtor para a versão atual.`
      );
    }

    const validReviews = event.independentReviews.filter(
      (r) =>
        r.revisionVersion === event.currentRevision.version &&
        r.revisionHash === event.currentRevision.snapshotHash &&
        r.decision === 'APPROVED' &&
        r.reviewerUserId !== event.currentRevision.assembledByUserId
    );
    if (new Set(validReviews.map((r) => r.reviewerUserId)).size < 2) {
      throw new Error(
        `DUAL_REVIEW_REQUIRED_FOR_${channel}: Venda bloqueada no canal ${channel}. Dupla conferência independente pendente.`
      );
    }

    if (
      event.publicationStatus !== EventPublicationStatus.PUBLISHED ||
      event.salesStatus !== EventSalesStatus.OPEN
    ) {
      throw new Error(
        `SALES_NOT_OPEN_FOR_${channel}: O evento não está com publicação ativa e vendas abertas.`
      );
    }

    if (event.restrictedLinkOnly && channel === 'PDV') {
      throw new Error(
        'PDV_BLOCKED_BY_RESTRICTED_LINK: Evento restrito por link bloqueia vendas no PDV físico (STE.PO.001, p. 3).'
      );
    }

    if (!event.enabledChannels.includes(channel)) {
      throw new Error(`CHANNEL_NOT_ENABLED: O canal ${channel} não está habilitado para este evento.`);
    }
  }

  /**
   * CASO DE ACEITAÇÃO 8:
   * Correção posterior à aprovação invalida aceite da versão anterior quando modifica dados materiais.
   */
  public static applyMaterialRevision(
    event: OperationalEventAggregate,
    updates: Partial<{
      title: string;
      venueName: string;
      startsAt: string;
      endsAt: string;
      declaredCapacity: number;
      serviceFeePct: number;
      sectors: OperationalSectorSpec[];
    }>,
    actor: { userId: string; userName: string; role: string; reason: string }
  ): OperationalEventAggregate {
    const previousSnapshot = structuredClone(event.currentRevision.materialFieldsSnapshot);
    const previousApproval = event.producerApproval ? structuredClone(event.producerApproval) : null;

    if (updates.title !== undefined) event.title = updates.title;
    if (updates.venueName !== undefined) event.venueName = updates.venueName;
    if (updates.startsAt !== undefined) event.startsAt = updates.startsAt;
    if (updates.endsAt !== undefined) event.endsAt = updates.endsAt;
    if (updates.declaredCapacity !== undefined) event.declaredCapacity = updates.declaredCapacity;
    if (updates.serviceFeePct !== undefined) event.serviceFeePct = updates.serviceFeePct;
    if (updates.sectors !== undefined) event.sectors = updates.sectors;

    const sectorsTotalCapacity = event.sectors.reduce((acc, s) => acc + s.capacity, 0);
    const newMaterialSnapshot: EventRevisionRecord['materialFieldsSnapshot'] = {
      title: event.title,
      venueName: event.venueName,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      declaredCapacity: event.declaredCapacity,
      sectorsTotalCapacity,
      serviceFeePct: event.serviceFeePct,
    };

    const newHash = EventsService.computeRevisionSnapshotHash(newMaterialSnapshot);
    const isMateriallyDifferent = newHash !== event.currentRevision.snapshotHash;

    if (isMateriallyDifferent) {
      const nextVersion = event.currentRevision.version + 1;
      const newRevision: EventRevisionRecord = {
        version: nextVersion,
        snapshotHash: newHash,
        assembledByUserId: actor.userId,
        assembledByName: actor.userName,
        reason: actor.reason,
        createdAt: new Date().toISOString(),
        materialFieldsSnapshot: newMaterialSnapshot,
      };

      event.currentRevision = newRevision;
      event.revisionHistory.push(newRevision);

      // Invalida o aceite da versão anterior e fecha vendas até nova conferência e novo aceite do produtor
      event.producerApproval = undefined;
      event.approvalStatus = EventApprovalStatus.UNDER_REVIEW;
      event.publicationStatus = EventPublicationStatus.UNPUBLISHED;
      event.salesStatus = EventSalesStatus.NOT_OPEN;
      event.operationalStage = EventOperationalStage.EM_CONFERENCIA;
      event.enabledChannels = [];

      EventsService.appendAudit(event, {
        action: 'MATERIAL_REVISION_APPROVAL_INVALIDATED',
        actorUserId: actor.userId,
        actorRole: actor.role,
        reason: actor.reason,
        previousValues: {
          version: nextVersion - 1,
          snapshot: previousSnapshot,
          previousProducerApproval: previousApproval,
        },
        newValues: {
          version: nextVersion,
          snapshot: newMaterialSnapshot,
          producerApprovalInvalidated: true,
        },
      });
    }

    return event;
  }

  /**
   * CASO DE ACEITAÇÃO 6:
   * Estados de assento separados e trava transacional contra venda/reserva dupla concorrente.
   */
  public static reserveOrSellSeatConcurrently(
    event: OperationalEventAggregate,
    input: {
      seatCode: string;
      channel: SalesChannelType;
      orderId: string;
      targetStatus: EventSeatStatus.RESERVADO_TEMPORARIAMENTE | EventSeatStatus.VENDIDO;
      actorUserId: string;
    }
  ): { seatCode: string; status: EventSeatStatus; orderId: string } {
    EventsService.assertChannelSaleAllowed(event, input.channel);

    const seat = event.seats[input.seatCode];
    if (!seat) {
      throw new Error(`SEAT_NOT_FOUND: Assento ${input.seatCode} não encontrado no mapa do evento.`);
    }

    if (seat.status !== EventSeatStatus.DISPONIVEL) {
      throw new Error(
        `SEAT_CONCURRENCY_CONFLICT: O assento ${input.seatCode} não está disponível (estado atual: ${seat.status}). Venda/reserva concorrente bloqueada.`
      );
    }

    const previousStatus = seat.status;
    seat.status = input.targetStatus;
    seat.holderOrderId = input.orderId;

    const sector = event.sectors.find((s) => s.id === seat.sectorId);
    if (sector && input.targetStatus === EventSeatStatus.VENDIDO) {
      sector.soldCount += 1;
    }

    EventsService.appendAudit(event, {
      action: `SEAT_${input.targetStatus}`,
      actorUserId: input.actorUserId,
      actorRole: 'SALES_ENGINE',
      reason: `Reserva/venda atômica do assento ${input.seatCode} pelo pedido ${input.orderId} via ${input.channel}`,
      previousValues: { seatCode: input.seatCode, status: previousStatus },
      newValues: { seatCode: input.seatCode, status: seat.status, holderOrderId: input.orderId },
    });

    return { seatCode: seat.seatCode, status: seat.status, orderId: input.orderId };
  }

  /**
   * Bloqueio técnico ou contratual de assentos (impede bloquear assento já vendido — Seção 5.2).
   */
  public static createSeatBlock(
    event: OperationalEventAggregate,
    input: {
      sectorId: string;
      blockType: EventSeatBlockRecord['blockType'];
      origin: string;
      reason: string;
      seatCodes: string[];
      responsibleUserId: string;
      responsibleName: string;
      reviewDeadline: string;
    }
  ): EventSeatBlockRecord {
    const sector = event.sectors.find((s) => s.id === input.sectorId);
    if (!sector) {
      throw new Error('SECTOR_NOT_FOUND: Setor não encontrado para bloqueio.');
    }

    for (const code of input.seatCodes) {
      const seat = event.seats[code];
      if (seat && (seat.status === EventSeatStatus.VENDIDO || seat.status === EventSeatStatus.UTILIZADO)) {
        throw new Error(
          `CANNOT_BLOCK_SOLD_SEAT: O assento ${code} já foi vendido/utilizado e não pode sofrer bloqueio.`
        );
      }
    }

    for (const code of input.seatCodes) {
      if (event.seats[code]) {
        event.seats[code].status = EventSeatStatus.BLOQUEADO;
      }
    }

    sector.blockedCount += input.seatCodes.length;

    const block: EventSeatBlockRecord = {
      id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      eventId: event.id,
      sectorId: sector.id,
      sectorName: sector.name,
      blockType: input.blockType,
      origin: input.origin,
      reason: input.reason,
      quantity: input.seatCodes.length,
      seatCodes: input.seatCodes,
      responsibleUserId: input.responsibleUserId,
      responsibleName: input.responsibleName,
      reviewDeadline: input.reviewDeadline,
      status: 'ATIVO',
      createdAt: new Date().toISOString(),
    };

    event.seatBlocks.push(block);

    EventsService.appendAudit(event, {
      action: 'SEAT_BLOCK_CREATED',
      actorUserId: input.responsibleUserId,
      actorRole: 'TECHNICAL_SUPPORT',
      reason: input.reason,
      previousValues: null,
      newValues: block,
    });

    return block;
  }

  /**
   * CASO DE ACEITAÇÃO 7 & 14:
   * Virada atômica de lote: fecha o lote anterior e ativa o próximo na mesma transação,
   * sem permitir preços misturados ou vendas no lote encerrado, gerando auditoria completa antes/depois.
   */
  public static executeAtomicLotTransition(
    event: OperationalEventAggregate,
    input: {
      closedLotId: string;
      openedLotId: string;
      newFacePrice?: number;
      triggerType: LotTransitionRecord['triggerType'];
      requestedByUserId: string;
      approvedByUserId: string;
      justification: string;
      idempotencyKey: string;
    }
  ): LotTransitionRecord {
    const existingTransition = event.lotTransitions.find((t) => t.idempotencyKey === input.idempotencyKey);
    if (existingTransition) {
      return existingTransition;
    }

    if (event.realizationStatus === EventRealizationStatus.CANCELLED) {
      throw new Error('EVENT_CANCELLED_LOT_TRANSITION_BLOCKED: Não é permitido virar lote de evento cancelado.');
    }

    const currentLot = event.lots.find((l) => l.id === input.closedLotId);
    const nextLot = event.lots.find((l) => l.id === input.openedLotId);

    if (!currentLot || !nextLot) {
      throw new Error('LOT_NOT_FOUND: Lote atual ou lote seguinte não encontrado no evento.');
    }

    if (currentLot.sectorId !== nextLot.sectorId) {
      throw new Error('LOT_SECTOR_MISMATCH: A virada de lote deve ocorrer dentro do mesmo setor.');
    }

    const previousFacePrice = currentLot.facePrice;
    const oldNextLotPrice = nextLot.facePrice;
    if (typeof input.newFacePrice === 'number' && input.newFacePrice > 0) {
      nextLot.facePrice = roundCurrency(input.newFacePrice);
    }

    // Transação atômica em memória: encerra anterior e ativa novo sem janela de ambos ativos
    currentLot.status = 'CLOSED';
    nextLot.status = 'ACTIVE';

    const transition: LotTransitionRecord = {
      id: `lot_tr_${Date.now()}`,
      eventId: event.id,
      sectorId: currentLot.sectorId,
      sectorName: currentLot.sectorName,
      closedLotId: currentLot.id,
      closedLotName: currentLot.name,
      previousFacePrice,
      openedLotId: nextLot.id,
      openedLotName: nextLot.name,
      newFacePrice: nextLot.facePrice,
      triggerType: input.triggerType,
      requestedByUserId: input.requestedByUserId,
      approvedByUserId: input.approvedByUserId,
      justification: input.justification,
      idempotencyKey: input.idempotencyKey,
      transitionedAt: new Date().toISOString(),
    };

    event.lotTransitions.push(transition);

    EventsService.appendAudit(event, {
      action: 'ATOMIC_LOT_TRANSITION',
      actorUserId: input.requestedByUserId,
      actorRole: 'TECHNICAL_SUPPORT',
      reason: input.justification,
      previousValues: {
        closedLotId: currentLot.id,
        closedLotStatus: 'ACTIVE',
        previousFacePrice,
        openedLotId: nextLot.id,
        openedLotPreviousStatus: 'PENDING',
        openedLotPreviousPrice: oldNextLotPrice,
      },
      newValues: {
        closedLotId: currentLot.id,
        closedLotStatus: 'CLOSED',
        openedLotId: nextLot.id,
        openedLotStatus: 'ACTIVE',
        newFacePrice: nextLot.facePrice,
        approvedByUserId: input.approvedByUserId,
      },
    });

    return transition;
  }

  /**
   * Valida e executa venda sobre lote ativo, impedindo venda em lote encerrado ou mistura de preços (Caso 7).
   */
  public static sellFromOperationalLot(
    event: OperationalEventAggregate,
    input: {
      lotId: string;
      quantity: number;
      channel: SalesChannelType;
      buyerName: string;
      buyerTaxId: string;
      buyerEmail: string;
      paymentMethod: 'PIX' | 'CREDIT_CARD' | 'CASH_PDV';
      startSequenceNumber: number;
    }
  ): { tickets: DiskIngressosTicketItem[]; unitFacePriceApplied: number; totalCharged: number } {
    EventsService.assertChannelSaleAllowed(event, input.channel);

    const lot = event.lots.find((l) => l.id === input.lotId);
    if (!lot) {
      throw new Error('LOT_NOT_FOUND: Lote não encontrado.');
    }

    if (lot.status !== 'ACTIVE') {
      throw new Error(
        `LOT_CLOSED_OR_INACTIVE: O lote "${lot.name}" encontra-se ${lot.status} e não permite novas vendas.`
      );
    }

    if (lot.soldCount + input.quantity > lot.quota) {
      throw new Error(`LOT_QUOTA_EXCEEDED: Quantidade solicitada excede o saldo do lote "${lot.name}".`);
    }

    lot.soldCount += input.quantity;
    const sector = event.sectors.find((s) => s.id === lot.sectorId);
    if (sector) {
      sector.soldCount += input.quantity;
    }

    const faceTotal = roundCurrency(lot.facePrice * input.quantity);
    const feeTotal = roundCurrency(lot.convenienceFee * input.quantity);
    event.internalFinancials.grossTicketSales = roundCurrency(event.internalFinancials.grossTicketSales + faceTotal);
    event.internalFinancials.totalServiceFees = roundCurrency(event.internalFinancials.totalServiceFees + feeTotal);

    const tickets = EventsService.generateTickets({
      eventId: event.id,
      eventName: event.title,
      batchId: lot.id,
      batchName: lot.name,
      sectorName: lot.sectorName,
      quantity: input.quantity,
      faceValue: lot.facePrice,
      convenienceFeeValue: lot.convenienceFee,
      buyerName: input.buyerName,
      buyerTaxId: input.buyerTaxId,
      buyerEmail: input.buyerEmail,
      paymentMethod: input.paymentMethod,
      startSequenceNumber: input.startSequenceNumber,
    });

    return {
      tickets,
      unitFacePriceApplied: lot.facePrice,
      totalCharged: roundCurrency(faceTotal + feeTotal),
    };
  }

  /**
   * CASO DE ACEITAÇÃO 13:
   * Emissão de Cortesias com Recibo Digital (Anexo 1) vinculado ao Borderô,
   * identificadores de 8 dígitos, assinatura/aceite e tarifa de impressão conforme contrato do evento.
   */
  public static issueCourtesyBatchWithReceipt(
    event: OperationalEventAggregate,
    input: {
      sectorId: string;
      recipientName: string;
      recipientDocument: string;
      quantity: number;
      deliveryMode: 'IMPRESSO_FISICO' | 'E_TICKET_PDF';
      issuerUserId: string;
      issuerName: string;
      startSequenceNumber: number;
    }
  ): { batch: TicketCourtesyBatchRecord; receipt: TicketReceiptRecord } {
    if (event.realizationStatus === EventRealizationStatus.CANCELLED) {
      throw new Error('EVENT_CANCELLED_COURTESY_BLOCKED: Evento cancelado não permite emissão de novas cortesias.');
    }

    const sector = event.sectors.find((s) => s.id === input.sectorId);
    if (!sector) {
      throw new Error('SECTOR_NOT_FOUND: Setor não encontrado para emissão de cortesias.');
    }

    if (sector.soldCount + sector.courtesyCount + input.quantity > sector.capacity) {
      throw new Error('SECTOR_CAPACITY_EXCEEDED: Quantidade de cortesias excede a capacidade disponível do setor.');
    }

    const ticketNumbers: string[] = [];
    for (let i = 0; i < input.quantity; i++) {
      ticketNumbers.push(formatTicketNumber(input.startSequenceNumber + i));
    }

    // Se impressa fisicamente, aplica a tarifa contratual específica do evento (não valor universal fixo)
    const unitPrintingFee = input.deliveryMode === 'IMPRESSO_FISICO' ? event.courtesyPrintingFeePerUnit : 0;
    const totalPrintingDebit = roundCurrency(unitPrintingFee * input.quantity);

    const issuedAt = new Date().toISOString();
    const batchId = `crt_batch_${Date.now()}`;
    const receiptId = `rcp_${Date.now()}`;
    const receiptCode = `REC-ANEXO1-${event.code}-${event.receipts.length + 1}`;
    const signatureHash = crypto
      .createHash('sha256')
      .update(`${receiptCode}:${event.id}:${input.issuerUserId}:${input.recipientDocument}:${ticketNumbers.join(',')}:${issuedAt}`)
      .digest('hex');

    const receipt: TicketReceiptRecord = {
      id: receiptId,
      receiptCode,
      courtesyBatchId: batchId,
      eventId: event.id,
      producerId: event.producerId,
      quantity: input.quantity,
      ticketRange: `${ticketNumbers[0]} a ${ticketNumbers[ticketNumbers.length - 1]}`,
      printingDebitForBordeau: totalPrintingDebit,
      issuerUserId: input.issuerUserId,
      issuerName: input.issuerName,
      receiverName: input.recipientName,
      receiverDocument: input.recipientDocument,
      signedAt: issuedAt,
      signatureHash,
      linkedToBordeau: true,
    };

    const batch: TicketCourtesyBatchRecord = {
      id: batchId,
      eventId: event.id,
      sectorId: sector.id,
      sectorName: sector.name,
      category: 'CORTESIA_NAO_COMERCIALIZAVEL',
      recipientName: input.recipientName,
      recipientTaxId: input.recipientDocument,
      quantity: input.quantity,
      ticketNumbers,
      deliveryMode: input.deliveryMode,
      unitPrintingFee,
      totalPrintingDebit,
      issuedByUserId: input.issuerUserId,
      issuedByName: input.issuerName,
      issuedAt,
      receipt,
    };

    sector.courtesyCount += input.quantity;
    event.courtesyBatches.push(batch);
    event.receipts.push(receipt);

    EventsService.appendAudit(event, {
      action: 'COURTESY_BATCH_AND_RECEIPT_ISSUED',
      actorUserId: input.issuerUserId,
      actorRole: 'TECHNICAL_SUPPORT',
      reason: `Emissão de ${input.quantity} cortesia(s) com Recibo Anexo 1 (${receiptCode})`,
      previousValues: null,
      newValues: { batchId, receiptCode, quantity: input.quantity, totalPrintingDebit, signatureHash },
    });

    return { batch, receipt };
  }

  /**
   * CASOS DE ACEITAÇÃO 9, 12 e 14:
   * Central de Alterações Críticas (Cancelamento, Adiamento com/sem data, Mudança de Local):
   * - Congela vendas em todos os canais (Site, PDV, App, API) imediatamente em Cancelamento ou Adiamento sem data.
   * - Apura valor total a devolver ao cliente, INCLUSIVE TAXAS DE CONVENIÊNCIA (documento cancelamento 2026).
   * - Gera plano de estorno supervisionado com status inicial SOLICITADO (sem execução bancária real e sem marcar CONCLUIDO sem confirmação do provedor).
   */
  public static registerCriticalEventChange(
    event: OperationalEventAggregate,
    input: {
      changeType: CriticalChangeType;
      reason: string;
      evidenceDocumentCode: string;
      requestedByUserId: string;
      requestedByName: string;
      actorRole: string;
      newStartDate?: string;
      newEndDate?: string;
      newVenueName?: string;
      newVenueCapacity?: number;
      existingPaidOrders: Array<{
        orderId: string;
        ticketNumber: string;
        buyerName: string;
        buyerTaxId: string;
        buyerEmail: string;
        paymentMethod: 'PIX' | 'CREDIT_CARD' | 'CASH_PDV';
        acquirerProvider: string;
        faceAmount: number;
        serviceFeeAmount: number;
      }>;
    }
  ): { changeRequest: CriticalEventChangeRequest; refundPlan: SupervisedRefundPlanItem[] } {
    const previousState = {
      salesStatus: event.salesStatus,
      realizationStatus: event.realizationStatus,
      enabledChannels: [...event.enabledChannels],
      startsAt: event.startsAt,
      venueName: event.venueName,
    };

    // Suspende vendas imediatamente em todos os canais
    event.salesStatus =
      input.changeType === 'CANCELAMENTO' ? EventSalesStatus.CLOSED : EventSalesStatus.SUSPENDED;
    event.enabledChannels = [];

    if (input.changeType === 'CANCELAMENTO') {
      event.realizationStatus = EventRealizationStatus.CANCELLED;
      event.operationalStage = EventOperationalStage.ENCERRADO;
    } else if (input.changeType === 'ADIAMENTO_COM_NOVA_DATA' || input.changeType === 'ADIAMENTO_SEM_DATA') {
      event.realizationStatus = EventRealizationStatus.POSTPONED;
      if (input.changeType === 'ADIAMENTO_COM_NOVA_DATA' && input.newStartDate) {
        event.startsAt = input.newStartDate;
        if (input.newEndDate) event.endsAt = input.newEndDate;
      }
    } else if (input.changeType === 'MUDANCA_DE_LOCAL' && input.newVenueName) {
      event.venueName = input.newVenueName;
      if (typeof input.newVenueCapacity === 'number') {
        event.venuePermitCapacity = input.newVenueCapacity;
      }
    }

    const totalTicketFaceToRefund = roundCurrency(
      input.existingPaidOrders.reduce((acc, o) => acc + o.faceAmount, 0)
    );
    const totalServiceFeesToRefund = roundCurrency(
      input.existingPaidOrders.reduce((acc, o) => acc + o.serviceFeeAmount, 0)
    );
    // Regra de Cancelamento 2026: Restituição integral ao consumidor, inclusive taxas
    const totalCustomerRefundObligation = roundCurrency(totalTicketFaceToRefund + totalServiceFeesToRefund);
    const producerCustodyBalanceAvailable = roundCurrency(
      Math.max(0, event.internalFinancials.grossTicketSales - event.internalFinancials.totalAcquirerFees)
    );
    const requiresProducerSupplement = roundCurrency(
      Math.max(0, totalCustomerRefundObligation - producerCustodyBalanceAvailable)
    );

    const changeId = `chg_${Date.now()}`;
    const changeRequest: CriticalEventChangeRequest = {
      id: changeId,
      eventId: event.id,
      eventName: event.title,
      producerId: event.producerId,
      changeType: input.changeType,
      reason: input.reason,
      evidenceDocumentCode: input.evidenceDocumentCode,
      requestedByUserId: input.requestedByUserId,
      requestedByName: input.requestedByName,
      newStartDate: input.newStartDate,
      newEndDate: input.newEndDate,
      newVenueName: input.newVenueName,
      newVenueCapacity: input.newVenueCapacity,
      allChannelsSalesSuspended: true,
      ticketContinuityPolicy:
        input.changeType === 'CANCELAMENTO'
          ? 'REEMBOLSO_INTEGRAL_INCLUINDO_TAXAS'
          : input.changeType === 'MUDANCA_DE_LOCAL'
          ? 'REALOCACAO_DE_MAPA'
          : 'VALIDOS_PARA_NOVA_DATA_COM_OPCAO_REEMBOLSO',
      financialImpact: {
        affectedOrdersCount: new Set(input.existingPaidOrders.map((o) => o.orderId)).size,
        affectedTicketsCount: input.existingPaidOrders.length,
        totalTicketFaceToRefund,
        totalServiceFeesToRefund,
        totalCustomerRefundObligation,
        producerCustodyBalanceAvailable,
        requiresProducerSupplement,
      },
      status: 'ABERTA_CONGELADA',
      createdAt: new Date().toISOString(),
    };

    event.criticalChanges.push(changeRequest);

    // CASO DE ACEITAÇÃO 12: Gera plano de estorno supervisionado em estado SOLICITADO (nunca CONCLUIDO sem provedor externo)
    const generatedRefunds: SupervisedRefundPlanItem[] = input.existingPaidOrders.map((order, idx) => ({
      id: `rfd_${changeId}_${idx + 1}`,
      eventId: event.id,
      changeRequestId: changeId,
      orderId: order.orderId,
      ticketNumber: formatTicketNumber(order.ticketNumber),
      buyerName: order.buyerName,
      buyerTaxId: order.buyerTaxId,
      buyerEmail: order.buyerEmail,
      paymentMethod: order.paymentMethod,
      acquirerProvider: order.acquirerProvider,
      faceAmount: order.faceAmount,
      serviceFeeAmount: order.serviceFeeAmount,
      totalRefundAmount: roundCurrency(order.faceAmount + order.serviceFeeAmount),
      status: 'SOLICITADO',
    }));

    event.refundPlan.push(...generatedRefunds);

    EventsService.appendAudit(event, {
      action: `CRITICAL_CHANGE_${input.changeType}`,
      actorUserId: input.requestedByUserId,
      actorRole: input.actorRole,
      reason: input.reason,
      previousValues: previousState,
      newValues: {
        changeRequest,
        refundItemsCreated: generatedRefunds.length,
        salesStatus: event.salesStatus,
        enabledChannels: event.enabledChannels,
      },
    });

    return { changeRequest, refundPlan: generatedRefunds };
  }

  /**
   * CASO DE ACEITAÇÃO 12:
   * Estorno solicitado não aparece como CONCLUIDO sem confirmação real do provedor/adquirente;
   * Na Fase 1, a autorização interna move apenas para AGUARDANDO_ADQUIRENTE (sem disparar execução bancária real).
   */
  public static advanceSupervisedRefundStatus(
    event: OperationalEventAggregate,
    input: {
      refundItemId: string;
      targetStatus: 'AUTORIZADO_FINANCEIRO' | 'AGUARDANDO_ADQUIRENTE' | 'CONCLUIDO';
      actorUserId: string;
      actorRole: string;
      externalProviderConfirmationId?: string;
    }
  ): SupervisedRefundPlanItem {
    const item = event.refundPlan.find((r) => r.id === input.refundItemId);
    if (!item) {
      throw new Error('REFUND_ITEM_NOT_FOUND: Item do plano de estorno não encontrado.');
    }

    if (input.targetStatus === 'CONCLUIDO' && !input.externalProviderConfirmationId?.trim()) {
      throw new Error(
        'PROVIDER_CONFIRMATION_REQUIRED: Estorno não pode ser marcado como CONCLUIDO sem o protocolo real de confirmação da adquirente/provedor.'
      );
    }

    const previousStatus = item.status;
    item.status = input.targetStatus;

    if (input.targetStatus === 'AUTORIZADO_FINANCEIRO' || input.targetStatus === 'AGUARDANDO_ADQUIRENTE') {
      item.authorizedByUserId = input.actorUserId;
      item.authorizedAt = new Date().toISOString();
    }

    if (input.targetStatus === 'CONCLUIDO' && input.externalProviderConfirmationId) {
      item.externalProviderConfirmationId = input.externalProviderConfirmationId.trim();
      item.completedAt = new Date().toISOString();
    }

    EventsService.appendAudit(event, {
      action: `SUPERVISED_REFUND_${input.targetStatus}`,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      reason: `Atualização supervisionada do estorno ${item.id} (Pedido ${item.orderId})`,
      previousValues: { status: previousStatus },
      newValues: {
        status: item.status,
        externalProviderConfirmationId: item.externalProviderConfirmationId,
      },
    });

    return item;
  }

  /**
   * CASOS DE ACEITAÇÃO 10 e 11:
   * - Caso 10: Comunicação de adiamento usa texto de adiamento, nunca template de cancelamento; mudança de local usa texto próprio.
   * - Caso 11: Custo do WhatsApp é calculado por tabela vigente versionada (não 0,51 ou 0,61 fixos hardcoded), com deduplicação de contatos (LGPD).
   */
  public static previewAndValidateEventCommunication(
    event: OperationalEventAggregate,
    input: {
      changeType?: CriticalChangeType;
      templateId: string;
      purpose: CommunicationPurpose;
      pricingVersionCode: string;
      recipientContacts: string[]; // E-mails ou telefones dos pedidos reais
      costResponsibility: CustomerCommunicationDispatch['costResponsibility'];
      customPricingTable?: CommunicationPricingVersion[];
      customTemplates?: OfficialCommunicationTemplate[];
      actorUserId: string;
    }
  ): CustomerCommunicationDispatch {
    const templates = input.customTemplates || EventsService.OFFICIAL_COMMUNICATION_TEMPLATES;
    const pricingTable = input.customPricingTable || EventsService.DEFAULT_COMMUNICATION_PRICING_TABLE;

    const template = templates.find((t) => t.id === input.templateId || t.code === input.templateId);
    if (!template) {
      throw new Error('COMMUNICATION_TEMPLATE_NOT_FOUND: Template oficial de comunicação não encontrado.');
    }

    // CASO 10: Impede usar template de cancelamento em adiamento ou mudança de local (e vice-versa)
    if (input.changeType && template.category !== input.changeType) {
      throw new Error(
        `TEMPLATE_CATEGORY_MISMATCH: A ocorrência "${input.changeType}" exige template específico da mesma categoria, sendo proibido usar template de "${template.category}".`
      );
    }

    // Verifica contaminação textual (folhetos de 2026 tinham "foi cancelado" dentro de textos de adiamento)
    if (
      (template.category === 'ADIAMENTO_COM_NOVA_DATA' ||
        template.category === 'ADIAMENTO_SEM_DATA' ||
        template.category === 'MUDANCA_DE_LOCAL') &&
      /foi cancelado|evento cancelado/i.test(template.bodyTemplate)
    ) {
      throw new Error(
        'TEMPLATE_TEXT_CONTAMINATED: O texto de adiamento/mudança de local contém menção indevida a "cancelamento" (STE.PO.002 / Seção 5.5).'
      );
    }

    // CASO 11: Busca tarifa exclusivamente na tabela versionada vigente por canal e finalidade
    const pricingRule = pricingTable.find(
      (p) =>
        p.versionCode === input.pricingVersionCode &&
        p.channel === template.channel &&
        p.purpose === input.purpose &&
        p.isActive
    );

    if (!pricingRule) {
      throw new Error(
        `PRICING_VERSION_INVALID: Não há tabela de preço ativa para o código "${input.pricingVersionCode}", canal "${template.channel}" e finalidade "${input.purpose}".`
      );
    }

    // Deduplicação por contato para fins de disparo (LGPD / Seção 5.4 item 6)
    const normalizedContacts = input.recipientContacts
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
    const deduplicatedCount = new Set(normalizedContacts).size;
    const estimatedTotalCost = roundCurrency(deduplicatedCount * pricingRule.unitPriceBrl);

    const dispatch: CustomerCommunicationDispatch = {
      id: `comm_${Date.now()}`,
      eventId: event.id,
      changeType: input.changeType,
      templateId: template.id,
      templateCategory: template.category,
      channel: template.channel,
      purpose: input.purpose,
      pricingVersionCode: pricingRule.versionCode,
      unitCostApplied: pricingRule.unitPriceBrl,
      rawOrdersCount: input.recipientContacts.length,
      deduplicatedRecipientsCount: deduplicatedCount,
      estimatedTotalCost,
      costResponsibility: input.costResponsibility,
      financialApproved: estimatedTotalCost === 0,
      status: 'PREVIA_ORCAMENTO',
      createdAt: new Date().toISOString(),
    };

    event.communications.push(dispatch);

    EventsService.appendAudit(event, {
      action: 'COMMUNICATION_PREVIEW_CREATED',
      actorUserId: input.actorUserId,
      actorRole: 'MARKETING_OR_SAC',
      reason: `Orçamento e validação de comunicado (${template.code}) via tabela ${pricingRule.versionCode}`,
      previousValues: null,
      newValues: dispatch,
    });

    return dispatch;
  }

  /**
   * Liberação formal de bloqueio de assentos/cota (STE.PO.003)
   * Rota: POST /api/eventos/{eventId}/bloqueios/{blockId}/liberacao
   */
  public static releaseSeatBlock(
    event: OperationalEventAggregate,
    input: {
      blockId: string;
      releasedByUserId: string;
      releasedByName: string;
      reason: string;
    }
  ): EventSeatBlockRecord {
    const block = event.seatBlocks.find((b) => b.id === input.blockId);
    if (!block) {
      throw new Error(`BLOCK_NOT_FOUND: Bloqueio '${input.blockId}' não localizado neste evento.`);
    }
    if (block.status === 'LIBERADO_PARA_VENDA') {
      throw new Error('BLOCK_ALREADY_RELEASED: Este bloqueio já foi liberado anteriormente.');
    }

    const sector = event.sectors.find((s) => s.id === block.sectorId);
    if (sector) {
      sector.blockedCount = Math.max(0, sector.blockedCount - block.quantity);
    }

    for (const code of block.seatCodes) {
      const seat = event.seats[code];
      if (seat && seat.status === EventSeatStatus.BLOQUEADO) {
        seat.status = EventSeatStatus.DISPONIVEL;
      }
    }

    block.status = 'LIBERADO_PARA_VENDA';

    EventsService.appendAudit(event, {
      action: 'SEAT_BLOCK_RELEASED',
      actorUserId: input.releasedByUserId,
      actorRole: 'TECHNICAL_SUPPORT',
      reason: input.reason || 'Liberação autorizada de bloqueio técnico/contratual para venda',
      previousValues: { blockId: block.id, status: 'ATIVO', quantity: block.quantity },
      newValues: { blockId: block.id, status: 'LIBERADO_PARA_VENDA', releasedByName: input.releasedByName },
    });

    return block;
  }

  /**
   * Assinatura/aceite formal do Recibo Digital de Cortesias Anexo 1
   * Rota: POST /api/eventos/{eventId}/cortesias/{batchId}/recibo
   */
  public static signCourtesyReceipt(
    event: OperationalEventAggregate,
    input: {
      batchId: string;
      signedByName: string;
      signedByDocument: string;
      signatureHash?: string;
    }
  ): TicketReceiptRecord {
    const batch = event.courtesyBatches.find((b) => b.id === input.batchId);
    if (!batch) {
      throw new Error(`COURTESY_BATCH_NOT_FOUND: Lote de cortesia '${input.batchId}' não localizado.`);
    }
    const receipt = event.receipts.find((r) => r.courtesyBatchId === batch.id);
    if (!receipt) {
      throw new Error('COURTESY_RECEIPT_NOT_FOUND: Recibo Anexo 1 vinculado ao lote não localizado.');
    }

    const signedAt = new Date().toISOString();
    const signatureHash =
      input.signatureHash ||
      crypto
        .createHash('sha256')
        .update(`${receipt.receiptCode}:${input.signedByName}:${input.signedByDocument}:${signedAt}`)
        .digest('hex');

    receipt.receiverName = input.signedByName;
    receipt.receiverDocument = input.signedByDocument;
    receipt.signedAt = signedAt;
    receipt.signatureHash = signatureHash;

    EventsService.appendAudit(event, {
      action: 'COURTESY_RECEIPT_SIGNED_ANEXO_1',
      actorUserId: input.signedByDocument,
      actorRole: 'PRODUCER_RECIPIENT',
      reason: `Assinatura digital do Recibo Anexo 1 (${receipt.receiptCode})`,
      previousValues: { receiptCode: receipt.receiptCode },
      newValues: {
        receiptCode: receipt.receiptCode,
        signedByName: input.signedByName,
        signedAt,
        signatureHash,
      },
    });

    return receipt;
  }

  /**
   * Validação formal jurídica/financeira de Solicitação de Alteração Crítica (STE.PO.002)
   * Rota: POST /api/eventos/{eventId}/alteracoes-criticas/{changeId}/validar
   */
  public static validateCriticalEventChange(
    event: OperationalEventAggregate,
    input: {
      changeId: string;
      approvedByUserId: string;
      approvedByName: string;
      financialStatusNote?: string;
    }
  ): CriticalEventChangeRequest {
    const change = event.criticalChanges.find((c) => c.id === input.changeId);
    if (!change) {
      throw new Error(`CRITICAL_CHANGE_NOT_FOUND: Alteração crítica '${input.changeId}' não localizada.`);
    }

    const prevStatus = change.status;
    change.status = 'APROVADA_PARA_COMUNICACAO';

    EventsService.appendAudit(event, {
      action: 'CRITICAL_CHANGE_VALIDATED_BY_FINANCE',
      actorUserId: input.approvedByUserId,
      actorRole: 'FINANCE_COORDINATOR',
      reason: input.financialStatusNote || 'Validação financeira e jurídica da alteração crítica concluída (STE.PO.002)',
      previousValues: { changeId: change.id, status: prevStatus },
      newValues: {
        changeId: change.id,
        status: change.status,
        approvedByName: input.approvedByName,
      },
    });

    return change;
  }

  /**
   * Aprovação formal e disparo auditado de Comunicado ao Público (STE.PO.002 / Pacote 2026)
   * Rota: POST /api/eventos/{eventId}/comunicados/{commId}/aprovar
   */
  public static approveEventCommunication(
    event: OperationalEventAggregate,
    input: {
      commId: string;
      approvedByUserId: string;
      approvedByName: string;
    }
  ): CustomerCommunicationDispatch {
    const comm = event.communications.find((c) => c.id === input.commId);
    if (!comm) {
      throw new Error(`COMMUNICATION_NOT_FOUND: Comunicado '${input.commId}' não localizado.`);
    }

    const previousStatus = comm.status;
    const dispatchedAt = new Date().toISOString();
    comm.status = 'ENVIADO';
    comm.financialApproved = true;
    comm.textApprovedByUserId = input.approvedByUserId;

    EventsService.appendAudit(event, {
      action: 'CUSTOMER_COMMUNICATION_APPROVED_AND_SENT',
      actorUserId: input.approvedByUserId,
      actorRole: 'COMMUNICATION_APPROVER',
      reason: `Aprovação e envio de comunicado oficial (${comm.pricingVersionCode} — Total R$ ${comm.estimatedTotalCost})`,
      previousValues: { commId: comm.id, status: previousStatus },
      newValues: {
        commId: comm.id,
        status: comm.status,
        approvedByName: input.approvedByName,
        dispatchedAt,
      },
    });

    return comm;
  }

  /**
   * Registro de Ocorrência Operacional de Portaria/Bilheteria/Suporte (STE.PO.003)
   * Rota: POST /api/eventos/{eventId}/ocorrencias
   */
  public static registerEventIncident(
    event: OperationalEventAggregate,
    input: {
      type:
        | 'INGRESSO_CANCELADO_PORTARIA'
        | 'MEIA_ENTRADA_SEM_DOCUMENTO'
        | 'FALSA_DUPLICIDADE'
        | 'EQUIPAMENTO_VALIDADOR'
        | 'SUSPEITA_FRAUDE'
        | 'DIVERGENCIA_CADASTRO';
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      sectorName: string;
      ticketNumber8Digits?: string;
      description: string;
      resolution: string;
      reportedBy: string;
    }
  ) {
    // Regra STE.PO.003 p. 4 vs Seção 10: Ingresso cancelado na portaria NÃO pode entrar sem título válido ou substituição formal
    if (
      input.type === 'INGRESSO_CANCELADO_PORTARIA' &&
      input.resolution.toLowerCase().includes('entrada liberada sem ingresso')
    ) {
      throw new Error(
        'INVALID_GATE_BYPASS_BLOCKED: Proibido liberar acesso na portaria com ingresso cancelado sem emissão de título válido ou autorização formal que respeite a capacidade do setor.'
      );
    }

    const incident = {
      id: `inc_${Date.now()}_${event.incidents.length + 1}`,
      eventId: event.id,
      type: input.type,
      severity: input.severity,
      sectorName: input.sectorName,
      ticketNumber8Digits: input.ticketNumber8Digits,
      description: input.description,
      resolution: input.resolution,
      status: 'OPEN' as const,
      reportedBy: input.reportedBy,
      createdAt: new Date().toISOString(),
    };

    event.incidents.push(incident);

    EventsService.appendAudit(event, {
      action: 'EVENT_SUPPORT_INCIDENT_RECORDED',
      actorUserId: input.reportedBy,
      actorRole: 'BOX_OFFICE_GATE',
      reason: `Ocorrência de suporte registrada: ${input.type}`,
      previousValues: null,
      newValues: incident,
    });

    return incident;
  }

  // ==========================================================================
  // MÉTODOS DE INSTÂNCIA PARA ROTAS REST (/api/eventos/...)
  // ==========================================================================

  private ensureSeedOperationalEvents(tenantId = '00000000-0000-0000-0000-000000000001') {
    if (this.operationalEvents.size > 0) return;

    const evt1 = EventsService.createOperationalEvent({
      id: 'evt-op-01',
      tenantId,
      companyId: '00000000-0000-0000-0000-000000000002',
      code: 'EVT-2026-001',
      title: 'Curitiba Rock Fest 2026 — Edição Prime',
      producerId: 'prod-01',
      producerName: 'Live Nation Brasil',
      venueName: 'Pedreira Paulo Leminski',
      cityState: 'Curitiba / PR',
      startsAt: '2026-11-14T16:00:00Z',
      endsAt: '2026-11-15T02:00:00Z',
      declaredCapacity: 25000,
      venuePermitCapacity: 25000,
      serviceFeePct: 12,
      courtesyPrintingFeePerUnit: 2.5,
      assembledByUserId: 'usr-suporte-montador-01',
      assembledByName: 'Lucas Andrade (Suporte Técnico)',
      sectors: [
        { id: 'sec-pista', name: 'Pista Premium', capacity: 15000, soldCount: 0, blockedCount: 0, courtesyCount: 0 },
        { id: 'sec-vip', name: 'Camarote Open Bar', capacity: 5000, soldCount: 0, blockedCount: 0, courtesyCount: 0 },
        { id: 'sec-geral', name: 'Arena Geral', capacity: 5000, soldCount: 0, blockedCount: 0, courtesyCount: 0 },
      ],
      seats: [
        { seatCode: 'VIP-A01', sectorId: 'sec-vip' },
        { seatCode: 'VIP-A02', sectorId: 'sec-vip' },
        { seatCode: 'VIP-A03', sectorId: 'sec-vip' },
      ],
      lots: [
        {
          id: 'lot-pista-1',
          sectorId: 'sec-pista',
          sectorName: 'Pista Premium',
          name: '1º Lote Pista Premium',
          facePrice: 280,
          convenienceFee: 33.6,
          quota: 5000,
          soldCount: 0,
          status: 'ACTIVE',
          discountAppliesOnlyToFullPrice: true,
        },
        {
          id: 'lot-pista-2',
          sectorId: 'sec-pista',
          sectorName: 'Pista Premium',
          name: '2º Lote Pista Premium',
          facePrice: 340,
          convenienceFee: 40.8,
          quota: 10000,
          soldCount: 0,
          status: 'PENDING',
          discountAppliesOnlyToFullPrice: true,
        },
      ],
    });

    this.operationalEvents.set(evt1.id, evt1);
  }

  public getOrCreateOperationalEvent(eventId: string, tenantId = '00000000-0000-0000-0000-000000000001'): OperationalEventAggregate {
    this.ensureSeedOperationalEvents(tenantId);
    const existing = this.operationalEvents.get(eventId);
    if (existing) return existing;

    const created = EventsService.createOperationalEvent({
      id: eventId,
      tenantId,
      companyId: '00000000-0000-0000-0000-000000000002',
      code: `EVT-${eventId.toUpperCase().slice(0, 8)}`,
      title: `Evento Operacional ${eventId}`,
      producerId: 'prod-01',
      producerName: 'Live Nation Brasil',
      venueName: 'Ópera de Arame',
      cityState: 'Curitiba / PR',
      startsAt: '2026-12-10T20:00:00Z',
      endsAt: '2026-12-10T23:59:00Z',
      declaredCapacity: 2000,
      venuePermitCapacity: 2400,
      serviceFeePct: 12,
      assembledByUserId: 'usr-montador-01',
      assembledByName: 'Lucas Andrade (Suporte Técnico)',
      sectors: [
        { id: 'sec-plateia', name: 'Plateia Central', capacity: 2000, hasNumberedSeats: true, mapSeatCount: 2000, soldCount: 0, blockedCount: 0, courtesyCount: 0 },
      ],
      seats: [
        { seatCode: 'PLT-01', sectorId: 'sec-plateia' },
        { seatCode: 'PLT-02', sectorId: 'sec-plateia' },
      ],
      lots: [
        {
          id: 'lot-01',
          sectorId: 'sec-plateia',
          sectorName: 'Plateia Central',
          name: '1º Lote Plateia',
          facePrice: 200,
          convenienceFee: 24,
          quota: 1000,
          soldCount: 0,
          status: 'ACTIVE',
          discountAppliesOnlyToFullPrice: true,
        },
        {
          id: 'lot-02',
          sectorId: 'sec-plateia',
          sectorName: 'Plateia Central',
          name: '2º Lote Plateia',
          facePrice: 250,
          convenienceFee: 30,
          quota: 1000,
          soldCount: 0,
          status: 'PENDING',
          discountAppliesOnlyToFullPrice: true,
        },
      ],
    });
    this.operationalEvents.set(eventId, created);
    return created;
  }

  public createIntakeRequest(context: TenantExecutionContext, payload: Partial<EventIntakeRecord>): EventIntakeRecord {
    const id = payload.id || `int_${Date.now()}`;
    const record: EventIntakeRecord = {
      id,
      code: payload.code || `SOL-2026-${String(this.operationalIntakes.size + 1).padStart(3, '0')}`,
      producerId: payload.producerId || context.externalEntityId || 'prod-01',
      producerName: payload.producerName || 'Live Nation Brasil',
      originChannel: payload.originChannel || 'COMERCIAL',
      requestedByName: payload.requestedByName || context.userEmail || 'Comercial DiskIngressos',
      eventTitle: payload.eventTitle || 'Novo Espetáculo Homologado',
      venueName: payload.venueName || 'Teatro Positivo',
      cityState: payload.cityState || 'Curitiba / PR',
      proposedStartDate: payload.proposedStartDate || '2026-12-15',
      declaredCapacity: Number(payload.declaredCapacity || 2100),
      hasVenueAuthorizationDoc: Boolean(payload.hasVenueAuthorizationDoc ?? true),
      hasCommercialContractApproved: Boolean(payload.hasCommercialContractApproved ?? true),
      commercialFeePct: Number(payload.commercialFeePct ?? 12),
      courtesyPrintingFeePerUnit: Number(payload.courtesyPrintingFeePerUnit ?? 2.5),
      pendingItems: payload.pendingItems || [],
      status: payload.pendingItems && payload.pendingItems.length > 0 ? 'PENDENTE_DADOS' : 'EM_MONTAGEM',
      createdAt: new Date().toISOString(),
    };
    this.operationalIntakes.set(id, record);
    return record;
  }

  public listIntakeRequests(context: TenantExecutionContext, statusFilter?: string): EventIntakeRecord[] {
    const all = Array.from(this.operationalIntakes.values());
    const isProducer = context.userType === 'EXTERNAL_PRODUCER' || context.roleCode === 'PRODUCER';
    return all.filter((item) => {
      if (isProducer && context.externalEntityId && item.producerId !== context.externalEntityId) {
        return false;
      }
      if (statusFilter && item.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }
}
