import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const label=process.argv[2]||'baseline-v070';
const port=Number(process.argv[3]||4318);
if(!/^[a-z0-9_.-]+$/i.test(label)||![4318,4319].includes(port))throw Error('Use a safe label and isolated port 4318/4319');
const source=path.resolve(process.env.TGN_EVAL_SOURCE||root);
const {createTgnLive}=await import(pathToFileURL(path.join(source,'src/index.js')));
const runtimeDir=path.join(root,'.runtime','progression-v080',label);
const runtime=createTgnLive({configOverrides:{port,host:'127.0.0.1',remote:null,runtimeDir,databasePath:path.join(runtimeDir,'games.sqlite'),publicDir:path.join(source,'public'),narratorWorkspace:path.join(runtimeDir,'narrator-empty')}});
// Copy only the already-authored star-world definition, never a player's save.
const starId='world-8c5aa99a-3568-4149-bbc6-29d6077c8f20';
if(!runtime.store.getWorld(starId)){
 const original=new DatabaseSync(path.join(root,'data','tgn-live.sqlite'),{readOnly:true});
 try{const row=original.prepare('SELECT definition_json FROM worlds WHERE id=?').get(starId);if(row)runtime.store.saveWorld({world:JSON.parse(row.definition_json),prompt:'Existing authored snapshot copied for isolated evaluation',requestId:'evaluation-star-snapshot'});}finally{original.close();}
}
await new Promise((resolve,reject)=>{runtime.server.once('error',reject);runtime.server.listen(port,'127.0.0.1',resolve);});
fs.writeFileSync(path.join(runtimeDir,'server.json'),JSON.stringify({pid:process.pid,label,port,source,version:runtime.config.version,startedAt:new Date().toISOString()},null,2));
console.log(JSON.stringify({testService:true,label,port,source,version:runtime.config.version}));
let stopping=false;function stop(){if(stopping)return;stopping=true;for(const {controller} of runtime.inFlight.values())controller.abort();for(const controller of runtime.worldInFlight.values())controller.abort();runtime.server.close(()=>{runtime.store.close();process.exit(0);});setTimeout(()=>process.exit(1),8000).unref();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);setTimeout(stop,100*60*1000).unref();
