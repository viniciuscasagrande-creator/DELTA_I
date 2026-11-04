# Enterprise ERP — Fundação técnica v1.0

Monorepo inicial **executável** para um ERP modular multiempresa, com identidade visual moderna, React + TypeScript, NestJS, PostgreSQL + Prisma e Redis. A estrutura prevê 20 módulos e portais interno/externo, mas **não** implementa transações financeiras, autenticação de usuários ou operações de negócios nesta primeira entrega.

## O que funciona nesta versão

- Portal React responsivo, com navegação para os 20 módulos, separação por grupos e busca local.
- Páginas de escopo por módulo, sem botões transacionais falsos.
- API NestJS: `/api/health`, `/api/health/ready`, `/api/system/capabilities`, Swagger em `/api/docs`.
- Modelagem Prisma para organização, empresas, usuários, escopos de acesso, auditoria, workflow e infraestrutura transversal.
- Docker Compose para PostgreSQL e Redis **em localhost**.
- Testes unitários iniciais de navegação e política pura de escopo; documentação, CI e verificações de build.

## Requisitos

- Node.js 22 ou superior, npm 10 ou superior.
- Docker Desktop com Docker Compose (PostgreSQL + Redis).
- VS Code (recomendado).

## Rodar no Windows (PowerShell)

```powershell
# Na raiz do diretório enterprise-erp-foundation-v1
Copy-Item .env.example .env
npm install
# Inicie o Docker Desktop antes do comando seguinte:
docker compose up -d postgres redis
npm run db:generate
npm run db:migrate
npm run dev
```

Endpoints locais:
- Portal interno: http://localhost:5173
- Portal externo: http://localhost:5174 (em outro terminal: `npm run dev:external`)
- API: http://localhost:3000/api/health
- Prontidão PostgreSQL + Redis: http://localhost:3000/api/health/ready
- Swagger: http://localhost:3000/api/docs
- API de capacidades: http://localhost:3000/api/system/capabilities

O comando `npm run db:migrate` aplica a migration inicial versionada; não insere dados fictícios. O dashboard exibe o resultado de chamadas reais de saúde da API. Sem PostgreSQL/Redis, a rota `/api/health/ready` retorna **503**, e o painel informa indisponibilidade.

Para automatizar no PowerShell, você também pode executar `./scripts/iniciar.ps1` na raiz do projeto. Este script executa instalação, Docker, Prisma e `npm run dev` e interrompe se encontrar erros.

## Verificações

```powershell
npm run typecheck
npm test
npm run build
npm run db:studio
# Ou no PowerShell:
./scripts/validar.ps1
```

Caso o comando `npm run db:generate` falhe, confirme que `.env` existe na raiz e que as dependências foram instaladas. Para comandos NestJS, execute a partir da raiz com `npm run dev` ou `npm run dev -w @enterprise/api`.

## Organização

```text
apps/
  web/                   Portal interno React + Vite
  api/                   API NestJS
  portal-external/       Portal externo (estrutura inicial; sem login)
  worker/                Reserva arquitetural para jobs
packages/                 Contratos e biblioteca compartilhada (evolutivo)
prisma/
  schema.prisma          Entidades transversais
  migrations/            Migração inicial SQL
  seeds/                 Sem seed de dados falsos
docs/                    Especificações de engenharia
```

## Limites de segurança

**Não disponibilize publicamente os portais ou a API desta fundação.** A navegação atual é de desenvolvimento, **sem login, MFA ou guardas de autorização operacionais**. Não há endpoints de CRUD financeiro, fiscal ou administrativo. Identidade e autorização completa são bloqueadores para produção. Veja `docs/SEGURANCA.md` e `docs/ROADMAP.md`.

Credenciais do Docker são **apenas para localhost**. Altere senhas e segredos antes de qualquer outro ambiente; nunca comite o arquivo `.env`.

## Referência da especificação

Este pacote implementa a fundação definida no documento de referência enviado para este projeto: Enterprise ERP, arquitetura de monólito modular + DDD, integração via REST/eventos, separação interna/externa e execução por etapas.

## Lockfile

Ao executar o primeiro `npm install` em um computador com acesso ao registro npm, será criado `package-lock.json`. Versione esse arquivo no Git antes de executar CI reproduzível com `npm ci`.
