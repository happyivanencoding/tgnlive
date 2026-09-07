import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createAcpRoleAdapter} from '../src/acp/role-adapter.js';
import {McpHttpClient} from '../src/acp/mcp-client.js';
const options=[{id:'model',options:[{value:'fixture'}]},{id:'reasoning_effort',options:[{value:'low'}]}];
const waitForAbort=signal=>new Promise((resolve,reject)=>{if(signal.aborted)reject(signal.reason);else signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});

test('setup timeout is separate from narrative timeout and never starts a prompt',async()=>{
 const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'tgn-setup-')),calls=[],events=[];
 const client={async initialize(){},async callTool(name,args,{signal}={}){
  calls.push(args.action);
  if(args.action==='new')return{session_id:'fixture-session',config_options:options};
  if(args.action==='set_mode')return waitForAbort(signal);
  if(args.action==='close')return{};
  throw Error('Unexpected model execution');
 }};
 const role=createAcpRoleAdapter({role:'narrator',model:'fixture',reasoningEffort:'low',workspace:cwd,mcpClient:client,setupTimeoutMs:35,timeoutMs:5000});
 const begin=performance.now();
 try{
  await assert.rejects(role.run('fixture',{onEvent:event=>events.push(event)}),{code:'PROVIDER_SETUP_TIMEOUT',retryable:true});
  assert.ok(performance.now()-begin<2000);assert.ok(!calls.includes('start'));assert.ok(calls.includes('close'));
  assert.ok(events.some(e=>e.type==='acp_setup_step'&&e.step==='read_only_mode'&&e.status==='failed'));
 }finally{fs.rmSync(cwd,{recursive:true,force:true});}
});

test('user cancellation during setup remains cancellation rather than retryable timeout',async()=>{
 const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'tgn-cancel-setup-')),controller=new AbortController();
 const client={async initialize({signal}){return waitForAbort(signal);},async callTool(){throw Error('No session should exist');}};
 const role=createAcpRoleAdapter({role:'narrator',model:'fixture',reasoningEffort:'low',workspace:cwd,mcpClient:client,setupTimeoutMs:5000});
 const timer=setTimeout(()=>controller.abort(),25);
 try{await assert.rejects(role.run('fixture',{signal:controller.signal}),{code:'CANCELLED',retryable:false});}
 finally{clearTimeout(timer);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('MCP initialization propagates abort to fetch and allows a later fresh initialize',async()=>{
 let blocked=true,calls=0;
 const client=new McpHttpClient({url:'http://fixture.invalid',tokenProvider:async()=> 'fixture-not-a-real-token',fetchImpl:async(url,init)=>{
  calls++;if(blocked)return waitForAbort(init.signal);
  const request=JSON.parse(init.body);return new Response(request.id?JSON.stringify({jsonrpc:'2.0',id:request.id,result:{}}):'',{status:request.id?200:202,headers:{'content-type':'application/json'}});
 }});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25);
 await assert.rejects(client.initialize({signal:controller.signal}));clearTimeout(timer);
 assert.equal(calls,1);blocked=false;
 await client.initialize({signal:AbortSignal.timeout(1000)});assert.equal(calls,3);
});

test('a completed setup has one measured step per preparation operation',async()=>{
 const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'tgn-measured-setup-')),events=[];
 const client={async initialize(){},async callTool(name,args){
  if(args.action==='new')return{session_id:'s',config_options:options};
  if(args.action==='set_config')return{config_options:options};
  if(args.action==='start')return{run_id:'r'};
  if(args.action==='events')return{status:'completed',events:[{type:'agent_message_chunk',update:{content:{type:'text',text:'fixture narrative'}}}]};
  return{};
 }};
 try{
  const result=await createAcpRoleAdapter({role:'narrator',model:'fixture',reasoningEffort:'low',workspace:cwd,mcpClient:client}).run('fixture',{onEvent:event=>events.push(event)});
  assert.equal(result.text,'fixture narrative');
  assert.deepEqual(events.filter(e=>e.type==='acp_setup_step'&&e.status==='complete').map(e=>e.step),['mcp_initialize','session_new','read_only_mode','model_select','effort_select']);
 }finally{fs.rmSync(cwd,{recursive:true,force:true});}
});
