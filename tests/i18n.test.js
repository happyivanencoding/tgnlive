import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createTgnLive} from '../src/index.js';
import {GameStore} from '../src/store.js';
import {getWorld, WORLDS, createSeedState, publicWorldsForLanguage, validateWorldDefinition} from '../src/worlds.js';
import {normalizeLanguage, formatChange, isFanSourceLabel, canonicalAttitude} from '../src/i18n.js';
import {buildNarratorPrompt, buildPlannerPrompt, buildRepairPrompt} from '../src/prompts.js';
import {buildWorldPrompt} from '../src/world-forge.js';
import {DELIMITER} from '../src/output-parser.js';
import {reduceState} from '../src/reducer.js';
import {auditMessages} from '../public/i18n.js';

const languages=['zh','en','fr','es','ar'];
const texts={zh:'他来到河边，停下脚步。',en:'He reached the river and stopped.',fr:'Il arriva près du fleuve et s’arrêta.',es:'Llegó al río y se detuvo.',ar:'وصل إلى النهر وتوقف عند الضفة.'};
const proposal=language=>({narrative:texts[language],choices:[{id:'a',label:'A'},{id:'b',label:'B'},{id:'c',label:'C'}],delta:{relationshipChanges:[{id:'han-zheng',attitude:'好奇'}]}});
const seed=(language='zh')=>{const world=getWorld('cinder-river',language);return {world,state:createSeedState(world,world.powers[0])};};

test('default language is Chinese and unsupported language is rejected',()=>{
 assert.equal(normalizeLanguage(), 'zh');assert.equal(normalizeLanguage(null,{optional:true}),null);assert.throws(()=>normalizeLanguage('de'),{code:'INVALID_LANGUAGE'});
});
for(const language of languages)test(`${language}: all five presets retain IDs and realm ranks while localizing public data`,()=>{
 const catalogue=publicWorldsForLanguage([],language);assert.equal(catalogue.length,5);
 for(const original of WORLDS){const world=getWorld(original.id,language);assert.equal(world.language,language);assert.deepEqual(world.powers.map(p=>p.id),original.powers.map(p=>p.id));assert.deepEqual(world.powerSystem.realms.map(r=>r.rank),original.powerSystem.realms.map(r=>r.rank));assert.deepEqual(world.seed.inventory.map(i=>[i.id,i.qty]),original.seed.inventory.map(i=>[i.id,i.qty]));
  if(language!=='zh'){const visible=JSON.stringify({title:world.title,description:world.description,system:world.powerSystem,powers:world.powers});assert.doesNotMatch(visible,/\p{Script=Han}/u);}
  const state=createSeedState(world,world.powers[0]);assert.equal(state.realm.name,world.powerSystem.realms[0].name);assert.ok(!JSON.stringify(state).includes('undefined'));
 }
});
test('all five interface dictionaries have corresponding keys',()=>{const result=auditMessages();assert.equal(Object.values(result).flatMap(value=>[...value.missing,...value.extra]).length,0,JSON.stringify(result));});
test('format changes translates the attitude, never mutating its internal enum',()=>{for(const l of languages.filter(x=>x!=='zh'))assert.doesNotMatch(formatChange({field:'relationship',name:'Nadir',attitude:'好奇'},l),/\p{Script=Han}/u);});
test('unofficial source labels are recognized in each requested language',()=>{for(const label of ['同人灵感','Unofficial fan inspiration','Inspiration non officielle','Inspiración no oficial','إلهام غير رسمي'])assert.equal(isFanSourceLabel(label),true);});
test('narrator, planner, repair and forge carry the explicit language even for another-language input',()=>{
 const {world,state}=seed();const game={name:'Élie',language:'zh',state,turns:[],version:0};
 for(const language of languages){for(const text of [buildNarratorPrompt({game,world,action:'中文行动',language}),buildPlannerPrompt({game,world,action:'中文行动',language}),buildRepairPrompt({game,world,action:'中文行动',language,invalidOutput:'invalid',reason:'test'}),buildWorldPrompt('中文世界描述',language)])assert.ok(text.includes(`目标语言固定为 ${language}`));}
});
test('language switching retains exact snapshot realm identities and past text',()=>{
 const {world,state}=seed('fr');const before=structuredClone(state);before.realm.progress=100;
 const result=reduceState(before,{...proposal('ar'),delta:{realmAdvance:world.powerSystem.realms[1].name}},world,'ar');assert.equal(result.state.realm.name,world.powerSystem.realms[1].name);assert.equal(result.state.realm.rank,1);
 const game={name:'Élie',language:'ar',state,turns:[{index:1,language:'fr',action:'test',narrative:'BEGIN '+ 'French prose '.repeat(170),changes:[]}],version:1};
 const prompt=buildNarratorPrompt({game,world,action:'متابعة'});assert.ok(prompt.includes('BEGIN '),'A normal foreign scene must not lose its opening in recent context');assert.ok(prompt.includes('realmAdvance'));
});

async function makeRuntime(){
 let calls=0;const prompts=[];
 const adapter={role:'narrator',model:'fixture',reasoningEffort:'low',health:{status:'ready'},async run(prompt,{onText,signal}={}){calls++;prompts.push(prompt);if(prompt.includes('FAIL_GENERATION'))throw new Error('fixture failure');signal?.throwIfAborted();const code=prompt.match(/目标语言固定为 (zh|en|fr|es|ar)/)?.[1]||'zh';const p=proposal(code),text=p.narrative+DELIMITER+JSON.stringify({choices:p.choices,delta:p.delta});onText?.(text);return {text,sessionId:'fixture',runId:'fixture'};}};
 const worldForge={async generate({language}){return {...structuredClone(getWorld('cinder-river',language)),id:`world-fixture-${language}`,language};}};
 const runtime=createTgnLive({configOverrides:{databasePath:':memory:',port:0,remote:null},narrator:adapter,planner:adapter,worldForge});await new Promise(resolve=>runtime.server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${runtime.server.address().port}`;const post=(route,body)=>fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 return {runtime,base,post,prompts,get calls(){return calls;},async close(){await new Promise(resolve=>runtime.server.close(resolve));runtime.store.close();}};
}
for(const language of languages)test(`${language}: HTTP create and turn persist the selected language; replay cannot switch language (fixture)`,async()=>{
 const testRuntime=await makeRuntime();const {post,runtime}=testRuntime;
 try{const create=await post('/api/games',{name:{zh:'测试',en:'Rowan',fr:'Élie',es:'Íñigo',ar:'سليم'}[language],worldId:'cinder-river',powerId:'ember-hearing',...(language==='zh'?{}:{language})});assert.equal(create.status,201);let {game}=await create.json();assert.equal(game.language,language);
 const body={action:'继续',expectedVersion:0,requestId:'lang-turn-001',language};const response=await post(`/api/games/${game.id}/turns`,body);const stream=await response.text();assert.ok(stream.includes('event: complete'),stream);game=runtime.store.getGame(game.id);assert.equal(game.language,language);assert.equal(game.turns[0].language,language);assert.equal(game.turns[0].narrative,texts[language]);
 const replay=await post(`/api/games/${game.id}/turns`,body);assert.match(await replay.text(),/idempotentReplay/);assert.equal(testRuntime.calls,1);
 const conflict=await post(`/api/games/${game.id}/turns`,{...body,language:language==='ar'?'fr':'ar'});assert.equal(conflict.status,409);assert.equal(testRuntime.calls,1);
 assert.ok(runtime.store.exportNovel(game.id).includes(texts[language]));
 }finally{await testRuntime.close();}
});
test('failure does not switch the book language; successful later language does not rewrite older prose (fixture)',async()=>{
 const r=await makeRuntime();try{let {game}=await(await r.post('/api/games',{name:'旧书',worldId:'cinder-river',powerId:'ember-hearing'})).json();const send=(action,version,id,language)=>r.post(`/api/games/${game.id}/turns`,{action,expectedVersion:version,requestId:id,language});
 assert.match(await(await send('开始',0,'opening-zh','zh')).text(),/event: complete/);
 assert.match(await(await send('FAIL_GENERATION',1,'failure-fr-001','fr')).text(),/event: error/);assert.equal(r.runtime.store.getGame(game.id).language,'zh');
 assert.match(await(await send('Continue',1,'success-fr','fr')).text(),/event: complete/);game=r.runtime.store.getGame(game.id);assert.equal(game.language,'fr');assert.equal(game.turns[0].narrative,texts.zh);assert.equal(game.turns[0].language,'zh');assert.equal(game.turns[1].language,'fr');
 }finally{await r.close();}
});
test('world request replay is language-sensitive and created worlds retain language (fixture)',async()=>{
 const r=await makeRuntime();try{const body={prompt:'a new fantasy world',requestId:'new-world-french',language:'fr'};assert.match(await(await r.post('/api/worlds/custom',body)).text(),/event: complete/);assert.match(await(await r.post('/api/worlds/custom',body)).text(),/idempotentReplay/);assert.equal((await r.post('/api/worlds/custom',{...body,language:'ar'})).status,409);assert.equal(r.runtime.store.listWorlds()[0].language,'fr');}finally{await r.close();}
});
test('existing schema receives Chinese defaults without changing stored text or state (synthetic old database)',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tgn-i18n-'));const filename=path.join(directory,'old.sqlite');let store=new GameStore(filename);
 try{const {world,state}=seed();const game=store.createGame({name:'旧书',title:'旧故事',worldId:world.id,powerId:world.powers[0].id,state,world});for(const table of ['games','worlds','turns','requests'])store.db.exec(`ALTER TABLE ${table} DROP COLUMN language`);store.close();store=new GameStore(filename);const recovered=store.getGame(game.id);assert.equal(recovered.language,'zh');assert.equal(recovered.title,'旧故事');assert.deepEqual(recovered.state,state);}finally{store.close();fs.rmSync(directory,{recursive:true,force:true});}
});

// Actual Arabic World Forge translated its fixed attitude enum.
test('Arabic attitude labels normalize to the existing enum without another model call',()=>{
 assert.equal(canonicalAttitude('مستراب'),'戒备'); assert.equal(canonicalAttitude('ودود'),'友善');
 const {world,state}=seed('ar');const result=reduceState(state,{...proposal('ar'),delta:{relationshipChanges:[{id:'han-zheng',attitude:'مستراب'}]}},world,'ar');assert.equal(result.state.relationships.find(n=>n.id==='han-zheng').attitude,'戒备');
 assert.throws(()=>reduceState(state,{...proposal('ar'),delta:{relationshipChanges:[{id:'han-zheng',attitude:'not-an-attitude'}]}},world,'ar'));
});
test('translations preserve distinct magic and beast progression instead of a generic cultivation ladder',()=>{
 for(const lang of ['en','fr','es','ar']){const mage=getWorld('ashen-star-covenant',lang),beast=getWorld('sky-beast-isles',lang),alchemy=getWorld('crimson-cauldron',lang);assert.notEqual(mage.powerSystem.realms[0].unlock,beast.powerSystem.realms[0].unlock);assert.notEqual(mage.powerSystem.summary,beast.powerSystem.summary);assert.notEqual(alchemy.powerSystem.realms[0].benchmark,alchemy.powerSystem.realms[1].benchmark);
 for(const w of [mage,beast,alchemy,getWorld('cinder-river',lang)])assert.doesNotMatch(w.seed.relationships.map(n=>n.name).join(' '),/\p{Script=Han}/u);}
});
