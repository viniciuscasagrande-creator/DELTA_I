# 10 — Módulo Comercial e Negociação de Eventos (ERP DiskIngressos)

## 1. Missão do Módulo Comercial

O **Módulo Comercial** é responsável pela captação de atrações, prospecção e homologação de organizadores, e fechamento dos contratos de bilheteria por evento.

O departamento opera com **autonomia funcional plena**: pode cadastrar produtores, registrar negociações, definir taxas e aprovar contratos sem depender de chamados do SAC ou fechamentos contábeis.

---

## 2. Parâmetros sob Governança do Comercial

1. **Produtores e Contatos**: Homologação cadastral e relacionamento com organizadores.
2. **Contratos Comerciais por Evento**:
   * Vigência e datas do evento.
   * Exclusividade de bilheteria (Total, Online Exclusivo ou Compartilhado).
   * Canais de venda autorizados (Site, Aplicativo, PDVs físicos, Afiliados).
   * Lotação contratada e metas de venda.
3. **Taxas de Conveniência do Evento**:
   * **Percentual (%)**: Taxa sobre o valor de face do ingresso (política: 0% a 35%).
   * **Taxa Fixa Adicional (R$)**: Valor monetário fixo por ingresso emitido (opcional).

---

## 3. Matriz de Segregação de Funções (Alçadas Restritas)

| Parâmetro Comercial / Financeiro | Comercial Cria/Edita? | Comercial Visualiza? | Alçada Responsável |
| :--- | :---: | :---: | :--- |
| **Taxa de Conveniência Base** | **SIM** | **SIM** | 03. Comercial |
| **Exclusividade e Canais** | **SIM** | **SIM** | 03. Comercial |
| **Comissão de Vendedor** | **SIM** | **SIM** | 03. Comercial |
| **Spread de Adquirência / MDR** | ❌ NÃO | ❌ NÃO | **04. Financeiro** |
| **Percentual de Rebate** | ❌ NÃO | ❌ NÃO | **04. Financeiro** |
| **Adiantamentos (Advances)** | ❌ NÃO | ❌ NÃO | **04. Financeiro** |
| **Borderô Oficial de Repasse** | ❌ NÃO | Consulta apenas | **04. Financeiro** |

A tentativa de envio de `spreadRate`, `rebatePct` ou `advanceRequested` para o serviço comercial resulta em rejeição sumária (`FORBIDDEN_SCOPE_COMMERCIAL`).
