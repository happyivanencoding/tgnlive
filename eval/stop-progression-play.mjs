// Stop only this evaluation's next independent player decision. Never interrupt a
// canonical application commit or kill unrelated ACP sessions/processes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {McpHttpClient} from '../src/acp/mcp-client.js';
const label=process.argv[2],reason=process.argv.slice(3).join(' ');
if(!/^[a-z0-9_.-]+$/i.test(label||'')||!reason)throw Error('label and reason required');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const dir=path.join(root,'artifacts/eval',label);
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
if(!/^http:\/\/127\.0\.0\.1:431[89]$/.test(manifest.base))throw Error('Only an isolated evaluation can be stopped');
const client=new McpHttpClient({url:'http://127.0.0.1:8766/mcp'});
const started=Date.now();let stopped=false;
while(Date.now()-started<120000){
 const progress=JSON.parse(fs.readFileSync(path.join(dir,'progress.json'),'utf8'));
 if(progress.status!=='running'){console.log(JSON.stringify({alreadyStopped:true,status:progress.status}));stopped=true;break;}
 const currentFile=path.join(dir,'current-player.json');
 if(fs.existsSync(currentFile)){
  const meta=JSON.parse(fs.readFileSync(currentFile,'utf8'));
  if(meta.runId){const info=await client.callTool('acp_prompt',{action:'events',run_id:meta.runId,after_seq:0,limit:1,wait_ms:0});
   if(info.status==='running'){
    fs.writeFileSync(path.join(dir,'operator-stop.json'),JSON.stringify({reason,at:new Date().toISOString(),runId:meta.runId,sessionId:meta.sessionId,scope:'owned ACP player decision; no application request interrupted'},null,2));
    const result=await client.callTool('acp_prompt',{action:'cancel',run_id:meta.runId});console.log(JSON.stringify({stopped:true,runId:meta.runId,result}));stopped=true;break;
   }
  }
 }
 await new Promise(r=>setTimeout(r,500));
}
if(!stopped)throw Error('No cancellable owned player decision observed; no processes were killed');
