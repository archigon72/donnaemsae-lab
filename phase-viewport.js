'use strict';
if(document.body.dataset.view==='detail'&&matchMedia('(max-width:760px)').matches){document.body.className='mobile';document.body.dataset.mobile='true';}
if(document.body.dataset.view==='home'&&matchMedia('(max-width:760px)').matches){location.replace('mobile-detail.html'+location.search);}
