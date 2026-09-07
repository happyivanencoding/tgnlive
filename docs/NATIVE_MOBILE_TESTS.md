# Native Android 真机验证

## 当前阶段：v0.9.0-android.3 / 9003

本轮已在 **Samsung SM-S928U1 / Android 16（API36）** 上安装并使用默认生产 HTTPS 客户端。屏幕1440×3120、density600；开始时系统font scale为0.8。本轮没有把实体设备测试写成模拟器测试，也没有把上一阶段的“未连接手机”继续当作当前状态。

真实数据源仍是既有 `live.thegreatnovel.com`。采用手机已有的合法 owner 会话，没有预置凭据、匿名公网 API 或另一套 Canon。首次清除会话后的浏览器登录未重跑，不能由本轮会话复用代替。

最终汇总以 `artifacts/reports/android-native-v090-physical/MEASUREMENTS.json`、`RESULTS.md` 为准；本地完整证据在 `.runtime/android/physical-20260907/`。旧 `android-native-v0801` 报告是上一阶段历史，不代表当前仍为0回合/无实体机。

## 测试书与真实回合

本轮最终服务端确认 **7个唯一成功回合**；独立通过的实际设备测试包括连续两轮、Stop/Retry、Gboard九键候选提交、后台/系统返回，以及9003自动草稿跨确认保留IME候选。

唯一用于本轮主动提交动作的专门测试书：`Native device2`，gameId `game_a943b8e8080644c0835a646a1c2bf109`。从 Native 的预设选择、天赋、命名、开场开始；随后经过自由行动、实际建议填入再提交、恢复/取消/重试。每一轮都走既有生产 Narrator/校验/Canon 提交，未使用固定fixture替代真实游玩。

不要把真实库中的历史136回合当本轮Native新生成。成功回合数必须取这本测试书最终服务端version/turns，并与设备timing和requestId关联；取消、未知提交结果和失败尝试分开计算。

已完成的 `device4-physical.log` 为一段真正通过的、连续两轮的实体机测试，覆盖自由行动、建议、SSE、新一轮操作区和顶部状态打开/关闭。其前后的恢复、输入及系统路径见各独立日志，不能因为一个用例失败就抹去已经验证的路径，也不能把整体失败日志改称PASS。

## 这次查出的等待原因

正文之后仍在生成结构化choices/delta；必要时还会repair。用户的两份旧生产trace分别有约21.99s和22.35s修复耗时。旧Native已响应SSE complete，不是单纯错误等待HTTP EOF。

新增 `narrative_end` 仅标记暂定正文结束。正式 `complete` 仍为提交权威。Native将“接收行动→正文→确认结果→下一轮”分开：旧操作区收起，首段前呼吸点；正文后明确确认/校正，并自动展开同一个原生编辑器供写不自动发送的下一步草稿；只有正式提交后新建议和发送权限才出现。

前五个设备计时回合的首次反馈109–144ms、正式提交到输入就绪114–159ms；这是各实际trial数据，不是受控AB结论。最终9003回合的暂定正文尾字→自动草稿可用 **129ms**，发送仍等正式确认：尾字→发送可用9531ms；正式确认→发送可用115ms。前后输出长度和core版本不同，不能据此宣称某个百分比性能提升。最终更多回合见机器报告，缺失字段保持null。

## 物理测试驱动与证据口径

`PhysicalDeviceJourneyTest.kt` 使用 Android UiAutomation、真实elapsedRealtime和真实触摸事件，不使用Compose测试的虚拟动画时钟做设备耗时结论。服务端和手机端时钟不混减；通过requestId关联。

主要接受方法：

- `realDeviceRealClockJourney`：专门测试书的真实生产连续回合。
- `readingControlsAndLifecycle`：六个状态分类、主题/五语、阅读锚点、键盘与后台草稿。原先自动化在收尾返回步骤被窗口动画/前台切换打断，逐步结果与失败日志保留。
- `resumeAndBackGestureOnly`：只补测后台恢复和系统返回，不机械重复已走过的状态/主题检查。
- `explicitStopAndRetry`：真实请求已收到SSE后停止，再显式重试；要求最终target turn不增加两次。
- `chineseNineKeyComposition`：当前手机实际Gboard九键布局的物理按键与候选提交，不把ACTION_SET_TEXT或adb input text当中文组词。它是特定已观察布局的测试，不宣称适用于所有IME。

测试开始前设备必须正常授权且用户暂时不切换应用。驱动发现前台已不是TGN时不再注入触摸或保存其他应用截图；不读取其它App内容、清空用户数据、绕过锁屏或修改全局输入法。截图有意等待短暂系统转场稳定；这个等待不参与Narrative性能指标。

每次只运行一个UI控制器。不要在Instrumentation执行时另起uiautomator dump或其它触摸脚本。真实录屏可并行，因为它只观察屏幕。不要让静态Node/JVM fixture测试冒充真机。

```powershell
cd C:\dev\tgn_live_android\apps\android
.\gradlew.bat :app:assembleDebug :app:assembleDebugAndroidTest --no-daemon
$adb="$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb -s <serial> install -r app\build\outputs\apk\debug\app-debug.apk
& $adb -s <serial> install -r app\build\outputs\apk\androidTest\debug\app-debug-androidTest.apk
& $adb -s <serial> shell am instrument --user 0 -w -r `
  -e class 'com.thegreatnovel.tgnlive.PhysicalDeviceJourneyTest#realDeviceRealClockJourney' `
  -e tgnPhysicalPlay yes -e tgnGameId <dedicated-acceptance-game> -e tgnRounds 2 `
  com.thegreatnovel.tgnlive.debug.test/androidx.test.runner.AndroidJUnitRunner
```

不带明确授权参数时真实生产测试应跳过，不自动发起昂贵生成。不要在用户珍贵存档上随意做测试。

## 设备计时定义

`tap`是实际发送回调进入；`feedbackFrame`是pending反馈可见帧；`firstSSE`是IO接收；`firstVisibleNarrativeFrame`是当前回合正文在前台窗口的实际可见帧近似。

9003的`draftReady`表示自动草稿输入达到至少44dp可见高度、连续两帧且可编辑，不授予发送权限；同一个输入实例跨正式确认保留，`inputReady`表示提交已确认后可开始下一次发送。

`lastNarrativePaint`要求当前正文最后一个glyph包围框真正处于阅读viewport，连续两个系统帧可见；用户正在读历史时不能虚构该值。`narrativeEndSignal`是服务端分隔符边界到达，`providerComplete`是Narrator调用结束，`complete`是正式回合到达，`choicesReady`/`inputReady`是相应Native控件可见。repair替换正文后的尾帧单列 `canonicalLastNarrativePaint`。

关键两个差值分别是“暂定正文尾字→输入就绪”和“正式提交→输入就绪”。二者不能混为一谈。记录仅包含操作ID、计时和状态，不包括草稿、正文、token、Cookie或隐藏模型计划。

## 实际观察与失败记录

有真实90秒屏幕录制及解码帧，已观察旧操作区消失、正文流动、确认阶段与状态sheet。六分类从横向隐藏末项改成窄屏两排直接可见；宽屏可在一排展示。亮/暗和Arabic历史中文混排均留有设备截图。

`draft-pass2.log`验证了实际Gboard：确认前候选“你好”尚未选中，确认后同一候选仍在，继续选中后输入变成“下一步草稿：你好”，期间没有第二次提交。Gboard九键把未完成拼音保存在IME候选区，不一定写进TextFieldValue.composition；初次使用后者断言的失败保留为测试口径错误，后续直接检查真实候选。

第一轮keyboardGeometry的窗口坐标在IME进入动画中取得（窗口下界超过物理屏幕），不作为稳定几何数值证据；“输入未被键盘遮挡”由真实截图/拼音操作和后续同一编辑器测试支持，而不是把错误坐标当严格PASS。

初期测试失败包括：旧Compose测试驱动的未组合节点、缺失测试类、过期无障碍节点、独立Modal窗口tag、横向分类发现困难、Samsung窗口还在返回动画时过早注入系统手势，以及用户切换到其他App。这些不是同一种故障。失败日志保留；旧虚拟时钟驱动已移除，当前测试不靠伪造正文通过。

部署窗口还暴露了死进程遗留running请求。最小修复为成功占有服务端口后将遗留收据置failed/SERVER_RESTARTED，不重放动作、不改Canon。原快照比较的requests差异回执仍为false；games/worlds/game_worlds/turns/canon_ledger/story_plans/traces保持一致。详情见 `NATIVE_TURN_HANDOFF.md`。

## 仍不能自动宣称通过的项目

实际振动强弱是否合手、实体屏幕半小时阅读疲劳、真实120Hz观感，仍需用户主观确认。OS触觉调用/设备截图不能替代人的手与眼。

本轮没有完整覆盖Samsung Keyboard长期组词、所有系统font scale/OEM、Wi-Fi与5G真实切换、系统强制回收/省电策略、长时间弱网和半小时不间断用户阅读。这些继续标 `PENDING_PHYSICAL_DEVICE_VALIDATION`，不要混入已经通过的基础实体机路径。

首次浏览器登录、其它语言的本轮新故事生成、完整设备冷启动benchmark也不要由已有会话/五语UI/历史读取冒充。默认生产APK与签名、源码提交和本轮精确接受结果见交付报告。
