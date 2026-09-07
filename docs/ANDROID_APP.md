# TGN Live 原生 Android

当前迭代：**TGN Live v0.9.0 · Android 0.9.0-android.3 / versionCode9003**。已在Samsung SM-S928U1 / Android16真实安装，并通过既有合法owner会话进行生产书架/存档/新回合操作。不是WebView，也不是另一套游戏。具体接受边界和未通过项见 `NATIVE_MOBILE_TESTS.md` 与 `artifacts/reports/android-native-v090-physical/`。

## 架构与产品边界

`apps/android/`：Kotlin + Jetpack Compose + 单Activity + ViewModel/StateFlow + OkHttp JSON/SSE。四个主要页面为Discover、按书组织的Bookshelf、Create/Preview、Play。阅读页隐藏主导航；状态为原生大sheet和六个分类；系统键盘、返回、滚动、触觉和动效都是Native实现。

Web与Native共用既有Cloudflare Access应用、账号、世界、书架、gameId、存档、Canon、回合及生成链。本地只有可丢弃的服务端快照、UI偏好、草稿、阅读锚点与请求收据，没有第二Canon、SQLite、WorldForge或模型调用。JingYou仅作只读交互工程参考，未修改其项目。

主要文件在 `app/src/main/java/com/thegreatnovel/tgnlive/`：

| 文件 | 职责 |
| --- | --- |
| MainActivity.kt | Android入口与生命周期 |
| LiveUi.kt | 页面、正文、行动坞、系统交互 |
| NativeTurnUi.kt | 持续等待反馈、书卡、六分类状态空间 |
| LiveViewModel.kt | UI阶段、请求归属、草稿、取消/重试、权威回读 |
| Repository.kt / Models.kt | 真实API/SSE与服务器数据适配；不结算Canon |
| NativePerf.kt | 真实设备帧/回合计时，24条近期记录，不保存正文或凭据 |
| auth/ | 官方Access浏览器令牌传递、JWT验证与Keystore会话 |

## 构建与安装

JDK21；Gradle wrapper8.14.3；AGP8.13.0；Kotlin/Compose plugin2.2.20；compile/target36、min26。版本以构建文件为准，不为原生另起产品v1.0。

```powershell
cd C:\dev\tgn_live_android\apps\android
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:GRADLE_USER_HOME="$env:USERPROFILE\.gradle"
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest :app:verifyNativeConfiguration --no-daemon
.\scripts\device-pass.ps1 -Action Install -Serial <authorized-device-serial>
```

Debug包：`app/build/outputs/apk/debug/app-debug.apk`，applicationId `com.thegreatnovel.tgnlive.debug`。Release为 `com.thegreatnovel.tgnlive`，不内置正式发行签名，未签名Release不能当发布包。Debug签名用于当前内部测试，不上传/共享签名私钥。

默认Debug/Release均连接 `https://live.thegreatnovel.com`，不依赖USB反代或开发电脑localhost。只在显式本地调试时使用 `-PtgnBackendUrl=http://127.0.0.1:4317` 并在已授权设备上 `adb reverse tcp:4317 tcp:4317`。Release始终固定生产HTTPS；不得放宽公网认证/Origin来迁就测试。

`local.properties`、Gradle缓存、APK、日志、录屏、原始存档和签名文件不进Git。首轮依赖下载需要网络；后续可使用已有缓存离线构建。不要同时运行多个Gradle进程写同一工程的输出目录。

## 五语与端点安全

zh/en/fr/es/ar自首版存在；本次新增等待/状态/书架文案后每种语言290个资源键。`NativeStringResources.kt`静态引用资源，新增文案后运行 `node scripts/generate-string-index.mjs`，用 `--check`检查一致性。语言不按App Bundle拆分；实际Gradle配置任务验证这一点。

会话Cookie只发送到精确生产HTTPS origin，不跟随重定向带走凭据，不发送给debug loopback。请求保留既有Origin guard。登录由外部浏览器Custom Tab完成；本轮实际验证了已有合法会话的生产访问，未重测全新浏览器登录。见 `NATIVE_MOBILE_AUTH.md`。

## 回合完成与取消

`text`是暂定正文；新 `narrative_end`只是正文分隔符边界，不等于Canon提交。`complete`仍是唯一正式成功，下一次发送必须等待它。正文后自动出现同一个原生输入框来写明确的草稿，但不能偷偷提交或排队旧上下文。

断流/取消/恢复先GET同一服务端存档。服务端版本已前进时刷新，不重投旧行动。未知结果重试保留requestId；只有服务器明确证明旧收据终止，且用户已经显式点了重试，才换新requestId继续。客户端不盲调仅按gameId的全局cancel，避免误停其它Web客户端。

本轮共享改动只有必要的SSE/trace边界，以及真实重启中断后旧running收据的恢复；没有重设计生成、progression、StoryBrain、Narrator、state或世界。细节/部署证据见 `NATIVE_TURN_HANDOFF.md`。

## 并行工作与交接

Native开发工作树为 `C:\dev\tgn_live_android` / 短期 `mobile/android-native`。本轮已同步核心v0.9正式提交，没有reset、stash或覆盖它的未提交工作；通过接受的变更再同步主线合并/push，不force。

读取顺序：双handoff当前Native段 → 本文件 → `NATIVE_TURN_HANDOFF.md` → `NATIVE_MOBILE_TESTS.md` → 当前源码与真实证据。`NativeUiSmokeTest`只做基础Activity/主题；真正设备体验由明确授权的 `PhysicalDeviceJourneyTest`执行，不用mock或虚拟时钟冒充真实生成。
