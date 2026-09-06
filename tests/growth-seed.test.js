import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS, createSeedState } from '../src/worlds.js';
test('new seed supplies optional cultivation affordances without granting a free realm or progress',()=>{
  const world=WORLDS[0],state=createSeedState(world,world.powers[0]);
  assert.equal(state.realm.rank,0);assert.equal(state.realm.progress,0);assert.equal(state.coins,18);
  assert.ok(state.facts.some(x=>x.includes('最粗浅的吐纳')));
  assert.match(state.goal,/引气/);assert.match(world.description,/灵雾/);assert.match(world.description,/引气药/);
});
