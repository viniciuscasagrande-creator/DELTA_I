import { TenantExecutionContext } from '@delta-erp/shared';

export interface AuthSessionHeaders {
  Authorization: string;
  'X-Tenant-Id': string;
  'X-Company-Id': string;
}

export function hasPermission(context: TenantExecutionContext, requiredPermission: string): boolean {
  if (context.roleCode === 'SUPER_ADMIN') {
    return true;
  }
  return context.permissions.includes(requiredPermission);
}

export function canApproveAmount(context: TenantExecutionContext, amount: number): boolean {
  if (context.roleCode === 'SUPER_ADMIN') {
    return true;
  }
  return hasPermission(context, 'financial:payable:approve') && amount <= context.maxApprovalAmount;
}
