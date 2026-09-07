## Android Native 候选 · 2026-09-07

新增同产品原生客户端 `apps/android/`，Android `0.8.0-android.1` / `8001`。移动隔离 worktree `C:\dev\tgn_live_android`、短期分支 `mobile/android-native`；此段不表示 Android 已通过生产验收或主线 Web 已升级。核心开发的未提交更改不属于本次 Native patch。

Kotlin/Compose、真实 JSON/SSE、书架/创建/阅读/状态、五语/RTL、主题/字号/草稿/恢复已实现候选代码；复用原后端与 Canon，没有修改共享 API、Cloudflare policy、生成逻辑或 JingYou。登录采用 Cloudflare 官方加密 CLI transfer + 原生 Keystore，**实际浏览器→App 生产登录仍未验证**。

Debug 构建和 JVM 测试已有通过记录；最终计数、各构建状态和 APK 哈希以 `artifacts/reports/android-native-v0801/RESULTS.json` 为准，不沿用中间19/27项结果。Android15 模拟器已启动桌面，但调试授权确认被工具拦截，未完成 App 安装/真实 UI 验证；已停止该授权尝试，不改 keys 或绕过。**Native production 回合数0；手机端耗时 NOT_MEASURED；Emulator 游戏/登录/输入/滚动等 PENDING_EMULATOR_VALIDATION；硬件专属项 PENDING_PHYSICAL_DEVICE_VALIDATION。** 不把这些写成 PASS。

先读 `docs/ANDROID_APP.md`、`docs/NATIVE_MOBILE_AUTH.md`、`docs/NATIVE_MOBILE_DESIGN.md`、`docs/NATIVE_MOBILE_TESTS.md`。后续从已授权 Android 的生产 vertical slice 与实际截图/流式/多回合验证继续，不重造后端。稳定接受后先 fetch 最新 main、解决真实冲突再合并；禁止 force/reset/夹带核心工作。诊断脚本在 `apps/android/scripts/device-pass.ps1`，默认 APK 连接现有公网，不依赖 localhost。

## 当前主线：v0.8.0 · 2026-09-07

项目 `C:\dev\tgn_live`；唯一发布分支 **main**，远端 **happyivanencoding/tgnlive**。继续开发前先读本节、`docs/V080_RESULTS.md`、`docs/PROGRESSION_ITERATION.md`、当前代码和实验正文。以下旧 v0.7.0 历史不覆盖本节。v0.8.0 已部署到现有生产入口并通过存档完整性与访问控制复核；正式回执为 `artifacts/reports/progression-v080/DEPLOYMENT.json`。旧版25个存档与121个回合内容保持不变。

本轮不是成长系统完成宣言。真实样本：旧星图18回合、成长版星图18回合、独立驭兽16回合、隐潮七港18回合。驭兽第17回合在模型准备阶段超时；新武道两次开局准备超时、没有提交回合，不能算通过了长测。保留所有失败和混合版本恢复记录，不能把重跑或单位测试数量当留存证据。

### 接受的代码与运行规则

1. 持久`state.progression`区分真实有边界的关系/通道/身份/产业筹码与待争取机会；技能、物品、态度和角色诺言仍走原字段。旧存档只在下一成功回合补空结构，不追赠奖励。阶段欲望不再随局部调查目标丢失，近突破不会同境界每回合重复触发规划。
2. 逐字证据门槛和“兑现必须送资产”硬门槛被真实失败否决。旧`evidence`只作可选注释，知识性结果`answered/materialized:false`不冒充成长、不触发补奖重写。结构验证不是叙事语义证明；剩余库存分量/叙述支付一致性问题必须继续检查。
3. 新预设：隐潮七港（诡秘之主机制，六阶）与裂陆武途（全球高武机制，七阶），全五语、原创人物专名情节。不要说两者都通过18回合；以逐样本证据为准。
4. 手机12–24px（默认16、输入16），稳定历史节点/段落、用户上滚锁定、稳定dock/Stop按钮、轻量真实收益反馈。独立最终geometry-04重放：用户锚点、dock起止高度、预览转正文偏移均0；物理Android/iOS和WAN仍未测。
5. Narrator Terra/low，Story Brain Sol/medium，World Forge Luna/medium，Player Luna/low。降低planner effort未证实足够收益，默认不换。短计划去掉重复Canon清单，仍有同步checkpoint长尾；不得承诺总体变快。
6. ACP工具/权限/终端仍禁止；available_commands_update只是目录元数据，精确放行不执行。新增20秒准备预算、token/MCP取消和五个准备子阶段；正文总预算仍120秒。该措施限缩坏等待，未证明上游偶发阻塞根因已经修复。
7. 生产4317、Cloudflare Access owner-only、原存档与原域名不变。启动脚本将public固定为.runtime/public-releases版本快照，避免开发时静态文件即时污染已部署UI。测试只用4318/4319独立DB；全局同时最多两个ACP生成，本轮故障复测采用单槽。

### 接手优先事项

先读星图中段重复谈条件、驭兽短路线反复验证、神秘世界低价值服务循环和资源消耗事件。下一轮要让已有优势支持更完整的行动结算、真正的身份/生活方式变化，而不是继续加“有payoff”的口号或每N回合突破。一次只能修改有真实样本支持的瓶颈。开发后更新双handoff、docs与必要证据，commit/push main；不提交私有SQLite、corpus、原著、token或账户文件。

详细阶段统计：`artifacts/reports/progression-v080/COMPARISON.json`。可直接阅读的正文、动作和状态变化：同目录各样本的`READING.md`，本机全量失败trace仍在`artifacts/eval`。浏览器可见帧与服务端SSE分别计算，玩家决策时间不计入应用等待。


<!-- V080-CURRENT-END -->

# TGN Live 接手入口

项目：`C:\dev\tgn_live`。仓库：`happyivanencoding/tgnlive`，分支`main`。当前代码v0.7.0。

**先读 `DEEP_CONTEXT_HANDOFF.md` 的最新状态，再读 `docs/SYSTEM.md`、`docs/WORLD_SYSTEM.md`、`docs/MOBILE_DESIGN.md` 与最新 `docs/I18N_EXPERIMENTS.md`（五语）、`docs/V060_RESEARCH_AND_EXPERIMENTS.md`（成长迭代）。** 本文件只做入口，不维护第二套互相冲突的实验结论。

每次接受的代码/版本修改，连带更新交接及相关系统docs、保存针对实际问题的验证，commit并push到origin/main。不能把候选设计或没有结束的ACP任务写成已交付。

原TGN生产目录、原著库和下载提示词只读参考。运行数据库、模型原始输出、凭据和原著不进入Git。保留已有存档和私有Cloudflare Access，不把本轮MVP说成匿名多用户平台。
