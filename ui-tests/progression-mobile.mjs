import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baselineBase = process.env.TGN_BASELINE_URL || 'http://127.0.0.1:4318';
const publicRoot = new URL('../public/', import.meta.url);
const output = 'artifacts/progression-v080/mobile';
const contentTypes = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' };

await mkdir(output, { recursive:true });
const health = await (await fetch(`${baselineBase}/api/health`)).json();
const listing = await (await fetch(`${baselineBase}/api/games`)).json();
assert.equal(health.version, '0.7.0');
assert.ok(listing.games?.length, '4318 baseline has no game for the isolated UI fixture');
const gameId = listing.games.toSorted((left, right) => right.turnNumber - left.turnNumber)[0].id;
let fixtureGame = (await (await fetch(`${baselineBase}/api/games/${encodeURIComponent(gameId)}`)).json()).game;
assert.ok(fixtureGame?.turns?.length >= 6, 'fixture needs long existing history');

let streamIndex = 0;
const activeStreams = new Set();
const normalNarrative = Array.from({ length:24 }, (_, index) => `第${index + 1}点星辉沿铜环内侧缓慢移动，你没有离开原地，只把回声与矿壁裂纹逐一对照。`).join('');
const arabicNarrative = 'تتحرك نقطة ضوء على الحلقة القديمة ببطء. تبقى في مكانك وتقارن الصدى بشقوق الجدار حتى يظهر ممر آمن قصير.';

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

function summary(game) {
  return { id:game.id, name:game.name, title:game.title, updatedAt:game.updatedAt, turnNumber:game.state.turnNumber, realm:game.state.realm, language:game.language };
}

function sendTurn(request, response, body) {
  const cancelledFixture = body.action.includes('取消这次行动');
  const narrative = body.language === 'ar' ? arabicNarrative : normalNarrative;
  const nextGame = structuredClone(fixtureGame);
  const index = nextGame.turns.length + 1;
  const turn = {
    id:`progression-fixture-${++streamIndex}`,
    index,
    action:body.action,
    narrative,
    language:body.language || 'zh',
    choices:[
      { id:'next-a', label:body.language === 'ar' ? 'ادخل الممر القصير وافحص مصدر الضوء' : '进入短侧道，确认星辉来自矿脉还是活物' },
      { id:'next-b', label:body.language === 'ar' ? 'ابق في مكانك واختبر الحلقة مرة أخرى' : '留在原地，再用旧铜环验证一次回声方向' },
      { id:'next-c', label:body.language === 'ar' ? 'عد إلى المنصة وأخبر رفيقك بما وجدت' : '退回平台，把发现告诉仍在等候的同伴' },
    ],
    changes:[body.language === 'ar' ? 'تأكد وجود ممر قصير آمن' : '确认旧铜环能稳定辨认近处矿道回声'],
    createdAt:new Date().toISOString(),
    chapterIndex:Math.ceil(index / 6),
  };
  nextGame.version += 1; nextGame.updatedAt = turn.createdAt; nextGame.language = body.language || nextGame.language;
  nextGame.state.turnNumber = index; nextGame.turns.push(turn);
  response.writeHead(200, { 'content-type':'text/event-stream; charset=utf-8', 'cache-control':'no-cache', connection:'keep-alive' });
  const chunks = narrative.match(/.{1,16}/gu) || [narrative];
  const events = [
    { name:'stage', data:{ name:'validating', status:'running', elapsedMs:8 } },
    { name:'stage', data:{ name:'context_assembly', status:'running', elapsedMs:26 } },
    { name:'stage', data:{ name:'narrative_generation', status:'running', elapsedMs:58 } },
    ...chunks.map(delta => ({ name:'text', data:{ delta } })),
    { name:'stage', data:{ name:'persistence', status:'running', elapsedMs:920 } },
    { name:'complete', data:{ game:nextGame, turn, metrics:{ totalElapsedMs:980 } } },
  ];
  let eventIndex = 0;
  const stream = { cancelled:false };
  activeStreams.add(stream);
  const timer = setInterval(() => {
    if (stream.cancelled || response.destroyed) { clearInterval(timer); activeStreams.delete(stream); return; }
    if (cancelledFixture && eventIndex >= 3) return;
    const event = events[eventIndex++];
    if (!event) { clearInterval(timer); activeStreams.delete(stream); response.end(); return; }
    if (event.name === 'complete') fixtureGame = nextGame;
    response.write(`event: ${event.name}\ndata: ${JSON.stringify(event.data)}\n\n`);
  }, 24);
  request.on('close', () => { clearInterval(timer); activeStreams.delete(stream); });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1'); const path = url.pathname;
  try {
    if (path === '/api/health') return json(response, { ...health, access:{ mode:'isolated-fixture' } });
    if (path === '/api/worlds') return json(response, { worlds:[] });
    if (path === '/api/games' && request.method === 'GET') return json(response, { games:[summary(fixtureGame)] });
    if (path === `/api/games/${encodeURIComponent(gameId)}` && request.method === 'GET') return json(response, { game:fixtureGame });
    if (path === `/api/games/${encodeURIComponent(gameId)}/turns` && request.method === 'POST') return sendTurn(request, response, await readBody(request));
    if (path === `/api/games/${encodeURIComponent(gameId)}/cancel` && request.method === 'POST') {
      for (const stream of activeStreams) stream.cancelled = true;
      return json(response, { cancelled:true });
    }
    if (path === `/api/games/${encodeURIComponent(gameId)}/export`) {
      response.writeHead(200, { 'content-type':'text/markdown; charset=utf-8', 'content-disposition':'attachment; filename="fixture.md"' });
      return response.end('# Isolated fixture export');
    }
    if (path.startsWith('/api/')) return json(response, { message:'not found' }, 404);
    const file = path === '/' ? 'index.html' : path.slice(1); const body = await readFile(new URL(file, publicRoot));
    response.writeHead(200, { 'content-type':contentTypes[extname(file)] || 'application/octet-stream' }); response.end(body);
  } catch (error) { json(response, { message:error.message }, 500); }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, executablePath:process.env.BROWSER_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport:{ width:390, height:844 }, deviceScaleFactor:1, acceptDownloads:true });
const result = {
  mode:'isolated-browser-fixture-no-model-calls',
  fixtureSource:'GET-only frozen v0.7.0 game snapshot from 4318',
  gameId,
  base,
  startedAt:new Date().toISOString(),
  checks:{},
  viewports:{},
  geometry:{},
  timings:[],
  expectedAborts:[],
  unexpectedNetworkFailures:[],
  pageErrors:[],
  limitations:[
    'All streamed prose and state changes in this test are deterministic fixtures, not ACP/model output.',
    'requestAnimationFrame timing is a Chrome browser observation, not physical-phone pixel timing.',
    'visualViewport keyboard behavior is simulated; no Android or iOS device is attached.',
  ],
};
let cancelRequested = false;
page.on('pageerror', error => result.pageErrors.push(error.message));
page.on('requestfailed', request => {
  const failure = { url:request.url(), message:request.failure()?.errorText || 'unknown' };
  if (cancelRequested && request.url().endsWith('/turns') && failure.message.includes('ERR_ABORTED')) result.expectedAborts.push({ ...failure, initiatedBy:'UI stop button -> AbortController.abort()' });
  else result.unexpectedNetworkFailures.push(failure);
});

const check = (name, value, details) => {
  result.checks[name] = Boolean(value); if (details !== undefined) result[`${name}Details`] = details;
  assert.ok(value, `${name}${details === undefined ? '' : `: ${JSON.stringify(details)}`}`);
};

async function geometry() {
  return page.evaluate(() => {
    const dock = document.querySelector('#action-area').getBoundingClientRect();
    const growth = document.querySelector('#growth-feedback'); const growthRect = growth.hidden ? null : growth.getBoundingClientRect();
    return {
      width:innerWidth,
      height:innerHeight,
      scrollY,
      scrollHeight:document.documentElement.scrollHeight,
      bottomGap:document.documentElement.scrollHeight - (scrollY + innerHeight),
      dock:{ top:dock.top, bottom:dock.bottom, height:dock.height },
      growth:growthRect ? { top:growthRect.top, bottom:growthRect.bottom, height:growthRect.height } : null,
      overflow:document.documentElement.scrollWidth - innerWidth,
    };
  });
}

async function waitCommitted(count) {
  await page.waitForFunction(expected => document.querySelectorAll('#narrative .turn-block:not(.provisional)').length >= expected && !document.querySelector('#provisional-turn'), count, { timeout:30000 });
}

async function openStory() {
  await page.goto(`${base}/?game=${encodeURIComponent(gameId)}`, { waitUntil:'networkidle' });
  await page.locator('#story-screen.active').waitFor(); await page.locator('#narrative .turn-block').first().waitFor();
  await page.evaluate(() => window.scrollTo({ top:document.documentElement.scrollHeight, behavior:'instant' })); await page.waitForTimeout(100);
}

try {
  await openStory();
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height:844 }); await page.waitForTimeout(80);
    const value = await geometry(); result.viewports[`${width}x844`] = value; check(`fits${width}`, value.overflow <= 0, value);
  }
  await page.setViewportSize({ width:390, height:844 });

  await page.locator('#story-menu').click(); await page.locator('#open-reading-settings').click();
  check('fontRange12To24', await page.locator('#font-size-setting').getAttribute('min') === '12' && await page.locator('#font-size-setting').getAttribute('max') === '24');
  check('freshDefaultFont16', await page.locator('#font-size-setting').inputValue() === '16');
  await page.locator('#font-size-setting').fill('12');
  const hierarchy = await page.evaluate(() => ({
    narrative:parseFloat(getComputedStyle(document.querySelector('#narrative')).fontSize),
    choice:parseFloat(getComputedStyle(document.querySelector('.suggestion')).fontSize),
    title:parseFloat(getComputedStyle(document.querySelector('#story-title')).fontSize),
    status:parseFloat(getComputedStyle(document.querySelector('.status-summary p')).fontSize),
    input:parseFloat(getComputedStyle(document.querySelector('#custom-action')).fontSize),
  }));
  check('fontHierarchyAtMinimum', hierarchy.title > hierarchy.choice && hierarchy.choice > hierarchy.narrative && hierarchy.status < hierarchy.narrative && hierarchy.input >= 16, hierarchy);
  await page.locator('#reading-settings .sheet-close').click();
  const targets = await page.evaluate(() => ['#leave-story','#reader-toggle','#story-menu','#open-status','#submit-action'].map(selector => ({ selector, height:document.querySelector(selector).getBoundingClientRect().height })));
  check('primaryTouchTargetsAtLeast44', targets.every(target => target.height >= 43.5), targets);

  await page.evaluate(() => window.scrollTo({ top:document.documentElement.scrollHeight - innerHeight - 70, behavior:'instant' })); await page.mouse.wheel(0, -80); await page.waitForTimeout(120);
  result.geometry.lockedBefore = await geometry();
  const beforeY = result.geometry.lockedBefore.scrollY; const beforeCount = await page.locator('#narrative .turn-block:not(.provisional)').count();
  const anchor = await page.evaluate(() => {
    const headerBottom = document.querySelector('.story-header').getBoundingClientRect().bottom;
    const node = [...document.querySelectorAll('#narrative .turn-block:not(.provisional)')].find(item => item.getBoundingClientRect().bottom > headerBottom + 4);
    window.__progressionAnchorNode = node; return { key:node.dataset.turnKey, top:node.getBoundingClientRect().top };
  });
  await page.locator('#suggested-actions .suggestion').first().click();
  check('immediateFeedbackVisible', await page.locator('#generation-status').isVisible());
  await page.locator('#provisional-turn').waitFor(); await page.waitForTimeout(360);
  result.geometry.lockedDuring = await geometry();
  check('longStreamPositionHeld', Math.abs(result.geometry.lockedDuring.scrollY - beforeY) <= 8, { beforeY, duringY:result.geometry.lockedDuring.scrollY });
  await waitCommitted(beforeCount + 1); result.geometry.lockedAfter = await geometry();
  check('completePositionHeld', Math.abs(result.geometry.lockedAfter.scrollY - beforeY) <= 8, { beforeY, afterY:result.geometry.lockedAfter.scrollY });
  check('oldTurnNodePreserved', await page.evaluate(key => window.__progressionAnchorNode === [...document.querySelectorAll('#narrative .turn-block:not(.provisional)')].find(node => node.dataset.turnKey === key), anchor.key));
  check('backToLatestVisibleAfterActiveUpScroll', await page.locator('#back-to-latest').isVisible());
  check('threeNextChoicesClickable', await page.locator('#suggested-actions button:not(:disabled)').count() === 3);
  result.timings = await page.evaluate(() => window.tgnLive.getTimings());
  const firstTiming = result.timings[0];
  check('completeTimingHonestAndOrdered', firstTiming.outcome === 'complete' && firstTiming.immediateFeedbackPaintMs >= 0 && firstTiming.firstNarrativePaintMs > firstTiming.immediateFeedbackPaintMs && firstTiming.canonicalCompleteReceivedMs >= firstTiming.firstNarrativePaintMs && firstTiming.choicesReadyPaintMs >= firstTiming.canonicalCompleteReceivedMs, firstTiming);
  await page.screenshot({ path:`${output}/fixed-user-up-after-stream-390.png`, fullPage:false });

  await page.locator('#back-to-latest').click(); await page.waitForFunction(() => document.documentElement.scrollHeight - (scrollY + innerHeight) < 4, null, { timeout:2500 }); check('explicitBackToLatestWorks', (await geometry()).bottomGap < 4);
  const followCount = await page.locator('#narrative .turn-block:not(.provisional)').count(); await page.locator('#suggested-actions .suggestion').first().click(); await waitCommitted(followCount + 1); check('followingModeStaysLatest', (await geometry()).bottomGap < 4);
  result.geometry.growth = await geometry(); check('growthFeedbackDoesNotOverlayDock', result.geometry.growth.growth && result.geometry.growth.growth.bottom <= result.geometry.growth.dock.top + 1, result.geometry.growth);

  const cancelCount = await page.locator('#narrative .turn-block:not(.provisional)').count(); await page.locator('#custom-action').fill('取消这次行动'); await page.locator('#submit-action').click(); await page.locator('#generation-status').waitFor();
  cancelRequested = true; await page.locator('#stop-turn').click(); await page.getByText(/已确认停止|Stopped|Arrêt confirmé|Detenido|تأكد الإيقاف/).waitFor(); await page.waitForTimeout(120);
  check('cancelDoesNotCommit', await page.locator('#narrative .turn-block:not(.provisional)').count() === cancelCount);
  check('cancelKeepsDraftForRetry', (await page.locator('#custom-action').inputValue()) === '取消这次行动');
  const cancelTiming = (await page.evaluate(() => window.tgnLive.getTimings()))[0]; check('cancelTimingNotSuccessful', cancelTiming.outcome === 'cancelled' && cancelTiming.canonicalCompleteReceivedMs === undefined && cancelTiming.choicesReadyPaintMs === undefined, cancelTiming);
  check('abortAttributedToOwnCancel', result.expectedAborts.length === 1 && result.unexpectedNetworkFailures.length === 0, { expected:result.expectedAborts, unexpected:result.unexpectedNetworkFailures });
  cancelRequested = false;

  const beforeArabic = await page.locator('#narrative .turn-block:not(.provisional)').count(); await page.evaluate(() => window.tgnLive.setLanguage('ar')); await page.waitForFunction(() => document.documentElement.dir === 'rtl');
  await page.locator('#custom-action').fill('أفحص الحلقة القديمة من دون مغادرة مكاني.'); await page.locator('#submit-action').click(); await waitCommitted(beforeArabic + 1);
  check('mixedHistoryDirections', await page.locator('#narrative .turn-block').first().locator('p[lang]').first().getAttribute('dir') === 'ltr' && await page.locator('#narrative .turn-block').last().locator('p[lang]').first().getAttribute('dir') === 'rtl');
  check('arabicInputRtl', await page.locator('#custom-action').getAttribute('dir') === 'rtl');
  for (const language of ['zh','en','fr','es','ar']) {
    await page.evaluate(value => window.tgnLive.setLanguage(value), language); await page.waitForFunction(value => document.documentElement.lang.startsWith(value), language);
    const value = await geometry(); check(`${language}NoHorizontalOverflow`, value.overflow <= 0, value);
  }
  await page.evaluate(() => window.tgnLive.setLanguage('ar')); await page.screenshot({ path:`${output}/mixed-history-arabic-390.png`, fullPage:false });

  await page.evaluate(() => window.scrollTo({ top:Math.max(0, scrollY - 180), behavior:'instant' })); await page.mouse.wheel(0, -80); await page.waitForTimeout(100);
  const keyboardBefore = await geometry(); await page.locator('#custom-action').focus();
  await page.evaluate(() => { const viewport=window.visualViewport; window.__fixtureViewportHeight=410; try { Object.defineProperty(viewport,'height',{configurable:true,get:()=>window.__fixtureViewportHeight}); } catch {} viewport.dispatchEvent(new Event('resize')); });
  await page.waitForTimeout(120); const keyboardAfter = await geometry();
  check('keyboardCompactAndPositionHeld', await page.locator('body').evaluate(node => node.classList.contains('keyboard-open')) && Math.abs(keyboardAfter.scrollY - keyboardBefore.scrollY) <= 8, { keyboardBefore, keyboardAfter });
  await page.locator('#custom-action').blur();

  const imeCount = await page.locator('#narrative .turn-block:not(.provisional)').count(); await page.locator('#custom-action').fill('草稿 محفوظ'); await page.locator('#custom-action').dispatchEvent('compositionstart'); await page.locator('#custom-action').press('Enter'); await page.locator('#custom-action').dispatchEvent('compositionend'); await page.waitForTimeout(100);
  check('imeDoesNotSubmit', await page.locator('#narrative .turn-block:not(.provisional)').count() === imeCount);
  const draftBeforeReload = await page.evaluate(id => ({ input:document.querySelector('#custom-action').value, stored:localStorage.getItem(`tgn-live-draft:${id}`), href:location.href }), gameId);
  await page.reload({ waitUntil:'networkidle' }); await page.locator('#story-screen.active').waitFor(); const draftAfterReload = await page.evaluate(id => ({ input:document.querySelector('#custom-action').value, stored:localStorage.getItem(`tgn-live-draft:${id}`), href:location.href }), gameId); check('draftRestored', draftAfterReload.input === draftBeforeReload.input && draftAfterReload.stored === draftBeforeReload.stored, { draftBeforeReload, draftAfterReload });

  await page.evaluate(() => localStorage.setItem('tgn-live-reading', JSON.stringify({ fontSize:19, lineHeight:1.9, theme:'system' }))); await page.reload({ waitUntil:'networkidle' }); await page.locator('#story-screen.active').waitFor();
  await page.locator('#story-menu').click(); await page.locator('#open-reading-settings').click(); check('existingReadingSettingPreserved', await page.locator('#font-size-setting').inputValue() === '19'); await page.locator('#reading-settings .sheet-close').click();

  await page.evaluate(() => window.scrollTo({ top:Math.max(0, scrollY - 220), behavior:'instant' })); await page.mouse.wheel(0, -80); await page.waitForTimeout(100); const readerBefore = await geometry();
  const readerAnchorBefore = await page.evaluate(() => { const headerBottom=document.querySelector('.story-header').getBoundingClientRect().bottom; const node=[...document.querySelectorAll('#narrative .turn-block:not(.provisional)')].find(item=>item.getBoundingClientRect().bottom>headerBottom+4); window.__readerAnchor=node; return node.getBoundingClientRect().top; });
  await page.locator('#reader-toggle').click(); await page.waitForTimeout(120); const readerDuring = await geometry(); const readerAnchorDuring = await page.evaluate(() => window.__readerAnchor.getBoundingClientRect().top); await page.locator('#reader-toggle').click(); await page.waitForTimeout(120); const readerAfter = await geometry(); const readerAnchorAfter = await page.evaluate(() => window.__readerAnchor.getBoundingClientRect().top);
  check('readerModePreservesOldReadingPosition', Math.abs(readerAnchorDuring - readerAnchorBefore) <= 1 && Math.abs(readerAnchorAfter - readerAnchorBefore) <= 1 && await page.locator('#back-to-latest').isVisible(), { readerBefore, readerDuring, readerAfter, readerAnchorBefore, readerAnchorDuring, readerAnchorAfter });

  const downloadPromise = page.waitForEvent('download'); await page.evaluate(() => window.tgnLive.download('md')); const download = await downloadPromise; check('exportStillWorks', !(await download.failure()));
  check('noPageErrors', result.pageErrors.length === 0, result.pageErrors);
  result.status = 'passed';
} catch (error) {
  result.status = 'failed'; result.error = error.message; process.exitCode = 1;
  await page.screenshot({ path:`${output}/failure.png`, fullPage:false }).catch(() => {});
} finally {
  result.endedAt = new Date().toISOString();
  await writeFile('artifacts/progression-v080/mobile-result.json', JSON.stringify(result, null, 2), 'utf8');
  await writeFile('artifacts/progression-v080/mobile-progress.json', JSON.stringify({ phase:result.status === 'passed' ? 'ui-validation-passed' : 'ui-validation-failed', at:result.endedAt, checks:result.checks, error:result.error || null }, null, 2), 'utf8');
  console.log(JSON.stringify(result));
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
