import { deltaModernTheme } from '@delta-erp/ui';

/**
 * Configuração Dedicada do Portal Externo (apps/portal-external)
 * Não é uma cópia reduzida do painel administrativo: possui fluxos próprios por perfil externo.
 */
export const externalPortalWorkspaces = {
  appName: 'DELTA Partner & Producer Hub',
  theme: deltaModernTheme,
  profiles: {
    EXTERNAL_PRODUCER: {
      label: 'Portal do Produtor de Eventos',
      sections: [
        { id: 'events-live', title: 'Meus Eventos & Bilheteria em Tempo Real' },
        { id: 'financial-statement', title: 'Borderô Financeiro & Taxas por Evento' },
        { id: 'payouts', title: 'Solicitação de Repasse e Antecipação de Recebíveis' },
        { id: 'contracts', title: 'Contratos, Documentos e Notas Fiscais' },
      ],
    },
    EXTERNAL_SUPPLIER: {
      label: 'Portal do Fornecedor',
      sections: [
        { id: 'quotations', title: 'Cotações Abertas e Propostas' },
        { id: 'purchase-orders', title: 'Pedidos de Compra Aprovados' },
        { id: 'nfe-upload', title: 'Envio de XML NF-e / NFS-e' },
        { id: 'receivables', title: 'Cronograma de Pagamentos' },
      ],
    },
    EXTERNAL_CLIENT: {
      label: 'Área do Cliente',
      sections: [
        { id: 'invoices', title: 'Faturas, Boletos e PIX' },
        { id: 'contracts', title: 'Contratos Ativos' },
        { id: 'sac-tickets', title: 'Atendimento, Chamados e Reembolsos' },
      ],
    },
  },
};
