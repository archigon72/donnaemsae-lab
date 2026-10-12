/* Original Core indices are rendered directly. No return or reinvestment formulas. */
window.ComparisonRender = (result, items, basis = 'tr') => {
  const $ = id => document.getElementById(id);
  const colors = ['#77ecc6','#ffc76b','#79b6ff','#ff91b4','#c6a1ff'];
  const numeric = result.series.flatMap(row => row[basis].map(Number));
  if (numeric.some(n => !Number.isFinite(n))) throw Error('그래프 수치가 유효하지 않습니다.');
  let min = Math.min(...numeric), max = Math.max(...numeric);
  const pad = Math.max(1, (max-min)*.08); min -= pad; max += pad;
  const W=760,H=330,L=58,R=735,T=20,B=285;
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');svg.classList.add('comparison-chart');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',`${basis==='tr'?'NAV-TR':'Raw NAV'} 공통기간 실제 비교 · ${items.length}개 선`);
  const make=(tag,attrs,text)=>{const node=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));if(text!==undefined)node.textContent=text;svg.append(node);};
  const y=v=>B-(v-min)/(max-min)*(B-T);
  // Calendar positions preserve gaps in common observation dates without interpolation.
  const time=d=>Date.parse(d+'T00:00:00Z'), first=time(result.actual_period.start),last=time(result.actual_period.end);
  const x=d=>L+(time(d)-first)/(last-first)*(R-L);
  for(let i=0;i<4;i++){const v=min+(max-min)*i/3;make('path',{d:`M${L} ${y(v)}H${R}`,stroke:'#304e57',fill:'none'});make('text',{x:3,y:y(v)+4,fill:'#b7d2d1','font-size':12},v.toFixed(1));}
  items.forEach((item,i)=>make('path',{d:result.series.map((row,j)=>(j?'L':'M')+x(row.date).toFixed(2)+' '+y(Number(row[basis][i])).toFixed(2)).join(' '),stroke:colors[i],'stroke-width':2.4,fill:'none','data-ticker':item.code}));
  make('text',{x:L,y:315,fill:'#b7d2d1','font-size':12},result.actual_period.start);make('text',{x:R,y:315,fill:'#b7d2d1','font-size':12,'text-anchor':'end'},result.actual_period.end);
  $('comparison-chart').replaceChildren(svg);
  $('comparison-legend').replaceChildren();$('comparison-table').replaceChildren();
  items.forEach((item,i)=>{
    const li=document.createElement('li'),mark=document.createElement('i'),name=document.createElement('span');mark.style.background=colors[i];name.textContent=item.name+' · '+item.code+(item.kind==='reference'?' (참고시장 대표 ETF)':'');li.append(mark,name);$('comparison-legend').append(li);
    const row=document.createElement('tr'),label=document.createElement('th');label.scope='row';label.textContent=item.name;const code=document.createElement('small');code.textContent=item.code;label.append(code);row.append(label);
    for(const [key,suffix] of [['tr_return','%'],['difference_pp','%p']]){const td=document.createElement('td');td.textContent=Number(result.returns[i][key]).toFixed(2)+suffix;row.append(td);}$('comparison-table').append(row);
  });
  $('comparison-range').textContent=`공통기간 ${result.actual_period.start} ~ ${result.actual_period.end} · ${result.observations}개 실제 공통 관측일`+(result.initial_anchor_added?' · 시작일 분배 전 기준값 100 포함':'');
  $('comparison-table-basis').textContent=`NAV-TR 기준 · 기준 ETF: ${items[0].name} (${items[0].code}) · 성과차 = 각 대상 − 기준 ETF`;
};
