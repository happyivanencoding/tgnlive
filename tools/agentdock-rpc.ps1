param(
  [string]$ToolName,
  [string]$ArgsPath,
  [string]$ArgsJson = '{}',
  [string]$OutputPath,
  [switch]$ListTools
)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$runtime=Join-Path $env:LOCALAPPDATA 'AgentDock'
$uri=if($env:TGN_LIVE_AGENTDOCK_URL){$env:TGN_LIVE_AGENTDOCK_URL}else{'http://127.0.0.1:8766/mcp'}
$enc=[IO.File]::ReadAllText((Join-Path $runtime 'auth-token.dpapi'),[Text.Encoding]::UTF8).Trim()
$plain=[System.Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($enc),[Text.Encoding]::UTF8.GetBytes('agentdock.startup.v1'),[System.Security.Cryptography.DataProtectionScope]::CurrentUser)
$token=[Text.Encoding]::UTF8.GetString($plain)
$headers=@{Authorization="Bearer $token";Accept='application/json, text/event-stream'}
$rpcId=0
function Invoke-Rpc([string]$method,$params){
  $script:rpcId++
  $body=@{jsonrpc='2.0';id=$script:rpcId;method=$method;params=$params}|ConvertTo-Json -Depth 70 -Compress
  $r=Invoke-WebRequest -Uri $uri -Method Post -Headers $script:headers -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 90
  if($r.Headers['Mcp-Session-Id']){$script:headers['Mcp-Session-Id']=[string]($r.Headers['Mcp-Session-Id']|Select-Object -First 1)}
  $c=$r.Content
  if($c -match '^event:'){$j=($c -split "`n"|Where-Object{$_ -like 'data:*'}|Select-Object -First 1).Substring(5).Trim()}else{$j=$c}
  $result=$j|ConvertFrom-Json -Depth 80
  if($result.error){throw ($result.error|ConvertTo-Json -Depth 10 -Compress)}
  return $result.result
}
Invoke-Rpc 'initialize' @{protocolVersion='2025-11-25';capabilities=@{};clientInfo=@{name='tgn-live-bootstrap';version='0.1'}}|Out-Null
$initialized=@{jsonrpc='2.0';method='notifications/initialized';params=@{}}|ConvertTo-Json -Compress
Invoke-WebRequest -Uri $uri -Method Post -Headers $headers -ContentType 'application/json' -Body $initialized -TimeoutSec 15|Out-Null
if($ListTools){
  $r=Invoke-Rpc 'tools/list' @{}
  $value=@($r.tools|Where-Object{$_.name -match '^(acp_|browser_)'})
}else{
  if(-not $ToolName){throw 'ToolName is required'}
  if($ArgsPath){$ArgsJson=[IO.File]::ReadAllText($ArgsPath,[Text.Encoding]::UTF8)}
  $argsObject=$ArgsJson|ConvertFrom-Json -Depth 70
  $r=Invoke-Rpc 'tools/call' @{name=$ToolName;arguments=$argsObject}
  if($r.isError){throw ($r|ConvertTo-Json -Depth 20 -Compress)}
  if($r.structuredContent){$value=$r.structuredContent}else{
    $txt=($r.content|Where-Object{$_.type -eq 'text'}|Select-Object -First 1).text
    if($txt){try{$value=$txt|ConvertFrom-Json -Depth 70}catch{$value=$txt}}else{$value=$r}
  }
}
$json=$value|ConvertTo-Json -Depth 80
if($OutputPath){[IO.File]::WriteAllText($OutputPath,$json,[Text.Encoding]::UTF8);Write-Output "Saved $OutputPath"}else{Write-Output $json}
# Credentials are decrypted only in process memory and are never written or printed.
