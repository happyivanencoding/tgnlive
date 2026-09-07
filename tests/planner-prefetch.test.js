import test from 'node:test';
import assert from 'node:assert/strict';
import { GenerationService } from '../src/generation-service.js';
import { TurnTrace } from '../src/telemetry.js';
import { createSeedState, WORLDS } from '../src/worlds.js';
import { VALID_NARRATOR_OUTPUT } from './fixtures/narrator-output.js';

const world = WORLDS[0];
const tick = () => new Promise(resolve => setImmediate(resolve));
function snapshot(version = 6, id = 'prefetch-game') {
  const state = createSeedState(world, world.powers[0]); state.turnNumber = version;
  return { id, name: '林砚', version, language: 'zh', state, turns: [] };
}
const oldPlan = { pressure: '当前条件仍可行动', npcMoves: [], growth: {want:'取得实际能力',payoff:'练成可用动作',afterUse:'离开学徒阶段'}, basisRealmRank: 0, basisNearBreakthrough: false };
const nextPlan = { pressure: '旧阻碍已解除', npcMoves: [], growth: {want:'完成新能力',payoff:'得到更大行动范围',afterUse:'旧方法不用逐次验证',graduated:'普通材料处理已掌握',transition:'尚缺在移动中保持稳定'} };
function adapters() {
  const pending = []; const prompts = []; let narratorCalls = 0;
  const planner = { role: 'planner', model: 'test-planner', reasoningEffort:'medium', health:{status:'ready'}, get calls(){return pending.length;},
    run(prompt, {signal, onEvent}) {
      prompts.push(prompt);
      onEvent?.({type:'acp_config_applied',sessionId:'planner-session',model:this.model,reasoningEffort:this.reasoningEffort,mode:'read-only'});
      return new Promise((resolve,reject) => {
        const job = {resolve: value => resolve({text:JSON.stringify(value),sessionId:'planner-session',runId:'planner-run',usage:null}),reject,signal};
        pending.push(job);
        signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
      });
    } };
  const narrator = {role:'narrator', model:'test-narrator', reasoningEffort:'low', health:{status:'ready'}, get calls(){return narratorCalls;},
    async run(prompt,{onText}){narratorCalls++;prompts.push(prompt);onText?.(VALID_NARRATOR_OUTPUT);return {text:VALID_NARRATOR_OUTPUT,sessionId:'narrator-session',runId:'narrator-run',usage:null};} };
  const service = new GenerationService({planner,narrator,plannerInterval:8,plannerStrategy:'prefetch'});
  return {service,planner,narrator,pending,prompts};
}
function execute(service, game=snapshot(8), existingPlan=oldPlan) {
  const trace = new TurnTrace({gameId:game.id,requestId:'checkpoint'});
  return service.execute({game,world,action:'按自己的路线继续',existingPlan,language:game.language,trace}).then(result=>({result,trace}));
}

test('ready speculative plan is consumed at its exact checkpoint without a foreground planner call', async t => {
  const {service,planner,pending,prompts} = adapters(); t.after(()=>service.close());
  const game = snapshot(); const before = structuredClone(game); const traces=[];
  assert.equal(service.afterCommit({game,world,existingPlan:oldPlan,onTrace:v=>traces.push(v)}),undefined,'scheduling must not return a blocking plan');
  await tick(); assert.equal(planner.calls,1);
  assert.match(prompts[0],/玩家尚未提交下一行动/);
  pending[0].resolve(nextPlan); await service.ahead.promise;
  const {result,trace}=await execute(service);
  assert.equal(planner.calls,1); assert.equal(result.plan.speculative,true);
  assert.deepEqual(result.plan.growth,nextPlan.growth);
  assert.equal(result.plan.basisGameVersion,6);assert.equal(result.plan.targetGameVersion,8);
  assert.equal(trace.value.planSource,'ready-prefetch-no-foreground-model-call');
  assert.equal(traces[0].kind,'planner-prefetch');assert.equal(traces[0].status,'complete');
  assert.equal(trace.value.stages.some(s=>s.name==='plan'),false);
  assert.deepEqual(game,before,'planning cannot mutate Canon');
});

test('slow or failed prefetch never waits or falls back to a synchronous planner', async t => {
  for(const fail of [false,true]){
    const {service,planner,pending}=adapters();t.after(()=>service.close());
    service.afterCommit({game:snapshot(),world,existingPlan:oldPlan});await tick();
    if(fail){pending[0].reject(new Error('test provider outage'));await service.ahead.promise;}
    const {result,trace}=await execute(service);
    assert.equal(planner.calls,1);assert.equal(result.plan,null);
    assert.equal(trace.value.planSource,'existing-plan-nonblocking-fallback');
    assert.equal(trace.value.prefetch.status,fail?'failed':'pending');
    if(!fail){pending[0].resolve(nextPlan);await service.ahead.promise;}
  }
});

test('cold checkpoint uses existing Canon and plan without creating an on-path planner', async t => {
  const {service,planner}=adapters();t.after(()=>service.close());
  const {trace}=await execute(service);
  assert.equal(planner.calls,0);assert.equal(trace.value.prefetch.status,'missing-or-stale');
});

test('wrong game, version, language or stage cannot consume a ready speculative plan', async t => {
  for(const mutate of [g=>g.id='other-game',g=>{g.version=16;g.state.turnNumber=16;},g=>g.language='en',g=>{g.state.realm={...world.powerSystem.realms[1],progress:0};}]){
    const {service,planner,pending}=adapters();t.after(()=>service.close());
    service.afterCommit({game:snapshot(),world,existingPlan:oldPlan});await tick();pending[0].resolve(nextPlan);await service.ahead.promise;
    const game=snapshot(8);mutate(game);const {result,trace}=await execute(service,game);
    assert.equal(result.plan,null);assert.equal(planner.calls,1);
    assert.equal(trace.value.prefetch.status,'missing-or-stale');
    if(game.state.realm.rank===1)assert.equal(trace.value.prefetch.discardedOldStagePlan,true);
  }
});

test('only the lead-in turn starts planning; stop cancels the owned job and close awaits cleanup', async () => {
  const {service,planner,pending}=adapters();const traces=[];
  for(const version of [1,2,3,4,5])service.afterCommit({game:snapshot(version),world,existingPlan:oldPlan});
  await tick();assert.equal(planner.calls,0);
  service.afterCommit({game:snapshot(6),world,existingPlan:oldPlan,onTrace:v=>traces.push(v)});await tick();
  service.afterCommit({game:snapshot(7),world,existingPlan:oldPlan});assert.equal(planner.calls,1);
  service.cancelPrefetch('other-game');assert.equal(pending[0].signal.aborted,false);
  service.cancelPrefetch('prefetch-game');assert.equal(pending[0].signal.aborted,true);
  await service.close();assert.equal(service.ahead,null);assert.equal(service.prefetchJobs.size,0);
  assert.equal(traces[0].status,'cancelled');
});

test('shutdown includes a cancelled superseded job, not only the latest game', async () => {
  const {service,pending}=adapters();
  service.afterCommit({game:snapshot(6,'old-game'),world,existingPlan:oldPlan});await tick();
  service.afterCommit({game:snapshot(6,'new-game'),world,existingPlan:oldPlan});await tick();
  assert.equal(pending[0].signal.aborted,true);assert.equal(pending[1].signal.aborted,false);
  await service.close();assert.equal(pending[1].signal.aborted,true);assert.equal(service.prefetchJobs.size,0);
});
