# 09 — Plano de Testes e10 — Plano de Implantação (CI/CD & Observabilidade)

## 1. Estratégia de Testes em 4 Camadas

1. **Testes Unitários (`Vitest`)**:
   - Cobertura mínima de **90%** nas camadas de `entities/`, `policies/`, `validators/` e cálculos financeiros/fiscais/contábeis.
   - Validação de arredondamento decimal (`DECIMAL(18,2)`), cálculo de retenções, saldo de borderô de eventos e partidas dobradas.
2. **Testes de Integração e Isolamento Multiempresa (`Vitest + Testcontainers PostgreSQL`)**:
   - Verificação automática de que qualquer tentativa de leitura/escrita cruzada entre `companyA` e `companyB` retorna `403 Forbidden` ou `404 Not Found`.
   - Teste de atomicidade transacional (`Prisma.$transaction`) e gravação de `AuditLog` + `OutboxEvent`.
3. **Testes de Segurança (IDOR, RBAC/ABAC e Idempotência)**:
   - Simulação de reenvio concorrente de requisição de pagamento com a mesma `Idempotency-Key` garantindo execução única.
4. **Testes End-to-End (`Playwright`)**:
   - Fluxos críticos no Portal Interno (`apps/web`) e no Portal Externo (`apps/portal-external`).

---

## 2. Ambientes e Pipeline CI/CD

| Ambiente | Branch | Banco de Dados | Objetivo |
| :--- | :--- | :--- | :--- |
| **Development** | `feat/*`, `dev` | Docker Local (`delta_erp`) | Desenvolvimento e testes locais |
| **Staging (Homologação)** | `staging` | PostgreSQL Gerenciado + Dados Sintéticos | Homologação funcional, testes E2E e validação de migrações |
| **Production (Produção)** | `main` (Tags `v*`) | PostgreSQL HA + Read Replicas + RLS | Operação real com backup contínuo (PITR) |

### Checklist Obrigatório de Deploy em Produção
- [ ] `npm run lint` e `tsc --noEmit` sem alertas.
- [ ] Suíte unitária e de integração (`npm test`) 100% aprovada.
- [ ] Revisão das migrations Prisma (`prisma migrate diff`) garantindo ausência de comandos destrutivos sem janela planejada.
- [ ] Snapshot automático do PostgreSQL antes de `prisma migrate deploy`.
