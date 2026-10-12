/* Selection and read-only comparison orchestration. Original Core runs in a Worker. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const input = $('compare-search'), results = $('compare-results'), selected = $('compare-selected');
  const etfs = new Map(), markets = new Set(), support = new Map();
  const refs = [['379800','S&P500'],['379810','NASDAQ100'],['069500','KOSPI200'],['229200','KOSDAQ150']];
  let catalog = null, failed = false, open = false, period = '1년', basis = 'tr', sequence = 0, worker = null, current = null, currentItems = [];
  function invalidate() { sequence++; current = null; $('comparison-output').hidden = true; $('comparison-results').hidden = true; $('comparison-chart').replaceChildren(); $('comparison-table').replaceChildren(); $('comparison-available').replaceChildren(); $('compare-ready').textContent = ''; }
  const ready = () => etfs.size >= 1 && etfs.size + markets.size >= 2;
  const normalize = value => String(value).toLocaleLowerCase().replace(/\s+/g, '');
  function update() {
    results.replaceChildren(); selected.replaceChildren();
    const q = normalize(input.value.trim());
    results.hidden = !open;
    if (!open) $('compare-search-status').textContent = '검색창을 누르면 112개 ETF가 펼쳐집니다.';
    else if (failed) $('compare-search-status').textContent = '종목 목록을 읽지 못했습니다. 새로고침해 주세요.';
    else if (!catalog) $('compare-search-status').textContent = '종목 목록을 읽는 중…';
    else {
      const rows = catalog.filter(r => normalize(r.ticker).includes(q) || normalize(r.name).includes(q));
      $('compare-search-status').textContent = rows.length ? '검색 결과 ' + rows.length + '개' : '검색 결과가 없습니다.';
      for (const row of rows) {
        const li = document.createElement('li'), button = document.createElement('button'), main = document.createElement('span'), name = document.createElement('b'), code = document.createElement('small'), action = document.createElement('em');
        name.textContent = row.name; code.textContent = row.ticker; main.append(name, code);
        action.textContent = etfs.has(row.ticker) ? '선택됨' : '추가'; button.className = 'compare-result'; button.type = 'button';
        button.disabled = etfs.has(row.ticker) || etfs.size >= 3; button.append(main, action);
        button.addEventListener('click', () => { if (etfs.size >= 3 || etfs.has(row.ticker)) return; etfs.set(row.ticker,row); invalidate(); open = false; input.blur(); update(); });
        li.append(button); results.append(li);
      }
    }
    for (const row of etfs.values()) {
      const li = document.createElement('li'), name = document.createElement('span'), remove = document.createElement('button');
      name.textContent = row.name + ' · ' + row.ticker; remove.textContent = '제거'; remove.type = 'button'; remove.setAttribute('aria-label', row.ticker + ' 제거');
      remove.addEventListener('click', () => { etfs.delete(row.ticker); invalidate(); update(); }); li.append(name,remove); selected.append(li);
    }
    for (const [code] of refs) {
      const checkbox = $('reference-' + code); checkbox.checked = markets.has(code);
      checkbox.disabled = !support.get(code)?.available || markets.size >= 2 && !markets.has(code);
    }
    const total = etfs.size + markets.size;
    $('compare-selection-status').textContent = 'ETF ' + etfs.size + '/3 · 참고시장 ' + markets.size + '/2 · 합계 ' + total + '/5. ' + (!ready() ? 'ETF 1개 이상 · 총 2개 이상 선택해 주세요.' : '같은 공통기간으로 비교할 수 있습니다.');
    $('compare-confirm').disabled = !ready();
  }
  for (const [code,name] of refs) {
    const label = document.createElement('label'), checkbox = document.createElement('input'), text = document.createElement('span'), caption = document.createElement('small');
    checkbox.type = 'checkbox'; checkbox.id = 'reference-' + code; checkbox.disabled = true; text.append(document.createTextNode(name)); caption.id = 'reference-status-' + code; caption.textContent = '로컬 자료 확인 중'; text.append(caption); label.append(checkbox,text); $('compare-markets').append(label);
    checkbox.addEventListener('change', () => { if (checkbox.checked && markets.size < 2 && support.get(code)?.available) markets.add(code); else markets.delete(code); invalidate(); update(); });
    fetch('references/' + code + '.json').then(r => { if (!r.ok) throw Error('reference'); return r.json(); }).then(data => {
      const rows = Array.isArray(data.nav_rows) ? data.nav_rows.filter(r => /^\d{8}$/.test(r.gijunYmd) && Number.isFinite(r.fp) && r.fp > 0) : [];
      if (rows.length < 2 || !Array.isArray(data.distribution_rows) || data.ticker !== code) throw Error('reference data');
      const dates = rows.map(r=>r.gijunYmd).sort(); support.set(code,{available:true}); caption.textContent = '기존 대표 ETF ' + code + ' · 자료 ' + dates[0] + '–' + dates[dates.length-1]; update();
    }).catch(() => { support.set(code,{available:false}); markets.delete(code); caption.textContent = '선택 불가 · 로컬 NAV/분배 자료 확인 실패'; update(); });
  }
  input.addEventListener('input',update);
  input.addEventListener('focus',()=>{open=true;update();input.scrollIntoView({block:'start',behavior:'smooth'});});
  input.addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement!==input&&!results.contains(document.activeElement)){open=false;update();}},180));
  results.addEventListener('pointerdown',event=>{if(event.target.closest('button'))event.preventDefault();});
  ['1개월','6개월','1년','전체','직접지정'].forEach(name=>{
    const button=document.createElement('button');button.type='button';button.textContent=name;button.dataset.period=name;button.setAttribute('aria-pressed',name===period);
    button.addEventListener('click',()=>{period=name;invalidate();for(const b of $('compare-periods').children)b.setAttribute('aria-pressed',b===button);$('compare-dates').hidden=name!=='직접지정';});$('compare-periods').append(button);
  });
  for(const id of ['compare-start','compare-end'])$(id).addEventListener('input',invalidate);
  $('compare-basis').addEventListener('click',event=>{const b=event.target.closest('[data-basis]');if(!b)return;basis=b.dataset.basis;for(const item of $('compare-basis').children)item.setAttribute('aria-pressed',item===b);if(current)ComparisonRender(current,currentItems,basis);});
  function showRanges(result,items){$('comparison-available').replaceChildren();for(const range of result.ranges||[]){const li=document.createElement('li');li.textContent=(items.find(x=>x.code===range.ticker)?.name||range.ticker)+' · '+range.ticker+' · 가용기간 '+(range.start||'자료 없음')+' ~ '+(range.end||'자료 없음');$('comparison-available').append(li);}}
  $('compare-confirm').addEventListener('click',()=>{
    if(!ready())return;invalidate();const id=sequence;
    const items=[...Array.from(etfs.values(),row=>({kind:'etf',code:row.ticker,name:row.name})),...Array.from(markets,code=>({kind:'reference',code,name:refs.find(x=>x[0]===code)[1]}))];
    $('comparison-output').hidden=false;$('comparison-error').hidden=true;$('compare-ready').textContent='비교 계산 준비 중…';
    if(!worker){worker=new Worker('comparison-worker.js');worker.onerror=()=>{invalidate();$('compare-ready').textContent='계산 엔진 연결 실패. 다시 비교해 주세요.';worker.terminate();worker=null;};}
    worker.onmessage=({data})=>{
      if(data.id!==sequence)return;
      if(data.type==='progress'){$('compare-ready').textContent=data.message;return;}
      $('compare-ready').textContent='';$('comparison-output').hidden=false;
      if(data.type==='failure'){ $('comparison-error').hidden=false;$('comparison-error').textContent='데이터 없음 · '+data.message;worker.terminate();worker=null;return;}
      showRanges(data.result,items);
      if(data.result.status!=='OK'){$('comparison-error').hidden=false;$('comparison-error').textContent='데이터 없음 · '+data.result.message;}
      else {current=data.result;currentItems=items;try{ComparisonRender(current,items,basis);$('comparison-results').hidden=false;}catch(error){$('comparison-error').hidden=false;$('comparison-error').textContent='데이터 없음 · '+error.message;}}
      $('comparison-output').scrollIntoView({block:'start',behavior:'smooth'});
    };
    worker.postMessage({id,items,etfCount:etfs.size,period,start:$('compare-start').value,end:$('compare-end').value});
  });
  window.addEventListener('pageshow', event => { if (!event.persisted) return; etfs.clear(); markets.clear(); input.value = ''; open=false;input.blur();invalidate();update(); });
  fetch('data/catalog.json').then(r => { if (!r.ok) throw Error('catalog'); return r.json(); }).then(data => {
    if (!Array.isArray(data.items) || !data.items.every(r=>typeof r.ticker==='string' && typeof r.name==='string')) throw Error('catalog format'); catalog=data.items; update();
  }).catch(() => { failed=true; update(); });
  update();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('management-sw.js').catch(() => {});
})();
