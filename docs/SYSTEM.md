# TGN Live 系统说明与接手入口

更新：2026-09-07。当前已验证线上版 v0.5.0；v0.6 正在本次任务开发，实际交付状态以 handoff 最新段落与实验证据为准。

## 产品目标与优先级

玩家用一句话或 prompt 创造想进入的修仙、玄幻、魔幻等男频成长世界，也可从原创/非官方同人灵感世界开始。不是固定背景换名称，也不是角色聊天壳。核心体验是亲自获得力量、获得以前没有的行动选择、把收益用于下一次冒险；小说叙事服务玩家行动而非永远押送、打工、谈判和极小的训练刻度。

参考原 TGN `docs/PIPELINE_METHODOLOGY_AND_VALUES.md` 的 Fantasy First、Agency First、Narrative Compounding、Few Deep Rules。保留人物私欲、空间/物品因果、公众可理解的力量等级以及突破后能做什么。原则属于创作后台，不写成正文中的自我解释。不得搬入原 TGN 整条批量小说生产流水线。

## 当前架构

单个 Node 24 HTTP 服务，内置 SQLite，原生 HTML/CSS/JS，默认回环 4317。线上 `live.thegreatnovel.com` 复用现有 Cloudflare Tunnel，Access 本人登录 + origin JWT 验证；此轮不新增多用户、公开匿名访问或付费。

当前运行：创建角色种子 → 开局作者底稿 → 一次 Narrator 流式正文+结构提案 → 确定性校验/状态应用 → SQLite 原子保存。后续每8回合检查点才触发短 Story Brain；校验失败最多一次条件修复。不得把错误吞掉后返回测试文本。

扩展契约见 `LIVE_V060_CONTRACT.md`：世界目录 + 一次真实 World Forge → 持久世界定义 → 角色世界快照 → 同一实时游玩流程。不同世界有自己的境界、力量因果、天赋、开局、NPC/物品/货币，不共享烬河专属种子。新世界的生成耗时与首次正文等待独立显示。

## 代码与文档入口

- `src/app.js`、`server.js`：HTTP/SSE、路由、运行入口。
- `src/store.js`：持久化与原子提交；`reducer.js`：可应用状态变化。
- `src/worlds.js`、`opening-plan.js`、`prompts.js`：世界事实、开局和叙事上下文。
- `src/acp/`：实际模型调用、会话释放、错误/取消、遥测。
- `public/`：手机优先发现/创建/阅读/行动/状态界面。
- `eval/`：有界真实游玩、固定动作重放、协议与计时汇总。fixtures 不是真实模型证据。
- `docs/WORLD_SYSTEM.md`、`MOBILE_DESIGN.md`：本轮对应实现完成后写明具体合同和测试。
- `docs/EXPERIMENTS.md`：历史报告；每批新报告单独保留，不覆盖基线。
- `DEEP_CONTEXT_HANDOFF.md`：新 LLM 必须先读的当前版本、运行/恢复、剩余事项。

## 证据与冻结

每次系统改动记录版本/commit、真实 ACP 模型/思考等级/session/run、动作、前后状态和原文。时间区分创建世界、上下文/规划、ACP准备、首次正文、正文生成、解析/条件修复、保存、API完成、浏览器首段绘制观察。嵌套 span 不重复相加，玩家决策不混入应用加载。缺失账单 token、成本或供应商内部排队数据保持 null。

本轮新基线 `artifacts/eval/baseline-mobile-worlds-v050/`：5回合完成；新发现物品归属矛盾、成长可用收益仍弱。与开发ACP有重叠的延迟不得宣称独占基准。下载文游提示词只能作为待测启发；读过提示词/蒸馏卡不等于读过原著。只有具体正文与真实状态支持显著向男频成长体验改善，才能把该项提示词/结构改动标为生产采用，其他保留实验身份。不能拿总体打分代替判断。

## 版本与仓库工作流

用户已明确授权仓库 `happyivanencoding/tgnlive`，主分支 `main`。每次接受代码或版本修改，同步本文件、handoff、受影响的架构/手机/世界/实验文档，运行能检测本次实际失败的相关测试，然后 commit + push。不要等用户再次要求，不要 force-push，不自动提交开发中间态。

`.runtime/`、`data/`、`artifacts/`、账号密钥、原著全文、下载提示词、私人存档不进入 Git。参考库与 `C:\dev\tgn-story-mvp` 只读。停止/重启仅使用项目脚本并验证项目进程归属，不操作其他项目ACP/服务。
