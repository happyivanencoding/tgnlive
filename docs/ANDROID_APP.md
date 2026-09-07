# TGN Live Android 原生客户端

状态：**内部候选版，不是已完成 Native 生产验收的发布版**。Android `0.8.0-android.1`，versionCode `8001`；对应接手时 Web/Backend `v0.8.0`，生产基线 `26fc8e1`。Web 生产入口与部署不因 Android 工程的加入而改变。真实测试状态以 `NATIVE_MOBILE_TESTS.md` 为准。

## 产品与代码边界

工程在同一仓库的 `apps/android/`，不是另一个游戏。Android 与 Web 使用同一 Cloudflare Access 应用、owner 身份、`/api/worlds`、`/api/games`、存档、世界快照、回合和生成链。没有移动专用 Canon、SQLite、World Forge、progression 或模型调用。新增 Android 文件不改变后端小说逻辑；本阶段没有修改共享 API 或新增认证例外。

原生实现：Kotlin + Jetpack Compose + 单 Activity + ViewModel/StateFlow，OkHttp 负责 JSON/SSE，AtomicFile 保存可丢弃的服务器快照、行动草稿、阅读位置和 UI 设置。不是 WebView；只有 Cloudflare 登录由外部浏览器 Custom Tab 承担。未来 iOS 应复用这些后端接口，而不是当前就引入跨平台 UI 层。

主要文件均在 `app/src/main/java/com/thegreatnovel/tgnlive/`：

| 文件 | 职责 |
| --- | --- |
| `MainActivity.kt` | 原生入口与系统生命周期接线 |
| `LiveUi.kt` | Discover、书架、创建/预览、阅读、行动坞、状态及设置 |
| `LiveViewModel.kt` | UI 状态、草稿、请求归属、取消/重试与权威回读 |
| `Repository.kt` | 真实 API、端点/凭据隔离、JSON/SSE、快照缓存 |
| `Models.kt` | 服务端展示数据适配、稳定段落键、客户端请求收据；不是 Canon reducer |
| `NativePerf.kt` | 客户端单调时钟指标；不采集正文、草稿或凭据 |
| `auth/` | Cloudflare 官方加密令牌传递、JWT 校验、Keystore 加密会话 |

## 构建

需要 JDK 21、Android SDK platform 36、Gradle wrapper；最低 Android API 26，target/compile API 36。Gradle 8.14.3、AGP 8.13.0、Kotlin/Compose plugin 2.2.20；依赖版本以构建文件为准。初次构建需要正常访问 Google Maven/Maven Central。`local.properties`、Gradle 缓存、APK、签名文件和运行日志不入 Git。

```powershell
cd C:\dev\tgn_live_android\apps\android
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:GRADLE_USER_HOME="$env:USERPROFILE\.gradle"
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest --console=plain
```

默认 Debug **和** Release 均连接 `https://live.thegreatnovel.com`，不需要开发电脑 localhost 或 USB。Debug applicationId 为 `com.thegreatnovel.tgnlive.debug`；Release 为 `com.thegreatnovel.tgnlive`。Debug 由标准本地 debug key 签名；不要把该 key 当发行签名，也不要上传/共享 key。Release 目前不内置生产签名配置，`assembleRelease` 的未签名产物不等于可发布 APK。

标准产物：`app/build/outputs/apk/debug/app-debug.apk`。版本策略：`<当前兼容的 TGN 主版本>-android.<原生迭代号>`，Android versionCode 单调递增，不另开一个与 TGN 无关的产品 v1.0。

### 五语资源索引

每种语言含同一组272个资源键。`NativeStringResources.kt` 提供静态 `R.string` 引用，不用运行时资源反射；增加文案后运行 `node scripts/generate-string-index.mjs`，检查时加 `--check`。语言资源不按 App Bundle 拆分，用户在 App 内切换五语时不依赖额外下载。此检查证明键齐全，不证明实际翻译或 RTL 布局已验收。

## 端点与本地调试

只允许默认生产 HTTPS 或显式 Debug loopback：

```powershell
.\gradlew.bat :app:assembleDebug -PtgnBackendUrl=http://127.0.0.1:4317
# 设备已合法完成调试授权后，才执行以下命令。
$adb="$env:ANDROID_HOME\platform-tools\adb.exe"
& $adb -s <serial> reverse tcp:4317 tcp:4317
& $adb -s <serial> install -r app\build\outputs\apk\debug\app-debug.apk
& $adb -s <serial> shell am start -W -n com.thegreatnovel.tgnlive.debug/com.thegreatnovel.tgnlive.MainActivity
```

这不是第二个后端。现有服务的 loopback/Host 安全规则仍生效；不要随意换成 `10.0.2.2` 或放宽公网 guard 来迁就调试。Release 永远固定生产地址，且不允许 cleartext。需要独立测试实例时，先与核心负责人协调已有测试端口/数据目录；不得把私人存档复制到 Git 或再做一套生产库。

禁止用预置 Access token、service token、开发者 cookie 或匿名公网 API 使测试“通过”。认证细节见 `NATIVE_MOBILE_AUTH.md`。

## 运行时约束

服务端提交是唯一权威。SSE 的 `text` 只是暂定正文，只有 `complete` 才接纳服务器返回的正式 game。网络失败/取消后先 GET 存档；不能因为 UI 显示了文字就写成成功回合。客户端请求收据只是重试信息，不是第二份游戏状态。

未知提交结果复用 requestId；只有服务器明确证明旧请求已失败/取消才允许新 requestId。若存档版本已经前进，刷新当前故事，不重投旧上下文。后台/重开不会自动提交草稿；离线只读缓存、看最后快照、编辑草稿。

现有 `/cancel` 未按 requestId 约束归属，因此本客户端停止自己持有的 HTTP/SSE 连接，再权威回读；不盲目调用全局按 gameId 取消，避免误停另一个 Web 客户端。服务端若已抢先完成，回读的正式提交优先。

## 并行开发与恢复入口

本阶段隔离 worktree `C:\dev\tgn_live_android`、短期分支 `mobile/android-native`。核心 main 同时有 progression 等开发，不重置、不覆盖、不夹带提交其未提交改动。Native 候选代码可保存并推送短期分支；通过接受门槛后，同步最新 main、处理真实冲突，再合并主线。尚未合并不能写成“main 已上线”。

接手顺序：双 handoff 当前 Native 段 → 本文件 → `NATIVE_MOBILE_AUTH.md` → `NATIVE_MOBILE_DESIGN.md` → `NATIVE_MOBILE_TESTS.md` → 当前代码与测试日志。JingYou 只读参考，不修改其工程或复用其健康视觉。
