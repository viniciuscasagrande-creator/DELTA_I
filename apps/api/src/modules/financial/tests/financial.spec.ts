import { describe, it, expect } from 'vitest';
import { AccountPayableEntity } from '../entities/account-payable.entity';
import { FinancialApprovalPolicy } from '../policies/financial-approval.policy';
import { CoreSecurityPolicy } from '../../../core/permissions/permission.guard';
import { TenantExecutionContext } from '@delta-erp/shared';

describe('Módulo 02: Financeiro — Regras de Domínio, Alçadas ABAC e Isolamento Multiempresa', () => {
  const managerContext: TenantExecutionContext = {
    requestId: 'req-001',
    tenantId: 'tenant-delta-01',
    companyId: 'company-hq-01',
    userId: 'user-fin-manager',
    userEmail: 'gerente.fin@deltaerp.com.br',
    userType: 'INTERNAL',
    roleCode: 'FINANCIAL_MANAGER',
    permissions: ['financial:payable:read', 'financial:payable:create', 'financial:payable:approve'],
    maxApprovalAmount: 50000.0,
    allowedCostCenterIds: ['cc-operacoes', 'cc-ti'],
  };

  it('deve calcular corretamente o valor líquido e saldo restante sem erro de ponto flutuante', () => {
    const payable = new AccountPayableEntity({
      id: 'pay-01',
      tenantId: 'tenant-delta-01',
      companyId: 'company-hq-01',
      categoryId: 'cat-servicos',
      costCenterId: 'cc-ti',
      supplierName: 'Cloud Infra Brasil Ltda',
      supplierTaxId: '12.345.678/0001-90',
      documentNumber: 'NF-2026-991',
      description: 'Servidores Dedicados Outubro',
      grossAmount: 10000.0,
      discountAmount: 250.5,
      interestAmount: 0,
      taxRetainedAmount: 615.25,
      paidAmount: 4000.0,
      status: 'PARTIALLY_PAID',
    });

    expect(payable.netAmount).toBe(9134.25);
    expect(payable.remainingBalance).toBe(5134.25);
    expect(payable.canBeSettled(5134.25)).toBe(true);
    expect(payable.canBeSettled(5134.26)).toBe(false);
  });

  it('deve aprovar título dentro da alçada financeira e centro de custo permitido', () => {
    expect(() =>
      FinancialApprovalPolicy.assertCanApprovePayable(managerContext, 45000.0, 'cc-ti')
    ).not.toThrow();
  });

  it('deve bloquear aprovação quando o valor líquido excede a alçada ABAC do perfil', () => {
    expect(() =>
      FinancialApprovalPolicy.assertCanApprovePayable(managerContext, 65000.0, 'cc-ti')
    ).toThrow(/FINANCIAL_APPROVAL_LIMIT_EXCEEDED/);
  });

  it('deve bloquear acesso cruzado entre empresas distintas (prevenção anti-IDOR)', () => {
    expect(() =>
      CoreSecurityPolicy.assertTenantAndCompanyIsolation(
        managerContext,
        'tenant-delta-01',
        'company-eventos-02' // Empresa diferente da ativa no contexto!
      )
    ).toThrow(/FORBIDDEN_CROSS_COMPANY_ACCESS/);
  });
});
