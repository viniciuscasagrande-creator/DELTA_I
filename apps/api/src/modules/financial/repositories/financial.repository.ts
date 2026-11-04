import { PrismaService } from '../../../infrastructure/database/prisma.service';

export class FinancialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPayablesByCompany(tenantId: string, companyId: string) {
    return this.prisma.accountPayable.findMany({
      where: {
        tenantId,
        companyId,
      },
      include: {
        category: true,
        costCenter: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }

  async findPayableByIdScoped(tenantId: string, companyId: string, payableId: string) {
    return this.prisma.accountPayable.findFirst({
      where: {
        id: payableId,
        tenantId,
        companyId,
      },
    });
  }
}
