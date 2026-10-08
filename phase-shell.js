'use strict';
// Navigation/selector wiring for approved Shell. Deferred modules stay placeholders.
document.addEventListener('DOMContentLoaded',()=>{
 const deferred=new Set(['holdings.html','compare.html','mobile-holdings.html']);
 document.querySelectorAll('a[href]').forEach(a=>{
  const href=a.getAttribute('href'),file=href?.split('?')[0];
  if(!deferred.has(file))return;
  if(a.classList.contains('device-link')){a.href='mobile-detail.html';a.textContent='ETF 상세분석 · 모바일';return;}
  if(a.classList.contains('back-link')){a.href='index.html';a.textContent='홈';return;}
  if(a.closest('.bottom-nav')&&href.includes('tab=home')){a.href='index.html';return;}
  a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.tabIndex=-1;
 });
 document.querySelectorAll('[data-placeholder],[data-mobile-placeholder]').forEach(b=>{b.disabled=true;b.setAttribute('aria-disabled','true');});
 // Main content is repainted when a ViewModel arrives. Delegate deferred links
 // so freshly rendered back-links cannot navigate to an absent holdings page.
 document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a)return;
  const href=a.getAttribute('href'),file=href?.split('?')[0];
  if(!deferred.has(file))return;
  e.preventDefault();
 });
 const form=document.getElementById('search-form');
 if(form){
  const input=form.querySelector('input'),list=document.createElement('select');list.setAttribute('aria-label','검색된 ETF 선택');list.id='home-etf-select';list.hidden=true;form.insertAdjacentElement('afterend',list);
  let rows=[];
  Phase1.catalog().then(c=>{rows=c.items;update();}).catch(()=>toast('종목 목록을 읽지 못했습니다. 새로고침해 주세요.'));
  function update(){const term=input.value.trim().toLowerCase();const matches=rows.filter(r=>r.ticker.toLowerCase().includes(term)||r.name.toLowerCase().includes(term));list.innerHTML=matches.map(r=>`<option value="${r.ticker}">${r.ticker} · ${r.name.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</option>`).join('');list.hidden=!rows.length;}
  input.addEventListener('input',update);
  form.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();if(!list.value){toast('검색 결과가 없습니다.');return;}location.href='detail.html?code='+encodeURIComponent(list.value);},true);
  list.addEventListener('change',()=>location.href='detail.html?code='+encodeURIComponent(list.value));
 }
});
