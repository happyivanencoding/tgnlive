param([string[]]$Names=@('backend','frontend','eval'),[int]$WaitMs=0)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
foreach($name in $Names){
  $runPath=Join-Path $root "artifacts/bootstrap/${name}_run.json"
  if(-not(Test-Path $runPath)){continue}
  $run=Get-Content $runPath -Raw|ConvertFrom-Json
  $cursorPath=Join-Path $root "artifacts/bootstrap/${name}_cursor.txt"
  $cursor=if(Test-Path $cursorPath){[long](Get-Content $cursorPath -Raw)}else{0}
  $counts=@{};$notes=New-Object System.Collections.Generic.List[string]
  for($page=0;$page -lt 5;$page++){
    $a=@{action='events';run_id=$run.run_id;after_seq=$cursor;limit=200;wait_ms=$WaitMs}|ConvertTo-Json
    $result=& (Join-Path $PSScriptRoot 'agentdock-rpc.ps1') -ToolName acp_prompt -ArgsJson $a|ConvertFrom-Json
    foreach($event in @($result.events)){
      $type=[string]$event.type
      if(-not $counts.ContainsKey($type)){$counts[$type]=0};$counts[$type]++
      $record=[ordered]@{observed_at=(Get-Date).ToUniversalTime().ToString('o');name=$name;run_id=$run.run_id;seq=$event.seq;type=$type}
      if($type -eq 'tool_call'){
        $title=[string]$event.update.title
        $record.title=$title.Substring(0,[Math]::Min(180,$title.Length))
        if($title){$notes.Add($record.title)}
      }
      if($type -eq 'agent_message_chunk' -and $event.update._meta.codex.phase -ne 'analysis'){
        $text=[string]$event.update.content.text
        $record.phase=$event.update._meta.codex.phase
        $record.text=$text
        if($text){[IO.File]::AppendAllText((Join-Path $root "artifacts/bootstrap/${name}_response.md"),$text,[Text.Encoding]::UTF8);$notes.Add($text.Substring(0,[Math]::Min(700,$text.Length)))}
      }
      # Never persist private agent-thought contents; only the event count/type is retained.
      [IO.File]::AppendAllText((Join-Path $root 'artifacts/bootstrap/development-events.jsonl'),(($record|ConvertTo-Json -Depth 8 -Compress)+"`n"),[Text.Encoding]::UTF8)
    }
    $cursor=$result.next_seq
    [IO.File]::WriteAllText($cursorPath,[string]$cursor)
    if(-not $result.has_more){break}
  }
  Write-Output "=== ${name}: $($result.status), next_seq=$cursor, dropped=$($result.dropped_count) ==="
  Write-Output ($counts|ConvertTo-Json -Compress)
  $notes|Select-Object -Last 8|ForEach-Object{Write-Output $_}
  $state=[ordered]@{name=$name;session_id=$run.session_id;run_id=$run.run_id;status=$result.status;next_seq=$cursor;ended_at=$result.ended_at;message=$result.message;stop_reason=$result.stop_reason}
  [IO.File]::WriteAllText((Join-Path $root "artifacts/bootstrap/${name}_observed.json"),($state|ConvertTo-Json -Depth 8),[Text.Encoding]::UTF8)
}
