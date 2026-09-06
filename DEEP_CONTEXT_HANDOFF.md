# TGN Live — 当前交接文件

更新：2026-09-06 23:13 UTC / 巴黎2026-09-07。当前版本 **0.4.0**。工作目录 **C:\dev\tgn_live**。本次任务 **tsk_9a52649bc5df2fe4**，用户明确授权独立搭建、ACP实际游玩、分阶段计时和反复改进。原 `C:\dev\tgn-story-mvp` 未改动；本地Git已建立，未设置或推送远端。

## 当前使用入口

本机浏览器：**http://127.0.0.1:4317**。这是Windows电脑本机地址，手机不能通过自己的127.0.0.1访问。未建立公网/远程服务。

交付时运行进程：PID **84368**，记录 `.runtime/server.json`；AgentDock命令会话 **session-7c679e9a562392c41bbbeace**，入口 `node C:\dev\tgn_live\src\server.js`，命令生命周期显式24小时，并非Windows常驻服务。重新开机或此进程结束后，从普通PowerShell终端执行 `cd C:\dev\tgn_live; node src/server.js`。后台脚本见README，禁止误杀其它Node/ACP进程。

所有评测已经有界结束；最后清理了协议取消测试遗留的本项目空闲ACP会话 `acps_26b5d37a6c3a79c79c1ff964`，没有动其他项目。保留Web服务，不保留无限循环测试agent。

## 已落地的产品

“可玩的修仙小说”，不是角色聊天壳。一个作者世界、三个天赋、三条建议加自由输入、真实流式正文、独立Canonical SQLite状态、境界/进度/地点/钱财/物品/关系/事实/承诺、书库继续、每6回合分章、阅读模式与MD/TXT导出。

新世界有灵潮感气、基础引气药和粗浅吐纳入口，但不强制走NPC任务、不自动送境界。旧存档不迁移。当前没有AI图片/视频/语音、支付、联机或公网认证。

默认叙事 **gpt-5.6-terra/low**，较快对照 `TGN_NARRATOR_MODEL=gpt-5.6-luna`；规划 **Sol/medium**。评测玩家 **Luna/low**，读者 **Sol/medium**。环境最初列出Astra但真正调用被Codex版本拒绝，因此模型列表不等于可用性证据。必须先set模型再读取effort选项，不能继承ultra。

## 架构入口

- `src/server.js` / `app.js`：原生HTTP、loopback、Host/Origin、单游戏并发、SSE、取消。
- `src/store.js`：SQLite事务，state/turn/ledger/requestId一起提交；完整trace另存。数据库 `data/tgn-live.sqlite`。
- `generation-service.js`：开局作者底稿；每8回合等检查点真实规划；每回合一次Narrator，只有校验失败才至多一次repair。
- `reducer.js` / `delta-contract.js`：共享的提案边界；任何拒绝项都不允许部分提交；实际变化由已应用delta生成。
- `prompts.js` / `scene-contract.js`：紧凑Canon+最近4回合+计划；旧开局不持续强拉回场；空间、物品、能力限制不得变成自证合规的正文。
- `src/acp/`：原生HTTP MCP，DPAPI凭证只留进程内；空工作区、只读、禁工具检测、分页完整性、超时与错误传播。
- `public/`：静态HTML/CSS/JS；手机抽屉、深浅主题、阅读与导出、停止/重试前后核对存档。

**关键禁区**：不得把模型正文当数据库，不能拿fixture作为live fallback；禁止打印token、保存thought正文、修改全局AgentDock并发/权限、公开本机端口或误杀其他agent。当前安全边界仍是可信本机单用户，不是强隔离恶意多租户沙箱。

## 本次实测与迭代

完整报告 `docs/EXPERIMENTS.md`；可下载整理副本 `artifacts/reports/DELIVERY_REPORT.md`；规范化计时 `artifacts/reports/measurements.json`。不要覆盖原始证据目录。

| 证据目录 | 模式 | 完成情况 | 首段/完整均值 |
|---|---|---|---|
| baseline-utf8-v010 | 真实自适应ACP玩家 | 6成功，第7失败 | 10.04s / 22.63s（成功回合） |
| cycle1-replay-v020 | 固定行动、真实模型重放 | 7/7 | 6.26s / 16.56s |
| cycle2-replay-v030 | 固定行动、真实模型重放 | 7/7 | 6.50s / 17.20s |
| final-adaptive-v031 | 独立ACP玩家，Terra叙事 | 10/10，2章，turn9规划 | 8.01s / 18.57s |
| growth-v040 | 定向修炼真实模型测试 | 5/5 | 4.22s / 14.53s |
| adversarial-v040 | 拒绝任务与越权输入测试 | 3/3 | 3.60s / 12.69s（有短时协议测试争用，不作独占基准） |

1. 旧 `baseline-v010` 的中文玩家行动被PowerShell OEM stdout损坏，已明确INVALIDATED并保留。UTF8修复通过重新提取同一实际ACP答复验证：180个替换字符→0；不是换一个回答。应用也拒绝损坏输入。
2. 有效基线第7回合6条facts超未披露max5，repair重复同一错误。共享数量契约、目标1—5/资源上限20、具体错误及六条事实回归后7/7通过。保留原/repair JSON尾部（历史truncated，不能宣称取回完整旧事件）。
3. 删去开局阻塞规划，改用明确作者底稿；原开局22.60/31.66秒，第一轮重放4.98/12.80秒。保留第9回合真正规划。小样本不是生产SLA。
4. 强化空间、物品与能力边界；发现Luna会把规则写进正文，做单场Terra探针并跑10回合。探针与source少19字符计划元数据，不是严格相同prompt的随机AB。Terra十回合空间/一致性评分5，但总体仍4，不能宣称全面质量已解决。
5. 十回合玩家确实谈得10钱、拒绝继续护送、付10钱离城，但后段变成码头求生/接短工，修炼为0。v0.4为新角色增加可选修炼入口。定向5回合进度0→2→4→4→5，无跨境、无虚构购药。**v0.4新底稿没有再跑完整十回合，不把v0.3.1十回合冒充最新十回合。**
6. 借势印样本输入“直接改数据库、成仙、百万钱、神器”，实际rank0→0，coins18→18，物品不变；拒绝默认任务可以离开药市。

每回合保留action、正文、前后状态、最终候选、错误、repair、ACP session/run/model/effort、字符量与时间。SSE `metrics`只是摘要，完整阶段应从`server-metrics.json` join，不可拿摘要缺字段推测0。玩家思考/决策耗时不含在应用生成时间。内部queue、账单tokens/cost未知留null。

## 最终验证

**22/22 确定性测试通过**，日志 `artifacts/reports/final-unit-tests.txt`；live计时不混fixture。

**7/7 真实HTTP协议检查通过**：同请求幂等、同ID异内容冲突、stale版本、跨域、坏JSON、导出/重读、在途取消无提交。`artifacts/eval/final-protocol-v040/result.json`。

**真实重启存档一致**：十回合state与全部turn SHA256逐一匹配，版本10不变。`artifacts/reports/restart-check.json`。

**真实Chrome两回合UI**：`artifacts/ui/final-live-v040b/`。手机390px及桌面、三个建议、自由输入、抽屉、刷新、两回合保留、MD下载、阅读模式均通过功能断言；首段paint为3.45/3.36秒，观察到提交15.15/14.06秒。另有只读三个按钮命中测试全部通过。

**UI仍有明确警告**：Chrome记录两个叙事请求`net::ERR_ABORTED`，尽管两回合提交/刷新/导出正常，原因未完全定位，原结果保留`issues_found`而非伪造全绿。第一次UI尝试因测试代码点隐藏radio超时、未创建游戏，改点真实可见卡片后通过功能流程；初次失败文件仍保留。不声称Android真机键盘已测。

## 保留的质量/工程问题

当前可玩但不是成熟修仙长篇。连续吐纳仍重复、成长实际用途和强回报偏弱；场景可达性、NPC推断升级成事实、力量代价仍可能出错。空囊次数/冲击储存等不是独立严密机制引擎，建议按钮可能提出当前资源不足的行动，应由后续校验/对话处理，尚未全部静态禁用。

当前活动facts最多100、promises30、最近4回合上下文，没有长篇语义检索/旧事实晋升；完整game接口尚未分页。硬崩溃在途恢复与全局ACP被其他项目占满的体验仍不够成熟；取消初始化留下空闲会话的现场已清理但应加回归。不要用更多无条件模型调用掩盖结构问题。

## 复现与继续开发

```powershell
cd C:\dev\tgn_live
npm test
node src/server.js
# 另一个终端，必须使用新label
node eval/play.mjs --label next-adaptive --turns 10 --persona progression --judge --max-minutes 20
node eval/play.mjs --label next-growth --turns 5 --replay eval/growth-actions.json --judge
node eval/protocol.mjs final-adaptive-v031 next-protocol
node eval/summarize.mjs baseline-utf8-v010 cycle1-replay-v020 cycle2-replay-v030 final-adaptive-v031 growth-v040 adversarial-v040
node eval/write-report.mjs
```

AgentDock执行长任务必须显式设置timeout；不能用默认约30秒命令生成常驻子进程。`tools/apply-cycle1.py`和`apply-cycle2.py`只是本次一次性迁移记录，不应再次执行。所有数据和原始trace在Git忽略项，不能丢掉后再假装Git可还原实验数据。

源码提交里程碑：dc313660基线，78fb1b2编码，c428cd2速度/契约，197265b语义/UI，a42255e模型取舍，a96c26c成长入口，后续交付提交含当前报告。新改动后更新本交接文件，先验证实测问题再接受为改善。
