# DELTA ERP Enterprise v1.4 — Cloud Command Center (20 Módulos)

Monorepo **executável** para o **DELTA ERP Enterprise v1.4** (arquitetura de Monólito Modular + DDD), com interface **Premium Corporate Dark & Hybrid Design System**, Multi-Tenant / Multiempresa (RLS), RBAC + ABAC com alçadas financeiras, Contabilidade por Partidas Dobradas (SPED ECD I050 / DRE), Fiscal/Tributário, RH & eSocial, CRM, Compras, Estoque (CMPM), Patrimônio (CPC 27), Vendas, Gateway PIX/MDR, Contratos, SAC ITIL v4, Marketing & Atribuição ROAS, BI Preditivo, GED ICP-Brasil e Outbox Transacional com Webhooks HMAC-SHA256.

## O que funciona nesta versão (v1.4)

- **20 Módulos Oficiais Isolados (01 a 20)** com navegação lateral e superior, busca global (`Ctrl+K` / filtro rápido), temas Dark/Light e hubs especializados:
  - **01. Dashboard**: Painéis executivos, operacionais, financeiros e gráficos de fluxo de caixa.
  - **02. Financeiro**: Contas a pagar e receber, borderô CNAB/PIX, Simulador de Spread & Take-Rate, Motor de Split Financeiro Automatizado e Conciliação Bancária/Tesouraria.
  - **03. Contabilidade**: DRE Societária (10 linhas com Análise Vertical), Plano de Contas estruturado em 5 níveis (SPED ECD I050), Livro Diário (Partidas Dobradas D=C), Livro Razão Analítico e Balancete de Verificação.
  - **04. Fiscal**: Emissão de NF-e/NFS-e, retenções na fonte (IRRF, CSRF 4,65%, ISS), apuração e SPED.
  - **05. RH**: Admissão eSocial (S-2200), fechamento de folha mensal (INSS/IRRF progressivos, FGTS) e benefícios.
  - **06. Comercial / CRM**: Gestão de clientes, limites de crédito, funil de oportunidades e comissões.
  - **07. Compras**: Homologação de fornecedores, mapa de 3 cotações com apuração de saving e recebimento físico/financeiro.
  - **08. Estoque**: Kardex, Custo Médio Ponderado Móvel (CMPM), transferências entre filiais e ponto de ressuprimento.
  - **09. Patrimônio**: Tombamento de ativo imobilizado e cálculo de depreciação linear mensal (CPC 27).
  - **10. Vendas & 11. Pagamentos**: Faturamento de pedidos, baixa de estoque/CMV, captura PIX/Cartão com MDR líquido e disputa de chargebacks.
  - **12. Contratos**: Gestão de vigências, MRR/ARR e reajuste anual (IPCA/IGPM) com faturamento automático.
  - **13. SAC & Service Desk ITIL v4**: Matriz Impacto × Urgência (P1–P4), relógio de SLA, canais Omnichannel, Base de Conhecimento (KEDB), indicadores FCR/MTTA/MTTR/CSAT e aprovação de estornos.
  - **14. Marketing & Growth**: Campanhas multicanal, cupons promocionais, construtor UTM com QR Code, Pixels & Server-Side CAPI, automações de funil e recuperação de abandono de carrinho.
  - **15. BI & Analytics**: Simulador executivo de cenários macroeconômicos e forecast preditivo.
  - **16. Documentos (GED)**: Assinatura digital qualificada ICP-Brasil (A1/A3) com carimbo de tempo e hash SHA-256.
  - **17. Workflow**: Motor de alçadas e aprovações ABAC por valor e perfil.
  - **18. Portal Externo**: Portal do Produtor / Eventos (bilheteria PIX, custódia e borderô de repasse) e áreas B2B/B2C.
  - **19. Administração**: Identidade JWT HS256, MFA TOTP (RFC 6238), gestão de sessões, multiempresa, filiais, centros de custo e matriz RBAC/ABAC.
  - **20. Integrações**: Outbox Pattern ACID, disparo de webhooks assinados com HMAC-SHA256 e conectores ERP.

## Requisitos

- Node.js 20+ (recomendado Node.js 22+) e npm 10+.
- Banco PostgreSQL 16 (via Docker Compose local ou Neon Serverless PostgreSQL).

## Como executar no Windows (PowerShell)

```powershell
Copy-Item .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Ou utilize o script automatizado:
```powershell
./scripts/iniciar.ps1
```

Endpoints em desenvolvimento:
- **Web App (Command Center)**: http://localhost:5173
- **API Backend**: http://localhost:3000/api/health
- **Overview Multi-Tenant**: http://localhost:3000/api/foundation/overview?companyCode=EMP-01
- ** Catálogo OpenAPI / Swagger**: http://localhost:3000/api/docs

## Validação Completa (Prisma + TypeScript + Vitest + Build)

```powershell
./scripts/validar.ps1
```

Ou individualmente:
```powershell
npm run db:generate
npm run typecheck
npm test
npm run build
```

## Estrutura do Monorepo

```text
api/
  index.ts                 Entrypoint Serverless (Vercel)
apps/
  api/                     Backend Modular DDD + Serviços de Domínio + Guardas JWT/RBAC/ABAC
  web/                     Portal React + Vite + Tailwind Design System v1.4 (20 Módulos)
  portal-external/         Configuração do Portal Externo (Clientes, Fornecedores, Produtores)
  worker/                  Outbox Worker para publicação assíncrona de eventos de domínio
packages/
  shared/                  Utilitários de moeda (formatBRL), tipos e contratos transversais
  auth-client/             Cliente de sessão e autenticação
  config/                  Configurações padronizadas do ecossistema
  ui/                      Tokens visuais compartilhados
  validators/              Validadores fiscais/documentais (CPF, CNPJ, Partidas Dobradas)
prisma/
  schema.prisma            Modelagem relacional completa (PostgreSQL / Neon Serverless)
  migrations/              Migrações SQL com políticas RLS Multi-Tenant
  seeds/                   Seed corporativo determinístico
tests/
  security/                Suíte de testes de segurança (JWT, TOTP, RBAC, ABAC, Isolamento)
docs/                      Documentação arquitetural (01 a 09)
```
