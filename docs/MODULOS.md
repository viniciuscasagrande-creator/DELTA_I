# 02 — Mapa completo dos módulos

Os 20 módulos são a **visão funcional**, não vinte backends prontos. Cada módulo tem uma rota React de escopo; APIs de negócio serão entregues por contrato.

| Área | Módulos | Dependências típicas |
|---|---|---|
| Gestão | Financeiro, Contabilidade, Fiscal, RH, Pagamentos | Core, cadastro de empresas, usuários, workflows |
| Operações | Compras, Estoque, Patrimônio, Vendas, Contratos | Core, produtos, fornecedores, contabilidade |
| Relacionamento | Comercial/CRM, SAC, Marketing, Portal Externo | Core, cadastros, políticas de privacidade |
| Inteligência | BI/Analytics, Painéis e Relatórios | Eventos de domínio, dados reais e consultas controladas |
| Plataforma | Documentos, Workflow, Administração, Integrações | Identidade, roles, audit logs, infraestrutura |

## Regras gerais de ativação

1. Configuração por organização (`FeatureFlag`), validada **no backend**.
2. Dependências e permissões devem ser checadas antes de ativar o módulo.
3. A desativação bloqueia novas operações, sem apagar dados históricos.
4. Menu e acesso à API aplicam a **mesma** matriz de autorização; esconder botões não é segurança.
5. Extensões específicas de eventos/ingressos permanecem possíveis sem contaminar o Core genérico.

**Escopo de fase 1:** cadastro do catálogo, rotas de visualização e contratos centrais. Status comercial, financeiro e fiscal **não operacional**.
