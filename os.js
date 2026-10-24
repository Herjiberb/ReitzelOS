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
function applyTheme(){const r=document.documentElement.style;r.setProperty('--bg',bgv(prof().bg));const z={compact:[38,20],roomy:[48,28],luxurious:[66,44]}[S.size];r.setProperty('--tbh',z[0]+'px');r.setProperty('--ico',z[1]+'px');
 tb.className=(S.conn?'conn ':'')+S.pos+(S.loose?' loose':'')+(S.loose&&tb.classList.contains('show')?' show':'');renderTB();refit();desk()}
/* ---------- apps ---------- */
const APPS={files:{name:'File Explorer',icon:'folder',w:720,h:460,ctx:()=>[['New folder',null,'dis'],['New file',null,'dis'],'sep',['Refresh',()=>{}],['Properties',null,'dis']],render:b=>{b.innerHTML=`<div class=files><img src="${IC('folder')}"><h1>File Explorer</h1></div>`}},
 settings:{name:'Settings',icon:'compass-settings',w:820,h:540,render:renderSettings}};
let W=[],zc=10,nid=1;
/* ---------- windows ---------- */
function openApp(id,opt){const a=APPS[id],A=area(),o=W.length%6*28;const el=H('div','win',$('#wins'));
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
function genie(w,rev){const e=w.el,b=$(`#tb [data-app="${w.app}"]`)||$('#tb .more'),R=b?b.getBoundingClientRect():{left:innerWidth/2-20,top:innerHeight-50,width:40,height:40};
 const W0=e.offsetWidth,H0=e.offsetHeight,dx=R.left+R.width/2-(e.offsetLeft+W0/2),dy=R.top+R.height/2-(e.offsetTop+H0/2),iw=Math.max(.04,R.width*.5/W0),N=18,kf=[];
 for(let k=0;k<=N;k++){const t=k/N,eo=ss(t),sb=ss(cl(t*1.6,0,1)),L=[],Q=[];
  for(let j=0;j<=14;j++){const y=j/14,s=ss(cl(t*1.6-(1-y)*.6,0,1)),wf=1-(1-iw)*s,off=cl(dx*(s-sb)/W0,-.4,.4);L.push(`${cl(.5+off-wf/2,0,1)*100}% ${y*100}%`);Q.unshift(`${cl(.5+off+wf/2,0,1)*100}% ${y*100}%`)}
  kf.push({clipPath:`polygon(${L.concat(Q).join(',')})`,transform:`translate(${dx*sb}px,${dy*eo}px) scaleY(${1-.96*eo})`,opacity:t>.88?(1-t)/.12:1})}
 w.a&&w.a.cancel();e.classList.add('gen');const a=w.a=e.animate(rev?kf.reverse():kf,{duration:rev?460:520,easing:'linear',fill:'both'});
 a.onfinish=()=>{e.classList.remove('gen');if(!rev&&w.min)e.classList.add('min');a.cancel()}}
function closeW(w){w.el.classList.add('closing');W=W.filter(x=>x!==w);setTimeout(()=>w.el.remove(),200);renderTB()}
function toggleMax(w){const e=w.el,A=area();if(w.max){Object.assign(e.style,w.prev);w.max=false;e.classList.remove('max')}else{w.prev={left:e.style.left,top:e.style.top,width:e.style.width,height:e.style.height};Object.assign(e.style,{left:A.x+'px',top:A.y+'px',width:A.w+'px',height:A.h+'px'});w.sr=null;w.max=true;e.classList.add('max')}
 $('.ic',e).innerHTML=w.max?X.res:X.max;e.classList.add('snap');setTimeout(()=>e.classList.remove('snap'),200);focusW(w)}
function snap(w,r){const A=area(),e=w.el;if(w.max){w.max=false;e.classList.remove('max');$('.ic',e).innerHTML=X.max}e.classList.add('snap');
 w.sr=r;Object.assign(e.style,{left:A.x+A.w*r[0]/100+'px',top:A.y+A.h*r[1]/100+'px',width:A.w*r[2]/100+'px',height:A.h*r[3]/100+'px'});setTimeout(()=>e.classList.remove('snap'),200);focusW(w)}
function drag(w){const t=$('.tbar',w.el);t.onpointerdown=e=>{if(e.target.closest('button'))return;let sx=e.clientX,sy=e.clientY,L=w.el.offsetLeft,T=w.el.offsetTop;t.setPointerCapture(e.pointerId);
 if(w.max){const ratio=e.clientX/innerWidth;toggleMax(w);L=e.clientX-w.el.offsetWidth*ratio;T=0;sx=e.clientX;sy=e.clientY;w.el.style.left=L+'px'}
 t.onpointermove=m=>{w.sr=null;w.el.style.left=L+m.clientX-sx+'px';w.el.style.top=Math.max(0,T+m.clientY-sy)+'px'};
 t.onpointerup=m=>{t.onpointermove=null;if(m.clientY<4)toggleMax(w)}}}
function resize(w){w.el.querySelectorAll('.rz').forEach(r=>r.onpointerdown=e=>{e.stopPropagation();focusW(w);const d=r.dataset.d,el=w.el,s={x:e.clientX,y:e.clientY,l:el.offsetLeft,t:el.offsetTop,w:el.offsetWidth,h:el.offsetHeight};r.setPointerCapture(e.pointerId);
 r.onpointermove=m=>{w.sr=null;const dx=m.clientX-s.x,dy=m.clientY-s.y,mw=280,mh=180;if(d.includes('e'))el.style.width=Math.max(mw,s.w+dx)+'px';if(d.includes('s'))el.style.height=Math.max(mh,s.h+dy)+'px';
 if(d.includes('w')){const nw=Math.max(mw,s.w-dx);el.style.width=nw+'px';el.style.left=s.l+s.w-nw+'px'}if(d.includes('n')){const nh=Math.max(mh,s.h-dy);el.style.height=nh+'px';el.style.top=s.t+s.h-nh+'px'}};r.onpointerup=()=>r.onpointermove=null})}
/* ---------- taskbar ---------- */
const tb=$('#tb');
function renderTB(){const V=S.pos!=='bottom',run=[];W.forEach(w=>{if(!S.pins.includes(w.app)&&!run.includes(w.app))run.push(w.app)});tb.innerHTML='';
 const s=H('button','tbb',tb,`<img src="${IC('reitzel')}">`);s.onclick=e=>{e.stopPropagation();toggleStart()};
 const box=H('div','apps',tb),sz=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ico'))+14,A=S.pins.concat(run).filter(k=>APPS[k]),room=V?innerHeight-260-sz*2:innerWidth-(S.conn?60:90)-330-sz*2,fit=Math.max(1,Math.floor(room/sz)),vis=A.length>fit?A.slice(0,fit-1):A,rest=A.slice(vis.length);
 const btn=(id,p)=>{const ws=W.filter(w=>w.app===id),b=H('button','tbb'+(ws.length?' run':'')+(ws.some(w=>w.el.classList.contains('foc'))?' act':''),p,`<img src="${IC(APPS[id].icon)}">`);b.title=APPS[id].name;b.dataset.app=id;
  b.onclick=e=>{e.stopPropagation();if(!ws.length)openApp(id);else if(ws.length>1)previews(ws,b);else{const w=ws[0];(w.el.classList.contains('foc')&&!w.min)?minim(w):focusW(w)}};
  b.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();const pn=S.pins.includes(id);ctx(e,[[ws.length?'Show':'Open',()=>ws.length?focusW(ws[ws.length-1]):openApp(id)],'sep',[pn?'Unpin from taskbar':'Pin to taskbar',()=>pn?unpin(id):pin(id)],...(ws.length?['sep',[ws.length>1?'Close all windows':'Close window',()=>ws.slice().forEach(closeW)]]:[])])};return b};
 vis.forEach((id,i)=>{if(i&&i===S.pins.length)H('i','dv',box);btn(id,box)});
 if(rest.length){const m=H('button','tbb more',box,'···');m.onclick=e=>{e.stopPropagation();miniBar(rest,m,btn)}}
 H('div','sp',tb);const wf=H('button','tbb',tb,`<img src="${IC('network')}">`);wf.title='Network';
 const c=H('div','clk',tb);const tick=()=>{const d=new Date(),tm=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:!S.mil});c.innerHTML='<div>'+(V?tm.replace(' ','<br>'):tm)+'</div>'+(V?'':'<div class=dt>'+d.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})+'</div>')};tick();c._t=tick}
setInterval(()=>{const c=$('.clk');c&&c._t()},5000);
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
function toggleStart(){if($('#start'))return closePop();closePop();const p=H('div','pop',pop);p.id='start';startPos(p);
 p.innerHTML=`<input class=srch placeholder="Search apps" autofocus><div class=grid></div><div class=foot></div>`;p.onclick=e=>e.stopPropagation();
 const g=$('.grid',p),draw=q=>{g.innerHTML='';Object.keys(APPS).filter(k=>APPS[k].name.toLowerCase().includes(q.toLowerCase())).forEach(k=>{const i=H('button','gi',g,`<img src="${IC(APPS[k].icon)}">${APPS[k].name}`);i.onclick=()=>{closePop();openApp(k)};i.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();const pn=S.pins.includes(k);ctx(e,[['Open',()=>{closePop();openApp(k)}],'sep',['Add to desktop',()=>addDesk(k)],[pn?'Unpin from taskbar':'Pin to taskbar',()=>pn?unpin(k):pin(k)]])}})};draw('');
 $('.srch',p).oninput=e=>draw(e.target.value);setTimeout(()=>$('.srch',p).focus(),30);
 const f=$('.foot',p),me=prof(),pb=H('button','',f);pb.style.cssText='display:flex;align-items:center;gap:10px;flex:1';pb.append(av(me));H('b','',pb).textContent=me.name;
 const menu=(items,side)=>{p.querySelector('.pm')?.remove();const m=H('div','pop pm',f);m.style.cssText='position:absolute;bottom:56px;'+side+':0';items.forEach(([n,fn,a])=>{const b=H('button','',m);if(a)b.append(a);b.append(n);b.onclick=fn})};
 const pw=H('button','btn',f,'⏻');pw.onclick=()=>menu([['Sign out',lockNow],['Restart',()=>{sessionStorage.setItem('rz-restart',1);location.reload()}],['Power off',powerOff]],'right');
 pb.onclick=()=>menu(S.profiles.map(x=>[x.name,()=>{S.cur=x.id;save();lockNow()},av(x)]),'left')}
addEventListener('click',e=>{if(!e.target.closest('.pop'))closePop()});
/* ---------- desktop ---------- */
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
function cropAvatar(done){const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>{const f=i.files[0];if(!f)return;const im=new Image();im.onload=()=>edit(im);im.src=URL.createObjectURL(f)};i.click();
 function edit(im){const ov=H('div','crop',document.body),B=H('div','card cbox',ov,`<h3>Position your picture</h3><canvas width=300 height=300></canvas><input type=range min=1 max=4 step=.01 value=1><small>Drag to move · scroll or slide to zoom</small><div class=rw><button class=btn>Cancel</button><button class="btn pri">Save</button></div>`);
  const cv=$('canvas',B),g=cv.getContext('2d'),z=$('input',B),R=130,base=Math.max(2*R/im.width,2*R/im.height);let k=1,x=150,y=150;
  const dim=()=>[im.width*base*k/2,im.height*base*k/2];
  const draw=()=>{const[w,h]=dim();x=cl(x,150+R-w,150-R+w);y=cl(y,150+R-h,150-R+h);g.clearRect(0,0,300,300);g.drawImage(im,x-w,y-h,2*w,2*h);g.fillStyle='rgba(5,0,26,.72)';g.beginPath();g.rect(0,0,300,300);g.arc(150,150,R,0,7,true);g.fill('evenodd');g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.arc(150,150,R,0,7);g.stroke()};
  const zoom=n=>{n=cl(n,1,4);x=150+(x-150)*n/k;y=150+(y-150)*n/k;k=n;z.value=n;draw()};
  let d=null;cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);d=[e.clientX,e.clientY]};cv.onpointerup=()=>d=null;
  cv.onpointermove=e=>{if(!d)return;const r=300/cv.getBoundingClientRect().width;x+=(e.clientX-d[0])*r;y+=(e.clientY-d[1])*r;d=[e.clientX,e.clientY];draw()};
  cv.onwheel=e=>{e.preventDefault();zoom(k*(e.deltaY<0?1.06:.94))};z.oninput=()=>zoom(+z.value);
  const[bc,bs]=B.querySelectorAll('button');bc.onclick=()=>ov.remove();
  bs.onclick=()=>{const[w,h]=dim(),q=base*k,o=document.createElement('canvas');o.width=o.height=256;o.getContext('2d').drawImage(im,(150-R-(x-w))/q,(150-R-(y-h))/q,2*R/q,2*R/q,0,0,256,256);done(o.toDataURL('image/jpeg',.9));ov.remove()};draw()}}
function renderSettings(body,w){let tab=w.tab||'Personalization';w.setTab=t=>{tab=t;draw()};const draw=()=>{body.innerHTML=`<div class=app><div class=nav></div><div class=pane></div></div>`;const nv=$('.nav',body),pn=$('.pane',body);
 ['Personalization','Profiles','Taskbar','Time','System'].forEach(t=>{const b=H('button',t===tab?'on':'',nv,t);b.onclick=()=>{tab=t;draw()}});H('h3','',pn).textContent=tab;const card=(h)=>{const c=H('div','card',pn,h||'');return c},row=(c,l)=>{const r=H('div','rw',c);H('span','',r).textContent=l;return r};
 const ref=()=>{save();applyTheme();desk();draw()};
 if(tab==='Personalization'){const p=prof();[['Wallpaper','bg'],['Lock screen','lockbg']].forEach(([l,k])=>{const c=card(),r=row(c,l+' — '+p.name);if(p[k]){const im=H('div','',c);im.style.cssText=`height:90px;border-radius:8px;background:url(${p[k]}) center/cover`}const r2=H('div','rw',r);H('button','btn pri',r2,'Upload').onclick=()=>pickImg(d=>{p[k]=d;ref()},2560);H('button','btn',r2,'Default').onclick=()=>{p[k]=null;ref()}})}
 if(tab==='Profiles'){S.profiles.forEach(p=>{const c=card(),r=row(c,'');r.firstChild.remove();const a=av(p);a.style.cssText='width:48px;height:48px;flex:none';r.append(a);
  const n=H('input','in',r);n.value=p.name;n.onchange=()=>{p.name=n.value||'User';ref()};const pw=H('input','in',r);pw.placeholder=p.hash?'Password set (change)':'Set password (optional)';pw.type='password';pw.onchange=async()=>{await setPw(p,pw.value);ref()};
  const r2=H('div','rw',c);H('button','btn',r2,'Upload picture').onclick=()=>cropAvatar(d=>{p.avatar=d;p.letters=false;ref()});H('button','btn',r2,p.letters?'Use picture':'Use letter').onclick=()=>{if(p.letters&&!p.avatar)return;p.letters=!p.letters;ref()};
  if(p.hash)H('button','btn',r2,'Remove password').onclick=()=>{p.salt=p.hash='';ref()};if(S.profiles.length>1)H('button','btn dng',r2,'Delete').onclick=()=>{S.profiles=S.profiles.filter(x=>x!==p);if(S.cur===p.id)S.cur=S.profiles[0].id;ref()}});
  H('button','btn pri',pn,'+ Add profile').onclick=()=>{const id=Date.now();S.profiles.push({id,name:'User '+(S.profiles.length+1),avatar:null,letters:true,salt:'',hash:'',bg:null,lockbg:null});ref()}}
 if(tab==='Taskbar'){const c=card(),sel=(r,v,o,fn)=>{const q=H('select','in',r,o.map(x=>`<option value=${x[0]}>${x[1]}</option>`).join(''));q.value=v;q.onchange=()=>fn(q.value)},chk=(l,k)=>{const r=row(c,l),i=H('input','',r);i.type='checkbox';i.checked=S[k];i.onchange=()=>{S[k]=i.checked;ref()}};
  sel(row(c,'Position'),S.pos,[['bottom','Bottom'],['left','Left'],['right','Right']],v=>{S.pos=v;ref()});sel(row(c,'Size'),S.size,[['compact','Compact'],['roomy','Roomy'],['luxurious','Luxurious']],v=>{S.size=v;ref()});
  chk('Connected taskbar (flush with the screen edge)','conn');chk('Loose taskbar (hidden until you move to its edge; overlays apps)','loose')}
 if(tab==='Time'){const c=card(),r=row(c,'24-hour (military) clock');const k=H('input','',r);k.type='checkbox';k.checked=S.mil;k.onchange=()=>{S.mil=k.checked;ref()}}
 if(tab==='System'){const c=card(),r=row(c,'Factory reset — erases all profiles, passwords and settings');H('button','btn dng',r,'Reset').onclick=()=>{factory()}}};draw()}
/* ---------- layout, desktop, context menus ---------- */
const TBH=()=>({compact:38,roomy:48,luxurious:66})[S.size],thick=()=>TBH()+(S.conn?0:16),CW=84,CH=92,PAD=14;
function area(){const T=thick();let x=0,y=0,w=innerWidth,h=innerHeight;if(!S.loose){if(S.pos==='bottom')h-=T;else{w-=T;if(S.pos==='left')x=T}}return{x,y,w,h}}
function refit(){const A=area();W.forEach(w=>{const e=w.el;if(w.max)Object.assign(e.style,{left:A.x+'px',top:A.y+'px',width:A.w+'px',height:A.h+'px'});else if(w.sr){const r=w.sr;Object.assign(e.style,{left:A.x+A.w*r[0]/100+'px',top:A.y+A.h*r[1]/100+'px',width:A.w*r[2]/100+'px',height:A.h*r[3]/100+'px'})}})}
function startPos(p){const T=thick();if(S.pos==='bottom')p.style.bottom=T+(S.conn?18:10)+'px';else{p.style.bottom='12px';p.style.marginLeft='0';p.style.left=S.pos==='left'?T+8+'px':'auto';if(S.pos==='right')p.style.right=T+8+'px'}}
const pin=k=>{if(!S.pins.includes(k))S.pins.push(k);save();renderTB()},unpin=k=>{S.pins=S.pins.filter(x=>x!==k);save();renderTB()};
function toast(m){const t=H('div','toast',document.body,m);setTimeout(()=>t.remove(),2200)}
function openTo(tab){const w=W.find(x=>x.app==='settings');if(w){focusW(w);w.setTab&&w.setTab(tab)}else openApp('settings',{tab})}
const grid=()=>{const A=area();return{x:A.x,y:A.y,c:Math.max(1,Math.floor((A.w-PAD*2)/CW)),r:Math.max(1,Math.floor((A.h-PAD*2)/CH))}};
function freeCell(G,tk,c0,r0){let best=null,bd=1e9;for(let c=0;c<G.c;c++)for(let r=0;r<G.r;r++){if(tk.has(c+','+r))continue;const d=(c-c0)**2+(r-r0)**2;if(d<bd){bd=d;best=[c,r]}}return best}
function desk(){const d=$('#desk'),G=grid(),tk=new Set();d.innerHTML='';S.desk.forEach(s=>s.dc=null);
 S.desk.forEach(s=>{let c=s.c,r=s.r;if(c>=G.c||r>=G.r||tk.has(c+','+r)){const f=freeCell(G,tk,Math.min(c,G.c-1),Math.min(r,G.r-1));if(!f)return;[c,r]=f}tk.add(c+','+r);s.dc=c;s.dr=r;
  const a=APPS[s.app],nm=s.name||a.name,el=H('div','sc',d,`<img src="${IC(a.icon)}"><span></span>`);$('span',el).textContent=nm;el.title=nm;el.style.left=G.x+PAD+c*CW+'px';el.style.top=G.y+PAD+r*CH+'px';
  let st=null,mv=0,lt=0;el.ondblclick=()=>openApp(s.app);
  el.onpointerdown=e=>{if(e.button)return;st=[e.clientX,e.clientY,el.offsetLeft,el.offsetTop];mv=0;el.setPointerCapture(e.pointerId)};
  el.onpointermove=e=>{if(!st)return;const dx=e.clientX-st[0],dy=e.clientY-st[1];if(!mv&&Math.hypot(dx,dy)<6)return;mv=1;el.classList.add('drag');el.style.left=st[2]+dx+'px';el.style.top=st[3]+dy+'px'};
  el.onpointerup=e=>{if(!st)return;st=null;if(mv){const tc=cl(Math.round((el.offsetLeft-G.x-PAD)/CW),0,G.c-1),tr=cl(Math.round((el.offsetTop-G.y-PAD)/CH),0,G.r-1),o=new Set();S.desk.forEach(x=>{if(x!==s&&x.dc!=null)o.add(x.dc+','+x.dr)});const f=o.has(tc+','+tr)?freeCell(G,o,tc,tr):[tc,tr];if(f){s.c=f[0];s.r=f[1];save()}desk()}else if(e.pointerType==='touch'){if(Date.now()-lt<400)openApp(s.app);lt=Date.now()}};
  el.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();ctx(e,[['Open',()=>openApp(s.app)],['Rename',()=>rename(el,s)],'sep',['Remove shortcut',()=>{S.desk=S.desk.filter(x=>x!==s);save();desk()}]])}})}
function rename(el,s){const sp=$('span',el),i=document.createElement('input');i.className='in';i.value=s.name||APPS[s.app].name;sp.replaceWith(i);i.focus();i.select();let done=0;const fin=ok=>{if(done)return;done=1;if(ok){const v=i.value.trim();s.name=v&&v!==APPS[s.app].name?v:'';save()}desk()};i.onblur=()=>fin(1);i.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter')fin(1);if(e.key==='Escape')fin(0)};i.onpointerdown=e=>e.stopPropagation()}
function addDesk(app){const G=grid(),tk=new Set();S.desk.forEach(o=>o.dc!=null&&tk.add(o.dc+','+o.dr));for(let c=0;c<G.c;c++)for(let r=0;r<G.r;r++)if(!tk.has(c+','+r)){S.desk.push({id:Date.now(),app,name:'',c,r});save();desk();return toast('Added to desktop')}toast('Desktop is full')}
let cx;const closeCtx=()=>{cx&&cx.remove();cx=null};
function ctx(e,items){closeCtx();const m=cx=H('div','ctx',document.body);items.forEach(it=>{if(it==='sep')return H('i','',m);const[t,f,fl]=it,b=H('button','',m);b.textContent=t;b.disabled=fl==='dis';b.onclick=()=>{closeCtx();f&&f()}});m.style.left=Math.max(6,Math.min(e.clientX,innerWidth-m.offsetWidth-6))+'px';m.style.top=Math.max(6,Math.min(e.clientY,innerHeight-m.offsetHeight-6))+'px'}
const winMenu=w=>[['Minimize',()=>minim(w)],[w.max?'Restore':'Maximize',()=>toggleMax(w)],'sep',['Close',()=>closeW(w)]];
addEventListener('pointerdown',e=>{if(!e.target.closest('.ctx'))closeCtx()},true);addEventListener('keydown',e=>e.key==='Escape'&&closeCtx());addEventListener('blur',closeCtx);
addEventListener('contextmenu',e=>{const t=e.target;if(t.closest('input,textarea'))return;e.preventDefault();if(!L.classList.contains('hide')||t.closest('.ctx,.pop'))return;
 const wn=t.closest('.win');if(wn){const w=W.find(x=>x.el===wn),a=APPS[w.app];return ctx(e,(t.closest('.body')&&a.ctx&&a.ctx(e,w))||winMenu(w))}
 if(t.closest('#tb'))return ctx(e,[['Taskbar settings',()=>openTo('Taskbar')]]);
 ctx(e,[['Personalize',()=>openTo('Personalization')],['Taskbar settings',()=>openTo('Taskbar')],'sep',['Open File Explorer',()=>openApp('files')]])});
/* loose taskbar: reveal at edge, never while the cursor is locked */
let hideT=0;addEventListener('pointermove',e=>{if(!S.loose||document.pointerLockElement)return;const r=tb.getBoundingClientRect(),sh=tb.classList.contains('show'),E=6,
 edge=S.pos==='bottom'?e.clientY>=innerHeight-E:S.pos==='left'?e.clientX<=E:e.clientX>=innerWidth-E,near=sh&&e.clientX>r.left-24&&e.clientX<r.right+24&&e.clientY>r.top-24&&e.clientY<r.bottom+24;
 if(edge||near){clearTimeout(hideT);hideT=0;if(!sh)tb.classList.add('show')}else if(sh&&!hideT)hideT=setTimeout(()=>{hideT=0;if(!pop.firstChild&&!document.querySelector('.ctx'))tb.classList.remove('show')},350)});
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement)tb.classList.remove('show')});
window.RZ={lockCursor:w=>w.lockCursor(),unlockCursor:()=>document.exitPointerLock(),toast,openApp};
/* ---------- boot ---------- */
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
(async()=>{try{DB=await idb();let s=await load();if(!s)try{s=JSON.parse(localStorage.getItem('rzos'))}catch{}
 if(s){S=s;if(S.bg){S.profiles[0].bg=S.bg;delete S.bg}for(const p of S.profiles)if(p.pw){await setPw(p,p.pw);delete p.pw}save();localStorage.removeItem('rzos')}}catch(e){console.error(e)}
 S.pins??=['files','settings'];S.desk??=[{id:1,app:'files',c:0,r:0},{id:2,app:'settings',c:0,r:1}];S.pos??='bottom';S.loose??=false;addEventListener('resize',()=>{renderTB();refit();desk()});addEventListener('keydown',e=>{if(!L.classList.contains('hide')&&e.ctrlKey&&e.altKey&&e.shiftKey&&e.code==='KeyX'){e.preventDefault();factory()}});
 applyTheme();desk();lockNow()})();
