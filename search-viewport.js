/* Viewport handling only. No app data access. */
(() => {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const update = () => document.body.classList.toggle('keyboard-open',
    /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '') && viewport.height < window.innerHeight * .78);
  viewport.addEventListener('resize', update);
  document.addEventListener('focusin', update);
  document.addEventListener('focusout', update);
})();
