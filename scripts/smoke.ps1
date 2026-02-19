param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [string]$AdminKey = "dev_admin_key_change_me",
  [string]$Pass = "12345678",
  [string]$Email1 = "z1@brp.com",
  [string]$Email2 = "z2@brp.com",
  [string]$Name1 = "Z1",
  [string]$Name2 = "Z2"
)

$ErrorActionPreference = "Stop"

# Proxy hygiene (Windows be like )
$env:NO_PROXY="127.0.0.1,localhost,::1"
Remove-Item Env:HTTP_PROXY,Env:HTTPS_PROXY,Env:http_proxy,Env:https_proxy -ErrorAction SilentlyContinue

$base = $BaseUrl.TrimEnd("/")
$adminHeaders = @{ "x-admin-key" = $AdminKey }

function Show-Err($e){
  try { return $e.ErrorDetails.Message } catch { return $e.Exception.Message }
}

function Assert-ApiUp {
  try {
    $r = Invoke-RestMethod -Method Get -Uri "$base/" -TimeoutSec 3
    Write-Host " API OK => $r"
  } catch {
    throw " API DOWN => $(Show-Err $_)"
  }
}

function Register-Or-Login {
  param([string]$Email,[string]$Password,[string]$FullName)

  # Try register
  try {
    $u = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" `
      -Body (@{ email=$Email; password=$Password; fullName=$FullName } | ConvertTo-Json)
    return @{ id=$u.id; email=$Email; token=$null; created=$true }
  } catch {
    $msg = Show-Err $_

    # If already exists => login
    if ($msg -match "Email already used") {
      $token = (Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" `
        -Body (@{ email=$Email; password=$Password } | ConvertTo-Json)).accessToken

      if (-not $token) { throw " LOGIN failed (no token) for $Email" }

      $me = Invoke-RestMethod -Method Get -Uri "$base/auth/me" -Headers @{ Authorization="Bearer $token" }
      return @{ id=$me.id; email=$Email; token=$token; created=$false }
    }

    throw " REGISTER failed for $Email => $msg"
  }
}

function Approve-User([string]$UserId){
  if (-not $UserId) { throw "Approve-User: UserId is empty" }
  Invoke-RestMethod -Method Post -Uri "$base/admin/users/$UserId/approve" -Headers $adminHeaders | Out-Null
}

function Create-DM([string]$u1,[string]$u2){
  if (-not $u1 -or -not $u2) { throw "Create-DM: missing memberIds" }

  $conv = Invoke-RestMethod -Method Post -Uri "$base/admin/conversations" -Headers $adminHeaders -ContentType "application/json" `
    -Body (@{ type="DM"; memberIds=@($u1,$u2) } | ConvertTo-Json)

  if (-not $conv.id) { throw "Create-DM failed: no conv.id returned" }
  return $conv
}

# ===== RUN =====
Write-Host "== API CHECK ==" -ForegroundColor Cyan
Assert-ApiUp

Write-Host "== USERS ==" -ForegroundColor Cyan
$u1 = Register-Or-Login -Email $Email1 -Password $Pass -FullName $Name1
$u2 = Register-Or-Login -Email $Email2 -Password $Pass -FullName $Name2
Write-Host "u1: id=$($u1.id) created=$($u1.created)"
Write-Host "u2: id=$($u2.id) created=$($u2.created)"

Write-Host "== APPROVE (ADMIN) ==" -ForegroundColor Cyan
Approve-User $u1.id
Approve-User $u2.id
Write-Host "approved "

Write-Host "== CREATE DM ==" -ForegroundColor Cyan
$conv = Create-DM $u1.id $u2.id
$convId = $conv.id
Write-Host "convId=$convId"

Write-Host "== LOGIN u1 (ensure token) ==" -ForegroundColor Cyan
if (-not $u1.token) {
  $u1.token = (Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" `
    -Body (@{ email=$u1.email; password=$Pass } | ConvertTo-Json)).accessToken
}
if (-not $u1.token) { throw "No token for u1" }
$headers=@{ Authorization="Bearer $($u1.token)" }

Write-Host "== LIST CONVERSATIONS ==" -ForegroundColor Cyan
$convs = Invoke-RestMethod -Method Get -Uri "$base/conversations" -Headers $headers
$convs | ConvertTo-Json -Depth 10

Write-Host "== LIST MESSAGES ==" -ForegroundColor Cyan
$msgs = Invoke-RestMethod -Method Get -Uri "$base/conversations/$convId/messages?limit=30" -Headers $headers
$msgs | ConvertTo-Json -Depth 10

Write-Host "== EXPORT ENV for WS ==" -ForegroundColor Cyan
$env:TOKEN = $u1.token
$env:CONV_ID = $convId
Write-Host "ENV ready  TOKEN + CONV_ID"
Write-Host "Run: node .\scripts\ws-test.js"
