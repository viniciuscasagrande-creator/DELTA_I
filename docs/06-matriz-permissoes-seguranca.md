# 06 — Matriz de Permissões, Segurança e Governança (RBAC + ABAC + LGPD)

## 1. Modelo Híbrido RBAC + ABAC Multiempresa

No **DELTA ERP**, um mesmo usuário pode ter funções diferentes em empresas diferentes do mesmo grupo empresarial (`Tenant`):
- Exemplo: O usuário *Carlos* é **Diretor Financeiro** na *Empresa Matriz (01)* e apenas **Consultor / Visualizador** na *Filial de Eventos (02)*.

### Estrutura da Permissão (`Permission Code`)
Formato padronizado: `<modulo>:<recurso>:<acao>`
- `financial:payable:read` — Consultar contas a pagar
- `financial:payable:create` — Lançar conta a pagar
- `financial:payable:approve` — Aprovar pagamento dentro da alçada
- `financial:settlement:execute` — Executar baixa/liquidação bancária
- `accounting:journal:post` — Efetivar lançamento contábil
- `accounting:period:close` — Executar fechamento contábil mensal
- `events:settlement:request_payout` — Solicitar repasse/antecipação (Portal do Produtor)

### Regras ABAC (Attribute-Based Access Control)
Além de possuir a permissão RBAC (`financial:payable:approve`), o motor de políticas (`PolicyEngine`) valida atributos de contexto:
1. **Alçada de Valor (`maxApprovalAmount`)**: Um Gerente Financeiro aprova até R$ 50.000,00; acima disso exige dupla aprovação com Diretor.
2. **Escopo de Centro de Custo (`allowedCostCenterIds`)**: Gestores de departamento só visualizam ou aprovam despesas do seu centro de custo.
3. **Isolamento de Portal Externo (`externalEntityId`)**: Um Produtor no Portal Externo só acessa eventos onde `event.producerId === user.producerId`.

---

## 2. Matriz Base de Perfis (Configurável via Banco de Dados)

| Perfil Padrão | Core / Admin | Financeiro | Contábil / Fiscal | RH | Compras / Comercial | Portal Externo |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | Total | Total | Total | Total | Total | Administração |
| `DIRECTOR` | Consulta | Consulta + Alçada Alta | Consulta + DRE | Consulta | Aprovação de Contratos | Não |
| `FINANCIAL_MANAGER` | Não | Total + Conciliação + Alçada Média | Consulta | Não | Aprovação Financeira | Gestão de Repasses |
| `FINANCIAL_ANALYST` | Não | Lançamento + Baixa (sem alçada) | Consulta | Não | Consulta | Não |
| `ACCOUNTANT` | Não | Consulta | Total + Fechamento + SPED | Consulta Folha | Consulta | Não |
| `HR_MANAGER` | Não | Não | Não | Total + Folha + eSocial | Não | Não |
| `EXTERNAL_PRODUCER` | Não | Extrato do Evento | Não | Não | Não | Borderô + Repasses + Contratos |
| `EXTERNAL_SUPPLIER` | Não | Títulos a Receber | Envio NF-e | Não | Cotações + Pedidos | Área do Fornecedor |

---

## 3. Auditoria Imutável e Conformidade LGPD

- **Registro Automático (`AuditLog`)**: Toda operação `POST`, `PUT`, `PATCH`, `DELETE` e ações críticas de negócio gravam:
  - `tenantId`, `companyId`, `userId`, `ipAddress`, `userAgent`, `requestId`
  - `moduleCode`, `entityName`, `entityId`, `action`
  - `previousValues` (JSONB) e `newValues` (JSONB)
- **LGPD**:
  - Mapeamento de dados sensíveis de colaboradores (RH) e clientes (CRM/Ingressos).
  - Registro de consentimento, política de retenção legal (ex: guarda fiscal de 5 anos no Brasil) e anonimização controlada quando aplicável.
