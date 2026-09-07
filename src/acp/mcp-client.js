import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AppError } from "../errors.js";

const execFileAsync = promisify(execFile);

export class McpHttpClient {
  constructor({ url, tokenProvider = decryptAgentDockToken, fetchImpl = fetch }) {
    this.url = url;
    this.tokenProvider = tokenProvider;
    this.fetch = fetchImpl;
    this.token = null;
    this.sessionId = null;
    this.rpcId = 0;
    this.initializePromise = null;
  }

  async initialize({ signal } = {}) {
    signal?.throwIfAborted();
    if (this.initializePromise) return abortable(this.initializePromise, signal);
    this.initializePromise = this.#initialize(signal);
    try {
      return await abortable(this.initializePromise, signal);
    } catch (error) {
      this.initializePromise = null;
      throw error;
    }
  }

  async #initialize(signal) {
    this.token = await this.tokenProvider({ signal });
    signal?.throwIfAborted();
    const result = await this.rpc("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "tgn-live", version: "0.1.0" },
    }, { skipInitialize: true, signal });
    await this.notify("notifications/initialized", {}, { signal });
    return result;
  }

  async rpc(method, params, { signal, skipInitialize = false } = {}) {
    if (!skipInitialize) await this.initialize({ signal });
    const response = await this.#post({ jsonrpc: "2.0", id: ++this.rpcId, method, params }, signal);
    if (response?.error) {
      throw new AppError(`AgentDock MCP 错误：${response.error.message || "unknown"}`, {
        code: "PROVIDER_RPC_ERROR", status: 502, retryable: true, details: response.error,
      });
    }
    return response?.result;
  }

  async notify(method, params, { signal } = {}) {
    await this.#post({ jsonrpc: "2.0", method, params }, signal, true);
  }

  async callTool(name, args, { signal } = {}) {
    const result = await this.rpc("tools/call", { name, arguments: args }, { signal });
    if (result?.isError) {
      throw new AppError(`AgentDock 工具 ${name} 返回错误`, { code: "PROVIDER_TOOL_ERROR", status: 502, retryable: true });
    }
    if (result?.structuredContent !== undefined) return result.structuredContent;
    const text = result?.content?.find((item) => item.type === "text")?.text;
    if (!text) return result;
    try { return JSON.parse(text); } catch { return text; }
  }

  async #post(body, signal, allowEmpty = false) {
    let response;
    try {
      response = await this.fetch(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json; charset=utf-8",
          ...(this.sessionId ? { "Mcp-Session-Id": this.sessionId } : {}),
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (error.name === "AbortError") throw error;
      throw new AppError("无法连接本地 AgentDock", { code: "PROVIDER_UNAVAILABLE", status: 503, retryable: true, details: error.message });
    }
    if (!response.ok) {
      throw new AppError(`AgentDock HTTP ${response.status}`, { code: "PROVIDER_HTTP_ERROR", status: 502, retryable: response.status >= 500 });
    }
    const sessionId = response.headers.get("mcp-session-id");
    if (sessionId) this.sessionId = sessionId;
    const text = await response.text();
    if (!text.trim()) {
      if (allowEmpty) return null;
      throw new AppError("AgentDock 返回空响应", { code: "PROVIDER_EMPTY_RESPONSE", status: 502, retryable: true });
    }
    const dataLine = text.startsWith("event:") ? text.split(/\r?\n/).find((line) => line.startsWith("data:")) : null;
    const payload = dataLine ? dataLine.slice(5).trim() : text;
    return JSON.parse(payload);
  }
}

function abortable(promise, signal) {
  if (!signal) return promise;
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason || new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

export async function decryptAgentDockToken({ signal } = {}) {
  signal?.throwIfAborted();
  if (process.env.TGN_AGENTDOCK_TOKEN) return process.env.TGN_AGENTDOCK_TOKEN;
  const script = [
    "$ErrorActionPreference='Stop'",
    "Add-Type -AssemblyName System.Security",
    "$runtime=Join-Path $env:LOCALAPPDATA 'AgentDock'",
    "$enc=[IO.File]::ReadAllText((Join-Path $runtime 'auth-token.dpapi'),[Text.Encoding]::UTF8).Trim()",
    "$plain=[System.Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($enc),[Text.Encoding]::UTF8.GetBytes('agentdock.startup.v1'),[System.Security.Cryptography.DataProtectionScope]::CurrentUser)",
    "[Console]::Out.Write([Text.Encoding]::UTF8.GetString($plain))",
  ].join(";");
  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      windowsHide: true,
      encoding: "utf8",
      maxBuffer: 64 * 1024,
      signal,
      timeout: 20000,
    });
    const token = stdout.trim();
    if (!token) throw new Error("empty token");
    return token;
  } catch (error) {
    throw new AppError("无法在当前用户上下文中读取 AgentDock 凭据", {
      code: "PROVIDER_AUTH_UNAVAILABLE", status: 503, retryable: false, details: error.message,
    });
  }
}
