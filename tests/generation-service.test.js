import test from "node:test";
import assert from "node:assert/strict";
import { GenerationService } from "../src/generation-service.js";
import { TurnTrace } from "../src/telemetry.js";
import { createSeedState, WORLDS } from "../src/worlds.js";
import { REJECTED_NARRATOR_OUTPUT, VALID_NARRATOR_OUTPUT } from "./fixtures/narrator-output.js";

function adapter(role, outputs, reasoningEffort) {
  let calls = 0;
  return {
    role,
    model: role === "planner" ? "gpt-5.6-sol" : "gpt-5.6-luna",
    reasoningEffort,
    health: { status: "ready" },
    get calls() { return calls; },
    async run(prompt, { onText, onEvent }) {
      const text = outputs[Math.min(calls, outputs.length - 1)];
      calls += 1;
      onEvent?.({ type: "acp_config_applied", sessionId: `${role}_session`, model: this.model, reasoningEffort, mode: "read-only" });
      onEvent?.({ type: "acp_run_started", sessionId: `${role}_session`, runId: `${role}_run_${calls}` });
      for (let index = 0; index < text.length; index += 17) onText?.(text.slice(index, index + 17));
      return { text, sessionId: `${role}_session`, runId: `${role}_run_${calls}`, eventTypes: ["agent_message_chunk", "completed"], usage: null };
    },
  };
}

function game() {
  const world = WORLDS[0];
  return { id: "game_test", name: "林砚", version: 0, state: createSeedState(world, world.powers[0]), turns: [] };
}

test("generation repairs rejected delta and returns only repaired state", async () => {
  const plannerOutput = JSON.stringify({ pressure: "搜查临近", npcMoves: [], openings: [], continuity: [], milestone: "" });
  const narrator = adapter("narrator", [REJECTED_NARRATOR_OUTPUT, VALID_NARRATOR_OUTPUT], "low");
  const planner = adapter("planner", [plannerOutput], "medium");
  const service = new GenerationService({ narrator, planner, plannerInterval: 8 });
  const trace = new TurnTrace({ gameId: "game_test", requestId: "request_test" });
  const visible = [];
  const result = await service.execute({ game: game(), world: WORLDS[0], action: "开始我的故事", trace, onText: (text) => visible.push(text) });
  assert.equal(narrator.calls, 2);
  assert.equal(trace.value.repairAttempts, 1);
  assert.match(result.reduced.proposal.narrative, /药市的灯笼/);
  assert.equal(result.reduced.state.turnNumber, 1);
  assert.doesNotMatch(result.reduced.changes.join(""), /神器/);
  assert.match(visible.join(""), /不存在的仙剑/);
});

test("compact checkpoint keeps stage intent without restating the canonical ledger", async () => {
  const snapshot = game(); snapshot.state.turnNumber = 8; snapshot.version = 8;
  const compact = { pressure: '天色将晚', npcMoves: [{name:'沈秋禾',nextMove:'以药材交换一次实际帮助'}], growth: {want:'取得可以独自行动的能力',payoff:'用已掌握的手法换一批可自用药材',afterUse:'不必再为每次练功借药'} };
  const narrator = adapter('narrator', [VALID_NARRATOR_OUTPUT], 'low');
  const planner = adapter('planner', [JSON.stringify(compact)], 'medium');
  const trace = new TurnTrace({gameId:snapshot.id,requestId:'compact-plan'});
  const result = await new GenerationService({narrator,planner}).execute({game:snapshot,world:WORLDS[0],action:'去练功',trace});
  assert.equal(planner.calls,1); assert.equal(narrator.calls,1); assert.equal(trace.value.repairAttempts,0);
  assert.deepEqual(result.plan.growth,compact.growth);
  assert.deepEqual(result.plan.continuity,[]); assert.deepEqual(result.plan.openings,[]);
  assert.equal(result.reduced.state.turnNumber,9);
});

test("compact plans do not accept a malformed NPC list or silently lose missing growth", async () => {
  const snapshot = game(); snapshot.state.turnNumber = 8;
  for(const plan of [{pressure:'缺少计划内容'}, {npcMoves:{bad:true},growth:{want:'测试'}}]) {
    const narrator=adapter('narrator',[VALID_NARRATOR_OUTPUT],'low');
    const planner=adapter('planner',[JSON.stringify(plan)],'medium');
    const trace=new TurnTrace({gameId:snapshot.id,requestId:'invalid-compact'});
    await assert.rejects(new GenerationService({narrator,planner}).execute({game:snapshot,world:WORLDS[0],action:'离开',trace}),{code:'INVALID_PLAN'});
    assert.equal(narrator.calls,0);
  }
});
