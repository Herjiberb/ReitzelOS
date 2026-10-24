'use strict';
const $=(s,e=document)=>e.querySelector(s),H=(t,c,p,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.innerHTML=x;if(p)p.append(e);return e};
const DEF=()=>({profiles:[{id:1,name:'User',avatar:null,letters:true,salt:'',hash:'',bg:null,lockbg:null}],cur:1,mil:false,conn:false,size:'compact'});
let S=DEF(),DB;
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('reitzel-os',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const load=()=>new Promise(res=>{const q=DB.transaction('kv').objectStore('kv').get('state');q.onsuccess=()=>res(q.result);q.onerror=()=>res()});
const bgv=d=>d?`url(${d})`:'linear-gradient(135deg,#0a0030,#1d0040 50%,#001a3d)';
const hash=async(pw,salt)=>{const d=new TextEncoder().encode(salt+'|'+pw);if(crypto.subtle){const b=await crypto.subtle.digest('SHA-256',d);return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}let h=5381;for(const c of d)h=(h*33^c)>>>0;return'f'+h};
const setPw=async(p,v)=>{if(!v){p.salt=p.hash='';return}p.salt=[...crypto.getRandomValues(new Uint32Array(3))].join('-');p.hash=await hash(v,p.salt)};
const factory=()=>{if(!confirm('Factory reset? This erases all profiles, passwords, wallpapers and settings.'))return;try{DB.close()}catch{}localStorage.removeItem('rzos');const q=indexedDB.deleteDatabase('reitzel-os');q.onsuccess=q.onerror=q.onblocked=()=>location.reload()};
const save=()=>{try{DB.transaction('kv','readwrite').objectStore('kv').put(S,'state')}catch(e){console.error(e)}};
const prof=id=>S.profiles.find(p=>p.id===(id??S.cur))||S.profiles[0];
const av=(p,c)=>{const e=H('div','av '+(c||''));if(p.avatar&&!p.letters){e.innerHTML=`<img class=av src="${p.avatar}">`}else e.textContent=(p.name||'?')[0].toUpperCase();return e};
const X={min:'<svg viewBox="0 0 12 12"><path d="M2 6h8"/></svg>',max:'<svg viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" rx="2"/></svg>',res:'<svg viewBox="0 0 12 12"><rect x="2" y="3.5" width="6.5" height="6.5" rx="1.5"/><path d="M4 3.5V2.5a1 1 0 011-1h4.500a1 1 0 011 1V7a1 1 0 01-1 1H8.500"/></svg>',x:'<svg viewBox="0 0 12 12"><path d="M2.500 2.500l7 7M9.500 2.500l-7 7"/></svg>'};
const IC=n=>`assets/${n}-icon.svg`;
/* ---------- theme / bg ---------- */
function applyTheme(){const r=document.documentElement.style;r.setProperty('--bg',bgv(prof().bg));
 const z={compact:[38,20],roomy:[48,28],luxurious:[66,44]}[S.size];r.setProperty('--tbh',z[0]+'px');r.setProperty('--ico',z[1]+'px');$('#tb').classList.toggle('conn',S.conn);renderTB()}
/* ---------- apps ---------- */
const APPS={files:{name:'File Explorer',icon:'folder',w:720,h:460,render:b=>{b.innerHTML=`<div class=files><img src="${IC('folder')}"><h1>File Explorer</h1></div>`}},
 settings:{name:'Settings',icon:'compass-settings',w:820,h:540,render:renderSettings}};
let pinned=['files','settings'],W=[],zc=10,nid=1;
/* ---------- windows ---------- */
const area=()=>({w:innerWidth,h:innerHeight-(S.conn?parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tbh'))+2:parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tbh'))+16)});
function openApp(id){const a=APPS[id],A=area(),o=W.length%6*28;const el=H('div','win',$('#wins'));
 const w={id:nid++,app:id,el,min:false,max:false,prev:null};W.push(w);
 const bw=Math.min(a.w,A.w-20),bh=Math.min(a.h,A.h-20);Object.assign(el.style,{width:bw+'px',height:bh+'px',left:Math.max(0,(A.w-bw)/2+o-60)+'px',top:Math.max(0,(A.h-bh)/2+o-40)+'px'});
 el.innerHTML=`<div class=tbar><img src="${IC(a.icon)}"><span>${a.name}</span><button class="wb m">${X.min}</button><button class="wb mx"><i class=ic>${X.max}</i><div class=snapm></div></button><button class="wb x">${X.x}</button></div><div class=body></div>`+['n','s','e','w','ne','nw','se','sw'].map(d=>`<div class="rz ${d}" data-d=${d}></div>`).join('');
 const sm=$('.snapm',el);[['l',[0,0,50,100]],['r',[50,0,50,100]],['t',[0,0,100,50]],['tl',[0,0,50,50]],['tr',[50,0,50,50]],['b',[0,50,100,50]],['bl',[0,50,50,50]],['br',[50,50,50,50]],['c',[25,10,50,80]]].forEach(([m,r])=>{const i=H('i','',sm,`<b style="left:${r[0]}%;top:${r[1]}%;width:${r[2]}%;height:${r[3]}%"></b>`);i.onclick=e=>{e.stopPropagation();snap(w,r)}});
 $('.m',el).onclick=()=>minim(w);$('.x',el).onclick=()=>closeW(w);$('.mx',el).onclick=e=>{if(!e.target.closest('.snapm'))toggleMax(w)};
 $('.tbar',el).ondblclick=e=>{if(!e.target.closest('button'))toggleMax(w)};
 el.onpointerdown=()=>focusW(w);drag(w);resize(w);a.render($('.body',el),w);focusW(w);renderTB();return w}
function focusW(w){w.min=false;w.el.classList.remove('min');w.el.style.zIndex=++zc;W.forEach(x=>x.el.classList.toggle('foc',x===w));renderTB()}
function minim(w){w.min=true;w.el.classList.add('min');W.forEach(x=>x.el.classList.remove('foc'));renderTB()}
function closeW(w){w.el.remove();W=W.filter(x=>x!==w);renderTB()}
function toggleMax(w){const e=w.el,A=area();if(w.max){Object.assign(e.style,w.prev);w.max=false;e.classList.remove('max')}else{w.prev={left:e.style.left,top:e.style.top,width:e.style.width,height:e.style.height};Object.assign(e.style,{left:0,top:0,width:A.w+'px',height:innerHeight+'px'});w.max=true;e.classList.add('max')}
 $('.ic',e).innerHTML=w.max?X.res:X.max;e.classList.add('snap');setTimeout(()=>e.classList.remove('snap'),200);focusW(w)}
function snap(w,r){const A=area(),e=w.el;if(w.max){w.max=false;e.classList.remove('max');$('.ic',e).innerHTML=X.max}e.classList.add('snap');
 Object.assign(e.style,{left:A.w*r[0]/100+'px',top:A.h*r[1]/100+'px',width:A.w*r[2]/100+'px',height:A.h*r[3]/100+'px'});setTimeout(()=>e.classList.remove('snap'),200);focusW(w)}
function drag(w){const t=$('.tbar',w.el);t.onpointerdown=e=>{if(e.target.closest('button'))return;let sx=e.clientX,sy=e.clientY,L=w.el.offsetLeft,T=w.el.offsetTop;t.setPointerCapture(e.pointerId);
 if(w.max){const ratio=e.clientX/innerWidth;toggleMax(w);L=e.clientX-w.el.offsetWidth*ratio;T=0;sx=e.clientX;sy=e.clientY;w.el.style.left=L+'px'}
 t.onpointermove=m=>{w.el.style.left=L+m.clientX-sx+'px';w.el.style.top=Math.max(0,T+m.clientY-sy)+'px'};
 t.onpointerup=m=>{t.onpointermove=null;if(m.clientY<4)toggleMax(w)}}}
function resize(w){w.el.querySelectorAll('.rz').forEach(r=>r.onpointerdown=e=>{e.stopPropagation();focusW(w);const d=r.dataset.d,el=w.el,s={x:e.clientX,y:e.clientY,l:el.offsetLeft,t:el.offsetTop,w:el.offsetWidth,h:el.offsetHeight};r.setPointerCapture(e.pointerId);
 r.onpointermove=m=>{const dx=m.clientX-s.x,dy=m.clientY-s.y,mw=280,mh=180;if(d.includes('e'))el.style.width=Math.max(mw,s.w+dx)+'px';if(d.includes('s'))el.style.height=Math.max(mh,s.h+dy)+'px';
 if(d.includes('w')){const nw=Math.max(mw,s.w-dx);el.style.width=nw+'px';el.style.left=s.l+s.w-nw+'px'}if(d.includes('n')){const nh=Math.max(mh,s.h-dy);el.style.height=nh+'px';el.style.top=s.t+s.h-nh+'px'}};r.onpointerup=()=>r.onpointermove=null})}
/* ---------- taskbar ---------- */
const tb=$('#tb');
function renderTB(){const A=[...pinned];W.forEach(w=>{if(!A.includes(w.app))A.push(w.app)});tb.innerHTML='';
 const s=H('button','tbb',tb,`<img src="${IC('reitzel')}">`);s.onclick=e=>{e.stopPropagation();toggleStart()};
 const box=H('div','apps',tb);const sz=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ico'))+14;
 const fit=Math.max(1,Math.floor((innerWidth-(S.conn?60:90)-330-sz*2)/sz)),vis=A.length>fit?A.slice(0,fit-1):A,rest=A.slice(vis.length);
 const btn=(id,p)=>{const ws=W.filter(w=>w.app===id),b=H('button','tbb'+(ws.length?' run':'')+(ws.some(w=>w.el.classList.contains('foc'))?' act':''),p,`<img src="${IC(APPS[id].icon)}">`);b.title=APPS[id].name;
  b.onclick=e=>{e.stopPropagation();if(!ws.length)openApp(id);else if(ws.length>1)previews(ws,b);else{const w=ws[0];(w.el.classList.contains('foc')&&!w.min)?minim(w):focusW(w)}};return b};
 vis.forEach(id=>btn(id,box));
 if(rest.length){const m=H('button','tbb more',box,'···');m.onclick=e=>{e.stopPropagation();miniBar(rest,m,btn)}}
 H('div','sp',tb);const wf=H('button','tbb',tb,`<img src="${IC('network')}">`);wf.title='Network';
 const c=H('div','clk',tb);const tick=()=>{const d=new Date();c.innerHTML=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:!S.mil})+'<br>'+d.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})};tick();c._t=tick;
 const p=H('button','tbb',tb);p.append(av(prof()));p.firstChild.style.width=p.firstChild.style.height='70%';p.style.padding=0;p.title='Switch profile';p.onclick=e=>{e.stopPropagation();profMenu(p)}}
setInterval(()=>{const c=$('.clk');c&&c._t()},5000);
/* ---------- popups ---------- */
const pop=$('#pop');
function closePop(){pop.innerHTML=''}
function place(el,anchor){const r=anchor.getBoundingClientRect();el.style.bottom=innerHeight-r.top+10+'px';el.style.left=Math.max(8,Math.min(innerWidth-el.offsetWidth-8,r.left+r.width/2-el.offsetWidth/2))+'px'}
function previews(ws,a){closePop();const p=H('div','pop prev',pop),PW=190;
 ws.forEach(w=>{const v=H('div','pv',p,`<div class=th></div><p>${APPS[w.app].name} — ${w.id}</p>`);v.style.width=PW+'px';v.onclick=()=>{focusW(w);closePop()};v._w=w});
 const upd=()=>{if(!p.isConnected)return clearInterval(iv);p.querySelectorAll('.pv').forEach(v=>{const w=v._w,th=$('.th',v),W0=w.el.offsetWidth,H0=w.el.offsetHeight,k=PW/W0;th.style.height=H0*k+'px';th.innerHTML='';const c=w.el.cloneNode(true);c.querySelectorAll('.rz').forEach(x=>x.remove());c.classList.remove('min','foc');Object.assign(c.style,{position:'absolute',left:0,top:0,width:W0+'px',height:H0+'px',transform:`scale(${k})`,transformOrigin:'0 0',opacity:1,pointerEvents:'none',transition:'none'});th.append(c)})};
 const iv=setInterval(upd,600);upd();if(ws.length>3){p.style.maxWidth='620px';p.style.overflowX='auto'}place(p,a)}
function miniBar(rest,a,btn){closePop();const p=H('div','pop prev',pop);const sc=H('div','apps',null);let off=0;const per=5;
 const draw=()=>{sc.innerHTML='';rest.slice(off,off+per).forEach(id=>btn(id,sc))};
 if(rest.length>per){const l=H('button','tbb',p,'‹'),r=H('button','tbb',null,'›');p.append(sc,r);l.onclick=()=>{off=Math.max(0,off-per);draw()};r.onclick=()=>{off=Math.min(rest.length-1,off+per);draw()}}else p.append(sc);draw();place(p,a)}
function profMenu(a){closePop();const p=H('div','pop pm',pop);S.profiles.forEach(x=>{const r=H('button','',p);r.append(av(x),x.name);r.onclick=()=>{S.cur=x.id;save();lockNow()}});place(p,a);p.style.left='auto';p.style.right='12px'}
function toggleStart(){if($('#start'))return closePop();closePop();const p=H('div','pop',pop);p.id='start';p.style.bottom=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tbh'))+(S.conn?18:26)+'px';
 p.innerHTML=`<input class=srch placeholder="Search apps" autofocus><div class=grid></div><div class=foot></div>`;p.onclick=e=>e.stopPropagation();
 const g=$('.grid',p),draw=q=>{g.innerHTML='';Object.keys(APPS).filter(k=>APPS[k].name.toLowerCase().includes(q.toLowerCase())).forEach(k=>{const i=H('button','gi',g,`<img src="${IC(APPS[k].icon)}">${APPS[k].name}`);i.onclick=()=>{closePop();openApp(k)}})};draw('');
 $('.srch',p).oninput=e=>draw(e.target.value);setTimeout(()=>$('.srch',p).focus(),30);
 const f=$('.foot',p),me=prof(),pb=H('button','',f);pb.style.cssText='display:flex;align-items:center;gap:10px;flex:1';pb.append(av(me));H('b','',pb).textContent=me.name;
 const pw=H('button','btn',f,'⏻');pw.onclick=()=>{const m=H('div','pop pm',p);m.style.cssText='position:absolute;bottom:56px;right:0;left:auto';[['Sign out',lockNow],['Restart',()=>{sessionStorage.setItem('rz-restart',1);location.reload()}],['Power off',powerOff]].forEach(([n,fn])=>{H('button','',m,n).onclick=fn})};
 pb.onclick=()=>{closePop();profMenu($('#tb button:last-child'))}}
addEventListener('click',e=>{if(!e.target.closest('.pop'))closePop()});
/* ---------- desktop ---------- */
function desk(){const d=$('#desk');d.innerHTML='';pinned.forEach(k=>{const s=H('div','sc',d,`<img src="${IC(APPS[k].icon)}">${APPS[k].name}`);s.ondblclick=()=>openApp(k);let t=0;s.addEventListener('pointerup',e=>{if(e.pointerType==='touch'){if(Date.now()-t<400)openApp(k);t=Date.now()}})})}
/* ---------- lock ---------- */
const L=$('#lock');let idle;
function lockNow(){closePop();L.className='';const p=prof();L.style.setProperty('--bg',bgv(p.lockbg));L.innerHTML=`<div class=lbg></div><div class=login></div><div class=cover><div class=bg></div><div class=t></div><div class=d></div><small>Click or tap to unlock</small></div>`;
 const c=$('.cover',L),tm=()=>{const d=new Date();$('.t',c).textContent=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:!S.mil});$('.d',c).textContent=d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'})};tm();const iv=setInterval(()=>{tm();if(L.classList.contains('hide'))clearInterval(iv)},1000);
 const lg=$('.login',L);lg.append(av(p));H('h2','',lg).textContent=p.name;const w=H('div','pw',lg);let inp;if(p.hash){inp=H('input','',w);inp.type='password';inp.placeholder='Password'}
 const go=H('button','go',w,'→');const enter=async()=>{if(p.hash&&(await hash(inp.value,p.salt))!==p.hash){w.classList.remove('shake');void w.offsetWidth;w.classList.add('shake');inp.value='';return}L.classList.add('hide');c.remove();startIdle();applyTheme();desk()};
 go.onclick=enter;if(inp)inp.onkeydown=e=>e.key==='Enter'&&enter();
 c.onclick=()=>{c.classList.add('up');inp&&setTimeout(()=>inp.focus(),500);if(!p.hash)go.focus()};
 if(sessionStorage.getItem('rz-restart')){sessionStorage.removeItem('rz-restart')}}
function startIdle(){const r=()=>{clearTimeout(idle);idle=setTimeout(()=>{if(L.classList.contains('hide'))lockNow()},120000)};['pointerdown','keydown','pointermove'].forEach(e=>addEventListener(e,r));r()}
function powerOff(){closePop();const o=$('#off');o.style.display='grid';o.textContent='Click to power on';W.forEach(w=>w.el.remove());W=[];o.onclick=()=>{o.style.display='none';lockNow()};lockNow()}
/* ---------- wake lock ---------- */
let wl;async function wake(){try{wl=await navigator.wakeLock.request('screen')}catch{}}
document.addEventListener('visibilitychange',()=>document.visibilityState==='visible'&&wake());addEventListener('pointerdown',()=>{if(!wl||wl.released)wake()});wake();
/* ---------- settings ---------- */
function pickImg(cb,max){const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>{const f=i.files[0];if(!f)return;const im=new Image(),u=URL.createObjectURL(f);im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.82))};im.src=u};i.click()}
function renderSettings(body){let tab='Personalization';const draw=()=>{body.innerHTML=`<div class=app><div class=nav></div><div class=pane></div></div>`;const nv=$('.nav',body),pn=$('.pane',body);
 ['Personalization','Profiles','Taskbar','Time','System'].forEach(t=>{const b=H('button',t===tab?'on':'',nv,t);b.onclick=()=>{tab=t;draw()}});H('h3','',pn).textContent=tab;const card=(h)=>{const c=H('div','card',pn,h||'');return c},row=(c,l)=>{const r=H('div','rw',c);H('span','',r).textContent=l;return r};
 const ref=()=>{save();applyTheme();desk();draw()};
 if(tab==='Personalization'){const p=prof();[['Wallpaper','bg'],['Lock screen','lockbg']].forEach(([l,k])=>{const c=card(),r=row(c,l+' — '+p.name);if(p[k]){const im=H('div','',c);im.style.cssText=`height:90px;border-radius:8px;background:url(${p[k]}) center/cover`}const r2=H('div','rw',r);H('button','btn pri',r2,'Upload').onclick=()=>pickImg(d=>{p[k]=d;ref()},2560);H('button','btn',r2,'Default').onclick=()=>{p[k]=null;ref()}})}
 if(tab==='Profiles'){S.profiles.forEach(p=>{const c=card(),r=row(c,'');r.firstChild.remove();const a=av(p);a.style.cssText='width:48px;height:48px;flex:none';r.append(a);
  const n=H('input','in',r);n.value=p.name;n.onchange=()=>{p.name=n.value||'User';ref()};const pw=H('input','in',r);pw.placeholder=p.hash?'Password set (change)':'Set password (optional)';pw.type='password';pw.onchange=async()=>{await setPw(p,pw.value);ref()};
  const r2=H('div','rw',c);H('button','btn',r2,'Upload picture').onclick=()=>pickImg(d=>{p.avatar=d;p.letters=false;ref()},256);H('button','btn',r2,p.letters?'Use picture':'Use letter').onclick=()=>{if(p.letters&&!p.avatar)return;p.letters=!p.letters;ref()};
  if(p.hash)H('button','btn',r2,'Remove password').onclick=()=>{p.salt=p.hash='';ref()};if(S.profiles.length>1)H('button','btn dng',r2,'Delete').onclick=()=>{S.profiles=S.profiles.filter(x=>x!==p);if(S.cur===p.id)S.cur=S.profiles[0].id;ref()}});
  H('button','btn pri',pn,'+ Add profile').onclick=()=>{const id=Date.now();S.profiles.push({id,name:'User '+(S.profiles.length+1),avatar:null,letters:true,salt:'',hash:'',bg:null,lockbg:null});ref()}}
 if(tab==='Taskbar'){const c=card(),r=row(c,'Connected taskbar (flush with bottom)');const k=H('input','',r);k.type='checkbox';k.checked=S.conn;k.onchange=()=>{S.conn=k.checked;ref()};
  const r2=row(c,'Size');const s=H('select','in',r2,'<option value=compact>Compact</option><option value=roomy>Roomy</option><option value=luxurious>Luxurious</option>');s.value=S.size;s.onchange=()=>{S.size=s.value;ref()}}
 if(tab==='Time'){const c=card(),r=row(c,'24-hour (military) clock');const k=H('input','',r);k.type='checkbox';k.checked=S.mil;k.onchange=()=>{S.mil=k.checked;ref()}}
 if(tab==='System'){const c=card(),r=row(c,'Factory reset — erases all profiles, passwords and settings');H('button','btn dng',r,'Reset').onclick=()=>{factory()}}};draw()}
/* ---------- boot ---------- */
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
(async()=>{try{DB=await idb();let s=await load();if(!s)try{s=JSON.parse(localStorage.getItem('rzos'))}catch{}
 if(s){S=s;if(S.bg){S.profiles[0].bg=S.bg;delete S.bg}for(const p of S.profiles)if(p.pw){await setPw(p,p.pw);delete p.pw}save();localStorage.removeItem('rzos')}}catch(e){console.error(e)}
 addEventListener('resize',renderTB);addEventListener('keydown',e=>{if(!L.classList.contains('hide')&&e.ctrlKey&&e.altKey&&e.shiftKey&&e.code==='KeyX'){e.preventDefault();factory()}});
 applyTheme();desk();lockNow()})();
