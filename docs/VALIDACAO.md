# Relatório de verificação — fundação v1.0

Data: 04/11/2026. Evidência restrita ao ambiente de geração.

| Item | Resultado | Evidência |
|---|---|---|
| Existência dos fontes e documentos | Confirmada | Arquivos gerados no pacote |
| Sintaxe TS/TSX | Confirmada por transpilação sintática | 14 arquivos TS/TSX sem diagnósticos de sintaxe na primeira inspeção; nova inspeção estática realizada antes do ZIP |
| Catálogo de 20 módulos | Confirmado por inspeção de fonte | Catálogo de rotas e grupos em `apps/web/src/modules.ts` |
| Equivalência nominal Prisma/SQL | Confirmada por inspeção estática | 19 modelos / 19 tabelas SQL |
| npm install | **Não concluído** | Registro npm inacessível (`EAI_AGAIN`) no ambiente de geração |
| npm run typecheck/test/build | **Não executado** | Dependências npm não instaladas |
| Prisma validate / migrations | **Não executado** | CLI Prisma não disponível sem instalação das dependências |
| PostgreSQL/Redis Docker | **Não executado** | Docker não instalado no ambiente de geração |
| Navegação em navegador e Swagger | **Não validados em execução** | Aplicações dependem de instalação e start local |

**Conclusão:** pacote de código-fonte e engenharia entregue para executar e validar no VS Code. Não equivale a ambiente funcional publicado nem a liberação para produção. Em máquina conectada, siga `README.md` e `docs/IMPLANTACAO.md` e registre os resultados reais.
