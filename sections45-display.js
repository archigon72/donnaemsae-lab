'use strict';
function healthSection(v){
 const h=v?.health||{},display=Phase1.presentation(v).health_display||{};
 const card=(key,name,assumption)=>{
  const valid=h.status==='OK',mdd=h[key+'_mdd'],recovered=h[key+'_recovered'],noDrawdown=valid&&Number(mdd)===0;
  const state=!valid?'자료 부족':noDrawdown?'낙폭 없음':recovered?'회복 완료 · '+(h[key+'_recovery_date']||'—'):'미회복 · 저점 이후 '+format(display[key]?.unrecovered_calendar_days,'일',0)+' 경과';
  const duration=!valid?'회복 정보 없음':noDrawdown?'회복이 필요한 낙폭이 없습니다.':recovered?'회복기간 '+format(h[key+'_recovery_calendar_days'],'일',0)+' (달력 기준 · 저점부터)':'분석 종료일 '+(v?.actual_period?.end||'—')+' 기준';
  return `<article class="health-compact" data-health="${key}"><h3>${name}</h3><p class="health-assumption">${assumption}</p><div class="health-loss"><span>최대 낙폭</span><strong class="negative">${escapeHTML(format(mdd,'%'))}</strong></div><p class="health-state ${valid&&!noDrawdown&&!recovered?'negative':''}">${escapeHTML(state)}</p><p class="health-dates"><span>고점 → 저점</span><b>${escapeHTML(h[key+'_hwm_date']||'—')} → ${escapeHTML(h[key+'_trough_date']||'—')}</b></p><p class="health-duration">${escapeHTML(duration)}</p></article>`;
 };
 const reduction=h.drawdown_reduction_pp;
 const interpretation=reduction===null||reduction===undefined?'낙폭 비교 자료가 없습니다.':Number(reduction)<0?'분배금을 전액 재투자했을 때 최대 낙폭이 '+format(String(reduction).replace(/^-/,''),'%p')+' 늘었습니다.':'분배금을 전액 재투자했을 때 최대 낙폭이 '+format(reduction,'%p')+' 줄었습니다.';
 return `<div class="health-compact-grid">${card('raw','Raw NAV','분배금 전액 소진 가정')}${card('navtr','NAV-TR','세전 분배금 전액 재투자 가정')}</div><p class="definition health-interpretation">${escapeHTML(interpretation)}</p>`;
}
const referenceMarkets=[['379800','S&P500'],['379810','NASDAQ100'],['069500','KOSPI200'],['229200','KOSDAQ150']];
let selectedMarkets=[],marketRequestSeq=0;
function trackingState(v){const name=v?.metadata?.benchmark;return {name:name||'추종지수 정보 없음',status:!name||/^(없음|미제공|N\/A)$/.test(name)?'비교 가능한 추종지수 없음':'추종지수 성과 비교 미지원'};}
function referenceControls(){return `<fieldset class="reference-options"><legend>참고시장 선택 · 최대 2개</legend>${referenceMarkets.map(([code,name])=>`<label><input type="checkbox" data-reference-code="${code}" ${selectedMarkets.includes(code)?'checked':''} ${selectedMarkets.length>=2&&!selectedMarkets.includes(code)?'disabled':''}>${name}</label>`).join('')}</fieldset>`;}
function marketSection(v){const tracking=trackingState(v);return `<div class="market-area tracking-area"><h3>추종지수</h3><p class="tracking-name">${escapeHTML(tracking.name)}</p><p class="definition tracking-status">${tracking.status}</p></div><div class="market-area reference-area"><h3>참고시장 비교</h3><div id="reference-controls">${referenceControls()}</div><p class="definition reference-basis">참고시장 비교는 국내 상장 대표 ETF의 NAV-TR 기준입니다. 지수 자체의 TR을 계산한 값이 아니며, 미국 시장 대표 ETF는 원화·환율 변동을 포함합니다.</p><div id="market-comparison" aria-live="polite"><p class="definition">비교할 참고시장를 선택하세요.</p></div></div>`;}
async function refreshMarket(v){
 const seq=++marketRequestSeq;window.lastMarketResult=null;updateFactsMarket(v,null);
 if(!selectedMarkets.length)return;
 const el=document.getElementById('market-comparison');if(!el)return;
 if(v?.status!=='OK'||!v.actual_period){el.innerHTML='<p class="definition">선택기간의 ETF 분석 자료가 없습니다.</p>';return;}
 el.innerHTML='<p class="definition">공통기간 NAV-TR 비교를 준비하는 중…</p>';
 try{const result=await Phase1.market(v,[...selectedMarkets],phase=>{if(seq===marketRequestSeq&&detailVM===v&&el.isConnected)el.innerHTML='<p class="definition">'+({initializing:'비교 실행환경을 준비하는 중…',calculating:'공통기간의 기존 Core 결과를 계산하는 중…'})[phase]+'</p>';});
  if(seq!==marketRequestSeq||detailVM!==v||!el.isConnected)return;window.lastMarketResult=result;el.innerHTML=renderMarketResult(result);updateFactsMarket(v,result);
 }catch(e){if(seq===marketRequestSeq&&detailVM===v&&el.isConnected){window.lastMarketResult={status:'ERROR',message:String(e.message||e)};el.innerHTML='<p class="definition">비교 자료를 읽지 못했습니다. 선택을 해제한 뒤 다시 선택하세요.</p>';}}
}
function renderMarketResult(r){
 if(r?.status!=='OK')return `<p class="definition">${escapeHTML(r?.message||'비교 자료 없음')}</p>`;
 const signed=(value,unit)=>(Number(value)>0?'+':'')+format(value,unit);
 return `<p class="market-period">비교기간 ${escapeHTML(r.actual_period.start+' ~ '+r.actual_period.end)}${r.shortened?' · 선택기간 중 공통 가용구간':''}</p><table class="market-summary"><thead><tr><th>비교대상</th><th>NAV-TR 성과</th><th>ETF − 비교대상</th></tr></thead><tbody><tr><th>ETF NAV-TR</th><td>${escapeHTML(signed(r.etf_return,'%'))}</td><td>—</td></tr>${r.references.map(x=>`<tr><th>${escapeHTML(x.market)}<small>${escapeHTML(x.name+' · '+x.ticker)}</small></th><td>${escapeHTML(signed(x.tr_return,'%'))}</td><td>${escapeHTML(signed(x.excess_pp,'%p'))}</td></tr>`).join('')}</tbody></table><div class="market-legend">${['ETF NAV-TR',...r.references.map(x=>x.market+' 참고 · '+x.name+' NAV-TR')].map((name,i)=>`<span style="color:${['#60a5fa','#10d981','#fbbf24'][i]}">${escapeHTML(name)}</span>`).join('')}</div>${marketChart(r)}${r.references.map(x=>`<p class="definition market-interpretation">선택기간${r.shortened?' 중 공통 가용구간':''} 동안 ETF의 재투자 성과가 ${escapeHTML(x.market)} 대표 ETF보다 ${escapeHTML(signed(x.excess_pp,'%p'))} ${Number(x.excess_pp)<0?'낮았습니다.':Number(x.excess_pp)===0?'같았습니다.':'높았습니다.'}</p>`).join('')}${r.initial_anchor_added?'<p class="definition market-anchor-note">첫날 분배금이 있는 경우, 같은 날 재투자 전 시작 기준 100과 재투자 후 값을 함께 표시합니다.</p>':''}`;
}
function marketChart(r){
 const rows=r.series,names=['ETF',...r.references.map(x=>x.market)],colors=['#60a5fa','#10d981','#fbbf24'],L=40,R=535,T=50,B=230,H=290;
 const numbers=rows.flatMap(p=>p.values.map(Number)),min=Math.min(...numbers),max=Math.max(...numbers),range=max-min||1;
 const x=i=>L+(R-L)*i/Math.max(1,rows.length-1),y=v=>B-(B-T)*(Number(v)-min)/range;
 const paths=names.map((name,i)=>`<path d="${rows.map((p,j)=>(j?'L':'M')+x(j).toFixed(2)+' '+y(p.values[i]).toFixed(2)).join(' ')}" fill="none" stroke="${colors[i]}" stroke-width="3"/>`).join('');
 const ends=rows.at(-1).values.map((value,i)=>({i,value,y:y(value)})).sort((a,b)=>a.y-b.y);let position=T;
 for(const e of ends){e.label=Math.max(e.y,position);position=e.label+35;}
 if(ends.at(-1).label>B){const shift=ends.at(-1).label-B;for(const e of ends)e.label-=shift;}
 const labels=ends.map(e=>`<circle cx="${R}" cy="${e.y}" r="4" fill="${colors[e.i]}"/><path d="M${R+5} ${e.y}L${R+18} ${e.label}" stroke="${colors[e.i]}"/><text class="market-endpoint" data-series-index="${e.i}" x="${R+23}" y="${e.label+5}" fill="${colors[e.i]}">${escapeHTML(names[e.i]+' '+format(e.value))}</text>`).join('');
 return `<div class="market-chart" data-market-rows="${escapeHTML(JSON.stringify(rows))}" data-market-names="${escapeHTML(JSON.stringify(['ETF NAV-TR',...r.references.map(x=>x.market+' 참고 · '+x.name+' NAV-TR')]))}"><svg class="chart" viewBox="0 0 760 ${H}" role="img" aria-label="ETF 및 선택 참고시장 대표 ETF NAV-TR 비교"><g stroke="#304254"><path d="M${L} ${T}H${R}M${L} ${(T+B)/2}H${R}M${L} ${B}H${R}"/></g>${paths}${labels}<g fill="#a5b5c9"><text x="2" y="${T+3}">${max.toFixed(1)}</text><text x="2" y="${B}">${min.toFixed(1)}</text><text x="${L}" y="274" text-anchor="start">${escapeHTML(rows[0].date)}</text><text x="${R}" y="274" text-anchor="end">${escapeHTML(rows.at(-1).date)}</text></g></svg><div class="market-tooltip" role="status" hidden></div></div>`;
}
function marketTooltip(event){const chart=event.target.closest('.market-chart');if(!chart)return;const rows=JSON.parse(chart.dataset.marketRows),names=JSON.parse(chart.dataset.marketNames),box=chart.querySelector('svg').getBoundingClientRect(),px=(event.clientX-box.left)/box.width*760,index=Math.max(0,Math.min(rows.length-1,Math.round((px-40)/495*(rows.length-1)))),r=rows[index],tip=chart.querySelector('.market-tooltip');tip.textContent=r.date+' · '+names.map((n,i)=>n+' '+format(r.values[i])).join(' · ')+(r.baseline?' · 재투자 전 시작 기준':'');tip.hidden=false;tip.dataset.index=index;}
document.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')marketTooltip(e);});document.addEventListener('pointerdown',marketTooltip);
document.addEventListener('change',e=>{const code=e.target.dataset.referenceCode;if(!code)return;if(e.target.checked){if(selectedMarkets.length>=2){e.target.checked=false;return;}selectedMarkets.push(code);}else selectedMarkets=selectedMarkets.filter(x=>x!==code);document.getElementById('reference-controls').innerHTML=referenceControls();document.getElementById('market-comparison').innerHTML='<p class="definition">비교할 참고시장를 선택하세요.</p>';refreshMarket(detailVM);});
