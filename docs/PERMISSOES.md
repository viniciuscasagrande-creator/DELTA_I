# 05 — Matriz de permissões (especificação)

## Dimensões

- **Identidade**: `User` autenticado com MFA quando requerido.
- **Organização**: `Membership` ativo, selecionando exatamente um `tenantId` por requisição.
- **Empresa**: `CompanyAccess` ativo e escopo por empresa/filial/departamento.
- **Função**: `Role` vinculada a `Permission`, com verbo e recurso.
- **Contexto**: ABAC (proprietário do registro, valores, departamento, separação de função).

| Perfil exemplo | Financeiro | Contábil | RH | Administração |
|---|---|---|---|---|
| Administrador do tenant | Administrar sob política | Configurar | Restrito por sensibilidade | Administrar organização |
| Financeiro | Operar/consultar conforme papel | Consulta limitada | Nenhum | Nenhum |
| Contador | Consulta autorizada | Operar/fechar | Nenhum | Nenhum |
| RH | Nenhum | Nenhum | Operar sob sigilo | Nenhum |
| Usuário externo | Só recursos explicitamente autorizados | Nenhum | Nenhum | Nenhum |

Este quadro é uma proposta inicial, **não uma autorização concedida**. Perfis especiais, aprovações em alçadas e segregação de funções serão definidos e testados antes da primeira API de negócio.

## Regra de deny-by-default

Uma função **não** pode operar por omissão. É necessário passar por login, identificação do tenant, acesso à empresa, autorização RBAC e decisão ABAC. UI e backend usam o mesmo contrato de capabilities, mas a API é o ponto obrigatório de decisão.
