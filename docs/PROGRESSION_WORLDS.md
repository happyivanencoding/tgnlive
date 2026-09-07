# v0.8.0 成长世界候选

任务：`tsk_2a159f2c1ff89ff8`。本文件只记录 `masked-tides` 与 `martial-frontier` 两套非官方同人灵感预设的设计依据、数据合同和确定性验证。它们使用原创人物、地点、力量名、开局和情节，不是原作世界复刻。两套定义已经注册到目录并完成五语静态验证；真实试玩与失败范围以 `V080_RESULTS.md` 和 `artifacts/reports/progression-v080/COMPARISON.json` 为准，不把设计表中的预期收益当作已经发生的玩家结果。

## 来源与迁移边界

本轮只读了以下蒸馏材料，没有读取、复制或提交原著正文：

- `C:\GoogleDrive\笔记\50_Corpora\TGN\reference-corpus\mechanisms\mech-action-space-expansion.md`
- `C:\GoogleDrive\笔记\50_Corpora\TGN\reference-corpus\mechanisms\mech-resource-liberation.md`
- `C:\GoogleDrive\笔记\50_Corpora\TGN\reference-corpus\mechanisms\mech-status-recognition.md`
- `C:\GoogleDrive\笔记\50_Corpora\TGN\reference-corpus\mechanisms\mech-mystery-reveal-action.md`
- `C:\GoogleDrive\笔记\50_Corpora\TGN\reference-corpus\book-dna\rcv0-20-gaowu-quanqiu-gaowu.md`
- `C:\GoogleDrive\笔记\50_Corpora\TGN\reference-corpus\book-dna\rcv0-29-xuanhuan-guimi-zhi-zhu.md`
- `C:\GoogleDrive\笔记\50_Corpora\TGN\reference-corpus\arcs\rcv0-29-xuanhuan-guimi-zhi-zhu-arc-01-threshold-to-social-engine.md`
- `C:\GoogleDrive\笔记\50_Corpora\TGN\reference-corpus\arcs\rcv0-29-xuanhuan-guimi-zhi-zhu-arc-06-sea-operating-model.md`

四张机制卡均为 `REFERENCE_ONLY`，成熟度为 `PILOT`；两张 Book DNA 也是选择性或代表性窗口，不是全书穷尽结论。迁移时只采用四个可操作变量：成长应打开新动作；资源奖励要先形成真实自由；身份认可必须换来服务或准入；谜团揭示要改变下一步选择。来源中的人物、组织、境界、物件、事件顺序和原句均未迁移。

## 两个世界

| 世界 | 力量语法 | 资源闭环 | 身份与扩张 | 开局 1—3 回合可兑现结果 |
|---|---|---|---|---|
| `masked-tides` 隐潮七港 | 配方、材料、受控首次使用和跨场景稳定共同形成刻式；共 6 阶 | 配方与材料变成自用成品、现金、抵押物或渠道；失败批次不算进度 | 可核验交付换赊账、夜间工位、保密寄送、仓位和拍卖准入；从一港炼制扩到跨港中继与远海交易 | 完成一批凉雾墨、一次天赋训练或实际交易，保留成品、现金、能力或服务入口 |
| `martial-frontier` 裂陆武途 | 补给、训练、恢复和实测共同变成身体基础；共 7 阶 | 食物、药材和荒材变成体能、招式、可售净化产物或下一次训练资源 | 真实成绩换补给折扣、器械、治疗优先、收购价、区域通行和独立接单权；从城内训练扩到个人资源地和裂陆远征 | 完成身体训练、公开体测或低危独行采集，保留身体提升、奖金、榜位服务或材料 |

`masked-tides` 的长期快感是配方组合、多层身份信用和跨地域交易网络，不把所有回合写成案件调查。`martial-frontier` 的长期快感是把资源吃进身体、公开验证战力并取得个人资源权，不把力量增长自动改写成公共责任。两套世界都允许拒绝全部 NPC 请求，优先修炼、赚钱、关系或独行。

## 数据与语言合同

`src/progression-worlds.js` 不导入 `src/worlds.js`，因此不会与主目录注册形成循环。它导出：

- `PROGRESSION_WORLDS`：两份完整中文 raw world definition，稳定 ID 为 `masked-tides` 与 `martial-frontier`。
- `localizeProgressionWorld(world, language)`：对两个稳定 ID 返回独立深拷贝；支持 `zh / en / fr / es / ar`，未知世界或未知语言返回 `null`。

五种语言都覆盖标题、副标题、诱惑描述、题材、标签、非官方来源标签、`growthGrammar`、力量系统、所有境界、三项天赋、完整开局、NPC 行动、机会、连续性、里程碑、货币、物品、关系、初始能力和事实。`id`、`rank`、`qty`、金币数量及既有中文 attitude enum 保持不变。翻译不调用运行时模型，也不把同一套英文数组当作所有语言的通用内容。

两个世界都填写了 `growthGrammar.desire / conversion / recognition / expansion`，每项不超过 480 字符。该字段已进入 `validateWorldDefinition`、世界快照和成长上下文；`worlds.js` 注册两套定义，`preset-i18n.js` 提前分派本地化。旧存档继续使用创建时的快照，不被新版世界模板覆写。

## 确定性验证

运行：

```powershell
node --test tests/progression-worlds.test.js
```

测试直接调用现有 `validateWorldDefinition` 校验两个世界的五种语言，并调用 `createSeedState` 检查每个天赋的开局状态。还检查世界、境界、天赋、NPC、物品和能力名称/ID唯一性；`id/rank/qty/enum` 跨语言不漂移；开局关系属于开局 NPC，库存不借用 NPC 物品；非中文可读字段无汉字残留；本地化结果为互不共享引用的深拷贝。

限制：这些是静态世界定义与测试，不是实际 18 回合证据；没有调用 ACP、没有启动测试服务、没有修改生产数据库，也不宣称文学质量或长线成长已经由真实玩家证明。
