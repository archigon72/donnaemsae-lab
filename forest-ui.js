'use strict';
// 돈냄새연구소 forest UI v2 — presentation only. No calculation, data, search or routing logic lives here.
// index : the hidden logic <select id="home-etf-select"> (filled by phase-shell.js) is mirrored as a result list.
// detail: re-arranges the header that real-detail.js renders (identity / "종목 변경" picker / basic info).
//         Picking a row sets the existing <select id="real-etf-select"> and fires its own 'change' event,
//         so real-detail.js still does selection, URL/history and loading.
// terms : style markers for the existing '주의' copy (text unchanged).
(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const $=id=>document.getElementById(id);
 const st={open:false,openTicker:null,refocus:null,info:null,sig:''};
 const ticker=()=>window.lastDetailViewModel?.ticker||null;
 const mobileView=()=>document.body.classList.contains('mobile');
 function rows(select){return [...select.options].filter(o=>o.value).map(o=>{const t=o.textContent,i=t.indexOf(' · ');return {code:o.value,name:i>=0?t.slice(i+3):t};});}
 function listHTML(list,caption){
  return `<div class="fx-list-head"><span>${esc(caption)}</span></div>`+(list.length?`<ul class="fx-rows" role="list">${list.map(r=>`<li><button type="button" class="fx-row" data-fx-code="${esc(r.code)}" aria-label="${esc(r.name+' '+r.code+' 분석')}"><span class="fx-row-main"><b>${esc(r.name)}</b><small>${esc(r.code)}</small></span><span class="fx-row-go" aria-hidden="true">분석 →</span></button></li>`).join('')}</ul>`:'<p class="fx-empty">검색 결과 없음</p>');
 }
 function renderList(box,select,term){
  const list=rows(select),sig=select.id+'|'+term+'|'+list.map(r=>r.code).join(',');
  if(box.dataset.sig===sig)return;box.dataset.sig=sig;
  box.innerHTML=listHTML(list,term?`검색 결과 ${list.length}개`:`${list.length}개 종목`);
 }
 /* ---------- index ---------- */
 function home(){
  const sel=$('home-etf-select');if(!sel)return;
  if(!sel.dataset.fx){sel.dataset.fx='1';sel.tabIndex=-1;sel.setAttribute('aria-hidden','true');sel.inert=true;}
  let box=$('fx-etf-list');
  if(!box){box=document.createElement('section');box.id='fx-etf-list';box.className='fx-etf-list';box.setAttribute('aria-label','ETF 검색 결과');sel.insertAdjacentElement('afterend',box);}
  box.hidden=sel.hidden; // phase-shell hides the select only when the catalog failed to load
  renderList(box,sel,(document.querySelector('#search-form input')?.value||'').trim());
 }
 /* ---------- detail ---------- */
 function buildHeader(header,search,select){
  header.dataset.fx='1';
  const eyebrow=document.createElement('div');eyebrow.className='fx-eyebrow';
  eyebrow.innerHTML='<span class="fx-eyebrow-label">ETF 상세분석</span>';
  let back=document.querySelector('.detail-mobile > .back-link');           // existing link to index.html?code=…
  if(!back){back=document.createElement('a');back.className='back-link';back.href='index.html';}
  back.classList.add('fx-back');back.textContent='← 종목 목록';eyebrow.append(back);
  header.prepend(eyebrow);
  const identity=header.querySelector('.identity'),idRow=document.createElement('div');idRow.className='fx-id-row';
  identity.replaceWith(idRow);idRow.append(identity);
  const btn=document.createElement('button');btn.type='button';btn.id='fx-change';btn.className='fx-change';
  btn.setAttribute('aria-controls','fx-picker');btn.setAttribute('aria-expanded','false');
  btn.innerHTML='<span class="fx-change-ico" aria-hidden="true"></span><span>종목 변경</span>';idRow.append(btn);
  const picker=document.createElement('div');picker.id='fx-picker';picker.className='fx-picker';picker.setAttribute('role','region');picker.setAttribute('aria-label','종목 변경');
  picker.innerHTML='<div class="fx-picker-head"><b>종목 변경</b><button type="button" class="fx-picker-close" data-fx-close>닫기 ×</button></div>';
  picker.append(search.closest('label'),select.closest('label'));
  const box=document.createElement('section');box.id='fx-etf-list';box.className='fx-etf-list';box.setAttribute('aria-label','ETF 검색 결과');picker.append(box);
  idRow.after(picker);
  const meta=header.querySelector('.meta'),strategy=header.querySelector('.strategy'),links=header.querySelector('.source-links');
  const val=label=>[...(meta?.children||[])].find(s=>s.textContent.trim().startsWith(label))?.querySelector('b')?.textContent.trim()||'—';
  const info=document.createElement('div');info.className='fx-info';
  info.innerHTML=`<div class="fx-info-sum"><p>운용사 ${esc(val('운용사'))} · 총보수 ${esc(val('총보수'))} · 기준일 ${esc(val('기준일'))}</p><button type="button" class="fx-info-toggle" aria-controls="fx-info-body" aria-expanded="false">기본정보</button></div><div id="fx-info-body" class="fx-info-body"></div>`;
  info.querySelector('.fx-info-body').append(...[meta,strategy,links].filter(Boolean));
  picker.after(info);
 }
 function detail(){
  const header=document.querySelector('.detail-header'),search=$('real-etf-search'),select=$('real-etf-select');
  if(!header||!search||!select)return;
  const fresh=!header.dataset.fx;
  if(fresh)buildHeader(header,search,select);
  if(st.open&&ticker()!==st.openTicker){st.open=false;st.refocus='change';}   // a selection loaded another ETF
  const picker=$('fx-picker'),btn=$('fx-change');
  picker.hidden=!st.open;picker.inert=!st.open;btn.setAttribute('aria-expanded',String(st.open));
  if(st.info===null)st.info=!mobileView();
  const body=$('fx-info-body'),tog=header.querySelector('.fx-info-toggle');
  body.hidden=!st.info;tog.setAttribute('aria-expanded',String(st.info));const tl=st.info?'기본정보 접기':'기본정보 펼치기';if(tog.textContent!==tl)tog.textContent=tl;
  if(st.open&&fresh){search.dispatchEvent(new Event('input',{bubbles:true}));} // re-render kept the panel open: re-apply the typed filter
  renderList($('fx-etf-list'),select,search.value.trim());
  if(st.refocus&&btn&&window.lastDetailViewModel?.status!=='LOADING'){const f=st.refocus;st.refocus=null;(f==='change'?btn:search).focus({preventScroll:true});}
 }
 function setSearch(value){const s=$('real-etf-search');if(!s)return;s.value=value;s.dispatchEvent(new Event('input',{bubbles:true}));}
 function openPicker(){
  st.open=true;st.openTicker=ticker();detail();
  setSearch('');                       // empty term = whole catalogue; the select keeps the current ETF selected
  $('real-etf-search')?.focus();
 }
 function closePicker(){
  if(!st.open)return;st.open=false;
  const t=ticker();if(t)setSearch(t);  // restore the original "current code" search state
  detail();$('fx-change')?.focus({preventScroll:true});
 }
 /* ---------- events ---------- */
 document.addEventListener('click',e=>{
  if(e.target.closest('#fx-change')){st.open?closePicker():openPicker();return;}
  if(e.target.closest('[data-fx-close]')){closePicker();return;}
  const tog=e.target.closest('.fx-info-toggle');if(tog){st.info=!st.info;detail();return;}
  const row=e.target.closest('.fx-row');if(!row)return;
  const select=$('real-etf-select')||$('home-etf-select');if(!select)return;
  if(select.id==='real-etf-select'){st.open=false;st.refocus='change';}
  select.value=row.dataset.fxCode;
  select.dispatchEvent(new Event('change',{bubbles:true}));      // existing handlers navigate / load
  if(select.id==='real-etf-select')detail();
 });
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&st.open&&!document.getElementById('term-help-layer')?.matches(':not([hidden])')){e.preventDefault();closePicker();}
 });
 document.addEventListener('input',e=>{if(e.target.id==='real-etf-search'||e.target.closest?.('#search-form'))setTimeout(run,0);});
 /* ---------- terms ---------- */
 function marks(){
  document.querySelectorAll('#terms-sections h3:not([data-fx])').forEach(h=>{h.dataset.fx='1';if(h.textContent.trim()==='주의'){h.classList.add('fx-caution-h');let n=h.nextElementSibling;while(n&&n.tagName!=='H3'){n.classList.add('fx-caution-b');n=n.nextElementSibling;}}});
 }
 function run(){home();detail();marks();}
 let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;run();});};
 const start=()=>{new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});run();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
