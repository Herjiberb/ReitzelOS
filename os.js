'use strict';
const $=(s,e=document)=>e.querySelector(s),H=(t,c,p,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.innerHTML=x;if(p)p.append(e);return e};
const DEF=()=>({profiles:[{id:1,name:'User',avatar:null,letters:true,salt:'',hash:'',bg:null,lockbg:null}],cur:1,mil:false,conn:false,size:'compact'});
let S=DEF(),DB;
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('reitzel-os',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const load=()=>new Promise(res=>{try{const q=DB.transaction('kv').objectStore('kv').get('state');q.onsuccess=()=>res(q.result);q.onerror=()=>res(undefined)}catch{res(undefined)}});
/* small, synchronous marker: set once we know this browser has real saved state, so a later failed/empty IndexedDB read can never be mistaken for a fresh install */
const SEEN='rz-seen';const markSeen=()=>{try{localStorage.setItem(SEEN,'1')}catch{}};const hasSeen=()=>{try{return localStorage.getItem(SEEN)==='1'}catch{return false}};
const bgv=d=>d?`url(${d})`:'linear-gradient(135deg,color-mix(in srgb,var(--a) 20%,#000),color-mix(in srgb,var(--b) 20%,#000) 50%,color-mix(in srgb,var(--c) 20%,#000))';
const hash=async(pw,salt)=>{const d=new TextEncoder().encode(salt+'|'+pw);if(crypto.subtle){const b=await crypto.subtle.digest('SHA-256',d);return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}let h=5381;for(const c of d)h=(h*33^c)>>>0;return'f'+h};
const setPw=async(p,v)=>{if(!v){p.salt=p.hash='';return}p.salt=[...crypto.getRandomValues(new Uint32Array(3))].join('-');p.hash=await hash(v,p.salt)};
const factory=async()=>{if(!await sysConfirm({title:'Factory reset?',msg:'This erases all profiles, passwords, files, wallpapers and settings.',ok:'Erase everything',danger:1}))return;RZleave=1;try{DB.close()}catch{}localStorage.removeItem('rzos');let n=2;const fin=()=>{if(--n<=0)location.reload()};for(const d of['reitzel-os','reitzel-fs']){const q=indexedDB.deleteDatabase(d);q.onsuccess=q.onerror=q.onblocked=fin}};
const PK=['theme','corners','glass','nodate','noanim','pos','size','conn','loose','mil','pins','fm','scout','installed','defFm','compost'],DP={defFm:'files',compost:'never',theme:0,corners:'rounded',glass:.5,nodate:false,noanim:false,pos:'bottom',size:'compact',conn:false,loose:false,mil:false,pins:['files','editor','store','terminal','settings']};let PL=null;
const cfgT={},UCK=['avatar','letters','bg','lockbg','prefs'];
function saveCfg(){if(typeof FS==='undefined'||!FS.writeCfg)return;S.profiles.forEach(p=>{clearTimeout(cfgT[p.id]);cfgT[p.id]=setTimeout(()=>FS.writeCfg(p),300)})}
const stripP=p=>{const o={...p};if(typeof FS!=='undefined'&&FS.cfgSynced&&FS.cfgSynced(p))['avatar','bg','lockbg'].forEach(k=>delete o[k]);return o};
const putState=(o,retry)=>{try{const t=DB.transaction('kv','readwrite');t.objectStore('kv').put(o,'state');t.oncomplete=()=>markSeen();t.onerror=t.onabort=()=>{if(retry)setTimeout(()=>putState(o,false),300);else console.error('save failed to commit',t.error)}}catch(e){console.error(e);if(retry)setTimeout(()=>putState(o,false),300)}};
const save=()=>{try{const lp=S.profiles.find(p=>p.id===PL);if(lp)lp.prefs=Object.fromEntries(PK.map(k=>[k,S[k]]));const o={...S};PK.forEach(k=>delete o[k]);delete o.desk;o.profiles=S.profiles.map(stripP);
 if(typeof FS!=='undefined'&&FS.dirId&&S.fsv)putState(o,true);else{const ds=S.desk;putState({...S,desk:ds&&ds.filter(x=>!x.fsc)},true)}
 saveCfg();window.deskHook&&window.deskHook()}catch(e){console.error(e)}};
function loadPrefs(id){const p=S.profiles.find(x=>x.id===id),q=(p&&p.prefs)||{};PK.forEach(k=>{const v=q[k]!==undefined?q[k]:DP[k];S[k]=v&&typeof v==='object'?JSON.parse(JSON.stringify(v)):v});S.glass=[0,.25,.5,.75,1].reduce((a,b)=>Math.abs(b-S.glass)<Math.abs(a-S.glass)?b:a);PL=id}
function switchTo(id){save();if(id!==S.cur){W.forEach(w=>{try{w.onclose&&w.onclose()}catch{}w.el.remove()});W=[];closePop()}S.cur=id;loadPrefs(id);S.desk=[];(window.regInstalled&&window.regInstalled());(typeof SC!=='undefined'&&SC.reload());applyVars();renderTB();desk();save()}
async function addProfile(name,admin){const p={id:Date.now()+Math.floor(Math.random()*999),name,avatar:null,letters:true,salt:'',hash:'',bg:null,lockbg:null,admin:!!admin};S.profiles.push(p);await FS.provision(p,true);save();return p}
async function dropProfile(p){S.profiles=S.profiles.filter(x=>x!==p);await FS.removeHome(p);save()}
function sysConfirm(o){return new Promise(res=>{const ov=H('div','md sys',document.body),b=H('div','mdb',ov);b.setAttribute('role','alertdialog');H('h4','',b).textContent=o.title;if(o.msg)H('p','',b).textContent=o.msg;const r=H('div','mdr',b),done=v=>{ov.remove();res(v)};
 H('button','btn',r,'Cancel').onclick=()=>done(false);const ok=H('button','btn '+(o.danger?'dng':'pri'),r,o.ok||'OK');ok.onclick=()=>done(true);
 ['pointerdown','click','contextmenu'].forEach(t=>ov.addEventListener(t,e=>{e.stopPropagation();if(t==='contextmenu')e.preventDefault()}));ov.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape')done(false);if(e.key==='Enter')ok.click()};ov.tabIndex=-1;setTimeout(()=>ok.focus(),20)})}
const nameTaken=(v,p)=>S.profiles.some(x=>x!==p&&x.name.trim().toLowerCase()===v.toLowerCase());
const uniqueName=b=>{let n=2,v=b;while(nameTaken(v,null))v=b+' '+n++;return v};
const prof=id=>S.profiles.find(p=>p.id===(id??S.cur))||S.profiles[0];
const av=(p,c)=>{const e=H('div','av '+(c||''));if(p.avatar&&!p.letters){e.innerHTML=`<img class=av src="${p.avatar}">`}else e.textContent=(p.name||'?')[0].toUpperCase();return e};
const X={min:'<svg viewBox="0 0 12 12"><path d="M2 6h8"/></svg>',max:'<svg viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" rx="2"/></svg>',res:'<svg viewBox="0 0 12 12"><rect x="2" y="3.5" width="6.5" height="6.5" rx="1.5"/><path d="M4 3.5V2.5a1 1 0 011-1h4.500a1 1 0 011 1V7a1 1 0 01-1 1H8.500"/></svg>',x:'<svg viewBox="0 0 12 12"><path d="M2.500 2.500l7 7M9.500 2.500l-7 7"/></svg>'};
const IC=n=>/^(data|blob):/.test(n)?n:`assets/${n}-icon.svg`;
/* ---------- theme / bg ---------- */
const THEMES=[['Reitzel','#3700ff','#a600ff','#007bff'],['Ocean','#0047ff','#00b3ff','#00e0c0'],['Sunset','#ff3d00','#ff007a','#ffb300'],['Forest','#00a651','#00c9a7','#8bc34a'],['Rose','#ff2d75','#c800ff','#ff7a7a'],['Mono','#566480','#8a99b3','#b8c4d9']];
function applyVars(){const r=document.documentElement.style,z={compact:[38,20],roomy:[48,28],luxurious:[66,44]}[S.size],T=THEMES[S.theme]||THEMES[0];r.setProperty('--a',T[1]);r.setProperty('--b',T[2]);r.setProperty('--c',T[3]);r.setProperty('--bg',bgv(prof().bg));r.setProperty('--tbh',z[0]+'px');r.setProperty('--ico',z[1]+'px');
 r.setProperty('--rad',{sharp:'4px',rounded:'12px',round:'22px'}[S.corners]||'12px');r.setProperty('--gl',.3+1.4*S.glass);document.body.classList.toggle('noanim',!!S.noanim);window.applyExtra&&applyExtra()}
function applyTheme(){applyVars();tb.className=(S.conn?'conn ':'')+S.pos+(S.loose?' loose':'')+(S.nodate?' nodate':'')+(S.loose&&tb.classList.contains('show')?' show':'');renderTB();refit();desk(1);save()}
function seg(p,v,o,fn){const s=H('div','seg',p);o.forEach(([k,l])=>{H('button',k===v?'on':'',s,l).onclick=()=>fn(k)});return s}
function slider(p,v,fn){const sl=H('div','sl',p,'<div class=fill></div><div class=knob></div>');sl.style.setProperty('--v',v*100+'%');const set=x=>{x=cl(x,0,1);sl.style.setProperty('--v',x*100+'%');fn(x)},at=e=>{const r=sl.getBoundingClientRect();set((e.clientX-r.left)/r.width)};sl.onpointerdown=e=>{sl.setPointerCapture(e.pointerId);at(e);sl.onpointermove=at};sl.onpointerup=()=>{sl.onpointermove=null;save()};return sl}
/* ---------- apps ---------- */
const APPS={files:{name:'My Files',icon:'folder',w:720,h:460,ctx:()=>[['New folder',null,'dis'],['New file',null,'dis'],'sep',['Refresh',()=>{}],['Properties',null,'dis']],render:b=>{b.innerHTML=`<div class=files><img src="${IC('folder')}"><h1>File Explorer</h1></div>`}},
 settings:{name:'Settings',icon:'compass-settings',w:820,h:540,render:renderSettings}};
let W=[],zc=10,nid=1;
/* ---------- windows ---------- */
function openApp(id,opt){if(!APPS[id]||(window.Apps&&!Apps.canOpen(id)))return;window.noteRecent&&noteRecent(id);const a=APPS[id],A=area(),o=W.length%6*28;const el=H('div','win',$('#wins'));
 const w={id:nid++,app:id,el,min:false,max:false,prev:null,tab:opt&&opt.tab,sr:null};w.lockCursor=()=>{try{const q=$('.body',el).requestPointerLock();q&&q.catch&&q.catch(()=>{});tb.classList.remove('show');toast('Cursor locked — press Esc to release')}catch{}};W.push(w);
 const bw=Math.min(a.w,A.w-20),bh=Math.min(a.h,A.h-20);Object.assign(el.style,{width:bw+'px',height:bh+'px',left:A.x+Math.max(0,(A.w-bw)/2+o-60)+'px',top:A.y+Math.max(0,(A.h-bh)/2+o-40)+'px'});
 el.innerHTML=`<div class=tbar><img src="${IC(a.icon)}"><span>${a.name}</span><button class="wb m">${X.min}</button><button class="wb mx"><i class=ic>${X.max}</i><div class=snapm></div></button><button class="wb x">${X.x}</button></div><div class=body></div>`+['n','s','e','w','ne','nw','se','sw'].map(d=>`<div class="rz ${d}" data-d=${d}></div>`).join('');
 const sm=$('.snapm',el);[['l',[0,0,50,100]],['r',[50,0,50,100]],['t',[0,0,100,50]],['tl',[0,0,50,50]],['tr',[50,0,50,50]],['b',[0,50,100,50]],['bl',[0,50,50,50]],['br',[50,50,50,50]],['c',[25,10,50,80]]].forEach(([m,r])=>{const i=H('i','',sm,`<b style="left:${r[0]}%;top:${r[1]}%;width:${r[2]}%;height:${r[3]}%"></b>`);i.onclick=e=>{e.stopPropagation();snap(w,r)}});
 $('.m',el).onclick=()=>minim(w);$('.x',el).onclick=()=>closeW(w);$('.mx',el).onclick=e=>{if(!e.target.closest('.snapm'))toggleMax(w)};
 $('.tbar',el).ondblclick=e=>{if(!e.target.closest('button'))toggleMax(w)};
 el.onpointerdown=()=>focusW(w);drag(w);resize(w);a.render($('.body',el),w);focusW(w);renderTB();return w}
function focusW(w){const was=w.min;w.min=false;w.el.classList.remove('min');w.el.style.zIndex=++zc;W.forEach(x=>x.el.classList.toggle('foc',x===w));renderTB();if(was)genie(w,true)}
function minim(w){w.min=true;W.forEach(x=>x.el.classList.remove('foc'));renderTB();genie(w,false)}
const ss=x=>x*x*(3-2*x),cl=(x,a,b)=>Math.min(b,Math.max(a,x));
function genie(w,rev){if(S.noanim){if(!rev&&w.min)w.el.classList.add('min');return}const e=w.el,b=$(`#tb [data-app="${w.app}"]`)||$('#tb .more'),R=b?b.getBoundingClientRect():{left:innerWidth/2-20,top:innerHeight-50,width:40,height:40};
 const W0=e.offsetWidth,H0=e.offsetHeight,dx=R.left+R.width/2-(e.offsetLeft+W0/2),dy=R.top+R.height/2-(e.offsetTop+H0/2),iw=Math.max(.04,R.width*.5/W0),N=18,kf=[];
 for(let k=0;k<=N;k++){const t=k/N,eo=ss(t),sb=ss(cl(t*1.6,0,1)),L=[],Q=[];
  for(let j=0;j<=14;j++){const y=j/14,s=ss(cl(t*1.6-(1-y)*.6,0,1)),wf=1-(1-iw)*s,off=cl(dx*(s-sb)/W0,-.4,.4);L.push(`${cl(.5+off-wf/2,0,1)*100}% ${y*100}%`);Q.unshift(`${cl(.5+off+wf/2,0,1)*100}% ${y*100}%`)}
  kf.push({clipPath:`polygon(${L.concat(Q).join(',')})`,transform:`translate(${dx*sb}px,${dy*eo}px) scaleY(${1-.96*eo})`,opacity:t>.88?(1-t)/.12:1})}
 w.a&&w.a.cancel();e.classList.add('gen');const a=w.a=e.animate(rev?kf.reverse():kf,{duration:rev?460:520,easing:'linear',fill:'both'});
 a.onfinish=()=>{e.classList.remove('gen');if(!rev&&w.min)e.classList.add('min');a.cancel()}}
function closeW(w){if(w.beforeClose&&w.beforeClose()&&!w.force){sysConfirm({title:'Unsaved changes',msg:'Close without saving?',ok:'Close anyway',danger:1}).then(ok=>{if(ok){w.force=1;closeW(w)}});return}w.onclose&&w.onclose();w.el.classList.add('closing');W=W.filter(x=>x!==w);setTimeout(()=>w.el.remove(),200);renderTB()}
function toggleMax(w){const e=w.el,A=area();if(w.max){Object.assign(e.style,w.prev);w.max=false;e.classList.remove('max')}else{w.prev={left:e.style.left,top:e.style.top,width:e.style.width,height:e.style.height};Object.assign(e.style,{left:A.x+'px',top:A.y+'px',width:A.w+'px',height:A.h+'px'});w.sr=null;w.max=true;e.classList.add('max')}
 $('.ic',e).innerHTML=w.max?X.res:X.max;e.classList.add('snap');setTimeout(()=>e.classList.remove('snap'),200);focusW(w)}
function snap(w,r){const A=area(),e=w.el;if(w.max){w.max=false;e.classList.remove('max');$('.ic',e).innerHTML=X.max}e.classList.add('snap');
 w.sr=r;Object.assign(e.style,{left:A.x+A.w*r[0]/100+'px',top:A.y+A.h*r[1]/100+'px',width:A.w*r[2]/100+'px',height:A.h*r[3]/100+'px'});setTimeout(()=>e.classList.remove('snap'),200);focusW(w)}
function drag(w){const t=$('.tbar',w.el);t.onpointerdown=e=>{if(e.target.closest('button'))return;let sx=e.clientX,sy=e.clientY,L=w.el.offsetLeft,T=w.el.offsetTop;t.setPointerCapture(e.pointerId);
 if(w.max){const ratio=e.clientX/innerWidth;toggleMax(w);L=e.clientX-w.el.offsetWidth*ratio;T=0;sx=e.clientX;sy=e.clientY;w.el.style.left=L+'px'}
 t.onpointermove=m=>{w.sr=null;const A=area(),ew=w.el.offsetWidth;w.el.style.left=cl(L+m.clientX-sx,A.x+60-ew,A.x+A.w-60)+'px';w.el.style.top=cl(T+m.clientY-sy,A.y,A.y+A.h-40)+'px'};
 t.onpointerup=m=>{t.onpointermove=null;if(m.clientY<4)toggleMax(w)}}}
function resize(w){w.el.querySelectorAll('.rz').forEach(r=>r.onpointerdown=e=>{e.stopPropagation();focusW(w);const d=r.dataset.d,el=w.el,s={x:e.clientX,y:e.clientY,l:el.offsetLeft,t:el.offsetTop,w:el.offsetWidth,h:el.offsetHeight};r.setPointerCapture(e.pointerId);
 r.onpointermove=m=>{w.sr=null;const dx=m.clientX-s.x,dy=m.clientY-s.y,mw=280,mh=180;if(d.includes('e'))el.style.width=Math.max(mw,s.w+dx)+'px';if(d.includes('s'))el.style.height=Math.max(mh,s.h+dy)+'px';
 if(d.includes('w')){const nw=Math.max(mw,s.w-dx);el.style.width=nw+'px';el.style.left=s.l+s.w-nw+'px'}if(d.includes('n')){const A=area(),nt=Math.max(A.y,Math.min(s.t+dy,s.t+s.h-mh));el.style.height=s.t+s.h-nt+'px';el.style.top=nt+'px'}};r.onpointerup=()=>r.onpointermove=null})}
/* ---------- taskbar ---------- */
const tb=$('#tb');
let runOrd=[];const reorderTB=ids=>{S.pins=[...ids.filter(x=>S.pins.includes(x)),...S.pins.filter(x=>!ids.includes(x))];runOrd=[...ids.filter(x=>!S.pins.includes(x)),...runOrd.filter(x=>!ids.includes(x))];save();renderTB()};
function renderTB(){const V=S.pos!=='bottom',run=[];W.forEach(w=>{if(!w.temp&&!S.pins.includes(w.app)&&!run.includes(w.app))run.push(w.app)});run.sort((a,b)=>{const x=runOrd.indexOf(a),y=runOrd.indexOf(b);return(x<0?1e3:x)-(y<0?1e3:y)});tb.innerHTML='';
 const s=H('button','tbb',tb,`<img src="${IC('reitzel')}">`);s.onclick=e=>{e.stopPropagation();(window.toggleStartX||toggleStart0)()};
 const box=H('div','apps',tb),sz=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ico'))+14,A=S.pins.concat(run).filter(k=>APPS[k]),room=V?innerHeight-260-sz*2:innerWidth-(S.conn?60:90)-330-sz*2,LM=!V&&S.tbLabels&&S.tbLabels!=='off'?(S.tbLabels==='all'?'all':'running'):'',fit=Math.max(1,Math.floor(room/(sz*(LM?3:1)))),vis=A.length>fit?A.slice(0,fit-1):A,rest=A.slice(vis.length);
 const btn=(id,p)=>{const ws=W.filter(w=>w.app===id),b=H('button','tbb'+(ws.length?' run':'')+(ws.length>1?' multi':'')+(ws.some(w=>w.el.classList.contains('foc'))?' act':''),p,`<img src="${IC(APPS[id].icon)}">`);b.dataset.app=id;if(LM&&(LM==='all'||ws.length))H('span','tl',b).textContent=APPS[id].name;
  b.onpointerdown=e=>{if(e.button!==0)return;const sx=e.clientX,sy=e.clientY;let on=0;
   const mv=ev=>{const d=V?ev.clientY-sy:ev.clientX-sx;if(!on){if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<6)return;on=1;b.classList.add('drg');closePop()}b.style.transform=V?`translateY(${d}px)`:`translateX(${d}px)`};
   const up=ev=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);if(!on)return;b._mv=1;setTimeout(()=>b._mv=0,50);const c=V?ev.clientY:ev.clientX,list=[...box.querySelectorAll('.tbb[data-app]')].filter(x=>x!==b);let i=list.findIndex(x=>{const r=x.getBoundingClientRect();return c<(V?r.top+r.height/2:r.left+r.width/2)});if(i<0)i=list.length;const ids=list.map(x=>x.dataset.app);ids.splice(i,0,id);reorderTB(ids)};
   addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up)};
  b.onclick=e=>{e.stopPropagation();if(b._mv)return;if(!ws.length)openApp(id);else if(ws.length>1)previews(ws,b);else{const w=ws[0];(w.el.classList.contains('foc')&&!w.min)?minim(w):focusW(w)}};
  b.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();const pn=S.pins.includes(id);ctx(e,[['Open',()=>openApp(id)],'sep',[pn?'Unpin from taskbar':'Pin to taskbar',()=>pn?unpin(id):pin(id)],...(ws.length?['sep',[ws.length>1?'Close all windows':'Close window',()=>ws.slice().forEach(closeW)]]:[])])};return b};
 vis.forEach((id,i)=>{if(i&&i===S.pins.length)H('i','dv',box);btn(id,box)});
 if(rest.length){const m=H('button','tbb more',box,'···');m.onclick=e=>{e.stopPropagation();miniBar(rest,m,btn)}}
 H('div','sp',tb);const wf=H('button','tbb tray',tb,`<img src="${IC('network')}">`);
 const c=H('div','clk',tb);const tick=()=>{if(window.clockHTML){c.innerHTML=clockHTML(V);return}const d=new Date(),tm=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:!S.mil});c.innerHTML='<div>'+(V?tm.replace(' ','<br>'):tm)+'</div>'+(V?'':'<div class=dt>'+d.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})+'</div>')};tick();c._t=tick;window.tbExtras&&tbExtras(tb,s,box,V)}
setInterval(()=>{const c=$('.clk');c&&c._t();window.panelTick&&panelTick()},1000);
/* ---------- popups ---------- */
const pop=$('#pop');
function closePop(){pop.innerHTML=''}
function place(el,a){const r=a.getBoundingClientRect();if(S.pos==='bottom'){el.style.bottom=innerHeight-r.top+10+'px';el.style.left=Math.max(8,Math.min(innerWidth-el.offsetWidth-8,r.left+r.width/2-el.offsetWidth/2))+'px'}else{el.style.top=Math.max(8,Math.min(innerHeight-el.offsetHeight-8,r.top+r.height/2-el.offsetHeight/2))+'px';el.style.left=(S.pos==='left'?r.right+10:Math.max(8,r.left-10-el.offsetWidth))+'px'}}
function previews(ws,a){closePop();const p=H('div','pop prev',pop),PW=190;
 ws.forEach(w=>{const v=H('div','pv',p,`<div class=th></div><p>${APPS[w.app].name} — ${w.id}</p>`);v.style.width=PW+'px';v.onclick=()=>{focusW(w);closePop()};v._w=w});
 const upd=()=>{if(!p.isConnected)return clearInterval(iv);p.querySelectorAll('.pv').forEach(v=>{const w=v._w,th=$('.th',v),W0=w.el.offsetWidth,H0=w.el.offsetHeight,k=PW/W0;th.style.height=H0*k+'px';th.innerHTML='';const c=w.el.cloneNode(true);c.querySelectorAll('.rz').forEach(x=>x.remove());c.classList.remove('min','foc','closing');Object.assign(c.style,{position:'absolute',left:0,top:0,width:W0+'px',height:H0+'px',transform:`scale(${k})`,transformOrigin:'0 0',opacity:1,pointerEvents:'none',transition:'none',animation:'none'});th.append(c)})};
 const iv=setInterval(upd,600);upd();if(ws.length>3){p.style.maxWidth='620px';p.style.overflowX='auto'}place(p,a)}
function miniBar(rest,a,btn){closePop();const p=H('div','pop prev',pop);const sc=H('div','apps',null);let off=0;const per=5;
 const draw=()=>{sc.innerHTML='';rest.slice(off,off+per).forEach(id=>btn(id,sc))};
 if(rest.length>per){const l=H('button','tbb',p,'‹'),r=H('button','tbb',null,'›');p.append(sc,r);l.onclick=()=>{off=Math.max(0,off-per);draw()};r.onclick=()=>{off=Math.min(rest.length-1,off+per);draw()}}else p.append(sc);draw();place(p,a)}
function toggleStart0(){if($('#start'))return closePop();closePop();const p=H('div','pop',pop);p.id='start';startPos(p);
 p.innerHTML=`<input class=srch placeholder="Search apps" autofocus><div class=grid></div><div class=foot></div>`;p.onclick=e=>{e.stopPropagation();if(!e.target.closest('.pm,.foot>button'))p.querySelector('.pm')?.remove()};
 const g=$('.grid',p),draw=q=>{g.innerHTML='';Object.keys(APPS).filter(k=>!APPS[k].hide&&APPS[k].name.toLowerCase().includes(q.toLowerCase())).forEach(k=>{const i=H('button','gi',g,`<img src="${IC(APPS[k].icon)}">${APPS[k].name}`);i.onclick=()=>{closePop();openApp(k)};i.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();const pn=S.pins.includes(k);ctx(e,[['Open',()=>{closePop();openApp(k)}],'sep',['Add to desktop',()=>addDesk(k)],[pn?'Unpin from taskbar':'Pin to taskbar',()=>pn?unpin(k):pin(k)]])}})};draw('');
 $('.srch',p).oninput=e=>draw(e.target.value);setTimeout(()=>$('.srch',p).focus(),30);
 const f=$('.foot',p),me=prof(),pb=H('button','',f);pb.style.cssText='display:flex;align-items:center;gap:10px;flex:1';pb.append(av(me));H('b','',pb).textContent=me.name;
 const menu=(items,side)=>{const ex=p.querySelector('.pm');ex&&ex.remove();if(ex&&ex.dataset.k===side)return;const m=H('div','pop pm',f);m.dataset.k=side;m.style.cssText='position:absolute;bottom:56px;'+side+':0';items.forEach(([n,fn,a])=>{const b=H('button','',m);if(a)b.append(a);b.append(n);b.onclick=fn})};
 const pw=H('button','btn',f,'⏻');pw.onclick=()=>menu([['Sign out',lockNow],['Restart',()=>{RZleave=1;sessionStorage.setItem('rz-restart',1);location.reload()}],['Power off',powerOff]],'right');
 pb.onclick=()=>menu(S.profiles.map(x=>[x.name,()=>{switchTo(x.id);lockNow()},av(x)]),'left')}
addEventListener('click',e=>{if(!e.target.closest('.pop,.ctx'))closePop()});
/* ---------- desktop ---------- */
/* ---------- lock ---------- */
const L=$('#lock');let idle;
function lockNow(keep){closePop();L.className='';const p=prof();L.style.setProperty('--bg',bgv(p.lockbg));L.innerHTML=`<div class=lbg></div><div class=login></div><div class=cover><div class=bg></div><div class=t></div><div class=d></div><small>Click or tap to unlock</small></div>`;
 const c=$('.cover',L),tm=()=>{const d=new Date();$('.t',c).textContent=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:!S.mil});$('.d',c).textContent=d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'})};tm();const iv=setInterval(()=>{tm();if(L.classList.contains('hide'))clearInterval(iv)},1000);
 const lg=$('.login',L);lg.append(av(p));H('h2','',lg).textContent=p.name;const w=H('div','pw',lg);let inp;if(p.hash){const f=H('div','pwf',w);inp=H('input','',f);inp.type='password';inp.placeholder='Password';inp.autocomplete='off';inp.spellcheck=false;
  const E1='<svg viewBox="0 0 24 24"><path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',E0='<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.600 6.200A10 10 0 0112 6c6.400 0 10 6 10 6a17 17 0 01-3.200 3.800M6.400 7.600C3.700 9.300 2 12 2 12s3.600 6 10 6c1.500 0 2.800-.3 4-.8"/><path d="M9.900 10A3 3 0 0014 14"/></svg>',ey=H('button','eye',f,E1);ey.type='button';ey.onmousedown=e=>e.preventDefault();
  ey.onclick=()=>{const t=inp.type==='password';inp.type=t?'text':'password';ey.innerHTML=t?E0:E1;inp.focus()}}
 const go=H('button','go',w,'→');const enter=async()=>{if(p.hash&&(await hash(inp.value,p.salt))!==p.hash){w.classList.remove('shake');void w.offsetWidth;w.classList.add('shake');inp.value='';return}L.classList.add('hide');c.remove();startIdle();applyTheme();desk()};
 go.onclick=enter;if(inp)inp.onkeydown=e=>{if(e.key==='Enter')enter()};
 const bub=H('button','lbub',lg,`<img src="${IC('reitzel')}">`);
 bub.onclick=e=>{e.stopPropagation();const ex=$('.lmenu',lg);if(ex)return ex.remove();const m=H('div','lmenu',lg);S.profiles.forEach(x=>{const b=H('button',x.id===p.id?'on':'',m);b.append(av(x));H('span','',b).textContent=x.name;b.onclick=()=>{switchTo(x.id);lockNow(true)}})};
 lg.addEventListener('pointerdown',e=>{if(!e.target.closest('.lmenu,.lbub')){const m=$('.lmenu',lg);m&&m.remove()}});
 if(keep){c.style.transition='none';c.classList.add('up');if(inp)setTimeout(()=>inp.focus(),50)}
 c.onclick=()=>{c.classList.add('up');if(inp){setTimeout(()=>inp.focus(),120);c.addEventListener('transitionend',()=>inp.focus(),{once:true})}if(!p.hash)go.focus()};
 if(sessionStorage.getItem('rz-restart')){sessionStorage.removeItem('rz-restart')}}
function startIdle(){const r=()=>{clearTimeout(idle);idle=setTimeout(()=>{if(L.classList.contains('hide'))lockNow()},120000)};['pointerdown','keydown','pointermove'].forEach(e=>addEventListener(e,r));r()}
function shutdownThen(next){closePop();clearTimeout(idle);const o=$('#off');o.onclick=null;o.style.display='grid';o.textContent='Shutting down…';W.forEach(w=>w.el.remove());W=[];setTimeout(()=>{o.style.display='none';next()},1400)}
async function delProfile(p,after){if(p.root)return toast('The root profile cannot be deleted');const self=p.id===S.cur;
 if(!await sysConfirm({title:'Delete profile "'+p.name+'"?',msg:'Its home folder and all of its files, settings and shortcuts will be erased.'+(self?'\nYou will be signed out.':''),ok:'Delete',danger:1}))return;
 await dropProfile(p);if(!self){after&&after();return}
 S.cur=S.profiles[0].id;loadPrefs(S.cur);(typeof SC!=='undefined'&&SC.reload());save();shutdownThen(()=>lockNow())}
function setupProfile(){closePop();L.className='';L.style.setProperty('--bg',bgv(null));L.innerHTML='<div class=lbg></div><div class=login><h2>Create your profile</h2><small style="opacity:.7">The first profile is the root administrator</small><div class=pw><input class=sn placeholder="Name" maxlength=24></div><div class=pw><input class=sp type=password placeholder="Password (optional)"></div><button class="btn pri go2">Create</button></div>';
 const nm=$('.sn',L),pw=$('.sp',L),go=async()=>{const v=nm.value.trim();if(!v){nm.focus();return}const p={id:Date.now(),name:v,avatar:null,letters:true,salt:'',hash:'',bg:null,lockbg:null,admin:true,root:true};await setPw(p,pw.value);S.profiles=[p];S.cur=p.id;S.fsv=2;await FS.provision(p,true);loadPrefs(p.id);(typeof SC!=='undefined'&&SC.reload());applyVars();save();lockNow()};
 $('.go2',L).onclick=go;[nm,pw].forEach(i=>i.onkeydown=e=>{if(e.key==='Enter')go()});setTimeout(()=>nm.focus(),50)}
function powerOff(){closePop();const o=$('#off');o.style.display='grid';o.textContent='Click to power on';W.forEach(w=>w.el.remove());W=[];o.onclick=()=>{o.style.display='none';lockNow()};lockNow()}
/* ---------- wake lock ---------- */
let wl;async function wake(){try{wl=await navigator.wakeLock.request('screen')}catch{}}
document.addEventListener('visibilitychange',()=>document.visibilityState==='visible'&&wake());addEventListener('pointerdown',()=>{if(!wl||wl.released)wake()});wake();
/* ---------- settings ---------- */
const IMGX=new Set(['png','jpg','jpeg','jpe','jfif','gif','webp','bmp','avif','apng']);
/* images must already live in the OS file system: the person imports them with My Files first, then picks them here */
function osImage(cb){const w=W.find(x=>x.app==='settings');if(!w)return;const pic=FS.dirId(FS.home(),'pictures');
 fileDialog(w,{title:'Choose an image from your files',dir:pic&&FS.get(pic)?pic:FS.home()},async r=>{const m=FS.get(r.id),e=m?EXT(m.n):'';if(!m||!IMGX.has(e)){toast('Pick a PNG, JPG, GIF, WebP, BMP or AVIF image');return}
  try{const b=await FS.blob(m.id);cb(b.type?b:new Blob([b],{type:'image/'+(e==='jpg'||e==='jpe'||e==='jfif'?'jpeg':e)}))}catch(x){toast(x.message||'Could not read that file')}})}
function pickImg(cb,max){osImage(f=>{const im=new Image(),u=URL.createObjectURL(f);im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);cb(c.toDataURL('image/jpeg',.82))};im.onerror=()=>toast('Could not read that image');im.src=u})}
function cropAvatar(host,done,cancel){osImage(f=>{const im=new Image();im.onload=()=>edit(im);im.onerror=()=>toast('Could not read that image');im.src=URL.createObjectURL(f)});
 function edit(im){host.innerHTML='';H('h3','',host).textContent='Position your picture';const B=H('div','card cbox',host,`<canvas width=300 height=300></canvas><div class=sl tabindex=0><div class=fill></div><div class=knob></div></div><small>Drag the picture to move · drag the bar or scroll to zoom</small><div class=rw><button class=btn>Cancel</button><button class="btn pri">Save</button></div>`);
  const cv=$('canvas',B),g=cv.getContext('2d'),sl=$('.sl',B),R=130,base=Math.max(2*R/im.width,2*R/im.height);let k=1,x=150,y=150;
  const dim=()=>[im.width*base*k/2,im.height*base*k/2];
  const draw=()=>{const[w,h]=dim();x=cl(x,150+R-w,150-R+w);y=cl(y,150+R-h,150-R+h);g.clearRect(0,0,300,300);g.drawImage(im,x-w,y-h,2*w,2*h);g.fillStyle='rgba(5,0,26,.72)';g.beginPath();g.rect(0,0,300,300);g.moveTo(150+R,150);g.arc(150,150,R,0,Math.PI*2,true);g.fill('evenodd');g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.arc(150,150,R,0,Math.PI*2);g.stroke()};
  const zoom=n=>{n=cl(n,1,4);x=150+(x-150)*n/k;y=150+(y-150)*n/k;k=n;sl.style.setProperty('--v',(k-1)/3*100+'%');draw()};
  let d=null;cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);d=[e.clientX,e.clientY]};cv.onpointerup=()=>d=null;
  cv.onpointermove=e=>{if(!d)return;const r=300/cv.getBoundingClientRect().width;x+=(e.clientX-d[0])*r;y+=(e.clientY-d[1])*r;d=[e.clientX,e.clientY];draw()};
  cv.onwheel=e=>{e.preventDefault();zoom(k*(e.deltaY<0?1.06:.94))};
  const at=e=>{const r=sl.getBoundingClientRect();zoom(1+3*cl((e.clientX-r.left)/r.width,0,1))};sl.onpointerdown=e=>{sl.setPointerCapture(e.pointerId);at(e);sl.onpointermove=at};sl.onpointerup=()=>sl.onpointermove=null;
  sl.onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowUp')zoom(k+.15);if(e.key==='ArrowLeft'||e.key==='ArrowDown')zoom(k-.15)};
  const[bc,bs]=B.querySelectorAll('button');bc.onclick=cancel;
  bs.onclick=()=>{const[w,h]=dim(),q=base*k,o=document.createElement('canvas');o.width=o.height=256;o.getContext('2d').drawImage(im,(150-R-(x-w))/q,(150-R-(y-h))/q,2*R/q,2*R/q,0,0,256,256);done(o.toDataURL('image/jpeg',.9))};zoom(1)}}
function renderSettings(body,w){let tab=w.tab||'Personalization';w.setTab=t=>{tab=t;draw()};let lt;const draw=()=>{const op=$('.pane',body),top=op&&lt===tab?op.scrollTop:0;lt=tab;draw0();const np=$('.pane',body);if(np)np.scrollTop=top},draw0=()=>{body.innerHTML=`<div class=app><div class=nav></div><div class=pane></div></div>`;const nv=$('.nav',body),pn=$('.pane',body);
 ['Personalization','Desktop','Taskbar','Start menu','Time','Profiles','Defaults','System'].forEach(t=>{const b=H('button',t===tab?'on':'',nv,t);b.onclick=()=>{tab=t;draw()}});H('h3','',pn).textContent=tab;const card=(h)=>{const c=H('div','card',pn,h||'');return c},row=(c,l)=>{const r=H('div','rw',c);H('span','',r).textContent=l;return r};
 const ref=()=>{save();applyTheme();desk();draw()};
 if(tab==='Personalization'){const p=prof();[['Wallpaper','bg'],['Lock screen','lockbg']].forEach(([l,k])=>{const c=card(),r=row(c,l+' — '+p.name);if(p[k]){const im=H('div','',c);im.style.cssText=`height:90px;border-radius:8px;background:url(${p[k]}) center/cover`}const r2=H('div','rw',r);H('button','btn pri',r2,'Choose from My Files').onclick=()=>pickImg(d=>{p[k]=d;ref()},2560);H('button','btn',r2,'Default').onclick=()=>{p[k]=null;ref()};H('small','',c,'Import the image into My Files first (for example into Pictures), then choose it here.').style.opacity='.6'});
 const c1=card('<b>Accent theme</b>'),sw=H('div','sw',c1);THEMES.forEach((T,i)=>{const b=H('button',(S.theme||0)===i?'on':'',sw,`<i style="background:linear-gradient(90deg,${T[1]},${T[2]},${T[3]})"></i>${T[0]}`);b.onclick=()=>{S.theme=i;ref()}});
 const r3=row(card(),'Window corners');seg(r3,S.corners,[['sharp','Sharp'],['rounded','Rounded'],['round','Very round']],v=>{S.corners=v;ref()});
 seg(row(card(),'Glass opacity (taskbar & menus)'),S.glass,[[0,'Clear'],[.25,'Light'],[.5,'Default'],[.75,'Rich'],[1,'Solid']],v=>{S.glass=v;ref()});
 const tg=(l,get,set)=>{const r=row(card(),l),i=H('input','',r);i.type='checkbox';i.checked=get();i.onchange=()=>{set(i.checked);ref()}};
 tg('Reduce animations',()=>!!S.noanim,v=>S.noanim=v);window.settingsExtra&&settingsExtra('Personalization',{pn,card,row,ref,draw,H,seg,body})}
 if(tab==='Profiles'){const me=prof(),adm=!!me.admin;S.profiles.filter(p=>adm||p===me).forEach(p=>{const c=card(),r=row(c,'');r.firstChild.remove();const a=av(p);a.style.cssText='width:48px;height:48px;flex:none';r.append(a);
   const n=H('input','in',r);n.value=p.name;n.onchange=()=>{const v=n.value.trim()||'User';if(nameTaken(v,p)){toast('That name is already used by another profile');n.value=p.name;return}p.name=v;FS.renameHome(p).then(()=>ref())};
   const pw=H('input','in',r);pw.placeholder=p.hash?'Password set (change)':'Set password (optional)';pw.type='password';pw.onchange=async()=>{await setPw(p,pw.value);ref()};
   const r2=H('div','rw',c);H('button','btn',r2,'Choose picture').onclick=()=>cropAvatar(pn,d=>{p.avatar=d;p.letters=false;ref()},draw);H('button','btn',r2,p.letters?'Use picture':'Use letter').onclick=()=>{if(p.letters&&!p.avatar)return;p.letters=!p.letters;ref()};
   if(p.hash)H('button','btn',r2,'Remove password').onclick=()=>{p.salt=p.hash='';ref()};
   if(adm){const r3=row(c,p.root?'Root administrator (locked)':'Administrator'),i=H('input','',r3);i.type='checkbox';i.checked=!!p.admin;i.disabled=!!p.root;i.onchange=()=>{if(p.root||(!i.checked&&S.profiles.filter(x=>x.admin).length<2)){toast('At least one administrator is required');i.checked=true;return}p.admin=i.checked;ref()};if(!p.root)H('button','btn dng',r2,'Delete').onclick=()=>delProfile(p,ref)}});
  if(adm)H('button','btn pri',pn,'+ Add profile').onclick=async()=>{await addProfile(uniqueName('User'),false);ref()};else H('small','',pn,'Only administrators can add, remove or promote profiles. Your files live in your own home folder.').style.opacity=.6}
 if(window.settingsExtra&&['Desktop','Taskbar','Start menu','Time'].includes(tab))settingsExtra(tab,{pn,card,row,ref,draw,H,seg,body});
 if(tab==='Defaults'){const fms=Object.entries(APPS).filter(([k,a])=>a.fm&&!a.hide).map(([k,a])=>[k,a.name]),r1=row(card(),'File manager -- opens folders and handles every open/save prompt');seg(r1,APPS[S.defFm]&&APPS[S.defFm].fm?S.defFm:'files',fms,v=>{S.defFm=v;save();draw()});
  if(fms.length<2)H('small','',r1.parentNode,'Install another file manager from the App Store (for example File Scout) to choose it here.').style.opacity='.6';
  const r2=row(card(),'Compost bin -- deleted files are emptied');seg(r2,S.compost||'never',[['now','Immediately'],['7','After 7 days'],['30','After 30 days'],['365','After 365 days'],['never','Never']],v=>{S.compost=v;save();typeof FS!=='undefined'&&FS.sweep&&FS.sweep().catch(()=>{});draw()});H('small','',r2.parentNode,'Immediately skips the bin and deletes files for good. Never keeps them until you empty it.').style.opacity='.6'}
 if(tab==='System'){window.settingsExtra&&settingsExtra('System',{pn,card,row,ref,draw,H,seg,body});const c0=card(),r0=row(c0,'Immersive mode (fullscreen + capture browser shortcuts)'),k0=H('input','',r0);k0.type='checkbox';k0.checked=S.immersive;k0.onchange=()=>{S.immersive=k0.checked;save();if(k0.checked)immerse();else{document.fullscreenElement&&document.exitFullscreen();kunlock()}};if(prof().root){const c=card(),r=row(c,'Factory reset — erases all profiles, passwords and settings');H('button','btn dng',r,'Reset').onclick=()=>{factory()}}}};draw()}
/* ---------- layout, desktop, context menus ---------- */
const TBH=()=>({compact:38,roomy:48,luxurious:66})[S.size],thick=()=>TBH()+(S.conn?0:16),PAD=14;let CW=84,CH=92;const PANELH=()=>S.panel?28:0;
function area(){const T=thick();let x=0,y=PANELH(),w=innerWidth,h=innerHeight-PANELH();if(!S.loose){if(S.pos==='bottom')h-=T;else{w-=T;if(S.pos==='left')x=T}}return{x,y,w,h}}
function refit(m){const A=area();W.forEach(w=>{const e=w.el;if(w.max)Object.assign(e.style,{left:A.x+'px',top:A.y+'px',width:A.w+'px',height:A.h+'px'});else if(w.sr&&!m){const r=w.sr;Object.assign(e.style,{left:A.x+A.w*r[0]/100+'px',top:A.y+A.h*r[1]/100+'px',width:A.w*r[2]/100+'px',height:A.h*r[3]/100+'px'})}})}
function startPos(p){const T=thick();if(S.pos==='bottom')p.style.bottom=T+(S.conn?18:10)+'px';else{p.style.bottom='12px';p.style.marginLeft='0';p.style.left=S.pos==='left'?T+8+'px':'auto';if(S.pos==='right')p.style.right=T+8+'px'}}
const pin=k=>{if(!S.pins.includes(k))S.pins.push(k);save();renderTB()},unpin=k=>{S.pins=S.pins.filter(x=>x!==k);save();renderTB()};
function toast(m){const t=H('div','toast',document.body,m);setTimeout(()=>t.remove(),2200)}
function openTo(tab){const w=W.find(x=>x.app==='settings');if(w){focusW(w);w.setTab&&w.setTab(tab)}else openApp('settings',{tab})}
const grid=()=>{const A=area();return{x:A.x,y:A.y,c:Math.max(1,Math.floor((A.w-PAD*2)/CW)),r:Math.max(1,Math.floor((A.h-PAD*2)/CH))}};
function freeCell(G,tk,c0,r0){let best=null,bd=1e9;for(let c=0;c<G.c;c++)for(let r=0;r<G.r;r++){if(tk.has(c+','+r))continue;const d=(c-c0)**2+(r-r0)**2;if(d<bd){bd=d;best=[c,r]}}return best}
const selIds=new Set();let deskEls=[];
const paintSel=()=>deskEls.forEach(i=>i.el.classList.toggle('sel',selIds.has(i.key)));
function desk(fit){window.deskPre&&window.deskPre();const d=$('#desk'),G=grid(),tk=new Set();d.innerHTML='';deskEls=[];S.desk.forEach(s=>s.dc=null);
 S.desk.forEach(s=>{let c=s.c,r=s.r;if((fit&&(c>=G.c||r>=G.r))||tk.has(c+','+r)){const f=freeCell(G,tk,Math.min(c,G.c-1),Math.min(r,G.r-1));if(!f)return;[c,r]=f;}tk.add(c+','+r);s.dc=c;s.dr=r;
  const a=s.fsc?{icon:s.icon,name:s.name}:APPS[s.app];if(!a)return;const nm=s.name||a.name,el=H('div','sc'+(s.fsc&&s.kind!=='app'?' fsc':'')+(selIds.has(s.id)?' sel':''),d,`<img src="${IC(a.icon)}"><span></span>`);$('span',el).textContent=nm;deskEls.push({key:s.id,el});el.style.left=G.x+PAD+c*CW+'px';el.style.top=G.y+PAD+r*CH+'px';
  let st=null,mv=0,lt=0,gr=[];el.ondblclick=()=>openS(s);
  el.onpointerdown=e=>{if(e.button)return;st=[e.clientX,e.clientY];mv=0;el.setPointerCapture(e.pointerId)};
  el.onpointermove=e=>{if(!st)return;const dx=e.clientX-st[0],dy=e.clientY-st[1];if(!mv){if(Math.hypot(dx,dy)<6)return;mv=1;gr=deskEls.filter(i=>i.el.classList.contains('sel')||i.el===el).map(i=>({e:i.el,l:i.el.offsetLeft,t:i.el.offsetTop}));gr.forEach(g=>g.e.classList.add('drag'))}gr.forEach(g=>{g.e.style.left=g.l+dx+'px';g.e.style.top=g.t+dy+'px'})};
  el.onpointerup=e=>{if(!st)return;st=null;if(!mv){if(e.pointerType==='touch'){if(Date.now()-lt<400)openS(s);lt=Date.now()}return}
   const tc=cl(Math.round((el.offsetLeft-G.x-PAD)/CW),0,G.c-1),tr=cl(Math.round((el.offsetTop-G.y-PAD)/CH),0,G.r-1),grp=S.desk.filter(x=>(selIds.has(x.id)||x===s)&&x.dc!=null);
   const dc=cl(tc-s.dc,-Math.min(...grp.map(x=>x.dc)),G.c-1-Math.max(...grp.map(x=>x.dc))),dr=cl(tr-s.dr,-Math.min(...grp.map(x=>x.dr)),G.r-1-Math.max(...grp.map(x=>x.dr)));
   const oth=new Set(S.desk.filter(x=>!grp.includes(x)&&x.dc!=null).map(x=>x.dc+','+x.dr)),nt=grp.map(x=>[x,x.dc+dc,x.dr+dr]);
   if(nt.every(([x,a,b])=>!oth.has(a+','+b)))nt.forEach(([x,a,b])=>{x.c=a;x.r=b});else if(grp.length===1){const f=freeCell(G,oth,tc,tr);if(f){s.c=f[0];s.r=f[1]}}
   save();desk()};
  el.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();if(!selIds.has(s.id)){selIds.clear();selIds.add(s.id);paintSel()}const g=S.desk.filter(x=>selIds.has(x.id));
   ctx(e,[['Open',()=>g.forEach(openS)],...(g.length===1?[['Rename',()=>rename(el,s)]]:[]),'sep',[g.length>1?'Remove shortcuts':'Remove shortcut',()=>{S.desk=S.desk.filter(x=>!selIds.has(x.id));selIds.clear();save();desk()}]])}})}
function rename(el,s){const sp=$('span',el),i=document.createElement('input');i.className='in';i.value=s.name||(s.fsc?'':APPS[s.app].name);sp.replaceWith(i);i.focus();i.select();let done=0;const fin=ok=>{if(done)return;done=1;if(ok){const v=i.value.trim();s.name=s.fsc?(v||s.name):(v&&v!==APPS[s.app].name?v:'');save()}desk()};i.onblur=()=>fin(1);i.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter')fin(1);if(e.key==='Escape')fin(0)};i.onpointerdown=e=>e.stopPropagation()}
const openS=s=>s.fsc?window.openShortcut(s):openApp(s.app);
function addDesk(app){if(typeof SC!=='undefined'&&SC.addApp)return SC.addApp(app);const G=grid(),tk=new Set();S.desk.forEach(o=>o.dc!=null&&tk.add(o.dc+','+o.dr));for(let c=0;c<G.c;c++)for(let r=0;r<G.r;r++)if(!tk.has(c+','+r)){S.desk.push({id:Date.now(),app,name:'',c,r});save();desk();return toast('Added to desktop')}toast('Desktop is full')}
let cx;const closeCtx=()=>{cx&&cx.remove();cx=null};
function ctx(e,items){closeCtx();const m=cx=H('div','ctx',document.body);items.forEach(it=>{if(it==='sep')return H('i','',m);const[t,f,fl]=it,b=H('button','',m);b.textContent=t;b.disabled=fl==='dis';b.onmousedown=e=>e.preventDefault();b.onclick=()=>{closeCtx();f&&f()}});m.style.left=Math.max(6,Math.min(e.clientX,innerWidth-m.offsetWidth-6))+'px';m.style.top=Math.max(6,Math.min(e.clientY,innerHeight-m.offsetHeight-6))+'px'}
const winMenu=w=>[['Minimize',()=>minim(w)],[w.max?'Restore':'Maximize',()=>toggleMax(w)],'sep',['Close',()=>closeW(w)]];
addEventListener('pointerdown',e=>{if(!e.target.closest('.ctx'))closeCtx()},true);addEventListener('keydown',e=>e.key==='Escape'&&closeCtx());addEventListener('blur',closeCtx);
addEventListener('contextmenu',e=>{const t=e.target;e.preventDefault();const f=t.closest('input,textarea');if(f)return ctx(e,[['Cut',()=>{f.focus();document.execCommand('cut')}],['Copy',()=>{f.focus();document.execCommand('copy')}],['Paste',async()=>{try{const x=await navigator.clipboard.readText();f.focus();document.execCommand('insertText',false,x)}catch{}}],['Clipboard history…',()=>{f.focus();window.Clip&&Clip.open()}],'sep',['Select all',()=>{f.focus();f.select()}]]);if(!L.classList.contains('hide')||t.closest('.ctx,.pop'))return;
 const wn=t.closest('.win');if(wn){const w=W.find(x=>x.el===wn),a=APPS[w.app];if(a.noctx&&t.closest('.body'))return;return ctx(e,(t.closest('.body')&&a.ctx&&a.ctx(e,w))||winMenu(w))}
 if(t.closest('#tb'))return ctx(e,[['Taskbar settings',()=>openTo('Taskbar')]]);
 ctx(e,[['Personalize',()=>openTo('Personalization')],['Taskbar settings',()=>openTo('Taskbar')],'sep',['Open My Files',()=>openApp('files')]])});
/* loose taskbar: reveal at edge, never while the cursor is locked */
let hideT=0;addEventListener('pointermove',e=>{if(!S.loose||document.pointerLockElement)return;const r=tb.getBoundingClientRect(),sh=tb.classList.contains('show'),E=6,
 edge=S.pos==='bottom'?e.clientY>=innerHeight-E:S.pos==='left'?e.clientX<=E:e.clientX>=innerWidth-E,near=sh&&e.clientX>r.left-24&&e.clientX<r.right+24&&e.clientY>r.top-24&&e.clientY<r.bottom+24;
 if(edge||near){clearTimeout(hideT);hideT=0;if(!sh)tb.classList.add('show')}else if(sh&&!hideT)hideT=setTimeout(()=>{hideT=0;if(!pop.firstChild&&!document.querySelector('.ctx'))tb.classList.remove('show')},350)});
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement)tb.classList.remove('show')});
window.RZ={lockCursor:w=>w.lockCursor(),unlockCursor:()=>document.exitPointerLock(),toast,openApp};
/* ---------- lock down browser behaviour ---------- */
let RZleave=0;
addEventListener('beforeunload',e=>{if(!RZleave){e.preventDefault();e.returnValue=''}});
addEventListener('keydown',e=>{if(e.key==='Escape')return;const inp=e.target.closest&&e.target.closest('input,textarea,[contenteditable]'),m=e.ctrlKey||e.metaKey,kk=e.key.toLowerCase(),nav=/^(arrow|home$|end$|backspace$|delete$|pageup$|pagedown$)/.test(kk)&&!e.altKey,txt=e.target.closest&&e.target.closest('.stw-pg,.stw-dev,.tm-out,.stw-menu'),ok=m&&((inp&&(['a','c','v','x','z','y'].includes(kk)||nav))||(!inp&&txt&&['a','c'].includes(kk)))||(inp&&e.shiftKey&&nav);
 if(!ok&&(m||e.key==='Alt'||/^F\d+$/.test(e.key)||(e.altKey&&/^Arrow|^Home/.test(e.key))))e.preventDefault()},true);
addEventListener('wheel',e=>{if(e.ctrlKey)e.preventDefault()},{passive:false});
['gesturestart','gesturechange','dragstart','auxclick','dblclick'].forEach(t=>addEventListener(t,e=>{if(t!=='dblclick'||e.target.closest('.tbar,.sc'))return t==='dblclick'?0:e.preventDefault();e.preventDefault()},{passive:false}));
addEventListener('mousedown',e=>{if(e.button===1)e.preventDefault()});
addEventListener('pointerdown',()=>{if(document.fullscreenElement)return;document.documentElement.requestFullscreen?.({navigationUI:'hide'}).then(()=>navigator.keyboard?.lock?.()).catch(()=>{})},{once:true});
/* ---------- reusable multi-select (desktop now, File Explorer later) ---------- */
function selectable(host,o){let anchor=null,pend=null,sx=0,sy=0,band=null,base=null;const sel=o.sel;
 host.addEventListener('pointerdown',e=>{if(e.button!==0)return;sx=e.clientX;sy=e.clientY;const its=o.items(),hit=its.find(i=>i.el.contains(e.target)),add=e.ctrlKey||e.metaKey,rng=e.shiftKey;pend=null;
  if(hit){if(rng&&anchor!=null){const a=its.findIndex(i=>i.key===anchor),b=its.indexOf(hit);if(!add)sel.clear();for(let k=Math.min(a,b);k<=Math.max(a,b);k++)sel.add(its[k].key)}
   else if(add){sel.has(hit.key)?sel.delete(hit.key):sel.add(hit.key);anchor=hit.key}
   else{if(sel.has(hit.key))pend=hit.key;else{sel.clear();sel.add(hit.key)}anchor=hit.key}o.change();return}
  if(!add&&!rng)sel.clear();base=new Set(sel);band=H('div','band',host);host.setPointerCapture(e.pointerId);o.change()});
 host.addEventListener('pointermove',e=>{if(!band)return;const B=o.bounds?o.bounds():{x:0,y:0,w:innerWidth,h:innerHeight},mx=cl(e.clientX,B.x,B.x+B.w),my=cl(e.clientY,B.y,B.y+B.h),x1=cl(sx,B.x,B.x+B.w),y1=cl(sy,B.y,B.y+B.h),x=Math.min(x1,mx),y=Math.min(y1,my),w=Math.abs(mx-x1),h=Math.abs(my-y1);Object.assign(band.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
  sel.clear();base.forEach(k=>sel.add(k));o.items().forEach(i=>{const r=i.el.getBoundingClientRect();if(r.left<x+w&&r.right>x&&r.top<y+h&&r.bottom>y)sel.add(i.key)});o.change()});
 host.addEventListener('pointerup',e=>{if(band){band.remove();band=null}if(pend!=null&&Math.hypot(e.clientX-sx,e.clientY-sy)<6){sel.clear();sel.add(pend);o.change()}pend=null})}
selectable($('#desk'),{items:()=>deskEls,sel:selIds,change:paintSel,bounds:area});
addEventListener('pointerdown',e=>{if(selIds.size&&e.target.closest('.win,#tb,.pop')){selIds.clear();paintSel()}},true);
addEventListener('keydown',e=>{if(e.key==='Tab')e.preventDefault()},true);
/* ---------- browser lockdown ---------- */
const KL=['KeyT','KeyW','KeyN','Tab','F5','F6'];
let kl=0;function klock(){if(kl)return;kl=1;try{navigator.keyboard&&navigator.keyboard.lock(KL).catch(()=>{kl=0})}catch{kl=0}}
function kunlock(){kl=0;try{navigator.keyboard&&navigator.keyboard.unlock()}catch{}}
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)kl=0});
let imp=0;function immerse(){if(!S.immersive||imp)return;if(document.fullscreenElement)return klock();imp=1;try{const p=document.documentElement.requestFullscreen({navigationUI:'hide'});if(p)p.then(klock).catch(()=>{}).finally(()=>{imp=0});else imp=0}catch{imp=0}}
/* capture phase: taskbar/start-menu/dialog handlers call stopPropagation(), so a bubbling listener never saw those clicks */
addEventListener('click',e=>{if(!(e.target.closest&&e.target.closest('input,textarea')))immerse()},true);
addEventListener('blur',()=>setTimeout(()=>{const a=document.activeElement;if(a&&a.tagName==='IFRAME')immerse()},0));
addEventListener('keydown',e=>{const k=e.key.toLowerCase(),m=e.ctrlKey||e.metaKey;if(m&&((k.length===1&&'swprfdulgehkjbo+-=0'.includes(k))||/^(tab|pageup|pagedown|[1-9])$/.test(k)))e.preventDefault();if(/^F([1-9]|10)$/.test(e.key)||(e.altKey&&/^Arrow(Left|Right)$/.test(e.key)))e.preventDefault()},true);
addEventListener('wheel',e=>{if(e.ctrlKey)e.preventDefault()},{passive:false});
addEventListener('mousedown',e=>{if(e.button===1)e.preventDefault()});
['gesturestart','gesturechange','dragstart','auxclick'].forEach(n=>addEventListener(n,e=>e.preventDefault()));
/* ---------- boot ---------- */
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch{}
(async()=>{let s;try{DB=await idb();for(const wait of[0,150,350,700,1200,2000]){if(wait)await new Promise(r=>setTimeout(r,wait));s=await load();if(s)break}
  if(!s&&hasSeen()){
   /* this browser has real saved data, but IndexedDB didn't return it in time (almost always a reload racing an unfinished write from the previous page).
      Showing nothing and falling through to defaults would then get SAVED OVER the real data — so instead, wait longer and keep trying rather than ever booting into (and persisting) a blank profile. */
   for(let i=0;i<20&&!s;i++){await new Promise(r=>setTimeout(r,500));s=await load()}
   if(!s){document.body.insertAdjacentHTML('beforeend','<div style="position:fixed;inset:0;z-index:99999;background:#0b0824;color:#eef;display:grid;place-items:center;font:15px system-ui;text-align:center;padding:24px"><div><p>Your saved data is taking longer than usual to load.</p><p style="opacity:.7">Reloading now could overwrite it, so this is waiting rather than guessing.</p><button onclick="location.reload()" style="margin-top:14px;padding:8px 18px;border:0;border-radius:8px;background:#3700ff;color:#fff;cursor:pointer">Try again</button></div></div>');
    return}}
  if(!s)try{s=JSON.parse(localStorage.getItem('rzos'))}catch{}
  if(s){S=s;markSeen();if(S.bg){S.profiles[0].bg=S.bg;delete S.bg}for(const p of S.profiles)if(p.pw){await setPw(p,p.pw);delete p.pw}localStorage.removeItem('rzos')}}catch(e){console.error(e)}
 S.profiles??=[];S.desk??=[];
 if(!S.mig){const lg=Object.fromEntries(PK.map(k=>[k,S[k]!==undefined?S[k]:DP[k]]));S.profiles.forEach(p=>{if(!p.prefs)p.prefs={...lg}});S.mig=1}
 /* legacy per-user data that used to be global */
 if(!S.fsv&&S.profiles.length){const p0=S.profiles[0];p0.prefs=p0.prefs||{};['pins','fm','scout','installed'].forEach(k=>{if(S[k]!==undefined&&p0.prefs[k]===undefined)p0.prefs[k]=S[k]})}
 try{FS.onCfg=()=>save();FS.setWho(()=>S.profiles.find(p=>p.id===S.cur)||S.profiles[0]||null);await FS.ready;await FS.boot(S)}catch(e){console.error('boot',e);setTimeout(()=>typeof RZ!=='undefined'&&RZ.toast&&RZ.toast('Storage warning: '+(e.message||e)),2000)}
 S.pos??='bottom';S.loose??=false;S.immersive??=true;S.theme??=0;S.corners??='rounded';S.glass??=.5;
 if(S.profiles.length&&!S.profiles.some(p=>p.admin))S.profiles[0].admin=true;
 if(S.profiles.length&&!S.profiles.some(p=>p.id===S.cur))S.cur=S.profiles[0].id;
 if(S.profiles.length)loadPrefs(S.cur);(window.regInstalled&&window.regInstalled());(typeof SC!=='undefined'&&SC.reload());
 const fl=()=>{try{save();typeof FS!=='undefined'&&FS.flushCfg&&FS.flushCfg()}catch{}};addEventListener('pagehide',fl);addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')fl()});
 addEventListener('resize',()=>{closePop();renderTB();refit(1)});addEventListener('keydown',e=>{if(!L.classList.contains('hide')&&e.ctrlKey&&e.altKey&&e.shiftKey&&e.code==='KeyX'){e.preventDefault();factory()}});
 if(S.profiles.length){save();applyTheme();desk();lockNow()}else{desk();setupProfile()}})();
