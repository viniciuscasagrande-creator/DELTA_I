# 09 — Módulo Financeiro, Custódia e Liquidação (ERP DiskIngressos)

## 1. Princípios de Custódia e Split Financeiro

No modelo operacional da **DiskIngressos**, o fluxo financeiro de venda de ingressos opera sob segregação contábil rigorosa:

$$\text{Recebimento Bruto} = \text{Valor de Face (Passivo de Custódia)} + \text{Taxa de Conveniência (Receita Própria)}$$

1. **Valor de Face dos Ingressos (Passivo Transitório)**:
   * Pertence ao produtor do evento.
   * Fica sob custódia temporária na conta de liquidação da DiskIngressos até a prestação de contas (Borderô).
2. **Taxa de Conveniência (Receita Operacional Própria)**:
   * Remunera a prestação do serviço de bilheteria e plataforma de vendas.
   * Tributada pela DiskIngressos (NFS-e de prestação de serviços).

---

## 2. Modalidades Especializadas: Spread, Rebate e Advanced

> [!IMPORTANT]
> Em conformidade com a matriz de alçadas da DiskIngressos, **o Módulo Comercial não cria, não edita e não tem acesso aos parâmetros de Spread, Rebate ou Advanced**. Essas regras são configuradas e liquidadas com exclusividade pela diretoria do **Módulo 04 Financeiro**.

### 2.1 Spread Bancário & MDR Líquido
* **Conceito**: Custo cobrado pelos gateways de pagamento, adquirentes e bandeiras de cartão (taxa MDR de crédito, parcelamento e tarifas de liquidação PIX).
* **Regra**: O Financeiro apura a diferença entre a taxa cobrada do cliente final e o custo líquido do adquirente, garantindo a margem da tesouraria.

### 2.2 Rebate ao Produtor (Partilha de Margem)
* **Conceito**: Devolução programada de uma parcela da receita de conveniência ao produtor de grande porte como bonificação de volume ou exclusividade.
* **Fórmula de Apuração**:
  $$\text{Rebate} = \text{Receita Efetiva de Conveniência} \times \text{Percentual de Rebate Acordado}$$
* **Condição de Liquidação**: O Rebate só se torna elegível após o fechamento do borderô do evento, sendo estornado proporcionalmente em casos de ingressos cancelados ou chargebacks.

### 2.3 Advanced (Antecipação Financeira ao Produtor)
* **Conceito**: Liberação de parcelas do saldo de bilheteria ao produtor antes da data de realização do espetáculo, para custeio de logística, cachês e produção.
* **Critérios de Risco e Salvaguarda**:
  1. **Margem de Segurança (Retenção Mínima de 20% a 30%)**: Nunca é permitido antecipar 100% da bilheteria antes do show ocorrer, resguardando a DiskIngressos contra eventual cancelamento do evento.
  2. **Taxa de Deságio (Custo Financeiro da Operação)**: Aplicação de taxa mensal pro-rata pelo adiantamento de capital.
  3. **Alçada de Aprovação**: Toda solicitação de *Advanced* acima de R$ 50.000,00 exige aprovação formal do Diretor Financeiro via Workflow.

---

## 3. Estrutura do Borderô Final

Ao término do evento, o Financeiro emite o **Borderô Definitivo**:

```text
================================================================================
BORDERÔ FINANCEIRO OFICIAL — DISKINGRESSOS
Evento: Curitiba Rock Fest 2026 | Produtor: Live Nation Brasil
================================================================================
(+) Total Bruto de Ingressos Vendidos (Face):               R$ 6.000.000,00
(+) Total de Taxas de Conveniência Emitidas:               R$   900.000,00
--------------------------------------------------------------------------------
(=) Faturamento Global Bruto Capturado:                    R$ 6.900.000,00

(-) Receita Própria DiskIngressos (Taxa de Conveniência): -R$   900.000,00
(-) Custos de Adquirência / MDR Bancário Retido:          -R$   138.000,00
(-) Estornos, Cancelamentos e Chargebacks Apurados:       -R$    42.000,00
(-) Adiantamentos Concedidos (Advanced Payouts):          -R$ 2.500.000,00
(+) Bonificação de Parceria Comercial (Rebate):           +R$    45.000,00
--------------------------------------------------------------------------------
(=) SALDO LÍQUIDO FINAL A REPASSAR AO PRODUTOR:            R$ 3.365.000,00
================================================================================
```
