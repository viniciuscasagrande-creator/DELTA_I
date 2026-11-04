import { roundCurrency } from '@delta-erp/shared';

export interface AccountPayableProps {
  id: string;
  tenantId: string;
  companyId: string;
  categoryId: string;
  costCenterId?: string | null;
  supplierName: string;
  supplierTaxId: string;
  documentNumber: string;
  description: string;
  grossAmount: number;
  discountAmount: number;
  interestAmount: number;
  taxRetainedAmount: number;
  paidAmount: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'REVERSED';
}

/**
 * Entidade de Domínio Rica — AccountPayableEntity (Módulo 02: Financeiro)
 * Encapsula invariantes financeiras, cálculo líquido exato e transições de estado permitidas.
 */
export class AccountPayableEntity {
  constructor(private readonly props: AccountPayableProps) {
    this.validateInvariants();
  }

  private validateInvariants(): void {
    if (this.props.grossAmount <= 0) {
      throw new Error('INVALID_GROSS_AMOUNT: O valor bruto do título deve ser maior que zero.');
    }
    if (this.netAmount < 0) {
      throw new Error('INVALID_NET_AMOUNT: Descontos e retenções tributárias não podem superar o valor bruto.');
    }
  }

  get netAmount(): number {
    return roundCurrency(
      this.props.grossAmount -
        this.props.discountAmount -
        this.props.taxRetainedAmount +
        this.props.interestAmount
    );
  }

  get remainingBalance(): number {
    return roundCurrency(this.netAmount - this.props.paidAmount);
  }

  canBeApproved(): boolean {
    return this.props.status === 'PENDING_APPROVAL' || this.props.status === 'DRAFT';
  }

  canBeSettled(paymentAmount: number): boolean {
    if (this.props.status !== 'APPROVED' && this.props.status !== 'PARTIALLY_PAID') {
      return false;
    }
    return paymentAmount > 0 && roundCurrency(paymentAmount) <= this.remainingBalance;
  }
}
