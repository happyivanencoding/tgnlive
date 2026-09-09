// Matched historical snapshot A/B: current Terra output vs Gemini direct API Narrator.
// The API key is read only at runtime and is never persisted.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {readRun,mergeAttempts} from './long-horizon-evidence.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [label='narrator-model-ab-20260909',arg2,arg3]=process.argv.slice(2);
const resume=arg2==='resume'||process.env.TGN_AB_RESUME==='1';
const cliKeyFile=resume?null:arg2;
const model=(resume?arg3:arg3)||'gemini-flash-latest';
const desktop=process.env.USERPROFILE?path.join(process.env.USERPROFILE,'Desktop'):null;
const discoveredKey=desktop&&fs.existsSync(desktop)?fs.readdirSync(desktop).find(name=>/^key_ge.*ini\.txt$/i.test(name)):null;
const keyFile=cliKeyFile||process.env.TGN_GEMINI_KEY_FILE||(discoveredKey?path.join(desktop,discoveredKey):null);
if(!/^[a-z0-9-]+$/i.test(label)||!keyFile) throw Error('Usage: node eval/narrator-model-ab.mjs <safe-label> [key-file|resume] [model]');
const out=path.join(root,'artifacts/eval',label);
if(fs.existsSync(out)&&!resume) throw Error('Preserve prior A/B evidence; choose a new label or set TGN_AB_RESUME=1');
fs.mkdirSync(out,{recursive:true});
const apiKey=fs.readFileSync(keyFile,'utf8').trim();
if(apiKey.length<20) throw Error('Gemini API key file looks invalid');

const matrix=JSON.parse(fs.readFileSync(path.join(root,'artifacts/eval/long-horizon-ledger-20260909/matrix.json'),'utf8'));
const source=matrix.executionSource||matrix.source;
const [{buildNarratorPrompt,buildRepairPrompt},{StreamingNarratorParser},{reduceState}]=await Promise.all([
 import(pathToFileURL(path.join(source,'src/prompts.js'))),
 import(pathToFileURL(path.join(source,'src/output-parser.js'))),
 import(pathToFileURL(path.join(source,'src/reducer.js'))),
]);

// These cells were chosen before seeing Gemini outputs because the actual Terra trajectories
// visibly drifted toward route-checking or engineering preparation.
const cells=[
 {run:'long-horizon-ledger-20260909-masked-20',turn:16},
 {run:'long-horizon-ledger-20260909-masked-20',turn:18},
 {run:'long-horizon-ledger-20260909-masked-20',turn:20},
 {run:'long-horizon-ledger-20260909-stars-20',turn:18},
 {run:'long-horizon-ledger-20260909-stars-20',turn:19},
 {run:'long-horizon-ledger-20260909-stars-20',turn:20},
];
const repeats=2;
const prices={currency:'USD',effectiveThrough:'2026-12-31',inputPerMillion:0.75,outputIncludingThinkingPerMillion:3.75,source:'Google Gemini Developer API standard paid-tier introductory pricing for current Flash 3.x'};
const save=(name,value)=>fs.writeFileSync(path.join(out,name),typeof value==='string'?value:JSON.stringify(value,null,2));

function historicalCell(spec){
 const run=readRun(root,spec.run), merged=mergeAttempts([run]);
 const accepted=merged.accepted.filter(r=>r.gameId===run.gameId).sort((a,b)=>a.turn.index-b.turn.index);
 const record=accepted.find(r=>r.turn.index===spec.turn); if(!record) throw Error(`Missing ${spec.run} T${spec.turn}`);
 const beforeTurns=accepted.filter(r=>r.turn.index<spec.turn).map(r=>r.turn);
 const game={...run.manifest.initialGame,version:record.beforeVersion,state:structuredClone(record.beforeState),turns:beforeTurns};
 const metrics=JSON.parse(fs.readFileSync(path.join(root,'artifacts/eval',spec.run,'server-metrics.json'),'utf8'));
 const trace=metrics.turns.find(t=>t.id===record.backendMetrics?.traceId); if(!trace) throw Error(`Missing trace for ${spec.run} T${spec.turn}`);
 const current=trace.candidateOutputs?.at(-1)?.finalText; if(!current) throw Error(`Missing current final output for ${spec.run} T${spec.turn}`);
 const prompt=buildNarratorPrompt({game,world:run.manifest.initialGame.world,action:record.action,plan:trace.planContext||null,language:game.language||'zh'});
 return {spec,run,record,game,world:run.manifest.initialGame.world,plan:trace.planContext||null,prompt,trace,current};
}

function billedCost(usage={}){
 const input=Number(usage.promptTokenCount||0), output=Number(usage.candidatesTokenCount||0)+Number(usage.thoughtsTokenCount||0);
 return {inputTokens:input,visibleOutputTokens:Number(usage.candidatesTokenCount||0),thinkingTokens:Number(usage.thoughtsTokenCount||0),billedOutputTokens:output,totalTokens:Number(usage.totalTokenCount||input+output),usd:(input*prices.inputPerMillion+output*prices.outputIncludingThinkingPerMillion)/1_000_000};
}

let lastApiStart=0;
async function geminiStream(prompt){
 const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
 const body={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:8192,thinkingConfig:{thinkingLevel:'low'}}};
 let response,started,quotaDelayMs=0,rateLimitRetries=0,lastErrorText='';
 for(let attempt=0;attempt<3;attempt++){
  const spacing=Math.max(0,13000-(Date.now()-lastApiStart));if(spacing){quotaDelayMs+=spacing;await new Promise(r=>setTimeout(r,spacing));}
  lastApiStart=Date.now();started=performance.now();
  response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-goog-api-key':apiKey},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});
  if(response.status!==429)break;
  rateLimitRetries++;lastErrorText=await response.text();const retryDelay=35000;quotaDelayMs+=retryDelay;await new Promise(r=>setTimeout(r,retryDelay));
 }
 if(!response.ok){if(!lastErrorText)lastErrorText=await response.text();throw Error(`Gemini HTTP ${response.status}: ${lastErrorText.slice(0,1000)}`);}
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',text='',firstVisibleMs=null,usage={},modelVersion=null,responseId=null;
 const consume=raw=>{
  for(const line of raw.split('\n')){
   if(!line.startsWith('data:')) continue; const data=line.slice(5).trim(); if(!data||data==='[DONE]') continue;
   const chunk=JSON.parse(data); if(chunk.usageMetadata) usage=chunk.usageMetadata; if(chunk.modelVersion) modelVersion=chunk.modelVersion;if(chunk.responseId)responseId=chunk.responseId;
   for(const candidate of chunk.candidates||[]) for(const part of candidate.content?.parts||[]){
    // Never persist hidden thought text. The API usage counters are retained separately.
    if(part.thought===true) continue;
    if(typeof part.text==='string'&&part.text){if(firstVisibleMs===null)firstVisibleMs=performance.now()-started;text+=part.text;}
   }
  }
 };
 while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true}).replace(/\r\n/g,'\n');let at;while((at=buffer.indexOf('\n\n'))>=0){consume(buffer.slice(0,at));buffer=buffer.slice(at+2);}}
 buffer+=decoder.decode();if(buffer.trim())consume(buffer);
 return {text,firstVisibleMs,totalMs:performance.now()-started,quotaDelayMs,rateLimitRetries,usage,modelVersion,responseId,cost:billedCost(usage)};
}

function validateOutput(text,cell){
 const parser=new StreamingNarratorParser();parser.push(text);const proposal=parser.finish();return reduceState(cell.game.state,proposal,cell.world,cell.game.language||'zh',cell.record.action);
}
async function geminiNarrate(cell,onCall){
 const primary=await geminiStream(cell.prompt);onCall?.('primary',primary);let final=primary.text,repaired=null,reduced=null,repairReason=null,finalError=null;
 try{reduced=validateOutput(final,cell);}catch(error){
  repairReason={code:error.code||error.name,message:error.message,details:error.details??null};
  const repairPrompt=buildRepairPrompt({game:cell.game,world:cell.world,action:cell.record.action,invalidOutput:final,reason:repairReason,language:cell.game.language||'zh'});
  repaired=await geminiStream(repairPrompt);onCall?.('repair',repaired);final=repaired.text;
  try{reduced=validateOutput(final,cell);}catch(error2){finalError={code:error2.code||error2.name,message:error2.message,details:error2.details??null};}
 }
 const calls=[primary,...(repaired?[repaired]:[])];
 return {status:reduced?'accepted':'invalid-after-repair',final,reduced,repairReason,finalError,calls,aggregate:{firstVisibleMs:primary.firstVisibleMs,totalMs:calls.reduce((n,c)=>n+c.totalMs,0),quotaDelayMs:calls.reduce((n,c)=>n+(c.quotaDelayMs||0),0),rateLimitRetries:calls.reduce((n,c)=>n+(c.rateLimitRetries||0),0),inputTokens:calls.reduce((n,c)=>n+c.cost.inputTokens,0),visibleOutputTokens:calls.reduce((n,c)=>n+c.cost.visibleOutputTokens,0),thinkingTokens:calls.reduce((n,c)=>n+c.cost.thinkingTokens,0),billedOutputTokens:calls.reduce((n,c)=>n+c.cost.billedOutputTokens,0),totalTokens:calls.reduce((n,c)=>n+c.cost.totalTokens,0),usd:calls.reduce((n,c)=>n+c.cost.usd,0),repairCalls:repaired?1:0,modelVersion:primary.modelVersion||model}};
}

const manifest=resume&&fs.existsSync(path.join(out,'manifest.json'))?JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8')):{label,createdAt:new Date().toISOString(),baseline:'long-horizon-ledger-20260909',modelRequested:model,thinkingLevel:'low',repeats,cells,prices,keyPersisted:false,hiddenThoughtTextPersisted:false,status:'running',limitations:['Historical Terra output is one already-observed sample per cell; Gemini gets two fresh samples per cell.','Quality comparison holds Canon/action/plan/prompt contract fixed, but Terra used ACP transport while Gemini uses direct API, so latency is not a pure model-runtime A/B.','Gemini token/cost counters are actual API usageMetadata; Terra historical ACP usage/cost is unavailable and is not guessed.','A matched one-turn result can diagnose model tendency but cannot prove twenty-turn durability.']};manifest.status='running';delete manifest.error;manifest.resumedAt=resume?new Date().toISOString():undefined;save('manifest.json',manifest);
const results=resume&&fs.existsSync(path.join(out,'results.json'))?JSON.parse(fs.readFileSync(path.join(out,'results.json'),'utf8')):[];
try{
 for(const spec of cells){
  const cell=historicalCell(spec),key=`${spec.run.replace('long-horizon-ledger-20260909-','')}-t${spec.turn}`;
  save(`${key}.input.json`,{run:spec.run,turn:spec.turn,action:cell.record.action,game:{id:cell.game.id,version:cell.game.version,state:cell.game.state,turns:cell.game.turns},plan:cell.plan,promptChars:cell.prompt.length});
  const current={provider:'current-terra-acp',final:cell.current,narrative:cell.record.turn.narrative,choices:cell.record.turn.choices,changes:cell.record.turn.changes,timing:{firstReaderVisibleMs:cell.trace.firstReaderVisibleMs,totalElapsedMs:cell.trace.totalElapsedMs},usage:null,cost:null};
  save(`${key}.terra.json`,current);
  for(let repeat=1;repeat<=repeats;repeat++){
   if(results.some(r=>r.key===key&&r.repeat===repeat)){console.log(JSON.stringify({event:'gemini_skip_completed',key,repeat}));continue;}
   console.log(JSON.stringify({event:'gemini_start',key,repeat}));
   const g=await geminiNarrate(cell,(kind,call)=>save(`${key}.gemini-${repeat}.${kind}.json`,{kind,modelVersion:call.modelVersion,responseId:call.responseId,firstVisibleMs:call.firstVisibleMs,totalMs:call.totalMs,quotaDelayMs:call.quotaDelayMs,rateLimitRetries:call.rateLimitRetries,usage:call.cost,finalText:call.text}));
   const row={key,repeat,run:spec.run,turn:spec.turn,action:cell.record.action,gemini:{provider:'gemini-direct',modelRequested:model,status:g.status,...g.aggregate,...(g.reduced?{narrative:g.reduced.proposal.narrative,choices:g.reduced.proposal.choices,changes:g.reduced.changes}:{}),repairReason:g.repairReason,finalError:g.finalError},terra:{narrative:current.narrative,choices:current.choices,changes:current.changes,timing:current.timing}};
   save(`${key}.gemini-${repeat}.txt`,g.final);save(`${key}.gemini-${repeat}.json`,row);results.push(row);save('results.json',results);
   console.log(JSON.stringify({event:'gemini_end',key,repeat,status:g.status,modelVersion:g.aggregate.modelVersion,totalMs:Math.round(g.aggregate.totalMs),tokens:g.aggregate.totalTokens,usd:g.aggregate.usd,repairCalls:g.aggregate.repairCalls}));
  }
 }
 manifest.status='completed';manifest.endedAt=new Date().toISOString();save('manifest.json',manifest);
 const total=results.reduce((a,r)=>({calls:a.calls+1,inputTokens:a.inputTokens+r.gemini.inputTokens,visibleOutputTokens:a.visibleOutputTokens+r.gemini.visibleOutputTokens,thinkingTokens:a.thinkingTokens+r.gemini.thinkingTokens,totalTokens:a.totalTokens+r.gemini.totalTokens,usd:a.usd+r.gemini.usd,totalMs:a.totalMs+r.gemini.totalMs,repairs:a.repairs+r.gemini.repairCalls}),{calls:0,inputTokens:0,visibleOutputTokens:0,thinkingTokens:0,totalTokens:0,usd:0,totalMs:0,repairs:0});
 save('cost-summary.json',{...total,meanMs:total.calls?total.totalMs/total.calls:null,meanUsd:total.calls?total.usd/total.calls:null,prices});
 console.log(JSON.stringify({event:'ab_complete',...total,meanMs:total.totalMs/total.calls,meanUsd:total.usd/total.calls}));
}catch(error){manifest.status='blocked';manifest.error={name:error.name,message:error.message,code:error.code||null};manifest.endedAt=new Date().toISOString();save('manifest.json',manifest);throw error;}
