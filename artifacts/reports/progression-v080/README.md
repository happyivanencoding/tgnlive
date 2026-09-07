# TGN Live v0.8.0 — 真实试玩与发布证据

本轮沿用现有 main 项目，已部署 v0.8.0。请先读 [结果与边界](RESULTS.md)，再看正文；不要把新状态字段、单元测试数量或世界设计表当成玩家实际收益。

## 阅读入口

| 样本 | 实际提交 | 阅读 | 定位 |
|---|---:|---|---|
| 原版星图 | 18/18 | [正文与行动](progression-baseline-stars-18-v070/READING.md) | 保留的旧版基线 |
| 成长版星图 | 18/18 | [正文与行动](progression-treatment-stars-18-v080d/READING.md) | 最适合先对比的成长样本；保留第9轮早先协议误杀失败 |
| 独立驭兽 | 16/18 | [正文与行动](progression-browser-beast-18-v080d/READING.md) | 不同机制，自主玩家；第17轮准备120秒失败，不称18轮成功 |
| 隐潮七港 | 18/18 | [正文与行动](progression-masked-18-v080f/READING.md) | 新世界；中途修复连接后同存档继续，不是严格配对A/B |

四条主轨迹共70个已提交回合；恢复样本继承的回合只计一次。其余目录是必须保留的失败/否决试验，不用于绕过15回合的质量判断。“裂陆武途”定义已上线，但两次开局准备超时、0回合提交，未完成真人式长测。

每个样本目录的 `MEASUREMENTS.json` 包含成功与失败阶段耗时；`ACCOUNT_HISTORY.json` 为合成试玩账户的状态变化，不含用户私人存档。Narrator输出、真实状态提交与玩家选择都可以按回合对读。

## 验收与计时

[TIMING_TABLE.md](TIMING_TABLE.md) / [COMPARISON.json](COMPARISON.json)：常规中位数、最近秩p95和失败记录。小样本p95等于最大值，不代表总体长尾。SSE发送、HTTP接收、浏览器可见帧是不同边界；播放器自身思考不计入应用等待。嵌套准备阶段不要与父模型阶段重复相加。

[VALIDATION.json](VALIDATION.json)：96项离线检查、32项最终移动端回放、冻结F与发布源码的对应检查。移动重放使用已录制正文，不计作新的ACP实玩；Chrome模拟不是物理手机或WAN实测。

[PLANNER_PROBES.json](PLANNER_PROBES.json)：相同检查点上下文的模型effort/短计划试验。结果不足以认定整体提速，默认模型没有因价格或规格而升级。

[DEPLOYMENT.json](DEPLOYMENT.json)：真实生产版本、原有25个存档和121回合不变的核验结果、六项访问控制检查；未冒用新的手机登录身份。生产入口继续为 `https://live.thegreatnovel.com`。

[MECHANISMS_AND_REJECTIONS.md](MECHANISMS_AND_REJECTIONS.md) 记录蒸馏来源与被否决的方案；[WORLD_DESIGNS.md](WORLD_DESIGNS.md) 是设计说明而非全数验证成功声明。

## 隐私与范围

本包只含合成测试故事、合成账户变化、经过字段筛选的阶段数据及发布回执。没有私有SQLite、原著全文、本地corpus、密钥、账号材料或模型隐藏推理。更完整的本地原始trace与失败尝试仍在项目 `artifacts/eval`，未将其原样推送Git。

当前重要不足：反复核验/谈条件、低额验货订单循环、身份与生活方式跃迁不足、部分叙述消耗与资源状态的一致性、偶发模型准备阻塞。上述问题没有因页面更稳定而被宣称已经解决。
