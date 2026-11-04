# 05 — Documentação de APIs, Contratos e Padrões REST (DELTA ERP)

## 1. Convenções Gerais da API (`/api/v1`)

Todas as rotas da API NestJS seguem padrões estritos de segurança, rastreabilidade e paginação:

### Headers Obrigatórios em Requisições Autenticadas
| Header | Obrigatório | Descrição |
| :--- | :-: | :--- |
| `Authorization` | Sim | `Bearer <jwt_access_token>` |
| `X-Tenant-Id` | Sim | UUID da Organização (`Tenant`) ativa |
| `X-Company-Id` | Sim* | UUID da Empresa (`Company`) ativa (*obrigatório em rotas operacionais) |
| `Idempotency-Key` | Em mutações críticas | UUID v4 único para garantir idempotência em pagamentos, baixas e contabilizações |

---

## 2. Envelope Padrão de Resposta

### Sucesso (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_01j9z8k3m2...",
    "timestamp": "2026-11-04T16:30:00.000Z",
    "tenantId": "11111111-1111-1111-1111-111111111111",
    "companyId": "22222222-2222-2222-2222-222222222222",
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "totalItems": 142,
      "totalPages": 6
    }
  }
}
```

### Erro Padronizado (`400`, `401`, `403`, `404`, `409`, `422`)
```json
{
  "success": false,
  "error": {
    "code": "FINANCIAL_APPROVAL_LIMIT_EXCEEDED",
    "message": "Valor do título (R$ 85.000,00) excede a alçada de aprovação do perfil atual (R$ 50.000,00).",
    "details": [
      {
        "field": "amount",
        "issue": "Requer aprovação de perfil DIRECTOR ou superior."
      }
    ]
  },
  "meta": {
    "requestId": "req_01j9z8k3m2...",
    "timestamp": "2026-11-04T16:30:00.000Z"
  }
}
```

---

## 3. Principais Endpoints da Fase 1 & 2 (Core + Financeiro + Contábil + Eventos)

| Domínio | Método | Endpoint | Permissão Requerida | Descrição |
| :--- | :---: | :--- | :--- | :--- |
| **Core Auth** | `POST` | `/api/v1/core/auth/login` | Pública | Autenticação primária (E-mail + Senha) |
| **Core Auth** | `POST` | `/api/v1/core/auth/mfa/verify` | Token MFA | Validação TOTP MFA e emissão de sessão |
| **Core Context** | `GET` | `/api/v1/core/companies/my-access` | Autenticado | Lista empresas, filiais e módulos ativos do usuário |
| **Core Audit** | `GET` | `/api/v1/core/audit-logs` | `admin:audit:read` | Consulta trilha imutável de auditoria |
| **Financeiro** | `GET` | `/api/v1/financial/payables` | `financial:payable:read` | Lista contas a pagar com filtros por vencimento/status |
| **Financeiro** | `POST` | `/api/v1/financial/payables` | `financial:payable:create` | Registra obrigação financeira e aciona workflow |
| **Financeiro** | `POST` | `/api/v1/financial/payables/:id/approve` | `financial:payable:approve` | Aprova título validando alçada ABAC |
| **Financeiro** | `POST` | `/api/v1/financial/payables/:id/settle` | `financial:settlement:execute` | Liquida título (baixa bancária atômica + evento contábil) |
| **Financeiro** | `GET` | `/api/v1/financial/cash-flow/summary` | `financial:cashflow:read` | Fluxo de caixa realizado e projetado por período |
| **Contábil** | `POST` | `/api/v1/accounting/journal-entries` | `accounting:journal:post` | Cria lançamento contábil de partidas dobradas |
| **Eventos** | `GET` | `/api/v1/events/:id/financial-statement` | `events:settlement:read` | Borderô financeiro do evento, taxas e saldo de repasse |
