param([switch]$Phone)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$backendPath = Join-Path $projectRoot 'back-main/back-main'
$frontendPath = Join-Path $projectRoot 'front-main/front-main'
$nodePath = (Get-Command node.exe).Source
$npmPath = (Get-Command npm.cmd).Source
$logPath = Join-Path $projectRoot '.local-logs'
New-Item -ItemType Directory -Path $logPath -Force | Out-Null
if (!(Test-Path -LiteralPath (Join-Path $backendPath 'node_modules'))) {
    Push-Location $backendPath
    try { & $npmPath ci --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed' } } finally { Pop-Location }
}
if (!(Test-Path -LiteralPath (Join-Path $frontendPath 'node_modules'))) {
    Push-Location $frontendPath
    try { & $npmPath ci --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed' } } finally { Pop-Location }
}
if (!(Test-Path -LiteralPath (Join-Path $backendPath '.env'))) {
    $secret = New-Object byte[] 48
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($secret)
    $rng.Dispose()
    @('DB_NAME=cond_local', 'DB_USER=cond_local', 'DB_PASSWORD=cond_local_dev', 'DB_HOST=127.0.0.1', 'DB_PORT=55432', 'PORT=3000', 'HOST=127.0.0.1', 'CLIENT_URL=http://localhost:9000', 'DEV_CLIENT_URL=http://127.0.0.1:9000', 'LOCAL_DEMO=true', ('SECRET_KEY=' + [Convert]::ToBase64String($secret))) | Set-Content -LiteralPath (Join-Path $backendPath '.env') -Encoding utf8
}
if (!(Test-Path -LiteralPath (Join-Path $frontendPath '.env'))) {
    @('API_URL_DEV=/api', 'LOCAL_DEMO=true') | Set-Content -LiteralPath (Join-Path $frontendPath '.env') -Encoding utf8
}
if (!(Test-Path -LiteralPath (Join-Path $frontendPath 'build/index.html'))) {
    Push-Location $frontendPath
    try { & $npmPath run build; if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' } } finally { Pop-Location }
}
Push-Location $backendPath
try { & $nodePath scripts/local-db.mjs; if ($LASTEXITCODE -ne 0) { throw 'Local database startup failed' } } finally { Pop-Location }
function Test-Ready([string]$Url) {
    try { return (Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { return $false }
}
if (!(Test-Ready 'http://127.0.0.1:3000/api/health')) {
    $apiProcess = Start-Process -FilePath $nodePath -ArgumentList @('src/index.js') -WorkingDirectory $backendPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logPath 'api.log') -RedirectStandardError (Join-Path $logPath 'api-error.log') -PassThru
    $apiProcess.Id | Set-Content -LiteralPath (Join-Path $logPath 'api.pid')
}
if ($Phone -and (Test-Ready 'http://127.0.0.1:9000/')) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort 9000 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener.LocalAddress -eq '127.0.0.1') {
        $managedPidPath = Join-Path $logPath 'web.pid'
        if (!(Test-Path -LiteralPath $managedPidPath)) { throw 'Port 9000 is already used. Stop the previous web server first.' }
        $managedProcessId = [int](Get-Content -LiteralPath $managedPidPath)
        $managedInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $managedProcessId"
        if ($listener.OwningProcess -ne $managedProcessId -or $managedInfo.CommandLine -notmatch 'scripts/local-web.js|webpack-cli') { throw 'Port 9000 belongs to another application.' }
        Stop-Process -Id $managedProcessId -Force
    }
}
if (!(Test-Ready 'http://127.0.0.1:9000/')) {
    if ($Phone) { $env:WEB_HOST = '0.0.0.0' } else { $env:WEB_HOST = '127.0.0.1' }
    $webProcess = Start-Process -FilePath $nodePath -ArgumentList @('scripts/local-web.js') -WorkingDirectory $frontendPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logPath 'web.log') -RedirectStandardError (Join-Path $logPath 'web-error.log') -PassThru
    $webProcess.Id | Set-Content -LiteralPath (Join-Path $logPath 'web.pid')
}
$ready = $false
for ($attempt = 0; $attempt -lt 45; $attempt++) {
    if ((Test-Ready 'http://127.0.0.1:3000/api/health') -and (Test-Ready 'http://127.0.0.1:9000/')) { $ready = $true; break }
    Start-Sleep -Seconds 1
}
if (!$ready) { throw ('Services did not become ready. See ' + $logPath) }
Write-Output 'COND ready: http://127.0.0.1:9000'
Write-Output 'Demo accounts: admin@local.test / worker@local.test / firm@local.test'
Write-Output 'Demo password: Local2026!demo'
if ($Phone) {
    Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.InterfaceAlias -notmatch 'vEthernet|Loopback' } | ForEach-Object { Write-Output ('Phone on same Wi-Fi: http://' + $_.IPAddress + ':9000') }
    Write-Output 'Use only a trusted private network. If blocked, allow Node.js in Windows Firewall for Private networks only.'
}
