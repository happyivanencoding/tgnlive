import fs from 'node:fs';
import path from 'node:path';

/** Submit the ACP player's action through the real mobile UI. No mocked responses.
 * SSE receipt is observed using a response clone; paint numbers come separately
 * from the application's rAF instrumentation. This is Chrome emulation, not a
 * physical phone, WAN measurement, screenshot paint oracle or human retention test.
 */
export async function createBrowserTransport({ base, gameId, directory, signal, width = 390 }) {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'file:///C:/dev/agent-monitor/node_modules/playwright/index.mjs');
  const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport:{ width, height:844 }, deviceScaleFactor:1, isMobile:true, hasTouch:true, locale:'zh-CN', reducedMotion:'reduce' });
  const page = await context.newPage();
  const problems=[];
  page.on('pageerror', e=>problems.push({type:'pageerror',message:e.message,at:new Date().toISOString()}));
  page.on('requestfailed', r=>problems.push({type:'requestfailed',url:r.url(),failure:r.failure(),at:new Date().toISOString()}));
  await page.addInitScript(()=>{
    window.__tgnEvalReceipts=[];
    const original=window.fetch.bind(window);
    window.fetch=async function(input,init){
      const url=typeof input==='string'?input:input.url;
      if(!/\/api\/games\/[^/]+\/turns(?:\?|$)/.test(url)||init?.method!=='POST')return original(input,init);
      const sent=performance.now(),body=JSON.parse(init.body);
      const entry={requestId:body.requestId,requestStartedAt:sent,action:body.action,firstByteMs:null,firstSseMs:null,firstNarrativeMs:null,completeMs:null,totalMs:null,stageEvents:[],textEvents:0,complete:null,error:null,done:false};
      window.__tgnEvalReceipts.push(entry);
      let response;try{response=await original(input,init);entry.firstByteMs=performance.now()-sent;entry.httpStatus=response.status;}catch(e){entry.error=e.message;entry.done=true;throw e;}
      const clone=response.clone();
      void (async()=>{
        const reader=clone.body.getReader(),decoder=new TextDecoder();let buffer='';
        function frame(raw){
          if(!raw.trim()||raw.trim().startsWith(':'))return;
          const lines=raw.split('\n'),type=(lines.find(l=>l.startsWith('event:'))||'event:message').slice(6).trim(),data=lines.filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(!data)return;
          const value=JSON.parse(data),elapsed=performance.now()-sent;
          if(entry.firstSseMs===null)entry.firstSseMs=elapsed;
          if(type==='stage')entry.stageEvents.push({...value,clientElapsedMs:elapsed});
          if(type==='text'){entry.textEvents++;if(entry.firstNarrativeMs===null&&value.delta?.trim())entry.firstNarrativeMs=elapsed;}
          if(type==='complete'){entry.complete=value;entry.completeMs=elapsed;}
          if(type==='error')entry.error=value;
        }
        try{while(true){const{done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true}).replace(/\r\n/g,'\n');let at;while((at=buffer.indexOf('\n\n'))>=0){frame(buffer.slice(0,at));buffer=buffer.slice(at+2);}}buffer+=decoder.decode();if(buffer.trim())frame(buffer);}catch(e){entry.error=entry.error||e.message;}finally{entry.totalMs=performance.now()-sent;entry.done=true;}
      })();
      return response;
    };
  });
  await page.goto(`${base}/?game=${encodeURIComponent(gameId)}`,{waitUntil:'networkidle',timeout:30000});
  await page.locator('#story-screen').waitFor({state:'visible'});
  await page.locator('#custom-action').waitFor({state:'visible'});
  const metadata={kind:'real-UI-HTTP-ACP',browser:await browser.version(),viewport:{width,height:844},physicalDevice:false,wan:false,paintMethod:'application requestAnimationFrame approximation, separate from SSE clone receipt',startedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(directory,'browser.json'),JSON.stringify(metadata,null,2));
  const abort=()=>void context.close().catch(()=>{});
  signal?.addEventListener('abort',abort,{once:true});
  return {
    async submit(action){
      signal?.throwIfAborted();
      const before=await page.evaluate(()=>window.__tgnEvalReceipts.length);
      await page.locator('#custom-action').fill(action);
      // Native form click; no direct API bypass and no scripted reward route.
      await page.locator('#submit-action').click();
      await page.waitForFunction(n=>window.__tgnEvalReceipts[n]?.done,before,{timeout:300000});
      const receipt=await page.evaluate(n=>window.__tgnEvalReceipts[n],before);
      const {complete,...client}=receipt;
      if(!complete?.game||!complete?.turn||receipt.error){const e=Error(`Browser turn failed: ${JSON.stringify(receipt.error||'No committed complete event')}`);e.client=client;throw e;}
      await page.waitForFunction(id=>window.tgnLive?.getTimings?.().some(t=>t.requestId===id&&t.outcome==='complete'),receipt.requestId,{timeout:10000});
      const timing=await page.evaluate(id=>window.tgnLive.getTimings().find(t=>t.requestId===id),receipt.requestId);
      const visual=await page.evaluate(()=>{
        const dock=document.querySelector('#action-area').getBoundingClientRect();const buttons=[...document.querySelectorAll('#suggested-actions button')];
        return{scrollY:scrollY,documentHeight:document.documentElement.scrollHeight,viewportHeight:innerHeight,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,choiceCount:buttons.length,enabledChoices:buttons.filter(b=>!b.disabled).length,choiceRects:buttons.map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,visible:r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth};}),dock:{top:dock.top,height:dock.height},proseParagraphs:document.querySelectorAll('.narrative-text p').length};
      });
      client.browserTiming=timing;client.browserFirstPaintMs=timing.firstNarrativePaintMs??null;client.choicesVisibleMs=timing.choicesReadyPaintMs??null;client.visual=visual;
      if([1,9,18].includes(complete.turn.index))await page.screenshot({path:path.join(directory,`browser-turn-${String(complete.turn.index).padStart(2,'0')}.png`)});
      return{complete,client};
    },
    async close(){signal?.removeEventListener('abort',abort);fs.writeFileSync(path.join(directory,'browser-errors.json'),JSON.stringify(problems,null,2));await browser.close();},
  };
}
