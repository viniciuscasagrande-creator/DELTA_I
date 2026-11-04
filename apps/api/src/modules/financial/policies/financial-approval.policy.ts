import { TenantExecutionContext } from '@delta-erp/shared';
import { canApproveAmount } from '@delta-erp/auth-client';
import { CoreSecurityPolicy } from '../../../core/permissions/permission.guard';

/**
 * Políticas ABAC específicas do Módulo Financeiro (Alçadas de Aprovação e Liquidação)
 */
export class FinancialApprovalPolicy {
  static assertCanApprovePayable(
    context: TenantExecutionContext,
    netAmount: number,
    costCenterId?: string | null
  ): void {
    CoreSecurityPolicy.assertPermissionAndScope(context, 'financial:payable:approve', costCenterId);

    if (!canApproveAmount(context, netAmount)) {
      throw new Error(
        `FINANCIAL_APPROVAL_LIMIT_EXCEEDED: Valor líquido (R$ ${netAmount.toFixed(
          2
        )}) excede a alçada máxima do seu perfil (R$ ${context.maxApprovalAmount.toFixed(2)}).`
      );
    }
  }
}
