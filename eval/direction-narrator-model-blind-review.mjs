// Two blind-reader passes over the fixed-direction Narrator model sweep.
// Provider/model labels are hidden per cell; structural failures are reported separately.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [sweepLabel='direction-narrator-model-sweep-20260909',reviewLabel='direction-narrator-model-blind-review-20260909']=process.argv.slice(2);
for(const x of [sweepLabel,reviewLabel])if(!/^[a-z0-9-]+$/i.test(x))throw Error('Safe labels required');
const sweepDir=path.join(root,'artifacts/eval',sweepLabel),out=path.join(root,'artifacts/eval',reviewLabel);if(fs.existsSync(out))throw Error('Preserve prior review');fs.mkdirSync(out,{recursive:true});
const results=JSON.parse(fs.readFileSync(path.join(sweepDir,'results.json'),'utf8')),manifest=JSON.parse(fs.readFileSync(path.join(sweepDir,'manifest.json'),'utf8'));
const source=path.join(root,'.runtime/progression-v080',manifest.frozenDirectionSource+'-source');
const [{createModelTransport},{extractJsonObject}]=await Promise.all([import(pathToFileURL(path.join(source,'eval/isolated-acp-transport.mjs'))),import(pathToFileURL(path.join(source,'src/output-parser.js')))]);
const save=(name,value)=>fs.writeFileSync(path.join(out,name),typeof value==='string'?value:JSON.stringify(value,null,2));
function shuffled(values,seed){return [...values].sort((a,b)=>crypto.createHash('sha256').update(seed+a.model).digest('hex').localeCompare(crypto.createHash('sha256').update(seed+b.model).digest('hex')));}
function packet(pass){
 const cells=[],mapping={};
 for(const spec of manifest.cells){const repeat=spec.key==='growth-breakthrough'?pass:1,rows=results.filter(r=>r.key===spec.key&&r.repeat===repeat&&r.status==='accepted');const ordered=shuffled(rows,`${reviewLabel}-${pass}-${spec.key}-`),map={};
  const versions=ordered.map((row,index)=>{const label=String.fromCharCode(65+index);map[label]=row.model;return{label,narrative:row.narrative,choices:row.choices};});mapping[spec.key]=map;
  const example=results.find(r=>r.key===spec.key);cells.push({key:spec.key,kind:spec.kind,action:example.action,selectedDirection:example.selectedDirection,versions});
 }
 return{cells,mapping};
}
const judge=createModelTransport({role:'judge',model:'gpt-5.6-sol',reasoningEffort:'medium',timeoutMs:300000});
const reviews=[];
for(let pass=1;pass<=2;pass++){
 const p=packet(pass);save(`pass-${pass}.mapping.json`,p.mapping);
 const prompt=`你是中文男频成长幻想小说的独立读者。下面每个cell的所有版本拥有完全相同的Canon、玩家行动和“本轮唯一主要剧情方向”，只比较实际正文实现。你不知道模型身份，也不要猜。不要调用工具。\n\n用户最关心的是：较弱理性/coding能力的旧模型会不会反而更适合小说写作。请只凭正文判断，不因“模型更聪明/更严谨”加分。\n\n逐cell比较：\n1. bestNovel：最像真正小说、最想继续读；\n2. bestDirectionRealization：最完整地把锁定方向变成人物行动、力量使用、冲突、所得和处境变化，而不是复述方向；\n3. leastProcessDriven：最少把核验、步骤、规格、测量、采购、手续、路线说明、防御条件写成主体；\n4. bestCharacters：人物最像有欲望和关系的人，而非功能NPC；\n5. worstProcessDriven：最明显被工程/办事流程吞掉。\n\n可以tie，不为了制造赢家而选。玩家行动中的真实边界必须遵守；越权完成未授权结果不能因“更爽”而获胜。正文允许必要的具体细节，但细节必须服务冲突/人物/爽点，而不是取代故事。\n\n只返回JSON：{"cells":[{"key":"原key","bestNovel":"A/B/tie","bestDirectionRealization":"A/B/tie","leastProcessDriven":"A/B/tie","bestCharacters":"A/B/tie","worstProcessDriven":"A/B/tie","evidence":["2到4条具体文本证据"],"problems":{"A":"最实际问题或无","B":"..."},"judgment":"一句判断"}],"overall":"这些样本能证明和不能证明什么"}\n\n匿名样本：${JSON.stringify(p.cells)}`;
 save(`pass-${pass}.prompt.txt`,prompt);const started=performance.now();const response=await judge.run(prompt);save(`pass-${pass}.final.txt`,response.text);let parsed;try{parsed=extractJsonObject(response.text);}catch(error){parsed={parseError:error.message,cells:[],overall:'parse failed'};}
 const resolve=(cell,label)=>p.mapping[cell]?.[label]||label;
 const cells=(parsed.cells||[]).map(c=>({...c,resolved:{bestNovel:resolve(c.key,c.bestNovel),bestDirectionRealization:resolve(c.key,c.bestDirectionRealization),leastProcessDriven:resolve(c.key,c.leastProcessDriven),bestCharacters:resolve(c.key,c.bestCharacters),worstProcessDriven:resolve(c.key,c.worstProcessDriven)}}));const review={pass,elapsedMs:performance.now()-started,model:judge.model,reasoningEffort:judge.reasoningEffort,cells,overall:parsed.overall||null};reviews.push(review);save(`pass-${pass}.result.json`,review);console.log(JSON.stringify({event:'review-pass',pass,cells:cells.length,elapsedMs:Math.round(review.elapsedMs)}));
}
const criteria=['bestNovel','bestDirectionRealization','leastProcessDriven','bestCharacters','worstProcessDriven'];const counts=Object.fromEntries(criteria.map(k=>[k,{}]));for(const review of reviews)for(const cell of review.cells)for(const criterion of criteria){const model=cell.resolved?.[criterion];if(!model||model==='tie')continue;counts[criterion][model]=(counts[criterion][model]||0)+1;}
const structural=manifest.models.map(m=>{const rows=results.filter(r=>r.model===m.id);return{model:m.id,label:m.label,samples:rows.length,accepted:rows.filter(r=>r.status==='accepted').length,invalidAfterRepair:rows.filter(r=>r.status==='invalid-after-repair').length,providerErrors:rows.filter(r=>r.status==='provider-error').length,repairs:rows.reduce((n,r)=>n+Number(r.repairCalls||0),0)};});
save('summary.json',{sweepLabel,createdAt:new Date().toISOString(),reviews,counts,structural,limits:['Two judge calls are independent model requests, not human readers.','Fixed synthetic routes isolate writing realization; they are not autonomous-player or long-horizon evidence.','Models with invalid/provider-error cells are absent from those blind cells rather than receiving fabricated prose.','Win counts are descriptive for this bounded set, not a universal writing benchmark.']});console.log(JSON.stringify({event:'review-complete',counts,structural}));
