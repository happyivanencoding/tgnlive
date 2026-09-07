// One real model/reducer probe of the recorded v0.8 identity incident.
// NOT a committed gameplay trajectory and NOT a 20-turn quality result.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),source=process.env.TGN_EVAL_SOURCE;
if(!source)throw Error('An immutable candidate source is required');
const load=relative=>import(pathToFileURL(path.join(source,relative)));
const [{GenerationService},{createAcpRoleAdapter},{loadConfig},{TurnTrace},{extractJsonObject}]=await Promise.all(['src/generation-service.js','src/acp/role-adapter.js','src/config.js','src/telemetry.js','src/output-parser.js'].map(load));
const input=path.join(root,'artifacts/eval/progression-browser-beast-18-v080d/final-game.json');
const original=fs.readFileSync(input),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const game=JSON.parse(original.toString('utf8').replace(/^\uFEFF/,''));
if(game.state.turnNumber!==16||game.state.realm.rank!==0)throw Error('Recorded incident shape changed');
const label='ascension-d-existing-beast-identity-probe',out=path.join(root,'artifacts/eval',label);
if(fs.existsSync(out))throw Error('Preserve existing incident result');fs.mkdirSync(out,{recursive:true});
const config=loadConfig(),workspace=path.join(root,'.runtime/progression-v080',label);
const adapter=(role,model,reasoningEffort)=>createAcpRoleAdapter({role,model,reasoningEffort,workspace:path.join(workspace,role+'-empty'),agentDockUrl:config.agentDockUrl,timeoutMs:config.providerTimeoutMs});
const player=adapter('player',config.playerModel,config.playerReasoning),narrator=adapter('narrator',config.narratorModel,config.narratorReasoning),planner=adapter('planner',config.plannerModel,config.plannerReasoning);
const service=new GenerationService({narrator,planner,plannerStrategy:'checkpoint'});
const report={kind:'single-existing-state-generation-reducer-probe-not-committed-play',startedAt:new Date().toISOString(),inputHash:hash(original),sourceHash:JSON.parse(fs.readFileSync(path.join(source,'source-manifest.json'),'utf8')).sha256,realmBefore:game.state.realm,limits:['One frozen incident, not a main quality trajectory.','No original game or database is changed.','Player sees the same full state observation as API playtests, not a prose-only orientation test.']};
const trace=new TurnTrace({gameId:game.id,requestId:label});
try{
 const decision=await player.run('你是独立玩家。根据下面已发生的故事和当前公开状态，自由决定你现在最想做的一次行动。不要替世界宣告成功或奖励，不必选建议。只输出JSON：{"action":"一句可执行的完整行动","intent":"简短想争取什么"}。不要输出推理过程。\n'+JSON.stringify({world:game.world.title,description:game.world.description,state:game.state,recent:game.turns.slice(-3).map(t=>({action:t.action,narrative:t.narrative,choices:t.choices}))}));
 const choice=extractJsonObject(decision.text);if(typeof choice.action!=='string'||!choice.action.trim())throw Error('Player did not supply an action');
 report.player={action:choice.action,intent:choice.intent,model:player.model,effort:player.reasoningEffort,sessionId:decision.sessionId};
 const generated=await service.execute({game,world:game.world,action:choice.action,existingPlan:null,trace});
 report.acceptedByCurrentReducer=true;report.realmAfter=generated.reduced.state.realm;report.narrative=generated.reduced.proposal.narrative;report.proposal=generated.reduced.proposal;report.afterState=generated.reduced.state;
 const {reduceState}=await import(pathToFileURL(path.join(root,'.runtime/ascension-v090/baseline-source/src/reducer.js')));
 try{reduceState(structuredClone(game.state),structuredClone(generated.reduced.proposal),game.world);report.sameProposalOldReducer={accepted:true};}
 catch(e){report.sameProposalOldReducer={accepted:false,code:e.code,message:e.message,details:e.details};}
 fs.writeFileSync(path.join(out,'READING.md'),`# Frozen old-Canon identity incident\n\nThis is one proposed successor turn, not a committed long test.\n\nAction: ${choice.action}\n\n${report.narrative}\n\nBefore: ${JSON.stringify(report.realmBefore)}\n\nAfter: ${JSON.stringify(report.realmAfter)}\n`);
}catch(e){report.error={code:e.code||e.name,message:e.message};process.exitCode=1;}
finally{
 await service.close();report.endedAt=new Date().toISOString();report.elapsedMs=trace.elapsed();report.trace=trace.value;report.originalFileUnchanged=hash(fs.readFileSync(input))===report.inputHash;
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({label,error:report.error,realmBefore:report.realmBefore,realmAfter:report.realmAfter,oldReducer:report.sameProposalOldReducer,originalFileUnchanged:report.originalFileUnchanged,elapsedMs:report.elapsedMs}));
}
