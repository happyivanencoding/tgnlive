import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedState, WORLDS, validateWorldDefinition } from '../src/worlds.js';
import { reduceState } from '../src/reducer.js';
import { buildNarratorPrompt, buildPlannerPrompt } from '../src/prompts.js';
import { GenerationService } from '../src/generation-service.js';
import { authoredOpeningPlan } from '../src/opening-plan.js';
import { TurnTrace } from '../src/telemetry.js';
const world = WORLDS[0];
const choices = [{ id:'a',label:'练习' },{ id:'b',label:'离开' },{ id:'c',label:'交易' }];
const seed = () => createSeedState(world, world.powers[0]);
const reduce = (state, narrative, delta, language='zh') => reduceState(state,{ narrative, choices, delta },world,language);
const grantText = '沈秋禾把药坊侧门钥匙交给他，答应每晚留一间空屋供他练功。';
const grant = { op:'add',id:'quiet-room',kind:'relationship',name:'药坊静室',effect:'每晚可在药坊空屋安静练功',scope:'只限空屋，不能取走店里的药',sourceId:'shen-qiuhua',evidence:grantText };

test('old save acquires an empty ledger without inventing rewards or mutating its input',()=>{
 const old=seed();delete old.progression;const before=structuredClone(old);
 const r=reduce(old,'他在街边歇了一会。',{});
 assert.deepEqual(old,before);assert.deepEqual(r.state.progression,{version:1,leverage:[],opportunities:[]});
 assert.equal(r.state.realm.progress,0);assert.deepEqual(r.changes,[]);
});
test('a friendly attitude is not reusable help; concrete help links to an existing NPC',()=>{
 const friendly=reduce(seed(),'沈秋禾朝他友善地点头。',{relationshipChanges:[{id:'shen-qiuhua',attitude:'友善'}]});
 assert.equal(friendly.state.progression.leverage.length,0);
 const granted=reduce(friendly.state,grantText,{leverageOps:[grant]});
 assert.equal(granted.state.progression.leverage[0].scope,grant.scope);
 assert.equal(granted.state.progression.leverage[0].useCount,0);
 assert.match(granted.changes[0],/药坊静室/);
 assert.throws(()=>reduce(seed(),grantText,{leverageOps:[{...grant,sourceId:'imaginary-patron'}]}),{code:'INVALID_PROGRESSION'});
});
test('later use persists actual reuse, not passive interest or free money',()=>{
 const granted=reduce(seed(),grantText,{leverageOps:[grant]});
 const narrative='沈秋禾照约给他打开了空屋，他借安静的地方练完一套吐纳。';
 const reused=reduce(granted.state,narrative,{leverageOps:[{op:'use',id:grant.id,evidence:narrative}]});
 assert.equal(reused.state.progression.leverage[0].useCount,1);assert.equal(reused.state.progression.leverage[0].lastUsedAtTurn,2);
 assert.equal(reused.state.coins,seed().coins);assert.equal(reused.state.realm.progress,0);
 const idle=reduce(reused.state,'他随后出门吃饭。',{});assert.equal(idle.state.progression.leverage[0].useCount,1);
});
test('revoked rights cannot be silently resurrected or reused',()=>{
 let s=reduce(seed(),grantText,{leverageOps:[grant]}).state;
 const evidence='药坊已被焚毁，空屋再也不能供他居住。';
 s=reduce(s,evidence,{leverageOps:[{op:'revoke',id:grant.id,evidence}]}).state;
 assert.equal(s.progression.leverage[0].status,'revoked');
 assert.throws(()=>reduce(s,'他又用上了那间空屋。',{leverageOps:[{op:'use',id:grant.id,evidence:'他又用上了那间空屋。'}]}),{code:'INVALID_PROGRESSION'});
 assert.throws(()=>reduce(s,grantText,{leverageOps:[grant]}),{code:'INVALID_PROGRESSION'});
});
test('legacy quote annotations do not block valid turns; structural failures still roll back',()=>{
 const s=seed(),before=structuredClone(s);
 const result=reduce(s,grantText,{leverageOps:[{...grant,evidence:'旧版摘句使用了不同的句号'}]});
 assert.equal(result.state.progression.leverage.length,1);
 assert.throws(()=>reduce(s,grantText,{coinsDelta:20,leverageOps:[{...grant,sourceId:'unknown-npc'}]}),{code:'INVALID_PROGRESSION'});
 assert.deepEqual(s,before);
});
const offerText='只要稳住药液的火候，他就能学会以后反复使用的温脉手法。';
const offer={op:'open',id:'warm-channel',name:'温脉手法',payoff:'可反复温养自己的经脉',approach:'用现有药液完成一次稳定温养',evidence:offerText};
test('growth offers are neither player vows nor immediate rewards',()=>{
 const r=reduce(seed(),offerText,{opportunityOps:[offer]});
 assert.equal(r.state.progression.opportunities[0].status,'open');
 assert.deepEqual(r.state.promises,[]);assert.equal(r.state.capabilities.length,seed().capabilities.length);
 assert.throws(()=>reduce(r.state,offerText,{opportunityOps:[{...offer,approach:'再去另一座塔检查一次'}]}),{code:'INVALID_PROGRESSION'});
});
test('knowledge-only settlement is answered, not a reward or a forced repair',()=>{
 const opened=reduce(seed(),offerText,{opportunityOps:[offer]}).state;
 const evidence='药力稳定地走过经脉，温脉手法已经被他牢牢记住。';
 const op={op:'fulfill',id:offer.id,result:'掌握可以再次使用的温脉手法',evidence};
 const answer=reduce(opened,evidence,{opportunityOps:[op]});
 assert.equal(answer.state.progression.opportunities[0].status,'answered');
 assert.equal(answer.state.progression.opportunities[0].materialized,false);
 assert.equal(answer.state.capabilities.length,opened.capabilities.length);
 assert.equal(answer.state.realm.progress,opened.realm.progress);
 assert.match(answer.changes[0],/问题已解答/);
 const r=reduce(opened,evidence,{capabilityOps:[{op:'add',id:'warm-channels',name:'温脉手法',description:'配合普通药液温养自身经脉，不能治疗重伤。'}],opportunityOps:[op]});
 assert.equal(r.state.progression.opportunities[0].status,'fulfilled');assert.equal(r.state.progression.opportunities[0].settledAtTurn,2);
 assert.equal(r.state.capabilities.at(-1).id,'warm-channels');
});
test('player can abandon an opportunity with no forced payoff or progression quota',()=>{
 const opened=reduce(seed(),offerText,{opportunityOps:[offer]}).state;
 const evidence='他拒绝学这套手法，转身走出了药坊。';
 const r=reduce(opened,evidence,{opportunityOps:[{op:'close',id:offer.id,result:'玩家自愿放弃',evidence}]});
 assert.equal(r.state.progression.opportunities[0].status,'closed');assert.equal(r.state.realm.progress,0);
});
test('new visible change labels respect all five output languages',()=>{
 for(const language of ['zh','en','fr','es','ar']){
  const r=reduce(seed(),grantText,{leverageOps:[grant]},language);
  assert.ok(!r.changes[0].startsWith('leverage'));
  if(language!=='zh')assert.ok(!r.changes[0].startsWith('获得'));
 }
});
test('stage desire survives local goal changes without overriding player choice',()=>{
 const s=seed();s.turnNumber=12;s.goal='检查下一扇门';
 const game={name:'沈舟',state:s,turns:[],language:'zh',version:12};
 const plan=authoredOpeningPlan(world,s);
 const p=buildNarratorPrompt({game,world,action:'不查门了，我去练功',plan});
 assert.ok(p.includes(world.opening.goal));assert.ok(p.includes('不查门了，我去练功'));assert.ok(p.includes('leverageOps'));
 assert.ok(buildPlannerPrompt({game,world,action:'离开',existingPlan:plan}).includes('afterUse'));
});
test('near-breakthrough planning happens once per realm, not every stalled turn',()=>{
 const service=new GenerationService({narrator:{},planner:{}});const game={state:seed()};
 game.state.turnNumber=10;game.state.realm.progress=95;
 assert.equal(service.shouldPlan(game,null),true);
 const prior={basisRealmRank:0,basisNearBreakthrough:true};
 assert.equal(service.shouldPlan(game,prior),false);
 game.state.turnNumber=16;assert.equal(service.shouldPlan(game,prior),true);
 game.state.turnNumber=18;game.state.realm.rank=1;assert.equal(service.shouldPlan(game,prior),true);
});
test('telemetry distinguishes server dispatch from unknown browser paint',()=>{
 const trace=new TurnTrace({gameId:'g',requestId:'r'});trace.firstVisible();
 assert.equal(trace.value.firstNarrativeSseMs,trace.value.firstReaderVisibleMs);
 assert.equal(trace.value.browserFirstNarrativePaintMs,null);assert.equal(trace.value.browserChoicesVisibleMs,null);
 assert.equal(trace.value.events[0].type,'first_narrative_sse');
});
test('world-specific growth grammar is optional, bounded, and retained in snapshots',()=>{
 const grammar={desire:'获得能够独自驾驭的云兽伙伴',conversion:'信任与协同训练形成持续飞行能力',recognition:'独立领航资格允许按自己的价格组队',expansion:'从短距滑翔到可主动选择跨岛航线'};
 const validated=validateWorldDefinition({...world,growthGrammar:grammar});assert.deepEqual(validated.growthGrammar,grammar);
 assert.equal(validateWorldDefinition(world).growthGrammar,undefined);
 assert.throws(()=>validateWorldDefinition({...world,growthGrammar:{desire:'missing'}}),{code:'INVALID_WORLD'});
});
