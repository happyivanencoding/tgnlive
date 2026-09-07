import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Explicit READ-ONLY integration evidence. It never submits actions or modifies existing saves.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const base = 'http://127.0.0.1:4317';
const output = path.join(root, '.runtime/android/contract/live-snapshot.json');
async function get(route) {
  const result = await fetch(base + route, {redirect: 'error', signal: AbortSignal.timeout(15000)});
  if (!result.ok || !result.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`Read-only contract HTTP failure: ${result.status}`);
  }
  return result.json();
}
const health = await get('/api/health');
const shelf = await get('/api/games');
const snapshot = {
  kind: 'READ_ONLY_LIVE_BACKEND_CONTRACT_NOT_ANDROID_UI_PLAY',
  capturedAt: new Date().toISOString(),
  backendVersion: health.version,
  worlds: {},
  shelf,
  games: [],
};
for (const language of ['zh', 'en', 'fr', 'es', 'ar']) {
  snapshot.worlds[language] = await get('/api/worlds?language=' + language);
}
for (const save of shelf.games.slice(0, 100)) {
  if (!/^[a-zA-Z0-9_-]+$/.test(save.id)) throw new Error('Unexpected game ID format');
  snapshot.games.push(await get('/api/games/' + save.id));
}
fs.mkdirSync(path.dirname(output), {recursive: true});
fs.writeFileSync(output, JSON.stringify(snapshot));
console.log(JSON.stringify({kind: snapshot.kind, capturedAt: snapshot.capturedAt, backendVersion: snapshot.backendVersion,
  saves: snapshot.games.length, turns: snapshot.games.reduce((n, game) => n + (game.game?.turns?.length ?? 0), 0),
  worldCounts: Object.fromEntries(Object.entries(snapshot.worlds).map(([lang, result]) => [lang, result.worlds?.length ?? 0])), mutations: 0}));
// Private narrative data remains ignored under .runtime. Never attach the raw snapshot to reports/Git.
