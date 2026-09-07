// Browser-only test instrumentation. No model calls, no data exfiltration, no product mutations.
// Two consecutive visible frames are a measurement proxy, not hardware display paint.
export function installBrowserTimingRecorder() {
  localStorage.setItem('tgn-live-language','zh');
  window.__tgnBrowserEvidence=[];
  let intentAt=null;
  document.addEventListener('click',e=>{if(e.target.closest?.('#submit-action,#suggested-actions button,#retry-turn'))intentAt=performance.now();},true);
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(...args)=>{
    const route=String(args[0] instanceof Request?args[0].url:args[0]);
    if(!/\/api\/games\/[^/]+\/turns(?:\?|$)/.test(route))return nativeFetch(...args);
    const started=performance.now(),body=JSON.parse(args[1]?.body||'{}');
    const rec={requestId:body.requestId,startedAt:new Date().toISOString(),startMono:intentAt??started,requestStartMs:null,responseHeadersMs:null,firstReadByteMs:null,firstSseMs:null,firstNarrativeSseMs:null,firstNarrativeVisibleFrameMs:null,feedbackVisibleFrameMs:null,completeReceivedMs:null,choicesVisibleFrameMs:null,streamEndedMs:null,stages:[],status:'running',textEvents:0};
    const elapsed=()=>Math.round((performance.now()-rec.startMono)*10)/10;
    rec.requestStartMs=elapsed();window.__tgnBrowserEvidence.push(rec);intentAt=null;
    let candidateNarrative=false,candidateFeedback=false,candidateChoices=false;
    const visible=(node,top,bottom)=>{if(!node?.getClientRects().length||getComputedStyle(node).visibility==='hidden')return false;const r=node.getBoundingClientRect();return r.bottom>top&&r.top<bottom&&r.right>0&&r.left<innerWidth;};
    function frame(){
      const now=elapsed(),overlay=[...document.querySelectorAll('.bottom-sheet')].some(n=>n.classList.contains('open')&&n.getAttribute('aria-hidden')!=='true');
      if(document.hidden||overlay){ candidateNarrative=false; candidateFeedback=false; candidateChoices=false; }
      if(!document.hidden&&!overlay){
        const vv=visualViewport,top=Math.max(vv?.offsetTop||0,document.querySelector('.story-header')?.getBoundingClientRect().bottom||0),bottom=(vv?.offsetTop||0)+(vv?.height||innerHeight);
        const generation=document.querySelector('#generation-status');const feedback=visible(generation,top,bottom);
        if(feedback&&candidateFeedback&&rec.feedbackVisibleFrameMs===null)rec.feedbackVisibleFrameMs=now;candidateFeedback=feedback;
        const dock=document.querySelector('#action-area');const readingBottom=dock?.getClientRects().length?Math.min(bottom,dock.getBoundingClientRect().top):bottom;
        const section=document.querySelector('#provisional-turn')||(rec.status==='complete'?document.querySelector('#narrative .turn-block:last-child'):null);
        const text=rec.firstNarrativeSseMs!==null&&[...(section?.querySelectorAll('p:not(.turn-meta):not(.awaiting)')||[])].some(p=>p.textContent.trim()&&visible(p,top,readingBottom));
        if(text&&candidateNarrative&&rec.firstNarrativeVisibleFrameMs===null)rec.firstNarrativeVisibleFrameMs=now;candidateNarrative=text;
        const choices=rec.status==='complete'&&[...document.querySelectorAll('#suggested-actions button:not(:disabled)')].some(b=>visible(b,top,bottom));
        if(choices&&candidateChoices&&rec.choicesVisibleFrameMs===null)rec.choicesVisibleFrameMs=now;candidateChoices=choices;
      }
      if(rec.status==='running'||(rec.status==='complete'&&now-(rec.completeReceivedMs??now)<5000&&(rec.choicesVisibleFrameMs===null||rec.firstNarrativeVisibleFrameMs===null)))requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    try{
      const response=await nativeFetch(...args);rec.responseHeadersMs=elapsed();
      if(!response.ok){rec.status='http_error';rec.httpStatus=response.status;return response;}
      let buffer='';const decoder=new TextDecoder();
      function consume(raw){const lines=raw.split('\n');const event=(lines.find(l=>l.startsWith('event:'))||'event: message').slice(6).trim();const text=lines.filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(!text)return;
        const data=JSON.parse(text),ms=elapsed();if(rec.firstSseMs===null)rec.firstSseMs=ms;
        if(event==='stage')rec.stages.push({name:data.name,status:data.status,serverElapsedMs:data.elapsedMs,browserReceivedMs:ms});
        if(event==='text'){rec.textEvents++;if(data.delta?.trim()&&rec.firstNarrativeSseMs===null)rec.firstNarrativeSseMs=ms;}
        if(event==='complete'){rec.completeReceivedMs=ms;rec.status='complete';rec.turnIndex=data.turn?.index;rec.traceId=data.metrics?.id||null;}
        if(event==='error'){rec.status='sse_error';rec.error=data.message;rec.errorCode=data.code;}
      }
      const originalReader=response.body.getReader.bind(response.body);
      response.body.getReader=(...readerArgs)=>{
        const reader=originalReader(...readerArgs),read=reader.read.bind(reader);
        reader.read=async()=>{let item;try{item=await read();}catch(e){rec.status='transport_error';rec.error=e.message;throw e;}if(item.value){if(rec.firstReadByteMs===null)rec.firstReadByteMs=elapsed();buffer+=decoder.decode(item.value,{stream:true}).replace(/\r\n/g,'\n');let at;while((at=buffer.indexOf('\n\n'))>=0){consume(buffer.slice(0,at));buffer=buffer.slice(at+2);}}
          if(item.done){buffer+=decoder.decode();if(buffer.trim())consume(buffer);rec.streamEndedMs=elapsed();if(rec.status==='running')rec.status='incomplete';}return item;};return reader;
      };
      return response;
    }catch(e){rec.status='transport_error';rec.error=e.message;throw e;}
  };
}
