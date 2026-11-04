# 04 — Contratos de API

Base: `/api`; especificação OpenAPI gerada por NestJS Swagger em `/api/docs`.

| Método | Caminho | Resposta | Segurança atual |
|---|---|---|---|
| GET | `/api/health` | `200 {status:"ok",service,version}` | Pública, liveness |
| GET | `/api/health/ready` | `200` se PostgreSQL+Redis disponíveis; `503` se não | Pública em DEV; limitar na infraestrutura antes de produção |
| GET | `/api/system/capabilities` | estágio e funcionalidades implementadas/planejadas | Pública, metadados não confidenciais |

## Padrões para próximas APIs

- URL versionada (`/api/v1/...`) para endpoints de negócio.
- Requisições/DTOs validados com `ValidationPipe` e `class-validator`.
- Paginação com limite máximo e ordenação estável.
- `tenantId` resolvido de sessão válida e políticas, sem confiar no parâmetro enviado pelo cliente.
- Transações idempotentes com chave de operação e restrição única no banco.
- `X-Request-ID` e eventos de auditoria com correlação.
- Contratos OpenAPI revisados, erros previsíveis e sem mensagens sensíveis.
- Gateway de pagamentos desabilitado até revisão de compliance e aprovação.

## Exemplo de futura rota (NÃO implementada)

`POST /api/v1/purchase-orders` com corpo validado, permissão `purchase-order:create`, vínculo à empresa, evento Outbox e trilha de auditoria. Não acrescentar CRUD genérico público para usuários, empresas ou contas.
