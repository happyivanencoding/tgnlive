import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.TGN_TEST_BASE_URL || 'http://127.0.0.1:4317';
const label=process.env.TGN_UI_LABEL || `mobile-live-${Date.now()}`;
const output=path.join(ROOT,'artifacts','ui',label); await mkdir(output,{recursive:true});
const result={label,mode:'real-Chrome-real-API-real-model-no-stubs',startedAt:new Date().toISOString(),checks:{},errors:[],paint:[],requests:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE || undefined});
const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
page.on('pageerror',e=>result.errors.push({kind:'pageerror',message:e.message}));
page.on('requestfailed',r=>result.errors.push({kind:'network',url:r.url(),message:r.failure()?.errorText}));
page.on('request',r=>{if(r.url().includes('/api/')) result.requests.push({method:r.method(),url:r.url()});});
await page.addInitScript(()=>{
  window.__paint={}; const original=window.fetch;
  window.fetch=function(...args){const url=typeof args[0]==='string'?args[0]:args[0]?.url;if(/\/turns$/.test(url||'')&&args[1]?.method==='POST')window.__paint={start:performance.now(),first:null};return original.apply(this,args);};
  window.addEventListener('DOMContentLoaded',()=>new MutationObserver(()=>{
    const text=document.querySelector('#provisional-turn p')?.textContent?.trim();
    if(text&&window.__paint.start&&window.__paint.first===null&&!text.includes('等待叙事首字'))requestAnimationFrame(()=>{if(window.__paint.first===null)window.__paint.first=performance.now();});
  }).observe(document.documentElement,{childList:true,subtree:true,characterData:true}));
});
async function committed(count){
  await page.waitForFunction(n=>{
    const e=document.querySelector('#turn-error');if(e&&!e.hidden&&e.textContent.trim())throw new Error(e.textContent.trim());
    return document.querySelectorAll('#narrative .turn-block:not(.provisional)').length>=n&&!document.querySelector('#provisional-turn');
  },count,{timeout:160000});
  result.paint.push(await page.evaluate(()=>({firstPaintMs:window.__paint.first?window.__paint.first-window.__paint.start:null,observedCommitMs:performance.now()-window.__paint.start})));
}
try{
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('.world-card').first().waitFor();
  await page.screenshot({path:path.join(output,'home-390.png')});
  await page.locator('.world-card').filter({hasText:'赤曜药州'}).click();
  await page.locator('#onboarding-screen.active').waitFor();
  result.checks.fanSourceVisible=(await page.locator('#world-preview').innerText()).includes('非官方');
  await page.locator('#hero-name').fill('林照');
  await page.locator('.power-card').first().click(); await page.locator('#adult-confirmation').check();
  await page.screenshot({path:path.join(output,'preview-390.png')});
  const created=page.waitForResponse(r=>r.url().endsWith('/api/games')&&r.request().method()==='POST');
  await page.locator('#create-game-button').click(); result.gameId=(await(await created).json()).game.id;
  await committed(1);
  result.checks.openingThreeChoices=await page.locator('#suggested-actions button').count()===3;
  result.checks.noMobileHorizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
  await page.screenshot({path:path.join(output,'story-390.png')});
  await page.locator('#custom-action').fill('我先不答应任何长期差事，试用自己已经掌握的天赋寻找眼前可争取的修炼机会；发现具体目标后就动手，不只问消息。');
  await page.locator('#custom-action').press('Enter'); await committed(2);
  await page.locator('#open-status').click(); await page.locator('#status-drawer.open').waitFor();
  await page.screenshot({path:path.join(output,'status-390.png')});
  const g=(await(await fetch(`${base}/api/games/${result.gameId}`)).json()).game;
  const active=g.state.capabilities?.find(x=>x.id===`power-${g.state.power.id}`)||g.state.power;
  result.checks.latestPowerDescription=(await page.locator('#status-drawer').innerText()).includes(active.description);
  await page.locator('#drawer-scrim').click({position:{x:2,y:2}});
  const text=await page.locator('#narrative').innerText();
  await page.locator('#custom-action').fill('这段草稿应在刷新后保留');
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#continue-card button').click();
  await page.locator('#story-screen.active').waitFor();
  result.checks.proseSurvivesReload=(await page.locator('#narrative').innerText())===text;
  result.checks.draftSurvivesReload=(await page.locator('#custom-action').inputValue())==='这段草稿应在刷新后保留';
  result.checks.exactlyTwoCommits=await page.locator('#narrative .turn-block:not(.provisional)').count()===2;
  const downloadPromise=page.waitForEvent('download');await page.evaluate(()=>window.tgnLive.download('md'));const download=await downloadPromise;
  await download.saveAs(path.join(output,'browser-export.md'));result.checks.exportSucceeded=!(await download.failure());
  const metrics=await(await fetch(`${base}/api/games/${result.gameId}/metrics`)).json();
  await writeFile(path.join(output,'server-metrics.json'),JSON.stringify(metrics,null,2));
  await writeFile(path.join(output,'game.json'),JSON.stringify(g,null,2));
  result.outcome=Object.values(result.checks).every(Boolean)&&result.errors.length===0?'passed':'issues_found';
  if(!Object.values(result.checks).every(Boolean))process.exitCode=1;
}catch(e){result.outcome='failed';result.error=e.message;process.exitCode=1;await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}
finally{result.endedAt=new Date().toISOString();result.limitations=['Desktop Chrome at 390x844; not physical Android/iOS.','Two fixed UI actions using real ACP narration; not an autonomous ACP player run.','No mocked endpoints, prose, or state.'];await writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();}
