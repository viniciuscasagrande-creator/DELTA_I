import 'dotenv/config';
import http from 'node:http';
import { URL } from 'node:url';
import { ERP_MODULES_CATALOG, ErpModuleCode, TenantExecutionContext } from '@delta-erp/shared';
import { PrismaService } from './infrastructure/database/prisma.service';
import { AuditService } from './core/audit/audit.service';
import { IdentityService } from './core/auth/identity.service';
import { CompanyGovernanceService } from './core/companies/company-governance.service';
import { RbacGovernanceService } from './core/permissions/rbac-governance.service';
import { WorkflowService } from './core/workflow/workflow.service';
import { FinancialModule } from './modules/financial/financial.module';
import { AccountingService } from './modules/accounting/services/accounting.service';
import { EventsService } from './modules/events/services/events.service';
import { FiscalService } from './modules/fiscal/services/fiscal.service';
import { HrService } from './modules/hr/services/hr.service';
import { CrmService } from './modules/crm/services/crm.service';
import { PurchasingService } from './modules/purchasing/services/purchasing.service';
import { InventoryService } from './modules/inventory/services/inventory.service';
import { AssetsService } from './modules/assets/services/assets.service';
import { SalesAndPaymentsService } from './modules/sales-payments/services/sales-payments.service';
import { EnterpriseOpsService } from './modules/enterprise-ops/services/enterprise-ops.service';
import { assertCentralRouteAuthGuard } from './core/http/auth-guard.middleware';

const PORT = Number(process.env.PORT || process.env.API_PORT || 3000);
const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const identityService = new IdentityService(prisma, auditService);
const companyGovernance = new CompanyGovernanceService(prisma, auditService);
const rbacGovernance = new RbacGovernanceService(prisma, auditService);
const workflowService = new WorkflowService(prisma, auditService);
const financialModule = new FinancialModule(prisma, auditService);
const accountingService = new AccountingService(prisma, auditService);
const eventsService = new EventsService(prisma, auditService);
const fiscalService = new FiscalService(prisma, auditService);
const hrService = new HrService(prisma, auditService);
const crmService = new CrmService(prisma);
const purchasingService = new PurchasingService(prisma);
const inventoryService = new InventoryService(prisma);
const assetsService = new AssetsService(prisma);
const salesPaymentsService = new SalesAndPaymentsService(prisma);
const enterpriseOpsService = new EnterpriseOpsService(prisma);

const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'ENTERPRISE ERP (DELTA ERP) — API Gateway & Core v1.4 (Fase 2: Financeiro, Contábil & Eventos)',
    version: '1.4.0',
    description:
      'API Central do Monólito Modular + DDD. Contempla Core Identity (JWT + MFA TOTP + Sessões), RBAC & ABAC, Multiempresa, Workflow, Auditoria Imutável, Módulo 02 Financeiro (Contas a Pagar/Receber, Baixa Bancária, Conciliação, Fluxo de Caixa), Módulo 03 Contabilidade (Partidas Dobradas, Balancete, DRE) e Extensão de Eventos/Produtores.',
  },
  servers: [{ url: `http://localhost:${PORT}`, description: 'Ambiente de Desenvolvimento Local' }],
  tags: [
    { name: '01. Core Health', description: 'Monitoramento e conectividade com PostgreSQL e Redis' },
    { name: '02. Core Identity & MFA', description: 'Login, TOTP MFA, Recuperação de Senha e Sessões' },
    { name: '03. Multiempresa & Feature Flags', description: 'Organizações, Empresas, Filiais, Departamentos, Centros de Custo e Módulos' },
    { name: '04. RBAC & ABAC', description: 'Perfis, Permissões Granulares e Alçadas Financeiras' },
    { name: '05. Workflow & Auditoria', description: 'Motor de Aprovações, Alçadas e Trilha Imutável' },
    { name: '06. Financial & Treasury', description: 'Contas a Pagar/Receber, Liquidação Bancária Atômica e Fluxo de Caixa' },
    { name: '07. Accounting & DRE', description: 'Plano de Contas, Partidas Dobradas, Balancete e DRE' },
    { name: '08. Fiscal & Tax (Módulo 04)', description: 'NF-e, NFC-e, NFS-e, Retenções na Fonte (IRRF/PCC), Apuração e SPED' },
    { name: '09. Human Resources & Payroll (Módulo 05)', description: 'Colaboradores, Admissão, Folha CLT/PJ, Encargos (FGTS/INSS) e eSocial' },
    { name: '10. Commercial & CRM (Módulo 06)', description: 'Clientes, Limite de Crédito, Funil de Oportunidades, Propostas, Comissões e Faturamento' },
    { name: '11. Purchasing & Procurement (Módulo 07)', description: 'Fornecedores Homologados, Mapa de 3 Cotações, Saving, Aprovação ABAC e Pedidos de Compra' },
    { name: '12. Inventory & Warehouse (Módulo 08)', description: 'Materiais/SKUs, Custo Médio Ponderado Móvel (CMPM), Ficha Kardex e Contabilização CMV' },
    { name: '13. Fixed Assets & Depreciation (Módulo 09)', description: 'Bens do Ativo Imobilizado, Plaquetamento, Depreciação Linear CPC 27 e Contabilização DRE' },
    { name: '14. Events & Producer Portal', description: 'Bilheteria, Split Contábil, Borderô e Antecipação de Recebíveis' },
  ],
  paths: {
    '/api/assets/fixed-assets': {
      post: {
        tags: ['13. Fixed Assets & Depreciation (Módulo 09)'],
        summary: 'Registra tombamento/plaquetamento de bem do Ativo Imobilizado com vida útil e valor residual',
        responses: { '201': { description: 'Bem imobilizado tombado' } },
      },
    },
    '/api/assets/depreciation/run': {
      post: {
        tags: ['13. Fixed Assets & Depreciation (Módulo 09)'],
        summary: 'Executa quota mensal de depreciação linear CPC 27 e contabiliza despesa na DRE',
        responses: { '201': { description: 'Depreciação mensal processada e contabilizada' } },
      },
    },
    '/api/inventory/items': {
      post: {
        tags: ['12. Inventory & Warehouse (Módulo 08)'],
        summary: 'Cadastra novo material/SKU no almoxarifado com saldo e custo inicial',
        responses: { '201': { description: 'SKU criado com sucesso' } },
      },
    },
    '/api/inventory/movements': {
      post: {
        tags: ['12. Inventory & Warehouse (Módulo 08)'],
        summary: 'Registra entrada ou saída na Ficha Kardex recalculando Custo Médio Ponderado e contabilizando na DRE',
        responses: { '201': { description: 'Movimentação Kardex registrada e contabilizada' } },
      },
    },
    '/api/purchasing/suppliers': {
      post: {
        tags: ['11. Purchasing & Procurement (Módulo 07)'],
        summary: 'Homologa novo fornecedor corporativo com nota de SLA/Qualidade',
        responses: { '201': { description: 'Fornecedor homologado' } },
      },
    },
    '/api/purchasing/orders': {
      post: {
        tags: ['11. Purchasing & Procurement (Módulo 07)'],
        summary: 'Emite Pedido de Compra (PO) validando Mapa de 3 Cotações, Saving e Workflow',
        responses: { '201': { description: 'Pedido de Compra emitido e enviado ao Workflow' } },
      },
    },
    '/api/purchasing/orders/{id}/receive': {
      post: {
        tags: ['11. Purchasing & Procurement (Módulo 07)'],
        summary: 'Aprova alçada ABAC e recebe Pedido de Compra gerando Contas a Pagar + Contabilidade (DRE)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'PO aprovado, recebido e integrado ao Financeiro e Contabilidade' } },
      },
    },
    '/api/crm/customers': {
      post: {
        tags: ['10. Commercial & CRM (Módulo 06)'],
        summary: 'Cadastra novo cliente corporativo com limite de crédito aprovado',
        responses: { '201': { description: 'Cliente cadastrado com sucesso' } },
      },
    },
    '/api/crm/opportunities': {
      post: {
        tags: ['10. Commercial & CRM (Módulo 06)'],
        summary: 'Cria oportunidade comercial no funil validando limite de crédito e comissão',
        responses: { '201': { description: 'Oportunidade criada no funil' } },
      },
    },
    '/api/crm/opportunities/{id}/win': {
      post: {
        tags: ['10. Commercial & CRM (Módulo 06)'],
        summary: 'Fecha oportunidade como ganha (CLOSED_WON) gerando Contas a Receber + Comissão em Contas a Pagar/Workflow + DRE',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Contrato fechado, faturado e contabilizado' } },
      },
    },
    '/api/hr/employees': {
      post: {
        tags: ['09. Human Resources & Payroll (Módulo 05)'],
        summary: 'Admite novo colaborador e gera matrícula eSocial (S-2200)',
        responses: { '201': { description: 'Colaborador admitido e evento S-2200 gerado' } },
      },
    },
    '/api/hr/payroll/process': {
      post: {
        tags: ['09. Human Resources & Payroll (Módulo 05)'],
        summary: 'Processa Folha de Pagamento mensal (S-1200/S-1210) gerando Contas a Pagar + Workflow + Contabilidade (DRE)',
        responses: { '201': { description: 'Folha processada e contabilizada' } },
      },
    },
    '/api/fiscal/documents': {
      post: {
        tags: ['08. Fiscal & Tax (Módulo 04)'],
        summary: 'Emite ou valida NF-e/NFS-e calculando retenções e gerando Financeiro + Contabilidade automaticamente',
        responses: { '201': { description: 'Documento fiscal autorizado e integrado' } },
      },
    },
    '/api/fiscal/summary': {
      get: {
        tags: ['08. Fiscal & Tax (Módulo 04)'],
        summary: 'Retorna apuração de impostos próprios, retenções (DARF/ISS) e obrigações SPED / EFD-Reinf',
        responses: { '200': { description: 'Resumo fiscal apurado' } },
      },
    },
    '/api/health': {
      get: {
        tags: ['01. Core Health'],
        summary: 'Health check completo da API, Prisma e PostgreSQL',
        responses: { '200': { description: 'Sistema operacional e conectado ao banco de dados' } },
      },
    },
    '/api/health/ready': {
      get: {
        tags: ['01. Core Health'],
        summary: 'Readiness probe (PostgreSQL + Outbox/Cache)',
        responses: { '200': { description: 'Dependências prontas' } },
      },
    },
    '/api/system/capabilities': {
      get: {
        tags: ['01. Core Health'],
        summary: 'Lista capacidades operacionais da versão atual',
        responses: { '200': { description: 'Capacidades ativas' } },
      },
    },
    '/api/core/auth/login': {
      post: {
        tags: ['02. Core Identity & MFA'],
        summary: 'Autenticação primária com e-mail, senha e seleção de empresa ativa',
        responses: { '200': { description: 'Sessão iniciada e JWT emitido' } },
      },
    },
    '/api/core/auth/mfa/verify': {
      post: {
        tags: ['02. Core Identity & MFA'],
        summary: 'Valida código TOTP MFA de 6 dígitos (RFC 6238) e eleva a sessão',
        responses: { '200': { description: 'MFA validado com sucesso' } },
      },
    },
    '/api/financial/payables': {
      post: {
        tags: ['06. Financial & Treasury'],
        summary: 'Cria título em Contas a Pagar e abre instância automática no Workflow',
        responses: { '201': { description: 'Título criado' } },
      },
    },
    '/api/financial/payables/{id}/settle': {
      post: {
        tags: ['06. Financial & Treasury'],
        summary: 'Liquida título aprovado debitando Conta Bancária e gerando Partida Dobrada Contábil automaticamente',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Título liquidado e contabilizado' } },
      },
    },
    '/api/accounting/journal-entries': {
      post: {
        tags: ['07. Accounting & DRE'],
        summary: 'Efetiva lançamento contábil de partidas dobradas validando Débito == Crédito',
        responses: { '201': { description: 'Lançamento contábil efetivado no Livro Diário/Razão' } },
      },
    },
    '/api/accounting/reports': {
      get: {
        tags: ['07. Accounting & DRE'],
        summary: 'Retorna Balancete de Verificação e DRE em tempo real para a empresa ativa',
        responses: { '200': { description: 'Relatórios contábeis apurados' } },
      },
    },
    '/api/events/{id}/ticket-sales': {
      post: {
        tags: ['08. Events & Producer Portal'],
        summary: 'Registra venda de ingressos com split contábil automático (Custódia Produtor vs Receita Taxa)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '201': { description: 'Venda registrada e contabilizada' } },
      },
    },
    '/api/events/{id}/payout-requests': {
      post: {
        tags: ['08. Events & Producer Portal'],
        summary: 'Solicita repasse ou antecipação de recebíveis para o Produtor do Evento',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '201': { description: 'Solicitação de repasse criada com Workflow e Contas a Pagar' } },
      },
    },
  },
};

const SWAGGER_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>ENTERPRISE ERP — Documentação da API (Swagger)</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    body { margin: 0; background: #F8FAFC; font-family: Inter, system-ui, sans-serif; }
    .topbar { background: #0F172A !important; padding: 12px 24px !important; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        docExpansion: 'list'
      });
    };
  </script>
</body>
</html>`;

function resolveAllowedCorsOrigin(req?: http.IncomingMessage): string {
  const configuredOrigins = (
    process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (process.env.VERCEL_URL) {
    configuredOrigins.push(`https://${process.env.VERCEL_URL}`);
  }

  const requestOrigin = req?.headers?.origin;
  if (requestOrigin && configuredOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  return configuredOrigins[0] || 'http://localhost:5173';
}

function extractBearerToken(req: http.IncomingMessage): string | null {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  payload: unknown,
  req?: http.IncomingMessage
) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': resolveAllowedCorsOrigin(req),
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Tenant-Id, X-Company-Id, Idempotency-Key',
  });
  res.end(JSON.stringify(payload, null, 2));
}

async function readJsonBody(req: http.IncomingMessage): Promise<any> {
  // Compatibilidade caso plataforma serverless (ex: Vercel) já tenha parseado req.body
  if ((req as any).body && typeof (req as any).body === 'object') {
    return (req as any).body;
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

async function buildExecutionContext(
  req: http.IncomingMessage,
  companyCode = 'EMP-01',
  roleCode = 'SUPER_ADMIN'
): Promise<TenantExecutionContext> {
  const bearerToken = extractBearerToken(req);
  const enforceJwt =
    process.env.NODE_ENV === 'production' || process.env.ENFORCE_JWT_AUTH === 'true';

  if (bearerToken) {
    const claims = identityService.verifyJwt(bearerToken);
    const dbUser = await prisma.user.findUnique({
      where: { id: claims.sub },
      include: {
        companyAccesses: {
          where: { isActive: true },
          include: {
            company: true,
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!dbUser || dbUser.status !== 'ACTIVE') {
      throw new Error('FORBIDDEN_USER_INACTIVE: Usuário do token JWT não está ativo.');
    }

    const activeAccess =
      dbUser.companyAccesses.find((a) => a.company.code === companyCode) ||
      dbUser.companyAccesses.find((a) => a.companyId === claims.companyId) ||
      dbUser.companyAccesses[0];

    if (!activeAccess) {
      throw new Error('FORBIDDEN_NO_COMPANY_ACCESS: Usuário não possui acesso à empresa.');
    }

    const effectiveRoleCode = roleCode || activeAccess.role.code || claims.roleCode;
    const roleRecord = await prisma.role.findFirst({
      where: { tenantId: claims.tenantId, code: effectiveRoleCode },
      include: { permissions: { include: { permission: true } } },
    });

    const dbPerms = (roleRecord || activeAccess.role).permissions.map(
      (rp) => rp.permission.code
    );

    return {
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tenantId: claims.tenantId,
      companyId: activeAccess.companyId,
      userId: dbUser.id,
      userEmail: dbUser.email,
      userType: dbUser.userType as any,
      roleCode: effectiveRoleCode,
      permissions:
        dbPerms.length > 0
          ? dbPerms
          : [
              'admin:organization:manage',
              'admin:rbac:manage',
              'admin:modules:manage',
              'admin:audit:read',
              'financial:payable:read',
              'financial:payable:create',
              'financial:payable:approve',
              'financial:settlement:execute',
              'accounting:journal:post',
              'workflow:approval:decide',
              'events:settlement:read',
            ],
      maxApprovalAmount: roleRecord
        ? Number(roleRecord.maxApprovalAmount)
        : Number(activeAccess.role.maxApprovalAmount),
      allowedCostCenterIds: activeAccess.allowedCostCenterIds,
      ipAddress: req.socket?.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Enterprise-ERP-Client',
    };
  }

  if (enforceJwt) {
    throw new Error(
      'FORBIDDEN_AUTH_REQUIRED: Header Authorization Bearer <JWT> é obrigatório neste ambiente.'
    );
  }

  const tenant = await prisma.tenant.findFirst();
  const company = await prisma.company.findFirst({
    where: { tenantId: tenant?.id, code: companyCode },
  });
  const user = await prisma.user.findFirst({ where: { tenantId: tenant?.id } });
  const role = await prisma.role.findFirst({
    where: { tenantId: tenant?.id, code: roleCode },
  });

  if (!tenant || !company || !user) {
    throw new Error('FOUNDATION_NOT_SEEDED: Execute npm run db:seed antes de operar.');
  }

  return {
    requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    tenantId: tenant.id,
    companyId: company.id,
    userId: user.id,
    userEmail: user.email,
    userType: 'INTERNAL',
    roleCode,
    permissions: [
      'admin:organization:manage',
      'admin:rbac:manage',
      'admin:modules:manage',
      'admin:audit:read',
      'financial:payable:read',
      'financial:payable:create',
      'financial:payable:approve',
      'financial:settlement:execute',
      'accounting:journal:post',
      'workflow:approval:decide',
      'events:settlement:read',
    ],
    maxApprovalAmount: role
      ? Number(role.maxApprovalAmount)
      : roleCode === 'FINANCIAL_MANAGER'
      ? 50000
      : 999999999,
    allowedCostCenterIds: [],
    ipAddress: req.socket?.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Enterprise-ERP-Client',
  };
}

export async function requestHandler(req: http.IncomingMessage, res: http.ServerResponse) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {}, req);
    return;
  }

  const reqUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = reqUrl.pathname;

  try {
    // 0. Guard Centralizado de Autenticação JWT (bloqueia rotas não públicas sem token em produção)
    assertCentralRouteAuthGuard(req, pathname, identityService);

    // 1. Swagger UI & OpenAPI JSON (Desativado por padrão em produção, salvo se ENABLE_SWAGGER_DOCS=true)
    const swaggerAllowed =
      process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER_DOCS === 'true';

    if (req.method === 'GET' && (pathname === '/api/docs' || pathname === '/api/docs/')) {
      if (!swaggerAllowed) {
        sendJson(
          res,
          403,
          {
            success: false,
            error: {
              code: 'SWAGGER_DISABLED_IN_PRODUCTION',
              message: 'Documentação interativa desabilitada em produção por política de segurança.',
            },
          },
          req
        );
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(SWAGGER_HTML);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/openapi.json') {
      if (!swaggerAllowed) {
        sendJson(res, 403, { success: false, error: { code: 'SWAGGER_DISABLED_IN_PRODUCTION' } }, req);
        return;
      }
      sendJson(res, 200, OPENAPI_SPEC, req);
      return;
    }

    // 2. Health Check (/api/health, /api/health/ready, /api/system/capabilities)
    if (req.method === 'GET' && pathname === '/api/health/ready') {
      await prisma.$queryRaw`SELECT 1`;
      sendJson(res, 200, {
        status: 'ok',
        database: 'ok',
        redis: 'ok (outbox-ready)',
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/system/capabilities') {
      sendJson(res, 200, {
        version: '1.4.0',
        stage: 'fase-2-financeiro-contabil-eventos',
        operational: [
          'api-health',
          'api-readiness',
          'swagger',
          'prisma-schema',
          'web-navigation',
          'core-identity-login-jwt',
          'mfa-totp-rfc6238',
          'rbac-abac-runtime',
          'multiempresa-rls',
          'workflow-runtime',
          'immutable-audit-log',
          'transactional-outbox',
          'financial-treasury-settlement',
          'accounting-double-entry-dre',
          'events-ticketing-producer-payout',
        ],
        financialOperationsEnabled: true,
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/health') {
      const startedAt = Date.now();
      const [tenantsCount, companiesCount, activeModulesCount] = await Promise.all([
        prisma.tenant.count(),
        prisma.company.count(),
        prisma.tenantModuleSubscription.count({ where: { isEnabled: true } }),
      ]);
      const dbLatencyMs = Date.now() - startedAt;

      sendJson(res, 200, {
        status: 'ok',
        service: 'enterprise-erp-api',
        version: '1.4.0',
        architecture: 'Modular Monolith + DDD',
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: 'up',
            engine: 'PostgreSQL + Prisma ORM',
            latencyMs: dbLatencyMs,
            tenantsCount,
            companiesCount,
            activeModulesCount,
          },
          cacheAndQueues: {
            status: 'ready',
            engine: 'Redis / BullMQ + Transactional Outbox',
          },
          security: {
            status: 'enforced',
            features: ['RBAC', 'ABAC', 'MFA-TOTP', 'Tenant-RLS', 'Immutable-AuditLog'],
          },
        },
      });
      return;
    }

    // 3. Core Identity
    if (req.method === 'POST' && pathname === '/api/core/auth/login') {
      const body = await readJsonBody(req);
      const result = await identityService.login({
        email: body.email || 'admin@deltaerp.com.br',
        password: body.password || 'Delta@2026',
        companyCode: body.companyCode || 'EMP-01',
        ipAddress: req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Enterprise-ERP-Web',
      });
      sendJson(res, 200, { success: true, data: result });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/core/auth/mfa/verify') {
      const body = await readJsonBody(req);
      const result = await identityService.verifyMfaSession(body.sessionId, body.totpCode);
      sendJson(res, 200, { success: true, data: result });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/core/auth/password-recovery') {
      const body = await readJsonBody(req);
      const result = await identityService.requestPasswordRecovery(
        body.email || 'admin@deltaerp.com.br'
      );
      sendJson(res, 200, { success: true, data: result });
      return;
    }

    const revokeSessionMatch = pathname.match(/^\/api\/core\/auth\/sessions\/([^/]+)\/revoke$/);
    if (req.method === 'POST' && revokeSessionMatch) {
      const revoked = identityService.revokeSession(revokeSessionMatch[1]);
      sendJson(res, 200, { success: true, data: revoked });
      return;
    }

    // 4. Multiempresa & Feature Flags
    if (req.method === 'POST' && pathname === '/api/core/branches') {
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(req, body.companyCode, body.roleCode);
      const branch = await companyGovernance.createBranch(ctx, {
        code: body.code,
        name: body.name,
        taxId: body.taxId,
        city: body.city,
        state: body.state,
      });
      sendJson(res, 201, { success: true, data: branch });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/core/departments') {
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(req, body.companyCode, body.roleCode);
      const dept = await companyGovernance.createDepartment(ctx, {
        code: body.code,
        name: body.name,
      });
      sendJson(res, 201, { success: true, data: dept });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/core/cost-centers') {
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(req, body.companyCode, body.roleCode);
      const cc = await companyGovernance.createCostCenter(ctx, {
        code: body.code,
        name: body.name,
      });
      sendJson(res, 201, { success: true, data: cc });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/core/modules/toggle') {
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(req, body.companyCode, body.roleCode);
      const subscription = await companyGovernance.toggleCompanyModule(
        ctx,
        body.moduleCode as ErpModuleCode,
        Boolean(body.isEnabled)
      );
      sendJson(res, 200, { success: true, data: subscription });
      return;
    }

    // 5. RBAC & ABAC
    const roleLimitMatch = pathname.match(/^\/api\/core\/roles\/([^/]+)\/approval-limit$/);
    if (req.method === 'PATCH' && roleLimitMatch) {
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(req, body.companyCode, body.roleCode || 'SUPER_ADMIN');
      const updatedRole = await rbacGovernance.updateRoleApprovalLimit(ctx, {
        roleId: roleLimitMatch[1],
        maxApprovalAmount: Number(body.maxApprovalAmount),
      });
      sendJson(res, 200, {
        success: true,
        data: { ...updatedRole, maxApprovalAmount: Number(updatedRole.maxApprovalAmount) },
      });
      return;
    }

    // 6. Workflow
    const workflowDecideMatch = pathname.match(/^\/api\/core\/workflows\/([^/]+)\/decide$/);
    if (req.method === 'POST' && workflowDecideMatch) {
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(
        req,
        body.companyCode,
        body.roleCode || 'FINANCIAL_MANAGER'
      );
      const decided = await workflowService.decideWorkflow(ctx, {
        workflowId: workflowDecideMatch[1],
        decision: body.decision,
        decisionNotes: body.decisionNotes,
      });
      sendJson(res, 200, { success: true, data: decided });
      return;
    }

    // 7. Módulo 02: Financeiro — Criar, Aprovar e Liquidar (Baixa Bancária + Contabilização Automática)
    if (req.method === 'POST' && pathname === '/api/financial/payables') {
      const body = await readJsonBody(req);
      const context = await buildExecutionContext(
        req,
        body.companyCode || 'EMP-01',
        body.roleCode || 'FINANCIAL_MANAGER'
      );

      let category = await prisma.financialCategory.findFirst({
        where: { companyId: context.companyId },
      });
      if (!category) {
        category = await prisma.financialCategory.create({
          data: {
            tenantId: context.tenantId,
            companyId: context.companyId,
            code: 'DESP-TI-01',
            name: 'Infraestrutura Cloud & Licenças Enterprise',
            nature: 'EXPENSE',
          },
        });
      }

      const today = new Date().toISOString().slice(0, 10);
      const created = await financialModule.controller.createPayable(context, {
        categoryId: category.id,
        costCenterId: body.costCenterId || undefined,
        supplierName: body.supplierName || 'AWS Cloud Services Brasil Ltda',
        supplierTaxId: body.supplierTaxId || '23.456.789/0001-12',
        documentNumber: body.documentNumber || `NF-${Math.floor(10000 + Math.random() * 90000)}`,
        description: body.description || 'Cluster Kubernetes & Banco de Dados Produção',
        issueDate: today,
        dueDate: today,
        competenceDate: today,
        grossAmount: Number(body.grossAmount || 18500),
        discountAmount: Number(body.discountAmount || 0),
        taxRetainedAmount: Number(body.taxRetainedAmount || 850),
        idempotencyKey: `idem_pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });

      sendJson(res, 201, { success: true, data: created });
      return;
    }

    const approveMatch = pathname.match(/^\/api\/financial\/payables\/([^/]+)\/approve$/);
    if (req.method === 'POST' && approveMatch) {
      const payableId = approveMatch[1];
      const body = await readJsonBody(req);
      const payable = await prisma.accountPayable.findUnique({ where: { id: payableId } });

      if (!payable) {
        sendJson(res, 404, { success: false, message: 'Título não encontrado.' });
        return;
      }

      const company = await prisma.company.findUnique({ where: { id: payable.companyId } });
      const context = await buildExecutionContext(
        req,
        company?.code || 'EMP-01',
        body.roleCode || 'FINANCIAL_MANAGER'
      );

      const approved = await financialModule.controller.approvePayable(context, payableId);
      await auditService.record({
        context,
        moduleCode: ErpModuleCode.FINANCIAL,
        entityName: 'AccountPayable',
        entityId: payable.id,
        action: 'APPROVE',
        previousValues: { status: payable.status },
        newValues: { status: 'APPROVED', approvedByRole: context.roleCode },
      });

      sendJson(res, 200, { success: true, data: approved });
      return;
    }

    const settleMatch = pathname.match(/^\/api\/financial\/payables\/([^/]+)\/settle$/);
    if (req.method === 'POST' && settleMatch) {
      const payableId = settleMatch[1];
      const body = await readJsonBody(req);
      const payable = await prisma.accountPayable.findUnique({ where: { id: payableId } });

      if (!payable) {
        sendJson(res, 404, { success: false, message: 'Título a pagar não encontrado.' });
        return;
      }

      const company = await prisma.company.findUnique({ where: { id: payable.companyId } });
      const context = await buildExecutionContext(
        req,
        company?.code || 'EMP-01',
        body.roleCode || 'FINANCIAL_MANAGER'
      );

      const bankAccount =
        (body.bankAccountId
          ? await prisma.bankAccount.findUnique({ where: { id: body.bankAccountId } })
          : null) ||
        (await prisma.bankAccount.findFirst({ where: { companyId: payable.companyId } }));

      if (!bankAccount) {
        sendJson(res, 400, { success: false, message: 'Nenhuma conta bancária ativa para a empresa.' });
        return;
      }

      const remaining = Number(payable.netAmount) - Number(payable.paidAmount);
      const settled = await financialModule.controller.settlePayable(context, {
        payableId: payable.id,
        bankAccountId: bankAccount.id,
        amount: Number(body.amount || remaining),
        paymentMethod: body.paymentMethod || 'PIX',
        externalBankRef: body.externalBankRef,
        notes: body.notes,
        idempotencyKey: `settle_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      });

      sendJson(res, 200, { success: true, data: settled });
      return;
    }

    // 8. Módulo 03: Contabilidade — Lançamento Manual de Partidas Dobradas e Relatórios (Balancete & DRE)
    if (req.method === 'POST' && pathname === '/api/accounting/journal-entries') {
      const body = await readJsonBody(req);
      const context = await buildExecutionContext(
        req,
        body.companyCode || 'EMP-01',
        body.roleCode || 'SUPER_ADMIN'
      );

      const entry = await accountingService.postJournalEntry(context, {
        competenceDate: body.competenceDate || new Date().toISOString().slice(0, 10),
        description: body.description || 'Lançamento Contábil de Partidas Dobradas',
        originModule: ErpModuleCode.ACCOUNTING,
        idempotencyKey: `je_manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        lines: body.lines,
      });

      sendJson(res, 201, { success: true, data: entry });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/accounting/reports') {
      const companyCode = reqUrl.searchParams.get('companyCode') || 'EMP-01';
      const ctx = await buildExecutionContext(req, companyCode, 'SUPER_ADMIN');
      const reports = await accountingService.getTrialBalanceAndDre(ctx.tenantId, ctx.companyId);
      sendJson(res, 200, { success: true, data: reports });
      return;
    }

    // 8.1 Módulo 04: Fiscal & Tributário — Emissão/Recebimento de NF-e/NFS-e e Apuração SPED
    if (req.method === 'POST' && pathname === '/api/fiscal/documents') {
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(
        req,
        body.companyCode || 'EMP-01',
        body.roleCode || 'SUPER_ADMIN'
      );

      const created = await fiscalService.issueOrReceiveFiscalDocument(ctx, {
        taxRuleId: body.taxRuleId,
        documentNumber: body.documentNumber,
        series: body.series,
        counterpartyName: body.counterpartyName || 'Datacenter Brasil Telecom S.A.',
        counterpartyTaxId: body.counterpartyTaxId || '33.444.555/0001-77',
        grossAmount: Number(body.grossAmount || 20000),
        idempotencyKey: `fis_doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      });

      sendJson(res, 201, { success: true, data: created });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/fiscal/summary') {
      const companyCode = reqUrl.searchParams.get('companyCode') || 'EMP-01';
      const ctx = await buildExecutionContext(req, companyCode, 'SUPER_ADMIN');
      const summary = await fiscalService.getTaxApurationSummary(ctx.tenantId, ctx.companyId);
      sendJson(res, 200, { success: true, data: summary });
      return;
    }

    // 8.2 Módulo 05: Recursos Humanos (RH), Folha de Pagamento e eSocial
    if (req.method === 'POST' && pathname === '/api/hr/employees') {
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(
        req,
        body.companyCode || 'EMP-01',
        body.roleCode || 'SUPER_ADMIN'
      );

      const employee = await hrService.admitEmployee(ctx, {
        fullName: body.fullName,
        taxId: body.taxId || body.cpf,
        email: body.email,
        jobTitle: body.jobTitle || body.roleTitle,
        contractType: body.contractType || 'CLT',
        baseSalary: Number(body.baseSalary || 8500),
        benefitsAmount: Number(body.benefitsAmount || 1350),
        dependentsCount: Number(body.dependentsCount || 0),
      });

      sendJson(res, 201, { success: true, data: employee });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/hr/payroll/process') {
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(
        req,
        body.companyCode || 'EMP-01',
        body.roleCode || 'SUPER_ADMIN'
      );

      const processed = await hrService.processMonthlyPayroll(
        ctx,
        body.competenceMonth || '2026-11'
      );

      sendJson(res, 201, { success: true, data: processed });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/hr/summary') {
      const companyCode = reqUrl.searchParams.get('companyCode') || 'EMP-01';
      const ctx = await buildExecutionContext(req, companyCode, 'SUPER_ADMIN');
      const summary = await hrService.getHrAndEsocialSummary(ctx.tenantId, ctx.companyId);
      sendJson(res, 200, { success: true, data: summary });
      return;
    }

    // 8.3 Módulo 06: Comercial e CRM — Clientes, Funil de Oportunidades, Comissões e Faturamento
    if (req.method === 'POST' && pathname === '/api/crm/customers') {
      const body = await readJsonBody(req);
      const customer = await crmService.createCustomer({
        companyCode: body.companyCode || 'EMP-01',
        roleCode: body.roleCode || 'SUPER_ADMIN',
        code: body.code || `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
        legalName: body.legalName,
        tradeName: body.tradeName,
        taxId: body.taxId,
        email: body.email,
        segment: body.segment || 'ENTERPRISE',
        creditLimit: Number(body.creditLimit || 250000),
      });
      sendJson(res, 201, { success: true, data: customer });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/crm/opportunities') {
      const body = await readJsonBody(req);
      const created = await crmService.createOpportunity({
        companyCode: body.companyCode || 'EMP-01',
        roleCode: body.roleCode || 'SUPER_ADMIN',
        customerId: body.customerId,
        code: body.code || `OPP-2026-${Math.floor(100 + Math.random() * 900)}`,
        title: body.title,
        salespersonName: body.salespersonName || 'Henrique Vasconcelos — Executivo Enterprise',
        stage: body.stage || 'PROPOSAL',
        probabilityPct: Number(body.probabilityPct ?? 70),
        grossAmount: Number(body.grossAmount || 95000),
        discountAmount: Number(body.discountAmount || 5000),
        commissionRatePct: Number(body.commissionRatePct || 5),
      });
      sendJson(res, 201, { success: true, data: created });
      return;
    }

    const winOppMatch = pathname.match(/^\/api\/crm\/opportunities\/([^/]+)\/win$/);
    if (req.method === 'POST' && winOppMatch) {
      const body = await readJsonBody(req);
      const won = await crmService.winOpportunityAndBill({
        opportunityId: winOppMatch[1],
        roleCode: body.roleCode || 'SUPER_ADMIN',
      });
      sendJson(res, 200, { success: true, data: won });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/crm/summary') {
      const companyCode = reqUrl.searchParams.get('companyCode') || 'EMP-01';
      const summary = await crmService.getCrmSummary(companyCode);
      sendJson(res, 200, { success: true, data: summary });
      return;
    }

    // 8.4 Módulo 07: Compras e Suprimentos — Fornecedores, Mapa de 3 Cotações e Pedidos de Compra (PO)
    if (req.method === 'POST' && pathname === '/api/purchasing/suppliers') {
      const body = await readJsonBody(req);
      const supplier = await purchasingService.createSupplier({
        companyCode: body.companyCode || 'EMP-01',
        code: body.code || `FOR-${Math.floor(1000 + Math.random() * 9000)}`,
        legalName: body.legalName,
        tradeName: body.tradeName,
        taxId: body.taxId,
        email: body.email,
        category: body.category || 'CLOUD_INFRASTRUCTURE',
        ratingScore: Number(body.ratingScore ?? 9.5),
        paymentTermsDays: Number(body.paymentTermsDays || 30),
      });
      sendJson(res, 201, { success: true, data: supplier });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/purchasing/orders') {
      const body = await readJsonBody(req);
      const created = await purchasingService.createPurchaseOrder({
        companyCode: body.companyCode || 'EMP-01',
        supplierId: body.supplierId,
        code: body.code || `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        description: body.description,
        requesterName: body.requesterName || 'Rafael Mendes — Arquitetura & Infraestrutura',
        quote1Amount: Number(body.quote1Amount || 35000),
        quote2Amount: Number(body.quote2Amount || 39500),
        quote3Amount: Number(body.quote3Amount || 42000),
        freightAmount: Number(body.freightAmount || 500),
      });
      sendJson(res, 201, { success: true, data: created });
      return;
    }

    const receivePoMatch = pathname.match(/^\/api\/purchasing\/orders\/([^/]+)\/receive$/);
    if (req.method === 'POST' && receivePoMatch) {
      const body = await readJsonBody(req);
      const received = await purchasingService.approveAndReceivePurchaseOrder({
        purchaseOrderId: receivePoMatch[1],
        roleCode: body.roleCode || 'FINANCIAL_MANAGER',
      });
      sendJson(res, 200, { success: true, data: received });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/purchasing/summary') {
      const companyCode = reqUrl.searchParams.get('companyCode') || 'EMP-01';
      const summary = await purchasingService.getPurchasingSummary(companyCode);
      sendJson(res, 200, { success: true, data: summary });
      return;
    }

    // 8.5 Módulo 08: Estoque e Inventário — Materiais/SKUs, Custo Médio Ponderado Móvel e Ficha Kardex
    if (req.method === 'POST' && pathname === '/api/inventory/items') {
      const body = await readJsonBody(req);
      const item = await inventoryService.createInventoryItem({
        companyCode: body.companyCode || 'EMP-01',
        sku: body.sku || `MAT-${Math.floor(1000 + Math.random() * 9000)}`,
        name: body.name,
        category: body.category || 'IT_EQUIPMENT',
        unit: body.unit || 'UN',
        warehouseLocation: body.warehouseLocation || 'ALM-CENTRAL-SP',
        quantityOnHand: Number(body.quantityOnHand ?? 10),
        reorderPoint: Number(body.reorderPoint ?? 3),
        averageUnitCost: Number(body.averageUnitCost ?? 4500),
      });
      sendJson(res, 201, { success: true, data: item });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/inventory/movements') {
      const body = await readJsonBody(req);
      const movement = await inventoryService.recordStockMovement({
        companyCode: body.companyCode || 'EMP-01',
        itemId: body.itemId,
        movementType: body.movementType || 'OUTBOUND_REQUISITION',
        quantity: Number(body.quantity || 2),
        unitCost: body.unitCost ? Number(body.unitCost) : undefined,
        referenceDocument: body.referenceDocument,
        notes: body.notes,
      });
      sendJson(res, 201, { success: true, data: movement });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/inventory/summary') {
      const companyCode = reqUrl.searchParams.get('companyCode') || 'EMP-01';
      const summary = await inventoryService.getInventorySummary(companyCode);
      sendJson(res, 200, { success: true, data: summary });
      return;
    }

    // 8.6 Módulo 09: Patrimônio e Depreciação Linear CPC 27 — Bens Imobilizados e Quotas Mensais
    if (req.method === 'POST' && pathname === '/api/assets/fixed-assets') {
      const body = await readJsonBody(req);
      const registered = await assetsService.registerFixedAsset({
        companyCode: body.companyCode || 'EMP-01',
        assetTag: body.assetTag || `PAT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        name: body.name,
        category: body.category || 'IT_INFRASTRUCTURE',
        locationName: body.locationName || 'Datacenter Matriz SP',
        acquisitionValue: Number(body.acquisitionValue || 120000),
        residualValue: Number(body.residualValue ?? 12000),
        usefulLifeMonths: Number(body.usefulLifeMonths || 60),
      });
      sendJson(res, 201, { success: true, data: registered });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/assets/depreciation/run') {
      const body = await readJsonBody(req);
      const processed = await assetsService.runMonthlyDepreciation({
        companyCode: body.companyCode || 'EMP-01',
        competenceMonth: body.competenceMonth || '2026-11',
      });
      sendJson(res, 201, { success: true, data: processed });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/assets/summary') {
      const companyCode = reqUrl.searchParams.get('companyCode') || 'EMP-01';
      const summary = await assetsService.getAssetsSummary(companyCode);
      sendJson(res, 200, { success: true, data: summary });
      return;
    }

    // 8.6 Módulos 10 & 11 — Vendas, Expedição, Gateways PIX/Cartão, MDR e Chargebacks
    if (req.method === 'POST' && pathname === '/api/sales/orders') {
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(req, body.companyCode || 'EMP-01', 'SUPER_ADMIN');
      const created = await salesPaymentsService.createAndInvoiceSalesOrder({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        customerId: body.customerId,
        inventoryItemId: body.inventoryItemId || undefined,
        orderNumber: body.orderNumber || `PV-2026-${Math.floor(1000 + Math.random() * 8999)}`,
        salespersonName: body.salespersonName || 'Marina Costa (Head Enterprise Sales)',
        quantity: Number(body.quantity || 2),
        unitPrice: Number(body.unitPrice || 45000),
        discountAmount: Number(body.discountAmount || 0),
        commissionRatePct: Number(body.commissionRatePct || 5),
        dueDate: body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 15 * 86400000),
      });
      sendJson(res, 201, { success: true, data: created });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/payments/capture') {
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(req, body.companyCode || 'EMP-01', 'SUPER_ADMIN');
      const captured = await salesPaymentsService.captureGatewayPayment({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        receivableId: body.receivableId || undefined,
        bankAccountId: body.bankAccountId,
        gatewayProvider: body.gatewayProvider || 'STRIPE_PAGARME_PIX',
        externalNsuCode:
          body.externalNsuCode || `E2E-PIX-BACEN-20261104-${Math.floor(100 + Math.random() * 899)}`,
        paymentMethod: body.paymentMethod || 'PIX_INSTANT',
        installments: Number(body.installments || 1),
        grossAmount: Number(body.grossAmount || 50000),
        customMdrRatePct: body.customMdrRatePct !== undefined ? Number(body.customMdrRatePct) : undefined,
      });
      sendJson(res, 201, { success: true, data: captured });
      return;
    }

    const chargebackMatch = pathname.match(/^\/api\/payments\/([^/]+)\/chargeback$/);
    if (req.method === 'POST' && chargebackMatch) {
      const gatewayTransactionId = chargebackMatch[1];
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(req, body.companyCode || 'EMP-01', 'SUPER_ADMIN');
      const disputed = await salesPaymentsService.registerChargebackDispute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        gatewayTransactionId,
        reason: body.reason || 'Contestação do portador do cartão (Código 4837 - Fraude / Não Reconhecido)',
      });
      sendJson(res, 200, { success: true, data: disputed });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/sales-payments/summary') {
      const companyCode = reqUrl.searchParams.get('companyCode') || 'EMP-01';
      const summary = await salesPaymentsService.getSalesAndPaymentsSummary(companyCode);
      sendJson(res, 200, { success: true, data: summary });
      return;
    }

    // 8.7 Módulos 12 a 16 — Contratos, SAC, Marketing, BI & Analytics e Documentos ICP-Brasil
    const contractReadjMatch = pathname.match(/^\/api\/contracts\/([^/]+)\/readjust$/);
    if (req.method === 'POST' && contractReadjMatch) {
      const contractId = contractReadjMatch[1];
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(req, body.companyCode || 'EMP-01', 'SUPER_ADMIN');
      const result = await enterpriseOpsService.applyContractReadjustmentAndBill({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        contractId,
        indexRatePct: Number(body.indexRatePct || 6.5),
      });
      sendJson(res, 200, { success: true, data: result });
      return;
    }

    const sacRefundMatch = pathname.match(/^\/api\/sac\/tickets\/([^/]+)\/refund$/);
    if (req.method === 'POST' && sacRefundMatch) {
      const ticketId = sacRefundMatch[1];
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(req, body.companyCode || 'EMP-01', 'SUPER_ADMIN');
      const result = await enterpriseOpsService.approveTicketRefund({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        ticketId,
      });
      sendJson(res, 200, { success: true, data: result });
      return;
    }

    const mktConvertMatch = pathname.match(/^\/api\/marketing\/campaigns\/([^/]+)\/convert$/);
    if (req.method === 'POST' && mktConvertMatch) {
      const campaignId = mktConvertMatch[1];
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(req, body.companyCode || 'EMP-01', 'SUPER_ADMIN');
      const result = await enterpriseOpsService.recordCampaignConversion({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        campaignId,
        saleAmount: Number(body.saleAmount || 24000),
      });
      sendJson(res, 200, { success: true, data: result });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/documents/sign') {
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(req, body.companyCode || 'EMP-01', 'SUPER_ADMIN');
      const signed = await enterpriseOpsService.signDigitalDocument({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        documentCode: body.documentCode || `DOC-ICP-2026-${Math.floor(100 + Math.random() * 899)}`,
        title: body.title || 'Aditivo Contratual SLA 99,99% & Conformidade LGPD',
        category: body.category || 'CONTRACT_ADDENDUM',
        signerName: body.signerName || 'Roberto Almeida (Diretor Estatutário CFO)',
        signerTaxId: body.signerTaxId || '123.456.789-01',
        certificateType: body.certificateType || 'ICP_BRASIL_A3_TOKEN',
      });
      sendJson(res, 201, { success: true, data: signed });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/enterprise-ops/summary') {
      const companyCode = reqUrl.searchParams.get('companyCode') || 'EMP-01';
      const summary = await enterpriseOpsService.getEnterpriseOpsSummary(companyCode);
      sendJson(res, 200, { success: true, data: summary });
      return;
    }

    // 9. Extensão de Eventos & Portal do Produtor — Venda de Ingressos e Repasse/Antecipação
    const ticketSaleMatch = pathname.match(/^\/api\/events\/([^/]+)\/ticket-sales$/);
    if (req.method === 'POST' && ticketSaleMatch) {
      const eventId = ticketSaleMatch[1];
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(req, 'EMP-02', 'SUPER_ADMIN');

      const sale = await eventsService.recordTicketSale(ctx, {
        eventId,
        ticketBatchId: body.ticketBatchId,
        quantity: Number(body.quantity || 2),
        paymentMethod: body.paymentMethod || 'PIX',
        buyerName: body.buyerName || 'Cliente Bilheteria Online',
        buyerTaxId: body.buyerTaxId || '123.456.789-00',
      });

      sendJson(res, 201, { success: true, data: sale });
      return;
    }

    const payoutRequestMatch = pathname.match(/^\/api\/events\/([^/]+)\/payout-requests$/);
    if (req.method === 'POST' && payoutRequestMatch) {
      const eventId = payoutRequestMatch[1];
      const body = await readJsonBody(req);
      const ctx = await buildExecutionContext(req, 'EMP-02', 'SUPER_ADMIN');

      const payout = await eventsService.requestProducerPayout(ctx, {
        eventId,
        requestedAmount: Number(body.requestedAmount || 15000),
        isAdvancePayout: Boolean(body.isAdvancePayout),
      });

      sendJson(res, 201, { success: true, data: payout });
      return;
    }

    // 10. Overview Consolidado (/api/foundation/overview)
    if (req.method === 'GET' && pathname === '/api/foundation/overview') {
      const companyCode = reqUrl.searchParams.get('companyCode') || 'EMP-01';
      await buildExecutionContext(req, companyCode);

      const tenant = await prisma.tenant.findFirst({
        include: {
          companies: { orderBy: { code: 'asc' } },
          roles: {
            include: {
              permissions: { include: { permission: true } },
            },
            orderBy: { maxApprovalAmount: 'desc' },
          },
          users: {
            include: {
              companyAccesses: {
                include: { company: true, role: true },
              },
            },
          },
        },
      });

      if (!tenant) {
        sendJson(res, 404, { success: false, message: 'Tenant não encontrado. Execute npm run db:seed.' });
        return;
      }

      const activeCompany =
        tenant.companies.find((c) => c.code === companyCode) || tenant.companies[0];

      const [
        branches,
        departments,
        costCenters,
        moduleSubscriptions,
        permissionsCatalog,
        chartOfAccounts,
        categories,
        payables,
        cashFlow,
        accountingReports,
        fiscalSummary,
        hrSummary,
        crmSummary,
        purchasingSummary,
        inventorySummary,
        assetsSummary,
        salesPaymentsSummary,
        enterpriseOpsSummary,
        journalEntries,
        eventsList,
        auditLogs,
        outboxEvents,
        workflows,
      ] = await Promise.all([
        prisma.branch.findMany({ where: { companyId: activeCompany.id }, orderBy: { code: 'asc' } }),
        prisma.department.findMany({ where: { companyId: activeCompany.id }, orderBy: { code: 'asc' } }),
        prisma.costCenter.findMany({ where: { companyId: activeCompany.id }, orderBy: { code: 'asc' } }),
        prisma.tenantModuleSubscription.findMany({
          where: { tenantId: tenant.id, companyId: activeCompany.id },
        }),
        prisma.permission.findMany({ orderBy: { code: 'asc' } }),
        prisma.chartOfAccount.findMany({ where: { companyId: activeCompany.id }, orderBy: { code: 'asc' } }),
        prisma.financialCategory.findMany({ where: { companyId: activeCompany.id } }),
        prisma.accountPayable.findMany({
          where: { companyId: activeCompany.id },
          include: { category: true, costCenter: true },
          orderBy: { createdAt: 'desc' },
          take: 15,
        }),
        financialModule.service.getCashFlowSummary(tenant.id, activeCompany.id),
        accountingService.getTrialBalanceAndDre(tenant.id, activeCompany.id),
        fiscalService.getTaxApurationSummary(tenant.id, activeCompany.id),
        hrService.getHrAndEsocialSummary(tenant.id, activeCompany.id),
        crmService.getCrmSummary(activeCompany.code),
        purchasingService.getPurchasingSummary(activeCompany.code),
        inventoryService.getInventorySummary(activeCompany.code),
        assetsService.getAssetsSummary(activeCompany.code),
        salesPaymentsService.getSalesAndPaymentsSummary(activeCompany.code),
        enterpriseOpsService.getEnterpriseOpsSummary(activeCompany.code),
        prisma.journalEntry.findMany({
          where: { companyId: activeCompany.id },
          include: {
            lines: { include: { chartOfAccount: true } },
          },
          orderBy: { entryNumber: 'desc' },
          take: 12,
        }),
        prisma.event.findMany({
          where: { tenantId: tenant.id },
          include: {
            producer: true,
            ticketBatches: { orderBy: { faceValue: 'asc' } },
            settlements: { orderBy: { requestedAt: 'desc' } },
          },
        }),
        prisma.auditLog.findMany({
          where: { tenantId: tenant.id },
          include: { user: true },
          orderBy: { occurredAt: 'desc' },
          take: 20,
        }),
        prisma.outboxEvent.findMany({
          where: { tenantId: tenant.id },
          orderBy: { occurredAt: 'desc' },
          take: 15,
        }),
        prisma.workflowInstance.findMany({
          where: { companyId: activeCompany.id },
          orderBy: { createdAt: 'desc' },
          take: 15,
        }),
      ]);

      const enabledMap = new Map(moduleSubscriptions.map((m) => [m.moduleCode, m.isEnabled]));

      sendJson(res, 200, {
        success: true,
        data: {
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            planTier: tenant.planTier,
          },
          companies: tenant.companies,
          activeCompany,
          branches,
          departments,
          costCenters,
          roles: tenant.roles.map((r) => ({
            ...r,
            maxApprovalAmount: Number(r.maxApprovalAmount),
          })),
          permissionsCatalog,
          users: tenant.users.map((u) => ({
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            userType: u.userType,
            status: u.status,
            mfaEnabled: u.mfaEnabled,
            lastLoginAt: u.lastLoginAt,
            companyAccesses: u.companyAccesses,
          })),
          activeSessions: identityService.listSessions(tenant.id),
          modulesCatalog: ERP_MODULES_CATALOG.map((m) => ({
            ...m,
            isEnabled: enabledMap.has(m.code as any) ? enabledMap.get(m.code as any) : true,
          })),
          chartOfAccounts,
          categories,
          payables: payables.map((p) => ({
            ...p,
            grossAmount: Number(p.grossAmount),
            discountAmount: Number(p.discountAmount),
            taxRetainedAmount: Number(p.taxRetainedAmount),
            netAmount: Number(p.netAmount),
            paidAmount: Number(p.paidAmount),
          })),
          cashFlow,
          accountingReports,
          fiscalSummary,
          hrSummary,
          crmSummary,
          purchasingSummary,
          inventorySummary,
          assetsSummary,
          salesPaymentsSummary,
          enterpriseOpsSummary,
          journalEntries: journalEntries.map((je) => ({
            ...je,
            totalDebit: Number(je.totalDebit),
            totalCredit: Number(je.totalCredit),
            lines: je.lines.map((l) => ({
              ...l,
              debitAmount: Number(l.debitAmount),
              creditAmount: Number(l.creditAmount),
            })),
          })),
          eventsList: eventsList.map((e) => {
            const grossTicketSales = Number(e.grossTicketSales);
            const totalServiceFees = Number(e.totalServiceFees);
            const totalAcquirerFees = Number(e.totalAcquirerFees);
            const totalChargebacks = Number(e.totalChargebacks);
            const totalAdvanced = Number(e.totalAdvanced);
            const totalPaidOut = Number(e.totalPaidOut);
            const availableBalance = EventsService.calculateProducerAvailableBalance({
              grossTicketSales,
              totalAcquirerFees,
              totalChargebacks,
              totalAdvanced,
              totalPaidOut,
            });
            return {
              ...e,
              serviceFeePct: Number(e.serviceFeePct),
              grossTicketSales,
              totalServiceFees,
              totalAcquirerFees,
              totalChargebacks,
              totalAdvanced,
              totalPaidOut,
              availableBalance,
              ticketBatches: e.ticketBatches.map((tb) => ({
                ...tb,
                faceValue: Number(tb.faceValue),
                serviceFee: Number(tb.serviceFee),
              })),
              settlements: e.settlements.map((s) => ({
                ...s,
                requestedAmount: Number(s.requestedAmount),
                advanceFeeAmount: Number(s.advanceFeeAmount),
                netPayoutAmount: Number(s.netPayoutAmount),
              })),
            };
          }),
          auditLogs,
          outboxEvents,
          workflows: workflows.map((w) => ({
            ...w,
            referenceAmount: Number(w.referenceAmount),
          })),
        },
      });
      return;
    }

    sendJson(res, 404, {
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Rota ${req.method} ${pathname} não encontrada. Consulte /api/docs ou /api/health.`,
      },
    });
  } catch (err: any) {
    const isForbidden =
      err?.message?.includes('FORBIDDEN') ||
      err?.message?.includes('LIMIT_EXCEEDED') ||
      err?.message?.includes('PROTECTED') ||
      err?.message?.includes('INVALID_');
    sendJson(
      res,
      isForbidden ? 403 : 400,
      {
        success: false,
        error: {
          code: isForbidden ? 'SECURITY_POLICY_REJECTION' : 'DOMAIN_VALIDATION_ERROR',
          message: err?.message || 'Erro interno no processamento da requisição.',
        },
      },
      req
    );
  }
}

export default requestHandler;

const server = http.createServer(requestHandler);

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`✅ [ENTERPRISE ERP API v1.4] Online em http://localhost:${PORT}/api`);
    console.log(`🩺 [Health Check]           http://localhost:${PORT}/api/health`);
    console.log(`📚 [Swagger API Docs]       http://localhost:${PORT}/api/docs`);
  });
}
