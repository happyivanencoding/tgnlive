# TGN Live

TGN Live 是一个仅供本机私人试验的“可玩的修仙连载小说”MVP。后端使用 Node 24 原生 HTTP、`node:sqlite` 和本机 AgentDock ACP；没有运行时 npm 依赖。玩家状态以 SQLite Canon 为准，模型正文只是带结构化提案的候选结果。

## 运行

要求：Windows、Node `>=24`、本机 AgentDock 已启动且当前 Windows 用户可解密其 DPAPI token。

```powershell
node --test
powershell -File scripts/start-local.ps1
node scripts/smoke.mjs
```

人工长期运行时，最稳妥的方式是在一个独立 PowerShell 终端前台执行 `node src/server.js`，保持该终端打开；这不依赖自动化工具的命令超时。`scripts/start-local.ps1` 适合正常用户终端，但某些代理执行器会在命令会话到期时连同子进程一起回收，因此不能把“启动命令返回”当作长期存活证明。

默认地址是 `http://127.0.0.1:4317`。启动脚本不会终止占用端口的未知进程；进程信息写入 `.runtime/server.json`，标准输出和错误日志分别写入 `.runtime/server.out.log`、`.runtime/server-error.log`。仅在进程命令与项目记录相符时可运行：

```powershell
powershell -File scripts/stop-local.ps1
```

也可直接运行 `npm start`。数据默认保存在 `data/tgn-live.sqlite`。

## API

- `GET /api/health`：版本、provider 状态和准确角色配置。
- `GET /api/worlds`：一个精写开局与三种非对称异能。
- `POST /api/games`：创建空白持久存档，不伪装成模型正文。
- `GET /api/games`、`GET /api/games/:id`：存档列表与恢复。
- `POST /api/games/:id/turns`：POST SSE，发送 `stage`、真实 `text` chunk、`complete` 或 `error`。
- `POST /api/games/:id/cancel`：仅取消该存档当前生成，不提交状态。
- `GET /api/games/:id/export?format=md|txt`：按章导出。
- `GET /api/games/:id/metrics`：原始 Turn traces 与摘要。

创建游戏后，首个行动应发送 `开始我的故事`。每个 Turn 请求必须带 `{action, expectedVersion, requestId}`。同一 `requestId` 绑定原行动和版本；同内容重放返回已提交结果，不同内容返回冲突。

## Provider 配置

默认配置经过真实会话能力验证：Narrator `gpt-5.6-luna/low`，Story Brain `gpt-5.6-sol/medium`，试玩 Player `gpt-5.6-luna/low`，Judge `gpt-5.6-sol/medium`。不会继承会话的 `ultra`。可用以下环境变量覆盖：

`TGN_NARRATOR_MODEL`、`TGN_PLANNER_MODEL`、`TGN_PLAYER_MODEL`、`TGN_JUDGE_MODEL`，以及对应的 `TGN_*_REASONING`。适配器会核对会话实际公布的选项，并把最终应用配置写入 trace。模型不可用时直接报错，不回退到假正文。

包导出 `createTgnLive`、`createAcpRoleAdapter`、`createPlaytestRoleAdapter`、`buildPlayerObservationPrompt`、`buildJudgePrompt`、`GameStore`、`GenerationService` 和 `McpHttpClient`。控制器可从 `tgn-live/acp-adapter` 或 `src/index.js` 创建独立 Player/Judge ACP 角色。

## 限制

这是绑定 `127.0.0.1` 的无登录原型。ACP 会话使用项目内空目录和 `read-only` 模式，并拒绝工具/权限事件，但这不等于经过证明的恶意多租户沙箱。当前没有 AI 插画、付费、多人或公网部署。完整 10 回合质量基线与两轮优化由控制器在后端冻结后执行，不能把确定性 fixture 时间当成 live 成绩。
