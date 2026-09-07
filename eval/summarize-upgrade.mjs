import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const labels = process.argv.slice(2);
if (!labels.length) throw new Error('Usage: node eval/summarize-upgrade.mjs <completed-play-label> [...]');
const read = async p => JSON.parse((await fs.readFile(p, 'utf8')).replace(/^\uFEFF/, ''));
const stats = values => {
  const xs = values.filter(Number.isFinite).sort((a, b) => a - b);
  return { count: xs.length, meanMs: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null, minMs: xs[0] ?? null, maxMs: xs.at(-1) ?? null };
};
const result = { generatedAt: new Date().toISOString(), units: 'milliseconds unless table explicitly says seconds', notes: ['Only actual completed gameplay requests contribute to successful-turn means; failures remain separately visible.', 'ACP setup is a nested span inside generation/planning, not an additional additive latency.', 'World creation is not included in gameplay latency; consult each world creation evidence separately.', 'Player decision time is separate from app latency. These small non-random samples are not a production latency guarantee.'], runs: [] };
for (const label of labels) {
  const dir = path.join(root, 'artifacts', 'eval', label);
  const [manifest, summary, metrics, finalGame] = await Promise.all(['manifest.json', 'summary.json', 'server-metrics.json', 'final-game.json'].map(f => read(path.join(dir, f))));
  const records = (await fs.readFile(path.join(dir, 'turns.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(x => JSON.parse(x));
  const success = metrics.turns.filter(t => t.status === 'complete');
  const stageNames = [...new Set(metrics.turns.flatMap(t => t.stages.map(s => s.name)))];
  const stages = Object.fromEntries(stageNames.map(name => [name, stats(success.flatMap(t => t.stages.filter(s => s.name === name && s.status === 'complete').map(s => s.elapsedMs)))]));
  const turns = records.map(r => {
    const trace = metrics.turns.find(t => t.requestId === r.requestId);
    return { index: r.index, outcome: r.outcome, actionSource: r.actionSource, firstNarrativeMs: r.client?.firstNarrativeMs ?? null, completeMs: r.client?.completeMs ?? null, playerDecisionMs: r.player?.totalMs ?? null, beforeRealm: r.beforeState?.realm ?? null, afterRealm: r.afterState?.realm ?? null, error: r.error || null, traceId: trace?.id ?? null, stages: trace?.stages ?? [], provider: trace?.provider ?? null, promptChars: trace?.promptChars ?? null, outputChars: trace?.outputChars ?? null, repairAttempts: trace?.repairAttempts ?? null };
  });
  result.runs.push({ label, version: manifest.app.version, mode: manifest.mode, worldId: manifest.selectedWorld, powerId: manifest.selectedPower, gameId: manifest.gameId, codeRevision: manifest.codeRevision, workingTreeChanges: manifest.workingTreeChanges ?? null, startedAt: summary.startedAt, endedAt: summary.endedAt, successful: summary.completedTurns, attempted: summary.attemptedTurns, failed: summary.failedTurns, fatal: summary.fatal, firstNarrative: summary.firstNarrative, completion: summary.completion, playerDecision: summary.playerDecision, stages, repairs: stats(success.map(t => t.repairAttempts)), promptChars: success.map(t => t.promptChars), finalState: finalGame.state, turns });
}
const out = path.join(root, 'artifacts', 'reports', 'v060');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'measurements.json'), JSON.stringify(result, null, 2));
const sec = n => Number.isFinite(n) ? (n / 1000).toFixed(2) : '—';
let md = '# TGN Live 手机/多世界升级实测\n\n';
md += '| 测试 | 版本 | 模式 | 成功/尝试 | 首段均值（秒） | 完成均值（秒） |\n|---|---|---|---:|---:|---:|\n';
for (const r of result.runs) md += `| ${r.label} | ${r.version} | ${r.mode} | ${r.successful}/${r.attempted} | ${sec(r.firstNarrative.meanMs)} | ${sec(r.completion.meanMs)} |\n`;
md += '\n## 阶段拆分\n\n均值单位毫秒；规划等未触发阶段为无样本，不是耗时0。ACP设置内含在模型阶段，不能重复相加。\n';
for (const r of result.runs) {
  md += `\n### ${r.label}\n\n| 阶段 | 成功样本数 | 均值ms | 最小ms | 最大ms |\n|---|---:|---:|---:|---:|\n`;
  for (const [stage, s] of Object.entries(r.stages)) md += `| ${stage} | ${s.count} | ${s.meanMs === null ? '—' : s.meanMs.toFixed(1)} | ${s.minMs ?? '—'} | ${s.maxMs ?? '—'} |\n`;
  md += `\n实际境界轨迹：${r.turns.map(t => `${t.index}: ${t.afterRealm?.name || '未提交'} ${t.afterRealm?.progress ?? ''}`).join(' → ')}。\n`;
  if (r.fatal) md += `\n失败：${r.fatal}\n`;
}
md += '\n这些是本机小样本，不是SLA或真人留存证明。世界创建耗时独立报告；播放器决策不计入应用等待；缺失成本、账单token、供应商内部排队没有猜测值。模式/动作/题材改变限制因果推论。\n';
await fs.writeFile(path.join(out, 'MEASUREMENTS.md'), md);
console.log(md);
