/**
 * DELTA ERP — Outbox Relay & Background Worker (BullMQ / Redis)
 * Consome eventos gravados na tabela `core_outbox_events` e dispara:
 * - Contabilização automática no Módulo 03 (ex: `financial.payable.settled` -> `JournalEntry`)
 * - Atualização de saldo do borderô no Módulo de Eventos (`EVENTS`)
 * - Envio de alertas e notificações de alçada (`Workflow`)
 */
export const REGISTERED_EVENT_HANDLERS: Record<string, string> = {
  'financial.payable.approved': 'NotifyTreasuryQueueHandler',
  'financial.payable.settled': 'GenerateAccountingJournalEntryHandler',
  'purchasing.order.approved': 'ExpectInboundFiscalDocumentHandler',
  'events.settlement.requested': 'TriggerProducerPayoutWorkflowHandler',
};
