# TGN Live backend handoff

Task `tsk_9a52649bc5df2fe4` 的后端 MVP 已实现。主入口是 `src/server.js`，组合入口和 ACP 试玩导出在 `src/index.js`。

## Current verified state

- Node `v24.15.0` 与内置 SQLite `3.51.3` 可用。
- `node --test`：15 tests passed，覆盖 reducer、流式分隔解析、SQLite 原子/幂等、ACP 配置顺序与分页、嵌入错误、HTTP SSE、坏/旧请求、跨来源拒绝、取消不落库和条件修复。
- 当前真实服务由控制器 AgentDock command session `session-c1af6fd1fc9c8ee074c27829` 以显式 24 小时 timeout 托管，运行记录为 PID `2076`、`127.0.0.1:4317`、启动时间 `2026-09-06T22:22:59.400Z`。`node scripts/smoke.mjs` 已对该进程通过 health/worlds 探针。该启动方式把 stdout/stderr 保留在 command session，`.runtime/server.json` 中文件日志路径因此为 `null`，不能伪称有项目日志文件。
- 控制器已完成原生 transport-only probe：`artifacts/bootstrap/native-provider-probe.json`，`gpt-5.6-luna/low`，配置约 `1030.7ms`，首个 final text 约 `3520.1ms`，总计约 `4011.4ms`，session `acps_5e1a7949aedeecf2276881e3`，run `acpr_364cc22e81db22da6ac04929`，状态 passed 且会话已关闭。这不是 gameplay 成绩。
- `gpt-6-astra` 虽被公布但实际生成返回 Codex-version error；运行时默认明确使用 Narrator Luna/low、Planner Sol/medium，不继承 ultra。

## Controller integration

控制器已有 `eval/play.mjs`。可从 `src/index.js` 导入 `createPlaytestRoleAdapter({role:"player"})` 或 `{role:"judge"}`，并配合 `buildPlayerObservationPrompt` / `buildJudgePrompt`。这些角色默认 Player Luna/low、Judge Sol/medium；共享进程内 ACP prompt 并发上限为 2。

启动与验证：

```powershell
node --test
powershell -File scripts/start-local.ps1
node scripts/smoke.mjs
```

真实 10 回合 baseline、章节/第 8 回合规划刷新、刷新恢复、导出、重复请求、超时/取消和两轮 measure-diagnose-change-rerun 尚未执行，应由控制器在本基线进程上完成并保存实际 transcript/critique。不要把 `tests/fixtures/` 数据混入 live 结果。

首次控制器集成 `integration-opening-v010` 的服务消失是执行器默认约 30 秒命令生命周期回收了子进程，不是应用异常；该失败证据应保留。后续自动化启动必须给承载服务器的 command session 显式长于实验的有限 timeout，并在实验前重新请求 `/api/health`。人工使用则应在独立终端前台运行 `node src/server.js`。当前 `integration-opening-v010b` 已由控制器启动并占用剩余 ACP 槽位，后端代理不得并发触发 live generation。

## Known limitations

完整 gameplay 首轮尚未实跑，因此正文格式遵从率、单轮延迟和修复率仍未知。AI 插画只有未来扩展位，没有生成实现。服务仅本机、无账户认证；read-only ACP 和空 workspace 是防护层，不是恶意多租户 sandbox 保证。

## Controller cycle 1
Corrected UTF-8 adaptive baseline accepted 6 turns then failed turn7: six facts exceeded undocumented max5; repair repeated the defect. Evidence: artifacts/eval/baseline-utf8-v010. v0.2 uses an authored opening mini-plan (not model generated), retains live planning at turn9, raises the fact resource ceiling to20 with narrative target1-5, shares limits with repair, and records final candidates without thoughts. All19 tests pass. Performance replay is pending; no speedup claimed yet.


## Controller cycle 2 candidate
Cycle1 fixed replay:7/7 accepted, no repairs, mean first prose6.26s, mean completion16.56s; opening4.98s/12.80s versus corrected baseline22.60s/31.66s. This is a small stochastic replay, not a production SLA. Reader still reports repeated threats and missing durable payoff (overall4/5). v0.3 adds local physical/possession/scene-resolution constraints without another model stage, omits obsolete opening scene after turn1, displays power limits, labels stages in Chinese, reconciles cancel/retry against durable state, rejects damaged UTF-8. New live measurements pending.


## v0.3.1 model/style verification candidate
Cycle2 replay7/7 completed, mean6.50s first/17.20s full; judge4/5, repetition improved but spatial flaws remain. A turn5 Terra/low probe gave more natural correction and genuine short respite:10.00s first,21.18s full versus Luna6.91s/19.45s. Probe is NOT gameplay; same fictional state/action, but plan metadata createdForTurn:1 was omitted (19characters). Single-scene observation only. Default narrator now Terra/low for a bounded10-turn quality run, Luna remains configurable faster mode. Added explicit separation of writing constraints from narrative wording. No claim of overall winner before actual run.


## v0.4 growth-affordance correction
Terra/low adaptive test final-adaptive-v031 completed10/10 with checkpoint and two chapters, mean8.01s first/18.57s full. Actual player earned10 coins then spent10 to leave, refusing continued escort; judge spatial5/coherence5 but cultivation3. Scene had drifted toward port survival/work. v0.4 keeps the same pipeline but gives fresh worlds optional spiritual-tide, beginner-medicine and breathing-method affordances and a cultivation goal, with zero free realm/progress. Existing saved10-turn state is not migrated. A separate five-action directed growth test plus abuse/protocol/browser checks is pending; do not mislabel directed replay as ACP player decision-making.

