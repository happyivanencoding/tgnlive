## v0.8.0 最终集成补充

下方为初版手机协作者记录，不能覆盖后来的独立反证与修正。最终 `artifacts/ui/progression-mobile-release-v080/result.json` 在长流、用户上滚、完成落盘、阅读模式、键盘模拟、Stop焦点、360/390/430和紧凑横屏条件全部通过；同一锚点偏移0、dock开始/完成高度差0、预览到落盘高度差0。新增段落DOM与正式正文同构、44px同位状态行、稳定Stop节点；事实清单不再充当获得奖励HUD，最多3项有用收益提示。

早期next-rAF会把屏外8991px文字当已呈现，该指标已经否决。当前标记需元素进入可见视口并经过后续帧；独立记录器另测两帧。实际模型长测已运行，详情见V080_RESULTS；实体Android/iOS和公网延迟仍未测。连接超时消息已补全五语，失败不宣告Canon提交。


<!-- V080-CURRENT-END -->

# TGN Live progression mobile UI

日期：2026-09-07。任务：`tsk_2a159f2c1ff89ff8`。本轮只修改 `public/**`，新增 `ui-tests/progression-mobile*.mjs`，并写本文与 `artifacts/progression-v080/` 证据；没有修改 `src/**`、`eval/**`、版本、交接文件或 Git 历史，没有提交、推送、重启服务或调用 ACP/LLM。

## 结论

冻结 v0.7.0 旧 UI 已稳定复现移动端流式页面跳动：在 390×844、用户从底部主动向上约 150px 后，旧逻辑仍把该位置判为“跟随最新”，长流期间 `scrollY` 从 `20453` 被拉到 `22061`，最终 `bottomGap` 从 `150` 变为 `0`。修复后，同类长流、dock 高度变化和 complete 重整前后 `scrollY` 均保持 `10635`，旧回合 DOM 节点身份也保持不变；只有用户点击“回到最新”才恢复跟随。

正文字号现为 `12–24px`，新设备默认 `16px`；已有 `tgn-live-reading` 设置继续使用并被限制到有效范围。最小 12px 时实测层级为正文 12、选项 13、标题 16、状态 11、输入 16px。主要按钮、状态、发送、停止和关闭目标约 44px。

## 旧版复现与根因

基线脚本先用 GET 从独立 4318 读取冻结 v0.7.0 health、书架和同一可达存档 `game_9dc42ab14775472fa6acaf5b794ba310`，再用 `.runtime/progression-v080/baseline-source/public/` 与本地隔离 SSE fixture 重放长流。fixture 正文和状态不是模型输出，也没有向 4317/4318 POST。

根因有三个相互叠加的具体行为：

1. `submitTurn()` 与 `renderNarrative()` 用“离底部小于 `max(260, dockHeight + 80)`”重新推断跟随。用户即使已主动上滚，只要仍落在该阈值内，就会被改回跟随。
2. 每次提交与 complete 都通过 `innerHTML` 重建全部历史回合。旧文节点、浏览器滚动锚点和正在阅读的 DOM 身份一起丢失。
3. `scroll` 回调无法区分用户滚动和程序 `scrollTo()`；dock、loading、选项、字号、阅读模式及 `visualViewport` 改变时也没有显式阅读锚点。

`artifacts/progression-v080/baseline-mobile/result-attempt1.json` 保留第一次边界外尝试：离底部约 310px 时旧版没有跳动。随后把主动上滚位置放到旧阈值内，`artifacts/progression-v080/baseline-mobile/result.json` 得到 `reproduced-scroll-defect`。旧 UI 截图位于同目录，重点为 `old-user-up-before-stream-390.png` 与 `old-user-up-after-stream-390.png`。

## 实现

- 历史回合按稳定 turn key 增量对齐；未变化的旧回合节点不重建。流式正文只向 provisional 段落追加文本节点，complete 只加入 canonical 新回合并移除 provisional。
- wheel、触摸上滑页面、PageUp/Home/ArrowUp 等明确向上意图立即锁定阅读位置；程序滚动有独立保护窗口，普通 `scroll` 不再用“靠近底部”擅自恢复跟随。
- dock/选项/loading、成长反馈、字号、阅读模式和 `visualViewport` 变化前捕获当前回合锚点，布局完成后恢复该节点的视口位置。仍在跟随的用户继续跟随；锁定用户只可通过“回到最新”恢复。
- 成长变化从覆盖正文的 fixed 浮层改为正文末尾的普通流内卡片，不伪造 Canon；失败和取消保留草稿与未写入正史状态。
- 浏览器记录 `click`、`immediate-feedback-paint`、`first-narrative-paint`、`canonical-complete-received`、`next-choices-ready-paint` 的 `performance.mark` 和相对时间；`window.tgnLive.getTimings()` 返回最近 12 条轻量记录。失败或取消只记录相应 outcome，不补写 complete/choices 时间。
- 生成记录抽屉以五语说明这些是 `performance` 与下一帧的浏览器近似，不是首 API byte、模型内部时间或物理手机像素时间。

## 验证

使用仓库外既有只读依赖：

```powershell
$env:PLAYWRIGHT_MODULE='file:///C:/dev/agent-monitor/node_modules/playwright/index.mjs'
$env:BROWSER_EXECUTABLE='C:\Program Files\Google\Chrome\Application\chrome.exe'
node ui-tests/progression-mobile-baseline.mjs
node ui-tests/progression-mobile.mjs
node --check public/app.js
node --check public/i18n.js
node --check ui-tests/progression-mobile-baseline.mjs
node --check ui-tests/progression-mobile.mjs
node --input-type=module -e "import {auditMessages} from './public/i18n.js'; console.log(JSON.stringify(auditMessages()))"
git diff --check -- public ui-tests/progression-mobile-baseline.mjs ui-tests/progression-mobile.mjs docs/PROGRESSION_MOBILE.md
```

最终 `artifacts/progression-v080/mobile-result.json` 为 `passed`，35 项检查全部通过：

- 360/390/430 纵向视口与 zh/en/fr/es/ar 均无横向溢出；阿语输入 RTL，旧中文与新阿文段落方向分别保留。
- 主动上滚后的长连续 stream、generation dock 从约 240px 增至约 310px、complete 后降至约 221px，阅读位置仍不变；回到最新与继续跟随通过。
- 旧回合节点在 submit/stream/complete 后为同一 DOM 对象；完成后的三个新选项可见且可点击。
- 本次隔离 fixture 的浏览器近似样本为：即时反馈 9.5ms、首段正文 paint 142.8ms、收到 canonical complete 1947.9ms、下一步可操作 1960.2ms。只用于验证标记顺序和可获取性，不代表真实 ACP 延迟。
- 成长卡底部约 571px，dock 顶部约 623px，没有遮挡；模拟键盘前后 `scrollY=11459`；阅读模式切换时同一正文锚点 top 均为 `-1290.453125`。
- 取消没有新增 canonical 回合，草稿保留；唯一 `net::ERR_ABORTED` 精确归因于测试点击停止后本 UI 调用 `AbortController.abort()`，未出现其他网络失败或 page error。
- IME 不提交、含换行草稿刷新后逐字恢复、已有 19px 阅读设置恢复、导出仍可下载。

保留的失败验收没有删除：`mobile-result-attempt1.json` 是长页平滑“回到最新”尚未在固定 500ms 内结束，改为等待实际到达；`attempt2` 与 `attempt3` 是脚本错误地忽略 IME Enter 留下的换行，刷新前后存储值实际相同；`attempt4` 错把阅读模式为补偿 17px 上边距而改变的 `scrollY` 当成内容跳动，改为比较同一正文节点的视口 top。

## 待真实测

本轮没有向生产 4317 写入或重启，也没有占用 ACP 槽位。4317 与 4318 仅 GET 检查时 health 均为 v0.7.0；4317 为 owner-only，4318 为独立 local-only 基线。主协调者仍需在集成后用真实浏览器、真实 ACP 连续回合复核上述五个时间点，并在可用实体 Android/iOS 上验证系统键盘、地址栏收缩和触摸手势。当前证据不声称实体手机或真实模型性能已经验收。
