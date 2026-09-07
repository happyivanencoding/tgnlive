import fs from 'node:fs';
import path from 'node:path';
for(const label of process.argv.slice(2)){
 if(!/^[a-z0-9_.-]+$/i.test(label))throw Error('Safe existing label required');
 const dir=path.resolve('artifacts/eval',label),read=name=>fs.existsSync(path.join(dir,name))?JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')):null;
 const metrics=read('server-metrics.json');
 const activeStage=read('current-stage.json'),player=read('current-player.json');
 console.log(JSON.stringify({label,progress:read('progress.json'),lastTraces:metrics?.turns?.slice(-3).map(t=>({status:t.status,totalMs:t.totalElapsedMs,firstNarrativeMs:t.firstNarrativeSseMs??t.firstReaderVisibleMs,provider:Object.fromEntries(Object.entries(t.provider||{}).map(([k,v])=>[k,{model:v.model,effort:v.reasoningEffort,sessionId:v.sessionId,runId:v.runId}])),stages:t.stages?.map(s=>({name:s.name,status:s.status,elapsedMs:s.elapsedMs})),errors:t.errors})),activeStage,player:player?{sessionId:player.sessionId,runId:player.runId,totalMs:player.totalMs,lastEvents:player.events?.slice(-3)}:null},null,2));
}
