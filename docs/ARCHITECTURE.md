# TGN Live Backend Architecture

## Request path

`src/app.js` 提供原生 HTTP 路由。Turn 在发送 SSE 前完成 JSON、Host/Origin、游戏版本和幂等检查；随后建立该游戏唯一的 `AbortController`。`src/generation-service.js` 在开局、默认每 8 回合或临近突破时调用 Story Brain，其余回合复用最近计划。Narrator 每回合一次返回“正文 + `<TGN_DELTA_JSON>` + JSON”。

正文 chunk 来自 ACP `final_answer` 事件，`src/output-parser.js` 在分隔符出现前逐块转发，因此不是全文到齐后的模拟打字。JSON 由 `src/reducer.js` 做边界检查。任何无法应用的状态变化会触发至多一次完整修复；修复仍失败则整轮失败。浏览器看到的 `changes` 只从实际应用的 delta 生成。

## Atomic state

`src/store.js` 使用 `node:sqlite` 和 `BEGIN IMMEDIATE`。一次成功提交在同一事务中写入 `turns`、更新 `games.state_json/version`、追加 `canon_ledger`、保存可选 `story_plans` 并完成 `requests`。失败和取消只更新请求状态与 trace，不写 Turn 或 Canon。提交前再次检查 AbortSignal，事务中再次检查 optimistic version。

表：

- `games`：当前可见状态和版本。
- `turns`：接受的正文、选择和玩家可见变化。
- `canon_ledger`：每回合确定性 applied/rejected 记录。
- `requests`：绑定 action + expectedVersion 的幂等状态。
- `story_plans`：不会返回浏览器的短程计划。
- `traces`：阶段、模型配置、ACP session/run、事件类型和错误。

每 6 个接受 Turn 形成一章，可通过 `TGN_CHAPTER_TURNS` 在 5–10 内调整。

## ACP transport

`src/acp/mcp-client.js` 启动时通过一次隐藏 PowerShell 子进程在当前用户内存中解密 DPAPI token，之后使用 Node 原生 `fetch` 和 MCP session header 持久访问 AgentDock；token 不写文件、不进日志、不下发浏览器。Narrator 和 Planner 共享客户端。

`src/acp/role-adapter.js` 为每次生成创建项目内空工作目录会话，先设 `read-only`，再核对并设置模型，然后从模型配置返回值核对 `reasoning_effort` 后设置 effort。全局 prompt 槽位固定为观察到的上限 2，不改 AgentDock 全局配置。适配器排空 `has_more` 页面，拒绝 `truncated`、工具/权限类事件及“completed 但正文内嵌 provider error”的假成功，最后关闭 ACP session。

## Telemetry

`src/telemetry.js` 使用 monotonic clock 和 ISO wall time。Trace 包含 request validation、context assembly、plan、各角色 ACP initialize/auth/session/model setup、narrative generation、parse/validate、repair、persistence、总耗时、首个 final-answer token、首个读者可见正文、prompt/output 字符数、精确模型/effort/session/run、事件序列、应用/拒绝 delta。provider queue、token usage 和成本拿不到时为 `null`。

## Trust boundary

玩家 free text 只作为 JSON 编码的数据进入提示，不能授权工具、奖励或改写规则。所有浏览器 mutation 有同源检查，Host 仅接受 loopback；无 Origin 的本机 CLI/控制器仍可调用。该设计降低本地误用风险，但不是认证系统、网络隔离器或恶意多租户沙箱。
