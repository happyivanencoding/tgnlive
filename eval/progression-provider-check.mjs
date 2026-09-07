import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAcpRoleAdapter} from '../src/acp/role-adapter.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const label=process.argv[2];if(!/^[a-z0-9_.-]+$/i.test(label||''))throw Error('Unique safe label required');
const file=path.join(root,'artifacts/progression-v080',`${label}.json`);if(fs.existsSync(file))throw Error('Preserve old probe');
const result={kind:'provider-readiness-not-gameplay',model:'gpt-5.6-luna',effort:'low',startedAt:new Date().toISOString(),firstTextMs:null,events:[]};const start=performance.now();
const adapter=createAcpRoleAdapter({role:'player',model:result.model,reasoningEffort:result.effort,workspace:path.join(root,'.runtime/progression-v080/provider-check-empty'),agentDockUrl:'http://127.0.0.1:8766/mcp',timeoutMs:120000});
try{const generated=await adapter.run('不要调用工具、不要解释。只返回这个JSON：{"ready":true}。',{onText:s=>{if(s.trim()&&result.firstTextMs===null)result.firstTextMs=performance.now()-start;},onEvent:e=>{result.events.push({...e,elapsedMs:performance.now()-start});fs.writeFileSync(file,JSON.stringify(result,null,2));}});result.status='completed';result.output=generated.text;result.sessionId=generated.sessionId;result.runId=generated.runId;}catch(e){result.status='failed';result.error=e.message;result.code=e.code;process.exitCode=1;}finally{result.totalMs=performance.now()-start;result.endedAt=new Date().toISOString();fs.writeFileSync(file,JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
