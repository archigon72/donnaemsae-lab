/* Product routing and UI state only; no financial computation or facts writes. */
(function(){
'use strict';
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('management-sw.js').catch(()=>{}));
const prefix='donnaemsae.ui.'+new URL('.',location.href).pathname;
const read=(key,fallback)=>{try{return JSON.parse(sessionStorage.getItem(prefix+key))??fallback}catch{return fallback}};
const write=(key,value)=>{try{sessionStorage.setItem(prefix+key,JSON.stringify(value))}catch{}};
const code=v=>/^[0-9A-Z]{6}$/.test(v||'')?v:null;
const brand='<a href="index.html" class="lab-brand"><b>돈냄새연구소</b><small>정밀하게 분석하고, 천천히 키운다.</small></a>';
function nav(active,cls){const home=document.body.dataset.portalService==='management'?'asset-hub.html':'analysis.html';return '<nav class="'+cls+'" aria-label="공통 내비게이션">'+[['home',home,'홈'],['analysis','analysis.html','분석'],['management','asset-hub.html','관리']].map(([id,href,label])=>'<a href="'+href+'" '+(id===active?'class="active" aria-current="page"':'')+'>'+label+'</a>').join('')+'</nav>'}
window.ProductShell={read,write,code,brand,nav,detail:c=>'detail.html?code='+encodeURIComponent(code(c)||'498400')};
window.addEventListener('pagehide',()=>write('scroll:'+location.pathname+location.search,scrollY));
window.addEventListener('pageshow',e=>{if(e.persisted)return;const y=read('scroll:'+location.pathname+location.search,0);if(!y)return;let n=0;const t=setInterval(()=>{if(document.documentElement.scrollHeight>y+innerHeight||++n>30){clearInterval(t);scrollTo(0,y)}},100)});
document.addEventListener('DOMContentLoaded',async()=>{
 if(document.body.dataset.view!=='analysis')return;
 const app=document.getElementById('app');app.innerHTML='<header class="lab-header">'+brand+nav('analysis','lab-topnav')+'</header><main class="lab-main"><span class="eyebrow-lab">ETF 분석</span><h1>분배금 너머의 성과를 살펴봐요</h1><section class="lab-panel"><label for="product-search">종목코드 / 종목명 검색</label><input id="product-search" type="search" placeholder="종목코드 또는 종목명" autocomplete="off"><p class="lab-muted" id="product-status" role="status">종목 목록을 읽는 중…</p><div id="product-list"></div></section><a id="product-resume" class="lab-btn" hidden>마지막 종목 분석 이어보기 →</a><p><a href="terms.html">용어·지표 이해하기 →</a></p></main>'+nav('analysis','lab-bottom');
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const input=document.getElementById('product-search');input.value=read('analysis-query','');
 const last=code(read('analysis-code',null)),resume=document.getElementById('product-resume');if(last){resume.href=ProductShell.detail(last);resume.hidden=false;resume.textContent=last+' 분석 이어보기 →'}
 try{const r=await fetch('data/catalog.json');if(!r.ok)throw Error();const rows=(await r.json()).items;const update=()=>{const q=input.value.trim().toLowerCase();write('analysis-query',input.value);const matches=rows.filter(x=>x.ticker.toLowerCase().includes(q)||x.name.toLowerCase().includes(q));document.getElementById('product-status').textContent=matches.length+'개 종목 · 분석 기준 NAV';document.getElementById('product-list').innerHTML=matches.map(x=>'<a class="list-row" href="'+ProductShell.detail(x.ticker)+'"><span><b>'+esc(x.name)+'</b><small>'+esc(x.ticker)+'</small></span><span>분석 →</span></a>').join('')};input.addEventListener('input',update);update()}catch{document.getElementById('product-status').textContent='종목 목록을 읽지 못했습니다. 새로고침해 주세요.'}
});
})();
