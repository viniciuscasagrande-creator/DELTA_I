import { ErpModuleCode, TenantExecutionContext } from '@delta-erp/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CoreSecurityPolicy } from '../permissions/permission.guard';

export interface CreateBranchDto {
  code: string;
  name: string;
  taxId?: string;
  city: string;
  state: string;
}

export interface CreateDepartmentDto {
  code: string;
  name: string;
}

export interface CreateCostCenterDto {
  code: string;
  name: string;
  parentId?: string;
}

/**
 * Core ERP — CompanyGovernanceService (Entrega 2)
 * Gerencia estrutura multiempresa: Organizações, Empresas, Filiais, Departamentos,
 * Centros de Custo e Feature Management (ativação/desativação de módulos por empresa).
 */
export class CompanyGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async createBranch(context: TenantExecutionContext, dto: CreateBranchDto) {
    CoreSecurityPolicy.assertPermissionAndScope(context, 'admin:organization:manage');

    return this.prisma.executeInTenantTransaction(context.tenantId, context.companyId, async (tx) => {
      const branch = await tx.branch.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          taxId: dto.taxId,
          city: dto.city.trim(),
          state: dto.state.trim().toUpperCase().slice(0, 2),
        },
      });

      await this.auditService.record({
        context,
        moduleCode: ErpModuleCode.ADMINISTRATION,
        entityName: 'Branch',
        entityId: branch.id,
        action: 'CREATE',
        previousValues: null,
        newValues: { code: branch.code, name: branch.name, city: branch.city, state: branch.state },
      });

      return branch;
    });
  }

  async createDepartment(context: TenantExecutionContext, dto: CreateDepartmentDto) {
    CoreSecurityPolicy.assertPermissionAndScope(context, 'admin:organization:manage');

    return this.prisma.executeInTenantTransaction(context.tenantId, context.companyId, async (tx) => {
      const dept = await tx.department.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
        },
      });

      await this.auditService.record({
        context,
        moduleCode: ErpModuleCode.ADMINISTRATION,
        entityName: 'Department',
        entityId: dept.id,
        action: 'CREATE',
        previousValues: null,
        newValues: { code: dept.code, name: dept.name },
      });

      return dept;
    });
  }

  async createCostCenter(context: TenantExecutionContext, dto: CreateCostCenterDto) {
    CoreSecurityPolicy.assertPermissionAndScope(context, 'admin:organization:manage');

    return this.prisma.executeInTenantTransaction(context.tenantId, context.companyId, async (tx) => {
      const cc = await tx.costCenter.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          parentId: dto.parentId || null,
        },
      });

      await this.auditService.record({
        context,
        moduleCode: ErpModuleCode.ADMINISTRATION,
        entityName: 'CostCenter',
        entityId: cc.id,
        action: 'CREATE',
        previousValues: null,
        newValues: { code: cc.code, name: cc.name },
      });

      return cc;
    });
  }

  /**
   * Feature Management: Ativa ou desativa um módulo para a empresa ativa sem comprometer os demais
   */
  async toggleCompanyModule(
    context: TenantExecutionContext,
    moduleCode: ErpModuleCode,
    isEnabled: boolean
  ) {
    CoreSecurityPolicy.assertPermissionAndScope(context, 'admin:modules:manage');

    // Módulos estruturais obrigatórios não podem ser desativados
    if (
      !isEnabled &&
      (moduleCode === ErpModuleCode.ADMINISTRATION || moduleCode === ErpModuleCode.WORKFLOW)
    ) {
      throw new Error(
        `CORE_MODULE_PROTECTED: O módulo estrutural "${moduleCode}" é obrigatório e não pode ser desativado.`
      );
    }

    return this.prisma.executeInTenantTransaction(context.tenantId, context.companyId, async (tx) => {
      const existing = await tx.tenantModuleSubscription.findFirst({
        where: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          moduleCode: moduleCode as any,
        },
      });

      const updated = existing
        ? await tx.tenantModuleSubscription.update({
            where: { id: existing.id },
            data: { isEnabled },
          })
        : await tx.tenantModuleSubscription.create({
            data: {
              tenantId: context.tenantId,
              companyId: context.companyId,
              moduleCode: moduleCode as any,
              isEnabled,
            },
          });

      await this.auditService.record({
        context,
        moduleCode: ErpModuleCode.ADMINISTRATION,
        entityName: 'TenantModuleSubscription',
        entityId: updated.id,
        action: 'UPDATE',
        previousValues: { moduleCode, isEnabled: existing?.isEnabled ?? true },
        newValues: { moduleCode, isEnabled },
      });

      return updated;
    });
  }
}
