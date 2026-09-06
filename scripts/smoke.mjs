import assert from "node:assert/strict";

const base = process.env.TGN_BASE_URL || "http://127.0.0.1:4317";
const healthResponse = await fetch(`${base}/api/health`);
assert.equal(healthResponse.status, 200);
const health = await healthResponse.json();
assert.equal(health.ok, true);

const worldsResponse = await fetch(`${base}/api/worlds`);
assert.equal(worldsResponse.status, 200);
const worlds = await worldsResponse.json();
assert.equal(worlds.worlds.length, 1);
assert.equal(worlds.worlds[0].powers.length, 3);

process.stdout.write(JSON.stringify({ ok: true, base, provider: health.provider, worlds: worlds.worlds.length }) + "\n");
