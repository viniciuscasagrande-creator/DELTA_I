# Política de segurança de fundação

A versão 1.0 tem apenas **segurança de esqueleto**. Helmet, validação global, segregação conceitual por tenant e restrições FK compostas ajudam na base, mas não substituem autenticação e autorização.

## Controles já incluídos

- Não há endpoints de operação financeira ou manipulação de usuários.
- CORS restrito ao domínio de desenvolvimento configurado.
- Validação NestJS global preparada para DTOs.
- Estrutura de papéis e escopos no Prisma; associação de empresa e papel com chaves compostas do mesmo tenant.
- Exemplo unitário de política de escopo.
- Docker expondo PostgreSQL/Redis apenas em `127.0.0.1`.
- Arquivos `.env` ignorados pelo Git.

## Bloqueadores para operação com dados reais

- Login com hash de senha seguro (Argon2id), MFA, sessão e revogação.
- Guardas RBAC/ABAC no backend, negação por padrão e testagem de abuso de endpoints.
- RLS e políticas de acesso para multi-tenancy.
- Auditoria com integridade, sem vazamento de PII e proteção contra supressão.
- Secrets manager, rate limiting, CSRF conforme mecanismo de login, HTTPS, política de logs e monitoramento.
- Revisão LGPD, backup com criptografia, restore documentado e retenção.

**Nenhuma informação do esquema Prisma indica que esses controles já estejam operacionais.** Não publicar esta aplicação na internet nesta fase.
