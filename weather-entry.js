/* Minimal asset-home entry. Does not touch the management app or storage. */
(() => {
  'use strict';
  const entry=document.createElement('a');entry.href='weather.html';entry.className='weather-home-entry';
  entry.innerHTML='<span aria-hidden="true">🌤️</span><span><strong>미래 날씨</strong><small>배당 재투자가 만드는 5·10·15·20년의 숲<br>1,000만원 가상 예시 · 실제 보유계좌와 무관</small></span><b aria-hidden="true">›</b>';
  document.querySelector('#app').before(entry);
})();
