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
 try {
  if(!manifest) manifest=await(await get('./data/runtime-manifest.json')).json();
  if(!py){
   postMessage({type:'progress',id:data.id,message:'기존 계산 엔진을 준비하고 있어요…'});
   importScripts('./assets/pyodide/pyodide.js');
   py=await loadPyodide({indexURL:new URL('./assets/pyodide/',self.location.href).href});
   if(py.version!=='0.29.3')throw Error('Unexpected runtime');
   await py.loadPackage(['sqlite3','ssl']);
   const packet=await(await get('./runtime_source.zip')).arrayBuffer();hashBytes('runtime_source.zip',packet);
   py.FS.writeFile('/runtime_source.zip',new Uint8Array(packet));
   py.runPython("import zipfile,sys; zipfile.ZipFile('/runtime_source.zip').extractall('/comparison/runtime'); sys.path.insert(0,'/comparison/runtime'); import period_bridge");
   const market=await(await get('./market_projection.py')).arrayBuffer();hashBytes('market_projection.py',market);py.FS.writeFile('/comparison/runtime/market_projection.py',new Uint8Array(market));
   const adapter=await(await get('./comparison-adapter.py')).arrayBuffer();
   py.FS.writeFile('/verify.bin',new Uint8Array(adapter));
   if(py.runPython("import hashlib; hashlib.sha256(open('/verify.bin','rb').read()).hexdigest()")!=='020ff0553d673baab606863349a57e5201d75e2984ed4d2d4507540251fec536')throw Error('Comparison adapter hash mismatch');
   py.FS.writeFile('/comparison/runtime/comparison_adapter.py',new Uint8Array(adapter));
  }
  const bundles=[];
  for(const item of data.items){
   if(!/^[0-9A-Z]{6}$/.test(item.code))throw Error('Invalid ticker');
   const path=(item.kind==='etf'?'inputs/':'references/')+item.code+'.json';
   const bytes=await(await get('./'+path)).arrayBuffer();hashBytes(path,bytes);
   const bundle=JSON.parse(new TextDecoder().decode(bytes));
   if(bundle.ticker!==item.code||bundle.meta.snapshot_id!==manifest.snapshot.snapshot_id)throw Error('Input boundary mismatch');
   bundles.push(bundle);
  }
  postMessage({type:'progress',id:data.id,message:'실제 공통 관측일로 비교하고 있어요…'});
  py.globals.set('comparison_bundles',JSON.stringify(bundles));
  py.globals.set('comparison_count',data.etfCount);py.globals.set('comparison_period',data.period);
  py.globals.set('comparison_start',data.start||null);py.globals.set('comparison_end',data.end||null);
  const result=JSON.parse(py.runPython("import json,comparison_adapter; json.dumps(comparison_adapter.compare(json.loads(comparison_bundles),comparison_count,comparison_period,comparison_start,comparison_end),ensure_ascii=False)"));
  postMessage({type:'result',id:data.id,result});
 } catch(error){postMessage({type:'failure',id:data.id,message:String(error)});}
}
self.onmessage=({data})=>{queue=queue.then(()=>execute(data));};
