// Two independent blind-reader passes over the narrator provider A/B outputs.
// Reviewers never see provider/model labels and cannot call tools.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createModelTransport} from './isolated-acp-transport.mjs';
import {extractJsonObject} from '../src/output-parser.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [abLabel='narrator-model-ab-gemini-flash-20260909-v2',reviewLabel='narrator-model-blind-review-20260909']=process.argv.slice(2);
for(const label of [abLabel,reviewLabel])if(!/^[a-z0-9-]+$/i.test(label))throw Error('Safe labels required');
const abDir=path.join(root,'artifacts/eval',abLabel),out=path.join(root,'artifacts/eval',reviewLabel);
if(fs.existsSync(out))throw Error('Preserve prior review evidence');
fs.mkdirSync(out,{recursive:true});
const results=JSON.parse(fs.readFileSync(path.join(abDir,'results.json'),'utf8'));
const byKey=new Map();for(const row of results){const cell=byKey.get(row.key)||{key:row.key,action:row.action,terra:row.terra,gemini:[]};cell.gemini.push(row.gemini);byKey.set(row.key,cell);}
function shuffle(values,seed){return [...values].sort((a,b)=>crypto.createHash('sha256').update(seed+a.id).digest('hex').localeCompare(crypto.createHash('sha256').update(seed+b.id).digest('hex')));}
function packet(seed){
 const map={},cells=[];
 for(const cell of byKey.values()){
  const variants=[{id:'terra',provider:'terra',text:cell.terra.narrative,choices:cell.terra.choices},...cell.gemini.map((g,i)=>({id:`gemini-${i+1}`,provider:`gemini-${i+1}`,status:g.status,text:g.narrative||null,choices:g.choices||null}))].filter(v=>v.text);
  const ordered=shuffle(variants,seed+cell.key);const visible=ordered.map((v,i)=>({label:String.fromCharCode(65+i),narrative:v.text,choices:v.choices}));
  map[cell.key]=Object.fromEntries(ordered.map((v,i)=>[String.fromCharCode(65+i),v.provider]));cells.push({key:cell.key,action:cell.action,versions:visible});
 }
 return{cells,map};
}
const save=(name,value)=>fs.writeFileSync(path.join(out,name),typeof value==='string'?value:JSON.stringify(value,null,2));
const reviewer=createModelTransport({role:'judge',model:'gpt-5.6-sol',reasoningEffort:'medium',timeoutMs:240000});
const reviews=[];
for(let pass=1;pass<=2;pass++){
 const p=packet(`blind-${pass}-`);save(`pass-${pass}.mapping.json`,p.map);
 const prompt=`你是普通中文男频成长幻想读者，只比较下面匿名版本的实际读感。不要猜模型或实现，不调用工具。重点判断用户关心的一个问题：正文是否把支撑性的核验、测量、采购、维修、路线确认、手续与防御性条件写成了故事主体，还是让能力、欲望、人物冲突、稀缺所得和生活变化成为主体。\n\n不要因为一个版本更谨慎就偏爱它，也不要因为一个版本更莽撞就偏爱它。玩家本轮行动边界必须遵守；如果行动本来只授权观察，就不能要求本轮凭空夺宝，但下一步建议仍可以打开更有欲望的不同方向。\n\n逐个cell回答：bestAsNovel=最像真正小说且最想继续读的版本；leastProcessDriven=最没有被工程/办事流程吞掉的版本。可以相同也可以不同。指出1—3条具体文本证据，并列出各版本最实际的问题。没有真实差异就写tie，不制造赢家。\n\n只返回JSON：{"cells":[{"key":"原key","bestAsNovel":"A/B/C/tie","leastProcessDriven":"A/B/C/tie","evidence":["具体证据"],"problems":{"A":"问题或无","B":"问题或无","C":"问题或无"},"judgment":"简短判断"}],"overall":"跨样本能证明什么、不能证明什么"}\n\n样本：${JSON.stringify(p.cells)}`;
 save(`pass-${pass}.prompt.txt`,prompt);const started=performance.now();const response=await reviewer.run(prompt);const elapsedMs=performance.now()-started;save(`pass-${pass}.final.txt`,response.text);
 let parsed;try{parsed=extractJsonObject(response.text);}catch(e){parsed={parseError:e.message,raw:response.text};}
 const resolved=(parsed.cells||[]).map(c=>({...c,resolved:{bestAsNovel:p.map[c.key]?.[c.bestAsNovel]||c.bestAsNovel,leastProcessDriven:p.map[c.key]?.[c.leastProcessDriven]||c.leastProcessDriven}}));
 const review={pass,elapsedMs,model:reviewer.model,reasoningEffort:reviewer.reasoningEffort,parsed:{...parsed,cells:resolved}};reviews.push(review);save(`pass-${pass}.result.json`,review);
 console.log(JSON.stringify({event:'blind_review_complete',pass,elapsedMs:Math.round(elapsedMs),cells:resolved.length}));
}
const structural=[...byKey.values()].map(cell=>({key:cell.key,gemini:cell.gemini.map((g,i)=>({repeat:i+1,status:g.status,repairCalls:g.repairCalls,totalMs:g.totalMs,totalTokens:g.totalTokens,usd:g.usd}))}));
save('summary.json',{abLabel,createdAt:new Date().toISOString(),reviews,structural,limits:['Blind readers assess prose/choices only; structural API failures are reported separately.','Two calls to one judge model are independent requests, not independent human readers.','A/B cells are matched historical snapshots, not long trajectories.']});
await reviewer.prepare().catch(()=>{});
