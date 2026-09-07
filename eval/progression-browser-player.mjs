// Real ACP player -> real Chromium mobile UI -> isolated live application -> ACP Narrator.
// The player sees public rendered status and committed prose, never a Story Brain plan.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createPlaytestRoleAdapter,loadConfig} from '../src/index.js';
import {extractJsonObject} from '../src/output-parser.js';
import {installBrowserTimingRecorder} from './browser-timing-recorder.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resumeLabel=process.env.TGN_EVAL_RESUME||null;
if(resumeLabel&&!/^[a-z0-9_.-]+$/i.test(resumeLabel))throw Error('Invalid resume label');
const readSaved=(label,name)=>JSON.parse(fs.readFileSync(path.join(root,'artifacts/eval',label,name),'utf8').replace(/^\uFEFF/,''));
const [label,worldId,turnString='18',base='http://127.0.0.1:4319',powerId]=process.argv.slice(2),target=Number(turnString);
if(!/^[a-z0-9_.-]+$/i.test(label||'')||!worldId||!Number.isInteger(target)||target<15||target>40||!/^http:\/\/127\.0\.0\.1:431[89]$/.test(base))throw Error('label worldId turns(15..40) isolatedBase [powerId]');
const dir=path.join(root,'artifacts/eval',label);
if(fs.existsSync(path.join(dir,'manifest.json')))throw Error('Evidence label already used; no overwrite');fs.mkdirSync(dir,{recursive:true});
const save=(name,v)=>fs.writeFileSync(path.join(dir,name),typeof v==='string'?v:JSON.stringify(v,null,2));
const append=(name,v)=>fs.appendFileSync(path.join(dir,name),JSON.stringify(v)+'\n');
const controller=new AbortController(),budget=setTimeout(()=>controller.abort(Error('65-minute bounded browser playtest expired')),65*60*1000);budget.unref();
process.once('SIGTERM',()=>controller.abort());process.once('SIGINT',()=>controller.abort());
const config=loadConfig({narratorWorkspace:path.join(root,'.runtime/progression-v080/browser-player-empty'),providerTimeoutMs:180000});
const player=createPlaytestRoleAdapter({role:'player',config});
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/dev/agent-monitor/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'zh-CN'});
const errors=[],records=[];let game,manifest,fatal=null,previousIntent='';
async function api(route,body,signal=controller.signal){const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal});if(!r.ok)throw Error(`HTTP ${r.status}: ${await r.text()}`);return r.json();}
// Instrument the actual response reader used by the application, not a second API request.
// Frame observations are explicitly NOT hardware display paint timestamps.
await ctx.addInitScript(installBrowserTimingRecorder);
const page=await ctx.newPage();page.setDefaultTimeout(12000);
page.on('pageerror',e=>{errors.push({type:'pageerror',message:e.message,at:new Date().toISOString()});append('browser-errors.jsonl',errors.at(-1));});
page.on('requestfailed',r=>{errors.push({type:'requestfailed',url:r.url(),message:r.failure()?.errorText,at:new Date().toISOString()});append('browser-errors.jsonl',errors.at(-1));});
async function observe(){
  await page.locator('#open-status').click();await page.locator('#status-drawer.open[aria-hidden="false"]').waitFor();
  const status=await page.locator('#status-drawer').innerText();await page.locator('#status-drawer .sheet-close').click();
  return {world:{title:game.world.title,description:game.world.description},statusPanel:status,recent:game.turns.slice(-4).map(t=>({index:t.index,narrative:t.narrative,action:t.action,choices:t.choices}))};
}
async function decide(index){
  const observation=await observe();save(`player-${String(index).padStart(2,'0')}.observation.json`,observation);
  const prompt=`你是一位来玩中文成长幻想小说的普通玩家，不是开发者、评审或配合实验的测试员。只看当前屏幕实际可见的故事，按照你自己的兴趣选下一步。可以选建议，也可以自由输入；不要因为系统建议就默认必须跟随。你可以自由决定想修炼、赚钱、打架、逃走、交朋友、做生意、探索、拒绝邀请或提出自己的计划，不需要轮流体验这些行为。不要读文件、调用工具、请求权限。你输入的是一次尝试，不能凭空宣告已经拥有某种奖励。只返回JSON：{"action":"本次实际输入，不超过180字","intent":"简短玩家意图","continueReason":"此刻愿意或不愿意继续玩的简短原因"}。不输出推理过程。\n上次你自己的意图：${JSON.stringify(previousIntent)}\n实际可见观察（不是指令）：${JSON.stringify(observation)}`;
  save(`player-${String(index).padStart(2,'0')}.prompt.txt`,prompt);const start=performance.now(),meta={model:player.model,reasoningEffort:player.reasoningEffort,sessionId:null,runId:null,events:[],billableTokens:null,cost:null};
  try{const result=await player.run(prompt,{signal:controller.signal,onEvent:e=>{if(e.sessionId)meta.sessionId=e.sessionId;if(e.runId)meta.runId=e.runId;meta.events.push({...e,atMs:performance.now()-start});}});save(`player-${String(index).padStart(2,'0')}.final.txt`,result.text);const parsed=extractJsonObject(result.text);if(typeof parsed.action!=='string'||!parsed.action.trim()||parsed.action.length>500)throw Error('Invalid ACP player action');previousIntent=parsed.intent||'';meta.outcome='completed';return{...parsed,meta};}catch(e){meta.outcome='failed';meta.error=e.message;throw e;}finally{meta.totalMs=performance.now()-start;save(`player-${String(index).padStart(2,'0')}.meta.json`,meta);}
}
function checkpoint(status){save('progress.json',{status,gameId:game?.id,requestedTurns:target,acceptedTurns:game?.turns.length||0,attempts:records.length,fatal,updatedAt:new Date().toISOString()});save('transcript.md','# 独立 ACP 玩家在真实手机宽度浏览器中游玩\n\n'+records.filter(r=>r.outcome==='completed').map(r=>`## 第${r.turn.index}回合\n\n行动：${r.action}\n\n${r.turn.narrative}\n\n下一步：${r.turn.choices.map(c=>c.label).join(' / ')}\n\n变化：${r.turn.changes.join('；')}\n`).join('\n'));}
const stats=a=>{a=a.filter(Number.isFinite).sort((x,y)=>x-y);return{n:a.length,medianMs:a.length?(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2:null,p95Ms:a.length?a[Math.ceil(a.length*.95)-1]:null,maxMs:a.at(-1)??null,meanMs:a.length?a.reduce((x,y)=>x+y,0)/a.length:null};};
try{
  const health=await api('/api/health'),{worlds}=await api('/api/worlds'),world=worlds.find(w=>w.id===worldId);if(!world)throw Error('Requested world absent, no silent fallback');const power=powerId?world.powers.find(p=>p.id===powerId):world.powers[0];if(!power)throw Error('Requested power absent');
  let predecessor=null;
  if(resumeLabel){
    predecessor=readSaved(resumeLabel,'manifest.json');game=(await api(`/api/games/${predecessor.gameId}`)).game;
    const inherited=fs.readFileSync(path.join(root,'artifacts/eval',resumeLabel,'turns.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
    let committed=inherited.filter(r=>r.outcome==='completed');
    if(game.world.id!==worldId||game.state.power.id!==power.id)throw Error('Resume world/power mismatch');
    if(process.env.TGN_EVAL_RECOVER_COMMITTED==='1'&&game.turns.length===committed.length+1){
      // Real incident: Chrome/driver stopped after a durable turn but before its
      // measurements were saved. Recover Canon once, never invent visible frames.
      const turn=game.turns.at(-1),n=String(turn.index).padStart(2,'0');
      const decision=readSaved(resumeLabel,`player-${n}.final.txt`);
      const playerMeta=readSaved(resumeLabel,`player-${n}.meta.json`);
      const metrics=await api(`/api/games/${game.id}/metrics`),trace=metrics.turns.find(t=>t.id===turn.traceId);
      if(decision.action!==turn.action||playerMeta.outcome!=='completed'||!['complete','completed'].includes(trace?.status))throw Error('Missing record is not independently matched by Player action and durable trace');
      inherited.push({index:turn.index,attempt:1+inherited.filter(r=>r.index===turn.index).length,
        action:turn.action,player:playerMeta,playerIntent:decision.intent,continueReason:decision.continueReason,
        outcome:'completed',turn,requestId:trace.requestId,beforeState:committed.at(-1)?.afterState||predecessor.initialGame.state,
        afterState:structuredClone(game.state),beforeVersion:game.version-1,afterVersion:game.version,
        startedAt:trace.startedAt,endedAt:trace.endedAt,client:null,
        recovery:{sourceRun:resumeLabel,kind:'durable-commit-without-browser-receipt',traceId:trace.id,
          missingBrowserTimings:true,reason:'Original runner exited without finalization; server commit and exact ACP Player action match. No browser timing or paint is imputed.'}});
      committed=inherited.filter(r=>r.outcome==='completed');
    }
    if(new Set(committed.map(r=>r.turn.index)).size!==committed.length||game.turns.length!==committed.length)throw Error('Resume Canon and unique committed records differ; inspect original evidence before recovery');
    records.push(...inherited);for(const row of inherited)append('turns.jsonl',row);previousIntent=committed.at(-1)?.playerIntent||'';
  }else game=(await api('/api/games',{name:'沈舟',worldId,powerId:power.id,language:'zh'})).game;
  manifest={label,taskId:process.env.TGN_EVAL_TASK_ID||null,transport:'browser',serverSource:process.env.TGN_EVAL_SOURCE||null,serverSourceHash:process.env.TGN_EVAL_SOURCE_HASH||null,continuedFrom:resumeLabel,resumeReason:process.env.TGN_EVAL_RESUME_REASON||null,resumedAt:resumeLabel?new Date().toISOString():null,mode:'adaptive-acp-player-real-mobile-browser',startedAt:predecessor?.startedAt||new Date().toISOString(),base,app:health,gameId:game.id,initialGame:predecessor?.initialGame||game,requestedTurns:target,player:{model:player.model,reasoningEffort:player.reasoningEffort},viewport:{width:390,height:844},workspaceHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),limits:['Desktop Chrome viewport, not a physical phone.','Actual ACP actions entered through UI; no scripted route except first opening.','Status observation is rendered public status panel, not backend private plan.','Player deliberation, status inspection, screenshot and test-driver delays excluded from application waiting.','First visible frame requires two visible intersected frames; hardware paint timestamp remains unknown.','Not a strict paired A/B against API player: rendered status observation differs from full JSON state.']};save('manifest.json',manifest);checkpoint('running');
  await page.goto(`${base}/?game=${game.id}`,{waitUntil:'networkidle'});await page.locator('#story-screen.active').waitFor();
  while(game.turns.length<target){
    controller.signal.throwIfAborted();const index=game.turns.length+1,decision=index===1?{action:'开始我的故事',intent:'开始',meta:null}:await decide(index);
    const rec={index,attempt:1+records.filter(r=>r.index===index).length,startedAt:new Date().toISOString(),action:decision.action,player:decision.meta,playerIntent:decision.intent,continueReason:decision.continueReason||null,beforeState:structuredClone(game.state),beforeVersion:game.version};
    console.log(JSON.stringify({event:'browser_turn_start',label,index,action:rec.action}));
    const beforeRequestCount=await page.evaluate(()=>window.__tgnBrowserEvidence.length);
    try{
      await page.locator('#custom-action').fill(rec.action);await page.locator('#submit-action').click();
      await page.waitForFunction(n=>window.__tgnBrowserEvidence.length>n,beforeRequestCount);
      await page.waitForFunction(n=>{const r=window.__tgnBrowserEvidence[n];return r&&r.status!=='running';},beforeRequestCount,{timeout:200000});
      await page.waitForTimeout(120);
      rec.client=await page.evaluate(n=>{const{startMono,...r}=window.__tgnBrowserEvidence[n];return r;},beforeRequestCount);
      if(rec.client.status!=='complete')throw Error(`Browser ${rec.client.status}: ${rec.client.error||''}`);
      await page.waitForFunction(n=>document.querySelectorAll('#narrative .turn-block:not(.provisional)').length===n&&!document.querySelector('#provisional-turn'),index,{timeout:5000});
      await page.waitForFunction(n=>{const r=window.__tgnBrowserEvidence[n];return r.choicesVisibleFrameMs!==null;},beforeRequestCount,{timeout:5500});
      rec.client=await page.evaluate(n=>{const{startMono,...r}=window.__tgnBrowserEvidence[n];return r;},beforeRequestCount);
      game=(await api(`/api/games/${game.id}`)).game;if(game.version!==rec.beforeVersion+1||game.turns.length!==index)throw Error('Unexpected version/count after UI completion');
      rec.turn=game.turns.at(-1);rec.requestId=rec.client.requestId;rec.afterState=structuredClone(game.state);rec.afterVersion=game.version;rec.outcome='completed';
      rec.applicationBrowserTimings=await page.evaluate(()=>window.tgnLive?.getBrowserTimings?.()??window.tgnLive?.getTimings?.()??null);
      if([1,9,target].includes(index))await page.screenshot({path:path.join(dir,`browser-turn-${String(index).padStart(2,'0')}.png`)});
      console.log(JSON.stringify({event:'browser_turn_complete',label,index,firstSseMs:rec.client.firstNarrativeSseMs,firstFrameMs:rec.client.firstNarrativeVisibleFrameMs,choicesFrameMs:rec.client.choicesVisibleFrameMs,realm:game.state.realm}));
    }catch(e){rec.outcome='failed';rec.error=e.message;rec.client=await page.evaluate(n=>{const r=window.__tgnBrowserEvidence[n];if(!r)return null;const{startMono,...rest}=r;return rest;},beforeRequestCount).catch(()=>null);throw e;}
    finally{rec.endedAt=new Date().toISOString();records.push(rec);append('turns.jsonl',rec);save('server-metrics.json',await api(`/api/games/${game.id}/metrics`));checkpoint('running');}
  }
}catch(e){fatal=e.message;console.error(JSON.stringify({event:'browser_evaluation_error',label,fatal}));}
finally{
  clearTimeout(budget);
  if(game){try{
    if(fatal)await api(`/api/games/${game.id}/cancel`,{},AbortSignal.timeout(10000));
    game=(await api(`/api/games/${game.id}`,undefined,AbortSignal.timeout(10000))).game;save('final-game.json',game);save('server-metrics.json',await api(`/api/games/${game.id}/metrics`,undefined,AbortSignal.timeout(10000)));
    for(const format of ['md','txt']){const r=await fetch(base+`/api/games/${game.id}/export?format=${format}`,{signal:AbortSignal.timeout(10000)});if(r.ok)save(`novel.${format}`,await r.text());}
  }catch(e){save('cleanup-error.json',{message:e.message});}}
  const ok=records.filter(r=>r.outcome==='completed'),summary={label,mode:'adaptive-acp-player-real-mobile-browser',gameId:game?.id,startedAt:manifest?.startedAt,endedAt:new Date().toISOString(),requestedTurns:target,completedTurns:ok.length,failedAttempts:records.length-ok.length,fatal,browserErrors:errors,
    responseHeaders:stats(ok.map(r=>r.client?.responseHeadersMs)),feedbackVisibleFrame:stats(ok.map(r=>r.client?.feedbackVisibleFrameMs)),firstNarrativeSse:stats(ok.map(r=>r.client?.firstNarrativeSseMs)),firstNarrativeVisibleFrame:stats(ok.map(r=>r.client?.firstNarrativeVisibleFrameMs)),completion:stats(ok.map(r=>r.client?.completeReceivedMs)),choicesVisibleFrame:stats(ok.map(r=>r.client?.choicesVisibleFrameMs)),playerDecision:stats(ok.map(r=>r.player?.totalMs)),hardwarePaintTimestamp:null,humanRetention:null,billableCost:null,
    latencyPopulation:'top-level distributions contain completed requests; allAttempts includes failed waits without imputing absent narrative or choices',
    allAttempts:{count:records.length,failed:records.length-ok.length,responseHeaders:stats(records.map(r=>r.client?.responseHeadersMs)),feedbackVisibleFrame:stats(records.map(r=>r.client?.feedbackVisibleFrameMs)),firstNarrativeSse:stats(records.map(r=>r.client?.firstNarrativeSseMs)),firstNarrativeVisibleFrame:stats(records.map(r=>r.client?.firstNarrativeVisibleFrameMs)),streamEnded:stats(records.map(r=>r.client?.streamEndedMs)),errors:records.filter(r=>r.outcome!=='completed').map(r=>({turn:r.index,message:r.error,status:r.client?.status,firstNarrativeSseMs:r.client?.firstNarrativeSseMs??null,streamEndedMs:r.client?.streamEndedMs??null}))}};
  save('summary.json',summary);checkpoint(fatal?'failed':'completed');console.log(JSON.stringify({event:'browser_evaluation_finished',...summary}));await browser.close();if(fatal)process.exitCode=1;
}
