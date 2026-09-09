import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const desktop=path.join(os.homedir(),'Desktop');
const file=fs.readdirSync(desktop).find(name=>/^key_ge.*ini\.txt$/i.test(name));
if(!file)throw Error('Gemini key file not found on Desktop');
const key=fs.readFileSync(path.join(desktop,file),'utf8').trim();
if(key.length<20)throw Error('Gemini key file looks invalid');
const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models',{headers:{'X-goog-api-key':key},signal:AbortSignal.timeout(30000)});
if(!response.ok)throw Error(`ListModels HTTP ${response.status}: ${(await response.text()).slice(0,800)}`);
const data=await response.json();
const rows=(data.models||[])
 .filter(model=>/gemini/i.test(model.name||'')&&(model.supportedGenerationMethods||[]).includes('generateContent'))
 .map(model=>({name:model.name?.replace(/^models\//,''),displayName:model.displayName,version:model.version,inputTokenLimit:model.inputTokenLimit,outputTokenLimit:model.outputTokenLimit}))
 .sort((a,b)=>a.name.localeCompare(b.name));
console.log(JSON.stringify(rows,null,2));
