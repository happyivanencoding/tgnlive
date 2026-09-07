import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
const [mode]=process.argv.slice(2);if(!['before','after'].includes(mode))throw new Error('Usage: node eval/language-upgrade-saves.mjs before|after');
const dir='artifacts/reports/i18n-v070';fs.mkdirSync(dir,{recursive:true});
const snapshotFile=dir+'/production-before.json';
const db=new DatabaseSync('data/tgn-live.sqlite',{readOnly:true});
try{
 if(mode==='before'){
  assert.ok(!fs.existsSync(snapshotFile),'Do not overwrite the pre-deployment evidence');
  const snapshot={at:new Date().toISOString(),tables:{}};
  for(const table of ['games','turns','worlds','game_worlds','requests']){
   const columns=db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name);
   snapshot.tables[table]={columns,rows:db.prepare(`SELECT * FROM ${table} ORDER BY 1,2`).all()};
  }
  fs.writeFileSync(snapshotFile,JSON.stringify(snapshot,null,2));console.log(JSON.stringify({mode,counts:Object.fromEntries(Object.entries(snapshot.tables).map(([t,v])=>[t,v.rows.length]))}));
 }else{
  const snapshot=JSON.parse(fs.readFileSync(snapshotFile,'utf8'));const counts={};
  for(const [table,{columns,rows}] of Object.entries(snapshot.tables)){
   const current=db.prepare(`SELECT ${columns.map(c=>`"${c}"`).join(',')} FROM ${table} ORDER BY 1,2`).all();
   // No content hashes: compare the actual previously stored fields.
   assert.deepEqual(JSON.parse(JSON.stringify(current)),rows,`${table} pre-existing fields changed during upgrade`);counts[table]=rows.length;
  }
  for(const table of ['games','turns','worlds','requests'])assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE language!='zh'`).get().n,0,`${table}: old rows must default to zh`);
  const result={mode,at:new Date().toISOString(),originalRowsAndFieldsUnchanged:true,oldRowsDefaultToChinese:true,counts};fs.writeFileSync(dir+'/production-after.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }
}finally{db.close();}
