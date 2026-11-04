# 09 — Implantação e operação

1. Local DEV: Node 22, npm, Docker Compose PostgreSQL/Redis; usar `.env` local.
2. CI: npm ci, prisma validate, typecheck, testes, build, análise de dependências.
3. Homologação: banco e segredos próprios, HTTPS, observabilidade, migrations revisadas, dados de teste isolados e limpeza por política.
4. Produção: somente após login + MFA, RBAC/ABAC em endpoints, RLS/testes de isolamento, auditoria imutável, secrets manager, rotação de chaves, política de backups e restore testado.
5. Deploy seguro: migration backup/rollback plan, canário/preview, health checks, aprovação e monitoramento.

Não apontar a fundação diretamente para bancos de produção nem conectar gateways bancários reais. A infraestrutura contida em `docker-compose.yml` liga portas exclusivamente no `127.0.0.1`. Alterar as senhas antes de ambientes compartilhados.

## Checklist

- [ ] Node/npm compatíveis
- [ ] Docker ativo
- [ ] `.env` local com conexão correta
- [ ] `npm install` sem erros
- [ ] Prisma generate/validate
- [ ] Migrações aplicadas
- [ ] `/api/health` = 200
- [ ] `/api/health/ready` = 200
- [ ] `localhost:5173` abre e navega
- [ ] Swagger acessível
- [ ] Testes, typecheck e build aprovados
