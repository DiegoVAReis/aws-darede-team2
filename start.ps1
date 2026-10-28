<#
.SYNOPSIS
    Sobe o Backend (FastAPI, porta 8000) e o Frontend (Vite, porta 5173) ao mesmo tempo.

.DESCRIPTION
    Abre uma janela do PowerShell para cada servico, para que os logs fiquem separados.
    Para parar, feche as janelas ou pressione Ctrl+C em cada uma.

    Antes de subir, confere: ambiente virtual do Backend, arquivo .env na raiz, Node.js,
    dependencias do Frontend (roda npm install se faltar) e portas livres.

.PARAMETER BackendPort
    Porta do Backend. Padrao 8000. Se mudar, o Frontend recebe VITE_API_BASE_URL apontando para ela.
    A porta do Frontend e fixa em 5173 (unica origem liberada no CORS do Backend).

.PARAMETER Ingest
    Roda a ingestao da base de conhecimento (backend\ingest.py) antes de subir os servicos.
    Sem este parametro, a ingestao so e lembrada se a base ainda nao existir.

.PARAMETER NoBrowser
    Nao abre o navegador quando os dois servicos estiverem prontos.

.PARAMETER DryRun
    Mostra o que seria feito, sem iniciar nada. Falhas de pre-requisito viram avisos.

.EXAMPLE
    .\start.ps1

.EXAMPLE
    .\start.ps1 -Ingest

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\start.ps1
    (se a politica de execucao bloquear scripts)
#>
[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$BackendPort = 8000,
    [switch]$Ingest,
    [switch]$NoBrowser,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'
$python = Join-Path $backendDir '.venv\Scripts\python.exe'
$chromaDir = Join-Path $backendDir 'chroma_store'
$frontendPort = 5173
$backendUrl = "http://localhost:$BackendPort"
$frontendUrl = "http://localhost:$frontendPort"

function Stop-WithError {
    param([string]$Message)
    if ($DryRun) {
        Write-Warning "[DryRun] Isto seria um erro: $Message"
        return
    }
    Write-Host "ERRO: $Message" -ForegroundColor Red
    exit 1
}

function Test-PortInUse {
    param([int]$Port)
    $null -ne (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Wait-ForUrl {
    param([string]$Url, [int]$TimeoutSeconds = 90)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 | Out-Null
            return $true
        } catch {
            Start-Sleep -Milliseconds 700
        }
    }
    return $false
}

function Start-ServiceWindow {
    param([string]$Title, [string]$WorkingDirectory, [string]$Command)
    $dir = $WorkingDirectory.Replace("'", "''")
    $inner = "`$Host.UI.RawUI.WindowTitle = '$Title'; " +
        "[Console]::OutputEncoding = [Text.Encoding]::UTF8; " +
        "Set-Location -LiteralPath '$dir'; $Command"
    if ($DryRun) {
        Write-Host "[DryRun] Janela '$Title' em $WorkingDirectory"
        Write-Host "         $Command"
        return
    }
    $shell = (Get-Process -Id $PID).Path
    Start-Process -FilePath $shell -WorkingDirectory $WorkingDirectory `
        -ArgumentList @('-NoExit', '-NoProfile', '-Command', $inner) | Out-Null
}

Write-Host "Assistente Anyone Agro: iniciando Backend e Frontend" -ForegroundColor Cyan

# --- Pre-requisitos -------------------------------------------------------------------------

if (-not (Test-Path -LiteralPath $python)) {
    Stop-WithError ("Ambiente virtual do Backend nao encontrado em '$python'. Crie-o com:`n" +
        "  cd backend`n  python -m venv .venv`n  .\.venv\Scripts\python.exe -m pip install -e `".[dev]`"")
}

if (-not (Test-Path -LiteralPath (Join-Path $root '.env'))) {
    Stop-WithError "Arquivo .env nao encontrado na raiz do projeto ($root). Ele e fornecido pelo facilitador."
}

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $npm -or -not $node) {
    Stop-WithError "Node.js e npm nao encontrados no PATH. Instale o Node 22.22.2+, 24.15.0+ ou 26+."
} else {
    $nodeVersion = [version](& node --version).TrimStart('v')
    if ($nodeVersion -lt [version]'20.19.0') {
        Stop-WithError "Node $nodeVersion e antigo demais para o Vite 8 (minimo 20.19). Use o Node 22.22.2+, 24.15.0+ ou 26+."
    }
}

if (Test-PortInUse $BackendPort) {
    Stop-WithError "A porta $BackendPort ja esta em uso. Feche o processo que a usa ou escolha outra com -BackendPort."
}
if (Test-PortInUse $frontendPort) {
    Stop-WithError "A porta $frontendPort ja esta em uso. Ela e fixa porque o Backend so aceita a origem $frontendUrl (CORS)."
}

# --- Preparo --------------------------------------------------------------------------------

if (-not (Test-Path -LiteralPath (Join-Path $frontendDir 'node_modules'))) {
    if ($DryRun) {
        Write-Host "[DryRun] Rodaria 'npm install' em $frontendDir"
    } else {
        Write-Host "Instalando dependencias do Frontend (npm install)..." -ForegroundColor Yellow
        Push-Location $frontendDir
        try {
            & npm.cmd install
            if ($LASTEXITCODE -ne 0) { Stop-WithError "npm install falhou (codigo $LASTEXITCODE)." }
        } finally {
            Pop-Location
        }
    }
}

if ($Ingest) {
    if ($DryRun) {
        Write-Host "[DryRun] Rodaria a ingestao: $python ingest.py (em $backendDir)"
    } else {
        Write-Host "Indexando a base de conhecimento (ingest.py)..." -ForegroundColor Yellow
        Push-Location $backendDir
        try {
            & $python ingest.py
            if ($LASTEXITCODE -ne 0) {
                Stop-WithError "A ingestao terminou com erro (codigo $LASTEXITCODE). Veja as mensagens acima e rode de novo."
            }
        } finally {
            Pop-Location
        }
    }
} elseif (-not (Test-Path -LiteralPath $chromaDir)) {
    Write-Warning ("A base de conhecimento ainda nao foi indexada (backend\chroma_store nao existe). " +
        "As perguntas vao falhar com 'base nao indexada'. Rode: .\start.ps1 -Ingest")
}

# --- Inicio ---------------------------------------------------------------------------------

# 1 worker: as sessoes de conversa ficam na memoria do processo.
$backendCommand = "& '$python' -m uvicorn main:app --port $BackendPort"
Start-ServiceWindow -Title "Backend :$BackendPort" -WorkingDirectory $backendDir -Command $backendCommand

$frontendCommand = "& npm.cmd run dev"
if ($BackendPort -ne 8000) {
    $frontendCommand = "`$env:VITE_API_BASE_URL = '$backendUrl'; $frontendCommand"
}
Start-ServiceWindow -Title "Frontend :$frontendPort" -WorkingDirectory $frontendDir -Command $frontendCommand

if ($DryRun) {
    Write-Host "[DryRun] Depois esperaria $backendUrl/health e $frontendUrl e abriria o navegador."
    exit 0
}

Write-Host "Aguardando o Backend em $backendUrl/health ..."
if (Wait-ForUrl -Url "$backendUrl/health") {
    Write-Host "Backend pronto." -ForegroundColor Green
} else {
    Write-Warning "O Backend nao respondeu em 90 s. Veja a janela 'Backend :$BackendPort' para o motivo."
}

Write-Host "Aguardando o Frontend em $frontendUrl ..."
if (Wait-ForUrl -Url $frontendUrl) {
    Write-Host "Frontend pronto." -ForegroundColor Green
    if (-not $NoBrowser) { Start-Process $frontendUrl | Out-Null }
} else {
    Write-Warning "O Frontend nao respondeu em 90 s. Veja a janela 'Frontend :$frontendPort' para o motivo."
}

Write-Host ""
Write-Host "Frontend: $frontendUrl" -ForegroundColor Cyan
Write-Host "Backend:  $backendUrl (saude: $backendUrl/health)" -ForegroundColor Cyan
Write-Host "Para parar, feche as duas janelas ou pressione Ctrl+C em cada uma."
