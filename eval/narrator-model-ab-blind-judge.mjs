// One independent blind reader call over accepted Gemini-vs-current matched snapshots.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createModelTransport} from './isolated-acp-transport.mjs';
import {extractJsonObject} from '../src/output-parser.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [sourceLabel='narrator-model-ab-gemini-flash-20260909-v2']=process.argv.slice(2);
if(!/^[a-z0-9-]+$/i.test(sourceLabel)) throw Error('Safe label required');
const dir=path.join(root,'artifacts/eval',sourceLabel);
const results=JSON.parse(fs.readFileSync(path.join(dir,'results.json'),'utf8'));
const accepted=results.filter(r=>r.gemini.status==='accepted');
if(!accepted.length) throw Error('No accepted Gemini samples');
const pairs=accepted.map((r,i)=>{
  const gem={narrative:r.gemini.narrative,choices:r.gemini.choices};
  const terra={narrative:r.terra.narrative,choices:r.terra.choices};
  const swap=i%2===1;
  return {id:`pair-${i+1}`,action:r.action,A:swap?terra:gem,B:swap?gem:terra,_gemini:swap?'B':'A',sourceKey:r.key,repeat:r.repeat};
});
const visible=pairs.map(({_gemini,sourceKey,repeat,...p})=>p);
const prompt=`你是独立的中文男频成长幻想读者评审。下面每组都是同一Canon、同一玩家行动、同一隐藏规划下的两种Narrator写法，A/B标签随机，不代表新旧或模型。不要猜模型，不调用工具，不输出推理过程。\n\n这次只判断用户特别关心的问题：哪一版更少把支持性逻辑写成工程/侦察/验收/采购/维修/规格流程，同时仍忠实完成玩家行动；哪一版更把篇幅留给人物、力量、欲望、冲突、所得和行动空间。必要的具体细节可以有，但若大量出现时间窗口、尺寸、承重、构件、路线死角、逐步核验等，并把它们变成故事发动机，要明确指出。不要因为更短就自动判好，也不要因为有技术词就机械判坏。\n\n逐组返回preferred为A/B/tie，并引用极短的具体措辞作为证据（每条引文不超过20字）。最后给overall：若同一方向至少4组明显成立才说有稳定倾向；否则写不确定。只返回JSON：{"pairs":[{"id":"pair-1","preferred":"A/B/tie","reason":"具体读感","processEvidence":["短引文"],"fantasyEvidence":["短引文"]}],"overall":{"lessProcessHeavy":"A/B/tie/uncertain","reason":"总判断"}}。\n\n材料：${JSON.stringify(visible)}`;
fs.writeFileSync(path.join(dir,'blind-judge.prompt.txt'),prompt);
const adapter=createModelTransport({role:'judge',model:'gpt-5.6-sol',reasoningEffort:'medium',timeoutMs:240000});
const started=performance.now();
const r=await adapter.run(prompt,{signal:AbortSignal.timeout(250000)});
fs.writeFileSync(path.join(dir,'blind-judge.final.txt'),r.text);
const judgment=extractJsonObject(r.text);
const decoded={...judgment,pairs:judgment.pairs.map(j=>{const p=pairs.find(x=>x.id===j.id);return{...j,geminiSide:p?._gemini,sourceKey:p?.sourceKey,repeat:p?.repeat};})};
const result={status:'completed',model:'gpt-5.6-sol',reasoningEffort:'medium',elapsedMs:performance.now()-started,acceptedPairs:accepted.length,judgment:decoded,usage:r.usage??null,audit:r.audit??null};
fs.writeFileSync(path.join(dir,'blind-judge.result.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({event:'blind_judge_complete',acceptedPairs:accepted.length,elapsedMs:result.elapsedMs,overall:decoded.overall,pairs:decoded.pairs.map(p=>({id:p.id,preferred:p.preferred,geminiSide:p.geminiSide,sourceKey:p.sourceKey,repeat:p.repeat}))}));
