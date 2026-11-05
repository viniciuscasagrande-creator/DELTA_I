import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { SubModuleTabs } from '../../components/ui/SubModuleTabs';
import {
  eventsCatalogSeed,
  eventIntakesSeed,
  officialCommunicationPricingSeed,
  officialCommunicationTemplatesSeed,
  defaultArtworkChecklist2026,
  type DiskIngressosEventRecord,
  type EventOperationalAuditItem,
} from '../../data/eventsData';
import {
  EventApprovalStatus,
  EventPublicationStatus,
  EventSalesStatus,
  EventRealizationStatus,
  EventOperationalStage,
  EventSeatStatus,
  type SalesChannelType,
  type CriticalChangeType,
  type CommunicationPurpose,
  formatBRL,
  formatTicketNumber,
  roundCurrency,
  type DiskIngressosTicketItem,
} from '@delta-erp/shared';

interface EventsModulePageProps {
  selectedSubmenu?: string;
  onNotify?: (msg: string) => void;
}

type EventsTab =
  | 'events'
  | 'intake_assembly'
  | 'event_states'
  | 'sectors_inventory'
  | 'tickets'
  | 'critical_changes'
  | 'communications_dossier'
  | 'new_event';

export const EventsModulePage: React.FC<EventsModulePageProps> = ({
  selectedSubmenu,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<EventsTab>('events');
  const [events, setEvents] = useState<DiskIngressosEventRecord[]>(eventsCatalogSeed);
  const [intakes] = useState(eventIntakesSeed);
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || 'evt-01');

  // Segregação de Funções (Caso 1): Visão Interna DiskIngressos vs Visão Portal do Produtor
  const [viewerScope, setViewerScope] = useState<'INTERNAL_DISK' | 'PRODUCER_PROD01' | 'PRODUCER_PROD02'>('INTERNAL_DISK');

  // Sincroniza submenu lateral (14 submenus da Seção 4) com a aba correspondente (Caso 16)
  useEffect(() => {
    if (!selectedSubmenu) return;
    const sub = selectedSubmenu.toLowerCase();
    if (sub.includes('solicita') || sub.includes('montagem') || sub.includes('cadastro')) {
      setActiveTab('intake_assembly');
    } else if (sub.includes('dimens') || sub.includes('confer') || sub.includes('aprova') || sub.includes('publica') || sub.includes('canais')) {
      setActiveTab('event_states');
    } else if (sub.includes('setor') || sub.includes('mapa') || sub.includes('bloqueio') || sub.includes('lote') || sub.includes('preço') || sub.includes('invent')) {
      setActiveTab('sectors_inventory');
    } else if (sub.includes('ingresso') || sub.includes('cortesia') || sub.includes('recibo') || sub.includes('portaria') || sub.includes('bilheteria') || sub.includes('valida') || sub.includes('ocorr') || sub.includes('suporte')) {
      setActiveTab('tickets');
    } else if (sub.includes('altera') || sub.includes('cancelamento') || sub.includes('estorno')) {
      setActiveTab('critical_changes');
    } else if (sub.includes('comunica') || sub.includes('disparo') || sub.includes('dossi') || sub.includes('relat') || sub.includes('auditoria')) {
      setActiveTab('communications_dossier');
    } else if (sub.includes('novo')) {
      setActiveTab('new_event');
    } else {
      setActiveTab('events');
    }
  }, [selectedSubmenu]);

  // Filtros do Catálogo
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<string>('ALL');
  const [salesFilter, setSalesFilter] = useState<string>('ALL');

  // Estado para Dupla Conferência Independente (STE.PO.001 — Caso 3)
  const [reviewerIdInput, setReviewerIdInput] = useState('usr-coord-rafael');
  const [reviewerNameInput, setReviewerNameInput] = useState('Rafael Souza (2º Conferente)');
  const [reviewNotesInput, setReviewNotesInput] = useState('Setores, alvará, meia-entrada e taxas conferidos.');

  // Estado para Perguntas Obrigatórias de Bloqueio (STE.IT.001, p. 8 — Caso 2)
  const [techBlockAnswer, setTechBlockAnswer] = useState<'SIM' | 'NAO'>('SIM');
  const [techBlockDetail, setTechBlockDetail] = useState('40 lugares reservados para mesa de som/luz (House Mix)');
  const [venueBlockAnswer, setVenueBlockAnswer] = useState<'SIM' | 'NAO'>('NAO');
  const [venueBlockDetail, setVenueBlockDetail] = useState('');

  // Estado para Correção Material (Caso 8)
  const [materialVenueInput, setMaterialVenueInput] = useState('');
  const [materialFeeInput, setMaterialFeeInput] = useState('');
  const [materialReasonInput, setMaterialReasonInput] = useState('Aditivo contratual de local/taxa solicitado pelo Comercial');

  // Estado para Cortesias & Recibo Anexo 1 (Caso 13)
  const [courtesyRecipient, setCourtesyRecipient] = useState('Diretoria Executiva da Produtora');
  const [courtesyDoc, setCourtesyDoc] = useState('14.882.190/0001-40');
  const [courtesyQty, setCourtesyQty] = useState('15');
  const [courtesyDelivery, setCourtesyDelivery] = useState<'IMPRESSO_FISICO' | 'E_TICKET_PDF'>('IMPRESSO_FISICO');

  // Estado para Central de Alterações Críticas (STE.PO.002 — Casos 9 e 12)
  const [criticalType, setCriticalType] = useState<CriticalChangeType>('ADIAMENTO_COM_NOVA_DATA');
  const [criticalReason, setCriticalReason] = useState('Readequação logística da turnê nacional com ofício da produtora');
  const [criticalDocCode, setCriticalDocCode] = useState('OFICIO-PROD-2026-88');
  const [criticalNewDate, setCriticalNewDate] = useState('2026-12-19');
  const [criticalNewVenue, setCriticalNewVenue] = useState('Arena da Baixada');
  const [providerConfirmCode, setProviderConfirmCode] = useState('E2E-PIX-ACQ-2026-998811');

  // Estado para Comunicados & Disparos Versionados (Casos 10 e 11)
  const [commChangeType, setCommChangeType] = useState<CriticalChangeType>('ADIAMENTO_COM_NOVA_DATA');
  const [commTemplateId, setCommTemplateId] = useState('tpl-adiamento-com-data-v1');
  const [commPurpose, setCommPurpose] = useState<CommunicationPurpose>('INFORMATIVO_ALTERACAO_CRITICA');
  const [commPricingCode, setCommPricingCode] = useState('TAB-2026-WA-INFO-V1');
  const [commCostResp, setCommCostResp] = useState<'PRODUTOR_BORDERO' | 'PRODUTOR_PIX' | 'CUSTEIO_DISKINGRESSOS'>('PRODUTOR_BORDERO');
  const [commContactsRaw, setCommContactsRaw] = useState(
    '+5541999110001, +5541999110001, +5541999110002, +5541999110003, +5541999110002'
  );

  // Estado para Novo Evento (Caso 15: inicia com saldos zerados)
  const [newCode, setNewCode] = useState(`EVT-2026-${String(events.length + 1).padStart(3, '0')}`);
  const [newName, setNewName] = useState('Festival de Inverno & Jazz de Curitiba');
  const [newCategory, setNewCategory] = useState<DiskIngressosEventRecord['category']>('FESTIVAL');
  const [newProducerName, setNewProducerName] = useState('Live Nation Brasil');
  const [newVenueName, setNewVenueName] = useState('Ópera de Arame');
  const [newVenueCity] = useState('Curitiba / PR');
  const [newStartDate] = useState('2026-12-18');
  const [newEndDate] = useState('2026-12-19');
  const [newCapacity, setNewCapacity] = useState('2100');
  const [newSectorName, setNewSectorName] = useState('Plateia Única Numerada');
  const [newFacePrice, setNewFacePrice] = useState('180');
  const [newServiceFee, setNewServiceFee] = useState('27');

  // Filtra eventos conforme escopo do perfil ativo (Caso 1: Produtor só vê seus próprios eventos)
  const scopedEvents = useMemo(() => {
    if (viewerScope === 'PRODUCER_PROD01') {
      return events.filter((e) => e.producerId === 'prod-01');
    }
    if (viewerScope === 'PRODUCER_PROD02') {
      return events.filter((e) => e.producerId === 'prod-02');
    }
    return events;
  }, [events, viewerScope]);

  const activeEvent = useMemo(
    () => scopedEvents.find((e) => e.id === selectedEventId) || scopedEvents[0] || events[0],
    [scopedEvents, selectedEventId, events]
  );

  const allTickets = useMemo(() => scopedEvents.flatMap((e) => e.ticketsSample), [scopedEvents]);

  const totalEventos = scopedEvents.length;
  const totalIngressosVendidos = useMemo(
    () => scopedEvents.reduce((acc, e) => acc + e.totalSold, 0),
    [scopedEvents]
  );
  const faturamentoTotalFace = useMemo(
    () => scopedEvents.reduce((acc, e) => acc + e.grossSales, 0),
    [scopedEvents]
  );
  const lotacaoGeralPct = useMemo(() => {
    const totalCap = scopedEvents.reduce((acc, e) => acc + e.capacity, 0);
    return totalCap > 0 ? ((totalIngressosVendidos / totalCap) * 100).toFixed(1) : '0';
  }, [scopedEvents, totalIngressosVendidos]);

  const filteredEvents = useMemo(() => {
    return scopedEvents.filter((e) => {
      const matchSearch =
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.producerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchApproval = approvalFilter === 'ALL' || e.approvalStatus === approvalFilter;
      const matchSales = salesFilter === 'ALL' || e.salesStatus === salesFilter;
      return matchSearch && matchApproval && matchSales;
    });
  }, [scopedEvents, searchQuery, approvalFilter, salesFilter]);

  const appendEventAudit = (
    evt: DiskIngressosEventRecord,
    entry: Omit<EventOperationalAuditItem, 'id' | 'timestamp' | 'hash'>
  ): EventOperationalAuditItem[] => {
    const timestamp = new Date().toISOString();
    const hash = `sha256_${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}`;
    const newItem: EventOperationalAuditItem = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp,
      hash,
      ...entry,
    };
    return [newItem, ...(evt.auditTrail || [])];
  };

  // Resposta às 2 Perguntas Obrigatórias de Bloqueios (STE.IT.001, p. 8 — Caso 2)
  const handleSaveBlockQuestions = () => {
    if (techBlockAnswer === 'SIM' && !techBlockDetail.trim()) {
      onNotify?.('ERRO STE.IT.001: Detalhe os bloqueios técnicos de produção antes de salvar.');
      return;
    }
    if (venueBlockAnswer === 'SIM' && !venueBlockDetail.trim()) {
      onNotify?.('ERRO STE.IT.001: Detalhe os bloqueios contratuais do espaço antes de salvar.');
      return;
    }

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== activeEvent.id) return evt;
        const updatedQuestions = {
          hasTechnicalProductionBlocks: techBlockAnswer,
          technicalProductionBlocksDetail: techBlockAnswer === 'SIM' ? techBlockDetail : undefined,
          hasVenueContractualCourtesyBlocks: venueBlockAnswer,
          venueContractualCourtesyBlocksDetail: venueBlockAnswer === 'SIM' ? venueBlockDetail : undefined,
          answeredByUserId: 'usr-suporte-logado',
          answeredAt: new Date().toISOString(),
        };
        return {
          ...evt,
          blockQuestions: updatedQuestions,
          auditTrail: appendEventAudit(evt, {
            action: 'MANDATORY_BLOCK_QUESTIONS_ANSWERED',
            actor: 'Equipe Suporte Técnico',
            role: 'TECHNICAL_SUPPORT',
            reason: 'Preenchimento das 2 perguntas obrigatórias de bloqueio (STE.IT.001, p. 8)',
            before: JSON.stringify(evt.blockQuestions || {}),
            after: `Técnico=${techBlockAnswer} | Espaço=${venueBlockAnswer}`,
          }),
        };
      })
    );
    onNotify?.('Perguntas obrigatórias de bloqueio (STE.IT.001) registradas e auditadas com sucesso!');
  };

  // Submissão de Conferência Independente (STE.PO.001, p. 3 — Caso 3)
  const handleSubmitIndependentReview = () => {
    const assemblerId = activeEvent.assembledByUserId || 'usr-montador-lucas';
    if (reviewerIdInput === assemblerId) {
      onNotify?.(
        'BLOQUEIO STE.PO.001 (Caso 3): O montador do evento NÃO pode aprovar a própria montagem!'
      );
      return;
    }

    const currentVersion = activeEvent.revisionVersion || 1;
    const existingReviews = (activeEvent.independentReviews || []).filter(
      (r) => r.revisionVersion === currentVersion && r.decision === 'APPROVED'
    );

    if (existingReviews.some((r) => r.reviewerUserId === reviewerIdInput)) {
      onNotify?.(
        'BLOQUEIO STE.PO.001 (Caso 3): A 2ª conferência deve ser assinada por pessoa DIFERENTE do 1º conferente!'
      );
      return;
    }

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== activeEvent.id) return evt;
        const order = ((existingReviews.length + 1) as 1 | 2);
        const newReview = {
          id: `rev-${Date.now()}`,
          eventId: evt.id,
          revisionVersion: currentVersion,
          revisionHash: evt.revisionHash || 'hash-v1',
          reviewerOrder: order,
          reviewerUserId: reviewerIdInput,
          reviewerName: reviewerNameInput,
          reviewerRole: 'TECHNICAL_SUPPORT_REVIEWER',
          sectorsVerified: true,
          pricesAndFeesVerified: true,
          halfPriceRulesVerified: true,
          channelsAndPosVerified: true,
          blockQuestionsVerified: true,
          decision: 'APPROVED' as const,
          notes: reviewNotesInput,
          signedAt: new Date().toISOString(),
          signatureHash: `sig_${Date.now().toString(16)}`,
        };
        const updatedReviews = [...(evt.independentReviews || []), newReview];
        const approvedCount = updatedReviews.filter(
          (r) => r.revisionVersion === currentVersion && r.decision === 'APPROVED'
        ).length;

        return {
          ...evt,
          independentReviews: updatedReviews,
          operationalStage:
            approvedCount >= 2
              ? EventOperationalStage.AGUARDANDO_PRODUTOR
              : EventOperationalStage.EM_CONFERENCIA,
          auditTrail: appendEventAudit(evt, {
            action: `INDEPENDENT_REVIEW_${order}_APPROVED`,
            actor: reviewerNameInput,
            role: 'TECHNICAL_SUPPORT_REVIEWER',
            reason: reviewNotesInput,
            before: `Conferências=${existingReviews.length}/2`,
            after: `Conferências=${approvedCount}/2 (v${currentVersion})`,
          }),
        };
      })
    );
    onNotify?.(`Conferência independente assinada eletronicamente por ${reviewerNameInput}!`);
  };

  // Aceite Explícito do Produtor na Versão Atual (Caso 4)
  const handleProducerApproval = () => {
    const currentVersion = activeEvent.revisionVersion || 1;
    const validReviews = (activeEvent.independentReviews || []).filter(
      (r) => r.revisionVersion === currentVersion && r.decision === 'APPROVED'
    );
    if (validReviews.length < 2) {
      onNotify?.(
        'BLOQUEIO (Caso 3/4): O produtor só pode aprovar após as 2 conferências independentes da versão atual!'
      );
      return;
    }

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== activeEvent.id) return evt;
        const approval = {
          id: `pa-${Date.now()}`,
          eventId: evt.id,
          producerId: evt.producerId,
          producerUserName: `Representante Legal (${evt.producerName})`,
          revisionVersion: currentVersion,
          revisionHash: evt.revisionHash || `hash-v${currentVersion}`,
          decision: 'APPROVED' as const,
          notes: 'Aceite formal da versão revisada para publicação e abertura de vendas.',
          decidedAt: new Date().toISOString(),
          evidenceHash: `ev_prod_${Date.now().toString(16)}`,
        };
        return {
          ...evt,
          producerApproval: approval,
          approvalStatus: EventApprovalStatus.APPROVED,
          operationalStage: EventOperationalStage.APROVADO,
          auditTrail: appendEventAudit(evt, {
            action: 'PRODUCER_EXPLICIT_APPROVAL',
            actor: approval.producerUserName,
            role: 'PRODUCER',
            reason: `Aceite formal na revisão v${currentVersion}`,
            before: evt.approvalStatus,
            after: 'APPROVED',
          }),
        };
      })
    );
    onNotify?.(`Aceite explícito do produtor (${activeEvent.producerName}) registrado na versão v${currentVersion}!`);
  };

  // Correção Material que invalida aceite anterior (Caso 8)
  const handleApplyMaterialCorrection = () => {
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== activeEvent.id) return evt;
        const nextVersion = (evt.revisionVersion || 1) + 1;
        const nextHash = `sha256_v${nextVersion}_${Date.now().toString(16)}`;
        const updatedVenue = materialVenueInput.trim() || evt.venueName;
        const updatedSectors = materialFeeInput
          ? evt.sectors.map((s) => ({ ...s, convenienceFee: Number(materialFeeInput) }))
          : evt.sectors;

        return {
          ...evt,
          venueName: updatedVenue,
          sectors: updatedSectors,
          revisionVersion: nextVersion,
          revisionHash: nextHash,
          producerApproval: undefined, // Invalida aceite da versão anterior (Caso 8)
          approvalStatus: EventApprovalStatus.UNDER_REVIEW,
          publicationStatus: EventPublicationStatus.UNPUBLISHED,
          salesStatus: EventSalesStatus.NOT_OPEN,
          operationalStage: EventOperationalStage.EM_CONFERENCIA,
          enabledChannels: [],
          auditTrail: appendEventAudit(evt, {
            action: 'MATERIAL_REVISION_APPROVAL_INVALIDATED',
            actor: 'Lucas Andrade (Montador)',
            role: 'TECHNICAL_SUPPORT',
            reason: materialReasonInput,
            before: `v${nextVersion - 1} (${evt.venueName}) — Aceite=${evt.producerApproval?.decision || 'N/A'}`,
            after: `v${nextVersion} (${updatedVenue}) — Aceite Invalidado / Vendas Pausadas`,
          }),
        };
      })
    );
    onNotify?.(
      'Correção material aplicada (Caso 8): Nova versão gerada, aceite anterior invalidado e vendas bloqueadas até nova conferência!'
    );
  };

  // Publicação Omnicanal com Travas Server-Side (Casos 2, 3, 4, 5 e 16)
  const handlePublishOmnichannel = (channels: SalesChannelType[], restrictedLink: boolean) => {
    const bq = activeEvent.blockQuestions;
    if (
      !bq ||
      (bq.hasTechnicalProductionBlocks !== 'SIM' && bq.hasTechnicalProductionBlocks !== 'NAO') ||
      (bq.hasVenueContractualCourtesyBlocks !== 'SIM' && bq.hasVenueContractualCourtesyBlocks !== 'NAO')
    ) {
      onNotify?.(
        'BLOQUEIO CASO 2: Evento sem resposta às duas perguntas obrigatórias de bloqueio não pode publicar!'
      );
      return;
    }

    const sumSectors = activeEvent.sectors.reduce((acc, s) => acc + s.capacity, 0);
    if (sumSectors !== activeEvent.capacity) {
      onNotify?.(
        `BLOQUEIO CASO 5: Soma dos setores (${sumSectors}) incompatível com a capacidade declarada (${activeEvent.capacity})!`
      );
      return;
    }

    const currentVersion = activeEvent.revisionVersion || 1;
    const validReviews = (activeEvent.independentReviews || []).filter(
      (r) => r.revisionVersion === currentVersion && r.decision === 'APPROVED'
    );
    if (validReviews.length < 2) {
      onNotify?.(
        'BLOQUEIO CASO 3: Evento revisado por menos de duas pessoas independentes não pode publicar!'
      );
      return;
    }

    if (
      !activeEvent.producerApproval ||
      activeEvent.producerApproval.decision !== 'APPROVED' ||
      activeEvent.producerApproval.revisionVersion !== currentVersion
    ) {
      onNotify?.(
        'BLOQUEIO CASO 4: Evento sem aceite explícito do produtor na versão atual não pode publicar ou vender!'
      );
      return;
    }

    if (restrictedLink && channels.includes('PDV')) {
      onNotify?.(
        'BLOQUEIO STE.PO.001 (p. 3): Evento restrito somente por link NÃO pode habilitar vendas em PDV físico!'
      );
      return;
    }

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== activeEvent.id) return evt;
        return {
          ...evt,
          publicationStatus: EventPublicationStatus.PUBLISHED,
          salesStatus: EventSalesStatus.OPEN,
          operationalStage: EventOperationalStage.EM_OPERACAO,
          enabledChannels: channels,
          restrictedLinkOnly: restrictedLink,
          auditTrail: appendEventAudit(evt, {
            action: 'EVENT_PUBLISHED_OMNICHANNEL',
            actor: 'Coordenação de Operações',
            role: 'SUPPORT_COORDINATOR',
            reason: `Publicação coordenada nos canais: ${channels.join(', ')}`,
            before: `${evt.publicationStatus} / ${evt.salesStatus}`,
            after: `PUBLISHED / OPEN (${channels.join(', ')})`,
          }),
        };
      })
    );
    onNotify?.(`Evento publicado e vendas liberadas com segurança nos canais: ${channels.join(', ')}!`);
  };

  // Virada Atômica de Lote (Caso 7)
  const handleAtomicLotTurn = (sectorId: string) => {
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== activeEvent.id) return evt;
        const sector = evt.sectors.find((s) => s.id === sectorId);
        if (!sector) return evt;
        const prevLot = sector.activeBatchName;
        const prevPrice = sector.facePrice;
        const nextLot = sector.nextBatchName || `${prevLot} + 1`;
        const nextPrice = sector.nextBatchPrice || roundCurrency(prevPrice * 1.15);
        const nextFee = roundCurrency(nextPrice * 0.15);

        const transitionRecord = {
          id: `ltr-${Date.now()}`,
          eventId: evt.id,
          sectorId: sector.id,
          sectorName: sector.name,
          closedLotId: `closed-${Date.now()}`,
          closedLotName: prevLot,
          previousFacePrice: prevPrice,
          openedLotId: `opened-${Date.now()}`,
          openedLotName: nextLot,
          newFacePrice: nextPrice,
          triggerType: 'MANUAL_SUPORTE' as const,
          requestedByUserId: 'usr-suporte-01',
          approvedByUserId: 'usr-coord-rafael',
          justification: 'Virada atômica sem janela de mistura de preços (STE.PO.003)',
          idempotencyKey: `turn-${evt.id}-${sector.id}-${Date.now()}`,
          transitionedAt: new Date().toISOString(),
        };

        return {
          ...evt,
          sectors: evt.sectors.map((s) =>
            s.id === sectorId
              ? {
                  ...s,
                  activeBatchName: nextLot,
                  facePrice: nextPrice,
                  convenienceFee: nextFee,
                  nextBatchName: 'Lote Extra Homologado',
                  nextBatchPrice: roundCurrency(nextPrice * 1.15),
                }
              : s
          ),
          lotTransitions: [transitionRecord, ...(evt.lotTransitions || [])],
          auditTrail: appendEventAudit(evt, {
            action: 'ATOMIC_LOT_TRANSITION',
            actor: 'Lucas Andrade (Suporte Técnico)',
            role: 'TECHNICAL_SUPPORT',
            reason: `Virada atômica de lote no setor ${sector.name}`,
            before: `${prevLot}: ${formatBRL(prevPrice)}`,
            after: `${nextLot}: ${formatBRL(nextPrice)} (Lote anterior encerrado)`,
          }),
        };
      })
    );
    onNotify?.('Virada atômica de lote concluída (Caso 7): Lote anterior encerrado e novo lote ativado na mesma transação!');
  };

  // Reserva/Venda de Assento no Mapa com proteção contra concorrência (Caso 6)
  const handleToggleSeatSale = (seatCode: string) => {
    const seat = (activeEvent.seatMap || []).find((s) => s.seatCode === seatCode);
    if (!seat) return;

    if (seat.status !== EventSeatStatus.DISPONIVEL) {
      onNotify?.(
        `BLOQUEIO DE CONCORRÊNCIA (Caso 6): O assento ${seatCode} já está ${seat.status} e não permite venda/reserva dupla!`
      );
      return;
    }

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== activeEvent.id) return evt;
        return {
          ...evt,
          seatMap: (evt.seatMap || []).map((s) =>
            s.seatCode === seatCode
              ? { ...s, status: EventSeatStatus.VENDIDO, holderOrderId: `PED-${Math.floor(1000 + Math.random() * 9000)}` }
              : s
          ),
          auditTrail: appendEventAudit(evt, {
            action: 'SEAT_SOLD_ATOMIC',
            actor: 'Checkout / Bilheteria',
            role: 'SALES_ENGINE',
            reason: `Venda atômica do assento ${seatCode}`,
            before: `${seatCode}: DISPONIVEL`,
            after: `${seatCode}: VENDIDO`,
          }),
        };
      })
    );
    onNotify?.(`Assento ${seatCode} vendido com trava transacional anti-concorrência!`);
  };

  // Bloqueio / Liberação de Poltrona no Mapa (STE.PO.003)
  const handleToggleSeatBlockRelease = (seatCode: string) => {
    const seat = (activeEvent.seatMap || []).find((s) => s.seatCode === seatCode);
    if (!seat) return;

    if (seat.status === EventSeatStatus.VENDIDO || seat.status === EventSeatStatus.UTILIZADO) {
      onNotify?.(
        `BLOQUEIO STE.PO.003: O assento ${seatCode} está ${seat.status} para cliente (${seat.holderOrderId || 'Pedido ativo'}) e não pode ser bloqueado!`
      );
      return;
    }

    const nextStatus =
      seat.status === EventSeatStatus.BLOQUEADO
        ? EventSeatStatus.DISPONIVEL
        : EventSeatStatus.BLOQUEADO;

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== activeEvent.id) return evt;
        return {
          ...evt,
          seatMap: (evt.seatMap || []).map((s) =>
            s.seatCode === seatCode ? { ...s, status: nextStatus } : s
          ),
          auditTrail: appendEventAudit(evt, {
            action: nextStatus === EventSeatStatus.BLOQUEADO ? 'SEAT_BLOCKED_STE_PO_003' : 'SEAT_BLOCK_RELEASED_STE_PO_003',
            actor: 'Lucas Andrade (Suporte Técnico)',
            role: 'TECHNICAL_SUPPORT',
            reason:
              nextStatus === EventSeatStatus.BLOQUEADO
                ? `Bloqueio técnico/contratual do assento ${seatCode} no mapa`
                : `Liberação formal do assento ${seatCode} para venda`,
            before: `${seatCode}: ${seat.status}`,
            after: `${seatCode}: ${nextStatus}`,
          }),
        };
      })
    );
    onNotify?.(
      nextStatus === EventSeatStatus.BLOQUEADO
        ? `Assento ${seatCode} BLOQUEADO no mapa (STE.PO.003) e registrado na auditoria!`
        : `Assento ${seatCode} LIBERADO para venda no mapa (STE.PO.003)!`
    );
  };

  // Emissão de Cortesias com Recibo Digital Anexo 1 vinculado ao Borderô (Caso 13)
  const handleIssueCourtesyWithReceipt = () => {
    if (activeEvent.realizationStatus === EventRealizationStatus.CANCELLED) {
      onNotify?.('BLOQUEIO CASO 9: Evento cancelado não permite emissão de cortesias!');
      return;
    }

    const qty = Math.max(1, Number(courtesyQty) || 1);
    const unitFee = courtesyDelivery === 'IMPRESSO_FISICO' ? activeEvent.courtesyPrintingFeePerUnit || 2.5 : 0;
    const totalDebit = roundCurrency(qty * unitFee);
    const startSeq = 900100 + (activeEvent.courtesyBatches?.length || 0) * 100;
    const numbers = Array.from({ length: qty }, (_, i) => formatTicketNumber(startSeq + i));
    const receiptCode = `REC-ANEXO1-${activeEvent.code}-${(activeEvent.receipts?.length || 0) + 1}`;
    const sector = activeEvent.sectors[0];

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== activeEvent.id) return evt;
        const batchId = `crt-${Date.now()}`;
        const receipt = {
          id: `rcp-${Date.now()}`,
          receiptCode,
          courtesyBatchId: batchId,
          eventId: evt.id,
          producerId: evt.producerId,
          quantity: qty,
          ticketRange: `${numbers[0]} a ${numbers[numbers.length - 1]}`,
          printingDebitForBordeau: totalDebit,
          issuerUserId: 'usr-suporte-01',
          issuerName: 'Lucas Andrade (Suporte Técnico)',
          receiverName: courtesyRecipient,
          receiverDocument: courtesyDoc,
          signedAt: new Date().toISOString(),
          signatureHash: `sha256_rcp_${Date.now().toString(16)}`,
          linkedToBordeau: true,
        };
        const batch = {
          id: batchId,
          eventId: evt.id,
          sectorId: sector.id,
          sectorName: sector.name,
          category: 'CORTESIA_NAO_COMERCIALIZAVEL' as const,
          recipientName: courtesyRecipient,
          recipientTaxId: courtesyDoc,
          quantity: qty,
          ticketNumbers: numbers,
          deliveryMode: courtesyDelivery,
          unitPrintingFee: unitFee,
          totalPrintingDebit: totalDebit,
          issuedByUserId: 'usr-suporte-01',
          issuedByName: 'Lucas Andrade',
          issuedAt: new Date().toISOString(),
          receipt,
        };
        return {
          ...evt,
          courtesyBatches: [batch, ...(evt.courtesyBatches || [])],
          receipts: [receipt, ...(evt.receipts || [])],
          auditTrail: appendEventAudit(evt, {
            action: 'COURTESY_BATCH_AND_RECEIPT_ISSUED',
            actor: 'Lucas Andrade',
            role: 'TECHNICAL_SUPPORT',
            reason: `Emissão de ${qty} cortesias (${receiptCode}) vinculadas ao borderô`,
            before: `Cortesias=${evt.courtesyBatches?.length || 0}`,
            after: `${receiptCode}: ${numbers[0]}..${numbers[numbers.length - 1]} (Débito Impressão: ${formatBRL(totalDebit)})`,
          }),
        };
      })
    );
    onNotify?.(
      `Lote de ${qty} cortesias (8 dígitos) e Recibo Digital ${receiptCode} gerados e vinculados ao borderô (Caso 13)!`
    );
  };

  // Registro de Alteração Crítica e Plano de Estorno Supervisionado (STE.PO.002 — Casos 9 e 12)
  const handleRegisterCriticalChange = () => {
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== activeEvent.id) return evt;
        const sampleTickets = evt.ticketsSample.length > 0 ? evt.ticketsSample : [
          {
            id: 'tkt-sim-1',
            eventId: evt.id,
            eventName: evt.name,
            batchId: 'b1',
            batchName: 'Lote 1',
            sectorName: evt.sectors[0]?.name || 'Plateia',
            ticketNumber: '00000101',
            validationHash: 'hash',
            faceValue: evt.sectors[0]?.facePrice || 200,
            convenienceFeeValue: evt.sectors[0]?.convenienceFee || 24,
            totalPaid: (evt.sectors[0]?.facePrice || 200) + (evt.sectors[0]?.convenienceFee || 24),
            buyerName: 'Comprador Homologação',
            buyerTaxId: '123.456.789-00',
            buyerEmail: 'comprador@email.com',
            paymentMethod: 'PIX' as const,
            status: 'ISSUED' as const,
            issuedAt: new Date().toISOString(),
          },
        ];

        const faceSum = roundCurrency(sampleTickets.reduce((a, t) => a + t.faceValue, 0));
        const feeSum = roundCurrency(sampleTickets.reduce((a, t) => a + t.convenienceFeeValue, 0));
        const totalObligation = roundCurrency(faceSum + feeSum);
        const changeId = `chg-${Date.now()}`;

        const changeRecord = {
          id: changeId,
          eventId: evt.id,
          eventName: evt.name,
          producerId: evt.producerId,
          changeType: criticalType,
          reason: criticalReason,
          evidenceDocumentCode: criticalDocCode,
          requestedByUserId: 'usr-coord-rafael',
          requestedByName: 'Rafael Souza (Coordenação)',
          newStartDate: criticalType === 'ADIAMENTO_COM_NOVA_DATA' ? criticalNewDate : undefined,
          newVenueName: criticalType === 'MUDANCA_DE_LOCAL' ? criticalNewVenue : undefined,
          allChannelsSalesSuspended: true,
          ticketContinuityPolicy:
            criticalType === 'CANCELAMENTO'
              ? ('REEMBOLSO_INTEGRAL_INCLUINDO_TAXAS' as const)
              : criticalType === 'MUDANCA_DE_LOCAL'
              ? ('REALOCACAO_DE_MAPA' as const)
              : ('VALIDOS_PARA_NOVA_DATA_COM_OPCAO_REEMBOLSO' as const),
          financialImpact: {
            affectedOrdersCount: sampleTickets.length,
            affectedTicketsCount: sampleTickets.length,
            totalTicketFaceToRefund: faceSum,
            totalServiceFeesToRefund: feeSum,
            totalCustomerRefundObligation: totalObligation,
            producerCustodyBalanceAvailable: evt.grossSales,
            requiresProducerSupplement: Math.max(0, totalObligation - evt.grossSales),
          },
          status: 'ABERTA_CONGELADA' as const,
          createdAt: new Date().toISOString(),
        };

        const newRefundItems = sampleTickets.map((t, idx) => ({
          id: `rfd-${Date.now()}-${idx}`,
          eventId: evt.id,
          changeRequestId: changeId,
          orderId: `PED-${t.ticketNumber}`,
          ticketNumber: t.ticketNumber,
          buyerName: t.buyerName,
          buyerTaxId: t.buyerTaxId,
          buyerEmail: t.buyerEmail,
          paymentMethod: t.paymentMethod,
          acquirerProvider: t.paymentMethod === 'PIX' ? 'PAGARME_PIX' : 'REDE_CREDITO',
          faceAmount: t.faceValue,
          serviceFeeAmount: t.convenienceFeeValue,
          totalRefundAmount: roundCurrency(t.faceValue + t.convenienceFeeValue),
          status: 'SOLICITADO' as const, // Caso 12: Inicia em SOLICITADO, nunca CONCLUIDO direto
        }));

        return {
          ...evt,
          salesStatus: criticalType === 'CANCELAMENTO' ? EventSalesStatus.CLOSED : EventSalesStatus.SUSPENDED,
          realizationStatus:
            criticalType === 'CANCELAMENTO'
              ? EventRealizationStatus.CANCELLED
              : criticalType.startsWith('ADIAMENTO')
              ? EventRealizationStatus.POSTPONED
              : evt.realizationStatus,
          startDate: criticalType === 'ADIAMENTO_COM_NOVA_DATA' ? criticalNewDate : evt.startDate,
          venueName: criticalType === 'MUDANCA_DE_LOCAL' ? criticalNewVenue : evt.venueName,
          enabledChannels: [],
          criticalChanges: [changeRecord, ...(evt.criticalChanges || [])],
          refundPlan: [...newRefundItems, ...(evt.refundPlan || [])],
          auditTrail: appendEventAudit(evt, {
            action: `CRITICAL_CHANGE_${criticalType}`,
            actor: 'Rafael Souza (Coordenação)',
            role: 'SUPPORT_COORDINATOR',
            reason: criticalReason,
            before: `Vendas=${evt.salesStatus} | Local=${evt.venueName} | Data=${evt.startDate}`,
            after: `Vendas Congeladas Omnicanal | Obrigação Reembolso (Face+Taxas)=${formatBRL(totalObligation)}`,
          }),
        };
      })
    );
    onNotify?.(
      `Alteração crítica (${criticalType}) registrada! Vendas suspensas em todos os canais e plano de estorno supervisionado gerado em estado SOLICITADO (Casos 9 e 12).`
    );
  };

  // Confirmação Supervisionada de Estorno pela Adquirente (Caso 12)
  const handleConfirmSupervisedRefund = (refundId: string, requireConfirm: boolean) => {
    if (requireConfirm && !providerConfirmCode.trim()) {
      onNotify?.(
        'BLOQUEIO CASO 12: Estorno não pode ser marcado como CONCLUIDO sem protocolo real de confirmação da adquirente!'
      );
      return;
    }

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== activeEvent.id) return evt;
        return {
          ...evt,
          refundPlan: (evt.refundPlan || []).map((r) =>
            r.id === refundId
              ? {
                  ...r,
                  status: requireConfirm ? 'CONCLUIDO' : 'AGUARDANDO_ADQUIRENTE',
                  externalProviderConfirmationId: requireConfirm ? providerConfirmCode.trim() : undefined,
                  completedAt: requireConfirm ? new Date().toISOString() : undefined,
                }
              : r
          ),
        };
      })
    );
    onNotify?.(
      requireConfirm
        ? `Estorno confirmado com protocolo externo da adquirente (${providerConfirmCode})!`
        : 'Estorno autorizado pelo Financeiro e movido para AGUARDANDO_ADQUIRENTE (sem execução bancária automática na Fase 1).'
    );
  };

  // Validação e Prévia de Comunicado Oficial (Casos 10 e 11)
  const handlePreviewCommunication = () => {
    const tpl = officialCommunicationTemplatesSeed.find((t) => t.id === commTemplateId);
    if (!tpl) return;

    // Caso 10: Proíbe usar template de cancelamento em adiamento ou mudança de local
    if (tpl.category !== commChangeType) {
      onNotify?.(
        `BLOQUEIO CASO 10: A ocorrência "${commChangeType}" NÃO permite usar template de "${tpl.category}"! Selecione o modelo específico revisado.`
      );
      return;
    }

    // Caso 11: Busca tarifa exclusivamente na tabela versionada vigente
    const pricing = officialCommunicationPricingSeed.find(
      (p) => p.versionCode === commPricingCode && p.purpose === commPurpose && p.isActive
    );
    if (!pricing) {
      onNotify?.(
        `BLOQUEIO CASO 11: A tabela "${commPricingCode}" não corresponde à finalidade "${commPurpose}". Selecione a tabela contratual correta!`
      );
      return;
    }

    const contactsList = commContactsRaw
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
    const dedupCount = new Set(contactsList).size;
    const totalCost = roundCurrency(dedupCount * pricing.unitPriceBrl);

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== activeEvent.id) return evt;
        const dispatch = {
          id: `comm-${Date.now()}`,
          eventId: evt.id,
          changeType: commChangeType,
          templateId: tpl.id,
          templateCategory: tpl.category,
          channel: tpl.channel,
          purpose: commPurpose,
          pricingVersionCode: pricing.versionCode,
          unitCostApplied: pricing.unitPriceBrl,
          rawOrdersCount: contactsList.length,
          deduplicatedRecipientsCount: dedupCount,
          estimatedTotalCost: totalCost,
          costResponsibility: commCostResp,
          financialApproved: totalCost === 0,
          status: 'PREVIA_ORCAMENTO' as const,
          createdAt: new Date().toISOString(),
        };
        return {
          ...evt,
          communications: [dispatch, ...(evt.communications || [])],
          auditTrail: appendEventAudit(evt, {
            action: 'COMMUNICATION_VALIDATED_AND_BUDGETED',
            actor: 'Comunicação & SAC',
            role: 'SAC_MARKETING',
            reason: `Disparo validado (${tpl.code}) — Tabela ${pricing.versionCode}`,
            before: `Pedidos Brutos=${contactsList.length}`,
            after: `Contatos Únicos LGPD=${dedupCount} × ${formatBRL(pricing.unitPriceBrl)} = ${formatBRL(totalCost)}`,
          }),
        };
      })
    );
    onNotify?.(
      `Comunicado validado (Casos 10 e 11): ${dedupCount} contatos únicos deduplicados × ${formatBRL(
        pricing.unitPriceBrl
      )} (${pricing.versionCode}) = ${formatBRL(totalCost)}!`
    );
  };

  // Criação de Novo Evento Operacional (Caso 15: inicia sem nenhum saldo financeiro fictício)
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
      venuePermitCapacity: capacityNum,
      // Caso 15: Zero vendas e zero saldos fictícios ao criar evento operacional
      totalSold: 0,
      grossSales: 0,
      convenienceRevenue: 0,
      approvalStatus: EventApprovalStatus.DRAFT,
      publicationStatus: EventPublicationStatus.UNPUBLISHED,
      salesStatus: EventSalesStatus.NOT_OPEN,
      realizationStatus: EventRealizationStatus.SCHEDULED,
      operationalStage: EventOperationalStage.EM_MONTAGEM,
      assembledByUserId: 'usr-montador-lucas',
      assembledByName: 'Lucas Andrade (Suporte Técnico)',
      revisionVersion: 1,
      revisionHash: `sha256_v1_${Date.now().toString(16)}`,
      courtesyPrintingFeePerUnit: 2.5,
      enabledChannels: [],
      restrictedLinkOnly: false,
      blockQuestions: {
        hasTechnicalProductionBlocks: null,
        hasVenueContractualCourtesyBlocks: null,
      },
      independentReviews: [],
      artworks: defaultArtworkChecklist2026,
      sectors: [
        {
          id: `sec-${Date.now()}`,
          name: newSectorName,
          capacity: capacityNum,
          hasNumberedSeats: true,
          mapSeatCount: capacityNum,
          soldCount: 0,
          facePrice: facePriceNum,
          convenienceFee: feeNum,
          activeBatchName: 'Lote 1 (Inicial)',
          nextBatchName: 'Lote 2',
          nextBatchPrice: roundCurrency(facePriceNum * 1.2),
        },
      ],
      ticketsSample: [],
      auditTrail: [
        {
          id: `aud-init-${Date.now()}`,
          action: 'EVENT_CREATED_CLEAN_OPERATIONAL_BASE',
          actor: 'Lucas Andrade',
          role: 'TECHNICAL_SUPPORT',
          reason: 'Abertura inicial do evento sem dados financeiros fictícios (Caso 15)',
          before: 'N/A',
          after: 'EM_MONTAGEM (v1)',
          timestamp: new Date().toISOString(),
          hash: `sha256_init_${Date.now().toString(16)}`,
        },
      ],
    };

    setEvents([newEvent, ...events]);
    setSelectedEventId(newEvent.id);
    onNotify?.(`Evento ${newEvent.code} criado na etapa EM_MONTAGEM com base financeira limpa (Caso 15)!`);
    setActiveTab('event_states');
  };

  const isProducerView = viewerScope !== 'INTERNAL_DISK';

  return (
    <div className="space-y-6">
      {/* Cabeçalho Oficial da Central de Operação de Eventos Ponta a Ponta */}
      <PageHeader
        title="Central de Operação de Eventos Ponta a Ponta (DELDA_1 / DiskIngressos)"
        subtitle="Solicitação → Montagem (STE.IT.001) → Dupla Conferência Independente (STE.PO.001) → Aceite do Produtor → Publicação Omnicanal → Suporte & Cortesias (STE.PO.003) → Alterações Críticas & Estornos (STE.PO.002)"
        badge="Pacotes 00 a 07 Ativos"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Escopo / Segregação de Função (Caso 1) */}
            <select
              value={viewerScope}
              onChange={(e) => setViewerScope(e.target.value as any)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              title="Simular segregação de funções (Caso 1: Produtor só vê seus eventos e não vê dados internos da Disk)"
            >
              <option value="INTERNAL_DISK">🛡️ Visão Interna: Operações & Financeiro Disk</option>
              <option value="PRODUCER_PROD01">👤 Visão Produtor: Live Nation Brasil (Restrito)</option>
              <option value="PRODUCER_PROD02">👤 Visão Produtor: Opus Entretenimento (Restrito)</option>
            </select>

            <button
              onClick={() => setActiveTab('new_event')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-2"
            >
              <span>+ Nova Abertura de Evento</span>
            </button>
          </div>
        }
      />

      {/* Seletor Global do Evento em Operação */}
      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono font-black text-[10px]">
              {activeEvent.code}
            </span>
            <span className="font-black text-sm text-slate-900 dark:text-white">{activeEvent.name}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              Etapa: {activeEvent.operationalStage || EventOperationalStage.EM_OPERACAO}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Revisão v{activeEvent.revisionVersion || 1}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Produtor: <strong>{activeEvent.producerName}</strong> • Local: <strong>{activeEvent.venueName}</strong> ({activeEvent.venueCity}) • Data: <strong>{activeEvent.startDate}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="font-bold text-slate-600 dark:text-slate-300">Evento Ativo:</label>
          <select
            value={activeEvent.id}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
          >
            {scopedEvents.map((e) => (
              <option key={e.id} value={e.id}>
                {e.code} — {e.name} ({e.producerName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navegação das 8 Áreas da Central de Operação de Eventos */}
      <SubModuleTabs<EventsTab>
        tabs={[
          { id: 'events', label: '1. Painel Operacional & Catálogo', badge: scopedEvents.length },
          { id: 'intake_assembly', label: '2. Solicitações, Montagem & Artes', badge: intakes.length },
          { id: 'event_states', label: '3. Dupla Conferência, Produtor & Canais' },
          { id: 'sectors_inventory', label: '4. Setores, Mapas & Virada de Lote' },
          { id: 'tickets', label: '5. Ingressos (8 Dígitos), Cortesias & Portaria', badge: allTickets.length },
          { id: 'critical_changes', label: '6. Alterações Críticas & Estornos', badge: activeEvent.criticalChanges?.length || 0 },
          { id: 'communications_dossier', label: '7. Comunicados, Dossiê & Auditoria', badge: activeEvent.auditTrail?.length || 0 },
          { id: 'new_event', label: '8. + Abrir Evento' },
        ]}
        activeTab={activeTab}
        onSelect={setActiveTab}
      />

      {/* ABA 1: PAINEL OPERACIONAL & CATÁLOGO */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Eventos no Escopo"
              value={totalEventos}
              subtitle={isProducerView ? 'Filtrado pelo Produtor Autenticado (Caso 1)' : 'Grade completa DiskIngressos'}
              tone="indigo"
              badge="Escopo RBAC"
            />
            <KpiCard
              title="Ingressos Emitidos"
              value={totalIngressosVendidos.toLocaleString('pt-BR')}
              subtitle="Padrão 8 dígitos + QR HMAC-SHA256"
              tone="emerald"
              badge="Bilheteria"
            />
            <KpiCard
              title="Arrecadação Valor de Face"
              value={formatBRL(faturamentoTotalFace)}
              subtitle="Custódia vinculada ao borderô do evento"
              tone="cyan"
              badge="Borderô"
            />
            <KpiCard
              title="Ocupação Média Física"
              value={`${lotacaoGeralPct}%`}
              subtitle="Validada contra alvará e mapa"
              tone="violet"
              badge="Lotação"
            />
          </div>

          {/* Card Exclusivo Interno da DiskIngressos (Oculto para Produtor — Caso 1) */}
          {!isProducerView && activeEvent.internalDiskFinancials ? (
            <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    Confidencial Financeiro DiskIngressos (Oculto para Produtor — Caso 1)
                  </span>
                  <h4 className="text-sm font-bold mt-1">
                    Demonstrativo Interno de Taxas, MDR Adquirente e Conta de Custódia — {activeEvent.name}
                  </h4>
                </div>
                <span className="font-mono text-xs text-slate-400">
                  {activeEvent.internalDiskFinancials.custodyBankAccount}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-slate-400">Taxa Contratual do Evento:</span>
                  <p className="text-base font-black text-indigo-300 mt-0.5">
                    {activeEvent.internalDiskFinancials.internalServiceFeePct}%
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-slate-400">Custo MDR Adquirente (Interno):</span>
                  <p className="text-base font-black text-rose-300 mt-0.5">
                    {formatBRL(activeEvent.internalDiskFinancials.acquirerMdrFeeTotal)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-slate-400">Margem Líquida Própria DiskIngressos:</span>
                  <p className="text-base font-black text-emerald-300 mt-0.5">
                    {formatBRL(activeEvent.internalDiskFinancials.diskNetMarginBrl)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
              🔒 <strong>Modo Portal do Produtor Ativo (Caso de Aceitação 1):</strong> Você visualiza exclusivamente os eventos da sua produtora e todos os dados internos da DiskIngressos (margem líquida, MDR, contas bancárias internas) foram suprimidos pela camada de segurança.
            </div>
          )}

          {/* Tabela de Eventos */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <input
                type="text"
                placeholder="Buscar por código, atração, produtor ou local..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
              <div className="flex items-center gap-2">
                <select
                  value={approvalFilter}
                  onChange={(e) => setApprovalFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <option value="ALL">Aprovação: Todas</option>
                  <option value="APPROVED">Aprovados</option>
                  <option value="UNDER_REVIEW">Em Conferência</option>
                  <option value="DRAFT">Rascunho</option>
                </select>
                <select
                  value={salesFilter}
                  onChange={(e) => setSalesFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <option value="ALL">Vendas: Todas</option>
                  <option value="OPEN">Abertas</option>
                  <option value="NOT_OPEN">Não Abertas</option>
                  <option value="SUSPENDED">Suspensas</option>
                  <option value="CLOSED">Encerradas</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500">
                    <th className="py-3 px-3">Código / Evento</th>
                    <th className="py-3 px-3">Produtor / Local</th>
                    <th className="py-3 px-3">Etapa Workflow</th>
                    <th className="py-3 px-3 text-center">Conferências (2x)</th>
                    <th className="py-3 px-3 text-center">Aceite Produtor</th>
                    <th className="py-3 px-3 text-center">Canais / Vendas</th>
                    <th className="py-3 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEvents.map((evt) => {
                    const revCount = (evt.independentReviews || []).filter(
                      (r) => r.revisionVersion === (evt.revisionVersion || 1) && r.decision === 'APPROVED'
                    ).length;
                    return (
                      <tr key={evt.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3">
                          <span className="font-mono text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                            {evt.code} (v{evt.revisionVersion || 1})
                          </span>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{evt.name}</p>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{evt.producerName}</p>
                          <p className="text-[10px] text-slate-400">{evt.venueName} • {evt.startDate}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {evt.operationalStage || EventOperationalStage.EM_OPERACAO}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              revCount >= 2
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {revCount}/2 Assinadas
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              evt.producerApproval?.decision === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {evt.producerApproval?.decision === 'APPROVED' ? 'Aceite OK' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-[10px] font-bold">
                            {evt.salesStatus} ({(evt.enabledChannels || []).join(', ') || 'Nenhum'})
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedEventId(evt.id);
                              setActiveTab('event_states');
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                          >
                            Operar Evento →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: SOLICITAÇÕES, MONTAGEM (STE.IT.001), PERGUNTAS DE BLOQUEIO & ARTES 2026 */}
      {activeTab === 'intake_assembly' && (
        <div className="space-y-6">
          {/* Perguntas Obrigatórias de Bloqueios (STE.IT.001, p. 8 — Caso 2) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                  Perguntas Obrigatórias de Bloqueios antes da Publicação (STE.IT.001, p. 8 — Caso 2)
                </h3>
                <p className="text-xs text-slate-500">
                  O evento NÃO pode ser publicado se qualquer uma das duas perguntas abaixo estiver sem resposta explícita (SIM ou NÃO).
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Status Atual: {activeEvent.blockQuestions?.hasTechnicalProductionBlocks ? 'Respondido' : 'Pendente'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  1. Existem bloqueios técnicos / reservas de produção para o evento?
                </label>
                <select
                  value={techBlockAnswer}
                  onChange={(e) => setTechBlockAnswer(e.target.value as 'SIM' | 'NAO')}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                >
                  <option value="SIM">SIM (Detalhar assentos/quantidades abaixo)</option>
                  <option value="NAO">NÃO (Sem reservas técnicas)</option>
                </select>
                {techBlockAnswer === 'SIM' && (
                  <input
                    type="text"
                    value={techBlockDetail}
                    onChange={(e) => setTechBlockDetail(e.target.value)}
                    placeholder="Detalhe os assentos/setores bloqueados para produção..."
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                  />
                )}
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  2. Existem bloqueios contratuais para cortesias do espaço/teatro?
                </label>
                <select
                  value={venueBlockAnswer}
                  onChange={(e) => setVenueBlockAnswer(e.target.value as 'SIM' | 'NAO')}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                >
                  <option value="NAO">NÃO (Sem retenção contratual do espaço)</option>
                  <option value="SIM">SIM (Detalhar cláusula e poltronas abaixo)</option>
                </select>
                {venueBlockAnswer === 'SIM' && (
                  <input
                    type="text"
                    value={venueBlockDetail}
                    onChange={(e) => setVenueBlockDetail(e.target.value)}
                    placeholder="Detalhe a quantidade/filas retidas pelo espaço..."
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveBlockQuestions}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Salvar Respostas Obrigatórias de Bloqueios
              </button>
            </div>
          </div>

          {/* Correção Material Pós-Aprovação (Caso 8) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
              Revisão Material da Montagem (Caso 8 — Invalida Aceite Anterior e Reabre Conferência)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold block mb-1">Novo Local / Arena (Opcional)</label>
                <input
                  type="text"
                  value={materialVenueInput}
                  onChange={(e) => setMaterialVenueInput(e.target.value)}
                  placeholder={activeEvent.venueName}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Nova Taxa de Conveniência R$ (Opcional)</label>
                <input
                  type="number"
                  value={materialFeeInput}
                  onChange={(e) => setMaterialFeeInput(e.target.value)}
                  placeholder={String(activeEvent.sectors[0]?.convenienceFee || 27)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Motivo da Revisão Material</label>
                <input
                  type="text"
                  value={materialReasonInput}
                  onChange={(e) => setMaterialReasonInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleApplyMaterialCorrection}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700"
              >
                Gerar Nova Revisão (v{(activeEvent.revisionVersion || 1) + 1}) e Reabrir Conferência
              </button>
            </div>
          </div>

          {/* Biblioteca e Validador de Artes 2026 (Seção 5.8) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
              Ficha Técnica de Artes & Formatos Documentados 2026 (Seção 5.8)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {(activeEvent.artworks || defaultArtworkChecklist2026).map((art) => (
                <div
                  key={art.assetType}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{art.label}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{art.documentedDimensions}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {art.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: DUPLA CONFERÊNCIA INDEPENDENTE, ACEITE DO PRODUTOR & PUBLICAÇÃO OMNICANAL */}
      {activeTab === 'event_states' && (
        <div className="space-y-6">
          {/* Painel de Dupla Conferência Independente (Caso 3) e Aceite do Produtor (Caso 4) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                    Dupla Conferência Independente (STE.PO.001, p. 3 — Caso 3)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Montador Responsável: <strong>{activeEvent.assembledByName || 'Lucas Andrade'}</strong> (<code className="font-mono">{activeEvent.assembledByUserId || 'usr-montador-lucas'}</code>)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {(activeEvent.independentReviews || []).map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-black text-emerald-700 dark:text-emerald-300">
                        {rev.reviewerOrder}ª Conferência Aprovada (v{rev.revisionVersion}):
                      </span>{' '}
                      <strong>{rev.reviewerName}</strong>
                      <p className="text-[11px] text-slate-500">{rev.notes}</p>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{rev.signatureHash.slice(0, 12)}...</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                <p className="font-bold">Assinar Conferência na Revisão v{activeEvent.revisionVersion || 1}:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={reviewerIdInput}
                    onChange={(e) => {
                      setReviewerIdInput(e.target.value);
                      if (e.target.value === 'usr-montador-lucas') {
                        setReviewerNameInput('Lucas Andrade (Montador — Testar Bloqueio)');
                      } else if (e.target.value === 'usr-conferente-mariana') {
                        setReviewerNameInput('Mariana Costa (1º Conferente)');
                      } else {
                        setReviewerNameInput('Rafael Souza (2º Conferente Independente)');
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold"
                  >
                    <option value="usr-coord-rafael">Rafael Souza (2º Conferente Independente)</option>
                    <option value="usr-conferente-mariana">Mariana Costa (1º Conferente Independente)</option>
                    <option value="usr-montador-lucas">Lucas Andrade (Montador — Testa Bloqueio Auto-Revisão)</option>
                  </select>
                  <input
                    type="text"
                    value={reviewNotesInput}
                    onChange={(e) => setReviewNotesInput(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <button
                  onClick={handleSubmitIndependentReview}
                  className="w-full py-2 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Assinar Conferência Independente (SHA-256)
                </button>
              </div>
            </div>

            {/* Aceite Explícito do Produtor e Publicação Coordenada (Casos 4, 5 e 16) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                Aceite do Produtor & Liberação Omnicanal de Vendas (Casos 4, 5 e 16)
              </h3>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Aceite do Produtor (v{activeEvent.revisionVersion || 1}):</span>
                  <span className="font-black text-indigo-600">
                    {activeEvent.producerApproval?.decision === 'APPROVED'
                      ? `APROVADO por ${activeEvent.producerApproval.producerUserName}`
                      : 'PENDENTE DE ACEITE'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Perguntas de Bloqueio (STE.IT.001):</span>
                  <span className="font-bold">
                    Técnico={activeEvent.blockQuestions?.hasTechnicalProductionBlocks || 'Pendente'} | Espaço=
                    {activeEvent.blockQuestions?.hasVenueContractualCourtesyBlocks || 'Pendente'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Validação Capacidade Setores × Declaração:</span>
                  <span className="font-bold text-emerald-600">
                    {activeEvent.sectors.reduce((a, s) => a + s.capacity, 0).toLocaleString()} /{' '}
                    {activeEvent.capacity.toLocaleString()} lugares
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleProducerApproval}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  1. Registrar Aceite Explícito do Produtor (v{activeEvent.revisionVersion || 1})
                </button>
                <button
                  onClick={() => handlePublishOmnichannel(['SITE', 'APP', 'PDV'], false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  2. Publicar e Abrir Vendas (Site + App + PDV)
                </button>
                <button
                  onClick={() => handlePublishOmnichannel(['RESTRICTED_LINK'], true)}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700"
                >
                  Publicar Somente por Link (Bloqueia PDV — STE.PO.001)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: SETORES, MAPA DE ASSENTOS, BLOQUEIOS & VIRADA ATÔMICA DE LOTE */}
      {activeTab === 'sectors_inventory' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
              Setores, Capacidades e Virada Atômica de Lote sem Janela de Preço Misturado (Casos 5 e 7)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeEvent.sectors.map((sec) => (
                <div
                  key={sec.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 text-xs"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white">{sec.name}</h4>
                      <span className="text-[11px] text-indigo-600 font-bold">Ativo: {sec.activeBatchName}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded font-black bg-emerald-50 text-emerald-700">
                      {formatBRL(sec.facePrice)} + {formatBRL(sec.convenienceFee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Vendido: {sec.soldCount.toLocaleString()}</span>
                    <span>Capacidade Mapa: {sec.capacity.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => handleAtomicLotTurn(sec.id)}
                    className="w-full py-2 rounded-lg font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    ⚡ Executar Virada Atômica de Lote → {sec.nextBatchName || 'Próximo Lote'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Simulador de Concorrência e Bloqueio/Liberação de Assento no Mapa (Caso 6 & STE.PO.003) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
              Mapa Interativo de Assentos Numerados — Venda Concorrente (Caso 6) & Bloqueio/Liberação (STE.PO.003)
            </h3>
            <p className="text-xs text-slate-500">
              Clique em <strong>Vender</strong> para testar a trava atômica anti-concorrência (Caso 6) ou em <strong>Bloquear/Liberar</strong> para simular bloqueios técnicos e liberações no mapa (<code className="font-mono">STE.PO.003</code>).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(activeEvent.seatMap || [
                { seatCode: 'CAM-A01', sectorId: 'sec-03', sectorName: 'Camarote', status: EventSeatStatus.VENDIDO },
                { seatCode: 'CAM-A02', sectorId: 'sec-03', sectorName: 'Camarote', status: EventSeatStatus.DISPONIVEL },
                { seatCode: 'CAM-A03', sectorId: 'sec-03', sectorName: 'Camarote', status: EventSeatStatus.DISPONIVEL },
                { seatCode: 'CAM-A04', sectorId: 'sec-03', sectorName: 'Camarote', status: EventSeatStatus.BLOQUEADO },
              ]).map((seat) => (
                <div
                  key={seat.seatCode}
                  className={`p-3 rounded-xl text-xs font-mono border transition-all space-y-2 ${
                    seat.status === EventSeatStatus.DISPONIVEL
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
                      : seat.status === EventSeatStatus.VENDIDO
                      ? 'bg-rose-50/70 border-rose-300 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200'
                      : 'bg-amber-50/70 border-amber-300 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-black">
                    <span>{seat.seatCode}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/80">
                      {seat.status}
                    </span>
                  </div>
                  <div className="flex gap-1.5 font-sans">
                    <button
                      onClick={() => handleToggleSeatSale(seat.seatCode)}
                      className="flex-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Vender (Caso 6)
                    </button>
                    <button
                      onClick={() => handleToggleSeatBlockRelease(seat.seatCode)}
                      className="flex-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-white hover:bg-slate-700"
                    >
                      {seat.status === EventSeatStatus.BLOQUEADO ? 'Liberar' : 'Bloquear'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 5: INGRESSOS (8 DÍGITOS), CORTESIAS & RECIBO ANEXO 1 (STE.PO.003 — CASO 13) */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
              Emissão de Cortesias e Recibo Digital Anexo 1 Vinculado ao Borderô (STE.PO.003 — Caso 13)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Recebedor / Representante</label>
                <input
                  type="text"
                  value={courtesyRecipient}
                  onChange={(e) => setCourtesyRecipient(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">CPF / CNPJ Recebedor</label>
                <input
                  type="text"
                  value={courtesyDoc}
                  onChange={(e) => setCourtesyDoc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Quantidade de Cortesias</label>
                <input
                  type="number"
                  value={courtesyQty}
                  onChange={(e) => setCourtesyQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Modalidade (Tarifa Contratual)</label>
                <select
                  value={courtesyDelivery}
                  onChange={(e) => setCourtesyDelivery(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                >
                  <option value="IMPRESSO_FISICO">
                    Impresso Físico ({formatBRL(activeEvent.courtesyPrintingFeePerUnit || 2.5)}/un no Borderô)
                  </option>
                  <option value="E_TICKET_PDF">E-Ticket PDF Digital (R$ 0,00)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleIssueCourtesyWithReceipt}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Emitir Cortesias (8 Dígitos) + Gerar Recibo Assinado Anexo 1
              </button>
            </div>

            {(activeEvent.receipts || []).length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-xs font-bold text-slate-500">Recibos Digitais Emitidos e Vinculados ao Borderô:</p>
                {(activeEvent.receipts || []).map((rcp) => (
                  <div
                    key={rcp.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs flex flex-wrap justify-between items-center gap-2"
                  >
                    <div>
                      <span className="font-mono font-black text-indigo-600">{rcp.receiptCode}</span> •{' '}
                      <strong>{rcp.quantity} cortesias</strong> ( Numeração: <code className="font-mono">{rcp.ticketRange}</code> )
                      <p className="text-[11px] text-slate-500">
                        Emissor: {rcp.issuerName} • Recebedor: {rcp.receiverName} ({rcp.receiverDocument})
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                        Débito Borderô: {formatBRL(rcp.printingDebitForBordeau)}
                      </span>
                      <p className="font-mono text-[10px] text-slate-400 mt-0.5">Assinatura: {rcp.signatureHash.slice(0, 16)}...</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cards de Ingressos 8 Dígitos */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                Ingressos Emitidos (Padrão 8 Dígitos + QR Code HMAC-SHA256) & Dimensionamento Portaria
              </h3>
              <span className="text-xs font-bold text-indigo-600">
                Recomendação STE.PO.003 (~1 leitor/300 pessoas):{' '}
                {Math.max(1, Math.ceil(activeEvent.capacity / 300))} coletores homologados
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {allTickets.map((tkt: DiskIngressosTicketItem) => (
                <div
                  key={tkt.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-base font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 rounded">
                      Nº {tkt.ticketNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">{tkt.status}</span>
                  </div>
                  <p className="font-bold">{tkt.eventName}</p>
                  <p className="text-slate-500">
                    {tkt.buyerName} ({tkt.buyerTaxId}) • Total: <strong>{formatBRL(tkt.totalPaid)}</strong>
                  </p>
                  <p className="font-mono text-[10px] text-slate-400 truncate">QR Hash: {tkt.validationHash}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 6: CENTRAL DE ALTERAÇÕES CRÍTICAS & ESTORNO SUPERVISIONADO (STE.PO.002 — CASOS 9 e 12) */}
      {activeTab === 'critical_changes' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
              Central de Alterações Críticas (STE.PO.002 — Cancelamento, Adiamento e Mudança de Local)
            </h3>
            <p className="text-xs text-slate-500">
              Congela imediatamente novas vendas em todos os canais (Site, PDV, App e APIs), apura a obrigação integral de devolução (incluindo taxas de conveniência no cancelamento) e gera o plano de estornos supervisionado sem execução bancária automática na Fase 1.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Tipo de Alteração Crítica</label>
                <select
                  value={criticalType}
                  onChange={(e) => setCriticalType(e.target.value as CriticalChangeType)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                >
                  <option value="CANCELAMENTO">Cancelamento Oficial (Reembolso Integral + Taxas)</option>
                  <option value="ADIAMENTO_COM_NOVA_DATA">Adiamento com Nova Data Definida</option>
                  <option value="ADIAMENTO_SEM_DATA">Adiamento sem Data (Congela Vendas)</option>
                  <option value="MUDANCA_DE_LOCAL">Mudança de Local / Arena</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Documento / Ofício Comprobatório</label>
                <input
                  type="text"
                  value={criticalDocCode}
                  onChange={(e) => setCriticalDocCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Nova Data / Novo Local (Se aplicável)</label>
                <input
                  type="text"
                  value={criticalType === 'MUDANCA_DE_LOCAL' ? criticalNewVenue : criticalNewDate}
                  onChange={(e) =>
                    criticalType === 'MUDANCA_DE_LOCAL'
                      ? setCriticalNewVenue(e.target.value)
                      : setCriticalNewDate(e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Justificativa Formal</label>
                <input
                  type="text"
                  value={criticalReason}
                  onChange={(e) => setCriticalReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleRegisterCriticalChange}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700"
              >
                Acionar Congelamento Omnicanal e Gerar Plano de Reembolso Supervisionado
              </button>
            </div>
          </div>

          {/* Plano de Estornos Supervisionado (Caso 12) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                  Plano de Estornos Supervisionado (Caso 12 — Exige Confirmação Externa da Adquirente)
                </h3>
                <p className="text-xs text-slate-500">
                  Nenhum estorno nasce como CONCLUIDO. A conclusão exige o código de liquidação/estorno retornado pelo provedor de pagamento.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold">Protocolo Adquirente:</span>
                <input
                  type="text"
                  value={providerConfirmCode}
                  onChange={(e) => setProviderConfirmCode(e.target.value)}
                  placeholder="Protocolo E2E/NSU..."
                  className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>
            </div>

            {(activeEvent.refundPlan || []).length === 0 ? (
              <p className="text-xs text-slate-400">
                Nenhum plano de estorno ativo para este evento. Registre uma alteração crítica acima para simular.
              </p>
            ) : (
              <div className="space-y-2">
                {(activeEvent.refundPlan || []).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-indigo-600">Ingresso Nº {item.ticketNumber}</span> •{' '}
                      <strong>{item.buyerName}</strong> ({item.paymentMethod} / {item.acquirerProvider})
                      <p className="text-[11px] text-slate-500">
                        Face: {formatBRL(item.faceAmount)} + Taxa Conveniência: {formatBRL(item.serviceFeeAmount)} ={' '}
                        <strong className="text-emerald-600">Total a Devolver: {formatBRL(item.totalRefundAmount)}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full font-black text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                        Status: {item.status}
                      </span>
                      {item.status !== 'CONCLUIDO' && (
                        <>
                          <button
                            onClick={() => handleConfirmSupervisedRefund(item.id, false)}
                            className="px-2.5 py-1 rounded-lg font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          >
                            Autorizar Financeiro
                          </button>
                          <button
                            onClick={() => handleConfirmSupervisedRefund(item.id, true)}
                            className="px-2.5 py-1 rounded-lg font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Confirmar Retorno Adquirente → CONCLUIDO
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 7: COMUNICADOS VERSIONADOS, DOSSIÊ DIGITAL & AUDITORIA (CASOS 10, 11 e 14) */}
      {activeTab === 'communications_dossier' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
              Comunicados Oficiais por Motivo & Orçamento por Tabela Versionada (Casos 10 e 11)
            </h3>
            <p className="text-xs text-slate-500">
              Impede envio de texto de cancelamento em ocorrências de adiamento/mudança de local e calcula o orçamento de WhatsApp exclusivamente pela tabela contratual vigente sobre contatos deduplicados (LGPD).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Ocorrência do Evento</label>
                <select
                  value={commChangeType}
                  onChange={(e) => setCommChangeType(e.target.value as CriticalChangeType)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                >
                  <option value="ADIAMENTO_COM_NOVA_DATA">Adiamento com Nova Data</option>
                  <option value="ADIAMENTO_SEM_DATA">Adiamento sem Data</option>
                  <option value="MUDANCA_DE_LOCAL">Mudança de Local</option>
                  <option value="CANCELAMENTO">Cancelamento Oficial</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Template Oficial Revisado (Caso 10)</label>
                <select
                  value={commTemplateId}
                  onChange={(e) => setCommTemplateId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                >
                  {officialCommunicationTemplatesSeed.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.category}] {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Tabela de Preço Versionada (Caso 11)</label>
                <select
                  value={commPricingCode}
                  onChange={(e) => {
                    setCommPricingCode(e.target.value);
                    const found = officialCommunicationPricingSeed.find((p) => p.versionCode === e.target.value);
                    if (found) setCommPurpose(found.purpose);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                >
                  {officialCommunicationPricingSeed.map((p) => (
                    <option key={p.id} value={p.versionCode}>
                      {p.versionCode} — {formatBRL(p.unitPriceBrl)}/contato ({p.purpose})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="font-bold block mb-1">
                  Contatos de Pedidos Reais (Simulação de Deduplicação LGPD por Contato)
                </label>
                <input
                  type="text"
                  value={commContactsRaw}
                  onChange={(e) => setCommContactsRaw(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Responsável pelo Custo</label>
                <select
                  value={commCostResp}
                  onChange={(e) => setCommCostResp(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                >
                  <option value="PRODUTOR_BORDERO">Abater no Borderô do Produtor</option>
                  <option value="PRODUTOR_PIX">Cobrança PIX Antecipada Produtor</option>
                  <option value="CUSTEIO_DISKINGRESSOS">Custeio Operacional DiskIngressos</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handlePreviewCommunication}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Validar Template (Caso 10) e Calcular Orçamento Deduplicado (Caso 11)
              </button>
            </div>
          </div>

          {/* Trilha de Auditoria Imutável Antes/Depois (Caso 14) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
              Dossiê Digital & Trilha de Auditoria Imutável Antes/Depois (Caso 14)
            </h3>
            <div className="space-y-2">
              {(activeEvent.auditTrail || []).map((aud) => (
                <div
                  key={aud.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-indigo-600">{aud.action}</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {aud.timestamp} • Hash: {aud.hash.slice(0, 16)}...
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Autor: {aud.actor} ({aud.role}) — Motivo: {aud.reason}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500">
                    <strong>Antes:</strong> {aud.before} → <strong>Depois:</strong> {aud.after}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 8: CADASTRO DE NOVO EVENTO (CASO 15 — BASE FINANCEIRA LIMPA) */}
      {activeTab === 'new_event' && (
        <form
          onSubmit={handleCreateEvent}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5"
        >
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Abrir Novo Evento na Esteira Operacional (STE.PO.001 / Caso 15)
            </h3>
            <p className="text-xs text-slate-500">
              O evento nasce em <strong>EM_MONTAGEM (v1)</strong>, com vendas bloqueadas em todos os canais e saldos financeiros estritamente zerados (sem dados fictícios).
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
                Capacidade Declarada / Mapa
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
                Taxa de Conveniência Contratual (R$)
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
              Criar Evento na Etapa EM_MONTAGEM (Saldos Zerados)
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
