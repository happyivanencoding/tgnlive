# v0.7.0 五语生成与存档

2026-09-07。语言固定为 zh / en / fr / es / ar，未提供时默认中文或沿用现有书的语言。语言是生成和显示参数，不是新的世界规则。原 TGN 生产项目未改动。

## 接口与身份

`GET /api/worlds?language=fr` 返回五套预设的本地译文。用户自建世界保留原语言，并返回language标记；没有暗中调用翻译模型。

`POST /api/worlds/custom {prompt,requestId,language}` 一次World Forge直接生成目标语言世界；同一requestId改language返回409。`POST /api/games {name,worldId,powerId,language}` 建立该语言的预设世界快照，ID、rank、物品数量与能力身份保持原值。各预设的力量机制与阶层用途有各自译文，不能用同一套通用境界取代驭兽、魔法或炼药体系。

`POST /api/games/:id/turns {action,expectedVersion,requestId,language}` 以所选语言写正文、三个选项及新的可读状态值。成功提交才记录turn.language、更新game.language；失败/取消不改变已提交语言。同一请求的幂等匹配也检查language。切换语言不重写旧正文、旧角色名、旧世界快照或已有能力事实；跨境提案realmAdvance仍使用快照里的精确名称，不因译名破坏身份。

## 实现

- `src/i18n.js`：语言、长度、固定状态/导出标签及态度枚举显示映射。
- `src/preset-i18n.js`、`realm-i18n.js`、`world-rules-i18n.js`：五套预设的静态译文、独立力量阶层和人物转写。英文、法文、西文、阿文不共用一套泛化力量尺。
- `prompts.js`、`world-forge.js`：Narrator/Planner/Repair/Forge均显式目标语言；技术JSON键、ID、enum不翻译。
- `app.js`、`store.js`：传递语言、语言敏感幂等、成功事务保存。
- `reducer.js`、`delta-contract.js`：多语可读字段长度与当前语言的变化标签；数值成长限制未为翻译放宽。

默认中文正文300–800字符；英语/法语/西语180–380词；阿语150–320词。最近四回合中文保留1400字符窗口，非中文3200字符窗口，以免正常外语段落开头被旧中文窗口截掉。没有增加每回合翻译或语言裁判模型。

SQLite仅给games/worlds/turns/requests增加默认zh的language列，无额外迁移框架。旧存档字段直接逐值对比，不加入hash。v0.7上线前后25本书、121回合、2个自建世界、10份世界快照、126个请求的原字段完全一致，新列默认为zh。证据 `artifacts/reports/i18n-v070/production-before.json` 和 `production-after.json`，不进入Git。

## 实际修正

阿语World Forge两次把attitude翻译成 `مستراب` 或 `فضول`，使结构校验失败。保留失败原文；通过有限的既有译表加这两个实际值归一至“戒备/好奇”，任意未知值仍拒绝。提示同时强调此字段是技术枚举而非读者正文。原始提案离线重放无需新模型；随后一次全新阿语世界真实生成和开局成功。不是把错误态度全部降成陌生，也没有偷偷替换世界。

预设翻译审阅发现早期法/西/阿版共用通用境界描述，这是错误且未发布；最终已恢复每世界自身benchmark、unlock、成长来源、NPC转写及物品数量。历史快照不回写。

## 验证与边界

`tests/i18n.test.js` 覆盖默认语言、五套预设ID/rank/物品不变、词典完整、Unicode主角名、Prompt语言、旧档默认、语言幂等、失败不改语言、历史不重写、snapshot境界以及实际Arabic枚举归一。全仓66/66 Node测试通过，其中测试fixture不冒充模型。

真实生成见 `docs/I18N_EXPERIMENTS.md`。短样本验证语言功能，不证明每种语言均达到母语编辑或长篇小说水平。已有别语种自建世界和历史实体名可能保留源语言，这是不改写Canon的明确行为。
