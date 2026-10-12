/* Portal routing only. No ledger, data, calculation or storage operations. */
(function () {
  'use strict';
  function start() {
    const service = document.body.dataset.portalService;
    const analysisFlow = service === 'analysis' || service === 'terms';
    const home = service === 'management'
      ? 'asset-hub.html'
      : service === 'terms' ? 'terms.html'
      : service === 'output' ? 'output.html' : 'analysis.html';
    const bar = document.createElement('div');
    bar.className = 'portal-return-bar';
    const link = document.createElement('a');
    link.href = 'index.html';
    link.className = 'portal-return-link';
    link.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11 12 3l9 8M5 9v12h14V9M9 21v-8h6v8"/></svg><span>연구소 대문</span>';
    bar.append(link);
    document.body.prepend(bar);
    if (analysisFlow && !document.querySelector('.service-bottom')) {
      const nav = document.createElement('nav');
      nav.className = 'service-bottom';
      nav.setAttribute('aria-label', '공통 내비게이션');
      [['home', 'analysis.html', '홈'], ['analysis', 'analysis.html', '분석'], ['management', 'asset-hub.html', '관리']].forEach(function ([id, href, label]) {
        const a = document.createElement('a'); a.href = href; a.textContent = label;
        if (id === 'analysis') { a.className = 'active'; a.setAttribute('aria-current', 'page'); }
        nav.append(a);
      });
      document.body.append(nav);
      document.body.classList.add('has-service-bottom');
    }
    function connect() {
      document.querySelectorAll('a[href]').forEach(function (a) {
        if (a.closest('.portal-return-bar')) return;
        const url = new URL(a.getAttribute('href'), location.href);
        if (url.origin !== location.origin) return;
        if (service === 'analysis' && document.body.dataset.view === 'detail' && (a.classList.contains('fx-back') || a.classList.contains('back-link'))) {
          if (a.getAttribute('href') !== 'analysis-search.html') a.setAttribute('href', 'analysis-search.html');
          return;
        }
        const base = new URL('.', location.href);
        if (url.pathname !== base.pathname && url.pathname !== base.pathname + 'index.html') return;
        a.setAttribute('href', (analysisFlow ? 'analysis.html' : home) + (analysisFlow ? '' : url.search + url.hash));
      });
    }
    connect();
    new MutationObserver(connect).observe(document.body, {childList: true, subtree: true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
