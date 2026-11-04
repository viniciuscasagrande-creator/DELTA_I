import { describe, it, expect } from 'vitest';
import { ErpModuleCode, TenantExecutionContext } from '@delta-erp/shared';
import { IdentityService } from '../../apps/api/src/core/auth/identity.service';
import { CoreSecurityPolicy } from '../../apps/api/src/core/permissions/permission.guard';
import { assertCentralRouteAuthGuard } from '../../apps/api/src/core/http/auth-guard.middleware';

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
});
