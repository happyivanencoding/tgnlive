import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('artifacts/eval');
const wanted=process.argv.slice(2);
const dirs=wanted.length?wanted:(await readdir(root,{withFileTypes:true})).filter(x=>x.isDirectory()).map(x=>x.name);
function stats(xs){const a=xs.filter(Number.isFinite).sort((x,y)=>x-y);return{n:a.length,meanMs:a.length?a.reduce((x,y)=>x+y,0)/a.length:null,medianMs:a.length?(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2:null,observedP95Ms:a.length?a[Math.ceil(a.length*.95)-1]:null,minMs:a[0]??null,maxMs:a.at(-1)??null};}
const runs=[];
for(const label of dirs){
  let summary,manifest,rows;
  try{summary=JSON.parse(await readFile(path.join(root,label,'summary.json'),'utf8'));manifest=JSON.parse(await readFile(path.join(root,label,'manifest.json'),'utf8'));rows=(await readFile(path.join(root,label,'turns.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);}catch{continue;}
  const accepted=rows.filter(x=>x.outcome==='completed');
  const stageValues={};for(const r of accepted)for(const s of r.backendMetrics?.stages||[]){(stageValues[s.name]??=[]).push(s.elapsedMs);}
  let judge=null;try{judge=JSON.parse(await readFile(path.join(root,label,'reader-judge.json'),'utf8'));}catch{}
  runs.push({label,revision:manifest.codeRevision??null,appVersion:manifest.app?.version,architecture:manifest.app?.architecture,mode:manifest.mode,persona:manifest.persona,power:manifest.selectedPower,attempted:rows.length,accepted:accepted.length,failed:rows.length-accepted.length,fatal:summary.fatal,firstNarrative:stats(accepted.map(x=>x.client.firstNarrativeMs)),completion:stats(accepted.map(x=>x.client.completeMs)),opening:accepted[0]?{firstMs:accepted[0].client.firstNarrativeMs,completeMs:accepted[0].client.completeMs}:null,regularTurns:stats(accepted.slice(1).filter(x=>!x.backendMetrics?.stages?.some(s=>s.name==='plan')).map(x=>x.client.completeMs)),stages:Object.fromEntries(Object.entries(stageValues).map(([k,v])=>[k,stats(v)])),repairs:rows.reduce((n,x)=>n+(x.backendMetrics?.repairAttempts??0),0),judge:judge?{overall:judge.overall,rubric:judge.rubric,issues:judge.issues,limitations:judge.limitations}:null,finalRealm:accepted.at(-1)?.afterState.realm,finalCoins:accepted.at(-1)?.afterState.coins,finalItems:accepted.at(-1)?.afterState.inventory,chapterIndices:[...new Set(accepted.map(x=>x.turn.chapterIndex))],rawEvidence:`artifacts/eval/${label}/`});
}
await mkdir('artifacts/reports',{recursive:true});
const report={generatedAt:new Date().toISOString(),runs,notes:['Means include successful turns only; failed attempts are reported separately.','ACP setup stages are nested inside plan/generation/repair: never add parent and child twice.','Observed p95 with small n is usually the maximum, not a service-level guarantee.','Player deliberation time is not app generation time.','Billable tokens, provider-internal latency and cost are unknown; no invented estimates.','Fixed-action replay has stochastic prose and is not equivalent to a randomized controlled trial.']};
await writeFile('artifacts/reports/measurements.json',JSON.stringify(report,null,2),'utf8');
let md='# TGN Live measured local runs\n\n| Run | Mode | Accepted / attempts | First prose mean | Completion mean | Opening first / full |\n|---|---|---:|---:|---:|---:|\n';
const sec=x=>Number.isFinite(x)?(x/1000).toFixed(2)+'s':'—';
for(const r of runs)md+=`| ${r.label} | ${r.mode} | ${r.accepted}/${r.attempted} | ${sec(r.firstNarrative.meanMs)} | ${sec(r.completion.meanMs)} | ${sec(r.opening?.firstMs)} / ${sec(r.opening?.completeMs)} |\n`;
md+='\n'+report.notes.map(x=>'- '+x).join('\n')+'\n';
await writeFile('artifacts/reports/MEASUREMENTS.md',md,'utf8');console.log(md);
