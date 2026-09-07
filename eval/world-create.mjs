import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [label, promptFile] = process.argv.slice(2);
if (!label || !promptFile || !/^[a-zA-Z0-9_-]+$/.test(label)) throw new Error('Usage: node eval/world-create.mjs <new-label> <prompt-text-file>');
const base = process.env.TGN_TEST_BASE_URL || 'http://127.0.0.1:4317';
const output = path.join(root, 'artifacts', 'eval', label);
await fs.mkdir(output);
const prompt = (await fs.readFile(path.resolve(root, promptFile), 'utf8')).replace(/^\uFEFF/, '').trim();
const requestId = randomUUID();
const events = [];
const manifest = { label, mode: 'real-acp-world-creation', prompt, requestId, base, taskId: process.env.AGENTDOCK_TASK_ID || null, startedAt: new Date().toISOString(), health: await (await fetch(`${base}/api/health`)).json(), status: 'running' };
const start = performance.now();
try {
  const response = await fetch(`${base}/api/worlds/custom`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, requestId }), signal: AbortSignal.timeout(150000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  let buffer = ''; let done; let error;
  const decoder = new TextDecoder();
  const parse = () => {
    let index;
    while ((index = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, index); buffer = buffer.slice(index + 2);
      const name = frame.match(/^event: (.+)$/m)?.[1]; const dataLine = frame.match(/^data: (.+)$/m)?.[1];
      if (!name || !dataLine) continue;
      const data = JSON.parse(dataLine); const entry = { atMs: performance.now() - start, name, data };
      events.push(entry);
      if (name === 'stage') console.log(JSON.stringify({ event: 'stage', label, ...data, clientMs: entry.atMs }));
      if (name === 'complete') done = data;
      if (name === 'error') error = data;
    }
  };
  for await (const chunk of response.body) { buffer += decoder.decode(chunk, { stream: true }); parse(); }
  buffer += decoder.decode(); parse();
  if (!done) throw new Error(error ? `${error.code}: ${error.message}` : 'Stream ended without a complete world');
  manifest.elapsedMs = performance.now() - start; manifest.status = 'complete'; manifest.worldId = done.world.id; manifest.metrics = done.metrics;
  await fs.writeFile(path.join(output, 'world.json'), JSON.stringify(done.world, null, 2));
  const replayStart = performance.now();
  const replay = await fetch(`${base}/api/worlds/custom`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, requestId }) });
  const replayText = await replay.text();
  if (!replay.ok || !replayText.includes('"idempotentReplay":true') || !replayText.includes(done.world.id)) throw new Error('Completed world request was not replayed correctly');
  manifest.replayElapsedMs = performance.now() - replayStart;
  manifest.replayedSameWorld = true;
  console.log(JSON.stringify({ event: 'world_complete', label, worldId: done.world.id, title: done.world.title, realms: done.world.powerSystem.realms.map(r => r.name), elapsedMs: manifest.elapsedMs, replayElapsedMs: manifest.replayElapsedMs, provider: done.metrics.provider }));
} catch (error) {
  manifest.status = 'failed'; manifest.error = error.message; manifest.elapsedMs = performance.now() - start; process.exitCode = 1;
  console.error(JSON.stringify({ event: 'world_failed', label, ...manifest }));
} finally {
  manifest.endedAt = new Date().toISOString();
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(output, 'events.json'), JSON.stringify(events, null, 2));
}
