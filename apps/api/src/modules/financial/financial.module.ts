import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { FinancialRepository } from './repositories/financial.repository';
import { FinancialService } from './services/financial.service';
import { FinancialController } from './controllers/financial.controller';

export class FinancialModule {
  public readonly repository: FinancialRepository;
  public readonly service: FinancialService;
  public readonly controller: FinancialController;

  constructor(prisma: PrismaService, auditService: AuditService) {
    this.repository = new FinancialRepository(prisma);
    this.service = new FinancialService(prisma, auditService);
    this.controller = new FinancialController(this.service, this.repository);
  }
}
