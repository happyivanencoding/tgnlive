import test from 'node:test';
import assert from 'node:assert/strict';
import { createTgnLive } from '../src/index.js';
import { buildNarratorPrompt } from '../src/prompts.js';
import { createSeedState, WORLDS } from '../src/worlds.js';
const world=WORLDS[0];
test('post-opening prompt uses current canon instead of replaying opening instructions',()=>{
  const game={name:'沈舟',version:4,turns:[],state:{...createSeedState(world,world.powers[0]),turnNumber:4,location:'河边'}};
  const prompt=buildNarratorPrompt({game,world,action:'继续'});
  assert.doesNotMatch(prompt,/"opening":\{/);
  assert.match(prompt,/触摸自己的铜钱不能读取远处药柜/);
  assert.match(prompt,/不能制造先前未出现物品|不代表此物真的存在/);
  assert.match(prompt,/先兑现本次具体行动的结果/);
});
test('encoding-damaged action fails before invoking provider and leaves canon untouched',async()=>{
  let calls=0;const adapter={role:'narrator',health:{status:'test-fixture'},async run(){calls++;throw new Error('must not run');}};
  const runtime=createTgnLive({configOverrides:{databasePath:':memory:',port:0},narrator:adapter,planner:adapter});
  await new Promise(resolve=>runtime.server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${runtime.server.address().port}`;
  try{
    const game=(await(await fetch(base+'/api/games',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'测试',worldId:world.id,powerId:world.powers[0].id})})).json()).game;
    const response=await fetch(`${base}/api/games/${game.id}/turns`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'\uFFFD坏文字',expectedVersion:0,requestId:'bad_utf8'})});
    assert.equal(response.status,400);assert.equal((await response.json()).code,'INVALID_ENCODING');assert.equal(calls,0);assert.equal(runtime.store.getGame(game.id).version,0);
  }finally{await new Promise(resolve=>runtime.server.close(resolve));runtime.store.close();}
});
