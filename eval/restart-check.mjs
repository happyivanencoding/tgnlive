import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const mode=process.argv[2]||'check';
const m=JSON.parse(await readFile('artifacts/eval/final-adaptive-v031/manifest.json','utf8'));
const base='http://127.0.0.1:4317';
const game=(await(await fetch(`${base}/api/games/${m.gameId}`)).json()).game;
const health=await(await fetch(base+'/api/health')).json();
if(!game?.id||!health.ok)throw new Error('Cannot read actual saved game / health');
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const snapshot={at:new Date().toISOString(),gameId:game.id,version:game.version,turns:game.turns.length,stateHash:sha(game.state),turnsHash:sha(game.turns),appVersion:health.version};
await mkdir('artifacts/reports',{recursive:true});
if(mode==='capture'){await writeFile('artifacts/reports/restart-before.json',JSON.stringify(snapshot,null,2),'utf8');console.log(JSON.stringify(snapshot));}
else{const before=JSON.parse(await readFile('artifacts/reports/restart-before.json','utf8'));const passed=['gameId','version','turns','stateHash','turnsHash'].every(k=>before[k]===snapshot[k]);const result={passed,before,after:snapshot,scope:'Real server stop/restart; existing ten-turn game state and all prose compared by SHA256. No generation during this check.'};await writeFile('artifacts/reports/restart-check.json',JSON.stringify(result,null,2),'utf8');console.log(JSON.stringify(result));if(!passed)process.exitCode=1;}
