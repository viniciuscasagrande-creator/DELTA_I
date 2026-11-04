$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
Write-Host 'Enterprise ERP — Preparação local (Fundação + Core Identity v1.2)' -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js ausente. Instale a versão 20 ou superior.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm ausente.' }

if (-not (Test-Path '.env')) {
  Copy-Item '.env.example' '.env'
  Write-Host 'Arquivo .env local criado.' -ForegroundColor Yellow
}

npm install
if ($LASTEXITCODE -ne 0) { throw 'Falha na instalação de dependências npm.' }

if (Get-Command docker -ErrorAction SilentlyContinue) {
  Write-Host 'Docker detectado: iniciando containers postgres e redis...' -ForegroundColor Cyan
  docker compose up -d postgres redis
} else {
  Write-Host 'Docker não instalado localmente: utilizando conexão PostgreSQL configurada no .env (Neon / Cloud).' -ForegroundColor Yellow
}

npm run db:generate
if ($LASTEXITCODE -ne 0) { throw 'Falha ao gerar Prisma Client.' }

npm run db:migrate
if ($LASTEXITCODE -ne 0) { throw 'Falha na migration inicial.' }

Write-Host 'Iniciando API (3000) e Portal Interno (5173)...' -ForegroundColor Green
npm run dev
