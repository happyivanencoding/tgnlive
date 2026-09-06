import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [source = 'baseline-v010', label = `protocol-${Date.now()}`] = process.argv.slice(2);
if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(source) || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(label)) throw new Error('Use safe evidence folder labels');
const base = process.env.TGN_TEST_BASE_URL || 'http://127.0.0.1:4317';
const outputDir = path.join(root, 'artifacts', 'eval', label);
await mkdir(outputDir, { recursive: true });
const checks = [];
const result = { mode: 'real-api-protocol-checks', startedAt: new Date().toISOString(), source, label, checks };
const request = async (url, body, headers = {}) => fetch(base + url, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000) });
async function json(url) { const response = await request(url); assert.equal(response.status, 200); return response.json(); }
async function check(name, run) {
  const begin = performance.now();
  try { const detail = await run(); checks.push({ name, passed: true, elapsedMs: performance.now() - begin, detail }); }
  catch (error) { checks.push({ name, passed: false, elapsedMs: performance.now() - begin, error: error.message }); }
  await writeFile(path.join(outputDir, 'result.json'), JSON.stringify(result, null, 2), 'utf8');
}
let gameId;
let latest;
try {
  const rows = (await readFile(path.join(root, 'artifacts', 'eval', source, 'turns.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(x => JSON.parse(x));
  const first = rows.find(x => x.outcome === 'completed');
  assert.ok(first, 'Need one completed real turn to test replay');
  const manifest = JSON.parse(await readFile(path.join(root, 'artifacts', 'eval', source, 'manifest.json'), 'utf8'));
  gameId = manifest.gameId;
  latest = (await json(`/api/games/${gameId}`)).game;
  const originalVersion = latest.version;
  await check('idempotent identical request returns existing turn without a second commit', async () => {
    const response = await request(`/api/games/${gameId}/turns`, { action: first.action, expectedVersion: first.beforeVersion, requestId: first.requestId });
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.match(text, /event: complete/);
    assert.doesNotMatch(text, /event: text/);
    const after = (await json(`/api/games/${gameId}`)).game;
    assert.equal(after.version, originalVersion);
    assert.equal(after.turns.length, latest.turns.length);
    return { version: after.version, noNewNarrativeStream: true };
  });
  await check('same request id with changed body conflicts', async () => {
    const response = await request(`/api/games/${gameId}/turns`, { action: first.action + '，但改成别的行动', expectedVersion: first.beforeVersion, requestId: first.requestId });
    const text = await response.text();
    assert.equal(response.status, 409, text);
    return { status: response.status, body: text };
  });
  await check('stale version rejected and server survives', async () => {
    const response = await request(`/api/games/${gameId}/turns`, { action: '观察周围', expectedVersion: 0, requestId: randomUUID() });
    const text = await response.text();
    assert.equal(response.status, 409, text);
    assert.equal((await json('/api/health')).ok, true);
    return { status: response.status, body: text };
  });
  await check('cross-origin mutation rejected', async () => {
    const { worlds } = await json('/api/worlds');
    const response = await request('/api/games', { name: '跨域测试', worldId: worlds[0].id, powerId: worlds[0].powers[0].id }, { Origin: 'https://untrusted.example' });
    const text = await response.text();
    assert.ok([400, 403].includes(response.status), `Unexpected status ${response.status}: ${text}`);
    return { status: response.status };
  });
  await check('invalid JSON yields 400 without server crash', async () => {
    const response = await fetch(`${base}/api/games/${gameId}/turns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{not-json', signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 400);
    assert.equal((await json('/api/health')).ok, true);
    return { status: response.status };
  });
  await check('canonical state and novel export survive independent reload', async () => {
    const after = (await json(`/api/games/${gameId}`)).game;
    assert.deepEqual(after.state, latest.state);
    assert.equal(after.turns.length, latest.turns.length);
    const response = await request(`/api/games/${gameId}/export?format=md`);
    assert.equal(response.status, 200);
    const text = await response.text();
    for (const t of after.turns) assert.ok(text.includes(t.narrative), `Missing narrative ${t.index} in export`);
    assert.doesNotMatch(text, /TGN_DELTA_JSON/);
    await writeFile(path.join(outputDir, 'verified-export.md'), text, 'utf8');
    return { turns: after.turns.length, chapters: [...new Set(after.turns.map(t => t.chapterIndex))].length, bytes: Buffer.byteLength(text) };
  });
  await check('in-flight second action conflicts; cancelled generation has no commit', async () => {
    const { worlds } = await json('/api/worlds');
    const created = await (await request('/api/games', { name: '取消测试', worldId: worlds[0].id, powerId: worlds[0].powers[0].id })).json();
    const target = created.game;
    const firstResponse = await request(`/api/games/${target.id}/turns`, { action: '开始我的故事', expectedVersion: target.version, requestId: randomUUID() });
    assert.equal(firstResponse.status, 200);
    const consume = firstResponse.text();
    const secondResponse = await request(`/api/games/${target.id}/turns`, { action: '立刻离开', expectedVersion: target.version, requestId: randomUUID() });
    assert.equal(secondResponse.status, 409);
    const cancelResponse = await request(`/api/games/${target.id}/cancel`, {});
    const cancel = await cancelResponse.json();
    assert.equal(cancel.cancelled, true, 'Completion might have won cancellation race; do not claim cancellation');
    const stream = await consume;
    const after = (await json(`/api/games/${target.id}`)).game;
    assert.equal(after.version, target.version);
    assert.deepEqual(after.state, target.state);
    assert.equal(after.turns.length, 0);
    assert.match(stream, /event: error/);
    return { gameId: target.id, secondStatus: secondResponse.status, cancel, version: after.version, acceptedTurns: after.turns.length };
  });
} catch (err) { result.fatal = err.message; }
result.endedAt = new Date().toISOString();
result.passed = !result.fatal && checks.every(x => x.passed);
await writeFile(path.join(outputDir, 'result.json'), JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
