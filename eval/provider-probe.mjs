import { createAcpRoleAdapter } from '../src/acp/role-adapter.js';
import { loadConfig } from '../src/config.js';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const config = loadConfig();
const start = performance.now();
const evidence = { name: 'native-node-provider-probe', startedAt: new Date().toISOString(), model: config.narratorModel, reasoning: config.narratorReasoning, events: [], firstFinalTextMs: null, finalText: '' };
const adapter = createAcpRoleAdapter({ role: 'probe', model: config.narratorModel, reasoningEffort: config.narratorReasoning, workspace: path.join(config.runtimeDir, 'provider-probe-empty'), agentDockUrl: config.agentDockUrl, timeoutMs: 90000 });
try {
  const result = await adapter.run('This is a transport probe, not gameplay. Do not use tools, read files, or run commands. Return only this JSON object: {"ok":true,"probe":"tgn-live-native-node"}', {
    onText(text) { if (evidence.firstFinalTextMs === null) evidence.firstFinalTextMs = performance.now() - start; evidence.finalText += text; },
    onEvent(event) { evidence.events.push({ ...event, observedMs: performance.now() - start }); },
  });
  const parsed = JSON.parse(result.text.trim());
  if (parsed.ok !== true || parsed.probe !== 'tgn-live-native-node') throw new Error('Unexpected actual provider probe answer');
  evidence.result = result;
  evidence.status = 'passed';
} catch (error) {
  evidence.status = 'failed';
  evidence.error = { code: error.code || null, message: error.message };
  process.exitCode = 1;
} finally {
  evidence.totalMs = performance.now() - start;
  evidence.endedAt = new Date().toISOString();
  await mkdir('artifacts/bootstrap', { recursive: true });
  await writeFile('artifacts/bootstrap/native-provider-probe.json', JSON.stringify(evidence, null, 2), 'utf8');
  console.log(JSON.stringify(evidence));
}
