# 01 — Arquitetura geral

## Decisões de arquitetura

- **Tipo**: ERP empresarial completo, multiempresa e com portais interno/externo.
- **Modelo**: monólito modular, orientado a domínios (DDD); serviços internos por domínio.
- **Interface**: React 18 + TypeScript + Vite, visual claro, navegação lateral responsiva em pt-BR.
- **API**: Node.js + NestJS + REST + DTOs validados; documentação OpenAPI.
- **Persistência**: PostgreSQL, Prisma e migrations versionadas.
- **Infraestrutura auxiliar**: Redis/BullMQ, storage compatível com S3, eventos de domínio e Outbox.
- **Segurança-alvo**: RBAC + ABAC + MFA, separação de tenant e política de menor privilégio.

## Fronteiras

```text
                  ┌────────────────┐      ┌────────────────────┐
                  │ Portal interno │      │ Portal externo     │
                  │ React + Vite   │      │ React + Vite       │
                  └────────┬───────┘      └─────────┬──────────┘
                           └────────┬───────────────┘
                                    ▼
                       ┌────────────────────────┐
                       │ API NestJS /api        │
                       │ Segurança / Core       │
                       └──────────┬─────────────┘
                                  ▼
                        Domínios independentes
                    Financeiro | Fiscal | CRM | ...
                           │       │
                    PostgreSQL   Outbox -> Worker -> Integrações
                           │                  │
                         Prisma             Redis
```

Cada domínio será organizado em `controllers`, `services`, `repositories`, `dto`, `events`, `policies` e `tests`. No pacote 1, apenas os serviços transversais necessários para a saúde da aplicação e modelos de dados existem; a modelagem dos domínios operacionais vem em novas migrations.

## Dependências permitidas

- Domínios podem depender do Core e de contratos explícitos entre domínios.
- Domínios **não** podem importar repositories internos uns dos outros ou acessar indiscriminadamente tabelas de outros módulos.
- Eventos transacionais devem ser gravados na mesma transação de origem (padrão Outbox).
- Worker e gateways externos nunca devem decidir permissões ou pular os fluxos de aprovação.
- O Core centraliza identidade, organizações, permissões, auditoria, workflow e notificações.

## Separação de ambientes

`development` local, `staging` em homologação e `production` após validação técnica, jurídica e operacional; bancos, credenciais e storage isolados por ambiente. Nesta versão apenas desenvolvimento local foi contemplado.
