# 10 — Roadmap de engenharia

| Etapa | Entrega | Critério de aceite |
|---|---|---|
| 01 | Fundação (este pacote) | Monorepo, shell React, Nest API, Prisma schema, Docs, testes iniciais |
| 02 | Core Identity | Usuários reais, login, MFA, sessões, recuperação e revogação testados |
| 03 | Multiempresa + RBAC/ABAC | Guards por tenant e empresa, RLS, matriz e testes de escalonamento |
| 04 | Auditoria + Workflow | Auditoria append-only protegida, alçadas, assinaturas, Outbox/worker |
| 05 | Financeiro + Contabilidade | Ledger, bancos, conciliação e fechamento com invariantes e testes |
| 06 | Fiscal, RH, Compras e Comercial | Operações conectadas, fiscal validado por especialista |
| 07 | Portais externos + operações | Acesso isolado, contratos, solicitações e integrações reais |
| 08 | BI, analytics, segurança e publicação | Dados reais, backup/restore, testes E2E e homologação |

O fluxo futuro será: especificação detalhada -> modelagem versionada -> API/serviços -> UI -> testes -> revisão de segurança -> homologação -> publicação.

As etapas não são simultaneamente concluídas apenas porque os menus aparecem no sistema. Não inserir dados operacionais fictícios ou permissões simuladas em produção.
