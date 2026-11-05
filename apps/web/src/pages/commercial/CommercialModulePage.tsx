import React, { useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { SubModuleTabs } from '../../components/ui/SubModuleTabs';
import {
  commercialContractsSeed,
  commercialProducersSeed,
  commercialProposalsSeed,
  type CommercialContractItem,
  type CommercialProducer,
  type CommercialProposal,
} from '../../data/commercialData';
import { formatBRL } from '@delta-erp/shared';

interface CommercialModulePageProps {
  selectedSubmenu?: string;
  onNotify?: (msg: string) => void;
}

type CommercialTab = 'hub' | 'contracts' | 'new_contract' | 'producers' | 'proposals' | 'reports';

export const CommercialModulePage: React.FC<CommercialModulePageProps> = ({
  selectedSubmenu: _selectedSubmenu,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<CommercialTab>('hub');
  const [contracts, setContracts] = useState<CommercialContractItem[]>(commercialContractsSeed);
  const [producers] = useState<CommercialProducer[]>(commercialProducersSeed);
  const [proposals] = useState<CommercialProposal[]>(commercialProposalsSeed);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Formulário de Novo Contrato
  const [newCode, setNewCode] = useState(`CTR-2026-${String(contracts.length + 1).padStart(3, '0')}`);
  const [newEventName, setNewEventName] = useState('Festival Gastronômico & Musical de Curitiba');
  const [newEventCategory, setNewEventCategory] = useState<CommercialContractItem['eventCategory']>('FESTIVAL');
  const [selectedProducerId, setSelectedProducerId] = useState(producers[0]?.id || '');
  const [newVenueName, setNewVenueName] = useState('Parque Barigui — Pavilhão de Eventos');
  const [newVenueCity, setNewVenueCity] = useState('Curitiba / PR');
  const [newStartDate] = useState('2026-12-10');
  const [newEndDate] = useState('2026-12-12');
  const [newCapacity, setNewCapacity] = useState('15000');
  const [newAvgTicket, setNewAvgTicket] = useState('120');
  const [newFeeRatePct, setNewFeeRatePct] = useState('14');
  const [newFeeFixed, setNewFeeFixed] = useState('0');
  const [newExclusivity, setNewExclusivity] = useState<CommercialContractItem['exclusivityType']>('TOTAL_EXCLUSIVITY');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['ONLINE_ECOMMERCE', 'BOX_OFFICE_PDV']);
  const [newExecutive, setNewExecutive] = useState('Lucas Marcondes (Head Comercial Festivais)');
  const [newNotes] = useState('Contrato negociado com cota de cortesias institucionais.');

  // Cálculos do simulador em tempo real
  const simCapacity = Number(newCapacity) || 0;
  const simAvgTicket = Number(newAvgTicket) || 0;
  const simFeePct = Number(newFeeRatePct) || 0;
  const simFeeFixed = Number(newFeeFixed) || 0;
  const simGmv = simCapacity * simAvgTicket;
  const simPercentRevenue = simGmv * (simFeePct / 100);
  const simFixedRevenue = simCapacity * simFeeFixed;
  const simTotalConvenienceRevenue = simPercentRevenue + simFixedRevenue;
  const simExecutiveCommission = simTotalConvenienceRevenue * 0.05;

  // Métricas agregadas do módulo
  const totalGmvContratado = useMemo(
    () => contracts.reduce((acc, c) => acc + c.estimatedGmv, 0),
    [contracts]
  );
  const totalReceitaConveniencia = useMemo(
    () => contracts.reduce((acc, c) => acc + c.estimatedConvenienceRevenue, 0),
    [contracts]
  );
  const taxaMediaConveniencia = useMemo(() => {
    if (!contracts.length) return 0;
    return (contracts.reduce((acc, c) => acc + c.convenienceFeeRatePct, 0) / contracts.length).toFixed(1);
  }, [contracts]);
  const totalCapacidadeIngressos = useMemo(
    () => contracts.reduce((acc, c) => acc + c.expectedCapacity, 0),
    [contracts]
  );

  // Lista filtrada de contratos
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const matchSearch =
        c.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.producerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.venueCity.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === 'ALL' || c.eventCategory === categoryFilter;
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [contracts, searchQuery, categoryFilter, statusFilter]);

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) {
      alert('Informe o nome do evento.');
      return;
    }
    const producer = producers.find((p) => p.id === selectedProducerId) || producers[0];

    const newContract: CommercialContractItem = {
      id: `ctr-${Date.now()}`,
      code: newCode,
      eventName: newEventName,
      eventCategory: newEventCategory,
      producerId: producer.id,
      producerName: producer.tradeName,
      producerTaxId: producer.taxId,
      startDate: newStartDate,
      endDate: newEndDate,
      venueName: newVenueName,
      venueCity: newVenueCity,
      expectedCapacity: simCapacity,
      estimatedTicketAverage: simAvgTicket,
      estimatedGmv: simGmv,
      convenienceFeeRatePct: simFeePct,
      convenienceFeeFixedPerTicket: simFeeFixed,
      estimatedConvenienceRevenue: simTotalConvenienceRevenue,
      exclusivityType: newExclusivity,
      salesChannels: selectedChannels as any,
      status: 'APPROVED',
      accountExecutive: newExecutive,
      signedDate: new Date().toISOString().split('T')[0],
      notes: newNotes,
    };

    setContracts([newContract, ...contracts]);
    onNotify?.(`Contrato ${newContract.code} cadastrado com sucesso!`);
    setActiveTab('contracts');
  };

  const toggleChannel = (channel: string) => {
    if (selectedChannels.includes(channel)) {
      setSelectedChannels(selectedChannels.filter((c) => c !== channel));
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Oficial do Módulo Comercial */}
      <PageHeader
        title="03. Comercial — Contratos & Taxas por Evento"
        subtitle="Gestão de organizadores, contratos de exclusividade, taxa de conveniência acordada e pipeline de captação de atrações."
        badge="Autonomia Funcional"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('new_contract')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-2"
            >
              <span>+ Novo Contrato de Evento</span>
            </button>
          </div>
        }
      />

      {/* BANNER OFICIAL DE SEGURANÇA E SEGREGAÇÃO DE FUNÇÕES */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3.5 shadow-sm">
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center font-black text-sm shrink-0">
          🔒
        </div>
        <div className="space-y-1">
          <p className="font-black text-sm text-amber-950 dark:text-amber-100 flex items-center gap-2">
            Regra Arquitetural de Governança e Alçadas (ERP DiskIngressos)
          </p>
          <p className="leading-relaxed opacity-90">
            O <strong>Módulo Comercial</strong> possui autonomia plena para cadastrar produtores, negociar contratos e estipular as taxas de conveniência base por ingresso. 
            Em conformidade com as diretrizes do ERP, <strong>Spread bancário de adquirentes, Rebate ao produtor e Antecipações financeiras (Advances) são de governança e acesso restrito ao Módulo 04 Financeiro</strong>, não sendo configurados ou alterados por esta interface.
          </p>
        </div>
      </div>

      {/* Abas de Navegação Interna do Módulo Comercial */}
      <SubModuleTabs<CommercialTab>
        tabs={[
          { id: 'hub', label: 'Visão Geral & Indicadores' },
          { id: 'contracts', label: 'Contratos por Evento', badge: contracts.length },
          { id: 'new_contract', label: '+ Novo Contrato' },
          { id: 'producers', label: 'Produtores & Parceiros', badge: producers.length },
          { id: 'proposals', label: 'Pipeline de Captação', badge: proposals.length },
          { id: 'reports', label: 'Relatórios Comerciais' },
        ]}
        activeTab={activeTab}
        onSelect={setActiveTab}
      />

      {/* ABA 1: HUB / VISÃO GERAL */}
      {activeTab === 'hub' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="GMV Total Contratado"
              value={formatBRL(totalGmvContratado)}
              subtitle={`${contracts.length} eventos sob contrato ativo`}
              tone="indigo"
              badge="Volume Global"
            />
            <KpiCard
              title="Receita de Conveniência Projetada"
              value={formatBRL(totalReceitaConveniencia)}
              subtitle="Margem bruta média da plataforma"
              tone="emerald"
              badge="Receita Base"
            />
            <KpiCard
              title="Taxa Média de Conveniência"
              value={`${taxaMediaConveniencia}%`}
              subtitle="Política comercial (0% a 35%)"
              tone="cyan"
              badge="Benchmark"
            />
            <KpiCard
              title="Capacidade Total Negociada"
              value={totalCapacidadeIngressos.toLocaleString('pt-BR')}
              subtitle="Ingressos autorizados para emissão"
              tone="violet"
              badge="Lotação"
            />
          </div>

          {/* Destaques Comerciais Recentes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Contratos Ativos Recentes
                </h3>
                <button
                  onClick={() => setActiveTab('contracts')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Ver todos →
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {contracts.slice(0, 3).map((ctr) => (
                  <div key={ctr.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          {ctr.code}
                        </span>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{ctr.eventName}</p>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {ctr.producerName} • {ctr.venueCity} • {ctr.expectedCapacity.toLocaleString()} ingressos
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                        {ctr.convenienceFeeRatePct}% conveniência
                      </p>
                      <p className="text-[10px] text-emerald-600 font-bold">
                        GMV {formatBRL(ctr.estimatedGmv)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Painel Lateral: Próximas Atrações no Pipeline */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Pipeline de Captação
                </h3>
                <button
                  onClick={() => setActiveTab('proposals')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Abrir Funil →
                </button>
              </div>

              <div className="space-y-3">
                {proposals.map((prop) => (
                  <div
                    key={prop.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{prop.eventName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {prop.probabilityPct}% prob.
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{prop.prospectName} • {prop.venue}</p>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
                      <span>{prop.proposedConvenienceFeePct}% conveniência</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{formatBRL(prop.estimatedGmv)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: LISTAGEM DE CONTRATOS POR EVENTO */}
      {activeTab === 'contracts' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar por evento, produtor, código ou cidade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">Todas as Categorias</option>
                <option value="SHOW">Shows</option>
                <option value="FESTIVAL">Festivais</option>
                <option value="TEATRO">Teatro & Cultura</option>
                <option value="STANDUP">Stand-Up Comedy</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">Todos os Status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="APPROVED">Aprovados</option>
                <option value="NEGOTIATION">Em Negociação</option>
              </select>
            </div>
          </div>

          {/* Tabela de Contratos */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500">
                  <th className="py-3 px-3">Código / Evento</th>
                  <th className="py-3 px-3">Produtor / CNPJ</th>
                  <th className="py-3 px-3">Período / Local</th>
                  <th className="py-3 px-3 text-right">Lotação / Tkt Médio</th>
                  <th className="py-3 px-3 text-right">GMV Estimado</th>
                  <th className="py-3 px-3 text-right">Taxa Conveniência</th>
                  <th className="py-3 px-3">Canais Autorizados</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredContracts.map((ctr) => (
                  <tr key={ctr.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <span className="font-mono text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                          {ctr.code}
                        </span>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{ctr.eventName}</p>
                        <span className="text-[10px] font-medium text-slate-400">{ctr.eventCategory}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{ctr.producerName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{ctr.producerTaxId}</p>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <p className="text-slate-700 dark:text-slate-300">{ctr.venueName}</p>
                        <p className="text-[10px] text-slate-400">{ctr.venueCity} • {ctr.startDate}</p>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {ctr.expectedCapacity.toLocaleString()} un.
                        </p>
                        <p className="text-[10px] text-slate-400">{formatBRL(ctr.estimatedTicketAverage)}</p>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-slate-100">
                      {formatBRL(ctr.estimatedGmv)}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="space-y-0.5">
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          {ctr.convenienceFeeRatePct}%
                        </span>
                        {ctr.convenienceFeeFixedPerTicket > 0 && (
                          <p className="text-[10px] text-slate-400">
                            + {formatBRL(ctr.convenienceFeeFixedPerTicket)} fixo
                          </p>
                        )}
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                          {formatBRL(ctr.estimatedConvenienceRevenue)}
                        </p>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {ctr.salesChannels.map((ch) => (
                          <span
                            key={ch}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            {ch === 'ONLINE_ECOMMERCE' ? 'Site' : ch === 'BOX_OFFICE_PDV' ? 'PDV' : 'App'}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                          ctr.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200'
                        }`}
                      >
                        {ctr.status === 'ACTIVE' ? 'Ativo' : 'Aprovado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: NOVO CONTRATO COM SIMULADOR EM TEMPO REAL */}
      {activeTab === 'new_contract' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário Principal */}
          <form
            onSubmit={handleCreateContract}
            className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5"
          >
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Novo Contrato Comercial de Evento
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Preencha os termos negociados com o produtor para geração automática das taxas de conveniência.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Código do Contrato
                </label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Produtor / Organizador
                </label>
                <select
                  value={selectedProducerId}
                  onChange={(e) => setSelectedProducerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  {producers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.tradeName} ({p.taxId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Nome Oficial do Evento
                </label>
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Categoria do Evento
                </label>
                <select
                  value={newEventCategory}
                  onChange={(e) => setNewEventCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <option value="SHOW">Show / Turnê Musical</option>
                  <option value="FESTIVAL">Festival Multicultural</option>
                  <option value="TEATRO">Teatro & Musical</option>
                  <option value="STANDUP">Stand-Up Comedy</option>
                  <option value="ESPORTIVO">Evento Esportivo</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Exclusividade de Bilheteria
                </label>
                <select
                  value={newExclusivity}
                  onChange={(e) => setNewExclusivity(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <option value="TOTAL_EXCLUSIVITY">Exclusividade Total (Online + PDVs)</option>
                  <option value="SHARED_BOX_OFFICE">Online Exclusivo + Bilheteria Compartilhada</option>
                  <option value="ONLINE_ONLY">Apenas Venda Digital Online</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Local / Arena
                </label>
                <input
                  type="text"
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Cidade / UF
                </label>
                <input
                  type="text"
                  value={newVenueCity}
                  onChange={(e) => setNewVenueCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Capacidade Estimada (Público)
                </label>
                <input
                  type="number"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  min="10"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Preço Médio do Ingresso (R$)
                </label>
                <input
                  type="number"
                  value={newAvgTicket}
                  onChange={(e) => setNewAvgTicket(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  min="1"
                  required
                />
              </div>

              {/* TAXA DE CONVENIÊNCIA (Alçada do Comercial) */}
              <div>
                <label className="block text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase mb-1">
                  Taxa de Conveniência Negociada (%)
                </label>
                <input
                  type="number"
                  value={newFeeRatePct}
                  onChange={(e) => setNewFeeRatePct(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-black"
                  min="0"
                  max="35"
                  step="0.5"
                  required
                />
                <span className="text-[10px] text-slate-400">Limite de política comercial: até 35%</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Taxa Fixa Adicional por Ingresso (R$)
                </label>
                <input
                  type="number"
                  value={newFeeFixed}
                  onChange={(e) => setNewFeeFixed(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black"
                  min="0"
                  step="0.5"
                />
              </div>

              {/* Canais de Venda Autorizados */}
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Canais de Venda Autorizados
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'ONLINE_ECOMMERCE', label: 'E-commerce Oficial (Web)' },
                    { id: 'BOX_OFFICE_PDV', label: 'Pontos de Venda Físicos (PDVs)' },
                    { id: 'APP_MOBILE', label: 'Aplicativo Mobile DiskIngressos' },
                    { id: 'AFFILIATES', label: 'Rede de Afiliados & Comissários' },
                  ].map((ch) => {
                    const active = selectedChannels.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => toggleChannel(ch.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}
                        {ch.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Executivo de Contas Responsável
                </label>
                <input
                  type="text"
                  value={newExecutive}
                  onChange={(e) => setNewExecutive(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all"
              >
                Firmar e Ativar Contrato Comercial
              </button>
            </div>
          </form>

          {/* Simulador em Tempo Real (Painel Lateral) */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-sm space-y-5 h-fit">
            <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">
                  Simulador de Negociação
                </h4>
                <p className="text-[11px] text-slate-400">Cálculo dinâmico dos termos comerciais</p>
              </div>
              <span className="text-lg">📊</span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">GMV Total Previsto</span>
                <span className="font-black text-sm text-slate-100">{formatBRL(simGmv)}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Taxa Percentual ({simFeePct}%)</span>
                <span className="font-bold text-emerald-400">{formatBRL(simPercentRevenue)}</span>
              </div>

              {simFixedRevenue > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Taxa Fixa ({formatBRL(simFeeFixed)}/tkt)</span>
                  <span className="font-bold text-emerald-400">{formatBRL(simFixedRevenue)}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 bg-indigo-950/60 p-3 rounded-xl border border-indigo-800/40">
                <div>
                  <p className="text-[10px] uppercase font-black tracking-wider text-indigo-300">
                    Receita de Conveniência
                  </p>
                  <p className="text-base font-black text-white">{formatBRL(simTotalConvenienceRevenue)}</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200">
                  {simGmv > 0 ? ((simTotalConvenienceRevenue / simGmv) * 100).toFixed(1) : 0}% margem
                </span>
              </div>

              <div className="flex justify-between items-center py-1 text-slate-300">
                <span className="text-slate-400">Comissão do Executivo (5%)</span>
                <span className="font-bold text-indigo-300">{formatBRL(simExecutiveCommission)}</span>
              </div>
            </div>

            {/* AVISO DO FINANCEIRO */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 space-y-1">
              <p className="font-bold text-amber-300 flex items-center gap-1.5">
                <span>🛡️</span> Alçada Restrita ao Financeiro
              </p>
              <p className="leading-snug text-[10px] text-amber-200/70">
                Spread de adquirentes, devolução de Rebate e autorização de Adiantamento ao produtor são calculados no Módulo Financeiro com base no faturamento real capturado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: PRODUTORES HOMOLOGADOS */}
      {activeTab === 'producers' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Produtores & Organizadores Homologados
              </h3>
              <p className="text-xs text-slate-500">
                Empresas promotoras de eventos cadastradas no núcleo e geridas comercialmente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {producers.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400">{p.code}</span>
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">{p.tradeName}</h4>
                    <p className="text-[11px] text-slate-500">{p.legalName}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                    ★ {p.ratingScore}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <p>CNPJ: <span className="font-mono">{p.taxId}</span></p>
                  <p>Contato: {p.contactName} ({p.contactPhone})</p>
                  <p>Localização: {p.city} / {p.state}</p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{p.activeEventsCount} eventos ativos</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    GMV Histórico: {formatBRL(p.totalNegotiatedGmv)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 5: PIPELINE DE CAPTAÇÃO / PROPOSTAS */}
      {activeTab === 'proposals' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Funil de Captação de Atrações (Pipeline Comercial)
            </h3>
            <p className="text-xs text-slate-500">
              Propostas comerciais em negociação com estimativa ponderada de bilheteria e taxas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {proposals.map((prop) => (
              <div
                key={prop.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {prop.proposalNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                    {prop.stage}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">{prop.eventName}</h4>
                  <p className="text-[11px] text-slate-500">{prop.prospectName} • {prop.venue}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Público Estimado:</span>
                    <span className="font-bold">{prop.estimatedAudience.toLocaleString()} pessoas</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Taxa Proposta:</span>
                    <span className="font-bold text-emerald-600">{prop.proposedConvenienceFeePct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">GMV Estimado:</span>
                    <span className="font-black text-slate-900 dark:text-slate-100">{formatBRL(prop.estimatedGmv)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Resp: {prop.accountExecutive}</span>
                  <span className="font-bold text-indigo-600">Prob: {prop.probabilityPct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 6: RELATÓRIOS COMERCIAIS */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Relatórios e Indicadores do Comercial
            </h3>
            <p className="text-xs text-slate-500">
              Desempenho da carteira de eventos, margem média negociada e ranking de produtores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-500">Eventos por Categoria</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Festivais</span><span className="font-bold">45% do GMV</span></div>
                <div className="flex justify-between"><span>Shows e Turnês</span><span className="font-bold">35% do GMV</span></div>
                <div className="flex justify-between"><span>Teatro & Cultura</span><span className="font-bold">12% do GMV</span></div>
                <div className="flex justify-between"><span>Stand-Up</span><span className="font-bold">8% do GMV</span></div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-500">Eficiência de Captação</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Taxa de Fechamento</span><span className="font-bold text-emerald-600">74.2%</span></div>
                <div className="flex justify-between"><span>Ciclo Médio de Proposta</span><span className="font-bold">18 dias</span></div>
                <div className="flex justify-between"><span>Exclusividade Total</span><span className="font-bold text-indigo-600">85% dos contratos</span></div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-500">Segregação de Alçadas</h4>
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <p>✓ Taxas de conveniência homologadas</p>
                <p>✓ Contratos com assinatura eletrônica</p>
                <p className="text-amber-600 font-bold">🔒 Spread/Rebate restrito ao Financeiro</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
