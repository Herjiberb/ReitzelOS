'use strict';
/* apps/customize.js — extra themes, taskbar/start/desktop options, presets, top panel, calendar & quick settings.
   Hooks into os.js through: applyExtra, clockHTML, tbExtras, noteRecent, settingsExtra, toggleStartX, panelTick. */
(()=>{
const NEW={tbAlign:'start',tbBtn:'round',tbLabels:'off',tbInd:'bar',tbClock:true,startIco:'medium',startNames:true,startFoot:true,tbSearch:false,tbTray:true,tbDeskBtn:false,tbSecs:false,tbDate:'short',tbIco:0,tbSpace:'normal',
 startStyle:'grid',startPos:'center',startSize:'medium',startRecent:true,startCat:false,startEnd:false,spins:null,recent:[],
 deskIcons:true,deskSz:'medium',deskLabels:true,wpFit:'cover',wpColor:'',panel:false,winTitle:'gradient',winShadow:'normal',superKey:true,cbOn:true,cust:['#3700ff','#a600ff','#007bff']};
Object.keys(NEW).forEach(k=>{if(!PK.includes(k))PK.push(k);DP[k]=NEW[k]});
const g=k=>{let v=S[k]===undefined||S[k]===null&&NEW[k]!==null?NEW[k]:S[k];if(k==='tbLabels')v=v===true?'running':v||'off';if(k==='startStyle'&&v==='win11')v='pinned';return v};
[['Midnight','#1f2a6b','#4b3fa8','#2b6cb0'],['Azure','#0067c0','#1a86d9','#60cdff'],['Cobalt','#0078d4','#005a9e','#3a96dd'],['Ember','#772953','#e95420','#c34113'],['Plum','#2c001e','#5e2750','#e95420'],['Mint','#0b8f6a','#2fb98a','#87cf3e'],['Crimson','#b3001b','#e0243b','#ff6a3d'],['Gold','#c77d00','#ffb400','#fff176'],['Lavender','#6a4fd6','#b388ff','#80d8ff'],['Cyberpunk','#ff00c8','#00f0ff','#fff200'],['Graphite','#2b2f36','#4a5160','#7a8499'],['Sakura','#e8508a','#ffa6c9','#ffd1e3'],['Arctic','#00a3c4','#5ad1e6','#b2f0ff'],['Custom','#3700ff','#a600ff','#007bff']].forEach(t=>THEMES.push(t));
const tIdx=n=>THEMES.findIndex(t=>t[0]===n),CUSTOM=tIdx('Custom');
const WPC=[['Deep space','linear-gradient(135deg,#05050f,#14123a)'],['Plum','linear-gradient(160deg,#2c001e,#5e2750 60%,#77216f)'],['Daybreak','radial-gradient(circle at 30% 30%,#9cc9f5,#3b82d6 55%,#0a3a8a)'],['Sunset','linear-gradient(135deg,#ff7e5f,#feb47b 50%,#7b2ff7)'],['Forest','linear-gradient(135deg,#0b3d2e,#1b7a52)'],['Slate','#20242c'],['Black','#000'],['White','#e9edf3']];
const bc=(c,on)=>document.body.classList.toggle(c,!!on),R=()=>document.documentElement.style;

/* ---------- apply ---------- */
window.applyExtra=()=>{const r=R(),T=THEMES[S.theme]||THEMES[0];
 if(T[0]==='Custom'){const c=g('cust');r.setProperty('--a',c[0]);r.setProperty('--b',c[1]);r.setProperty('--c',c[2])}
 if(g('tbIco')){r.setProperty('--ico',g('tbIco')+'px');const base=parseInt(r.getPropertyValue('--tbh'))||38,need=g('tbIco')+22;if(need>base)r.setProperty('--tbh',need+'px')}
 const dz={small:[72,80,30],medium:[84,92,44],large:[104,112,58]}[g('deskSz')]||[84,92,44];CW=dz[0];CH=dz[1];r.setProperty('--cw',dz[0]+'px');r.setProperty('--ch',dz[1]+'px');r.setProperty('--dico',dz[2]+'px');
 const f=g('wpFit');r.setProperty('--wpsz',{cover:'cover',fit:'contain',stretch:'100% 100%',tile:'auto',center:'auto'}[f]||'cover');r.setProperty('--wprep',f==='tile'?'repeat':'no-repeat');
 try{if(!prof().bg&&g('wpColor'))r.setProperty('--bg',g('wpColor'))}catch{}
 ['round','rounded','square'].forEach(x=>bc('bt-'+x,g('tbBtn')===x));['tight','normal','wide'].forEach(x=>bc('sp-'+x,g('tbSpace')===x));
 ['gradient','solid','dark'].forEach(x=>bc('win-'+x,g('winTitle')===x));['none','normal','big'].forEach(x=>bc('sh-'+x,g('winShadow')===x));
 bc('tbl',g('tbLabels')!=='off');['bar','dot','glow','none'].forEach(x=>bc('ind-'+x,g('tbInd')===x));bc('noclk',!g('tbClock'));bc('nodesk',!g('deskIcons'));bc('nodl',!g('deskLabels'));bc('panel',g('panel'));renderPanel()};

/* ---------- clock ---------- */
const fmtDate=(d,f)=>f==='long'?d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'}):f==='numeric'?d.toLocaleDateString([],{year:'numeric',month:'numeric',day:'numeric'}):d.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'});
const fmtTime=d=>{const o={hour:'2-digit',minute:'2-digit',hour12:!S.mil};if(g('tbSecs'))o.second='2-digit';return d.toLocaleTimeString([],o)};
window.clockHTML=V=>{const d=new Date(),tm=fmtTime(d),f=g('tbDate');if(V)return'<div>'+tm.replace(' ','<br>')+'</div>';return'<div>'+tm+'</div>'+(f==='none'?'':'<div class=dt>'+fmtDate(d,f)+'</div>')};

/* ---------- recent apps ---------- */
window.noteRecent=id=>{if(!APPS[id]||APPS[id].hide)return;S.recent=[id].concat((S.recent||[]).filter(x=>x!==id)).slice(0,12)};

/* ---------- taskbar extras ---------- */
const glyph=(n,gl)=>`<img src="${IC(n)}" onerror="this.outerHTML='<span class=gl>${gl}</span>'">`;
let peek=null;
function showDesktop(){const v=W.filter(w=>!w.min);if(v.length){peek=v;v.forEach(w=>minim(w))}else if(peek){peek.filter(w=>W.includes(w)).forEach(w=>focusW(w));peek=null}}
window.tbExtras=(tb,s,box,V)=>{const clk=$('.clk',tb),tray=$('.tray',tb);
 if(g('tbClock')===false&&clk)clk.remove();if(S.panel){clk&&clk.remove();tray&&tray.remove()}else{if(g('tbTray')===false&&tray)tray.remove();else if(tray)tray.onclick=e=>{e.stopPropagation();quickSettings(tray)};if(clk)clk.onclick=e=>{e.stopPropagation();calendarPop(clk)}}
 if(g('startStyle')==='full'){const im=$('img',s);if(im){im.onerror=()=>{im.onerror=null;im.src=IC('reitzel')};im.src=IC('apps-grid')}}
 if(g('tbSearch')){const b=H('button','tbb tsrch',null,glyph('search','⌕'));b.title='Search';b.onclick=e=>{e.stopPropagation();startX(true)};tb.insertBefore(b,box)}
 if(g('startEnd')&&V)tb.append(s);
 if(g('tbAlign')==='center'&&!V)tb.insertBefore(H('div','sp ld'),tb.firstChild);
 if(g('tbDeskBtn')){const b=H('button','tbb tdesk',tb);b.title='Show desktop';b.onclick=e=>{e.stopPropagation();showDesktop()}}};

/* ---------- top panel ---------- */
function renderPanel(){let e=$('#panel');if(!g('panel')){e&&e.remove();return}
 if(!e){e=H('div','',document.body);e.id='panel'}
 e.innerHTML='<button class=pl title="Apps"><i></i><u></u></button><button class=pc></button><div class=pr><button class="pi pn" title="Quick settings"><img src="'+IC('network')+'"></button><button class="pi pp" title="Power">'+'<span class=gl>⏻</span></button></div>';
 $('.pl',e).onclick=ev=>{ev.stopPropagation();startX()};$('.pc',e).onclick=ev=>{ev.stopPropagation();calendarPop(ev.currentTarget)};
 $('.pn',e).onclick=ev=>{ev.stopPropagation();quickSettings(ev.currentTarget)};$('.pp',e).onclick=ev=>{ev.stopPropagation();quickSettings(ev.currentTarget)};panelTick()}
window.panelTick=()=>{const c=$('#panel .pc');if(!c)return;const d=new Date();c.textContent=d.toLocaleDateString([],{month:'short',day:'numeric'})+'  '+fmtTime(d)};

/* ---------- popups ---------- */
function anchorPop(p,a){const r=a.getBoundingClientRect();if(a.closest('#panel')){p.style.top='34px';p.style.left=Math.max(8,Math.min(innerWidth-p.offsetWidth-8,r.left+r.width/2-p.offsetWidth/2))+'px';return}
 if(S.pos==='bottom'){p.style.bottom=innerHeight-r.top+8+'px';p.style.right=Math.max(8,innerWidth-r.right)+'px'}else{p.style.bottom='12px';if(S.pos==='left')p.style.left=r.right+8+'px';else p.style.right=innerWidth-r.left+8+'px'}}
function calendarPop(a){if($('.cal')){closePop();return}closePop();const p=H('div','pop cal',pop);let t=new Date(),m=new Date(t.getFullYear(),t.getMonth(),1);
 const draw=()=>{const now=new Date();p.innerHTML=`<div class=big>${fmtTime(now)}</div><div style="opacity:.7;margin-bottom:10px">${now.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</div><div class=ch><b></b><button class=btn data-d=-1>‹</button><button class=btn data-d=0>Today</button><button class=btn data-d=1>›</button></div><div class=cg></div>`;
  $('b',p).textContent=m.toLocaleDateString([],{month:'long',year:'numeric'});const cg=$('.cg',p),first=new Date(m.getFullYear(),m.getMonth(),1).getDay(),dim=new Date(m.getFullYear(),m.getMonth()+1,0).getDate(),pd=new Date(m.getFullYear(),m.getMonth(),0).getDate();
  [...'SMTWTFS'].forEach(x=>H('span','w',cg).textContent=x);for(let i=0;i<42;i++){const n=i-first+1,o=n<1||n>dim,e=H('span',o?'o':'',cg);e.textContent=n<1?pd+n:n>dim?n-dim:n;if(!o&&n===now.getDate()&&m.getMonth()===now.getMonth()&&m.getFullYear()===now.getFullYear())e.classList.add('t')}
  p.querySelectorAll('[data-d]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();const d=+b.dataset.d;m=d?new Date(m.getFullYear(),m.getMonth()+d,1):new Date(new Date().getFullYear(),new Date().getMonth(),1);draw()})};
 draw();p.onclick=e=>e.stopPropagation();anchorPop(p,a)}
function quickSettings(a){if($('.qs')){closePop();return}closePop();const p=H('div','pop qs',pop);p.onclick=e=>e.stopPropagation();
 const T=[['Reduce animations','noanim'],['24-hour clock','mil'],['Desktop icons','deskIcons',1],['Connected taskbar','conn'],['Auto-hide taskbar','loose'],['Clock seconds','tbSecs'],['Top panel','panel'],['Search button','tbSearch']];
 const draw=()=>{p.innerHTML='<div class=qg></div><div class=qf></div>';const q=$('.qg',p);T.forEach(([l,k])=>{const on=k==='deskIcons'?g(k):!!S[k],b=H('button','qt'+(on?' on':''),q);b.textContent=l;b.onclick=()=>{S[k]=!on;save();applyTheme();desk();draw()}});
  const f=$('.qf',p);[['Settings',()=>{closePop();openApp('settings')}],['Lock',()=>{closePop();lockNow()}],['Restart',()=>{RZleave=1;sessionStorage.setItem('rz-restart',1);location.reload()}],['Power off',powerOff]].forEach(([l,fn])=>{H('button','btn',f,l).onclick=fn})};
 draw();anchorPop(p,a)}

/* ---------- start menu ---------- */
const SETS=['Personalization','Desktop','Taskbar','Start menu','Time','Profiles','Defaults','System'];
function startX(focus){if($('#start'))return closePop();closePop();
 const st=g('startStyle'),sz=g('startSize'),p=H('div','pop st-'+st+' sz-'+sz+' ic-'+g('startIco')+(g('startNames')?'':' nn')+(g('startFoot')?'':' nf'),pop),bot=S.pos==='bottom';p.id='start';startPos(p);
 if(st==='full'){const A=area();Object.assign(p.style,{left:A.x+'px',top:A.y+'px',width:A.w+'px',height:A.h+'px',margin:'0',bottom:'auto',right:'auto',maxWidth:'none',maxHeight:'none',borderRadius:'0'})}
 else{const w=({small:[460,520],medium:[560,640],large:[700,780]}[sz]||[560,640])[st==='list'?1:0];p.style.width=w+'px';if(bot){if(g('startPos')==='edge'){p.style.left='10px';p.style.marginLeft='0'}else p.style.marginLeft=-w/2+'px'}}
 p.innerHTML='<input class=srch placeholder="Search apps and settings…" autocomplete=off spellcheck=false><div class=sbody></div><div class=foot></div>';
 const sb=$('.sbody',p),inp=$('.srch',p);let q='',all=false,first=null;
 const vis=()=>Object.keys(APPS).filter(k=>!APPS[k].hide),pins=()=>(S.spins||vis()).filter(k=>APPS[k]&&!APPS[k].hide),open=k=>{closePop();openApp(k)};
 const menu=(e,k)=>{e.preventDefault();e.stopPropagation();const tp=S.pins.includes(k),sp=pins().includes(k);ctx(e,[['Open',()=>open(k)],'sep',['Add to desktop',()=>addDesk(k)],[tp?'Unpin from taskbar':'Pin to taskbar',()=>tp?unpin(k):pin(k)],[sp?'Unpin from Start':'Pin to Start',()=>{S.spins=sp?pins().filter(x=>x!==k):pins().concat(k);save();draw()}]])};
 const tile=(k,par)=>{const i=H('button','gi',par,`<img src="${IC(APPS[k].icon)}">`);i.append(APPS[k].name);i.onclick=()=>open(k);i.oncontextmenu=e=>menu(e,k)};
 const row=(k,par)=>{const i=H('button','srow',par,`<img src="${IC(APPS[k].icon)}">`);H('span','',i).textContent=APPS[k].name;i.onclick=()=>open(k);i.oncontextmenu=e=>menu(e,k)};
 const grid=(ks,par)=>{const d=H('div','grid',par);ks.forEach(k=>tile(k,d))};
 const sh=(t,par,bl,fn)=>{const h=H('div','sh',par);H('span','',h).textContent=t;if(bl)H('button','btn',h,bl).onclick=fn};
 const az=par=>{const ks=vis().sort((a,b)=>APPS[a].name.localeCompare(APPS[b].name));let L='';ks.forEach(k=>{const l=APPS[k].name[0].toUpperCase();if(l!==L){L=l;H('div','lt',par).textContent=l}row(k,par)})};
 const rec=()=>(S.recent||[]).filter(k=>APPS[k]&&!APPS[k].hide).slice(0,sz==='small'?3:6);
 const recent=()=>{if(!g('startRecent'))return;const r=rec();if(!r.length)return;sh('Recent',sb);const d=H('div','rrow',sb);r.forEach(k=>row(k,d))};
 function draw(){sb.innerHTML='';first=null;const ql=q.toLowerCase();
  if(q){const ks=vis().filter(k=>APPS[k].name.toLowerCase().includes(ql)),ss=SETS.filter(t=>('settings '+t).toLowerCase().includes(ql));if(ks.length)grid(ks,sb);ss.forEach(t=>{const b=H('button','srow',sb,`<img src="${IC('compass-settings')}">`);H('span','',b).textContent='Settings › '+t;b.onclick=()=>{closePop();openTo(t)}});first=ks.length?()=>open(ks[0]):ss.length?()=>{closePop();openTo(ss[0])}:null;if(!ks.length&&!ss.length)H('div','st-empty',sb,'No results');return}
  if(st==='pinned'){if(all){sh('All apps',sb,'‹ Back',()=>{all=false;draw()});az(sb)}else{sh('Pinned',sb,'All apps ›',()=>{all=true;draw()});grid(pins(),sb);recent()}return}
  if(st==='list'){const c=H('div','cols',sb),l=H('div','al',c),t=H('div','tiles',c);az(l);sh('Pinned',t);grid(pins(),t);recent2(t);return}
  if(g('startCat')){Object.keys(Apps.CATS).forEach(c=>{const ks=vis().filter(k=>(APPS[k].cat||'utilities')===c);if(ks.length){sh(Apps.CATS[c],sb);grid(ks,sb)}})}else grid(vis(),sb)}
 function recent2(t){if(!g('startRecent'))return;const r=rec();if(!r.length)return;sh('Recent',t);r.forEach(k=>row(k,t))}
 draw();inp.oninput=()=>{q=inp.value;draw()};inp.onkeydown=e=>{if(e.key==='Enter'&&first)first()};
 p.onclick=e=>{e.stopPropagation();if(st==='full'&&(e.target===p||e.target===sb||e.target.classList.contains('grid')))return closePop();if(!e.target.closest('.pm,.foot>button'))p.querySelector('.pm')?.remove()};
 setTimeout(()=>inp.focus(),30);
 const f=$('.foot',p),me=prof(),pb=H('button','',f);pb.style.cssText='display:flex;align-items:center;gap:10px;flex:1';pb.append(av(me));H('b','',pb).textContent=me.name;
 const menu2=(items,side)=>{const ex=p.querySelector('.pm');ex&&ex.remove();if(ex&&ex.dataset.k===side)return;const m=H('div','pop pm',f);m.dataset.k=side;m.style.cssText='position:absolute;bottom:56px;'+side+':0';items.forEach(([n,fn,a])=>{const b=H('button','',m);if(a)b.append(a);b.append(n);b.onclick=fn})};
 const pw=H('button','btn',f,'⏻');pw.onclick=()=>menu2([['Sign out',lockNow],['Restart',()=>{RZleave=1;sessionStorage.setItem('rz-restart',1);location.reload()}],['Power off',powerOff]],'right');
 pb.onclick=()=>menu2(S.profiles.map(x=>[x.name,()=>{switchTo(x.id);lockNow()},av(x)]),'left')}
window.toggleStartX=startX;

/* ---------- settings ---------- */
const DEFAULTS={theme:0,pos:'bottom',size:'compact',conn:false,loose:false,tbAlign:'start',tbBtn:'round',tbLabels:'off',tbInd:'bar',tbClock:true,tbSearch:false,tbDeskBtn:false,tbTray:true,tbIco:0,startStyle:'grid',startPos:'center',startEnd:false,panel:false,tbDate:'short',corners:'rounded',glass:.5,winTitle:'gradient'};
window.settingsExtra=(tab,o)=>{const {pn,card,row,ref,H,seg}=o;
 const chk=(l,k,c)=>{const r=row(c||card(),l),i=H('input','',r);i.type='checkbox';i.checked=!!g(k);i.onchange=()=>{S[k]=i.checked;ref()}};
 const sg=(l,k,opts,c)=>seg(row(c||card(),l),g(k),opts,v=>{S[k]=v;ref()});
 const note=(c,t)=>{H('small','',c,t).style.opacity='.6'};
 const grp=t=>card('<b>'+t+'</b>');
 if(tab==='Personalization'){
  const cc=grp('Custom accent colours'),cr=H('div','rw',cc);g('cust').forEach((v,i)=>{const x=H('input','',cr);x.type='color';x.value=v;x.onchange=()=>{const a=g('cust').slice();a[i]=x.value;S.cust=a;S.theme=CUSTOM;ref()}});H('button','btn',cr,'Use custom').onclick=()=>{S.theme=CUSTOM;ref()};
  const c=grp('Wallpaper');sg('Fit','wpFit',[['cover','Fill'],['fit','Fit'],['stretch','Stretch'],['tile','Tile'],['center','Center']],c);
  const wc=grp('Wallpaper colour (used when no picture is set)'),sw=H('div','sw',wc);H('button',!g('wpColor')?'on':'',sw,'Theme').onclick=()=>{S.wpColor='';ref()};WPC.forEach(([n,v])=>{const b=H('button',g('wpColor')===v?'on':'',sw,`<i style="background:${v}"></i>${n}`);b.onclick=()=>{S.wpColor=v;ref()}});
  const w=grp('Windows');sg('Title bars','winTitle',[['gradient','Gradient'],['solid','Solid accent'],['dark','Dark']],w);sg('Shadows','winShadow',[['none','None'],['normal','Normal'],['big','Large']],w)}
 if(tab==='Desktop'){const c=grp('Icons');chk('Show desktop icons','deskIcons',c);chk('Show icon labels','deskLabels',c);sg('Icon size','deskSz',[['small','Small'],['medium','Medium'],['large','Large']],c);
  const c2=grp('Arrange');row(c2,'Sort icons by name');H('button','btn',c2.lastChild,'Arrange').onclick=()=>{const G=grid(),nm=s=>(s.name||(APPS[s.app]&&APPS[s.app].name)||'').toLowerCase();S.desk.slice().sort((a,b)=>nm(a).localeCompare(nm(b))).forEach((s,i)=>{s.c=Math.floor(i/G.r);s.r=i%G.r});ref()};note(c2,'Icons stay where you put them, even if the window is resized or the taskbar moves.')}
 if(tab==='Taskbar'){
  const a=grp('Layout');seg(row(a,'Position'),S.pos,[['bottom','Bottom'],['left','Left'],['right','Right']],v=>{S.pos=v;ref()});seg(row(a,'Thickness'),S.size,[['compact','Compact'],['roomy','Roomy'],['luxurious','Luxurious']],v=>{S.size=v;ref()});sg('Alignment (bottom only)','tbAlign',[['start','Left'],['center','Centre']],a);chk('Connected (flush with the screen edge)','conn',a);chk('Auto-hide until you move to its edge','loose',a);chk('Start button at the end (side bars)','startEnd',a);
  const b=grp('Icons & buttons');sg('Icon size','tbIco',[[0,'Auto'],[16,'Small'],[22,'Medium'],[30,'Large'],[38,'Huge']],b);sg('Button shape','tbBtn',[['round','Round'],['rounded','Rounded'],['square','Square']],b);sg('Spacing','tbSpace',[['tight','Tight'],['normal','Normal'],['wide','Wide']],b);note(b,'The bar grows automatically so large icons and their status marks are never clipped.');
  const d=grp('Running apps');sg('Status mark','tbInd',[['bar','Bar'],['dot','Dot'],['glow','Glow'],['none','None']],d);sg('App names (bottom only)','tbLabels',[['off','Off'],['running','Running apps'],['all','All apps']],d);
  const e=grp('Extras');chk('Search button','tbSearch',e);chk('Network / quick settings button','tbTray',e);chk('Clock','tbClock',e);chk('Show desktop button (far edge)','tbDeskBtn',e);chk('Top bar with date and tray','panel',e)}
 if(tab==='Start menu'){
  const a=grp('Look');sg('Style','startStyle',[['grid','Grid'],['pinned','Pinned + all apps'],['list','List + tiles'],['full','Full screen']],a);sg('Size','startSize',[['small','Small'],['medium','Medium'],['large','Large']],a);sg('Icon size','startIco',[['small','Small'],['medium','Medium'],['large','Large']],a);sg('Position (bottom bar)','startPos',[['center','Centre'],['edge','Left edge']],a);
  const c=grp('Content');chk('Show app names','startNames',c);chk('Show recent apps','startRecent',c);chk('Group apps by category (grid / full screen)','startCat',c);chk('Show profile and power row','startFoot',c);
  const pc=grp('Pinned to Start'),all=Object.keys(APPS).filter(k=>!APPS[k].hide),cur=new Set(S.spins||all);all.forEach(k=>{const r=row(pc,APPS[k].name),i=H('input','',r);i.type='checkbox';i.checked=cur.has(k);i.onchange=()=>{i.checked?cur.add(k):cur.delete(k);S.spins=[...cur];ref()}});const br=H('div','rw',pc);H('button','btn',br,'Pin all').onclick=()=>{S.spins=null;ref()};H('button','btn',br,'Unpin all').onclick=()=>{S.spins=[];ref()}}
 if(tab==='Time'){const c=grp('Clock');chk('24-hour clock','mil',c);chk('Show seconds','tbSecs',c);const r=row(c,'Show date on taskbar'),i=H('input','',r);i.type='checkbox';i.checked=!S.nodate;i.onchange=()=>{S.nodate=!i.checked;ref()};sg('Date format','tbDate',[['short','Short'],['long','Weekday'],['numeric','Numeric'],['none','Hidden']],c);note(c,'Click the clock to open the calendar.')}
 if(tab==='System'){const k=grp('Keyboard');chk('Super key opens Start (Super+E Files, Super+I Settings, Super+L Lock)','superKey',k);chk('Clipboard history (Super+V or Ctrl+Alt+V)','cbOn',k);const kr=row(k,'Capture the Super key (fullscreen, Chromium browsers)');H('button','btn',kr,'Enter fullscreen').onclick=()=>window.captureSuper&&captureSuper();const cr2=row(k,'Saved clipboard history');H('button','btn dng',cr2,'Clear all').onclick=()=>{window.Clip&&Clip.clear(true);ref()};note(k,'Without fullscreen the browser or OS may keep the Super key for itself. Ctrl+Esc and Ctrl+Alt+V always work.');const c=grp('Appearance'),r=row(c,'Reset theme, taskbar, start menu and desktop to defaults');H('button','btn',r,'Reset appearance').onclick=()=>{Object.assign(S,JSON.parse(JSON.stringify(DEFAULTS)),{noanim:false,nodate:false,mil:false,tbSecs:false,tbSpace:'normal',startSize:'medium',startIco:'medium',startNames:true,startFoot:true,startRecent:true,startCat:false,spins:null,deskIcons:true,deskSz:'medium',deskLabels:true,wpFit:'cover',wpColor:'',winShadow:'normal',cust:NEW.cust.slice()});ref()}}};
try{applyVars()}catch{}
})();
