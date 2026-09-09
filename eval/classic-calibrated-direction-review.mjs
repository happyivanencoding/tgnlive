// Classic-calibrated blind review for fixed-direction narrator model outputs.
// The judge first derives reader standards from bounded original-novel excerpts only,
// then receives the same excerpts + frozen standards + anonymous candidates.
// Original excerpts stay under ignored artifacts and are never committed by this script.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [sweepLabel='direction-narrator-model-sweep-20260909',reviewLabel='classic-calibrated-direction-review-20260909']=process.argv.slice(2);
for(const x of [sweepLabel,reviewLabel])if(!/^[a-z0-9-]+$/i.test(x))throw Error('Safe labels required');
const sweepDir=path.join(root,'artifacts/eval',sweepLabel),out=path.join(root,'artifacts/eval',reviewLabel);if(fs.existsSync(out))throw Error('Preserve prior review evidence');fs.mkdirSync(out,{recursive:true});
const results=JSON.parse(fs.readFileSync(path.join(sweepDir,'results.json'),'utf8')),manifest=JSON.parse(fs.readFileSync(path.join(sweepDir,'manifest.json'),'utf8'));
const source=path.join(root,'.runtime/progression-v080',manifest.frozenDirectionSource+'-source');
const [{createModelTransport},{extractJsonObject}]=await Promise.all([import(pathToFileURL(path.join(source,'eval/isolated-acp-transport.mjs'))),import(pathToFileURL(path.join(source,'src/output-parser.js')))]);
const corpusRoot=path.resolve(root,'..','tgn-story-mvp');
const registryDir=path.join(corpusRoot,'books','real-exp-variation-secondary-naming-20260828-v1','naming_distill_all','evidence');
const registryFiles={
 '全球高武':'rcv0-20-gaowu-quanqiu-gaowu.json','第一序列':'rcv0-27-dushi-diyi-xulie.json','修真聊天群':'rcv0-03-dushi-xiuzhen-chatianqun.json','吞噬星空':'rcv0-50-xuanhuan-tunshi-xingkong.json'
};
const windowsByPass={
 1:[
  {book:'全球高武',start:13728,end:13751,role:'公开行动/战斗：动作、体力、结果与读者反馈如何共存'},
  {book:'全球高武',start:67921,end:67944,role:'资源与价值：价格/协议信息如何服从人物反应与场景推进'},
  {book:'第一序列',start:216,end:256,role:'交易与世界进入：商品、价格、阶层如何由行走和行动带出'},
  {book:'第一序列',start:2133,end:2172,role:'人物谈判：条件、威胁、关系如何先作为人物冲突而不是合同说明'},
  {book:'吞噬星空',start:735,end:780,role:'公开评价/社会反应：实力与身份变化如何通过人群反应显形'}
 ],
 2:[
  {book:'全球高武',start:244237,end:244260,role:'高价值行动后的余波：功绩、人物关系和日常语气如何落地'},
  {book:'第一序列',start:1388,end:1414,role:'风险后的生活结算：药物、住房、礼物与身份变化如何成为结果'},
  {book:'第一序列',start:3103,end:3157,role:'绝境冲突：对话、武力与能力揭示如何压缩为可感事件'},
  {book:'修真聊天群',start:375,end:451,role:'动作危机：视觉冲击、常识反应与人物语气如何同时推进'},
  {book:'修真聊天群',start:149904,end:149945,role:'成长/身份回报：前置关系如何通过姿态、旁观与反应兑现'}
 ]
};
const save=(name,value)=>fs.writeFileSync(path.join(out,name),typeof value==='string'?value:JSON.stringify(value,null,2));
function decodeBook(book){const registry=JSON.parse(fs.readFileSync(path.join(registryDir,registryFiles[book]),'utf8'));let sourcePath=registry.path;if(!fs.existsSync(sourcePath)){const marker='修仙小说素材库\\';const at=sourcePath.indexOf(marker);if(at>=0)sourcePath=path.join('C:\\GoogleDrive\\笔记\\50_Corpora\\TGN',sourcePath.slice(at+marker.length));}if(!fs.existsSync(sourcePath))throw Error(`Original source missing: ${book}`);const enc=String(registry.encoding||registry.encoding_hint||'utf-8').toLowerCase();const decoder=new TextDecoder(enc==='utf-8-sig'?'utf-8':enc);let text=decoder.decode(fs.readFileSync(sourcePath));if(text.charCodeAt(0)===0xfeff)text=text.slice(1);return{text,registry:{...registry,resolvedPath:sourcePath}};}
const bookCache=new Map();function excerpt(w){let loaded=bookCache.get(w.book);if(!loaded){loaded=decodeBook(w.book);bookCache.set(w.book,loaded);}const lines=loaded.text.replace(/\r\n/g,'\n').split('\n');if(w.start<1||w.end>lines.length||w.start>w.end)throw Error(`Bad window ${w.book} ${w.start}-${w.end}/${lines.length}`);let text=lines.slice(w.start-1,w.end).join('\n').trim();if(text.length>2600)text=text.slice(0,2600)+'\n[窗口在此截断]';return{book:w.book,role:w.role,start:w.start,end:w.end,text};}
function references(pass){return windowsByPass[pass].map(excerpt);}
function shuffled(values,seed){return [...values].sort((a,b)=>crypto.createHash('sha256').update(seed+a.model).digest('hex').localeCompare(crypto.createHash('sha256').update(seed+b.model).digest('hex')));}
function candidatePacket(pass){const cells=[],mapping={};for(const spec of manifest.cells){const repeat=spec.key==='growth-breakthrough'?pass:1,rows=results.filter(r=>r.key===spec.key&&r.repeat===repeat&&r.status==='accepted');const ordered=shuffled(rows,`${reviewLabel}-${pass}-${spec.key}`),map={};const versions=ordered.map((r,i)=>{const label=String.fromCharCode(65+i);map[label]=r.model;return{label,narrative:r.narrative,choices:r.choices};});mapping[spec.key]=map;const sample=results.find(r=>r.key===spec.key);cells.push({key:spec.key,kind:spec.kind,action:sample.action,selectedDirection:sample.selectedDirection,versions});}return{cells,mapping};}
const judge=createModelTransport({role:'judge',model:'gpt-5.6-sol',reasoningEffort:'medium',timeoutMs:360000});
const reviews=[];
for(let pass=1;pass<=2;pass++){
 const refs=references(pass);save(`pass-${pass}.classic-excerpts.private.json`,refs.map(x=>({...x,sourceText:x.text}))); // ignored artifact only
 const calibrationPrompt=`你是中文男频成长小说的读者研究员。下面只给你真实经典男频小说的有界原文窗口，不给任何待评候选。不要调用工具，也不要依据你自己的“写作规范”先入为主。\n\n任务：只从这些原文实际怎么写，归纳5—8条可用于判断“小说感/成长兑现/人物活力/流程细节是否喧宾夺主”的读者标尺。尤其观察：规则、价格、训练、交易、路线、条件存在时，经典是怎样让它们服务于人物、冲突、力量、欲望、结果和社会反应，而不是把复杂度本身当优点。也观察经典何时会直接用数字/步骤——不要把所有细节都误判成工程化。\n\n不要模仿或复述原句；每条标尺写成可迁移的读者判断，并用“参考窗口编号”说明它来自哪里。不得建立新的Authority/安全规则。\n\n只返回JSON：{"standards":[{"name":"短名","readerTest":"看到什么算好，看到什么算流程喧宾夺主","referenceWindows":[1,2]}],"calibrationSummary":"这些经典共同奖励什么，不奖励什么"}\n\n经典原文窗口：${JSON.stringify(refs.map((r,i)=>({index:i+1,book:r.book,sceneRole:r.role,originalText:r.text})))}`;
 save(`pass-${pass}.calibration.prompt.txt`,calibrationPrompt);const calStart=performance.now();const calResponse=await judge.run(calibrationPrompt);save(`pass-${pass}.calibration.final.txt`,calResponse.text);let calibration;try{calibration=extractJsonObject(calResponse.text);}catch(error){throw Error(`Calibration parse failed pass ${pass}: ${error.message}`);}save(`pass-${pass}.calibration.result.json`,{elapsedMs:performance.now()-calStart,calibration});
 const p=candidatePacket(pass);save(`pass-${pass}.mapping.json`,p.mapping);
 const reviewPrompt=`你是匿名中文男频成长小说评审。你必须先以“经典原文”作为读感校准，而不是凭自己的默认写作偏好判断。下面给出的经典原文与你要评的候选无关，不能把候选写成经典的仿作；它们只告诉你成熟男频实际如何处理力量、交易、训练、关系、风险、所得和说明细节。\n\n第一部分是经典原文窗口；第二部分是只由经典原文预先归纳、且在看到候选前已冻结的读者标尺；第三部分才是匿名候选。你不知道任何候选模型身份，不要猜。不要调用工具。\n\n重要：不要因为一个版本更严谨、更完整地列出权限/条件/步骤/规格，就自动认为它更好；也不要反过来机械惩罚所有数字和具体细节。判断细节是否像经典那样服务人物、冲突、力量、笑点/紧张、价值与结果，还是替代了故事。越权凭空送出未授权成果仍是实际缺陷。\n\n逐cell返回：bestNovel、bestDirectionRealization、leastProcessDriven、bestCharacters、worstProcessDriven。可以tie。evidence必须引用候选中的具体做法，并明确它与冻结经典标尺的哪一条对应；不要长引经典原文。\n\n只返回JSON：{"classicStandardsUsed":["实际使用的标尺短名"],"cells":[{"key":"原key","bestNovel":"A/B/tie","bestDirectionRealization":"A/B/tie","leastProcessDriven":"A/B/tie","bestCharacters":"A/B/tie","worstProcessDriven":"A/B/tie","evidence":["具体证据"],"judgment":"一句判断"}],"overall":"在经典校准后，这些匿名版本呈现出的差异，以及样本不能证明什么"}\n\n经典原文：${JSON.stringify(refs.map((r,i)=>({index:i+1,book:r.book,sceneRole:r.role,originalText:r.text})))}\n\n冻结读者标尺：${JSON.stringify(calibration)}\n\n匿名候选：${JSON.stringify(p.cells)}`;
 save(`pass-${pass}.review.prompt.txt`,reviewPrompt);const reviewStart=performance.now();const response=await judge.run(reviewPrompt);save(`pass-${pass}.review.final.txt`,response.text);let parsed;try{parsed=extractJsonObject(response.text);}catch(error){throw Error(`Review parse failed pass ${pass}: ${error.message}`);}const resolve=(key,label)=>p.mapping[key]?.[label]||label;const cells=(parsed.cells||[]).map(c=>({...c,resolved:{bestNovel:resolve(c.key,c.bestNovel),bestDirectionRealization:resolve(c.key,c.bestDirectionRealization),leastProcessDriven:resolve(c.key,c.leastProcessDriven),bestCharacters:resolve(c.key,c.bestCharacters),worstProcessDriven:resolve(c.key,c.worstProcessDriven)}}));const review={pass,calibration,reviewElapsedMs:performance.now()-reviewStart,classicStandardsUsed:parsed.classicStandardsUsed||[],cells,overall:parsed.overall||null};reviews.push(review);save(`pass-${pass}.review.result.json`,review);console.log(JSON.stringify({event:'classic-calibrated-pass',pass,cells:cells.length,standards:calibration.standards?.length||0}));
}
const criteria=['bestNovel','bestDirectionRealization','leastProcessDriven','bestCharacters','worstProcessDriven'];const counts=Object.fromEntries(criteria.map(k=>[k,{}]));for(const review of reviews)for(const cell of review.cells)for(const criterion of criteria){const model=cell.resolved?.[criterion];if(!model||model==='tie')continue;counts[criterion][model]=(counts[criterion][model]||0)+1;}
let naive=null;const naivePath=path.join(root,'artifacts/eval/direction-narrator-model-blind-review-20260909/summary.json');if(fs.existsSync(naivePath))naive=JSON.parse(fs.readFileSync(naivePath,'utf8'));
save('summary.json',{sweepLabel,createdAt:new Date().toISOString(),counts,naiveCounts:naive?.counts||null,reviews,classicSources:Object.values(registryFiles),limits:['Original classic excerpts are private local calibration inputs and are not committed or reproduced in the report.','Calibration windows are bounded samples from four books, not a complete literary canon.','The same judge family still performs calibration and review; classic grounding reduces but cannot eliminate model-judge bias.','Two passes are model requests, not human readers; fixed-direction probes are not long-horizon gameplay evidence.']});console.log(JSON.stringify({event:'classic-calibrated-complete',counts,naiveCounts:naive?.counts||null}));
