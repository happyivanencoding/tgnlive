import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createAcpRoleAdapter} from '../src/acp/role-adapter.js';
import {extractJsonObject} from '../src/output-parser.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [label,sample,runtimeLabel]=process.argv.slice(2);
if([label,sample,runtimeLabel].some(x=>!/^[a-z0-9_.-]+$/i.test(x||'')))throw Error('Safe label sample runtimeLabel required');
const sampleDir=path.join(root,'artifacts/eval',sample),output=path.join(root,'artifacts/progression-v080',label);
if(fs.existsSync(output))throw Error('Do not overwrite probe evidence');fs.mkdirSync(output,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(sampleDir,'manifest.json'),'utf8'));
const summary=JSON.parse(fs.readFileSync(path.join(sampleDir,'summary.json'),'utf8'));
if(summary.completedTurns<18||summary.fatal)throw Error('Probe only a completed 18-turn source trajectory');
const records=fs.readFileSync(path.join(sampleDir,'turns.jsonl'),'utf8').trim().split('\n').map(JSON.parse).filter(r=>r.outcome==='completed');
const runtimeDir=path.join(root,'.runtime/progression-v080',runtimeLabel);
const server=JSON.parse(fs.readFileSync(path.join(runtimeDir,'server.json'),'utf8'));
const promptSource=path.resolve(process.env.TGN_PROBE_PROMPT_SOURCE||server.source);
const fixedEfforts=process.env.TGN_PROBE_EFFORTS?.split(',');
if(fixedEfforts?.some(e=>!['low','medium'].includes(e)))throw Error('Probe efforts must be low/medium');
const {buildPlannerPrompt}=await import(pathToFileURL(path.join(promptSource,'src/prompts.js')));
const db=new DatabaseSync(path.join(runtimeDir,'games.sqlite'),{readOnly:true});
const world=JSON.parse(db.prepare('SELECT definition_json FROM game_worlds WHERE game_id=?').get(manifest.gameId).definition_json);
const plans=db.prepare('SELECT created_for_turn AS turn_index, plan_json FROM story_plans WHERE game_id=? ORDER BY created_for_turn').all(manifest.gameId);db.close();
const prompts=[9,17].map(turn=>{const rec=records.find(r=>r.index===turn);if(!rec)throw Error('Missing checkpoint');const game={...manifest.initialGame,state:rec.beforeState,version:rec.beforeVersion,turns:records.filter(r=>r.index<turn).map(r=>r.turn)};const previous=plans.filter(p=>p.turn_index<turn).at(-1);return{turn,prompt:buildPlannerPrompt({game,world,action:rec.action,existingPlan:previous?JSON.parse(previous.plan_json):null,language:'zh'})};});
const results=[];const workspace=path.join(root,'.runtime/progression-v080/planner-probe-empty');fs.mkdirSync(workspace,{recursive:true});
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({label,sample,gameId:manifest.gameId,source:server.source,kind:'paired-frozen-context-planner-probe-not-gameplay',order:['9/medium','9/low','17/low','17/medium'],limitations:['Only two source checkpoints; not a population latency result','No Canon writes or player simulation; quality adoption also requires real 18-turn play','Elapsed time includes ACP setup; no provider queue or cost claim']},null,2));
for(const {turn,prompt} of prompts){
 fs.writeFileSync(path.join(output,`turn-${turn}.prompt.txt`),prompt);
 for(const effort of fixedEfforts||(turn===9?['medium','low']:['low','medium'])){
  const adapter=createAcpRoleAdapter({role:'planner',model:'gpt-5.6-sol',reasoningEffort:effort,workspace,agentDockUrl:'http://127.0.0.1:8766/mcp',timeoutMs:180000});
  const result={turn,effort,model:adapter.model,promptSource,promptChars:prompt.length,startedAt:new Date().toISOString(),firstTextMs:null,events:[]};const start=performance.now();
  try{const generated=await adapter.run(prompt,{signal:AbortSignal.timeout(180000),onText:delta=>{if(delta?.trim()&&result.firstTextMs===null)result.firstTextMs=performance.now()-start;},onEvent:e=>{result.events.push({...e,atMs:performance.now()-start});fs.writeFileSync(path.join(output,'current.json'),JSON.stringify(result,null,2));}});result.elapsedMs=performance.now()-start;result.sessionId=generated.sessionId;result.runId=generated.runId;result.output=generated.text;result.plan=extractJsonObject(generated.text);result.status='completed';}catch(e){result.elapsedMs=performance.now()-start;result.status='failed';result.error=e.message;}
  results.push(result);fs.writeFileSync(path.join(output,`turn-${turn}-${effort}.json`),JSON.stringify(result,null,2));fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({turn,effort,status:result.status,firstTextMs:result.firstTextMs,elapsedMs:result.elapsedMs,plan:result.plan}));
 }
}
