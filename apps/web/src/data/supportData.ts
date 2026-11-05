export interface ItilSlaPolicy {
  priority: 'P1 - Crítica' | 'P2 - Alta' | 'P3 - Média' | 'P4 - Baixa';
  badgeColor: string;
  description: string;
  firstResponseSla: string;
  resolutionSla: string;
  escalationTarget: string;
  complianceRate: number;
}

export interface ItilKnowledgeArticle {
  id: string;
  code: string;
  title: string;
  category: 'Pagamentos & Estornos' | 'Fiscal & NF-e' | 'Acesso & Credenciais' | 'Contratos & SLA';
  symptom: string;
  rootCause: string;
  workaround: string;
  definitiveFix: string;
  helpfulCount: number;
  updatedAt: string;
}

export interface SacChannelIntegration {
  id: string;
  name: string;
  channelType: string;
  status: 'CONNECTED' | 'STANDBY';
  avgWaitTime: string;
  dailyVolume: number;
  csatScore: string;
  automationBot: string;
}

export const itilSlaPoliciesSeed: ItilSlaPolicy[] = [
  {
    priority: 'P1 - Crítica',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Indisponibilidade de checkout/faturamento, bloqueio de liquidação PIX ou falha sistêmica multi-usuário.',
    firstResponseSla: '15 minutos',
    resolutionSla: '2 horas',
    escalationTarget: 'Squad SRE + Diretoria de Operações (Nível 3)',
    complianceRate: 98.4,
  },
  {
    priority: 'P2 - Alta',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Solicitação de estorno/chargeback urgente, divergência fiscal em NF-e ou falha em integração crítica.',
    firstResponseSla: '30 minutos',
    resolutionSla: '4 horas',
    escalationTarget: 'Supervisão SAC + Tesouraria (Nível 2)',
    complianceRate: 96.8,
  },
  {
    priority: 'P3 - Média',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Dúvidas operacionais sobre faturas, segunda via de boleto, alteração cadastral ou reenvio de acesso.',
    firstResponseSla: '2 horas',
    resolutionSla: '12 horas',
    escalationTarget: 'Fila Especializada Nível 1 / Nível 2',
    complianceRate: 99.1,
  },
  {
    priority: 'P4 - Baixa',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Solicitações de melhoria, relatórios customizados, dúvidas gerais ou feedback consultivo.',
    firstResponseSla: '4 horas',
    resolutionSla: '24 horas',
    escalationTarget: 'Atendimento Nível 1 / Autoatendimento KEDB',
    complianceRate: 99.7,
  },
];

export const itilKnowledgeArticlesSeed: ItilKnowledgeArticle[] = [
  {
    id: 'kb-01',
    code: 'KEDB-101',
    title: 'Procedimento de Estorno PIX e Reversão de Split Financeiro',
    category: 'Pagamentos & Estornos',
    symptom: 'Cliente solicita reembolso total ou parcial de pagamento via PIX ou Cartão já liquidado com Split.',
    rootCause: 'Cancelamento dentro do prazo legal (Art. 49 CDC - 7 dias) ou duplicidade de pagamento no checkout.',
    workaround: 'Bloquear preventivamente o saldo em trânsito do recebedor secundário no Módulo 02/11.',
    definitiveFix: 'Aprovar o Estorno no Módulo 13 (SAC), que aciona automaticamente a devolução via API do Gateway e gera lançamento reverso no Livro Diário.',
    helpfulCount: 148,
    updatedAt: 'Atualizado há 2 dias',
  },
  {
    id: 'kb-02',
    code: 'KEDB-102',
    title: 'Carta de Correção (CC-e) vs. Cancelamento Extemporâneo de NF-e',
    category: 'Fiscal & NF-e',
    symptom: 'Cliente corporativo reporta erro de CNPJ/Endereço ou destaque incorreto de imposto após 24h da emissão.',
    rootCause: 'Dados cadastrais desatualizados no pedido de venda antes do faturamento.',
    workaround: 'Se não alterar valores de impostos ou destinatário completo, emitir CC-e imediatamente.',
    definitiveFix: 'Para divergência de valor ou imposto após 24h, registrar nota de devolução de entrada no Módulo 04 e reemitir NF-e substituta.',
    helpfulCount: 94,
    updatedAt: 'Atualizado há 5 dias',
  },
  {
    id: 'kb-03',
    code: 'KEDB-103',
    title: 'Desbloqueio de Conta no Portal Externo e Reenvio de Token 2FA',
    category: 'Acesso & Credenciais',
    symptom: 'Cliente ou fornecedor não consegue visualizar contratos ou baixar boletos no Portal Externo (Módulo 18).',
    rootCause: 'Expiração de token de sessão ou 5 tentativas inválidas de senha.',
    workaround: 'Gerar link temporário de fatura assinado via WhatsApp Oficial.',
    definitiveFix: 'Redefinir credencial no Módulo 19 (Administração & RBAC) e disparar novo convite com autenticação em duas etapas.',
    helpfulCount: 112,
    updatedAt: 'Atualizado ontem',
  },
];

export const sacChannelsSeed: SacChannelIntegration[] = [
  {
    id: 'sac-ch-01',
    name: 'WhatsApp Business API (Fila Omnichannel)',
    channelType: 'Mensageria Instantânea + URA IA',
    status: 'CONNECTED',
    avgWaitTime: '1m 40s',
    dailyVolume: 186,
    csatScore: '4.9 / 5.0',
    automationBot: 'Triagem ITIL Automática + Consulta CPF/Pedido',
  },
  {
    id: 'sac-ch-02',
    name: 'Portal do Cliente & Autoatendimento (Módulo 18)',
    channelType: 'Web Portal Integrado ao ERP',
    status: 'CONNECTED',
    avgWaitTime: 'Imediato',
    dailyVolume: 94,
    csatScore: '4.8 / 5.0',
    automationBot: 'Abertura estruturada com validação de fatura/contrato',
  },
  {
    id: 'sac-ch-03',
    name: 'E-mail Corporativo (suporte@deltaerp.com.br)',
    channelType: 'Inbound Ticket Parser SMTP/IMAP',
    status: 'CONNECTED',
    avgWaitTime: '18m 10s',
    dailyVolume: 62,
    csatScore: '4.7 / 5.0',
    automationBot: 'Classificação automática de prioridade por palavras-chave',
  },
  {
    id: 'sac-ch-04',
    name: 'Reclame AQUI & Consumidor.gov (Conector API)',
    channelType: 'Monitoramento de Reputação Externa',
    status: 'CONNECTED',
    avgWaitTime: '32m 00s',
    dailyVolume: 7,
    csatScore: '9.4 / 10 (RA1000)',
    automationBot: 'Importação como Chamado P2 com alerta de SLA',
  },
];
