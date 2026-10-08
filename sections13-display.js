'use strict';
// Section 1 and 3 display only: source values and existing Core series are never mutated.
function distributionSection(v){
 const d=v?.distribution||{},display=Phase1.presentation(v),latest=d.latest;
 const card=(label,value,meta='')=>`<div class="metric dist-card"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong><small><span>${escapeHTML(meta)}</span></small></div>`;
 return `<div class="metrics four dist-cards">${card('최근 분배금(1주당)',format(latest?.amount,'원'),'기준일 '+(latest?.record_date||'—'))}${card('최근 12개월 누적 분배금(1주당)',format(d.sum12,'원'))}<div class="metric dist-card"><span>최근 12개월 분배율 <button class="ratio-help" type="button" aria-label="최근 12개월 분배율 설명" title="최근 12개월 분배금 합계 ÷ 기준 NAV. 과거 분배 실적이며 미래 분배율을 보장하지 않습니다.">?</button></span><strong class="blue">${escapeHTML(d.ratio_status==='insufficient_history'?'자료 부족':format(d.ratio,'%'))}</strong><small><span>기준 NAV ${escapeHTML(format(d.ratio_nav,'원'))}</span><span>기준일 ${escapeHTML(d.ratio_as_of||'—')}</span></small></div><div class="metric dist-card dist-statistics"><span>분배금 통계 (1주당)</span><dl><div><dt>최근 6개월</dt><dd>${escapeHTML(format(d.sum_recent6,'원'))}</dd></div><div><dt>이전 6개월</dt><dd>${escapeHTML(format(d.sum_previous6,'원'))}</dd></div><div><dt>12개월 월평균</dt><dd>${escapeHTML(format(d.monthly_average,'원'))}</dd></div></dl><small></small></div></div><div class="dist-chart-heading"><h3>분배금 지급 이력 (최근 12개월)</h3><button type="button" class="history-link" data-open-distribution-history>전체기간 이력 &gt;</button></div>${detailInteractiveChart(display.distribution_recent12,'bars')}<p class="definition dist-chart-note">1주당 지급액 · 가용기간이 12개월 미만이면 가용 이력을 표시합니다.${(display.distribution_recent12||[]).some(r=>!r.pay_date)?' 지급일 미제공 건은 분배 기준일(기준)로 표시합니다.':''}</p>`;
}
function capitalSection(v,effectText){
 const available=Phase1.presentation(v).reinvestment_effect_pp;
 const interpretation=available===null||available===undefined?'선택기간 성과 비교 자료가 없습니다.':Number(available)<0?`분배금을 전액 재투자했다면, 전액 소진한 경우보다 선택기간 성과가 ${format(String(available).replace(/^-/,''),'%p')} 낮았습니다.`:`분배금을 전액 재투자했다면, 전액 소진한 경우보다 선택기간 성과가 ${effectText} 높았습니다.`;
 return `<div class="legend"><span class="nav-dot">Raw NAV · 분배금 전액 소진 가정</span><span class="tr-dot">NAV-TR · 세전 분배금 전액 재투자 가정</span></div>${detailInteractiveChart(v?.series,'lines')}<p class="definition capital-interpretation">${escapeHTML(interpretation)}</p>${v?.actual_period?`<p class="period-caption">${escapeHTML(v.actual_period.start+' ~ '+v.actual_period.end)}</p>`:''}`;
}
function detailInteractiveChart(rows,kind){
 if(!rows?.length)return '<p class="definition">데이터 없음</p>';
 const W=760,H=280,L=40,R=kind==='lines'?560:720,T=54,B=225;
 const a=rows.map(r=>Number(kind==='bars'?r.amount:r.raw_index)),b=kind==='lines'?rows.map(r=>Number(r.tr_index)):null;
 const values=b?a.concat(b):a,min=kind==='bars'?0:Math.min(...values),max=Math.max(...values),range=max-min||1;
 const x=i=>rows.length===1?(L+R)/2:L+(R-L)*i/(rows.length-1),y=value=>B-(B-T)*(value-min)/range;
 const date=r=>kind==='bars'?(r.pay_date||r.date+' (기준)'):r.date;
 let marks='',lastLabels='';
 if(kind==='bars'){
  const hi=a.lastIndexOf(Math.max(...a)),lo=a.lastIndexOf(Math.min(...a));
  const width=Math.min(26,(R-L)/rows.length*.65);
  marks=rows.map((r,i)=>`<rect class="chart-bar" data-chart-index="${i}" x="${x(i)-width/2}" y="${y(a[i])}" width="${width}" height="${Math.max(1,B-y(a[i]))}" rx="3" fill="#60a5fa" tabindex="0" role="button" aria-label="${escapeHTML(date(r)+' · '+format(r.amount,'원'))}"><title>${escapeHTML(date(r)+' · '+format(r.amount,'원'))}</title></rect>`).join('');
  for(const [i,label] of hi===lo?[[hi,'최고·최저']]:[[hi,'최고'],[lo,'최저']])marks+=`<text class="chart-extreme" data-extreme="${label}" data-chart-index="${i}" x="${x(i)}" y="${Math.max(25,y(a[i])-12)}" text-anchor="${i===0?'start':i===rows.length-1?'end':'middle'}" fill="#e5edf7">${label} ${escapeHTML(format(rows[i].amount,'원'))}</text>`;
 }else{
  const path=values=>values.map((value,i)=>(i?'L':'M')+x(i).toFixed(2)+' '+y(value).toFixed(2)).join(' ');
  marks=`<path d="${path(a)}" fill="none" stroke="#60a5fa" stroke-width="3"/><path d="${path(b)}" fill="none" stroke="#10b981" stroke-width="3"/>`;
  const last=rows.at(-1),rawY=y(a.at(-1)),trY=y(b.at(-1));let labelRaw=rawY,labelTr=trY;
  if(Math.abs(rawY-trY)<36){const center=Math.max(T+18,Math.min(B-18,(rawY+trY)/2));labelRaw=center+18;labelTr=center-18;}
  for(const [key,color,value,actualY,labelY] of [['raw','#60a5fa',last.raw_index,rawY,labelRaw],['tr','#10b981',last.tr_index,trY,labelTr]])lastLabels+=`<circle cx="${R}" cy="${actualY}" r="4" fill="${color}"/><path d="M${R+5} ${actualY}L${R+13} ${labelY}" stroke="${color}"/><text class="chart-endpoint" data-series="${key}" x="${R+18}" y="${labelY+5}" fill="${color}">${key==='raw'?'Raw NAV':'NAV-TR'} ${escapeHTML(format(value))}</text>`;
 }
 const payload=escapeHTML(JSON.stringify(rows.map(r=>kind==='bars'?{date:date(r),pay_date:r.pay_date,event_date:r.date,amount:r.amount}:{date:r.date,raw_index:r.raw_index,tr_index:r.tr_index})));
 return `<div class="interactive-chart" data-chart-kind="${kind}" data-chart-rows="${payload}" data-plot-left="${L}" data-plot-right="${R}"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${kind==='bars'?'최근 12개월 분배금 지급 이력':'Raw NAV 및 NAV-TR 추이'}"><g stroke="#304254"><path d="M${L} ${T}H${R}M${L} ${(T+B)/2}H${R}M${L} ${B}H${R}"/></g>${marks}${lastLabels}<g fill="#a5b5c9" class="detail-axis"><text x="2" y="${T+4}">${max.toFixed(1)}</text><text x="2" y="${B}">${min.toFixed(1)}</text><text class="chart-first-date" x="${L}" y="268" text-anchor="start">${escapeHTML(date(rows[0]))}</text>${rows.length>1?`<text class="chart-last-date" x="${R}" y="268" text-anchor="end">${escapeHTML(date(rows.at(-1)))}</text>`:''}</g><line class="chart-crosshair" x1="0" x2="0" y1="${T}" y2="${B}" stroke="#a5b5c9" stroke-dasharray="4" visibility="hidden"/></svg><div class="detail-chart-tooltip" role="status" hidden></div></div>`;
}
function showDetailTooltip(event){
 const container=event.target.closest('.interactive-chart');if(!container)return;
 const svg=container.querySelector('svg'),box=svg.getBoundingClientRect(),rows=JSON.parse(container.dataset.chartRows);
 let index=event.target.dataset.chartIndex;
 if(index===undefined){const px=(event.clientX-box.left)/box.width*760,L=Number(container.dataset.plotLeft),R=Number(container.dataset.plotRight);index=Math.max(0,Math.min(rows.length-1,Math.round((px-L)/(R-L)*Math.max(1,rows.length-1))));}
 index=Number(index);const r=rows[index],tip=container.querySelector('.detail-chart-tooltip');
 tip.textContent=container.dataset.chartKind==='bars'?`${r.pay_date?'지급일 '+r.pay_date:'지급일 미제공 · 분배 기준일 '+r.event_date} · 1주당 분배금 ${format(r.amount,'원')}`:`${r.date} · Raw NAV 지수 ${format(r.raw_index)} · NAV-TR 지수 ${format(r.tr_index)}`;
 tip.hidden=false;tip.dataset.index=String(index);
 const line=svg.querySelector('.chart-crosshair'),L=Number(container.dataset.plotLeft),R=Number(container.dataset.plotRight),px=rows.length===1?(L+R)/2:L+(R-L)*index/(rows.length-1);line.setAttribute('x1',px);line.setAttribute('x2',px);line.setAttribute('visibility','visible');
}
let historyOpener=null;
function openDistributionHistory(button){
 const rows=Phase1.presentation(detailVM).distribution_history||[];
 const old=document.getElementById('distribution-history-dialog');if(old)old.remove();historyOpener=button;
 const dialog=document.createElement('dialog');dialog.id='distribution-history-dialog';dialog.className='distribution-history-dialog';
 dialog.innerHTML=`<div class="history-title"><h2>전체기간 분배 이력</h2><button type="button" data-close-distribution-history aria-label="전체기간 이력 닫기">닫기 ×</button></div><div class="history-scroll"><table><thead><tr><th>지급일</th><th>기준 NAV</th><th>1주당 분배금</th><th>분배율</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHTML(r.pay_date||'—')}</td><td>${escapeHTML(format(r.nav,'원'))}</td><td>${escapeHTML(format(r.amount,'원'))}</td><td>${escapeHTML(format(r.ratio,'%'))}</td></tr>`).join('')||'<tr><td colspan="4">지급 이력 없음</td></tr>'}</tbody></table></div><p class="definition">기준 NAV는 해당 분배 기준일 값이며, 분배율은 지급 건별 원자료 값입니다. 미제공 값은 —로 표시합니다.</p>`;
 document.body.append(dialog);dialog.addEventListener('close',()=>{document.body.classList.remove('history-open');historyOpener?.focus();});dialog.showModal();document.body.classList.add('history-open');
}
document.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')showDetailTooltip(e);});
document.addEventListener('pointerdown',showDetailTooltip);
document.addEventListener('focusin',e=>{if(e.target.matches('.chart-bar'))showDetailTooltip(e);});
document.addEventListener('keydown',e=>{if(e.target.matches('.chart-bar')&&['Enter',' '].includes(e.key)){e.preventDefault();showDetailTooltip(e);}});
document.addEventListener('click',e=>{
 const open=e.target.closest('[data-open-distribution-history]');if(open)openDistributionHistory(open);
 if(e.target.closest('[data-close-distribution-history]'))document.getElementById('distribution-history-dialog')?.close();
});
