# 03 — Modelo de dados PostgreSQL

Fonte: `prisma/schema.prisma`. A primeira migration efetiva está em `prisma/migrations/`.

## Grupos de entidades

- **Identidade e multiempresa**: `Tenant`, `Company`, `Branch`, `Department`, `User`, `Membership`.
- **RBAC e escopo**: `Role`, `Permission`, `RolePermission`, `MembershipRole`, `CompanyAccess`.
- **Governança**: `AuditLog`, `WorkflowDefinition`, `WorkflowInstance`.
- **Infraestrutura transversal**: `Notification`, `DocumentRecord`, `IntegrationConfig`, `FeatureFlag`, `OutboxEvent`.

## Regras de integridade

- Identificadores UUID, timestamps e restrições de unicidade por tenant quando relevantes.
- `CompanyAccess` e `MembershipRole` usam **chaves estrangeiras compostas contendo tenantId**, reduzindo risco de atribuições cruzadas entre organizações.
- Entidades operacionais futuras devem conter `tenantId` e `companyId` onde aplicável. Validar acesso sempre por token de sessão autenticado + associação ativa, **nunca apenas pela URL**.
- `AuditLog` mantém vínculo com tenant; o código futuro deve sanitizar dados sensíveis, manter append-only, usar retenção legal e mecanismos de proteção contra manipulação.
- `OutboxEvent` é o esquema inicial, não um processador ativo; a execução confiável depende de transação de escrita + worker com idempotência e retries.
- Valores monetários futuros devem ser `Decimal(18, 2)` ou precisão de negócio apropriada (e não `Float`); contabilização exige reversões, não exclusões físicas.

## SQL e migrações

Use `npm run db:generate` e `npm run db:migrate` com `DATABASE_URL` de desenvolvimento. Para deploy: `npm run db:deploy`, somente após backup, homologação e revisão de migration. Nenhuma seed é fornecida para lançamentos fictícios.

**Atenção:** Row Level Security (RLS) em PostgreSQL é uma defesa adicional recomendada e ainda não está configurada nesta fundação. Antes de CRUD multiempresa em produção, implementar políticas de RLS e testes de isolamento end-to-end, além de guards de backend.
