'use strict';
// Static ViewModel transport and a lazy Worker. No financial formulas.
window.Phase1=(()=>{
 let catalogPromise, worker=null, counter=0, pending=new Map();const tickerCache=new Map(),timings=[],presentations=new WeakMap();
 async function read(path){const r=await fetch(new URL(path,location.href));if(!r.ok)throw Error('자료 읽기 실패 ('+r.status+')');return await r.json();}
 function catalog(){return catalogPromise??=read('./data/catalog.json').catch(e=>{catalogPromise=null;throw e;});}
 async function fixed(code,period='자동'){
  const c=await catalog();if(!c.items.some(i=>i.ticker===code))throw Error('등록되지 않은 종목입니다.');
  let promise=tickerCache.get(code);if(!promise){promise=read('./data/'+code+'.json');tickerCache.set(code,promise);}
  let payload;try{payload=await promise;}catch(e){tickerCache.delete(code);throw e;}
  if(payload.snapshot.snapshot_id!==c.snapshot.snapshot_id||payload.ticker!==code)throw Error('자료 기준점이 다릅니다.');
  if(period==='자동')period=payload.periods['전체'].available_period?.default||'전체';
  const result=payload.periods[period];if(!result)throw Error('지원하지 않는 기간입니다.');presentations.set(result,payload.presentations?.[period]||{});return result;
 }
 function failWorker(message){for(const job of pending.values())job.reject(Error(message));pending.clear();if(worker)worker.terminate();worker=null;}
 async function custom(code,start,end,onProgress,referenceCodes){
  const c=await catalog();if(!c.items.some(i=>i.ticker===code))throw Error('등록되지 않은 종목입니다.');
  if(!worker){
   worker=new Worker(new URL('./phase-worker.js',location.href));
   worker.onerror=e=>{e.preventDefault();failWorker('직접지정 실행 연결 실패. 다시 적용해 주세요. '+e.message);};
   worker.onmessageerror=()=>failWorker('직접지정 결과 전달 실패. 다시 적용해 주세요.');
   worker.onmessage=({data})=>{
    const job=pending.get(data.id);if(!job)return;
    if(data.type==='progress'){job.onProgress?.(data.phase);return;}
    pending.delete(data.id);
    if(data.type==='failure'){job.reject(Error(data.message));return;}
    if(data.type==='result'){
     if(job.referenceCodes){job.resolve(data.market_result);return;}
     const timing={...data.timing,ticker:code,start:job.start,end:job.end,click_to_complete_ms:performance.now()-job.began,recorded_at:new Date().toISOString()};
     // Use the job's ticker rather than the ticker captured on first Worker creation.
     timing.ticker=job.code;timings.push(timing);presentations.set(data.view_model,data.presentation||{});job.resolve(data.view_model);
    }
   };
  }
  return new Promise((resolve,reject)=>{const id=++counter;pending.set(id,{code,start,end,began:performance.now(),resolve,reject,onProgress,referenceCodes});worker.postMessage({id,snapshot_id:c.snapshot.snapshot_id,ticker:code,start,end,operation:referenceCodes?'market':'custom',references:referenceCodes});});
 }
 return {catalog,fixed,custom,market:(v,codes,onProgress)=>custom(v.ticker,v.actual_period.start,v.actual_period.end,onProgress,codes),timings,presentation:v=>v?presentations.get(v)||{}:{},stop:()=>failWorker('직접지정 실행을 종료했습니다.')};
})();
