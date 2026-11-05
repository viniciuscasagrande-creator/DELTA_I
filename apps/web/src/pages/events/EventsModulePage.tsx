import React, { useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { SubModuleTabs } from '../../components/ui/SubModuleTabs';
import {
  eventsCatalogSeed,
  type DiskIngressosEventRecord,
} from '../../data/eventsData';
import {
  EventApprovalStatus,
  EventPublicationStatus,
  EventSalesStatus,
  EventRealizationStatus,
  formatBRL,
  formatTicketNumber,
  type DiskIngressosTicketItem,
} from '@delta-erp/shared';

interface EventsModulePageProps {
  selectedSubmenu?: string;
  onNotify?: (msg: string) => void;
}

type EventsTab = 'events' | 'event_states' | 'tickets' | 'new_event' | 'sectors_inventory';

export const EventsModulePage: React.FC<EventsModulePageProps> = ({
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<EventsTab>('events');
  const [events, setEvents] = useState<DiskIngressosEventRecord[]>(eventsCatalogSeed);
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<string>('ALL');
  const [salesFilter, setSalesFilter] = useState<string>('ALL');

  // Formulário de Novo Evento
  const [newCode, setNewCode] = useState(`EVT-2026-${String(events.length + 1).padStart(3, '0')}`);
  const [newName, setNewName] = useState('Festival de Inverno & Jazz de Curitiba');
  const [newCategory, setNewCategory] = useState<DiskIngressosEventRecord['category']>('FESTIVAL');
  const [newProducerName, setNewProducerName] = useState('Live Nation Brasil');
  const [newVenueName, setNewVenueName] = useState('Ópera de Arame');
  const [newVenueCity, setNewVenueCity] = useState('Curitiba / PR');
  const [newStartDate, setNewStartDate] = useState('2026-12-18');
  const [newEndDate, setNewEndDate] = useState('2026-12-19');
  const [newCapacity, setNewCapacity] = useState('2100');
  const [newSectorName, setNewSectorName] = useState('Plateia Única');
  const [newFacePrice, setNewFacePrice] = useState('180');
  const [newServiceFee, setNewServiceFee] = useState('27');

  // Evento selecionado
  const activeEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || events[0],
    [events, selectedEventId]
  );

  // Todos os ingressos do catálogo
  const allTickets = useMemo(() => {
    return events.flatMap((e) => e.ticketsSample);
  }, [events]);

  // Métricas agregadas
  const totalEventos = events.length;
  const totalIngressosVendidos = useMemo(
    () => events.reduce((acc, e) => acc + e.totalSold, 0),
    [events]
  );
  const faturamentoTotalFace = useMemo(
    () => events.reduce((acc, e) => acc + e.grossSales, 0),
    [events]
  );
  const lotacaoGeralPct = useMemo(() => {
    const totalCap = events.reduce((acc, e) => acc + e.capacity, 0);
    return totalCap > 0 ? ((totalIngressosVendidos / totalCap) * 100).toFixed(1) : '0';
  }, [events, totalIngressosVendidos]);

  // Lista filtrada
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchSearch =
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.producerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchApproval = approvalFilter === 'ALL' || e.approvalStatus === approvalFilter;
      const matchSales = salesFilter === 'ALL' || e.salesStatus === salesFilter;
      return matchSearch && matchApproval && matchSales;
    });
  }, [events, searchQuery, approvalFilter, salesFilter]);

  // Transição de Dimensões de Estado com Validação
  const handleUpdateEventDimension = (
    eventId: string,
    dimension: 'approvalStatus' | 'publicationStatus' | 'salesStatus' | 'realizationStatus',
    newValue: any
  ) => {
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventId) return evt;

        // Regra Inegociável: Vendas só abrem se o evento estiver APROVADO
        if (dimension === 'salesStatus' && newValue === EventSalesStatus.OPEN) {
          if (evt.approvalStatus !== EventApprovalStatus.APPROVED) {
            alert('BLOQUEIO DE GOVERNANÇA: Vendas não podem ser abertas antes da Aprovação/Homologação pela curadoria.');
            return evt;
          }
        }

        const updated = { ...evt, [dimension]: newValue };

        // Se o evento for cancelado, fecha vendas automaticamente
        if (dimension === 'realizationStatus' && newValue === EventRealizationStatus.CANCELLED) {
          updated.salesStatus = EventSalesStatus.CLOSED;
        }

        return updated;
      })
    );
    onNotify?.(`Dimensão ${dimension} atualizada para ${newValue}`);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const capacityNum = Number(newCapacity) || 1000;
    const facePriceNum = Number(newFacePrice) || 100;
    const feeNum = Number(newServiceFee) || 15;

    const newEvent: DiskIngressosEventRecord = {
      id: `evt-${Date.now()}`,
      code: newCode,
      name: newName,
      producerId: 'prod-01',
      producerName: newProducerName,
      category: newCategory,
      venueName: newVenueName,
      venueCity: newVenueCity,
      startDate: newStartDate,
      endDate: newEndDate,
      capacity: capacityNum,
      totalSold: 0,
      grossSales: 0,
      convenienceRevenue: 0,
      // Inicia em rascunho, não publicado e vendas fechadas
      approvalStatus: EventApprovalStatus.DRAFT,
      publicationStatus: EventPublicationStatus.UNPUBLISHED,
      salesStatus: EventSalesStatus.NOT_OPEN,
      realizationStatus: EventRealizationStatus.SCHEDULED,
      sectors: [
        {
          id: `sec-${Date.now()}`,
          name: newSectorName,
          capacity: capacityNum,
          soldCount: 0,
          facePrice: facePriceNum,
          convenienceFee: feeNum,
          activeBatchName: 'Lote 1 (Inicial)',
        },
      ],
      ticketsSample: [],
    };

    setEvents([newEvent, ...events]);
    setSelectedEventId(newEvent.id);
    onNotify?.(`Evento ${newEvent.code} cadastrado em rascunho com sucesso!`);
    setActiveTab('events');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Oficial do Módulo Eventos & Ingressos */}
      <PageHeader
        title="01 & 02. Eventos e Ingressos (DiskIngressos)"
        subtitle="Grade de espetáculos, 4 dimensões de estado (Aprovação, Publicação, Vendas e Realização) e emissão com 8 dígitos numéricos."
        badge="Catálogo & Bilheteria"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('new_event')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-2"
            >
              <span>+ Cadastrar Novo Evento</span>
            </button>
          </div>
        }
      />

      {/* BANNER DE GOVERNANÇA: AS 4 DIMENSÕES DE ESTADO E INGRESSOS DE 8 DÍGITOS */}
      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4.5 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-3.5 shadow-sm">
        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-black text-sm shrink-0">
          🎟️
        </div>
        <div className="space-y-1">
          <p className="font-black text-sm text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
            Regra Arquitetural de Eventos e Ingressos (ERP DiskIngressos)
          </p>
          <p className="leading-relaxed opacity-90">
            <strong>1. Quatro Dimensões Independentes:</strong> O evento não possui um status linear. Aprovação, Publicação na vitrine, Abertura de Vendas e Realização operam como eixos separados. Vendas exigem evento aprovado.<br />
            <strong>2. Padrão do Ingresso (8 Dígitos Numéricos):</strong> O número do ingresso é estritamente formatado com 8 dígitos (ex: <code className="font-mono font-bold bg-indigo-100 dark:bg-indigo-950 px-1 py-0.5 rounded">00000001</code>), desacoplado do hash criptográfico (HMAC-SHA256) validado na catraca.
          </p>
        </div>
      </div>

      {/* Abas do Módulo */}
      <SubModuleTabs<EventsTab>
        tabs={[
          { id: 'events', label: 'Catálogo de Eventos', badge: events.length },
          { id: 'event_states', label: 'Matriz das 4 Dimensões' },
          { id: 'tickets', label: 'Ingressos Emitidos (8 Dígitos)', badge: allTickets.length },
          { id: 'sectors_inventory', label: 'Setores & Inventário' },
          { id: 'new_event', label: '+ Novo Evento' },
        ]}
        activeTab={activeTab}
        onSelect={setActiveTab}
      />

      {/* ABA 1: CATÁLOGO DE EVENTOS */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Eventos Cadastrados"
              value={totalEventos}
              subtitle="Na grade oficial DiskIngressos"
              tone="indigo"
              badge="Atrações"
            />
            <KpiCard
              title="Ingressos Emitidos"
              value={totalIngressosVendidos.toLocaleString('pt-BR')}
              subtitle="Cota total consumida"
              tone="emerald"
              badge="Bilheteria"
            />
            <KpiCard
              title="Faturamento Bruto (Face)"
              value={formatBRL(faturamentoTotalFace)}
              subtitle="Valores em custódia dos produtores"
              tone="cyan"
              badge="Passivo"
            />
            <KpiCard
              title="Ocupação Média das Arenas"
              value={`${lotacaoGeralPct}%`}
              subtitle="Capacidade física preenchida"
              tone="violet"
              badge="Lotação"
            />
          </div>

          {/* Filtros e Busca */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Buscar por atração, produtor, arena ou código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={approvalFilter}
                  onChange={(e) => setApprovalFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <option value="ALL">Aprovação: Todas</option>
                  <option value="APPROVED">Aprovados</option>
                  <option value="UNDER_REVIEW">Em Análise</option>
                  <option value="DRAFT">Rascunho</option>
                </select>

                <select
                  value={salesFilter}
                  onChange={(e) => setSalesFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <option value="ALL">Vendas: Todas</option>
                  <option value="OPEN">Vendas Abertas</option>
                  <option value="NOT_OPEN">Vendas Não Abertas</option>
                  <option value="SUSPENDED">Vendas Suspensas</option>
                </select>
              </div>
            </div>

            {/* Tabela de Eventos com as 4 Dimensões Visíveis */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500">
                    <th className="py-3 px-3">Código / Evento</th>
                    <th className="py-3 px-3">Produtor / Local</th>
                    <th className="py-3 px-3 text-right">Lotação / Vendas</th>
                    <th className="py-3 px-3 text-center">1. Aprovação</th>
                    <th className="py-3 px-3 text-center">2. Vitrine</th>
                    <th className="py-3 px-3 text-center">3. Vendas</th>
                    <th className="py-3 px-3 text-center">4. Realização</th>
                    <th className="py-3 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                            {evt.code}
                          </span>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{evt.name}</p>
                          <span className="text-[10px] font-medium text-slate-400">{evt.category}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{evt.producerName}</p>
                          <p className="text-[10px] text-slate-400">{evt.venueName} • {evt.venueCity}</p>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            {evt.totalSold.toLocaleString()} / {evt.capacity.toLocaleString()}
                          </p>
                          <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden ml-auto">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(100, (evt.totalSold / evt.capacity) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Dimensão 1: Aprovação */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${
                            evt.approvalStatus === EventApprovalStatus.APPROVED
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200'
                          }`}
                        >
                          {evt.approvalStatus === EventApprovalStatus.APPROVED ? 'Aprovado' : 'Em Análise'}
                        </span>
                      </td>

                      {/* Dimensão 2: Publicação */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            evt.publicationStatus === EventPublicationStatus.PUBLISHED
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                          }`}
                        >
                          {evt.publicationStatus === EventPublicationStatus.PUBLISHED ? 'Publicado' : 'Oculto'}
                        </span>
                      </td>

                      {/* Dimensão 3: Vendas */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black rounded-md ${
                            evt.salesStatus === EventSalesStatus.OPEN
                              ? 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {evt.salesStatus === EventSalesStatus.OPEN ? 'Abertas' : 'Fechadas'}
                        </span>
                      </td>

                      {/* Dimensão 4: Realização */}
                      <td className="py-3 px-3 text-center">
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          {evt.startDate}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedEventId(evt.id);
                            setActiveTab('event_states');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                        >
                          Gerenciar →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: MATRIZ DE GOVERNANÇA DAS 4 DIMENSÕES */}
      {activeTab === 'event_states' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="font-mono text-[10px] font-black text-indigo-600">{activeEvent.code}</span>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                {activeEvent.name}
              </h3>
              <p className="text-xs text-slate-500">
                {activeEvent.producerName} • {activeEvent.venueName} ({activeEvent.venueCity})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500">Selecionar Evento:</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.code} — {e.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* As 4 Dimensões em Painéis Independentes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Dimensão 1: Aprovação */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-500">1. Aprovação</span>
                <span className="text-base">📋</span>
              </div>
              <p className="text-[11px] text-slate-500">Homologação legal e curadoria da mesa de operações.</p>
              <select
                value={activeEvent.approvalStatus}
                onChange={(e) =>
                  handleUpdateEventDimension(activeEvent.id, 'approvalStatus', e.target.value as any)
                }
                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              >
                <option value={EventApprovalStatus.DRAFT}>Rascunho</option>
                <option value={EventApprovalStatus.UNDER_REVIEW}>Em Análise</option>
                <option value={EventApprovalStatus.PENDING_CORRECTION}>Pendente Correção</option>
                <option value={EventApprovalStatus.APPROVED}>Aprovado / Homologado</option>
                <option value={EventApprovalStatus.REJECTED}>Rejeitado</option>
              </select>
            </div>

            {/* Dimensão 2: Publicação */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-500">2. Vitrine Digital</span>
                <span className="text-base">🌐</span>
              </div>
              <p className="text-[11px] text-slate-500">Visibilidade pública no site e app DiskIngressos.</p>
              <select
                value={activeEvent.publicationStatus}
                onChange={(e) =>
                  handleUpdateEventDimension(activeEvent.id, 'publicationStatus', e.target.value as any)
                }
                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              >
                <option value={EventPublicationStatus.UNPUBLISHED}>Não Publicado (Oculto)</option>
                <option value={EventPublicationStatus.PUBLISHED}>Publicado na Vitrine</option>
                <option value={EventPublicationStatus.WITHDRAWN}>Retirado / Despublicado</option>
              </select>
            </div>

            {/* Dimensão 3: Vendas */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-500">3. Abertura de Vendas</span>
                <span className="text-base">💳</span>
              </div>
              <p className="text-[11px] text-slate-500">Liberação do checkout e bilheterias para compra.</p>
              <select
                value={activeEvent.salesStatus}
                onChange={(e) =>
                  handleUpdateEventDimension(activeEvent.id, 'salesStatus', e.target.value as any)
                }
                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              >
                <option value={EventSalesStatus.NOT_OPEN}>Não Abertas</option>
                <option value={EventSalesStatus.OPEN}>Vendas Abertas</option>
                <option value={EventSalesStatus.SUSPENDED}>Vendas Suspensas</option>
                <option value={EventSalesStatus.CLOSED}>Vendas Encerradas</option>
              </select>
            </div>

            {/* Dimensão 4: Realização */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-500">4. Realização Física</span>
                <span className="text-base">🏟️</span>
              </div>
              <p className="text-[11px] text-slate-500">Ocorrência presencial do espetáculo na arena.</p>
              <select
                value={activeEvent.realizationStatus}
                onChange={(e) =>
                  handleUpdateEventDimension(activeEvent.id, 'realizationStatus', e.target.value as any)
                }
                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              >
                <option value={EventRealizationStatus.SCHEDULED}>Previsto / Agendado</option>
                <option value={EventRealizationStatus.COMPLETED}>Realizado</option>
                <option value={EventRealizationStatus.POSTPONED}>Adiado</option>
                <option value={EventRealizationStatus.CANCELLED}>Cancelado</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: INGRESSOS EMITIDOS (PADRÃO 8 DÍGITOS NUMÉRICOS) */}
      {activeTab === 'tickets' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Ingressos Emitidos (Padrão 8 Dígitos Numéricos)
              </h3>
              <p className="text-xs text-slate-500">
                Número de apresentação sequencial de 8 dígitos numéricos (<code className="font-mono font-bold text-indigo-600">00000001</code>) desacoplado do hash criptográfico para QR Code.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {allTickets.length} ingressos cadastrados
            </span>
          </div>

          {/* Cards de Ingressos Estilizados */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTickets.map((tkt: DiskIngressosTicketItem) => (
              <div
                key={tkt.id}
                className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-800/80 p-5 shadow-sm space-y-3"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none" />

                <div className="flex items-start justify-between">
                  <span className="font-mono text-lg font-black tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60">
                    Nº {tkt.ticketNumber}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-black rounded uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                    {tkt.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">{tkt.eventName}</h4>
                  <p className="text-[11px] text-slate-500">{tkt.sectorName} • {tkt.batchName}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Titular:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{tkt.buyerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CPF:</span>
                    <span className="font-mono">{tkt.buyerTaxId}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-slate-400">Valor Pago:</span>
                    <span className="font-black text-emerald-600">{formatBRL(tkt.totalPaid)}</span>
                  </div>
                </div>

                {/* Hash Criptográfico para Leitura de Portaria */}
                <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black uppercase text-slate-400">Credencial Segura (QR Code Catraca)</p>
                  <p className="font-mono text-[9px] text-slate-500 break-all bg-slate-50 dark:bg-slate-900 p-1 rounded">
                    {tkt.validationHash.slice(0, 32)}...
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 4: SETORES E INVENTÁRIO */}
      {activeTab === 'sectors_inventory' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Ocupação por Setor e Lote ({activeEvent.name})
              </h3>
              <p className="text-xs text-slate-500">Capacidade física autorizada e ingressos vendidos por setor.</p>
            </div>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} — {e.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeEvent.sectors.map((sec) => (
              <div
                key={sec.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">{sec.name}</h4>
                    <span className="text-[10px] text-indigo-600 font-bold">{sec.activeBatchName}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                    {formatBRL(sec.facePrice)}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Lotação:</span>
                    <span className="font-bold">
                      {sec.soldCount.toLocaleString()} / {sec.capacity.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${Math.min(100, (sec.soldCount / sec.capacity) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/50 flex justify-between">
                  <span>Taxa de Serviço: {formatBRL(sec.convenienceFee)}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {((sec.soldCount / sec.capacity) * 100).toFixed(0)}% ocupado
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 5: CADASTRO DE NOVO EVENTO */}
      {activeTab === 'new_event' && (
        <form
          onSubmit={handleCreateEvent}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5"
        >
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Cadastrar Novo Evento / Atração
            </h3>
            <p className="text-xs text-slate-500">
              O evento será criado inicialmente no estado <strong>Rascunho</strong>, com publicação oculta e vendas fechadas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Código do Evento
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
                Produtor Homologado
              </label>
              <input
                type="text"
                value={newProducerName}
                onChange={(e) => setNewProducerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Nome Oficial da Atração
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Categoria
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
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
                Local / Arena
              </label>
              <input
                type="text"
                value={newVenueName}
                onChange={(e) => setNewVenueName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Capacidade Máxima do Alvará
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
                Setor Inicial
              </label>
              <input
                type="text"
                value={newSectorName}
                onChange={(e) => setNewSectorName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Preço de Face (R$)
              </label>
              <input
                type="number"
                value={newFacePrice}
                onChange={(e) => setNewFacePrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Taxa de Conveniência (R$)
              </label>
              <input
                type="number"
                value={newServiceFee}
                onChange={(e) => setNewServiceFee(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                min="0"
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all"
            >
              Criar Evento em Rascunho
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
