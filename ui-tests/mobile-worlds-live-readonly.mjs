import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TGN_TEST_BASE_URL || 'http://127.0.0.1:4317';
const output = 'artifacts/ui/mobile-v060/after-live';
await mkdir(output, { recursive:true });

const browser = await chromium.launch({ headless:true, executablePath:process.env.BROWSER_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:1 });
const result = { mode:'real-current-page-readonly-no-generation', base, startedAt:new Date().toISOString(), requests:[], checks:{}, errors:[] };
page.on('request', request => { if(request.url().includes('/api/')) result.requests.push({method:request.method(),url:request.url()}); });
page.on('pageerror', error => result.errors.push(error.message));

try {
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('#discover-view').waitFor();
  await page.screenshot({path:`${output}/home-390.png`,fullPage:false});
  result.checks.homeFits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
  result.checks.worldCards=await page.locator('.world-card').count()>0;
  const firstGame=page.locator('[data-game-id]').first();
  if(await firstGame.count()){
    result.gameId=await firstGame.getAttribute('data-game-id');
    await page.getByRole('button',{name:/书架/}).click();
    await page.locator(`[data-game-id="${result.gameId}"]`).click();
    await page.locator('#story-screen.active').waitFor();
    await page.locator('#narrative .turn-block').first().waitFor();
    await page.screenshot({path:`${output}/story-390.png`,fullPage:false});
    result.checks.storyFits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
    result.checks.existingGameResume=await page.locator('#narrative .turn-block').count()>0;
    result.checks.threeChoices=await page.locator('#suggested-actions .suggestion').count()===3;
    result.checks.dockDoesNotCoverEnd=await page.evaluate(()=>{
      const dock=document.querySelector('#action-area').getBoundingClientRect();
      const end=document.querySelector('#story-end').getBoundingClientRect();
      return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-height'))>=dock.height-1 && end.bottom<=document.documentElement.scrollHeight;
    });
  } else {
    result.checks.existingGameResume=false;
    result.errors.push('No existing game was available for read-only resume.');
  }
  result.checks.noMutationRequests=result.requests.every(request=>request.method==='GET');
  result.passed=Object.values(result.checks).every(Boolean)&&result.errors.length===0;
  if(!result.passed)process.exitCode=1;
} catch(error){result.error=error.message;result.passed=false;process.exitCode=1;await page.screenshot({path:`${output}/failure.png`,fullPage:false}).catch(()=>{});}
finally{result.endedAt=new Date().toISOString();await writeFile(`${output}/result.json`,JSON.stringify(result,null,2),'utf8');console.log(JSON.stringify(result));await browser.close();}
