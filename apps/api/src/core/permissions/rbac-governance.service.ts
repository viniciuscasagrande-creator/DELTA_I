import { ErpModuleCode, TenantExecutionContext } from '@delta-erp/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CoreSecurityPolicy } from './permission.guard';

export interface UpdateRoleApprovalLimitDto {
  roleId: string;
  maxApprovalAmount: number;
}

/**
 * Core ERP — RbacGovernanceService (Entrega 2)
 * Gerencia perfis (Roles), catálogo de permissões granulares e alçadas ABAC.
 */
export class RbacGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async updateRoleApprovalLimit(
    context: TenantExecutionContext,
    dto: UpdateRoleApprovalLimitDto
  ) {
    CoreSecurityPolicy.assertPermissionAndScope(context, 'admin:rbac:manage');

    if (dto.maxApprovalAmount < 0) {
      throw new Error('INVALID_APPROVAL_LIMIT: Alçada financeira não pode ser negativa.');
    }

    const existing = await this.prisma.role.findFirst({
      where: { id: dto.roleId, tenantId: context.tenantId },
    });

    if (!existing) {
      throw new Error('ROLE_NOT_FOUND: Perfil não encontrado na organização.');
    }

    const updated = await this.prisma.role.update({
      where: { id: existing.id },
      data: { maxApprovalAmount: dto.maxApprovalAmount },
    });

    await this.auditService.record({
      context,
      moduleCode: ErpModuleCode.ADMINISTRATION,
      entityName: 'Role',
      entityId: updated.id,
      action: 'UPDATE',
      previousValues: { code: existing.code, maxApprovalAmount: Number(existing.maxApprovalAmount) },
      newValues: { code: updated.code, maxApprovalAmount: Number(updated.maxApprovalAmount) },
    });

    return updated;
  }
}
