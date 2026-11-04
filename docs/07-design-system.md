# 07 — Design System DELTA ERP (Identidade Visual: Moderno Minimalista)

## 1. Conceito Visual Escolhido: **Moderno — Fundo Claro, Cores Suaves e Cards Minimalistas**

O **DELTA ERP** adota uma estética limpa, silenciosa e de alta legibilidade inspirada em plataformas financeiras contemporâneas (Linear, Stripe Dashboard, Ramp), reduzindo a fadiga visual em jornadas longas de operação contábil, financeira e administrativa.

### Características Principais
- **Superfícies Claras em Camadas Suaves**:
  - Fundo da aplicação (`canvas`): `#F8FAFC` (Slate 50)
  - Superfície de cards e tabelas (`surface`): `#FFFFFF` (Branco puro)
  - Bordas sutis de 1px (`border`): `#E2E8F0` (Slate 200) com cantos arredondados suaves (`rounded-xl` / `12px`)
  - Sombras ultra-leves (`shadow-xs`): `0 1px 2px 0 rgba(15, 23, 42, 0.04)`
- **Cor Primária e Acentos Suaves**:
  - Primária Corporativa (`Indigo/Blue Delta`): `#4F46E5` (Indigo 600) com fundos de destaque suaves em `#EEF2FF` (Indigo 50).
  - Indicadores Semânticos Pastel com Alto Contraste Tipográfico:
    - **Sucesso / Liquidado**: Texto `#047857` (Emerald 700) sobre fundo `#ECFDF5` (Emerald 50)
    - **Atenção / Pendente de Aprovação**: Texto `#B45309` (Amber 700) sobre fundo `#FFFBEB` (Amber 50)
    - **Crítico / Vencido / Chargeback**: Texto `#BE123C` (Rose 700) sobre fundo `#FFF1F2` (Rose 50)
    - **Informação / Em Processamento**: Texto `#0369A1` (Sky 700) sobre fundo `#F0F9FF` (Sky 50)

---

## 2. Tipografia e Valores Numéricos

- **Fonte Principal (UI)**: `Inter` ou `Plus Jakarta Sans` (pesos 400, 500, 600, 700).
- **Fonte Monoespaçada / Tabular (Valores Financeiros, CNPJ, Chaves NF-e)**: `JetBrains Mono` ou `font-variant-numeric: tabular-nums` obrigatório em todas as colunas financeiras e contábeis para alinhamento vertical perfeito de casas decimais.

---

## 3. Arquitetura das Duas Interfaces

### A. Portal Interno (`apps/web`)
- **Topbar Contextual**:
  - Seletor rápido de **Empresa / Filial ativa** (Multiempresa com troca instantânea de contexto).
  - Busca Global (`Ctrl + K` / `Cmd + K`) para navegar entre os 20 módulos, buscar títulos, clientes ou eventos.
  - Central de Aprovações Pendentes (Workflow) e Notificações.
- **Sidebar Modular Inteligente**:
  - Agrupada pelas 6 macro-áreas (Estratégico, Financeiro/Contábil/Fiscal, Operacional, Comercial, Pessoas, Governança).
  - Exibe apenas os módulos ativos na assinatura da empresa e permitidos pelo RBAC do usuário logado.

### B. Portal Externo (`apps/portal-external`)
- **Experiência Dedicada e Simplificada**:
  - Navegação superior ou lateral enxuta adaptada ao perfil externo:
    - **Produtor de Eventos**: Visão de Eventos Ativos, Borderô em Tempo Real, Saldo Disponível para Repasse, Simulador de Antecipação e Contratos.
    - **Fornecedor**: Cotações abertas, Pedidos de Compra, Upload de XML de NF-e e Acompanhamento de Pagamentos.
    - **Cliente**: Faturas, Boletos/PIX, Contratos e Abertura de Chamados SAC.
