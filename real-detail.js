'use strict';
// Presentation only: consumes one Python ViewModel for PC and mobile.
let detailVM=null,detailCatalog=[],requestSeq=0,chosenPeriod='전체',requestedPeriod='자동',detailSearchTerm='',detailStrategies={};
const escapeHTML=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=(v,unit='',digits=2)=>v===null||v===undefined?'—':Number(v).toLocaleString('ko-KR',{minimumFractionDigits:digits,maximumFractionDigits:digits})+unit;
const performanceClass=value=>value===null||value===undefined||!Number.isFinite(Number(value))?'neutral':Number(value)>0?'positive':Number(value)<0?'negative':'neutral';
const realMetric=(label,value,sub='',cls='')=>`<div class="metric"><span>${escapeHTML(label)}</span><strong class="${cls}">${escapeHTML(value)}</strong>${sub?`<small>${escapeHTML(sub)}</small>`:''}</div>`;
function realChart(series,kind){
 if(!series?.length)return '<p class="definition">데이터 없음</p>';
 const W=760,H=220,L=42,R=730,T=25,B=182;
 let a,b;
 if(kind==='bars')a=series.map(r=>Number(r.amount));
 else{a=series.map(r=>Number(r.raw_index));b=series.map(r=>Number(r.tr_index));}
 const values=b?a.concat(b):a,min=kind==='bars'?0:Math.min(...values),max=Math.max(...values),range=max-min||1;
 const x=i=>L+(R-L)*i/Math.max(1,a.length-1),y=v=>B-(B-T)*(v-min)/range;
 const path=v=>v.map((n,i)=>(i?'L':'M')+x(i).toFixed(2)+' '+y(n).toFixed(2)).join(' ');
 const line=kind==='bars'?a.map((n,i)=>`<rect x="${x(i)-Math.min(9,(R-L)/a.length/3)}" y="${y(n)}" width="${Math.min(18,(R-L)/a.length/1.5)}" height="${B-y(n)}" rx="3" fill="#60a5fa"/>`).join(''):`<path d="${path(a)}" fill="none" stroke="#60a5fa" stroke-width="3"/><path d="${path(b)}" fill="none" stroke="#10b981" stroke-width="3"/>`;
 return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${kind==='bars'?'실제 분배 이력 · 1주당 원':'실제 Raw NAV 및 NAV-TR 100 시작 추이'}"><g stroke="#304254"><path d="M42 32H730M42 82H730M42 132H730M42 182H730"/></g>${line}<g fill="#a5b5c9"><g class="chart-y-labels" font-size="10"><text x="3" y="32">${max.toFixed(1)}</text><text x="3" y="182">${min.toFixed(1)}</text></g><g class="chart-x-labels" font-size="11.5"><text x="42" y="213">${escapeHTML(series[0].date)}</text><text x="638" y="213">${escapeHTML(series.at(-1).date)}</text></g></g></svg>`;
}
function renderRealDetail(v){
 const m=v?.metadata||{},p=v?.performance||{},d=v?.distribution||{},h=v?.health||{},ap=v?.available_period,actual=v?.actual_period;
 const issueText=(v?.issues||[]).filter(x=>x.code!=='benchmark_unavailable').map(x=>x.code==='zeroin_failed'?'일부 종목 정보는 제공되지 않을 수 있습니다.':/REAL|가상값|검수용|후속|proof|Core/i.test(x.message||'')?'분석 자료를 확인하지 못했습니다.':x.message).join(' / ');
 const badge=v?.status==='LOADING'?'<span class="sample">자료 연결 중</span>':'';
 const choose=`<label>종목코드 / 종목명 검색 <input id="real-etf-search" type="search" value="${escapeHTML(detailSearchTerm)}" placeholder="종목코드 또는 종목명 일부 입력" style="width:100%;max-width:100%" aria-label="ETF 부분검색"></label><label>ETF 선택 <select style="width:100%;max-width:100%" id="real-etf-select" aria-label="실제 ETF 선택">${detailCatalog.length?detailCatalog.map(r=>`<option value="${escapeHTML(r.ticker)}" ${r.ticker===(v?.ticker||new URLSearchParams(location.search).get('code')||'498400')?'selected':''}>${escapeHTML(r.ticker+' · '+r.name)}</option>`).join(''):'<option>자료 연결 중</option>'}</select></label>`;
 const effect=Phase1.presentation(v).reinvestment_effect_pp;
 const effectText=effect===null||effect===undefined?'—':(Number(effect)>0?'+':'')+format(effect,'%p');
 const fee=m.fee?String(m.fee)+(String(m.fee).includes('%')?'':'%'):null;
 const periodButtons=`<div class="periods" role="group" aria-label="공통 분석 기간">${['1개월','6개월','1년','전체','직접지정'].map(x=>`<button data-real-period="${x}" ${ap&&((x.endsWith('개월')&&!ap.months?.[x[0]])||(x==='1년'&&!ap.years?.['1']))?'disabled':''} class="${x===chosenPeriod?'active':''}" aria-pressed="${x===chosenPeriod}">${x}</button>`).join('')}</div><div class="custom-period" ${chosenPeriod==='직접지정'?'':'hidden'}><label>시작일<input id="real-start" type="date" min="${ap?.start||''}" max="${ap?.end||''}" value="${escapeHTML(actual?.start||ap?.start||'')}"></label><label>종료일<input id="real-end" type="date" min="${ap?.start||''}" max="${ap?.end||''}" value="${escapeHTML(actual?.end||ap?.end||'')}"></label><button data-real-apply>적용</button></div><p id="real-date-error" class="definition negative" role="alert" hidden></p><p class="period-caption">${actual?escapeHTML(actual.start+' ~ '+actual.end):'실제 자료 범위에서 분석합니다.'}</p>`;
 const healthPanel=(prefix,title,definition)=>`<div class="health"><h3>${title}</h3><p class="definition">${definition}</p><div class="health-metrics">${realMetric('최대 낙폭',format(h[prefix+'_mdd'],'%'),'','negative')}${realMetric('고점 / 저점',(h[prefix+'_hwm_date']||'—')+' / '+(h[prefix+'_trough_date']||'—'))}${realMetric('회복일',h[prefix+'_recovery_date']||'—')}${realMetric('회복기간',format(h[prefix+'_recovery_days'],' 관측일',0),format(h[prefix+'_recovery_calendar_days'],' 달력일',0)+' · 저점부터')}${realMetric('회복상태',h.status==='OK'?(Number(h[prefix+'_mdd'])===0?'낙폭 없음':h[prefix+'_recovered']?'전고점 회복':'미회복'):'—')}</div></div>`;
 return `<header class="detail-header"><div class="identity"><small>${escapeHTML(m.ticker||v?.ticker||'—')} · 국내 ETF</small><h1>${escapeHTML(m.name||'ETF 상세분석')}</h1>${badge}</div>${choose}<div class="meta"><span>운용사 <b>${escapeHTML(m.issuer)}</b></span><span>기초지수 <b>${escapeHTML(m.benchmark)}</b></span><span>유형 <b>${escapeHTML(m.type)}</b></span><span>총보수(연) <b>${escapeHTML(fee)}</b></span><span>기준일 <b>${escapeHTML(v?.cache?.data_cutoff)}</b></span></div><p class="strategy">투자전략 — ${escapeHTML(displayStrategy(m.strategy,v?.ticker||m.ticker)||'미제공')} · 메타 기준 ${escapeHTML(m.metadata_as_of)}</p><div class="source-links">${Object.entries(m.links||{}).map(([name,url])=>`<a class="outline" href="${escapeHTML(url)}" target="_blank" rel="noopener">${escapeHTML(name)} ↗</a>`).join('')}</div><p class="definition" role="status">${escapeHTML(issueText||'자료 기준일 '+(v?.proof_meta?.data_cutoff||v?.cache?.data_cutoff||'—'))}</p></header><nav class="section-tabs">${[['dist','분배'],['perf','실제성과'],['capital','원금체력'],['mdd','MDD·회복'],['market','시장대비'],['facts','팩트']].map(([id,label])=>`<button class="analysis-tab ${id==='dist'?'active':''}" data-section="${id}">${label}</button>`).join('')}<button type="button" class="section-terms analysis-tab" data-terms-href="terms.html?from=${document.body.dataset.mobile==='true'?'mobile-detail.html':'detail.html'}&amp;code=${escapeHTML(v?.ticker||new URLSearchParams(location.search).get('code')||'498400')}">용어</button></nav>${section('dist','분배 현황',distributionSection(v),1)}${section('perf','기간별 성과',`${periodButtons}<div class="metrics three performance-metrics">${realMetric('기간 Raw NAV 변화',format(p.nav_change,'%'),'분배금 전액 소진 가정',performanceClass(p.nav_change))}${realMetric('기간 NAV-TR 변화',format(p.navtr_change,'%'),'세전 분배금 전액 재투자 가정',performanceClass(p.navtr_change))}<div class="metric perf-combined"><span>재투자 효과</span><strong class="${performanceClass(effect)}">${escapeHTML(effectText)}</strong><small>NAV-TR - Raw NAV</small><div class="perf-distribution"><span>기간 누적 분배금 (1주당)</span><strong>${escapeHTML(format(p.distribution_sum,'원'))}</strong></div></div></div><p class="definition">NAV-TR은 세전 분배금 전액 재투자 가정값입니다. 실제 계좌수익률과 다를 수 있습니다.</p>`,2)}${section('capital','원금 체력 — NAV vs NAV-TR',capitalSection(v,effectText),3)}${section('mdd','MDD · 회복',healthSection(v),4)}${section('market','시장 대비 성과',marketSection(v),5)}${section('facts','팩트 요약',factsSection(v),6)}<div class="add-cta"><span>분석에서 운용으로</span><button class="primary" disabled aria-disabled="true">내 보유종목에 추가</button></div>`;
}
function paintRealDetail(v){
 detailVM=v;
 const main=document.querySelector('.detail-mobile')||document.querySelector('.workspace main');
 main.innerHTML=(document.body.dataset.mobile==='true'?`<a class="back-link" href="index.html?code=${encodeURIComponent(v?.ticker||new URLSearchParams(location.search).get('code')||'')}">홈</a>`:'')+renderRealDetail(v);
 const home=document.querySelector('.bottom-nav [data-home-code]');if(home)home.href='index.html?code='+encodeURIComponent(v?.ticker||new URLSearchParams(location.search).get('code')||'');
 window.lastDetailViewModel=v;TermHelp.mount(main);refreshMarket(v); // review automation can compare exact API object on both devices
}
function requestError(code,message){
 return {ticker:code,status:'ERROR',metadata:{ticker:code,name:detailCatalog.find(r=>r.ticker===code)?.name},
 issues:[{code:'web_transport_failed',message}],available_period:detailCatalog.find(r=>r.ticker===code)?.available_period};
}
async function loadRealDetail(code,period='자동',start,end){
 const seq=++requestSeq;chosenPeriod=period==='자동'?'전체':period;
 paintRealDetail({ticker:code,status:'LOADING',metadata:{ticker:code,name:detailCatalog.find(x=>x.ticker===code)?.name},
 available_period:detailCatalog.find(x=>x.ticker===code)?.available_period,issues:[{message:period==='직접지정'?'직접지정 계산 준비 중…':'선택 기간 자료를 읽는 중…'}]});
 const updateProgress=stage=>{if(seq!==requestSeq)return;const el=document.querySelector('.detail-header [role=status]');if(el)el.textContent=({initializing:'직접지정 실행환경을 준비하는 중…',input_loading:'선택한 종목의 자료를 읽는 중…',calculating:'직접지정 계산 중…'})[stage]||'계산 중…';};
 try{
  const v=period==='직접지정'?await Phase1.custom(code,start,end,updateProgress):await Phase1.fixed(code,period);
  if(seq!==requestSeq)return;chosenPeriod=v.period||chosenPeriod;paintRealDetail(v);scrollInitialSection();
 }catch(e){if(seq!==requestSeq)return;paintRealDetail(requestError(code,String(e.message||e)));}
}
function searchRows(term){
 const needle=term.trim().toLowerCase();
 return detailCatalog.filter(r=>r.ticker.toLowerCase().includes(needle)||r.name.toLowerCase().includes(needle));
}
function filterSelector(term){
 detailSearchTerm=term;
 const current=detailVM?.ticker||'498400',select=document.getElementById('real-etf-select'),rows=searchRows(term);
 const currentInResults=rows.some(r=>r.ticker===current);
 // Filtering is not selection: never show a different ticker as already selected.
 select.innerHTML=(currentInResults?'':'<option value="" selected>'+ (rows.length?'검색 결과를 선택하세요':'검색 결과 없음')+'</option>')+rows.map(r=>`<option value="${escapeHTML(r.ticker)}" ${r.ticker===current?'selected':''}>${escapeHTML(r.ticker+' · '+r.name)}</option>`).join('');
}
function selectTicker(code,{period=requestedPeriod,historyMode='push'}={}){
 if(!detailCatalog.some(r=>r.ticker===code))return;
 const start=document.getElementById('real-start')?.value,end=document.getElementById('real-end')?.value;
 detailSearchTerm=code;
 if(historyMode!=='none'){
  const url=new URL(location.href);url.searchParams.set('code',code);url.searchParams.delete('q');
  if(historyMode==='replace')history.replaceState(null,'',url);
  else if(url.href!==location.href)history.pushState(null,'',url);
 }
 return loadRealDetail(code,period,period==='직접지정'?start:undefined,period==='직접지정'?end:undefined);
}
document.addEventListener('DOMContentLoaded',async()=>{
 if(document.body.dataset.view!=='detail')return;
 try{const [catalog,strategies]=await Promise.all([Phase1.catalog(),fetch(new URL('./display-strategies.json',location.href)).then(r=>{if(!r.ok)throw Error('전략 자료를 읽지 못했습니다.');return r.json();})]);detailCatalog=catalog.items;detailStrategies=strategies.items;}catch(e){paintRealDetail(requestError('—','종목 목록을 읽지 못했습니다. 새로고침해 주세요.'));return;}
 const q=new URLSearchParams(location.search),term=(q.get('q')||'').toLowerCase();
 const selected=q.get('code')||detailCatalog.find(r=>term&&(r.ticker.toLowerCase().includes(term)||r.name.toLowerCase().includes(term)))?.ticker||'498400';
 requestedPeriod=q.get('period')||'자동';
 selectTicker(selected,{period:requestedPeriod,historyMode:'replace'});
 document.addEventListener('input',e=>{if(e.target.id==='real-etf-search')filterSelector(e.target.value);});
 document.addEventListener('keydown',e=>{
  if(e.target.id!=='real-etf-search'||e.key!=='Enter'||e.isComposing)return;
  e.preventDefault();const rows=searchRows(e.target.value);
  const exact=rows.find(r=>r.ticker.toLowerCase()===e.target.value.trim().toLowerCase()||r.name.toLowerCase()===e.target.value.trim().toLowerCase());
  const code=exact?.ticker||document.getElementById('real-etf-select')?.value||(rows.length===1?rows[0].ticker:null);
  if(code)selectTicker(code);else toast(rows.length?'검색 결과에서 종목을 선택하세요.':'검색 결과가 없습니다.');
 });
 window.addEventListener('popstate',()=>{
  const code=new URLSearchParams(location.search).get('code')||'498400';
  selectTicker(code,{historyMode:'none'});
 });
 document.addEventListener('change',e=>{
  if(e.target.id!=='real-etf-select'||!e.target.value)return;
  selectTicker(e.target.value);
 });
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.realPeriod){
   requestedPeriod=b.dataset.realPeriod;chosenPeriod=requestedPeriod;
   if(chosenPeriod==='직접지정'){++requestSeq;paintRealDetail(detailVM);const status=document.querySelector('.detail-header [role=status]');if(status)status.textContent='날짜를 지정하고 적용하세요. 아래 값은 직전 계산 결과입니다.';}
   else loadRealDetail(detailVM?.ticker||document.getElementById('real-etf-select').value,requestedPeriod);
  }
  if(b.hasAttribute('data-real-apply')){
   const start=document.getElementById('real-start').value,end=document.getElementById('real-end').value,error=document.getElementById('real-date-error');
   if(start&&end&&start>end){error.textContent='시작일은 종료일보다 늦을 수 없습니다.';error.hidden=false;return;}
   error.hidden=true;requestedPeriod='직접지정';loadRealDetail(detailVM?.ticker||document.getElementById('real-etf-select').value,'직접지정',start,end);
  }
 });
});

// Use the same native control as every other analysis tab.
document.addEventListener('click',e=>{const tab=e.target.closest('.section-tabs button[data-terms-href]');if(tab)location.assign(tab.dataset.termsHref);});

let initialSectionScrolled=false;
function scrollInitialSection(){
 if(initialSectionScrolled||!location.hash)return;
 const target=document.getElementById(location.hash.slice(1));
 if(!target?.classList.contains('section'))return;
 initialSectionScrolled=true;target.open=true;
 document.fonts.ready.then(()=>requestAnimationFrame(()=>{target.scrollIntoView({block:'start'});document.querySelectorAll('.section-tabs [data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===target.id));}));
}

// Deployment-time cleaned strategy text; keep HTML escaping at its existing output boundary.
function displayStrategy(text,ticker){return detailStrategies[ticker]??'미제공';}
