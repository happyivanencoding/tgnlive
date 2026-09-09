// Fixed-direction writing probe: same Canon/action/story direction, only Narrator model/provider changes.
// This is not autonomous-play evidence and never mutates a game save.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),label=args.find(x=>!x.startsWith('--'))||'direction-narrator-model-sweep-20260909';
const resume=args.includes('--resume');
if(!/^[a-z0-9-]+$/i.test(label))throw Error('Safe label required');
const out=path.join(root,'artifacts/eval',label);
if(fs.existsSync(out)&&!resume)throw Error('Preserve prior evidence; use --resume or a new label');
fs.mkdirSync(out,{recursive:true});

const frozenLabel='long-horizon-directions-20260909-v4';
const source=path.join(root,'.runtime/progression-v080',frozenLabel+'-source');
const runLabel=frozenLabel+'-martial-20';
if(!fs.existsSync(source))throw Error('Frozen direction-pool source is missing');
const runDir=path.join(root,'artifacts/eval',runLabel);
const runManifest=JSON.parse(fs.readFileSync(path.join(runDir,'manifest.json'),'utf8'));
const turnRecords=fs.readFileSync(path.join(runDir,'turns.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.outcome==='completed');
const metrics=JSON.parse(fs.readFileSync(path.join(runDir,'server-metrics.json'),'utf8'));
const [{buildNarratorPrompt,buildRepairPrompt},{StreamingNarratorParser},{reduceState},{createModelTransport}]=await Promise.all([
 import(pathToFileURL(path.join(source,'src/prompts.js'))),
 import(pathToFileURL(path.join(source,'src/output-parser.js'))),
 import(pathToFileURL(path.join(source,'src/reducer.js'))),
 import(pathToFileURL(path.join(source,'eval/isolated-acp-transport.mjs'))),
]);

const desktop=path.join(os.homedir(),'Desktop');
const keyName=fs.readdirSync(desktop).find(n=>/^key_ge.*ini\.txt$/i.test(n));
if(!keyName)throw Error('Gemini key file not found');
const apiKey=fs.readFileSync(path.join(desktop,keyName),'utf8').trim();
if(apiKey.length<20)throw Error('Gemini key invalid');

const models=[
 {id:'gpt-5.6-terra',provider:'acp',reasoning:'low',label:'Terra',price:null},
 {id:'gemini-3.1-flash-lite',provider:'gemini',thinking:{thinkingLevel:'low'},label:'Gemini 3.1 Flash Lite',price:{input:0.25,output:1.50}},
 {id:'gemini-3-flash-preview',provider:'gemini',thinking:{thinkingLevel:'low'},label:'Gemini 3 Flash Preview',price:{input:0.50,output:3.00}},
 {id:'gemini-3.5-flash-lite',provider:'gemini',thinking:{thinkingLevel:'low'},label:'Gemini 3.5 Flash Lite',price:{input:0.30,output:2.50}},
 {id:'gemini-3.5-flash',provider:'gemini',thinking:{thinkingLevel:'low'},label:'Gemini 3.5 Flash',price:{input:1.50,output:9.00}},
 {id:'gemini-3.6-flash',provider:'gemini',thinking:{thinkingLevel:'low'},label:'Gemini 3.6 Flash',price:{input:0.75,output:3.75}},
];
const cells=[
 {key:'growth-breakthrough',turn:6,directionIndex:0,repeats:2,kind:'real-player growth breakthrough',action:null},
 {key:'resource-control',turn:18,directionIndex:1,repeats:1,kind:'fixed route: resource ownership',action:'我让任砺把那批发黑热壳根拿出来，只用我现有的净炉身和已知安全方法处理一小批，目标是找到能稳定留下可用药性的办法；如果成功，就谈后续可用根和分成，若出现身体不适或异常反应立即停止。'},
 {key:'relationship-equality',turn:18,directionIndex:2,repeats:1,kind:'fixed route: relationship and shared standing',action:'我去找侯铃，明确站到她反对封存异变训练数据的一边，愿意用自己的公开短战记录和亲历作证；我想把这次合作谈成平等的场地使用与成果共享，不接受替训练厅长期卖命。'},
 {key:'public-combat',turn:18,directionIndex:3,repeats:1,kind:'fixed route: public combat and status',action:'我接受石槐提出的城间短战，当众用折步收劲和撤离步法跟他打这一场，目标是赢下更高榜位和跨城名额；如果出现超出通劲段承受的连续重击就退出。'},
 {key:'freedom-route',turn:18,directionIndex:4,repeats:1,kind:'fixed route: leave old loop for freer life',action:'我决定暂时放下灰裂沟黑根旧线，接受任砺护送商队离开折钢城，先跑一趟稳定商路，目标是换到固定分成和城市往返的自由；本轮只签这一趟，不承诺长期归属商队。'},
];
const save=(name,value)=>fs.writeFileSync(path.join(out,name),typeof value==='string'?value:JSON.stringify(value,null,2));

function cellData(spec){
 const record=turnRecords.find(r=>r.turn?.index===spec.turn);if(!record)throw Error('Missing turn '+spec.turn);
 const trace=metrics.turns.find(t=>t.id===record.backendMetrics?.traceId);if(!trace)throw Error('Missing trace for turn '+spec.turn);
 const plan=structuredClone(trace.planContext||{});if(!Array.isArray(plan.directions)||plan.directions.length<5)throw Error('Turn '+spec.turn+' has no direction pool');
 const selectedDirection=plan.directions[spec.directionIndex];if(!selectedDirection)throw Error('Selected direction missing for '+spec.key);
 const action=spec.action||record.action;
 const game={...runManifest.initialGame,version:record.beforeVersion,state:structuredClone(record.beforeState),turns:turnRecords.filter(r=>r.turn.index<spec.turn).map(r=>r.turn)};
 let prompt=buildNarratorPrompt({game,world:runManifest.initialGame.world,action,plan,language:game.language||'zh'});
 const needle=`玩家本轮实际行动：${JSON.stringify(action)}`;
 if(!prompt.includes(needle))throw Error('Narrator prompt anchor changed');
 const fixed=`本轮已经根据玩家实际行动匹配出的唯一主要剧情方向：${JSON.stringify(selectedDirection)}\n这是本轮唯一主要剧情源。方向池中其余路线只能作为本轮结束后的不同未来，不得混入本场景成为并行流程，也不得提前结算。支撑性的核验、采购、测量、维修、路线确认能一句带过就一句带过；正文篇幅优先给人物行动、力量使用、冲突、欲望、所得与处境变化。\n`;
 prompt=prompt.replace(needle,fixed+needle);
 return{...spec,record,trace,plan,selectedDirection,action,game,world:runManifest.initialGame.world,prompt};
}
function validateOutput(text,c){const parser=new StreamingNarratorParser();parser.push(text);return reduceState(c.game.state,parser.finish(),c.world,c.game.language||'zh',c.action);}
function usageCost(usage,model){
 if(!model.price)return{inputTokens:null,visibleOutputTokens:null,thinkingTokens:null,totalTokens:null,paidEquivalentUsd:null};
 const input=Number(usage?.promptTokenCount||0),visible=Number(usage?.candidatesTokenCount||0),thinking=Number(usage?.thoughtsTokenCount||0),billed=visible+thinking;
 return{inputTokens:input,visibleOutputTokens:visible,thinkingTokens:thinking,totalTokens:Number(usage?.totalTokenCount||input+billed),paidEquivalentUsd:(input*model.price.input+billed*model.price.output)/1e6};
}
const lastGeminiCall=new Map();
async function pace(modelId){const prior=lastGeminiCall.get(modelId)||0,wait=Math.max(0,8500-(Date.now()-prior));if(wait)await new Promise(r=>setTimeout(r,wait));lastGeminiCall.set(modelId,Date.now());}
async function geminiCall(prompt,model){
 let quotaWaitMs=0,rateLimitRetries=0,lastError='';
 for(let attempt=0;attempt<3;attempt++){
  await pace(model.id);const started=performance.now();
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:streamGenerateContent?alt=sse`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:8192,thinkingConfig:model.thinking}}),signal:AbortSignal.timeout(240000)});
  if(response.status===429){lastError=await response.text();rateLimitRetries++;const m=lastError.match(/retry in ([0-9.]+)s/i),delay=m?Math.ceil(Number(m[1])*1000)+1000:35000;quotaWaitMs+=delay;await new Promise(r=>setTimeout(r,delay));continue;}
  if(!response.ok)return{ok:false,status:response.status,error:(await response.text()).slice(0,1800),quotaWaitMs,rateLimitRetries,totalMs:performance.now()-started};
  const reader=response.body.getReader(),dec=new TextDecoder();let buffer='',text='',firstVisibleMs=null,usage={},modelVersion=null,responseId=null;
  const consume=raw=>{for(const line of raw.split('\n')){if(!line.startsWith('data:'))continue;const data=line.slice(5).trim();if(!data||data==='[DONE]')continue;const x=JSON.parse(data);if(x.usageMetadata)usage=x.usageMetadata;if(x.modelVersion)modelVersion=x.modelVersion;if(x.responseId)responseId=x.responseId;for(const candidate of x.candidates||[])for(const part of candidate.content?.parts||[]){if(part.thought===true)continue;if(typeof part.text==='string'&&part.text){if(firstVisibleMs===null)firstVisibleMs=performance.now()-started;text+=part.text;}}}};
  while(true){const {done,value}=await reader.read();if(done)break;buffer+=dec.decode(value,{stream:true}).replace(/\r\n/g,'\n');let at;while((at=buffer.indexOf('\n\n'))>=0){consume(buffer.slice(0,at));buffer=buffer.slice(at+2);}}buffer+=dec.decode();if(buffer.trim())consume(buffer);
  return{ok:true,text,firstVisibleMs,totalMs:performance.now()-started,quotaWaitMs,rateLimitRetries,usage,modelVersion,responseId,serviceTier:usage?.serviceTier||null};
 }
 return{ok:false,status:429,error:lastError.slice(0,1800),quotaWaitMs,rateLimitRetries,totalMs:0};
}
const terra=createModelTransport({role:'narrator',model:'gpt-5.6-terra',reasoningEffort:'low',timeoutMs:240000});
async function terraCall(prompt){
 const started=performance.now();let firstVisibleMs=null;
 try{const result=await terra.run(prompt,{signal:AbortSignal.timeout(240000),onText:text=>{if(text&&firstVisibleMs===null)firstVisibleMs=performance.now()-started;}});return{ok:true,text:result.text,firstVisibleMs,totalMs:performance.now()-started,usage:null,modelVersion:'gpt-5.6-terra',audit:result.audit||null};}
 catch(error){return{ok:false,status:error.code||error.name,error:error.message,totalMs:performance.now()-started};}
}
async function oneCall(prompt,model){return model.provider==='gemini'?geminiCall(prompt,model):terraCall(prompt);}
async function generate(c,model,artifactStem){
 const calls=[];const primary=await oneCall(c.prompt,model);calls.push(primary);if(primary.text)save(`${artifactStem}.primary.txt`,primary.text);save(`${artifactStem}.primary.json`,{...primary,text:undefined,usageCost:usageCost(primary.usage,model)});
 if(!primary.ok)return{status:'provider-error',calls,finalError:{code:'PROVIDER_ERROR',message:String(primary.status),details:primary.error}};
 let final=primary.text,reduced=null,repairReason=null,finalError=null;
 try{reduced=validateOutput(final,c);}catch(error){
  repairReason={code:error.code||error.name,message:error.message,details:error.details??null};
  const repairPrompt=buildRepairPrompt({game:c.game,world:c.world,action:c.action,invalidOutput:final,reason:repairReason,language:c.game.language||'zh'});
  const repair=await oneCall(repairPrompt,model);calls.push(repair);if(repair.text)save(`${artifactStem}.repair.txt`,repair.text);save(`${artifactStem}.repair.json`,{...repair,text:undefined,usageCost:usageCost(repair.usage,model)});
  if(repair.ok){final=repair.text;try{reduced=validateOutput(final,c);}catch(error2){finalError={code:error2.code||error2.name,message:error2.message,details:error2.details??null};}}
  else finalError={code:'PROVIDER_ERROR',message:String(repair.status),details:repair.error};
 }
 const good=calls.filter(x=>x.ok),totalApiMs=good.reduce((n,x)=>n+Number(x.totalMs||0),0),quotaWaitMs=calls.reduce((n,x)=>n+Number(x.quotaWaitMs||0),0),rateLimitRetries=calls.reduce((n,x)=>n+Number(x.rateLimitRetries||0),0);
 let inputTokens=null,visibleOutputTokens=null,thinkingTokens=null,totalTokens=null,paidEquivalentUsd=null;
 if(model.price){const costs=good.map(x=>usageCost(x.usage,model));inputTokens=costs.reduce((n,x)=>n+x.inputTokens,0);visibleOutputTokens=costs.reduce((n,x)=>n+x.visibleOutputTokens,0);thinkingTokens=costs.reduce((n,x)=>n+x.thinkingTokens,0);totalTokens=costs.reduce((n,x)=>n+x.totalTokens,0);paidEquivalentUsd=costs.reduce((n,x)=>n+x.paidEquivalentUsd,0);}
 return{status:reduced?'accepted':'invalid-after-repair',final,reduced,repairReason,finalError,calls,summary:{firstVisibleMs:primary.firstVisibleMs??null,totalApiMs,quotaWaitMs,rateLimitRetries,inputTokens,visibleOutputTokens,thinkingTokens,totalTokens,paidEquivalentUsd,repairCalls:calls.length-1,modelVersion:primary.modelVersion||model.id,serviceTier:primary.serviceTier||null}};
}

const manifest=resume&&fs.existsSync(path.join(out,'manifest.json'))?JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8')):{
 label,startedAt:new Date().toISOString(),frozenDirectionSource:frozenLabel,runLabel,models:models.map(m=>({id:m.id,label:m.label,provider:m.provider,reasoning:m.reasoning||null,thinking:m.thinking||null,pricePerMillionUsd:m.price})),cells,keyPersisted:false,hiddenThoughtTextPersisted:false,
 methodology:['Same frozen Canon, action, full direction pool, explicitly selected single direction, narrator prompt contract and reducer per cell.','Only Narrator provider/model changes.','Synthetic actions are fixed writing probes derived directly from an existing direction pool; they are not autonomous-player evidence.','One repair maximum, same model as primary. Structural failures remain failures.','Gemini usage/cost comes from usageMetadata; Terra token/cost is left unknown rather than estimated.'],status:'running'};
manifest.status='running';manifest.resumedAt=resume?new Date().toISOString():null;delete manifest.error;save('manifest.json',manifest);
const results=resume&&fs.existsSync(path.join(out,'results.json'))?JSON.parse(fs.readFileSync(path.join(out,'results.json'),'utf8')):[];
try{
 for(const spec of cells){const c=cellData(spec);save(`${spec.key}.input.json`,{key:spec.key,kind:spec.kind,turn:spec.turn,action:c.action,selectedDirection:c.selectedDirection,directionPool:c.plan.directions,worldMove:c.plan.worldMove||null,game:{version:c.game.version,state:c.game.state,turns:c.game.turns},prompt:c.prompt});
  for(let repeat=1;repeat<=spec.repeats;repeat++)for(const model of models){if(results.some(r=>r.key===spec.key&&r.repeat===repeat&&r.model===model.id)){console.log(JSON.stringify({event:'skip',key:spec.key,repeat,model:model.id}));continue;}
   const stem=`${spec.key}.r${repeat}.${model.id}`;console.log(JSON.stringify({event:'start',key:spec.key,repeat,model:model.id}));const g=await generate(c,model,stem);
   const row={key:spec.key,kind:spec.kind,repeat,model:model.id,modelLabel:model.label,provider:model.provider,action:c.action,selectedDirection:c.selectedDirection,status:g.status,...(g.summary||{}),repairReason:g.repairReason||null,finalError:g.finalError||null,...(g.reduced?{narrative:g.reduced.proposal.narrative,choices:g.reduced.proposal.choices,changes:g.reduced.changes}:{}),providerErrors:(g.calls||[]).filter(x=>!x.ok).map(x=>({status:x.status,error:x.error}))};
   if(g.final)save(`${stem}.final.txt`,g.final);save(`${stem}.result.json`,row);results.push(row);save('results.json',results);console.log(JSON.stringify({event:'end',key:spec.key,repeat,model:model.id,status:row.status,firstMs:row.firstVisibleMs,totalMs:row.totalApiMs,tokens:row.totalTokens,cost:row.paidEquivalentUsd,repairs:row.repairCalls}));
  }
 }
 manifest.status='completed';manifest.endedAt=new Date().toISOString();save('manifest.json',manifest);
 const summary=models.map(model=>{const rows=results.filter(r=>r.model===model.id),accepted=rows.filter(r=>r.status==='accepted');return{model:model.id,label:model.label,samples:rows.length,accepted:accepted.length,invalidAfterRepair:rows.filter(r=>r.status==='invalid-after-repair').length,providerErrors:rows.filter(r=>r.status==='provider-error').length,repairs:rows.reduce((n,r)=>n+Number(r.repairCalls||0),0),meanFirstVisibleMs:accepted.length?accepted.reduce((n,r)=>n+Number(r.firstVisibleMs||0),0)/accepted.length:null,meanApiMs:accepted.length?accepted.reduce((n,r)=>n+Number(r.totalApiMs||0),0)/accepted.length:null,totalTokens:model.price?rows.reduce((n,r)=>n+Number(r.totalTokens||0),0):null,paidEquivalentUsd:model.price?rows.reduce((n,r)=>n+Number(r.paidEquivalentUsd||0),0):null};});save('summary.json',summary);console.log(JSON.stringify({event:'complete',summary}));
}catch(error){manifest.status='blocked';manifest.error={name:error.name,message:error.message,code:error.code||null};manifest.endedAt=new Date().toISOString();save('manifest.json',manifest);throw error;}
