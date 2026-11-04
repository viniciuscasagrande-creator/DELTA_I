import { assertPositiveCurrency, isValidCnpjOrCpf } from '@delta-erp/validators';
import { CreateAccountPayableDto } from '../dto/account-payable.dto';

export class FinancialPayableValidator {
  static validateCreateDto(dto: CreateAccountPayableDto): void {
    assertPositiveCurrency(dto.grossAmount, 'grossAmount');

    if (!isValidCnpjOrCpf(dto.supplierTaxId)) {
      throw new Error('INVALID_SUPPLIER_TAX_ID: O CPF/CNPJ do fornecedor informado é inválido.');
    }

    if (!dto.idempotencyKey || dto.idempotencyKey.trim().length < 8) {
      throw new Error('MISSING_IDEMPOTENCY_KEY: Toda operação financeira exige chave de idempotência válida.');
    }
  }
}
