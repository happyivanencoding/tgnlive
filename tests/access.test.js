import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createRequestGuard } from '../src/access.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const remote = { publicUrl: 'https://live.example.com', teamDomain: 'test.cloudflareaccess.com', audience: 'live-only', ownerEmail: 'owner@example.com' };
const now = Date.now();
const claims = { iss: `https://${remote.teamDomain}`, aud: [remote.audience], email: remote.ownerEmail, exp: now / 1000 + 60, nbf: now / 1000 - 60 };
function token(overrides = {}, headerOverrides = {}, key = privateKey) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test', ...headerOverrides })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...claims, ...overrides })).toString('base64url');
  return `${header}.${body}.${sign('RSA-SHA256', Buffer.from(`${header}.${body}`), key).toString('base64url')}`;
}
function guard() { return createRequestGuard(remote, { now: () => now, fetchKeys: async () => ({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'test' }] }) }); }
function request(headers = {}, method = 'GET') { return { method, headers: { host: 'live.example.com', 'cf-access-jwt-assertion': token(), ...headers } }; }

test('remote signed owner can read and mutate with exact HTTPS origin', async () => {
  const check = guard();
  await check(request());
  await check(request({ origin: remote.publicUrl }, 'POST'));
  await assert.rejects(check(request({}, 'POST')), { code: 'CROSS_ORIGIN_MUTATION' });
  await assert.rejects(check(request({ origin: 'https://evil.example.com' }, 'POST')), { code: 'CROSS_ORIGIN_MUTATION' });
});
test('remote rejects missing, forged, expired, wrong-app and wrong-owner assertions', async () => {
  const check = guard();
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
  for (const assertion of [undefined, 'invalid', token({ exp: 0 }), token({ aud: ['diary'] }), token({ email: 'other@example.com' }), token({ iss: 'https://evil.example' }), token({ nbf: now / 1000 + 300 }), token({}, { alg: 'none' }), token({}, {}, other.privateKey)]) {
    await assert.rejects(check(request({ 'cf-access-jwt-assertion': assertion })), { code: 'AUTH_REQUIRED' });
  }
});
test('forwarded loopback and alternate hosts cannot bypass Access', async () => {
  const check = guard();
  await check({ method: 'GET', headers: { host: '127.0.0.1:4317' } });
  for (const headers of [{ host: '127.0.0.1:4317', 'x-forwarded-host': 'live.example.com' }, { host: 'localhost:4317', 'cf-connecting-ip': '1.2.3.4' }, { host: 'evil.example.com' }]) {
    await assert.rejects(check({ method: 'GET', headers }), { code: 'INVALID_HOST' });
  }
  await assert.rejects(createRequestGuard(null)(request()), { code: 'INVALID_HOST' });
});
test('key endpoint failure fails closed and shared cache avoids per-request fetch', async () => {
  let count = 0;
  const check = createRequestGuard(remote, { now: () => now, fetchKeys: async () => { count++; return { keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'test' }] }; } });
  await Promise.all([check(request()), check(request())]);
  assert.equal(count, 1);
  await assert.rejects(createRequestGuard(remote, { fetchKeys: async () => { throw new Error('offline'); } })(request()), { code: 'AUTH_REQUIRED' });
});
