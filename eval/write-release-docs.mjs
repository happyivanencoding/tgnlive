// Update the accepted release summary from curated measurements, preserving v0.7
// history below a clearly delimited current-release section.
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),dir=path.join(root,'artifacts/reports/progression-v080');
const comparison=JSON.parse(fs.readFileSync(path.join(dir,'COMPARISON.json'),'utf8'));
const samples=comparison.samples;
const by=label=>samples.find(s=>s.label===label);
const star=by('progression-treatment-stars-18-v080d'),beast=by('progression-browser-beast-18-v080d'),masked=by('progression-masked-18-v080f');
if(!star||!beast)throw Error('Actual long-run evidence required');
const timing=fs.readFileSync(path.join(dir,'TIMING_TABLE.md'),'utf8');
const marker='<!-- V080-CURRENT-END -->';
function prepend(file,section){let body=fs.readFileSync(path.join(root,file),'utf8');if(body.includes(marker))body=body.slice(body.indexOf(marker)+marker.length).replace(/^\s+/, '');fs.writeFileSync(path.join(root,file),section+'\n\n'+marker+'\n\n'+body);}
const stage='v0.8.0 已部署到现有生产入口并通过存档完整性与访问控制复核；正式回执为 `artifacts/reports/progression-v080/DEPLOYMENT.json`。旧版25个存档与121个回合内容保持不变。';
const shared=`## 当前主线：v0.8.0 · 2026-09-07

项目 \`C:\\dev\\tgn_live\`；唯一发布分支 **main**，远端 **happyivanencoding/tgnlive**。继续开发前先读本节、\`docs/V080_RESULTS.md\`、\`docs/PROGRESSION_ITERATION.md\`、当前代码和实验正文。以下旧 v0.7.0 历史不覆盖本节。${stage}

本轮不是成长系统完成宣言。真实样本：旧星图18回合、成长版星图${star.committedTurns}回合、独立驭兽${beast.committedTurns}回合、隐潮七港${masked?.committedTurns??0}回合。驭兽第17回合在模型准备阶段超时；新武道两次开局准备超时、没有提交回合，不能算通过了长测。保留所有失败和混合版本恢复记录，不能把重跑或单位测试数量当留存证据。

### 接受的代码与运行规则

1. 持久\`state.progression\`区分真实有边界的关系/通道/身份/产业筹码与待争取机会；技能、物品、态度和角色诺言仍走原字段。旧存档只在下一成功回合补空结构，不追赠奖励。阶段欲望不再随局部调查目标丢失，近突破不会同境界每回合重复触发规划。
2. 逐字证据门槛和“兑现必须送资产”硬门槛被真实失败否决。旧\`evidence\`只作可选注释，知识性结果\`answered/materialized:false\`不冒充成长、不触发补奖重写。结构验证不是叙事语义证明；剩余库存分量/叙述支付一致性问题必须继续检查。
3. 新预设：隐潮七港（诡秘之主机制，六阶）与裂陆武途（全球高武机制，七阶），全五语、原创人物专名情节。不要说两者都通过18回合；以逐样本证据为准。
4. 手机12–24px（默认16、输入16），稳定历史节点/段落、用户上滚锁定、稳定dock/Stop按钮、轻量真实收益反馈。独立最终geometry-04重放：用户锚点、dock起止高度、预览转正文偏移均0；物理Android/iOS和WAN仍未测。
5. Narrator Terra/low，Story Brain Sol/medium，World Forge Luna/medium，Player Luna/low。降低planner effort未证实足够收益，默认不换。短计划去掉重复Canon清单，仍有同步checkpoint长尾；不得承诺总体变快。
6. ACP工具/权限/终端仍禁止；available_commands_update只是目录元数据，精确放行不执行。新增20秒准备预算、token/MCP取消和五个准备子阶段；正文总预算仍120秒。该措施限缩坏等待，未证明上游偶发阻塞根因已经修复。
7. 生产4317、Cloudflare Access owner-only、原存档与原域名不变。启动脚本将public固定为.runtime/public-releases版本快照，避免开发时静态文件即时污染已部署UI。测试只用4318/4319独立DB；全局同时最多两个ACP生成，本轮故障复测采用单槽。

### 接手优先事项

先读星图中段重复谈条件、驭兽短路线反复验证、神秘世界低价值服务循环和资源消耗事件。下一轮要让已有优势支持更完整的行动结算、真正的身份/生活方式变化，而不是继续加“有payoff”的口号或每N回合突破。一次只能修改有真实样本支持的瓶颈。开发后更新双handoff、docs与必要证据，commit/push main；不提交私有SQLite、corpus、原著、token或账户文件。

详细阶段统计：\`artifacts/reports/progression-v080/COMPARISON.json\`。可直接阅读的正文、动作和状态变化：同目录各样本的\`READING.md\`，本机全量失败trace仍在\`artifacts/eval\`。浏览器可见帧与服务端SSE分别计算，玩家决策时间不计入应用等待。
`;
// Normalize escaped markdown backticks without changing Windows paths.
const normalized=shared.replaceAll('\`','`');
prepend('HANDOFF.md',normalized);prepend('DEEP_CONTEXT_HANDOFF.md',normalized);
const result=`# v0.8.0 真实迭代结果

${stage}

## 结论

保留了Canon/自由输入基础，提前兑现了一部分开局能力，并让船位、路线、协作开始在后续产生实际用途；手机流式阅读的可复现跳动已经解决。**没有证明已形成顶级男频的长期复利与身份跃迁，也没有证明总体延迟下降。** 本轮没有设置强制突破、固定送奖、聚合爽感分数、额外judge或逐回合二次重写。

## 真实读后变化

旧星图18回合只有早期滞光技巧的有限扩展，首枚星核仍未正式嵌入。成长版第5—7回合完成取核、嵌入与涌潮身的实际使用，后续用于涨水路段；借船、暗渠通行和绳路确实被后续动作利用。然而18回合仍是第一境界，玩家反复谈条件与检查，中期机会未充分转成社会身份。两份自主轨迹不相同，这不是严格配对因果A/B。

独立驭兽从自愿对视获得实用风向视野，到领航换船位、协作过风口、用旧能力走通短段并获得长索和兽医帮助。伙伴的拒绝、受伤与撤退条件仍保留，没有无条件收宠。路线被拆得太碎，半圆形风台、校风台、下一落点仍形成验证串；正式身份/境界变化没有达成。第17回合120秒准备失败，不隐去失败来报告16次成功。

隐潮七港从配墨、换材料、封护试货走向跨港递送与回签，实际结局请读本样本READING而非世界设计表。旧C前5回合有部分耗材和文字支付一致性疑点，恢复没有修改旧Canon来掩盖问题。世界特征可辨认，但很容易退化为低额校验服务/订单/责任条款，离独特非凡身份幻想仍有差距。

裂陆武途的六?阶段设计以源码为准：实际是七阶；两次真实开局均在模型准备超时，0回合提交。已完成完整数据和五语校验，**没有真实15+回合玩法验证**，不算对核心成长架构的成功外推。

## 接受与否决

接受有边界筹码/机会状态与阶段方向、可复用结果的可见反馈、12px最小字号、稳定滚动/同构段落、真实可见帧标记、ACP元数据误杀修正、准备取消及分阶段20秒预算。短计划是去重复的契约简化，不计入已证实的速度收益。

否决精确摘句校验、强制兑现必须新增资产；真实repair开销和被诱导的补发技能都保留。Sol medium→low在两个固定上下文只带来约1.6–4.2秒变化，未足以更换默认。短计划同上下文一次快约11秒、一次慢约1秒，不能声称稳定提速。不会通过换judge/隐藏失败/重置存档得到PASS。

## 等待与浏览器

服务器firstReaderVisibleMs仅保留为firstNarrativeSseMs兼容别名，不是屏幕可见。当前HTTP校验、上下文、planner/narrator、首次SSE、parse、reducer、repair、持久化、API完成可区分。ACP准备细分为MCP初始化、会话创建、只读模式、模型选择与effort选择；这些是父model阶段内的时间，不能重复相加。

浏览器即时反馈、收到正文、真正进入视口的后续帧、完成接收和可操作选项分开记录。旧C的离屏rAF数值不当作可见帧；原始证据保留，发布比较只用独立或修正后的观测。Chrome移动宽度模拟不等于实体手机/公网/人的留存。

${timing}

## 模型准备长尾

多个样本在没有模型运行ID前等满120秒；也有独立Player在准备阶段耗费122秒，后者不算应用等待。F只改错误边界与可观测性：20秒准备deadline全链路传递取消，正文仍120秒，错误不提交新Canon并提供五语重试提示。恢复后的真实准备子阶段可以定位主要时间。单槽恢复成功不证明并发就是唯一原因，也不证明上游长期可用性问题已经消失；未知会话ID的远端创建是否最终结束仍是边界。

## 资料、隐私与复核

蒸馏源路径、已读机制/对照/Book DNA/arcs及PILOT/STALE限制见PROGRESSION_ITERATION。只迁移机制，不复制原著、人物或剧情。所有私有玩家存档与corpus留本地且忽略；公开包只含合成测试正文、状态变化、白名单阶段统计和版本校验。原始trace、失败尝试和ACP会话信息留在对应本地实验目录。

移动设计及旧失败记录见PROGRESSION_MOBILE，最终独立验收见V080_INDEPENDENT_REVIEW。发布/旧存档完整性/远程Access验证以DEPLOYMENT及关联hash回执为准。
`;
fs.writeFileSync(path.join(root,'docs/V080_RESULTS.md'),result.replace('六?阶段设计以源码为准：实际是七阶','力量系统为七阶'));
fs.writeFileSync(path.join(dir,'RESULTS.md'),result.replace('六?阶段设计以源码为准：实际是七阶','力量系统为七阶'));
const core=`## v0.8.0 当前约定（优先于下方历史）

见 [本轮真实结果](V080_RESULTS.md)、[成长机制与否决记录](PROGRESSION_ITERATION.md)、[移动端证据](V080_INDEPENDENT_REVIEW.md)。当前新增可复用筹码/待兑现机会状态、世界独立growthGrammar、阶段欲望与短计划；没有新增每回合模型。七个预设中两个新世界的实际覆盖须按报告读取，不能用schema通过代替长测。

API server firstNarrativeSseMs与浏览器可见帧严格区分；ACP五个准备子阶段在原model阶段内，20s准备预算与120s正文预算分离。只允许叙事输出，命令目录元数据例外不等于允许工具。默认模型仍Terra低/Narrator、Sol中/Brain、Luna中/Forge；完整等待未证明变快。

移动正文12–24px、默认16/input16；旧历史节点不重建，主动上滚锁定，预览/落盘同构段落与稳定dock。生产静态文件由启动脚本固定版本快照。原存档快照与owner-only安全边界不变。已否决exact quote gate与强制补奖；知识性结算不是物质成长。`;
for(const file of ['docs/SYSTEM.md','docs/ARCHITECTURE.md','docs/WORLD_SYSTEM.md','docs/MOBILE_DESIGN.md'])prepend(file,core);
const mobile=`## v0.8.0 最终集成补充

下方为初版手机协作者记录，不能覆盖后来的独立反证与修正。最终 \`artifacts/ui/progression-mobile-release-v080/result.json\` 在长流、用户上滚、完成落盘、阅读模式、键盘模拟、Stop焦点、360/390/430和紧凑横屏条件全部通过；同一锚点偏移0、dock开始/完成高度差0、预览到落盘高度差0。新增段落DOM与正式正文同构、44px同位状态行、稳定Stop节点；事实清单不再充当获得奖励HUD，最多3项有用收益提示。

早期next-rAF会把屏外8991px文字当已呈现，该指标已经否决。当前标记需元素进入可见视口并经过后续帧；独立记录器另测两帧。实际模型长测已运行，详情见V080_RESULTS；实体Android/iOS和公网延迟仍未测。连接超时消息已补全五语，失败不宣告Canon提交。
`;
prepend('docs/PROGRESSION_MOBILE.md',mobile.replaceAll('\`','`'));
console.log(JSON.stringify({updated:['HANDOFF.md','DEEP_CONTEXT_HANDOFF.md','docs/V080_RESULTS.md','docs/SYSTEM.md','docs/ARCHITECTURE.md','docs/WORLD_SYSTEM.md','docs/MOBILE_DESIGN.md','docs/PROGRESSION_MOBILE.md'],samples:samples.map(s=>({label:s.label,committed:s.committedTurns}))}));
