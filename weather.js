/* View state lives only in the URL and DOM. Never reads/writes ledger/storage. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), E = WeatherC, C = WeatherChart;
  const names = {sun:'맑은 날',partly_cloudy:'구름 조금 낀 날',rain:'비 오는 날'};
  const icons = {sun:'☀️',partly_cloudy:'🌤️',rain:'🌧️'};
  const descriptions = {sun:'현재의 맑은 배당 환경이 계속 이어진다면',partly_cloudy:'조금 낮아진 배당으로 차분히 쌓아간다면',rain:'하락과 회복을 겪어도 멈추지 않고 재투자한다면'};
  const conditions = {sun:'가격 고정 가정 · 연 7% 배당 · 매월 전액 재투자',partly_cloudy:'가격 고정 가정 · 연 5% 배당 · 매월 전액 재투자',rain:'6개월 매월 5% 가격 하락 · 연 3% 배당 → 24개월 동안 가격·연 5%로 회복'};
  const won = value => Math.round(value).toLocaleString('ko-KR') + '원';
  const signedWon = value => (value >= 0 ? '+' : '−') + won(Math.abs(value));
  const percent = value => (value >= 0 ? '+' : '−') + Math.abs(value).toFixed(2) + '%';
  let years = 10, scenario = null, mode = 'both';
  function readURL() {
    const q = new URLSearchParams(location.search), requested = Number(q.get('years'));
    years = E.YEARS.includes(requested) ? requested : 10;
    scenario = Object.hasOwn(names,q.get('scenario')) ? q.get('scenario') : null;
    mode = 'both';
  }
  function writeURL() {
    const q = new URLSearchParams({years:String(years)});if(scenario)q.set('scenario',scenario);
    history.pushState(null,'','weather.html?'+q.toString());
  }
  function card(s) {
    const result = E.simulate(s,years);
    const facts = s === 'rain' ? [['가격','6개월 하락'],['연 배당률','3% → 5%'],['회복','24개월']] : [['가격','고정 가정'],['연 배당률',s==='sun'?'7%':'5%'],['배당','전액 재투자']];
    return `<button type="button" class="weather-card ${s}" data-scenario="${s}" aria-label="${names[s]} ${years}년 결과 보기"><div class="weather-card-heading"><span class="weather-icon" aria-hidden="true">${icons[s]}</span><div><h2>${names[s]}</h2><p>${descriptions[s]}</p></div><span class="weather-chevron" aria-hidden="true">›</span></div><div class="weather-facts">${facts.map(([label,value])=>`<span><small>${label}</small><b>${value}</b></span>`).join('')}</div><div class="weather-card-preview"><span>${years}년 재투자 예상 자산</span><strong>${won(result.end_asset)}</strong></div></button>`;
  }
  function charts(result, out) {
    const sources = out ? (mode==='reinvest'?[result]:mode==='withdrawal'?[out]:[result,out]) : [result];
    const series = metric => sources.map(r=>({id:r.scenario,color:r.scenario.endsWith('_withdrawal')?'#6fc8ff':'#7affbf',points:C.points(r,metric)}));
    const legend = out ? '<span><i class="mint"></i>재투자형</span><span><i class="blue"></i>인출형</span>' : '<span><i class="mint"></i>전액 재투자형</span>';
    return `<section class="weather-chart-panel"><h2>시간에 따른 변화 <small>(${years}년)</small></h2>${out?`<div class="weather-chart-modes" role="group" aria-label="차트 표시 방식">${[['both','두 방식 함께'],['reinvest','재투자형'],['withdrawal','인출형']].map(([id,label])=>`<button type="button" data-chart-mode="${id}" aria-pressed="${mode===id}">${label}</button>`).join('')}</div>`:''}<div class="weather-legend">${legend}</div><h3>기간 총가치 <span>만원</span></h3><div id="weather-total-chart">${C.svg(series('total'),'total',years)}</div><p class="weather-chart-note">${out?'두 방식의 같은 기준 비교: 재투자형은 보유자산, 인출형은 보유자산 + 누적 배당인출액.':'재투자형의 기간 총가치 = 보유자산. 배당을 다시 더하지 않습니다.'}</p><h3>예상 월 배당 <span>원/월</span></h3><div id="weather-payout-chart">${C.svg(series('payout'),'payout',years)}</div><p class="weather-chart-note">각 월말 보유평가액 × 해당 월 연배당률 ÷ 12. 그 조건이 지속된다고 가정한 예상값이며, 해당 월 실제 계산 배당과 구분합니다.</p></section>`;
  }
  function monthlyTable(result,out) {
    return `<details class="weather-data-table"><summary>차트 수치표 보기 · 가상 경과월</summary><div class="weather-table-wrap"><table><caption>각 월말 기준 · 표시만 원 단위 반올림</caption><thead><tr><th>경과월</th><th>재투자 총가치</th><th>예상 월 배당</th>${out?'<th>인출 총가치</th><th>예상 월 배당</th>':''}</tr></thead><tbody>${C.points(result,'total').map((p,i)=>{const a=C.points(result,'payout')[i];return `<tr><th scope="row">${p.month}개월</th><td>${won(p.value)}</td><td>${won(a.value)}</td>${out?`<td>${won(C.points(out,'total')[i].value)}</td><td>${won(C.points(out,'payout')[i].value)}</td>`:''}</tr>`;}).join('')}</tbody></table></div></details>`;
  }
  function detail() {
    const result = E.simulate(scenario,years), out = scenario==='rain'?E.simulate('rain',years,true):null;
    const rainNote = `${conditions.rain}. ${years>10?'121개월째 같은 충격이 한 번 더 반복됩니다.':'이 기간에는 충격이 한 번 발생합니다.'} 7%로 회복하지 않습니다.`;
    const comparison = out ? `<section class="weather-comparison"><h2>비 오는 날 · 투자 방식 비교</h2><div class="weather-compare-grid"><article class="withdrawal"><h3>배당 인출형</h3><p>배당을 생활비 등으로 사용했다면</p><dl><dt>누적 배당인출액</dt><dd>${won(out.accumulated_dividend_withdrawals)}</dd><dt>기말 보유자산</dt><dd>${won(out.end_asset)}</dd><dt>비교용 총가치</dt><dd>${won(out.fair_total)}</dd><dt>누적 TR</dt><dd>${percent(out.tr_pct)}</dd></dl></article><article class="reinvestment"><h3>전액 재투자형</h3><p>받은 배당을 매월 다시 투자했다면</p><dl><dt>최종 보유자산</dt><dd>${won(result.end_asset)}</dd><dt>종료 예상 월 배당</dt><dd>${won(result.end_monthly_dividend)}</dd><dt>비교용 총가치</dt><dd>${won(result.fair_total)}</dd><dt>누적 TR</dt><dd>${percent(result.tr_pct)}</dd></dl></article></div><div class="weather-fair-gap"><span>같은 총가치 기준 차이</span><strong>${signedWon(result.fair_total-out.fair_total)}</strong></div><p class="weather-chart-note">인출 누적액에는 이미 사용한 금액이 포함됩니다. 비교용 총가치는 현재 현금잔고가 아닙니다.</p><p class="weather-rain-message">✓ 비가 와도 재투자는 멈추지 않는다.</p></section>` : '';
    $('weather-detail').innerHTML = `<p class="weather-condition">ⓘ ${out?rainNote:conditions[scenario]+'. 원금 보장이 아닌 가상 산술 조건입니다.'}</p><h2 class="weather-result-title">주요 결과 <small>(${years}년 · 전액 재투자형)</small></h2><div class="weather-result-grid"><article class="weather-start"><h3>최초 · 출발점</h3><dl><dt>가상 원금</dt><dd>${won(result.initial_asset)}</dd><dt>시나리오 시작 월 배당</dt><dd>${won(result.scenario_start_monthly_dividend_at_p0)}</dd></dl><p>가격 변동 전 · 연 ${scenario==='sun'?'7':scenario==='rain'?'3':'5'}% 기준</p></article><article class="weather-end"><h3>${years}년 후 · 가상 예상</h3><dl><dt>보유자산</dt><dd data-value="${result.end_asset}" id="weather-end-asset">${won(result.end_asset)}</dd><dt>예상 월 배당</dt><dd data-value="${result.end_monthly_dividend}" id="weather-end-dividend">${won(result.end_monthly_dividend)}</dd></dl><p>마지막 월 조건 지속 가정</p></article></div><p class="weather-start-note">공통 7% 시작 기준 월 배당: ${won(result.initial_monthly_dividend_at_initial_7pct)}.${out?' 비 첫 달 실제 계산 배당: '+won(result.monthly[0].monthly_dividend_earned)+'.':''}</p><div class="weather-tr"><span>기간 누적 총수익 (TR)</span><div><strong id="weather-tr-won" data-value="${result.tr_krw}">${signedWon(result.tr_krw)}</strong><strong id="weather-tr-pct" data-value="${result.tr_pct}">${percent(result.tr_pct)}</strong></div></div>${charts(result,out)}${comparison}${monthlyTable(result,out)}`;
  }
  function render() {
    document.body.dataset.weather = scenario || 'overview';
    $('weather-intro').hidden = !!scenario;$('weather-cards').hidden = !!scenario;
    $('weather-detail').hidden = !scenario;$('weather-detail-heading').hidden = !scenario;
    document.querySelectorAll('[data-years]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.years)===years));
    if (scenario) {
      $('weather-detail-name').textContent=names[scenario];$('weather-detail-icon').textContent=icons[scenario];
      $('weather-detail-tagline').textContent=scenario==='rain'?'그래도, 재투자는 멈추지 않습니다.':'시간이 배당을 다시 키웁니다.';
      detail();document.title=names[scenario]+' · '+years+'년 · 미래 날씨';
    } else { $('weather-cards').innerHTML=Object.keys(names).map(card).join('');document.title='미래 날씨 · 돈냄새연구소'; }
    $('weather-status').textContent=years+'년 '+(scenario?names[scenario]+' 결과':'세 가지 날씨')+' · 가상 예시';
  }
  document.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.dataset.years){years=Number(b.dataset.years);writeURL();render();}
    if(b.dataset.scenario){scenario=b.dataset.scenario;mode='both';writeURL();render();$('weather-detail-name').tabIndex=-1;$('weather-detail-name').focus({preventScroll:true});window.scrollTo({top:0,behavior:'smooth'});}
    if(b.id==='weather-back'){scenario=null;mode='both';writeURL();render();$('weather-cards').querySelector('button').focus({preventScroll:true});}
    if(b.dataset.chartMode){mode=b.dataset.chartMode;detail();document.querySelector(`[data-chart-mode="${mode}"]`).focus({preventScroll:true});}
  });
  window.addEventListener('popstate',()=>{readURL();render();});
  try {readURL();render();} catch(error) {$('weather-status').classList.remove('sr-only');$('weather-status').textContent='가상 결과를 표시하지 못했습니다. 새로고침해 주세요.';$('weather-cards').replaceChildren();}
  if('serviceWorker' in navigator)navigator.serviceWorker.register('management-sw.js').catch(()=>{});
})();
