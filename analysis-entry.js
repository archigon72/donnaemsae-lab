/* Analysis entry only: catalog search, no calculation or ledger state. */
(() => {
  'use strict';
  const input = document.getElementById('entry-search');
  const results = document.getElementById('entry-results');
  const status = document.getElementById('entry-status');
  const guide = document.getElementById('entry-guide');
  let catalog = null, failed = false, open = false;
  const normalize = value => String(value).toLocaleLowerCase().replace(/\s+/g, '');
  function update() {
    const query = normalize(input.value.trim());
    results.replaceChildren();
    results.hidden = !open;
    guide.hidden = open;
    document.body.classList.toggle('search-active', open);
    if (!open) { status.textContent = '종목명, 코드, 일부 키워드로 검색해 보세요.'; return; }
    if (failed) { status.textContent = '종목 목록을 읽지 못했습니다. 새로고침해 주세요.'; return; }
    if (!catalog) { status.textContent = '종목 목록을 읽는 중…'; return; }
    const matches = catalog.filter(row => normalize(row.ticker).includes(query) || normalize(row.name).includes(query));
    status.textContent = matches.length ? '검색 결과 ' + matches.length + '개' : '검색 결과가 없습니다. 종목명이나 코드를 확인해 주세요.';
    const list = document.createElement('ul');
    for (const row of matches) {
      const li = document.createElement('li'), link = document.createElement('a');
      link.className = 'entry-result';
      link.href = 'detail.html?code=' + encodeURIComponent(row.ticker);
      const main = document.createElement('span'), name = document.createElement('b'), code = document.createElement('small'), action = document.createElement('span');
      main.className = 'entry-result-main'; name.textContent = row.name; code.textContent = row.ticker;
      action.className = 'entry-result-go'; action.textContent = '분석 →';
      main.append(name, code); link.append(main, action); li.append(link); list.append(li);
    }
    results.append(list);
  }
  // Each entry, refresh and BFCache return starts empty. No search/scroll persistence.
  function reset() { input.value = ''; open = false; input.blur(); update(); window.scrollTo(0, 0); }
  input.addEventListener('input', update);
  input.addEventListener('focus', () => { open = true; update(); input.scrollIntoView({block:'start',behavior:'smooth'}); });
  input.addEventListener('blur', () => { setTimeout(() => { if (document.activeElement !== input && !results.contains(document.activeElement)) { open = false; update(); } }, 180); });
  results.addEventListener('pointerdown', event => { if(event.target.closest('a')) event.preventDefault(); });
  results.addEventListener('click', event => { if(event.target.closest('a')) input.blur(); });
  window.addEventListener('pageshow', event => { if (event.persisted) reset(); });
  document.getElementById('entry-search-form').addEventListener('submit', event => { event.preventDefault(); update(); });
  reset();
  fetch('data/catalog.json').then(response => { if (!response.ok) throw Error('catalog'); return response.json(); }).then(data => {
    if (!Array.isArray(data.items) || !data.items.every(row => typeof row.ticker === 'string' && typeof row.name === 'string')) throw Error('catalog format');
    catalog = data.items; update();
  }).catch(() => { failed = true; update(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('management-sw.js').catch(() => {});
})();
