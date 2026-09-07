## v0.8.0 当前约定（优先于下方历史）

见 [本轮真实结果](V080_RESULTS.md)、[成长机制与否决记录](PROGRESSION_ITERATION.md)、[移动端证据](V080_INDEPENDENT_REVIEW.md)。当前新增可复用筹码/待兑现机会状态、世界独立growthGrammar、阶段欲望与短计划；没有新增每回合模型。七个预设中两个新世界的实际覆盖须按报告读取，不能用schema通过代替长测。

API server firstNarrativeSseMs与浏览器可见帧严格区分；ACP五个准备子阶段在原model阶段内，20s准备预算与120s正文预算分离。只允许叙事输出，命令目录元数据例外不等于允许工具。默认模型仍Terra低/Narrator、Sol中/Brain、Luna中/Forge；完整等待未证明变快。

移动正文12–24px、默认16/input16；旧历史节点不重建，主动上滚锁定，预览/落盘同构段落与稳定dock。生产静态文件由启动脚本固定版本快照。原存档快照与owner-only安全边界不变。已否决exact quote gate与强制补奖；知识性结算不是物质成长。

<!-- V080-CURRENT-END -->

# v0.7.0 五语补充

主页右上角语言选择、Arabic RTL、逐段语言方向和手机验证详见 `I18N_UI.md`；最新部署证据 `I18N_EXPERIMENTS.md`。下方是v0.6手机重设计历史，阅读/草稿等行为继续适用。

# TGN Live v0.6 移动端设计与验证

更新：2026-09-07。范围只涉及 `public/**` 与 `ui-tests/mobile-worlds*.mjs`。这是手机端产品设计与实现记录，不替代后端契约或总交接。

## 产品判断

v0.5 在 390px 下可以完成游玩，但首页是单一宣传区加书库，世界不可发现；进入长存档后，建议与自由行动在文流末端，首屏不可达；没有明确的回到最新、阅读设置和逐书草稿。旧版只读证据保存在 `artifacts/ui/mobile-v060/before/`，其中 `evidence.json` 记录了全部请求均为 GET。

v0.6 将产品分成四个清晰层次：发现、创作、书架、沉浸阅读。首页先给最近阅读，再给克制的产品命题、创作入口和世界卡，不使用巨幅空洞营销区。世界卡只使用 CSS 图形、汉字印记与渐变，不使用外部图片，也不声称是 AI 插画。

公开 HiYam `/explore` 的只读可访问内容显示：主入口包括 Start Exploring 与 Create your own；发现页按 Featured worlds、Trending now、New Games 分区，并提供 fandom 与 genre 浏览；卡片进入 Intro / Opening Scene 后再 Start Game。TGN Live 只借鉴“发现分区—卡片—详情—开始”的信息路径，没有复制其素材、文案、账号流程或视觉资产。访问未登录、未注册、未提交表单。

## 发现与创作

- 顶层固定为“发现 / 创作 / 书架”，移动端放在安全区之上的底部导航；进入故事后完全退出这个导航，避免聊天壳感。
- 最近存档以单条“继续阅读”呈现；世界卡明确显示 `sourceLabel`，可区分原创、用户原创与非官方同人灵感。
- 世界列表兼容 v0.5 缺少 `genre`、`tags`、`sourceLabel`、`powerSystem` 的对象；缺失字段只降级展示，不阻止进入旧世界。
- 创作表单接受一句话或一段描述，`maxlength` 与计数统一为 2000。首页示例优先浮空群岛驭兽、星海仙侠和明确标注的非官方热血忍者灵感，不默认蓝领或工程化开局。
- `POST /api/worlds/custom` 只显示后端真实 `stage` 和真实/本地已过时间，不显示伪百分比，不流式伪造结构化世界正文。停止使用 `AbortController`；失败保留描述与 requestId，可修改或重试。
- 完成后先预览世界、力量体系、境界路径和三个天赋，再填写主角名进入；不会自动触发第二次世界生成。

## 沉浸阅读

- 正文使用宋体体系、18px 默认字号和 2.05 行距；设置可调 16–24px、1.70–2.40 行距及墨夜/宣纸底色，并持久保存。
- 手机端行动坞固定在底部，三条建议横向滚动，自由行动始终可见；正文底部留白由 `ResizeObserver` 按行动坞真实高度更新，包含 safe area。
- `visualViewport` 变化会计算键盘占位。输入聚焦且键盘打开时，行动坞收成单一输入行；输入始终不小于 16px。
- 中文输入法以 `compositionstart` / `compositionend` 加 `event.isComposing` 双重保护，合成期间 Enter 不提交。
- 草稿使用 `tgn-live-draft:<gameId>` 独立保存。打开或刷新同一本书会恢复，提交成功后清除；失败或停止后保留原行动。
- 用户离开最新位置后，流式预览和完成重绘不强制滚回底部；“回到最新”明确恢复跟随。首次进入书卷仍定位最新内容。
- 状态、阅读设置与生成记录使用底部 sheet：有可见关闭按钮、遮罩关闭、Escape、焦点恢复和 Tab 焦点循环。
- 回合完成后用短暂成长反馈展示后端 `turn.changes`；它不替代 canonical state，也不把预览当成已保存结果。
- `prefers-reduced-motion` 会关闭平滑动画；短横屏隐藏建议栏，只保留自由行动，避免键盘与正文被挤没。

## 接口与兼容

前端保留现有 `/api/health`、`/api/worlds`、`/api/games`、`/api/games/:id`、turn SSE、cancel、export 与 metrics 相关入口。现有游戏仍通过原 ID 读取，不迁移、不改写。新建游戏仍发送 `{name, worldId, powerId}`。turn 仍发送 `{action, expectedVersion, requestId}`，只在 `complete` 后采用后端返回的 canonical game。

新增世界接口按 `docs/LIVE_V060_CONTRACT.md` 消费：`POST /api/worlds/custom`，SSE 接受 `stage`、`complete {world,metrics}`、`error`。前置 HTTP 错误与 SSE 错误都进入同一个可重试恢复面。

## 证据与复现

使用现有 Playwright 安装，不新增包：

```powershell
$env:PLAYWRIGHT_MODULE='file:///C:/dev/agent-monitor/node_modules/playwright/index.mjs'
$env:BROWSER_EXECUTABLE='C:\Program Files\Google\Chrome\Application\chrome.exe'
node ui-tests/mobile-worlds-contract.mjs
node ui-tests/mobile-worlds-live-readonly.mjs
node ui-tests/fixture-playwright.mjs
```

`mobile-worlds-contract.mjs` 是明确隔离的 UI fixture，不调用真实模型。它覆盖 360/390/430px、844×390 短横屏、世界列表失败与重试、卡片进入预览、2000 字上限、真实阶段字段与耗时、世界生成停止/失败/重试、创建后预览与开局、成长反馈、长建议、旧档恢复、逐书草稿、中文 IME、阅读旧文不被拉回、回到最新、sheet 关闭/焦点、阅读设置、模拟 visualViewport 键盘和 reduced motion。结果与 after 截图在 `artifacts/ui/mobile-v060/after/`。

`mobile-worlds-live-readonly.mjs` 连接当前 4317 服务，只发送 GET；验证真实旧存档继续、现有三个建议、世界卡、390px 无横向溢出和行动坞正文留白。结果与截图在 `artifacts/ui/mobile-v060/after-live/`。

## 仍需协调者集成实测

当前后端尚未由本任务重启或切换，因此没有调用真实 `POST /api/worlds/custom`。后端完成后仍需顺序实测：真实 ACP 世界生成各 stage/elapsed 字段、断开是否在提交前取消、完成 requestId 幂等、用户世界持久化与重新载入、世界 snapshot 开局、真实新世界首回合正文与状态一致性。另需实体 iOS/Android 验证系统键盘、地址栏收缩、刘海/圆角 safe area；当前只能声明 Chrome viewport 与 visualViewport 模拟通过。

## 最终v0.6.4集成验收（2026-09-07）

上述“等待后端”等描述属于开发阶段。最终后端多世界已接通，真实创建与游戏快照测试已完成；来源标签明确关联作品且非官方。首页压缩继续卡/品牌宣言，390宽首屏可见第一张世界卡；configured显示“可开始故事”。主天赋优先显示capabilities中强化后的说明，物品状态显示剩余包/瓶的description。

当前45个Node测试、29个移动UI契约fixture和7个真实页面只读检查通过。当前fixture路径仍叫mobile-v060，但结果时间2026-09-07 08:28 UTC为v0.6.4。没有把fixture称为真实模型测试。

`ui-tests/mobile-worlds-live-play.mjs` 使用真实Chrome、真实API与ACP，完成赤曜药州两回合；8项功能检查通过，刷新后经“继续阅读”恢复正文和草稿、状态新能力说明、导出正常。证据 `artifacts/ui/mobile-v064-live`。第一段paint6.404/17.315秒，提交15.601/50.667秒；后一回慢在模型，不在渲染/保存。

保留1个net::ERR_ABORTED、无JS页面异常和观察到的数据丢失，所以总结果仍issues_found。前一轮脚本错误等待刷新后自动进入正文，后来按实际设计点击继续阅读，原失败结果保留。未验证Android/iOS实体设备、真实软键盘、前后台切换保活；360/390/430与横屏是桌面Chrome模拟。
