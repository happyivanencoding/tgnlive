import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const checks = [];
async function origin(headers, expected) {
  const status = await new Promise((resolve, reject) => {
    const request = http.get('http://127.0.0.1:4317/api/games', { headers }, (response) => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
    request.on('error', reject);
  });
  assert.equal(status, expected);
  checks.push({ headers: Object.keys(headers), expected, actual: status });
}
await origin({ host: 'live.thegreatnovel.com' }, 401);
await origin({ host: 'live.thegreatnovel.com', 'cf-access-jwt-assertion': 'forged' }, 401);
await origin({ host: '127.0.0.1:4317', 'cf-connecting-ip': '1.2.3.4' }, 403);
await origin({ host: '127.0.0.1:4317' }, 200);
for (const path of ['/', '/api/games']) {
  const response = await fetch(`https://live.thegreatnovel.com${path}`, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 302);
  assert.ok(new URL(response.headers.get('location')).hostname.endsWith('.cloudflareaccess.com'));
  checks.push({ publicPath: path, anonymous: 'login-required', status: response.status });
}
const health = await (await fetch('http://127.0.0.1:4317/api/health')).json();
assert.equal(health.access.mode, 'owner-only');
const result = { at: new Date().toISOString(), version: health.version, checks };
fs.mkdirSync('artifacts/remote-v064', { recursive: true });
fs.writeFileSync('artifacts/remote-v064/boundary.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
