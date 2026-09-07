# Native 回合交接：正文边界与行动权

## 已定位的真实原因

既有Narrator先输出正文，再输出 `<TGN_DELTA_JSON>` 后的choices/delta。正文停止追加不等于请求完成。用户两份实际trace在解析失败后额外repair约21.99s、22.35s；另一次真机Native开场的最后正文绘制到输入就绪约9.5s。原Native已经消费SSE complete，而非误等HTTP EOF；缺的是正文完成信号与分阶段UI。规划在正文之前或v0.9后台，不是这些回合正文后的22秒。

## 最小共享变更

StreamingNarratorParser可选completion callback在确定正文分隔符时调用一次；GenerationService记录trace并透传；app发送新的SSE event `narrative_end`，publicMetrics增加可空`narrativeCompleteMs`。不新增模型，不改提示词/校验/Canon/DB，不推测静默超时就是完成。

协议示例：

```text
event: narrative_end
data: {"characters":477,"elapsedMs":24600,"provisional":true}

```

此时不能发布新的Canon或提交下一轮。原`complete`仍是唯一正式成功边界；error/取消继续回读权威存档，repair可能改变已经展示的暂定正文。历史没有该指标时保持null，不能补造旧设备尾帧。

## Native交互

提交后立即pending和轻反馈，旧建议/输入淡出下收，键盘退出，正文接管空间。真正首段前小范围呼吸点反馈持续；首段后退出。narrative_end后不再伪装“仍在写正文”，提示正在确认；允许明确的下一步草稿，但不自动排队/发送。服务器正式complete后新建议/输入自然上移淡入并轻反馈；停止自己的请求仍可用，不能误停别的客户端。

设备记录分别是tap、feedbackFrame、firstSSE、firstVisibleNarrativeFrame、lastTextReceipt、lastNarrativePaint、narrativeEndSignal、providerComplete、suggestionsReady、complete、choicesReady、inputReady、canonicalLastNarrativePaint。末字计时只在该字的布局包围框真实位于阅读viewport且窗口前台连续两帧时成立；缺失保持缺失。正式正文被repair替换时单独计canonical尾帧，不覆盖之前用户已经读完的暂定尾帧。

## 接受状态

代码级13个相关Node测试通过（parse、generation、HTTP）；真机全流程仍在本轮执行。用户设备为Samsung SM-S928U1/Android16，已真实安装和读取既有生产书架、生成自己的测试开场；不把历史126回合当本轮真机生成。后续以NATIVE_MOBILE_TESTS与physical结果文件为准。

不改变原Web的表现；前端忽略未知SSE类型的原行为继续有效。正式部署前使用既有SQLite snapshot工具检查没有活跃请求，按现有stop/start脚本切换；不重启任何其他Agent服务。


### 真机暴露的服务重启恢复缺口

在本轮受控升级窗口中，自己的Native测试书恰有一条新请求在快照之后进入，进程退出前未提交Canon。原服务重启后requests.running会永久保留，导致同requestId持续REQUEST_IN_PROGRESS；这不是虚构边界。新增`GameStore.recoverInterruptedRequests()`，仅由生产server成功取得监听端口后的同步启动回调执行，将死进程遗留的running收据置为failed/SERVER_RESTARTED。保留请求身份与失败原因，不重放动作，不改games/turns/ledger/worlds。没有放在store构造器中，避免一个启动失败的第二进程误伤现有请求。

客户端仍先GET权威存档；服务证明旧requestId已终止后才允许显式重试取得新ID。未提交草稿不自动发送。原快照的一致性回执因这条请求入场而为false，原件保留，不能覆盖为全表PASS；所有Canon表仍一致。后续真实重试及设备证据见physical报告。
