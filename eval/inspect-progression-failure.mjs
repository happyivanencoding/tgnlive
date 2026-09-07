// Read-only reconstruction of FINAL output from already-finished evaluation runs.
// Never starts a model or reads/stores analysis-phase text.
import fs from 'node:fs';
import path from 'node:path';
import {McpHttpClient} from '../src/acp/mcp-client.js';
import {StreamingNarratorParser} from '../src/output-parser.js';
function parseTurnOutput(text){const parser=new StreamingNarratorParser();parser.push(text);return parser.finish();}
const label=process.argv[2];
if(!/^[a-z0-9_.-]+$/i.test(label||''))throw Error('Safe existing evaluation label required');
const dir=path.resolve('artifacts/eval',label),metrics=JSON.parse(fs.readFileSync(path.join(dir,'server-metrics.json'),'utf8'));
const client=new McpHttpClient({url:'http://127.0.0.1:8766/mcp'}),results=[];
for(const trace of metrics.turns.filter(t=>t.status==='failed')){
  for(const role of ['narrator','repair']){
    const provider=trace.provider?.[role];if(!provider?.runId)continue;
    let cursor=0,text=trace.candidateOutputs?.find(output=>output.role===role)?.finalText||'',done=Boolean(text);
    // Prefer retained application final outputs. The provider's bounded event ring
    // may have expired even though the application's complete artifact is intact.
    for(let page=0;!done&&page<30;page++){
      const b=await client.callTool('acp_prompt',{action:'events',run_id:provider.runId,after_seq:cursor,limit:200,wait_ms:0});
      if(b.truncated)throw Error('Historical events truncated; cannot claim exact reconstruction');
      for(const e of b.events||[]){const phase=e.update?._meta?.codex?.phase;if(e.type==='agent_message_chunk'&&(!phase||phase==='final_answer')&&e.update?.content?.type==='text')text+=e.update.content.text;}
      cursor=b.next_seq??cursor;if(!b.has_more){done=true;break;}
    }
    if(!done)throw Error('Historical output exceeds bounded reader');
    const filename=`failed-${trace.id}-${role}-final.txt`;fs.writeFileSync(path.join(dir,filename),text);
    let parsed,parseError;try{parsed=parseTurnOutput(text);}catch(e){parseError=e.message;}
    const operations=Object.entries(parsed?.delta||{}).filter(([key])=>['leverageOps','opportunityOps'].includes(key)).map(([key,value])=>({key,operations:Array.isArray(value)?value.map(op=>({id:op.id,op:op.op,kind:op.kind,name:op.name,evidence:op.evidence,evidenceInNarrative:typeof op.evidence==='string'?parsed.narrative.includes(op.evidence):false,evidenceLength:typeof op.evidence==='string'?op.evidence.length:null})):value}));
    results.push({traceId:trace.id,role,sessionId:provider.sessionId,runId:provider.runId,filename,finalBytes:Buffer.byteLength(text),parseError,narrative:parsed?.narrative,delta:parsed?.delta,operations});
  }
}
fs.writeFileSync(path.join(dir,'failure-final-analysis.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
