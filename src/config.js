import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function integerEnv(name, fallback, minimum, maximum) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

export function loadConfig(overrides = {}) {
  const runtimeDir = path.resolve(rootDir, process.env.TGN_RUNTIME_DIR || ".runtime");
  return {
    version: "0.2.0",
    openingPlanStrategy: process.env.TGN_OPENING_PLAN || "authored",
    host: process.env.TGN_HOST || "127.0.0.1",
    port: integerEnv("TGN_PORT", 4317, 1, 65535),
    rootDir,
    publicDir: path.join(rootDir, "public"),
    runtimeDir,
    databasePath: process.env.TGN_DATABASE_PATH || path.join(rootDir, "data", "tgn-live.sqlite"),
    narratorWorkspace: process.env.TGN_NARRATOR_WORKSPACE || path.join(runtimeDir, "narrator-workspace"),
    agentDockUrl: process.env.TGN_LIVE_AGENTDOCK_URL || "http://127.0.0.1:8766/mcp",
    narratorModel: process.env.TGN_NARRATOR_MODEL || "gpt-5.6-luna",
    plannerModel: process.env.TGN_PLANNER_MODEL || "gpt-5.6-sol",
    playerModel: process.env.TGN_PLAYER_MODEL || "gpt-5.6-luna",
    judgeModel: process.env.TGN_JUDGE_MODEL || "gpt-5.6-sol",
    narratorReasoning: process.env.TGN_NARRATOR_REASONING || "low",
    plannerReasoning: process.env.TGN_PLANNER_REASONING || "medium",
    playerReasoning: process.env.TGN_PLAYER_REASONING || "low",
    judgeReasoning: process.env.TGN_JUDGE_REASONING || "medium",
    chapterTurns: integerEnv("TGN_CHAPTER_TURNS", 6, 5, 10),
    plannerInterval: integerEnv("TGN_PLANNER_INTERVAL", 8, 5, 15),
    maxActionChars: integerEnv("TGN_MAX_ACTION_CHARS", 500, 50, 2000),
    providerTimeoutMs: integerEnv("TGN_PROVIDER_TIMEOUT_MS", 120000, 10000, 600000),
    ...overrides,
  };
}
