import { createPublicKey, verify } from 'node:crypto';
import { AppError } from './errors.js';

const localHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
const denied = () => new AppError('登录已过期，请重新登录后继续。', { code: 'AUTH_REQUIRED', status: 401 });

export function createRequestGuard(remote, { fetchKeys = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'error' });
  if (!response.ok) throw denied();
  return response.json();
}, now = () => Date.now() } = {}) {
  let keys = [], fetchedAt = 0, pending;
  let publicUrl;
  if (remote) {
    publicUrl = new URL(remote.publicUrl);
    if (publicUrl.protocol !== 'https:' || publicUrl.origin !== remote.publicUrl ||
        !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(remote.teamDomain) || !remote.audience || !remote.ownerEmail) {
      throw new Error('Invalid remote Access configuration');
    }
  }
  async function validateToken(token) {
    try {
      if (typeof token !== 'string' || token.length > 16384) throw denied();
      const parts = token.split('.');
      if (parts.length !== 3) throw denied();
      const header = JSON.parse(Buffer.from(parts[0], 'base64url'));
      const claims = JSON.parse(Buffer.from(parts[1], 'base64url'));
      const seconds = now() / 1000;
      if (header.alg !== 'RS256' || typeof header.kid !== 'string' ||
          claims.iss !== `https://${remote.teamDomain}` ||
          !(Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(remote.audience) ||
          !Number.isFinite(claims.exp) || claims.exp <= seconds ||
          (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > seconds + 30)) ||
          typeof claims.email !== 'string' || claims.email.toLowerCase() !== remote.ownerEmail.toLowerCase()) throw denied();
      if (!fetchedAt || now() - fetchedAt > 300000) {
        pending ||= fetchKeys(`https://${remote.teamDomain}/cdn-cgi/access/certs`).then((jwks) => {
          if (!Array.isArray(jwks.keys)) throw denied();
          keys = jwks.keys; fetchedAt = now();
        }).finally(() => { pending = null; });
        await pending;
      }
      const jwk = keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
      if (!jwk || !verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`),
        createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(parts[2], 'base64url'))) throw denied();
    } catch { throw denied(); }
  }
  return async (request) => {
    const host = request.headers.host || '';
    let parsed;
    try { parsed = new URL(`http://${host}`); } catch { throw new AppError('Host 无效', { code: 'INVALID_HOST', status: 403 }); }
    if (parsed.host !== host || parsed.username || parsed.password) throw new AppError('Host 无效', { code: 'INVALID_HOST', status: 403 });
    const forwarded = Object.keys(request.headers).some((key) => key.startsWith('cf-') || key.startsWith('x-forwarded-') || key === 'forwarded');
    const local = localHosts.has(parsed.hostname) && !forwarded;
    if (!local) {
      if (!remote || host !== publicUrl.host) throw new AppError('Host 未获授权', { code: 'INVALID_HOST', status: 403 });
      await validateToken(request.headers['cf-access-jwt-assertion']);
    }
    if (request.method === 'GET' || request.method === 'HEAD') return;
    const origin = request.headers.origin;
    const expected = local ? `http://${host}` : publicUrl.origin;
    if ((!local && !origin) || (origin && origin !== expected) || request.headers['sec-fetch-site'] === 'cross-site') {
      throw new AppError('拒绝跨来源写入', { code: 'CROSS_ORIGIN_MUTATION', status: 403 });
    }
  };
}
