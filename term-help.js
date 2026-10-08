'use strict';
// UI only. Confirmed copy is injected through data/term-help-content.json.
window.TermHelp=(()=>{
 const terms=[['distribution-yield','최근 12개월 분배율'],['raw-nav','Raw NAV'],['nav-tr','NAV-TR'],['reinvestment-effect','재투자 효과'],['mdd','MDD'],['recovery-period','회복기간'],['tracking-index','추종지수'],['reference-market','참고시장']];
 const names=new Map(terms);let content={},active=null,root=null,panel=null,inertSaved=[],overflowBefore='',locked=false;
 const loaded=fetch('./data/term-help-content.json').then(r=>{if(!r.ok)throw Error('Help content HTTP '+r.status);return r.json();}).then(x=>{content=x.terms||{};if(active){fill(active.dataset.termHelp);position();}return x;}).catch(()=>({terms:{}}));
 const mobile=()=>document.body.classList.contains('mobile');
 function button(id){const b=document.createElement('button');b.type='button';b.className='term-help-trigger';b.dataset.termHelp=id;b.textContent='?';b.setAttribute('aria-label',names.get(id)+' 설명');b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls','term-help-panel');return b;}
 function attach(el,id,token){if(!el)return;const b=button(id);
  if(token){const node=[...el.childNodes].find(n=>n.nodeType===3&&n.textContent.includes(token));if(node){const i=node.textContent.indexOf(token),text=node.textContent;node.replaceWith(document.createTextNode(text.slice(0,i)+token),b,document.createTextNode(text.slice(i+token.length)));return;}}
  el.append(b);
 }
 function mount(main){close(false);if(main.querySelector('[data-term-help]'))return;
  main.querySelector('.ratio-help')?.remove();
  attach(main.querySelector('#dist .dist-cards > :nth-child(3) > span'),'distribution-yield');
  attach(main.querySelector('#perf .performance-metrics > :nth-child(1) > span'),'raw-nav','Raw NAV');
  attach(main.querySelector('#perf .performance-metrics > :nth-child(2) > span'),'nav-tr','NAV-TR');
  attach(main.querySelector('#perf .perf-combined > span'),'reinvestment-effect');
  attach(main.querySelector('#mdd h2'),'mdd','MDD');
  const duration=main.querySelector('#mdd [data-health="raw"] .health-duration');
  if(duration?.textContent.startsWith('회복기간'))attach(duration,'recovery-period','회복기간');
  else if(duration){const label=document.createElement('span');label.className='term-recovery-context';label.textContent='회복기간';label.append(button('recovery-period'),document.createTextNode(' · '));duration.prepend(label);}
  attach(main.querySelector('#market .tracking-area h3'),'tracking-index');
  attach(main.querySelector('#market .reference-area h3'),'reference-market','참고시장');
 }
 function ensure(){if(root)return;root=document.createElement('div');root.id='term-help-layer';root.hidden=true;root.innerHTML='<div class="term-help-backdrop"></div><div id="term-help-panel" role="dialog" aria-labelledby="term-help-title" tabindex="-1"><div class="term-help-heading"><h2 id="term-help-title"></h2><button type="button" class="term-help-close" aria-label="용어 도움 닫기">×</button></div><p class="term-help-short" hidden></p><p class="term-help-caution" hidden></p><a class="term-help-more">자세히 보기 →</a></div>';document.body.append(root);panel=root.querySelector('#term-help-panel');root.querySelector('.term-help-close').addEventListener('click',()=>close());}
 function copyText(el,text){el.replaceChildren();for(const part of String(text||'').split(/(\*\*[^*]+\*\*|`[^`]+`)/g)){if(!part)continue;if(part.startsWith('**')){const strong=document.createElement('strong');strong.textContent=part.slice(2,-2);el.append(strong);}else el.append(document.createTextNode(part.startsWith('`')?part.slice(1,-1):part));}}
 function fill(id){const item=content[id]||{};root.querySelector('#term-help-title').textContent=names.get(id);
  for(const [selector,key] of [['.term-help-short','short'],['.term-help-caution','caution']]){const el=root.querySelector(selector);copyText(el,item[key]);if(key==='caution'&&item[key]){const label=document.createElement('strong');label.textContent='주의';el.prepend(label,document.createElement('br'));}el.hidden=!item[key];}
  const url=new URL('terms.html',location.href);url.searchParams.set('from',mobile()?'mobile-detail.html':'detail.html');if(window.detailVM?.ticker||window.lastDetailViewModel?.ticker)url.searchParams.set('code',window.lastDetailViewModel?.ticker||window.detailVM.ticker);url.hash=id;root.querySelector('.term-help-more').href=url.href;
 }
 function position(){if(!active||mobile())return;const r=active.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight){close(false);return;}const w=panel.offsetWidth,h=panel.offsetHeight;const x=Math.min(Math.max(12,r.left),Math.max(12,innerWidth-w-12));let y=r.bottom+10;if(y+h>innerHeight-12)y=r.top-h-10;y=Math.max(12,Math.min(y,innerHeight-h-12));panel.style.left=x+'px';panel.style.top=y+'px';}
 function open(trigger){ensure();if(active===trigger){close();return;}close(false);active=trigger;fill(trigger.dataset.termHelp);root.dataset.mode=mobile()?'sheet':'popover';panel.setAttribute('aria-modal',mobile()?'true':'false');root.hidden=false;active.setAttribute('aria-expanded','true');
  if(mobile()){overflowBefore=document.body.style.overflow;document.body.style.overflow='hidden';locked=true;inertSaved=[...document.body.children].filter(e=>e!==root&&!['SCRIPT','STYLE','LINK'].includes(e.tagName)).map(e=>[e,e.inert]);for(const [e] of inertSaved)e.inert=true;}
  position();panel.focus({preventScroll:true});
 }
 function close(returnFocus=true){if(!active)return;const previous=active;active=null;root.hidden=true;previous.setAttribute('aria-expanded','false');if(locked){document.body.style.overflow=overflowBefore;locked=false;}for(const [e,value] of inertSaved)e.inert=value;inertSaved=[];if(returnFocus&&previous.isConnected)previous.focus({preventScroll:true});}
 document.addEventListener('click',e=>{const trigger=e.target.closest('[data-term-help]');if(trigger){e.preventDefault();e.stopPropagation();open(trigger);}},true);
 document.addEventListener('pointerdown',e=>{if(active&&!panel.contains(e.target)&&!e.target.closest('[data-term-help]'))close();});
 document.addEventListener('keydown',e=>{if(!active)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}else if(e.key==='Tab'&&mobile()){const links=[...panel.querySelectorAll('button,a[href]')];const first=links[0],last=links.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel)){e.preventDefault();last.focus({preventScroll:true});}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===panel)){e.preventDefault();first.focus({preventScroll:true});}}},true);
 addEventListener('resize',position);addEventListener('scroll',position,true);
 return {mount,close,loaded,terms};
})();
