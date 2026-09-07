import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {extractJsonObject} from '../src/output-parser.js';
import {validateWorldDefinition} from '../src/worlds.js';
const base=process.env.TGN_TEST_BASE_URL||'http://127.0.0.1:4318';
const label=process.argv[2];if(!label||!/^[-\w]{1,70}$/.test(label))throw new Error('Use a new evidence label');
const output=path.resolve('artifacts/eval',label);await fs.mkdir(output);
const result={label,startedAt:new Date().toISOString(),mode:'real-Arabic-world-retest-plus-offline-original-incident',errors:[]};
const save=()=>fs.writeFile(path.join(output,'report.json'),JSON.stringify(result,null,2));
const signal=AbortSignal.timeout(240000);
async function sse(route,body,name){
 const start=performance.now();let buffer='',complete,error,first=null;const events=[];
 const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal});if(!response.ok)throw new Error(`${response.status}: ${await response.text()}`);
 const decoder=new TextDecoder();function parse(){let ix;while((ix=buffer.indexOf('\n\n'))>=0){const f=buffer.slice(0,ix);buffer=buffer.slice(ix+2);const event=f.match(/^event: (.+)$/m)?.[1],line=f.match(/^data: (.+)$/m)?.[1];if(!event||!line)continue;const data=JSON.parse(line);const elapsedMs=performance.now()-start;events.push({event,data,elapsedMs});if(event==='text'&&data.delta&&first===null)first=elapsedMs;if(event==='complete')complete=data;if(event==='error')error=data;}}
 for await(const chunk of response.body){buffer+=decoder.decode(chunk,{stream:true});parse();}buffer+=decoder.decode();parse();
 await fs.writeFile(path.join(output,name+'-events.json'),JSON.stringify(events,null,2));if(!complete)throw new Error(error?`${error.code}: ${error.message}`:'No complete event');
 return {complete,totalMs:performance.now()-start,firstNarrativeMs:first};
}
try{
 const db=new DatabaseSync('.runtime/i18n-test/games.sqlite',{readOnly:true});
 const traces=db.prepare("SELECT trace_json FROM traces WHERE status='failed'").all().map(r=>JSON.parse(r.trace_json));db.close();
 const incident=traces.find(t=>t.kind==='world-creation'&&t.candidateOutputs?.some(o=>o.finalText.includes('مستراب')));assert.ok(incident,'Original Arabic incident must remain available');
 const raw=extractJsonObject(incident.candidateOutputs.find(o=>o.role==='world').finalText);const start=performance.now();
 const validated=validateWorldDefinition({...raw,language:'ar'},{id:'world-incident-replay',custom:true});
 result.originalIncident={traceId:incident.id,title:validated.title,attitudes:validated.seed.relationships.map(n=>n.attitude),validationMs:performance.now()-start,newModelCalls:0};await save();
 const prompt='عالم فانتازيا يتعلم فيه المسافرون السحر بجمع شظايا القمر وربط قواها. أنا مسافر بالغ وحر في رفض المهام، أبدأ في ميناء معلق بين الجبال بموهبة ضعيفة لكنها نادرة وقابلة للتطور. أريد نموا حقيقيا وقدرات أستطيع استخدامها وشخصيات لها مصالحها الخاصة.';
 const requestId=randomUUID();const created=await sse('/api/worlds/custom',{prompt,requestId,language:'ar'},'world');const world=created.complete.world;assert.equal(world.language,'ar');
 result.world={...created,worldId:world.id};await save();
 const replay=await sse('/api/worlds/custom',{prompt,requestId,language:'ar'},'world-idempotent');assert.equal(replay.complete.world.id,world.id);result.replaySameWorld=true;
 const conflict=await fetch(base+'/api/worlds/custom',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt,requestId,language:'en'}),signal});assert.equal(conflict.status,409);result.languageConflictRejected=true;
 const createdGame=await fetch(base+'/api/games',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'نادر',worldId:world.id,powerId:world.powers[0].id,language:'ar'}),signal});assert.equal(createdGame.status,201);const {game}=await createdGame.json();
 const turn=await sse(`/api/games/${game.id}/turns`,{action:'ابدأ قصتي.',requestId:randomUUID(),expectedVersion:0,language:'ar'},'opening');assert.equal(turn.complete.turn.language,'ar');assert.equal(turn.complete.turn.choices.length,3);
 result.opening={...turn,gameId:game.id};result.status='complete';await fs.writeFile(path.join(output,'server-metrics.json'),JSON.stringify(await(await fetch(base+`/api/games/${game.id}/metrics`)).json(),null,2));
}catch(e){result.status='failed';result.errors.push(e.message);process.exitCode=1;}finally{result.endedAt=new Date().toISOString();await save();console.log(JSON.stringify({label,status:result.status,errors:result.errors,originalIncident:result.originalIncident,worldMs:result.world?.totalMs,openingFirstMs:result.opening?.firstNarrativeMs,openingMs:result.opening?.totalMs}));}
