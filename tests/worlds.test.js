import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { WORLDS, createSeedState, validateWorldDefinition } from '../src/worlds.js';
import { reduceState } from '../src/reducer.js';
import { GameStore } from '../src/store.js';
import { WorldForge } from '../src/world-forge.js';
import { createTgnLive } from '../src/index.js';
import { buildNarratorPrompt, buildRepairPrompt } from '../src/prompts.js';

const choices = ['a', 'b', 'c'].map(id => ({ id, label: `行动${id}` }));
const proposal = delta => ({ narrative: '这次练习完成了，人物试出了新动作。', choices, delta });

for (const world of WORLDS) {
  test(`${world.id}: seed and breakthrough use its own authority`, () => {
    const state = createSeedState(world, world.powers[0]);
    assert.equal(state.worldId, world.id);
    assert.equal(state.location, world.opening.location);
    assert.deepEqual(state.inventory, world.seed.inventory);
    assert.equal(state.realm.name, world.powerSystem.realms[0].name);
    state.realm.progress = 90;
    const next = reduceState(state, proposal({ realmProgressDelta: 10, realmAdvance: world.powerSystem.realms[1].name }), world);
    assert.equal(next.state.realm.name, world.powerSystem.realms[1].name);
    assert.equal(next.state.realm.rank, 1);
    assert.equal(state.realm.rank, 0, 'reducer must not mutate input');
    assert.ok(next.state.capabilities.some(c => c.description === world.powerSystem.realms[1].unlock));
  });
}

test('magic world cannot advance into a cinder-river realm or import cinder scene instructions', () => {
  const world = WORLDS.find(w => w.id === 'ashen-star-covenant');
  const state = createSeedState(world, world.powers[0]); state.realm.progress = 100;
  assert.throws(() => reduceState(state, proposal({ realmAdvance: '引气一层' }), world), { code: 'REJECTED_DELTA' });
  const game = { name: '林远', version: 0, state, turns: [] };
  for (const prompt of [buildNarratorPrompt({ game, world, action: '开始' }), buildRepairPrompt({ game, world, action: '开始', invalidOutput: '{}', reason: 'test' })]) {
    assert.match(prompt, /一环法徒/);
    assert.doesNotMatch(prompt, /烬河|沈秋禾|韩峥|强拉回药铺|铜钱不能读取远处药柜/);
  }
});

test('learned capabilities persist and improve without being re-awarded', () => {
  const world = WORLDS[0]; const state = createSeedState(world, world.powers[0]);
  const gained = reduceState(state, proposal({ capabilityOps: [{ op: 'add', id: 'steady-breath', name: '稳息', description: '移动十步仍能留住气息，但奔跑时会散。', source: '完整练习' }] }), world);
  assert.ok(gained.changes.some(c => c.includes('稳息')));
  const improved = reduceState(gained.state, proposal({ capabilityOps: [{ op: 'improve', id: 'steady-breath', name: '稳息', description: '行走百步仍能留住气息，奔跑时仍会散。' }] }), world);
  assert.equal(improved.state.capabilities.filter(c => c.id === 'steady-breath').length, 1);
  assert.throws(() => reduceState(state, proposal({ capabilityOps: [{ op: 'improve', id: 'unearned', name: '未获得', description: '还没有通过任何事件获得的能力。' }] }), world), { code: 'REJECTED_DELTA' });
});

test('new game snapshot survives catalogue edits; old game canon stays unchanged', () => {
  const store = new GameStore(':memory:');
  try {
    const world = structuredClone(WORLDS[2]);
    const game = store.createGame({ name: '林远', title: '原世界', worldId: world.id, powerId: world.powers[0].id, state: createSeedState(world, world.powers[0]), world });
    const originalTitle = world.title; world.title = '改动后的目录'; world.powerSystem.realms[0].name = '错误改名';
    assert.equal(store.getGameWorld(game.id).title, originalTitle);
    assert.notEqual(store.getGameWorld(game.id).powerSystem.realms[0].name, '错误改名');
    assert.equal(store.getGame(game.id).world.opening, undefined);
    assert.equal(store.getGame(game.id).world.seed, undefined);
    const oldState = createSeedState(WORLDS[0], WORLDS[0].powers[0]);
    delete oldState.worldId; delete oldState.currencyName; delete oldState.capabilities;
    const old = store.createGame({ name: '旧档', title: '旧档', worldId: 'cinder-river', powerId: 'ember-hearing', state: oldState, world: null });
    assert.deepEqual(store.getGame(old.id).state, oldState);
    assert.equal(store.getGameWorld(old.id).id, 'cinder-river');
  } finally { store.close(); }
});

test('custom definitions and request results survive reopening SQLite', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'tgn-live-world-'));
  const file = path.join(dir, 'test.sqlite'); let store = new GameStore(file);
  try {
    const world = validateWorldDefinition(WORLDS[2], { id: 'world-persistence-test', createdAt: new Date().toISOString(), custom: true });
    store.saveWorld({ world, requestId: 'request-persistent-world', prompt: '星光魔法' });
    store.saveWorldMetrics(world.id, { totalElapsedMs: 123 });
    store.close(); store = new GameStore(file);
    assert.deepEqual(store.getWorld(world.id), world);
    assert.equal(store.getWorldRequest('request-persistent-world').metrics.totalElapsedMs, 123);
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('world validation rejects unusable power paths and labels fan creation honestly', () => {
  const bad = structuredClone(WORLDS[2]); bad.powerSystem.realms[2].rank = 7;
  assert.throws(() => validateWorldDefinition(bad), { code: 'INVALID_WORLD' });
  const fan = validateWorldDefinition({ ...WORLDS[3], sourceLabel: '非官方同人灵感' }, { id: 'world-fan-test', custom: true });
  assert.match(fan.sourceLabel, /非官方同人/);
});

async function runtimeFor(worldForge) {
  const runtime = createTgnLive({ configOverrides: { databasePath: ':memory:', port: 0, remote: null }, worldForge });
  await new Promise(resolve => runtime.server.listen(0, '127.0.0.1', resolve));
  return { runtime, base: `http://127.0.0.1:${runtime.server.address().port}` };
}
async function close(runtime) { runtime.server.closeAllConnections(); await new Promise(resolve => runtime.server.close(resolve)); runtime.store.close(); }
const post = (base, body) => fetch(`${base}/api/worlds/custom`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
function completed(text) { const frame = text.split('\n\n').find(x => x.startsWith('event: complete')); assert.ok(frame, text); return JSON.parse(frame.split('\ndata: ')[1]); }

test('custom world API persists one real service result and replays without another provider call (fixture)', async () => {
  let calls = 0;
  const adapter = { model: 'fixture-only', reasoningEffort: 'none', async run(prompt, { onText }) { calls++; assert.match(prompt, /星光魔法/); const text = JSON.stringify(WORLDS[2]); onText?.(text); return { text, sessionId: 'fixture-session', runId: 'fixture-run' }; } };
  const { runtime, base } = await runtimeFor(new WorldForge({ adapter }));
  try {
    const body = { prompt: '星光魔法', requestId: 'request-forge-one' };
    const first = completed(await (await post(base, body)).text());
    assert.match(first.world.id, /^world-/); assert.equal(first.world.seed, undefined); assert.equal(first.world.opening, undefined);
    assert.equal(first.metrics.provider.world.sessionId, 'fixture-session');
    const second = completed(await (await post(base, body)).text());
    assert.equal(second.world.id, first.world.id); assert.equal(second.idempotentReplay, true); assert.equal(calls, 1);
    assert.equal((await post(base, { ...body, prompt: '不同世界' })).status, 409); assert.equal(calls, 1);
    const created = await fetch(`${base}/api/games`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '林远', worldId: first.world.id, powerId: first.world.powers[0].id }) });
    assert.equal(created.status, 201); const { game } = await created.json();
    assert.equal(game.state.realm.name, first.world.powerSystem.realms[0].name);
    assert.equal(runtime.store.getGameWorld(game.id).id, first.world.id);
    assert.equal((await post(base, { prompt: '字'.repeat(2001), requestId: 'request-too-long' })).status, 400); assert.equal(calls, 1);
  } finally { await close(runtime); }
});

test('a malformed generated world reports an error without saving a substitute (fixture)', async () => {
  const { runtime, base } = await runtimeFor(new WorldForge({ adapter: { model: 'fixture', reasoningEffort: 'none', async run() { return { text: '{"title":"缺少力量规则"}' }; } } }));
  try {
    const text = await (await post(base, { prompt: '测试世界', requestId: 'request-bad-world' })).text();
    assert.match(text, /event: error/); assert.doesNotMatch(text, /event: complete/);
    assert.equal(runtime.store.listWorlds().length, 0);
  } finally { await close(runtime); }
});

test('aborting a pending world cancels generation and never commits a world (fixture)', { timeout: 5000 }, async () => {
  let noticedAbort; const aborted = new Promise(resolve => { noticedAbort = resolve; });
  const worldForge = { async generate({ signal, onStage }) { onStage({ name: 'world_generation', status: 'running', elapsedMs: 0 }); return new Promise((resolve, reject) => { signal.addEventListener('abort', () => { noticedAbort(); reject(signal.reason); }, { once: true }); }); } };
  const { runtime, base } = await runtimeFor(worldForge);
  try {
    const response = await post(base, { prompt: '取消测试', requestId: 'request-cancel-world' });
    await response.body.cancel(); await aborted; await new Promise(resolve => setImmediate(resolve));
    assert.equal(runtime.store.listWorlds().length, 0); assert.equal(runtime.worldInFlight.size, 0);
  } finally { await close(runtime); }
});
