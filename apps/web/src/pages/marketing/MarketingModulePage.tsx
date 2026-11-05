import React, { useEffect, useMemo, useState } from 'react';
import { KpiCard } from '../../components/ui/KpiCard';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { SubModuleTabs } from '../../components/ui/SubModuleTabs';
import {
  abandonedCartsSeed,
  automationRulesSeed,
  channelPerformanceSeed,
  couponsSeed,
  marketingFunnelSeed,
  pixelTrackersSeed,
  utmLinksSeed,
  type AbandonedCartItem,
  type AutomationRuleItem,
  type CouponSeedItem,
  type PixelTrackerItem,
  type UtmTrackableUrl,
} from '../../data/marketingData';

export interface MarketingCampaignProp {
  id: string;
  name: string;
  channel: 'META_ADS' | 'GOOGLE_ADS' | 'TIKTOK_ADS' | 'EMAIL_CRM' | 'INFLUENCERS';
  couponCode: string;
  discountPercent: number;
  budgetAmount: string;
  spentAmount: string;
  AttributedRevenue: string;
  conversions: number;
  status: 'ACTIVE' | 'PAUSED';
}

export interface MediaIntegrationProp {
  id: string;
  platform: string;
  accountId: string;
  pixelOrTagId: string;
  status: 'CONNECTED' | 'SYNCING';
  lastSyncAt: string;
  roas: string;
}

interface MarketingModulePageProps {
  selectedSubmenu: string;
  marketingCampaigns: MarketingCampaignProp[];
  mediaIntegrations: MediaIntegrationProp[];
  mktCampaignName: string;
  setMktCampaignName: (v: string) => void;
  mktChannel: MarketingCampaignProp['channel'];
  setMktChannel: (v: MarketingCampaignProp['channel']) => void;
  mktCouponCode: string;
  setMktCouponCode: (v: string) => void;
  mktDiscountPercent: string;
  setMktDiscountPercent: (v: string) => void;
  mktBudgetAmount: string;
  setMktBudgetAmount: (v: string) => void;
  onCreateCampaign: (e: React.FormEvent) => void;
  onRecordConversion: (campaignId: string) => void;
  onSyncIntegration: (integrationId: string) => void;
  onNotify?: (msg: string) => void;
}

type MarketingViewTab =
  | 'hub'
  | 'dashboard'
  | 'campaigns'
  | 'coupons'
  | 'utm'
  | 'pixels'
  | 'automations'
  | 'remarketing'
  | 'integrations';

export const MarketingModulePage: React.FC<MarketingModulePageProps> = ({
  selectedSubmenu,
  marketingCampaigns,
  mediaIntegrations,
  mktCampaignName,
  setMktCampaignName,
  mktChannel,
  setMktChannel,
  mktCouponCode,
  setMktCouponCode,
  mktDiscountPercent,
  setMktDiscountPercent,
  mktBudgetAmount,
  setMktBudgetAmount,
  onCreateCampaign,
  onRecordConversion,
  onSyncIntegration,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<MarketingViewTab>('dashboard');
  const [coupons, setCoupons] = useState<CouponSeedItem[]>(couponsSeed);
  const [utmLinks, setUtmLinks] = useState<UtmTrackableUrl[]>(utmLinksSeed);
  const [selectedUtmId, setSelectedUtmId] = useState<string>(utmLinksSeed[0].id);
  const [utmSourceFilter, setUtmSourceFilter] = useState<string>('ALL');
  const [pixels, setPixels] = useState<PixelTrackerItem[]>(pixelTrackersSeed);
  const [automations, setAutomations] = useState<AutomationRuleItem[]>(automationRulesSeed);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCartItem[]>(abandonedCartsSeed);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [revealedTokenId, setRevealedTokenId] = useState<string | null>(null);

  // Modals
  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
  const [isNewCouponOpen, setIsNewCouponOpen] = useState(false);
  const [isNewUtmOpen, setIsNewUtmOpen] = useState(false);
  const [qrModalUrl, setQrModalUrl] = useState<UtmTrackableUrl | null>(null);

  // New Coupon state
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState('15');
  const [newCouponMaxUses, setNewCouponMaxUses] = useState('250');
  const [newCouponValidUntil, setNewCouponValidUntil] = useState('2026-12-31');

  // New UTM state
  const [newUtmTitle, setNewUtmTitle] = useState('');
  const [newUtmSource, setNewUtmSource] = useState('instagram');
  const [newUtmMedium, setNewUtmMedium] = useState('cpc');
  const [newUtmCampaign, setNewUtmCampaign] = useState('lancamento_erp');

  // Sync sidebar submenu selection with internal tab
  useEffect(() => {
    const sub = selectedSubmenu.toLowerCase();
    if (sub.includes('campanha')) setActiveTab('campaigns');
    else if (sub.includes('cupom') || sub.includes('cupons')) setActiveTab('coupons');
    else if (sub.includes('convers')) setActiveTab('utm');
    else if (sub.includes('integra') || sub.includes('mídia') || sub.includes('midia')) setActiveTab('pixels');
  }, [selectedSubmenu]);

  const totalRevenue = useMemo(
    () => marketingCampaigns.reduce((acc, c) => acc + Number(c.AttributedRevenue), 0),
    [marketingCampaigns],
  );
  const totalSpent = useMemo(
    () => marketingCampaigns.reduce((acc, c) => acc + Number(c.spentAmount), 0),
    [marketingCampaigns],
  );
  const totalConversions = useMemo(
    () => marketingCampaigns.reduce((acc, c) => acc + c.conversions, 0),
    [marketingCampaigns],
  );
  const avgRoas = totalSpent > 0 ? (totalRevenue / totalSpent).toFixed(2) : '0.00';

  const filteredUtmLinks = useMemo(
    () =>
      utmLinks.filter((u) => (utmSourceFilter === 'ALL' ? true : u.utmSource === utmSourceFilter)),
    [utmLinks, utmSourceFilter],
  );

  const selectedUtm = useMemo(
    () => utmLinks.find((u) => u.id === selectedUtmId) ?? utmLinks[0],
    [utmLinks, selectedUtmId],
  );

  const handleCopyText = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => undefined);
    }
    setCopiedCode(text);
    onNotify?.(`${label} copiado para a área de transferência!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    const created: CouponSeedItem = {
      id: `cup-${Date.now()}`,
      code: newCouponCode.trim().toUpperCase(),
      discountType: newCouponType,
      discountValue: Number(newCouponValue) || 10,
      maxUses: Number(newCouponMaxUses) || 100,
      currentUses: 0,
      validUntil: newCouponValidUntil,
      status: 'active',
      revenueGenerated: 0,
      campaignName: 'Campanha Promocional Direta',
    };
    setCoupons((prev) => [created, ...prev]);
    setNewCouponCode('');
    setIsNewCouponOpen(false);
    onNotify?.(`Cupom promocional ${created.code} criado e ativado no Checkout!`);
  };

  const handleCreateUtmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUtmTitle.trim()) return;
    const slug = newUtmCampaign.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const created: UtmTrackableUrl = {
      id: `utm-${Date.now()}`,
      title: newUtmTitle.trim(),
      destinationName: 'Landing Page Comercial DELTA ERP',
      url: `https://delta1-zeta.vercel.app/?utm_source=${newUtmSource}&utm_medium=${newUtmMedium}&utm_campaign=${slug}`,
      shortUrl: `delta.erp/u/${newUtmSource.slice(0, 2)}-${Math.floor(100 + Math.random() * 900)}`,
      utmSource: newUtmSource,
      utmMedium: newUtmMedium,
      utmCampaign: slug,
      visits: 1,
      productViews: 1,
      addToCart: 0,
      checkouts: 0,
      purchases: 0,
      revenue: 0,
      averageTicket: 0,
      conversionRate: 0,
      lastConversionAt: 'Agora mesmo',
      status: 'active',
    };
    setUtmLinks((prev) => [created, ...prev]);
    setSelectedUtmId(created.id);
    setNewUtmTitle('');
    setIsNewUtmOpen(false);
    onNotify?.(`URL rastreável UTM gerada com sucesso: ${created.shortUrl}`);
  };

  const handleTriggerCartRecovery = (cartId: string) => {
    setAbandonedCarts((prev) =>
      prev.map((c) => (c.id === cartId ? { ...c, recoveryStage: 'recovered' } : c)),
    );
    onNotify?.('Disparo de recuperação WhatsApp + Cupom enviado ao cliente com sucesso!');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="14. Marketing, Growth & Performance Digital"
        subtitle="Gestão integrada de campanhas, funil de conversão em 5 etapas, cupons, central UTM, Multi-Pixel CAPI e automação de recuperação"
        badge={`Submenu: ${selectedSubmenu}`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setIsNewCouponOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              + Novo Cupom
            </button>
            <button
              type="button"
              onClick={() => setIsNewUtmOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              + Gerar Link UTM
            </button>
            <button
              type="button"
              onClick={() => setIsNewCampaignOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm transition-colors"
            >
              + Nova Campanha
            </button>
          </>
        }
      />

      {/* Sub-navigation bar modeled on safesaff2 MarketingHub */}
      <SubModuleTabs<MarketingViewTab>
        tabs={[
          { id: 'hub', label: 'Hub Marketing (11 Módulos)' },
          { id: 'dashboard', label: 'Dashboard & Funil 5 Etapas' },
          { id: 'campaigns', label: 'Campanhas', badge: marketingCampaigns.length },
          { id: 'coupons', label: 'Cupons & Promoções', badge: coupons.length },
          { id: 'utm', label: 'Central UTM & QR Codes', badge: utmLinks.length },
          { id: 'pixels', label: 'Multi-Pixel & CAPI', badge: pixels.length },
          { id: 'automations', label: 'Automações WhatsApp/E-mail', badge: automations.length },
          {
            id: 'remarketing',
            label: 'Remarketing & Carrinhos',
            badge: abandonedCarts.filter((c) => c.recoveryStage !== 'recovered').length,
          },
          { id: 'integrations', label: 'Conectores de Mídia', badge: mediaIntegrations.length },
        ]}
        activeTab={activeTab}
        onSelect={setActiveTab}
      />

      {/* KPIs Globais do Módulo 14 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Receita Atribuída (Mídia + Cupom)"
          value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          trend={{ value: 18.4, isPositive: true }}
          subtitle="vs. mês anterior"
          badge="ROAS Auditado"
          tone="emerald"
        />
        <KpiCard
          title="Conversões Confirmadas"
          value={totalConversions.toLocaleString('pt-BR')}
          trend={{ value: 12.1, isPositive: true }}
          subtitle="Pedidos pagos via UTM/Cupom"
          badge="Checkout ERP"
          tone="indigo"
        />
        <KpiCard
          title="Taxa de Conversão do Funil"
          value="3.82%"
          trend={{ value: 0.6, isPositive: true }}
          subtitle="120.450 visitas → 2.847 vendas"
          badge="Acima da meta"
          tone="violet"
        />
        <KpiCard
          title="ROI / ROAS Médio Consolidado"
          value={`${avgRoas}x (342% ROI)`}
          trend={{ value: 24.0, isPositive: true }}
          subtitle={`Investimento: R$ ${totalSpent.toLocaleString('pt-BR')}`}
          badge="Alta Eficiência"
          tone="amber"
        />
      </div>

      {/* TAB 1: HUB MARKETING (11 MÓDULOS DE CRESCIMENTO) */}
      {activeTab === 'hub' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: '1. Dashboard de Performance & Funil',
                desc: 'Métricas de conversão em 5 etapas, receita atribuída e ROI por canal de aquisição.',
                metrics: ['R$ 854.100 atribuídos', '342% ROI médio'],
                target: 'dashboard' as MarketingViewTab,
                badge: 'Tempo Real',
              },
              {
                title: '2. Gestão de Campanhas Multicanal',
                desc: 'Controle de orçamento, gasto diário, CPA, ROAS e atribuição direta no faturamento.',
                metrics: [`${marketingCampaigns.length} campanhas ativas`, `ROAS ${avgRoas}x`],
                target: 'campaigns' as MarketingViewTab,
                badge: 'Meta / Google / TikTok',
              },
              {
                title: '3. Motor de Cupons & Promoções',
                desc: 'Cupons percentuais ou valor fixo, limite de usos, validade e rastreio de receita no checkout.',
                metrics: [`${coupons.length} cupons configurados`, 'R$ 422.300 com cupom'],
                target: 'coupons' as MarketingViewTab,
                badge: 'Checkout Nativo',
              },
              {
                title: '4. Central UTM, Links Curtos & QR Codes',
                desc: 'Construtor de URLs rastreáveis por fonte/mídia/campanha com funil individual e QR Code.',
                metrics: [`${utmLinks.length} URLs monitoradas`, '41.870 cliques rastreados'],
                target: 'utm' as MarketingViewTab,
                badge: 'Atribuição Full',
              },
              {
                title: '5. Multi-Pixel & Conversion API (CAPI)',
                desc: 'Disparo server-side resiliente a bloqueadores para Meta Pixel, GA4, GTM e TikTok.',
                metrics: ['Nota Match 9.4/10', '992 eventos/24h'],
                target: 'pixels' as MarketingViewTab,
                badge: 'Server-Side CAPI',
              },
              {
                title: '6. Automações WhatsApp, E-mail & SMS',
                desc: 'Gatilhos automáticos por evento do ERP: PIX pendente, boas-vindas, NF-e e virada de lote.',
                metrics: ['4 fluxos ativos 24/7', 'R$ 247.700 recuperados'],
                target: 'automations' as MarketingViewTab,
                badge: 'Outbox Event-Driven',
              },
              {
                title: '7. Remarketing & Carrinhos Abandonados',
                desc: 'Fila ao vivo de checkouts e propostas não concluídas com disparo em 1 clique.',
                metrics: ['28,4% taxa de recuperação', 'R$ 10.290 em aberto hoje'],
                target: 'remarketing' as MarketingViewTab,
                badge: 'Alta Conversão',
              },
              {
                title: '8. Conectores de Mídia & Sincronização',
                desc: 'Sincronização bidirecional de custos de anúncios para apuração automática de CAC e DRE.',
                metrics: [`${mediaIntegrations.length} contas conectadas`, 'Sync a cada 15 min'],
                target: 'integrations' as MarketingViewTab,
                badge: 'API Oficial',
              },
              {
                title: '9. Conformidade LGPD & Opt-In',
                desc: 'Gestão de consentimento de comunicação, descadastro automático e trilha de auditoria.',
                metrics: ['99,8% base opt-in válida', 'Zero incidentes LGPD'],
                target: 'automations' as MarketingViewTab,
                badge: 'Compliance',
              },
            ].map((card) => (
              <div
                key={card.title}
                onClick={() => setActiveTab(card.target)}
                className="cursor-pointer group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {card.badge}
                    </span>
                    <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                      Acessar →
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{card.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                  <span>{card.metrics[0]}</span>
                  <span className="text-emerald-700 font-bold">{card.metrics[1]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: DASHBOARD & FUNIL DE CONVERSÃO DE 5 ETAPAS */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Funil de Conversão Full-Funnel (5 Etapas)
                </h3>
                <p className="text-xs text-slate-500">
                  Rastreamento ponta a ponta desde a sessão UTM até o pedido faturado no ERP
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Conversão Global: 2,36%
              </span>
            </div>

            <div className="space-y-4">
              {marketingFunnelSeed.map((step, index) => (
                <div key={step.stage} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{step.stage}</span>
                    <div className="flex items-center gap-3">
                      {step.conversionFromPrev && (
                        <span className="text-[11px] text-slate-500">
                          Retenção etapa: <strong className="text-slate-700">{step.conversionFromPrev}%</strong>
                        </span>
                      )}
                      <span className="font-black text-slate-900">
                        {step.count.toLocaleString('pt-BR')} ({step.percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        index === 4
                          ? 'bg-emerald-600'
                          : index >= 2
                          ? 'bg-indigo-600'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.max(step.percentage, 6)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-black text-slate-900 mb-1">
              Performance e Share por Canal
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Participação na receita atribuída e retorno sobre investimento (ROI)
            </p>
            <div className="space-y-4">
              {channelPerformanceSeed.map((item) => (
                <div key={item.channel} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-900">{item.channel}</span>
                    <span className="font-black text-emerald-700">
                      R$ {item.revenue.toLocaleString('pt-BR')} ({item.share}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.share}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{item.conversions} vendas atribuídas</span>
                    <span className="font-bold text-indigo-700">ROI: {item.roi}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CAMPANHAS MULTICANAL */}
      {activeTab === 'campaigns' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Campanhas Ativas, Orçamento & Atribuição de Receita
              </h3>
              <p className="text-xs text-slate-500">
                Simule conversões em tempo real para testar o impacto imediato no ROAS e no faturamento
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewCampaignOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
            >
              + Criar Campanha
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                  <th className="py-2.5 pr-3">Campanha</th>
                  <th className="py-2.5 pr-3">Canal</th>
                  <th className="py-2.5 pr-3">Cupom Vinculado</th>
                  <th className="py-2.5 pr-3">Orçamento / Investido</th>
                  <th className="py-2.5 pr-3">Conversões</th>
                  <th className="py-2.5 pr-3">Receita Atribuída</th>
                  <th className="py-2.5 pr-3">ROAS</th>
                  <th className="py-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {marketingCampaigns.map((camp) => {
                  const roas =
                    Number(camp.spentAmount) > 0
                      ? (Number(camp.AttributedRevenue) / Number(camp.spentAmount)).toFixed(2)
                      : '0.00';
                  return (
                    <tr key={camp.id} className="hover:bg-slate-50/80">
                      <td className="py-3 pr-3 font-bold text-slate-900">{camp.name}</td>
                      <td className="py-3 pr-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
                          {camp.channel}
                        </span>
                      </td>
                      <td className="py-3 pr-3 font-mono font-bold text-indigo-600">
                        {camp.couponCode} (-{camp.discountPercent}%)
                      </td>
                      <td className="py-3 pr-3 text-slate-600">
                        R$ {Number(camp.spentAmount).toLocaleString('pt-BR')} / R${' '}
                        {Number(camp.budgetAmount).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 pr-3 font-bold text-slate-800">{camp.conversions}</td>
                      <td className="py-3 pr-3 font-black text-emerald-700">
                        R$ {Number(camp.AttributedRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {roas}x
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onRecordConversion(camp.id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px]"
                        >
                          + Conversão
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CUPONS & PROMOÇÕES (MODELED ON CouponsPromoPage.tsx) */}
      {activeTab === 'coupons' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Central de Cupons Promocionais & Descontos Automáticos
              </h3>
              <p className="text-xs text-slate-500">
                Controle de limite de utilização, validade, código copiável e receita gerada por cupom
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewCouponOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
            >
              + Criar Cupom Promocional
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                  <th className="py-2.5 pr-3">Código do Cupom</th>
                  <th className="py-2.5 pr-3">Desconto</th>
                  <th className="py-2.5 pr-3">Progresso de Uso</th>
                  <th className="py-2.5 pr-3">Campanha Vinculada</th>
                  <th className="py-2.5 pr-3">Validade</th>
                  <th className="py-2.5 pr-3">Receita Gerada</th>
                  <th className="py-2.5 pr-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {coupons.map((cup) => {
                  const pct = Math.min(100, Math.round((cup.currentUses / cup.maxUses) * 100));
                  return (
                    <tr key={cup.id} className="hover:bg-slate-50/80">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                            {cup.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(cup.code, `Cupom ${cup.code}`)}
                            className="text-[11px] font-bold text-slate-500 hover:text-indigo-600"
                          >
                            {copiedCode === cup.code ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 pr-3 font-bold text-slate-800">
                        {cup.discountType === 'percentage'
                          ? `${cup.discountValue}% OFF`
                          : `R$ ${cup.discountValue.toFixed(2)} OFF`}
                      </td>
                      <td className="py-3 pr-3 w-48">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-700">
                            {cup.currentUses} / {cup.maxUses}
                          </span>
                          <span className="text-slate-500">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 95 ? 'bg-rose-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-slate-600">{cup.campaignName}</td>
                      <td className="py-3 pr-3 text-slate-600">{cup.validUntil}</td>
                      <td className="py-3 pr-3 font-black text-emerald-700">
                        R$ {cup.revenueGenerated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            cup.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {cup.status === 'active' ? 'ATIVO' : 'ESGOTADO'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: CENTRAL UTM, LINKS CURTOS & QR CODES (MODELED ON UtmConversionsCenter.tsx) */}
      {activeTab === 'utm' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">URLs Rastreáveis (UTMs)</h3>
                <p className="text-xs text-slate-500">Selecione um link para inspecionar o funil</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewUtmOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
              >
                + Nova URL
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'instagram', 'google', 'whatsapp', 'afiliado_contabil'].map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setUtmSourceFilter(src)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                    utmSourceFilter === src
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {src === 'ALL' ? 'Todas Fontes' : src}
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              {filteredUtmLinks.map((u) => {
                const active = u.id === selectedUtm.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUtmId(u.id)}
                    className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                      active
                        ? 'border-indigo-500 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-900">{u.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        R$ {u.revenue.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-indigo-600 mt-1 truncate">{u.shortUrl}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        {u.utmSource} / {u.utmMedium}
                      </span>
                      <span>
                        {u.visits.toLocaleString('pt-BR')} visitas → <strong>{u.purchases} vendas</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Diagnóstico de Atribuição UTM
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">{selectedUtm.title}</h3>
                <p className="text-xs font-mono text-slate-500 break-all mt-1">{selectedUtm.url}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyText(selectedUtm.url, 'Link UTM completo')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Copiar URL
                </button>
                <button
                  type="button"
                  onClick={() => setQrModalUrl(selectedUtm)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  QR Code
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-[10px] font-bold uppercase text-slate-500">Visitas</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {selectedUtm.visits.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-[10px] font-bold uppercase text-slate-500">Checkouts</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {selectedUtm.checkouts.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-[10px] font-bold uppercase text-slate-500">Vendas Pagas</p>
                <p className="text-lg font-black text-indigo-700 mt-0.5">
                  {selectedUtm.purchases.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <p className="text-[10px] font-bold uppercase text-emerald-700">Receita UTM</p>
                <p className="text-lg font-black text-emerald-800 mt-0.5">
                  R$ {selectedUtm.revenue.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Micro-Funil Exclusivo Desta URL
              </h4>
              {[
                { label: '1. Cliques / Sessões na URL', val: selectedUtm.visits, pct: 100 },
                {
                  label: '2. Visualização da Oferta',
                  val: selectedUtm.productViews,
                  pct: Math.round((selectedUtm.productViews / Math.max(selectedUtm.visits, 1)) * 100),
                },
                {
                  label: '3. Adição ao Carrinho / Proposta',
                  val: selectedUtm.addToCart,
                  pct: Math.round((selectedUtm.addToCart / Math.max(selectedUtm.visits, 1)) * 100),
                },
                {
                  label: '4. Início de Checkout',
                  val: selectedUtm.checkouts,
                  pct: Math.round((selectedUtm.checkouts / Math.max(selectedUtm.visits, 1)) * 100),
                },
                {
                  label: '5. Compras Confirmadas (ERP)',
                  val: selectedUtm.purchases,
                  pct: Math.round((selectedUtm.purchases / Math.max(selectedUtm.visits, 1)) * 100),
                },
              ].map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{row.label}</span>
                    <span className="font-bold text-slate-900">
                      {row.val.toLocaleString('pt-BR')} ({row.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${Math.max(row.pct, 4)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: MULTI-PIXEL & CONVERSION API (MODELED ON TrackingIntegrationsManager.tsx) */}
      {activeTab === 'pixels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pixels.map((px) => {
            const isRevealed = revealedTokenId === px.id;
            return (
              <div
                key={px.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                        {px.platform.toUpperCase()}
                      </span>
                      <h3 className="text-sm font-black text-slate-900 mt-0.5">{px.name}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPixels((prev) =>
                          prev.map((item) =>
                            item.id === px.id ? { ...item, isActive: !item.isActive } : item,
                          ),
                        )
                      }
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        px.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {px.isActive ? 'ATIVO (CAPI ON)' : 'PAUSADO'}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] text-slate-500 block">ID do Pixel / Tag</span>
                      <span className="font-mono font-bold text-slate-900">{px.pixelId}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] text-slate-500 block">Event Match Quality</span>
                      <span className="font-bold text-emerald-700">{px.matchQualityScore}</span>
                    </div>
                  </div>

                  {px.conversionApiToken && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                      <div className="truncate">
                        <span className="text-[10px] text-slate-500 block">
                          Token Server-Side (Conversion API)
                        </span>
                        <span className="font-mono text-slate-800">
                          {isRevealed
                            ? px.conversionApiToken
                            : '••••••••••••••••••••••••••••••••••••'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRevealedTokenId(isRevealed ? null : px.id)}
                        className="text-[11px] font-bold text-indigo-600 shrink-0"
                      >
                        {isRevealed ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {px.eventsTracked.map((ev) => (
                      <span
                        key={ev}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Último disparo: <strong className="text-slate-800">{px.lastFired}</strong> (
                    {px.conversions24h} eventos/24h)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onNotify?.(
                        `Evento de teste Server-Side disparado com sucesso para ${px.name} (${px.pixelId})!`,
                      )
                    }
                    className="px-3 py-1 rounded-lg bg-slate-900 text-white font-bold text-[11px] hover:bg-slate-800"
                  >
                    Testar Evento CAPI
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 7: AUTOMAÇÕES WHATSAPP / E-MAIL / SMS */}
      {activeTab === 'automations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {automations.map((auto) => (
            <div
              key={auto.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Canal: {auto.channel} • Delay: {auto.delay}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAutomations((prev) =>
                        prev.map((a) =>
                          a.id === auto.id
                            ? { ...a, status: a.status === 'active' ? 'paused' : 'active' }
                            : a,
                        ),
                      )
                    }
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      auto.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {auto.status === 'active' ? 'FLUXO ATIVO' : 'PAUSADO'}
                  </button>
                </div>
                <h3 className="text-sm font-black text-slate-900 mt-2">{auto.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Gatilho ERP: {auto.trigger}</p>

                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-mono text-slate-700">
                  {auto.templatePreview}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  <strong>{auto.sentCount.toLocaleString('pt-BR')}</strong> disparos • Conversão:{' '}
                  <strong className="text-indigo-700">{auto.conversionRate}%</strong>
                </span>
                {auto.revenueRecovered > 0 && (
                  <span className="font-black text-emerald-700">
                    R$ {auto.revenueRecovered.toLocaleString('pt-BR')} recuperados
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 8: REMARKETING & RECUPERAÇÃO DE CARRINHOS ABANDONADOS */}
      {activeTab === 'remarketing' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Fila de Recuperação de Checkouts & Propostas Abandonadas
              </h3>
              <p className="text-xs text-slate-500">
                Acione a recuperação ativa via WhatsApp API + Cupom dinâmico em 1 clique
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                  <th className="py-2.5 pr-3">Cliente / Empresa</th>
                  <th className="py-2.5 pr-3">Contato</th>
                  <th className="py-2.5 pr-3">Oferta / Produto no Checkout</th>
                  <th className="py-2.5 pr-3">Valor</th>
                  <th className="py-2.5 pr-3">Origem UTM</th>
                  <th className="py-2.5 pr-3">Estágio</th>
                  <th className="py-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {abandonedCarts.map((cart) => (
                  <tr key={cart.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pr-3 font-bold text-slate-900">{cart.customerName}</td>
                    <td className="py-3 pr-3 text-slate-600">
                      <div>{cart.customerPhone}</div>
                      <div className="text-[11px] text-slate-400">{cart.customerEmail}</div>
                    </td>
                    <td className="py-3 pr-3 text-slate-700">{cart.productName}</td>
                    <td className="py-3 pr-3 font-black text-slate-900">
                      R$ {cart.cartValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 pr-3 font-mono text-indigo-600">{cart.utmSource}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          cart.recoveryStage === 'recovered'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {cart.recoveryStage === 'recovered'
                          ? 'RECUPERADO'
                          : cart.recoveryStage.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {cart.recoveryStage !== 'recovered' ? (
                        <button
                          type="button"
                          onClick={() => handleTriggerCartRecovery(cart.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-500"
                        >
                          Disparar WhatsApp + Cupom
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700">✓ Convertido</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 9: CONECTORES DE MÍDIA PAGA */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mediaIntegrations.map((intg) => (
            <div
              key={intg.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900">{intg.platform}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {intg.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Conta: <span className="font-mono text-slate-700">{intg.accountId}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Pixel/Tag: <span className="font-mono text-slate-700">{intg.pixelOrTagId}</span>
                </p>
                <p className="text-xs font-bold text-indigo-700 mt-2">ROAS Consolidado: {intg.roas}</p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Sync: {intg.lastSyncAt}</span>
                <button
                  type="button"
                  onClick={() => onSyncIntegration(intg.id)}
                  className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold"
                >
                  Sincronizar Custos
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: NOVA CAMPANHA */}
      <Modal
        isOpen={isNewCampaignOpen}
        onClose={() => setIsNewCampaignOpen(false)}
        title="Nova Campanha de Marketing & Cupom"
        subtitle="Crie uma campanha com orçamento e cupom rastreável integrado ao faturamento"
      >
        <form
          onSubmit={(e) => {
            onCreateCampaign(e);
            setIsNewCampaignOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Campanha</label>
            <input
              type="text"
              required
              value={mktCampaignName}
              onChange={(e) => setMktCampaignName(e.target.value)}
              placeholder="Ex: Expansão Enterprise Q4"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Canal de Mídia</label>
              <select
                value={mktChannel}
                onChange={(e) => setMktChannel(e.target.value as MarketingCampaignProp['channel'])}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              >
                <option value="META_ADS">META_ADS (Instagram/Facebook)</option>
                <option value="GOOGLE_ADS">GOOGLE_ADS (Search/PMax)</option>
                <option value="TIKTOK_ADS">TIKTOK_ADS</option>
                <option value="EMAIL_CRM">EMAIL_CRM / WhatsApp</option>
                <option value="INFLUENCERS">INFLUENCERS / Afiliados</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Orçamento (R$)</label>
              <input
                type="number"
                required
                value={mktBudgetAmount}
                onChange={(e) => setMktBudgetAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Código do Cupom</label>
              <input
                type="text"
                required
                value={mktCouponCode}
                onChange={(e) => setMktCouponCode(e.target.value)}
                placeholder="Ex: DELTA25"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Desconto (%)</label>
              <input
                type="number"
                required
                value={mktDiscountPercent}
                onChange={(e) => setMktDiscountPercent(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsNewCampaignOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
            >
              Publicar Campanha
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: NOVO CUPOM PROMOCIONAL */}
      <Modal
        isOpen={isNewCouponOpen}
        onClose={() => setIsNewCouponOpen(false)}
        title="Criar Novo Cupom Promocional"
        subtitle="Configure regras de desconto percentual ou fixo e limite de usos no checkout"
      >
        <form onSubmit={handleCreateCouponSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Código do Cupom</label>
            <input
              type="text"
              required
              value={newCouponCode}
              onChange={(e) => setNewCouponCode(e.target.value)}
              placeholder="Ex: VIP30OFF"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs uppercase font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Desconto</label>
              <select
                value={newCouponType}
                onChange={(e) => setNewCouponType(e.target.value as 'percentage' | 'fixed')}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              >
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valor do Desconto</label>
              <input
                type="number"
                required
                value={newCouponValue}
                onChange={(e) => setNewCouponValue(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Limite Máximo de Usos</label>
              <input
                type="number"
                required
                value={newCouponMaxUses}
                onChange={(e) => setNewCouponMaxUses(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Válido Até</label>
              <input
                type="date"
                required
                value={newCouponValidUntil}
                onChange={(e) => setNewCouponValidUntil(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsNewCouponOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
            >
              Ativar Cupom
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: NOVA URL UTM */}
      <Modal
        isOpen={isNewUtmOpen}
        onClose={() => setIsNewUtmOpen(false)}
        title="Construtor de URL Rastreável (UTM Builder)"
        subtitle="Gere links parametrizados para rastrear visitas, checkouts e receita por canal"
      >
        <form onSubmit={handleCreateUtmSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Título Identificador</label>
            <input
              type="text"
              required
              value={newUtmTitle}
              onChange={(e) => setNewUtmTitle(e.target.value)}
              placeholder="Ex: Campanha Reels Novembro - Lote 2"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">utm_source</label>
              <input
                type="text"
                required
                value={newUtmSource}
                onChange={(e) => setNewUtmSource(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">utm_medium</label>
              <input
                type="text"
                required
                value={newUtmMedium}
                onChange={(e) => setNewUtmMedium(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">utm_campaign</label>
              <input
                type="text"
                required
                value={newUtmCampaign}
                onChange={(e) => setNewUtmCampaign(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsNewUtmOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
            >
              Gerar URL UTM
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: QR CODE UTM */}
      <Modal
        isOpen={Boolean(qrModalUrl)}
        onClose={() => setQrModalUrl(null)}
        title="QR Code de Conversão & Link Curto"
        subtitle={qrModalUrl?.title}
        size="sm"
      >
        {qrModalUrl && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-44 h-44 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 flex flex-col items-center justify-center p-4">
              <div className="grid grid-cols-5 gap-1.5 w-28 h-28">
                {Array.from({ length: 25 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xs ${
                      idx % 2 === 0 || idx % 7 === 0 ? 'bg-slate-900' : 'bg-white'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono font-bold text-indigo-700 mt-2">
                {qrModalUrl.shortUrl}
              </span>
            </div>
            <p className="text-xs text-slate-600 break-all font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              {qrModalUrl.url}
            </p>
            <button
              type="button"
              onClick={() => handleCopyText(qrModalUrl.url, 'URL do QR Code')}
              className="w-full py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
            >
              Copiar Link de Destino
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
