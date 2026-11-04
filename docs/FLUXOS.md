# Contratos de fluxo — a implementar

```text
Uma solicitação é criada com um tenant autenticado
  -> policy RBAC + ABAC autoriza recurso e empresa
  -> comando validado chega ao módulo de domínio
  -> transação salva registro + AuditLog + OutboxEvent
  -> worker processa o evento com idempotência
  -> módulo consumidor realiza a próxima etapa conforme contrato
  -> indicadores são atualizados somente a partir de fatos persistidos
```

Para pagamentos e aprovações, não permitir que a mesma credencial realize todas as etapas em fluxos sujeitos a dupla autorização. Status `PENDING` não equivale a execução bancária confirmada.
