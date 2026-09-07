# TGN Live handoff — v0.9.0
## Android Native 并行进度（2026-09-07）

现有原生客户端位于 `apps/android/`，开发工作树 `C:\dev\tgn_live_android` / `mobile/android-native`。已同步本次正式v0.9核心；保留同一账号/书架/存档/Canon与后端，不覆盖核心发布成果。已连接并安装到Samsung SM-S928U1 / Android16真实设备；本轮正在验证行动坞交接、分层等待、顶部状态按钮与分类状态空间。旧候选的“实体机未连接”不再适用，但不能把当前进行中的真机验证宣称全部PASS。真实结果以即将更新的 `docs/NATIVE_MOBILE_TESTS.md` 与本轮机器证据为准。Native负责人本人直接编写，不创建代码子Agent。


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