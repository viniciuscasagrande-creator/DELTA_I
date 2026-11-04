# 07 — Regras de negócio iniciais

## Princípios transversais

1. Organizações têm dados isolados; permissões podem variar por módulo e empresa.
2. Cada operação crítica registra quem fez, quando, em qual contexto e o que mudou, com política de dados sensíveis.
3. Financeiro usa contas e lançamentos rastreáveis; processamento exige idempotência e conciliação.
4. Aprovações usam alçadas, estados explícitos e segregação de funções.
5. Exclusões de documentos contabilizados são substituídas por cancelamentos/reversões auditáveis.
6. Integrações externas exigem retries, deduplicação de webhooks, assinaturas verificadas e monitoramento.
7. Conformidade LGPD: bases legais, minimização, acesso restrito, retenção e atendimento ao titular.

## Fluxo transversal previsto — compras

Solicitação > aprovação > pedido > recebimento > validação fiscal > estoque > conta a pagar > contabilidade > BI. Cada etapa só avança após validação do domínio responsável, com registro de transição e Outbox para eventos.

**Esta fundação contém apenas as entidades centrais.** Não há implementação de fluxo de compras, pagamentos, contabilidade nem reembolsos. Requisitos setoriais específicos devem ser tratados em módulos de extensão, sem generalizar regras indevidamente.
