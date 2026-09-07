import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createTgnLive} from '../src/index.js';
// Isolated local service for real language tests; never rewrites production save data.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=createTgnLive({configOverrides:{port:4318,host:'127.0.0.1',remote:null,databasePath:path.join(root,'.runtime','i18n-test','games.sqlite'),narratorWorkspace:path.join(root,'.runtime','i18n-test','narrator-empty')}});
await new Promise((resolve,reject)=>{runtime.server.once('error',reject);runtime.server.listen(4318,'127.0.0.1',resolve);});
console.log(JSON.stringify({testService:true,port:4318,version:runtime.config.version,startedAt:new Date().toISOString()}));
let stopping=false;function stop(){if(stopping)return;stopping=true;for(const {controller} of runtime.inFlight.values())controller.abort();for(const controller of runtime.worldInFlight.values())controller.abort();runtime.server.close(()=>{runtime.store.close();process.exit(0);});setTimeout(()=>process.exit(1),8000).unref();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);setTimeout(stop,40*60*1000).unref();
