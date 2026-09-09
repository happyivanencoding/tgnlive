import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readRun,mergeAttempts} from './long-horizon-evidence.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const label=process.argv[2]||'gemini-model-sweep-20260909';
if(!/^[a-z0-9-]+$/i.test(label))throw Error('Safe label required');
const out=path.join(root,'artifacts/eval',label);if(fs.existsSync(out))throw Error('Preserve prior sweep evidence');fs.mkdirSync(out,{recursive:true});
const desktop=path.join(os.homedir(),'Desktop'),keyName=fs.readdirSync(desktop).find(n=>/^key_ge.*ini\.txt$/i.test(n));if(!keyName)throw Error('Gemini key file not found');
const apiKey=fs.readFileSync(path.join(desktop,keyName),'utf8').trim();if(apiKey.length<20)throw Error('Gemini key invalid');

const baseline=JSON.parse(fs.readFileSync(path.join(root,'artifacts/eval/long-horizon-ledger-20260909/matrix.json'),'utf8'));
const source=baseline.executionSource||baseline.source;
const [{buildNarratorPrompt,buildRepairPrompt},{StreamingNarratorParser},{reduceState}]=await Promise.all([
 import(pathToFileURL(path.join(source,'src/prompts.js'))),import(pathToFileURL(path.join(source,'src/output-parser.js'))),import(pathToFileURL(path.join(source,'src/reducer.js')))
]);
const models=[
 {id:'gemini-2.5-flash-lite',thinking:{thinkingBudget:0},input:0.10,output:0.40,freeTier:true},
 {id:'gemini-2.5-flash',thinking:{thinkingBudget:0},input:0.30,output:2.50,freeTier:true},
 {id:'gemini-2.5-pro',thinking:{thinkingBudget:128},input:1.25,output:10.00,freeTier:true},
 {id:'gemini-3-flash-preview',thinking:{thinkingLevel:'low'},input:0.50,output:3.00,freeTier:true},
 {id:'gemini-3.1-pro-preview',thinking:{thinkingLevel:'low'},input:2.00,output:12.00,freeTier:false},
 {id:'gemini-3.5-flash',thinking:{thinkingLevel:'low'},input:1.50,output:9.00,freeTier:true},
 {id:'gemini-3.6-flash',thinking:{thinkingLevel:'low'},input:0.75,output:3.75,freeTier:true},
 {id:'gemini-3.7-flash',thinking:{thinkingLevel:'low'},input:0.75,output:3.75,freeTier:true},
 {id:'gemini-3.8-flash',thinking:{thinkingLevel:'low'},input:0.75,output:3.75,freeTier:true},
];
const cells=[
 {key:'masked-t20',run:'long-horizon-ledger-20260909-masked-20',turn:20,kind:'process-prone observation'},
 {key:'beast-t18',run:'long-horizon-ledger-20260909-beast-20-r2',turn:18,kind:'growth/payoff action'},
];
const save=(name,v)=>fs.writeFileSync(path.join(out,name),typeof v==='string'?v:JSON.stringify(v,null,2));
function cellData(spec){
 const run=readRun(root,spec.run),accepted=mergeAttempts([run]).accepted.filter(r=>r.gameId===run.gameId).sort((a,b)=>a.turn.index-b.turn.index),record=accepted.find(r=>r.turn.index===spec.turn);if(!record)throw Error('Missing '+spec.key);
 const game={...run.manifest.initialGame,version:record.beforeVersion,state:structuredClone(record.beforeState),turns:accepted.filter(r=>r.turn.index<spec.turn).map(r=>r.turn)};
 const metrics=JSON.parse(fs.readFileSync(path.join(root,'artifacts/eval',spec.run,'server-metrics.json'),'utf8')),trace=metrics.turns.find(t=>t.id===record.backendMetrics?.traceId);if(!trace)throw Error('Missing trace '+spec.key);
 return{...spec,run,record,game,world:run.manifest.initialGame.world,plan:trace.planContext||null,trace,prompt:buildNarratorPrompt({game,world:run.manifest.initialGame.world,action:record.action,plan:trace.planContext||null,language:game.language||'zh'})};
}
function validate(text,c){const p=new StreamingNarratorParser();p.push(text);return reduceState(c.game.state,p.finish(),c.world,c.game.language||'zh',c.record.action);}
function cost(usage,m){const input=Number(usage.promptTokenCount||0),visible=Number(usage.candidatesTokenCount||0),thinking=Number(usage.thoughtsTokenCount||0),billed=visible+thinking;return{inputTokens:input,visibleOutputTokens:visible,thinkingTokens:thinking,totalTokens:Number(usage.totalTokenCount||input+billed),paidEquivalentUsd:(input*m.input+billed*m.output)/1e6};}
async function stream(prompt,m){
 const started=performance.now(),body={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:8192,thinkingConfig:m.thinking}};
 const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m.id}:streamGenerateContent?alt=sse`,{method:'POST',headers:{'Content-Type':'application/json','X-goog-api-key':apiKey},body:JSON.stringify(body),signal:AbortSignal.timeout(240000)});
 if(!r.ok)return{ok:false,status:r.status,error:(await r.text()).slice(0,1500),totalMs:performance.now()-started};
 const reader=r.body.getReader(),dec=new TextDecoder();let buf='',text='',firstMs=null,usage={},modelVersion=null,responseId=null;
 const consume=raw=>{for(const line of raw.split('\n')){if(!line.startsWith('data:'))continue;const data=line.slice(5).trim();if(!data||data==='[DONE]')continue;const x=JSON.parse(data);if(x.usageMetadata)usage=x.usageMetadata;if(x.modelVersion)modelVersion=x.modelVersion;if(x.responseId)responseId=x.responseId;for(const cand of x.candidates||[])for(const part of cand.content?.parts||[]){if(part.thought===true)continue;if(typeof part.text==='string'&&part.text){if(firstMs===null)firstMs=performance.now()-started;text+=part.text;}}}};
 while(true){const {done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true}).replace(/\r\n/g,'\n');let at;while((at=buf.indexOf('\n\n'))>=0){consume(buf.slice(0,at));buf=buf.slice(at+2);}}buf+=dec.decode();if(buf.trim())consume(buf);
 return{ok:true,text,firstVisibleMs:firstMs,totalMs:performance.now()-started,usage,modelVersion,responseId};
}
async function generate(c,m){
 const calls=[];const primary=await stream(c.prompt,m);calls.push(primary);if(!primary.ok)return{status:'provider-error',calls};let reduced=null,repairReason=null,finalError=null,final=primary.text;
 try{reduced=validate(final,c);}catch(e){repairReason={code:e.code||e.name,message:e.message,details:e.details??null};const rp=buildRepairPrompt({game:c.game,world:c.world,action:c.record.action,invalidOutput:final,reason:repairReason,language:c.game.language||'zh'});const repair=await stream(rp,m);calls.push(repair);if(repair.ok){final=repair.text;try{reduced=validate(final,c);}catch(e2){finalError={code:e2.code||e2.name,message:e2.message,details:e2.details??null};}}else finalError={code:'PROVIDER_ERROR',message:`HTTP ${repair.status}`,details:repair.error};}
 const good=calls.filter(x=>x.ok),usage=good.reduce((a,x)=>({promptTokenCount:a.promptTokenCount+Number(x.usage.promptTokenCount||0),candidatesTokenCount:a.candidatesTokenCount+Number(x.usage.candidatesTokenCount||0),thoughtsTokenCount:a.thoughtsTokenCount+Number(x.usage.thoughtsTokenCount||0),totalTokenCount:a.totalTokenCount+Number(x.usage.totalTokenCount||0)}),{promptTokenCount:0,candidatesTokenCount:0,thoughtsTokenCount:0,totalTokenCount:0});
 return{status:reduced?'accepted':'invalid-after-repair',final,reduced,repairReason,finalError,calls,summary:{...cost(usage,m),firstVisibleMs:primary.firstVisibleMs,totalApiMs:good.reduce((n,x)=>n+x.totalMs,0),repairCalls:calls.length-1,modelVersion:primary.modelVersion||m.id}};
}
const manifest={label,startedAt:new Date().toISOString(),models:models.map(({thinking,...m})=>({...m,thinking})),cells,actualKeyTierEvidence:'Earlier same-key Gemini 3.8 responses explicitly reported free-tier request quota; dollar billing is not returned by usageMetadata.',priceSource:'Google Gemini Developer API Standard paid-tier prices current 2026-09-09; 3.8/3.7/3.6 use introductory 2026 price.',status:'running',keyPersisted:false};save('manifest.json',manifest);
const results=[];
for(const m of models){for(const spec of cells){const c=cellData(spec);save(`${spec.key}.input.json`,{key:spec.key,kind:spec.kind,action:c.record.action,game:{version:c.game.version,state:c.game.state,turns:c.game.turns},plan:c.plan,promptChars:c.prompt.length});console.log(JSON.stringify({event:'start',model:m.id,cell:spec.key}));let g;try{g=await generate(c,m);}catch(e){g={status:'harness-error',error:{name:e.name,message:e.message}};}
 const row={model:m.id,cell:spec.key,kind:spec.kind,thinking:m.thinking,freeTierListed:m.freeTier,paidPricePerMillion:{input:m.input,outputIncludingThinking:m.output},status:g.status,...(g.summary||{}),providerErrors:(g.calls||[]).filter(x=>!x.ok).map(x=>({status:x.status,error:x.error})),repairReason:g.repairReason||null,finalError:g.finalError||null,...(g.reduced?{narrative:g.reduced.proposal.narrative,choices:g.reduced.proposal.choices,changes:g.reduced.changes}:{}),terraControl:{narrative:c.record.turn.narrative,choices:c.record.turn.choices,firstReaderVisibleMs:c.trace.firstReaderVisibleMs,totalElapsedMs:c.trace.totalElapsedMs}};
 if(g.final)save(`${m.id}.${spec.key}.final.txt`,g.final);save(`${m.id}.${spec.key}.json`,row);results.push(row);save('results.json',results);console.log(JSON.stringify({event:'end',model:m.id,cell:spec.key,status:row.status,firstMs:row.firstVisibleMs??null,totalMs:row.totalApiMs??null,tokens:row.totalTokens??null,paidEquivalentUsd:row.paidEquivalentUsd??null}));}}
manifest.status='completed';manifest.endedAt=new Date().toISOString();save('manifest.json',manifest);
const summary=models.map(m=>{const rows=results.filter(r=>r.model===m.id),ok=rows.filter(r=>r.status==='accepted');return{model:m.id,accepted:`${ok.length}/${rows.length}`,meanFirstVisibleMs:ok.length?ok.reduce((n,r)=>n+r.firstVisibleMs,0)/ok.length:null,meanApiMs:ok.length?ok.reduce((n,r)=>n+r.totalApiMs,0)/ok.length:null,totalTokens:rows.reduce((n,r)=>n+(r.totalTokens||0),0),paidEquivalentUsd:rows.reduce((n,r)=>n+(r.paidEquivalentUsd||0),0),freeTierListed:m.freeTier};});save('summary.json',summary);console.log(JSON.stringify({event:'complete',summary}));
