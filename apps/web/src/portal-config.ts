import { ERP_MODULES_CATALOG } from '@delta-erp/shared';
import { deltaModernTheme } from '@delta-erp/ui';

/**
 * Configuração de Navegação do Portal Interno (apps/web)
 * Identidade Visual: Moderno — Fundo claro (#F8FAFC), cores suaves e cards minimalistas (#FFFFFF)
 */
export const internalPortalLayoutConfig = {
  appName: 'DELTA ERP Enterprise',
  portalType: 'INTERNAL' as const,
  theme: deltaModernTheme,
  navigationGroups: [
    'Estratégico',
    'Financeiro & Fiscal',
    'Operacional',
    'Comercial',
    'Pessoas',
    'Relacionamento',
    'Especializado',
    'Governança',
  ] as const,
  modules: ERP_MODULES_CATALOG,
};
