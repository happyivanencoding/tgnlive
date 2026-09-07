$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$runtime = Join-Path $root '.runtime'
$settings = Get-Content (Join-Path $runtime 'server-bootstrap.json') -Raw | ConvertFrom-Json
foreach ($entry in $settings.environment.PSObject.Properties) {
  [Environment]::SetEnvironmentVariable($entry.Name, [string]$entry.Value, 'Process')
}
$env:TGN_SERVER_STDOUT_LOG = Join-Path $runtime 'server.out.log'
$env:TGN_SERVER_STDERR_LOG = Join-Path $runtime 'server-error.log'
& $settings.node (Join-Path $root 'src\server.js') 1>> $env:TGN_SERVER_STDOUT_LOG 2>> $env:TGN_SERVER_STDERR_LOG
exit $LASTEXITCODE
