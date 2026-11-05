export interface MarketingFunnelStage {
  stage: string;
  count: number;
  percentage: number;
  conversionFromPrev?: number;
}

export interface ChannelPerformanceItem {
  channel: string;
  share: number;
  conversions: number;
  revenue: number;
  roi: number;
  color: string;
}

export interface UtmTrackableUrl {
  id: string;
  title: string;
  destinationName: string;
  url: string;
  shortUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent?: string;
  visits: number;
  productViews: number;
  addToCart: number;
  checkouts: number;
  purchases: number;
  revenue: number;
  averageTicket: number;
  conversionRate: number;
  lastConversionAt: string;
  status: 'active' | 'paused';
}

export interface CouponSeedItem {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses: number;
  currentUses: number;
  validUntil: string;
  status: 'active' | 'expired' | 'depleted';
  revenueGenerated: number;
  campaignName: string;
}

export interface PixelTrackerItem {
  id: string;
  platform: 'meta_pixel' | 'google_analytics' | 'google_tag_manager' | 'tiktok_pixel';
  name: string;
  pixelId: string;
  conversionApiToken?: string;
  isActive: boolean;
  eventsTracked: string[];
  conversions24h: number;
  matchQualityScore: string;
  lastFired: string;
}

export interface AbandonedCartItem {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productName: string;
  cartValue: number;
  abandonedAt: string;
  minutesAgo: number;
  recoveryStage: '15m_whatsapp' | '1h_email' | '24h_coupon' | 'recovered';
  utmSource: string;
}

export interface AutomationRuleItem {
  id: string;
  name: string;
  trigger: string;
  channel: 'WhatsApp' | 'E-mail' | 'SMS' | 'Push';
  delay: string;
  sentCount: number;
  conversionRate: number;
  revenueRecovered: number;
  status: 'active' | 'paused';
  templatePreview: string;
}

export const marketingFunnelSeed: MarketingFunnelStage[] = [
  { stage: '1. Visitantes (Sessões UTM)', count: 120450, percentage: 100 },
  { stage: '2. Visualizações de Oferta', count: 48320, percentage: 40.1, conversionFromPrev: 40.1 },
  { stage: '3. Início de Checkout / Proposta', count: 8540, percentage: 7.1, conversionFromPrev: 17.7 },
  { stage: '4. Pagamentos Iniciados', count: 4125, percentage: 3.4, conversionFromPrev: 48.3 },
  { stage: '5. Vendas Confirmadas (ERP)', count: 2847, percentage: 2.36, conversionFromPrev: 69.0 },
];

export const channelPerformanceSeed: ChannelPerformanceItem[] = [
  { channel: 'Instagram Ads & Stories', share: 42, conversions: 1196, revenue: 358800, roi: 420, color: 'bg-pink-500' },
  { channel: 'Google Search & Performance Max', share: 25, conversions: 712, revenue: 213600, roi: 310, color: 'bg-blue-600' },
  { channel: 'WhatsApp Oficial (API Cloud)', share: 18, conversions: 512, revenue: 153600, roi: 890, color: 'bg-emerald-500' },
  { channel: 'E-mail Marketing & CRM', share: 8, conversions: 228, revenue: 68400, roi: 650, color: 'bg-amber-500' },
  { channel: 'Tráfego Direto / Orgânico', share: 7, conversions: 199, revenue: 59700, roi: 100, color: 'bg-indigo-500' },
];

export const utmLinksSeed: UtmTrackableUrl[] = [
  {
    id: 'utm-01',
    title: 'Instagram Stories - Lote Virada Q4',
    destinationName: 'Checkout Enterprise Cloud ERP',
    url: 'https://delta1-zeta.vercel.app/?utm_source=instagram&utm_medium=stories&utm_campaign=virada_lote_q4&utm_content=video_30s',
    shortUrl: 'delta.erp/u/ig-q4',
    utmSource: 'instagram',
    utmMedium: 'stories',
    utmCampaign: 'virada_lote_q4',
    utmContent: 'video_30s',
    visits: 18420,
    productViews: 9640,
    addToCart: 2410,
    checkouts: 1620,
    purchases: 842,
    revenue: 252600,
    averageTicket: 300,
    conversionRate: 4.57,
    lastConversionAt: 'Há 3 min',
    status: 'active',
  },
  {
    id: 'utm-02',
    title: 'Google Search - Palavra-chave ERP Fiscal SPED',
    destinationName: 'Landing Page Módulo Fiscal & Contábil',
    url: 'https://delta1-zeta.vercel.app/?utm_source=google&utm_medium=cpc&utm_campaign=search_erp_fiscal&utm_content=ad_rsa_01',
    shortUrl: 'delta.erp/u/gg-sped',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'search_erp_fiscal',
    utmContent: 'ad_rsa_01',
    visits: 12350,
    productViews: 6890,
    addToCart: 1490,
    checkouts: 980,
    purchases: 518,
    revenue: 207200,
    averageTicket: 400,
    conversionRate: 4.19,
    lastConversionAt: 'Há 9 min',
    status: 'active',
  },
  {
    id: 'utm-03',
    title: 'WhatsApp VIP - Recuperação de Propostas B2B',
    destinationName: 'Proposta Comercial Direta PIX/Boleto',
    url: 'https://delta1-zeta.vercel.app/?utm_source=whatsapp&utm_medium=vip_list&utm_campaign=fechamento_b2b',
    shortUrl: 'delta.erp/u/wa-vip',
    utmSource: 'whatsapp',
    utmMedium: 'vip_list',
    utmCampaign: 'fechamento_b2b',
    visits: 4210,
    productViews: 3180,
    addToCart: 1120,
    checkouts: 890,
    purchases: 614,
    revenue: 184200,
    averageTicket: 300,
    conversionRate: 14.58,
    lastConversionAt: 'Há 1 min',
    status: 'active',
  },
  {
    id: 'utm-04',
    title: 'Parceiro / Afiliado - Canal Contadores Brasil',
    destinationName: 'Plano Multi-CNPJ Contábil',
    url: 'https://delta1-zeta.vercel.app/?utm_source=afiliado_contabil&utm_medium=referral&utm_campaign=parceiros_q4',
    shortUrl: 'delta.erp/u/af-cont',
    utmSource: 'afiliado_contabil',
    utmMedium: 'referral',
    utmCampaign: 'parceiros_q4',
    visits: 6890,
    productViews: 3420,
    addToCart: 740,
    checkouts: 510,
    purchases: 289,
    revenue: 101150,
    averageTicket: 350,
    conversionRate: 4.19,
    lastConversionAt: 'Há 18 min',
    status: 'active',
  },
];

export const couponsSeed: CouponSeedItem[] = [
  {
    id: 'cup-01',
    code: 'DELTA20VIP',
    discountType: 'percentage',
    discountValue: 20,
    maxUses: 500,
    currentUses: 342,
    validUntil: '2026-12-31',
    status: 'active',
    revenueGenerated: 145800,
    campaignName: 'Expansão Enterprise Q4',
  },
  {
    id: 'cup-02',
    code: 'BEMVINDO150',
    discountType: 'fixed',
    discountValue: 150,
    maxUses: 200,
    currentUses: 198,
    validUntil: '2026-11-30',
    status: 'active',
    revenueGenerated: 89100,
    campaignName: 'Onboarding Novos Clientes',
  },
  {
    id: 'cup-03',
    code: 'RECUPERA10',
    discountType: 'percentage',
    discountValue: 10,
    maxUses: 1000,
    currentUses: 419,
    validUntil: '2026-12-31',
    status: 'active',
    revenueGenerated: 112400,
    campaignName: 'Automação Carrinho Abandonado 24h',
  },
  {
    id: 'cup-04',
    code: 'BLACKFRIDAY50',
    discountType: 'percentage',
    discountValue: 50,
    maxUses: 100,
    currentUses: 100,
    validUntil: '2026-11-29',
    status: 'depleted',
    revenueGenerated: 75000,
    campaignName: 'Flash Sale Lote Especial',
  },
];

export const pixelTrackersSeed: PixelTrackerItem[] = [
  {
    id: 'px-01',
    platform: 'meta_pixel',
    name: 'Meta Pixel Principal + CAPI Server-Side',
    pixelId: '894512369874125',
    conversionApiToken: 'EAABwzLixnjYBO9fCAPI77812ServerSideTokenDeltaERP',
    isActive: true,
    eventsTracked: ['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase', 'Lead'],
    conversions24h: 184,
    matchQualityScore: '9.4 / 10 (Excelente)',
    lastFired: 'Há 42 segundos',
  },
  {
    id: 'px-02',
    platform: 'google_analytics',
    name: 'Google Analytics 4 (GA4 E-commerce Enhanced)',
    pixelId: 'G-DELTA99481ERP',
    conversionApiToken: 'MP-SecKey-GA4-99481-MeasurementProtocol',
    isActive: true,
    eventsTracked: ['page_view', 'view_item', 'begin_checkout', 'purchase'],
    conversions24h: 312,
    matchQualityScore: '9.8 / 10 (Nativo)',
    lastFired: 'Há 15 segundos',
  },
  {
    id: 'px-03',
    platform: 'google_tag_manager',
    name: 'Google Tag Manager Container Web + Server',
    pixelId: 'GTM-55829DELTA',
    isActive: true,
    eventsTracked: ['All Pages', 'Custom DataLayer Events', 'Purchase Value'],
    conversions24h: 496,
    matchQualityScore: '9.6 / 10 (Ativo)',
    lastFired: 'Há 8 segundos',
  },
  {
    id: 'px-04',
    platform: 'tiktok_pixel',
    name: 'TikTok Ads Events API v2',
    pixelId: 'C98L2M3N4P5Q6R7',
    conversionApiToken: 'TT-EventsAPI-Token-884120',
    isActive: false,
    eventsTracked: ['ViewContent', 'CompletePayment'],
    conversions24h: 0,
    matchQualityScore: 'Pausado',
    lastFired: 'Há 3 dias',
  },
];

export const abandonedCartsSeed: AbandonedCartItem[] = [
  {
    id: 'cart-901',
    customerName: 'Roberto Almeida (Grupo Atlas)',
    customerEmail: 'roberto.almeida@grupoatlas.com.br',
    customerPhone: '+55 11 99812-4410',
    productName: 'Licença Anual Enterprise Multi-Filial + Módulo Fiscal',
    cartValue: 4850,
    abandonedAt: 'Hoje, 14:22',
    minutesAgo: 18,
    recoveryStage: '15m_whatsapp',
    utmSource: 'instagram',
  },
  {
    id: 'cart-902',
    customerName: 'Camila Nogueira (TechVarejo S.A.)',
    customerEmail: 'camila@techvarejo.com.br',
    customerPhone: '+55 21 98741-3302',
    productName: 'Pacote CRM + Pagamentos Split + Contabilidade',
    cartValue: 3290,
    abandonedAt: 'Hoje, 13:05',
    minutesAgo: 95,
    recoveryStage: '1h_email',
    utmSource: 'google',
  },
  {
    id: 'cart-903',
    customerName: 'Fernando Costa (Logística Sul)',
    customerEmail: 'fernando@logisticasul.com.br',
    customerPhone: '+55 41 99104-8821',
    productName: 'Upgrade Módulo BI & Analytics + Workflow Alçadas',
    cartValue: 2150,
    abandonedAt: 'Ontem, 19:40',
    minutesAgo: 1120,
    recoveryStage: '24h_coupon',
    utmSource: 'whatsapp',
  },
];

export const automationRulesSeed: AutomationRuleItem[] = [
  {
    id: 'auto-01',
    name: 'Recuperação Imediata PIX / Checkout Abandonado (15 min)',
    trigger: 'Checkout iniciado sem pagamento após 15 min',
    channel: 'WhatsApp',
    delay: '15 minutos',
    sentCount: 1420,
    conversionRate: 28.4,
    revenueRecovered: 124600,
    status: 'active',
    templatePreview: 'Olá {{nome}}, notamos que seu pedido {{pedido}} ficou pendente! Use o link {{link_pix}} para concluir com liberação imediata.',
  },
  {
    id: 'auto-02',
    name: 'Confirmação de Compra + NF-e + Acesso Portal',
    trigger: 'Venda confirmada no Módulo 10 / 11',
    channel: 'WhatsApp',
    delay: 'Imediato (Webhook Outbox)',
    sentCount: 2847,
    conversionRate: 99.2,
    revenueRecovered: 0,
    status: 'active',
    templatePreview: 'Parabéns {{nome}}! Seu pagamento foi confirmado. Acesse seu certificado e NF-e em {{link_portal}}.',
  },
  {
    id: 'auto-03',
    name: 'Oferta de Cupom RECUPERA10 (24h após Abandono)',
    trigger: 'Carrinho não recuperado em 24 horas',
    channel: 'E-mail',
    delay: '24 horas',
    sentCount: 890,
    conversionRate: 14.8,
    revenueRecovered: 68900,
    status: 'active',
    templatePreview: 'Olá {{nome}}, liberamos 10% OFF exclusivo com o cupom RECUPERA10 para você finalizar sua contratação hoje.',
  },
  {
    id: 'auto-04',
    name: 'Alerta de Virada de Lote / Vencimento de Proposta CRM',
    trigger: 'Proposta comercial a 48h do vencimento',
    channel: 'SMS',
    delay: '48h antes do vencimento',
    sentCount: 640,
    conversionRate: 19.5,
    revenueRecovered: 54200,
    status: 'active',
    templatePreview: 'DELTA ERP: {{nome}}, sua condição comercial especial encerra em 48h. Garanta o valor atual: {{link}}',
  },
];
