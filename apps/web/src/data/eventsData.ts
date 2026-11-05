// ============================================================================
// DADOS INICIAIS E TIPOS: MÓDULO 01 & 02 EVENTOS E INGRESSOS (ERP DISKINGRESSOS)
// Governança Oficial:
// - 4 Dimensões de Estado: Aprovação, Publicação, Vendas e Realização.
// - Ingressos: Formato obrigatório de 8 dígitos numéricos (ex: 00000001).
// - Credencial de Acesso: Hash criptográfico seguro desacoplado para QR Code.
// ============================================================================

import {
  EventApprovalStatus,
  EventPublicationStatus,
  EventSalesStatus,
  EventRealizationStatus,
  EventOperationalStage,
  EventSeatStatus,
  type SalesChannelType,
  type EventMandatoryBlockQuestions,
  type EventIndependentReview,
  type EventProducerApproval,
  type EventIntakeRecord,
  type EventSeatBlockRecord,
  type TicketCourtesyBatchRecord,
  type TicketReceiptRecord,
  type LotTransitionRecord,
  type CriticalEventChangeRequest,
  type SupervisedRefundPlanItem,
  type CommunicationPricingVersion,
  type OfficialCommunicationTemplate,
  type CustomerCommunicationDispatch,
  type EventArtworkSpecification,
  type DiskIngressosTicketItem,
  formatTicketNumber,
} from '@delta-erp/shared';

export interface EventSector {
  id: string;
  name: string;
  capacity: number;
  hasNumberedSeats?: boolean;
  mapSeatCount?: number;
  soldCount: number;
  blockedCount?: number;
  courtesyCount?: number;
  facePrice: number;
  convenienceFee: number;
  activeBatchName: string;
  nextBatchName?: string;
  nextBatchPrice?: number;
}

export interface EventSeatMapItem {
  seatCode: string;
  sectorId: string;
  sectorName: string;
  status: EventSeatStatus;
  holderOrderId?: string;
}

export interface EventOperationalAuditItem {
  id: string;
  action: string;
  actor: string;
  role: string;
  reason: string;
  before: string;
  after: string;
  timestamp: string;
  hash: string;
}

export interface DiskIngressosEventRecord {
  id: string;
  code: string;
  name: string;
  producerId: string;
  producerName: string;
  category: 'SHOW' | 'FESTIVAL' | 'TEATRO' | 'STANDUP' | 'ESPORTIVO';
  venueName: string;
  venueCity: string;
  startDate: string;
  endDate: string;
  capacity: number;
  venuePermitCapacity?: number;
  totalSold: number;
  grossSales: number;
  convenienceRevenue: number;
  // As 4 Dimensões de Estado
  approvalStatus: EventApprovalStatus;
  publicationStatus: EventPublicationStatus;
  salesStatus: EventSalesStatus;
  realizationStatus: EventRealizationStatus;
  // Governança Operacional Ponta a Ponta (STE.PO / STE.IT)
  operationalStage?: EventOperationalStage;
  assembledByUserId?: string;
  assembledByName?: string;
  revisionVersion?: number;
  revisionHash?: string;
  courtesyPrintingFeePerUnit?: number;
  enabledChannels?: SalesChannelType[];
  restrictedLinkOnly?: boolean;
  blockQuestions?: EventMandatoryBlockQuestions;
  independentReviews?: EventIndependentReview[];
  producerApproval?: EventProducerApproval;
  seatMap?: EventSeatMapItem[];
  seatBlocks?: EventSeatBlockRecord[];
  courtesyBatches?: TicketCourtesyBatchRecord[];
  receipts?: TicketReceiptRecord[];
  lotTransitions?: LotTransitionRecord[];
  criticalChanges?: CriticalEventChangeRequest[];
  refundPlan?: SupervisedRefundPlanItem[];
  communications?: CustomerCommunicationDispatch[];
  artworks?: EventArtworkSpecification[];
  auditTrail?: EventOperationalAuditItem[];
  internalDiskFinancials?: {
    internalServiceFeePct: number;
    acquirerMdrFeeTotal: number;
    diskNetMarginBrl: number;
    custodyBankAccount: string;
  };
  sectors: EventSector[];
  ticketsSample: DiskIngressosTicketItem[];
}

export const defaultArtworkChecklist2026: EventArtworkSpecification[] = [
  {
    assetType: 'IMAGEM_PRINCIPAL_HOME',
    label: 'Imagem Principal / Home',
    documentedDimensions: '1080 × 1080 PNG',
    allowedFormats: ['PNG'],
    status: 'VALIDADO',
  },
  {
    assetType: 'BANNER_EVENTO',
    label: 'Banner Oficial do Evento',
    documentedDimensions: '1170 × 430 PNG',
    allowedFormats: ['PNG'],
    status: 'VALIDADO',
  },
  {
    assetType: 'FUNDO_SITE_COR',
    label: 'Fundo do Site (Hex Contraste)',
    documentedDimensions: 'Cor hexadecimal informada pelo produtor',
    allowedFormats: ['HEX'],
    status: 'VALIDADO',
  },
  {
    assetType: 'FEED_SOCIAL',
    label: 'Feed Social Instagram/Facebook',
    documentedDimensions: '1080 × 1350 PNG',
    allowedFormats: ['PNG'],
    status: 'VALIDADO',
  },
  {
    assetType: 'REELS_MP4',
    label: 'Reels Oficial',
    documentedDimensions: '1080 × 1920 MP4 (até 90 s)',
    allowedFormats: ['MP4'],
    maxDurationSeconds: 90,
    status: 'VALIDADO',
  },
  {
    assetType: 'STORY',
    label: 'Story Vertical',
    documentedDimensions: '1080 × 1920 PNG ou MP4 (até 60 s)',
    allowedFormats: ['PNG', 'MP4'],
    maxDurationSeconds: 60,
    status: 'VALIDADO',
  },
  {
    assetType: 'EMAIL_MARKETING',
    label: 'Peça E-mail Marketing',
    documentedDimensions: '1080 × 1920 PNG',
    allowedFormats: ['PNG'],
    status: 'VALIDADO',
  },
  {
    assetType: 'TESTEIRA_HOME',
    label: 'Testeira Destaque Home (Máx. 1/produtor)',
    documentedDimensions: '2500 × 420 PNG',
    allowedFormats: ['PNG'],
    status: 'VALIDADO',
  },
  {
    assetType: 'WHATSAPP_500',
    label: 'Criativo Disparo WhatsApp',
    documentedDimensions: '500 × 500 PNG (texto até 1.024 caracteres)',
    allowedFormats: ['PNG'],
    maxTextChars: 1024,
    status: 'VALIDADO',
  },
];

export const officialCommunicationPricingSeed: CommunicationPricingVersion[] = [
  {
    id: 'prc-wa-info-2026-v1',
    versionCode: 'TAB-2026-WA-INFO-V1',
    channel: 'WHATSAPP',
    purpose: 'INFORMATIVO_ALTERACAO_CRITICA',
    providerName: 'Meta Cloud API Oficial (STE.PO.002 — Avisos Críticos)',
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
    providerName: 'Meta Cloud API Growth (Proposta Comercial 2026)',
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

export const officialCommunicationTemplatesSeed: OfficialCommunicationTemplate[] = [
  {
    id: 'tpl-cancelamento-v1',
    code: 'TPL-CANCELAMENTO-OFICIAL-V1',
    category: 'CANCELAMENTO',
    title: 'Comunicado Oficial de Cancelamento e Reembolso Integral (Incluindo Taxas)',
    channel: 'WHATSAPP',
    bodyTemplate:
      'Comunicado Oficial DiskIngressos: Informamos que o evento {{eventName}} foi CANCELADO. Você receberá o reembolso integral do valor pago, incluindo a taxa de conveniência, conforme procedimento supervisionado pelo Financeiro e SAC.',
    reviewedByLegalOrSac: 'Jurídico & Coordenação SAC DiskIngressos (Rev. 2026)',
    version: 1,
  },
  {
    id: 'tpl-adiamento-com-data-v1',
    code: 'TPL-ADIAMENTO-NOVA-DATA-V1',
    category: 'ADIAMENTO_COM_NOVA_DATA',
    title: 'Comunicado Oficial de Adiamento com Nova Data Confirmada',
    channel: 'WHATSAPP',
    bodyTemplate:
      'Comunicado Oficial DiskIngressos: O evento {{eventName}} foi ADIADO para a nova data {{newDate}}. Seus ingressos atuais (8 dígitos) permanecem 100% válidos sem necessidade de troca. Caso não possa comparecer, consulte a política de reembolso no SAC.',
    reviewedByLegalOrSac: 'Jurídico & Coordenação SAC DiskIngressos (Rev. 2026)',
    version: 1,
  },
  {
    id: 'tpl-adiamento-sem-data-v1',
    code: 'TPL-ADIAMENTO-SEM-DATA-V1',
    category: 'ADIAMENTO_SEM_DATA',
    title: 'Comunicado Oficial de Adiamento (Nova Data em Definição)',
    channel: 'WHATSAPP',
    bodyTemplate:
      'Comunicado Oficial DiskIngressos: O evento {{eventName}} foi ADIADO e a nova data está em homologação junto à produtora. As vendas encontram-se temporariamente suspensas em todos os canais.',
    reviewedByLegalOrSac: 'Jurídico & Coordenação SAC DiskIngressos (Rev. 2026)',
    version: 1,
  },
  {
    id: 'tpl-mudanca-local-v1',
    code: 'TPL-MUDANCA-LOCAL-V1',
    category: 'MUDANCA_DE_LOCAL',
    title: 'Comunicado Oficial de Mudança de Local do Evento',
    channel: 'WHATSAPP',
    bodyTemplate:
      'Comunicado Oficial DiskIngressos: O evento {{eventName}} teve MUDANÇA DE LOCAL para {{newVenue}}. Seus ingressos permanecem válidos conforme o mapa de equivalência de setores aprovado.',
    reviewedByLegalOrSac: 'Jurídico & Coordenação SAC DiskIngressos (Rev. 2026)',
    version: 1,
  },
];

export const eventIntakesSeed: EventIntakeRecord[] = [
  {
    id: 'int-01',
    code: 'SOL-2026-001',
    eventId: 'evt-01',
    producerId: 'prod-01',
    producerName: 'Live Nation Brasil',
    originChannel: 'COMERCIAL',
    requestedByName: 'Fernanda Lacerda (Executiva Comercial)',
    eventTitle: 'Curitiba Rock Fest 2026 — Edição Prime',
    venueName: 'Pedreira Paulo Leminski',
    cityState: 'Curitiba / PR',
    proposedStartDate: '2026-11-14',
    declaredCapacity: 25000,
    hasVenueAuthorizationDoc: true,
    hasCommercialContractApproved: true,
    commercialFeePct: 15,
    courtesyPrintingFeePerUnit: 2.5,
    pendingItems: [],
    status: 'HOMOLOGADO',
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'int-02',
    code: 'SOL-2026-004',
    eventId: 'evt-04',
    producerId: 'prod-04',
    producerName: 'Produções Guaíra',
    originChannel: 'PORTAL_PRODUTOR',
    requestedByName: 'Roberto Siqueira (Diretor Artístico)',
    eventTitle: 'Espetáculo Cênico Clássicos de Natal',
    venueName: 'Teatro Guaíra',
    cityState: 'Curitiba / PR',
    proposedStartDate: '2026-12-22',
    declaredCapacity: 2800,
    hasVenueAuthorizationDoc: true,
    hasCommercialContractApproved: true,
    commercialFeePct: 11.11,
    courtesyPrintingFeePerUnit: 3.0,
    pendingItems: ['Aguardando 2ª Conferência Independente', 'Aguardando Aceite Final do Produtor'],
    status: 'EM_MONTAGEM',
    createdAt: '2026-11-04T09:15:00Z',
  },
];


export const eventsCatalogSeed: DiskIngressosEventRecord[] = [
  {
    id: 'evt-01',
    code: 'EVT-2026-001',
    name: 'Curitiba Rock Fest 2026 — Edição Prime',
    producerId: 'prod-01',
    producerName: 'Live Nation Brasil',
    category: 'FESTIVAL',
    venueName: 'Pedreira Paulo Leminski',
    venueCity: 'Curitiba / PR',
    startDate: '2026-11-14',
    endDate: '2026-11-15',
    capacity: 25000,
    venuePermitCapacity: 25000,
    totalSold: 18450,
    grossSales: 4428000,
    convenienceRevenue: 664200,
    approvalStatus: EventApprovalStatus.APPROVED,
    publicationStatus: EventPublicationStatus.PUBLISHED,
    salesStatus: EventSalesStatus.OPEN,
    realizationStatus: EventRealizationStatus.SCHEDULED,
    operationalStage: EventOperationalStage.EM_OPERACAO,
    assembledByUserId: 'usr-montador-lucas',
    assembledByName: 'Lucas Andrade (Suporte Técnico)',
    revisionVersion: 1,
    revisionHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    courtesyPrintingFeePerUnit: 2.5,
    enabledChannels: ['SITE', 'APP', 'PDV'],
    restrictedLinkOnly: false,
    blockQuestions: {
      hasTechnicalProductionBlocks: 'SIM',
      technicalProductionBlocksDetail: '120 lugares na área frontal do Camarote reservados para house mix e imprensa',
      hasVenueContractualCourtesyBlocks: 'SIM',
      venueContractualCourtesyBlocksDetail: '80 cortesias contratuais do Parque das Pedreiras (cláusula 7.2)',
      answeredByUserId: 'usr-montador-lucas',
      answeredAt: '2026-10-22T14:00:00Z',
    },
    independentReviews: [
      {
        id: 'rev-101',
        eventId: 'evt-01',
        revisionVersion: 1,
        revisionHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        reviewerOrder: 1,
        reviewerUserId: 'usr-conferente-mariana',
        reviewerName: 'Mariana Costa (Suporte Sênior)',
        reviewerRole: 'TECHNICAL_SUPPORT_REVIEWER',
        sectorsVerified: true,
        pricesAndFeesVerified: true,
        halfPriceRulesVerified: true,
        channelsAndPosVerified: true,
        blockQuestionsVerified: true,
        decision: 'APPROVED',
        notes: 'Capacidades 25.000 conferidas contra alvará e lotes validados.',
        signedAt: '2026-10-23T10:12:00Z',
        signatureHash: 'c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2',
      },
      {
        id: 'rev-102',
        eventId: 'evt-01',
        revisionVersion: 1,
        revisionHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        reviewerOrder: 2,
        reviewerUserId: 'usr-coord-rafael',
        reviewerName: 'Rafael Souza (Coordenação de Suporte)',
        reviewerRole: 'SUPPORT_COORDINATOR',
        sectorsVerified: true,
        pricesAndFeesVerified: true,
        halfPriceRulesVerified: true,
        channelsAndPosVerified: true,
        blockQuestionsVerified: true,
        decision: 'APPROVED',
        notes: '2ª conferência independente concluída. Taxa 15% e PDVs conferidos.',
        signedAt: '2026-10-23T11:45:00Z',
        signatureHash: 'f5ca38f748a1d6eaf726b8a42fb575c3c71f1864a8143301782de13da2d9202b',
      },
    ],
    producerApproval: {
      id: 'pa-101',
      eventId: 'evt-01',
      producerId: 'prod-01',
      producerUserName: 'Marcos Prado (Diretor de Operações Live Nation)',
      revisionVersion: 1,
      revisionHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      decision: 'APPROVED',
      notes: 'Aprovado integralmente para abertura de vendas no site, app e PDVs.',
      decidedAt: '2026-10-23T15:30:00Z',
      evidenceHash: '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
    },
    seatMap: [
      { seatCode: 'CAM-A01', sectorId: 'sec-03', sectorName: 'Camarote Open Bar', status: EventSeatStatus.VENDIDO, holderOrderId: 'PED-9001' },
      { seatCode: 'CAM-A02', sectorId: 'sec-03', sectorName: 'Camarote Open Bar', status: EventSeatStatus.DISPONIVEL },
      { seatCode: 'CAM-A03', sectorId: 'sec-03', sectorName: 'Camarote Open Bar', status: EventSeatStatus.DISPONIVEL },
      { seatCode: 'CAM-A04', sectorId: 'sec-03', sectorName: 'Camarote Open Bar', status: EventSeatStatus.BLOQUEADO },
    ],
    seatBlocks: [
      {
        id: 'blk-01',
        eventId: 'evt-01',
        sectorId: 'sec-03',
        sectorName: 'Camarote Open Bar',
        blockType: 'TECNICO_PRODUCAO',
        origin: 'STE.PO.003 — Ficha de Montagem',
        reason: 'Reserva técnica para house mix e equipe de palco',
        quantity: 120,
        seatCodes: ['CAM-A04'],
        responsibleUserId: 'usr-montador-lucas',
        responsibleName: 'Lucas Andrade',
        reviewDeadline: '2026-11-10',
        status: 'ATIVO',
        createdAt: '2026-10-22T14:10:00Z',
      },
    ],
    courtesyBatches: [
      {
        id: 'crt-01',
        eventId: 'evt-01',
        sectorId: 'sec-03',
        sectorName: 'Camarote Open Bar',
        category: 'CORTESIA_NAO_COMERCIALIZAVEL',
        recipientName: 'Assessoria Live Nation Brasil',
        recipientTaxId: '14.882.190/0001-40',
        quantity: 20,
        ticketNumbers: Array.from({ length: 20 }, (_, i) => formatTicketNumber(900001 + i)),
        deliveryMode: 'IMPRESSO_FISICO',
        unitPrintingFee: 2.5,
        totalPrintingDebit: 50,
        issuedByUserId: 'usr-montador-lucas',
        issuedByName: 'Lucas Andrade',
        issuedAt: '2026-10-28T16:00:00Z',
      },
    ],
    receipts: [
      {
        id: 'rcp-01',
        receiptCode: 'REC-ANEXO1-EVT-2026-001-1',
        courtesyBatchId: 'crt-01',
        eventId: 'evt-01',
        producerId: 'prod-01',
        quantity: 20,
        ticketRange: '00900001 a 00900020',
        printingDebitForBordeau: 50,
        issuerUserId: 'usr-montador-lucas',
        issuerName: 'Lucas Andrade (Suporte Técnico)',
        receiverName: 'Marcos Prado (Live Nation Brasil)',
        receiverDocument: '14.882.190/0001-40',
        signedAt: '2026-10-28T16:05:00Z',
        signatureHash: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
        linkedToBordeau: true,
      },
    ],
    lotTransitions: [
      {
        id: 'ltr-01',
        eventId: 'evt-01',
        sectorId: 'sec-01',
        sectorName: 'Pista Premium',
        closedLotId: 'lot-pista-2',
        closedLotName: 'Lote 2',
        previousFacePrice: 240,
        openedLotId: 'lot-pista-3',
        openedLotName: 'Lote 3',
        newFacePrice: 280,
        triggerType: 'QUANTIDADE_ESGOTADA',
        requestedByUserId: 'usr-montador-lucas',
        approvedByUserId: 'usr-coord-rafael',
        justification: 'Virada atômica automática por atingimento de 100% da cota do 2º Lote',
        idempotencyKey: 'turn-evt01-sec01-l2-l3',
        transitionedAt: '2026-11-01T18:00:00Z',
      },
    ],
    criticalChanges: [],
    refundPlan: [],
    communications: [],
    artworks: defaultArtworkChecklist2026,
    auditTrail: [
      {
        id: 'aud-1',
        action: 'INDEPENDENT_REVIEW_1_APPROVED',
        actor: 'Mariana Costa',
        role: 'TECHNICAL_SUPPORT_REVIEWER',
        reason: '1ª conferência independente concluída (STE.PO.001)',
        before: 'EM_MONTAGEM',
        after: 'EM_CONFERENCIA (1/2)',
        timestamp: '2026-10-23T10:12:00Z',
        hash: 'c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2',
      },
      {
        id: 'aud-2',
        action: 'INDEPENDENT_REVIEW_2_APPROVED',
        actor: 'Rafael Souza',
        role: 'SUPPORT_COORDINATOR',
        reason: '2ª conferência independente concluída por pessoa distinta do montador',
        before: 'EM_CONFERENCIA (1/2)',
        after: 'AGUARDANDO_PRODUTOR (2/2)',
        timestamp: '2026-10-23T11:45:00Z',
        hash: 'f5ca38f748a1d6eaf726b8a42fb575c3c71f1864a8143301782de13da2d9202b',
      },
      {
        id: 'aud-3',
        action: 'PRODUCER_DECISION_APPROVED',
        actor: 'Marcos Prado (Live Nation)',
        role: 'PRODUCER',
        reason: 'Aceite explícito do produtor na Revisão v1',
        before: 'AGUARDANDO_PRODUTOR',
        after: 'APROVADO (Hash v1)',
        timestamp: '2026-10-23T15:30:00Z',
        hash: '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
      },
      {
        id: 'aud-4',
        action: 'ATOMIC_LOT_TRANSITION',
        actor: 'Lucas Andrade',
        role: 'TECHNICAL_SUPPORT',
        reason: 'Virada atômica Pista Premium Lote 2 (R$ 240) → Lote 3 (R$ 280)',
        before: 'Lote 2 Ativo (R$ 240,00)',
        after: 'Lote 2 Encerrado / Lote 3 Ativo (R$ 280,00)',
        timestamp: '2026-11-01T18:00:00Z',
        hash: '7902699be42c8a8e46fbbb4501726517e86b22c56a189f7625a6da49081b2451',
      },
    ],
    internalDiskFinancials: {
      internalServiceFeePct: 15,
      acquirerMdrFeeTotal: 61820,
      diskNetMarginBrl: 602380,
      custodyBankAccount: 'Itaú Empresas 341 • Ag 0852 / CC 99410-2 (Custódia DiskIngressos)',
    },
    sectors: [
      { id: 'sec-01', name: 'Pista Premium', capacity: 10000, soldCount: 8200, blockedCount: 0, courtesyCount: 0, facePrice: 280, convenienceFee: 42, activeBatchName: 'Lote 3', nextBatchName: 'Lote 4 (Final)', nextBatchPrice: 320 },
      { id: 'sec-02', name: 'Pista Comum', capacity: 12000, soldCount: 8900, blockedCount: 0, courtesyCount: 0, facePrice: 180, convenienceFee: 27, activeBatchName: 'Lote 2', nextBatchName: 'Lote 3', nextBatchPrice: 210 },
      { id: 'sec-03', name: 'Camarote Open Bar', capacity: 3000, hasNumberedSeats: true, mapSeatCount: 3000, soldCount: 1350, blockedCount: 120, courtesyCount: 20, facePrice: 550, convenienceFee: 82.5, activeBatchName: 'Lote 1', nextBatchName: 'Lote 2', nextBatchPrice: 620 },
    ],
    ticketsSample: [
      {
        id: 'tkt-01',
        eventId: 'evt-01',
        eventName: 'Curitiba Rock Fest 2026',
        batchId: 'bat-01',
        batchName: 'Lote 3 Pista Premium',
        sectorName: 'Pista Premium',
        ticketNumber: formatTicketNumber(1),
        validationHash: 'a7f9c2d8e4b1056792341abcd890ef1234567890abcdef1234567890abcdef12',
        faceValue: 280,
        convenienceFeeValue: 42,
        totalPaid: 322,
        buyerName: 'Mariana Guimarães',
        buyerTaxId: '458.129.340-91',
        buyerEmail: 'mariana.guimaraes@gmail.com',
        paymentMethod: 'PIX',
        status: 'ISSUED',
        issuedAt: '2026-11-04T14:22:10Z',
      },
      {
        id: 'tkt-02',
        eventId: 'evt-01',
        eventName: 'Curitiba Rock Fest 2026',
        batchId: 'bat-01',
        batchName: 'Lote 3 Pista Premium',
        sectorName: 'Pista Premium',
        ticketNumber: formatTicketNumber(2),
        validationHash: 'b8e10d29f5c2167893452bcde901f02345678901bcdef2345678901bcdef23',
        faceValue: 280,
        convenienceFeeValue: 42,
        totalPaid: 322,
        buyerName: 'Lucas Ferreira Mendes',
        buyerTaxId: '109.876.543-21',
        buyerEmail: 'lucas.mendes@uol.com.br',
        paymentMethod: 'CREDIT_CARD',
        status: 'ISSUED',
        issuedAt: '2026-11-04T15:10:05Z',
      },
      {
        id: 'tkt-03',
        eventId: 'evt-01',
        eventName: 'Curitiba Rock Fest 2026',
        batchId: 'bat-02',
        batchName: 'Lote 2 Pista Comum',
        sectorName: 'Pista Comum',
        ticketNumber: formatTicketNumber(18450),
        validationHash: 'c9f21e30a6d3278904563cdef012a13456789012cdef3456789012cdef34',
        faceValue: 180,
        convenienceFeeValue: 27,
        totalPaid: 207,
        buyerName: 'Renata Albuquerque',
        buyerTaxId: '777.888.999-00',
        buyerEmail: 'renata.alb@hotmail.com',
        paymentMethod: 'PIX',
        status: 'ISSUED',
        issuedAt: '2026-11-05T09:40:18Z',
      },
    ],
  },
  {
    id: 'evt-02',
    code: 'EVT-2026-002',
    name: 'Turnê Acústica Nacional — Teatro Positivo',
    producerId: 'prod-02',
    producerName: 'Opus Entretenimento',
    category: 'SHOW',
    venueName: 'Teatro Positivo Grande Auditório',
    venueCity: 'Curitiba / PR',
    startDate: '2026-11-28',
    endDate: '2026-11-28',
    capacity: 2400,
    venuePermitCapacity: 2400,
    totalSold: 2150,
    grossSales: 387000,
    convenienceRevenue: 46440,
    approvalStatus: EventApprovalStatus.APPROVED,
    publicationStatus: EventPublicationStatus.PUBLISHED,
    salesStatus: EventSalesStatus.OPEN,
    realizationStatus: EventRealizationStatus.SCHEDULED,
    operationalStage: EventOperationalStage.EM_OPERACAO,
    assembledByUserId: 'usr-montador-lucas',
    assembledByName: 'Lucas Andrade (Suporte Técnico)',
    revisionVersion: 1,
    revisionHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    courtesyPrintingFeePerUnit: 3.0,
    enabledChannels: ['SITE', 'APP', 'PDV'],
    restrictedLinkOnly: false,
    blockQuestions: {
      hasTechnicalProductionBlocks: 'NAO',
      hasVenueContractualCourtesyBlocks: 'SIM',
      venueContractualCourtesyBlocksDetail: '30 poltronas fila E reservadas para reitoria Teatro Positivo',
      answeredByUserId: 'usr-montador-lucas',
      answeredAt: '2026-10-18T11:00:00Z',
    },
    independentReviews: [
      {
        id: 'rev-201',
        eventId: 'evt-02',
        revisionVersion: 1,
        revisionHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
        reviewerOrder: 1,
        reviewerUserId: 'usr-conferente-mariana',
        reviewerName: 'Mariana Costa',
        reviewerRole: 'TECHNICAL_SUPPORT_REVIEWER',
        sectorsVerified: true,
        pricesAndFeesVerified: true,
        halfPriceRulesVerified: true,
        channelsAndPosVerified: true,
        blockQuestionsVerified: true,
        decision: 'APPROVED',
        signedAt: '2026-10-18T14:00:00Z',
        signatureHash: 'hash-201',
      },
      {
        id: 'rev-202',
        eventId: 'evt-02',
        revisionVersion: 1,
        revisionHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
        reviewerOrder: 2,
        reviewerUserId: 'usr-coord-rafael',
        reviewerName: 'Rafael Souza',
        reviewerRole: 'SUPPORT_COORDINATOR',
        sectorsVerified: true,
        pricesAndFeesVerified: true,
        halfPriceRulesVerified: true,
        channelsAndPosVerified: true,
        blockQuestionsVerified: true,
        decision: 'APPROVED',
        signedAt: '2026-10-18T15:00:00Z',
        signatureHash: 'hash-202',
      },
    ],
    producerApproval: {
      id: 'pa-201',
      eventId: 'evt-02',
      producerId: 'prod-02',
      producerUserName: 'Diretoria Opus Entretenimento',
      revisionVersion: 1,
      revisionHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
      decision: 'APPROVED',
      decidedAt: '2026-10-18T16:30:00Z',
      evidenceHash: 'hash-pa-201',
    },
    internalDiskFinancials: {
      internalServiceFeePct: 12,
      acquirerMdrFeeTotal: 6900,
      diskNetMarginBrl: 39540,
      custodyBankAccount: 'Itaú Empresas 341 • Ag 0852 / CC 99410-2 (Custódia DiskIngressos)',
    },
    sectors: [
      { id: 'sec-21', name: 'Plateia Baixa Central', capacity: 1200, hasNumberedSeats: true, mapSeatCount: 1200, soldCount: 1180, facePrice: 220, convenienceFee: 26.4, activeBatchName: 'Lote Único', nextBatchName: 'Lote Extra', nextBatchPrice: 250 },
      { id: 'sec-22', name: 'Plateia Alta & Mezanino', capacity: 1200, hasNumberedSeats: true, mapSeatCount: 1200, soldCount: 970, facePrice: 140, convenienceFee: 16.8, activeBatchName: 'Lote Único', nextBatchName: 'Lote Extra', nextBatchPrice: 160 },
    ],
    ticketsSample: [
      {
        id: 'tkt-21',
        eventId: 'evt-02',
        eventName: 'Turnê Acústica Nacional',
        batchId: 'bat-21',
        batchName: 'Plateia Baixa',
        sectorName: 'Plateia Baixa Central',
        ticketNumber: formatTicketNumber(1),
        validationHash: 'd0a32f41b7e4389015674defa123b24567890123defa4567890123defa45',
        faceValue: 220,
        convenienceFeeValue: 26.4,
        totalPaid: 246.4,
        buyerName: 'Carlos Drummond',
        buyerTaxId: '321.654.987-11',
        buyerEmail: 'carlos.drummond@globo.com',
        paymentMethod: 'PIX',
        status: 'ISSUED',
        issuedAt: '2026-11-03T11:00:00Z',
      },
    ],
  },
  {
    id: 'evt-03',
    code: 'EVT-2026-003',
    name: 'Festival Sertanejo Universitário 2027',
    producerId: 'prod-03',
    producerName: 'Planeta Festivais',
    category: 'FESTIVAL',
    venueName: 'Expotrade Pinhais',
    venueCity: 'Pinhais / PR',
    startDate: '2027-01-20',
    endDate: '2027-01-20',
    capacity: 18000,
    venuePermitCapacity: 20000,
    totalSold: 0,
    grossSales: 0,
    convenienceRevenue: 0,
    approvalStatus: EventApprovalStatus.APPROVED,
    publicationStatus: EventPublicationStatus.PUBLISHED,
    salesStatus: EventSalesStatus.NOT_OPEN, // Vendas ainda não abertas (exemplifica dimensão ortogonal)
    realizationStatus: EventRealizationStatus.SCHEDULED,
    operationalStage: EventOperationalStage.PUBLICADO,
    assembledByUserId: 'usr-montador-lucas',
    assembledByName: 'Lucas Andrade (Suporte Técnico)',
    revisionVersion: 1,
    revisionHash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    courtesyPrintingFeePerUnit: 2.5,
    enabledChannels: ['SITE', 'APP'],
    restrictedLinkOnly: false,
    blockQuestions: {
      hasTechnicalProductionBlocks: 'NAO',
      hasVenueContractualCourtesyBlocks: 'NAO',
      answeredByUserId: 'usr-montador-lucas',
      answeredAt: '2026-11-01T10:00:00Z',
    },
    independentReviews: [
      {
        id: 'rev-301',
        eventId: 'evt-03',
        revisionVersion: 1,
        revisionHash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        reviewerOrder: 1,
        reviewerUserId: 'usr-conferente-mariana',
        reviewerName: 'Mariana Costa',
        reviewerRole: 'TECHNICAL_SUPPORT_REVIEWER',
        sectorsVerified: true,
        pricesAndFeesVerified: true,
        halfPriceRulesVerified: true,
        channelsAndPosVerified: true,
        blockQuestionsVerified: true,
        decision: 'APPROVED',
        signedAt: '2026-11-01T11:00:00Z',
        signatureHash: 'hash-301',
      },
      {
        id: 'rev-302',
        eventId: 'evt-03',
        revisionVersion: 1,
        revisionHash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        reviewerOrder: 2,
        reviewerUserId: 'usr-coord-rafael',
        reviewerName: 'Rafael Souza',
        reviewerRole: 'SUPPORT_COORDINATOR',
        sectorsVerified: true,
        pricesAndFeesVerified: true,
        halfPriceRulesVerified: true,
        channelsAndPosVerified: true,
        blockQuestionsVerified: true,
        decision: 'APPROVED',
        signedAt: '2026-11-01T12:00:00Z',
        signatureHash: 'hash-302',
      },
    ],
    producerApproval: {
      id: 'pa-301',
      eventId: 'evt-03',
      producerId: 'prod-03',
      producerUserName: 'Diretoria Planeta Festivais',
      revisionVersion: 1,
      revisionHash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      decision: 'APPROVED',
      decidedAt: '2026-11-01T14:00:00Z',
      evidenceHash: 'hash-pa-301',
    },
    internalDiskFinancials: {
      internalServiceFeePct: 14,
      acquirerMdrFeeTotal: 0,
      diskNetMarginBrl: 0,
      custodyBankAccount: 'Itaú Empresas 341 • Ag 0852 / CC 99410-2 (Custódia DiskIngressos)',
    },
    sectors: [
      { id: 'sec-31', name: 'Arena Pista', capacity: 12000, soldCount: 0, facePrice: 120, convenienceFee: 16.8, activeBatchName: 'Lote 1 (Agendado)', nextBatchName: 'Lote 2', nextBatchPrice: 150 },
      { id: 'sec-32', name: 'Área VIP Frontstage', capacity: 6000, soldCount: 0, facePrice: 240, convenienceFee: 33.6, activeBatchName: 'Lote 1 (Agendado)', nextBatchName: 'Lote 2', nextBatchPrice: 290 },
    ],
    ticketsSample: [],
  },
  {
    id: 'evt-04',
    code: 'EVT-2026-004',
    name: 'Espetáculo Cênico Clássicos de Natal',
    producerId: 'prod-04',
    producerName: 'Produções Guaíra',
    category: 'TEATRO',
    venueName: 'Teatro Guaíra',
    venueCity: 'Curitiba / PR',
    startDate: '2026-12-22',
    endDate: '2026-12-23',
    capacity: 2800,
    venuePermitCapacity: 2800,
    totalSold: 0,
    grossSales: 0,
    convenienceRevenue: 0,
    approvalStatus: EventApprovalStatus.UNDER_REVIEW, // Em análise pela curadoria
    publicationStatus: EventPublicationStatus.UNPUBLISHED,
    salesStatus: EventSalesStatus.NOT_OPEN,
    realizationStatus: EventRealizationStatus.SCHEDULED,
    operationalStage: EventOperationalStage.EM_CONFERENCIA,
    assembledByUserId: 'usr-montador-lucas',
    assembledByName: 'Lucas Andrade (Suporte Técnico)',
    revisionVersion: 1,
    revisionHash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    courtesyPrintingFeePerUnit: 3.0,
    enabledChannels: [],
    restrictedLinkOnly: false,
    blockQuestions: {
      hasTechnicalProductionBlocks: null,
      hasVenueContractualCourtesyBlocks: null,
    },
    independentReviews: [
      {
        id: 'rev-401',
        eventId: 'evt-04',
        revisionVersion: 1,
        revisionHash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        reviewerOrder: 1,
        reviewerUserId: 'usr-conferente-mariana',
        reviewerName: 'Mariana Costa (Conferente 1)',
        reviewerRole: 'TECHNICAL_SUPPORT_REVIEWER',
        sectorsVerified: true,
        pricesAndFeesVerified: true,
        halfPriceRulesVerified: true,
        channelsAndPosVerified: true,
        blockQuestionsVerified: true,
        decision: 'APPROVED',
        notes: '1ª conferência aprovada. Aguardando 2º conferente e respostas de bloqueio.',
        signedAt: '2026-11-04T16:20:00Z',
        signatureHash: 'hash-401',
      },
    ],
    internalDiskFinancials: {
      internalServiceFeePct: 11.11,
      acquirerMdrFeeTotal: 0,
      diskNetMarginBrl: 0,
      custodyBankAccount: 'Itaú Empresas 341 • Ag 0852 / CC 99410-2 (Custódia DiskIngressos)',
    },
    sectors: [
      { id: 'sec-41', name: 'Plateia Geral', capacity: 2800, hasNumberedSeats: true, mapSeatCount: 2800, soldCount: 0, facePrice: 90, convenienceFee: 10, activeBatchName: 'Lote Promocional', nextBatchName: '1º Lote', nextBatchPrice: 120 },
    ],
    ticketsSample: [],
  },
];
