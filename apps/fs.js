'use strict';
/* apps/fs.js — virtual file system service (IndexedDB) + zip engine. Not an app: apps reach files only through FS. */
const FS=(()=>{
 let db;const L=new Set();const M=new Map(),K=new Map(),SEP='/';let seq=0;const pre=Date.now().toString(36)+Math.random().toString(36).slice(2,6);
 const nid=()=>pre+(seq++).toString(36);
 const odb=()=>new Promise((r,j)=>{const q=indexedDB.open('reitzel-fs',1);q.onupgradeneeded=()=>{q.result.createObjectStore('n',{keyPath:'id'});q.result.createObjectStore('d')};q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});
 const done=t=>new Promise((r,j)=>{t.oncomplete=()=>r();t.onerror=t.onabort=()=>j(t.error)});
 const split=n=>{const i=n.lastIndexOf('.');return i>0?[n.slice(0,i),n.slice(i)]:[n,'']};
 const link=m=>{M.set(m.id,m);if(m.t==='d'&&!K.has(m.id))K.set(m.id,new Map());if(m.p!=null){if(!K.has(m.p))K.set(m.p,new Map());K.get(m.p).set(m.n.toLowerCase(),m.id)}};
 const unlink=m=>{const k=K.get(m.p);if(k&&k.get(m.n.toLowerCase())===m.id)k.delete(m.n.toLowerCase())};
 async function persist(n,d,del,by){if(!n.length&&!d.length&&!del.length)return;const t=db.transaction(['n','d'],'readwrite'),a=t.objectStore('n'),b=t.objectStore('d');n.forEach(m=>a.put(m));d.forEach(([i,x])=>b.put(x,i));del.forEach(i=>{a.delete(i);b.delete(i)});await done(t);const ids=[...n.map(m=>m.id),...del];L.forEach(f=>{try{f({ids,by})}catch(e){console.error(e)}})}
 const F={M,K,SEP,split,
  on(f){L.add(f);return()=>L.delete(f)},get:id=>M.get(id),kids:id=>{const k=K.get(id);return k?[...k.values()].map(i=>M.get(i)):[]},
  path(id){const a=[];while(id&&id!=='root'){const m=M.get(id);if(!m)break;a.push(m.n);id=m.p}return SEP+a.reverse().join(SEP)},
  resolve(p,from='root'){let id=p.startsWith(SEP)?'root':from;for(const s of p.split(SEP)){if(!s||s==='.')continue;if(s==='..'){id=M.get(id).p||'root';continue}const c=K.get(id)&&K.get(id).get(s.toLowerCase());if(!c)return null;id=c}return M.get(id)&&M.get(id).t==='d'?id:(M.get(id)&&p.trim()?id:null)},
  uniq(p,n,skip){const k=K.get(p);if(!k)return n;const t=x=>{const i=k.get(x.toLowerCase());return i&&i!==skip};if(!t(n))return n;const[b,e]=split(n);for(let i=2;;i++){const c=`${b} (${i})${e}`;if(!t(c))return c}},
  valid(n){return n&&n.trim()&&!/[\/\\]/.test(n)&&n!=='.'&&n!=='..'&&n.length<256},
  isIn(id,anc){while(id){if(id===anc)return true;const m=M.get(id);id=m&&m.p}return false},
  async init(){db=await odb();const t=db.transaction('n'),q=t.objectStore('n').getAll();await done(t);const all=q.result;
   all.filter(m=>m.t==='d').forEach(link);all.filter(m=>m.t!=='d').forEach(link);
   if(!M.has('root')){const ns=[{id:'root',p:null,n:'',t:'d',s:0,m:Date.now()}];link(ns[0]);await persist(ns,[],[])}
   M.get('root').lock=1;
   for(const[n,ro]of[['.system',1],['home',0]])if(!K.get('root').has(n)){const m=await R.mkdir('root',n,ro);m.lock=1;await persist([m],[],[])}
   F.syncSys()},
  async mkdir(p,n,ro){const m={id:nid(),p,n:F.uniq(p,n),t:'d',s:0,m:Date.now()};if(ro)m.ro=1;link(m);await persist([m],[],[]);return m},
  async write(p,n,blob,id,ro,by){let m=id&&M.get(id);if(m){m.s=blob.size;m.m=Date.now();await persist([m],[[m.id,blob]],[],by);return m}
   m={id:nid(),p,n:ro?n:F.uniq(p,n),t:'f',s:blob.size,m:Date.now()};if(ro)m.ro=1;link(m);await persist([m],[[m.id,blob]],[],by);return m},
  async writeMany(list){const ns=[],ds=[];for(const[p,n,b]of list){const m={id:nid(),p,n:F.uniq(p,n),t:'f',s:b.size,m:Date.now()};link(m);ns.push(m);ds.push([m.id,b])}await persist(ns,ds,[]);return ns},
  async rename(id,n){const m=M.get(id);if(!F.valid(n))throw Error('Invalid name');const c=K.get(m.p).get(n.toLowerCase());if(c&&c!==id)throw Error('That name already exists here');unlink(m);m.n=n;link(m);await persist([m],[],[])},
  async move(ids,np){const ns=[];for(const id of ids){const m=M.get(id);if(m.p===np)continue;if(F.isIn(np,id))throw Error('Cannot move a folder into itself');unlink(m);m.p=np;m.n=F.uniq(np,m.n);link(m);ns.push(m)}await persist(ns,[],[]);return ns.length},
  async copy(ids,np){const ns=[],pairs=[];const rec=(id,p)=>{const s=M.get(id),m={id:nid(),p,n:F.uniq(p,s.n),t:s.t,s:s.s,m:Date.now()};link(m);ns.push(m);if(s.t==='d')[...K.get(id).values()].forEach(c=>rec(c,m.id));else pairs.push([id,m.id]);};
   for(const id of ids){if(F.isIn(np,id))throw Error('Cannot copy a folder into itself');rec(id,np)}
   const t=db.transaction('d'),st=t.objectStore('d'),rs=pairs.map(([a])=>st.get(a));await done(t);
   await persist(ns,pairs.map(([a,b],i)=>[b,rs[i].result]).filter(x=>x[1]),[]);return ns.length},
  async del(ids){const del=[];const rec=id=>{const m=M.get(id);if(!m)return;if(m.t==='d')[...K.get(id).values()].forEach(rec);unlink(m);M.delete(id);K.delete(id);del.push(id)};ids.forEach(rec);await persist([],[],del);return del.length},
  async blob(id){const t=db.transaction('d'),q=t.objectStore('d').get(id);await done(t);return q.result||new Blob([])},
  search(root,q,hidden,limit=20000){q=q.toLowerCase();const out=[],st=[root];while(st.length&&out.length<limit){const d=st.pop();const k=K.get(d);if(!k)continue;for(const[ln,id]of k){if(!hidden&&ln[0]==='.')continue;if(!canR(M.get(id)))continue;if(ln.includes(q))out.push(M.get(id));const m=M.get(id);if(m.t==='d')st.push(id)}}return out},
  count(id){let n=0,sz=0;const st=[id];while(st.length){const k=K.get(st.pop());if(k)for(const c of k.values()){const m=M.get(c);if(!canR(m))continue;n++;sz+=m.s||0;if(m.t==='d')st.push(c)}}return[n,sz]},
  async syncSys(){const rep={add:0,upd:0,del:0,ok:false};try{
   const sys=M.get(K.get('root').get('.system')),get=async u=>{try{const r=await fetch(u,{cache:'no-store'});return r.ok?r:null}catch{return null}};
   const ir=await get('index.html');if(!ir)return rep;
   /* the current file list is discovered from what the OS really loads: index.html, the service worker's file list, plus the known assets */
   const want=new Set(['index.html','sw.js','style.css','os.js']),add=t=>{for(const m of t.matchAll(/(?:src=|href=|')\.?\/?((?:apps|assets|emojis)\/[\w.\-\/]+\.(?:js|css|svg|html)|[\w\-]+\.(?:js|css|html))\b/g))want.add(m[1])};
   add(await ir.clone().text());const sr=await get('sw.js');if(sr)add(await sr.text());
   ['reitzel','folder','folder-single','compass-settings','network','editor','file-image','file-generic','file-scout','tote-store','terminal','cloud-export','browser'].forEach(x=>want.add('assets/'+x+'-icon.svg'));
   const keep=new Set([sys.id]),dirOf=async parts=>{let p=sys.id;for(const s of parts){let c=K.get(p).get(s.toLowerCase());if(!c){c=(await R.mkdir(p,s,1)).id}keep.add(c);p=c}return p};
   for(const path of want){const parts=path.split('/'),name=parts.pop(),r=await get(path);if(!r)continue;
    const b=await r.blob(),par=await dirOf(parts),old=K.get(par).get(name.toLowerCase());
    if(old){keep.add(old);const m=M.get(old);let same=m.s===b.size;if(same){const a=new Uint8Array(await R.blob(old).then(x=>x.arrayBuffer())),c=new Uint8Array(await b.arrayBuffer());for(let i=0;i<a.length;i++)if(a[i]!==c[i]){same=false;break}}
     if(!same){await R.write(null,name,b,old);rep.upd++}}
    else{keep.add((await R.write(par,name,b,null,1)).id);rep.add++}}
   /* anything in .system that is no longer part of the OS is outdated: remove it */
   const stale=[],walk=id=>{for(const c of K.get(id).values()){if(!keep.has(c))stale.push(c);else if(M.get(c).t==='d')walk(c)}};walk(sys.id);
   if(stale.length){await R.del(stale);rep.del=stale.length}rep.ok=true;
  }catch(e){console.error('sys sync',e)}return rep}
 };
 /* ===== universal access-control middleman: every app (Files, Editor, Terminal, dialogs, shortcuts) goes through these checks ===== */
 const R={};['get','kids','resolve','mkdir','write','writeMany','rename','move','copy','del','blob','search'].forEach(k=>R[k]=F[k]);F.raw=R;
 let WHO=()=>null;F.setWho=f=>{WHO=f};F.who=()=>WHO();
 const LEG=new Set(['documents','pictures','downloads','desktop']),dirId=(par,n)=>{const k=K.get(par);return k&&k.get(n)};F.dirId=dirId;
 F.homesId=()=>dirId('root','home');F.sysId=()=>dirId('root','.system');
 F.home=u=>{u=u||WHO();return u&&u.home&&M.has(u.home)?u.home:'root'};
 const roUp=m=>{while(m){if(m.ro)return true;m=M.get(m.p)}return false};
 const canR=m=>{const u=WHO();if(!m||!u)return false;if(u.admin)return true;if(m.id==='root'||m.id===F.homesId())return true;const s=F.sysId();if(s&&F.isIn(m.id,s))return true;return!!(u.home&&F.isIn(m.id,u.home))};
 const canW=m=>{const u=WHO();if(!m||!u||roUp(m))return false;if(u.admin)return true;return!!(u.home&&F.isIn(m.id,u.home))};
 F.canRead=id=>canR(M.get(id));F.canWrite=id=>canW(M.get(id));
 const deny=m=>{throw Error('Permission denied'+(m&&m.n?': '+m.n:''))};
 const needR=id=>{const m=M.get(id);if(!m||!canR(m))deny(m);return m};
 const needW=id=>{const m=M.get(id);if(!m||!canW(m))deny(m);return m};
 const frozen=id=>{const m=M.get(id);if(!m)return false;if(m.lock||m.ro)return true;const k=K.get(id);return k?[...k.values()].some(frozen):false};
 F.get=id=>{const m=M.get(id);return m&&canR(m)?m:undefined};
 F.kids=id=>{const m=M.get(id);return m&&canR(m)?R.kids(id).filter(canR):[]};
 F.resolve=(p,from)=>{if(p&&p[0]==='/'){const q=p.split('/').filter(Boolean);if(q.length&&LEG.has(q[0].toLowerCase())&&!dirId('root',q[0].toLowerCase()))p=F.path(F.home())+'/'+q.join('/')}const id=R.resolve(p,from||F.home()),m=id&&M.get(id);return m&&canR(m)?id:null};
 F.mkdir=async(p,n)=>{needW(p);if(!F.valid(n))throw Error('Invalid name');return R.mkdir(p,n)};
 F.write=async(p,n,blob,id,ro,by)=>{if(id){const m=needW(id);if(m.t!=='f')throw Error('Not a file')}else{const d=needW(p);if(d.t!=='d')deny(d);if(!F.valid(n))throw Error('Invalid name')}return R.write(p,n,blob,id,0,by)};
 F.writeMany=async list=>{list.forEach(([p])=>needW(p));return R.writeMany(list)};
 F.rename=async(id,n)=>{const m=needW(id);if(m.lock)deny(m);return R.rename(id,n)};
 F.move=async(ids,np)=>{needW(np);ids.forEach(id=>{const m=needW(id);if(m.lock||frozen(id))deny(m)});return R.move(ids,np)};
 F.copy=async(ids,np)=>{needW(np);ids.forEach(needR);return R.copy(ids,np)};
 F.del=async ids=>{ids.forEach(id=>{const m=needW(id);if(m.lock||frozen(id))deny(m)});return R.del(ids)};
 F.blob=async id=>{needR(id);return R.blob(id)};
 F.search=(root,q,h,l)=>canR(M.get(root))?R.search(root,q,h,l).filter(canR):[];
 /* ===== user homes, per-user config files, legacy migration ===== */
 const sane=n=>String(n).toLowerCase().replace(/[^a-z0-9_-]+/g,'')||'user',APPN={files:'My Files',editor:'Text Editor',store:'App Store',settings:'Settings',terminal:'Terminal','file-scout':'File Scout'};
 const lock=async(m,ro)=>{m.lock=1;if(ro)m.ro=1;await persist([m],[],[]);return m};
 const shJSON=l=>JSON.stringify({format:'reitzel-shortcuts',version:1,shortcuts:l},null,2);
 const DEFSC=()=>[['files',0],['editor',1],['store',2],['settings',3]].map(([a,r])=>({name:APPN[a],target:a,kind:'app',c:0,r}));
 F.provision=async(p,defaults)=>{let h=p.home&&M.get(p.home);if(!h){const par=p.root?'root':F.homesId();h=await lock(await R.mkdir(par,p.root?'root':sane(p.name)));p.home=h.id}
  for(const n of['Desktop','Documents','Pictures','Downloads','.config','.compost'])if(!dirId(h.id,n.toLowerCase()))await lock(await R.mkdir(h.id,n),n[0]==='.');
  const d=dirId(h.id,'desktop');if(defaults&&!dirId(d,'shortcuts.syst'))await R.write(d,'shortcuts.syst',new Blob([shJSON(DEFSC())]));return h};
 const isC=id=>{let m=M.get(id);while(m){if(m.n==='.compost'&&m.lock)return true;m=M.get(m.p)}return false};
 F.inCompost=isC;F.compostId=()=>dirId(F.home(),'.compost');
 F.trash=async ids=>{ids.forEach(id=>{const m=needW(id);if(m.lock||frozen(id))deny(m)});const c=F.compostId(),mode=typeof S!=='undefined'&&S.compost||'never';if(!c||mode==='now')return R.del(ids);const t=Date.now();ids.forEach(id=>{const m=M.get(id);m.op=m.p;m.on=m.n;m.dt=t});return R.move(ids,c)};
 F.restore=async ids=>{const c=F.compostId();let n=0;for(const id of ids){const m=M.get(id);if(!m||!c||m.p!==c)continue;let d=m.op&&M.get(m.op);if(!d||d.t!=='d'||isC(d.id)||!canW(d))d=M.get(dirId(F.home(),'documents'))||M.get(F.home());const on=m.on||m.n;delete m.op;delete m.dt;delete m.on;await R.move([id],d.id);if(m.n!==on&&!K.get(d.id).has(on.toLowerCase()))await R.rename(id,on);n++}return n};
 F.purge=async ids=>{const c=F.compostId();ids.forEach(id=>{const m=M.get(id);if(!m||!c||m.p!==c)deny(m)});return R.del(ids)};
 F.emptyCompost=async()=>{const c=F.compostId();if(!c)return 0;const ids=[...K.get(c).values()];await R.del(ids);return ids.length};
 F.sweep=async()=>{const c=F.compostId(),d=parseInt(typeof S!=='undefined'&&S.compost,10);if(!c||!d)return;const lim=Date.now()-d*864e5,old=[...K.get(c).values()].filter(id=>{const m=M.get(id);return m&&m.dt&&m.dt<lim});if(old.length)await R.del(old)};
 F.removeHome=async p=>{if(p.home&&M.has(p.home))await R.del([p.home]);delete lastCfg[p.id]};
 F.renameHome=async p=>{try{const h=p.home&&M.get(p.home);if(h&&!p.root&&sane(p.name)!==h.n){const n=F.uniq(h.p,sane(p.name),h.id);await R.rename(h.id,n)}}catch(e){console.error(e)}};
 const lastCfg={},CK=['avatar','letters','bg','lockbg','prefs'],cfgDir=p=>{const h=p.home&&M.get(p.home);return h&&dirId(h.id,'.config')};
 const cfgStr=p=>{const o={format:'reitzel-user',version:1,name:p.name};CK.forEach(k=>o[k]=p[k]===undefined?null:p[k]);return JSON.stringify(o)};F.cfgSynced=p=>lastCfg[p.id]===cfgStr(p);F.flushCfg=()=>{try{(typeof S!=='undefined'?S.profiles:[]).forEach(p=>F.writeCfg(p))}catch{}};
 const cq={};F.writeCfg=p=>{const run=async()=>{try{const c=cfgDir(p);if(!c)return;const t=cfgStr(p);if(lastCfg[p.id]===t)return;try{JSON.parse(t)}catch{return}const f=dirId(c,'user.syst'),b=new Blob([t]);
  const bk=dirId(c,'user.bak');if(f){const cur=await(await R.blob(f)).text();try{JSON.parse(cur);if(bk)await R.write(null,null,new Blob([cur]),bk,0,'cfg');else await R.write(c,'user.bak',new Blob([cur]),null,0,'cfg')}catch{}}
  if(f)await R.write(null,null,b,f,0,'cfg');else await R.write(c,'user.syst',b,null,0,'cfg');const old=dirId(c,'user.json');if(old)await R.del([old]);lastCfg[p.id]=t;F.onCfg&&F.onCfg()}catch(e){console.error('cfg',e)}};
  return cq[p.id]=(cq[p.id]||Promise.resolve()).then(run,run)};
 F.readCfg=async p=>{try{const c=cfgDir(p),cur=c&&dirId(c,'user.syst'),leg=c&&dirId(c,'user.json'),bak=c&&dirId(c,'user.bak');let f=cur||leg,t,j;const parse=async id=>{try{const x=await(await R.blob(id)).text(),y=JSON.parse(x);return y&&y.format==='reitzel-user'?[x,y]:null}catch{return null}};
  let r=f&&await parse(f);if(!r&&bak){r=await parse(bak);if(r)console.warn('user.syst unreadable — restored from backup')}if(!r){if(f||bak)delete lastCfg[p.id],await F.writeCfg(p);return false}[t,j]=r;
  const str=v=>typeof v==='string'||v===null,U=v=>v===undefined;if(str(j.avatar)&&U(p.avatar))p.avatar=j.avatar;if(str(j.bg)&&U(p.bg))p.bg=j.bg;if(str(j.lockbg)&&U(p.lockbg))p.lockbg=j.lockbg;if(typeof j.letters==='boolean'&&U(p.letters))p.letters=j.letters;if(j.prefs&&typeof j.prefs==='object'&&!Array.isArray(j.prefs)&&(U(p.prefs)||(j.prefs._t||0)>((p.prefs&&p.prefs._t)||0)))p.prefs=j.prefs;if(cur&&cfgStr(p)===t)lastCfg[p.id]=t;else{delete lastCfg[p.id];await F.writeCfg(p)}return true}catch(e){console.error('cfg read',e);return false}};
 F.boot=async S=>{const P=S.profiles;if(!P.length)return;if(!P.some(p=>p.root))P[0].root=true;P.forEach(p=>{if(p.root)p.admin=true});
  const legacy=!S.fsv,rp=P.find(p=>p.root);
  for(const p of[rp,...P.filter(x=>x!==rp)])await F.provision(p,!(legacy&&p===rp));
  if(legacy){const hd=rp.home,keep=new Set(['.system','home','root']);
   for(const n of[...K.get('root').keys()]){if(keep.has(n))continue;const id=K.get('root').get(n),tgt=LEG.has(n)?dirId(hd,n):hd;if(LEG.has(n)&&M.get(id).t==='d'){const ch=[...K.get(id).values()];if(ch.length)await R.move(ch,tgt);await R.del([id])}else await R.move([id],hd)}
   const d=dirId(hd,'desktop'),legacyDesk=(S.desk||[]).filter(x=>x&&!x.fsc&&x.app&&Number.isInteger(x.c)&&Number.isInteger(x.r));let j=null,f=dirId(d,'shortcuts.syst');
   if(f)try{j=JSON.parse(await(await R.blob(f)).text())}catch{j=null}
   if(!j||!Array.isArray(j.shortcuts)){if(f)j=null;j={format:'reitzel-shortcuts',version:1,shortcuts:legacyDesk.length||f?[]:DEFSC()}}
   legacyDesk.forEach(x=>{if(!j.shortcuts.some(y=>y.kind==='app'&&y.target===x.app))j.shortcuts.push({name:x.name||APPN[x.app]||x.app,target:x.app,kind:'app',c:x.c,r:x.r})});
   if(f&&j.shortcuts.length||!f)await R.write(f?null:d,f?null:'shortcuts.syst',new Blob([shJSON(j.shortcuts)]),f||null);
   S.desk=[];S.fsv=2;for(const p of P)await F.writeCfg(p)}
  else for(const p of P)await F.readCfg(p)};
return F})();
FS.ready=FS.init();
/* ---------- zip (native: CRC32 + optional browser deflate) ---------- */
const ZIP=(()=>{const T=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;T[n]=c>>>0}
 const crc=u=>{let c=-1;for(let i=0;i<u.length;i++)c=T[(c^u[i])&255]^(c>>>8);return(c^-1)>>>0};
 const defl=async u=>{if(typeof CompressionStream==='undefined'||u.length<64)return null;try{return new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer())}catch{return null}};
 const infl=async u=>new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
 const dt=ms=>{const d=new Date(ms);return[(d.getHours()<<11|d.getMinutes()<<5|d.getSeconds()>>1)&65535,((d.getFullYear()-1980)<<9|(d.getMonth()+1)<<5|d.getDate())&65535]};
 const enc=new TextEncoder(),dec=new TextDecoder();
 // entries: [{path,dir,blob,m}]
 async function build(entries){const parts=[],cd=[];let off=0;
  for(const e of entries){const nm=enc.encode(e.path+(e.dir&&!e.path.endsWith('/')?'/':'')),[tm,dd]=dt(e.m||Date.now());let raw=new Uint8Array(e.dir?0:await e.blob.arrayBuffer()),c=crc(raw),data=raw,meth=0;
   if(!e.dir){const z=await defl(raw);if(z&&z.length<raw.length){data=z;meth=8}}
   const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(8,meth,true);h.setUint16(10,tm,true);h.setUint16(12,dd,true);h.setUint32(14,c,true);h.setUint32(18,data.length,true);h.setUint32(22,raw.length,true);h.setUint16(26,nm.length,true);
   parts.push(h.buffer,nm,data);const g=new DataView(new ArrayBuffer(46));g.setUint32(0,0x02014b50,true);g.setUint16(4,20,true);g.setUint16(6,20,true);g.setUint16(8,0x800,true);g.setUint16(10,meth,true);g.setUint16(12,tm,true);g.setUint16(14,dd,true);g.setUint32(16,c,true);g.setUint32(20,data.length,true);g.setUint32(24,raw.length,true);g.setUint16(28,nm.length,true);g.setUint32(38,e.dir?16:0,true);g.setUint32(42,off,true);cd.push(g.buffer,nm);
   off+=30+nm.length+data.length}
  let cs=0;cd.forEach(x=>cs+=x.byteLength);const z=new DataView(new ArrayBuffer(22));z.setUint32(0,0x06054b50,true);z.setUint16(8,entries.length,true);z.setUint16(10,entries.length,true);z.setUint32(12,cs,true);z.setUint32(16,off,true);
  return new Blob([...parts,...cd,z.buffer],{type:'application/zip'})}
 async function read(blob){const u=new Uint8Array(await blob.arrayBuffer()),v=new DataView(u.buffer);let e=-1;for(let i=u.length-22;i>=Math.max(0,u.length-65558);i--)if(v.getUint32(i,true)===0x06054b50){e=i;break}
  if(e<0)throw Error('Not a valid zip');const n=v.getUint16(e+10,true);let p=v.getUint32(e+16,true);const out=[];
  for(let i=0;i<n;i++){if(v.getUint32(p,true)!==0x02014b50)throw Error('Corrupt zip');const fl=v.getUint16(p+8,true),me=v.getUint16(p+10,true),cs=v.getUint32(p+20,true),nl=v.getUint16(p+28,true),xl=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),lo=v.getUint32(p+42,true),name=dec.decode(u.subarray(p+46,p+46+nl));
   const ln=v.getUint16(lo+26,true),lx=v.getUint16(lo+28,true),ds=lo+30+ln+lx,raw=u.subarray(ds,ds+cs);out.push({name,dir:name.endsWith('/'),get:async()=>new Blob([me===8?await infl(raw):raw])});p+=46+nl+xl+cl}
  return out}
 return{build,read}})();
