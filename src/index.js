import { createApp } from "./app.js";
import { createAcpRoleAdapter, acpConcurrencyLimit } from "./acp/role-adapter.js";
import { McpHttpClient } from "./acp/mcp-client.js";
import { loadConfig } from "./config.js";
import { GenerationService } from "./generation-service.js";
import { buildJudgePrompt, buildPlayerObservationPrompt } from "./prompts.js";
import { GameStore } from "./store.js";

export function createTgnLive(options = {}) {
  const config = options.config || loadConfig(options.configOverrides);
  const store = options.store || new GameStore(config.databasePath);
  const mcpClient = options.mcpClient || new McpHttpClient({ url: config.agentDockUrl });
  const narrator = options.narrator || createAcpRoleAdapter({
    role: "narrator",
    model: config.narratorModel,
    reasoningEffort: config.narratorReasoning,
    workspace: config.narratorWorkspace,
    agentDockUrl: config.agentDockUrl,
    timeoutMs: config.providerTimeoutMs,
    mcpClient,
  });
  const planner = options.planner || createAcpRoleAdapter({
    role: "planner",
    model: config.plannerModel,
    reasoningEffort: config.plannerReasoning,
    workspace: config.narratorWorkspace,
    agentDockUrl: config.agentDockUrl,
    timeoutMs: config.providerTimeoutMs,
    mcpClient,
  });
  const generationService = options.generationService || new GenerationService({ narrator, planner, plannerInterval: config.plannerInterval, openingPlanStrategy: config.openingPlanStrategy });
  const app = createApp({ config, store, generationService });
  return { ...app, config, store, generationService, narrator, planner };
}

export function createPlaytestRoleAdapter({ role, config = loadConfig(), ...options }) {
  const supported = {
    player: { model: config.playerModel, reasoningEffort: config.playerReasoning },
    judge: { model: config.judgeModel, reasoningEffort: config.judgeReasoning },
  };
  if (!supported[role]) throw new Error("role must be player or judge");
  return createAcpRoleAdapter({
    role,
    ...supported[role],
    workspace: config.narratorWorkspace,
    agentDockUrl: config.agentDockUrl,
    timeoutMs: config.providerTimeoutMs,
    ...options,
  });
}

export { acpConcurrencyLimit, buildJudgePrompt, buildPlayerObservationPrompt, createAcpRoleAdapter, GameStore, GenerationService, loadConfig, McpHttpClient };
