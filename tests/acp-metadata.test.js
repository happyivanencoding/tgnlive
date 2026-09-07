import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createAcpRoleAdapter,isForbiddenProviderEvent} from '../src/acp/role-adapter.js';

test('an advertised command list is metadata, not a tool call or execution permission',()=>{
 assert.equal(isForbiddenProviderEvent({type:'available_commands_update',update:{sessionUpdate:'available_commands_update',availableCommands:[{name:'help',description:'Help'}]}}),false);
 for(const type of ['tool_call','tool_call_update','permission_request','command_execution','terminal','file_change','interaction_requested']){
  assert.equal(isForbiddenProviderEvent({type}),true);
  assert.equal(isForbiddenProviderEvent({type:'available_commands_update',update:{sessionUpdate:type}}),true);
 }
});
test('command metadata is ignored without entering narrative or dispatching any command',async()=>{
 const workspace=fs.mkdtempSync(path.join(os.tmpdir(),'tgn-metadata-'));
 const calls=[];const config_options=[{id:'model',options:[{value:'fixture'}]},{id:'reasoning_effort',options:[{value:'low'}]}];
 const mcpClient={async initialize(){},async callTool(name,args){calls.push({name,args});if(args.action==='new')return{session_id:'fixture-session',config_options};if(args.action==='set_config')return{config_options};if(args.action==='start')return{run_id:'fixture-run'};if(args.action==='events')return{status:'completed',has_more:false,events:[{seq:1,type:'available_commands_update',update:{sessionUpdate:'available_commands_update',availableCommands:[{name:'do-not-run',description:'metadata only'}]}},{seq:2,type:'agent_message_chunk',update:{_meta:{codex:{phase:'final_answer'}},content:{type:'text',text:'测试正文'}}},{seq:3,type:'completed'}]};return{};}};
 try{const role=createAcpRoleAdapter({role:'narrator',model:'fixture',reasoningEffort:'low',workspace,mcpClient});const result=await role.run('fixture');assert.equal(result.text,'测试正文');assert.ok(!calls.some(x=>x.args.action==='cancel'));assert.ok(calls.every(x=>['acp_session','acp_prompt'].includes(x.name)));}
 finally{fs.rmSync(workspace,{recursive:true,force:true});}
});
