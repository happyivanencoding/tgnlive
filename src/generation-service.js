import { AppError } from "./errors.js";
import { StreamingNarratorParser, extractJsonObject } from "./output-parser.js";
import { buildNarratorPrompt, buildPlannerPrompt, buildRepairPrompt } from "./prompts.js";
import { reduceState } from "./reducer.js";
import { authoredOpeningPlan } from "./opening-plan.js";
import { TurnTrace } from './telemetry.js';
import { createId } from './ids.js';

export class GenerationService {
  constructor({ narrator, planner, plannerInterval = 8, openingPlanStrategy = "authored", plannerStrategy = "checkpoint" }) {
    if (!["authored", "live"].includes(openingPlanStrategy)) throw new Error("openingPlanStrategy must be authored or live");
    if (!['checkpoint', 'prefetch'].includes(plannerStrategy)) throw new Error('plannerStrategy must be checkpoint or prefetch');
    this.openingPlanStrategy = openingPlanStrategy;
    this.plannerStrategy = plannerStrategy;
    this.ahead = null;
    this.prefetchJobs = new Set();
    this.narrator = narrator;
    this.planner = planner;
    this.plannerInterval = plannerInterval;
  }

  // One owned, bounded speculative plan, never an asynchronous Canon mutation.
  // Two ordinary turns give the existing planner time while the player reads.
  afterCommit({ game, world, existingPlan, language = game.language || 'zh', onTrace }) {
    if (this.plannerStrategy !== 'prefetch') return;
    const previous = this.ahead;
    if (previous && (previous.gameId !== game.id || game.version > previous.targetVersion
        || previous.realmRank !== game.state.realm.rank || previous.language !== language)) {
      previous.controller.abort(new Error('prefetch basis no longer applicable'));
      this.ahead = null;
    }
    if (game.version % this.plannerInterval !== this.plannerInterval - 2 || this.ahead) return;
    const controller = new AbortController();
    const trace = new TurnTrace({ gameId: game.id, requestId: createId('plan') });
    trace.value.kind = 'planner-prefetch';
    trace.value.basisVersion = game.version;
    trace.value.targetVersion = game.version + 2;
    const job = { gameId: game.id, basisVersion: game.version, targetVersion: game.version + 2,
      realmRank: game.state.realm.rank, basisNearBreakthrough: game.state.realm.progress >= 90,
      language, controller, trace, status: 'pending', used: false };
    const deadline = setTimeout(() => controller.abort(new Error('prefetch deadline exceeded')), 120000);
    deadline.unref?.();
    this.ahead = job;
    this.prefetchJobs.add(job);
    job.promise = (async () => {
      try {
        const prompt = await stage(trace, null, 'planner_context_assembly', async () => buildPlannerPrompt({
          game, world, existingPlan, language,
          action: '这是基于已提交Canon的提前规划。玩家尚未提交下一行动；只准备可复用的阶段方向与人物自主行动，不假定玩家会接受任何路线。',
        }));
        trace.value.promptChars.planner = prompt.length;
        const result = await stage(trace, null, 'plan', async () => {
          beginSetupStage(trace, null, 'planner');
          return this.planner.run(prompt, { signal: controller.signal,
            onEvent: event => recordProviderEvent(trace, null, 'planner', event) });
        });
        trace.value.provider.planner = providerResult(this.planner, result);
        controller.signal.throwIfAborted();
        job.plan = { ...validatePlan(extractJsonObject(result.text)),
          basisRealmRank: job.realmRank, basisNearBreakthrough: job.basisNearBreakthrough,
          basisGameVersion: job.basisVersion, targetGameVersion: job.targetVersion,
          speculative: true };
        job.status = 'ready';
        trace.value.prefetchDisposition = this.ahead === job ? 'ready' : 'discarded';
        trace.finish('complete');
      } catch (error) {
        job.status = controller.signal.aborted ? 'cancelled' : 'failed';
        trace.value.errors.push({ phase: 'planner-prefetch', code: error.code || error.name, message: error.message });
        trace.finish(job.status);
      } finally {
        clearTimeout(deadline);
        // Trace persistence is observational; a failed optional plan must never
        // change a committed turn or become an unhandled rejection on shutdown.
        try { onTrace?.(trace.value); } catch { /* database may already be closing */ }
        this.prefetchJobs.delete(job);
      }
    })();
  }

  async close() {
    this.ahead = null;
    const jobs = [...this.prefetchJobs];
    for (const job of jobs) job.controller.abort(new Error('game service shutting down'));
    await Promise.allSettled(jobs.map(job => job.promise));
  }

  cancelPrefetch(gameId) {
    if (this.ahead?.gameId !== gameId) return;
    this.ahead.controller.abort(new Error('player stopped this game'));
    this.ahead = null;
  }

  providerHealth() {
    return this.narrator.health;
  }

  shouldPlan(game, existingPlan) {
    return game.state.turnNumber === 0 ? this.openingPlanStrategy === "live"
      : game.state.turnNumber % this.plannerInterval === 0
      || (game.state.realm.progress >= 90 && (!existingPlan?.basisNearBreakthrough || existingPlan.basisRealmRank !== game.state.realm.rank));
  }

  async execute({ game, world, action, language = game.language || "zh", existingPlan, signal, trace, onStage, onText }) {
    let plan = existingPlan;
    let freshPlan = null;
    trace.value.openingPlanStrategy = this.openingPlanStrategy;
    if (game.state.turnNumber === 0 && this.openingPlanStrategy === "authored") {
      await stage(trace, onStage, "authored_opening_plan", async () => {
        freshPlan = authoredOpeningPlan(world, game.state);
        plan = freshPlan;
        trace.value.planSource = "authored-world-seed-no-model-call";
      });
    }
    if (this.shouldPlan(game, existingPlan) && this.plannerStrategy === 'prefetch' && game.state.turnNumber > 0) {
      const job = this.ahead;
      const applicable = job?.gameId === game.id && job.targetVersion === game.version
        && job.realmRank === game.state.realm.rank && job.language === language;
      trace.value.prefetch = { status: applicable ? job.status : 'missing-or-stale',
        basisVersion: job?.basisVersion ?? null, targetVersion: job?.targetVersion ?? null,
        traceId: job?.trace.value.id ?? null };
      if (applicable && job.status === 'ready') {
        freshPlan = structuredClone(job.plan);
        plan = freshPlan;
        job.used = true;
        trace.value.planSource = 'ready-prefetch-no-foreground-model-call';
        trace.value.prefetch.backgroundElapsedMs = job.trace.value.totalElapsedMs;
      } else {
        // A cold restart, failure or slow planner cannot double the player's wait.
        // The narrator still receives authoritative current Canon and current action.
        trace.value.planSource = 'existing-plan-nonblocking-fallback';
        if (plan?.basisRealmRank !== undefined && plan.basisRealmRank !== game.state.realm.rank) {
          plan = null;
          trace.value.prefetch.discardedOldStagePlan = true;
        }
      }
    } else if (this.shouldPlan(game, existingPlan)) {
      trace.value.planSource = "live-story-brain";
      const plannerPrompt = await stage(trace, onStage, "planner_context_assembly", async () => buildPlannerPrompt({ game, world, action, existingPlan, language }));
      trace.value.promptChars.planner = plannerPrompt.length;
      await stage(trace, onStage, "plan", async () => {
        beginSetupStage(trace, onStage, "planner");
        const result = await this.planner.run(plannerPrompt, {
          signal,
          onEvent: (event) => recordProviderEvent(trace, onStage, "planner", event),
        });
        trace.value.provider.planner = providerResult(this.planner, result);
        freshPlan = validatePlan(extractJsonObject(result.text));
        freshPlan.basisRealmRank = game.state.realm.rank;
        freshPlan.basisNearBreakthrough = game.state.realm.progress >= 90;
        plan = freshPlan;
      });
    }

    let narratorPrompt;
    await stage(trace, onStage, "context_assembly", async () => {
      narratorPrompt = buildNarratorPrompt({ game, world, action, plan, language });
      trace.value.promptChars.narrator = narratorPrompt.length;
    });

    let rawOutput = "";
    let parser;
    await stage(trace, onStage, "narrative_generation", async () => {
      beginSetupStage(trace, onStage, "narrator");
      parser = new StreamingNarratorParser((delta) => {
        trace.firstVisible();
        onText?.(delta);
      });
      const result = await this.narrator.run(narratorPrompt, {
        signal,
        onText: (chunk) => {
          trace.firstFinalToken();
          rawOutput += chunk;
          parser.push(chunk);
        },
        onEvent: (event) => recordProviderEvent(trace, onStage, "narrator", event),
      });
      trace.value.provider.narrator = providerResult(this.narrator, result);
      trace.value.outputChars = rawOutput.length;
    });

    // Final visible model output only, never private reasoning. Retain failures for diagnosis.
    trace.value.candidateOutputs = [{ role: "narrator", finalText: rawOutput }];
    let reduced;
    try {
      await stage(trace, onStage, "parse_validate", async () => {
        const proposal = await stage(trace, onStage, "parse", async () => parser.finish());
        reduced = await stage(trace, onStage, "reducer_validation", async () => reduceState(game.state, proposal, world, language));
      });
    } catch (firstError) {
      trace.value.repairAttempts = 1;
      trace.value.errors.push({ phase: "parse_validate", code: firstError.code || "INVALID_OUTPUT", message: firstError.message });
      await stage(trace, onStage, "repair", async () => {
        beginSetupStage(trace, onStage, "repair");
        const repairPrompt = buildRepairPrompt({ game, world, action, invalidOutput: rawOutput, reason: firstError.message, language });
        trace.value.promptChars.repair = repairPrompt.length;
        let repairedOutput = "";
        const repairedParser = new StreamingNarratorParser();
        const repairResult = await this.narrator.run(repairPrompt, {
          signal,
          onText: (chunk) => {
            repairedOutput += chunk;
            repairedParser.push(chunk);
          },
          onEvent: (event) => recordProviderEvent(trace, onStage, "repair", event),
        });
        trace.value.provider.repair = providerResult(this.narrator, repairResult);
        trace.value.outputChars += repairedOutput.length;
        trace.value.candidateOutputs.push({ role: "repair", finalText: repairedOutput });
        const repairedProposal = await stage(trace, onStage, "repair_parse", async () => repairedParser.finish());
        reduced = await stage(trace, onStage, "repair_reducer_validation", async () => reduceState(game.state, repairedProposal, world, language));
      });
    }

    trace.value.appliedDeltas = reduced.applied;
    trace.value.rejectedDeltas = reduced.rejected;
    return { reduced, plan: freshPlan };
  }
}

async function stage(trace, onStage, name, callback) {
  trace.startStage(name);
  onStage?.({ name, status: "running", elapsedMs: trace.elapsed() });
  try {
    const result = await callback();
    const completed = trace.endStage(name, "complete");
    onStage?.({ name, status: "complete", elapsedMs: completed.elapsedMs });
    return result;
  } catch (error) {
    const failed = trace.endStage(name, "failed", { errorCode: error.code || error.name });
    onStage?.({ name, status: "failed", elapsedMs: failed.elapsedMs });
    throw error;
  }
}

function beginSetupStage(trace, onStage, role) {
  const name = `acp_${role}_initialize_auth_session_model_setup`;
  trace.startStage(name);
  onStage?.({ name, status: "running", elapsedMs: trace.elapsed() });
}

function recordProviderEvent(trace, onStage, role, event) {
  if (event.type === 'acp_setup_step') {
    const name = `acp_${role}_${event.step}`;
    if (event.status === 'start') trace.startStage(name);
    else trace.endStage(name, event.status);
    trace.point('acp_setup_step', {role,step:event.step,status:event.status,elapsedMs:event.elapsedMs});
    return;
  }
  if (event.type === "acp_config_applied") {
    const name = `acp_${role}_initialize_auth_session_model_setup`;
    const completed = trace.endStage(name, "complete");
    if (completed) onStage?.({ name, status: "complete", elapsedMs: completed.elapsedMs });
    trace.point("acp_session_model_setup", { role, sessionId: event.sessionId, model: event.model, reasoningEffort: event.reasoningEffort, mode: event.mode });
    return;
  }
  if (event.type === "acp_cleanup_incomplete") {
    trace.point("acp_cleanup_incomplete", { role, sessionId: event.sessionId, runId: event.runId });
    return;
  }
  if (event.type === "acp_run_started") {
    trace.point("acp_run_started", { role, sessionId: event.sessionId, runId: event.runId });
    return;
  }
  if (event.type === "acp_event") {
    trace.point("acp_event", { role, eventType: event.eventType, seq: event.seq, providerAt: event.createdAt });
  }
}

function providerResult(adapter, result) {
  return {
    role: adapter.role,
    model: adapter.model,
    reasoningEffort: adapter.reasoningEffort,
    mode: "read-only",
    sessionId: result.sessionId,
    runId: result.runId,
    stopReason: result.stopReason,
    eventTypes: result.eventTypes,
    usage: result.usage,
  };
}

function validatePlan(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new AppError("Story Brain 返回格式无效", { code: "INVALID_PLAN", status: 502, retryable: true });
  }
  for (const field of ["npcMoves", "openings", "continuity"]) {
    const optionalLegacy = field !== 'npcMoves' && plan[field] === undefined && plan.growth && typeof plan.growth === 'object' && !Array.isArray(plan.growth);
    if (!optionalLegacy && !Array.isArray(plan[field])) {
      throw new AppError(`Story Brain 缺少 ${field}`, { code: "INVALID_PLAN", status: 502, retryable: true });
    }
  }
  const growth = plan.growth && typeof plan.growth === 'object' && !Array.isArray(plan.growth)
    ? Object.fromEntries(['want', 'payoff', 'afterUse', 'graduated', 'transition'].filter(key => ['want', 'payoff', 'afterUse'].includes(key) || plan.growth[key] !== undefined).map(key => [key, String(plan.growth[key] || '').slice(0, 400)])) : undefined;
  return {
    pressure: String(plan.pressure || "").slice(0, 300),
    npcMoves: plan.npcMoves.slice(0, 6),
    openings: (plan.openings || []).slice(0, 6).map(String),
    continuity: (plan.continuity || []).slice(0, 10).map(String),
    milestone: String(plan.milestone || "").slice(0, 300),
    ...(growth ? { growth } : {}),
  };
}
