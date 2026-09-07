import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TGN_TEST_BASE_URL||'http://127.0.0.1:4318';
const label=process.env.TGN_UI_LABEL||`languages-live-${Date.now()}`;
const output=path.join(root,'artifacts','ui',label);await fs.mkdir(output);
const result={label,base,mode:'real-browser-real-local-API',startedAt:new Date().toISOString(),checks:{},warnings:[],errors:[],requests:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined});
const page=await browser.newPage({viewport:{width:390,height:844},locale:'en-US'});
page.on('pageerror',error=>result.errors.push(error.message));
page.on('requestfailed',request=>result.warnings.push({url:request.url(),message:request.failure()?.errorText}));
page.on('request',request=>{if(request.url().includes('/api/'))result.requests.push({method:request.method(),url:request.url()});});
async function fits(name){const value=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));result.checks[name]=value.width>=value.scrollWidth;assert.ok(result.checks[name],`${name} overflow: ${JSON.stringify(value)}`);}
try{
 await page.goto(base,{waitUntil:'networkidle'});await page.locator('#home-language').waitFor();
 assert.equal(await page.locator('#home-language').inputValue(),'zh');result.checks.freshChineseDespiteEnglishBrowser=true;
 for(const lang of ['zh','en','fr','es','ar']){
  if(lang!=='zh'){const response=page.waitForResponse(r=>r.url().includes('/api/worlds?language='+lang));await page.locator('#home-language').selectOption(lang);await response;await page.waitForTimeout(100);}
  await page.waitForFunction(expected=>document.documentElement.lang.startsWith(expected),lang);
  assert.equal(await page.locator('html').getAttribute('dir'),lang==='ar'?'rtl':'ltr');
  const box=await page.locator('#home-language').boundingBox();assert.ok(box&&box.y<110&&box.x>140,`${lang} selector is not top-right`);
  await fits(`${lang}HomeFits`);await page.screenshot({path:path.join(output,`home-${lang}-390.png`)});
  result.checks[`${lang}FiveOptions`]=await page.locator('#home-language option').count()===5;
  const visible=await page.locator('#discover-view').innerText();result[`${lang}HomeHanCount`]=(visible.match(/\p{Script=Han}/gu)||[]).length;
 }
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#home-language').inputValue(),'ar');result.checks.languagePersists=true;
 for(const [width,height] of [[360,800],[430,900],[844,390]]){await page.setViewportSize({width,height});await fits(`arabic${width}x${height}`);}
 await page.setViewportSize({width:390,height:844});
 const listing=await(await fetch(base+'/api/games')).json();const candidate=listing.games.find(g=>g.language==='ar'&&g.turnNumber>=2);assert.ok(candidate,'real Arabic two-turn game missing');result.gameId=candidate.id;
 await page.locator('.hub-tab[data-hub-view="shelf"]').click();await page.locator(`[data-game-id="${candidate.id}"]`).click();await page.locator('#story-screen.active').waitFor();await page.locator('#narrative .turn-block').first().waitFor();
 result.checks.arabicStoryDirection=await page.locator('#narrative .turn-block').last().locator('p[lang]').first().getAttribute('dir')==='rtl';
 result.checks.arabicInput=await page.locator('#custom-action').getAttribute('dir')==='rtl';
 await fits('arabicStoryFits');await page.screenshot({path:path.join(output,'story-ar-390.png')});
 await page.locator('#open-status').click();await page.locator('#status-drawer.open').waitFor();await page.screenshot({path:path.join(output,'status-ar-390.png')});await page.locator('#status-drawer .sheet-close').click();
 const before=await page.locator('#narrative').innerText();const draft='أحفظ هذه الفكرة حتى أعود إلى القصة.';await page.locator('#custom-action').fill(draft);
 await page.reload({waitUntil:'networkidle'});
 // Existing book hash restores the same story automatically after reload.
 await page.locator('#story-screen.active').waitFor();
 assert.equal(await page.locator('#custom-action').inputValue(),draft);assert.equal(await page.locator('#narrative').innerText(),before);result.checks.arabicDraftAndHistoryRestored=true;
 if(process.argv.includes('--play')){
  const current=(await(await fetch(base+`/api/games/${candidate.id}`)).json()).game;const started=performance.now();
  await page.locator('#custom-action').fill('أرفض ملاحقة الغرباء وأتدرب على موهبتي في مكان قريب مناسب، ثم أجرب فائدتها في فعل صغير.');
  await page.locator('#submit-action').click();await page.waitForFunction(n=>document.querySelectorAll('#narrative .turn-block:not(.provisional)').length===n&&!document.querySelector('#provisional-turn'),current.turns.length+1,{timeout:150000});
  const after=(await(await fetch(base+`/api/games/${candidate.id}`)).json()).game;assert.equal(after.version,current.version+1);assert.equal(after.turns.at(-1).language,'ar');
  result.realPlay={language:'ar',completeObservedMs:performance.now()-started,turn:after.turns.at(-1)};result.checks.realArabicBrowserAction=true;
  await fs.writeFile(path.join(output,'server-metrics.json'),JSON.stringify(await(await fetch(base+`/api/games/${candidate.id}/metrics`)).json(),null,2));
  await page.screenshot({path:path.join(output,'story-ar-after-live.png')});
 }
 if(!Object.values(result.checks).every(Boolean))throw new Error('A recorded UI contract failed');
 result.outcome=result.errors.length?'failed':result.warnings.length?'passed-with-network-warnings':'passed';
}catch(error){result.outcome='failed';result.error=error.message;process.exitCode=1;await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}
finally{result.endedAt=new Date().toISOString();result.limitations=['Chrome viewport emulation, not a physical Android/iPhone keyboard test.','Model timing comes from API/server traces; screenshots are not exact paint-time benchmarks.'];await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2),'utf8');console.log(JSON.stringify(result));await browser.close();}
