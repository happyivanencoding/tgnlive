import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baselineBase = process.env.TGN_BASELINE_URL || 'http://127.0.0.1:4318';
const publicRoot = new URL('../.runtime/progression-v080/baseline-source/public/', import.meta.url);
const output = 'artifacts/progression-v080/baseline-mobile';
const contentTypes = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' };

await mkdir(output, { recursive:true });
const health = await (await fetch(`${baselineBase}/api/health`)).json();
const listing = await (await fetch(`${baselineBase}/api/games`)).json();
assert.equal(health.version, '0.7.0', '4318 must remain the frozen v0.7.0 baseline');
assert.ok(listing.games?.length, '4318 baseline has no reachable game');
const gameId = listing.games.toSorted((left, right) => right.turnNumber - left.turnNumber)[0].id;
const sourceGame = (await (await fetch(`${baselineBase}/api/games/${encodeURIComponent(gameId)}`)).json()).game;
assert.ok(sourceGame?.turns?.length >= 6, 'baseline game needs enough history to test upward reading');

let fixtureGame = structuredClone(sourceGame);
const narrative = Array.from({ length:18 }, (_, index) => `第${index + 1}缕星尘沿着旧铜环的裂口亮起，你压住呼吸，分辨出矿道深处逐渐接近的回声。`).join('');
let streamNumber = 0;

function json(response, body, status = 200) {
  response.writeHead(status, { 'content-type':'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (error) { reject(error); } });
    request.on('error', reject);
  });
}

function streamTurn(response, body) {
  const nextGame = structuredClone(fixtureGame);
  const index = nextGame.turns.length + 1;
  const turn = {
    id:`fixture-stream-${++streamNumber}`,
    index,
    action:body.action,
    narrative,
    language:body.language || 'zh',
    choices:[
      { id:'next-a', label:'沿着回声进入星尘更密的侧道' },
      { id:'next-b', label:'停下脚步，把新发现告诉守在后方的人' },
      { id:'next-c', label:'退回旧平台，先验证铜环的变化是否稳定' },
    ],
    changes:['确认铜环能辨认矿道回声'],
    createdAt:new Date().toISOString(),
    chapterIndex:Math.ceil(index / 6),
  };
  nextGame.version += 1;
  nextGame.updatedAt = turn.createdAt;
  nextGame.state.turnNumber = index;
  nextGame.turns.push(turn);
  response.writeHead(200, { 'content-type':'text/event-stream; charset=utf-8', 'cache-control':'no-cache', connection:'keep-alive' });
  const events = [
    { name:'stage', data:{ name:'context_assembly', status:'running', elapsedMs:16 } },
    { name:'stage', data:{ name:'narrative_generation', status:'running', elapsedMs:42 } },
    ...narrative.match(/.{1,18}/gu).map(delta => ({ name:'text', data:{ delta } })),
    { name:'stage', data:{ name:'persistence', status:'running', elapsedMs:980 } },
    { name:'complete', data:{ game:nextGame, turn, metrics:{ totalElapsedMs:1040 } } },
  ];
  let eventIndex = 0;
  const timer = setInterval(() => {
    const event = events[eventIndex++];
    if (!event) { clearInterval(timer); fixtureGame = nextGame; response.end(); return; }
    response.write(`event: ${event.name}\ndata: ${JSON.stringify(event.data)}\n\n`);
  }, 22);
  response.on('close', () => clearInterval(timer));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const path = url.pathname;
  try {
    if (path === '/api/health') return json(response, { ...health, access:{ mode:'isolated-fixture' } });
    if (path === '/api/worlds') return json(response, { worlds:[] });
    if (path === '/api/games' && request.method === 'GET') return json(response, { games:[listing.games.find(game => game.id === gameId)] });
    if (path === `/api/games/${encodeURIComponent(gameId)}` && request.method === 'GET') return json(response, { game:fixtureGame });
    if (path === `/api/games/${encodeURIComponent(gameId)}/turns` && request.method === 'POST') return streamTurn(response, await readBody(request));
    if (path === `/api/games/${encodeURIComponent(gameId)}/cancel` && request.method === 'POST') return json(response, { cancelled:true });
    if (path.startsWith('/api/')) return json(response, { message:'not found' }, 404);
    const file = path === '/' ? 'index.html' : path.slice(1);
    const body = await readFile(new URL(file, publicRoot));
    response.writeHead(200, { 'content-type':contentTypes[extname(file)] || 'application/octet-stream' });
    response.end(body);
  } catch (error) {
    json(response, { message:error.message }, 500);
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const fixtureBase = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, executablePath:process.env.BROWSER_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 });
const result = {
  mode:'frozen-v0.7.0-public-with-isolated-stream-fixture',
  baselineBase,
  fixtureBase,
  gameId,
  sourceTurns:sourceGame.turns.length,
  startedAt:new Date().toISOString(),
  requests:[],
  errors:[],
  geometry:{},
  checks:{},
  limitations:[
    'The source game is read from frozen 4318 with GET only; streamed continuation is deterministic fixture text, not ACP/model output.',
    'Chrome viewport and rAF observations are browser approximations, not physical-phone pixel timings.',
  ],
};

page.on('pageerror', error => result.errors.push({ kind:'pageerror', message:error.message }));
page.on('requestfailed', request => result.errors.push({ kind:'requestfailed', url:request.url(), message:request.failure()?.errorText }));
page.on('request', request => { if (request.url().includes('/api/')) result.requests.push({ method:request.method(), url:request.url() }); });
await page.addInitScript(() => {
  window.__baselineScroll = { calls:[], events:[] };
  const nativeScrollTo = window.scrollTo.bind(window);
  window.scrollTo = (...args) => {
    const top = typeof args[0] === 'object' ? args[0].top : args[1];
    const behavior = typeof args[0] === 'object' ? args[0].behavior : undefined;
    window.__baselineScroll.calls.push({ at:performance.now(), from:scrollY, top, behavior });
    return nativeScrollTo(...args);
  };
  addEventListener('scroll', () => window.__baselineScroll.events.push({ at:performance.now(), y:scrollY }), { passive:true });
});

async function openStory() {
  await page.goto(`${fixtureBase}/?game=${encodeURIComponent(gameId)}`, { waitUntil:'networkidle' });
  await page.locator('#story-screen.active').waitFor();
  await page.locator('#narrative .turn-block').first().waitFor();
  await page.evaluate(() => window.scrollTo({ top:document.documentElement.scrollHeight, behavior:'instant' }));
  await page.waitForTimeout(80);
}

async function geometry() {
  return page.evaluate(() => {
    const dock = document.querySelector('#action-area').getBoundingClientRect();
    const narrative = document.querySelector('#narrative').getBoundingClientRect();
    return {
      width:innerWidth,
      height:innerHeight,
      scrollY,
      scrollHeight:document.documentElement.scrollHeight,
      bottomGap:document.documentElement.scrollHeight - (scrollY + innerHeight),
      dock:{ top:dock.top, bottom:dock.bottom, height:dock.height },
      narrative:{ top:narrative.top, bottom:narrative.bottom, height:narrative.height },
      readerFontSize:getComputedStyle(document.querySelector('#narrative')).fontSize,
      overflow:document.documentElement.scrollWidth - innerWidth,
    };
  });
}

async function sampleScrollUntilComplete(expectedTurns) {
  const samples = [];
  while (await page.locator('#provisional-turn').count()) {
    samples.push(await page.evaluate(() => ({ at:performance.now(), y:scrollY, bottomGap:document.documentElement.scrollHeight - (scrollY + innerHeight) })));
    await page.waitForTimeout(35);
  }
  await page.waitForFunction(count => document.querySelectorAll('#narrative .turn-block:not(.provisional)').length >= count, expectedTurns);
  samples.push(await page.evaluate(() => ({ at:performance.now(), y:scrollY, bottomGap:document.documentElement.scrollHeight - (scrollY + innerHeight) })));
  return samples;
}

try {
  await openStory();
  result.geometry.initialLatest = await geometry();
  await page.screenshot({ path:`${output}/old-latest-390.png`, fullPage:false });

  const originalTurns = sourceGame.turns.length;
  await page.locator('#suggested-actions .suggestion').first().click();
  await page.locator('#provisional-turn').waitFor();
  result.followingSamples = await sampleScrollUntilComplete(originalTurns + 1);
  result.geometry.afterFollowingStream = await geometry();
  result.followingTrace = await page.evaluate(() => window.__baselineScroll);
  result.checks.followingStayedLatest = result.geometry.afterFollowingStream.bottomGap < 280;
  await page.screenshot({ path:`${output}/old-following-after-stream-390.png`, fullPage:false });

  await openStory();
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await page.evaluate(top => window.scrollTo({ top, behavior:'instant' }), Math.max(0, maxScroll - 70));
  await page.mouse.wheel(0, -80);
  await page.waitForTimeout(100);
  result.geometry.userUpBefore = await geometry();
  await page.screenshot({ path:`${output}/old-user-up-before-stream-390.png`, fullPage:false });
  const beforeY = result.geometry.userUpBefore.scrollY;
  const beforeTurns = fixtureGame.turns.length;
  await page.locator('#suggested-actions .suggestion').first().click();
  await page.locator('#provisional-turn').waitFor();
  result.userUpSamples = await sampleScrollUntilComplete(beforeTurns + 1);
  result.geometry.userUpAfter = await geometry();
  result.userUpTrace = await page.evaluate(() => window.__baselineScroll);
  result.checks.userUpPositionHeld = Math.abs(result.geometry.userUpAfter.scrollY - beforeY) <= 8;
  result.checks.userUpDidNotJumpLatest = result.geometry.userUpAfter.bottomGap > 280;
  await page.screenshot({ path:`${output}/old-user-up-after-stream-390.png`, fullPage:false });
  result.status = Object.values(result.checks).every(Boolean) ? 'passed' : 'reproduced-scroll-defect';
} catch (error) {
  result.status = 'failed';
  result.error = error.message;
  process.exitCode = 1;
  await page.screenshot({ path:`${output}/failure.png`, fullPage:false }).catch(() => {});
} finally {
  result.endedAt = new Date().toISOString();
  await writeFile(`${output}/result.json`, JSON.stringify(result, null, 2), 'utf8');
  await writeFile('artifacts/progression-v080/mobile-progress.json', JSON.stringify({
    phase:'baseline-captured',
    at:result.endedAt,
    baseline:result.status,
    gameId,
    checks:result.checks,
    files:[`${output}/result.json`, `${output}/old-user-up-before-stream-390.png`, `${output}/old-user-up-after-stream-390.png`],
  }, null, 2), 'utf8');
  console.log(JSON.stringify(result));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
