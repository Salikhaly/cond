param([Parameter(Mandatory=$true)][string]$Source, [Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference = 'Stop'
foreach ($folder in @('bin', 'lib', 'share')) {
    Copy-Item -LiteralPath (Join-Path $Source $folder) -Destination $Destination -Recurse -Force
}
