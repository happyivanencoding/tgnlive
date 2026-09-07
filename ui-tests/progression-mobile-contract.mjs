// Deterministic browser replay of already-committed ACP prose. No model calls.
// Isolated ephemeral loopback server: never binds the live or ACP evaluation ports.
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {installBrowserTimingRecorder} from '../eval/browser-timing-recorder.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'file:///C:/dev/agent-monitor/node_modules/playwright/index.mjs');
const label = process.argv[2];
if (!/^[a-z0-9_.-]+$/i.test(label || '')) throw Error('Supply a unique safe evidence label');
const source = path.resolve(process.env.TGN_UI_SOURCE || path.join(root, 'public'));
const evidence = path.join(root, 'artifacts/ui', label);
await fs.mkdir(evidence, { recursive: true });
try { await fs.access(path.join(evidence, 'result.json')); throw Error('Evidence label already used'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const snapshotPath = process.env.TGN_UI_REPLAY || path.join(root, '.runtime/progression-v080/ui-replay-source.json');
const snapshot = JSON.parse((await fs.readFile(snapshotPath, 'utf8')).replace(/^\uFEFF/, ''));
const original = snapshot.game || snapshot;
if (original.turns?.length < 5) throw Error('Need a saved real ACP game with at least five committed turns');
const replayTurn = structuredClone(original.turns.at(-1));
const before = structuredClone(original);
before.id = 'ui-progression-replay'; before.turns.pop(); before.version -= 1; before.state.turnNumber = before.turns.length;
// Replay-only game. State results come from the recorded turn; this is not a reducer or quality test.
let current = structuredClone(before), pending = null;
const requests = [];
const json = (res, value, status = 200) => { res.writeHead(status, {'content-type':'application/json; charset=utf-8'}); res.end(JSON.stringify(value)); };
const server = createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  try {
    if (u.pathname.startsWith('/api/')) requests.push({ method:req.method, path:u.pathname, at:new Date().toISOString() });
    if (u.pathname === '/api/health') return json(res, { ok:true, version:'recorded-prose-browser-replay', provider:{status:'configured',model:'NO-LIVE-MODEL'} });
    if (u.pathname === '/api/worlds') return json(res, { worlds:[original.world].filter(Boolean) });
    if (u.pathname === '/api/games') return json(res, { games:[{...current, turns:undefined, state:undefined, turnNumber:current.state.turnNumber, realm:current.state.realm}] });
    if (u.pathname === `/api/games/${before.id}`) return json(res, {game:current});
    if (u.pathname.endsWith('/cancel')) { if(pending){ pending.res.end(); pending=null; } return json(res,{cancelled:true}); }
    if (u.pathname.endsWith('/turns') && req.method === 'POST') {
      let text=''; for await (const part of req) text += part;
      const body = JSON.parse(text); res.writeHead(200, {'content-type':'text/event-stream; charset=utf-8','cache-control':'no-cache'}); res.flushHeaders();
      pending = {res,body};
      res.on('close',()=>{if(pending?.res===res)pending=null;});
      send('stage',{name:'context_assembly',status:'running',elapsedMs:1}); return;
    }
    if (u.pathname.startsWith('/api/')) return json(res,{message:'Unsupported replay route'},404);
    const name=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname.slice(1));
    const file=path.resolve(source,name);
    if(!file.startsWith(source+path.sep))return json(res,{message:'Not found'},404);
    const body=await fs.readFile(file);
    res.writeHead(200,{'content-type':{'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'}[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
  }catch(e){ if(!res.headersSent)json(res,{message:e.message},500);else res.end(); }
});
function send(name,data){if(!pending)throw Error('No pending replay request');pending.res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);}
function complete({longChoices=false,repair=false}={}){
  const turn={...structuredClone(replayTurn),action:pending.body.action};
  if(longChoices)turn.choices=turn.choices.map(c=>({...c,label:(c.label+' ').repeat(3).slice(0,155)}));
  if(repair)turn.narrative=turn.narrative.replace(/\n\n/g,'\n\n'+ '浪头打在石壁上，他重新选定了落脚处。\n\n');
  current={...structuredClone(original),id:before.id,turns:[...before.turns,turn]};
  send('stage',{name:'persistence',status:'running',elapsedMs:2});
  send('complete',{game:current,turn,metrics:{totalElapsedMs:3,fixtureOnly:true}});
  pending.res.end();pending=null;
}
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const result={label,source,mode:'deterministic-browser-replay-of-recorded-ACP-prose-NO-new-model',startedAt:new Date().toISOString(),sourceGameId:original.id,sourceTurn:replayTurn.index,checks:{},measurements:{},errors:[],limits:['Desktop Chrome viewports and synthetic viewport/gesture events, not physical Android/iOS.','Replayed text is real earlier ACP output, but all replay timings are synthetic and never model latency.','Animation-frame visibility is a browser observation, not hardware display paint timing.']};
let ctx,page;
async function open(width=390,height=844,language='zh'){
  if(pending){pending.res.end();pending=null;}
  if(ctx)await ctx.close(); current=structuredClone(before);
  ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  await ctx.addInitScript(installBrowserTimingRecorder);
  await ctx.addInitScript(lang=>{localStorage.setItem('tgn-live-language',lang);},language);
  page=await ctx.newPage();page.on('pageerror',e=>result.errors.push(e.message));
  await page.goto(`${base}/?game=${before.id}`,{waitUntil:'networkidle'});
  await page.locator('#story-screen.active').waitFor();await page.waitForTimeout(150);
}
async function metrics(){return page.evaluate(()=>({y:scrollY,height:document.documentElement.scrollHeight,viewport:innerHeight,dock:document.querySelector('#action-area').getBoundingClientRect().height,provisional:document.querySelector('#provisional-turn')?.getBoundingClientRect().height??null,last:document.querySelector('#narrative .turn-block:last-child')?.getBoundingClientRect().height??null,latest:!document.querySelector('#back-to-latest').hidden}));}
async function submit(){await page.locator('#suggested-actions button').first().click();await page.locator('#provisional-turn').waitFor();if(!pending)await page.waitForTimeout(30);}
async function emit(text,delay=25){const chunks=text.match(/[\s\S]{1,24}/g)||[];for(const delta of chunks){send('text',{delta});await page.waitForTimeout(delay);}await page.waitForTimeout(150);}
async function finish(options){complete(options);await page.waitForFunction(n=>document.querySelectorAll('#narrative .turn-block:not(.provisional)').length===n&&!document.querySelector('#provisional-turn'),original.turns.length);await page.waitForTimeout(250);}
async function test(name,fn){
  const selected=(process.env.TGN_UI_CASE||'').split(',').filter(Boolean);
  result.caseFilter=selected.length?selected:null;
  if(selected.length&&!selected.includes(name))return;
  try{await fn();}catch(e){result.errors.push(`${name}: ${e.message}`);result.checks[name]=false;await page?.screenshot({path:path.join(evidence,`${name}-failure.png`)}).catch(()=>{});}
}
try{
  await test('stablePreviewCommit',async()=>{
    await open();const idle=await metrics();
    await page.evaluate(()=>window.__firstHistoryNode=document.querySelector('#narrative .turn-block'));
    await submit();const waiting=await metrics();
    result.checks.historyNodeSurvivesSubmit=await page.evaluate(()=>window.__firstHistoryNode===document.querySelector('#narrative .turn-block'));
    await page.locator('#stop-turn').focus();await page.waitForTimeout(650);
    result.checks.stopFocusSurvivesTimer=await page.locator('#stop-turn').evaluate(n=>document.activeElement===n);
    await emit(replayTurn.narrative);const streaming=await metrics();
    await page.screenshot({path:path.join(evidence,'streaming-390.png')});
    await finish();const committed=await metrics();
    result.measurements.previewCommit={idle,waiting,streaming,committed,blockHeightDelta:committed.last-streaming.provisional,dockStartDelta:waiting.dock-idle.dock,dockCommitDelta:committed.dock-streaming.dock};
    result.checks.sameParagraphGeometry=Math.abs(committed.last-streaming.provisional)<3;
    result.checks.dockStableAcrossGeneration=Math.abs(waiting.dock-idle.dock)<3&&Math.abs(committed.dock-streaming.dock)<3;
    result.checks.historyNodeSurvivesCommit=await page.evaluate(()=>window.__firstHistoryNode===document.querySelector('#narrative .turn-block'));
    await page.screenshot({path:path.join(evidence,'committed-390.png')});
    const timing=await page.evaluate(()=>{const {startMono,...rest}=window.__tgnBrowserEvidence.at(-1);return rest;});
    result.measurements.recorder=timing;
    result.checks.independentBrowserRecorder=timing.status==='complete'&&timing.feedbackVisibleFrameMs>0&&timing.feedbackVisibleFrameMs<timing.firstNarrativeSseMs&&timing.firstNarrativeSseMs<=timing.firstNarrativeVisibleFrameMs&&timing.completeReceivedMs<=timing.choicesVisibleFrameMs;
  });
  await test('upwardNearBottomPauses',async()=>{
    await open();await submit();const cut=Math.floor(replayTurn.narrative.length*.7);await emit(replayTurn.narrative.slice(0,cut));await page.waitForTimeout(500);
    // Real wheel input, only 120px from the bottom: old implementation treats this as "still following".
    await page.mouse.move(180,330);await page.mouse.wheel(0,-120);await page.waitForTimeout(250);const paused=await metrics();
    await emit(replayTurn.narrative.slice(cut));await page.waitForTimeout(350);const after=await metrics();
    result.measurements.nearBottomPause={paused,after,unexpectedY:after.y-paused.y};
    result.checks.upwardNearBottomPauses=Math.abs(after.y-paused.y)<3;
    await finish({longChoices:true});const end=await metrics();result.measurements.nearBottomPause.committed=end;
    result.checks.longChoicesDoNotPullReader=Math.abs(end.y-paused.y)<3;
    result.checks.latestButtonAfterUserPause=await page.locator('#back-to-latest').isVisible();
    if(await page.locator('#back-to-latest').isVisible()){await page.locator('#back-to-latest').click();await page.waitForTimeout(650);const m=await metrics();result.checks.explicitLatestWorks=m.height-(m.y+m.viewport)<4;}
  });
  await test('oldParagraphAnchor',async()=>{
    await open();await submit();await emit(replayTurn.narrative.slice(0,120));
    await page.mouse.move(180,330);await page.mouse.wheel(0,-1800);await page.waitForTimeout(600);
    const anchor=await page.evaluate(()=>{const nodes=[...document.querySelectorAll('#narrative .turn-block:not(.provisional) p:not(.turn-meta)')];const node=nodes.find(n=>n.getBoundingClientRect().bottom>110&&n.getBoundingClientRect().top<400);window.__anchor=node;return{top:node?.getBoundingClientRect().top,y:scrollY};});
    await emit(replayTurn.narrative.slice(120));await finish({repair:true});
    const after=await page.evaluate(()=>({connected:window.__anchor?.isConnected,top:window.__anchor?.getBoundingClientRect().top,y:scrollY}));
    result.measurements.oldAnchor={before:anchor,after};
    result.checks.oldParagraphAnchor=Boolean(after.connected&&Number.isFinite(anchor.top)&&Math.abs(after.top-anchor.top)<3);
  });
  await test('offscreenTelemetry',async()=>{
    await open();await page.mouse.move(180,330);await page.mouse.wheel(0,-100000);await page.waitForTimeout(450);
    await submit();await emit(replayTurn.narrative);await finish();
    const recorded=await page.evaluate(()=>{
      const internal=window.tgnLive?.getBrowserTimings?.()??window.tgnLive?.getTimings?.()??[];
      const timing=internal[0]??null;
      return {newTurnTop:document.querySelector('#narrative .turn-block:last-child').getBoundingClientRect().top,
        independentFirstVisible:window.__tgnBrowserEvidence.at(-1).firstNarrativeVisibleFrameMs,
        applicationHasTiming:Boolean(timing),applicationFirstVisible:timing?.firstNarrativeVisibleFrameMs??timing?.firstNarrativePaintMs??null};
    });
    result.measurements.offscreen=recorded;
    result.checks.offscreenNotCountedByRecorder=recorded.newTurnTop>844&&recorded.independentFirstVisible===null;
    result.checks.productOffscreenTimingHonest=recorded.applicationHasTiming&&recorded.applicationFirstVisible===null;
    if(await page.locator('#back-to-latest').isVisible()){
      await page.locator('#back-to-latest').click();
      await page.waitForFunction(()=>document.documentElement.scrollHeight-(scrollY+innerHeight)<4,null,{timeout:4000});
      await page.waitForTimeout(100);
      result.checks.recorderSeesTextAfterExplicitLatest=Number.isFinite(await page.evaluate(()=>window.__tgnBrowserEvidence.at(-1).firstNarrativeVisibleFrameMs));
      result.measurements.afterExplicitLatest=await page.evaluate(()=>({y:scrollY,viewport:innerHeight,lastParagraph:[...document.querySelectorAll('#narrative .turn-block:last-child p')].at(-1)?.getBoundingClientRect().toJSON(),growth:document.querySelector('#growth-feedback').getBoundingClientRect().toJSON(),dock:document.querySelector('#action-area').getBoundingClientRect().toJSON()}));
      if(!result.checks.recorderSeesTextAfterExplicitLatest)await page.screenshot({path:path.join(evidence,'latest-reading-390.png')});
    }
  });
  await test('fontsTargetsLanguages',async()=>{
    for(const width of [360,390,430]){
      await open(width);await page.locator('#story-menu').click();await page.locator('#open-reading-settings').click();
      const min=Number(await page.locator('#font-size-setting').getAttribute('min'));
      await page.locator('#font-size-setting').evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},min);
      await page.locator('#reading-settings .sheet-close').click();
      const measured=await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,body:parseFloat(getComputedStyle(document.querySelector('#narrative')).fontSize),input:parseFloat(getComputedStyle(document.querySelector('#custom-action')).fontSize),targets:['#submit-action','#open-status','#leave-story','#reader-toggle','#story-menu'].map(s=>({selector:s,height:document.querySelector(s).getBoundingClientRect().height,width:document.querySelector(s).getBoundingClientRect().width}))}));
      result.measurements[`mobile-${width}`]=measured;
      result.checks[`smallReadable-${width}`]=min<=13&&measured.body===min&&measured.input>=16;
      result.checks[`targets-${width}`]=measured.targets.every(r=>r.height>=44&&r.width>=44);
      result.checks[`noOverflow-${width}`]=measured.overflow<=0;
      if(width===390)await page.screenshot({path:path.join(evidence,'small-font-390.png')});
      await page.reload({waitUntil:'networkidle'});const persisted=await page.locator('#narrative').evaluate(n=>parseFloat(getComputedStyle(n).fontSize));result.checks[`fontPersists-${width}`]=persisted===min;
    }
    await open(360,844,'ar');result.checks.arabicRetained=await page.evaluate(()=>document.documentElement.dir==='rtl'&&document.querySelector('#narrative p[lang="zh"]')?.dir==='ltr'&&document.documentElement.scrollWidth<=innerWidth);
    await page.locator('#custom-action').fill('مسودة محفوظة');await page.reload({waitUntil:'networkidle'});result.checks.arabicDraftRetained=(await page.locator('#custom-action').inputValue())==='مسودة محفوظة';
    await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);const landscape=await metrics();result.measurements.landscape=landscape;result.checks.compactLandscape=landscape.dock<=110;
  });
  await test('keyboardAndIme',async()=>{
    await open();await page.locator('#custom-action').fill('不应提交的输入法草稿');const n=requests.filter(x=>x.path.endsWith('/turns')).length;
    await page.locator('#custom-action').dispatchEvent('compositionstart');await page.locator('#custom-action').press('Enter');await page.locator('#custom-action').dispatchEvent('compositionend');await page.waitForTimeout(100);
    result.checks.imePreserved=requests.filter(x=>x.path.endsWith('/turns')).length===n;
    await page.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,get:()=>410});window.visualViewport.dispatchEvent(new Event('resize'));});
    await page.waitForTimeout(150);const m=await page.evaluate(()=>({compact:document.body.classList.contains('keyboard-open'),bottom:document.querySelector('#action-area').getBoundingClientRect().bottom,inputBottom:document.querySelector('#custom-action').getBoundingClientRect().bottom}));result.measurements.keyboard=m;result.checks.keyboardVisible=m.compact&&m.inputBottom<=411;
    await page.emulateMedia({reducedMotion:'reduce'});result.checks.reducedMotion=await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior==='auto');
  });
}finally{
  result.endedAt=new Date().toISOString();result.passed=Object.values(result.checks).every(Boolean)&&result.errors.length===0;result.requests=requests;
  await fs.writeFile(path.join(evidence,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  if(pending){pending.res.end();pending=null;}await browser.close();await new Promise(resolve=>server.close(resolve));
  if(!result.passed)process.exitCode=1;
}
