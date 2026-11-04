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
