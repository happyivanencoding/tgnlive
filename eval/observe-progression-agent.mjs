import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {McpHttpClient} from '../src/acp/mcp-client.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const name=process.argv[2]||'mobile';
if(!/^[a-z0-9-]+$/i.test(name))throw Error('Safe agent label required');
const dir=path.join(root,'artifacts','progression-v080');
const run=JSON.parse(fs.readFileSync(path.join(dir,`${name}-run.json`),'utf8').replace(/^\uFEFF/,''));
const cursorFile=path.join(dir,`${name}-cursor.txt`);
let cursor=fs.existsSync(cursorFile)?Number(fs.readFileSync(cursorFile,'utf8')):0;
const client=new McpHttpClient({url:'http://127.0.0.1:8766/mcp'});
let batch;const notes=[],counts={};
for(let i=0;i<8;i++){
 batch=await client.callTool('acp_prompt',{action:'events',run_id:run.run_id,after_seq:cursor,limit:200,wait_ms:0});
 for(const e of batch.events||[]){counts[e.type]=(counts[e.type]||0)+1;const entry={seq:e.seq,type:e.type,createdAt:e.created_at};
 if(e.type==='agent_message_chunk'&&e.update?._meta?.codex?.phase!=='analysis'&&e.update?.content?.type==='text'){entry.text=e.update.content.text;entry.phase=e.update?._meta?.codex?.phase;fs.appendFileSync(path.join(dir,`${name}-response.md`),entry.text);notes.push(entry.text);}
 if(e.type==='tool_call'){entry.title=String(e.update?.title||'').slice(0,240);notes.push(entry.title);}
 fs.appendFileSync(path.join(dir,`${name}-events.jsonl`),JSON.stringify(entry)+'\n');
 }
 cursor=batch.next_seq??cursor;fs.writeFileSync(cursorFile,String(cursor));if(!batch.has_more)break;
}
const state={sessionId:run.session_id,runId:run.run_id,status:batch.status,cursor,truncated:batch.truncated,endedAt:batch.ended_at,error:batch.message,counts,notes:notes.slice(-10)};
fs.writeFileSync(path.join(dir,`${name}-observed.json`),JSON.stringify(state,null,2));console.log(JSON.stringify(state,null,2));
