import test from 'node:test';
import assert from 'node:assert/strict';
import { GenerationService } from '../src/generation-service.js';
import { reduceState } from '../src/reducer.js';
import { buildNarratorPrompt, buildRepairPrompt } from '../src/prompts.js';
import { createSeedState, WORLDS } from '../src/worlds.js';
import { TurnTrace } from '../src/telemetry.js';
import { VALID_NARRATOR_OUTPUT } from './fixtures/narrator-output.js';
const world = WORLDS[0];
function game(turnNumber = 0) { return { id:'regression', name:'沈舟', version:turnNumber, turns:[], state:{...createSeedState(world,world.powers[0]),turnNumber} }; }
const facts = ['染桶巨响使部分士卒转向河堤','暗门机关由黑铁栓和三根细链共同锁住','黑铁栓上残留新鲜油光，像刚被人动过','左墙第三块木板后藏有可能挑开链扣的旧染钩','韩峥离开部分守卫前往河堤压阵','染坊门外仍留有守卫并即将撞门'];
const baseProposal = { narrative:'沈舟看清了暗门上的机关。', choices:[{id:'a',label:'取钩'},{id:'b',label:'离开'},{id:'c',label:'谈判'}] };
test('real incident regression: six canonical facts are retained without a model repair', () => {
  const result = reduceState(game().state, {...baseProposal,delta:{factsAdd:facts}});
  for(const fact of facts) assert.ok(result.state.facts.includes(fact));
  assert.equal(result.rejected.length,0);
});
test('fact guard reports actual count and type, rather than opaque format error', () => {
  assert.throws(()=>reduceState(game().state,{...baseProposal,delta:{factsAdd:Array.from({length:21},(_,i)=>`事实${i}`)}}), /最多 20 条，实际 21 条/);
  assert.throws(()=>reduceState(game().state,{...baseProposal,delta:{factsAdd:'不是数组'}}), /必须是字符串数组/);
});
test('authored opening avoids live planning but turn-nine checkpoint still invokes planner', async () => {
  let plannerCalls=0;
  const narrator={role:'narrator',model:'fixture',reasoningEffort:'low',async run(prompt,{onText}){onText?.(VALID_NARRATOR_OUTPUT);return{text:VALID_NARRATOR_OUTPUT}}};
  const planner={role:'planner',model:'fixture',async run(){plannerCalls++;return{text:JSON.stringify({pressure:'',npcMoves:[],openings:[],continuity:[],milestone:''})}}};
  const service=new GenerationService({narrator,planner,openingPlanStrategy:'authored',plannerInterval:8});
  const trace=new TurnTrace({gameId:'regression',requestId:'opening'});
  await service.execute({game:game(),world,action:'开始',trace});
  assert.equal(plannerCalls,0);assert.equal(trace.value.planSource,'authored-world-seed-no-model-call');
  assert.ok(trace.value.candidateOutputs[0].finalText.includes('<TGN_DELTA_JSON>'));
  await service.execute({game:game(8),world,action:'继续',trace:new TurnTrace({gameId:'regression',requestId:'checkpoint'})});
  assert.equal(plannerCalls,1);
});
test('narrator and repair both receive the same explicit fact limits',()=>{
  assert.match(buildNarratorPrompt({game:game(),world,action:'走'}), /硬上限20条/);
  assert.match(buildRepairPrompt({game:game(),action:'走',invalidOutput:'bad',reason:'factsAdd'}), /硬上限20条/);
});
