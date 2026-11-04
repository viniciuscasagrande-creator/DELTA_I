import { ErpModuleCode, TenantExecutionContext } from '@delta-erp/shared';
import { hasPermission } from '@delta-erp/auth-client';

/**
 * Core ERP — Policy & Permission Engine (RBAC + ABAC + Isolamento Multiempresa)
 */
export class CoreSecurityPolicy {
  /**
   * Garante que o usuário está autenticado na mesma empresa (Company) do recurso consultado/alterado,
   * bloqueando ataques de IDOR (alteração de ID na URL ou corpo da requisição).
   */
  static assertTenantAndCompanyIsolation(
    context: TenantExecutionContext,
    resourceTenantId: string,
    resourceCompanyId: string
  ): void {
    if (context.tenantId !== resourceTenantId || context.companyId !== resourceCompanyId) {
      throw new Error(
        'FORBIDDEN_CROSS_COMPANY_ACCESS: Tentativa de acesso a recurso pertencente a outra empresa ou organização.'
      );
    }
  }

  /**
   * Valida permissão RBAC e escopo ABAC de Centro de Custo
   */
  static assertPermissionAndScope(
    context: TenantExecutionContext,
    requiredPermission: string,
    costCenterId?: string | null
  ): void {
    if (!hasPermission(context, requiredPermission)) {
      throw new Error(`FORBIDDEN_PERMISSION: Usuário não possui a permissão "${requiredPermission}".`);
    }

    if (
      costCenterId &&
      context.roleCode !== 'SUPER_ADMIN' &&
      context.allowedCostCenterIds.length > 0 &&
      !context.allowedCostCenterIds.includes(costCenterId)
    ) {
      throw new Error(
        `FORBIDDEN_COST_CENTER_SCOPE: Usuário não possui autorização para operar no centro de custo "${costCenterId}".`
      );
    }
  }

  /**
   * Valida se o módulo encontra-se ativo para a empresa atual (Feature Management)
   */
  static assertModuleEnabled(enabledModules: ErpModuleCode[], requiredModule: ErpModuleCode): void {
    if (!enabledModules.includes(requiredModule)) {
      throw new Error(`MODULE_DISABLED: O módulo "${requiredModule}" não está ativo para esta empresa.`);
    }
  }
}
