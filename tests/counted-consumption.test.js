import test from 'node:test';
import assert from 'node:assert/strict';
import { reduceState } from '../src/reducer.js';
import { createSeedState, WORLDS } from '../src/worlds.js';

// Real shape: masked-tides turn 8 consumed one of two root bundles.
// A packet's partial contents are not additional inventory units.
const world = WORLDS[0];
const seed = () => ({ ...createSeedState(world, world.powers[0]), inventory: [
  { id: 'bitter-root', name: '苦叶根', description: '两束苦叶根', qty: 2 },
] });
const proposal = ops => ({ narrative: '用掉一束苦叶根，余下一束收好。',
  choices: ['a', 'b', 'c'].map(id => ({ id, label: id })), delta: { inventoryOps: ops } });

test('counted bundle consumption updates the authoritative quantity, not just prose', () => {
  const before = seed();
  const result = reduceState(before, proposal([{ op: 'update', id: 'bitter-root', qty: 1, description: '剩下一束苦叶根' }]), world);
  assert.equal(result.state.inventory[0].qty, 1);
  assert.equal(before.inventory[0].qty, 2, 'reducer must remain atomic');
  assert.throws(() => reduceState(result.state, proposal([{ op: 'remove', id: 'bitter-root', qty: 2 }]), world), { code: 'REJECTED_DELTA' });
  assert.equal(reduceState(result.state, proposal([{ op: 'remove', id: 'bitter-root', qty: 1 }]), world).state.inventory.length, 0);
});

test('descriptive update without qty preserves the count of a partially used packet', () => {
  const before = seed(); before.inventory[0].qty = 1;
  const result = reduceState(before, proposal([{ op: 'update', id: 'bitter-root', description: '这一束剩下大半' }]), world);
  assert.equal(result.state.inventory[0].qty, 1);
});

test('update cannot create more units; additions require an explicit acquisition', () => {
  assert.throws(() => reduceState(seed(), proposal([{ op: 'update', id: 'bitter-root', qty: 3, description: '三束' }]), world), { code: 'REJECTED_DELTA' });
});
