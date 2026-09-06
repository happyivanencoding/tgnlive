import { readFile, writeFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import assert from 'node:assert/strict';
const exec = promisify(execFile);
const oldMeta = JSON.parse(await readFile('artifacts/eval/baseline-v010/player-02.meta.json', 'utf8'));
const argsPath = path.resolve('artifacts/bootstrap/utf8-recovery-args.json');
await writeFile(argsPath, JSON.stringify({ action: 'events', run_id: oldMeta.runId, after_seq: 0, limit: 200, wait_ms: 0 }), 'utf8');
try {
  const { stdout } = await exec('pwsh.exe', ['-NoProfile', '-NonInteractive', '-File', path.resolve('tools/agentdock-rpc.ps1'), '-ToolName', 'acp_prompt', '-ArgsPath', argsPath], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 30000, windowsHide: true });
  assert.ok(!stdout.includes('\uFFFD'), 'UTF-8 replacement characters remain');
  const page = JSON.parse(stdout.replace(/^\uFEFF/, '').trim());
  assert.equal(page.truncated, false);
  const text = (page.events || []).filter(e => e.type === 'agent_message_chunk' && (!e.update?._meta?.codex?.phase || e.update._meta.codex.phase === 'final_answer')).map(e => e.update.content?.text || '').join('');
  const recovered = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  assert.match(recovered.action, /[\u4e00-\u9fff]/);
  const oldText = await readFile('artifacts/eval/baseline-v010/player-02.final.txt', 'utf8');
  const evidence = { verifiedAt: new Date().toISOString(), sameActualAcpRun: oldMeta.runId, originalReplacementCount: [...oldText].filter(c => c === '\uFFFD').length, recoveredReplacementCount: [...text].filter(c => c === '\uFFFD').length, recovered, passed: true, explanation: 'Recovered the identical original ACP answer after fixing PowerShell stdout encoding, not a new model sample.' };
  await writeFile('artifacts/bootstrap/utf8-verification.json', JSON.stringify(evidence, null, 2), 'utf8');
  console.log(JSON.stringify(evidence));
} finally { await rm(argsPath, { force: true }); }
