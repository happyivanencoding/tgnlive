// Curate synthetic play evidence. Never copies private saves, raw prompts,
// provider thought events, credentials, the reference corpus or original books.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),out=path.resolve(root,process.env.TGN_EVAL_REPORT_ROOT||'artifacts/reports/progression-v080');
fs.mkdirSync(out,{recursive:true});
const labels=process.argv.slice(2);if(!labels.length||labels.some(x=>!/^[a-z0-9_.-]+$/i.test(x)))throw Error('Existing safe sample labels required');
const read=(dir,file,fallback=null)=>fs.existsSync(path.join(dir,file))?JSON.parse(fs.readFileSync(path.join(dir,file),'utf8').replace(/^\uFEFF/,'')):fallback;
const stat=values=>{const a=values.filter(Number.isFinite).sort((x,y)=>x-y);return{n:a.length,medianMs:a.length?(a.length%2?a[Math.floor(a.length/2)]:(a[a.length/2-1]+a[a.length/2])/2):null,p95Ms:a.length?a[Math.ceil(a.length*.95)-1]:null,maxMs:a.at(-1)??null};};
const samples=[];
for(const label of labels){
 const dir=path.join(root,'artifacts/eval',label),manifest=read(dir,'manifest.json',{}),summary=read(dir,'summary.json',{}),game=read(dir,'final-game.json');
 const records=fs.existsSync(path.join(dir,'turns.jsonl'))?fs.readFileSync(path.join(dir,'turns.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
 const ok=records.filter(r=>r.outcome==='completed'),allTraces=read(dir,'server-metrics.json',{turns:[]}).turns||[];
 const background=allTraces.filter(t=>t.kind==='planner-prefetch'),traces=allTraces.filter(t=>t.kind!=='planner-prefetch');
 if(new Set(ok.map(r=>r.turn?.index??r.index)).size!==ok.length)throw Error(`Duplicate committed turn in ${label}`);
 if(game&&game.turns.length!==ok.length)throw Error(`Canon and evidence differ in ${label}; do not silently reconstruct a success`);
 const failedPlayers=[];let ancestor=label;const seen=new Set();
 while(ancestor&&!seen.has(ancestor)){
  seen.add(ancestor);const p=path.join(root,'artifacts/eval',ancestor);
  for(const filename of fs.readdirSync(p).filter(n=>/^player-\d+\.meta\.json$/.test(n))){const meta=read(p,filename,{});if(meta.outcome==='failed')failedPlayers.push({run:ancestor,file:filename,error:meta.error,totalMs:meta.totalMs});}
  ancestor=read(p,'manifest.json',{}).continuedFrom;
 }
 const ids=new Set(ok.map(r=>r.requestId));const accepted=traces.filter(t=>ids.has(t.requestId));
 const phaseNames=[...new Set(traces.flatMap(t=>(t.stages||[]).map(s=>s.name)))].sort();
 const phaseStats=Object.fromEntries(phaseNames.map(name=>[name,stat(accepted.flatMap(t=>(t.stages||[]).filter(s=>s.name===name).map(s=>s.elapsedMs)))]));
 const browserRows=ok.filter(r=>r.client?.firstNarrativeVisibleFrameMs!==undefined||(!r.sourceRun&&manifest.transport==='real-mobile-browser'));
 const rowTimes=r=>{const c=r.client||{};return{turn:r.index,outcome:r.outcome,requestId:r.requestId,sourceRun:r.sourceRun||label,feedbackVisibleFrameMs:c.feedbackVisibleFrameMs??c.browserTiming?.immediateFeedbackPaintMs??null,firstNarrativeSseReceiptMs:c.firstNarrativeSseMs??c.firstNarrativeMs??null,firstNarrativeVisibleFrameMs:c.firstNarrativeVisibleFrameMs??c.browserFirstPaintMs??null,completeReceiptMs:c.completeReceivedMs??c.completeMs??null,choicesVisibleFrameMs:c.choicesVisibleFrameMs??c.choicesVisibleMs??null,failedWaitMs:r.outcome==='failed'?(c.streamEndedMs??c.totalMs):null,playerDecisionMs:r.player?.totalMs??r.player?.durationMs??null};};
 const allRows=records.map(rowTimes),strictBrowser=browserRows.map(rowTimes);
 const snapshot={label,requestedTurns:manifest.requestedTurns??summary.requestedTurns??18,committedTurns:ok.length,failedAttempts:records.filter(r=>r.outcome==='failed').length,failedPlayers,fatal:summary.fatal??null,continuedFrom:manifest.continuedFrom||null,continuationReason:manifest.resumeReason||manifest.continuationReason||null,status:summary.endedAt?(summary.fatal?'stopped-with-error':'completed'):'in-progress',startedAt:manifest.startedAt,endedAt:summary.endedAt,wallElapsedMs:summary.endedAt?Date.parse(summary.endedAt)-Date.parse(manifest.startedAt):null,source:manifest.serverSource||null,sourceHash:manifest.serverSourceHash||null,
 server:{firstNarrativeSse:stat(accepted.map(t=>t.firstNarrativeSseMs??t.firstReaderVisibleMs)),complete:stat(accepted.map(t=>t.totalElapsedMs)),allAttempts:stat(traces.map(t=>t.totalElapsedMs)),repairCalls:traces.reduce((n,t)=>n+(t.repairAttempts||0),0),phases:phaseStats,checkpoints:traces.filter(t=>t.stages?.some(s=>s.name==='plan')).map(t=>({turn:records.find(r=>r.requestId===t.requestId)?.index??null,status:t.status,planningMs:t.stages.find(s=>s.name==='plan').elapsedMs,firstNarrativeSseMs:t.firstNarrativeSseMs??t.firstReaderVisibleMs,totalMs:t.totalElapsedMs,model:t.provider?.planner?.model||null,effort:t.provider?.planner?.reasoningEffort||null}))},
 client:{firstNarrativeReceipt:stat(allRows.filter(r=>r.outcome==='completed').map(r=>r.firstNarrativeSseReceiptMs)),completeReceipt:stat(allRows.filter(r=>r.outcome==='completed').map(r=>r.completeReceiptMs)),playerDecision:stat(allRows.filter(r=>r.outcome==='completed').map(r=>r.playerDecisionMs)),visibleFrameScope:'Independent recorder or non-inherited post-fix UI only; excludes inherited C visibility claims',feedbackVisibleFrame:stat(strictBrowser.map(r=>r.feedbackVisibleFrameMs)),firstNarrativeVisibleFrame:stat(strictBrowser.map(r=>r.firstNarrativeVisibleFrameMs)),choicesVisibleFrame:stat(strictBrowser.map(r=>r.choicesVisibleFrameMs))},
 errors:traces.flatMap(t=>(t.errors||[]).map(e=>({requestId:t.requestId,code:e.code,message:e.message,stage:e.stage,totalMs:t.totalElapsedMs}))),
 backgroundPlanning:{attempts:background.length,readyReuses:accepted.filter(t=>t.planSource==='ready-prefetch-no-foreground-model-call').length,fallbacks:accepted.filter(t=>t.planSource==='existing-plan-nonblocking-fallback').length,traces:background.map(t=>({id:t.id,kind:t.kind,basisVersion:t.basisVersion,targetVersion:t.targetVersion,status:t.status,totalMs:t.totalElapsedMs,errors:t.errors}))},
 sourceHashes:{turns:fs.existsSync(path.join(dir,'turns.jsonl'))?createHash('sha256').update(fs.readFileSync(path.join(dir,'turns.jsonl'))).digest('hex'):null},
 limits:['Autonomous diverging paths, not a paired or randomized causal experiment','Counts are not human retention; no physical phone or WAN measurement','Nested ACP spans are included in model stage time; do not sum them twice','With fewer than20 observations nearest-rank p95 equals maximum','Only committed requests enter successful latency; failures retained separately','Model context tokens are not billed tokens; billable cost and upstream queue unknown']};
 const target=path.join(out,label);fs.mkdirSync(target,{recursive:true});
 fs.writeFileSync(path.join(target,'PLAYER_DECISIONS.json'),JSON.stringify(ok.map(r=>({turn:r.index,action:r.action,intent:r.playerIntent??null,continueReason:r.continueReason??null,playerDecisionMs:r.player?.totalMs??null,recovery:r.recovery??null})),null,2));
 fs.writeFileSync(path.join(target,'MEASUREMENTS.json'),JSON.stringify({...snapshot,turnTimings:allRows,phaseTrace:traces.map(t=>({requestId:t.requestId,status:t.status,firstNarrativeSseMs:t.firstNarrativeSseMs??t.firstReaderVisibleMs,totalMs:t.totalElapsedMs,stages:t.stages,providers:Object.fromEntries(Object.entries(t.provider||{}).map(([role,p])=>[role,{model:p.model,effort:p.reasoningEffort,sessionId:p.sessionId,runId:p.runId}]))}))},null,2));
 if(game){
  const text='# '+(game.world?.title||label)+'\n\n本文件仅为真实测试生成的正文，不是原著。完成'+game.turns.length+'回合；目标'+snapshot.requestedTurns+'回合。\n\n'+game.turns.map(t=>`## 第${t.index}回合\n\n行动：${t.action}\n\n${t.narrative}\n\n可选行动：${(t.choices||[]).map(c=>c.label).join(' / ')}\n\n提交变化：${(t.changes||[]).join('；')}\n`).join('\n');
  fs.writeFileSync(path.join(target,'READING.md'),text);fs.writeFileSync(path.join(target,'READING.txt'),text);
  fs.writeFileSync(path.join(target,'ACCOUNT_HISTORY.json'),JSON.stringify(ok.map(r=>({turn:r.index,action:r.action,realm:r.afterState?.realm,coins:r.afterState?.coins,capabilities:r.afterState?.capabilities,inventory:r.afterState?.inventory,relationships:r.afterState?.relationships,progression:r.afterState?.progression,changes:r.turn?.changes})),null,2));
 }
 samples.push(snapshot);
}
fs.writeFileSync(path.join(out,'COMPARISON.json'),JSON.stringify({generatedAt:new Date().toISOString(),samples},null,2));
const sec=v=>v==null?'—':(v/1000).toFixed(3);
const table='| 样本 | 已提交/目标 | 失败尝试 | 正文SSE中位秒 | 完成中位秒 | 完成p95/最大秒 | 规划回合秒 |\n|---|---:|---:|---:|---:|---:|---|\n'+samples.map(s=>`| ${s.label} | ${s.committedTurns}/${s.requestedTurns} | ${s.failedAttempts} | ${sec(s.server.firstNarrativeSse.medianMs)} | ${sec(s.server.complete.medianMs)} | ${sec(s.server.complete.p95Ms)} | ${s.server.checkpoints.map(t=>`${t.turn??'?'}:${sec(t.planningMs)}(${t.status})`).join(' / ')} |`).join('\n');
fs.writeFileSync(path.join(out,'TIMING_TABLE.md'),'# 真实阶段耗时\n\n'+table+'\n\n只在已提交请求内计算成功延迟；失败耗时见各样本 MEASUREMENTS.json。ACP 玩家思考独立计时；服务端 SSE 不等于浏览器可见帧；小样本p95不可外推。\n');
console.log(table);
