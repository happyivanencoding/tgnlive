import test from "node:test";
import assert from "node:assert/strict";
import { GameStore } from "../src/store.js";
import { reduceState } from "../src/reducer.js";
import { createSeedState, WORLDS } from "../src/worlds.js";

test("store commits state, turn, ledger and idempotency atomically", () => {
  const store = new GameStore(":memory:");
  const world = WORLDS[0];
  const game = store.createGame({ name: "林砚", title: "测试故事", worldId: world.id, powerId: world.powers[0].id, state: createSeedState(world, world.powers[0]) });
  const trace = { id: "trace_test", gameId: game.id, requestId: "request_123", status: "complete", startedAt: new Date().toISOString(), totalElapsedMs: 10 };
  store.reserveRequest({ gameId: game.id, requestId: "request_123", expectedVersion: 0, traceId: trace.id, action: "买药" });
  const reduced = reduceState(game.state, {
    narrative: "林砚买下一包药。",
    choices: [{ id: "a", label: "甲" }, { id: "b", label: "乙" }, { id: "c", label: "丙" }],
    delta: { coinsDelta: -2, inventoryOps: [{ op: "add", id: "herb", name: "止血散", qty: 1 }] },
  });
  const committed = store.commitTurn({ gameId: game.id, requestId: "request_123", expectedVersion: 0, action: "买药", reduced, trace, chapterTurns: 6 });
  assert.equal(committed.game.version, 1);
  assert.equal(committed.game.state.coins, 16);
  assert.equal(committed.game.turns.length, 1);
  const replay = store.reserveRequest({ gameId: game.id, requestId: "request_123", expectedVersion: 0, traceId: "other", action: "买药" });
  assert.equal(replay.kind, "complete");
  assert.equal(replay.game.version, 1);
  assert.match(store.exportNovel(game.id, "md"), /止血散|林砚买下一包药/);
  store.close();
});

test("failed request does not change durable game state", () => {
  const store = new GameStore(":memory:");
  const world = WORLDS[0];
  const game = store.createGame({ name: "林砚", title: "测试故事", worldId: world.id, powerId: world.powers[0].id, state: createSeedState(world, world.powers[0]) });
  store.reserveRequest({ gameId: game.id, requestId: "request_fail", expectedVersion: 0, traceId: "trace_fail", action: "失败行动" });
  store.failRequest({ gameId: game.id, requestId: "request_fail", status: "failed", error: { code: "FAIL" }, trace: { id: "trace_fail", gameId: game.id, requestId: "request_fail", status: "failed", startedAt: new Date().toISOString() } });
  assert.equal(store.getGame(game.id).version, 0);
  assert.equal(store.getGame(game.id).turns.length, 0);
  store.close();
});

test("idempotency key cannot replay a different action", () => {
  const store = new GameStore(":memory:");
  const world = WORLDS[0];
  const game = store.createGame({ name: "林砚", title: "测试故事", worldId: world.id, powerId: world.powers[0].id, state: createSeedState(world, world.powers[0]) });
  store.reserveRequest({ gameId: game.id, requestId: "request_bound", expectedVersion: 0, traceId: "trace_bound", action: "向左走" });
  assert.throws(() => store.reserveRequest({ gameId: game.id, requestId: "request_bound", expectedVersion: 0, traceId: "trace_other", action: "向右走" }), { code: "IDEMPOTENCY_CONFLICT" });
  store.close();
});


test("server startup recovers only interrupted receipts without altering Canon or replaying actions", () => {
  const store=new GameStore(":memory:");const world=WORLDS[0];
  try {
    const game=store.createGame({name:"恢复测试",title:"测试存档",worldId:world.id,powerId:world.powers[0].id,state:createSeedState(world,world.powers[0])});
    const before=JSON.stringify(store.getGame(game.id));
    const request={gameId:game.id,requestId:"interrupted-native-turn",expectedVersion:0,traceId:"interrupted-trace",action:"明确但未提交的行动"};
    store.reserveRequest(request);
    assert.throws(()=>store.reserveRequest(request),{code:"REQUEST_IN_PROGRESS"});
    assert.equal(store.recoverInterruptedRequests(),1);
    assert.equal(store.recoverInterruptedRequests(),0);
    assert.equal(JSON.stringify(store.getGame(game.id)),before);
    assert.throws(()=>store.reserveRequest(request),{code:"REQUEST_ID_REUSED"});
    assert.equal(store.reserveRequest({...request,requestId:"explicit-user-retry"}).kind,"reserved");
    assert.equal(store.getGame(game.id).turns.length,0);
  } finally {store.close();}
});
