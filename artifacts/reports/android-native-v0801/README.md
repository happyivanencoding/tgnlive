# TGN Live Android 候选验收记录

**这不是已经通过原生生产验收的发布版。**

版本：0.8.0-android.1（8001）；代码分支 mobile/android-native；基线26fc8e1。

已完成的机器验证：Debug APK打包与v2签名检查；AndroidTest APK构建（未运行）；Release APK构建（未签名）；30项JVM测试全通过；272×5语言资源键与静态索引检查；Lint 0错误、3警告；实际Gradle生产HTTPS/语言打包配置断言。

其中1项只读测试用Android当前模型解析了26份真实存档、126个历史回合与五语各9个世界，没有提交行动或修改存档。它不是Native实际游玩。其余29项是确定性测试。

**未完成：Android实际安装与生产登录、真实原生书架/阅读/多回合游玩、IME/滚动/RTL/生命周期/断网恢复的界面观察、客户端时间测量。实际原生生产回合数0。** 模拟器已启动到Android15桌面，但确认调试授权的工具调用被拦截；这与缺少实体手机是两个不同的限制。

实体触觉、真实屏幕阅读、高刷新率、Gboard/Samsung长期输入、Wi-Fi/5G、OEM后台行为均为 PENDING_PHYSICAL_DEVICE_VALIDATION。其他Android接受检查为 PENDING_EMULATOR_VALIDATION。

源码和后续接受流程：
- docs/ANDROID_APP.md
- docs/NATIVE_MOBILE_AUTH.md
- docs/NATIVE_MOBILE_DESIGN.md
- docs/NATIVE_MOBILE_TESTS.md

完整机器证据：本目录RESULTS.json。没有修改共享Backend/API/Canon、Web入口或JingYou。候选尚未合并main；不得覆盖核心对话的未提交工作。

Debug APK：TGN-Live-0.8.0-android.1-debug.apk
大小：12655354 bytes
SHA-256：06fcc8961c353a8958b0a56c46f6d7306845c6943692c94c6b16a7e1e28cc001

日志保留在本机.runtime/android；APK、签名私钥、个人存档和原始快照不入Git。
