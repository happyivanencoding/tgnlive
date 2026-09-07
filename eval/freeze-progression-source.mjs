import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const label=process.argv[2];if(!/^[a-z0-9_.-]+$/i.test(label||''))throw Error('Safe source label required');
const destination=path.join(root,'.runtime/progression-v080',`${label}-source`);
if(fs.existsSync(destination))throw Error('Do not overwrite a frozen experiment source');
fs.mkdirSync(destination,{recursive:true});
const files=[];
function copy(relative){const absolute=path.join(root,relative);for(const entry of fs.readdirSync(absolute,{withFileTypes:true})){const next=path.join(relative,entry.name);if(entry.isDirectory())copy(next);else if(entry.isFile()){const bytes=fs.readFileSync(path.join(root,next));const target=path.join(destination,next);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);files.push({path:next.replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}else throw Error('Only regular source files are allowed in a snapshot');}}
copy('src');copy('public');
const pkg=fs.readFileSync(path.join(root,'package.json'));fs.writeFileSync(path.join(destination,'package.json'),pkg);files.push({path:'package.json',bytes:pkg.length,sha256:createHash('sha256').update(pkg).digest('hex')});
files.sort((a,b)=>a.path.localeCompare(b.path));
const manifest={label,createdAt:new Date().toISOString(),workspaceHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),destination,sha256:createHash('sha256').update(JSON.stringify(files)).digest('hex'),files,excluded:['Private SQLite saves','Corpus and original texts','Runtime auth/config/secrets','Development agent state']};
fs.writeFileSync(path.join(destination,'source-manifest.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(root,'artifacts/progression-v080',`${label}-source-manifest.json`),JSON.stringify(manifest,null,2));console.log(JSON.stringify({label,destination,sha256:manifest.sha256,files:files.length}));
