$ErrorActionPreference="Stop"
cd C:\Users\mahdi\whatsbrp\apps\api-nest

$base="http://127.0.0.1:3000"
$pass="12345678"

$token=(Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" `
  -Body (@{email="z1@brp.com";password=$pass}|ConvertTo-Json)).accessToken

$convId="cmlpasz8p00087wkg3ptcatnz"

@"
WS_URL=$base
TOKEN=$token
CONV_ID=$convId
"@ | Set-Content -Encoding utf8 .\scripts\.env.ws

powershell -ExecutionPolicy Bypass -File .\scripts\run-ws.ps1
