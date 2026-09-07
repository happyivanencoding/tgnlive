import { performance } from "node:perf_hooks";
import { createId } from "./ids.js";

export class TurnTrace {
  constructor({ gameId, requestId, startedMono = performance.now(), startedAt = new Date().toISOString() }) {
    this.startedMono = startedMono;
    this.openStages = new Map();
    this.value = {
      id: createId("trace"),
      gameId,
      requestId,
      status: "running",
      startedAt,
      endedAt: null,
      totalElapsedMs: null,
      firstFinalAnswerTokenMs: null,
      firstReaderVisibleMs: null,
      firstNarrativeSseMs: null,
      apiCompleteMs: null,
      browserFirstNarrativePaintMs: null,
      browserChoicesVisibleMs: null,
      providerQueueMs: null,
      usage: null,
      cost: null,
      stages: [],
      events: [],
      provider: {},
      promptChars: { planner: 0, narrator: 0, repair: 0 },
      outputChars: 0,
      repairAttempts: 0,
      appliedDeltas: [],
      rejectedDeltas: [],
      errors: [],
    };
  }

  get id() {
    return this.value.id;
  }

  elapsed() {
    return Math.round(performance.now() - this.startedMono);
  }

  startStage(name, details = {}) {
    const stage = { name, status: "running", startedAt: new Date().toISOString(), startMs: this.elapsed(), ...details };
    this.openStages.set(name, stage);
    this.value.stages.push(stage);
    return stage;
  }

  endStage(name, status = "complete", details = {}) {
    const stage = this.openStages.get(name);
    if (!stage) return null;
    stage.status = status;
    stage.endedAt = new Date().toISOString();
    stage.elapsedMs = Math.max(0, this.elapsed() - stage.startMs);
    Object.assign(stage, details);
    this.openStages.delete(name);
    return stage;
  }

  point(type, details = {}) {
    this.value.events.push({ type, at: new Date().toISOString(), elapsedMs: this.elapsed(), ...details });
  }

  firstFinalToken() {
    if (this.value.firstFinalAnswerTokenMs === null) this.value.firstFinalAnswerTokenMs = this.elapsed();
  }

  firstVisible() {
    if (this.value.firstNarrativeSseMs === null) {
      this.value.firstNarrativeSseMs = this.elapsed();
      // Historical API compatibility only: this is SERVER SSE dispatch, not browser paint.
      this.value.firstReaderVisibleMs = this.value.firstNarrativeSseMs;
      this.point("first_narrative_sse");
    }
  }

  finish(status, details = {}) {
    for (const name of [...this.openStages.keys()]) this.endStage(name, status);
    this.value.status = status;
    this.value.endedAt = new Date().toISOString();
    this.value.totalElapsedMs = this.elapsed();
    Object.assign(this.value, details);
    return this.value;
  }
}
