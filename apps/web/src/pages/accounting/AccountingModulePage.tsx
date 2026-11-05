import React, { useEffect, useMemo, useState } from 'react';
import { KpiCard } from '../../components/ui/KpiCard';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { SubModuleTabs } from '../../components/ui/SubModuleTabs';
import {
  dreStatementSeed,
  structuredChartOfAccountsSeed,
  structuredJournalEntriesSeed,
  type AccountNature,
  type AccountType,
  type StructuredAccountNode,
  type StructuredJournalEntry,
} from '../../data/accountingData';

interface AccountingModulePageProps {
  selectedSubmenu: string;
  onNotify?: (msg: string) => void;
}

type AccountingViewTab =
  | 'dashboard_dre'
  | 'chart_of_accounts'
  | 'journal_entries'
  | 'general_ledger'
  | 'trial_balance';

export const AccountingModulePage: React.FC<AccountingModulePageProps> = ({
  selectedSubmenu,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<AccountingViewTab>('dashboard_dre');
  const [accounts, setAccounts] = useState<StructuredAccountNode[]>(structuredChartOfAccountsSeed);
  const [entries, setEntries] = useState<StructuredJournalEntry[]>(structuredJournalEntriesSeed);

  // Filters for Plano de Contas (modeled on AccountingChartPage.tsx)
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | AccountType>('ALL');
  const [natureFilter, setNatureFilter] = useState<'ALL' | AccountNature>('ALL');
  const [selectedLedgerAccountCode, setSelectedLedgerAccountCode] = useState<string>(
    '1.1.01.01.0001',
  );

  // New Account Modal
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [newAccCode, setNewAccCode] = useState('1.1.01.01.0003');
  const [newAccName, setNewAccName] = useState('');
  const [newAccNature, setNewAccNature] = useState<AccountNature>('ATIVO');
  const [newAccType, setNewAccType] = useState<AccountType>('ANALITICA');
  const [newAccSpedRef, setNewAccSpedRef] = useState('1.01.01.02.03');

  // New Journal Entry Modal
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [entryDocRef, setEntryDocRef] = useState('LCT-MANUAL-01');
  const [entryDesc, setEntryDesc] = useState('');
  const [debitCode, setDebitCode] = useState('1.1.01.01.0001');
  const [creditCode, setCreditCode] = useState('4.1.01.01.0001');
  const [entryAmount, setEntryAmount] = useState('15000');

  // Sync sidebar submenu selection with internal tab
  useEffect(() => {
    const sub = selectedSubmenu.toLowerCase();
    if (sub.includes('plano')) setActiveTab('chart_of_accounts');
    else if (sub.includes('lançamento') || sub.includes('lancamento') || sub.includes('diário'))
      setActiveTab('journal_entries');
    else if (sub.includes('razão') || sub.includes('razao')) setActiveTab('general_ledger');
    else if (sub.includes('balancete')) setActiveTab('trial_balance');
    else if (sub.includes('dre')) setActiveTab('dashboard_dre');
  }, [selectedSubmenu]);

  const filteredAccounts = useMemo(
    () =>
      accounts.filter((acc) => {
        const matchesSearch =
          acc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          acc.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === 'ALL' || acc.type === typeFilter;
        const matchesNature = natureFilter === 'ALL' || acc.nature === natureFilter;
        return matchesSearch && matchesType && matchesNature;
      }),
    [accounts, searchQuery, typeFilter, natureFilter],
  );

  const analyticAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'ANALITICA'),
    [accounts],
  );

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    const segments = newAccCode.split('.').length;
    const level = Math.max(1, Math.min(5, segments)) as 1 | 2 | 3 | 4 | 5;
    const created: StructuredAccountNode = {
      id: `acc-${Date.now()}`,
      code: newAccCode.trim(),
      name: newAccName.trim(),
      level,
      type: newAccType,
      nature: newAccNature,
      normalBalance:
        newAccNature === 'ATIVO' || newAccNature === 'CUSTO_DESPESA' ? 'DEVEDORA' : 'CREDORA',
      spedRefCode: newAccSpedRef.trim() || '1.01.01',
      balance: 0,
      acceptsEntries: newAccType === 'ANALITICA',
    };
    setAccounts((prev) =>
      [...prev, created].sort((a, b) => a.code.localeCompare(b.code)),
    );
    setNewAccName('');
    setIsNewAccountOpen(false);
    onNotify?.(`Conta contábil ${created.code} - ${created.name} incluída no Plano I050!`);
  };

  const handleCreateJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(entryAmount) || 0;
    if (amount <= 0 || !entryDesc.trim()) return;
    const debitAcc = accounts.find((a) => a.code === debitCode);
    const creditAcc = accounts.find((a) => a.code === creditCode);
    const created: StructuredJournalEntry = {
      id: `lct-${Date.now()}`,
      entryNumber: `LCT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toISOString().slice(0, 10),
      competence: '11/2026',
      documentRef: entryDocRef,
      originModule: '03 - Lançamento Contábil Direto',
      description: entryDesc.trim(),
      status: 'POSTED',
      lines: [
        {
          accountCode: debitCode,
          accountName: debitAcc?.name ?? 'Conta Débito',
          type: 'D',
          amount,
          costCenter: 'CC-CONTABIL',
        },
        {
          accountCode: creditCode,
          accountName: creditAcc?.name ?? 'Conta Crédito',
          type: 'C',
          amount,
          costCenter: 'CC-CONTABIL',
        },
      ],
    };
    setEntries((prev) => [created, ...prev]);
    setEntryDesc('');
    setIsNewEntryOpen(false);
    onNotify?.(
      `Partida dobrada ${created.entryNumber} contabilizada (Débito = Crédito = R$ ${amount.toLocaleString('pt-BR')})!`,
    );
  };

  const handleExportSpedOrCsv = (label: string) => {
    onNotify?.(`${label} gerado e validado com sucesso no layout SPED Contábil (ECD)!`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="03. Contabilidade Societária, Plano de Contas (5 Níveis) & DRE"
        subtitle="Escrituração por partidas dobradas [D]/[C], Plano de Contas Referencial SPED ECD (I050), Livro Diário, Livro Razão, Balancete e DRE de 10 linhas"
        badge={`Submenu: ${selectedSubmenu}`}
        actions={
          <>
            <button
              type="button"
              onClick={() => handleExportSpedOrCsv('Arquivo SPED ECD (Blocos 0, I, J)')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Exportar SPED ECD
            </button>
            <button
              type="button"
              onClick={() => setIsNewAccountOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
            >
              + Nova Conta (I050)
            </button>
            <button
              type="button"
              onClick={() => setIsNewEntryOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm"
            >
              + Lançamento Partida Dobrada
            </button>
          </>
        }
      />

      <SubModuleTabs<AccountingViewTab>
        tabs={[
          { id: 'dashboard_dre', label: 'DRE Societária (10 Linhas) & KPIs' },
          {
            id: 'chart_of_accounts',
            label: 'Plano de Contas (5 Níveis I050)',
            badge: accounts.length,
          },
          {
            id: 'journal_entries',
            label: 'Livro Diário (Partidas Dobradas)',
            badge: entries.length,
          },
          { id: 'general_ledger', label: 'Livro Razão Analítico' },
          { id: 'trial_balance', label: 'Balancete de Verificação' },
        ]}
        activeTab={activeTab}
        onSelect={setActiveTab}
      />

      {/* KPIs Contábeis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Ativo Total Consolidado"
          value="R$ 2.845.900,00"
          trend={{ value: 9.2, isPositive: true }}
          subtitle="Circulante + Não Circulante"
          badge="Balanço Patrimonial"
          tone="indigo"
        />
        <KpiCard
          title="Receita Operacional Líquida (ROL)"
          value="R$ 1.316.500,00"
          trend={{ value: 13.7, isPositive: true }}
          subtitle="88,7% sobre a Receita Bruta"
          badge="DRE Competência"
          tone="emerald"
        />
        <KpiCard
          title="EBITDA / LAJIDA Gerencial"
          value="R$ 521.600,00"
          trend={{ value: 21.1, isPositive: true }}
          subtitle="Margem EBITDA: 35,1%"
          badge="Alta Geração Caixa"
          tone="violet"
        />
        <KpiCard
          title="Lucro Líquido do Exercício"
          value="R$ 432.200,00"
          trend={{ value: 21.9, isPositive: true }}
          subtitle="Margem Líquida: 29,1%"
          badge="Auditado D=C"
          tone="amber"
        />
      </div>

      {/* TAB 1: DRE SOCIETÁRIA (10 LINHAS - MODELED ON AccountingDashboardPage.tsx) */}
      {activeTab === 'dashboard_dre' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Demonstração do Resultado do Exercício — DRE Societária (Lei 6.404/76 & CPC 26)
              </h3>
              <p className="text-xs text-slate-500">
                Apuração em tempo real por regime de competência com Análise Vertical (% AV) e Horizontal
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleExportSpedOrCsv('Demonstração DRE J150')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Exportar Bloco J150 (DRE)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                  <th className="py-2.5 pr-3">Rubrica / Linha da DRE</th>
                  <th className="py-2.5 pr-3">Base Contábil</th>
                  <th className="py-2.5 pr-3 text-right">Período Anterior</th>
                  <th className="py-2.5 pr-3 text-right">Período Atual (R$)</th>
                  <th className="py-2.5 text-right">Análise Vertical (AV %)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {dreStatementSeed.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.isTotal
                        ? 'bg-slate-50/90 font-black text-slate-900'
                        : 'hover:bg-slate-50/50 text-slate-700'
                    }
                  >
                    <td className="py-3 pr-3">{row.label}</td>
                    <td className="py-3 pr-3 font-mono text-[11px] text-slate-500">
                      {row.formulaHint}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-slate-500">
                      R$ {row.previousPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      className={`py-3 pr-3 text-right font-mono ${
                        row.isNegative
                          ? 'text-rose-600 font-bold'
                          : row.isTotal
                          ? 'text-emerald-700 font-black'
                          : 'text-slate-900'
                      }`}
                    >
                      R$ {row.currentPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right font-mono">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.isTotal
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'text-slate-600'
                        }`}
                      >
                        {row.verticalAnalysisPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PLANO DE CONTAS ESTRUTURADO 5 NÍVEIS (MODELED ON AccountingChartPage.tsx) */}
      {activeTab === 'chart_of_accounts' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Plano de Contas Estruturado em 5 Níveis (Registro I050 SPED ECD)
              </h3>
              <p className="text-xs text-slate-500">
                Contas Sintéticas (agrupadoras) e Analíticas (recebem lançamentos por partida dobrada)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar código ou nome..."
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'ALL' | AccountType)}
                className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs"
              >
                <option value="ALL">Todos os Tipos</option>
                <option value="SINTETICA">Sintéticas</option>
                <option value="ANALITICA">Analíticas</option>
              </select>
              <select
                value={natureFilter}
                onChange={(e) => setNatureFilter(e.target.value as 'ALL' | AccountNature)}
                className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs"
              >
                <option value="ALL">Todas Naturezas</option>
                <option value="ATIVO">1 - Ativo</option>
                <option value="PASSIVO">2 - Passivo</option>
                <option value="PATRIMONIO_LIQUIDO">3 - Patrimônio Líquido</option>
                <option value="RECEITA">4 - Receitas</option>
                <option value="CUSTO_DESPESA">5 - Custos e Despesas</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                  <th className="py-2.5 pr-3">Código Estruturado</th>
                  <th className="py-2.5 pr-3">Nível</th>
                  <th className="py-2.5 pr-3">Título da Conta Contábil</th>
                  <th className="py-2.5 pr-3">Classe</th>
                  <th className="py-2.5 pr-3">Ref. SPED RFB</th>
                  <th className="py-2.5 pr-3">Natureza Saldo</th>
                  <th className="py-2.5 text-right">Saldo Atual (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAccounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className={
                      acc.type === 'SINTETICA'
                        ? 'bg-slate-50/80 font-bold text-slate-900'
                        : 'hover:bg-slate-50/50 text-slate-700'
                    }
                  >
                    <td className="py-2.5 pr-3 font-mono font-bold text-indigo-700">{acc.code}</td>
                    <td className="py-2.5 pr-3">Nível {acc.level}</td>
                    <td
                      className="py-2.5 pr-3"
                      style={{ paddingLeft: `${(acc.level - 1) * 14}px` }}
                    >
                      {acc.name}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          acc.type === 'ANALITICA'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-200/70 text-slate-700 border-slate-300'
                        }`}
                      >
                        {acc.type}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-slate-500">{acc.spedRefCode}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{acc.normalBalance}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                      R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LIVRO DIÁRIO (PARTIDAS DOBRADAS [D]/[C]) */}
      {activeTab === 'journal_entries' && (
        <div className="space-y-4">
          {entries.map((entry) => {
            const totalDebit = entry.lines
              .filter((l) => l.type === 'D')
              .reduce((a, b) => a + b.amount, 0);
            const totalCredit = entry.lines
              .filter((l) => l.type === 'C')
              .reduce((a, b) => a + b.amount, 0);
            return (
              <div
                key={entry.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                        {entry.entryNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        Data: {entry.date} • Doc: {entry.documentRef}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 mt-1">{entry.description}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {entry.originModule}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      D = C = R$ {totalDebit.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  {entry.lines.map((line, idx) => (
                    <div
                      key={`${entry.id}-${idx}`}
                      className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[11px] ${
                            line.type === 'D'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {line.type}
                        </span>
                        <span className="font-mono font-bold text-slate-700">
                          {line.accountCode}
                        </span>
                        <span className="font-semibold text-slate-900">{line.accountName}</span>
                      </div>
                      <span className="font-mono font-black text-slate-900">
                        R$ {line.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
                {totalDebit === totalCredit && (
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    ✓ Partida dobrada íntegra: Total Débitos (R${' '}
                    {totalDebit.toLocaleString('pt-BR')}) = Total Créditos (R${' '}
                    {totalCredit.toLocaleString('pt-BR')})
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: LIVRO RAZÃO ANALÍTICO */}
      {activeTab === 'general_ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Livro Razão Analítico por Conta Contábil
              </h3>
              <p className="text-xs text-slate-500">
                Selecione uma conta analítica de Nível 5 para inspecionar sua ficha razão
              </p>
            </div>
            <select
              value={selectedLedgerAccountCode}
              onChange={(e) => setSelectedLedgerAccountCode(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
            >
              {analyticAccounts.map((a) => (
                <option key={a.id} value={a.code}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                  <th className="py-2.5 pr-3">Lançamento</th>
                  <th className="py-2.5 pr-3">Data</th>
                  <th className="py-2.5 pr-3">Histórico Contábil</th>
                  <th className="py-2.5 pr-3">Natureza</th>
                  <th className="py-2.5 text-right">Valor Movimento (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {entries
                  .flatMap((e) =>
                    e.lines
                      .filter((l) => l.accountCode === selectedLedgerAccountCode)
                      .map((l) => ({ entry: e, line: l })),
                  )
                  .map(({ entry, line }, i) => (
                    <tr key={`${entry.id}-${i}`} className="hover:bg-slate-50">
                      <td className="py-3 pr-3 font-mono font-bold text-indigo-700">
                        {entry.entryNumber}
                      </td>
                      <td className="py-3 pr-3 text-slate-600">{entry.date}</td>
                      <td className="py-3 pr-3 text-slate-800">{entry.description}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            line.type === 'D'
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {line.type === 'D' ? 'DÉBITO [D]' : 'CRÉDITO [C]'}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-black text-slate-900">
                        R$ {line.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BALANCETE DE VERIFICAÇÃO */}
      {activeTab === 'trial_balance' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Balancete de Verificação Mensal (Contas Analíticas Nível 5)
              </h3>
              <p className="text-xs text-slate-500">
                Conferência de saldos devedores e credores para encerramento contábil
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                  <th className="py-2.5 pr-3">Conta</th>
                  <th className="py-2.5 pr-3">Descrição</th>
                  <th className="py-2.5 pr-3">Grupo</th>
                  <th className="py-2.5 pr-3 text-right">Saldo Devedor</th>
                  <th className="py-2.5 text-right">Saldo Credor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {analyticAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-3 font-mono font-bold text-indigo-700">{acc.code}</td>
                    <td className="py-2.5 pr-3 font-semibold text-slate-900">{acc.name}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{acc.nature}</td>
                    <td className="py-2.5 pr-3 text-right font-mono text-slate-800">
                      {acc.normalBalance === 'DEVEDORA'
                        ? `R$ ${acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : 'R$ 0,00'}
                    </td>
                    <td className="py-2.5 text-right font-mono text-emerald-700 font-bold">
                      {acc.normalBalance === 'CREDORA'
                        ? `R$ ${acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : 'R$ 0,00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NOVA CONTA CONTÁBIL I050 */}
      <Modal
        isOpen={isNewAccountOpen}
        onClose={() => setIsNewAccountOpen(false)}
        title="Nova Conta Contábil (Padrão I050 SPED ECD)"
        subtitle="Cadastre uma conta sintética ou analítica na estrutura de 5 níveis"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Código Estruturado (Ex: 1.1.01.01.0003)
              </label>
              <input
                type="text"
                required
                value={newAccCode}
                onChange={(e) => setNewAccCode(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Código Referencial RFB
              </label>
              <input
                type="text"
                required
                value={newAccSpedRef}
                onChange={(e) => setNewAccSpedRef(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nome da Conta Contábil
            </label>
            <input
              type="text"
              required
              value={newAccName}
              onChange={(e) => setNewAccName(e.target.value)}
              placeholder="Ex: Banco Bradesco C/C Movimento Filial"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Grupo Patrimonial</label>
              <select
                value={newAccNature}
                onChange={(e) => setNewAccNature(e.target.value as AccountNature)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              >
                <option value="ATIVO">1 - ATIVO</option>
                <option value="PASSIVO">2 - PASSIVO</option>
                <option value="PATRIMONIO_LIQUIDO">3 - PATRIMÔNIO LÍQUIDO</option>
                <option value="RECEITA">4 - RECEITAS</option>
                <option value="CUSTO_DESPESA">5 - CUSTOS E DESPESAS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Classe da Conta</label>
              <select
                value={newAccType}
                onChange={(e) => setNewAccType(e.target.value as AccountType)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              >
                <option value="ANALITICA">ANALÍTICA (Recebe lançamentos)</option>
                <option value="SINTETICA">SINTÉTICA (Totalizadora de grupo)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsNewAccountOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
            >
              Salvar Conta no Plano
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: NOVO LANÇAMENTO PARTIDA DOBRADA */}
      <Modal
        isOpen={isNewEntryOpen}
        onClose={() => setIsNewEntryOpen(false)}
        title="Novo Lançamento no Livro Diário (Partida Dobrada)"
        subtitle="Todo lançamento exige igualdade estrita entre Conta Débito [D] e Conta Crédito [C]"
      >
        <form onSubmit={handleCreateJournalEntry} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Documento Ref.</label>
              <input
                type="text"
                required
                value={entryDocRef}
                onChange={(e) => setEntryDocRef(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Conta Analítica a DÉBITO [D]
            </label>
            <select
              value={debitCode}
              onChange={(e) => setDebitCode(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
            >
              {analyticAccounts.map((a) => (
                <option key={a.id} value={a.code}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Conta Analítica a CRÉDITO [C]
            </label>
            <select
              value={creditCode}
              onChange={(e) => setCreditCode(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
            >
              {analyticAccounts.map((a) => (
                <option key={a.id} value={a.code}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Histórico Padronizado do Lançamento
            </label>
            <input
              type="text"
              required
              value={entryDesc}
              onChange={(e) => setEntryDesc(e.target.value)}
              placeholder="Ex: Reconhecimento de receita de licença anual conforme NF-e"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsNewEntryOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
            >
              Contabilizar Partida Dobrada
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
