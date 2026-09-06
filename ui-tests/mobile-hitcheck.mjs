import { readFile, writeFile } from 'node:fs/promises';
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const dir='artifacts/ui/final-live-v040b';
const run=JSON.parse(await readFile(dir+'/result.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});
const page=await browser.newPage({viewport:{width:390,height:844}});
const result={startedAt:new Date().toISOString(),mode:'real-saved-game-mobile-hit-testing-no-generation',gameId:run.game.id,checks:[]};
try{
  await page.goto('http://127.0.0.1:4317',{waitUntil:'networkidle'});
  await page.locator(`[data-game-id="${run.game.id}"]`).click();
  await page.locator('#suggested-actions button').first().waitFor();
  for(let i=0;i<3;i++){
    const button=page.locator('#suggested-actions button').nth(i);
    await button.scrollIntoViewIfNeeded();
    await button.click({trial:true,timeout:5000});
    result.checks.push({choice:i+1,visiblePointerTarget:true});
  }
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  await page.screenshot({path:dir+'/actions-mobile-viewport.png',fullPage:false});
  result.passed=true;
}catch(error){result.passed=false;result.error=error.message;process.exitCode=1;}
finally{result.endedAt=new Date().toISOString();await writeFile(dir+'/mobile-hitcheck.json',JSON.stringify(result,null,2),'utf8');await browser.close();console.log(JSON.stringify(result));}
