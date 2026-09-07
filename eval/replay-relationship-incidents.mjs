import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { StreamingNarratorParser } from '../src/output-parser.js';
import { reduceState } from '../src/reducer.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'artifacts/eval/stars-authority-v063');
const read=name=>JSON.parse(fs.readFileSync(path.join(directory,name),'utf8'));
const traces=read('server-metrics.json').turns;
const turns=fs.readFileSync(path.join(directory,'turns.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const world=JSON.parse(fs.readFileSync(path.join(root,'artifacts/eval/world-stars-compact-v061/world.json'),'utf8'));
const results=[];
for(const trace of traces.filter(t=>t.errors?.some(e=>e.message==='relationshipChanges[0].name 缺失'))){
  const original=trace.candidateOutputs[0].finalText;
  const before=turns.find(t=>t.requestId===trace.requestId).beforeState;
  const started=performance.now(); const parser=new StreamingNarratorParser();parser.push(original);
  const proposal=parser.finish(); const originalNarrative=proposal.narrative;
  const result=reduceState(before,proposal,world);
  for(const change of proposal.delta.relationshipChanges){
    const old=before.relationships.find(n=>n.id===change.id);
    const updated=result.state.relationships.find(n=>n.id===change.id);
    assert.ok(old);assert.equal(updated.name,old.name);assert.equal(updated.attitude,change.attitude);
  }
  assert.equal(proposal.narrative,originalNarrative);
  results.push({requestId:trace.requestId,unchangedOriginalProposal:true,canonicalNamePreserved:true,parsedAndReducedMs:performance.now()-started,priorRepairStage:trace.stages.find(s=>s.name==='repair'),modelCalls:0});
}
assert.equal(results.length,2,'both observed missing-name incidents must replay');
const report={version:'0.6.4',mode:'offline-replay-of-real-original-proposals-no-new-model',at:new Date().toISOString(),results,limits:'Historical repair cost is not a fresh measured end-to-end latency. No live game or canon was changed.'};
fs.writeFileSync(path.join(root,'artifacts/reports/v064-relationship-replay.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
