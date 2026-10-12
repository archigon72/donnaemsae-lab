/* Shared shell and delegated cross-mode routing only. Calculation scripts unchanged. */
(function(){document.addEventListener('DOMContentLoaded',()=>{
const P=ProductShell;
const top=document.querySelector('.topbar');if(top){top.classList.add('lab-header');top.innerHTML=P.brand+P.nav('analysis','lab-topnav')}
const brand=document.querySelector('.brand');if(brand)brand.outerHTML=P.brand.replace('class="lab-brand"','class="brand lab-brand"');
const mh=document.querySelector('.mobile-header');if(mh)mh.innerHTML=P.brand;
if(document.querySelector('.terms-content'))document.body.insertAdjacentHTML('afterbegin','<header class="lab-header">'+P.brand+P.nav('analysis','lab-topnav')+'</header>');
document.querySelector('.bottom-nav')?.remove();const nav=document.createElement('div');nav.innerHTML=P.nav('analysis','lab-analysis-bottom');document.body.append(nav.firstChild);
// Remove obsolete prototype sidebar links; expose the same three product destinations.
const sidebar=document.querySelector('.sidebar nav');if(sidebar)sidebar.innerHTML=P.nav('analysis','lab-topnav');
function connect(){const selected=P.code(new URLSearchParams(location.search).get('code'));if(selected)P.write('analysis-code',selected);const device=document.querySelector('.sidebar .device-link');if(device&&selected)device.href='mobile-detail.html?code='+encodeURIComponent(selected)+location.hash;const b=document.querySelector('.add-cta button');if(b){b.disabled=false;b.removeAttribute('aria-disabled');b.dataset.productTrade='true'}document.querySelectorAll('a[href="holdings.html"],a[href="mobile-holdings.html"]').forEach(a=>{a.href='management.html';a.classList.remove('disabled');a.removeAttribute('aria-disabled');a.removeAttribute('tabindex')})}
connect();new MutationObserver(connect).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});window.addEventListener('popstate',connect);
document.addEventListener('click',e=>{if(!e.target.closest('[data-product-trade]'))return;const c=P.code(new URLSearchParams(location.search).get('code'));if(c)location.assign('management.html?register='+encodeURIComponent(c))});
});})();
