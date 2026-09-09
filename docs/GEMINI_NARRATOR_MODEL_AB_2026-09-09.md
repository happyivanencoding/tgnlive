# Gemini Narrator 型号对照（2026-09-09）

本实验回答一个窄问题：TGN Live 长玩后出现的工程化、细节化、防御化写作，是否主要由 Narrator 型号导致。

## 方法

- Gemini 均通过 Developer API `generateContent/streamGenerateContent` **direct API** 调用，不经过 ACP。
- API key 只在运行时从本机读取，不写入 prompt、artifact、仓库或报告。
- `ListModels` 先确认账号实际可见型号，再真实调用；目录可见但生成端拒绝的型号仍记为不可用。
- 固定两个历史 Canon 快照，除 Narrator 型号外保持 world、state、action、plan、Narrator prompt、reducer 和“一次 repair 上限”一致：
  - `masked-t20`：隐潮七港，玩家只观察清篓后的巡潮/旧槽变化，容易暴露侦察与路线工程化倾向。
  - `beast-t18`：浮空驭兽，玩家回应幼兽主动邀约完成短距协同飞行，检验成长兑现、人物反应和行动空间。
- Gemini 3.x 统一 `thinkingLevel=low`；2.5 Flash/Lite 使用 `thinkingBudget=0`，2.5 Pro 用最低 128。
- 两次独立匿名读者调用只看正文和 choices，不知道型号；Terra 历史原输出作为匿名 control。
- 金额是依据 `usageMetadata` 和 Google 2026-09-09 Standard paid-tier 单价计算的**付费等价成本**。当前同一 key 的 3.8 错误明确显示走 Free Tier；Google 定价表中本轮成功的 3 Flash Preview / 3.5 / 3.6 / 3.7 Flash 也列有 Free Tier，因此本轮这些调用的实际 API 账单按 Free Tier 为 $0。API 本身不返回美元账单。

## 实际可用性与结构结果

| 型号 | 真实调用 | TGN 结构接受 | 备注 |
|---|---:|---:|---|
| Gemini 2.5 Flash-Lite | 2 | 0/2 | 404：对新用户已不可用；Google建议 3.5 Flash-Lite |
| Gemini 2.5 Flash | 2 | 0/2 | 404：对新用户已不可用；Google建议 3.6 Flash |
| Gemini 2.5 Pro | 2 | 0/2 | 404：对新用户已不可用；Google建议 3.1 Pro |
| Gemini 3 Flash Preview | 2 | 2/2 | 两格均需一次 repair 后接受 |
| Gemini 3.1 Pro Preview | 2 | 0/2 | 当前 Free Tier quota 明确为 0，未产生模型输出 |
| Gemini 3.5 Flash | 2 | 2/2 | masked 无 repair；beast 一次 repair |
| Gemini 3.6 Flash | 2 | 2/2 | 两格均直接接受 |
| Gemini 3.7 Flash | 2 | 1/2 | masked 直接接受；beast 单次 repair 后仍无效 |
| Gemini 3.8 Flash | 本 sweep 2 | 0/2 | 前序实验已打满当前 Free Tier 配额，均 429；不重复收费/重试 |

另有此前同日 `gemini-flash-latest -> gemini-3.8-flash` 的 12 个固定快照 direct API 样本：6/12 最终接受、6/12 在唯一一次 repair 后仍无效，8/12 触发 repair。它不是本表两个固定 cell 的严格同行比较，但足以说明当前 TGN delimiter/JSON 契约下 3.8 的结构兼容性不稳定。

## Token、延迟与付费等价成本

只汇总本 sweep 中真正产生模型 token 的型号。失败的 2.5 / 3.1 Pro / 本轮 3.8 provider 请求没有可计模型 token。

| 型号 | 两格总 token | 平均首个可见 token | 平均完整 API 时间（仅最终接受格） | 两格 paid-tier 等价成本 |
|---|---:|---:|---:|---:|
| Gemini 3 Flash Preview | 43,875 | 1.31s | 14.07s | $0.03284 |
| Gemini 3.5 Flash | 36,869 | 3.49s | 24.66s | $0.09952 |
| Gemini 3.6 Flash | 25,455 | 26.47s* | 35.53s* | $0.02557 |
| Gemini 3.7 Flash | 33,466 | 1.23s（唯一接受格） | 4.64s（唯一接受格） | $0.03345 |

\* 3.6 的 `masked-t20` 首 token 约 51.4s，是本小样本中的明显长尾；`beast-t18` 首 token约1.54s、完整约13.67s。不能把两格均值当作稳定线上延迟。

此前 3.8 的 12 个 direct API 样本合计 **220,511 token**（211,004 输入、9,507 可见输出、0 thinking），按当前 2026 introductory paid 价格等价 **$0.19390425**；平均首可见约 **2.50s**、纯 API 生成约 **9.85s/样本**，但最终结构接受仅 **6/12**。Free Tier 限流还在活跃执行期额外带来约 138.3s quota wait，这不是模型本身生成延迟。加上本 sweep 中有 token 的四个型号，本轮/前序 Gemini direct API 记录合计约 **360,176 token**，paid-tier 等价约 **$0.38529**；当前成功调用落在 Free Tier，实际 API 账单按该层为 $0。

## 匿名阅读结论

### `masked-t20`：流程/路线型场景

两个匿名 reader pass 都没有得到“换 Gemini 就解决工程化”的结论：

- Pass 1：`Gemini 3 Flash Preview` 被选为 `bestNovel`，但 **Terra control** 被选为 `leastProcessDriven`。
- Pass 2：**Terra control 同时是 `bestNovel` 与 `leastProcessDriven`**；3 Flash Preview 仅在已有成长的身体化表现上更明显。
- 3.5 / 3.6 / 3.7 都增加了人数、车阵、泥地、巡逻、视线死角或路线节拍。它们并没有天然消除工程化；部分版本比 Terra 更像侦察报告。
- 真正有效的 control 优势不是“更保守”，而是篇幅克制，并在第三个 choice 允许退出六码头路线，转向把现有一式匠能力换成材料/身份入口。

### `beast-t18`：成长兑现场景

两个 reader pass **一致选择 Gemini 3.5 Flash 为 `bestNovel` 和 `bestGrowthPayoff`**；第二次也把它选为 `leastProcessDriven`，第一次该项给了 3.6 Flash。

3.5 的优势来自：幼兽主动邀约 → 共同离地 → 伤翼出现细小风险 → 沈舟立即卸力保护伙伴 → 弥娅确认“共用同一缕风” → 洛岑重新估值。能力、关系、决策与社会反馈在一个场景里同时结算，不只是飞行测试合格。

但它仍有缺点：伤口监测语言偏多，且 beast 格需要一次结构 repair；两格 paid-tier 等价成本也显著高于 3.6/3.7。

3.6 的成长场景更利落并有港丁/洛岑的公开反应，结构2/2直接接受；但 process cell 依然详细盘点巡潮人、杂工、车辆和路线，且出现51s首 token 长尾。

旧 3 Flash Preview 有较强场景感，但更容易扩大未授权细节或结果，例如把短距协作写到更高盘旋、引入额外器具细节；两个格都依赖 repair 才进入 TGN 结构。

### `gemini-flash-latest -> 3.8`：六个有效固定快照盲比

12 个 3.8 样本中只有 6 个最终进入 TGN 结构。对这 6 个有效 Gemini 正文与对应 Terra 原正文做随机 A/B 后，独立 reader 不知道 provider；逐组解码后，**6/6 都选择 Terra 作为更符合“少流程化、把篇幅留给人物/力量/欲望/所得”的版本**。Gemini 被具体指出的流程化证据包括“每隔半刻 / 二十息死角”“残钉距离反复推演”“两百斤承重 / 四尺至五尺跨度”“粗锉修平榫口”“受力差哪怕一厘”等。原 reader 的 overall 字段因 A/B 每组随机换位而显示 `uncertain`，该字段不能用于 provider 总结；provider 结论必须按每组隐藏映射解码，解码结果为 Terra 6/6。

这不是说 Terra 已解决长期工程化；它只否定“直接换成当前 Gemini 3.8 Flash 就会自然减少工程化”的假设。3.8 的有效样本有时更果断地把准备工作一次完成，但通常是用更多规格、采购、路线和受力细节来完成。

## 当前判断

1. **模型是因素，但不是根因。** 不同 Gemini 型号对小说感、结构稳定性和细节密度确实有明显差异；但同一个 Gemini 在成长场景可以很有小说感，在观察/路线场景又会迅速工程化。上游“这一轮究竟值得写什么”仍决定主要内容。
2. **不建议把 Narrator 全局从 Terra 直接换成任一 Gemini。** `masked-t20` 的匿名读者反而更认可 Terra 的克制；3.7/3.8 的结构可靠性也不足。
3. **Gemini 3.5 Flash 是目前最值得继续做小范围写作候选的型号。** 它在真实成长兑现 cell 上两次匿名评审一致胜出，但成本、repair 和 process cell 都没有证明适合全局替换。
4. **Gemini 3.6 Flash 是更便宜、结构更稳的次候选。** 2/2直接通过，成长场景不错，但工程化倾向没有消失，且本样本有明显延迟长尾。
5. **真正有希望的下一步仍是“剧情方向池 + 模型”分层实验。** 先用每三回合 5–6 条互斥剧情方向从源头规定值得发生的主要事件，再比较 Terra 与 3.5 Flash 写同一方向；这样才能检验 3.5 的小说感是否在非工程化上游输入下持续，而不是让 Narrator 独自承担选题修复。

## Evidence

- `artifacts/eval/gemini-model-sweep-20260909/`
- `artifacts/eval/gemini-model-sweep-review-20260909/`
- `artifacts/eval/narrator-model-ab-gemini-flash-20260909-v2/`
- 基线：`artifacts/eval/long-horizon-ledger-20260909/`
