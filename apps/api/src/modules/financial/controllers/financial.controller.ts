import { TenantExecutionContext } from '@delta-erp/shared';
import { CreateAccountPayableDto, SettleAccountPayableDto } from '../dto/account-payable.dto';
import { FinancialService } from '../services/financial.service';
import { FinancialRepository } from '../repositories/financial.repository';

export class FinancialController {
  constructor(
    private readonly financialService: FinancialService,
    private readonly financialRepository: FinancialRepository
  ) {}

  async listPayables(context: TenantExecutionContext) {
    return this.financialRepository.findPayablesByCompany(context.tenantId, context.companyId);
  }

  async createPayable(context: TenantExecutionContext, dto: CreateAccountPayableDto) {
    return this.financialService.createPayable(context, dto);
  }

  async approvePayable(context: TenantExecutionContext, payableId: string) {
    return this.financialService.approvePayable(context, payableId);
  }

  async settlePayable(context: TenantExecutionContext, dto: SettleAccountPayableDto) {
    return this.financialService.settlePayable(context, dto);
  }
}
