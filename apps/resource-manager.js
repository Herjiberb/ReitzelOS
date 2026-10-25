'use strict';
/* =====================================================================
   apps/resource-manager.js — Resource Manager (Ctrl+Esc) + background/startup engine
   ---------------------------------------------------------------------
   Proc      process table for background tasks, startup list, kill switch
   Built-in apps opt in with   def.bg = { every:ms, tick(ctx), start?(ctx), stop?(ctx) }
   .xctu apps opt in with      "bg": "bg.js" in xctu.json + the “background” permission
   Nothing starts at sign-in unless the user ticked it in Resource Manager → Startup.
   ===================================================================== */
const Proc=(()=>{
 /* the restraints — enforced below, listed to the user in the Rules tab */
 const LIM={bg:6,xbg:3,auto:3,minEvery:1000,hiddenEvery:5000,budget:250,strikes:3,toast:10000,calls:60,writes:20,beat:10000};
 const T=new Map(),hits=new Map();let owner=null,booting=0;
 const AK=()=>'rz.auto.'+S.cur,auto=()=>{try{return JSON.parse(localStorage.getItem(AK())||'{}')}catch{return{}}},setAuto=o=>{try{localStorage.setItem(AK(),JSON.stringify(o))}catch{}};
 const hit=id=>hits.set(id,(hits.get(id)||0)+1);
 const xs=()=>[...T.values()].filter(t=>t.kind==='xctu').length;
 function start(id,quiet){const a=APPS[id];if(!a||!a.bg)return false;const k='bg:'+id;if(T.has(k))return true;
  const no=m=>{quiet||toast(m);return false};
  if(T.size>=LIM.bg)return no('Background limit reached ('+LIM.bg+'). End one in Resource Manager first.');
  const t={key:k,app:id,name:a.name,icon:a.icon,t0:Date.now(),ticks:0,cpu:0,strikes:0,state:'running'};
  if(a.xctu){if(xs()>=LIM.xbg)return no('At most '+LIM.xbg+' XCTU apps may run in the background.');if(!Apps.can('background',id))return no(a.name+' was not granted background permission.');
   const h=Xctu.bgStart(id);if(!h)return false;Object.assign(t,{kind:'xctu',stub:h.stub,stop:h.stop});h.stub.beat=Date.now()+LIM.beat}
  else if(typeof a.bg==='object'&&a.bg.tick){const d=a.bg,ctx={app:id,user:prof().name,mem:{},toast:m=>{const n=Date.now();if(n-(t.lt||0)>=LIM.toast){t.lt=n;toast(a.name+': '+m)}}};
   Object.assign(t,{kind:'builtin'});try{d.start&&d.start(ctx)}catch(e){return no(a.name+' failed to start: '+e.message)}
   const gap=()=>Math.max(LIM.minEvery,d.every||5000,document.hidden?LIM.hiddenEvery:0);
   const step=async()=>{if(T.get(k)!==t)return;const s=performance.now();let bad=0;
    try{await Promise.race([Promise.resolve(d.tick(ctx)),new Promise((_,j)=>setTimeout(()=>j(Error('tick timed out')),2000))])}catch(e){t.err=String(e&&e.message||e);bad=1}
    const dt=performance.now()-s;t.cpu+=dt;t.ticks++;if(dt>LIM.budget){bad=1;t.err='tick used '+Math.round(dt)+' ms (budget '+LIM.budget+' ms)'}
    if(bad){t.state='throttled';if(++t.strikes>=LIM.strikes)return kill(k,a.name+' was ended: '+t.err)}else{t.strikes=0;t.state='running'}
    t.h=setTimeout(step,gap())};
   t.stop=()=>{clearTimeout(t.h);try{d.stop&&d.stop(ctx)}catch{}};t.h=setTimeout(step,500)}
  else return false;
  T.set(k,t);return true}
 function kill(k,why){const t=T.get(k);if(!t)return;T.delete(k);try{t.stop&&t.stop()}catch{}why&&toast(why)}
 const killWin=w=>{w.force=1;closeW(w)};
 const killApp=id=>{W.filter(w=>w.app===id).forEach(killWin);kill('bg:'+id)};
 const killAll=()=>{W.slice().forEach(killWin);[...T.keys()].forEach(k=>kill(k))};
 function boot(){owner=S.cur;const au=auto();Object.keys(au).forEach(id=>{if(au[id].bg)start(id,1)});
  Object.keys(au).filter(id=>au[id].win&&APPS[id]&&!APPS[id].hide&&!(APPS[id].admin&&!Apps.isAdmin())).slice(0,LIM.auto).forEach((id,i)=>setTimeout(()=>{if(S.cur!==owner||W.some(w=>w.app===id))return;const w=openApp(id);if(w){w.min=true;w.el.classList.add('min');w.el.classList.remove('foc');renderTB()}},1200+i*900))}
 setInterval(()=>{if(owner&&owner!==S.cur){[...T.keys()].forEach(k=>kill(k));owner=null}
  const n=Date.now();for(const[k,t]of[...T]){const a=APPS[t.app];if(!a||!a.bg){kill(k);continue}
   if(t.kind==='xctu'&&n-t.stub.beat>LIM.beat)kill(k,t.name+' stopped responding and was ended')}
  if(!owner&&!booting&&typeof L!=='undefined'&&L.classList.contains('hide')){booting=S.cur;Promise.resolve(typeof Xctu!=='undefined'&&Xctu.ready()).then(()=>setTimeout(()=>{if(S.cur===booting)boot();booting=0},600))}
  W.forEach(w=>{if(!w.t0)w.t0=n})},1000);
 return{LIM,T,start,kill,killWin,killApp,killAll,hit,hits,auto,setAuto,boot}
})();

/* ---------- Resource Manager window (a pseudo window: not an app, so it never appears in the taskbar) ---------- */
const RM=(()=>{
 Apps.style('resource-manager','.rm{position:fixed;z-index:9000;width:min(680px,96vw);height:min(440px,80vh);display:flex;flex-direction:column;border-radius:var(--rad,12px);background:rgba(14,10,40,.93);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.18);box-shadow:0 18px 60px rgba(0,0,0,.55);color:#eef;font:13px system-ui,sans-serif;overflow:hidden}.rm .rt{display:flex;align-items:center;gap:8px;padding:8px 10px;background:linear-gradient(135deg,var(--a),var(--b));cursor:move;user-select:none}.rm .rt b{flex:1}.rm .rt button{border:0;border-radius:6px;background:rgba(0,0,0,.28);color:#fff;width:26px;height:22px;cursor:pointer}.rm nav{display:flex;gap:4px;padding:6px 8px}.rm nav button{background:none;border:0;color:inherit;padding:5px 12px;border-radius:8px;cursor:pointer;opacity:.7}.rm nav button.on{background:rgba(255,255,255,.14);opacity:1}.rm main{flex:1;overflow:auto;padding:0 10px 6px}.rm table{width:100%;border-collapse:collapse}.rm th{text-align:left;font-weight:600;opacity:.55;font-size:11px;padding:4px 6px;position:sticky;top:0;background:rgba(14,10,40,.97)}.rm td{padding:5px 6px;border-top:1px solid rgba(255,255,255,.07);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}.rm td img{width:16px;height:16px;vertical-align:-3px;margin-right:6px}.rm .k{background:#b8002f;color:#fff;border:0;border-radius:6px;padding:2px 9px;cursor:pointer}.rm .ft{display:flex;gap:10px;align-items:center;padding:7px 10px;border-top:1px solid rgba(255,255,255,.1);font-size:12px;opacity:.9}.rm .ft span{flex:1}.rm .ft button{background:rgba(255,255,255,.12);border:0;color:inherit;border-radius:6px;padding:4px 10px;cursor:pointer}.rm label{display:flex;gap:8px;align-items:center}.rm p,.rm li{opacity:.8;line-height:1.5}.rm .bd{font-size:11px;padding:1px 7px;border-radius:99px;background:rgba(255,255,255,.14)}.rm .bd.t{background:#9a6a00}');
 let el=null,iv=0,tab='p',pos=null,t0=0;
 const up=ms=>{const s=Math.floor(ms/1e3);return s<60?s+'s':s<3600?Math.floor(s/60)+'m '+s%60+'s':Math.floor(s/3600)+'h '+Math.floor(s%3600/60)+'m'};
 const rows=()=>{const n=Date.now(),r=[];
  W.forEach(w=>{const a=APPS[w.app]||{name:w.app,icon:'file-generic'},x=a.xctu;r.push({key:'w'+w.id,icon:a.icon,name:a.name+(W.filter(q=>q.app===w.app).length>1?' #'+w.id:''),type:'Window',st:w.min?'Minimized':w.el.classList.contains('foc')?'Active':'Running',up:up(n-(w.t0||n)),load:w.el.getElementsByTagName('*').length+' nodes'+(x?' · '+(Proc.hits.get(w.app.replace(/^xctu-/,''))||0)+' calls':''),kill:()=>Proc.killWin(w)})});
  Proc.T.forEach(t=>r.push({key:t.key,icon:t.icon,name:t.name,type:'Background',st:t.state==='throttled'?'Throttled':'Running',tip:t.err,up:up(n-t.t0),load:t.kind==='xctu'?(Proc.hits.get(t.app.replace(/^xctu-/,''))||0)+' calls':t.ticks+' ticks · '+Math.round(t.cpu)+' ms',kill:()=>Proc.kill(t.key)}));
  r.push({key:'rm',icon:'compass-settings',name:'Resource Manager',type:'System',st:'Running',up:up(n-t0),load:el?el.getElementsByTagName('*').length+' nodes':'',kill:()=>{close();toast('Resource Manager ended — press Ctrl+Esc to start it again')}});return r};
 function paintProc(m){let tb=m.querySelector('tbody');if(!tb){m.innerHTML='<table><thead><tr><th>Process</th><th>Type</th><th>Status</th><th>Running</th><th>Load</th><th></th></tr></thead><tbody></tbody></table>';tb=m.querySelector('tbody');
   tb.onclick=e=>{const b=e.target.closest('.k');if(!b)return;const r=b._r||rows().find(x=>x.key===b.closest('tr').dataset.k);r&&r.kill();paint()}}
  const data=rows(),have=new Map([...tb.children].map(tr=>[tr.dataset.k,tr]));
  data.forEach(d=>{let tr=have.get(d.key);have.delete(d.key);if(!tr){tr=document.createElement('tr');tr.dataset.k=d.key;tr.innerHTML='<td><img><span></span></td><td></td><td></td><td></td><td></td><td><button class="k">End</button></td>';tb.append(tr)}
   const c=tr.children;c[0].firstChild.src=IC(d.icon);c[0].lastChild.textContent=d.name;c[1].textContent=d.type;c[2].textContent=d.st;c[2].title=d.tip||'';c[3].textContent=d.up;c[4].textContent=d.load});
  have.forEach(tr=>tr.remove())}
 function paintStart(m){m.innerHTML='';const au=Proc.auto();H('p','',m).textContent='Choose what starts when you sign in. Apps open minimized; background apps keep running without a window. Limits: '+Proc.LIM.auto+' windows, '+Proc.LIM.bg+' background tasks.';
  const t=H('table','',m,'<thead><tr><th>App</th><th>Open at sign-in</th><th>Run in background</th></tr></thead><tbody></tbody>'),b=t.querySelector('tbody');
  Object.keys(APPS).filter(k=>!APPS[k].hide).sort((x,y)=>APPS[x].name.localeCompare(APPS[y].name)).forEach(id=>{const a=APPS[id],c=au[id]||{},tr=H('tr','',b,'<td><img><span></span></td><td><label><input type=checkbox data-w></label></td><td><label><input type=checkbox data-b></label></td>');
   $('img',tr).src=IC(a.icon);$('span',tr).textContent=a.name;const w=$('[data-w]',tr),g=$('[data-b]',tr);w.checked=!!c.win;g.checked=!!c.bg;g.disabled=!a.bg;g.title=a.bg?'':'This app has no background mode';
   const save=()=>{const o=Proc.auto();o[id]={win:w.checked,bg:g.checked};if(!o[id].win&&!o[id].bg)delete o[id];Proc.setAuto(o)};
   w.onchange=()=>{if(w.checked&&Object.values(Proc.auto()).filter(x=>x.win).length>=Proc.LIM.auto){w.checked=false;return toast('At most '+Proc.LIM.auto+' apps may open at sign-in')}save()};
   g.onchange=()=>{save();if(g.checked){if(!Proc.start(id))g.checked=false,save()}else Proc.kill('bg:'+id)}})}
 function paintRules(m){const L=Proc.LIM;m.innerHTML='<p><b>How background apps are restrained</b></p><ul><li>Nothing starts on its own: you must tick it in Startup. At most '+L.auto+' windows open at sign-in, always minimized and staggered.</li><li>At most '+L.bg+' background tasks, and '+L.xbg+' of them may be XCTU apps.</li><li>XCTU apps need the “background” permission, which you grant in the wizard. They run in a hidden sandbox with no window, no pop-ups, no confirm dialogs and only one toast per '+L.toast/1000+' s.</li><li>Request flood guard: more than '+L.calls+' system calls per second ends the app. File writes are limited to '+L.writes+' per minute.</li><li>Watchdog: an XCTU background app must answer within '+L.beat/1000+' s or it is ended (frozen or stuck in a loop).</li><li>Built-in tasks run at most once per '+L.minEvery/1000+' s ('+L.hiddenEvery/1000+' s while this tab is hidden); a tick over '+L.budget+' ms or an error counts a strike; '+L.strikes+' strikes in a row ends the task.</li><li>Everything is stopped when you switch profile, and anything can be ended here at any time — including this window.</li></ul>'}
 function paint(){if(!el)return;const m=el.querySelector('main');if(tab==='p')paintProc(m);const f=el.querySelector('.ft span'),h=performance.memory?' · JS heap '+fmtSz(performance.memory.usedJSHeapSize):'';f.textContent=W.length+' window(s) · '+Proc.T.size+' background'+h}
 function show(){if(el)return;t0=Date.now();el=H('div','rm',document.body);el.innerHTML='<div class=rt><b>Resource Manager</b><button title="End Resource Manager">✕</button></div><nav></nav><main></main><div class=ft><span></span><button>End all apps</button></div>';
  const p=pos||{x:Math.max(8,(innerWidth-680)/2),y:60};el.style.left=p.x+'px';el.style.top=p.y+'px';$('.rt button',el).onclick=()=>Proc.T&&rows().find(x=>x.key==='rm').kill();
  ['pointerdown','click','contextmenu'].forEach(t=>el.addEventListener(t,e=>{e.stopPropagation();if(t==='contextmenu')e.preventDefault()}));
  const rt=$('.rt',el);rt.onpointerdown=e=>{if(e.target.closest('button'))return;const sx=e.clientX-el.offsetLeft,sy=e.clientY-el.offsetTop;rt.setPointerCapture(e.pointerId);rt.onpointermove=m=>{pos={x:cl(m.clientX-sx,-300,innerWidth-80),y:cl(m.clientY-sy,0,innerHeight-40)};el.style.left=pos.x+'px';el.style.top=pos.y+'px'};rt.onpointerup=()=>rt.onpointermove=null};
  $('.ft button',el).onclick=async()=>{if(await sysConfirm({title:'End all apps?',msg:'Every window and background task will be force-closed. Unsaved work is lost.',ok:'End all',danger:1}))Proc.killAll()};
  const nav=$('nav',el);[['p','Processes'],['s','Startup'],['r','Rules']].forEach(([k,l])=>{const b=H('button',k===tab?'on':'',nav,l);b.onclick=()=>{tab=k;nav.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));const m=$('main',el);m.innerHTML='';tab==='p'?paintProc(m):tab==='s'?paintStart(m):paintRules(m);paint()}});
  paintProc($('main',el));paint();iv=setInterval(paint,1000)}
 function close(){clearInterval(iv);el&&el.remove();el=null}
 const toggle=()=>el?close():show();
 addEventListener('keydown',e=>{if(e.key==='Escape'&&e.ctrlKey&&typeof L!=='undefined'&&L.classList.contains('hide')){e.preventDefault();e.stopPropagation();toggle()}},true);
 return{show,close,toggle}
})();
