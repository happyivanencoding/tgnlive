# TGN Live — Deep Context Handoff v0.9.0

已发布并核验：**v0.9.0**，生产代码提交 `6b59581a123494cfe393d68030369822735445d5`，原站4317与owner-only Access保持不变；28本旧书、131个历史回合、13个显式世界快照及全部8张持久表在部署前后逐表内容一致。正式部署与公网边界回执见 `artifacts/reports/ascension-v090/DEPLOYMENT.json`。这不是长期留存或所有成长循环已经解决的宣告。

已核验10条20回合主轨迹，共200唯一成功提交；原恢复链不重复计数。真实C驭兽阶段名是一环驭手，E第二刻式是折潮步，新港为鸥背港。星图T10/T17两次升阶但机关链、筹码漏记和停止条件覆盖仍在。最终正文、净账户、逐阶段trace、失败与耗时矩阵均位于`artifacts/reports/ascension-v090`。


## 当前入口与发布证据

项目 `C:\dev\tgn_live`；仓库 `happyivanencoding/tgnlive`；原入口 `https://live.thegreatnovel.com`、localhost4317、owner-only Access。v0.8.0起点经实查为 `26fc8e1d241aebf8ee798c6f186d5a079cd2afe0`。本版实际部署代码commit、备份与旧数据核对见 `artifacts/reports/ascension-v090/DEPLOYMENT.json`，不要把候选冻结或本文件写成上线证明。

另一个安卓worktree `C:\dev\tgn_live_android` / `mobile/android-native` 本轮未动。代码修改前继续检查HEAD、origin/main与worktree，不覆盖其他对话的修改。

## 接手阅读顺序

先读本文件与 `DEEP_CONTEXT_HANDOFF.md`，再读 `docs/V090_RESULTS.md`、`docs/ASCENSION_ITERATION.md`、当前核心docs。对照 `artifacts/reports/ascension-v090/FINAL_MATRIX.json`、每条 `READING.md`、`PLAYER_DECISIONS.json`、`ACCOUNT.json`、`PHASE_TRACES.json`。原始失败、ACP metadata及全部attempt保存在忽略提交的 `artifacts/eval`。`docs/V080_RESULTS.md` 是历史基线，不是本轮最终结论。

## v0.9.0 当前生产契约（2026-09-07）

本节覆盖下方历史版本说明；实际部署状态与代码提交以 `artifacts/reports/ascension-v090/DEPLOYMENT.json` 回执为准。仍是原来的 TGN Live / 4317 / owner-only Access，同一书架、同一Canon，没有第二产品。详见 `docs/V090_RESULTS.md` 与 `docs/ASCENSION_ITERATION.md`。

首次入场直接释放现有World的世界规则、当前/下一力量阶段、行动空间、稀缺目标与天赋优势；局势明显改变后可直接重述人物位置、公开利益、结果与可走路径。三个建议说明争取什么，不要求每条都奖励。有限POV可整理公开信息，不能泄漏隐秘事实。

阶段身份服从Canon中稳定的核心能力与必要资源，不受XP100阻挡；仍限世界快照中的精确相邻阶段，时间、满进度和一次特殊借力不能自动突破。身体能力记录benchmark，不自动授予组织权利。旧存档与worldSnapshot不迁移。`update.qty` 为剩余件数，省略qty保留部分使用的包/瓶；update不得增加件数。提案为回合结束净状态，询价不等于授权付款，已售货物不留库存。

Story Brain沿用Sol/medium，计划只增加可选graduated/transition，记录已掌握普通环节与真正的阶段条件。成熟操作可在玩家授权范围内整段结算；不追加同义核验前置。leverage用于真实可反复调用的人、身份、组织资格、独占渠道/产业，普通路线用facts/capabilities，不批量改旧记录。

默认 `TGN_PLANNER_STRATEGY=prefetch`：已提交第6/14回合后基于当时Canon准备第8/16版本计划，下一次点击不等规划；就绪且游戏/语言/阶段/目标版本一致才用，未就绪/失败/过期/冷启动直接继续当前Canon与可用旧计划。当前行动优先，未发生的提前计划不是Canon。取消、过期、换游戏/阶段和退出会回收本任务；后台计划不写角色状态。`checkpoint` 环境开关保留为对照/回退。没有每回合judge、二次rewrite或更低effort。

主要质量实验必须20+唯一成功提交回合，同Canon恢复且失败原样保留；读全文/动作/建议/状态/显式Player意图。浏览器帧计时与服务端SSE分开，后台规划成本、Player思考、失败长尾单列。原移动布局/12–24px/滚动锁/preview同构/Stop/IME/RTL不改；本版仅更新静态缓存版本。


## 本轮结论与剩余问题

A的开场更清楚，但万相/驭兽各20回合仍失败于低层循环，不能作为长期成长PASS。B万相T10承印，裂陆T9通劲、T10免重复入门测试、T11完整三晚课程；身体成长改善，但社会身份与更大地图尚不均衡。C驭兽20回合真实Chrome操作，出现跨岛与公开申报身份，规划不再位于checkpoint前台等待链；20个提交仅19份浏览器帧计时，缺失回合从Canon/精确Player动作验证恢复且不补造帧。

D隐潮第一式更早可得，但后二式准备仍服务化，否决为完整解决方案。E继续修第一阶段的行动空间，真正取得第二式、跨港夜航资格与新圈层引介；经营仍可作为玩家自主资源路线，不等于所有服务消失。具体回合与星图结果以结果文档/最终矩阵为准，不用旧摘要代替文件。

旧v0.8驭兽16回合身份事件已经过真实单次后续提案复现：同一提案旧reducer因XP门槛拒绝、新reducer接受，原文件hash未变。这只是定向bug证据，不能计为一条20回合轨迹。库存件数bug有known-bad/known-good回归；交易语义、旧能力描述、偶发提前计划过时及公共身份措辞仍需真实样本审查，不能宣称彻底一致。

## 运行、回退与隐私

`node --test`；`powershell -File scripts/start-local.ps1` / `stop-local.ps1` 仅管理本项目Web计划任务，静态资源每次按版本冻结。部署前用 `python scripts/sqlite-release-snapshot.py capture .runtime/<new-private-directory>` 通过SQLite backup API备份；停止旧服务后、启动后分别verify对应snapshot.json，比较所有旧表内容hash/行数，发现变化先检查不要覆盖。恢复可用已冻结源和私有备份；勿用实验库覆盖生产库。

原始数据库、corpus、原著全文、token/账号/隐藏推理不提交。只读学习 `C:\GoogleDrive\笔记\50_Corpora\TGN` 和旧TGN，不能照搬旧生产pipeline。主要研究失败必须有因果价值，不为凑PASS改Player路线或judge。完成修改同步docs/handoff并commit/push origin/main。

---

# 冻结历史上下文：v0.8.0（以下冲突规则已被上方覆盖）

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

# v0.7.0 五语上线交接（2026-09-07）

任务 tsk_372fe95f0f4f9ec7。当前代码与4317运行版本v0.7.0，线上仍是既有live.thegreatnovel.com owner-only入口。源码仓库happyivanencoding/tgnlive、main；每次接受改动连带更新本文件与系统docs并commit/push。实际最终提交号以git HEAD、origin/main与本地交付报告核对，不把历史提交号当当前。

## 本次变化

主页最开始右上角五语：中文（zh，首访固定默认）、English(en)、Français(fr)、Español(es)、العربية(ar)，localStorage key为tgn-live-language。故事更多菜单也可切，生成中禁用。接口语言贯穿预设、World Forge、角色、Narrator/Planner/Repair及状态/导出固定标签；不增加无条件翻译模型。Arabic RTL、手机阅读输入、各历史正文段落自己的lang/dir均已处理。既有正文和源语言专名不自动翻译。

先读docs/I18N_UI.md、I18N_BACKEND.md、I18N_EXPERIMENTS.md。I18N_CONTRACT是本次约定，不应覆盖实测后的具体实现。五套预设保持各自力量系统，fr/es/ar不共用通用力量尺；ID/rank/数量不改。Arabic固定attitude偶被模型翻译，两例已归一并保留真实失败，未知枚举仍拒绝。

## 实测与部署

全仓66/66 Node；隔离浏览器46项；真实浏览器20项，成功执行Arabic第3回合，但保留1个net::ERR_ABORTED收尾警告（没有丢档或JS错误）。五语各两个真实ACP回合均完成；中文转法语保留旧文，法语与阿语真实创建世界并开局均有成功证据。阿语创建先后两次格式失败未删，最终全新创建46.514秒、开局16.678秒。手机为桌面Chrome视口/事件模拟，不是Android/iPhone真机，也非母语文学编辑验收。

2026-09-07T10:02:25Z部署重启后25书、121回合、2自建世界、10快照、126请求所有旧字段逐值相同，新语言列默认zh。没有hash或覆写历史。证据artifacts/reports/i18n-v070/production-after.json。现由原TGNLive-Web计划任务运行，PID35240（即时归属以.runtime/server.json为准）。线上仍只允许owner Access；边界6项通过artifacts/remote-v070/boundary.json。

全部实验用独立4318和.runtime/i18n-test/games.sqlite，不要把测试书迁入线上。开发ACP两个早期run因断连失败，协调者接手完成实现和验证；不把它们报作成功交付。保留生产4317服务，测试服务器与有界实验在交付结束时关闭。原TGN和其它项目不改。

原始事件、实际session/run/model/effort与阶段时间位于artifacts/eval/i18n-v070、i18n-ar-final-v070和artifacts/ui/i18n-live-final-v070。Node、fixture和离线重放不等于真实ACP质量；API接收不是屏幕paint；缺失账单token/cost/内部queue不猜测。

---

以下为v0.6.4历史交接，仅其仍相符的架构与运行规则适用，版本和功能以上文为准。

# TGN Live — v0.6.4 交接与历史证据

**2026-09-07，交付代码v0.6.4。** 本文件是当前入口；历史版本的结论不能覆盖这里。阅读顺序：AGENTS → 本文件 → docs/SYSTEM → WORLD_SYSTEM → MOBILE_DESIGN → V060_RESEARCH_AND_EXPERIMENTS。HANDOFF.md只做指引。

## 1. 项目、仓库和权限

本地 `C:\dev\tgn_live`，GitHub `happyivanencoding/tgnlive`，唯一开发分支main，origin指向该仓库。每次接受的代码/版本更新，连带更新本交接和相关docs、保存针对性验证，commit并push origin/main。以 `git log -1` 与 `git ls-remote origin refs/heads/main` 确认交付，不因为文档写了“完成”就跳过实际push。不要force-push、不要提交credentials/data/.runtime/原著/私人库或原始模型输出。

独立于 `C:\dev\tgn-story-mvp`；本轮原TGN、蒸馏和下载提示词只读，不修改其生产。所有来源的实际阅读边界见世界系统与实验报告，不能说运行时已接入GBrain全文检索。

## 2. 现在如何打开

线上：`https://live.thegreatnovel.com`，仍需现有本人的Cloudflare Access登录。本机：`http://127.0.0.1:4317`。二者同一SQLite，不是匿名多用户服务。

```powershell
cd C:\dev\tgn_live
pwsh -NoProfile -File scripts/start-local.ps1
# 停止仅属于本项目的服务
pwsh -NoProfile -File scripts/stop-local.ps1
```

Node24、AgentDock/Codex已登录且本机开机联网。start-local通过当前用户Limited Interactive的 `TGNLive-Web` 计划任务运行run-local，避免有限AgentDock命令把子Node一起回收。HKCU登录启动TGNLive仍调用start-local。没有修改电源/睡眠策略，不声称关机、注销也继续。

状态 `.runtime/server.json`，日志 `.runtime/server.out.log`、`.runtime/server-error.log`；受限的环境传递在server-bootstrap.json，不能提交或打印凭据。正式接入仍按 `docs/REMOTE_ACCESS.md` 现有JWT/来源检查，不开放新公网端口。

## 3. 已经实现并可游玩

五套预设：烬河照夜、云背群岛、灰塔星契（原创）；赤曜药州、万相猎庭（明确标注非官方同人灵感，关联斗破苍穹/斗罗大陆的成长机制，新人物新开局，不是官方或原著完整复刻）。

一句话/1—2000字符prompt → 一次World Forge → 背景、力量来源、每阶能力用途、三个天赋、人物利害和开局 → 完成才保存 → 玩家预览、选天赋、命名开书。旧世界不会套进每个新故事；每本新书有不可变定义快照，旧烬河存档按legacy读取，不重新写其事实。

手机发现/创作/书架分开，正文为主，底部行动坞、建议/自由行动、IME/键盘适配、真实阶段等待、草稿按书恢复、回到最新、字号行距底色、状态与观测sheet、停止/重试、Markdown/TXT导出。刷新到发现页，点击“继续阅读”回原书并还原草稿，这是本版真实流程，不是自动跳进正文。

常规回合仍是一次Narrator，开局作者底稿，每8回合等检查点才规划；只有实际无效提案才至多一次修复。预览不是Canon，complete后才事务保存。capabilities保存具体学会/强化的技能；物品update保留半包/半瓶余量，整件用尽才remove。已有NPC更新可只给现有id+attitude，名称沿用Canon，新NPC仍必须给真实名称。

## 4. 模型、ACP与成本口径

正文gpt-5.6-terra/low；World Forge=gpt-5.6-luna/medium；Story Brain=gpt-5.6-sol/medium；自主测试玩家=Luna/low，独立盲读=Sol/medium。以真实trace的model/effort/session/run为准。全局ACP并发2，不抢其它项目或杀它们的agents。

cancel/close各3秒独立清理预算，失败留下 `acp_cleanup_incomplete` 的session/run并释放应用槽。根因是实际断连后finally无限等close，已用针对性测试验证；这不是保证ACP永远不会掉线。

阶段时间分开：世界创建一次性等待、首段正文、整回合、规划、条件修复、保存；ACP准备属于生成内部子阶段。玩家决策不算用户等正文。未知token账单/成本/内部排队保留null。

## 5. 本轮证据和冻结边界

已接受：手机流程/状态反馈、独立世界快照与力量体系、短世界底稿、持久技能与修炼时间压缩、作者可在既有规则中创造尚未规定的事实。不是照搬提示词，更不是宣称顶级男频已完成。

已否决：v0.6.2只补“奖励别变下一扇门”的重复提示，真实10回合没有显著改善，该段已删除，不冻结。

正向证据：v0.5与v0.6同五行动，后者将体感变成可复用定息能力，盲读偏好后者；最新v0.6.3同一星图世界8回合中，追痕/斜照/道具/有限借重形成设伏、制住对手，独立盲读偏好B并判materialImprovement。后一个比较是10对8回合、动作分叉、非随机小样本；不能把优势全部归因于prompt或推广到所有题材。

剩余质量问题必须保留：新技巧从失败到成功的学习节点偏略、关系标签提升较快，星砂与核心尚未完成吸收/长线兑现，天赋与通用技巧的区分仍需更精确的世界设计。不要以增加通用审阅链或成长评分器代替改这些真实问题。

速度：相同世界prompt一次生成60.824→47.799秒（各1样本，同Luna/medium）；相同五行动v0.5首段8.229/完成19.371秒，v0.6.3首段6.216/完成20.179秒。最新8回合首段8.037/完成29.584秒，其中3次条件修复。不能宣传所有回合已变快。

v0.6.4修复其中两次无谓NPC姓名修复：两份未经改写的真实原始提案离线重放均成功，不调用模型，原本各耗19.966/18.044秒修复。离线重放不是新测8回合均值。第三次真正缺分隔符仍需条件修复，未放宽到猜测Canon。

失败 `treatment-growth-v061` 原样保留：计划5、尝试3、成功2，第3断连/无限清理，5分钟预算耗尽。不能报5/5或填造缺失server-metrics。

## 6. 完成的验证

45/45 Node测试；29/29移动UI契约fixture；7/7真实已有存档只读；真实Chrome390×844两回合8/8功能检查；当前8回合游戏与7个世界定义重启前后深比较完全一致。具体时间与文件在研究报告。

最新真实浏览器2回合第一段paint6.404/17.315秒，完成15.601/50.667秒；第二回慢在模型生成50.615秒，不在数据库，也没有修复调用。无JS pageerror；仍有1个 `net::ERR_ABORTED`，没有观察到提交/存档丢失，但原因未完全定位，因此浏览器总结果保留issues_found，不粉饰全绿。上一轮真实浏览器测试错误地假设刷新自动进正文，脚本后来改为真实“继续阅读”流程；失败文件未删除。

以上是桌面Chrome视口/VisualViewport/composition模拟，不是Android/iPhone真机或APK验收。远程Access边界验证是现有6个用例，不是公共平台安全审计。

## 7. 从哪里复核

`docs/V060_RESEARCH_AND_EXPERIMENTS.md` 汇总各轮、阶段时间、实际原因与最后验收；`artifacts/reports/v063-stage-measurements.md` 是模型长测完整表。

代表正文：
- `artifacts/eval/stars-authority-v063/novel.md`：星图世界8回合（自主ACP玩家）。
- `artifacts/eval/treatment-growth-v063/novel.md`：烬河五行动固定重放，真实分次用药与技能成长。
- `artifacts/ui/mobile-v064-live/browser-export.md`：另一同人灵感预设的真实浏览器2回合。

证据：`v064-unit-tests.txt`、`v064-relationship-replay.json`、`v064-restart-check.json`；UI `artifacts/ui/mobile-v064-live/result.json`。fixture目录名仍mobile-v060，最新文件时间2026-09-07 08:28 UTC对应v0.6.4验收，不把目录名当运行版本。

重跑使用新label，别覆盖旧失败；`eval/play.mjs --replay`是固定重放，不叫自主游玩；`eval/replay-relationship-incidents.mjs`只离线解析真实旧提案，不改在线Canon。测试数据库现存样本保留，可在书架阅读；不要无授权批量清理。

## 8. 未实现/未证明

仍为私有MVP，没有公共注册/多用户隔离、付费、图片、语音、视频、社区或运行时全库检索。世界通常先定义5阶，事实/技能/NPC有MVP容量；没有数百回合自动长期记忆/力量扩展证明。读者模型不是留存或真人质量保证。本轮结束后只保留Web服务，未承诺无限后台自动开发。

发布完整性：package.json、src/config.js与运行health版本均为0.6.4；最终交付须同时确认工作区干净及origin/main与HEAD一致。
