$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$recordPath = Join-Path $root '.runtime\server.json'
if (-not (Test-Path -LiteralPath $recordPath)) { throw 'No project-owned server record exists.' }
$record = Get-Content -Raw -LiteralPath $recordPath | ConvertFrom-Json
$process = Get-CimInstance Win32_Process -Filter "ProcessId = $($record.pid)" -ErrorAction SilentlyContinue
if (-not $process) { Write-Output 'Recorded process is no longer running.'; exit 0 }
$expected = [IO.Path]::GetFullPath((Join-Path $root 'src\server.js'))
if ($process.Name -notmatch '^node(\.exe)?$' -or $process.CommandLine -notlike "*$expected*") {
  throw "PID $($record.pid) is not the recorded TGN Live Node command. Nothing was stopped."
}
Stop-Process -Id $record.pid
Write-Output "Stopped project-owned TGN Live PID $($record.pid)."
