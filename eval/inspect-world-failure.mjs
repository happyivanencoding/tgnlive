import { DatabaseSync } from 'node:sqlite';
import { extractJsonObject } from '../src/output-parser.js';
const db=new DatabaseSync('.runtime/i18n-test/games.sqlite',{readOnly:true});
for(const row of db.prepare("SELECT trace_json FROM traces WHERE status='failed'").all()){
 const trace=JSON.parse(row.trace_json);if(trace.kind!=='world-creation')continue;
 const text=trace.candidateOutputs?.find(x=>x.role==='world')?.finalText;
 if(text){const world=extractJsonObject(text);console.log(JSON.stringify({traceId:trace.id,language:world.language,title:world.title,relationships:world.seed?.relationships,errors:trace.errors}));}
}
db.close();
