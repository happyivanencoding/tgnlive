import test from "node:test";
import assert from "node:assert/strict";
import { reduceState } from "../src/reducer.js";
import { createSeedState, WORLDS } from "../src/worlds.js";

function state() {
  return createSeedState(WORLDS[0], WORLDS[0].powers[0]);
}

test("reducer preserves prose paragraphs and derives visible changes", () => {
  const result = reduceState(state(), {
    narrative: "第一段。\n\n第二段。",
    choices: [{ id: "a", label: "甲" }, { id: "b", label: "乙" }, { id: "c", label: "丙" }],
    changes: ["模型声称获得神器"],
    delta: { coinsDelta: 3, factsAdd: ["确认的新事实"] },
  });
  assert.equal(result.proposal.narrative, "第一段。\n\n第二段。");
  assert.deepEqual(result.changes, ["铜钱+3", "确认的新事实"]);
  assert.equal(result.state.coins, 21);
  assert.equal(result.state.turnNumber, 1);
});

test("reducer rejects any unapplied delta", () => {
  assert.throws(() => reduceState(state(), {
    narrative: "尝试拿走不存在的东西。",
    choices: [{ id: "a", label: "甲" }, { id: "b", label: "乙" }, { id: "c", label: "丙" }],
    delta: { inventoryOps: [{ op: "remove", id: "missing", name: "不存在的剑", qty: 1 }] },
  }), { code: "REJECTED_DELTA" });
});

test("preparation alone never changes realm identity", () => {
  // The old assertion enforced XP=100, which rejected already-mastered Canon.
  // Semantic attainment is assessed in the generation contract and real-play
  // review, not by pretending a numeric threshold verifies narrative truth.
  const before = state(); before.realm.progress = 100;
  const result = reduceState(before, {
    narrative: "积累已经足够，但尚未完成本境的实际突破。",
    choices: [{ id: "a", label: "甲" }, { id: "b", label: "乙" }, { id: "c", label: "丙" }],
    delta: {},
  });
  assert.equal(result.state.realm.rank, before.realm.rank);
});
