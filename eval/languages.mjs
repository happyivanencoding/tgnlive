import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createAcpRoleAdapter } from '../src/acp/role-adapter.js';
import { loadConfig } from '../src/config.js';

// Real sequential calls: no fixture prose, no scored release gate.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const label=process.argv[2];if(!label||!/^[\w-]{1,70}$/.test(label))throw new Error('Usage: node eval/languages.mjs <new-label> [zh,en,fr,es,ar]');
const base=process.env.TGN_TEST_BASE_URL||'http://127.0.0.1:4318';
const languages=(process.argv[3]||'zh,en,fr,es,ar').split(',');if(languages.some(l=>!['zh','en','fr','es','ar'].includes(l)))throw new Error('Invalid language');
const output=path.join(root,'artifacts','eval',label);await fs.mkdir(output);
const signal=AbortSignal.timeout(18*60*1000);const config=loadConfig();
const report={label,base,mode:'real-ACP-language-playtests',startedAt:new Date().toISOString(),runs:[],worlds:[],errors:[],limitations:['Small real language samples, not a guarantee of long-form literary fluency.','API receipt is not browser paint.','Player decisions are measured separately.','No billable token or provider-internal queue estimates.']};
const write=(name,value)=>fs.writeFile(path.join(output,name),typeof value==='string'?value:JSON.stringify(value,null,2),'utf8');
const save=()=>write('report.json',report);
const json=async(route,body)=>{const r=await fetch(base+route,{...(body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{}),signal});const data=await r.json();if(!r.ok)throw new Error(`${r.status} ${data.code}: ${data.message}`);return data;};
async function stream(route,body){
 const start=performance.now(),events=[];let firstNarrativeMs=null,complete,error,buffer='';
 const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal});
 if(!response.ok)throw new Error(`HTTP ${response.status}: ${await response.text()}`);
 const decoder=new TextDecoder();
 function parse(){let end;while((end=buffer.indexOf('\n\n'))>=0){const f=buffer.slice(0,end);buffer=buffer.slice(end+2);const event=f.match(/^event: (.+)$/m)?.[1],line=f.match(/^data: (.+)$/m)?.[1];if(!event||!line)continue;const data=JSON.parse(line);const ms=performance.now()-start;events.push({event,data,atMs:ms});if(event==='text'&&data.delta&&firstNarrativeMs===null)firstNarrativeMs=ms;if(event==='complete')complete=data;if(event==='error')error=data;}}
 for await(const chunk of response.body){buffer+=decoder.decode(chunk,{stream:true});parse();}buffer+=decoder.decode();parse();
 if(!complete){const e=new Error(error?`${error.code}: ${error.message}`:'No committed completion');e.events=events;throw e;}
 return {complete,events,firstNarrativeMs,totalMs:performance.now()-start};
}
const names={zh:'沈青',en:'Rowan',fr:'Élie',es:'Íñigo',ar:'سليم'};
const starts={zh:'开始我的故事',en:'Begin my story.',fr:'Commence mon histoire.',es:'Comienza mi historia.',ar:'ابدأ قصتي.'};
const labelNames={zh:'简体中文',en:'English',fr:'français',es:'español',ar:'العربية الفصحى'};
const player=createAcpRoleAdapter({role:'player',model:config.playerModel,reasoningEffort:'low',workspace:path.join(root,'.runtime','i18n-player-empty'),agentDockUrl:config.agentDockUrl,timeoutMs:90000});
async function play(game,language,action,stem,playerMeta=null){
 const before=structuredClone(game);const requestId=randomUUID();
 const played=await stream(`/api/games/${game.id}/turns`,{action,expectedVersion:game.version,requestId,language});
 const after=played.complete.game,turn=played.complete.turn;
 assert.equal(after.version,before.version+1);assert.equal(turn.choices.length,3);assert.equal(turn.language,language);assert.equal(after.language||after.state.language,language);
 const record={language,gameId:game.id,requestId,action,player:playerMeta,before,after,turn,firstNarrativeMs:played.firstNarrativeMs,completeMs:played.totalMs,metrics:played.complete.metrics,hanCharacters:(turn.narrative.match(/\p{Script=Han}/gu)||[]).length,arabicCharacters:(turn.narrative.match(/\p{Script=Arabic}/gu)||[]).length};
 await write(`${stem}.json`,record);await write(`${stem}-events.json`,played.events);console.log(JSON.stringify({event:'language-turn',language,stem,firstNarrativeMs:record.firstNarrativeMs,completeMs:record.completeMs,hanCharacters:record.hanCharacters}));
 return record;
}
try{
 report.health=await json('/api/health');await save();
 let chineseGame;
 for(const language of languages){
  const run={language,status:'running',turns:[]};report.runs.push(run);await save();
  try{
   const {worlds}=await json(`/api/worlds?language=${language}`);const world=worlds.find(w=>w.id==='cinder-river');assert.ok(world);run.catalogue=world;
   let {game}=await json('/api/games',{name:names[language],worldId:world.id,powerId:world.powers[0].id,...(language==='zh'?{}:{language})});
   const opening=await play(game,language,starts[language],`${language}-01`);game=opening.after;run.turns.push({index:1,firstNarrativeMs:opening.firstNarrativeMs,completeMs:opening.completeMs});
   const pstart=performance.now();
   const decision=await player.run(`You are an independent progression-fantasy player. Do not call tools or read files. Respond only with a JSON object {"action":"one concrete action of at most 120 characters, written in ${labelNames[language]}"}. Choose an action using only this actual visible scene and your learned power. Pursue a useful gain rather than repeatedly asking for permission. Do not declare unearned items or abilities. Scene: ${JSON.stringify({world:game.world,power:game.state.power,location:game.state.location,latest:game.turns.at(-1)})}`,{signal});
   const action=JSON.parse(decision.text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'')).action;assert.equal(typeof action,'string');
   const record=await play(game,language,action,`${language}-02`,{model:player.model,reasoning:'low',sessionId:decision.sessionId,runId:decision.runId,decisionMs:performance.now()-pstart});game=record.after;run.turns.push({index:2,firstNarrativeMs:record.firstNarrativeMs,completeMs:record.completeMs});
   await write(`${language}-server-metrics.json`,await json(`/api/games/${game.id}/metrics`));
   const exported=await fetch(`${base}/api/games/${game.id}/export?format=md`,{signal});await write(`${language}-novel.md`,await exported.text());
   run.gameId=game.id;run.status='complete';if(language==='zh')chineseGame=game;
  }catch(e){run.status='failed';run.error=e.message;report.errors.push({language,error:e.message});if(e.events)await write(`${language}-failure-events.json`,e.events);}
  await save();
 }
 if(chineseGame){
  const beforeText=chineseGame.turns.map(t=>t.narrative);const switched=await play(chineseGame,'fr','Je refuse la mission et cherche un endroit où entraîner prudemment mon talent.','zh-to-fr');
  assert.deepEqual(switched.after.turns.slice(0,beforeText.length).map(t=>t.narrative),beforeText);
  assert.equal(switched.after.turns[0].language,'zh');report.languageSwitch={gameId:chineseGame.id,previousProsePreserved:true,previousTurnLanguage:'zh',newTurnLanguage:switched.turn.language,firstNarrativeMs:switched.firstNarrativeMs,completeMs:switched.completeMs};await save();
 }
 const prompts={fr:'Un monde de fantasy où les voyageurs apprennent la magie en réunissant des éclats de lune. Je suis adulte, libre de refuser les missions. Je commence dans un port suspendu, avec un talent modeste mais rare qui pourra combiner les effets des éclats. Je veux des progrès concrets et des personnages qui ont leurs propres intérêts.',ar:'عالم فانتازيا يتعلم فيه المسافرون السحر بجمع شظايا القمر وربط قواها. أنا مسافر بالغ وحر في رفض المهام، أبدأ في ميناء معلق بين الجبال بموهبة ضعيفة لكنها نادرة وقابلة للتطور. أريد نموا حقيقيا وقدرات أستطيع استخدامها وشخصيات لها مصالحها الخاصة.'};
 if(languages.length===5){for(const language of ['fr','ar']){
  const run={language,status:'running'};report.worlds.push(run);await save();
  try{
   const requestId=randomUUID(),prompt=prompts[language];const created=await stream('/api/worlds/custom',{requestId,prompt,language});
   const world=created.complete.world;assert.equal(world.language,language);run.worldId=world.id;run.title=world.title;run.completeMs=created.totalMs;run.metrics=created.complete.metrics;
   await write(`world-${language}.json`,created.complete);await write(`world-${language}-events.json`,created.events);
   const replay=await stream('/api/worlds/custom',{requestId,prompt,language});assert.equal(replay.complete.world.id,world.id);assert.equal(replay.complete.idempotentReplay,true);
   const conflict=await fetch(base+'/api/worlds/custom',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requestId,prompt,language:'en'}),signal});assert.equal(conflict.status,409);
   let {game}=await json('/api/games',{name:names[language],worldId:world.id,powerId:world.powers[0].id,language});const opened=await play(game,language,starts[language],`world-${language}-opening`);run.gameId=game.id;run.status='complete';run.sameIdOtherLanguageRejected=true;await write(`world-${language}-server-metrics.json`,await json(`/api/games/${game.id}/metrics`));
  }catch(e){run.status='failed';run.error=e.message;report.errors.push({worldLanguage:language,error:e.message});if(e.events)await write(`world-${language}-failure-events.json`,e.events);}await save();
 }}
 report.status=report.errors.length?'issues-found':'complete';
}catch(e){report.status='failed';report.errors.push({error:e.message});process.exitCode=1;}
finally{report.endedAt=new Date().toISOString();await save();console.log(JSON.stringify({label,status:report.status,errors:report.errors,runs:report.runs.map(r=>({language:r.language,status:r.status,turns:r.turns}))}));if(report.errors.length)process.exitCode=1;}
