import test from 'node:test';
import assert from 'node:assert/strict';
import { reduceState } from '../src/reducer.js';
import { createSeedState, WORLDS } from '../src/worlds.js';
import { deltaContractText } from '../src/delta-contract.js';
import { liveSceneContract } from '../src/scene-contract.js';
import { buildNarratorPrompt } from '../src/prompts.js';

const proposal = operations => ({ narrative:'他只服用小半包药，把余下的药末包好。', choices:[{id:'a',label:'收功'},{id:'b',label:'观察'},{id:'c',label:'离开'}], delta:{inventoryOps:operations} });
const seed = () => ({...createSeedState(WORLDS[0], WORLDS[0].powers[0]), inventory:[{id:'calming-powder',name:'宁息散',description:'一整包药粉',qty:1}]});

test('real incident: a small dose preserves the packet and records its remaining amount',()=>{
  const before=seed();
  const result=reduceState(before,proposal([{op:'update',id:'calming-powder',description:'已服用小半，余下大半包药粉重新包好。'}]),WORLDS[0]);
  assert.equal(result.state.inventory[0].qty,1);
  assert.match(result.state.inventory[0].description,/余下大半/);
  assert.match(result.changes[0],/宁息散.*余下大半/);
  assert.doesNotMatch(result.changes[0],/失去|获得/);
  assert.equal(before.inventory[0].description,'一整包药粉');
  const used=reduceState(result.state,{...proposal([{op:'remove',id:'calming-powder',qty:1}]),narrative:'他服完剩下的药粉，纸包空了。'},WORLDS[0]);
  assert.equal(used.state.inventory.length,0);
});

test('update cannot manufacture a packet that was never owned',()=>{
  assert.throws(()=>reduceState(seed(),proposal([{op:'update',id:'missing',description:'余下半瓶水'}]),WORLDS[0]),{code:'REJECTED_DELTA'});
});

test('narrator and repair share partial-consumption semantics',()=>{
  assert.match(deltaContractText(WORLDS[0]),/部分使用.*update/);
  const prompt=buildNarratorPrompt({game:{name:'测试角色',version:0,state:seed(),turns:[]},world:WORLDS[0],action:'只服用小半包药',plan:null});
  assert.match(prompt,/op=add\/remove\/update/);
  assert.ok(!prompt.includes('op:"add或remove"'),'no stale second inventory schema may override the shared contract');
  assert.match(liveSceneContract({turns:[]},WORLDS[0]),/部分消耗要update描述剩余量/);
});
