import test from 'node:test';
import assert from 'node:assert/strict';
import { reduceState } from '../src/reducer.js';
import { createSeedState, WORLDS } from '../src/worlds.js';
import { deltaContractText } from '../src/delta-contract.js';
const state=()=>({...createSeedState(WORLDS[0],WORLDS[0].powers[0]),relationships:[{id:'ileia',name:'伊莱娅·灰帆',role:'独立寻核人',attitude:'戒备'}]});
const proposal=attitude=>({narrative:'伊莱娅固定住井盖，提出自己的救援条件。',choices:[{id:'a',label:'追查'},{id:'b',label:'交谈'},{id:'c',label:'离开'}],delta:{relationshipChanges:[{id:'ileia',attitude}]}});

test('real missing-name incidents: update known NPC by canonical id without another model call',()=>{
  const before=state();
  for(const attitude of ['好奇','友善']){
    const result=reduceState(before,proposal(attitude),WORLDS[0]);
    assert.equal(result.state.relationships.length,1);
    assert.deepEqual(result.state.relationships[0],{id:'ileia',name:'伊莱娅·灰帆',role:'独立寻核人',attitude});
    assert.match(result.changes[0],/伊莱娅·灰帆/);
  }
  assert.equal(before.relationships[0].attitude,'戒备');
  assert.match(deltaContractText(WORLDS[0]),/已有NPC可用现有id和attitude/);
});

test('unknown NPC still requires a real name; id-only data cannot create an unnamed character',()=>{
  const value=proposal('好奇');value.delta.relationshipChanges[0].id='unknown-person';
  assert.throws(()=>reduceState(state(),value,WORLDS[0]),{code:'INVALID_DELTA'});
});
