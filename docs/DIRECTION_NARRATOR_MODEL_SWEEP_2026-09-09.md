# 固定剧情方向下的 Narrator 型号与经典校准评审（2026-09-09）

## 目的

本实验回答两个分开的窄问题：

1. 当“这一回合值得发生什么”已经由三回合剧情方向池固定后，Terra 与较早 Gemini Flash 型号谁更适合写 TGN Live 中文男频成长正文？
2. 仅靠模型 Judge 自己的训练偏好做匿名评审，是否会把“严谨、完整、流程化”误当成好小说？加入真实经典男频原文校准后，排名是否改变？

本轮不把固定单回合 probe 冒充长期试玩；长期方向池仍需独立完成真实 Player 轨迹。

## 一、写作型号对照设计

冻结来源：`long-horizon-directions-20260909-v4` 的真实裂陆武途 20 回合轨迹。该轨迹已产生多个 5–6 条真实剧情方向池，但也证明“隐藏方向池存在”本身不足以防止可见 choices 塌回同一局部流程。

本轮直接利用这些已存在方向池。每个 cell 固定：

- 同一 Canon；
- 同一玩家行动；
- 同一完整方向池；
- 同一个显式 selected direction；
- 同一 Narrator 输出契约；
- 同一 reducer；
- 最多一次 repair，且仍由同一个 Narrator 型号修复。

只改变 Narrator provider/model。

五类方向：真实训练/突破、资源控制、平等关系、公开战斗、离开旧循环的自由商路。突破格重复两次，其余各一次，因此每型号共 6 个样本、总计 36 个生成样本。

候选：

- `gpt-5.6-terra` low（冻结 transport-only ACP）
- `gemini-3.1-flash-lite` low（Developer API direct）
- `gemini-3-flash-preview` low（Developer API direct）
- `gemini-3.5-flash-lite` low（Developer API direct）
- `gemini-3.5-flash` low（Developer API direct）
- `gemini-3.6-flash` low（Developer API direct）

`gemini-2.5-flash-lite` 与 `gemini-2.5-flash` 本轮再次最小 direct API 实测，均返回 404，明确说明对新用户已不可用，因此不进入文学排名。

## 二、结构可靠性、延迟、Token 与成本

| 型号 | 最终结构接受 | repair 次数 | 接受格平均首可见 | 接受格平均完整调用 | Gemini 总 token | Standard paid-tier 等价成本 |
|---|---:|---:|---:|---:|---:|---:|
| Terra | **6/6** | 2 | 16.39s | 45.95s | 未提供 | 不猜测 |
| Gemini 3.1 Flash Lite | 4/6 | 3 | 8.27s | 14.49s | 116,882 | $0.05762 |
| Gemini 3 Flash Preview | 3/6 | 5 | 1.29s | 11.90s | 124,794 | $0.09837 |
| Gemini 3.5 Flash Lite | **5/6** | **2** | **0.75s** | **5.09s** | **88,403** | **$0.03924** |
| Gemini 3.5 Flash | 4/6 | 4 | 4.11s | 12.29s | 113,550 | $0.26661 |
| Gemini 3.6 Flash | **5/6** | 4 | 1.29s | 15.60s | 115,228 | $0.12756 |

Gemini 五个型号合计 558,857 token，按 2026-09-09 Google 官方 Standard paid-tier 价格计算等价约 **$0.58940**。这是未来付费运行的价格估算，不冒充 API 实际账单；`usageMetadata` 本身不返回美元账单。Terra 没有真实 usage/cost，因此不反推 token 或费用。

延迟也不能当成纯模型速度 A/B：Terra 经过 ACP provider runtime，Gemini 是 direct API。

结构上：Terra 6/6 最稳；Gemini 中 3.5 Flash Lite 以 5/6、最低延迟、最低 token/成本成为明显的高性价比候选。3 Flash Preview 只有 3/6，不能因某个漂亮高光就成为默认 Narrator。

## 三、为什么重做匿名评审

第一版匿名 Judge 不知道模型身份，但它依然可能把自己训练中形成的偏好带入评审，例如：

- 把完整边界和严谨解释误当成成熟；
- 或反过来机械地把数字、步骤、规则都判为工程化；
- 缺少真实成熟男频的 reader coordinate。

因此保留旧 Judge 作为 naive baseline，不覆盖原证据；另做 classic-calibrated Judge。

### 经典校准数据

本机 TGN reference corpus 的 source registry 能定位真实原著。旧注册路径已迁移，运行时解析到当前 GoogleDrive `50_Corpora/TGN` 原文；不是用 Prose DNA 的 observation summary 冒充原文。

两轮使用不同的有界原文窗口，来自：

- 《全球高武》
- 《第一序列》
- 《吞噬星空》
- 《修真聊天群》

原文只进入本地 ignored artifact / Judge prompt，不写进 Git 报告，也不在这里复制长段原文。

### 两阶段 Judge

每轮严格两阶段：

1. **Calibration**：Judge 只看经典原文，完全看不到候选；从原文自己提炼 5–8 条 reader standards。
2. **Blind review**：再给同一批经典原文 + 已冻结 standards + 匿名候选；候选仍不知道 provider/model。

这样避免 Judge 在看到候选后倒推一套支持自己初始偏好的标准。

## 四、经典原文实际导出的评审标准

两组原文虽然不同，但得到的核心判断高度一致：

- **细节必须立刻兑现**：数字、规则、步骤出现后，要改变选择、得失、行动节奏或人物关系。
- **数字要带着欲望**：价格、榜位、份额、指标可以大量出现，但要让人想赚、怕亏、嫉妒、抢夺、退让或重新估价。
- **规则要被人物利用**：人物会钻空子、议价、抵触、误解、改变战法，而不是像标准操作员一样正确执行流程。
- **成长要改变行动边界**：升级不是报一个等级，而是过去做不到的事现在能做，并得到社会回声。
- **条件要承载关系冲突**：合同/条件本身不是坏事；坏的是人物消失，只剩条款。
- **步骤必须保留戏剧变量**：训练、交易、路线、配药可以直接写步骤，只要体力、价格、风险、信息差、意外反应持续改变过程。
- **回报要落到生活和社会镜面**：旁人让步、畏惧、吐槽、重新报价、送礼、身份变化，比旁白宣称“他变强了”更有重量。
- **流程之间要有生活气**：人物习惯、幽默、尴尬、牵挂、竞争不能被机制说明挤掉。

这纠正了“少细节=小说、多细节=工程”的错误二分。经典男频本身并不排斥数字、规则、价格和步骤；它们排斥的是**复杂度没有变成戏**。

## 五、naive Judge 与 classic-calibrated Judge 的差异

两个版本都做两次独立 Sol-medium 请求。四个非突破 cell 被重复阅读；突破 cell 使用两个独立生成 repeat。因此下面 10 次是描述性判定，不是 10 个独立世界样本。

### Naive Judge

| 项目 | Terra | 其他胜者 |
|---|---:|---|
| bestNovel | 7/10 | 3 Flash Preview 1；3.6 Flash 1；3.5 Flash 1 |
| bestDirectionRealization | 8/10 | 3 Flash Preview 1；3.6 Flash 1 |
| leastProcessDriven | 8/10 | 3 Flash Preview 1；3.5 Flash 1 |
| bestCharacters | 8/10 | 3 Flash Preview 2 |

### Classic-calibrated Judge

| 项目 | Terra | 其他胜者 |
|---|---:|---|
| bestNovel | **9/10** | 3.5 Flash Lite 1 |
| bestDirectionRealization | **9/10** | 3.6 Flash 1 |
| leastProcessDriven | **9/10** | 3.5 Flash Lite 1 |
| bestCharacters | **10/10** | 无 |

经典校准**确实改变了评审结果**，所以用户对 naive Judge 的方法论质疑成立。但改变方向并不是“老 Gemini 全面翻盘”，而是 Terra 的整体优势更稳定。

另一个明显变化：naive Judge 曾把 Terra 1 次评为 `worstProcessDriven`；经典校准后 Terra 0 次。经典原文让 Judge 更能区分“必要的具体训练/交易细节”与“没有戏剧变量的操作说明”。

## 六、各型号当前判断

### Terra：仍是默认 Narrator 的最强证据

一旦上游 selected direction 被明确固定，Terra 在资源、关系、公开战斗、自由路线四类非训练场景里，两轮经典校准评审全部持续领先。

它最稳定的优势不是“保守”，而是：

- 让限制成为现场风险；
- NPC 有自己的判断和利益；
- 一次成功给真实所得，但不从小样本直接铸成永久权限；
- 力量改变事件，而不是在事件后再解释一遍力量；
- 条款和数字通常很快回到行动。

这也说明此前长期工程化的更早根因很大比例在**上游方向与可见 choice 如何选择下一阶段**，而不是 Terra 天生只能写工程文。

### Gemini 3.5 Flash Lite：最佳“高速草稿/高光候选”，不是整体最佳 Writer

它没有整体击败 Terra，但值得保留：

- 5/6 结构接受；
- 首可见约 0.75s；
- 完整约 5.09s；
- 6 格仅 88,403 token；
- paid-tier 等价约 $0.03924；
- 第一轮经典校准突破格被选为 bestNovel 与 leastProcessDriven。

它的问题是偶尔把一次局部成功快速扩成更大的长期成果，因此更适合生成备选高光或快速草稿，再由 Canon/reducer 保持边界，而不是直接替代 Terra 全局写作。

### Gemini 3.5 Flash：战斗场景有文学优势，但不适合全局默认

naive Judge 的第二轮公开战斗曾选它为 bestNovel / leastProcessDriven，说明它能写出更热烈的拳势与围观爽感。但固定方向 6 格仅 4/6 接受，成本是本组 Gemini 最高（约 $0.26661），两次突破均在一次 repair 后仍失败。适合继续作为“战斗高光 variant”，不适合默认 Narrator。

### Gemini 3.1 Flash Lite：不支持“越早/越弱越会写”的简单规律

人工初读时它最敢在第一份训练里直接送出突破，看似支持“理性弱、写作更爽”。经典校准后，该行为被识别为越过当前证据的过早兑现；它在关系、自由路线也有结构失败，并多次被判为流程化。

因此当前证据不支持“coding 越弱，小说一定越好”。

### Gemini 3 Flash Preview / 3.6 Flash

两者都能在某个突破样本中更果断地实现成长高光；3.6 结构 5/6，也比 3 Flash Preview 稳。但跨场景时，它们较容易重新展开动作机理、权限、数字或结果总结。3.6 在 classic-calibrated 第二轮唯一赢下 `bestDirectionRealization` 的突破样本，但同格 Terra 仍赢 bestNovel、leastProcessDriven 和 bestCharacters。

## 七、当前结论与下一步

### 已验证

1. **经典原文校准应该成为 TGN Reader Judge 的默认方法。** 只做匿名并不足够，Judge 也需要 reader coordinate。
2. **方向选择与正文实现必须分层。** 固定正确 selected direction 后，所有模型的工程化都明显下降；此前“工程化”不能主要归咎于 Narrator 型号。
3. **Terra 仍应作为默认 Narrator。** 经典校准后整体优势从 naive 的 7–8/10 提升为 9–10/10。
4. **Gemini 3.5 Flash Lite 是目前最值得保留的低成本辅助 Writer。** 它适合快速 variant、高光候选或可选草稿，不是默认替代。
5. **旧/弱模型有时更敢写高光，但并非单调优势。** 更敢也可能意味着越权、过早长期兑现、结构失败。

### 尚未验证

这仍不是最终生产结论。真正下一步应该把：

`三回合 5–6 方向池 → 可见 choices 与不同方向真实绑定 → 玩家自然选择 → Terra 默认写作 + 可选 3.5 Flash Lite 高光 variant`

放回至少 20 回合的真实自适应 Player 长轨迹，并继续使用经典原文校准 Reader Judge。只有这样才能判断“方向池 + Writer 分层”在长期后是否仍会回归训练、核验、采购和路线微步骤。

## Evidence

- `artifacts/eval/direction-narrator-model-sweep-20260909/`
- `artifacts/eval/direction-narrator-model-blind-review-20260909/`（naive baseline）
- `artifacts/eval/classic-calibrated-direction-review-20260909-v2/`（classic-calibrated）
- `artifacts/eval/long-horizon-directions-20260909-v4-martial-20/`

评审使用的经典原文窗口保留在本地 ignored artifacts，不提交 Git、不在报告复制。
