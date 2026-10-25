'use strict';
/* apps/store.js — App Store UI. The catalog itself lives in Apps.catalog; apps add themselves with Apps.installable(). */
const CATALOG=Apps.catalog;
const inst=()=>S.installed||(S.installed={});
function uninstall(id){delete inst()[id];S.pins=(S.pins||[]).filter(x=>x!==id);S.desk=(S.desk||[]).filter(x=>x.app!==id);SC.dropApp(id);W.filter(x=>x.app===id).forEach(closeW);Apps.unmount(id);save();renderTB();desk()}
function renderStore(body){body.innerHTML=`<div class=st><div class=st-nav><h2><img src="${IC('tote-store')}">App Store</h2><button data-t=d>Discover</button><button data-t=i>Installed</button></div><div class=st-main></div></div>`;
 const main=$('.st-main',body);let tab='d',qy='',sel=null;
 const nav=()=>body.querySelectorAll('.st-nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab&&!sel));
 body.querySelectorAll('.st-nav button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;sel=null;draw()});
 function card(a,p){const c=H('button','st-card',p,`<img src="${IC(a.icon)}"><div><b></b><small></small></div>`);$('b',c).textContent=a.name;$('small',c).textContent=a.tagline;const t=H('span','st-tag',$('div',c),inst()[a.id]?'Installed':a.versions.length?'Available':'No versions yet');c.onclick=()=>{sel=a;draw()}}
 function draw(){main.innerHTML='';nav();
  if(sel){const a=sel,bk=H('button','btn',main,'← Back');bk.style.alignSelf='flex-start';bk.onclick=()=>{sel=null;draw()};const h=H('div','st-hero',main,`<img src="${IC(a.icon)}"><div><h2></h2><small style="opacity:.65"></small></div>`);$('h2',h).textContent=a.name;$('small',h).textContent=a.by+' · '+a.tag;
   const v=a.versions[a.versions.length-1];if(inst()[a.id]){const r=H('div','',main);H('button','btn dng',r,'Uninstall').onclick=()=>{uninstall(a.id);draw()}}else{const b=H('button','btn pri',main,v?'Install '+v.v:'No versions installable');b.style.alignSelf='flex-start';b.disabled=!v;if(!v)b.style.opacity=.5;else b.onclick=()=>{inst()[a.id]=v.v;Apps.sync();save();renderTB();RZ.toast(a.name+' installed — find it in the Start menu');draw()}}
   if(!v)H('small','',main,'There are currently no versions of this app that can be installed. Check back later.').style.opacity=.6;H('p','',main).textContent=a.desc;
   const i=H('div','st-info',main);[['Category',a.tag],['Publisher',a.by],['Latest version',v?v.v:'None available'],['Status',inst()[a.id]?'Installed ('+inst()[a.id]+')':'Not installed']].forEach(([k,x])=>{H('span','',i).textContent=k;H('span','',i).textContent=x});return}
  if(tab==='d'){const s=H('input','in',main);s.placeholder='Search apps';s.value=qy;s.oninput=()=>{qy=s.value;list()};H('h3','',main).textContent='Discover';const g=H('div','st-grid',main);const list=()=>{g.innerHTML='';const r=CATALOG.filter(a=>(a.name+a.tagline+a.tag).toLowerCase().includes(qy.toLowerCase()));r.forEach(a=>card(a,g));if(!r.length)H('div','st-empty',g,'No apps found')};list();s.onkeydown=e=>e.stopPropagation()}
  else{H('h3','',main).textContent='Installed';const l=CATALOG.filter(a=>inst()[a.id]);if(!l.length)H('div','st-empty',main,'No apps installed yet');l.forEach(a=>{const r=H('div','st-row',main,`<img src="${IC(a.icon)}"><div><b></b><br><small style="opacity:.6"></small></div>`);$('b',r).textContent=a.name;$('small',r).textContent='Version '+inst()[a.id];H('button','btn',r,'Details').onclick=()=>{sel=a;draw()};H('button','btn dng',r,'Uninstall').onclick=()=>{uninstall(a.id);draw()}})}}
 draw()}
Apps.register('store',{name:'App Store',icon:'tote-store',w:860,h:560,cat:'system',perms:['desktop'],render:renderStore});
