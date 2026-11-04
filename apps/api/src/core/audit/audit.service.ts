import { ErpModuleCode, TenantExecutionContext } from '@delta-erp/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface RecordAuditParams {
  context: TenantExecutionContext;
  moduleCode: ErpModuleCode;
  entityName: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'APPROVE' | 'SETTLE' | 'REVERSE' | 'REJECT';
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

/**
 * Core ERP — AuditService
 * Registra trilha imutável de auditoria para qualquer operação crítica em todos os 20 módulos.
 */
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordAuditParams): Promise<void> {
    const { context, moduleCode, entityName, entityId, action, previousValues, newValues } = params;

    await this.prisma.auditLog.create({
      data: {
        tenantId: context.tenantId,
        companyId: context.companyId,
        userId: context.userId,
        moduleCode: moduleCode as any,
        entityName,
        entityId,
        action,
        previousValues: (previousValues ?? undefined) as any,
        newValues: (newValues ?? undefined) as any,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
      },
    });
  }
}
