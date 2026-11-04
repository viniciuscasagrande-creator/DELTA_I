# 06 — Design system

Identidade: **moderno**, claro, com cards, superfície branca, fundo cinza frio, azul institucional e tipografia de sistema. Toda interface visível em **pt-BR**.

- Menu lateral azul-marinho: grupos recolhíveis, busca por funcionalidade e destaque de rota ativa.
- Topbar: breadcrumb, status real da API e atalho de documentação.
- Dashboard: hero institucional e cards **de disponibilidade técnica**, sem números financeiros falsos.
- Páginas de módulo: título, status **Planejado** e funcionalidades esperadas sem executar operações.
- Responsividade: menu lateral recolhível no desktop, sobreposição no mobile.
- Acessibilidade: labels, foco visível, navegação via links e controles semanticamente identificados.

Tokens (aproximados): `#142239` (sidebar), `#1B3258` (hero), `#F6F8FB` (fundo), `#FFFFFF` (cartões), `#26334B` (texto), `#547BC4` (destaques).

## Critério de evolução

Novas telas devem usar componentes compartilhados, feedback de erros reais, estados vazios, loading e mensagens objetivas; nenhuma ação de persistência é considerada pronta sem backend, permissões e testes.
