// ============================================================================
// @delta-erp/shared — CONTRATOS GLOBAIS, 20 MÓDULOS E UTILITÁRIOS DE DOMÍNIO
// ============================================================================

export enum ErpModuleCode {
  DASHBOARD = 'DASHBOARD',
  FINANCIAL = 'FINANCIAL',
  ACCOUNTING = 'ACCOUNTING',
  FISCAL = 'FISCAL',
  HR = 'HR',
  CRM = 'CRM',
  PURCHASING = 'PURCHASING',
  INVENTORY = 'INVENTORY',
  ASSETS = 'ASSETS',
  SALES = 'SALES',
  PAYMENTS = 'PAYMENTS',
  CONTRACTS = 'CONTRACTS',
  SAC = 'SAC',
  MARKETING = 'MARKETING',
  ANALYTICS = 'ANALYTICS',
  DOCUMENTS = 'DOCUMENTS',
  WORKFLOW = 'WORKFLOW',
  EXTERNAL_PORTAL = 'EXTERNAL_PORTAL',
  ADMINISTRATION = 'ADMINISTRATION',
  INTEGRATIONS = 'INTEGRATIONS',
  EVENTS = 'EVENTS',
}

export interface ErpModuleMetadata {
  number: string;
  code: ErpModuleCode;
  title: string;
  area: 'Estratégico' | 'Financeiro & Fiscal' | 'Operacional' | 'Comercial' | 'Pessoas' | 'Relacionamento' | 'Governança' | 'Especializado';
  phase: 1 | 2 | 3 | 4 | 5;
  description: string;
}

export const ERP_MODULES_CATALOG: ErpModuleMetadata[] = [
  { number: '01', code: ErpModuleCode.DASHBOARD, title: 'Dashboard Executivo', area: 'Estratégico', phase: 1, description: 'Visão consolidada executiva, operacional e financeira' },
  { number: '02', code: ErpModuleCode.FINANCIAL, title: 'Financeiro e Tesouraria', area: 'Financeiro & Fiscal', phase: 1, description: 'Contas a pagar/receber, fluxo de caixa, bancos e conciliação' },
  { number: '03', code: ErpModuleCode.ACCOUNTING, title: 'Contabilidade', area: 'Financeiro & Fiscal', phase: 2, description: 'Plano de contas, partidas dobradas, razão, balancete e DRE' },
  { number: '04', code: ErpModuleCode.FISCAL, title: 'Fiscal e Tributário', area: 'Financeiro & Fiscal', phase: 2, description: 'NF-e, NFC-e, NFS-e, retenções, apuração e SPED' },
  { number: '05', code: ErpModuleCode.HR, title: 'Recursos Humanos', area: 'Pessoas', phase: 3, description: 'Colaboradores, folha, férias, benefícios, ponto e eSocial' },
  { number: '06', code: ErpModuleCode.CRM, title: 'Comercial e CRM', area: 'Comercial', phase: 3, description: 'Clientes, funil de oportunidades, propostas e metas' },
  { number: '07', code: ErpModuleCode.PURCHASING, title: 'Compras e Suprimentos', area: 'Operacional', phase: 3, description: 'Fornecedores, solicitações, cotações e pedidos de compra' },
  { number: '08', code: ErpModuleCode.INVENTORY, title: 'Estoque e Materiais', area: 'Operacional', phase: 4, description: 'Saldos, lotes, movimentações, transferências e inventário' },
  { number: '09', code: ErpModuleCode.ASSETS, title: 'Patrimônio', area: 'Operacional', phase: 4, description: 'Ativo imobilizado, depreciação e manutenção de equipamentos' },
  { number: '10', code: ErpModuleCode.SALES, title: 'Vendas e Faturamento', area: 'Comercial', phase: 3, description: 'Pedidos de venda, faturamento e comissões' },
  { number: '11', code: ErpModuleCode.PAYMENTS, title: 'Pagamentos e Gateways', area: 'Financeiro & Fiscal', phase: 2, description: 'PIX, cartões, adquirência, chargebacks e conciliação de recebíveis' },
  { number: '12', code: ErpModuleCode.CONTRACTS, title: 'Gestão de Contratos', area: 'Comercial', phase: 3, description: 'Ciclo de vida, vigência, reajustes, SLAs e aditivos' },
  { number: '13', code: ErpModuleCode.SAC, title: 'Atendimento e SAC', area: 'Relacionamento', phase: 3, description: 'Chamados, SLA, reclamações, reembolsos e estornos' },
  { number: '14', code: ErpModuleCode.MARKETING, title: 'Marketing e Tráfego', area: 'Relacionamento', phase: 4, description: 'Campanhas, pixels, atribuição de conversão e cupons' },
  { number: '15', code: ErpModuleCode.ANALYTICS, title: 'BI, Analytics e IA', area: 'Estratégico', phase: 5, description: 'KPIs, orçamento vs realizado, rentabilidade e modelos preditivos' },
  { number: '16', code: ErpModuleCode.DOCUMENTS, title: 'Gestão de Documentos', area: 'Governança', phase: 1, description: 'Repositório seguro S3, assinaturas eletrônicas e certificados' },
  { number: '17', code: ErpModuleCode.WORKFLOW, title: 'Workflow e Alçadas', area: 'Governança', phase: 1, description: 'Regras de alçada por valor/centro de custo e aprovações' },
  { number: '18', code: ErpModuleCode.EXTERNAL_PORTAL, title: 'Portal Externo', area: 'Relacionamento', phase: 4, description: 'Ambiente dedicado para clientes, fornecedores, parceiros e produtores' },
  { number: '19', code: ErpModuleCode.ADMINISTRATION, title: 'Administração e Segurança', area: 'Governança', phase: 1, description: 'Multiempresa, RBAC/ABAC, MFA, auditoria imutável e LGPD' },
  { number: '20', code: ErpModuleCode.INTEGRATIONS, title: 'Hub de Integrações', area: 'Governança', phase: 2, description: 'API Gateway, webhooks, conectores bancários e ERPs legados' },
  { number: 'EXT', code: ErpModuleCode.EVENTS, title: 'Eventos e Bilheteria', area: 'Especializado', phase: 4, description: 'Eventos, lotes, PDV, borderô financeiro, antecipações e repasses' },
];

// ============================================================================
// CATÁLOGO OFICIAL ERP DISKINGRESSOS — 10 MÓDULOS COM AUTONOMIA FUNCIONAL
// ============================================================================

export enum DiskIngressosModuleCode {
  EVENTS_REGISTRATION = '01_EVENTOS_CADASTROS',
  SALES_TICKETING = '02_VENDAS_INGRESSOS',
  COMMERCIAL = '03_COMERCIAL',
  FINANCIAL = '04_FINANCEIRO',
  SAC = '05_SAC',
  MARKETING = '06_MARKETING',
  REMARKETING = '07_REMARKETING',
  POS_BOX_OFFICE = '08_PDV_BILHETERIAS',
  ACCESS_CONTROL = '09_CONTROLE_ACESSO',
  BI_REPORTS = '10_BI_RELATORIOS',
}

export interface DiskIngressosModuleMetadata {
  number: string;
  code: DiskIngressosModuleCode;
  title: string;
  focus: string;
  description: string;
  path: string;
  primaryRole: string;
}

export const DISKINGRESSOS_MODULES_CATALOG: DiskIngressosModuleMetadata[] = [
  {
    number: '01',
    code: DiskIngressosModuleCode.EVENTS_REGISTRATION,
    title: 'Eventos e Cadastros',
    focus: 'Produtores e eventos',
    description: 'Gestão completa da grade de shows, organizadores, arenas e configurações base',
    path: '/modules/events',
    primaryRole: 'EVENTS_MANAGER',
  },
  {
    number: '02',
    code: DiskIngressosModuleCode.SALES_TICKETING,
    title: 'Vendas e Ingressos',
    focus: 'Site, pedidos e emissão',
    description: 'Motor de venda online (E-commerce), carrinho, emissão de e-tickets nominais e lotes',
    path: '/modules/sales',
    primaryRole: 'SALES_OPERATOR',
  },
  {
    number: '03',
    code: DiskIngressosModuleCode.COMMERCIAL,
    title: 'Comercial',
    focus: 'Contratos e taxas por evento',
    description: 'Negociação com produtores, contratos, taxas de conveniência e split comercial autônomo',
    path: '/modules/commercial',
    primaryRole: 'COMMERCIAL_MANAGER',
  },
  {
    number: '04',
    code: DiskIngressosModuleCode.FINANCIAL,
    title: 'Financeiro',
    focus: 'Receitas, gateways e repasses',
    description: 'Custódia, conciliação de adquirentes/PIX, split automatizado, borderôs e antecipações',
    path: '/modules/financial',
    primaryRole: 'FINANCIAL_DIRECTOR',
  },
  {
    number: '05',
    code: DiskIngressosModuleCode.SAC,
    title: 'SAC',
    focus: 'Chamados, ITIL e SLA',
    description: 'Service desk omnichannel, matriz de impacto x urgência, KEDB, estornos e mediações',
    path: '/modules/sac',
    primaryRole: 'SAC_SUPERVISOR',
  },
  {
    number: '06',
    code: DiskIngressosModuleCode.MARKETING,
    title: 'Marketing',
    focus: 'Ads, UTMs e Analytics',
    description: 'Campanhas de tráfego (Meta/Google), rastreamento UTM, CAPI, pixels e mensuração de ROAS',
    path: '/modules/marketing',
    primaryRole: 'MARKETING_MANAGER',
  },
  {
    number: '07',
    code: DiskIngressosModuleCode.REMARKETING,
    title: 'Remarketing',
    focus: 'Públicos e automações',
    description: 'Recuperação de carrinhos abandonados, réguas de WhatsApp/SMS/E-mail e segmentação',
    path: '/modules/remarketing',
    primaryRole: 'GROWTH_SPECIALIST',
  },
  {
    number: '08',
    code: DiskIngressosModuleCode.POS_BOX_OFFICE,
    title: 'PDV e Bilheterias',
    focus: 'Vendas presenciais',
    description: 'Terminal de ponto de venda, abertura e fechamento de caixa, sangrias e impressão térmica',
    path: '/modules/pdv',
    primaryRole: 'CASHIER_OPERATOR',
  },
  {
    number: '09',
    code: DiskIngressosModuleCode.ACCESS_CONTROL,
    title: 'Controle de Acesso',
    focus: 'QR Code e validação',
    description: 'Catracas, scanners de QR Code, operação online/offline e monitoramento de lotação em tempo real',
    path: '/modules/access',
    primaryRole: 'GATE_SUPERVISOR',
  },
  {
    number: '10',
    code: DiskIngressosModuleCode.BI_REPORTS,
    title: 'BI e Relatórios',
    focus: 'Indicadores executivos',
    description: 'Painéis C-Level, forecast preditivo, DRE gerencial por evento e métricas consolidadas',
    path: '/modules/bi',
    primaryRole: 'EXECUTIVE_VIEWER',
  },
];

export interface TenantExecutionContext {
  requestId: string;
  tenantId: string;
  companyId: string;
  branchId?: string;
  userId: string;
  userEmail: string;
  userType: 'INTERNAL' | 'EXTERNAL_CLIENT' | 'EXTERNAL_SUPPLIER' | 'EXTERNAL_PARTNER' | 'EXTERNAL_PRODUCER';
  roleCode: string;
  permissions: string[];
  maxApprovalAmount: number;
  allowedCostCenterIds: string[];
  externalEntityId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DomainEventPayload<T = unknown> {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  tenantId: string;
  companyId?: string;
  occurredAt: string;
  triggeredByUserId: string;
  data: T;
}

/**
 * Arredondamento monetário seguro em centavos (evita erros de ponto flutuante IEEE 754)
 */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// ============================================================================
// AS 4 DIMENSÕES DE ESTADOS DO EVENTO (ERP DISKINGRESSOS)
// ============================================================================

export enum EventApprovalStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_CORRECTION = 'PENDING_CORRECTION',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum EventPublicationStatus {
  UNPUBLISHED = 'UNPUBLISHED',
  PUBLISHED = 'PUBLISHED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum EventSalesStatus {
  NOT_OPEN = 'NOT_OPEN',
  OPEN = 'OPEN',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}

export enum EventRealizationStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  POSTPONED = 'POSTPONED',
  CANCELLED = 'CANCELLED',
}

export interface DiskIngressosEventState {
  approvalStatus: EventApprovalStatus;
  publicationStatus: EventPublicationStatus;
  salesStatus: EventSalesStatus;
  realizationStatus: EventRealizationStatus;
}

/**
 * Formata o número do ingresso garantindo EXATAMENTE 8 caracteres numéricos
 * com zeros à esquerda preservados (ex: 1 -> "00000001", 45821 -> "00045821").
 * Essa regra é inegociável em todas as interfaces, PDFs, e-mails e relatórios.
 */
export function formatTicketNumber(value: number | string): string {
  const numericOnly = String(value ?? '').replace(/\D/g, '');
  if (!numericOnly) return '00000000';
  return numericOnly.padStart(8, '0').slice(-8);
}

export interface DiskIngressosTicketItem {
  id: string;
  eventId: string;
  eventName: string;
  batchId: string;
  batchName: string;
  sectorName: string;
  seatId?: string;
  seatCode?: string;
  ticketNumber: string; // Exatamente 8 caracteres numéricos
  validationHash: string; // Hash criptográfico seguro para o QR Code
  faceValue: number;
  convenienceFeeValue: number;
  totalPaid: number;
  buyerName: string;
  buyerTaxId: string;
  buyerEmail: string;
  buyerPhone?: string;
  paymentMethod: 'PIX' | 'CREDIT_CARD' | 'CASH_PDV';
  salesChannel?: SalesChannelType;
  isCourtesy?: boolean;
  courtesyBatchId?: string;
  status: 'RESERVED' | 'ISSUED' | 'USED' | 'CANCELLED' | 'REFUNDED';
  issuedAt: string;
  validatedAt?: string;
  validatedByGate?: string;
}

// ============================================================================
// PLATAFORMA OPERACIONAL DE EVENTOS PONTA A PONTA (PACOTES 01 A 07 — STE.PO / STE.IT)
// ============================================================================

/**
 * Fluxo Obrigatório de Abertura e Operação (STE.PO.001 / Seção 5.1)
 */
export enum EventOperationalStage {
  RASCUNHO = 'RASCUNHO',
  AGUARDANDO_INFORMACOES = 'AGUARDANDO_INFORMACOES',
  EM_MONTAGEM = 'EM_MONTAGEM',
  EM_CONFERENCIA = 'EM_CONFERENCIA',
  AGUARDANDO_PRODUTOR = 'AGUARDANDO_PRODUTOR',
  APROVADO = 'APROVADO',
  AGENDADO = 'AGENDADO',
  PUBLICADO = 'PUBLICADO',
  EM_OPERACAO = 'EM_OPERACAO',
  ENCERRADO = 'ENCERRADO',
}

/**
 * Estados de Assento / Lugar Separados (STE.IT.001 / Seção 5.2)
 */
export enum EventSeatStatus {
  DISPONIVEL = 'DISPONIVEL',
  RESERVADO_TEMPORARIAMENTE = 'RESERVADO_TEMPORARIAMENTE',
  BLOQUEADO = 'BLOQUEADO',
  VENDIDO = 'VENDIDO',
  UTILIZADO = 'UTILIZADO',
  INATIVO = 'INATIVO',
}

export type SalesChannelType = 'SITE' | 'APP' | 'PDV' | 'PARTNER_API' | 'RESTRICTED_LINK';

/**
 * Perguntas Obrigatórias de Bloqueios antes de liberar vendas (STE.IT.001, p. 8)
 */
export interface EventMandatoryBlockQuestions {
  hasTechnicalProductionBlocks: 'SIM' | 'NAO' | null;
  technicalProductionBlocksDetail?: string;
  hasVenueContractualCourtesyBlocks: 'SIM' | 'NAO' | null;
  venueContractualCourtesyBlocksDetail?: string;
  answeredByUserId?: string;
  answeredAt?: string;
}

/**
 * Conferência Independente por 2 pessoas distintas do montador (STE.PO.001, p. 3)
 */
export interface EventIndependentReview {
  id: string;
  eventId: string;
  revisionVersion: number;
  revisionHash: string;
  reviewerOrder: 1 | 2;
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
  signedAt: string;
  signatureHash: string;
}

/**
 * Aceite Explícito do Produtor vinculado à versão/hash exato da montagem
 */
export interface EventProducerApproval {
  id: string;
  eventId: string;
  producerId: string;
  producerUserName: string;
  revisionVersion: number;
  revisionHash: string;
  decision: 'APPROVED' | 'CORRECTION_REQUESTED';
  notes?: string;
  decidedAt: string;
  evidenceHash: string;
}

/**
 * Revisão Versionada da Montagem (Qualquer alteração material incrementa versão e invalida aprovações anteriores)
 */
export interface EventRevisionRecord {
  version: number;
  snapshotHash: string;
  assembledByUserId: string;
  assembledByName: string;
  reason: string;
  createdAt: string;
  materialFieldsSnapshot: {
    title: string;
    venueName: string;
    startsAt: string;
    endsAt: string;
    declaredCapacity: number;
    sectorsTotalCapacity: number;
    serviceFeePct: number;
  };
}

/**
 * Solicitação de Abertura / Intake do Evento (STE.PO.001)
 */
export interface EventIntakeRecord {
  id: string;
  code: string;
  eventId?: string;
  producerId: string;
  producerName: string;
  originChannel: 'PORTAL_PRODUTOR' | 'COMERCIAL' | 'EMAIL' | 'WHATSAPP_CORPORATIVO';
  requestedByName: string;
  eventTitle: string;
  venueName: string;
  cityState: string;
  proposedStartDate: string;
  declaredCapacity: number;
  hasVenueAuthorizationDoc: boolean;
  hasCommercialContractApproved: boolean;
  commercialFeePct: number;
  courtesyPrintingFeePerUnit: number;
  pendingItems: string[];
  status: 'RECEBIDO' | 'PENDENTE_DADOS' | 'EM_MONTAGEM' | 'HOMOLOGADO';
  createdAt: string;
}

/**
 * Bloqueio de Assentos / Setor (STE.PO.003)
 */
export interface EventSeatBlockRecord {
  id: string;
  eventId: string;
  sectorId: string;
  sectorName: string;
  blockType: 'TECNICO_PRODUCAO' | 'CORTESIA_CONTRATUAL_ESPACO' | 'RESERVA_PATROCINADOR';
  origin: string;
  reason: string;
  quantity: number;
  seatCodes: string[];
  responsibleUserId: string;
  responsibleName: string;
  reviewDeadline: string;
  status: 'ATIVO' | 'LIBERADO_PARA_VENDA' | 'CONVERTIDO_EM_CORTESIA';
  createdAt: string;
  releasedAt?: string;
  releasedByUserId?: string;
}

/**
 * Emissão de Cortesias e Recibo Digital Vinculado ao Borderô (STE.PO.003 / Anexo 1)
 */
export interface TicketCourtesyBatchRecord {
  id: string;
  eventId: string;
  sectorId: string;
  sectorName: string;
  category: 'CORTESIA_NAO_COMERCIALIZAVEL';
  recipientName: string;
  recipientTaxId?: string;
  quantity: number;
  ticketNumbers: string[]; // Todos com 8 dígitos numéricos
  deliveryMode: 'IMPRESSO_FISICO' | 'E_TICKET_PDF';
  unitPrintingFee: number; // Derivado do contrato vigente do evento
  totalPrintingDebit: number;
  issuedByUserId: string;
  issuedByName: string;
  issuedAt: string;
  receipt?: TicketReceiptRecord;
}

export interface TicketReceiptRecord {
  id: string;
  receiptCode: string; // Anexo 1 - Recibo de Ingressos
  courtesyBatchId: string;
  eventId: string;
  producerId: string;
  quantity: number;
  ticketRange: string;
  printingDebitForBordeau: number;
  issuerUserId: string;
  issuerName: string;
  receiverName: string;
  receiverDocument: string;
  signedAt: string;
  signatureHash: string;
  linkedToBordeau: boolean;
}

/**
 * Virada Atômica de Lote com Auditoria (STE.PO.003, p. 3)
 */
export interface LotTransitionRecord {
  id: string;
  eventId: string;
  sectorId: string;
  sectorName: string;
  closedLotId: string;
  closedLotName: string;
  previousFacePrice: number;
  openedLotId: string;
  openedLotName: string;
  newFacePrice: number;
  triggerType: 'QUANTIDADE_ESGOTADA' | 'DATA_PROGRAMADA' | 'MANUAL_SUPORTE';
  requestedByUserId: string;
  approvedByUserId: string;
  justification: string;
  idempotencyKey: string;
  transitionedAt: string;
}

/**
 * Central de Alterações Críticas (STE.PO.002 — Cancelamento, Adiamento com/sem data, Mudança de Local)
 */
export type CriticalChangeType =
  | 'CANCELAMENTO'
  | 'ADIAMENTO_COM_NOVA_DATA'
  | 'ADIAMENTO_SEM_DATA'
  | 'MUDANCA_DE_LOCAL';

export interface CriticalEventChangeRequest {
  id: string;
  eventId: string;
  eventName: string;
  producerId: string;
  changeType: CriticalChangeType;
  reason: string;
  evidenceDocumentCode: string;
  requestedByUserId: string;
  requestedByName: string;
  newStartDate?: string;
  newEndDate?: string;
  newVenueName?: string;
  newVenueCapacity?: number;
  allChannelsSalesSuspended: boolean;
  ticketContinuityPolicy: 'REEMBOLSO_INTEGRAL_INCLUINDO_TAXAS' | 'VALIDOS_PARA_NOVA_DATA_COM_OPCAO_REEMBOLSO' | 'REALOCACAO_DE_MAPA';
  financialImpact: {
    affectedOrdersCount: number;
    affectedTicketsCount: number;
    totalTicketFaceToRefund: number;
    totalServiceFeesToRefund: number;
    totalCustomerRefundObligation: number; // Face + Taxas (regra cancelamento 2026)
    producerCustodyBalanceAvailable: number;
    requiresProducerSupplement: number;
  };
  status: 'ABERTA_CONGELADA' | 'EM_CONCILIACAO_FINANCEIRA' | 'APROVADA_PARA_COMUNICACAO' | 'ARQUIVADA';
  createdAt: string;
}

/**
 * Plano de Estorno Supervisionado (Sem execução bancária automática na Fase 1)
 */
export type SupervisedRefundStatus =
  | 'SOLICITADO'
  | 'EM_ANALISE'
  | 'AUTORIZADO_FINANCEIRO'
  | 'AGUARDANDO_ADQUIRENTE'
  | 'CONCLUIDO';

export interface SupervisedRefundPlanItem {
  id: string;
  eventId: string;
  changeRequestId?: string;
  orderId: string;
  ticketNumber: string;
  buyerName: string;
  buyerTaxId: string;
  buyerEmail: string;
  paymentMethod: 'PIX' | 'CREDIT_CARD' | 'CASH_PDV';
  acquirerProvider: string;
  faceAmount: number;
  serviceFeeAmount: number;
  totalRefundAmount: number;
  status: SupervisedRefundStatus;
  authorizedByUserId?: string;
  authorizedAt?: string;
  externalProviderConfirmationId?: string;
  completedAt?: string;
}

/**
 * Tabela de Preços Versionada de Comunicação (Resolve conflito documental R$ 0,51 vs R$ 0,61)
 */
export type CommunicationPurpose =
  | 'INFORMATIVO_ALTERACAO_CRITICA'
  | 'PROMOCIONAL_MARKETING'
  | 'OPERACIONAL_EMAIL_TRANSACIONAL';

export interface CommunicationPricingVersion {
  id: string;
  versionCode: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'SMS';
  purpose: CommunicationPurpose;
  providerName: string;
  unitPriceBrl: number; // Ex: 0.51 informativo, 0.61 promocional, 0.00 email operacional
  validFrom: string;
  validUntil?: string;
  contractReference: string;
  isActive: boolean;
}

/**
 * Templates Oficiais Revisionados e Separados por Ocorrência (Impede uso de texto de cancelamento em adiamento)
 */
export interface OfficialCommunicationTemplate {
  id: string;
  code: string;
  category: CriticalChangeType | 'LANCAMENTO_EVENTO' | 'VIRADA_DE_LOTE' | 'INSTRUCOES_VALIDACAO';
  title: string;
  channel: 'WHATSAPP' | 'EMAIL';
  subjectTemplate?: string;
  bodyTemplate: string; // Max 1024 chars para WhatsApp conforme ficha 2026
  reviewedByLegalOrSac: string;
  version: number;
}

export interface CustomerCommunicationDispatch {
  id: string;
  eventId: string;
  changeType?: CriticalChangeType;
  templateId: string;
  templateCategory: OfficialCommunicationTemplate['category'];
  channel: 'WHATSAPP' | 'EMAIL';
  purpose: CommunicationPurpose;
  pricingVersionCode: string;
  unitCostApplied: number;
  rawOrdersCount: number;
  deduplicatedRecipientsCount: number; // Deduplicado por contato (LGPD)
  estimatedTotalCost: number;
  costResponsibility: 'PRODUTOR_PIX' | 'PRODUTOR_BORDERO' | 'CUSTEIO_DISKINGRESSOS';
  financialApproved: boolean;
  textApprovedByUserId?: string;
  status: 'PREVIA_ORCAMENTO' | 'AUTORIZADO' | 'ENVIADO' | 'FALHA_PARCIAL';
  createdAt: string;
}

/**
 * Especificação Documental de Artes 2026 (Seção 5.8)
 */
export interface EventArtworkSpecification {
  assetType:
    | 'IMAGEM_PRINCIPAL_HOME'
    | 'BANNER_EVENTO'
    | 'FUNDO_SITE_COR'
    | 'FEED_SOCIAL'
    | 'REELS_MP4'
    | 'STORY'
    | 'EMAIL_MARKETING'
    | 'TESTEIRA_HOME'
    | 'WHATSAPP_500';
  label: string;
  documentedDimensions: string;
  allowedFormats: string[];
  maxDurationSeconds?: number;
  maxTextChars?: number;
  status: 'PENDENTE' | 'VALIDADO' | 'REJEITADO';
}


