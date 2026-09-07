import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const publicRoot = new URL('../public/', import.meta.url);
const output = 'artifacts/ui/mobile-v060/after';
const contentTypes = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' };

const worlds = [
  { id:'ash-tide', title:'烬潮孤城', subtitle:'灵潮断绝后的第七年', description:'北境孤城被灰潮围困，你从一名无籍药徒开始，必须在宗门、军府与荒野之间争出活路。', genre:'玄幻', tags:['凡人流','城池求生'], sourceLabel:'原创世界', powerSystem:{ summary:'以灵息淬身，以命火破境', growth:'每次成长都来自真实修炼、资源与选择。', realms:[{name:'凡身',rank:0},{name:'引气',rank:1},{name:'燃脉',rank:2}] }, powers:[{id:'ember',name:'余烬听痕',description:'触碰冷物可听见短促旧声；过度使用会耳鸣失衡。'},{id:'debt',name:'命债簿',description:'看见尚未偿还的承诺，但不能强迫任何人履约。'},{id:'hollow',name:'空囊界',description:'短暂藏入一件随身小物，取出前不能再放入别物。'}] },
  { id:'sword-remnant', title:'剑墟问道', subtitle:'诸峰已坠，剑名仍活', description:'古剑宗覆灭后，散落的剑名会挑选新主人。你醒在收尸队里，身上只有一道无人承认的剑痕。', genre:'仙侠', tags:['剑修','宗门废墟'], sourceLabel:'原创世界', powerSystem:{ summary:'养剑名，立剑心，过剑劫', growth:'剑招不是奖励，必须从遗迹、师承与生死战中悟得。', realms:[{name:'听锋',rank:0},{name:'养意',rank:1},{name:'铸心',rank:2}] }, powers:[{id:'name',name:'无名剑契',description:'能暂借无主残剑一式，代价是承受它最后的败意。'},{id:'dust',name:'剑尘眼',description:'看见招式残留的轨迹，不能直接复制修为。'},{id:'sheath',name:'藏锋骨',description:'将一次锋芒藏入骨中，释放后需重新积蓄。'}] },
  { id:'unofficial-ninja', title:'赤月忍村异闻', subtitle:'熟悉的热血忍者感，全新人物与势力', description:'五座忍村签下脆弱停战，你是边境小队唯一活着回来的人。旧式热血忍者题材的非官方同人灵感，角色与故事原创。', genre:'热血', tags:['忍者灵感','非官方'], sourceLabel:'非官方同人灵感', powerSystem:{ summary:'查克印、体术与血契并行', growth:'通过训练、任务和代价掌握新印式。', realms:[{name:'见习',rank:0},{name:'执印',rank:1},{name:'上忍',rank:2}] }, powers:[{id:'moon',name:'赤月瞳痕',description:'能看清一次术式的结印顺序，不能复制血脉能力。'},{id:'thread',name:'影缝线',description:'让两个影子短暂相连，光线改变时立即断开。'},{id:'pulse',name:'逆脉',description:'短时反转一次体内伤势的恶化，结束后代价返回。'}] },
];

const longNarrative = (index) => `第${index}段旧事从山门一路延伸到雨夜。你没有得到凭空而来的力量，只从一次次判断里保住手中有限的筹码。\n\n石阶被雨洗得发亮，远处钟声落下。你记得自己为何来到这里，也知道下一步仍要亲自选择。`;
const existingGame = {
  id:'fixture-existing', name:'顾行舟', title:'顾行舟的《剑墟问道》', version:9, createdAt:'2026-09-07T05:00:00Z', updatedAt:'2026-09-07T06:00:00Z',
  state:{ realm:{name:'听锋',rank:0,progress:18}, location:'断剑坪', coins:7, currencyName:'灵铢', inventory:[{name:'缺口铁剑',qty:1}], relationships:[{name:'宁十三',role:'收尸队头领',attitude:'观望'}], goal:'查清身上剑痕的来历', power:{id:'name',name:'无名剑契',description:'暂借无主残剑一式。'}, turnNumber:8, facts:['古剑宗在十年前覆灭','断剑坪下仍有剑鸣'] },
  turns:Array.from({length:8},(_,i)=>({id:`old-${i+1}`,index:i+1,action:i ? '继续追查剑痕' : '开始我的故事',narrative:longNarrative(i+1),choices:[{id:'a',label:'沿着雨水冲出的剑痕下山，避开收尸队的盘问'},{id:'b',label:'当面询问宁十三为何认识这道无名剑契留下的旧伤'},{id:'c',label:'留在断剑坪，以缺口铁剑尝试回应地下越来越近的剑鸣'}],changes:[],createdAt:`2026-09-07T05:${String(i).padStart(2,'0')}:00Z`,chapterIndex:i<6?1:2}))
};
let games = [existingGame];
let worldFailures = 0;
let existingGameFailures = 0;
let turnRequests = 0;

function json(response, body, status = 200) { response.writeHead(status, { 'content-type':'application/json; charset=utf-8' }); response.end(JSON.stringify(body)); }
function readBody(request) { return new Promise((resolve, reject) => { let body=''; request.on('data',(chunk)=>body+=chunk); request.on('end',()=>{ try{resolve(JSON.parse(body||'{}'));}catch(error){reject(error);} }); request.on('error',reject); }); }
function gameSummary(game) { return { id:game.id,name:game.name,title:game.title,updatedAt:game.updatedAt,turnNumber:game.state.turnNumber,realm:game.state.realm }; }
function sendSse(response, events, delay = 45) {
  response.writeHead(200, { 'content-type':'text/event-stream; charset=utf-8', 'cache-control':'no-cache', connection:'keep-alive' });
  let index=0; const timer=setInterval(()=>{ if(index>=events.length){clearInterval(timer);response.end();return;} const event=events[index++]; response.write(`event: ${event.name}\ndata: ${JSON.stringify(event.data)}\n\n`); },delay);
  response.on('close',()=>clearInterval(timer));
}

const server = createServer(async (request,response) => {
  const url = new URL(request.url,'http://127.0.0.1'); const path=url.pathname; const method=request.method;
  try {
    if(path==='/api/health') return json(response,{ok:true,version:'ui-fixture-v060',provider:{name:'Fixture ACP',model:'fixture-model',status:'ready'}});
    if(path==='/api/worlds' && method==='GET') { if(worldFailures++===0) return json(response,{message:'fixture world list failure'},503); return json(response,{worlds}); }
    if(path==='/api/games' && method==='GET') return json(response,{games:games.map(gameSummary)});
    if(path==='/api/worlds/custom' && method==='POST') {
      const body=await readBody(request); const count=(server.worldAttempts ||= new Map()); const attempts=(count.get(body.prompt)||0)+1; count.set(body.prompt,attempts);
      if(body.prompt.includes('取消')) { response.writeHead(200,{'content-type':'text/event-stream; charset=utf-8'}); response.write('event: stage\ndata: {"name":"world_generation","status":"running","elapsedMs":320}\n\n'); const timer=setTimeout(()=>response.end(),5000); response.on('close',()=>clearTimeout(timer)); return; }
      if(body.prompt.includes('失败') && attempts===1) return sendSse(response,[{name:'stage',data:{name:'context_assembly',status:'running',elapsedMs:140}},{name:'error',data:{message:'世界规则没有通过校验，请重试。',code:'world_invalid',retryable:true}}]);
      const custom={...worlds[0],id:'custom-world',title:'星海天舟',subtitle:'以星核为道种，横渡破碎诸天',description:body.prompt,createdAt:new Date().toISOString(),sourceLabel:'你的原创世界'};
      return sendSse(response,[{name:'stage',data:{name:'queued',status:'running',elapsedMs:50}},{name:'stage',data:{name:'world_generation',status:'running',elapsedMs:740}},{name:'stage',data:{name:'parse_validate',status:'running',elapsedMs:1280}},{name:'complete',data:{world:custom,metrics:{totalElapsedMs:1450}}}],55);
    }
    if(path==='/api/games' && method==='POST') {
      const body=await readBody(request); const world=worlds.find(item=>item.id===body.worldId)||{...worlds[0],id:body.worldId,title:'星海天舟'}; const power=world.powers.find(item=>item.id===body.powerId)||world.powers[0];
      const game={id:'fixture-created',name:body.name,title:`${body.name}的《${world.title}》`,version:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),state:{realm:{name:world.powerSystem.realms[0].name,rank:0,progress:0},location:'故事尚未开始',coins:3,currencyName:'灵铢',inventory:[],relationships:[],goal:'活过第一夜',power,turnNumber:0},turns:[]}; games=[game,...games.filter(item=>item.id!==game.id)]; return json(response,{game});
    }
    const gameMatch=path.match(/^\/api\/games\/([^/]+)$/); if(gameMatch && method==='GET') { const gameId=decodeURIComponent(gameMatch[1]); if(gameId==='fixture-existing' && existingGameFailures++===0)return json(response,{message:'fixture game load failure'},503); const game=games.find(item=>item.id===gameId); return game?json(response,{game}):json(response,{message:'not found'},404); }
    const turnMatch=path.match(/^\/api\/games\/([^/]+)\/turns$/); if(turnMatch && method==='POST') {
      turnRequests+=1;
      const body=await readBody(request); const index=games.findIndex(item=>item.id===decodeURIComponent(turnMatch[1])); if(index<0)return json(response,{message:'not found'},404); const game=structuredClone(games[index]); const next=game.turns.length+1;
      const turn={id:`turn-${next}`,index:next,action:body.action,narrative:'矿井上方传来第三次闷响。你没有跟着逃散的人群冲向升降笼，而是贴住冰冷矿壁，听见星骸深处一声缓慢的搏动。\n\n掌心旧伤随之发亮，一条从未出现在矿图上的侧道浮出微光。',choices:[{id:'1',label:'进入侧道，先确认搏动来自活物还是矿脉'},{id:'2',label:'叫住守夜矿奴，交换彼此掌握的逃生路线'},{id:'3',label:'返回升降笼，用新发现换取监工手里的通行牌'}],changes:['听见星骸矿脉的第一次搏动','发现一条未记录的矿井侧道'],createdAt:new Date().toISOString(),chapterIndex:1};
      game.version+=1; game.updatedAt=new Date().toISOString(); game.state.turnNumber=next; game.state.location='星骸矿井·下层'; game.state.realm.progress=next*3; game.turns.push(turn); games[index]=game;
      return sendSse(response,[{name:'stage',data:{name:'context_assembly',status:'running',elapsedMs:60}},{name:'stage',data:{name:'narrative_generation',status:'running',elapsedMs:180}},{name:'text',data:{delta:'矿井上方传来第三次闷响。'}},{name:'text',data:{delta:'你贴住冰冷矿壁，听见星骸深处一声缓慢的搏动。'}},{name:'complete',data:{game,turn,metrics:{totalElapsedMs:520,firstReaderVisibleMs:260}}}],90);
    }
    const cancelMatch=path.match(/^\/api\/games\/([^/]+)\/cancel$/); if(cancelMatch && method==='POST') return json(response,{cancelled:true});
    const exportMatch=path.match(/^\/api\/games\/([^/]+)\/export$/); if(exportMatch) { response.writeHead(200,{'content-type':'text/markdown; charset=utf-8','content-disposition':'attachment; filename="story.md"'}); return response.end('# Fixture story'); }
    if(path.startsWith('/api/')) return json(response,{message:'not found'},404);
    const file=path==='/'?'index.html':path.slice(1); const body=await readFile(new URL(file,publicRoot)); response.writeHead(200,{'content-type':contentTypes[extname(file)]||'application/octet-stream'}); response.end(body);
  } catch(error) { json(response,{message:error.message},500); }
});

await mkdir(output,{recursive:true});
await new Promise(resolve=>server.listen(4318,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const result={mode:'deterministic-ui-contract-fixture-no-live-model',startedAt:new Date().toISOString(),checks:{},viewports:{},errors:[],limitations:['Fixture validates frontend contracts only; world creation and story generation are not real ACP calls.','Viewport emulation is not a physical phone keyboard test.']};
page.on('pageerror',error=>result.errors.push(error.message));

async function fits(label){result.viewports[label]=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,fits:document.documentElement.scrollWidth<=innerWidth,dockHeight:document.querySelector('#action-area')?.getBoundingClientRect().height||0}));if(!result.viewports[label].fits)throw new Error(`${label} horizontal overflow`);}
async function home(){await page.goto('http://127.0.0.1:4318',{waitUntil:'networkidle'});await page.locator('#discover-view').waitFor();}

try {
  await home();
  await page.locator('#world-error:not([hidden])').waitFor(); result.checks.worldApiFailureVisible=true;
  await page.getByRole('button',{name:'重新载入'}).click(); await page.locator('.world-card').first().waitFor(); result.checks.worldApiRetry=await page.locator('.world-card').count()===3;
  result.checks.honestSourceLabels=(await page.locator('.world-label').allTextContents()).includes('非官方同人灵感');
  for(const width of [360,390,430]){await page.setViewportSize({width,height:844});await fits(`${width}x844`);if(width===390)await page.screenshot({path:`${output}/home-390.png`,fullPage:false});}
  await page.setViewportSize({width:390,height:844}); await page.locator('.world-card').nth(2).click(); await page.locator('#onboarding-screen.active').waitFor(); result.checks.cardToPreview=await page.locator('#world-preview').getByRole('heading',{name:'赤月忍村异闻',exact:true}).isVisible(); result.checks.threePowers=await page.locator('.power-card').count()===3;
  await page.locator('#back-to-library').click(); await page.getByRole('button',{name:'创作',exact:true}).click(); result.checks.promptLimit=await page.locator('#world-prompt').getAttribute('maxlength')==='2000'&&(await page.locator('#prompt-count').innerText()).includes('2000');
  await page.locator('#world-prompt').fill('取消：一个需要长时间生成的世界'); await page.locator('#generate-world').click(); await page.locator('#world-generation:not([hidden])').waitFor(); result.checks.realStageAndElapsed=(await page.locator('#world-stage').innerText()).length>0&&(await page.locator('#world-elapsed').innerText()).includes('已用时'); await page.locator('#cancel-world').click(); await page.locator('#world-recovery:not([hidden])').waitFor(); result.checks.worldCancelRecovery=(await page.locator('#world-error-message').innerText()).includes('没有保存');
  await page.locator('#world-prompt').fill('失败后重试：星海天舟'); await page.locator('#generate-world').click(); await page.locator('#world-recovery:not([hidden])').waitFor(); result.checks.worldFailureVisible=(await page.locator('#world-error-message').innerText()).includes('没有通过校验'); await page.locator('#retry-world').click(); await page.locator('#onboarding-screen.active').waitFor(); result.checks.worldRetryPreview=await page.locator('#world-preview').getByRole('heading',{name:'星海天舟',exact:true}).isVisible();
  await page.locator('#hero-name').fill('陆沉'); await page.locator('.power-card').nth(1).click(); await page.locator('#adult-confirmation').check(); await page.locator('#create-game-button').click(); await page.locator('#narrative .turn-block').waitFor(); await page.getByText('本回合已写入正史。').waitFor(); result.checks.customWorldStart=await page.locator('#suggested-actions .suggestion').count()===3; result.checks.growthFeedback=await page.locator('#growth-feedback').isVisible(); await page.screenshot({path:`${output}/story-390.png`,fullPage:false});
  await page.locator('#open-status').click(); await page.locator('#status-drawer.open').waitFor(); result.checks.sheetCloseFocused=await page.locator('#status-drawer .sheet-close').evaluate(node=>node===document.activeElement); await page.keyboard.press('Tab'); result.checks.sheetFocusTrapped=await page.locator('#status-drawer .sheet-close').evaluate(node=>node===document.activeElement); await page.locator('#drawer-scrim').click({position:{x:2,y:2}}); result.checks.sheetRestoresFocus=await page.locator('#open-status').evaluate(node=>node===document.activeElement);
  await page.locator('#leave-story').click(); await page.getByRole('button',{name:/书架/}).click(); await page.locator('[data-game-id="fixture-existing"]').click(); await page.getByText(/无法打开书卷/).waitFor(); result.checks.gameApiFailureVisible=true; await page.locator('[data-game-id="fixture-existing"]').click(); await page.locator('#narrative .turn-block').first().waitFor(); result.checks.existingGameResume=await page.locator('#narrative .turn-block').count()===8; result.checks.longChoiceFits=await page.locator('#suggested-actions .suggestion').evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight&&node.getBoundingClientRect().height>=44)); await page.locator('#suggested-actions .suggestion').last().click({trial:true}); result.checks.longChoiceHitTarget=true;
  await page.locator('#custom-action').fill('这是一段只属于顾行舟的未提交草稿'); await page.reload({waitUntil:'networkidle'}); await page.locator('#story-screen.active').waitFor(); result.checks.draftRestored=(await page.locator('#custom-action').inputValue())==='这是一段只属于顾行舟的未提交草稿'; const beforeImeRequests=turnRequests; await page.locator('#custom-action').dispatchEvent('compositionstart'); await page.locator('#custom-action').press('Enter'); await page.locator('#custom-action').dispatchEvent('compositionend'); await page.waitForTimeout(80); result.checks.chineseImeNoSubmit=turnRequests===beforeImeRequests;
  await page.evaluate(()=>window.scrollTo(0,80)); await page.waitForTimeout(80); const beforeScroll=await page.evaluate(()=>scrollY); await page.locator('#suggested-actions .suggestion').first().click(); await page.waitForTimeout(260); const duringScroll=await page.evaluate(()=>scrollY); result.checks.readingPositionHeld=duringScroll<beforeScroll+160; await page.getByText('本回合已写入正史。').waitFor(); result.checks.backToLatestVisible=await page.locator('#back-to-latest').isVisible(); await page.locator('#back-to-latest').click(); await page.waitForTimeout(500); result.checks.backToLatestWorks=await page.evaluate(()=>document.documentElement.scrollHeight-(scrollY+innerHeight)<280);
  await page.locator('#story-menu').click(); await page.getByRole('button',{name:'阅读设置'}).click(); result.checks.readingSettings=await page.locator('#font-size-setting').isVisible(); await page.locator('#reading-settings .sheet-close').click();
  await page.evaluate(()=>{const viewport=window.visualViewport;window.__fixtureViewportHeight=410;try{Object.defineProperty(viewport,'height',{configurable:true,get:()=>window.__fixtureViewportHeight});}catch{}viewport.dispatchEvent(new Event('resize'));}); await page.locator('#custom-action').focus(); await page.evaluate(()=>window.visualViewport.dispatchEvent(new Event('resize'))); result.checks.keyboardCompact=await page.locator('body').evaluate(node=>node.classList.contains('keyboard-open')); result.checks.inputFontAtLeast16=await page.locator('#custom-action').evaluate(node=>parseFloat(getComputedStyle(node).fontSize)>=16); await page.locator('#custom-action').blur();
  await page.setViewportSize({width:844,height:390}); await fits('844x390-landscape'); result.checks.shortLandscapeDock=result.viewports['844x390-landscape'].dockHeight<=100;
  await page.emulateMedia({reducedMotion:'reduce'}); result.checks.reducedMotion=await page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('.provisional-label')||document.body,'::before').animationDuration||'0')<=0.001);
  result.passed=Object.values(result.checks).every(Boolean)&&Object.values(result.viewports).every(item=>item.fits)&&result.errors.length===0;
  if(!result.passed)process.exitCode=1;
} catch(error){result.error=error.message;result.passed=false;process.exitCode=1;await page.screenshot({path:`${output}/failure.png`,fullPage:true}).catch(()=>{});}
finally{result.endedAt=new Date().toISOString();await writeFile(`${output}/result.json`,JSON.stringify(result,null,2),'utf8');console.log(JSON.stringify(result));await browser.close();await new Promise(resolve=>server.close(resolve));}
