$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$backendPath = Join-Path $projectRoot 'back-main/back-main'
$frontendPath = Join-Path $projectRoot 'front-main/front-main'
$nodePath = (Get-Command node.exe).Source
$logPath = Join-Path $projectRoot '.local-logs'
New-Item -ItemType Directory -Force -Path $logPath | Out-Null
$databaseFile = Join-Path $logPath 'presentation-db.txt'
if (Test-Path -LiteralPath $databaseFile) { $env:PRESENTATION_DB = (Get-Content -LiteralPath $databaseFile -Raw).Trim() }
if (!(Test-Path -LiteralPath (Join-Path $backendPath '.env'))) { throw 'Run START.cmd once to prepare the local dependencies and configuration.' }
Push-Location $backendPath
try {
    & $nodePath scripts/local-db.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Local PostgreSQL is unavailable' }
    $presentationDatabase = (& $nodePath scripts/presentation-create-db.js | Select-Object -Last 1)
    if ($LASTEXITCODE -ne 0 -or $presentationDatabase -notmatch '^cond_presentation_\d{8}$') { throw 'Could not prepare the separate presentation database' }
} finally { Pop-Location }
$presentationDatabase | Set-Content -LiteralPath $databaseFile
$env:DB_NAME = $presentationDatabase
$env:PORT = '3002'
$env:HOST = '127.0.0.1'
$env:NODE_ENV = 'development'
$env:LOCAL_DEMO = 'true'
$env:PRESENTATION_MODE = 'true'
$env:CLIENT_URL = 'http://127.0.0.1:9002'
$env:DEV_CLIENT_URL = 'http://localhost:9002'
$env:SYNC_AUTO = 'false'
$env:SYNC_CLOUD_URL = ''
function Get-Health([int]$Port) { try { return Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 2 } catch { return $null } }
$health = Get-Health 3002
if ($health -and !$health.presentation) { throw 'Port 3002 is used by another server. No processes were stopped.' }
if ($health -and $health.presentationDate -ne $presentationDatabase.Substring($presentationDatabase.Length-8)) { throw 'The running presentation server uses another database. Stop that presentation server before switching databases.' }
if (!$health) {
    $apiProcess = Start-Process -FilePath $nodePath -ArgumentList @('src/index.js') -WorkingDirectory $backendPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logPath 'presentation-api.log') -RedirectStandardError (Join-Path $logPath 'presentation-api-error.log') -PassThru
    $apiProcess.Id | Set-Content -LiteralPath (Join-Path $logPath 'presentation-api.pid')
}
$ready = $false
for ($attempt=0; $attempt -lt 30; $attempt++) { if ((Get-Health 3002).presentation) { $ready=$true; break }; Start-Sleep -Seconds 1 }
if (!$ready) { throw 'Presentation API failed to start. Check .local-logs/presentation-api-error.log' }
Push-Location $backendPath
try { & $nodePath scripts/presentation-seed.js; if ($LASTEXITCODE -ne 0) { throw 'Presentation dataset setup failed' }; & $nodePath scripts/presentation-trade.js; if ($LASTEXITCODE -ne 0) { throw 'Presentation shops setup failed' } } finally { Pop-Location }
$env:WEB_PORT = '9002'
$env:WEB_HOST = '127.0.0.1'
$env:API_PORT = '3002'
if (!(Get-Health 9002)) {
    $webProcess = Start-Process -FilePath $nodePath -ArgumentList @('scripts/local-web.js') -WorkingDirectory $frontendPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logPath 'presentation-web.log') -RedirectStandardError (Join-Path $logPath 'presentation-web-error.log') -PassThru
    $webProcess.Id | Set-Content -LiteralPath (Join-Path $logPath 'presentation-web.pid')
}
for ($attempt=0; $attempt -lt 15; $attempt++) { if ((Get-Health 9002).presentation) { Write-Output 'Presentation: http://127.0.0.1:9002'; Write-Output 'Demo accounts: admin@local.test / worker@local.test / firm@local.test'; Write-Output 'Demo password: Local2026!demo'; exit 0 }; Start-Sleep -Seconds 1 }
throw 'Presentation web server failed to start'
