import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Summarize only the explicitly created acceptance save and whitelisted timing fields.
// Raw narrative, account credentials, provider content and phone serial never enter the report.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dir = path.join(root, '.runtime/android/physical-20260907');
const gameId = 'game_a943b8e8080644c0835a646a1c2bf109';
const timingFiles = fs.readdirSync(dir).filter(name => /-timing\.jsonl$/.test(name));
const records = new Map();
for (const name of timingFiles) {
  const lines = fs.readFileSync(path.join(dir, name), 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const row = JSON.parse(line);
    if (row.gameId !== gameId || !row.interactionId) continue;
    const prior = records.get(row.interactionId);
    if (!prior || Object.keys(row).length >= Object.keys(prior).length) records.set(row.interactionId, row);
  }
}
const game = await fetch(`http://127.0.0.1:4317/api/games/${gameId}`, {signal: AbortSignal.timeout(10000)}).then(r => {
  if (!r.ok) throw new Error(`Read-only save verification failed: ${r.status}`);
  return r.json();
});
const metrics = await fetch(`http://127.0.0.1:4317/api/games/${gameId}/metrics`, {signal: AbortSignal.timeout(10000)}).then(r => r.json());
const traces = new Map((metrics.turns || []).map(trace => [trace.requestId, trace]));
const measured = [...records.values()].sort((a,b) => a.tap-b.tap).map(row => {
  const delta = key => Number.isFinite(row[key]) ? row[key]-row.tap : null;
  const gap = (first, last) => Number.isFinite(row[first]) && Number.isFinite(row[last]) ? row[last]-row[first] : null;
  const trace = traces.get(row.requestId);
  return {
    interactionId: row.interactionId, requestId: row.requestId, turn: row.turn, outcome: row.outcome,
    tapToFeedbackMs: delta('feedbackFrame'), tapToFirstSseMs: delta('firstSSE'),
    tapToFirstVisibleNarrativeMs: delta('firstVisibleNarrativeFrame'), tapToLastVisibleNarrativeMs: delta('lastNarrativePaint'),
    tapToNarrativeEndSignalMs: delta('narrativeEndSignal'), tapToCompleteMs: delta('complete'),
    tapToChoicesVisibleMs: delta('choicesReady'), tapToInputReadyMs: delta('inputReady'),
    tapToDraftReadyMs: delta('draftReady'), visibleNarrativeToDraftGapMs: gap('lastNarrativePaint','draftReady'),
    visibleNarrativeToInputGapMs: gap('lastNarrativePaint','inputReady'), commitToInputMs: gap('complete','inputReady'),
    serverTotalMs: trace?.totalElapsedMs ?? null, serverNarrativeEndMs: trace?.narrativeCompleteMs ?? null,
    serverRepairAttempts: trace?.repairAttempts ?? null,
  };
});
const checks = {};
for (const name of fs.readdirSync(dir).filter(name => /(?:physical|controls-pass\d+|stop-pass\d+|ime-pass\d+|resume-pass\d+|draft-pass\d+)\.log$/.test(name))) {
  const log = fs.readFileSync(path.join(dir,name), 'utf8');
  checks[name] = /OK \(1 test\)/.test(log) ? 'PASS' : /FAILURES!!!|INSTRUMENTATION_FAILED|ClassNotFoundException/.test(log) ? 'FAILED_RETAINED' : 'INCOMPLETE';
}
const result = {
  scope: 'PHYSICAL_ANDROID_REAL_PRODUCTION_NOT_FIXTURE', observedAt: new Date().toISOString(),
  appVersion: '0.9.0-android.3', versionCode: 9003,
  device: {manufacturer:'Samsung',model:'SM-S928U1',android:'16',api:36,physicalPixels:'1440x3120',densityDpi:600,initialSystemFontScale:0.8},
  endpoint:'https://live.thegreatnovel.com', auth:'EXISTING_LAWFUL_OWNER_SESSION_USED_FRESH_BROWSER_LOGIN_NOT_RETESTED',
  acceptanceSave: {gameId, version:game.game.version, canonicalTurns:game.game.turns.length},
  serverTraceCounts: Object.fromEntries(['complete','cancelled','failed'].map(status => [status,(metrics.turns||[]).filter(row=>row.status===status).length])),
  checks, timings:measured,
  measurementNotes: [
    'Client times use Android elapsedRealtime; last glyph must be in the reader viewport for two real frames.',
    'Compose test virtual time is not used by the accepted PhysicalDeviceJourneyTest.',
    'A narrative_end event is provisional; only complete confirms Canon and permits the next submission.',
    'Version9003 exposes a single draft editor automatically at narrative_end; draftReady is editability, inputReady is commit-authorized sending.',
    'Version9003 draft/input frame probes require >=44dp visible height for two frames; previous version measurements used intersection only.',
    'Historical absent timing fields remain null; provider repair can replace provisional prose.',
    'Different actions/output lengths and the v0.9 core update prevent a controlled speedup claim.',
    'Scripted physical touch/keyboard geometry does not prove human haptic feel, fatigue or 120Hz comfort.',
  ],
};
const target = path.join(root, 'artifacts/reports/android-native-v090-physical');
fs.mkdirSync(target,{recursive:true});
fs.writeFileSync(path.join(target,'MEASUREMENTS.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({canonicalTurns:result.acceptanceSave.canonicalTurns,checks:result.checks,measuredSuccessfulTurns:measured.filter(r=>r.outcome==='complete').length}));
