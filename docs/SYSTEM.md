## Android Native 当前状态（2026-09-07）

现有Android已更新为 **0.9.0-android.3 /9003**，源码在 `apps/android/`，同一生产账号/书架/存档/Canon/API。实体Samsung SM-S928U1 /Android16上已有7个专门测试书的真实成功回合；连续自由/建议、停止重试、Gboard九键“你好”、后台恢复及系统返回的独立用例通过。六分类状态、五语UI/RTL、亮暗色与历史滚动有真实操作/截图证据；未把整体早期失败日志改成PASS。

提交后旧操作下收、首段前呼吸点；`narrative_end`后自动出现同一个草稿编辑器，发送仍等正式`complete`。最后一轮正文尾字到草稿可用129ms；后台确认仍有真实约9.5s成本，确认到可发送115ms。实际Gboard未选候选跨确认保留并可继续选中；无自动提交/第二Canon。顶部状态按钮与窄屏六分类全可见；书架按长期game/书组织，不另建数据库。

共享变更只有必要的正文边界/trace，以及成功占有端口后恢复重启遗留running收据；见 `docs/NATIVE_TURN_HANDOFF.md`。原重启快照requests差异失败回执保留，Canon表一致；不宣称全表相同。构建/30项JVM/17项相关Node及精确真机结果见 `docs/NATIVE_MOBILE_TESTS.md`、`artifacts/reports/android-native-v090-physical/`。手机手感/120Hz/半小时疲劳、完整OEM/5G与首次浏览器登录仍需复核；不要将本轮基础设备通过写成所有场景通过。


## v0.9.0 当前生产契约（2026-09-07）

本节覆盖下方历史版本说明；实际部署状态与代码提交以 `artifacts/reports/ascension-v090/DEPLOYMENT.json` 回执为准。仍是原来的 TGN Live / 4317 / owner-only Access，同一书架、同一Canon，没有第二产品。详见 `docs/V090_RESULTS.md` 与 `docs/ASCENSION_ITERATION.md`。

首次入场直接释放现有World的世界规则、当前/下一力量阶段、行动空间、稀缺目标与天赋优势；局势明显改变后可直接重述人物位置、公开利益、结果与可走路径。三个建议说明争取什么，不要求每条都奖励。有限POV可整理公开信息，不能泄漏隐秘事实。

阶段身份服从Canon中稳定的核心能力与必要资源，不受XP100阻挡；仍限世界快照中的精确相邻阶段，时间、满进度和一次特殊借力不能自动突破。身体能力记录benchmark，不自动授予组织权利。旧存档与worldSnapshot不迁移。`update.qty` 为剩余件数，省略qty保留部分使用的包/瓶；update不得增加件数。提案为回合结束净状态，询价不等于授权付款，已售货物不留库存。

Story Brain沿用Sol/medium，计划只增加可选graduated/transition，记录已掌握普通环节与真正的阶段条件。成熟操作可在玩家授权范围内整段结算；不追加同义核验前置。leverage用于真实可反复调用的人、身份、组织资格、独占渠道/产业，普通路线用facts/capabilities，不批量改旧记录。

默认 `TGN_PLANNER_STRATEGY=prefetch`：已提交第6/14回合后基于当时Canon准备第8/16版本计划，下一次点击不等规划；就绪且游戏/语言/阶段/目标版本一致才用，未就绪/失败/过期/冷启动直接继续当前Canon与可用旧计划。当前行动优先，未发生的提前计划不是Canon。取消、过期、换游戏/阶段和退出会回收本任务；后台计划不写角色状态。`checkpoint` 环境开关保留为对照/回退。没有每回合judge、二次rewrite或更低effort。

主要质量实验必须20+唯一成功提交回合，同Canon恢复且失败原样保留；读全文/动作/建议/状态/显式Player意图。浏览器帧计时与服务端SSE分开，后台规划成本、Player思考、失败长尾单列。原移动布局/12–24px/滚动锁/preview同构/Stop/IME/RTL不改；本版仅更新静态缓存版本。

---

## 以下为历史设计与实验记录


见 [本轮真实结果](V080_RESULTS.md)、[成长机制与否决记录](PROGRESSION_ITERATION.md)、[移动端证据](V080_INDEPENDENT_REVIEW.md)。当前新增可复用筹码/待兑现机会状态、世界独立growthGrammar、阶段欲望与短计划；没有新增每回合模型。七个预设中两个新世界的实际覆盖须按报告读取，不能用schema通过代替长测。

API server firstNarrativeSseMs与浏览器可见帧严格区分；ACP五个准备子阶段在原model阶段内，20s准备预算与120s正文预算分离。只允许叙事输出，命令目录元数据例外不等于允许工具。默认模型仍Terra低/Narrator、Sol中/Brain、Luna中/Forge；完整等待未证明变快。

移动正文12–24px、默认16/input16；旧历史节点不重建，主动上滚锁定，预览/落盘同构段落与稳定dock。生产静态文件由启动脚本固定版本快照。原存档快照与owner-only安全边界不变。已否决exact quote gate与强制补奖；知识性结算不是物质成长。

<!-- V080-CURRENT-END -->

# TGN Live 系统总览

更新：2026-09-07。当前代码v0.7.0；具体发布证据和冻结范围读 `V060_RESEARCH_AND_EXPERIMENTS.md`，运行交接读根目录 `DEEP_CONTEXT_HANDOFF.md`。

## 五语生成（v0.7.0）

默认zh，可选en/fr/es/ar；主页右上角选择并保存在本设备，故事更多菜单可切。所有创建和行动接口传language，同一请求不同language冲突。成功回合才更新当前书语言，旧正文和world snapshot不回写。模型直接用目标语言生成，无逐回合翻译调用；Arabic RTL与历史段落各自方向分离。每个预设的力量来源/层级仍独立，不能为本地化变成通用规则。细节 `I18N_BACKEND.md`、`I18N_UI.md`，证据 `I18N_EXPERIMENTS.md`。

## 产品与权限边界

用户从预设或一句话创建的世界进入，追求的是主角主动成长、独有优势复合、力量带来新行动空间的小说体验，不是聊天换皮、任务打工模拟器或逐步批准世界设定的工作台。

本地 `C:\dev\tgn_live`，仓库 `happyivanencoding/tgnlive`，唯一开发分支main。原 `C:\dev\tgn-story-mvp` 和本地原著库只读参考，不修改其生产文件。本版本仍是用户自己的私有在线MVP，沿用现有Cloudflare owner Access，不在本轮扩展匿名多用户。

每次接受代码/版本变更须同时更新交接与相关系统docs、保存有针对性的证据、commit并push origin/main。不要提交data、runtime、账号材料、私人语料或原始小说；不要force-push；不要用提交一个半成品来宣称实验已通过。

## 运行链路

手机HTTPS → Cloudflare Access → 已有Tunnel → 本机Node24/4317 → SQLite + AgentDock ACP。

`start-local.ps1` 用当前用户计划任务 `TGNLive-Web` 调用 `run-local.ps1`，因此可从有时限的AgentDock命令启动而不被父进程回收。节点入口仍只监听127.0.0.1。电脑睡眠/关机、用户未登录或AgentDock不可用会中断服务；不是云端常驻算力。停止脚本仅处理确认属于本项目的Node入口。

现有 `src/access.js` 继续验证远程Access JWT与写入来源；没有把owner-only登录改成浏览器传一个名字即可。来源验证脚本在 `scripts/verify-remote.mjs`，当前证据写remote-v070，不覆盖v0.5基线。

## 世界创建与游玩

选择预设无需模型建世界。一句话创建只执行一次World Forge，结构合法、请求仍有效才保存世界；完整请求重放不重新生成。世界预览与第一次正文是两次不同操作，各自记录等待，不报一个误导性总速度。

新书有不可变world snapshot，境界、货币、初始物品、能力和开局按该snapshot执行。旧书保持原定义和已发生事实。具体结构、同人标签、来源收据与采纳机制见 `WORLD_SYSTEM.md`。

常规回合：行动和版本/幂等检查 → 当前世界与Canon组装 → 一次Narrator正文+delta → parse/reducer → SQLite事务提交。开场不多跑规划；每8回合等检查点才做Story Brain。真正失败的提案可做一次有原因的修复，不固定安排第二模型重写每轮。preview不是Canon，complete才保存。整个项目没有把隐藏计划预写成已发生。

## 代码职责

| 文件 | 实际职责 |
|---|---|
| `src/app.js`, `src/index.js`, `src/server.js` | HTTP/SSE、依赖组装、取消与进程入口 |
| `src/worlds.js`, `world-forge.js`, `opening-plan.js` | 预设/世界契约、一次生成、按世界开局 |
| `src/store.js` | 世界、游戏快照、回合/事件与幂等结果持久化 |
| `src/generation-service.js`, `prompts.js`, `scene-contract.js` | 低频规划、当轮生成、短语义准则 |
| `src/reducer.js`, `delta-contract.js` | 独立世界境界、技能add/improve、物品add/remove/update与共享约束 |
| `src/acp/*`, `src/metrics.js` | 真实ACP会话、取消/错误、阶段追踪，不保存私有推理 |
| `public/*` | 手机发现、创作、书架、阅读与行动坞；无前端框架/CDN |
| `eval/*`, `ui-tests/*`, `tests/*` | 分开保存真实模型、UI fixture和确定性状态测试 |

## 模型与计时

默认 Narrator=gpt-5.6-terra/low，World=gpt-5.6-luna/medium，Story Brain=gpt-5.6-sol/medium。真实测试Player=Luna/low，独立盲读比较=Sol/medium。以trace实际model/effort/session/run为准，不只相信下拉框。

全局ACP并发上限2。不要同时跑两个开发agent又启动玩家/正文测试；也不能为了腾位杀别的项目。测试在本轮执行完成，不承诺ChatGPT结束后仍持续自动开发。

创建世界、首段正文、完整回合、规划、条件修复、保存分别记录。ACP认证/session/model准备是生成内部子阶段。API首次SSE与真实浏览器paint不是同一计时，玩家决策不算应用等待。没有可靠的账单token、价格或队列数据时保存null。

## 冻结与已知边界

按真实问题修复，不以通用评分表自动发布。能力持久化、世界独立与手机流程的功能证据不等于文风/长篇质量证据；原著启发只有在真实样本里兑现才采纳。保留被否定和失败的候选，不反复询问评审直到赞同。

目前活动事实最多100条，承诺/物品/NPC也有MVP容量，尚无成熟的长篇自动检索/晋升。完整历史接口未分页，境界通常先定义5个大阶。语义仍受生成模型影响：程序不是完整物理/战斗/持有权证明器。当前没有运行时GBrain全库检索、AI插画、语音、视频、支付或多人社交。

### v0.6.4接手补充

当前Node测试45/45。已有NPC可只给id更新态度，名称读Canon，不调用模型补一个已知值；未知NPC仍必须命名。原始两个真实无姓名提案已离线重放通过。作者职责与采纳边界见研究报告最终节：v0.6.2重复奖励约束被否决，v0.6.3职责调整有两个真实样本与独立盲读的有限正向证据，不能声称所有题材/长篇成熟。

最终远程边界证据位于 `artifacts/remote-v064/boundary.json`。此前remote-v061路径属于中间开发文档，当前以本段为准。手机8项真实功能检查通过但有1个Chrome网络收尾警告，仍标issues_found；没有把生成和保存完成伪装成浏览器全绿。



Native协议/重启恢复细节与真实失败回执见 `docs/NATIVE_TURN_HANDOFF.md`，不重复列流水账。
