param([int]$Port = 4317)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $root '.runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$listener = Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  throw "127.0.0.1:$Port is already owned by PID $($listener.OwningProcess). No process was terminated."
}
$stdoutLog = Join-Path $runtime 'server.out.log'
$stderrLog = Join-Path $runtime 'server-error.log'
$env:TGN_PORT = [string]$Port
$env:TGN_SERVER_STDOUT_LOG = $stdoutLog
$env:TGN_SERVER_STDERR_LOG = $stderrLog
$process = Start-Process -FilePath (Get-Command node).Source -ArgumentList 'src/server.js' -WorkingDirectory $root -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -WindowStyle Hidden -PassThru
for ($attempt = 0; $attempt -lt 50; $attempt++) {
  Start-Sleep -Milliseconds 100
  if ($process.HasExited) { throw "TGN Live exited with code $($process.ExitCode). See $stderrLog" }
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 1
    if ($health.ok) {
      [pscustomobject]@{Pid=$process.Id;Url="http://127.0.0.1:$Port";StdoutLog=$stdoutLog;StderrLog=$stderrLog;RuntimeRecord=(Join-Path $runtime 'server.json')} | ConvertTo-Json
      exit 0
    }
  } catch {}
}
throw "TGN Live did not become healthy. PID $($process.Id), logs: $stdoutLog / $stderrLog"
