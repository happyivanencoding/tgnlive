import test from 'node:test';
import assert from 'node:assert/strict';
import { createTgnLive } from '../src/index.js';
import { VALID_NARRATOR_OUTPUT } from './fixtures/narrator-output.js';

async function setup(t) {
  const jobs=[];
  const runtime=createTgnLive({configOverrides:{databasePath:':memory:',port:0,plannerStrategy:'prefetch'},
    narrator:{role:'narrator',model:'test-narrator',reasoningEffort:'low',health:{status:'ready'},async run(_prompt,{onText}){onText?.(VALID_NARRATOR_OUTPUT);return {text:VALID_NARRATOR_OUTPUT,sessionId:'test-narrator',runId:'narrator-run'};}},
    planner:{role:'planner',model:'test-planner',reasoningEffort:'medium',health:{status:'ready'},run(_prompt,{signal}){return new Promise((resolve,reject)=>{jobs.push({signal,resolve,reject});signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});}}});
  await new Promise(resolve=>runtime.server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${runtime.server.address().port}`;
  t.after(async()=>{await runtime.generationService.close();await new Promise(resolve=>runtime.server.close(resolve));runtime.store.close();});
  const post=async(route,body)=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
  const created=await post('/api/games',{name:'林砚',worldId:'cinder-river',powerId:'ember-hearing'});
  assert.equal(created.status,201);const {game}=await created.json();
  return {runtime,jobs,base,post,game};
}

test('an optional post-commit hook failure cannot change committed response, request or replay', async t=>{
  const {runtime,base,post,game}=await setup(t);let hookCalls=0;
  runtime.generationService.afterCommit=({game:committed})=>{
    hookCalls++;assert.equal(committed.version,1);assert.equal(runtime.store.getGame(game.id).version,1);
    throw new Error('simulated optional scheduling failure');
  };
  const payload={action:'开始我的故事',expectedVersion:0,requestId:'prefetch_commit_001'};
  const first=await post(`/api/games/${game.id}/turns`,payload);const stream=await first.text();
  assert.equal(first.status,200);assert.equal((stream.match(/event: complete/g)||[]).length,1);assert.doesNotMatch(stream,/event: error/);
  const replay=await post(`/api/games/${game.id}/turns`,payload);assert.match(await replay.text(),/idempotentReplay/);assert.equal(hookCalls,1);
  const saved=(await(await fetch(`${base}/api/games/${game.id}`)).json()).game;assert.equal(saved.version,1);assert.equal(saved.turns.length,1);
});

test('HTTP checkpoint commits while speculative planner is still pending and Stop cancels only that job', async t=>{
  const {runtime,jobs,base,post,game}=await setup(t);
  for(let index=1;index<=14;index++){
    const response=await post(`/api/games/${game.id}/turns`,{action:index===1?'开始我的故事':'继续观察眼前局势',expectedVersion:index-1,requestId:`prefetch_http_${String(index).padStart(3,'0')}`});
    assert.equal(response.status,200);assert.match(await response.text(),/event: complete/);
    if(index===6){await new Promise(resolve=>setImmediate(resolve));assert.equal(jobs.length,1);assert.equal(runtime.store.getGame(game.id).version,6);}
    if(index===8)assert.equal(jobs[0].signal.aborted,false,'job is still pending at checkpoint entry');
    if(index===9){assert.equal(jobs.length,1,'checkpoint must not start a blocking replacement');assert.equal(jobs[0].signal.aborted,true,'the missed plan is cancelled once its target version has passed');}
  }
  assert.equal(jobs.length,2);assert.equal(jobs[1].signal.aborted,false);assert.equal(runtime.store.getGame(game.id).version,14);
  const cancel=await post(`/api/games/${game.id}/cancel`,{});assert.equal(cancel.status,200);
  await runtime.generationService.close();assert.equal(jobs[1].signal.aborted,true);
  const metrics=await(await fetch(`${base}/api/games/${game.id}/metrics`)).json();
  const background=metrics.turns.filter(t=>t.kind==='planner-prefetch');assert.equal(background.length,2);assert.ok(background.every(t=>t.status==='cancelled'));
  assert.equal(runtime.store.getGame(game.id).turns.length,14,'cancelled optional work cannot roll back a committed move');
});
