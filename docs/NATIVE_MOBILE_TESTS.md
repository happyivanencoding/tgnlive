# Native Mobile：验证记录与接受门槛

## 本轮结论

**原生候选工程已经形成；不能把“能构建”写成“已经在 Android 上真实游玩通过”。** 最终构建、JVM 测试、资源检查和 APK 哈希保存到 `artifacts/reports/android-native-v0801/RESULTS.json`。该报告不包含用户正文、存档、Cookie、签名私钥或账户数据。

| 项目 | 当前证据与边界 |
| --- | --- |
| 生产 API/代码理解 | 已读 v0.8.0 / 26fc8e1 实现；Android 模型在 JVM 中解析同一 backend 的26份真实存档、126个历史回合、五语各9个世界；0变更请求；不是 Native UI 测试 |
| Debug 构建 | 已有成功构建与 APK；最终重建以 RESULTS.json 为准 |
| JVM 测试 | 最终30项通过，0失败/0错误/0跳过：29项确定性测试 + 1项真实后端只读数据适配测试 |
| Lint / 配置 | 0阻断错误、3条警告；实际 Gradle 配置检查确认五语不拆分、Release 固定生产 HTTPS、minSdk26 |
| 五语资源 | zh/en/fr/es/ar 每种272个键，静态索引检查通过；不等于实际翻译/RTL界面验收 |
| AndroidTest | 真实 Activity 的测试已编写；构建测试 APK 不等于执行测试 |
| Android Emulator | 自有 Android15 / API35 / 1080×2400 / 420dpi 实际启动到桌面；App 尚未完成安装/运行验收 |
| Emulator 调试连接 | `TOOL_BLOCKED_DEBUG_AUTHORIZATION`：确认标准调试授权的工具调用被拦截，已停止尝试，不改密钥/不绕过 |
| Native Cloudflare 登录 | `PENDING_EMULATOR_VALIDATION`，未用开发 token、预置 Cookie 或 loopback 冒充生产登录 |
| Native 真实书架/打开存档 | `PENDING_EMULATOR_VALIDATION` |
| Native 真实生成/新建世界 | `PENDING_EMULATOR_VALIDATION`；实际 Native production 已玩回合数 **0** |
| 输入/滚动/生命周期/网络 | 实现与部分确定性测试已有，实际 Android 行为仍 `PENDING_EMULATOR_VALIDATION` |
| Native 首反馈/首正文/完成时间 | **NOT_MEASURED**；不能填入编译耗时、宿主机 HTTP 耗时或服务端 trace 代替 |
| 实体设备 | 无连接；所有硬件专属项目 `PENDING_PHYSICAL_DEVICE_VALIDATION` |

## 已做的确定性验证

JVM 测试集中覆盖临时密钥/NaCl box 解密与篡改拒绝、签名/issuer/audience/有效期/异常 JWT、SSE 分片/UTF-8/CRLF/心跳/严格 EOF、无正文的完成重放、请求收据恢复、稳定段落键、错误分类、迟到操作隔离、提交后新草稿保留、重大成长条件和紧凑屏幕布局策略。新增 HTTP 回归只使用测试进程的 synthetic localhost response，验证收到 headers 后取消能否关闭卡住的 body；**不是 TGN backend、Native UI 或真实生成测试**。

审查后修订了快速切书的旧 GET 覆盖、创建请求结果不明时重复建书风险、世界创建停止后恢复、SSE EOF 伪造完成、HTML 5xx 误判登录、草稿延迟保存覆盖、计时 IO 阻塞、旧书触发新正文触觉、横屏 IME 占满视口等路径。源代码修复不直接等价于模拟器 PASS。

日志留在 `.runtime/android/`：`coordinator-build.log` 为首次成功构建；`build-delivery.log` 为开发复核27项；`final-build.log` 等失败记录保留。并行 Gradle 争用曾导致编译错误，不删除失败记录或把后续重跑伪装成第一次成功。最终只能由一个进程执行打包验证，不改共享 Gradle ACL、清理其他项目缓存或终止核心 Agent。

## 最终只读后端契约验证

`LiveBackendContractTest` 在本轮显式启用，使用当时刚从现有4317 backend取得的真实数据，执行 Android 当前 `World/Game/Turn` 和段落模型：保留历史文本/语言/选择、唯一段落键、状态不改写。这是实际数据适配检查，不是 Android 界面截图、生产登录或SSE新生成。

运行方法（后端已在线时）：

```powershell
cd C:\dev\tgn_live_android\apps\android
node scripts/capture-live-contract.mjs
$env:TGN_NATIVE_LIVE_SNAPSHOT='C:\dev\tgn_live_android\.runtime\android\contract\live-snapshot.json'
.\gradlew.bat :app:testDebugUnitTest :app:verifyNativeConfiguration :app:lintDebug --no-daemon
```

未显式启用时这1项测试按 assume 跳过，而不是伪造真实数据 PASS。本轮最终报告中的跳过数为0。私有快照只在被 Git 忽略的 `.runtime/android/contract/`；报告仅包含数量和状态，不含故事正文。

最终签名校验确认 Debug APK 为v2签名、支持arm64-v8a/armeabi-v7a/x86/x86_64；Release产物仍未签名。剩余3条Lint警告是工具链版本提示、AppBundleLocaleChanges提示、minSdk26下冗余的v26资源限定。语言不拆分已由实际Gradle属性断言验证，但运行时语言切换仍需Android验收；不以关闭Lint代替检查。SDK XML版本与Gradle9兼容性警告保留在构建日志中。

## Emulator Acceptance Pass（未执行部分）

在调试连接已由合法授权建立后，先默认生产 HTTPS APK 登录并读取已有书架，只读打开一个历史故事。随后使用清晰命名的 Native 接受测试书卷做真实生成，不在用户珍贵存档上随意操作，也不同时挤占核心实验的 ACP 槽位。

必须实际走通：Discover → preset preview → power/name → opening → 自由输入 → 可编辑建议 → SSE正文 → State Sheet → stop/reconcile → explicit retry；另走 custom world SSE 创建。通过 Web 与 Native 回读同一个 gameId、version 和历史回合，核对不存在第二 Canon 或重复提交。

尺寸/系统矩阵至少包含常见约360dp、412dp、宽屏，以及紧凑横屏；密度、font scale 1.0/1.3/1.5/2.0，五档阅读字体、五语与 Arabic RTL、Light/Dark/System、手势导航。中文/法语/西语/阿语必须用真实支持该语言的 Android IME，`adb input text` 或 Compose performTextInput 不能冒充 composition 体验。

正文观察需覆盖：正在底部跟随、主动向上读历史、回到最新、completion前后同一段落的坐标、choices出现、状态sheet、开关键盘、旋转、退后台/恢复、断网/恢复、SSE中断、进程杀死后重开和跨客户端版本前进。保留截图/录屏/geometry；最终正文未提交不得保留成 Canon。长 session 至少实际10分钟，再拉长至半小时，不用静态长文截图替代。

## 诊断工具与证据

`apps/android/scripts/device-pass.ps1` 提供显式设备序列号的 Install / Info / Logs / Screenshot / Record，先检查设备已授权，否则立即报错。脚本不自动确认调试、不修改 adb keys、不重启全局 adb、不选择其它设备。当前不因工具阻塞改走旁路。

```powershell
cd C:\dev\tgn_live_android\apps\android
# 仅在设备已正常、合法授权以后执行。
.\scripts\device-pass.ps1 -Action Install -Serial <serial>
.\scripts\device-pass.ps1 -Action Info -Serial <serial>
.\scripts\device-pass.ps1 -Action Logs -Serial <serial>
.\scripts\device-pass.ps1 -Action Screenshot -Serial <serial>
.\scripts\device-pass.ps1 -Action Record -Serial <serial> -Seconds 20
```

产物仅落入 `.runtime/android/device-pass/`。截图/录屏可能包含个人故事或账户，审查后才分享，不整体提交 Git。默认生产客户端不依赖 adb reverse；loopback debug 的显式构建命令见 `ANDROID_APP.md`。

## 手机端时间记录

已有每次用户操作的 `interactionId` 与服务端 requestId 区分；本地单调时钟记录 tap、feedbackFrame、firstSSE、firstVisibleNarrativeFrame、complete、choicesReady。首 SSE 是 IO 首批数据到达，不等同于首正文；首正文是前台/窗口有焦点且段落与 viewport 相交的可见帧近似，不冒充物理屏幕光子时间。计时只保存24个近期操作，不记录正文/草稿/token，Debug 标签 `TGNNativePerf` 可导出。

开始读历史、切书或后台后不把旧正文重新计成新回合。一次重试有新 interactionId；服务器 requestId 可复用，不能把两者混为一谈。App launch、home interactive、shelf load、open story 的完整设备级测量仍待补齐；`am start -W` 只能辅助启动，不代替正文绘制时间。

最终实测表应分列：网络路径、设备/API、操作ID、客户端 tap→feedback、tap→firstSSE、tap→first visible prose、tap→complete、choicesReady、服务端生成trace。失败/取消/无正文重放独立列示，不塞进成功平均数。当前这些设备结果均未采集。

## 等待实体 Android 手机复核的项目

以下全部 **PENDING_PHYSICAL_DEVICE_VALIDATION**，不是 FAIL，也不是模拟器 PASS：实际振动与触摸手感；真实屏幕对比度与半小时阅读疲劳；120Hz/高刷新率观感；Gboard/Samsung Keyboard 长时间 composition/selection；真实系统返回手势；状态栏/导航栏与开孔区域；Wi-Fi/5G切换；实体设备后台回收、锁屏、电源管理和 OEM 行为。

Physical Device Acceptance Pass 应聚焦以上硬件差异，以及此前 Emulator 尚未完成的关键生产路径。对于已被确定性测试充分证明且不随硬件变化的解析/密钥/JWT测试，不机械重复整套低价值操作。记录发现的具体体验问题后再改，不重设计账号、Canon 或客户端架构。
