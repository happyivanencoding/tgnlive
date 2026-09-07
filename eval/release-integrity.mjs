// Read-only release verification. Saves counts/hashes, never private save contents.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [mode,label='v080']=process.argv.slice(2);
if(!['capture','check'].includes(mode)||!/^[a-z0-9_.-]+$/i.test(label))throw Error('capture|check safeLabel');
const dir=path.join(root,'artifacts/progression-v080');fs.mkdirSync(dir,{recursive:true});
const database=path.join(root,'data/tgn-live.sqlite');
const db=new DatabaseSync(database,{readOnly:true});const tables={};
try{
 db.exec('BEGIN');
 const existing=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name));
 for(const name of ['games','worlds','game_worlds','turns','canon_ledger','story_plans','chapters']){
  if(!existing.has(name))continue;
  const keys=db.prepare(`PRAGMA table_info(${name})`).all().filter(c=>c.pk).sort((a,b)=>a.pk-b.pk).map(c=>c.name);
  const rows=db.prepare(`SELECT * FROM ${name}${keys.length?' ORDER BY '+keys.join(','):''}`).all();
  const hash=createHash('sha256');for(const row of rows)hash.update(JSON.stringify(row)+'\n');
  tables[name]={rows:rows.length,sha256:hash.digest('hex')};
 }
 const integrity=db.prepare('PRAGMA quick_check').get();
 db.exec('COMMIT');
 const health=await(await fetch('http://127.0.0.1:4317/api/health',{signal:AbortSignal.timeout(5000)})).json();
 const snapshot={at:new Date().toISOString(),version:health.version,accessMode:health.access?.mode,tables,quickCheck:Object.values(integrity)[0],scope:'Read-only consistent database snapshot; no personal narrative or save content exported'};
 const baseline=path.join(dir,`${label}-release-before.json`);
 if(mode==='capture'){
  if(fs.existsSync(baseline))throw Error('Preserve prior capture; choose another label');
  fs.writeFileSync(baseline,JSON.stringify(snapshot,null,2));console.log(JSON.stringify(snapshot,null,2));
 }else{
  const before=JSON.parse(fs.readFileSync(baseline,'utf8'));
  const passed=JSON.stringify(before.tables)===JSON.stringify(tables)&&snapshot.quickCheck==='ok'&&snapshot.accessMode==='owner-only';
  const result={passed,before,after:snapshot};fs.writeFileSync(path.join(dir,`${label}-release-integrity.json`),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));if(!passed)process.exitCode=1;
 }
}finally{db.close();}
