param(
  [Parameter(Mandatory=$true)]
  [string]$Path
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Path)) {
  throw "Env file not found: $Path"
}

Get-Content $Path | ForEach-Object {
  $line = $_.Trim()
  if (-not $line) { return }
  if ($line.StartsWith("#")) { return }

  $idx = $line.IndexOf("=")
  if ($idx -lt 1) { return }

  $k = $line.Substring(0, $idx).Trim()
  $v = $line.Substring($idx + 1).Trim()

  if (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'"))) {
    $v = $v.Substring(1, $v.Length - 2)
  }

  # ✅ set for current process
  Set-Item -Path "Env:$k" -Value $v
  Write-Host "Loaded: $k"
}
