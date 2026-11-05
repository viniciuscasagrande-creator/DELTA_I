import { describe, it, expect } from 'vitest';
import { ErpModuleCode, TenantExecutionContext } from '@delta-erp/shared';
import { IdentityService } from '../../apps/api/src/core/auth/identity.service';
import { CoreSecurityPolicy } from '../../apps/api/src/core/permissions/permission.guard';
import { assertCentralRouteAuthGuard } from '../../apps/api/src/core/http/auth-guard.middleware';
import { FinancialService } from '../../apps/api/src/modules/financial/services/financial.service';
import { InventoryService } from '../../apps/api/src/modules/inventory/services/inventory.service';
import { processPendingOutboxBatch } from '../../apps/worker/src/outbox-worker';

describe('Entrega 2 — Testes de Segurança: Core Identity, RBAC/ABAC, Multiempresa e Anti-IDOR', () => {
  const baseContext: TenantExecutionContext = {
    requestId: 'req-sec-01',
    tenantId: 'tenant-delta-01',
    companyId: 'company-hq-01',
    userId: 'user-01',
    userEmail: 'financeiro@deltaerp.com.br',
    userType: 'INTERNAL',
    roleCode: 'FINANCIAL_MANAGER',
    permissions: ['financial:payable:read', 'financial:payable:create', 'financial:payable:approve'],
    maxApprovalAmount: 50000,
    allowedCostCenterIds: ['cc-100', 'cc-200'],
  };

  it('deve gerar hash PBKDF2-SHA512 único por salt e validar a senha de forma timing-safe', () => {
    const hash1 = IdentityService.hashPassword('Delta@2026');
    const hash2 = IdentityService.hashPassword('Delta@2026');

    expect(hash1).not.toBe(hash2); // Salts distintos geram hashes distintos
    expect(IdentityService.verifyPassword('Delta@2026', hash1)).toBe(true);
    expect(IdentityService.verifyPassword('SenhaIncorreta', hash1)).toBe(false);
  });

  it('deve assinar e validar tokens JWT HS256 e rejeitar qualquer adulteração de payload', () => {
    const identity = new IdentityService({} as any, {} as any);
    const token = identity.signJwt({
      sub: 'user-01',
      tenantId: 'tenant-delta-01',
      companyId: 'company-hq-01',
      email: 'admin@deltaerp.com.br',
      roleCode: 'SUPER_ADMIN',
      userType: 'INTERNAL',
      mfaVerified: true,
      sessionId: 'sess-001',
    });

    const verified = identity.verifyJwt(token);
    expect(verified.sub).toBe('user-01');
    expect(verified.roleCode).toBe('SUPER_ADMIN');
    expect(verified.mfaVerified).toBe(true);

    // Simula adulteração maliciosa da assinatura JWT
    const tamperedToken = token.slice(0, -4) + 'XXXX';
    expect(() => identity.verifyJwt(tamperedToken)).toThrow(/INVALID_JWT_SIGNATURE/);
  });

  it('deve gerar e validar códigos TOTP MFA de 6 dígitos (RFC 6238)', () => {
    const secretHex = '3132333435363738393031323334353637383930';
    const fixedTime = 1762272000000;
    const code = IdentityService.generateTotpCode(secretHex, fixedTime);

    expect(code).toMatch(/^\d{6}$/);
    expect(IdentityService.verifyTotpCode(secretHex, code, fixedTime)).toBe(true);
    expect(IdentityService.verifyTotpCode(secretHex, '000000', fixedTime)).toBe(false);
  });

  it('deve bloquear tentativa de IDOR entre empresas ou organizações diferentes', () => {
    // Mesma empresa e tenant -> permitido
    expect(() =>
      CoreSecurityPolicy.assertTenantAndCompanyIsolation(
        baseContext,
        'tenant-delta-01',
        'company-hq-01'
      )
    ).not.toThrow();

    // Mesma organização (tenant), mas outra empresa (company-eventos-02) -> bloqueado!
    expect(() =>
      CoreSecurityPolicy.assertTenantAndCompanyIsolation(
        baseContext,
        'tenant-delta-01',
        'company-eventos-02'
      )
    ).toThrow(/FORBIDDEN_CROSS_COMPANY_ACCESS/);

    // Outro tenant -> bloqueado!
    expect(() =>
      CoreSecurityPolicy.assertTenantAndCompanyIsolation(
        baseContext,
        'tenant-externo-99',
        'company-hq-01'
      )
    ).toThrow(/FORBIDDEN_CROSS_COMPANY_ACCESS/);
  });

  it('deve validar escopo ABAC de Centro de Custo e bloquear centros não autorizados', () => {
    // Centro de custo permitido ('cc-100')
    expect(() =>
      CoreSecurityPolicy.assertPermissionAndScope(
        baseContext,
        'financial:payable:create',
        'cc-100'
      )
    ).not.toThrow();

    // Centro de custo fora do escopo do usuário ('cc-400')
    expect(() =>
      CoreSecurityPolicy.assertPermissionAndScope(
        baseContext,
        'financial:payable:create',
        'cc-400'
      )
    ).toThrow(/FORBIDDEN_COST_CENTER_SCOPE/);
  });

  it('deve bloquear operações quando o módulo estiver desativado no Feature Management', () => {
    const activeModules = [ErpModuleCode.FINANCIAL, ErpModuleCode.ACCOUNTING];

    expect(() =>
      CoreSecurityPolicy.assertModuleEnabled(activeModules, ErpModuleCode.FINANCIAL)
    ).not.toThrow();

    expect(() =>
      CoreSecurityPolicy.assertModuleEnabled(activeModules, ErpModuleCode.MARKETING)
    ).toThrow(/MODULE_DISABLED/);
  });

  it('deve falhar na inicialização em produção caso JWT_ACCESS_SECRET ou MFA_TOTP_SECRET estejam ausentes', () => {
    const prevEnv = process.env.NODE_ENV;
    const prevJwt = process.env.JWT_ACCESS_SECRET;
    const prevMfa = process.env.MFA_TOTP_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_ACCESS_SECRET;
      delete process.env.MFA_TOTP_SECRET;

      expect(() => new IdentityService({} as any, {} as any)).toThrow(/FATAL_SECURITY_CONFIG/);
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevJwt) process.env.JWT_ACCESS_SECRET = prevJwt;
      if (prevMfa) process.env.MFA_TOTP_SECRET = prevMfa;
    }
  });

  it('deve exigir header Authorization Bearer JWT nas rotas protegidas quando ENFORCE_JWT_AUTH=true', () => {
    const prevEnforce = process.env.ENFORCE_JWT_AUTH;
    const identity = new IdentityService({} as any, {} as any);
    const validToken = identity.signJwt({
      sub: 'user-01',
      tenantId: 'tenant-delta-01',
      companyId: 'company-hq-01',
      email: 'admin@deltaerp.com.br',
      roleCode: 'SUPER_ADMIN',
      userType: 'INTERNAL',
      mfaVerified: true,
      sessionId: 'sess-guard-01',
    });

    try {
      process.env.ENFORCE_JWT_AUTH = 'true';

      // Rota pública (/api/health) passa sem token
      expect(() =>
        assertCentralRouteAuthGuard(
          { method: 'GET', headers: {} } as any,
          '/api/health',
          identity
        )
      ).not.toThrow();

      // Rota protegida (/api/financial/payables) sem token -> bloqueada!
      expect(() =>
        assertCentralRouteAuthGuard(
          { method: 'POST', headers: {} } as any,
          '/api/financial/payables',
          identity
        )
      ).toThrow(/FORBIDDEN_AUTH_REQUIRED/);

      // Rota protegida com token JWT válido -> autorizada!
      const claims = assertCentralRouteAuthGuard(
        {
          method: 'POST',
          headers: { authorization: `Bearer ${validToken}` },
        } as any,
        '/api/financial/payables',
        identity
      );
      expect(claims?.sub).toBe('user-01');
    } finally {
      if (prevEnforce !== undefined) {
        process.env.ENFORCE_JWT_AUTH = prevEnforce;
      } else {
        delete process.env.ENFORCE_JWT_AUTH;
      }
    }
  });

  it('Achado 1: deve bloquear movimentação de estoque e consulta de resumo de outra empresa ou sem permissão RBAC', async () => {
    const mockPrisma: any = {
      inventoryItem: {
        findUnique: async () => ({
          id: 'item-emp02-99',
          tenantId: 'tenant-delta-01',
          companyId: 'company-eventos-02',
          sku: 'MAT-EVT-99',
          name: 'Equipamento da Empresa 02',
          unit: 'UN',
          quantityOnHand: 20,
          reorderPoint: 5,
          averageUnitCost: 1000,
          totalStockValue: 20000,
          company: {
            id: 'company-eventos-02',
            tenantId: 'tenant-delta-01',
            code: 'EMP-02',
          },
        }),
      },
      company: {
        findFirst: async () => ({
          id: 'company-hq-01',
          tenantId: 'tenant-delta-01',
          code: 'EMP-01',
        }),
      },
    };

    const inventoryService = new InventoryService(mockPrisma);

    // 1. Sem permissão RBAC inventory:movement:execute -> bloqueado
    await expect(
      inventoryService.recordStockMovement({
        companyCode: 'EMP-01',
        itemId: 'item-emp02-99',
        movementType: 'OUTBOUND_REQUISITION',
        quantity: 2,
        context: baseContext,
      })
    ).rejects.toThrow(/FORBIDDEN_PERMISSION/);

    // 2. Com permissão RBAC, mas tentando movimentar item da EMP-02 estando autenticado na EMP-01 -> bloqueado!
    const ctxWithInvPerms: TenantExecutionContext = {
      ...baseContext,
      permissions: [...baseContext.permissions, 'inventory:movement:execute', 'inventory:item:read'],
    };

    await expect(
      inventoryService.recordStockMovement({
        companyCode: 'EMP-01',
        itemId: 'item-emp02-99',
        movementType: 'OUTBOUND_REQUISITION',
        quantity: 2,
        context: ctxWithInvPerms,
      })
    ).rejects.toThrow(/FORBIDDEN_CROSS_COMPANY_ACCESS/);

    // 3. Consulta de resumo solicitando companyCode divergente do contexto autorizado -> bloqueado!
    await expect(
      inventoryService.getInventorySummary('EMP-02', ctxWithInvPerms)
    ).rejects.toThrow(/FORBIDDEN_CROSS_COMPANY_ACCESS/);
  });

  it('Achado 2: deve rejeitar liquidação de título da empresa A usando conta bancária da empresa B sem debitar saldo', async () => {
    let bankDebited = false;
    const mockTx: any = {
      accountPayable: {
        findFirst: async () => ({
          id: 'pay-hq-01',
          tenantId: 'tenant-delta-01',
          companyId: 'company-hq-01',
          categoryId: 'cat-01',
          costCenterId: 'cc-100',
          supplierName: 'Fornecedor Matriz',
          supplierTaxId: '12.345.678/0001-90',
          documentNumber: 'NF-1001',
          description: 'Serviço Cloud',
          grossAmount: 5000,
          discountAmount: 0,
          interestAmount: 0,
          taxRetainedAmount: 0,
          netAmount: 5000,
          paidAmount: 0,
          status: 'APPROVED',
        }),
      },
      bankAccount: {
        // Simula que bank-emp-02 pertence à company-eventos-02, logo não existe no escopo company-hq-01
        findFirst: async ({ where }: any) => {
          if (where.id === 'bank-emp-02' && where.companyId === 'company-hq-01') {
            return null;
          }
          return null;
        },
        update: async () => {
          bankDebited = true;
        },
        updateMany: async () => {
          bankDebited = true;
          return { count: 1 };
        },
      },
    };

    const mockPrisma: any = {
      executeInTenantTransaction: async (_t: string, _c: string, fn: any) => fn(mockTx),
    };

    const financialService = new FinancialService(mockPrisma, {
      record: async () => ({}),
    } as any);
    const settleCtx: TenantExecutionContext = {
      ...baseContext,
      permissions: [...baseContext.permissions, 'financial:settlement:execute'],
    };

    await expect(
      financialService.settlePayable(settleCtx, {
        payableId: 'pay-hq-01',
        bankAccountId: 'bank-emp-02',
        amount: 5000,
        paymentMethod: 'PIX',
        idempotencyKey: 'idem-cross-bank-01',
      })
    ).rejects.toThrow(/FORBIDDEN_CROSS_COMPANY_BANK_ACCOUNT/);

    expect(bankDebited).toBe(false);
  });

  it('Achado 7: deve impedir pagamento excedente em liquidações concorrentes (compare-and-swap atômico)', async () => {
    let currentPaidAmount = 0;
    let currentStatus = 'APPROVED';
    let bankDebitsCount = 0;

    const mockTx: any = {
      accountPayable: {
        findFirst: async () => ({
          id: 'pay-race-01',
          tenantId: 'tenant-delta-01',
          companyId: 'company-hq-01',
          categoryId: 'cat-01',
          costCenterId: 'cc-100',
          supplierName: 'Fornecedor Concorrência',
          supplierTaxId: '12.345.678/0001-90',
          documentNumber: 'NF-RACE-01',
          description: 'Teste Concorrência',
          grossAmount: 10000,
          discountAmount: 0,
          interestAmount: 0,
          taxRetainedAmount: 0,
          netAmount: 10000,
          // Ambas as leituras concorrentes enxergam paidAmount = 0 antes do commit
          paidAmount: 0,
          status: 'APPROVED',
        }),
        updateMany: async ({ where, data }: any) => {
          if (where.paidAmount === currentPaidAmount && where.status === currentStatus) {
            currentPaidAmount = data.paidAmount;
            currentStatus = data.status;
            return { count: 1 };
          }
          return { count: 0 };
        },
      },
      bankAccount: {
        findFirst: async () => ({
          id: 'bank-hq-01',
          tenantId: 'tenant-delta-01',
          companyId: 'company-hq-01',
          isActive: true,
          currentBalance: 100000,
        }),
        updateMany: async () => {
          bankDebitsCount++;
          return { count: 1 };
        },
      },
      financialTransaction: {
        create: async ({ data }: any) => ({ id: `tx_${Date.now()}`, ...data }),
      },
      chartOfAccount: {
        findFirst: async () => null,
      },
      journalEntry: {
        findFirst: async () => null,
      },
      outboxEvent: {
        create: async ({ data }: any) => data,
      },
    };

    const mockPrisma: any = {
      executeInTenantTransaction: async (_t: string, _c: string, fn: any) => fn(mockTx),
    };

    const financialService = new FinancialService(mockPrisma, {
      record: async () => ({}),
    } as any);
    const settleCtx: TenantExecutionContext = {
      ...baseContext,
      permissions: [...baseContext.permissions, 'financial:settlement:execute'],
    };

    const results = await Promise.allSettled([
      financialService.settlePayable(settleCtx, {
        payableId: 'pay-race-01',
        bankAccountId: 'bank-hq-01',
        amount: 7000,
        paymentMethod: 'PIX',
        idempotencyKey: 'idem-race-1',
      }),
      financialService.settlePayable(settleCtx, {
        payableId: 'pay-race-01',
        bankAccountId: 'bank-hq-01',
        amount: 7000,
        paymentMethod: 'PIX',
        idempotencyKey: 'idem-race-2',
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason.message).toMatch(/CONCURRENT_SETTLEMENT_CONFLICT/);
    expect(bankDebitsCount).toBe(1);
    expect(currentPaidAmount).toBe(7000);
  });

  it('Achados 3 e 4: deve rejeitar sessão MFA forjada pelo cliente, impedir reuso do desafio MFA e exigir titularidade/admin na revogação', async () => {
    const secretHex = '3132333435363738393031323334353637383930';
    const validPasswordHash = IdentityService.hashPassword('Delta@2026');

    const mockPrisma: any = {
      user: {
        findFirst: async () => ({
          id: 'user-mfa-01',
          tenantId: 'tenant-delta-01',
          email: 'admin@deltaerp.com.br',
          fullName: 'Admin MFA',
          passwordHash: validPasswordHash,
          status: 'ACTIVE',
          userType: 'INTERNAL',
          mfaEnabled: true,
          mfaSecretEncrypted: secretHex,
          companyAccesses: [
            {
              companyId: 'company-hq-01',
              isActive: true,
              allowedCostCenterIds: [],
              company: {
                id: 'company-hq-01',
                code: 'EMP-01',
                tradeName: 'DELTA Matriz',
                tenantId: 'tenant-delta-01',
              },
              role: {
                code: 'SUPER_ADMIN',
                maxApprovalAmount: 999999999,
                permissions: [],
              },
            },
          ],
        }),
        findUnique: async () => ({
          id: 'user-mfa-01',
          tenantId: 'tenant-delta-01',
          email: 'admin@deltaerp.com.br',
          status: 'ACTIVE',
          userType: 'INTERNAL',
          mfaEnabled: true,
          mfaSecretEncrypted: secretHex,
          companyAccesses: [
            {
              companyId: 'company-hq-01',
              isActive: true,
              role: { code: 'SUPER_ADMIN' },
            },
          ],
        }),
        update: async () => ({}),
      },
      auditLog: {
        findFirst: async () => null,
      },
    };

    const mockAudit: any = {
      record: async () => ({}),
    };

    const identity = new IdentityService(mockPrisma, mockAudit);
    const validTotp = IdentityService.generateTotpCode(secretHex);

    // 1. Tentativa de contornar senha enviando sessionId forjado ("sess_<userId>_<companyId>_fake") -> rejeitado!
    await expect(
      identity.verifyMfaSession('sess_user-mfa-01_company-hq-01_forged', validTotp)
    ).rejects.toThrow(/SESSION_NOT_FOUND/);

    // 2. Login legítimo cria sessão e desafio MFA de uso único
    const loginRes = await identity.login({
      email: 'admin@deltaerp.com.br',
      password: 'Delta@2026',
      companyCode: 'EMP-01',
    });

    const mfaRes = await identity.verifyMfaSession(
      loginRes.sessionId,
      validTotp,
      loginRes.mfaChallengeToken
    );
    expect(mfaRes.mfaVerified).toBe(true);

    // 3. Reuso do mesmo desafio/sessão MFA -> bloqueado!
    await expect(
      identity.verifyMfaSession(loginRes.sessionId, validTotp, loginRes.mfaChallengeToken)
    ).rejects.toThrow(/MFA_CHALLENGE_ALREADY_USED/);

    // 4. Tentativa de revogar a sessão por outro usuário sem permissão administrativa -> bloqueado!
    const unauthorizedActor: TenantExecutionContext = {
      ...baseContext,
      userId: 'other-user-99',
      roleCode: 'FINANCIAL_MANAGER',
      permissions: ['financial:payable:read'],
    };
    expect(() => identity.revokeSession(loginRes.sessionId, unauthorizedActor)).toThrow(
      /FORBIDDEN_SESSION_REVOKE/
    );

    // 5. Revogação pelo próprio titular ou SUPER_ADMIN -> permitido e invalida o JWT em qualquer instância
    const ownerActor: TenantExecutionContext = {
      ...baseContext,
      userId: 'user-mfa-01',
      roleCode: 'SUPER_ADMIN',
    };
    const revoked = identity.revokeSession(loginRes.sessionId, ownerActor);
    expect(revoked.revokedAt).toBeDefined();

    const secondInstance = new IdentityService(mockPrisma, mockAudit);
    expect(() => secondInstance.verifyJwt(mfaRes.accessToken)).toThrow(/SESSION_REVOKED/);
  });

  it('Achado 8: deve despachar eventos da Outbox com confirmação de entrega e controlar falhas/retentativas', async () => {
    const deliveredEvents: string[] = [];
    const updatedStates: Record<string, any> = {};

    const mockPrisma: any = {
      outboxEvent: {
        findMany: async () => [
          {
            id: 'evt-ok-01',
            tenantId: 'tenant-delta-01',
            companyId: 'company-hq-01',
            aggregateType: 'AccountPayable',
            aggregateId: 'pay-01',
            eventType: 'financial.payable.settled',
            payload: { amount: 1500 },
            retryCount: 0,
            status: 'PENDING',
          },
          {
            id: 'evt-fail-02',
            tenantId: 'tenant-delta-01',
            companyId: 'company-hq-01',
            aggregateType: 'FiscalDocument',
            aggregateId: 'nfe-02',
            eventType: 'fiscal.nfe.issued',
            payload: { nfeNumber: 2026 },
            retryCount: 4,
            status: 'PENDING',
          },
        ],
        updateMany: async () => ({ count: 1 }),
        update: async ({ where, data }: any) => {
          updatedStates[where.id] = data;
          return data;
        },
      },
    };

    const result = await processPendingOutboxBatch(mockPrisma, async (evt) => {
      if (evt.id === 'evt-fail-02') {
        throw new Error('SEFAZ_TIMEOUT');
      }
      deliveredEvents.push(evt.id);
      return {
        acknowledged: true,
        deliveryId: `dlv_${evt.id}`,
        idempotencyKey: `outbox_${evt.id}`,
        targetQueue: 'accounting.journal.dispatch',
        signatureHmac256: 'sig_ok',
        deliveredAt: new Date().toISOString(),
      };
    });

    expect(result.scanned).toBe(2);
    expect(result.processedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(deliveredEvents).toEqual(['evt-ok-01']);
    expect(updatedStates['evt-ok-01'].status).toBe('PUBLISHED');
    expect(updatedStates['evt-fail-02'].status).toBe('FAILED');
    expect(updatedStates['evt-fail-02'].errorMessage).toBe('SEFAZ_TIMEOUT');
  });
});
