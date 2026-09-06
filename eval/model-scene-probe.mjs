import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { GenerationService } from '../src/generation-service.js';
import { createAcpRoleAdapter } from '../src/acp/role-adapter.js';
import { loadConfig } from '../src/config.js';
import { TurnTrace } from '../src/telemetry.js';
import { WORLDS } from '../src/worlds.js';
import { authoredOpeningPlan } from '../src/opening-plan.js';
import { buildNarratorPrompt } from '../src/prompts.js';
const model=process.argv[2]||'gpt-5.6-terra';
const source='cycle2-replay-v030';
const rows=(await readFile(`artifacts/eval/${source}/turns.jsonl`,'utf8')).trim().split('\n').map(JSON.parse);
const rec=rows[4];const world=WORLDS[0];
const sourceTraces=JSON.parse(await readFile(`artifacts/eval/${source}/server-metrics.json`,'utf8')).turns;
const sourceTrace=sourceTraces.find(t=>t.id===rec.turn.traceId);
const game={id:'isolated-scene-probe-not-a-committed-game',name:'沈舟',version:rec.beforeVersion,state:rec.beforeState,turns:rows.slice(0,4).map(x=>x.turn)};
const config=loadConfig();
const narrator=createAcpRoleAdapter({role:'narrator',model,reasoningEffort:'low',workspace:config.narratorWorkspace,agentDockUrl:config.agentDockUrl,timeoutMs:120000});
const planner={async run(){throw new Error('Unexpected planner in isolated turn-five comparison');}};
const service=new GenerationService({narrator,planner,openingPlanStrategy:'authored'});
const trace=new TurnTrace({gameId:game.id,requestId:'same-state-terra-probe'});
const directory=`artifacts/eval/model-probe-${model.replace(/[^a-z0-9.-]/g,'_')}`;
await mkdir(directory,{recursive:true});
await writeFile(directory+'/prompt.txt',buildNarratorPrompt({game,world,action:rec.action,plan:authoredOpeningPlan(world)}),'utf8');
const result={mode:'isolated-identical-state-final-output-probe-NOT-gameplay',source,sourceTurn:5,model,reasoning:'low',startedAt:new Date().toISOString(),sourcePromptChars:sourceTrace?.promptChars?.narrator ?? null,sourceLatency:{first:rec.client.firstNarrativeMs,complete:rec.client.completeMs}};
try{
  const generated=await service.execute({game,world,action:rec.action,existingPlan:authoredOpeningPlan(world),trace,onText(){}});
  result.accepted=true;result.narrative=generated.reduced.proposal.narrative;result.proposedState=generated.reduced.state;
  await writeFile(directory+'/narrative.md',result.narrative,'utf8');
}catch(e){result.accepted=false;result.error={code:e.code,message:e.message};process.exitCode=1;}
finally{result.elapsedMs=trace.elapsed();result.trace=trace.value;result.endedAt=new Date().toISOString();await writeFile(directory+'/result.json',JSON.stringify(result,null,2),'utf8');console.log(JSON.stringify({model,accepted:result.accepted,elapsedMs:result.elapsedMs,firstMs:result.trace.firstReaderVisibleMs,promptChars:result.trace.promptChars.narrator,sourcePromptChars:result.sourcePromptChars,narrative:result.narrative,error:result.error}));}
