# 天命书 · TGN Live

已发布并核验：**v0.9.0**，生产代码提交 `6b59581a123494cfe393d68030369822735445d5`，原站4317与owner-only Access保持不变；28本旧书、131个历史回合、13个显式世界快照及全部8张持久表在部署前后逐表内容一致。正式部署与公网边界回执见 `artifacts/reports/ascension-v090/DEPLOYMENT.json`。这不是长期留存或所有成长循环已经解决的宣告。

可玩的男频成长幻想小说。独立项目 `C:\dev\tgn_live`，当前代码 **v0.9.0**；没有修改原 `tgn-story-mvp` 生产系统。玩家从作者预设开始，也能用一句话或2000字以内prompt创建自己的修仙、玄幻、驭兽或魔法世界，再选择天赋与主角进入。

## v0.9.0：玩家坐标与阶段升格

本版增加公开开局坐标、基于实际能力的阶段身份、成熟操作压缩与非阻塞Story Brain提前规划。多轮20回合真实样本、失败和接受边界见 [v0.9结果](docs/V090_RESULTS.md)；实际生产部署回执为 `artifacts/reports/ascension-v090/DEPLOYMENT.json`。同一线上产品与旧存档保持不变。

## 五种语言游玩

主页右上角可选择中文（默认）、English、Français、Español、العربية，选择会在本设备记住。界面、预设、创建世界及后续正文/选项采用所选语言；故事更多菜单也能切换。旧正文保留不翻译，阿语支持RTL。详见 `docs/I18N_UI.md`、`docs/I18N_BACKEND.md` 与真实计时 `docs/I18N_EXPERIMENTS.md`。

## 打开与运行

私有线上入口：**https://live.thegreatnovel.com**，用现有本人Cloudflare Access账号登录。本机：**http://127.0.0.1:4317**。两处使用同一存档，仍是单owner，不是匿名开放的多用户平台。

要求 Node24、已登录的本机AgentDock/Codex ACP、电脑开机联网且未睡眠。没有运行时npm依赖。

```powershell
cd C:\dev\tgn_live
pwsh -NoProfile -File scripts/start-local.ps1
# 停止本项目自己的服务
pwsh -NoProfile -File scripts/stop-local.ps1
```

后台脚本通过当前用户的 `TGNLive-Web` 计划任务托管服务，不再依附有时限的AgentDock命令进程。当前用户登录启动配置仍保留。普通终端调试可直接 `node src/server.js` 并保持窗口打开。详见 [运行与远程恢复](docs/REMOTE_ACCESS.md)。

## 可以做什么

发现页提供 `烬河照夜`、`云背群岛`、`灰塔星契`，以及分别借鉴《斗破苍穹》《斗罗大陆》成长机制的 `赤曜药州`、`万相猎庭`。后两者明确标注非官方同人灵感，人物与开局重新创作，不是完整复刻原著或官方授权声明。

创作页将描述转成背景、独立力量体系、境界用途、三个天赋、人物欲望和可玩的开局。完成后先预览再开始，不把结构化世界定义伪装成流式正文。每本新书保存自己的世界快照；之后修改目录不会改写旧故事。

正文实时生成，每回合三个建议，也可自由行动、拒绝、谈判、逃离、冒险或修炼。校验并保存后才成为正史。境界、技能、钱财、物品余量、人物关系、事实与承诺持久保存；每6回合分章，可继续旧书或导出Markdown/TXT。

手机端分为发现、创作、书架与沉浸阅读。底部行动坞、按书保存草稿、中文输入法保护、键盘避让、回到最新、字号/行距/阅读底色、状态与生成记录sheet、真实阶段耗时和停止/重试均已实现。视口模拟不等同于实体手机验收。

## 生成架构与速度

默认正文 **Terra/low**，世界创建 **Luna/medium**，低频Story Brain **Sol/medium**；独立测试玩家为Luna/low。具体完整模型标识和环境变量在 `src/config.js`。

选预设不调用世界生成。开局使用该世界作者底稿，第一段正文仍是实时模型生成。后续主要是一轮Narrator，通常每8回合检查点才追加规划；只有明确格式/状态错误才最多一次修复，没有常驻第二个改写模型。

世界创建、首段正文、整回合完成、测试玩家决策分别计时；ACP准备是生成内部子阶段，不重复相加。账单token、成本与提供方内部队列没有可靠数据就为null。版本结果、真实失败和冻结范围见 [本轮研究与实测](docs/V060_RESEARCH_AND_EXPERIMENTS.md)，不能把功能测试通过当成顶级小说质量证明。

## 测试与证据

```powershell
npm test
node scripts/verify-remote.mjs
node eval/play.mjs --label fresh-run --world sky-beast-isles --turns 10 --persona explorer --allow-unfrozen --max-minutes 15
node eval/world-create.mjs fresh-world eval/world-prompt-stars.txt
```

必须使用新label保留旧证据。`play.mjs`首回合为固定启动，之后是独立ACP玩家；`--replay`明确标记固定行动重放。指定不存在的世界/天赋会停止，不会默默回到第一个世界。全局ACP并发上限为2，长测试从AgentDock执行时须给足命令超时，不挤占其他项目会话。

`artifacts/eval` 保存行动、正文、前后状态、实际模型/思考等级、session/run ID、逐阶段时间、错误与修复；`artifacts/ui`保存浏览器截图与结果。原始数据和SQLite留本地，不进入Git；提交的研究报告包含必要摘要与路径。

## 接手和版本同步

仓库 **happyivanencoding/tgnlive**，分支 **main**。每次接受的代码/版本更新都更新handoff与系统文档，commit并push `origin main`，验证成功后再宣称交付。不是监视每次敲键盘自动提交，也不force-push。

接手顺序：`AGENTS.md` → [交接](DEEP_CONTEXT_HANDOFF.md) → [系统总览](docs/SYSTEM.md) → [世界系统](docs/WORLD_SYSTEM.md) → [移动端设计](docs/MOBILE_DESIGN.md) → [本轮实测](docs/V060_RESEARCH_AND_EXPERIMENTS.md)。历史迭代仍见 `docs/EXPERIMENTS.md`。

尚未实现图片/语音/视频、支付、多人社交或匿名开放服务。长篇记忆容量与技能语义仍需实测，不把十回合成功说成数百回合稳定，也不声称AI读者能证明真人留存。
