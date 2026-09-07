import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const names=process.argv.slice(2);
if(!names.length||names.some(n=>!/^[a-z0-9_.-]+$/i.test(n)))throw Error('Pass existing evaluation directory labels');
function stats(values){const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return{n:a.length,medianMs:a.length?(a.length%2?a[Math.floor(a.length/2)]:(a[a.length/2-1]+a[a.length/2])/2):null,p95Ms:a.length?a[Math.ceil(a.length*.95)-1]:null,maxMs:a.at(-1)??null,meanMs:a.length?a.reduce((x,y)=>x+y,0)/a.length:null};}
function load(dir,name,fallback){const file=path.join(dir,name);return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')):fallback;}
const reports=[];
for(const label of names){
 const dir=path.join(root,'artifacts/eval',label),manifest=load(dir,'manifest.json',{}),summary=load(dir,'summary.json',{}),game=load(dir,'final-game.json',null),metric=load(dir,'server-metrics.json',{turns:[]});
 const file=path.join(dir,'turns.jsonl');const records=fs.existsSync(file)?fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
 const committed=records.filter(r=>r.outcome==='completed'),traces=metric.turns||[],success=traces.filter(t=>t.status==='completed'||t.status==='complete');
 // Older trace outcomes are 'committed'; explicitly use committed request IDs too.
 const ids=new Set(committed.map(r=>r.requestId));const accepted=traces.filter(t=>ids.has(t.requestId));
 const stages=[...new Set(traces.flatMap(t=>t.stages?.map(s=>s.name)||[]))].sort();
 const stagesAll=Object.fromEntries(stages.map(name=>[name,stats(traces.flatMap(t=>(t.stages||[]).filter(s=>s.name===name).map(s=>s.elapsedMs)))]));
 const checkpointRows=traces.filter(t=>t.stages?.some(s=>s.name==='plan')).map(t=>({requestId:t.requestId,status:t.status,turn:committed.find(r=>r.requestId===t.requestId)?.index??null,firstNarrativeSseMs:t.firstNarrativeSseMs??t.firstReaderVisibleMs,completeMs:t.totalElapsedMs,planningMs:t.stages.find(s=>s.name==='plan').elapsedMs,model:t.provider?.planner?.model,effort:t.provider?.planner?.reasoningEffort}));
 const models=Object.fromEntries(['narrator','planner','repair','world'].map(role=>[role,[...new Set(traces.map(t=>t.provider?.[role]).filter(Boolean).map(p=>`${p.model}/${p.reasoningEffort}`))]]));
 const daily=committed.map(r=>({turn:r.index,action:r.action,playerIntent:r.playerIntent,continueReason:r.continueReason,realm:r.afterState?.realm,coins:r.afterState?.coins,capabilities:r.afterState?.capabilities,leverage:r.afterState?.progression?.leverage,opportunities:r.afterState?.progression?.opportunities,changes:r.turn?.changes,firstNarrativeMs:r.client?.firstNarrativeMs,completionMs:r.client?.completeMs,browser:r.client?.browserTiming}));
 const initial=manifest.initialGame?.state||{},final=game?.state||committed.at(-1)?.afterState||{};
 const report={label,transport:manifest.transport||'api',requestedTurns:manifest.requestedTurns,completedTurns:committed.length,attempts:records.length,failedAttempts:records.filter(r=>r.outcome==='failed').length,status:summary.fatal?'failed':summary.endedAt?'completed':'running',fatal:summary.fatal??null,models,
 server:{firstNarrativeSse:stats(accepted.map(t=>t.firstNarrativeSseMs??t.firstReaderVisibleMs)),completion:stats(accepted.map(t=>t.totalElapsedMs)),allAttempts:stats(traces.map(t=>t.totalElapsedMs)),repairCalls:traces.reduce((n,t)=>n+(t.repairAttempts||0),0),stages:stagesAll,checkpoints:checkpointRows,contextCharacters:stats(traces.map(t=>t.promptChars?.narrator))},
 client:{firstByte:stats(committed.map(r=>r.client?.firstByteMs)),firstNarrativeReceipt:stats(committed.map(r=>r.client?.firstNarrativeMs)),completionReceipt:stats(committed.map(r=>r.client?.completeMs)),playerDecision:stats(committed.map(r=>r.player?.totalMs)),browserFeedbackPaint:stats(committed.map(r=>r.client?.browserTiming?.immediateFeedbackPaintMs)),browserNarrativePaint:stats(committed.map(r=>r.client?.browserFirstPaintMs)),browserChoicesPaint:stats(committed.map(r=>r.client?.choicesVisibleMs))},
 account:{initial:{realm:initial.realm,coins:initial.coins,capabilities:initial.capabilities?.map(x=>x.name)},final:{realm:final.realm,coins:final.coins,capabilities:final.capabilities?.map(x=>x.name),leverage:final.progression?.leverage||[],opportunities:final.progression?.opportunities||[]}},errors:traces.flatMap(t=>(t.errors||[]).map(e=>({traceId:t.id,requestId:t.requestId,...e}))),perTurn:daily,
 limits:['Unpaired autonomous trajectories; no causal retention claim','n<20 p95 nearest-rank is max; not a stable population tail','Stage durations are inclusive; ACP setup is inside model stages','API/SSE receipt and browser rAF paint approximation use different origins','Player deliberation is excluded from app waits','No physical phone or WAN measurements; provider queue/cost unknown']};
 // prompt lengths are character counts, not time or billed tokens.
 report.server.contextCharacters={n:traces.filter(t=>Number.isFinite(t.promptChars?.narrator)).length,values:traces.map(t=>t.promptChars?.narrator).filter(Number.isFinite)};
 fs.writeFileSync(path.join(dir,'analysis.json'),JSON.stringify(report,null,2));reports.push(report);
}
const concise=reports.map(({perTurn,errors,account,...r})=>({...r,finalAccount:account.final,errorCount:errors.length}));
const destination=path.join(root,'artifacts/progression-v080/comparison.json');fs.writeFileSync(destination,JSON.stringify({generatedAt:new Date().toISOString(),samples:concise},null,2));
console.log(JSON.stringify(concise.map(r=>({label:r.label,status:r.status,completed:r.completedTurns,failures:r.failedAttempts,repairs:r.server.repairCalls,firstSse:r.server.firstNarrativeSse,complete:r.server.completion,browserPaint:r.client.browserNarrativePaint,choices:r.client.browserChoicesPaint,checkpoints:r.server.checkpoints,realm:r.finalAccount.realm,capabilities:r.finalAccount.capabilities,leverage:r.finalAccount.leverage.length})),null,2));
