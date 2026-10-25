'use strict';
/* =====================================================================
   apps/xctu.js — .xctu executables: build, verify, permission-wizard, run
   ---------------------------------------------------------------------
   A .xctu file is a zip:   manifest.json  +  files/<your project files>
   PROJECT (a normal folder)         xctu.json  main.js  [app.html] [style.css] icon.svg  [assets…]
   TERMINAL                          xctu new|check|build|info|run|install|list|remove
   RUNTIME   every app runs in a sandboxed iframe (no OS access, no network unless granted).
             It talks to the OS only through the `xctu` SDK, and every call is checked against
             the permissions the user ticked in the wizard (Apps.can). Admin-only permissions
             can only be granted by an administrator, who must tick them explicitly.
   ===================================================================== */
const Xctu=(()=>{
 /* ---------- permissions (added to the OS-wide table; admin:true = admins only) ---------- */
 Object.assign(Apps.PERMS,{
  net:{label:'Connect to the internet'},
  background:{label:'Run in the background and start when you sign in'},
  apps:{label:'Open other apps'},
  users:{label:'See every profile on this computer',admin:true},
  system:{label:'Lock the screen and change the system theme',admin:true}});
 const RISK={fs:'Can read, create and overwrite any of your files',admin:'Administrator tools',desktop:'Can pin itself to the taskbar',
  'net.frames':'Can embed web pages',clipboard:'Can read and write what you copied',media:'Camera and microphone',location:'Your location',net:'Can send and receive data online',background:'Keeps running with no window (limited, and always visible in Resource Manager)'};
 const CATS=['system','files','utilities','internet'],MAXB=8*1048576,ID=/^[a-z][a-z0-9-]{1,31}$/,VER=/^\d+\.\d+\.\d+$/;
 const AID=i=>'xctu-'+i,enc=new TextEncoder();
 const permOk=p=>!!Apps.PERMS[p],isAdm=()=>Apps.isAdmin();
 const ICON='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#3700ff"/><path d="M18 20l10 12-10 12M34 44h14" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>');
 const sha=async u=>{if(crypto.subtle){const b=await crypto.subtle.digest('SHA-256',u);return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}let h=5381;for(const c of u)h=(h*33^c)>>>0;return'f'+h};
 const u8=async b=>new Uint8Array(await b.arrayBuffer()),dataUri=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.onerror=()=>r(null);f.readAsDataURL(b)});
 const safePath=p=>typeof p==='string'&&p&&!p.startsWith('/')&&!p.includes('\\')&&!p.split('/').some(s=>!s||s==='.'||s==='..');
 const AsyncFn=Object.getPrototypeOf(async function(){}).constructor;
 const normPerms=l=>(l||[]).map(p=>typeof p==='string'?{id:p}:{id:p.id,why:p.why||'',required:!!p.required});

 /* ---------- compile ---------- */
 async function collect(dirId){const out=[];const rec=(id,pre)=>{for(const m of FS.kids(id)){if(m.n[0]==='.')continue;if(m.t==='d')rec(m.id,pre+m.n+'/');else if(pre+m.n!=='xctu.json'&&EXT(m.n)!=='xctu')out.push({path:pre+m.n,m})}};rec(dirId,'');
  for(const f of out)f.blob=await FS.blob(f.m.id);return out}
 async function lint(dirId){const E=[],Wn=[],files=await collect(dirId),by=new Map(files.map(f=>[f.path,f]));let cfg=null;
  const cj=FS.K.get(dirId).get('xctu.json'),cm=cj&&FS.get(cj);
  if(!cm)E.push('xctu.json is missing — run `xctu new` or `xctu build` to create it');
  else try{cfg=JSON.parse(await(await FS.blob(cm.id)).text())}catch(e){E.push('xctu.json is not valid JSON: '+e.message)}
  if(!cfg)return{E,W:Wn,cfg,files};
  if(!ID.test(cfg.id||''))E.push('id must be 2–32 chars: lowercase letters, digits, dashes, starting with a letter');
  if(!(cfg.name||'').trim())E.push('name is required');
  if(!VER.test(cfg.version||''))E.push('version must look like 1.0.0');
  if(!(cfg.description||'').trim())Wn.push('description is empty — users see it in the wizard');
  if(!(cfg.author||'').trim())Wn.push('author is empty');
  if(!CATS.includes(cfg.cat))E.push('cat must be one of: '+CATS.join(', '));
  if(!(cfg.w>=240&&cfg.h>=160))E.push('w/h (window size) must be at least 240×160');
  const need=(k,label,req)=>{if(!cfg[k]){req&&E.push(label+' is not set');return null}if(!by.has(cfg[k])){E.push(label+' “'+cfg[k]+'” not found in the project');return null}return by.get(cfg[k])};
  const main=need('main','main script',1),bgf=need('bg','background script'),html=need('html','html file'),css=need('css','css file'),icon=need('icon','icon',1);
  let src='';
  if(main){src=await main.blob.text();if(!src.trim())E.push('main script is empty');else try{new AsyncFn('xctu',src)}catch(e){E.push(cfg.main+' has a syntax error: '+e.message)}}
  if(icon){if(!/^(svg|png|jpe?g|webp)$/.test(EXT(icon.path)))E.push('icon must be svg, png, jpg or webp');else if(icon.blob.size>262144)E.push('icon is bigger than 256 KB');
   else if(EXT(icon.path)==='svg'){const d=new DOMParser().parseFromString(await icon.blob.text(),'image/svg+xml');if(d.getElementsByTagName('parsererror').length||d.documentElement.nodeName!=='svg')E.push('icon is not a valid SVG')}}
  if(bgf){const bs=await bgf.blob.text();if(!bs.trim())E.push('background script is empty');else try{new AsyncFn('xctu',bs)}catch(e){E.push(cfg.bg+' has a syntax error: '+e.message)}}
  const ps=normPerms(cfg.perms),seen=new Set();
  ps.forEach(p=>{if(!permOk(p.id))E.push('unknown permission “'+p.id+'”');else if(seen.has(p.id))E.push('permission “'+p.id+'” listed twice');else{seen.add(p.id);if(!p.why)Wn.push('permission “'+p.id+'” has no reason — add one so users know why you need it');
   if(Apps.PERMS[p.id].admin&&!isAdm())E.push('“'+p.id+'” is admin-only; only an administrator can compile an app that requests it')}});
  if(cfg.adminOnly&&!isAdm())E.push('adminOnly apps can only be compiled by an administrator');
  /* static scan: SDK use vs declared permissions, and referenced assets */
  if(cfg.kill&&!/^[A-Z]{2,16}$/.test(String(cfg.kill).toUpperCase()))E.push('kill phrase must be 2-16 letters, A-Z');
  if(cfg.bg&&!seen.has('background'))E.push('a background script needs the “background” permission declared');if(!cfg.bg&&seen.has('background'))Wn.push('permission “background” is declared but no bg script is set');
  const all=[src,html?await html.blob.text():'',css?await css.blob.text():''].join('\n');
  const USE={fs:/xctu\.fs\b/,clipboard:/xctu\.clipboard\b/,apps:/xctu\.apps\b/,desktop:/xctu\.desktop\b/,users:/xctu\.users\b/,system:/xctu\.system\b/,net:/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/};
  for(const k in USE){const u=USE[k].test(src);if(u&&!seen.has(k))Wn.push('code uses “'+k+'” features but the permission is not declared — those calls will be denied');if(!u&&seen.has(k)&&k in USE)Wn.push('permission “'+k+'” is declared but the code never seems to use it (least privilege!)')}
  for(const m of all.matchAll(/xctu\.asset\.(?:url|text|bytes)\(\s*['"]([^'"]+)['"]|data-asset=["']([^"']+)["']/g)){const n=m[1]||m[2];if(!by.has(n))E.push('code references asset “'+n+'” which is not in the project')}
  const total=files.reduce((a,f)=>a+f.blob.size,0);if(total>MAXB)E.push('project is '+fmtSz(total)+' — the limit is '+fmtSz(MAXB));
  files.forEach(f=>{if(!safePath(f.path))E.push('bad file path: '+f.path)});
  return{E,W:Wn,cfg,files,total}}
 async function compile(cfg,files){const hashes={};for(const f of files)hashes[f.path]=await sha(await u8(f.blob));
  const man={format:1,id:cfg.id,name:cfg.name.trim(),version:cfg.version,author:(cfg.author||'').trim(),description:(cfg.description||'').trim(),cat:cfg.cat,w:cfg.w|0,h:cfg.h|0,
   main:cfg.main,html:cfg.html||'',css:cfg.css||'',bg:cfg.bg||'',kill:(cfg.kill||'').toUpperCase(),icon:cfg.icon,adminOnly:!!cfg.adminOnly,perms:normPerms(cfg.perms),hashes,built:Date.now(),builder:{name:prof().name,admin:isAdm()}};
  man.seal=await sha(enc.encode(JSON.stringify(man)));
  const ent=[{path:'manifest.json',blob:new Blob([JSON.stringify(man,null,1)])},...files.map(f=>({path:'files/'+f.path,blob:f.blob}))];
  return ZIP.build(ent)}

 /* ---------- parse + verify ---------- */
 async function parse(blob){const es=await ZIP.read(blob),files=new Map();let man=null;
  for(const e of es){if(e.dir)continue;if(e.name==='manifest.json')man=JSON.parse(await(await e.get()).text());else if(e.name.startsWith('files/')&&safePath(e.name.slice(6)))files.set(e.name.slice(6),await e.get())}
  if(!man||man.format!==1)throw Error('Not a valid .xctu package (missing or unsupported manifest)');
  const issues=[];if(!ID.test(man.id||'')||!VER.test(man.version||'')||!CATS.includes(man.cat))issues.push('The manifest has invalid fields');
  const{seal,...rest}=man;if(await sha(enc.encode(JSON.stringify(rest)))!==seal)issues.push('The manifest seal does not match — the manifest was edited after compile');
  for(const p in man.hashes){const b=files.get(p);if(!b)issues.push('Missing file: '+p);else if(await sha(await u8(b))!==man.hashes[p])issues.push('File changed after compile: '+p)}
  for(const p of files.keys())if(!(p in man.hashes))issues.push('Unexpected extra file: '+p);
  for(const k of['main','icon'])if(!files.has(man[k]))issues.push('Entry “'+man[k]+'” is missing');
  if(man.bg&&!files.has(man.bg))issues.push('Background script “'+man.bg+'” is missing');
  man.perms=normPerms(man.perms).filter(p=>permOk(p.id));
  const pk={m:man,files,issues,size:blob.size};{const ix=EXT(man.icon||''),mt={svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'}[ix];pk.iconUri=files.has(man.icon)&&mt?await dataUri(new Blob([await u8(files.get(man.icon))],{type:mt})):null}return pk}

 /* ---------- installed packages (IndexedDB, per profile) ---------- */
 const odb=new Promise(r=>{const q=indexedDB.open('rz-xctu',1);q.onupgradeneeded=()=>q.result.createObjectStore('pk',{keyPath:'key'});q.onsuccess=()=>r(q.result);q.onerror=()=>r(null)});
 const tx=async(mode,f)=>{const d=await odb;if(!d)return;return new Promise(r=>{const t=d.transaction('pk',mode),q=f(t.objectStore('pk'));q.onsuccess=()=>r(q.result);q.onerror=()=>r()})};
 const rec=()=>tx('readonly',s=>s.getAll()).then(l=>(l||[]).filter(x=>x.prof===S.cur));
 const MOUNTED=new Set();
 let mp=Promise.resolve();const mountAll=()=>mp=mountAll_();
 async function mountAll_(){MOUNTED.forEach(i=>{if(!WIN_TEMP.has(i)){delete APPS[i]}});MOUNTED.clear();
  for(const r of await rec()){try{const pk=await parse(new Blob([r.buf]));if(pk.issues.length)continue;mount(pk,r.grants,false)}catch(e){console.warn('xctu: could not load',r.id,e)}}
  typeof renderTB==='function'&&renderTB()}
 const WIN_TEMP=new Set();
 const KILLSEQ=new Map();let kbuf='',kbT=0;
 addEventListener('keydown',e=>{if(!KILLSEQ.size)return;const k=e.key.toUpperCase();if(k.length!==1||!/[A-Z]/.test(k))return;const n=Date.now();if(n-kbT>2500)kbuf='';kbT=n;kbuf=(kbuf+k).slice(-16);for(const[aid,ph]of KILLSEQ)if(ph&&kbuf.endsWith(ph)){kbuf='';killByPhrase(aid);break}},true);
 async function killByPhrase(aid){const full=AID(aid),nm=(APPS[full]||{}).name||aid;W.filter(w=>w.app===full).forEach(w=>{w.force=1;closeW(w)});typeof Proc!=='undefined'&&Proc.kill('bg:'+full);await remove(aid);
  const w=openApp('terminal'),say=()=>{const el=w&&w.el&&w.el.querySelector('.tin');if(!el)return setTimeout(say,80);el.value='echo '+nm+' — kill phrase matched: ended and uninstalled.';el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))};setTimeout(say,150)}
 async function install(pk,grants,buf){await tx('readwrite',s=>s.put({key:S.cur+':'+pk.m.id,prof:S.cur,id:pk.m.id,buf,grants,at:Date.now()}));mount(pk,grants,false)}
 async function remove(id){const r=(await rec()).find(x=>x.id===id);if(!r)return false;await tx('readwrite',s=>s.delete(S.cur+':'+id));const a=AID(id);await wipe(id);
  W.filter(x=>x.app===a).forEach(closeW);S.pins=(S.pins||[]).filter(x=>x!==a);S.desk=(S.desk||[]).filter(x=>x.app!==a);try{SC.dropApp(a)}catch{}delete APPS[a];MOUNTED.delete(a);KILLSEQ.delete(id);save();renderTB();typeof desk==='function'&&desk();return true}

 /* ---------- app cache tracking: what each app made (never what it merely opened) ---------- */
 const MK=id=>'xctu.made.'+S.cur+'.'+id,KV=id=>'xctu.kv.'+S.cur+'.'+id;
 const lsj=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
 const made=id=>lsj(MK(id))||[];
 const addMade=(id,fid)=>{const l=made(id);if(!l.includes(fid)){l.push(fid);try{localStorage.setItem(MK(id),JSON.stringify(l))}catch{}}};
 function usage(id){const raw=localStorage.getItem(KV(id))||'',kv=lsj(KV(id))||{},fl=made(id).map(i=>FS.get(i)).filter(Boolean);
  return{id,kvKeys:Object.keys(kv).length,kvBytes:raw.length,files:fl.filter(m=>m.t==='f').length,dirs:fl.filter(m=>m.t==='d').length,bytes:fl.reduce((a,m)=>a+(m.t==='f'?m.s||0:0),0),list:fl}}
 /* wipe ONLY the app's own storage and the files/folders it created; folders that now hold anything else are kept */
 async function wipe(id){const u=usage(id);let del=0,skip=0;localStorage.removeItem(KV(id));
  const fl=u.list.filter(m=>m.t==='f').map(m=>m.id);for(const i of fl){try{await FS.del([i]);del++}catch{skip++}}
  const ds=u.list.filter(m=>m.t==='d').sort((a,b)=>FS.path(b.id).length-FS.path(a.id).length);for(const d of ds){try{if(FS.get(d.id)&&!FS.kids(d.id).length){await FS.del([d.id]);del++}else skip++}catch{skip++}}
  localStorage.removeItem(MK(id));return{del,skip,kv:u.kvBytes}}
 async function orphans(){const have=new Set((await rec()).map(r=>r.id)),pk='xctu.kv.'+S.cur+'.',pm='xctu.made.'+S.cur+'.',out=new Set();
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);for(const p of[pk,pm])if(k.startsWith(p)){const id=k.slice(p.length);if(!have.has(id)&&!APPS[AID(id)])out.add(id)}}return[...out]}
 async function report(){const l=await rec(),o=await orphans();return[...l.map(r=>({...usage(r.id),name:(APPS[AID(r.id)]||{}).name||r.id,orphan:false})),...o.map(id=>({...usage(id),name:id,orphan:true}))]}
 const tree=(id,pre='')=>{const k=FS.kids(id).sort((a,b)=>(a.t===b.t?a.n.localeCompare(b.n):a.t==='d'?-1:1));return k.flatMap((m,i)=>{const last=i===k.length-1,line=pre+(last?'└─ ':'├─ ')+m.n+(m.t==='d'?'/':'  '+fmtSz(m.s||0));return[line,...(m.t==='d'?tree(m.id,pre+(last?'   ':'│  ')):[])]})};
 const sysStat=()=>{let n=0,sz=0;const st=[FS.sysId()];while(st.length){for(const m of FS.kids(st.pop())){if(m.t==='d')st.push(m.id);else{n++;sz+=m.s||0}}}return{n,sz}};

 /* ---------- runtime ---------- */
 function mount(pk,grants,temp){const m=pk.m,id=AID(m.id);grants=grants.filter(p=>permOk(p));
  Apps.register(id,{name:m.name,icon:pk.iconUri||'file-generic',w:m.w,h:m.h,cat:m.cat,perms:grants,admin:!!m.adminOnly,hide:!!temp,xctu:m.id,pk,bg:m.bg&&grants.includes('background')?1:0,render:(b,w)=>run(b,w,pk,id)});
  MOUNTED.add(id);temp?WIN_TEMP.add(id):WIN_TEMP.delete(id);if(m.kill&&/^[A-Z]{2,16}$/.test(m.kill))KILLSEQ.set(m.id,m.kill);else KILLSEQ.delete(m.id);return id}
 function sdk(I){const P=new Map,L={},C={};let n=0;
  const call=(m,...a)=>new Promise((res,rej)=>{const i=++n;P.set(i,[res,rej]);parent.postMessage({xctu:1,i,m,a},'*')});
  addEventListener('message',e=>{const d=e.data;if(!d||!d.xctu)return;if(d.r){const p=P.get(d.i);if(!p)return;P.delete(d.i);d.err?p[1](Error(d.err)):p[0](d.v)}else if(d.ev)(L[d.ev]||[]).forEach(f=>f(d.v))});
  const as=nm=>call('asset',nm),url=async nm=>C[nm]||(C[nm]=await as(nm).then(r=>URL.createObjectURL(new Blob([r.buf],{type:r.type}))));
  const X={app:I.app,perms:I.perms,user:I.user,can:p=>I.perms.includes(p),on:(ev,f)=>{(L[ev]=L[ev]||[]).push(f)},
   info:()=>call('sys.info'),cache:{size:()=>call('cache.size'),clear:()=>call('cache.clear')},ui:{toast:m=>call('ui.toast',m),confirm:(msg,o)=>call('ui.confirm',msg,o),title:t=>call('ui.title',t),close:()=>call('ui.close'),resize:(w,h)=>call('ui.resize',w,h)},
   store:{get:k=>call('store.get',k),set:(k,v)=>call('store.set',k,v),remove:k=>call('store.remove',k),keys:()=>call('store.keys'),clear:()=>call('store.clear')},
   asset:{url,text:async nm=>new TextDecoder().decode((await as(nm)).buf),bytes:async nm=>new Uint8Array((await as(nm)).buf)},
   fs:{list:p=>call('fs.list',p),stat:p=>call('fs.stat',p),readText:p=>call('fs.readText',p),readBytes:async p=>new Uint8Array(await call('fs.readBytes',p)),writeText:(p,t)=>call('fs.writeText',p,t),writeBytes:(p,b)=>call('fs.writeBytes',p,b instanceof Uint8Array?b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength):b),mkdir:p=>call('fs.mkdir',p),home:()=>call('fs.home')},
   clipboard:{read:()=>call('clip.read'),write:t=>call('clip.write',t)},apps:{open:i=>call('apps.open',i),list:()=>call('apps.list')},desktop:{pin:()=>call('desktop.pin')},
   users:{list:()=>call('users.list')},system:{lock:()=>call('system.lock'),theme:i=>call('system.theme',i),corners:c=>call('system.corners',c),glass:v=>call('system.glass',v),pos:p=>call('system.pos',p),current:()=>call('system.current')},background:{enable:()=>call('bgctl.enable'),disable:()=>call('bgctl.disable')}};
  window.xctu=X;if(I.bg)setInterval(()=>call('bg.beat').catch(()=>{}),2000);const rep=m=>call('log',String(m)).catch(()=>{});addEventListener('error',e=>rep(e.message));addEventListener('unhandledrejection',e=>rep(e.reason&&e.reason.message||e.reason));
  document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('[data-asset]').forEach(el=>url(el.dataset.asset).then(u=>{el.tagName==='LINK'?el.href=u:el.src=u}).catch(e=>rep(e.message))))}
 const BASE='html,body{margin:0;height:100%}body{font:14px system-ui,Segoe UI,sans-serif;color:#eef;background:linear-gradient(135deg,#0b0824,#120a3a)}button,input,select,textarea{font:inherit;color:inherit}button{background:linear-gradient(135deg,var(--a),var(--b));border:0;border-radius:8px;padding:6px 12px;cursor:pointer}input,textarea,select{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:6px 8px}a{color:#9cf}';
 async function run(body,win,pk,id,bg){const m=pk.m,a=APPS[id],grants=a.perms.slice(),can=p=>Apps.can(p,id);
  const rd=async n=>n&&pk.files.has(n)?await pk.files.get(n).text():'';
  const[js,html,css]=await Promise.all([rd(bg?m.bg:m.main),bg?'':rd(m.html),bg?'':rd(m.css)]);
  const net=can('net'),csp=`default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' data:; img-src data: blob:${net?' https: http:':''}; media-src data: blob:${net?' https: http:':''}; font-src data:${net?' https:':''}; connect-src ${net?'https: http: ws: wss:':"'none'"}; frame-src ${can('net.frames')&&!bg?'https:':"'none'"}`;
  const rs=document.documentElement.style,vars=['--a','--b','--c'].map(k=>k+':'+rs.getPropertyValue(k)).join(';');
  const init={bg:!!bg,app:{id:m.id,name:m.name,version:m.version},perms:grants.filter(can),user:{name:prof().name,admin:isAdm()}};
  const doc=`<!doctype html><html><head><meta charset=utf-8><meta http-equiv="Content-Security-Policy" content="${csp}"><style>:root{${vars}}${BASE}</style><style>${css.replace(/<\/style/gi,'<\\/style')}</style></head><body>${html}<script>(${sdk})(${JSON.stringify(init).replace(/</g,'\\u003c')})</script><script>(async()=>{${js.replace(/<\/script/gi,'<\\/script')}\n})().catch(e=>xctu.ui.toast('Error: '+e.message))</script></body></html>`;
  const f=H('iframe','',body);f.setAttribute('sandbox','allow-scripts allow-forms allow-modals'+(can('net.popups')?' allow-popups':''));f.allow=Apps.allow(id,[]);f.srcdoc=doc;Object.assign(f.style,{width:'100%',height:'100%',border:0,display:'block',background:'transparent'});
  const kvk='xctu.kv.'+S.cur+'.'+m.id,kv=()=>{try{return JSON.parse(localStorage.getItem(kvk)||'{}')}catch{return{}}};
  const node=p=>{p=String(p||'~').replace(/^~(?=\/|$)/,()=>FS.path(FS.home()));const i=FS.resolve(p,FS.home());return i?FS.get(i):null};
  const split=p=>{p=String(p).replace(/^~(?=\/|$)/,()=>FS.path(FS.home())).replace(/\/+$/,'');const i=p.lastIndexOf('/'),d=node(i<=0?'/':p.slice(0,i));if(!d||d.t!=='d')throw Error('No such folder');return{d,n:p.slice(i+1)}};
  const info=x=>({name:x.n,type:x.t==='d'?'dir':'file',size:x.s||0,modified:x.m,path:FS.path(x.id)});
  const fsw=async(p,blob)=>{if(bg){const t=Date.now();win.w=(win.w||[]).filter(x=>t-x<6e4);if(win.w.length>=Proc.LIM.writes)throw Error('Background write limit ('+Proc.LIM.writes+'/min)');win.w.push(t)};if(blob.size>20*1048576)throw Error('File too large (20 MB max)');const{d,n}=split(p);if(d.ro)throw Error('Read-only location');const ex=FS.K.get(d.id).get(n.toLowerCase()),old=ex&&FS.get(ex);if(old&&(old.t==='d'||old.ro))throw Error('Cannot overwrite '+n);const w=await FS.write(d.id,n,blob,old?old.id:null,0,'xctu');if(!old)addMade(m.id,w.id)};
  const H_={
   'bg.beat':()=>{win.beat=Date.now()},'ui.toast':m=>{if(bg){const n=Date.now();if(n-(win.lt||0)<Proc.LIM.toast)return;win.lt=n}toast(String(m).slice(0,200))},'ui.confirm':(msg,o)=>bg?Promise.reject(Error('Not available in the background')):sysConfirm({title:(o&&o.title)||m.name,msg:String(msg).slice(0,400),ok:(o&&o.ok)||'OK'}),
   'ui.title':t=>{if(bg)return;$('.tbar span',win.el).textContent=String(t).slice(0,60)},'ui.close':()=>{bg||closeW(win)},'ui.resize':(w,h)=>{if(bg)return;win.el.style.width=Math.max(240,Math.min(+w||0,innerWidth))+'px';win.el.style.height=Math.max(160,Math.min(+h||0,innerHeight))+'px'},
   'store.get':k=>kv()[k]??null,'store.set':(k,v)=>{const o=kv();o[k]=v;const s=JSON.stringify(o);if(s.length>1048576)throw Error('Storage full (1 MB)');localStorage.setItem(kvk,s)},'store.remove':k=>{const o=kv();delete o[k];localStorage.setItem(kvk,JSON.stringify(o))},'store.keys':()=>Object.keys(kv()),'store.clear':()=>localStorage.removeItem(kvk),'cache.size':()=>{const u=usage(m.id);return{storage:u.kvBytes,files:u.files,fileBytes:u.bytes}},'cache.clear':async()=>{const r=await wipe(m.id);return{removed:r.del}},'sys.info':()=>({os:'Reitzel OS',time:Date.now(),online:navigator.onLine,theme:S.theme,admin:isAdm(),apps:Object.keys(APPS).length}),
   asset:async n=>{const b=pk.files.get(String(n));if(!b)throw Error('No such asset: '+n);return{type:MIME[EXT(n)]||b.type||'application/octet-stream',buf:await b.arrayBuffer()}},
   log:e=>{console.warn('['+m.name+']',e);toast(m.name+': '+String(e).slice(0,120))},
   'fs.home':()=>FS.path(FS.home()),'fs.list':p=>{const d=node(p);if(!d||d.t!=='d')throw Error('No such folder');return FS.kids(d.id).map(info)},'fs.stat':p=>{const x=node(p);if(!x)throw Error('Not found');return info(x)},
   'fs.readText':async p=>{const x=node(p);if(!x||x.t!=='f')throw Error('No such file');return(await FS.blob(x.id)).text()},'fs.readBytes':async p=>{const x=node(p);if(!x||x.t!=='f')throw Error('No such file');return(await FS.blob(x.id)).arrayBuffer()},
   'fs.writeText':(p,t)=>fsw(p,new Blob([String(t)])),'fs.writeBytes':(p,b)=>fsw(p,new Blob([b])),'fs.mkdir':async p=>{const{d,n}=split(p),ex=FS.K.get(d.id).get(n.toLowerCase()),o=ex&&FS.get(ex);if(o)return o.t==='d'?undefined:Promise.reject(Error('A file with that name exists'));if(d.ro)throw Error('Read-only location');addMade(m.id,(await FS.mkdir(d.id,n)).id)},
   'clip.read':()=>navigator.clipboard.readText(),'clip.write':t=>navigator.clipboard.writeText(String(t)),
   'apps.open':i=>{if(!APPS[i])throw Error('No such app');openApp(i)},'apps.list':()=>Object.keys(APPS).filter(k=>!APPS[k].hide).map(k=>({id:k,name:APPS[k].name})),
   'desktop.pin':()=>pin(id),'users.list':()=>S.profiles.map(p=>({name:p.name,admin:!!p.admin})),'system.lock':()=>{setTimeout(()=>lockNow(),100)},'system.theme':i=>{i=+i;if(!THEMES[i])throw Error('No such theme');S.theme=i;applyVars();save()},
   'system.corners':c=>{if(!['sharp','rounded','round'].includes(c))throw Error('bad corners');S.corners=c;applyVars();save()},
   'system.glass':v=>{v=+v;if(![0,.25,.5,.75,1].includes(v))throw Error('bad glass');S.glass=v;applyVars();save()},
   'system.pos':p=>{if(!['bottom','top'].includes(p))throw Error('bad pos');S.pos=p;applyTheme();save()},
   'system.current':()=>({theme:S.theme,corners:S.corners,glass:S.glass,pos:S.pos}),
   'bgctl.enable':()=>{if(!(typeof Proc!=='undefined'&&Proc.start(id)))throw Error('could not start background');return true},
   'bgctl.disable':()=>{typeof Proc!=='undefined'&&Proc.kill('bg:'+id);return true}};
  const PERM={'fs.':'fs','clip.':'clipboard','apps.':'apps','desktop.':'desktop','users.':'users','system.':'system','bgctl.':'background'};
  const on=async e=>{if(!f.isConnected){removeEventListener('message',on);return}if(e.source!==f.contentWindow||!e.data||!e.data.xctu||!e.data.m)return;Proc.hit(m.id);if(bg){const q=Math.floor(Date.now()/1e3);if(win.sec!==q){win.sec=q;win.n=0}if(e.data.m!=='bg.beat'&&++win.n>Proc.LIM.calls){Proc.kill('bg:'+id,m.name+' was ended: too many requests');return}}const{i,m:meth,a}=e.data,rep=o=>f.contentWindow&&f.contentWindow.postMessage({xctu:1,r:1,i,...o},'*');
   try{const fn=H_[meth];if(!fn)throw Error('Unknown call '+meth);const pr=Object.keys(PERM).find(k=>meth.startsWith(k));if(pr&&!can(PERM[pr]))throw Error('Permission denied: this app was not granted “'+Apps.PERMS[PERM[pr]].label+'”');rep({v:await fn(...(Array.isArray(a)?a:[]))})}catch(err){rep({err:String(err&&err.message||err)})}};
  addEventListener('message',on);const oc=win.onclose;win.onclose=()=>{removeEventListener('message',on);oc&&oc()}}

 /* ---------- GUI wizard: package overview → permission rundown → run / install ---------- */
 Apps.style('xctu','.xw{width:min(540px,94vw);max-height:88vh;overflow:auto}.xw h4{margin:0 0 4px}.xw .xs{opacity:.6;font-size:12px;margin-bottom:8px}.xh{display:flex;gap:12px;align-items:center;margin:8px 0}.xh img{width:56px;height:56px;border-radius:12px}.xp{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.07);margin:6px 0}.xp input{margin-top:3px}.xp small{display:block;opacity:.65}.xb{font-size:11px;padding:1px 7px;border-radius:99px;margin-left:6px;background:rgba(255,255,255,.14)}.xb.a{background:#b8002f}.xok{color:#6f6}.xbad{color:#ff7a7a}.xwn{color:#ffd166}.xdots{display:flex;gap:6px;margin-bottom:6px}.xdots i{height:4px;flex:1;border-radius:4px;background:rgba(255,255,255,.18)}.xdots i.on{background:var(--b)}.xp.dis{opacity:.55}');
 function wizard(pk,buf,from){const m=pk.m,adm=isAdm(),ov=H('div','md sys',document.body),bx=H('div','mdb xw',ov);let step=0,ack=!pk.issues.length;
  const cur=(Apps.PERMS&&APPS[AID(m.id)])?APPS[AID(m.id)].perms:null,sel=new Set(),cannot=p=>Apps.PERMS[p].admin&&!adm;
  m.perms.forEach(p=>{if(cannot(p.id))return;if(Apps.PERMS[p.id].admin)cur&&cur.includes(p.id)&&sel.add(p.id);else sel.add(p.id)});
  ['pointerdown','click','contextmenu'].forEach(t=>ov.addEventListener(t,e=>{e.stopPropagation();if(t==='contextmenu')e.preventDefault()}));ov.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape')close()};ov.tabIndex=-1;
  const close=()=>ov.remove(),txt=(p,t,c)=>{const e=H('div',c||'',p);e.textContent=t;return e};
  function draw(){bx.innerHTML='';const d=H('div','xdots',bx);[0,1,2].forEach(i=>H('i',i<=step?'on':'',d));
   if(step===0){H('h4','',bx).textContent='Run “'+m.name+'”?';txt(bx,'XCTU wizard · step 1 of 3 · package','xs');
    const h=H('div','xh',bx);H('img','',h).src=pk.iconUri||ICON;const t=H('div','',h);t.innerHTML='<b></b><br><small></small>';$('b',t).textContent=m.name+'  v'+m.version;$('small',t).textContent=(m.author||'Unknown author')+' · '+fmtSz(pk.size)+' · '+pk.files.size+' files · id '+m.id;
    if(m.description)txt(bx,m.description);
    txt(bx,'Compiled '+fmtDt(m.built)+' by '+((m.builder&&m.builder.name)||'?')+(m.builder&&m.builder.admin?' (administrator)':''),'xs').style.marginTop='8px';
    if(!pk.issues.length)txt(bx,'✔ Integrity seal verified — every file matches what was compiled. (A seal detects damage and tampering, it is not proof of who wrote the app.)','xok');
    else{txt(bx,'✖ Integrity problems found:','xbad');pk.issues.slice(0,8).forEach(x=>txt(bx,'• '+x,'xbad'));const l=H('label','xp',bx,'<input type=checkbox><span>I understand the risks and want to continue with this modified package anyway</span>');$('input',l).onchange=e=>{ack=e.target.checked;nx.disabled=!ack}}
    if(m.adminOnly)txt(bx,'ⓘ Only administrators can open this app.','xwn');
    if(!pk.files.has(m.main))txt(bx,'This package is missing its main script and cannot run.','xbad')}
   else if(step===1){H('h4','',bx).textContent='Permission rundown';txt(bx,'step 2 of 3 · choose what “'+m.name+'” may do. The app runs in a sandbox and can use nothing you do not allow.','xs');
    if(!m.perms.length)txt(bx,'This app asks for no special permissions. It can only draw in its own window and keep its own small storage.');
    m.perms.forEach(p=>{const D=Apps.PERMS[p.id],ad=!!D.admin,no=cannot(p.id),l=H('label','xp'+(no?' dis':''),bx,'<input type=checkbox><div><b></b><span class="xb"></span><small></small><small></small></div>'),c=$('input',l);
     $('b',l).textContent=D.label;const bd=$('.xb',l);bd.textContent=ad?'Administrator only':p.required?'Required':'Optional';if(ad)bd.classList.add('a');
     const sm=l.querySelectorAll('small');sm[0].textContent=p.why?'Why: '+p.why:'(no reason given by the author)';sm[1].textContent=no?'🔒 You are not an administrator, so you cannot grant this. The app will run without it.':ad?'⚠ Administrator permission — tick the box to grant it explicitly.':(RISK[p.id]||'');
     c.disabled=no;c.checked=sel.has(p.id);c.onchange=()=>{c.checked?sel.add(p.id):sel.delete(p.id)}});
    txt(bx,adm?'You are an administrator: admin-only permissions start unticked and are only granted if you tick them.':'You are a standard user: admin-only permissions are locked.','xs')}
   else{H('h4','',bx).textContent='Ready';txt(bx,'step 3 of 3 · review','xs');const g=[...sel],dn=m.perms.filter(p=>!sel.has(p.id));
    txt(bx,g.length?'Will be allowed:':'No special permissions will be granted.','xok');g.forEach(p=>txt(bx,'  ✔ '+Apps.PERMS[p].label));
    if(dn.length){txt(bx,'Will be denied:','xwn');dn.forEach(p=>txt(bx,'  ✖ '+Apps.PERMS[p.id].label+(p.required?'  (required by the app — it may not work properly)':'')))}
    txt(bx,'You can revoke permissions later in the app’s settings or by reinstalling.','xs').style.marginTop='8px'}
   const r=H('div','mdr',bx);H('button','btn',r,'Cancel').onclick=close;if(step>0)H('button','btn',r,'Back').onclick=()=>{step--;draw()};
   if(step<2){var nx=H('button','btn pri',r,'Next');nx.disabled=!ack||(step===0&&!pk.files.has(m.main));nx.onclick=()=>{step++;draw()}}
   else{H('button','btn',r,'Run once').onclick=()=>{close();launch(pk,[...sel],true)};H('button','btn pri',r,'Install & run').onclick=async()=>{close();await install(pk,[...sel],buf);toast(m.name+' installed — find it in the Start menu');launch(pk,[...sel],false)}}
   setTimeout(()=>bx.querySelector('.btn.pri')&&bx.querySelector('.btn.pri').focus(),20)}
  draw()}
 function bgStart(id){const a=APPS[id];if(!a||!a.pk)return null;const host=H('div','',document.body);host.style.cssText='position:fixed;left:-9999px;top:0;width:0;height:0;overflow:hidden';const stub={bg:1,beat:Date.now()};run(host,stub,a.pk,id,1);
  return{stub,stop(){try{stub.onclose&&stub.onclose()}catch{}host.remove()}}}
 function launch(pk,grants,temp){const id=mount(pk,grants,temp);openApp(id)}
 async function open(fileId){try{const b=await FS.blob(fileId),pk=await parse(b);wizard(pk,await b.arrayBuffer())}catch(e){toast('Cannot open package: '+e.message)}}

 /* ---------- terminal: `xctu …` ---------- */
 const SCAFFOLD={
  'xctu.json':n=>JSON.stringify({id:n,name:n.replace(/(^|-)(.)/g,(a,b,c)=>(b?' ':'')+c.toUpperCase()),version:'1.0.0',author:prof().name,description:'A new XCTU app.',cat:'utilities',w:520,h:360,icon:'icon.svg',main:'main.js',html:'app.html',css:'style.css',perms:[]},null,1),
  'app.html':()=>'<h2 id="hello">Hello from XCTU!</h2>\n<p>Clicks: <b id="n">0</b></p>\n<button id="b">Click me</button>\n',
  'style.css':()=>'body{padding:18px;display:grid;gap:10px;align-content:start}\nh2{margin:0}\n',
  'main.js':()=>"/* Runs inside the sandbox. `xctu` is your bridge to the OS (see docs in apps/xctu.js). */\nconst key='clicks';\nlet n=(await xctu.store.get(key))||0;\nconst out=document.getElementById('n');out.textContent=n;\ndocument.getElementById('b').onclick=async()=>{\n  out.textContent=++n;\n  await xctu.store.set(key,n);\n  if(n%10===0)xctu.ui.toast('Nice, '+n+' clicks!');\n};\nxctu.ui.title('Hello — '+xctu.user.name);\n",
  'icon.svg':()=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#007bff"/><circle cx="32" cy="32" r="14" fill="#fff"/></svg>\n'};
 const TPL={hello:{d:'click counter (default)'},
  notes:{d:'persistent notepad using app storage',html:'<textarea id="t" placeholder="Write something…"></textarea><small id="s"></small>',css:'body{display:grid;grid-template-rows:1fr auto;padding:10px;gap:6px;box-sizing:border-box}textarea{resize:none;height:100%}',js:"const t=document.getElementById('t'),s=document.getElementById('s');t.value=(await xctu.store.get('note'))||'';let h;t.oninput=()=>{clearTimeout(h);h=setTimeout(async()=>{await xctu.store.set('note',t.value);s.textContent='saved '+new Date().toLocaleTimeString()},300)};"},
  timer:{d:'stopwatch with laps',html:'<h1 id="d">0.0</h1><div><button id="g">Start</button> <button id="l">Lap</button> <button id="r">Reset</button></div><ol id="o"></ol>',css:'body{padding:16px;text-align:center}h1{font-size:44px;margin:0}',js:"let t0=0,acc=0,id=0;const d=document.getElementById('d'),o=document.getElementById('o'),g=document.getElementById('g');const now=()=>(acc+(t0?Date.now()-t0:0))/1000;g.onclick=()=>{if(t0){acc+=Date.now()-t0;t0=0;clearInterval(id);g.textContent='Start'}else{t0=Date.now();id=setInterval(()=>d.textContent=now().toFixed(1),100);g.textContent='Stop'}};document.getElementById('l').onclick=()=>{o.insertAdjacentHTML('afterbegin','<li>'+now().toFixed(2)+'s</li>')};document.getElementById('r').onclick=()=>{clearInterval(id);t0=acc=0;d.textContent='0.0';o.innerHTML='';g.textContent='Start'};"},
  daemon:{d:'counts minutes in the background (needs the background permission)',perms:[{id:'background',why:'Counts minutes while the window is closed',required:true}],bg:"setInterval(async()=>{await xctu.store.set('mins',((await xctu.store.get('mins'))||0)+1)},60000);",html:'<h2>Background minutes: <b id="m">0</b></h2><small>Enable “Run in background” for this app in Resource Manager → Startup.</small>',css:'body{padding:18px}',js:"const m=document.getElementById('m');const t=async()=>m.textContent=(await xctu.store.get('mins'))||0;t();setInterval(t,5000);"},
  files:{d:'file lister (needs the fs permission)',perms:[{id:'fs',why:'Lists your home folder',required:true}],html:'<h3>Home</h3><ul id="l"></ul>',css:'body{padding:14px}',js:"const l=document.getElementById('l');for(const f of await xctu.fs.list('~'))l.insertAdjacentHTML('beforeend','<li>'+(f.type==='dir'?'📁 ':'📄 ')+f.name.replace(/</g,'&lt;')+'</li>');"}};
 function terminal(T){const{def,asked,TK,look,parentOf,wr,t,FS:fs}=T,P=p=>look(p);
  const dirArg=a=>{const m=P(a||'.');if(!m||m.t!=='d')throw Error((a||'.')+': not a project folder');return m};
  const rep=(r,name)=>[...r.E.map(x=>TK('e','  ✖ ')+x),...r.W.map(x=>TK('w','  ⚠ ')+x)].join('\n')||TK('g','  ✔ '+name+': no problems');
  const usage=()=>[TK('u','XCTU — build and run your own apps'),'',TK('a','xctu new <folder>')+'            scaffold a project (xctu.json, main.js, app.html, style.css, icon.svg)',TK('a','xctu check [folder]')+'        validate the project (errors block compiling)',TK('a','xctu build [folder] [-y]')+'  compile wizard → <id>.xctu  (-y reuses xctu.json answers)',
   TK('a','xctu info <file.xctu>')+'      show a package, its permissions and integrity',TK('a','xctu run <file.xctu>')+'       permission wizard, then run (or install)',TK('a','xctu install <file.xctu>')+'   same wizard, opened ready to install',TK('a','xctu list')+'                   installed .xctu apps',TK('a','xctu remove <id>')+'          uninstall (also wipes its cache)',TK('a','xctu sys')+'                    live /.system structure (auto-synced to the running OS)',TK('a','xctu cache')+'                  what apps created: storage + files',TK('a','xctu clean <id>|--orphans|--all')+'  delete ONLY app-made data',TK('a','xctu perms|revoke|export <id>')+'  inspect, revoke or export an installed app',TK('a','xctu stats')+' · '+TK('a','xctu templates')+'   overview · starter templates'].join('\n');
  def('xctu','Apps','Create, compile and run .xctu apps','xctu <new|check|build|info|run|install|list|remove> …',async a=>{const sub=a[0];a=a.slice(1);
   if(!sub||sub==='help')return usage();
   if(sub==='new'){if(!a[0])throw Error('usage: xctu new <folder> [template]  (see xctu templates)');const tp=TPL[a[1]||'hello'];if(!tp)throw Error('unknown template — try `xctu templates`');const{dir,name}=parentOf(a[0]);wr(dir);if(!ID.test(name))throw Error('folder name doubles as the app id: lowercase letters, digits, dashes (2–32 chars)');
    const f=await fs.mkdir(dir.id,name);for(const k in SCAFFOLD){let c=SCAFFOLD[k](name);if(k==='xctu.json'&&(tp.perms||tp.bg))c=JSON.stringify({...JSON.parse(c),perms:tp.perms,bg:tp.bg?'bg.js':''},null,1);if(k==='main.js'&&tp.js)c=tp.js;if(k==='app.html'&&tp.html)c=tp.html;if(k==='style.css'&&tp.css)c=tp.css;await fs.write(f.id,k,new Blob([c]),null,0,'term')}if(tp.bg)await fs.write(f.id,'bg.js',new Blob([tp.bg]),null,0,'term');
    return TK('g','created ')+a[0]+'\n  edit main.js / app.html / style.css, then run '+TK('a','xctu build '+a[0])+'\n  tip: `edit '+a[0]+'/main.js`'}
   if(sub==='check'){const d=dirArg(a[0]),r=await lint(d.id);return TK('u','checking ')+d.n+'\n'+rep(r,d.n)+'\n'+(r.E.length?TK('e','✖ '+r.E.length+' error(s) — fix these before building'):TK('g','✔ ready to build'))}
   if(sub==='build'){const yes=a.includes('-y');a=a.filter(x=>x!=='-y');const d=dirArg(a[0]);
    let cj=fs.K.get(d.id).get('xctu.json'),cfg={};if(cj)try{cfg=JSON.parse(await(await fs.blob(cj)).text())}catch{throw Error('xctu.json is not valid JSON — fix it first')}
    const files0=await collect(d.id),has=x=>files0.some(f=>f.path===x);
    cfg={id:d.n,name:d.n,version:'1.0.0',author:prof().name,description:'',cat:'utilities',w:520,h:360,icon:has('icon.svg')?'icon.svg':'',main:has('main.js')?'main.js':'',html:has('app.html')?'app.html':'',css:has('style.css')?'style.css':'',bg:'',kill:'',perms:[],...cfg};
    const ask=async(label,def,check)=>{for(;;){const v=await asked(TK('a','? ')+label+(def!==''&&def!=null?TK('m',' ['+def+']'):'')+': ');if(v===null)throw Error('build cancelled');const x=v.trim()===''?String(def??''):v.trim();const bad=check&&check(x);if(!bad)return x;emit_(TK('e',bad))}};
    const emit_=s=>T.emit(s);
    if(!yes){T.emit(TK('u','XCTU build wizard')+TK('m','  ·  Enter keeps the value in [brackets], Ctrl+C cancels'));
     cfg.id=await ask('App id',cfg.id,x=>ID.test(x)?'':'lowercase letters, digits, dashes; start with a letter (2–32)');
     cfg.name=await ask('Display name',cfg.name,x=>x?'':'required');cfg.version=await ask('Version',cfg.version,x=>VER.test(x)?'':'use 1.0.0 style');
     cfg.author=await ask('Author',cfg.author);cfg.description=await ask('Description',cfg.description);
     cfg.cat=await ask('Category ('+CATS.join('/')+')',cfg.cat,x=>CATS.includes(x)?'':'pick one of: '+CATS.join(', '));
     cfg.w=+await ask('Window width',cfg.w,x=>+x>=240?'':'at least 240');cfg.h=+await ask('Window height',cfg.h,x=>+x>=160?'':'at least 160');
     cfg.main=await ask('Main script',cfg.main,x=>has(x)?'':'file not found in the project');cfg.icon=await ask('Icon (svg/png)',cfg.icon,x=>has(x)?'':'file not found in the project');
     cfg.html=await ask('HTML file (blank = none)',cfg.html,x=>!x||has(x)?'':'file not found');cfg.css=await ask('CSS file (blank = none)',cfg.css,x=>!x||has(x)?'':'file not found');cfg.bg=await ask('Background script (blank = none; needs the “background” permission)',cfg.bg||'',x=>!x||has(x)?'':'file not found');
     cfg.kill=(await ask('Kill phrase (optional, letters only, 2-16 chars, blank = none)',cfg.kill||'',x=>!x||/^[A-Za-z]{2,16}$/.test(x)?'':'letters only, 2-16 chars')).toUpperCase();
     const cp=normPerms(cfg.perms);T.emit('\n'+TK('u','Permissions')+TK('m','  — what may the app do? Users see this list and decide.'));
     const ids=Object.keys(Apps.PERMS);ids.forEach((k,i)=>T.emit(' '+String(i+1).padStart(2)+'. '+TK('a',k.padEnd(12))+Apps.PERMS[k].label+(Apps.PERMS[k].admin?TK('w','   [admin only'+(isAdm()?'':' — locked for you')+']'):'')));
     const cur=cp.map(p=>p.id).join(',');
     const pl=await ask('Permissions (ids or numbers, comma-separated, "none" to clear)',cur||'none',x=>{if(x==='none')return'';for(const s of x.split(',').map(s=>s.trim()).filter(Boolean)){const k=ids[+s-1]||s;if(!Apps.PERMS[k])return'unknown permission “'+s+'”';if(Apps.PERMS[k].admin&&!isAdm())return'“'+k+'” is admin-only; you need an administrator profile to ship it'}return''});
     const want=pl==='none'?[]:[...new Set(pl.split(',').map(s=>s.trim()).filter(Boolean).map(s=>ids[+s-1]||s))];cfg.perms=[];
     for(const k of want){const o=cp.find(p=>p.id===k)||{};const why=await ask('Why does it need “'+k+'”? (shown in the wizard)',o.why||'',x=>x?'':'a short reason is required so users can decide');const rq=(await ask('Is “'+k+'” required for the app to work? (y/n)',o.required?'y':'n',x=>/^[yn]$/i.test(x)?'':'y or n')).toLowerCase()==='y';cfg.perms.push({id:k,why,required:rq})}
     if(isAdm())cfg.adminOnly=/^y/i.test(await ask('Restrict opening to administrators? (y/n)',cfg.adminOnly?'y':'n',x=>/^[yn]$/i.test(x)?'':'y or n'));
     const body=new Blob([JSON.stringify(cfg,null,1)]);wr(d);await fs.write(d.id,'xctu.json',body,cj||null,0,'term')}
    T.emit('\n'+TK('u','Checking project…'));const r=await lint(d.id);T.emit(rep(r,d.n));if(r.E.length)throw Error('build stopped: fix the '+r.E.length+' error(s) above and run xctu build again');
    if(!yes){const ok=await ask('Compile “'+cfg.name+'” v'+cfg.version+' ('+r.files.length+' files, '+fmtSz(r.total)+')? (y/n)','y',x=>/^[yn]$/i.test(x)?'':'y or n');if(ok.toLowerCase()!=='y')return TK('w','cancelled')}
    const blob=await compile(cfg,r.files),nm=cfg.id+'-'+cfg.version+'.xctu',ex=fs.K.get(d.id).get(nm.toLowerCase());wr(d);const w=await fs.write(d.id,nm,blob,ex||null,0,'term');
    return TK('g','✔ built ')+fs.path(w.id)+'  ('+fmtSz(blob.size)+')\n  run it: '+TK('a','xctu run '+nm)+'  — or double-click it in My Files'}
   if(sub==='info'||sub==='run'||sub==='install'){const m=P(a[0]||'');if(!m||m.t!=='f')throw Error('usage: xctu '+sub+' <file.xctu>');const b=await fs.blob(m.id),pk=await parse(b);
    if(sub!=='info'){wizard(pk,await b.arrayBuffer());return TK('g','wizard opened')+' for '+pk.m.name}
    const x=pk.m;return[TK('u',x.name+'  v'+x.version),' id        '+x.id,' author    '+(x.author||'—'),' category  '+x.cat,' window    '+x.w+'×'+x.h,' files     '+pk.files.size+'  ·  '+fmtSz(pk.size),' built     '+fmtDt(x.built)+' by '+x.builder.name+(x.builder.admin?' (admin)':''),
     ' integrity '+(pk.issues.length?TK('e','✖ '+pk.issues.join('; ')):TK('g','✔ seal verified')),' background '+(x.bg||'none'),' perms     '+(x.perms.length?'':'none'),...x.perms.map(p=>'   '+TK('a',p.id.padEnd(11))+Apps.PERMS[p.id].label+(Apps.PERMS[p.id].admin?TK('w',' [admin only]'):'')+(p.required?' (required)':'')+(p.why?TK('m','  — '+p.why):'')),x.adminOnly?TK('w',' only administrators can open this app'):''].filter(s=>s!=='').join('\n')}
   if(sub==='list'){const l=await rec();return l.length?l.map(r=>TK('a',r.id.padEnd(20))+'granted: '+(r.grants.join(', ')||'none')).join('\n'):'no .xctu apps installed'}
   if(sub==='remove'){if(!a[0])throw Error('usage: xctu remove <id>');if(!await remove(a[0]))throw Error(a[0]+': not installed');return TK('g','removed ')+a[0]}
   if(sub==='sys'){if(a[0]!=='nosync'){const r=await FS.syncSys();var rp=r.ok?TK('m','synced with the running OS: +'+r.add+' new, '+r.upd+' updated, '+r.del+' removed'):TK('w','offline — showing the last synced copy')}
    const st=sysStat();return[TK('u','/.system')+TK('m','  — live system structure ('+st.n+' files, '+fmtSz(st.sz)+')'),...tree(FS.sysId()),'',rp||''].join('\n')}
   if(sub==='cache'||sub==='caches'){const l=await report();if(!l.length)return'no .xctu apps installed, no caches';
    const tot=l.reduce((x,u)=>x+u.kvBytes+u.bytes,0);
    return[TK('u','App caches')+TK('m','  (only data apps created themselves — files they merely open are never listed)'),...l.map(u=>TK('a',u.id.padEnd(20))+('storage '+fmtSz(u.kvBytes)+' ('+u.kvKeys+' keys)').padEnd(30)+('files '+u.files+' · '+fmtSz(u.bytes)).padEnd(24)+(u.orphan?TK('w','uninstalled — leftover'):'')),...l.flatMap(u=>u.list.filter(m=>m.t==='f').slice(0,5).map(m=>TK('m','   '+u.id+' → '+FS.path(m.id)))),'',TK('m','total '+fmtSz(tot)+' · clean with: xctu clean <id> | --orphans | --all')].join('\n')}
   if(sub==='clean'){const all=a.includes('--all'),orp=a.includes('--orphans'),ids=a.filter(x=>x[0]!=='-');let tg;
    if(all)tg=(await report()).map(u=>u.id);else if(orp)tg=await orphans();else if(ids.length)tg=ids;else throw Error('usage: xctu clean <id> | --orphans | --all');
    if(!tg.length)return TK('g','nothing to clean');if(!a.includes('-y')){const ok=await asked(TK('a','? ')+'Delete the storage and created files of '+tg.join(', ')+'? Other files stay untouched. (y/n) [n]: ');if(!ok||!/^y/i.test(ok))return TK('w','cancelled')}
    const out=[];for(const id of tg){const r=await wipe(id);out.push(TK('g','✔ ')+id.padEnd(20)+r.del+' item(s) deleted'+(r.skip?TK('w',', '+r.skip+' kept (in use or not empty)'):'')+', storage '+fmtSz(r.kv))}return out.join('\n')}
   if(sub==='export'){const r=(await rec()).find(x=>x.id===a[0]);if(!r)throw Error('usage: xctu export <installed-id>');const h=FS.home(),f=await fs.write(h,r.id+'.xctu',new Blob([r.buf]),null,0,'term');return TK('g','exported ')+fs.path(f.id)}
   if(sub==='perms'||sub==='revoke'){const r=(await rec()).find(x=>x.id===a[0]);if(!r)throw Error('usage: xctu '+sub+' <id>'+(sub==='revoke'?' <permission>':''));
    if(sub==='revoke'){if(!r.grants.includes(a[1]))throw Error(a[0]+' has no “'+a[1]+'” grant');r.grants=r.grants.filter(x=>x!==a[1]);await tx('readwrite',s=>s.put(r));await mountAll();return TK('g','revoked ')+a[1]+' from '+a[0]}
    return r.grants.length?r.grants.map(g=>TK('a',g.padEnd(12))+(Apps.PERMS[g]||{}).label).join('\n'):'no permissions granted'}
   if(sub==='stats'){const l=await rec(),c=await report(),st=sysStat();return[TK('u','XCTU overview'),' installed apps   '+l.length,' app storage      '+fmtSz(c.reduce((x,u)=>x+u.kvBytes+u.bytes,0)),' leftovers        '+c.filter(u=>u.orphan).length,' system files    '+st.n+' ('+fmtSz(st.sz)+')',' permissions      '+Object.keys(Apps.PERMS).length+' kinds'].join('\n')}
   if(sub==='templates')return TK('u','Templates')+'\n'+Object.keys(TPL).map(k=>TK('a',k.padEnd(10))+TPL[k].d).join('\n')+'\n'+TK('m','use: xctu new <folder> <template>')
   throw Error('xctu: unknown subcommand “'+sub+'” — try `xctu help`')})}

 /* ---------- XCTU Manager (GUI): live system structure + app caches ---------- */
 Apps.style('xctu-manager','.xm{display:flex;flex-direction:column;height:100%}.xm nav{display:flex;gap:6px;padding:8px}.xm nav button.on{outline:2px solid var(--b)}.xm main{flex:1;overflow:auto;padding:0 12px 12px}.xm pre{margin:0;font:12px/1.5 ui-monospace,monospace;white-space:pre}.xm .xr{display:flex;gap:10px;align-items:center;padding:8px 10px;margin:6px 0;border-radius:10px;background:rgba(255,255,255,.07)}.xm .xr div{flex:1;min-width:0}.xm small{opacity:.65;display:block}');
 Apps.register('xctu-manager',{name:'XCTU Manager',icon:ICON,w:640,h:480,cat:'system',perms:[],render:body=>{
  body.innerHTML='';const root=H('div','xm',body),nav=H('nav','',root),main=H('main','',root);let tab='cache';
  const tabs=[['cache','App caches'],['sys','System files'],['apps','Installed']];
  const draw=async()=>{nav.innerHTML='';tabs.forEach(([k,l])=>{const b=H('button','btn'+(tab===k?' on':''),nav,l);b.onclick=()=>{tab=k;draw()}});main.innerHTML='';
   if(tab==='sys'){const sb=H('button','btn',nav,'↻ Sync now');sb.onclick=async()=>{sb.disabled=true;const r=await FS.syncSys();toast(r.ok?'System synced: +'+r.add+' ~'+r.upd+' −'+r.del:'Offline — showing last copy');draw()};
    const st=sysStat();H('small','',main,'/.system — what the running OS ships ('+st.n+' files, '+fmtSz(st.sz)+')');H('pre','',main).textContent=['.system/',...tree(FS.sysId())].join('\n')}
   else if(tab==='cache'){const l=await report();if(!l.length)return H('p','',main,'No app caches. Nothing to clean 🎉');
    H('small','',main,'Only data an app created itself is listed. Files it merely opened or edited are never touched.');
    l.forEach(u=>{const r=H('div','xr',main,'<div><b></b><small></small></div>');$('b',r).textContent=u.name+(u.orphan?' (uninstalled)':'');$('small',r).textContent='storage '+fmtSz(u.kvBytes)+' · '+u.files+' file(s), '+fmtSz(u.bytes);
     H('button','btn dng',r,'Clean').onclick=async()=>{const x=await wipe(u.id);toast(x.del+' item(s) cleaned');draw()}});
    H('button','btn pri',main,'Clean everything').onclick=async()=>{for(const u of l)await wipe(u.id);toast('All app caches cleaned');draw()}}
   else{const l=await rec();if(!l.length)return H('p','',main,'No .xctu apps installed.');l.forEach(x=>{const a=APPS[AID(x.id)]||{},r=H('div','xr',main,'<div><b></b><small></small></div>');$('b',r).textContent=a.name||x.id;$('small',r).textContent='granted: '+(x.grants.join(', ')||'none')+' · installed '+fmtDt(x.at);
     H('button','btn',r,'Open').onclick=()=>openApp(AID(x.id));H('button','btn dng',r,'Remove').onclick=async()=>{await remove(x.id);draw()}})}};
  draw()}});

 /* ---------- wiring into the OS ---------- */
 OPENERS.unshift({id:'xctu',name:'XCTU Runner',icon:ICON,test:m=>m.t==='f'&&EXT(m.n)==='xctu',open:m=>open(m.id)});
 const prev=window.regInstalled;window.regInstalled=()=>{prev&&prev();mountAll()};
 return{open,parse,lint,compile,install,remove,terminal,wizard,mountAll,bgStart,ready:()=>mp}
})();
