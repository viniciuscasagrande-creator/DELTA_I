# 08 — Plano de testes

## Automação incluída

- Unitário: `assertTenantAccess` nega um contexto de tenant não autorizado.
- Unitário: catálogo de módulos tem 20 slugs únicos e pode ser consultado.
- Tipagem: `npm run typecheck`.
- Compilação: `npm run build`.
- Saúde da API: `/api/health`; prontidão real: `/api/health/ready`.

## Testes de aceite ainda obrigatórios

- Integração PostgreSQL real: migração, leitura, operações transacionais e rollback.
- Isolamento: usuário do tenant A jamais consulta/alterar recursos do B, mesmo alterando URL/JSON.
- Login: bloqueio de tentativas, MFA, renovação/revogação de sessão, recuperação de senha, CSRF conforme estratégia.
- Permissões: deny-by-default, recursos por organização e separação de funções.
- Worker: eventos entregues uma vez logicamente, retries, idempotência e dead-letter.
- Playwright: fluxo de navegação de todos os módulos, mobile, acessibilidade, estados de API indisponível.
- Resiliência: erros de banco, cache, integrações externas, auditoria e restauração de backups.

**Regra:** ausência de código ou falta de ambiente impede declarar teste aprovado. A checklist de implantação exige evidência verificável de execução e resultado.
