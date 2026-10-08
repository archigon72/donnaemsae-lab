'use strict';
// Fixed templates and formatting only. Python supplies historical statistics.
function factsSection(v,market){
 const d=v?.distribution||{},p=v?.performance||{},h=v?.health||{},sidecar=Phase1.presentation(v),facts=sidecar.facts||{},effect=sidecar.reinvestment_effect_pp;
 const signed=(value,unit)=>value===null||value===undefined?'—':(Number(value)>0?'+':'')+format(value,unit);
 const num=(value,unit,s=false)=>`<strong class="facts-value">${escapeHTML(s?signed(value,unit):format(value,unit))}</strong>`;
 const coverage=distributionCoverage(v);
 const ratio=d.ratio_status==='insufficient_history'?'자료 부족':format(d.ratio,'%');
 const state=key=>h.status!=='OK'?'자료 부족':Number(h[key+'_mdd'])===0?'낙폭 없음':h[key+'_recovered']?'회복 완료':'미회복';
 let effectLine=effect===null||effect===undefined?'선택기간 재투자 효과 자료가 없습니다.':`분배금을 전액 재투자한 경우 전액 소진 가정보다 선택기간 성과가 ${num(Number(effect)<0?String(effect).replace(/^-/,''):effect,'%p',Number(effect)>=0)} ${Number(effect)<0?'낮았습니다.':Number(effect)===0?'같았습니다.':'높았습니다.'}`;
 const rows=[['분배',`${coverage.totalLabel} 1주당 분배금은 ${!coverage.full12&&Number(d.sum12)===0?'—':num(d.sum12,'원')}, 최근 12개월 분배율은 <strong class="facts-value">${escapeHTML(ratio)}</strong>입니다.`],['성과',`선택기간 Raw NAV는 ${num(p.nav_change,'%',true)}, 세전 분배금 재투자 시 NAV-TR은 ${num(p.navtr_change,'%',true)}였습니다.`],['재투자 효과',effectLine],['하락·회복',`최대 낙폭은 Raw NAV ${num(h.raw_mdd,'%')}, NAV-TR ${num(h.navtr_mdd,'%')}이며, 분석 종료일 기준 Raw NAV는 ${escapeHTML(state('raw'))}, NAV-TR은 ${escapeHTML(state('navtr'))}입니다.`]];
 if(market?.status==='OK'&&market.references?.length){rows.push(['시장 비교',`${market.shortened?'선택기간 중 공통 가용구간의':'선택기간'} ETF NAV-TR은 ${market.references.map(r=>`${escapeHTML(r.market)} 참고시장 대비 ${num(Math.abs(Number(r.excess_pp)),'%p')} ${Number(r.excess_pp)<0?'낮았습니다':Number(r.excess_pp)===0?'같았습니다':'높았습니다'}`).join(', ')}.`]);}
 const feature=facts.feature?.label,stability=facts.stability?.status==='OK'?facts.stability.label:null,movement=facts.movement?.status==='OK'?facts.movement.label:null;
 const movementPhrases={'상당히 유사하게 움직임':'추종지수와 상당히 유사하게 움직이며, ','대체로 유사하게 움직임':'추종지수와 대체로 유사하게 움직이며, ','다소 차이가 있게 움직임':'추종지수와 다소 차이가 있게 움직이며, ','움직임 차이가 큰 편':'추종지수와 움직임 차이가 큰 편이며, '};
 let characteristic=stability?`최근 12개 완료월의 분배금을 ${stability}${feature?'하는 '+feature+' ETF입니다.':'했습니다.'}`:feature?`${feature} ETF이며, 최근 12개 완료월의 분배금 안정성은 자료 부족입니다.`:'특징을 요약할 자료가 부족합니다.';
 if(movement)characteristic=(movementPhrases[movement]||'')+characteristic;
 return `<p class="definition facts-intro">선택한 기간과 최근 분배 자료를 기준으로 핵심 사실만 정리했습니다.</p><ul class="facts-summary">${rows.map(([label,text])=>`<li data-fact="${escapeHTML(label)}"><b>${label} · </b>${text}</li>`).join('')}</ul><div class="facts-characteristic"><h3>이 종목의 특징</h3><p>${escapeHTML(characteristic)}</p></div>`;
}
function updateFactsMarket(v,market){const body=document.querySelector('#facts > .section-body');if(body){body.innerHTML=factsSection(v,market);window.lastFactSummary=Phase1.presentation(v).facts||null;}}
