// Offline falsification of an actual failed two-model attempt. No fresh model calls.
// This is a format-correction experiment, not a semantic Canon validator.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {reduceState} from '../.runtime/progression-v080/candidate-a-source/src/reducer.js';
import {StreamingNarratorParser} from '../.runtime/progression-v080/candidate-a-source/src/output-parser.js';
const dir='artifacts/eval/progression-browser-beast-18-v080a';
const trace=JSON.parse(fs.readFileSync(`${dir}/server-metrics.json`,'utf8')).turns[0];
const game=JSON.parse(fs.readFileSync(`${dir}/final-game.json`,'utf8'));
const clean=s=>String(s).trim().replace(/\s+/g,' ');
// Preserve the exact existing path first. Only formatting at citation boundaries
// may be removed; all retained words/negations/numbers must still match verbatim.
export function exactCitation(narrative,evidence){
  if(typeof evidence!=='string'||clean(evidence).length>240)return null;
  const prose=clean(narrative),quote=clean(evidence);
  const pairs=[['“','”'],['‘','’'],['"','"'],["'","'"],['«','»'],['「','」'],['『','』']];
  const candidates=[quote];
  const pair=pairs.find(([a,b])=>quote.startsWith(a)&&quote.endsWith(b)&&quote.length>a.length+b.length);
  if(pair)candidates.push(quote.slice(pair[0].length,-pair[1].length).trim());
  const core=candidates.at(-1).replace(/[。！？.!?；;，,：:]+$/u,'').trimEnd();
  if(!candidates.includes(core))candidates.push(core);
  for(const text of candidates)if(text.length>=4&&prose.includes(text))return{text,changed:text!==quote,kind:text===quote?'exact':'citation-boundary-format'};
  return null;
}
const results=[];
for(const output of trace.candidateOutputs){
  const parser=new StreamingNarratorParser();parser.push(output.finalText);const proposal=parser.finish();
  let controlError=null;try{reduceState(structuredClone(game.state),structuredClone(proposal),game.world,game.language);}catch(e){controlError={code:e.code,message:e.message};}
  assert.equal(controlError?.code,'INVALID_PROGRESSION');
  const corrected=structuredClone(proposal),corrections=[];
  for(const key of ['leverageOps','opportunityOps'])for(const op of corrected.delta[key]||[]){
    const match=exactCitation(corrected.narrative,op.evidence);assert.ok(match,`${output.role}/${op.id} citation still absent`);
    corrections.push({id:op.id,original:op.evidence,exact:match.text,kind:match.kind});op.evidence=match.text;
  }
  const after=reduceState(structuredClone(game.state),corrected,game.world,game.language);
  results.push({role:output.role,controlError,corrections,afterAccepted:true,applied:after.applied});
}
const negatives=[
  ['船主没有答应提供船只。','船主答应提供船只。'],
  ['他只借出一把旧工具。','“他赠送了一把旧工具。”'],
  ['他答应一次渡船，不包括永久通行。','他答应永久通行。'],
  ['他只给两枚铜钱。','他只给二十枚铜钱。'],
  ['先读告示，之后拿起钥匙。','先读告示，拿起钥匙。'],
  ['没有获得新的权限。','“没有获得新的权限。'],
];
for(const [narrative,evidence]of negatives)assert.equal(exactCitation(narrative,evidence),null);
assert.equal(exactCitation('她说：“这把工具只借一夜。”','“这把工具只借一夜。”').changed,false);
assert.equal(exactCitation('这把工具只借一夜。','“这把工具只借一夜。”').changed,true);
assert.equal(exactCitation('他同意借出旧船，但只能使用一次。','他同意借出旧船。').text,'他同意借出旧船');
assert.equal(exactCitation('他同意借出旧船。',''),null);
const report={mode:'offline-replay-of-real-final-outputs',productSourceChanged:false,traceId:trace.id,baselineNarratorMs:20835,baselineFailedRepairMs:19150,results,negativeCases:negatives.length,passes:true,limits:['Only citation-boundary formatting is normalized.','No semantic entailment or NPC-consent proof; existing Canon checks remain necessary.','Avoided repair is a counterfactual on fixed recorded output, not a new live latency result.']};
fs.writeFileSync(`${dir}/citation-format-replay.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
