import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='artifacts/ui/i18n-deployed-v070';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined});
const page=await browser.newPage({viewport:{width:390,height:844},locale:'en-US'});const result={mode:'deployed-production-browser-readonly',at:new Date().toISOString(),checks:{},requests:[],errors:[]};
page.on('request',r=>{if(r.url().includes('/api/'))result.requests.push({method:r.method(),url:r.url()});});page.on('pageerror',e=>result.errors.push(e.message));
try{
 const health=await(await fetch('http://127.0.0.1:4317/api/health')).json();assert.equal(health.version,'0.7.0');assert.equal(health.access.mode,'owner-only');result.version=health.version;
 await page.goto('http://127.0.0.1:4317',{waitUntil:'networkidle'});assert.equal(await page.locator('#home-language').inputValue(),'zh');
 for(const lang of ['zh','en','fr','es','ar']){await page.evaluate(l=>window.tgnLive.setLanguage(l),lang);const box=await page.locator('#home-language').boundingBox();assert.ok(box&&box.x>160&&box.y<100);assert.equal(await page.locator('html').getAttribute('dir'),lang==='ar'?'rtl':'ltr');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));result.checks[lang]=true;await page.screenshot({path:`${out}/home-${lang}.png`});}
 await page.locator('#continue-card button').click();await page.locator('#story-screen.active').waitFor();const paragraphs=page.locator('#narrative p[lang]');assert.ok(await paragraphs.count());assert.equal(await paragraphs.first().getAttribute('dir'),'ltr');result.checks.oldChineseParagraphUnchangedDirection=true;
 result.checks.noMutationRequests=result.requests.every(r=>r.method==='GET');assert.ok(result.checks.noMutationRequests);assert.equal(result.errors.length,0);result.status='passed';
}catch(e){result.status='failed';result.error=e.message;process.exitCode=1;}finally{await fs.writeFile(`${out}/report.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();}
