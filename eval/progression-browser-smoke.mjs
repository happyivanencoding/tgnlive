// Transport/UI instrumentation fixture only. This is not an ACP quality experiment.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTgnLive } from '../src/index.js';
import { WORLDS } from '../src/worlds.js';
import { DELIMITER } from '../src/output-parser.js';
import { createBrowserTransport } from './progression-browser.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const label=process.argv[2]||'browser-transport-smoke';if(!/^[a-z0-9_.-]+$/i.test(label))throw Error('Invalid label');
const dir=path.join(root,'artifacts/progression-v080',label);if(fs.existsSync(path.join(dir,'result.json')))throw Error('Preserve old result');fs.mkdirSync(dir,{recursive:true});
const fixture={role:'narrator',model:'fixture-no-model',reasoningEffort:'none',health:{status:'ready'},async run(prompt,{onText,onEvent}){
 onEvent?.({type:'acp_config_applied',sessionId:'fixture-not-acp',model:'fixture-no-model',reasoningEffort:'none'});
 const text='他走进街边的茶铺，坐下来喝了一杯温水。窗外风平浪静，他打算按照自己的想法决定下一步。\n\n这只是测试浏览器是否能真实提交、收到流式正文并显示下一步选项的固定文本，不是模型生成。';
 for(const part of [text.slice(0,25),text.slice(25)]){onText?.(part);await new Promise(r=>setTimeout(r,100));}
 const tail=DELIMITER+JSON.stringify({choices:[{id:'leave',label:'离开茶铺'},{id:'rest',label:'继续休息'},{id:'practice',label:'练习吐纳'}],delta:{}});onText?.(tail);return{text:text+tail,sessionId:'fixture',runId:'fixture'};
}};
const runtime=createTgnLive({configOverrides:{port:0,remote:null,runtimeDir:path.join(root,'.runtime/progression-v080',label),databasePath:':memory:',publicDir:path.join(root,'public')},narrator:fixture,planner:fixture,worldAdapter:fixture});
let transport;try{
 await new Promise(resolve=>runtime.server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${runtime.server.address().port}`;
 const r=await fetch(base+'/api/games',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({worldId:WORLDS[0].id,powerId:WORLDS[0].powers[0].id,name:'测试玩家',language:'zh'})});const{game}=await r.json();
 transport=await createBrowserTransport({base,gameId:game.id,directory:dir});const turns=[];
 for(const action of ['开始我的故事','我先休息一下']){const result=await transport.submit(action);turns.push({client:result.client,turn:result.complete.turn.index});}
 if(turns.some(t=>!Number.isFinite(t.client.browserFirstPaintMs)||!Number.isFinite(t.client.choicesVisibleMs)||t.client.visual.enabledChoices!==3))throw Error('Missing measured browser paint/choices');
 const result={kind:'fixture-not-real-ACP',passed:true,turns};fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify({kind:'fixture-not-real-ACP',passed:false,error:e.message},null,2));throw e;}
finally{await transport?.close();await new Promise(r=>runtime.server.close(r));runtime.store.close();}
