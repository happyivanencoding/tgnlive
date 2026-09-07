# Native Cloudflare Access 登录

**状态：代码与密码学/JWT 单元测试已有实现；实际 Android → 浏览器 → Cloudflare → 原生会话的端到端登录尚未验收。不得用编译、合成 JWT 测试或本地 loopback 访问冒充生产登录成功。**

## 为什么不新增登录后端

现有公网是 Cloudflare Access owner-only；后端继续验证来自 Cloudflare 的 assertion 的签名、issuer、audience、有效期及 owner email。Android 不建立第二个账户，也不申请一个绕过 Access 的 API。现有 `src/access.js` 与公网策略保持不变。

客户端采用 Cloudflare 自己的 CLI 加密令牌传递协议，而不是把浏览器 Cookie 读出来、把 JWT 填入 deep link、或借用开发者 token。浏览器是 Chrome Custom Tabs 或兼容的系统浏览器；不是 WebView。协议实现参考 2026-09-07 读取的官方 `cloudflare/cloudflared` 中 `token/token.go`、`token/transfer.go`、`token/encrypt.go`；实际服务兼容性仍须现场复核。

参考源：
- https://developers.cloudflare.com/cloudflare-one/tutorials/cli/
- https://github.com/cloudflare/cloudflared/tree/master/token
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/
- https://developer.chrome.com/docs/android/custom-tabs/overview/

## 流程与信任边界

1. 每次点击登录，在 App 内产生全新的 NaCl Box 密钥对。只把该次临时公钥放入 Cloudflare 官方 CLI 登录 URL；私钥仅在内存中存在。一次 attempt 不能重用。
2. Custom Tab 打开同一产品域名下 `/cdn-cgi/access/cli`，使用该 Access 应用的公开 audience、临时公钥及官方 encrypted-transfer 参数。真正的用户认证继续由原来的 Cloudflare Access policy 决定。
3. App 对固定官方域名 `login.cloudflareaccess.org` 的 transfer 路径发起有总时限的可取消长轮询。结果用 nonce + NaCl authenticated box 加密；按 `service-public-key` 解密并验证完整性。
4. 只提取 **当前应用的 app_token**。响应中可能出现的组织级 token 立即丢弃，不入缓存、日志或 Intent。
5. 验证 application JWT：固定的团队 issuer、固定 audience、RS256、受信 JWKS 中对应 kid、签名、有效期、nbf 等。绝不信任 JWT 自己提供任意 key server 或算法。
6. 用此会话访问既有生产 `/api/health`；只有真正通过现有 owner-only origin 并返回正常 JSON 才持久化。App 内的校验不是替代后端 owner 校验。
7. 回到 App 后刷新同一个世界列表、书架和真实存档。登录窗口关闭、超时、联网失败、系统杀进程都不得产生第二套用户/存档或视为认证成功。

`AccessConfig` 中的产品 origin、team domain、audience 是公开应用元数据，不是登录凭据。它们要与当前生产 Access 应用一致；变更时正常更新配置及测试，不能嵌入一个长期授权 token。

## 凭据落盘与网络约束

- Application JWT 由 Android Keystore 的 AES-256-GCM 密钥加密，以 AtomicFile 写入 `noBackupFilesDir`。随机 nonce，固定产品/域名作为 AAD；不是明文 SharedPreferences。
- 应用禁用 Android backup，并显式排除数据提取。私钥、JWT、Cookie、组织 token、完整登录 URL 不进入 Git、logcat、性能文件、剪贴板、分享 Intent 或崩溃描述。
- Cookie 仅发给精确的 `https://live.thegreatnovel.com` API。HTTP 重定向和自动 POST 重试关闭，不把凭据带到 local debug endpoint 或其它域名。
- 生产变更请求带 `Origin: https://live.thegreatnovel.com`，继续满足现有 origin guard。不得删除 Origin 校验来适配 Native。
- 令牌过期/被拒绝时保留明确的离线只读体验和草稿，提示重新登录；不能将 HTML Access 页面当 JSON 成功。Cloudflare 5xx/家庭后端不在线与需要登录应分别归类。
- 显式 Native logout 清空本机账户缓存、草稿、pending 收据、性能记录和应用会话。它不宣称同时注销系统浏览器中的所有 Cloudflare SSO 会话。
- 登录取消/新 attempt/退出登录要阻止旧 attempt 晚到后再次保存凭据。进程被杀后不恢复临时私钥，重新开始合法登录。

## 端到端接受门槛

必须在已获调试授权的 Emulator/设备上，点击 Native 登录，完成浏览器正常 Access 流程，返回原生页面后看到现有真实书架。退出 App 重开应能使用仍有效的会话；过期、取消、拒绝、网络失败、再登录和 logout 均需实际检查。

这条路径目前 **PENDING_EMULATOR_VALIDATION**。实际 APK 的浏览器交接兼容性、Cloudflare 当前策略行为、Keystore 真正落盘及重新打开行为不能由 JVM 的合成测试代替。没有使用 service token、预置 cookie 或改公网 guard 来消除这个待验收项。
