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
  type DiskIngressosTicketItem,
  formatTicketNumber,
} from '@delta-erp/shared';

export interface EventSector {
  id: string;
  name: string;
  capacity: number;
  soldCount: number;
  facePrice: number;
  convenienceFee: number;
  activeBatchName: string;
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
  totalSold: number;
  grossSales: number;
  convenienceRevenue: number;
  // As 4 Dimensões de Estado
  approvalStatus: EventApprovalStatus;
  publicationStatus: EventPublicationStatus;
  salesStatus: EventSalesStatus;
  realizationStatus: EventRealizationStatus;
  sectors: EventSector[];
  ticketsSample: DiskIngressosTicketItem[];
}

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
    totalSold: 18450,
    grossSales: 4428000,
    convenienceRevenue: 664200,
    approvalStatus: EventApprovalStatus.APPROVED,
    publicationStatus: EventPublicationStatus.PUBLISHED,
    salesStatus: EventSalesStatus.OPEN,
    realizationStatus: EventRealizationStatus.SCHEDULED,
    sectors: [
      { id: 'sec-01', name: 'Pista Premium', capacity: 10000, soldCount: 8200, facePrice: 280, convenienceFee: 42, activeBatchName: 'Lote 3' },
      { id: 'sec-02', name: 'Pista Comum', capacity: 12000, soldCount: 8900, facePrice: 180, convenienceFee: 27, activeBatchName: 'Lote 2' },
      { id: 'sec-03', name: 'Camarote Open Bar', capacity: 3000, soldCount: 1350, facePrice: 550, convenienceFee: 82.5, activeBatchName: 'Lote 1' },
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
    totalSold: 2150,
    grossSales: 387000,
    convenienceRevenue: 46440,
    approvalStatus: EventApprovalStatus.APPROVED,
    publicationStatus: EventPublicationStatus.PUBLISHED,
    salesStatus: EventSalesStatus.OPEN,
    realizationStatus: EventRealizationStatus.SCHEDULED,
    sectors: [
      { id: 'sec-21', name: 'Plateia Baixa Central', capacity: 1200, soldCount: 1180, facePrice: 220, convenienceFee: 26.4, activeBatchName: 'Lote Único' },
      { id: 'sec-22', name: 'Plateia Alta & Mezanino', capacity: 1200, soldCount: 970, facePrice: 140, convenienceFee: 16.8, activeBatchName: 'Lote Único' },
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
    totalSold: 0,
    grossSales: 0,
    convenienceRevenue: 0,
    approvalStatus: EventApprovalStatus.APPROVED,
    publicationStatus: EventPublicationStatus.PUBLISHED,
    salesStatus: EventSalesStatus.NOT_OPEN, // Vendas ainda não abertas (exemplifica dimensão ortogonal)
    realizationStatus: EventRealizationStatus.SCHEDULED,
    sectors: [
      { id: 'sec-31', name: 'Arena Pista', capacity: 12000, soldCount: 0, facePrice: 120, convenienceFee: 16.8, activeBatchName: 'Lote 1 (Agendado)' },
      { id: 'sec-32', name: 'Área VIP Frontstage', capacity: 6000, soldCount: 0, facePrice: 240, convenienceFee: 33.6, activeBatchName: 'Lote 1 (Agendado)' },
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
    totalSold: 0,
    grossSales: 0,
    convenienceRevenue: 0,
    approvalStatus: EventApprovalStatus.UNDER_REVIEW, // Em análise pela curadoria
    publicationStatus: EventPublicationStatus.UNPUBLISHED,
    salesStatus: EventSalesStatus.NOT_OPEN,
    realizationStatus: EventRealizationStatus.SCHEDULED,
    sectors: [
      { id: 'sec-41', name: 'Plateia Geral', capacity: 2800, soldCount: 0, facePrice: 90, convenienceFee: 10, activeBatchName: 'Lote Promocional' },
    ],
    ticketsSample: [],
  },
];
