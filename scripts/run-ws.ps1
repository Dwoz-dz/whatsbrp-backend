param(
  [string]$EnvFile = ""
)

$ErrorActionPreference = "Stop"

# scripts directory (this file location)
$scriptsDir = Split-Path -Parent $PSCommandPath

if (-not $EnvFile) {
  $EnvFile = Join-Path $scriptsDir ".env.ws"
}

Write-Host "Running WS test..." -ForegroundColor Cyan
Write-Host "ENV_FILE = $EnvFile"

$loadEnv = Join-Path $scriptsDir "load-env.ps1"
$wsTest  = Join-Path $scriptsDir "ws-test.js"

if (-not (Test-Path $loadEnv)) { throw "load-env.ps1 not found: $loadEnv" }
if (-not (Test-Path $wsTest))  { throw "ws-test.js not found: $wsTest" }
if (-not (Test-Path $EnvFile)) { throw ".env file not found: $EnvFile" }

# ✅ IMPORTANT: dot-source to load env variables into CURRENT process
. $loadEnv -Path $EnvFile

# Debug print
Write-Host "WS_URL(from env)  = $env:WS_URL"
Write-Host "WS_PATH(from env) = $env:WS_PATH"
Write-Host "TOKEN(len)        = $($env:TOKEN.Length)"
Write-Host "CONV_ID(from env) = $env:CONV_ID"

if (-not $env:WS_URL)  { throw "WS_URL missing in $EnvFile" }
if (-not $env:WS_PATH) { $env:WS_PATH = "/socket.io" }
if (-not $env:TOKEN)   { throw "TOKEN missing in $EnvFile" }
if (-not $env:CONV_ID) { throw "CONV_ID missing in $EnvFile" }

node $wsTest
