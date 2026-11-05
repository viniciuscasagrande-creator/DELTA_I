# DELDA_1 — Diagnóstico Arquitetural e Implementação da Central de Operação de Eventos Ponta a Ponta

## 1. Pacote 00 — Diagnóstico e Mapa do Sistema Existente

Durante a inspeção técnica do repositório `E:\DELTA_I` (Disk Ingressos ERP Core), foram identificados e preservados os seguintes alicerces arquiteturais:

- **Banco de Dados e Modelo Prisma (`prisma/schema.prisma`)**:
  - Entidades existentes: `Event`, `EventSector`, `TicketLot`, `IssuedTicket`, `SalesChannel`, `SaleOrder`, `SaleOrderItem`, `PaymentTransaction`, `EventSettlement`, `SettlementDeduction`, `Customer`, `User`, `Role`, `AuditLog` e `DomainEventOutbox`.
  - Dimensões ortogonais já presentes em `Event`: `operationalStatus`, `publicationStatus`, `salesStatus`, `settlementStatus` e `complianceHold`.
- **Contratos Compartilhados (`packages/shared/src/index.ts`)**:
  - Contratos tipados compartilhados entre `apps/api` e `apps/web`, expandidos com os novos contratos operacionais (`EventOperationalStage`, `EventSeatStatus`, `EventMandatoryBlockQuestions`, `EventIndependentReview`, `EventProducerApproval`, `EventRevisionRecord`, `EventSeatBlockRecord`, `TicketCourtesyBatchRecord`, `TicketReceiptRecord`, `LotTransitionRecord`, `CriticalEventChangeRequest`, `SupervisedRefundPlanItem`, `CustomerCommunicationDispatch`, `OfficialCommunicationTemplate`, `EventArtworkSpecification`).
- **Módulo Backend de Eventos (`apps/api/src/modules/events/services/events.service.ts` e `apps/api/src/main.ts`)**:
  - Evoluído incrementalmente sem criar um segundo Core paralelo, mantendo total compatibilidade com os módulos Financeiro, Borderô, RBAC, PDV e Auditoria.
- **Hub Frontend (`apps/web/src/pages/events/EventsModulePage.tsx` e `apps/web/src/data/eventsData.ts`)**:
  - Expandido em uma **Central de Operação de Eventos Ponta a Ponta** com 8 abas operacionais cobrindo os 14 módulos do plano técnico e alternância de visão **Operador Disk vs. Portal do Produtor (RBAC Escopado)**.

---

## 2. Pacotes Implementados (01 a 07)

| Pacote | Escopo Normativo | Implementação Principal |
| :--- | :--- | :--- |
| **Pacote 01** | Governança, Escopo do Produtor e Trilha de Auditoria | `EventsService.enforceProducerScopeAndSanitize`, `filterEventsForContext`, `appendAudit` com hash SHA-256 encadeado (`before`/`after`/motivo/autor/papel). |
| **Pacote 02** | Entrada do Evento, Checklist Documental e Montagem (`STE.PO.001` / `STE.IT.001`) | `createOperationalEvent` (`grossTicketSales = 0`), `createIntakeRequest`, `answerMandatoryBlockQuestions` (2 perguntas obrigatórias da pág. 8), `validateSectorAndMapCapacity` (consistência mapa × setores × alvará, pág. 6) e especificações gráficas (`1920x700`, `420x520`, `72 DPI`). |
| **Pacote 03** | Dupla Conferência, Aprovação do Produtor e Publicação Omnichannel (`STE.PO.001`, pág. 3) | `submitIndependentReview` (exige 2 conferentes distintos `!= montador`), `submitProducerApproval` vinculada ao hash SHA-256 da revisão atual, `applyMaterialRevision` (invalida aprovação anterior e fecha vendas em revisão material `v+1`), `validateAndPublishEventOmnichannel` e `assertChannelSaleAllowed` (bloqueia PDV físico quando `restrictedLinkOnly = true`). |
| **Pacote 04** | Mapas, Assentos, Bloqueios, Cortesias, Recibos e Virada Atômica (`STE.PO.003` e `Anexo 1`) | `reserveOrSellSeatConcurrently` (trava atômica contra venda dupla de assento numerado), `createSeatBlock`, `executeAtomicLotTransition` (fecha lote anterior e ativa próximo na mesma transação atômica), `sellFromOperationalLot` e `issueCourtesyBatchWithReceipt` (numeração 8 dígitos + recibo `Anexo 1` + taxa contratual no borderô). |
| **Pacote 05** | Alterações Críticas, Cancelamento, Adiamento e Estorno Supervisionado (`STE.PO.002`) | `registerCriticalEventChange` (congela vendas, lotes e cortesias imediatamente em cancelamento; calcula obrigação integral incluindo taxa de conveniência; gera itens `SOLICITADO`), `advanceSupervisedRefundStatus` (impede `CONCLUIDO` sem `externalProviderConfirmationId`, sem execução bancária real na Fase 1). |
| **Pacote 06** | Comunicação Oficial ao Cliente e Tarifação WhatsApp (`Pacote 2026` e `STE.PO.002`) | `previewAndValidateEventCommunication` (separa templates de `ADIAMENTO`, `CANCELAMENTO` e `MUDANCA_LOCAL`, bloqueia contaminação textual de cancelamento em adiamento e calcula custo com tabela versionada `TAB-2026-WA-INFO-V1` R$ 0,51 / `TAB-2026-WA-PROMO-V1` R$ 0,61 sobre destinatários deduplicados LGPD). |
| **Pacote 07** | Experiência Completa no Preview, API REST e Matriz de Testes de Aceite | Rotas `/api/eventos/...` em `apps/api/src/main.ts`, interface interativa em `EventsModulePage.tsx` e 20 testes automatizados em `apps/api/src/modules/events/tests/events.spec.ts`. |

---

## 3. Endpoints REST Disponibilizados (`apps/api/src/main.ts`)

- `POST /api/eventos/solicitacoes` e `GET /api/eventos/solicitacoes`
- `POST /api/eventos/{eventId}/revisoes`
- `POST /api/eventos/{eventId}/conferencias`
- `POST /api/eventos/{eventId}/aprovacoes/produtor`
- `POST /api/eventos/{eventId}/publicacao/validar`
- `POST /api/eventos/{eventId}/publicacao/efetivar`
- `GET /api/eventos/{eventId}/publicacao/canais`
- `POST /api/eventos/{eventId}/bloqueios`
- `POST /api/eventos/{eventId}/cortesias`
- `POST /api/eventos/{eventId}/lotes/{lotId}/virada`
- `POST /api/eventos/{eventId}/alteracoes-criticas`
- `POST /api/eventos/{eventId}/comunicados/previsualizar`
- `GET /api/eventos/{eventId}/dossie`
- `GET /api/eventos/{eventId}/auditoria`
- `GET /api/eventos/{eventId}/impacto-financeiro`

---

## 4. Cobertura dos 16 Casos Obrigatórios de Aceite (Seção 12)

Todos os 16 casos de aceite da Seção 12 estão cobertos por testes automatizados em `apps/api/src/modules/events/tests/events.spec.ts` e demonstráveis interativamente no módulo `18 - Eventos & Ingressos` (`EventsModulePage.tsx`).
