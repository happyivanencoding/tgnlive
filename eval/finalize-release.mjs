import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),out=path.join(root,'artifacts/reports/progression-v080');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const ui=read('artifacts/ui/progression-mobile-release-v080/result.json');
if(!Object.values(ui.checks).every(Boolean))throw Error('Mobile release replay contains failures');
const unit=fs.readFileSync(path.join(root,'artifacts/progression-v080/unit-final.txt'),'utf8');
if(!/pass 96/.test(unit)||!/fail 0/.test(unit))throw Error('Final offline test receipt absent');
const source=read('artifacts/progression-v080/candidate-f-source-manifest.json');
const canonical=s=>s.replace(/\r\n/g,'\n').replace(/[ \t]+\n/g,'\n');
const files=[];
for(const file of source.files){const actual=fs.readFileSync(path.join(root,file.path),'utf8'),frozen=fs.readFileSync(path.join(source.destination,file.path),'utf8');if(canonical(actual)!==canonical(frozen))throw Error(`Untested executable source change: ${file.path}`);files.push({path:file.path,sha256:createHash('sha256').update(actual).digest('hex')});}
const validation={at:new Date().toISOString(),offlineTests:{passed:96,failed:0},mobileReplay:{source:'artifacts/ui/progression-mobile-release-v080/result.json',kind:ui.mode,checks:ui.checks,measurements:ui.measurements},acceptedSource:{label:source.label,sourceHash:source.sha256,files,comparison:'Only line-ending/trailing-space normalization permitted since frozen F'},limits:['Offline fixtures are not ACP gameplay','Chrome emulation is not physical Android/iPhone or WAN','A successful preparation after an outage does not establish the upstream outage root cause']};
fs.writeFileSync(path.join(out,'VALIDATION.json'),JSON.stringify(validation,null,2));
const probes=[];for(const name of ['planner-effort-stars-d-02','planner-compact-stars-d-01']){const p=`artifacts/progression-v080/${name}/results.json`;if(fs.existsSync(path.join(root,p)))for(const r of read(p))probes.push({probe:name,turn:r.turn,model:r.model,effort:r.effort,status:r.status,totalMs:r.elapsedMs,firstTextMs:r.firstTextMs,outputCharacters:r.output?.length||0,plan:r.plan});}
fs.writeFileSync(path.join(out,'PLANNER_PROBES.json'),JSON.stringify({kind:'frozen-context non-gameplay probes; two source checkpoints; no default model switch',runs:probes},null,2));
fs.copyFileSync(path.join(root,'docs/PROGRESSION_ITERATION.md'),path.join(out,'MECHANISMS_AND_REJECTIONS.md'));
fs.copyFileSync(path.join(root,'docs/PROGRESSION_WORLDS.md'),path.join(out,'WORLD_DESIGNS.md'));
console.log(JSON.stringify({sourceVerified:true,sourceFiles:files.length,mobileChecks:Object.keys(ui.checks).length,tests:96,curatedDirectory:out}));
