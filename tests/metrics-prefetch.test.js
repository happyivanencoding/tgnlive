import test from 'node:test';
import assert from 'node:assert/strict';
import { GameStore } from '../src/store.js';
import { WORLDS, createSeedState } from '../src/worlds.js';

test('metrics keeps speculative planning separate from committed player requests', () => {
  const store = new GameStore(':memory:');
  try {
    const world = WORLDS[0];
    const game = store.createGame({name:'测试角色',title:'测试',worldId:world.id,powerId:world.powers[0].id,state:createSeedState(world,world.powers[0]),world});
    const add = (id,status,totalElapsedMs,kind) => store.insertTrace({id,gameId:game.id,requestId:id,status,totalElapsedMs,firstReaderVisibleMs:1000,startedAt:new Date().toISOString(),...(kind?{kind}:{})});
    add('turn-ok-1','complete',20000);add('turn-ok-2','complete',30000);add('turn-failed','failed',120000);
    add('prefetch-ok','complete',40000,'planner-prefetch');add('prefetch-cancelled','cancelled',15000,'planner-prefetch');
    const metrics = store.getMetrics(game.id);
    assert.equal(metrics.turns.length,5,'all raw phase traces remain observable');
    assert.equal(metrics.summary.requests,3);
    assert.equal(metrics.summary.completed,2);
    assert.equal(metrics.summary.failed,1);
    assert.equal(metrics.summary.cancelled,0);
    assert.equal(metrics.summary.averageTotalMs,25000,'background cost is not user waiting');
    assert.deepEqual(metrics.summary.backgroundPlanning,{requests:2,completed:1,failed:0,cancelled:1});
  } finally {store.close();}
});
