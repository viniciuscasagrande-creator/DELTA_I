import { ErpModuleCode } from '@delta-erp/shared';

export interface CreateAccountPayableDto {
  categoryId: string;
  costCenterId?: string;
  supplierName: string;
  supplierTaxId: string;
  documentNumber: string;
  description: string;
  originModule?: ErpModuleCode;
  originReferenceId?: string;
  issueDate: string;
  dueDate: string;
  competenceDate: string;
  grossAmount: number;
  discountAmount?: number;
  interestAmount?: number;
  taxRetainedAmount?: number;
  idempotencyKey: string;
}

export interface SettleAccountPayableDto {
  payableId: string;
  bankAccountId: string;
  amount: number;
  paymentMethod: 'PIX' | 'TED' | 'BOLETO' | 'CREDIT_CARD';
  externalBankRef?: string;
  notes?: string;
  idempotencyKey: string;
}
