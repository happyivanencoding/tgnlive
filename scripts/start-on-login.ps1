param([switch]$Disable)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$name = 'TGNLive'
if ($Disable) {
  Remove-ItemProperty -LiteralPath $key -Name $name -ErrorAction SilentlyContinue
  Write-Output 'TGN Live login startup disabled. Current server left running.'
  exit
}
$shell = Join-Path $env:ProgramFiles 'PowerShell\7\pwsh.exe'
if (-not (Test-Path -LiteralPath $shell)) { $shell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe' }
$scriptPath = Join-Path $root 'scripts\start-local.ps1'
$command = '"' + $shell + '" -NoProfile -WindowStyle Hidden -File "' + $scriptPath + '"'
$old = (Get-ItemProperty -LiteralPath $key).$name
if ($old -and $old -ne $command) { throw 'A different TGNLive startup entry exists. No overwrite performed.' }
New-ItemProperty -LiteralPath $key -Name $name -Value $command -PropertyType String -Force | Out-Null
if ((Get-ItemPropertyValue -LiteralPath $key -Name $name) -ne $command) { throw 'Startup verification failed' }
Write-Output 'TGN Live will start hidden after this Windows user signs in.'
