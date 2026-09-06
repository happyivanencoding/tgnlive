import test from "node:test";
import assert from "node:assert/strict";
import { createTgnLive } from "../src/index.js";
import { VALID_NARRATOR_OUTPUT } from "./fixtures/narrator-output.js";

function fakeAdapter(role, output, reasoningEffort) {
  return {
    role,
    model: role === "planner" ? "gpt-5.6-sol" : "gpt-5.6-luna",
    reasoningEffort,
    health: { status: "ready" },
    async run(prompt, { onText, onEvent, signal }) {
      signal?.throwIfAborted();
      onEvent?.({ type: "acp_config_applied", sessionId: `${role}_session`, model: this.model, reasoningEffort, mode: "read-only" });
      onEvent?.({ type: "acp_run_started", sessionId: `${role}_session`, runId: `${role}_run` });
      for (let index = 0; index < output.length; index += 23) onText?.(output.slice(index, index + 23));
      return { text: output, sessionId: `${role}_session`, runId: `${role}_run`, eventTypes: ["agent_message_chunk", "completed"], usage: null };
    },
  };
}

async function startRuntime() {
  const plannerOutput = JSON.stringify({ pressure: "搜查临近", npcMoves: [], openings: [], continuity: [], milestone: "" });
  const runtime = createTgnLive({
    configOverrides: { databasePath: ":memory:", port: 0 },
    narrator: fakeAdapter("narrator", VALID_NARRATOR_OUTPUT, "low"),
    planner: fakeAdapter("planner", plannerOutput, "medium"),
  });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const { port } = runtime.server.address();
  return { runtime, base: `http://127.0.0.1:${port}` };
}

async function stopRuntime(runtime) {
  await new Promise((resolve) => runtime.server.close(resolve));
  runtime.store.close();
}

async function createGame(base) {
  const response = await fetch(`${base}/api/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "林砚", worldId: "cinder-river", powerId: "ember-hearing" }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).game;
}

test("HTTP API streams a committed turn and safely replays idempotency", async () => {
  const { runtime, base } = await startRuntime();
  try {
    const game = await createGame(base);
    const payload = { action: "开始我的故事", expectedVersion: 0, requestId: "request_api_001" };
    const response = await fetch(`${base}/api/games/${game.id}/turns`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    assert.equal(response.status, 200);
    const stream = await response.text();
    assert.match(stream, /event: text/);
    assert.match(stream, /event: complete/);
    const stored = (await (await fetch(`${base}/api/games/${game.id}`)).json()).game;
    assert.equal(stored.version, 1);
    assert.equal(stored.turns.length, 1);

    const replayResponse = await fetch(`${base}/api/games/${game.id}/turns`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    assert.equal(replayResponse.status, 200);
    assert.match(await replayResponse.text(), /idempotentReplay/);
    assert.equal((await (await fetch(`${base}/api/games/${game.id}`)).json()).game.turns.length, 1);

    const conflict = await fetch(`${base}/api/games/${game.id}/turns`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, action: "换一个行动" }) });
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).code, "IDEMPOTENCY_CONFLICT");
  } finally {
    await stopRuntime(runtime);
  }
});

test("HTTP API catches invalid and stale turn requests without crashing", async () => {
  const { runtime, base } = await startRuntime();
  try {
    const game = await createGame(base);
    const invalid = await fetch(`${base}/api/games/${game.id}/turns`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "", expectedVersion: 0, requestId: "request_bad_001" }) });
    assert.equal(invalid.status, 400);
    const stale = await fetch(`${base}/api/games/${game.id}/turns`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "开始", expectedVersion: 9, requestId: "request_stale_001" }) });
    assert.equal(stale.status, 409);
    assert.equal((await stale.json()).code, "VERSION_CONFLICT");
    assert.equal((await (await fetch(`${base}/api/health`)).json()).ok, true);
  } finally {
    await stopRuntime(runtime);
  }
});

test("HTTP API rejects cross-origin mutations", async () => {
  const { runtime, base } = await startRuntime();
  try {
    const response = await fetch(`${base}/api/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
      body: JSON.stringify({ name: "林砚", worldId: "cinder-river", powerId: "ember-hearing" }),
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "CROSS_ORIGIN_MUTATION");
  } finally {
    await stopRuntime(runtime);
  }
});

test("cancellation leaves game state untouched and records cancellation", async () => {
  const generationService = {
    providerHealth() { return { status: "ready" }; },
    async execute({ signal, onStage }) {
      onStage?.({ name: "narrative_generation", status: "running", elapsedMs: 0 });
      await new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    },
  };
  const runtime = createTgnLive({ configOverrides: { databasePath: ":memory:", port: 0 }, generationService });
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${runtime.server.address().port}`;
  try {
    const game = await createGame(base);
    const turnResponse = await fetch(`${base}/api/games/${game.id}/turns`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "等待", expectedVersion: 0, requestId: "request_cancel_001" }),
    });
    const cancelled = await fetch(`${base}/api/games/${game.id}/cancel`, { method: "POST" });
    assert.deepEqual(await cancelled.json(), { cancelled: true });
    assert.match(await turnResponse.text(), /event: error/);
    const stored = (await (await fetch(`${base}/api/games/${game.id}`)).json()).game;
    assert.equal(stored.version, 0);
    assert.equal(stored.turns.length, 0);
    const metrics = await (await fetch(`${base}/api/games/${game.id}/metrics`)).json();
    assert.equal(metrics.summary.cancelled, 1);
  } finally {
    await stopRuntime(runtime);
  }
});
