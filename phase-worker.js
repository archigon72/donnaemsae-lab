// Browser orchestration only. Original Python performs all financial calculations.
'use strict';
let py=null, manifest=null, queue=Promise.resolve();
const VERSION='phase1-worker-v1';
async function get(path){const r=await fetch(new URL(path,self.location.href));if(!r.ok)throw Error('HTTP '+r.status+' '+path);return r;}
function hashBytes(path,bytes){
 const expected=manifest.files[path];if(!expected)throw Error('Unknown input asset: '+path);
 py.FS.writeFile('/verify.bin',new Uint8Array(bytes));
 const actual=py.runPython("import hashlib; hashlib.sha256(open('/verify.bin','rb').read()).hexdigest()");py.FS.unlink('/verify.bin');
 if(actual!==expected)throw Error('Input hash mismatch: '+path);return actual;
}
function resourceEntries(){return performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,start_ms:r.startTime,duration_ms:r.duration,transfer_bytes:r.transferSize,encoded_bytes:r.encodedBodySize}));}
async function execute(data){
 const began=performance.now(),cold=!py;let phase='initialize';
 try{
  if(!manifest)manifest=await(await get('./data/runtime-manifest.json')).json();
  if(data.snapshot_id!==manifest.snapshot.snapshot_id)throw Error('Snapshot mismatch');
  if(!/^[0-9A-Z]{6}$/.test(data.ticker)||!manifest.files['inputs/'+data.ticker+'.json'])throw Error('Unknown ticker');
  if(!py){
   postMessage({type:'progress',id:data.id,phase:'initializing'});
   importScripts('./assets/pyodide/pyodide.js');
   const runtime=await loadPyodide({indexURL:new URL('./assets/pyodide/',self.location.href).href});
   if(runtime.version!=='0.29.3')throw Error('Unexpected Pyodide version');
   await runtime.loadPackage(['sqlite3','ssl']);
   // Publish initialized interpreter only after original module imports succeed.
   py=runtime;
   const packet=await(await get('./runtime_source.zip')).arrayBuffer();hashBytes('runtime_source.zip',packet);
   py.FS.writeFile('/runtime_source.zip',new Uint8Array(packet));
   py.runPython("import zipfile,sys; zipfile.ZipFile('/runtime_source.zip').extractall('/phase1/runtime'); sys.path.insert(0,'/phase1/runtime'); import period_bridge");
   const factsSource=await(await get('./facts_projection.py')).arrayBuffer();hashBytes('facts_projection.py',factsSource);py.FS.writeFile('/phase1/runtime/facts_projection.py',new Uint8Array(factsSource));
   const displaySource=await(await get('./presentation.py')).arrayBuffer();hashBytes('presentation.py',displaySource);
   py.FS.writeFile('/phase1/runtime/presentation.py',new Uint8Array(displaySource));
   py.runPython('import presentation');
  }
  const initialized=performance.now();phase='input';
  postMessage({type:'progress',id:data.id,phase:'input_loading'});
  const inputPath='inputs/'+data.ticker+'.json',bytes=await(await get('./'+inputPath)).arrayBuffer();
  hashBytes(inputPath,bytes);const bundle=JSON.parse(new TextDecoder().decode(bytes));
  if(bundle.ticker!==data.ticker||bundle.meta.snapshot_id!==data.snapshot_id)throw Error('Bundle boundary mismatch');
  if(data.operation==='market'){
   phase='compare';const refs=[];
   if(!Array.isArray(data.references)||data.references.length<1||data.references.length>2||new Set(data.references).size!==data.references.length)throw Error('Select at most two references');
   for(const code of data.references){if(!['379800','379810','069500','229200'].includes(code))throw Error('Unknown reference');const path='references/'+code+'.json',rb=await(await get('./'+path)).arrayBuffer();hashBytes(path,rb);refs.push(JSON.parse(new TextDecoder().decode(rb)));}
   const source=await(await get('./market_projection.py')).arrayBuffer();hashBytes('market_projection.py',source);py.FS.writeFile('/phase1/runtime/market_projection.py',new Uint8Array(source));
   py.globals.set('market_etf',JSON.stringify(bundle));py.globals.set('market_refs',JSON.stringify(refs));py.globals.set('market_start',data.start);py.globals.set('market_end',data.end);
   postMessage({type:'progress',id:data.id,phase:'calculating'});
   const result=JSON.parse(py.runPython("import json,market_projection; json.dumps(market_projection.compare_market(json.loads(market_etf),json.loads(market_refs),market_start,market_end),ensure_ascii=False)"));
   postMessage({type:'result',id:data.id,market_result:result,timing:{worker_ms:performance.now()-began,pyodide_version:py.version}});return;
  }
  bundle.period='직접지정';py.globals.set('web_bundle_json',JSON.stringify(bundle));
  py.globals.set('web_start',data.start??null);py.globals.set('web_end',data.end??null);
  const loaded=performance.now();phase='calculate';
  postMessage({type:'progress',id:data.id,phase:'calculating'});
  const encoded=py.runPython("import json,time; b=json.loads(web_bundle_json); t=time.perf_counter(); v=period_bridge.run_period(b,web_start,web_end); elapsed=(time.perf_counter()-t)*1000; json.dumps({'view_model':v,'presentation':presentation.detail_presentation(v,b),'core_ms':elapsed},ensure_ascii=False)");
  const result=JSON.parse(encoded),finished=performance.now();
  postMessage({type:'result',id:data.id,view_model:result.view_model,presentation:result.presentation,
   timing:{runtime_state:cold?'cold':'warm',worker_ms:finished-began,initialization_ms:initialized-began,
    input_ms:loaded-initialized,core_ms:result.core_ms,calculation_and_serialization_ms:finished-loaded,
    pyodide_version:py.version,worker_version:VERSION,wasm_heap_capacity_bytes:py._module.HEAPU8.length,
    resources:resourceEntries(),note:'WASM capacity is not process RSS; cold/warm denotes interpreter state, not verified HTTP cache state.'}});
 }catch(e){
  if(phase==='initialize')py=null;
  postMessage({type:'failure',id:data.id,phase,message:String(e),worker_ms:performance.now()-began});
 }
}
self.onmessage=({data})=>{queue=queue.then(()=>execute(data)).catch(e=>postMessage({type:'failure',id:data.id,message:String(e)}));};
