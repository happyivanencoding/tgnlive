import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createAcpRoleAdapter } from "../src/acp/role-adapter.js";

function options() {
  return [{ id: "model", options: [{ value: "gpt-5.6-luna" }] }];
}

test("ACP adapter configures model before reasoning and drains completed pages", async () => {
  const calls = [];
  let eventPage = 0;
  const mcpClient = {
    async initialize() {},
    async callTool(name, args) {
      calls.push([name, args]);
      if (name === "acp_session" && args.action === "new") return { session_id: "session_1", config_options: options() };
      if (name === "acp_session" && args.action === "set_config" && args.config_id === "model") {
        return { config_options: [...options(), { id: "reasoning_effort", options: [{ value: "low" }] }] };
      }
      if (name === "acp_prompt" && args.action === "start") return { run_id: "run_1" };
      if (name === "acp_prompt" && args.action === "events") {
        eventPage += 1;
        if (eventPage === 1) return {
          status: "completed", has_more: true, next_seq: 1,
          events: [{ seq: 1, type: "agent_message_chunk", update: { _meta: { codex: { phase: "final_answer" } }, content: { type: "text", text: "前" } } }],
        };
        return {
          status: "completed", has_more: false, next_seq: 3,
          events: [
            { seq: 2, type: "agent_message_chunk", update: { _meta: { codex: { phase: "final_answer" } }, content: { type: "text", text: "后" } } },
            { seq: 3, type: "completed" },
          ],
        };
      }
      return {};
    },
  };
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "tgn-role-"));
  try {
    const adapter = createAcpRoleAdapter({ role: "narrator", model: "gpt-5.6-luna", reasoningEffort: "low", workspace, mcpClient, timeoutMs: 1000 });
    const result = await adapter.run("test");
    assert.equal(result.text, "前后");
    const configs = calls.filter(([name, args]) => name === "acp_session" && args.action === "set_config").map(([, args]) => args.config_id);
    assert.deepEqual(configs, ["model", "reasoning_effort"]);
    assert.equal(eventPage, 2);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("ACP adapter rejects truncated and embedded provider errors", async () => {
  for (const mode of ["truncated", "embedded"]) {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "tgn-role-"));
    const mcpClient = {
      async initialize() {},
      async callTool(name, args) {
        if (name === "acp_session" && args.action === "new") return { session_id: "session_1", config_options: options() };
        if (name === "acp_session" && args.action === "set_config" && args.config_id === "model") return { config_options: [...options(), { id: "reasoning_effort", options: [{ value: "low" }] }] };
        if (name === "acp_prompt" && args.action === "start") return { run_id: "run_1" };
        if (name === "acp_prompt" && args.action === "events") {
          if (mode === "truncated") return { truncated: true, events: [] };
          return {
            status: "completed", has_more: false,
            events: [
              { seq: 1, type: "agent_message_chunk", update: { _meta: { codex: { phase: "final_answer" } }, content: { type: "text", text: "{\"error\":{\"code\":\"HTTP_400\",\"message\":\"Codex version error\"}}" } } },
              { seq: 2, type: "completed" },
            ],
          };
        }
        return {};
      },
    };
    try {
      const adapter = createAcpRoleAdapter({ role: "narrator", model: "gpt-5.6-luna", reasoningEffort: "low", workspace, mcpClient, timeoutMs: 1000 });
      await assert.rejects(adapter.run("test"), { code: mode === "truncated" ? "PROVIDER_EVENTS_TRUNCATED" : "HTTP_400" });
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});
