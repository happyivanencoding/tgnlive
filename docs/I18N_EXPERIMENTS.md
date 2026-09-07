# v0.7.0 五语实测与发布证据

日期2026-09-07。任务 `tsk_372fe95f0f4f9ec7`。目标是加入zh/en/fr/es/ar游玩与手机语言入口，不重做故事生成方法。全部原始证据保留在本地artifacts，未提交数据库、私有原始输出或凭据。

## 真实语言游玩

`artifacts/eval/i18n-v070/`：每语两个回合。第一回合固定开始故事，第二回合由独立Luna/low玩家根据当前观察行动，正文Terra/low。不是UI fixture。候选初次游玩之后仅修补预设翻译、固定枚举和界面，不把后续静态修补宣称为重新跑过全部十回合。

| 语言 | 成功回合 | 首段平均秒 | 完成平均秒 |
|---|---:|---:|---:|
| 中文 | 2/2 | 12.389 | 26.398 |
| English | 2/2 | 3.717 | 15.082 |
| Français | 2/2 | 4.398 | 16.912 |
| Español | 2/2 | 6.421 | 27.746 |
| العربية | 2/2 | 5.345 | 16.948 |

正文、三个建议、实际行动及状态均保存；玩家决策时间另列，不混入应用等待。完整stage可在各语言`*-server-metrics.json`查看，包含请求校验、上下文、模型配置、叙事、解析、条件修复和保存。嵌套ACP配置时间不能重复相加，缺失billable tokens/cost/内部queue保持未知。

另在同一中文书成功切至法语后续回合：首段14.923秒，完成49.469秒；前两回合原文和language=zh完全保留。该样本证明切换契约，不证明切换一定快。全部为少量随机生成，不能拿此表排列语言效率或当SLA。

## 一句话创建

法语世界《Les Éclats de l’Astre Noyé》一次创建39.018秒，随后真实法语开局成功。同requestId/同语言重放同一世界；换语言返回冲突。

阿语WorldForge第一次失败：`مستراب`被用作技术态度枚举；第一轮修补后另一次输出名词`فضول`仍失败。两个失败保留在测试数据库trace和`i18n-v070`、`i18n-ar-fixed-v070`，没有替换成fixture故事。

最终增加有限精确归一及枚举说明后：`artifacts/eval/i18n-ar-final-v070/` 全新阿语世界创建46.514秒，阿语开局首段6.028秒、完成16.678秒；完整世界、目标语言、三个建议、幂等和语言冲突验证成功。原始失败提案也直接离线重放通过，耗时约0.285毫秒且新模型调用0；不把这当作新生成或重新测得的端到端提速。

## 手机与生产保存

- 全仓66/66 Node测试通过；`artifacts/reports/i18n-v070/unit-tests.txt`。
- 隔离浏览器语言/手机契约46项通过，非模型测试。
- 真实Chrome语言链路20项通过；另一次真实阿文行动观察到26.266秒完成，成功存为第3回合。仍记录1个net::ERR_ABORTED网络收尾警告，未见丢档，无JS异常。不是所有网络问题已修好。
- 生产升级前后25本书、121回合、2个自建世界、10份世界快照、126个请求原字段逐值相同；新language列默认zh。没有hash，没有回写历史正文。`production-before.json`/`production-after.json`。
- 新版4317由既有TGNLive-Web计划任务启动，health为0.7.0。原Cloudflare owner-only边界6项通过，未登录仍302到Access，未改其它项目权限；`artifacts/remote-v070/boundary.json`。

真实外语测试使用独立4318、`.runtime/i18n-test/games.sqlite`；不把测试故事迁进生产书库。手机是Chrome视口及事件模拟，未宣称Android/iPhone真机键盘已测；未由母语人工编辑全面审核文学质量。现有不同语言世界/旧实体名称可保留源语言。

## 复现与接手

```powershell
npm test
node ui-tests/i18n-contract.mjs
node eval/language-test-server.mjs
# 另一个终端；每次用新的label，不覆盖旧证据
node eval/languages.mjs new-language-run
node eval/arabic-world-retest.mjs new-arabic-run
node ui-tests/languages-live.mjs --play
node ui-tests/i18n-deployed-readonly.mjs
node scripts/verify-remote.mjs
```

Playwright路径环境变量见I18N_UI。真实模型脚本须顺序、有界运行，不与两个开发ACP同时竞争。两个早期开发会话09:27连接中断，没有完成报告，之后的代码集成、确定性测试、真实语言复测与发布由协调者接手完成；不把失败开发run记成已成功交付。
