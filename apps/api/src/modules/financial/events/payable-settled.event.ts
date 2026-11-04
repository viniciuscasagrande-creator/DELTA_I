import { DomainEventPayload } from '@delta-erp/shared';

export interface PayableSettledEventData {
  payableId: string;
  transactionId: string;
  bankAccountId: string;
  settledAmount: number;
  remainingBalance: number;
  newStatus: 'PARTIALLY_PAID' | 'PAID';
  categoryId: string;
  costCenterId?: string | null;
}

export type PayableSettledDomainEvent = DomainEventPayload<PayableSettledEventData>;
