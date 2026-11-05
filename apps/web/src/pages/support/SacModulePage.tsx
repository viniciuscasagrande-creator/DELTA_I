import React, { useEffect, useMemo, useState } from 'react';
import { KpiCard } from '../../components/ui/KpiCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { SubModuleTabs } from '../../components/ui/SubModuleTabs';
import {
  itilKnowledgeArticlesSeed,
  itilSlaPoliciesSeed,
  sacChannelsSeed,
  type ItilKnowledgeArticle,
} from '../../data/supportData';

export interface SacTicketProp {
  id: string;
  protocol: string;
  customerName: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'TELEFONE' | 'PORTAL' | 'RECLAME_AQUI';
  category: 'ATRASO_ENTREGA' | 'ESTORNO_REEMBOLSO' | 'DEFEITO_PRODUTO' | 'DUVIDA_FISCAL';
  slaHours: number;
  elapsedHours: number;
  refundRequestedAmount: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'REFUND_APPROVED' | 'RESOLVED';
  createdAt: string;
}

interface SacModulePageProps {
  selectedSubmenu: string;
  sacTickets: SacTicketProp[];
  sacCustomerName: string;
  setSacCustomerName: (v: string) => void;
  sacChannel: SacTicketProp['channel'];
  setSacChannel: (v: SacTicketProp['channel']) => void;
  sacCategory: SacTicketProp['category'];
  setSacCategory: (v: SacTicketProp['category']) => void;
  sacSlaHours: string;
  setSacSlaHours: (v: string) => void;
  sacRefundAmount: string;
  setSacRefundAmount: (v: string) => void;
  onCreateTicket: (e: React.FormEvent) => void;
  onApproveRefund: (ticketId: string) => void;
  onNotify?: (msg: string) => void;
}

type SacViewTab =
  | 'hub'
  | 'tickets'
  | 'new_ticket'
  | 'sla_itil'
  | 'kedb'
  | 'omnichannel'
  | 'reports';

export const SacModulePage: React.FC<SacModulePageProps> = ({
  selectedSubmenu,
  sacTickets,
  sacCustomerName,
  setSacCustomerName,
  sacChannel,
  setSacChannel,
  sacCategory,
  setSacCategory,
  sacSlaHours,
  setSacSlaHours,
  sacRefundAmount,
  setSacRefundAmount,
  onCreateTicket,
  onApproveRefund,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<SacViewTab>('tickets');
  const [impact, setImpact] = useState<'ALTO' | 'MEDIO' | 'BAIXO'>('ALTO');
  const [urgency, setUrgency] = useState<'ALTA' | 'MEDIA' | 'BAIXA'>('ALTA');
  const [knowledgeArticles, setKnowledgeArticles] = useState<ItilKnowledgeArticle[]>(
    itilKnowledgeArticlesSeed,
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Sync sidebar submenu selection with internal tab
  useEffect(() => {
    const sub = selectedSubmenu.toLowerCase();
    if (sub.includes('chamado')) setActiveTab('tickets');
    else if (sub.includes('atendimento')) setActiveTab('new_ticket');
    else if (sub.includes('prazo') || sub.includes('sla')) setActiveTab('sla_itil');
    else if (sub.includes('estorno') || sub.includes('reembolso')) setActiveTab('tickets');
  }, [selectedSubmenu]);

  // Automatic ITIL Priority calculation (Impact x Urgency Matrix)
  const computeItilPriority = (
    imp: 'ALTO' | 'MEDIO' | 'BAIXO',
    urg: 'ALTA' | 'MEDIA' | 'BAIXA',
  ) => {
    if (imp === 'ALTO' && urg === 'ALTA') {
      return { code: 'P1 - Crítica', sla: '2', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if ((imp === 'ALTO' && urg === 'MEDIA') || (imp === 'MEDIO' && urg === 'ALTA')) {
      return { code: 'P2 - Alta', sla: '4', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (imp === 'BAIXO' && urg === 'BAIXA') {
      return {
        code: 'P4 - Baixa',
        sla: '24',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    return { code: 'P3 - Média', sla: '12', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  };

  const calculatedItilPriority = useMemo(
    () => computeItilPriority(impact, urgency),
    [impact, urgency],
  );

  const openTicketsCount = useMemo(
    () => sacTickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length,
    [sacTickets],
  );
  const withinSlaCount = useMemo(
    () => sacTickets.filter((t) => t.elapsedHours <= t.slaHours).length,
    [sacTickets],
  );
  const slaCompliancePct = useMemo(
    () =>
      sacTickets.length > 0 ? ((withinSlaCount / sacTickets.length) * 100).toFixed(1) : '100.0',
    [sacTickets, withinSlaCount],
  );
  const totalRefundRequested = useMemo(
    () => sacTickets.reduce((acc, t) => acc + Number(t.refundRequestedAmount), 0),
    [sacTickets],
  );
  const avgElapsedHours = useMemo(
    () =>
      sacTickets.length > 0
        ? sacTickets.reduce((acc, t) => acc + Number(t.elapsedHours || 0), 0) / sacTickets.length
        : 1.5,
    [sacTickets],
  );
  const mttrFormatted = useMemo(() => {
    const hrs = Math.floor(avgElapsedHours);
    const mins = Math.round((avgElapsedHours - hrs) * 60);
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  }, [avgElapsedHours]);
  const fcrPct = useMemo(() => {
    if (sacTickets.length === 0) return '100.0';
    const resolvedOrFast = sacTickets.filter(
      (t) => t.status === 'RESOLVED' || t.status === 'REFUND_APPROVED' || t.elapsedHours <= 2,
    ).length;
    return Math.max(80, Math.round((resolvedOrFast / sacTickets.length) * 100)).toFixed(1);
  }, [sacTickets]);

  const filteredTickets = useMemo(
    () =>
      sacTickets.filter((t) => (statusFilter === 'ALL' ? true : t.status === statusFilter)),
    [sacTickets, statusFilter],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="13. SAC, Ouvidoria & Service Desk ITIL v4"
        subtitle="Central omnichannel de atendimento ao cliente, matriz de priorização ITIL (Impacto × Urgência), controle de SLA P1–P4, base KEDB e alçada de estornos integrada ao Financeiro"
        badge={`Submenu: ${selectedSubmenu}`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setActiveTab('kedb')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Base KEDB ({knowledgeArticles.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('new_ticket')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm"
            >
              + Abrir Chamado ITIL
            </button>
          </>
        }
      />

      <SubModuleTabs<SacViewTab>
        tabs={[
          { id: 'hub', label: 'Hub de Atendimento ITIL' },
          { id: 'tickets', label: 'Fila de Chamados & Estornos', badge: sacTickets.length },
          { id: 'new_ticket', label: 'Abrir Chamado (Matriz Impacto × Urgência)' },
          { id: 'sla_itil', label: 'Políticas SLA P1–P4', badge: '4 Níveis' },
          { id: 'omnichannel', label: 'Canais Omnichannel', badge: sacChannelsSeed.length },
          { id: 'kedb', label: 'Base de Conhecimento (KEDB)', badge: knowledgeArticles.length },
          { id: 'reports', label: 'Indicadores FCR / MTTA / MTTR / CSAT' },
        ]}
        activeTab={activeTab}
        onSelect={setActiveTab}
      />

      {/* KPIs do SAC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Chamados em Atendimento"
          value={openTicketsCount}
          subtitle={`De ${sacTickets.length} protocolos totais`}
          badge="Fila Ativa"
          tone="indigo"
        />
        <KpiCard
          title="Conformidade de SLA (P1–P4)"
          value={`${slaCompliancePct}%`}
          trend={{ value: 1.4, isPositive: true }}
          subtitle={`${withinSlaCount} dentro do prazo contratual`}
          badge="Meta ITIL >= 95%"
          tone="emerald"
        />
        <KpiCard
          title="Volume em Estornos / Reembolsos"
          value={`R$ ${totalRefundRequested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Integrado à Tesouraria & Gateway"
          badge="Controle CDC Art. 49"
          tone="amber"
        />
        <KpiCard
          title="CSAT & First Contact Resolution"
          value={`4,88 ★ (${fcrPct}% FCR)`}
          trend={{ value: 3.2, isPositive: true }}
          subtitle={`SLA Cumprido: ${slaCompliancePct}% | MTTR: ${mttrFormatted}`}
          badge="RA1000"
          tone="violet"
        />
      </div>

      {/* TAB 1: HUB DE ATENDIMENTO */}
      {activeTab === 'hub' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: '1. Fila Unificada de Chamados & Estornos',
              desc: 'Triagem por protocolo, canal, barra de consumo de SLA e aprovação de reembolso com reflexo no Módulo 02 e 11.',
              metric: `${sacTickets.length} chamados registrados`,
              target: 'tickets' as SacViewTab,
            },
            {
              title: '2. Abertura com Matriz ITIL (Impacto × Urgência)',
              desc: 'Cálculo automático de prioridade P1 a P4 e definição de prazo SLA conforme severidade operacional.',
              metric: 'Priorização Automática P1–P4',
              target: 'new_ticket' as SacViewTab,
            },
            {
              title: '3. Acordos de Nível de Serviço (SLA & OLA)',
              desc: 'Regras formais de 1ª resposta, tempo máximo de solução e escalonamento hierárquico N1 → N2 → N3.',
              metric: `${slaCompliancePct}% cumprimento geral`,
              target: 'sla_itil' as SacViewTab,
            },
            {
              title: '4. Integrações Omnichannel (WhatsApp / RA / Portal)',
              desc: 'Conectores ativos com WhatsApp Oficial, E-mail Corporativo, Portal do Cliente e Reclame AQUI.',
              metric: `${sacChannelsSeed.reduce((acc, c) => acc + c.dailyVolume, 0)} atendimentos/dia`,
              target: 'omnichannel' as SacViewTab,
            },
            {
              title: '5. Base de Erros Conhecidos (KEDB)',
              desc: 'Artigos técnicos com sintoma, causa-raiz, solução de contorno (workaround) e correção definitiva.',
              metric: `${knowledgeArticles.length} playbooks publicados`,
              target: 'kedb' as SacViewTab,
            },
            {
              title: '6. Governança FCR, MTTA, MTTR & CSAT',
              desc: 'Painel executivo de eficiência de atendimento, resolução no primeiro contato e satisfação do cliente.',
              metric: `${fcrPct}% resolvidos no 1º contato`,
              target: 'reports' as SacViewTab,
            },
          ].map((item) => (
            <div
              key={item.title}
              onClick={() => setActiveTab(item.target)}
              className="cursor-pointer group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    ITIL v4 Service Desk
                  </span>
                  <span className="text-xs font-bold text-indigo-600">Abrir →</span>
                </div>
                <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-emerald-700">
                {item.metric}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: FILA DE CHAMADOS & ALÇADA DE ESTORNOS */}
      {activeTab === 'tickets' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Fila Omnichannel de Chamados, Prazos SLA e Estornos
              </h3>
              <p className="text-xs text-slate-500">
                Aprove estornos diretamente na fila para liquidar o reembolso e contabilizar a dedução
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'OPEN', 'IN_PROGRESS', 'REFUND_APPROVED', 'RESOLVED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'Todos' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                  <th className="py-2.5 pr-3">Protocolo</th>
                  <th className="py-2.5 pr-3">Cliente</th>
                  <th className="py-2.5 pr-3">Canal</th>
                  <th className="py-2.5 pr-3">Categoria</th>
                  <th className="py-2.5 pr-3">Consumo de SLA</th>
                  <th className="py-2.5 pr-3">Estorno Solicitado</th>
                  <th className="py-2.5 pr-3">Status</th>
                  <th className="py-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTickets.map((t) => {
                  const slaRatio = Math.min(100, Math.round((t.elapsedHours / Math.max(t.slaHours, 1)) * 100));
                  const isBreached = t.elapsedHours > t.slaHours;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="py-3 pr-3 font-mono font-black text-indigo-700">{t.protocol}</td>
                      <td className="py-3 pr-3 font-bold text-slate-900">{t.customerName}</td>
                      <td className="py-3 pr-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
                          {t.channel}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-slate-600">{t.category}</td>
                      <td className="py-3 pr-3 w-44">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className={isBreached ? 'font-bold text-rose-600' : 'text-slate-700'}>
                            {t.elapsedHours}h / {t.slaHours}h
                          </span>
                          <span className="text-slate-400">{slaRatio}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isBreached
                                ? 'bg-rose-600'
                                : slaRatio >= 75
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                            }`}
                            style={{ width: `${slaRatio}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 pr-3 font-bold text-slate-800">
                        {Number(t.refundRequestedAmount) > 0
                          ? `R$ ${Number(t.refundRequestedAmount).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}`
                          : '—'}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            t.status === 'RESOLVED' || t.status === 'REFUND_APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {Number(t.refundRequestedAmount) > 0 &&
                        t.status !== 'REFUND_APPROVED' &&
                        t.status !== 'RESOLVED' ? (
                          <button
                            type="button"
                            onClick={() => onApproveRefund(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-[11px] hover:bg-amber-600"
                          >
                            Aprovar Estorno
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400">Auditado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ABRIR CHAMADO COM MATRIZ ITIL IMPACTO × URGÊNCIA */}
      {activeTab === 'new_ticket' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-black text-slate-900 mb-1">
              Registrar Novo Chamado com Classificação ITIL v4
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              A combinação de Impacto × Urgência define automaticamente a prioridade e o SLA recomendado
            </p>

            <form
              onSubmit={(e) => {
                onCreateTicket(e);
                setActiveTab('tickets');
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Cliente / Razão Social
                </label>
                <input
                  type="text"
                  required
                  value={sacCustomerName}
                  onChange={(e) => setSacCustomerName(e.target.value)}
                  placeholder="Ex: Indústria Metalúrgica Horizonte Ltda"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Canal de Entrada
                  </label>
                  <select
                    value={sacChannel}
                    onChange={(e) => setSacChannel(e.target.value as SacTicketProp['channel'])}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  >
                    <option value="WHATSAPP">WHATSAPP Oficial</option>
                    <option value="PORTAL">PORTAL do Cliente</option>
                    <option value="EMAIL">EMAIL Corporativo</option>
                    <option value="TELEFONE">TELEFONE / URA</option>
                    <option value="RECLAME_AQUI">RECLAME_AQUI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoria do Chamado
                  </label>
                  <select
                    value={sacCategory}
                    onChange={(e) => setSacCategory(e.target.value as SacTicketProp['category'])}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  >
                    <option value="ESTORNO_REEMBOLSO">ESTORNO_REEMBOLSO</option>
                    <option value="DUVIDA_FISCAL">DUVIDA_FISCAL (NF-e / Boleto)</option>
                    <option value="ATRASO_ENTREGA">ATRASO_ENTREGA / SLA</option>
                    <option value="DEFEITO_PRODUTO">DEFEITO_PRODUTO / Incidente Técnico</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Impacto no Negócio (ITIL)
                  </label>
                  <select
                    value={impact}
                    onChange={(e) => {
                      const next = e.target.value as 'ALTO' | 'MEDIO' | 'BAIXO';
                      setImpact(next);
                      setSacSlaHours(computeItilPriority(next, urgency).sla);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="ALTO">ALTO (Múltiplos usuários / Financeiro crítico)</option>
                    <option value="MEDIO">MÉDIO ( Setorial / Operação parcial)</option>
                    <option value="BAIXO">BAIXO (Individual / Dúvida rotineira)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Urgência da Demanda (ITIL)
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => {
                      const next = e.target.value as 'ALTA' | 'MEDIA' | 'BAIXA';
                      setUrgency(next);
                      setSacSlaHours(computeItilPriority(impact, next).sla);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="ALTA">ALTA (Sem contorno / Crítico imediato)</option>
                    <option value="MEDIA">MÉDIA (Possui contorno temporário)</option>
                    <option value="BAIXA">BAIXA (Programável / Consultivo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prazo SLA Contratual (Horas)
                  </label>
                  <input
                    type="number"
                    required
                    value={sacSlaHours}
                    onChange={(e) => setSacSlaHours(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valor de Estorno Solicitado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={sacRefundAmount}
                    onChange={(e) => setSacRefundAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm"
              >
                Gerar Protocolo SAC & Iniciar Relógio SLA
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Resultado da Matriz ITIL (Impacto × Urgência)
            </h3>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Prioridade Calculada:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black border ${calculatedItilPriority.color}`}
                >
                  {calculatedItilPriority.code}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                SLA de Resolução Recomendado: <strong>{calculatedItilPriority.sla} horas</strong>
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-800">Regras Automáticas Acionadas:</h4>
              <ul className="space-y-1.5 text-slate-600 list-disc pl-4">
                <li>Geração de protocolo único auditável e envio automático via WhatsApp/E-mail.</li>
                <li>Vinculação com pedido/fatura e verificação automática do prazo de 7 dias (CDC).</li>
                <li>Se houver valor de estorno aprovado, dispara liquidação reversa na Tesouraria.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: POLÍTICAS SLA & ITIL P1–P4 */}
      {activeTab === 'sla_itil' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {itilSlaPoliciesSeed.map((pol) => (
            <div
              key={pol.priority}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-black border ${pol.badgeColor}`}>
                  {pol.priority}
                </span>
                <span className="text-xs font-bold text-emerald-700">
                  Cumprimento: {pol.complianceRate}%
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{pol.description}</p>
              <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">SLA 1ª Resposta</span>
                  <strong className="text-slate-900">{pol.firstResponseSla}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">SLA Resolução Final</span>
                  <strong className="text-slate-900">{pol.resolutionSla}</strong>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Escalonamento automático: <strong className="text-slate-800">{pol.escalationTarget}</strong>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: CANAIS OMNICHANNEL */}
      {activeTab === 'omnichannel' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sacChannelsSeed.map((ch) => (
            <div
              key={ch.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900">{ch.name}</h4>
                  <p className="text-xs text-slate-500">{ch.channelType}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {ch.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">Espera Média</span>
                  <strong className="text-slate-900">{ch.avgWaitTime}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">Volume/Dia</span>
                  <strong className="text-slate-900">{ch.dailyVolume} tickets</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">Nota CSAT</span>
                  <strong className="text-emerald-700">{ch.csatScore}</strong>
                </div>
              </div>
              <p className="text-[11px] text-slate-600">
                Automação ativa: <strong className="text-indigo-700">{ch.automationBot}</strong>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: BASE DE CONHECIMENTO KEDB */}
      {activeTab === 'kedb' && (
        <div className="space-y-4">
          {knowledgeArticles.map((art) => (
            <div
              key={art.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg font-mono text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {art.code}
                  </span>
                  <h4 className="text-sm font-black text-slate-900">{art.title}</h4>
                </div>
                <span className="text-xs text-slate-500">{art.category}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-bold text-slate-700 block mb-1">Sintoma & Causa-Raiz</span>
                  <p className="text-slate-600">{art.symptom}</p>
                  <p className="text-slate-500 mt-1">Causa: {art.rootCause}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80">
                  <span className="font-bold text-amber-800 block mb-1">
                    Solução de Contorno (Workaround)
                  </span>
                  <p className="text-amber-900">{art.workaround}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
                  <span className="font-bold text-emerald-800 block mb-1">
                    Solução Definitiva no ERP
                  </span>
                  <p className="text-emerald-900">{art.definitiveFix}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">{art.updatedAt}</span>
                <button
                  type="button"
                  onClick={() => {
                    setKnowledgeArticles((prev) =>
                      prev.map((k) =>
                        k.id === art.id ? { ...k, helpfulCount: k.helpfulCount + 1 } : k,
                      ),
                    );
                    onNotify?.(`Artigo ${art.code} vinculado ao atendimento com sucesso!`);
                  }}
                  className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100"
                >
                  👍 Útil no Atendimento ({art.helpfulCount})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 7: INDICADORES FCR / MTTA / MTTR / CSAT */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Métricas Globais de Eficiência ITIL Service Desk
            </h3>
            {[
              {
                metric: 'FCR (First Contact Resolution)',
                val: `${fcrPct}%`,
                target: 'Meta >= 80%',
                pct: Math.min(100, Math.round(Number(fcrPct))),
              },
              {
                metric: 'SLA (Conformidade Contratual P1–P4)',
                val: `${slaCompliancePct}%`,
                target: 'Meta >= 95%',
                pct: Math.min(100, Math.round(Number(slaCompliancePct))),
              },
              {
                metric: 'MTTR (Mean Time to Resolve)',
                val: mttrFormatted,
                target: 'Meta <= 4h',
                pct: Math.min(100, Math.max(20, Math.round((1 - avgElapsedHours / 8) * 100))),
              },
              {
                metric: 'CSAT (Customer Satisfaction Score)',
                val: '4,88 / 5,00 (97,6%)',
                target: 'Meta >= 4,70',
                pct: 97,
              },
            ].map((m) => (
              <div key={m.metric} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-800">{m.metric}</span>
                  <span className="font-black text-indigo-700">
                    {m.val} <span className="text-slate-400 font-normal">({m.target})</span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Governança de Estornos & Prevenção de Chargebacks
            </h3>
            <p className="text-xs text-slate-500">
              O protocolo de estorno aprovado no SAC dispara automaticamente a devolução PIX/Cartão antes que o cliente abra disputa bancária (chargeback).
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-700">
                  Disputas Evitadas no Mês
                </span>
                <p className="text-xl font-black text-emerald-900 mt-1">94,8%</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">Resolvido via acordo direto SAC</p>
              </div>
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200">
                <span className="text-[10px] font-bold uppercase text-indigo-700">
                  Tempo Médio de Reembolso PIX
                </span>
                <p className="text-xl font-black text-indigo-900 mt-1">18 seg</p>
                <p className="text-[11px] text-indigo-700 mt-0.5">Após aprovação de alçada</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
