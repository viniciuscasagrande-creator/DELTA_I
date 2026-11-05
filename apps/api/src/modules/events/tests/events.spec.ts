import { describe, it, expect } from 'vitest';
import { EventsService } from '../services/events.service';
import {
  EventApprovalStatus,
  EventPublicationStatus,
  EventSalesStatus,
  EventRealizationStatus,
  EventSeatStatus,
  formatTicketNumber,
} from '@delta-erp/shared';

function createBaseTestEvent() {
  return EventsService.createOperationalEvent({
    id: 'evt-test-01',
    tenantId: 'tenant-disk-01',
    companyId: 'comp-disk-01',
    code: 'EVT-2026-900',
    title: 'Festival Sinfônico de Curitiba 2026',
    producerId: 'prod-live-01',
    producerName: 'Live Nation Sul',
    venueName: 'Teatro Guaíra',
    cityState: 'Curitiba / PR',
    startsAt: '2026-12-20T20:00:00Z',
    endsAt: '2026-12-20T23:30:00Z',
    declaredCapacity: 2000,
    venuePermitCapacity: 2200,
    serviceFeePct: 12,
    courtesyPrintingFeePerUnit: 3.25,
    assembledByUserId: 'usr-montador-lucas',
    assembledByName: 'Lucas Andrade (Montador)',
    sectors: [
      {
        id: 'sec-plateia',
        name: 'Plateia A Numerada',
        capacity: 1200,
        hasNumberedSeats: true,
        mapSeatCount: 1200,
        soldCount: 0,
        blockedCount: 0,
        courtesyCount: 0,
      },
      {
        id: 'sec-balcao',
        name: 'Balcão Nobre',
        capacity: 800,
        hasNumberedSeats: false,
        soldCount: 0,
        blockedCount: 0,
        courtesyCount: 0,
      },
    ],
    seats: [
      { seatCode: 'A-01', sectorId: 'sec-plateia' },
      { seatCode: 'A-02', sectorId: 'sec-plateia' },
      { seatCode: 'A-03', sectorId: 'sec-plateia' },
    ],
    lots: [
      {
        id: 'lot-1',
        sectorId: 'sec-balcao',
        sectorName: 'Balcão Nobre',
        name: '1º Lote Balcão',
        facePrice: 150,
        convenienceFee: 18,
        quota: 400,
        soldCount: 0,
        status: 'ACTIVE',
        discountAppliesOnlyToFullPrice: true,
      },
      {
        id: 'lot-2',
        sectorId: 'sec-balcao',
        sectorName: 'Balcão Nobre',
        name: '2º Lote Balcão',
        facePrice: 200,
        convenienceFee: 24,
        quota: 400,
        soldCount: 0,
        status: 'PENDING',
        discountAppliesOnlyToFullPrice: true,
      },
    ],
  });
}

function approveEventFully(evt: ReturnType<typeof createBaseTestEvent>) {
  EventsService.answerMandatoryBlockQuestions(evt, {
    hasTechnicalProductionBlocks: 'SIM',
    technicalProductionBlocksDetail: '20 assentos fila K reservados para mesa de som/luz',
    hasVenueContractualCourtesyBlocks: 'NAO',
    actorUserId: 'usr-montador-lucas',
    actorRole: 'TECHNICAL_SUPPORT',
  });

  EventsService.submitIndependentReview(evt, {
    reviewerUserId: 'usr-conferente-01',
    reviewerName: 'Mariana Costa (Conferente 1)',
    reviewerRole: 'TECHNICAL_SUPPORT_REVIEWER',
    sectorsVerified: true,
    pricesAndFeesVerified: true,
    halfPriceRulesVerified: true,
    channelsAndPosVerified: true,
    blockQuestionsVerified: true,
    decision: 'APPROVED',
  });

  EventsService.submitIndependentReview(evt, {
    reviewerUserId: 'usr-conferente-02',
    reviewerName: 'Rafael Souza (Conferente 2)',
    reviewerRole: 'SUPPORT_COORDINATOR',
    sectorsVerified: true,
    pricesAndFeesVerified: true,
    halfPriceRulesVerified: true,
    channelsAndPosVerified: true,
    blockQuestionsVerified: true,
    decision: 'APPROVED',
  });

  EventsService.submitProducerApproval(evt, {
    producerId: 'prod-live-01',
    producerUserName: 'Diretoria Live Nation Sul',
    decision: 'APPROVED',
    notes: 'De acordo com preços, mapa e taxas do evento.',
  });
}

describe('Módulo de Eventos & Ingressos (ERP DiskIngressos — Pacotes 00 a 07)', () => {
  it('deve formatar o número do ingresso rigorosamente com 8 dígitos numéricos com zeros à esquerda', () => {
    expect(formatTicketNumber(1)).toBe('00000001');
    expect(formatTicketNumber(42)).toBe('00000042');
    expect(formatTicketNumber(88410)).toBe('00088410');
    expect(formatTicketNumber('12345678')).toBe('12345678');
    expect(formatTicketNumber('invalid_text')).toBe('00000000');
  });

  it('deve aplicar as regras das 4 dimensões de estado (vendas não abrem sem aprovação)', () => {
    expect(() => {
      EventsService.validateStateTransition(
        {
          approvalStatus: EventApprovalStatus.DRAFT,
          publicationStatus: EventPublicationStatus.UNPUBLISHED,
          salesStatus: EventSalesStatus.NOT_OPEN,
          realizationStatus: EventRealizationStatus.SCHEDULED,
        },
        { salesStatus: EventSalesStatus.OPEN }
      );
    }).toThrowError(/EVENT_SALES_NOT_ALLOWED/);

    const valid = EventsService.validateStateTransition(
      {
        approvalStatus: EventApprovalStatus.APPROVED,
        publicationStatus: EventPublicationStatus.PUBLISHED,
        salesStatus: EventSalesStatus.NOT_OPEN,
        realizationStatus: EventRealizationStatus.SCHEDULED,
      },
      { salesStatus: EventSalesStatus.OPEN }
    );
    expect(valid.salesStatus).toBe(EventSalesStatus.OPEN);

    const cancelled = EventsService.validateStateTransition(valid, {
      realizationStatus: EventRealizationStatus.CANCELLED,
    });
    expect(cancelled.salesStatus).toBe(EventSalesStatus.CLOSED);
  });

  it('deve emitir ingressos com número de 8 dígitos e credencial criptográfica segura (HMAC-SHA256)', () => {
    const tickets = EventsService.generateTickets({
      eventId: 'evt-rock-2026',
      eventName: 'Curitiba Rock Fest 2026',
      batchId: 'batch-01',
      batchName: 'Lote 1 Pista',
      sectorName: 'Pista Premium',
      quantity: 3,
      faceValue: 200.0,
      convenienceFeeValue: 30.0,
      buyerName: 'Eduardo Silveira',
      buyerTaxId: '123.456.789-00',
      buyerEmail: 'eduardo@teste.com.br',
      paymentMethod: 'PIX',
      startSequenceNumber: 1,
      hmacSecret: 'test-secret-salt-2026',
    });

    expect(tickets).toHaveLength(3);
    expect(tickets[0].ticketNumber).toBe('00000001');
    expect(tickets[1].ticketNumber).toBe('00000002');
    expect(tickets[2].ticketNumber).toBe('00000003');
    expect(tickets[0].validationHash).toHaveLength(64);
    expect(tickets[0].validationHash).not.toBe(tickets[1].validationHash);
    expect(tickets[0].faceValue).toBe(200.0);
    expect(tickets[0].convenienceFeeValue).toBe(30.0);
    expect(tickets[0].totalPaid).toBe(230.0);
    expect(tickets[0].status).toBe('ISSUED');
  });

  it('deve apurar com exatidão o saldo líquido disponível para repasse ao produtor', () => {
    const balance = EventsService.calculateProducerAvailableBalance({
      grossTicketSales: 250000.0,
      totalAcquirerFees: 4250.5,
      totalChargebacks: 1200.0,
      totalAdvanced: 50000.0,
      totalPaidOut: 40000.0,
    });

    expect(balance).toBe(154549.5);
  });

  // ==========================================================================
  // 16 CASOS MÍNIMOS DE ACEITAÇÃO OBRIGATÓRIOS (SEÇÃO 12 DA ESPECIFICAÇÃO)
  // ==========================================================================

  it('Caso 1: Produtor não enxerga evento de outro produtor nem dados internos da Disk', () => {
    const evt = createBaseTestEvent();

    // Outro produtor tentando consultar deve ser bloqueado com erro de escopo
    expect(() =>
      EventsService.enforceProducerScopeAndSanitize(evt, {
        tenantId: 'tenant-disk-01',
        userType: 'EXTERNAL_PRODUCER',
        roleCode: 'PRODUCER',
        externalEntityId: 'prod-outro-99',
      })
    ).toThrowError(/FORBIDDEN_PRODUCER_SCOPE/);

    // O próprio produtor acessa seu evento, mas sem enxergar internalFinancials da Disk
    const sanitizedForOwner = EventsService.enforceProducerScopeAndSanitize(evt, {
      tenantId: 'tenant-disk-01',
      userType: 'EXTERNAL_PRODUCER',
      roleCode: 'PRODUCER',
      externalEntityId: 'prod-live-01',
    });
    expect(sanitizedForOwner.id).toBe(evt.id);
    expect(sanitizedForOwner.internalFinancials).toBeUndefined();
  });

  it('Caso 2: Evento sem resposta às duas perguntas de bloqueio não pode publicar', () => {
    const evt = createBaseTestEvent();

    // Mesmo com duas conferências e aceite do produtor, sem responder às 2 perguntas de bloqueio bloqueia publicação
    EventsService.submitIndependentReview(evt, {
      reviewerUserId: 'usr-rev-1',
      reviewerName: 'Conferente 1',
      reviewerRole: 'SUPPORT',
      sectorsVerified: true,
      pricesAndFeesVerified: true,
      halfPriceRulesVerified: true,
      channelsAndPosVerified: true,
      blockQuestionsVerified: true,
      decision: 'APPROVED',
    });
    EventsService.submitIndependentReview(evt, {
      reviewerUserId: 'usr-rev-2',
      reviewerName: 'Conferente 2',
      reviewerRole: 'SUPPORT',
      sectorsVerified: true,
      pricesAndFeesVerified: true,
      halfPriceRulesVerified: true,
      channelsAndPosVerified: true,
      blockQuestionsVerified: true,
      decision: 'APPROVED',
    });
    EventsService.submitProducerApproval(evt, {
      producerId: 'prod-live-01',
      producerUserName: 'Produtor',
      decision: 'APPROVED',
    });

    expect(() =>
      EventsService.validateAndPublishEventOmnichannel(evt, {
        channelsToEnable: ['SITE', 'PDV'],
        actorUserId: 'usr-coord',
        actorRole: 'SUPPORT_COORDINATOR',
      })
    ).toThrowError(/BLOCK_QUESTIONS_UNANSWERED/);
  });

  it('Caso 3: Evento revisado por somente uma pessoa ou pelo próprio montador não pode publicar', () => {
    const evt = createBaseTestEvent();
    EventsService.answerMandatoryBlockQuestions(evt, {
      hasTechnicalProductionBlocks: 'NAO',
      hasVenueContractualCourtesyBlocks: 'NAO',
      actorUserId: 'usr-montador-lucas',
      actorRole: 'TECHNICAL_SUPPORT',
    });

    // Montador tentando revisar a própria montagem deve falhar imediatamente
    expect(() =>
      EventsService.submitIndependentReview(evt, {
        reviewerUserId: 'usr-montador-lucas',
        reviewerName: 'Lucas Andrade',
        reviewerRole: 'TECHNICAL_SUPPORT',
        sectorsVerified: true,
        pricesAndFeesVerified: true,
        halfPriceRulesVerified: true,
        channelsAndPosVerified: true,
        blockQuestionsVerified: true,
        decision: 'APPROVED',
      })
    ).toThrowError(/SELF_REVIEW_FORBIDDEN/);

    // Apenas 1 conferente aprova
    EventsService.submitIndependentReview(evt, {
      reviewerUserId: 'usr-conferente-01',
      reviewerName: 'Conferente 1',
      reviewerRole: 'TECHNICAL_SUPPORT',
      sectorsVerified: true,
      pricesAndFeesVerified: true,
      halfPriceRulesVerified: true,
      channelsAndPosVerified: true,
      blockQuestionsVerified: true,
      decision: 'APPROVED',
    });

    // Mesmo conferente tentando assinar a 2ª conferência deve ser bloqueado
    expect(() =>
      EventsService.submitIndependentReview(evt, {
        reviewerUserId: 'usr-conferente-01',
        reviewerName: 'Conferente 1',
        reviewerRole: 'TECHNICAL_SUPPORT',
        sectorsVerified: true,
        pricesAndFeesVerified: true,
        halfPriceRulesVerified: true,
        channelsAndPosVerified: true,
        blockQuestionsVerified: true,
        decision: 'APPROVED',
      })
    ).toThrowError(/DUPLICATE_REVIEWER_FORBIDDEN/);

    // Tentativa de publicação com apenas 1 revisão falha
    expect(() =>
      EventsService.validateAndPublishEventOmnichannel(evt, {
        channelsToEnable: ['SITE'],
        actorUserId: 'usr-coord',
        actorRole: 'SUPPORT_COORDINATOR',
      })
    ).toThrowError(/DUAL_INDEPENDENT_REVIEW_REQUIRED/);
  });

  it('Caso 4: Evento sem aceite explícito do produtor não pode vender em nenhum canal, inclusive PDV/API', () => {
    const evt = createBaseTestEvent();
    EventsService.answerMandatoryBlockQuestions(evt, {
      hasTechnicalProductionBlocks: 'NAO',
      hasVenueContractualCourtesyBlocks: 'NAO',
      actorUserId: 'usr-montador-lucas',
      actorRole: 'TECHNICAL_SUPPORT',
    });
    EventsService.submitIndependentReview(evt, {
      reviewerUserId: 'usr-rev-1',
      reviewerName: 'Conferente 1',
      reviewerRole: 'SUPPORT',
      sectorsVerified: true,
      pricesAndFeesVerified: true,
      halfPriceRulesVerified: true,
      channelsAndPosVerified: true,
      blockQuestionsVerified: true,
      decision: 'APPROVED',
    });
    EventsService.submitIndependentReview(evt, {
      reviewerUserId: 'usr-rev-2',
      reviewerName: 'Conferente 2',
      reviewerRole: 'SUPPORT',
      sectorsVerified: true,
      pricesAndFeesVerified: true,
      halfPriceRulesVerified: true,
      channelsAndPosVerified: true,
      blockQuestionsVerified: true,
      decision: 'APPROVED',
    });

    // Sem aceite do produtor: bloqueado no SITE, no PDV e na API
    expect(() => EventsService.assertChannelSaleAllowed(evt, 'SITE')).toThrowError(/PRODUCER_APPROVAL_REQUIRED_FOR_SITE/);
    expect(() => EventsService.assertChannelSaleAllowed(evt, 'PDV')).toThrowError(/PRODUCER_APPROVAL_REQUIRED_FOR_PDV/);
    expect(() => EventsService.assertChannelSaleAllowed(evt, 'PARTNER_API')).toThrowError(
      /PRODUCER_APPROVAL_REQUIRED_FOR_PARTNER_API/
    );
  });

  it('Caso 5: Capacidade do mapa incompatível com setor/formulário bloqueia publicação', () => {
    const evt = createBaseTestEvent();
    approveEventFully(evt);

    // Altera o número de assentos do mapa para divergir da capacidade do setor numerado
    evt.sectors[0].mapSeatCount = 1150; // Setor declara 1200

    expect(() =>
      EventsService.validateAndPublishEventOmnichannel(evt, {
        channelsToEnable: ['SITE'],
        actorUserId: 'usr-coord',
        actorRole: 'SUPPORT_COORDINATOR',
      })
    ).toThrowError(/SECTOR_CAPACITY_MISMATCH/);
  });

  it('Caso 6: Duas vendas concorrentes não podem reservar/vender o mesmo assento', () => {
    const evt = createBaseTestEvent();
    approveEventFully(evt);
    EventsService.validateAndPublishEventOmnichannel(evt, {
      channelsToEnable: ['SITE', 'PDV'],
      openSalesImmediately: true,
      actorUserId: 'usr-coord',
      actorRole: 'SUPPORT_COORDINATOR',
    });

    // Primeira compra reserva/vende o assento A-01 no SITE
    const first = EventsService.reserveOrSellSeatConcurrently(evt, {
      seatCode: 'A-01',
      channel: 'SITE',
      orderId: 'ord-1001',
      targetStatus: EventSeatStatus.VENDIDO,
      actorUserId: 'buyer-01',
    });
    expect(first.status).toBe(EventSeatStatus.VENDIDO);

    // Segunda compra concorrente no PDV tentando o mesmo assento A-01 é rejeitada
    expect(() =>
      EventsService.reserveOrSellSeatConcurrently(evt, {
        seatCode: 'A-01',
        channel: 'PDV',
        orderId: 'ord-1002',
        targetStatus: EventSeatStatus.VENDIDO,
        actorUserId: 'pdv-op-01',
      })
    ).toThrowError(/SEAT_CONCURRENCY_CONFLICT/);
  });

  it('Caso 7: Virada de lote não permite preços misturados ou venda em lote encerrado', () => {
    const evt = createBaseTestEvent();
    approveEventFully(evt);
    EventsService.validateAndPublishEventOmnichannel(evt, {
      channelsToEnable: ['SITE', 'PDV'],
      openSalesImmediately: true,
      actorUserId: 'usr-coord',
      actorRole: 'SUPPORT_COORDINATOR',
    });

    // Executa virada atômica do Lote 1 (R$ 150) para o Lote 2 (R$ 200)
    const transition = EventsService.executeAtomicLotTransition(evt, {
      closedLotId: 'lot-1',
      openedLotId: 'lot-2',
      triggerType: 'MANUAL_SUPORTE',
      requestedByUserId: 'usr-suporte-01',
      approvedByUserId: 'usr-coord-01',
      justification: 'Esgotamento da cota promocional do 1º lote',
      idempotencyKey: 'turn-lot1-to-lot2',
    });

    expect(transition.previousFacePrice).toBe(150);
    expect(transition.newFacePrice).toBe(200);

    // Tentativa de vender no Lote 1 encerrado deve falhar
    expect(() =>
      EventsService.sellFromOperationalLot(evt, {
        lotId: 'lot-1',
        quantity: 1,
        channel: 'SITE',
        buyerName: 'Cliente Teste',
        buyerTaxId: '111.222.333-44',
        buyerEmail: 'cliente@teste.com',
        paymentMethod: 'PIX',
        startSequenceNumber: 500,
      })
    ).toThrowError(/LOT_CLOSED_OR_INACTIVE/);

    // Venda no Lote 2 ativo aplica estritamente o novo preço (R$ 200 + R$ 24 taxa)
    const sale = EventsService.sellFromOperationalLot(evt, {
      lotId: 'lot-2',
      quantity: 2,
      channel: 'SITE',
      buyerName: 'Cliente Teste',
      buyerTaxId: '111.222.333-44',
      buyerEmail: 'cliente@teste.com',
      paymentMethod: 'PIX',
      startSequenceNumber: 500,
    });
    expect(sale.unitFacePriceApplied).toBe(200);
    expect(sale.totalCharged).toBe(448);
  });

  it('Caso 8: Correção posterior à aprovação invalida aceite da versão anterior quando modifica dados materiais', () => {
    const evt = createBaseTestEvent();
    approveEventFully(evt);
    EventsService.validateAndPublishEventOmnichannel(evt, {
      channelsToEnable: ['SITE', 'PDV'],
      openSalesImmediately: true,
      actorUserId: 'usr-coord',
      actorRole: 'SUPPORT_COORDINATOR',
    });

    expect(evt.producerApproval?.decision).toBe('APPROVED');
    expect(evt.currentRevision.version).toBe(1);

    // Altera dado material (ex: taxa de serviço ou local) após aprovação
    EventsService.applyMaterialRevision(
      evt,
      { serviceFeePct: 15, venueName: 'Pedreira Paulo Leminski' },
      {
        userId: 'usr-montador-lucas',
        userName: 'Lucas Andrade',
        role: 'TECHNICAL_SUPPORT',
        reason: 'Alteração contratual de local e taxa solicitada pelo comercial',
      }
    );

    expect(evt.currentRevision.version).toBe(2);
    expect(evt.producerApproval).toBeUndefined();
    expect(evt.salesStatus).toBe(EventSalesStatus.NOT_OPEN);
    expect(() => EventsService.assertChannelSaleAllowed(evt, 'SITE')).toThrowError(/PRODUCER_APPROVAL_REQUIRED_FOR_SITE/);
  });

  it('Caso 9: Evento cancelado não permite novos pedidos em site, PDV ou integração', () => {
    const evt = createBaseTestEvent();
    approveEventFully(evt);
    EventsService.validateAndPublishEventOmnichannel(evt, {
      channelsToEnable: ['SITE', 'PDV', 'PARTNER_API'],
      openSalesImmediately: true,
      actorUserId: 'usr-coord',
      actorRole: 'SUPPORT_COORDINATOR',
    });

    EventsService.registerCriticalEventChange(evt, {
      changeType: 'CANCELAMENTO',
      reason: 'Cancelamento oficial da turnê por força maior',
      evidenceDocumentCode: 'DOC-CANC-2026-09',
      requestedByUserId: 'usr-coord',
      requestedByName: 'Coordenação de Operações',
      actorRole: 'SUPPORT_COORDINATOR',
      existingPaidOrders: [],
    });

    expect(() => EventsService.assertChannelSaleAllowed(evt, 'SITE')).toThrowError(/EVENT_CANCELLED_SALES_BLOCKED/);
    expect(() => EventsService.assertChannelSaleAllowed(evt, 'PDV')).toThrowError(/EVENT_CANCELLED_SALES_BLOCKED/);
    expect(() => EventsService.assertChannelSaleAllowed(evt, 'PARTNER_API')).toThrowError(/EVENT_CANCELLED_SALES_BLOCKED/);
  });

  it('Caso 10: Comunicação de adiamento usa texto de adiamento, nunca template de cancelamento; mudança de local usa texto próprio', () => {
    const evt = createBaseTestEvent();

    // Tentar usar template de CANCELAMENTO em um ADIAMENTO deve ser bloqueado
    expect(() =>
      EventsService.previewAndValidateEventCommunication(evt, {
        changeType: 'ADIAMENTO_COM_NOVA_DATA',
        templateId: 'tpl-cancelamento-v1',
        purpose: 'INFORMATIVO_ALTERACAO_CRITICA',
        pricingVersionCode: 'TAB-2026-WA-INFO-V1',
        recipientContacts: ['+5541999990001'],
        costResponsibility: 'PRODUTOR_BORDERO',
        actorUserId: 'usr-mkt-01',
      })
    ).toThrowError(/TEMPLATE_CATEGORY_MISMATCH/);

    // Template correto de ADIAMENTO_COM_NOVA_DATA funciona perfeitamente
    const validAdiamento = EventsService.previewAndValidateEventCommunication(evt, {
      changeType: 'ADIAMENTO_COM_NOVA_DATA',
      templateId: 'tpl-adiamento-com-data-v1',
      purpose: 'INFORMATIVO_ALTERACAO_CRITICA',
      pricingVersionCode: 'TAB-2026-WA-INFO-V1',
      recipientContacts: ['+5541999990001'],
      costResponsibility: 'PRODUTOR_BORDERO',
      actorUserId: 'usr-mkt-01',
    });
    expect(validAdiamento.templateCategory).toBe('ADIAMENTO_COM_NOVA_DATA');

    // Template próprio de MUDANCA_DE_LOCAL funciona perfeitamente
    const validLocal = EventsService.previewAndValidateEventCommunication(evt, {
      changeType: 'MUDANCA_DE_LOCAL',
      templateId: 'tpl-mudanca-local-v1',
      purpose: 'INFORMATIVO_ALTERACAO_CRITICA',
      pricingVersionCode: 'TAB-2026-WA-INFO-V1',
      recipientContacts: ['+5541999990001'],
      costResponsibility: 'PRODUTOR_BORDERO',
      actorUserId: 'usr-mkt-01',
    });
    expect(validLocal.templateCategory).toBe('MUDANCA_DE_LOCAL');
  });

  it('Caso 11: Custo do WhatsApp é calculado por tabela vigente versionada (não 0,51 ou 0,61 fixos) e deduplica contatos', () => {
    const evt = createBaseTestEvent();

    // 3 pedidos do mesmo comprador (+5541999990001 duplicado) + 1 comprador diferente = 2 contatos únicos
    const contacts = ['+5541999990001', '+5541999990001', '+5541999990002'];

    // Tabela versionada informativa (R$ 0,51/contato na versão TAB-2026-WA-INFO-V1)
    const dispatchInfo = EventsService.previewAndValidateEventCommunication(evt, {
      changeType: 'ADIAMENTO_SEM_DATA',
      templateId: 'tpl-adiamento-sem-data-v1',
      purpose: 'INFORMATIVO_ALTERACAO_CRITICA',
      pricingVersionCode: 'TAB-2026-WA-INFO-V1',
      recipientContacts: contacts,
      costResponsibility: 'PRODUTOR_BORDERO',
      actorUserId: 'usr-mkt-01',
    });
    expect(dispatchInfo.rawOrdersCount).toBe(3);
    expect(dispatchInfo.deduplicatedRecipientsCount).toBe(2);
    expect(dispatchInfo.unitCostApplied).toBe(0.51);
    expect(dispatchInfo.estimatedTotalCost).toBe(1.02);

    // Nova tabela contratual customizada (ex: R$ 0,47/contato negociado em contrato específico)
    const dispatchCustom = EventsService.previewAndValidateEventCommunication(evt, {
      changeType: 'ADIAMENTO_SEM_DATA',
      templateId: 'tpl-adiamento-sem-data-v1',
      purpose: 'INFORMATIVO_ALTERACAO_CRITICA',
      pricingVersionCode: 'TAB-CONTRATO-ESP-2026',
      recipientContacts: contacts,
      costResponsibility: 'PRODUTOR_PIX',
      customPricingTable: [
        {
          id: 'custom-1',
          versionCode: 'TAB-CONTRATO-ESP-2026',
          channel: 'WHATSAPP',
          purpose: 'INFORMATIVO_ALTERACAO_CRITICA',
          providerName: 'Provedor Homologado',
          unitPriceBrl: 0.47,
          validFrom: '2026-01-01',
          contractReference: 'CTR-999',
          isActive: true,
        },
      ],
      actorUserId: 'usr-mkt-01',
    });
    expect(dispatchCustom.unitCostApplied).toBe(0.47);
    expect(dispatchCustom.estimatedTotalCost).toBe(0.94);
  });

  it('Caso 12: Estorno solicitado inclui taxas no cancelamento e não aparece como CONCLUIDO sem confirmação real do provedor', () => {
    const evt = createBaseTestEvent();
    const { changeRequest, refundPlan } = EventsService.registerCriticalEventChange(evt, {
      changeType: 'CANCELAMENTO',
      reason: 'Cancelamento do evento',
      evidenceDocumentCode: 'DOC-01',
      requestedByUserId: 'usr-coord',
      requestedByName: 'Coordenação',
      actorRole: 'SUPPORT_COORDINATOR',
      existingPaidOrders: [
        {
          orderId: 'ord-501',
          ticketNumber: '00000501',
          buyerName: 'Ana Paula',
          buyerTaxId: '123.456.789-00',
          buyerEmail: 'ana@email.com',
          paymentMethod: 'PIX',
          acquirerProvider: 'PAGARME_PIX',
          faceAmount: 200,
          serviceFeeAmount: 24,
        },
      ],
    });

    // Devolução integral inclui valor de face + taxa de conveniência (200 + 24 = 224)
    expect(changeRequest.financialImpact.totalCustomerRefundObligation).toBe(224);
    expect(refundPlan).toHaveLength(1);
    expect(refundPlan[0].status).toBe('SOLICITADO');

    // Tentar marcar como CONCLUIDO sem protocolo da adquirente deve falhar
    expect(() =>
      EventsService.advanceSupervisedRefundStatus(evt, {
        refundItemId: refundPlan[0].id,
        targetStatus: 'CONCLUIDO',
        actorUserId: 'usr-fin-01',
        actorRole: 'FINANCIAL_DIRECTOR',
      })
    ).toThrowError(/PROVIDER_CONFIRMATION_REQUIRED/);

    // Somente com confirmação externa da adquirente passa para CONCLUIDO
    const completed = EventsService.advanceSupervisedRefundStatus(evt, {
      refundItemId: refundPlan[0].id,
      targetStatus: 'CONCLUIDO',
      actorUserId: 'usr-fin-01',
      actorRole: 'FINANCIAL_DIRECTOR',
      externalProviderConfirmationId: 'E2E-PIX-REFUND-998877',
    });
    expect(completed.status).toBe('CONCLUIDO');
    expect(completed.externalProviderConfirmationId).toBe('E2E-PIX-REFUND-998877');
  });

  it('Caso 13: Recibo de cortesias vincula quantidade/identificadores de 8 dígitos, emissor, assinatura/aceite e cobrança contratual', () => {
    const evt = createBaseTestEvent();
    const { batch, receipt } = EventsService.issueCourtesyBatchWithReceipt(evt, {
      sectorId: 'sec-balcao',
      recipientName: 'Carlos Eduardo (Produtor Executivo)',
      recipientDocument: '987.654.321-00',
      quantity: 4,
      deliveryMode: 'IMPRESSO_FISICO',
      issuerUserId: 'usr-suporte-01',
      issuerName: 'Lucas Andrade',
      startSequenceNumber: 75,
    });

    expect(batch.ticketNumbers).toEqual(['00000075', '00000076', '00000077', '00000078']);
    expect(batch.unitPrintingFee).toBe(3.25); // Taxa contratual do evento
    expect(batch.totalPrintingDebit).toBe(13.0);
    expect(receipt.linkedToBordeau).toBe(true);
    expect(receipt.signatureHash).toHaveLength(64);
    expect(receipt.issuerUserId).toBe('usr-suporte-01');
  });

  it('Caso 14: Toda mudança crítica em evento ou preço gera auditoria com autor, antes/depois, data e motivo', () => {
    const evt = createBaseTestEvent();
    approveEventFully(evt);

    EventsService.executeAtomicLotTransition(evt, {
      closedLotId: 'lot-1',
      openedLotId: 'lot-2',
      newFacePrice: 220,
      triggerType: 'MANUAL_SUPORTE',
      requestedByUserId: 'usr-suporte-01',
      approvedByUserId: 'usr-coord-01',
      justification: 'Reajuste de lote autorizado pelo produtor',
      idempotencyKey: 'audit-lot-key-01',
    });

    const lotAudit = evt.auditTrail.find((a) => a.action === 'ATOMIC_LOT_TRANSITION');
    expect(lotAudit).toBeDefined();
    expect(lotAudit?.actorUserId).toBe('usr-suporte-01');
    expect(lotAudit?.reason).toContain('Reajuste de lote');
    expect((lotAudit?.previousValues as any).previousFacePrice).toBe(150);
    expect((lotAudit?.newValues as any).newFacePrice).toBe(220);
    expect(lotAudit?.hash).toHaveLength(64);
  });

  it('Caso 15: Nenhum dado financeiro de teste é introduzido na base operacional ao criar um evento', () => {
    const evt = createBaseTestEvent();
    expect(evt.internalFinancials.grossTicketSales).toBe(0);
    expect(evt.internalFinancials.totalServiceFees).toBe(0);
    expect(evt.internalFinancials.totalAcquirerFees).toBe(0);
    expect(evt.refundPlan).toHaveLength(0);
  });

  it('Caso 16: Restrição somente por link bloqueia venda no PDV físico (STE.PO.001, p. 3)', () => {
    const evt = createBaseTestEvent();
    approveEventFully(evt);

    // Tentar habilitar PDV junto com restrictedLinkOnly deve ser rejeitado na publicação
    expect(() =>
      EventsService.validateAndPublishEventOmnichannel(evt, {
        channelsToEnable: ['RESTRICTED_LINK', 'PDV'],
        restrictedLinkOnly: true,
        openSalesImmediately: true,
        actorUserId: 'usr-coord',
        actorRole: 'SUPPORT_COORDINATOR',
      })
    ).toThrowError(/RESTRICTED_LINK_PDV_CONFLICT/);

    // Publica apenas para link restrito
    EventsService.validateAndPublishEventOmnichannel(evt, {
      channelsToEnable: ['RESTRICTED_LINK'],
      restrictedLinkOnly: true,
      openSalesImmediately: true,
      actorUserId: 'usr-coord',
      actorRole: 'SUPPORT_COORDINATOR',
    });

    expect(() => EventsService.assertChannelSaleAllowed(evt, 'PDV')).toThrowError(/PDV_BLOCKED_BY_RESTRICTED_LINK/);
    expect(() => EventsService.assertChannelSaleAllowed(evt, 'RESTRICTED_LINK')).not.toThrow();
  });

  it('Seção 8 e Seção 10: Liberação de bloqueio, assinatura Anexo 1, validação crítica, aprovação de comunicado e bloqueio de ingresso cancelado na portaria', () => {
    const evt = createBaseTestEvent();
    const block = EventsService.createSeatBlock(evt, {
      sectorId: 'sec-plateia',
      blockType: 'TECNICO_PRODUCAO',
      origin: 'Suporte Técnico',
      reason: 'Reserva mesa de luz',
      seatCodes: ['A-01'],
      responsibleUserId: 'usr-suporte',
      responsibleName: 'Lucas Andrade',
      reviewDeadline: '2026-11-10',
    });
    expect(evt.seats['A-01'].status).toBe('BLOQUEADO');

    const released = EventsService.releaseSeatBlock(evt, {
      blockId: block.id,
      releasedByUserId: 'usr-coord',
      releasedByName: 'Rafael Souza',
      reason: 'Mesa de luz reposicionada',
    });
    expect(released.status).toBe('LIBERADO_PARA_VENDA');
    expect(evt.seats['A-01'].status).toBe('DISPONIVEL');

    // Cortesia + assinatura de recibo Anexo 1
    const { batch } = EventsService.issueCourtesyBatchWithReceipt(evt, {
      sectorId: 'sec-plateia',
      recipientName: 'Produtor Executivo',
      recipientDocument: '12.345.678/0001-99',
      quantity: 5,
      deliveryMode: 'IMPRESSO_FISICO',
      issuerUserId: 'usr-suporte',
      issuerName: 'Lucas Andrade',
      startSequenceNumber: 910001,
    });
    const signedReceipt = EventsService.signCourtesyReceipt(evt, {
      batchId: batch.id,
      signedByName: 'Produtor Executivo Assinante',
      signedByDocument: '12.345.678/0001-99',
    });
    expect(signedReceipt.signatureHash).toHaveLength(64);
    expect(signedReceipt.receiverName).toBe('Produtor Executivo Assinante');

    // Ocorrência de portaria (Seção 10: proibido liberar entrada com ingresso cancelado sem título válido)
    expect(() =>
      EventsService.registerEventIncident(evt, {
        type: 'INGRESSO_CANCELADO_PORTARIA',
        severity: 'HIGH',
        sectorName: 'Plateia Central',
        ticketNumber8Digits: '00482910',
        description: 'Cliente apresentou ingresso cancelado por estorno anterior',
        resolution: 'Entrada liberada sem ingresso válido por haver lugar vago',
        reportedBy: 'Operador Portaria 01',
      })
    ).toThrowError(/INVALID_GATE_BYPASS_BLOCKED/);

    const validIncident = EventsService.registerEventIncident(evt, {
      type: 'INGRESSO_CANCELADO_PORTARIA',
      severity: 'HIGH',
      sectorName: 'Plateia Central',
      ticketNumber8Digits: '00482910',
      description: 'Cliente apresentou ingresso cancelado',
      resolution: 'Encaminhado à bilheteria para emissão de novo título válido dentro da capacidade do setor',
      reportedBy: 'Operador Portaria 01',
    });
    expect(validIncident.status).toBe('OPEN');
  });
});

