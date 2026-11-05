export type AccountNature = 'ATIVO' | 'PASSIVO' | 'PATRIMONIO_LIQUIDO' | 'RECEITA' | 'CUSTO_DESPESA';
export type AccountType = 'SINTETICA' | 'ANALITICA';

export interface StructuredAccountNode {
  id: string;
  code: string;
  name: string;
  level: 1 | 2 | 3 | 4 | 5;
  type: AccountType;
  nature: AccountNature;
  normalBalance: 'DEVEDORA' | 'CREDORA';
  spedRefCode: string;
  balance: number;
  acceptsEntries: boolean;
}

export interface JournalEntryLineItem {
  accountCode: string;
  accountName: string;
  type: 'D' | 'C';
  amount: number;
  costCenter?: string;
}

export interface StructuredJournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  competence: string;
  documentRef: string;
  originModule: string;
  description: string;
  status: 'POSTED' | 'DRAFT';
  lines: JournalEntryLineItem[];
}

export interface DreStatementLine {
  id: string;
  order: number;
  label: string;
  formulaHint: string;
  currentPeriod: number;
  previousPeriod: number;
  verticalAnalysisPct: number;
  isTotal?: boolean;
  isNegative?: boolean;
}

export const structuredChartOfAccountsSeed: StructuredAccountNode[] = [
  // 1 - ATIVO
  { id: '1', code: '1', name: 'ATIVO', level: 1, type: 'SINTETICA', nature: 'ATIVO', normalBalance: 'DEVEDORA', spedRefCode: '1', balance: 2845900, acceptsEntries: false },
  { id: '1.1', code: '1.1', name: 'ATIVO CIRCULANTE', level: 2, type: 'SINTETICA', nature: 'ATIVO', normalBalance: 'DEVEDORA', spedRefCode: '1.01', balance: 1925900, acceptsEntries: false },
  { id: '1.1.01', code: '1.1.01', name: 'Caixa e Equivalentes de Caixa', level: 3, type: 'SINTETICA', nature: 'ATIVO', normalBalance: 'DEVEDORA', spedRefCode: '1.01.01', balance: 1185400, acceptsEntries: false },
  { id: '1.1.01.01', code: '1.1.01.01', name: 'Bancos Conta Movimento e Gateways', level: 4, type: 'SINTETICA', nature: 'ATIVO', normalBalance: 'DEVEDORA', spedRefCode: '1.01.01.02', balance: 1185400, acceptsEntries: false },
  { id: '1.1.01.01.0001', code: '1.1.01.01.0001', name: 'Banco Itaú Empresas C/C Principal', level: 5, type: 'ANALITICA', nature: 'ATIVO', normalBalance: 'DEVEDORA', spedRefCode: '1.01.01.02.01', balance: 742900, acceptsEntries: true },
  { id: '1.1.01.01.0002', code: '1.1.01.01.0002', name: 'Conta Escrow / Split Adquirência PIX & Cartão', level: 5, type: 'ANALITICA', nature: 'ATIVO', normalBalance: 'DEVEDORA', spedRefCode: '1.01.01.02.02', balance: 442500, acceptsEntries: true },
  { id: '1.1.02', code: '1.1.02', name: 'Créditos e Contas a Receber', level: 3, type: 'SINTETICA', nature: 'ATIVO', normalBalance: 'DEVEDORA', spedRefCode: '1.01.02', balance: 520500, acceptsEntries: false },
  { id: '1.1.02.01.0001', code: '1.1.02.01.0001', name: 'Clientes Nacionais a Receber (Faturamento)', level: 5, type: 'ANALITICA', nature: 'ATIVO', normalBalance: 'DEVEDORA', spedRefCode: '1.01.02.01.01', balance: 520500, acceptsEntries: true },
  { id: '1.1.03', code: '1.1.03', name: 'Estoques de Mercadorias e Insumos', level: 3, type: 'SINTETICA', nature: 'ATIVO', normalBalance: 'DEVEDORA', spedRefCode: '1.01.03', balance: 220000, acceptsEntries: false },
  { id: '1.1.03.01.0001', code: '1.1.03.01.0001', name: 'Estoque de Produtos para Revenda (Custo Médio)', level: 5, type: 'ANALITICA', nature: 'ATIVO', normalBalance: 'DEVEDORA', spedRefCode: '1.01.03.01.01', balance: 220000, acceptsEntries: true },
  { id: '1.2', code: '1.2', name: 'ATIVO NÃO CIRCULANTE (IMOBILIZADO E INTANGÍVEL)', level: 2, type: 'SINTETICA', nature: 'ATIVO', normalBalance: 'DEVEDORA', spedRefCode: '1.02', balance: 920000, acceptsEntries: false },
  { id: '1.2.03.01.0001', code: '1.2.03.01.0001', name: 'Infraestrutura de Servidores, Equipamentos e Licenças', level: 5, type: 'ANALITICA', nature: 'ATIVO', normalBalance: 'DEVEDORA', spedRefCode: '1.02.03.01.01', balance: 920000, acceptsEntries: true },

  // 2 - PASSIVO
  { id: '2', code: '2', name: 'PASSIVO', level: 1, type: 'SINTETICA', nature: 'PASSIVO', normalBalance: 'CREDORA', spedRefCode: '2', balance: 1124300, acceptsEntries: false },
  { id: '2.1', code: '2.1', name: 'PASSIVO CIRCULANTE', level: 2, type: 'SINTETICA', nature: 'PASSIVO', normalBalance: 'CREDORA', spedRefCode: '2.01', balance: 1124300, acceptsEntries: false },
  { id: '2.1.01.01.0001', code: '2.1.01.01.0001', name: 'Fornecedores Nacionais e Parceiros Split a Repassar', level: 5, type: 'ANALITICA', nature: 'PASSIVO', normalBalance: 'CREDORA', spedRefCode: '2.01.01.01.01', balance: 618200, acceptsEntries: true },
  { id: '2.1.02.01.0001', code: '2.1.02.01.0001', name: 'Obrigações Tributárias (ISS, PIS, COFINS, ICMS a Recolher)', level: 5, type: 'ANALITICA', nature: 'PASSIVO', normalBalance: 'CREDORA', spedRefCode: '2.01.01.04.01', balance: 214600, acceptsEntries: true },
  { id: '2.1.03.01.0001', code: '2.1.03.01.0001', name: 'Salários, Encargos FGTS/INSS e Provisão de Férias', level: 5, type: 'ANALITICA', nature: 'PASSIVO', normalBalance: 'CREDORA', spedRefCode: '2.01.01.03.01', balance: 291500, acceptsEntries: true },

  // 3 - PATRIMÔNIO LÍQUIDO
  { id: '3', code: '3', name: 'PATRIMÔNIO LÍQUIDO', level: 1, type: 'SINTETICA', nature: 'PATRIMONIO_LIQUIDO', normalBalance: 'CREDORA', spedRefCode: '2.03', balance: 1200000, acceptsEntries: false },
  { id: '3.1.01.01.0001', code: '3.1.01.01.0001', name: 'Capital Social Subscrito e Integralizado', level: 5, type: 'ANALITICA', nature: 'PATRIMONIO_LIQUIDO', normalBalance: 'CREDORA', spedRefCode: '2.03.01.01.01', balance: 1000000, acceptsEntries: true },
  { id: '3.2.01.01.0001', code: '3.2.01.01.0001', name: 'Lucros ou Prejuízos Acumulados do Exercício', level: 5, type: 'ANALITICA', nature: 'PATRIMONIO_LIQUIDO', normalBalance: 'CREDORA', spedRefCode: '2.03.04.01.01', balance: 200000, acceptsEntries: true },

  // 4 - RECEITAS OPERACIONAIS
  { id: '4', code: '4', name: 'RECEITAS OPERACIONAIS', level: 1, type: 'SINTETICA', nature: 'RECEITA', normalBalance: 'CREDORA', spedRefCode: '3.01', balance: 1485000, acceptsEntries: false },
  { id: '4.1.01.01.0001', code: '4.1.01.01.0001', name: 'Receita Bruta de Vendas de Mercadorias e Licenças', level: 5, type: 'ANALITICA', nature: 'RECEITA', normalBalance: 'CREDORA', spedRefCode: '3.01.01.01.01', balance: 1120000, acceptsEntries: true },
  { id: '4.1.01.01.0002', code: '4.1.01.01.0002', name: 'Receita de Take-Rate, Spread Financeiro e Serviços', level: 5, type: 'ANALITICA', nature: 'RECEITA', normalBalance: 'CREDORA', spedRefCode: '3.01.01.01.02', balance: 365000, acceptsEntries: true },

  // 5 - CUSTOS E DESPESAS
  { id: '5', code: '5', name: 'CUSTOS E DESPESAS OPERACIONAIS', level: 1, type: 'SINTETICA', nature: 'CUSTO_DESPESA', normalBalance: 'DEVEDORA', spedRefCode: '3.02', balance: 963400, acceptsEntries: false },
  { id: '5.1.01.01.0001', code: '5.1.01.01.0001', name: 'Deduções de Impostos s/ Vendas e Estornos SAC', level: 5, type: 'ANALITICA', nature: 'CUSTO_DESPESA', normalBalance: 'DEVEDORA', spedRefCode: '3.01.01.03.01', balance: 168500, acceptsEntries: true },
  { id: '5.2.01.01.0001', code: '5.2.01.01.0001', name: 'CMV / CSP e Taxas de Adquirência (MDR / Gateway PIX)', level: 5, type: 'ANALITICA', nature: 'CUSTO_DESPESA', normalBalance: 'DEVEDORA', spedRefCode: '3.01.01.05.01', balance: 342900, acceptsEntries: true },
  { id: '5.3.01.01.0001', code: '5.3.01.01.0001', name: 'Despesas Comerciais, Mídia Paga & Comissões Afiliados', level: 5, type: 'ANALITICA', nature: 'CUSTO_DESPESA', normalBalance: 'DEVEDORA', spedRefCode: '3.01.01.07.01', balance: 198000, acceptsEntries: true },
  { id: '5.4.01.01.0001', code: '5.4.01.01.0001', name: 'Despesas Administrativas, Pessoal (Folha) e Cloud', level: 5, type: 'ANALITICA', nature: 'CUSTO_DESPESA', normalBalance: 'DEVEDORA', spedRefCode: '3.01.01.07.02', balance: 254000, acceptsEntries: true },
];

export const structuredJournalEntriesSeed: StructuredJournalEntry[] = [
  {
    id: 'lct-101',
    entryNumber: 'LCT-2026-000841',
    date: '2026-11-05',
    competence: '11/2026',
    documentRef: 'NFE-0009841',
    originModule: '10 - Vendas / 11 - Pagamentos',
    description: 'Liquidação de vendas c/ Split Automático (Retenção Take-Rate 10% + Repasse 90%)',
    status: 'POSTED',
    lines: [
      { accountCode: '1.1.01.01.0002', accountName: 'Conta Escrow / Split Adquirência PIX & Cartão', type: 'D', amount: 85000, costCenter: 'CC-COMERCIAL' },
      { accountCode: '2.1.01.01.0001', accountName: 'Fornecedores Nacionais e Parceiros Split a Repassar', type: 'C', amount: 76500, costCenter: 'CC-FINANCEIRO' },
      { accountCode: '4.1.01.01.0002', accountName: 'Receita de Take-Rate, Spread Financeiro e Serviços', type: 'C', amount: 8500, costCenter: 'CC-COMERCIAL' },
    ],
  },
  {
    id: 'lct-102',
    entryNumber: 'LCT-2026-000842',
    date: '2026-11-05',
    competence: '11/2026',
    documentRef: 'FOLHA-112026',
    originModule: '05 - RH & Folha',
    description: 'Apropriação da Folha de Pagamento Mensal e Encargos Sociais FGTS/INSS',
    status: 'POSTED',
    lines: [
      { accountCode: '5.4.01.01.0001', accountName: 'Despesas Administrativas, Pessoal (Folha) e Cloud', type: 'D', amount: 142500, costCenter: 'CC-ADMIN' },
      { accountCode: '2.1.03.01.0001', accountName: 'Salários, Encargos FGTS/INSS e Provisão de Férias', type: 'C', amount: 142500, costCenter: 'CC-ADMIN' },
    ],
  },
  {
    id: 'lct-103',
    entryNumber: 'LCT-2026-000843',
    date: '2026-11-05',
    competence: '11/2026',
    documentRef: 'APUR-ICMS-ISS-11',
    originModule: '04 - Fiscal & SPED',
    description: 'Provisão de Tributos sobre Faturamento (ISS, PIS e COFINS)',
    status: 'POSTED',
    lines: [
      { accountCode: '5.1.01.01.0001', accountName: 'Deduções de Impostos s/ Vendas e Estornos SAC', type: 'D', amount: 64200, costCenter: 'CC-FISCAL' },
      { accountCode: '2.1.02.01.0001', accountName: 'Obrigações Tributárias (ISS, PIS, COFINS, ICMS a Recolher)', type: 'C', amount: 64200, costCenter: 'CC-FISCAL' },
    ],
  },
  {
    id: 'lct-104',
    entryNumber: 'LCT-2026-000844',
    date: '2026-11-05',
    competence: '11/2026',
    documentRef: 'MKT-ADS-Q4',
    originModule: '14 - Marketing & Mídia',
    description: 'Pagamento de Campanhas Meta Ads e Google Search Performance Q4',
    status: 'POSTED',
    lines: [
      { accountCode: '5.3.01.01.0001', accountName: 'Despesas Comerciais, Mídia Paga & Comissões Afiliados', type: 'D', amount: 48000, costCenter: 'CC-MARKETING' },
      { accountCode: '1.1.01.01.0001', accountName: 'Banco Itaú Empresas C/C Principal', type: 'C', amount: 48000, costCenter: 'CC-FINANCEIRO' },
    ],
  },
];

export const dreStatementSeed: DreStatementLine[] = [
  { id: 'dre-1', order: 1, label: '1. RECEITA OPERACIONAL BRUTA (Vendas + Serviços + Spread)', formulaHint: 'Contas 4.1.01.*', currentPeriod: 1485000, previousPeriod: 1310000, verticalAnalysisPct: 100.0, isTotal: true },
  { id: 'dre-2', order: 2, label: '2. (-) Deduções da Receita Bruta (Impostos s/ Vendas, Cancelamentos e Estornos SAC)', formulaHint: 'Conta 5.1.01.*', currentPeriod: -168500, previousPeriod: -152000, verticalAnalysisPct: -11.3, isNegative: true },
  { id: 'dre-3', order: 3, label: '3. (=) RECEITA OPERACIONAL LÍQUIDA (ROL)', formulaHint: '(1) - (2)', currentPeriod: 1316500, previousPeriod: 1158000, verticalAnalysisPct: 88.7, isTotal: true },
  { id: 'dre-4', order: 4, label: '4. (-) Custos das Mercadorias, Serviços e Taxas de Gateway (CMV / CSP / MDR)', formulaHint: 'Conta 5.2.01.*', currentPeriod: -342900, previousPeriod: -310500, verticalAnalysisPct: -23.1, isNegative: true },
  { id: 'dre-5', order: 5, label: '5. (=) LUCRO BRUTO OPERACIONAL', formulaHint: '(3) - (4)', currentPeriod: 973600, previousPeriod: 847500, verticalAnalysisPct: 65.6, isTotal: true },
  { id: 'dre-6', order: 6, label: '6. (-) Despesas Comerciais, Marketing, Tráfego Pago e Afiliados', formulaHint: 'Conta 5.3.01.*', currentPeriod: -198000, previousPeriod: -175000, verticalAnalysisPct: -13.3, isNegative: true },
  { id: 'dre-7', order: 7, label: '7. (-) Despesas Administrativas, Folha de Pessoal e Infraestrutura Cloud', formulaHint: 'Conta 5.4.01.*', currentPeriod: -254000, previousPeriod: -242000, verticalAnalysisPct: -17.1, isNegative: true },
  { id: 'dre-8', order: 8, label: '8. (=) EBITDA / LAJIDA GERENCIAL', formulaHint: '(5) - (6) - (7)', currentPeriod: 521600, previousPeriod: 430500, verticalAnalysisPct: 35.1, isTotal: true },
  { id: 'dre-9', order: 9, label: '9. (-) Depreciação, Amortização e Provisão de IRPJ / CSLL', formulaHint: 'Módulos 04 e 09', currentPeriod: -89400, previousPeriod: -76200, verticalAnalysisPct: -6.0, isNegative: true },
  { id: 'dre-10', order: 10, label: '10. (=) LUCRO LÍQUIDO DO EXERCÍCIO (DRE SOCIETÁRIA)', formulaHint: '(8) - (9)', currentPeriod: 432200, previousPeriod: 354300, verticalAnalysisPct: 29.1, isTotal: true },
];
