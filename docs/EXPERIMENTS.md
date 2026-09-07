# 2026-09-07 v0.5.0 远程验收补充

用户授权 private remote play 后，部署 https://live.thegreatnovel.com；原本机限定是历史版本范围。Cloudflare Access 本人登录和 origin JWT 验证同时生效。其他 Tunnel 路由逐项相同，原 12 份存档切换前后 hash 相同。

- 26/26 单元测试通过，含独立签名、过期/错误aud/错误owner/伪造签名/转发Host/JWKS故障边界。
- 6/6 实际HTTP检查：公共Host无JWT与伪JWT为401，伪转发loopback为403；本机200；外网页面/API匿名请求302到Access。
- 真实Chrome以Cloudflare已登录身份进入公共HTTPS，390×844下创建验证书卷，提交开局与一条自由修炼行动。两次Terra/low均提交，无repair：首段5781/3923ms，完整14042/14127ms。准确stage/session/run保留在本地证据。
- 刷新保留两回合，三条建议、状态抽屉、远程Markdown下载和阅读模式通过。修复手机阅读入口与退出控件。未把浏览器窄屏测试说成实体手机测试。
- Windows用户登录启动项已写入并读回验证；现服务脱离AgentDock 24小时命令会话。未实际重启Windows或声称完成开机耐久性测试。

证据在 `artifacts/remote-v050/`；复现 `npm test`、`node scripts/verify-remote.mjs`。详细部署见 `REMOTE_ACCESS.md`。下方报告为此前 v0.4.0 历史基线。

---

# TGN Live MVP：实现与实测报告

生成时间：2026-09-06T23:12:33.280Z。目录：`C:\dev\tgn_live`。仅本地私用，当前运行入口以README及handoff为准。

## 结论与范围

本次完整读取公开分享活动分支，搭建了真实可运行的交互修仙小说MVP，而非静态界面或聊天壳。保留每次生成的状态、行动、正文、真实ACP会话、失败与分阶段耗时；开发、测试脚本、测试数据都与原TGN隔离，未推送远端。

实现：三种异能开局、三个建议与自由行动、流式正文、持久Canon、境界/财物/关系、书库继续、6回合成章、阅读/导出、阶段提示与停止重试。尚未实现AI绘图、语音、视频、支付、多用户或公网安全部署。

## 主要现场测量

所有时间为秒。首字是客户端首次收到真实叙事SSE，不是转圈或状态提示；完成指收到已提交结果。只对成功回合统计均值，失败数量另列。

| 版本/测试 | 模式 | 成功/尝试 | 首字均值 | 完成均值 | 开局首字/完成 |
|---|---|---:|---:|---:|---:|
| baseline-utf8-v010 | adaptive-acp-player | 6/7 | 10.04 | 22.63 | 22.60 / 31.66 |
| cycle1-replay-v020 | fixed-action-replay | 7/7 | 6.26 | 16.56 | 4.98 / 12.80 |
| cycle2-replay-v030 | fixed-action-replay | 7/7 | 6.50 | 17.20 | 5.74 / 14.51 |
| final-adaptive-v031 | adaptive-acp-player | 10/10 | 8.01 | 18.57 | 5.96 / 14.36 |
| growth-v040 | fixed-action-replay | 5/5 | 4.22 | 14.53 | 4.09 / 12.02 |
| adversarial-v040 | fixed-action-replay | 3/3 | 3.60 | 12.69 | 4.22 / 13.59 |

最初集成开场另测20.31秒首字、29.19秒完成，其中短程规划15.34秒。此样本只用来验证集成，不与正式基线混合。正式基线开场22.60/31.66秒，采用作者局势底稿后第一次重放开场4.98/12.80秒；这与移除一个阻塞模型调用一致，但小样本和随机生成不能证明固定生产服务水平。

固定行动重放使用此前真实玩家动作，但新正文会分叉，因此后续动作可能不完全适配新的场景；这是明确的测试限制，不把它伪称为新的自适应玩家。最终成长型玩家会重新读取当前观察，动作不是预先写好的。

### 各阶段拆分

下表是各运行成功回合内对应阶段的均值，单位毫秒。ACP设置是嵌套span，不可重复加到生成/规划总时长上。

| 测试 | 校验 | 上下文 | 规划（触发时） | 叙事 | ACP叙事设置（内含） | 解析 | 落库 |
|---|---:|---:|---:|---:|---:|---:|---:|
| baseline-utf8-v010 | 2.0 | 0.2 | 17801.0 | 19636.7 | 674.2 | 0.3 | 14.2 |
| cycle1-replay-v020 | 1.1 | 0.0 | — | 16539.9 | 650.0 | 0.9 | 5.0 |
| cycle2-replay-v030 | 1.4 | 0.0 | — | 17180.1 | 618.0 | 0.4 | 5.1 |
| final-adaptive-v031 | 2.2 | 0.1 | 16614.0 | 16881.5 | 690.7 | 0.5 | 5.1 |
| growth-v040 | 1.2 | 0.4 | — | 14512.0 | 715.8 | 0.8 | 5.0 |
| adversarial-v040 | 1.3 | 0.0 | — | 12676.0 | 564.3 | 0.3 | 3.3 |

完整逐回合最小/最大值、经验p95、版本、模型、阶段样本量和失败trace见 `artifacts/reports/measurements.json`。样本较少时经验p95几乎就是最大值，不是SLA。提供方内部排队/计算、账单token和货币成本未知；ACP上下文used不能视作本次消费token。玩家决策耗时单独保存在每回合player元数据，未混入应用延迟。

## 基线、故障与修复

**环境与启动。** 初始Astra虽在能力列表中，实际却返回Codex版本不兼容；改用真正验证过的Sol/Luna，并显式配置思考等级，避免继承ultra。全局ACP并发上限实测为2，开发完成后关闭本项目开发会话再测。首次集成失败来自AgentDock默认短命令生命周期回收server子进程，保存在 `integration-opening-v010`；它不是小说成功样本。

**UTF-8故障。** 最早的 `baseline-v010` 在Windows PowerShell到Node的stdout路径上把中文损坏成U+FFFD，生成器仍能继续，所以只检查“HTTP成功”会产生假通过。该轮已明确INVALIDATED，停止后修复UTF-8并加入口拒绝损坏文本。重新提取同一原始ACP回答，替换字符从180降到0；证据 `artifacts/bootstrap/utf8-verification.json`，不是换一个新回答冒充修好。

**第一轮：降低阻塞并修复格式契约。** 正确编码的基线第7回合给出6条事实，却撞上未披露的max5；修复模型又给6条而重复失败。原输出/修复输出的末段经ACP取回，历史标记truncated，因此仅将保留的JSON尾部当现场证据，不宣称取回完整事件历史。将事实资源上限改成20、创作目标保持1—5，统一初稿和修复契约，给出具体数量错误。现场六条事实加入确定性回归；不截断事实来伪造成功。同时开局改为已编写的局势底稿，检查点仍实时规划。

**第二轮：语义与界面。** 实测发现触摸自己铜钱却遥读药柜、伤处漂移、药粉变药液、不断有新门/追兵阻止阶段完成。新约束区分对象自身痕迹和远处信息、玩家口头宣称与事实、物品所有权与临时使用；离开开局后不再每轮注入旧开局。界面显示天赋边界、最近事实与中文阶段，并在取消/重试时读取存档避免把已提交回合说成撤销。

**后续取舍：自然正文。** 第二轮虽然改正了虚构药液，却出现“你没有凭空取出不存在的东西”这种解释自己写得对的句子。增加不把写作规则带入正文的要求，并用同一段角色状态/动作额外测试Terra/low。该孤立片段10.00秒首字、21.18秒完成，不是实际存档游玩。对照Luna片段6.91/19.45秒。两边虚构状态与动作一致，但Terra探针遗漏了计划元数据createdForTurn:1（19字符，6095对6114），因此不能宣称严格相同prompt的随机A/B。Terra表现出更自然的道具纠正与短暂脱险，但最终结论仍需看连续试玩。

## 质量证据不是一个总分

### baseline-utf8-v010

独立模型读者总体 4/5；指标：`{"spatialClarity":4,"dialogue":4,"agency":5,"progressionPayoff":4,"coherence":4,"lowRepetition":3}`。

- 连续多次采用相近的搜查逼近和限时逃亡节拍，变化略显不足 原文证据：“门闩又是一震，裂缝扩大”。
- 烬息每次触发几乎都以耳鸣和身体失衡收尾，表现趋于公式化 原文证据：“耳鸣猛地刺入脑中，沈舟眼前一黑”。
- 地窖入口线索短暂互相干扰，空间判断不够利落 原文证据：“地窖入口不在地上”。
- 少年反复强调铜片不能被夺，新增信息有限 原文证据：“他们不能拿到铜片”。

### cycle1-replay-v020

独立模型读者总体 4/5；指标：`{"spatialClarity":4,"dialogue":4,"agency":5,"progressionPayoff":3,"coherence":4,"lowRepetition":3}`。

- 连续多轮主要维持逃亡与藏匿，虽然危机升级，但尚未形成阶段性收获或成长兑现。 原文证据：““必须在机关、暗门和门外来者之间抢出下一步””。
- 威胁节拍出现重复，多次以脚步逼近、门被试探和少年攥紧铜片收尾，悬念手法开始同质化。 原文证据：““门栓再次被抬起，铁丝也跟着轻轻颤动””。
- 药液的来源衔接不足；此前明确出现的是止血散，后文直接接受玩家所说的药液。 原文证据：““接过沈秋禾塞来的药液””。
- 最后一次制造河堤方向声响的物理过程略难想象，人物身处地窖却能把染桶掷向特定外部方向。 原文证据：““朝通往河堤的方向用力掷去””。

### cycle2-replay-v030

独立模型读者总体 4/5；指标：`{"spatialClarity":3,"dialogue":4,"agency":5,"progressionPayoff":4,"coherence":4,"lowRepetition":4}`。

- 最后一段的空间动作衔接不清：人物仍在地窖，却直接把染桶掷出此前已关闭并抵住的染坊木门。 原文证据：“又将染桶掷出木门”。
- 把门外未知来客直接当成士卒，超出了当前可见信息。 原文证据：“趁士卒转移”。
- 烬息连续多次只返回短促旧声且反复声明不能提供什么，能力反馈略显模式化。 原文证据：“没有告诉你那人是否还在门前”。
- 少年伤势持续恶化，但包扎后的实际效果和救人回报尚不明显。 原文证据：“血从布带边缘渗出来”。

### final-adaptive-v031

独立模型读者总体 4/5；指标：`{"spatialClarity":5,"dialogue":4,"agency":5,"progressionPayoff":3,"coherence":5,"lowRepetition":4}`。

- 修仙成长反馈偏弱，烬息首次发动后长期没有能力发展或代价推进，后半段更像写实码头求生。 原文证据：“烬息随之钻进耳中”。
- 阶段性回报较小，连续多轮主要完成离城、付钱和接短工，主线秘密尚未形成足够强的收获。 原文证据：“给你四枚铜钱”。
- 反复确认钱、报酬和风险符合人物性格，但表达模式开始显得机械。 原文证据：“活计、报酬和风险，先说清”。
- 部分NPC对陌生人迅速透露敏感信息，戒备感还可加强。 原文证据：“船是陈记货行的”。

### growth-v040

独立模型读者总体 4/5；指标：`{"spatialClarity":4,"dialogue":4,"agency":5,"progressionPayoff":4,"coherence":5,"lowRepetition":3}`。

- 连续三次吐纳的动作、感官和结果较相似，节奏开始重复。 原文证据：“那丝灵气几次贴近胸腹，又随杂念散开”。
- 废弃账房出现得较方便，缺少一句说明为何可进入或无人占用。 原文证据：“卷帘后是废弃的账房小间”。
- 目前成长主要是认知性收获，实际能力回报仍偏弱。 原文证据：“才能分清灵雾与自身气血翻涌的差别”。

最终自适应样本接受10回合，包含章节索引[1,2]。末态境界：{"name":"凡身","rank":0,"progress":0}；钱财18；物品[{"id":"plain-clothes","name":"旧布外衣","description":"洗得发白，但足够遮风","qty":1},{"id":"copper-token","name":"母亲留下的铜钱","description":"边缘有一道月牙缺口","qty":1}]。这些是实际数据库状态，不用读者“成长感”评分代替真实成长。

### 最新 v0.4：把修炼入口放回开局

完整10回合的v0.3.1虽然可玩，却仍滑向码头求生和接短工。v0.4在新世界底稿里加入可自由选择的灵潮感气、基础引气药和吐纳入口，不自动送等级，也不修改旧存档。独立的5回合真实模型定向测试全部通过，实际进度依次0、2、4、4、5，仍为凡身；报价不合时没有凭空购药或扣钱。这个测试是固定输入的针对性验证，不是又一轮10回合ACP自适应玩家，也不能证明长期升级节奏已经成熟。读者仍指出连续吐纳重复、实际能力用途偏弱，保留为下一批质量问题。

借势印的3回合对抗输入另测了拒绝默认任务和直接要求修改数据库、成仙及获得百万钱财。必须同时查看正文和状态；测试中的非法奖励没有被接受。其运行与一次极短协议取消测试有时间重叠，不把该运行的延迟当作无争用性能证据。

基线盲读者给成长感4/5，但数据库里的修炼进度一直0，也没有得到归自己的新物品。因此需要同时检查阅读感与Authority；总体4分不能证明机制已经正确。各轮动作、人格和模型变化均是比较的干扰因素。只有真实被观察到的单项变化可当结论，未测试的长期稳定性不能外推。

## 接口、浏览器与持久化验证

实际协议回归：通过。
- idempotent identical request returns existing turn without a second commit：PASS
- same request id with changed body conflicts：PASS
- stale version rejected and server survives：PASS
- cross-origin mutation rejected：PASS
- invalid JSON yields 400 without server crash：PASS
- canonical state and novel export survive independent reload：PASS
- in-flight second action conflicts; cancelled generation has no commit：PASS

无stub真实Chrome浏览器端到端：issues_found。两回合实际模型生成、手机390px布局、状态抽屉、刷新、导出和阅读模式；逐项检查 `{"threeChoicesAfterOpening":true,"mobileNoHorizontalOverflow":true,"reloadPreservesProse":true,"twoAcceptedTurnsAfterReload":true,"downloadSucceeded":true,"readerMode":true,"desktopNoHorizontalOverflow":true}`。浏览器请求至首次正文paint：3.45、3.36秒；请求至观察到提交：15.15、14.06秒。它不同于API首字计时。所有7项功能断言通过，但Chrome仍报告两个叙事请求net::ERR_ABORTED，因此原始结论保留issues_found，不改写成全链路零错误；两个回合均已保存并经刷新恢复，没有观察到正文丢失。此网络收尾警告的原因尚未完全定位。另一次只读手机命中测试确认三个选择按钮均可滚动并命中。第一次浏览器尝试卡在隐藏radio的测试选择器，尚未创建游戏；改成真实可见的能力卡点击后重跑，原失败记录仍保留。

最终服务器重启检查：通过，{"passed":true,"before":{"at":"2026-09-06T23:02:50.094Z","gameId":"game_c785f44c0e0f4eb091dfbeedc2559680","version":10,"turns":10,"stateHash":"86f7641a505e7c0c21fbc9a3b10089f6072bb4d307c0a681958a37b0510de6e2","turnsHash":"b945a3fedb62847a5254c76a3b5cacab818e95d7afcc60b83e0458d17249e63d","appVersion":"0.3.1"},"after":{"at":"2026-09-06T23:03:10.206Z","gameId":"game_c785f44c0e0f4eb091dfbeedc2559680","version":10,"turns":10,"stateHash":"86f7641a505e7c0c21fbc9a3b10089f6072bb4d307c0a681958a37b0510de6e2","turnsHash":"b945a3fedb62847a5254c76a3b5cacab818e95d7afcc60b83e0458d17249e63d","appVersion":"0.4.0"},"scope":"Real server stop/restart; existing ten-turn game state and all prose compared by SHA256. No generation during this check."}。

截图、浏览器记录在 `artifacts/ui/`；窄屏模拟不等于Android真机键盘测试。确定性单元/协议fixture与真实模型数据分目录，不能将fixture耗时放入上述模型表格。

## 工程阶段与证据位置

任务创建21:56:08Z，来源/设计检查点22:01:15Z，首次可运行实现与基线冻结检查点22:26:28Z。约5分7秒用于来源/范围阶段，随后约25分13秒覆盖并行实现、故障排查和集成。这是检查点时间，不是独占CPU或按工程师相加的工时。有效基线22:30:17—22:34:22；Cycle1重放22:41:13—22:43:30；Cycle2重放22:46:16—22:48:35。修复、测试、文档有交叠，不把交叠时段双重相加。完整模型/玩家起止在各manifest和meta文件。

- 来源：`docs/sources/shared_conversation.md`；执行契约：`docs/MVP_SPEC.md`。
- 每次运行：`artifacts/eval/<label>/`，含transcript.md、novel.md/txt、actions.json、turns.jsonl、server-metrics.json、reader-judge.json和ACP元数据。
- 规范化汇总：`artifacts/reports/measurements.json`、`MEASUREMENTS.md`。
- 架构：`docs/ARCHITECTURE.md`；复现命令：README；继续开发：handoff。

## 仍然不能宣称完成的部分

尚无真人留存/付费验证、正式公网认证、多用户隔离、AI图像/视频/语音或数百回合连续性证明。空囊次数、真实物理可达性、冷物是否有余温等尚不是完全独立的形式规则引擎；模型仍可能出现漏洞。已保留相应不足，不以一次盲评高分掩盖。全局ACP被别的项目占用时的排队体验、进程硬崩溃后的在途恢复与长篇分页/检索需要专门下一批回归。
