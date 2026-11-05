// ============================================================================
// DADOS INICIAIS E TIPOS DO MÓDULO 03: COMERCIAL (ERP DISKINGRESSOS)
// Regra de Ouro: Comercial negocia contratos, eventos e taxas de conveniência.
// Spread, Rebate e Antecipações são de acesso exclusivo do Módulo 04 Financeiro.
// ============================================================================

export interface CommercialContractItem {
  id: string;
  code: string;
  eventName: string;
  eventCategory: 'SHOW' | 'FESTIVAL' | 'TEATRO' | 'ESPORTIVO' | 'STANDUP';
  producerId: string;
  producerName: string;
  producerTaxId: string;
  startDate: string;
  endDate: string;
  venueName: string;
  venueCity: string;
  expectedCapacity: number;
  estimatedTicketAverage: number;
  estimatedGmv: number;
  convenienceFeeRatePct: number;
  convenienceFeeFixedPerTicket: number;
  estimatedConvenienceRevenue: number;
  exclusivityType: 'TOTAL_EXCLUSIVITY' | 'SHARED_BOX_OFFICE' | 'ONLINE_ONLY';
  salesChannels: Array<'ONLINE_ECOMMERCE' | 'BOX_OFFICE_PDV' | 'AFFILIATES' | 'APP_MOBILE'>;
  status: 'NEGOTIATION' | 'APPROVED' | 'ACTIVE' | 'CLOSED';
  accountExecutive: string;
  signedDate?: string;
  notes?: string;
}

export interface CommercialProducer {
  id: string;
  code: string;
  legalName: string;
  tradeName: string;
  taxId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  state: string;
  activeEventsCount: number;
  totalNegotiatedGmv: number;
  ratingScore: number;
  status: 'ACTIVE' | 'HOMOLOGATING' | 'RESTRICTED';
  joinedAt: string;
}

export interface CommercialProposal {
  id: string;
  proposalNumber: string;
  prospectName: string;
  eventName: string;
  targetDate: string;
  venue: string;
  estimatedAudience: number;
  averageTicketValue: number;
  estimatedGmv: number;
  proposedConvenienceFeePct: number;
  proposedFixedFee: number;
  stage: 'PROSPECT' | 'PROPOSAL_SENT' | 'TERMS_REVIEW' | 'WON' | 'LOST';
  probabilityPct: number;
  accountExecutive: string;
  lastContactAt: string;
}

export const commercialProducersSeed: CommercialProducer[] = [
  {
    id: 'prod-01',
    code: 'PRD-001',
    legalName: 'Live Nation Entertainment Brasil Produções Ltda',
    tradeName: 'Live Nation Brasil',
    taxId: '22.334.455/0001-89',
    contactName: 'Carlos Eduardo Brandão (Diretor de Operações)',
    contactEmail: 'operacoes@livenation.com.br',
    contactPhone: '(11) 98765-4321',
    city: 'São Paulo',
    state: 'SP',
    activeEventsCount: 4,
    totalNegotiatedGmv: 18450000,
    ratingScore: 9.8,
    status: 'ACTIVE',
    joinedAt: '2024-03-15',
  },
  {
    id: 'prod-02',
    code: 'PRD-002',
    legalName: 'Opus Entretenimento & Promoções Artísticas S.A.',
    tradeName: 'Opus Entretenimento',
    taxId: '33.445.566/0001-90',
    contactName: 'Mariana Silveira (Gerente de Turnês)',
    contactEmail: 'turnes@opusentretenimento.com.br',
    contactPhone: '(41) 99123-8877',
    city: 'Curitiba',
    state: 'PR',
    activeEventsCount: 6,
    totalNegotiatedGmv: 9800000,
    ratingScore: 9.5,
    status: 'ACTIVE',
    joinedAt: '2023-11-20',
  },
  {
    id: 'prod-03',
    code: 'PRD-003',
    legalName: 'Planeta Brasil Festivais & Eventos Musicais Ltda',
    tradeName: 'Planeta Festivais',
    taxId: '44.556.677/0001-12',
    contactName: 'Rodrigo Albuquerque (Head de Captação)',
    contactEmail: 'rodrigo@planetafestivais.com.br',
    contactPhone: '(31) 98455-2233',
    city: 'Belo Horizonte',
    state: 'MG',
    activeEventsCount: 2,
    totalNegotiatedGmv: 6200000,
    ratingScore: 9.1,
    status: 'ACTIVE',
    joinedAt: '2025-01-10',
  },
  {
    id: 'prod-04',
    code: 'PRD-004',
    legalName: 'Teatro Guaíra & Produções Cênicas do Sul Ltda',
    tradeName: 'Produções Guaíra',
    taxId: '55.667.788/0001-23',
    contactName: 'Fernanda Lins (Curadora Artística)',
    contactEmail: 'fernanda@producoesguaira.com.br',
    contactPhone: '(41) 97711-4455',
    city: 'Curitiba',
    state: 'PR',
    activeEventsCount: 3,
    totalNegotiatedGmv: 1850000,
    ratingScore: 8.9,
    status: 'ACTIVE',
    joinedAt: '2025-06-05',
  },
];

export const commercialContractsSeed: CommercialContractItem[] = [
  {
    id: 'ctr-01',
    code: 'CTR-2026-001',
    eventName: 'Curitiba Rock Fest 2026 — Edição Prime',
    eventCategory: 'FESTIVAL',
    producerId: 'prod-01',
    producerName: 'Live Nation Brasil',
    producerTaxId: '22.334.455/0001-89',
    startDate: '2026-11-14',
    endDate: '2026-11-15',
    venueName: 'Pedreira Paulo Leminski',
    venueCity: 'Curitiba / PR',
    expectedCapacity: 25000,
    estimatedTicketAverage: 240.0,
    estimatedGmv: 6000000,
    convenienceFeeRatePct: 15.0,
    convenienceFeeFixedPerTicket: 0.0,
    estimatedConvenienceRevenue: 900000,
    exclusivityType: 'TOTAL_EXCLUSIVITY',
    salesChannels: ['ONLINE_ECOMMERCE', 'BOX_OFFICE_PDV', 'APP_MOBILE'],
    status: 'ACTIVE',
    accountExecutive: 'Lucas Marcondes (Head Comercial Festivais)',
    signedDate: '2026-08-10',
    notes: 'Exclusividade total de bilheteria online e PDVs oficiais da cidade.',
  },
  {
    id: 'ctr-02',
    code: 'CTR-2026-002',
    eventName: 'Turnê Acústica Nacional — Teatro Positivo',
    eventCategory: 'SHOW',
    producerId: 'prod-02',
    producerName: 'Opus Entretenimento',
    producerTaxId: '33.445.566/0001-90',
    startDate: '2026-11-28',
    endDate: '2026-11-28',
    venueName: 'Teatro Positivo Grande Auditório',
    venueCity: 'Curitiba / PR',
    expectedCapacity: 2400,
    estimatedTicketAverage: 180.0,
    estimatedGmv: 432000,
    convenienceFeeRatePct: 12.0,
    convenienceFeeFixedPerTicket: 2.5,
    estimatedConvenienceRevenue: 57840,
    exclusivityType: 'TOTAL_EXCLUSIVITY',
    salesChannels: ['ONLINE_ECOMMERCE', 'BOX_OFFICE_PDV'],
    status: 'ACTIVE',
    accountExecutive: 'Juliana Pires (Executiva Grandes Contas)',
    signedDate: '2026-09-02',
    notes: 'Taxa mista: 12% + R$ 2,50 fixo por emissão de ingresso.',
  },
  {
    id: 'ctr-03',
    code: 'CTR-2026-003',
    eventName: 'Stand-Up Festival Brasil — Arena da Baixada Hall',
    eventCategory: 'STANDUP',
    producerId: 'prod-03',
    producerName: 'Planeta Festivais',
    producerTaxId: '44.556.677/0001-12',
    startDate: '2026-12-05',
    endDate: '2026-12-05',
    venueName: 'Ligga Arena Indoor',
    venueCity: 'Curitiba / PR',
    expectedCapacity: 8000,
    estimatedTicketAverage: 90.0,
    estimatedGmv: 720000,
    convenienceFeeRatePct: 14.0,
    convenienceFeeFixedPerTicket: 0.0,
    estimatedConvenienceRevenue: 100800,
    exclusivityType: 'SHARED_BOX_OFFICE',
    salesChannels: ['ONLINE_ECOMMERCE', 'APP_MOBILE'],
    status: 'APPROVED',
    accountExecutive: 'Lucas Marcondes (Head Comercial Festivais)',
    signedDate: '2026-10-18',
    notes: 'Bilheteria física operada diretamente pelo produtor no local.',
  },
  {
    id: 'ctr-04',
    code: 'CTR-2026-004',
    eventName: 'Orquestra Sinfônica & Clássicos do Cinema',
    eventCategory: 'TEATRO',
    producerId: 'prod-04',
    producerName: 'Produções Guaíra',
    producerTaxId: '55.667.788/0001-23',
    startDate: '2026-12-19',
    endDate: '2026-12-20',
    venueName: 'Teatro Guaíra — Auditório Bento Munhoz',
    venueCity: 'Curitiba / PR',
    expectedCapacity: 4200,
    estimatedTicketAverage: 110.0,
    estimatedGmv: 462000,
    convenienceFeeRatePct: 10.0,
    convenienceFeeFixedPerTicket: 1.0,
    estimatedConvenienceRevenue: 50400,
    exclusivityType: 'TOTAL_EXCLUSIVITY',
    salesChannels: ['ONLINE_ECOMMERCE', 'BOX_OFFICE_PDV', 'APP_MOBILE'],
    status: 'ACTIVE',
    accountExecutive: 'Juliana Pires (Executiva Grandes Contas)',
    signedDate: '2026-10-01',
    notes: 'Parceria cultural anual com cota de cortesias institucionais.',
  },
];

export const commercialProposalsSeed: CommercialProposal[] = [
  {
    id: 'prop-01',
    proposalNumber: 'PROP-2026-081',
    prospectName: 'T4F Entretenimento S.A.',
    eventName: 'Festival Eletrônico Verão 2027',
    targetDate: '2027-01-23',
    venue: 'BioParque / Área Externa',
    estimatedAudience: 18000,
    averageTicketValue: 220.0,
    estimatedGmv: 3960000,
    proposedConvenienceFeePct: 14.5,
    proposedFixedFee: 0.0,
    stage: 'TERMS_REVIEW',
    probabilityPct: 80,
    accountExecutive: 'Lucas Marcondes',
    lastContactAt: '2026-11-04',
  },
  {
    id: 'prop-02',
    proposalNumber: 'PROP-2026-082',
    prospectName: 'GDO Produções Musicais',
    eventName: 'Arena Sertaneja — Edição Especial',
    targetDate: '2027-02-12',
    venue: 'Expotrade Pinhais',
    estimatedAudience: 22000,
    averageTicketValue: 160.0,
    estimatedGmv: 3520000,
    proposedConvenienceFeePct: 15.0,
    proposedFixedFee: 0.0,
    stage: 'PROPOSAL_SENT',
    probabilityPct: 60,
    accountExecutive: 'Juliana Pires',
    lastContactAt: '2026-11-03',
  },
  {
    id: 'prop-03',
    proposalNumber: 'PROP-2026-083',
    prospectName: 'CWB Brasil Entretenimento',
    eventName: 'Carnaval no Parque 2027',
    targetDate: '2027-02-27',
    venue: 'Parque Barigui',
    estimatedAudience: 15000,
    averageTicketValue: 130.0,
    estimatedGmv: 1950000,
    proposedConvenienceFeePct: 13.0,
    proposedFixedFee: 2.0,
    stage: 'PROSPECT',
    probabilityPct: 40,
    accountExecutive: 'Lucas Marcondes',
    lastContactAt: '2026-10-30',
  },
];
