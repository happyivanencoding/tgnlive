import fs from "node:fs";
import { AppError } from "../errors.js";
import { McpHttpClient } from "./mcp-client.js";

const FORBIDDEN_EVENT = /(tool|permission|interaction|command|file_change|terminal)/i;
// ACP advertises slash commands through this metadata notification. It does not
// execute a command. Ignore the catalogue; never dispatch it or expose it to prose.
// Actual tool/terminal/permission events, including mismatched nested event names,
// remain forbidden. See ACP v1 /protocol/v1/slash-commands.
export function isForbiddenProviderEvent(event) {
  return [event.type, event.update?.sessionUpdate].filter(Boolean)
    .some(type => type !== 'available_commands_update' && FORBIDDEN_EVENT.test(type));
}

class Semaphore {
  constructor(limit) {
    this.limit = limit;
    this.active = 0;
    this.waiters = [];
  }
  async acquire(signal) {
    if (signal?.aborted) throw signal.reason || new DOMException("Aborted", "AbortError");
    if (this.active < this.limit) {
      this.active += 1;
      return () => this.release();
    }
    return new Promise((resolve, reject) => {
      const waiter = { resolve, reject, signal };
      const onAbort = () => {
        this.waiters = this.waiters.filter((item) => item !== waiter);
        reject(signal.reason || new DOMException("Aborted", "AbortError"));
      };
      waiter.onAbort = onAbort;
      signal?.addEventListener("abort", onAbort, { once: true });
      this.waiters.push(waiter);
    });
  }
  release() {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter.signal?.removeEventListener("abort", waiter.onAbort);
      waiter.resolve(() => this.release());
      return;
    }
    this.active -= 1;
  }
}

const promptSlots = new Semaphore(2);

export function createAcpRoleAdapter({
  role,
  model,
  reasoningEffort,
  workspace,
  mcpClient,
  agentDockUrl,
  timeoutMs = 120000,
  setupTimeoutMs = 20000,
}) {
  if (!role || !model || !reasoningEffort || !workspace) throw new Error("ACP role adapter configuration is incomplete");
  const client = mcpClient || new McpHttpClient({ url: agentDockUrl });
  let health = { status: "configured", warning: null, model, reasoningEffort };

  return {
    role,
    model,
    reasoningEffort,
    get health() { return { ...health }; },
    async prepare({ signal } = {}) {
      await client.initialize({ signal });
      const info = await client.callTool("acp_session", { action: "info" }, { signal });
      health = { status: "ready", warning: null, model, reasoningEffort, agent: info?.agent || info?.name || null };
      return health;
    },
    async run(prompt, { signal, onText, onEvent } = {}) {
      if (typeof prompt !== "string" || !prompt.trim()) throw new Error("prompt is required");
      verifyEmptyWorkspace(workspace);
      const release = await promptSlots.acquire(signal);
      let sessionId;
      let runId;
      const startedAt = Date.now();
      const timeoutController = new AbortController();
      const timer = setTimeout(() => timeoutController.abort(new Error("provider timeout")), timeoutMs);
      const combinedSignal = signal ? AbortSignal.any([signal, timeoutController.signal]) : timeoutController.signal;
      const setupController = new AbortController();
      const setupSignal = AbortSignal.any([combinedSignal, setupController.signal]);
      const setupTimer = setTimeout(() => setupController.abort(new Error('provider setup timeout')), setupTimeoutMs);
      let setupStepName = null;
      const setupStep = async (name, call) => {
        setupStepName = name;
        onEvent?.({type:'acp_setup_step',role,step:name,status:'start',sessionId});
        const start = performance.now();
        try {
          const result = await call();
          onEvent?.({type:'acp_setup_step',role,step:name,status:'complete',elapsedMs:performance.now()-start,sessionId});
          return result;
        } catch(error) {
          onEvent?.({type:'acp_setup_step',role,step:name,status:'failed',elapsedMs:performance.now()-start,sessionId});
          throw error;
        }
      };
      try {
        await setupStep('mcp_initialize', () => client.initialize({signal:setupSignal}));
        const created = await setupStep('session_new', () => client.callTool("acp_session", {
          action: "new",
          cwd: workspace,
          additional_directories: [],
        }, { signal: setupSignal }));
        sessionId = created.session_id || created.session?.id;
        if (!sessionId) throw new AppError("ACP 未返回 session_id", { code: "PROVIDER_PROTOCOL_ERROR", status: 502, retryable: true });
        assertAdvertisedOption(created.config_options, "model", model);
        await setupStep('read_only_mode', () => client.callTool("acp_session", { action: "set_mode", session_id: sessionId, mode_id: "read-only" }, { signal: setupSignal }));
        const modelConfigured = await setupStep('model_select', () => client.callTool("acp_session", { action: "set_config", session_id: sessionId, config_id: "model", config_value: model }, { signal: setupSignal }));
        assertAdvertisedOption(modelConfigured.config_options, "reasoning_effort", reasoningEffort);
        await setupStep('effort_select', () => client.callTool("acp_session", { action: "set_config", session_id: sessionId, config_id: "reasoning_effort", config_value: reasoningEffort }, { signal: setupSignal }));
        setupSignal.throwIfAborted();
        clearTimeout(setupTimer);
        onEvent?.({ type: "acp_config_applied", sessionId, role, model, reasoningEffort, mode: "read-only" });
        const started = await client.callTool("acp_prompt", { action: "start", session_id: sessionId, text: prompt }, { signal: combinedSignal });
        runId = started.run_id;
        if (!runId) throw new AppError("ACP 未返回 run_id", { code: "PROVIDER_PROTOCOL_ERROR", status: 502, retryable: true });
        onEvent?.({ type: "acp_run_started", sessionId, runId });
        let afterSeq = 0;
        let output = "";
        const eventTypes = [];
        while (true) {
          const batch = await client.callTool("acp_prompt", {
            action: "events", run_id: runId, after_seq: afterSeq, wait_ms: 25000, limit: 200,
          }, { signal: combinedSignal });
          if (batch.truncated) {
            await safeCancel(client, runId);
            throw new AppError("ACP 事件页被截断，无法安全重建完整正文", { code: "PROVIDER_EVENTS_TRUNCATED", status: 502, retryable: true });
          }
          for (const event of batch.events || []) {
            eventTypes.push(event.type);
            onEvent?.({ type: "acp_event", eventType: event.type, seq: event.seq, createdAt: event.created_at });
            if (isForbiddenProviderEvent(event)) {
              await safeCancel(client, runId);
              throw new AppError(`叙事会话出现禁止事件：${event.type}`, { code: "UNEXPECTED_PROVIDER_EVENT", status: 502, retryable: false });
            }
            if (event.type === "agent_message_chunk") {
              const phase = event.update?._meta?.codex?.phase;
              if (phase && phase !== "final_answer") continue;
              const text = event.update?.content?.type === "text" ? event.update.content.text : "";
              if (text) {
                output += text;
                onText?.(text, event);
              }
            }
            if (event.type === "failed") {
              throw new AppError(event.message || "ACP 生成失败", { code: event.error_code || "PROVIDER_GENERATION_FAILED", status: 502, retryable: true });
            }
          }
          afterSeq = batch.next_seq ?? afterSeq;
          const completed = batch.status === "completed" || batch.events?.some((event) => event.type === "completed");
          if (completed && batch.has_more) continue;
          if (completed) {
            const embeddedError = detectEmbeddedProviderError(output);
            if (embeddedError) {
              throw new AppError(embeddedError.message, {
                code: embeddedError.code || "PROVIDER_MODEL_ERROR", status: 502, retryable: false, details: embeddedError,
              });
            }
            health = { status: "ready", warning: null, model, reasoningEffort };
            return {
              text: output,
              sessionId,
              runId,
              status: "completed",
              stopReason: batch.stop_reason || null,
              elapsedMs: Date.now() - startedAt,
              eventTypes,
              usage: null,
            };
          }
          if (batch.status === "failed" || batch.status === "cancelled") {
            throw new AppError(batch.message || `ACP ${batch.status}`, {
              code: batch.error_code || `PROVIDER_${batch.status.toUpperCase()}`, status: 502, retryable: batch.status === "failed",
            });
          }
        }
      } catch (error) {
        if (runId && (combinedSignal.aborted || error.name === "AbortError")) await safeCancel(client, runId);
        health = { status: "error", warning: error.message, model, reasoningEffort };
        if (setupController.signal.aborted && !signal?.aborted) {
          throw new AppError('连接模型超时，本轮没有提交存档，可稍后重试', {code:'PROVIDER_SETUP_TIMEOUT',status:504,retryable:true,details:{phase:setupStepName}});
        }
        if (combinedSignal.aborted) {
          throw new AppError(signal?.aborted ? "生成已取消" : "生成超时", {
            code: signal?.aborted ? "CANCELLED" : "PROVIDER_TIMEOUT",
            status: signal?.aborted ? 499 : 504,
            retryable: !signal?.aborted,
          });
        }
        throw error;
      } finally {
        clearTimeout(timer);
        clearTimeout(setupTimer);
        if (sessionId && !(await safeClose(client, sessionId))) onEvent?.({ type: "acp_cleanup_incomplete", sessionId, runId });
        release();
      }
    },
  };
}

function verifyEmptyWorkspace(workspace) {
  fs.mkdirSync(workspace, { recursive: true });
  const entries = fs.readdirSync(workspace);
  if (entries.length) {
    throw new AppError("叙事工作区必须保持为空", { code: "WORKSPACE_NOT_EMPTY", status: 500, retryable: false });
  }
}

function assertAdvertisedOption(options, configId, value) {
  const option = options?.find((item) => item.id === configId);
  const advertised = option?.options?.some((item) => item.value === value);
  if (!advertised) {
    throw new AppError(`ACP 会话未公布配置 ${configId}=${value}`, {
      code: "PROVIDER_CONFIG_UNAVAILABLE", status: 503, retryable: false,
    });
  }
}

function detectEmbeddedProviderError(output) {
  const trimmed = output.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  try {
    const value = JSON.parse(trimmed);
    const error = value.error || (value.status >= 400 ? value : null);
    if (!error) return null;
    return {
      code: error.code || value.code || "PROVIDER_MODEL_ERROR",
      message: error.message || value.message || "模型返回嵌入式错误",
      status: error.status || value.status || null,
    };
  } catch {
    return null;
  }
}

async function safeCancel(client, runId) {
  try { await client.callTool("acp_prompt", { action: "cancel", run_id: runId }, { signal: AbortSignal.timeout(3000) }); } catch {}
}

async function safeClose(client, sessionId) {
  try {
    await client.callTool("acp_session", { action: "close", session_id: sessionId }, { signal: AbortSignal.timeout(3000) });
    return true;
  } catch { return false; }
}

export const acpConcurrencyLimit = 2;
