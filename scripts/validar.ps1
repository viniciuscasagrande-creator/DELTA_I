$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
Write-Host 'Enterprise ERP — Verificando código, schema Prisma, tipagem, testes e build...' -ForegroundColor Cyan

if (-not (Test-Path 'node_modules\.prisma\client\index.js')) {
  npm run db:generate
  if ($LASTEXITCODE -ne 0) { throw 'Prisma generate falhou.' }
} else {
  Write-Host '✔ Prisma Client já gerado e carregado.' -ForegroundColor Green
}

npx prisma validate --schema prisma/schema.prisma
if ($LASTEXITCODE -ne 0) { throw 'Prisma validate falhou.' }

npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Typecheck falhou.' }

npm test
if ($LASTEXITCODE -ne 0) { throw 'Testes falharam.' }

npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build falhou.' }

Write-Host '✅ Todas as validações locais (Prisma, TypeScript, Testes de Segurança e Build) foram concluídas com sucesso!' -ForegroundColor Green
