import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createModelTransport} from './isolated-acp-transport.mjs';
import {extractJsonObject} from '../src/output-parser.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sweep=process.argv[2]||'gemini-model-sweep-20260909',label=process.argv[3]||'gemini-model-sweep-review-20260909';
const src=path.join(root,'artifacts/eval',sweep),out=path.join(root,'artifacts/eval',label);if(fs.existsSync(out))throw Error('Preserve prior review');fs.mkdirSync(out,{recursive:true});
const rows=JSON.parse(fs.readFileSync(path.join(src,'results.json'),'utf8'));
const cells=[...new Set(rows.map(r=>r.cell))];
const save=(n,v)=>fs.writeFileSync(path.join(out,n),typeof v==='string'?v:JSON.stringify(v,null,2));
const judge=createModelTransport({role:'judge',model:'gpt-5.6-sol',reasoningEffort:'medium',timeoutMs:240000});
for(let pass=1;pass<=2;pass++){
 const mapping={},packet=[];
 for(const cell of cells){const accepted=rows.filter(r=>r.cell===cell&&r.status==='accepted'),base=accepted[0]?.terraControl;if(!base)continue;const variants=[{provider:'terra-control',narrative:base.narrative,choices:base.choices},...accepted.map(r=>({provider:r.model,narrative:r.narrative,choices:r.choices}))];
  const ordered=[...variants].sort((a,b)=>crypto.createHash('sha256').update(`${pass}:${cell}:${a.provider}`).digest('hex').localeCompare(crypto.createHash('sha256').update(`${pass}:${cell}:${b.provider}`).digest('hex')));mapping[cell]={};packet.push({cell,variants:ordered.map((v,i)=>{const id=String.fromCharCode(65+i);mapping[cell][id]=v.provider;return{id,narrative:v.narrative,choices:v.choices};})});}
 save(`pass-${pass}.mapping.json`,mapping);
 const prompt=`你是普通中文男频成长幻想读者。下面每个cell来自完全相同的世界状态与玩家行动，只是作者不同；型号已匿名。不要调用工具，不猜模型。\n\n判断用户关心的实际问题：1) 哪版最像可继续读的小说，而不是侦察/工程/办事记录；2) 哪版最少让核验、测量、路线、采购、维修、防御性条件吞掉主欲望；3) 在玩家行动本来很窄时必须尊重行动边界，不能因“爽”就擅自夺宝；但下一步建议应尽量打开真正不同的欲望与生活，而不是同一路线三个子步骤；4) 成长场景要让已有能力、人物反应与行动空间真正发生。\n\n每个cell选bestNovel和leastProcessDriven；可相同。若没有明确差异写tie。给具体文本证据，不用打分。只返回JSON：{"cells":[{"cell":"...","bestNovel":"A/B/.../tie","leastProcessDriven":"A/B/.../tie","bestGrowthPayoff":"A/B/.../tie","evidence":["..."],"problems":{"A":"..."},"judgment":"..."}],"overall":"..."}\n\n匿名样本：${JSON.stringify(packet)}`;
 save(`pass-${pass}.prompt.txt`,prompt);const r=await judge.run(prompt);save(`pass-${pass}.final.txt`,r.text);const parsed=extractJsonObject(r.text);for(const c of parsed.cells||[])c.resolved={bestNovel:mapping[c.cell]?.[c.bestNovel]||c.bestNovel,leastProcessDriven:mapping[c.cell]?.[c.leastProcessDriven]||c.leastProcessDriven,bestGrowthPayoff:mapping[c.cell]?.[c.bestGrowthPayoff]||c.bestGrowthPayoff};save(`pass-${pass}.result.json`,parsed);console.log(JSON.stringify({event:'review',pass,cells:parsed.cells?.length||0}));
}
