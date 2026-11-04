import crypto from 'node:crypto';
import { ErpModuleCode, TenantExecutionContext } from '@delta-erp/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface JwtTokenPayload {
  sub: string;
  tenantId: string;
  companyId: string;
  email: string;
  roleCode: string;
  userType: TenantExecutionContext['userType'];
  mfaVerified: boolean;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface ActiveSessionRecord {
  sessionId: string;
  userId: string;
  tenantId: string;
  companyId: string;
  email: string;
  roleCode: string;
  ipAddress: string;
  userAgent: string;
  mfaVerified: boolean;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

/**
 * Core ERP — IdentityService (Entrega 2)
 * Responsável por:
 * - Hash criptográfico de senhas (PBKDF2-HMAC-SHA512 com salt aleatório)
 * - Emissão e verificação de tokens JWT (HMAC-SHA256)
 * - Geração e validação de códigos TOTP MFA (RFC 6238)
 * - Gestão, expiração e revogação de sessões de usuários
 * - Fluxo seguro de recuperação de senha com token temporário
 */
export class IdentityService {
  private readonly jwtSecret: string;
  private readonly sessions = new Map<string, ActiveSessionRecord>();
  private readonly passwordResetTokens = new Map<
    string,
    { userId: string; tenantId: string; expiresAt: number; used: boolean }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {
    if (
      process.env.NODE_ENV === 'production' &&
      (!process.env.JWT_ACCESS_SECRET || !process.env.MFA_TOTP_SECRET)
    ) {
      throw new Error(
        'FATAL_SECURITY_CONFIG: JWT_ACCESS_SECRET e MFA_TOTP_SECRET são obrigatórios em ambiente de produção.'
      );
    }
    this.jwtSecret =
      process.env.JWT_ACCESS_SECRET || 'enterprise-erp-dev-only-jwt-secret-key-2026';
  }

  /**
   * Gera hash seguro de senha utilizando PBKDF2-SHA512 (100.000 iterações)
   */
  static hashPassword(plainPassword: string, salt?: string): string {
    const usedSalt = salt || crypto.randomBytes(16).toString('hex');
    const derived = crypto
      .pbkdf2Sync(plainPassword, usedSalt, 100000, 64, 'sha512')
      .toString('hex');
    return `pbkdf2_sha512$100000$${usedSalt}$${derived}`;
  }

  static verifyPassword(plainPassword: string, storedHash: string): boolean {
    if (storedHash.startsWith('pbkdf2_sha512$')) {
      const parts = storedHash.split('$');
      const salt = parts[2];
      const expected = IdentityService.hashPassword(plainPassword, salt);
      return crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(expected));
    }
    // Compatibilidade com senha padrão apenas em ambiente de desenvolvimento
    if (
      process.env.NODE_ENV !== 'production' &&
      storedHash === '$2b$12$EXAMPLE_HASH_FOR_DEV_ONLY' &&
      plainPassword === 'Delta@2026'
    ) {
      return true;
    }
    return false;
  }

  /**
   * Assina um token JWT padrão RFC 7519 (HS256)
   */
  signJwt(payload: Omit<JwtTokenPayload, 'iat' | 'exp'>, expiresInSeconds = 900): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JwtTokenPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
      'base64url'
    );
    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  /**
   * Verifica assinatura, integridade, expiração e revogação de sessão de um JWT
   */
  verifyJwt(token: string): JwtTokenPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('INVALID_JWT_FORMAT: Token JWT malformado.');
    }

    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (
      signature.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
    ) {
      throw new Error('INVALID_JWT_SIGNATURE: Assinatura do token inválida.');
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as JwtTokenPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      throw new Error('JWT_EXPIRED: Sessão expirada. Realize novo login.');
    }

    const session = this.sessions.get(payload.sessionId);
    if (session && session.revokedAt) {
      throw new Error('SESSION_REVOKED: Esta sessão foi encerrada pelo administrador ou usuário.');
    }

    return payload;
  }

  /**
   * Gera código TOTP de 6 dígitos (RFC 6238) para janela de 30 segundos
   */
  static generateTotpCode(secretHex: string, timestampMs = Date.now()): string {
    const counter = Math.floor(timestampMs / 1000 / 30);
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigInt64BE(BigInt(counter), 0);

    const hmac = crypto
      .createHmac('sha1', Buffer.from(secretHex, 'hex'))
      .update(counterBuf)
      .digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    return (binary % 1_000_000).toString().padStart(6, '0');
  }

  static verifyTotpCode(secretHex: string, code: string, timestampMs = Date.now()): boolean {
    const normalized = code.trim();
    if (!/^\d{6}$/.test(normalized)) return false;
    // Aceita janela atual e +-1 janela de 30s para compensar leve drift de relógio
    for (const drift of [-30000, 0, 30000]) {
      if (IdentityService.generateTotpCode(secretHex, timestampMs + drift) === normalized) {
        return true;
      }
    }
    return false;
  }

  /**
   * Autenticação primária com e-mail, senha e contexto de empresa
   */
  async login(params: {
    email: string;
    password: string;
    companyCode?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const user = await this.prisma.user.findFirst({
      where: { email: params.email.trim().toLowerCase() },
      include: {
        companyAccesses: {
          where: { isActive: true },
          include: {
            company: true,
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !IdentityService.verifyPassword(params.password, user.passwordHash)) {
      throw new Error('INVALID_CREDENTIALS: E-mail ou senha inválidos.');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error(`USER_NOT_ACTIVE: Conta de usuário com status ${user.status}.`);
    }

    const selectedAccess =
      user.companyAccesses.find((a) => a.company.code === params.companyCode) ||
      user.companyAccesses[0];

    if (!selectedAccess) {
      throw new Error('NO_COMPANY_ACCESS: Usuário não possui acesso autorizado a nenhuma empresa.');
    }

    const sessionId = `sess_${user.id}_${selectedAccess.companyId}_${crypto.randomUUID()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    const sessionRecord: ActiveSessionRecord = {
      sessionId,
      userId: user.id,
      tenantId: user.tenantId,
      companyId: selectedAccess.companyId,
      email: user.email,
      roleCode: selectedAccess.role.code,
      ipAddress: params.ipAddress || '127.0.0.1',
      userAgent: params.userAgent || 'Enterprise-ERP-Web',
      mfaVerified: !user.mfaEnabled,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    this.sessions.set(sessionId, sessionRecord);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now },
    });

    const accessToken = this.signJwt({
      sub: user.id,
      tenantId: user.tenantId,
      companyId: selectedAccess.companyId,
      email: user.email,
      roleCode: selectedAccess.role.code,
      userType: user.userType as any,
      mfaVerified: !user.mfaEnabled,
      sessionId,
    });

    const configuredMfaSecret =
      user.mfaSecretEncrypted ||
      process.env.MFA_TOTP_SECRET ||
      (process.env.NODE_ENV === 'production'
        ? ''
        : '3132333435363738393031323334353637383930');

    const allowDemoTotp =
      process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEMO_TOTP === 'true';

    await this.auditService.record({
      context: {
        requestId: `req_login_${Date.now()}`,
        tenantId: user.tenantId,
        companyId: selectedAccess.companyId,
        userId: user.id,
        userEmail: user.email,
        userType: user.userType as any,
        roleCode: selectedAccess.role.code,
        permissions: [],
        maxApprovalAmount: Number(selectedAccess.role.maxApprovalAmount),
        allowedCostCenterIds: selectedAccess.allowedCostCenterIds,
        ipAddress: sessionRecord.ipAddress,
        userAgent: sessionRecord.userAgent,
      },
      moduleCode: ErpModuleCode.ADMINISTRATION,
      entityName: 'UserSession',
      entityId: sessionId,
      action: 'CREATE',
      previousValues: null,
      newValues: {
        event: 'USER_LOGIN',
        companyCode: selectedAccess.company.code,
        roleCode: selectedAccess.role.code,
        mfaRequired: user.mfaEnabled,
      },
    });

    return {
      accessToken,
      sessionId,
      mfaRequired: user.mfaEnabled,
      ...(allowDemoTotp && configuredMfaSecret
        ? { demoCurrentTotpCode: IdentityService.generateTotpCode(configuredMfaSecret) }
        : {}),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        userType: user.userType,
        mfaEnabled: user.mfaEnabled,
      },
      activeCompany: {
        id: selectedAccess.company.id,
        code: selectedAccess.company.code,
        tradeName: selectedAccess.company.tradeName,
        roleCode: selectedAccess.role.code,
        maxApprovalAmount: Number(selectedAccess.role.maxApprovalAmount),
      },
    };
  }

  /**
   * Valida segundo fator TOTP MFA e eleva a sessão para `mfaVerified = true`.
   * Compatível com ambientes Serverless (Vercel): caso a instância não tenha a sessão em memória,
   * reconstrói o contexto a partir do banco de dados usando o identificador assinado da sessão.
   */
  async verifyMfaSession(sessionId: string, totpCode: string) {
    let session = this.sessions.get(sessionId);
    let user: any = null;

    if (session) {
      user = await this.prisma.user.findUnique({
        where: { id: session.userId },
        include: {
          companyAccesses: {
            where: { isActive: true },
            include: { role: true },
          },
        },
      });
    } else if (sessionId && sessionId.startsWith('sess_')) {
      const parts = sessionId.split('_');
      const extractedUserId = parts[1];
      const extractedCompanyId = parts[2];
      if (extractedUserId) {
        user = await this.prisma.user.findUnique({
          where: { id: extractedUserId },
          include: {
            companyAccesses: {
              where: { isActive: true },
              include: { role: true },
            },
          },
        });
        if (user) {
          const access =
            user.companyAccesses.find((a: any) => a.companyId === extractedCompanyId) ||
            user.companyAccesses[0];
          const now = new Date();
          session = {
            sessionId,
            userId: user.id,
            tenantId: user.tenantId,
            companyId: access?.companyId || extractedCompanyId,
            email: user.email,
            roleCode: access?.role?.code || 'VIEWER',
            ipAddress: '127.0.0.1',
            userAgent: 'Enterprise-ERP-Serverless',
            mfaVerified: false,
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(),
          };
        }
      }
    }

    if (!session || !user) {
      throw new Error('SESSION_NOT_FOUND: Sessão não encontrada ou expirada.');
    }

    const secretHex =
      user?.mfaSecretEncrypted ||
      process.env.MFA_TOTP_SECRET ||
      (process.env.NODE_ENV === 'production'
        ? ''
        : '3132333435363738393031323334353637383930');
    if (!secretHex) {
      throw new Error('MFA_SECRET_NOT_CONFIGURED: Segredo TOTP não configurado para o usuário.');
    }

    if (!IdentityService.verifyTotpCode(secretHex, totpCode)) {
      throw new Error('INVALID_MFA_CODE: Código de autenticação multifator (TOTP) inválido.');
    }

    session.mfaVerified = true;
    this.sessions.set(sessionId, session);

    const upgradedToken = this.signJwt({
      sub: session.userId,
      tenantId: session.tenantId,
      companyId: session.companyId,
      email: session.email,
      roleCode: session.roleCode,
      userType: (user?.userType as any) || 'INTERNAL',
      mfaVerified: true,
      sessionId,
    });

    return {
      mfaVerified: true,
      accessToken: upgradedToken,
      session,
    };
  }

  /**
   * Lista sessões ativas e revogadas da organização
   */
  listSessions(tenantId: string): ActiveSessionRecord[] {
    return Array.from(this.sessions.values()).filter((s) => s.tenantId === tenantId);
  }

  /**
   * Revoga imediatamente uma sessão ativa
   */
  revokeSession(sessionId: string): ActiveSessionRecord {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('SESSION_NOT_FOUND: Sessão informada não existe.');
    }
    session.revokedAt = new Date().toISOString();
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Solicita recuperação de senha com token de uso único (expiração de 15 minutos)
   */
  async requestPasswordRecovery(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (!user) {
      if (process.env.NODE_ENV === 'production') {
        // Evita enumeração de e-mails em produção
        return {
          message: 'Se o e-mail existir na organização, as instruções foram enviadas.',
          expiresInMinutes: 15,
          email: normalizedEmail,
        };
      }
      throw new Error('USER_NOT_FOUND: E-mail não localizado na organização.');
    }

    const resetToken = `rst_${crypto.randomBytes(16).toString('hex')}`;
    this.passwordResetTokens.set(resetToken, {
      userId: user.id,
      tenantId: user.tenantId,
      expiresAt: Date.now() + 15 * 60 * 1000,
      used: false,
    });

    return {
      ...(process.env.NODE_ENV !== 'production' ? { resetToken } : {}),
      expiresInMinutes: 15,
      email: user.email,
    };
  }
}
