import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createAcpRoleAdapter } from '../src/acp/role-adapter.js';

// Real v0.6.1 incident: a failed provider request waited indefinitely for session close.
// This is an offline fixture, not another model quality run.
test('an unavailable cleanup endpoint cannot indefinitely hide the original generation error',{timeout:7000},async()=>{
  const workspace=mkdtempSync(path.join(tmpdir(),'tgn-cleanup-'));
  const events=[]; const closed=[];
  const mcpClient={
    async initialize(){return {};},
    async callTool(name,args,{signal}={}){
      if(args.action==='new') return {session_id:'owned-fixture-session',config_options:[{id:'model',options:[{value:'fixture-model'}]}]};
      if(args.action==='set_config'&&args.config_id==='model') return {config_options:[{id:'reasoning_effort',options:[{value:'low'}]}]};
      if(args.action==='start') return {run_id:'owned-fixture-run'};
      if(args.action==='events') throw new Error('fixture connection lost');
      if(args.action==='close'){
        closed.push(args.session_id);
        assert.ok(signal,'cleanup needs its own finite deadline');
        return delay(10000,null,{signal});
      }
      return {};
    },
  };
  try{
    const adapter=createAcpRoleAdapter({role:'narrator',model:'fixture-model',reasoningEffort:'low',workspace,mcpClient});
    const started=performance.now();
    await assert.rejects(adapter.run('fixture only',{onEvent:e=>events.push(e)}),/fixture connection lost/);
    assert.ok(performance.now()-started<5500,'original error should surface after the bounded cleanup');
    assert.deepEqual(closed,['owned-fixture-session']);
    assert.ok(events.some(e=>e.type==='acp_cleanup_incomplete'&&e.sessionId==='owned-fixture-session'));
  }finally{rmSync(workspace,{recursive:true,force:true});}
});
