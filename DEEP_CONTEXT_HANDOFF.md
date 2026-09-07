# TGN Live — 当前交接

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
