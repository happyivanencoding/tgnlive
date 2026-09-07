# v0.7.0 手机五语界面

2026-09-07。主页一开始右上角提供原名选择：中文、English、Français、Español、العربية。首次访问固定中文，即使浏览器偏好英文也不覆盖。选择保存在localStorage `tgn-live-language`，刷新保留。故事页更多菜单中也能切换。

## 实际行为

界面按钮、发现/创建/书架、预览、阅读设置、状态标题、关系枚举、进度/错误提示与主要无障碍文本由 `public/i18n.js` 本地字典显示。预设可读内容由 `/api/worlds?language=` 提供。切换语言时保留已经选中的世界、天赋、角色名、成年确认与草稿。较慢的旧目录请求不会覆盖新的语言选择。

世界创建、建立角色和行动请求都传language。生成时禁用选择器，防止一个回合中途改语言。切换后新的正文和建议使用所选语言；已经生成的章节、旧建议与源语言自建世界不进行后台翻译。用户从旧建议继续也会将当前选择语言传给下一回合。

阿语使用RTL页面、输入、导航、抽屉和按钮方向；主页顶栏保留稳定的左侧品牌、右侧语言入口。390/360px下隐藏非关键服务文字，语言选择器和主题按钮仍可点。数字、日期和技术字段用bdi/独立方向隔离。

正文段落 `p[lang][dir]` 按turn.language设置；外层section和回合元信息可以跟随UI语言，不能只检查section.dir断言正文方向。旧中文章节在阿语UI中仍从左到右，新增阿文段落从右到左。中文/Latin/阿语分别选择系统字体与适合的行距，不增加外部字体请求。

保留原有safe area、visualViewport键盘适配、中文IME Enter保护、逐书草稿、回到最新、阅读设置和sheet焦点。没有承诺实体手机系统键盘已经验收。

## 检查与证据

`ui-tests/i18n-contract.mjs` 是明确隔离的后端fixture：46项通过，覆盖五语首页、默认/持久、顶右入口、切换后选择保留、360/390/430px及短横屏、在途语言锁、阿文请求、输入、IME、草稿、混合历史段落方向和抽屉。结果 `artifacts/ui/i18n-contract-1788774907597/result.json`。

`ui-tests/languages-live.mjs --play` 使用真实测试服务和真实ACP：20项通过，包括五语真实目录、阿文旧档/草稿恢复、Arabic窄屏及实际第三回合。保留1个net::ERR_ABORTED浏览器网络警告，无JS异常，回合确实提交并保存；结果不是“网络完全无警告”。证据 `artifacts/ui/i18n-live-final-v070/`。

`ui-tests/i18n-deployed-readonly.mjs` 针对已部署4317生产服务，GET-only检查语言入口/方向/旧中文档，没有新建或修改用户存档。证据 `artifacts/ui/i18n-deployed-v070/`。截图不是精确屏幕绘制时间。

运行：
```powershell
$env:PLAYWRIGHT_MODULE='file:///C:/dev/agent-monitor/node_modules/playwright/index.mjs'
$env:BROWSER_EXECUTABLE='C:\Program Files\Google\Chrome\Application\chrome.exe'
node ui-tests/i18n-contract.mjs
node ui-tests/i18n-deployed-readonly.mjs
```

早期测试有两种误断已修正：法语世界实际名为La Rivière des Braises而非测试误猜的Fleuve；历史方向真实属性在p节点而非section。另一个恢复测试误在自动恢复的故事页点击已隐藏书架，也已按真实行为修正。没有为测试误断修改正确产品行为。
