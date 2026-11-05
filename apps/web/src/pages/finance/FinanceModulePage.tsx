import React, { useEffect, useMemo, useState } from 'react';
import { KpiCard } from '../../components/ui/KpiCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { SubModuleTabs } from '../../components/ui/SubModuleTabs';

export interface FinancialTitleProp {
  id: string;
  documentNumber: string;
  type: 'PAYABLE' | 'RECEIVABLE';
  description: string;
  dueDate: string;
  status: 'OPEN' | 'PAID' | 'OVERDUE' | 'CANCELED';
  originalAmount: string;
  openAmount: string;
}

export interface BankAccountProp {
  id: string;
  code: string;
  name: string;
  bankCode: string;
  branchNumber: string;
  accountNumber: string;
  currentBalance: string;
}

interface SplitRecipientRule {
  id: string;
  recipientName: string;
  role: string;
  documentCnpj: string;
  pixKey: string;
  sharePercent: number;
  settlementCycle: 'D+0 (PIX Instantâneo)' | 'D+1 (Bancário)' | 'D+14 (Cartão)';
  status: 'ACTIVE' | 'PAUSED';
}

interface FinanceModulePageProps {
  selectedSubmenu: string;
  titles: FinancialTitleProp[];
  bankAccounts: BankAccountProp[];
  finDocumentNumber: string;
  setFinDocumentNumber: (v: string) => void;
  finType: 'PAYABLE' | 'RECEIVABLE';
  setFinType: (v: 'PAYABLE' | 'RECEIVABLE') => void;
  finDescription: string;
  setFinDescription: (v: string) => void;
  finDueDate: string;
  setFinDueDate: (v: string) => void;
  finAmount: string;
  setFinAmount: (v: string) => void;
  selectedBankAccountId: string;
  setSelectedBankAccountId: (v: string) => void;
  onCreateTitle: (e: React.FormEvent) => void;
  onSettleTitle: (titleId: string) => void;
  onNotify?: (msg: string) => void;
}

type FinanceViewTab =
  | 'overview'
  | 'hub'
  | 'spread_simulator'
  | 'split_engine'
  | 'banks_treasury';

const initialSplitRules: SplitRecipientRule[] = [
  {
    id: 'sp-01',
    recipientName: 'Operador / Produtor Principal (Repasse Líquido)',
    role: 'Merchant / Parceiro Principal',
    documentCnpj: '14.528.901/0001-40',
    pixKey: 'repasse@parceiroprincipal.com.br',
    sharePercent: 82,
    settlementCycle: 'D+1 (Bancário)',
    status: 'ACTIVE',
  },
  {
    id: 'sp-02',
    recipientName: 'DELTA ERP Holding (Take-Rate & Taxa Tecnológica)',
    role: 'Plataforma / Subadquirente',
    documentCnpj: '45.987.120/0001-99',
    pixKey: 'tesouraria@deltaerp.com.br',
    sharePercent: 10,
    settlementCycle: 'D+0 (PIX Instantâneo)',
    status: 'ACTIVE',
  },
  {
    id: 'sp-03',
    recipientName: 'Canal Afiliado / Representante Comercial Comissionado',
    role: 'Comissão Comercial',
    documentCnpj: '29.110.482/0001-12',
    pixKey: '+5511998827711',
    sharePercent: 5,
    settlementCycle: 'D+1 (Bancário)',
    status: 'ACTIVE',
  },
  {
    id: 'sp-04',
    recipientName: 'Fundo Garantidor de Chargeback & Estornos SAC (Escrow)',
    role: 'Reserva Técnica de Risco',
    documentCnpj: '45.987.120/0002-70',
    pixKey: 'escrow.risco@deltaerp.com.br',
    sharePercent: 3,
    settlementCycle: 'D+14 (Cartão)',
    status: 'ACTIVE',
  },
];

export const FinanceModulePage: React.FC<FinanceModulePageProps> = ({
  selectedSubmenu,
  titles,
  bankAccounts,
  finDocumentNumber,
  setFinDocumentNumber,
  finType,
  setFinType,
  finDescription,
  setFinDescription,
  finDueDate,
  setFinDueDate,
  finAmount,
  setFinAmount,
  selectedBankAccountId,
  setSelectedBankAccountId,
  onCreateTitle,
  onSettleTitle,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<FinanceViewTab>('overview');
  const [titleTypeFilter, setTitleTypeFilter] = useState<'ALL' | 'PAYABLE' | 'RECEIVABLE'>('ALL');

  // Spread Simulator interactive states (modeled on SimuladorSpreadModule.tsx)
  const [simVolumeGmv, setSimVolumeGmv] = useState<number>(500000);
  const [simTakeRatePct, setSimTakeRatePct] = useState<number>(8.5);
  const [simGatewayMdrPct, setSimGatewayMdrPct] = useState<number>(1.85);
  const [simAntecipacaoPct, setSimAntecipacaoPct] = useState<number>(1.4);

  // Split Engine states (modeled on SplitFinanceiroModule.tsx)
  const [splitRules, setSplitRules] = useState<SplitRecipientRule[]>(initialSplitRules);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientPix, setNewRecipientPix] = useState('');
  const [newRecipientShare, setNewRecipientShare] = useState('5');

  useEffect(() => {
    const sub = selectedSubmenu.toLowerCase();
    if (sub.includes('pagar')) {
      setActiveTab('overview');
      setTitleTypeFilter('PAYABLE');
    } else if (sub.includes('receber')) {
      setActiveTab('overview');
      setTitleTypeFilter('RECEIVABLE');
    } else if (sub.includes('banco') || sub.includes('caixa') || sub.includes('tesouraria')) {
      setActiveTab('banks_treasury');
    }
  }, [selectedSubmenu]);

  const totalBankBalance = useMemo(
    () => bankAccounts.reduce((acc, b) => acc + Number(b.currentBalance), 0),
    [bankAccounts],
  );
  const openReceivables = useMemo(
    () =>
      titles
        .filter((t) => t.type === 'RECEIVABLE' && t.status === 'OPEN')
        .reduce((acc, t) => acc + Number(t.openAmount), 0),
    [titles],
  );
  const openPayables = useMemo(
    () =>
      titles
        .filter((t) => t.type === 'PAYABLE' && t.status === 'OPEN')
        .reduce((acc, t) => acc + Number(t.openAmount), 0),
    [titles],
  );
  const projectedCashBalance = totalBankBalance + openReceivables - openPayables;

  const filteredTitles = useMemo(
    () => titles.filter((t) => (titleTypeFilter === 'ALL' ? true : t.type === titleTypeFilter)),
    [titles, titleTypeFilter],
  );

  // Spread Simulator Calculations
  const grossFeeRevenue = (simVolumeGmv * simTakeRatePct) / 100;
  const gatewayMdrCost = (simVolumeGmv * simGatewayMdrPct) / 100;
  const anticipationRevenue = (simVolumeGmv * 0.4 * simAntecipacaoPct) / 100;
  const netSpreadMargin = grossFeeRevenue + anticipationRevenue - gatewayMdrCost;
  const netSpreadPct = simVolumeGmv > 0 ? (netSpreadMargin / simVolumeGmv) * 100 : 0;

  const totalSplitPercent = useMemo(
    () => splitRules.reduce((acc, r) => acc + r.sharePercent, 0),
    [splitRules],
  );

  const handleAddSplitRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipientName.trim()) return;
    const share = Math.max(1, Math.min(100, Number(newRecipientShare) || 5));
    const created: SplitRecipientRule = {
      id: `sp-${Date.now()}`,
      recipientName: newRecipientName.trim(),
      role: 'Participante Split Customizado',
      documentCnpj: '19.400.210/0001-88',
      pixKey: newRecipientPix.trim() || 'pix@parceiro.com.br',
      sharePercent: share,
      settlementCycle: 'D+1 (Bancário)',
      status: 'ACTIVE',
    };
    setSplitRules((prev) => [...prev, created]);
    setNewRecipientName('');
    setNewRecipientPix('');
    onNotify?.(`Regra de Split adicionada para ${created.recipientName} (${share}%)`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="02. Gestão Financeira, Tesouraria, Split & Simulador de Spread"
        subtitle="Contas a pagar e receber, conciliação bancária, borderô de liquidação, split automático de recebíveis e simulador de rentabilidade financeira"
        badge={`Submenu: ${selectedSubmenu}`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setActiveTab('spread_simulator')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
            >
              Simulador de Spread
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('split_engine')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
            >
              Motor de Split ({splitRules.length})
            </button>
          </>
        }
      />

      <SubModuleTabs<FinanceViewTab>
        tabs={[
          { id: 'overview', label: 'Contas a Pagar & Receber', badge: titles.length },
          { id: 'hub', label: 'Hub Financeiro (12 Submódulos)' },
          { id: 'spread_simulator', label: 'Simulador de Spread & Rentabilidade' },
          { id: 'split_engine', label: 'Split Financeiro Automatizado', badge: `${totalSplitPercent}%` },
          { id: 'banks_treasury', label: 'Bancos, Caixa & Tesouraria', badge: bankAccounts.length },
        ]}
        activeTab={activeTab}
        onSelect={setActiveTab}
      />

      {/* KPIs Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Saldo Disponível em Bancos"
          value={`R$ ${totalBankBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          trend={{ value: 8.4, isPositive: true }}
          subtitle={`${bankAccounts.length} contas bancárias conciliadas`}
          badge="Liquidez Imediata"
          tone="emerald"
        />
        <KpiCard
          title="Contas a Receber em Aberto"
          value={`R$ ${openReceivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Títulos aguardando liquidação"
          badge="Entradas"
          tone="indigo"
        />
        <KpiCard
          title="Contas a Pagar em Aberto"
          value={`R$ ${openPayables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Compromissos operacionais e fornecedores"
          badge="Saídas"
          tone="rose"
        />
        <KpiCard
          title="Caixa Projetado Líquido"
          value={`R$ ${projectedCashBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          trend={{ value: 14.2, isPositive: projectedCashBalance >= 0 }}
          subtitle="Saldo Bancos + Receber - Pagar"
          badge="Tesouraria"
          tone="violet"
        />
      </div>

      {/* TAB 1: CONTAS A PAGAR & RECEBER */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-base font-black text-slate-900 mb-1">Novo Título Financeiro</h3>
            <p className="text-xs text-slate-500 mb-4">
              Emita títulos a pagar ou a receber com vínculo contábil automático
            </p>
            <form onSubmit={onCreateTitle} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nº Documento</label>
                  <input
                    type="text"
                    required
                    value={finDocumentNumber}
                    onChange={(e) => setFinDocumentNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Natureza</label>
                  <select
                    value={finType}
                    onChange={(e) => setFinType(e.target.value as 'PAYABLE' | 'RECEIVABLE')}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  >
                    <option value="RECEIVABLE">A RECEBER (+)</option>
                    <option value="PAYABLE">A PAGAR (-)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Histórico / Descrição
                </label>
                <input
                  type="text"
                  required
                  value={finDescription}
                  onChange={(e) => setFinDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vencimento</label>
                  <input
                    type="date"
                    required
                    value={finDueDate}
                    onChange={(e) => setFinDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={finAmount}
                    onChange={(e) => setFinAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Conta Bancária p/ Baixa
                </label>
                <select
                  value={selectedBankAccountId}
                  onChange={(e) => setSelectedBankAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name} (R$ {Number(b.currentBalance).toLocaleString('pt-BR')})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm"
              >
                Registrar Título no Contas a Pagar/Receber
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Borderô de Títulos Financeiros (Baixa c/ Reflexo Bancário e Contábil)
                </h3>
                <p className="text-xs text-slate-500">
                  Filtre por Contas a Pagar ou Contas a Receber e liquide com 1 clique
                </p>
              </div>
              <div className="flex gap-1.5">
                {(['ALL', 'RECEIVABLE', 'PAYABLE'] as const).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setTitleTypeFilter(tp)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      titleTypeFilter === tp
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tp === 'ALL' ? 'Todos' : tp === 'RECEIVABLE' ? 'A Receber' : 'A Pagar'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                    <th className="py-2.5 pr-3">Documento</th>
                    <th className="py-2.5 pr-3">Tipo</th>
                    <th className="py-2.5 pr-3">Descrição</th>
                    <th className="py-2.5 pr-3">Vencimento</th>
                    <th className="py-2.5 pr-3">Saldo Aberto</th>
                    <th className="py-2.5 pr-3">Status</th>
                    <th className="py-2.5 text-right">Liquidação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredTitles.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="py-3 pr-3 font-mono font-bold text-slate-900">
                        {t.documentNumber}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            t.type === 'RECEIVABLE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {t.type === 'RECEIVABLE' ? 'RECEBER' : 'PAGAR'}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-slate-700">{t.description}</td>
                      <td className="py-3 pr-3 text-slate-600">
                        {new Date(t.dueDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 pr-3 font-black text-slate-900">
                        R$ {Number(t.openAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            t.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {t.status === 'OPEN' ? (
                          <button
                            type="button"
                            onClick={() => onSettleTitle(t.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-500"
                          >
                            Baixar / Liquidar
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400">Liquidado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HUB FINANCEIRO (12 SUBMÓDULOS) */}
      {activeTab === 'hub' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: '1. Contas a Pagar & Borderô CNAB',
              desc: 'Programação de pagamentos, aprovação por alçada e baixa automática no banco.',
              target: 'overview' as FinanceViewTab,
              badge: 'Operações de Caixa',
            },
            {
              title: '2. Contas a Receber & Régua de Cobrança',
              desc: 'Faturamento, boletos registrados, PIX dinâmico e conciliação de liquidações.',
              target: 'overview' as FinanceViewTab,
              badge: 'Operações de Caixa',
            },
            {
              title: '3. Simulador de Spread & Take-Rate',
              desc: 'Simule GMV, taxa cobrada, MDR do gateway e receita de antecipação de recebíveis.',
              target: 'spread_simulator' as FinanceViewTab,
              badge: 'Simuladores & Inteligência',
            },
            {
              title: '4. Motor de Split Financeiro Automático',
              desc: 'Divisão percentual automática entre produtor, plataforma, afiliado e reserva escrow.',
              target: 'split_engine' as FinanceViewTab,
              badge: 'Liquidação & Split',
            },
            {
              title: '5. Conciliação Bancária OFX / API Open Finance',
              desc: 'Pareamento automático de extratos bancários com lançamentos do Livro Diário.',
              target: 'banks_treasury' as FinanceViewTab,
              badge: 'Tesouraria',
            },
            {
              title: '6. Fluxo de Caixa Direto & Indireto (90 dias)',
              desc: 'Projeção diária de liquidez combinando carteira em aberto e saldos bancários.',
              target: 'banks_treasury' as FinanceViewTab,
              badge: 'Tesouraria',
            },
          ].map((card) => (
            <div
              key={card.title}
              onClick={() => setActiveTab(card.target)}
              className="cursor-pointer group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all"
            >
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {card.badge}
              </span>
              <h3 className="text-sm font-black text-slate-900 mt-2.5 group-hover:text-indigo-600">
                {card.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: SIMULADOR DE SPREAD & RENTABILIDADE (MODELED ON SimuladorSpreadModule.tsx) */}
      {activeTab === 'spread_simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Parâmetros do Simulador de Spread & Take-Rate
              </h3>
              <p className="text-xs text-slate-500">
                Ajuste os controles deslizantes para projetar a margem líquida da tesouraria
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Volume Transacionado Mensal (GMV / TPV)</span>
                  <span className="text-indigo-700">
                    R$ {simVolumeGmv.toLocaleString('pt-BR')}
                  </span>
                </div>
                <input
                  type="range"
                  min={50000}
                  max={5000000}
                  step={50000}
                  value={simVolumeGmv}
                  onChange={(e) => setSimVolumeGmv(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Taxa Média Cobrada / Take-Rate (%)</span>
                  <span className="text-emerald-700">{simTakeRatePct.toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={0.25}
                  value={simTakeRatePct}
                  onChange={(e) => setSimTakeRatePct(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Custo Médio Gateway / Adquirência MDR (%)</span>
                  <span className="text-rose-600">{simGatewayMdrPct.toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={5}
                  step={0.05}
                  value={simGatewayMdrPct}
                  onChange={(e) => setSimGatewayMdrPct(Number(e.target.value))}
                  className="w-full accent-rose-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Spread de Antecipação de Recebíveis D+1 (%)</span>
                  <span className="text-violet-700">{simAntecipacaoPct.toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={4}
                  step={0.1}
                  value={simAntecipacaoPct}
                  onChange={(e) => setSimAntecipacaoPct(Number(e.target.value))}
                  className="w-full accent-violet-600"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Resultado Projetado de Spread Financeiro
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Receita Bruta de Taxas
                </span>
                <p className="text-lg font-black text-slate-900 mt-1">
                  R$ {grossFeeRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200">
                <span className="text-[10px] font-bold uppercase text-rose-700">
                  (-) Custo MDR Adquirente
                </span>
                <p className="text-lg font-black text-rose-800 mt-1">
                  - R$ {gatewayMdrCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200">
                <span className="text-[10px] font-bold uppercase text-indigo-700">
                  (+) Receita Antecipação
                </span>
                <p className="text-lg font-black text-indigo-900 mt-1">
                  + R$ {anticipationRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-700">
                  (=) Lucro Líquido de Spread
                </span>
                <p className="text-lg font-black text-emerald-900 mt-1">
                  R$ {netSpreadMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (
                  {netSpreadPct.toFixed(2)}%)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SPLIT FINANCEIRO AUTOMATIZADO (MODELED ON SplitFinanceiroModule.tsx) */}
      {activeTab === 'split_engine' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Régua de Alocação do Split Financeiro Automático ({totalSplitPercent}% alocado)
                </h3>
                <p className="text-xs text-slate-500">
                  Divisão automática de cada pagamento liquidado no Módulo 11 entre recebedores
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black border ${
                  totalSplitPercent === 100
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                Soma da Regra: {totalSplitPercent}%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                    <th className="py-2.5 pr-3">Recebedor / Participante</th>
                    <th className="py-2.5 pr-3">Papel na Operação</th>
                    <th className="py-2.5 pr-3">CNPJ</th>
                    <th className="py-2.5 pr-3">Chave PIX de Repasse</th>
                    <th className="py-2.5 pr-3">Ciclo</th>
                    <th className="py-2.5 pr-3">% Split</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {splitRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/80">
                      <td className="py-3 pr-3 font-bold text-slate-900">{rule.recipientName}</td>
                      <td className="py-3 pr-3 text-slate-600">{rule.role}</td>
                      <td className="py-3 pr-3 font-mono text-slate-600">{rule.documentCnpj}</td>
                      <td className="py-3 pr-3 font-mono text-indigo-600">{rule.pixKey}</td>
                      <td className="py-3 pr-3 text-slate-600">{rule.settlementCycle}</td>
                      <td className="py-3 pr-3 font-black text-emerald-700">
                        {rule.sharePercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form
              onSubmit={handleAddSplitRule}
              className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3"
            >
              <input
                type="text"
                placeholder="Nome do novo recebedor Split"
                value={newRecipientName}
                onChange={(e) => setNewRecipientName(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="Chave PIX (CNPJ/E-mail)"
                value={newRecipientPix}
                onChange={(e) => setNewRecipientPix(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono"
              />
              <input
                type="number"
                placeholder="% Participação"
                value={newRecipientShare}
                onChange={(e) => setNewRecipientShare(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 text-white font-bold text-xs py-2 hover:bg-indigo-500"
              >
                + Adicionar Recebedor Split
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: BANCOS, CAIXA & TESOURARIA */}
      {activeTab === 'banks_treasury' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((bank) => (
            <div
              key={bank.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold bg-slate-100 text-slate-700">
                    Banco {bank.bankCode} • {bank.code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    CONCILIADO
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 mt-2.5">{bank.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Agência: <strong>{bank.branchNumber}</strong> • Conta:{' '}
                  <strong>{bank.accountNumber}</strong>
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Saldo Conciliado:</span>
                <span className="text-base font-black text-emerald-700">
                  R$ {Number(bank.currentBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
