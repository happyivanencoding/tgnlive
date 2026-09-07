# 五语开发契约（2026-09-07）

用户要求主页一开始右上角可选择中文（默认）、English、Français、Español、العربية。支持的language代码固定为 zh / en / fr / es / ar，未传为zh；不要按浏览器语言自动覆盖默认。项目从v0.6.4升级v0.7.0。当前已实现并部署v0.7.0；具体实测、有限枚举映射与旧档行为以I18N_BACKEND、I18N_UI、I18N_EXPERIMENTS为准。

## 用户行为

界面语言保存在localStorage，首访中文。在主页右上角有可键盘/触摸操作的五语原名选择器，手机360px可见，阿拉伯语下入口仍在右上。正文页也能切换（可在更多菜单），切换当时不翻译、不重写已经保存的正文。语言选择适用于新世界、新角色和此后提交的行动；本回合在途时禁用语言切换，避免一条请求混用语言。

旧故事的文字保留，历史段落按自身语言/dir=auto展示；之后的正文、三个建议及新生成的可读字段使用当轮选中语言。界面语言与语料Canon不能混为一谈：切换不能改物品ID/境界身份/力量因果，不增加每回合翻译模型调用。

## 前后端约定

- GET /api/worlds?language=fr 返回本地手工翻译过的预设可见资料（预设5套*五语），用户自建世界按原语言并提供language标记。前端不对原自建内容做虚假逐字翻译。
- POST /api/worlds/custom {prompt,requestId,language}。一次World Forge直接用目标语言生成，同requestId另一语言必须冲突，不重放错语言。
- POST /api/games {name,worldId,powerId,language}。每本书有独立语言记录，预设种子可读信息按目标语言；从另一语种自建世界开始允许，但不伪造全文翻译。
- POST /api/games/:id/turns {action,expectedVersion,requestId,language}。没有language时沿用游戏语言（旧档zh）；持久记录成功回合language。取消/失败不偷偷更新已提交游戏语言。相同id/action/version却不同language不能被误作同一请求。
- Game和library summary提供language；turn提供language；新世界定义提供language，读取旧档没有此字段视为zh（无需改写旧内容）。
- 后端formatAppliedChange与导出标题按目标语言；枚举/JSON键/ID保持原技术契约。关系态度等固定枚举可保持内部中文但UI通过固定词典显示，生成prompt明确区分内部枚举与可读文字。
- Narrator、Planner、Repair、WorldForge明确目标语言，包括正文、选项和可读状态变化。英语/法语/西语约180–380词，阿语约150–320词，中文保持300–800字符；结构边界按支持多语的实际长度协调，不加无条件翻译阶段。

## 文件分工

前端agent负责 public/**、ui-tests/i18n*、docs/I18N_UI.md。后端agent负责 src/**（含preset翻译资料）、tests/i18n*、docs/I18N_BACKEND.md。协调者维护版本号/顶层交接/总系统文档、真实ACP语言测试与发布。不要修改原TGN或其它项目；不要并行改别人的文件，不自行重启线上、commit/push，协调者集成后做。

## 证据

先用测试检查默认/持久、语言透传、五语UI无遗留主要中文、Arabic RTL输入/抽屉/建议/窄屏无溢出、旧档不重写、枚举与ID不串线、世界/回合幂等语言区分。再顺序做真实五语正文与非中文世界创建，记录首段/总耗时和实际ACP配置。模拟不当真机；未知成本不猜测。任何失败保留、按具体失败修正，不扩成新的多模型流水线。
