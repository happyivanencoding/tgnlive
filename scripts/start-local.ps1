param([int]$Port = 4317)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $root '.runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$listener = Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) { throw "127.0.0.1:$Port already belongs to PID $($listener.OwningProcess). Nothing was stopped." }

# Task Scheduler, rather than a child of a bounded AgentDock command, owns this long-lived server.
$environment = @{ TGN_PORT = [string]$Port }
foreach ($entry in Get-ChildItem Env:TGN_*) { $environment[$entry.Name] = $entry.Value }
$environment.TGN_PORT = [string]$Port
# Pin a tested UI release: later edits in public/ must not hot-change the live UI.
# Test servers bypass this launcher and explicitly select their own frozen source.
$version = (Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
$releaseId = "$version-" + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmssfff')
$publicRelease = Join-Path $runtime "public-releases\$releaseId"
New-Item -ItemType Directory -Path $publicRelease -Force | Out-Null
Copy-Item -Path (Join-Path $root 'public\*') -Destination $publicRelease -Recurse -Force
$environment.TGN_PUBLIC_DIR = $publicRelease
@{ node = (Get-Command node).Source; environment = $environment } | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 (Join-Path $runtime 'server-bootstrap.json')
$taskName = 'TGNLive-Web'
$shell = (Get-Command pwsh -ErrorAction SilentlyContinue).Source
if (-not $shell) { $shell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe' }
$bootstrap = Join-Path $root 'scripts\run-local.ps1'
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing -and $existing.Actions.Arguments -notlike "*$bootstrap*") { throw 'TGNLive-Web already runs a different command. It was not changed.' }
$action = New-ScheduledTaskAction -Execute $shell -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $bootstrap + '"') -WorkingDirectory $root
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Settings $settings -Description 'TGN Live owner-only local web server; started on demand by the project script.' -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
for ($attempt = 0; $attempt -lt 40; $attempt++) {
  Start-Sleep -Milliseconds 250
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 1
    if ($health.ok) {
      $record = Get-Content (Join-Path $runtime 'server.json') -Raw | ConvertFrom-Json
      @{ Pid=$record.pid; Url="http://127.0.0.1:$Port"; TaskName=$taskName; Version=$health.version; PublicAssets=$publicRelease; RuntimeRecord=(Join-Path $runtime 'server.json') } | ConvertTo-Json
      exit 0
    }
  } catch {}
}
throw "TGN Live did not become healthy. Inspect .runtime/server-error.log and the $taskName scheduled task."
