# 手机与远程访问

入口：**https://live.thegreatnovel.com**。使用与私人日记相同的本人账号登录 Cloudflare Access，可以在手机浏览器继续电脑上的书卷。入口使用独立 Access application/audience，不复用其他项目的身份令牌。有效期 7 天；过期后重新登录。

Windows 电脑必须开机、联网、未睡眠，当前用户已登录，AgentDock/Codex 登录可用。Cloudflared 是现有 Windows 服务；TGN Live 通过当前用户的 `HKCU Run/TGNLive` 隐藏启动，没有 24 小时开发会话时限。当前不是云端独立计算，关机后不能生成或读取存档。不改动电脑电源策略。

## 运行与恢复

```powershell
cd C:\dev\tgn_live
pwsh -NoProfile -File scripts/start-local.ps1
pwsh -NoProfile -File scripts/stop-local.ps1
# 开启/关闭下次 Windows 登录后的自动启动
pwsh -NoProfile -File scripts/start-on-login.ps1
pwsh -NoProfile -File scripts/start-on-login.ps1 -Disable
```

服务仍只监听 `127.0.0.1:4317`，同一 SQLite 保存本地/手机的剧情。启动记录与日志在 `.runtime/`；数据库在 `data/tgn-live.sqlite`。没有新增全局 AgentDock 权限，没有开放文件或命令接口。

断线/手机切后台可能中断当前生成；未提交的预览不是正史。重新连接后先核对书卷再重试，已有的版本与幂等机制继续生效。此次增加 15 秒 SSE 心跳、登录过期提示、中文输入法 Enter 防误提交，并使 390px 下阅读模式仍可用。

## 配置和回滚

`scripts/configure-cloudflare.py inspect|prepare|publish` 读取已有 Windows 用户环境 API 凭据，只在进程内使用。`prepare` 创建 Live 专属单一 owner-email 策略，生成忽略的 `.runtime/remote.json`；`publish` 检查 origin 已运行新配置，才添加域名和路由。脚本拒绝覆盖冲突 DNS、不同 Access 应用或异常策略；写共享隧道前重新核对配置并保留 `.runtime/cloudflare-before.json`。

唯一新增路由：`live.thegreatnovel.com → http://127.0.0.1:4317`。原 agent/diary/health/monitor 路由保持不变。停用时先删除 Live 的 DNS/路由，再删除专属 Access 应用；不要直接覆盖整个共享 Tunnel，也不要在路由存在时移除 Access 保护。停止本项目服务会立即使网页不可用。

应用端校验签名、RS256、issuer、独立 audience、有效期和 owner email。带转发头的 loopback 请求不能走本机免登录通道。远程 POST 必须匹配 HTTPS Origin。密钥从固定 team JWKS 端点获取并缓存 5 分钟，获取失败时拒绝登录；轮换后的未知 key 最多等待缓存过期。实现依据 [Cloudflare application token 文档](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)。

API、正文和存档不由 service worker 离线缓存。本版是响应式网页，未制作原生 App。

## v0.6.4运行补充

当前版本v0.6.4，线上URL/owner Cloudflare Access/Tunnel保持原样，不是匿名公开多用户。`start-local.ps1`现通过当前用户Limited Interactive计划任务 `TGNLive-Web` 运行 `run-local.ps1`，不再让后台Node依附有超时的AgentDock命令进程。HKCU登录启动原本就调用start-local，继续有效。不要重启/修改其它项目的Tunnel或AgentDock。

实际重启后完整8回合游戏及7个世界定义深比较一致，证据 `artifacts/reports/v064-restart-check.json`。进程与bootstrap环境在.runtime，不提交凭据。登录启动/电脑睡眠仍是本机依赖，没有声称云端常驻。

边界脚本 `node scripts/verify-remote.mjs` 输出 `artifacts/remote-v064/boundary.json`；6个现有owner/来源边界用例，不是对抗式公共平台审计。
