import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS, createSeedState } from '../src/worlds.js';
import { reduceState } from '../src/reducer.js';
import { openingOrientation } from '../src/opening-plan.js';
import { buildNarratorPrompt } from '../src/prompts.js';
import { growthHorizon } from '../src/progression.js';

const world = WORLDS.find(w => w.id === 'sky-beast-isles');
const seed = () => createSeedState(world, world.powers.find(p => p.id === 'shared-sky-eye'));
const proposal = delta => ({ narrative: '持续的双向协作已经稳定。沈舟正式成为缚风学徒。',
  choices: ['a', 'b', 'c'].map(id => ({ id, label: id })), delta });

test('explicit adjacent Canon attainment is not rejected by an unrelated progress threshold', () => {
  const before = seed(); before.realm.progress = 30; before.turnNumber = 16;
  before.capabilities.push({ id: 'cooperative-flight', name: '双向协作飞行', description: '与自愿的镜翅兽稳定共享视野，双方互相调整飞行，并可反复短途跨越岛缝。' });
  const after = reduceState(before, proposal({ realmAdvance: world.powerSystem.realms[1].name }), world).state;
  assert.equal(after.realm.rank, 1);
  assert.equal(after.realm.progress, 0);
  assert.equal(before.realm.rank, 0);
  assert.equal(after.capabilities.find(c => c.id === 'realm-1').description, world.powerSystem.realms[1].benchmark, 'physical milestone is not an automatic grant of social rights');
});

test('progress, repeated turns and one unusual capability do not cause automatic advancement', () => {
  const before = seed(); before.realm.progress = 100; before.turnNumber = 39;
  assert.equal(reduceState(before, proposal({}), world).state.realm.rank, 0);
});

test('realm proposals still reject skipping, foreign names, and translating snapshot identities', () => {
  for (const realmAdvance of [world.powerSystem.realms[2].name, '引气一层', 'Wind Apprentice']) {
    assert.throws(() => reduceState(seed(), proposal({ realmAdvance }), world), { code: 'REJECTED_DELTA' });
  }
});

test('reader coordinates project existing public authority and only the immediate next tier', () => {
  const state = seed(); const result = openingOrientation(world, state);
  assert.equal(result.world, world.description); assert.equal(result.power, world.powerSystem.summary);
  assert.deepEqual(result.current, world.powerSystem.realms[0]); assert.deepEqual(result.next, world.powerSystem.realms[1]);
  assert.deepEqual(result.advantage, state.power);
  assert.ok(!('npcMoves' in result), 'public orientation must not be a hidden intentions feed');
  assert.deepEqual(growthHorizon(world, state, null).powerIdentity.next, result.next);
});

test('opening fact release is first-turn only; later turns retain live power coordinates', () => {
  const state = seed(); const game = { name: '沈舟', version: 0, state, turns: [] };
  assert.match(buildNarratorPrompt({ game, world, action: '开始', plan: null }), /开局公共坐标/);
  state.turnNumber = 1;
  const next = buildNarratorPrompt({ game, world, action: '继续', plan: null });
  assert.doesNotMatch(next, /开局公共坐标/);
  assert.match(next, /powerIdentity/);
});
