# 08 — Regras de Negócio Críticas (Financeiro, Contábil e Eventos)

## 1. Regra de Ouro do Módulo Financeiro

Nenhuma movimentação financeira (`FinancialTransaction`) existe de forma isolada. Todo lançamento exige:
1. **Origem Identificável (`originModule` + `originReferenceId`)**: Pedido de compra, nota fiscal, folha de pagamento, contrato, borderô de evento ou lançamento avulso justificado.
2. **Classificação Gerencial e Contábil**:
   - `financialCategoryId` (Natureza financeira para DRE Gerencial e Fluxo de Caixa)
   - `costCenterId` (Centro de custo ou projeto/evento)
   - `chartOfAccountId` (Conta contábil vinculada para integração automática)
3. **Máquina de Estados Estrita de Títulos (`AccountPayable` / `AccountReceivable`)**:
   - `DRAFT` → `PENDING_APPROVAL` → `APPROVED` → `PARTIALLY_PAID` → `PAID`
   - Cancelamento (`CANCELLED`) só é permitido antes de qualquer baixa parcial; após baixa, exige operação de **Estorno (`REVERSED`)**.

---

## 2. Regras de Conciliação Bancária e Recebíveis de Adquirência/PIX

1. **Conciliação em Duas Pontas**:
   - Vendas via Cartão/PIX no módulo `11. Pagamentos` geram uma previsão de liquidação (`SettlementSchedule`) considerando `D+N` e a taxa acordada (`MDR` / taxa PIX).
   - Quando o arquivo OFX/CNAB ou Webhook bancário confirma a entrada no banco, o sistema concilia o valor bruto, reconhece automaticamente a despesa de taxa de adquirência e liquida o líquido na `BankAccount`.
2. **Tratamento de Chargebacks e Estornos (`SAC` + `Pagamentos` + `Financeiro`)**:
   - Um estorno aprovado no SAC ou um chargeback notificado pela adquirente gera:
     - Lançamento de débito na conta gráfica/bancária.
     - Se vinculado a um evento de terceiro (`EVENTS`), deduz automaticamente do saldo a repassar do Produtor (`ProducerSettlement`).

---

## 3. Isolamento Contábil na Operação de Eventos e Produtores

Para garantir conformidade fiscal e contábil na operação de eventos:
1. **Arrecadação de Ingressos (`Ticket Sale`)**:
   - O valor de face do ingresso pertence ao **Produtor do Evento** e é contabilizado como **Passivo — Recursos de Terceiros a Repassar** (não infla a receita bruta da operadora do ERP).
   - A **Taxa de Conveniência / Serviço** pertence à operadora e é reconhecida como **Receita Operacional Bruta**, gerando obrigação de NFS-e no módulo `04. Fiscal`.
2. **Antecipação de Recebíveis ao Produtor**:
   - Caso o produtor solicite antecipação antes da liquidação da adquirente ou antes da realização do evento:
     - Exige fluxo de aprovação no módulo `17. Workflow` com análise de risco/garantia contratual.
     - A taxa de antecipação cobrada gera receita financeira para a operadora e reduz o valor líquido transferido via PIX/TED ao produtor.
