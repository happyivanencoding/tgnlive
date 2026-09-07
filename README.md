# TGN Live · 可玩的修仙小说

独立 Windows 本地 Web MVP，项目目录 `C:\dev\tgn_live`。它没有修改原来的 `tgn-story-mvp` 生产流水线。当前版本 **0.5.0**；最终已验证运行结果以 `docs/EXPERIMENTS.md` 与 `artifacts/reports/MEASUREMENTS.md` 为准。

## 打开与启动

手机或远程浏览器打开 **https://live.thegreatnovel.com**，使用本人 Cloudflare Access 登录。电脑本机仍可打开 **http://127.0.0.1:4317**。两处共用原有存档。

已启用当前 Windows 用户登录后后台启动；电脑需保持开机、联网、未睡眠，AgentDock 可用。详见 [远程访问与恢复](docs/REMOTE_ACCESS.md)。

服务未运行时，在普通 PowerShell 终端执行：

```powershell
cd C:\dev\tgn_live
node src/server.js
```

保持窗口打开，按 Ctrl+C 停止。后台启动可用 `pwsh -NoProfile -File scripts/start-local.ps1`，停止用 `pwsh -NoProfile -File scripts/stop-local.ps1`；停止脚本会核对项目入口的完整路径，拒绝终止无法确认归属的 PID。后台启动应从普通 Windows 终端执行；AgentDock 的短时命令会在命令超时后回收子进程，不能把它当常驻服务管理器。

要求 Node 24、当前 Windows 用户可用的 AgentDock/Codex ACP 登录，以及运行中的本地 AgentDock MCP。无运行时 npm 依赖，无需先安装前端框架。模型失败会明确报错，不会拿测试故事冒充真实生成。

## 已实现的玩法

创建成年主角，选择烬息、借势印或空囊界，从“烬河照夜”的药市风波开始。每回合有三个建议，也可自由输入：帮人、拒绝、交易、逃走、试探和训练都可以尝试。正文真实流式显示，未完成段落明确标为预览；校验成功后才进入正史。

SQLite 保存角色境界与进度、地点、钱财、重要物品、人物关系、事实、承诺及事件记录。书库可以继续旧故事，每6个已接受回合分章，提供阅读模式和 Markdown/TXT 导出。界面含手机窄屏布局、状态抽屉、天赋限制、亮暗切换、阶段耗时、停止和重试。重新提交同一请求不会重复领取结果。

## 模型与速度

默认叙事 **gpt-5.6-terra / low**，用于后续连续质量测试；快速对照配置为 **gpt-5.6-luna / low**。独立试玩玩家使用 Luna/low，短程规划与盲读者使用 Sol/medium。所有配置均经过实际 ACP 调用，而不是只看下拉列表。

```powershell
$env:TGN_NARRATOR_MODEL='gpt-5.6-luna'  # 快速叙事对照
$env:TGN_NARRATOR_REASONING='low'
node src/server.js
```

开局直接使用预先编写的局势底稿，不额外等待规划模型；它不是伪装成模型输出的正文。第9回合等检查点仍会调用真正的 Story Brain。默认每8回合检查，每6回合成章；配置见 `src/config.js`。环境变量 `TGN_OPENING_PLAN=live` 可恢复开局实时规划用于对照。

## 检查与复现

```powershell
npm test
node scripts/smoke.mjs
node eval/play.mjs --label new-adaptive-run --turns 10 --persona progression --judge --max-minutes 20
node eval/play.mjs --label new-fixed-replay --turns 7 --replay artifacts/eval/baseline-utf8-v010/actions.json --judge
node eval/protocol.mjs final-adaptive-v031 new-protocol-check
node eval/summarize.mjs
```

每次使用新的 label，避免覆盖证据。`play.mjs` 首回合为固定启动，之后由独立 ACP 玩家读取真实观察自主选择；`--replay` 则明确是固定行动重放。代理决策耗时与应用生成耗时分开。长测试通过 AgentDock 运行时须显式给足 `timeout_ms`。

原始证据保存在 `artifacts/eval/`：逐回合 JSONL、完整游玩文本、行动、ACP session/run、实际模型与思考等级、阶段时间、失败、修复、导出与独立读者意见。`server-metrics.json` 是完整后端 trace；SSE complete 携带的是摘要，不可把摘要当完整阶段数据。`artifacts/ui/` 保存浏览器截图及测试结果。所有此类本地数据与数据库均已被 Git 忽略。

## 边界

这是可信单用户的 **loopback-only 原型**，不是可公开运营的安全服务。只读 ACP 工作区与禁工具检测不等同于对抗式多租户沙箱。不要直接加公网隧道；正式上线前需独立认证、隔离、限流、配额与内容治理。

目前没有 AI 插画生成、视频、语音、支付或多用户联机。能力边界和故事语义仍部分依赖模型，不能把几个样本成功当作完全确定的规则引擎；长篇记忆、数百回合稳定性和真人留存未验证。提供方未可靠返回的账单 token、成本与内部排队时间记为未知，不估算成零。

后续开发先读 `AGENTS.md`、`DEEP_CONTEXT_HANDOFF.md`、`docs/ARCHITECTURE.md`、`docs/EXPERIMENTS.md`。本地 Git 已建立，未绑定或推送远端。
