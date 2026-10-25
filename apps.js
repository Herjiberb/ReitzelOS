'use strict';
/* ===== Reitzel OS: virtual file system (IndexedDB), My Files, Text Editor, App Store ===== */
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
  async syncSys(){try{let sys=M.get(K.get('root').get('.system'));let as=K.get(sys.id).get('assets');as=as?M.get(as):await R.mkdir(sys.id,'assets',1);
   const files=['index.html','style.css','os.js','apps.js','apps2.js','sw.js'],assets=['reitzel','folder','folder-single','compass-settings','network','editor','file-image','file-generic','file-scout','tote-store','terminal','cloud-export'].map(x=>x+'-icon.svg');
   for(const[par,list,pf]of[[sys,files,''],[as,assets,'assets/']])for(const f of list){try{const r=await fetch(pf+f);if(!r.ok)continue;const b=await r.blob(),old=K.get(par.id).get(f);
    if(old&&M.get(old).s===b.size)continue;if(old)await R.write(null,f,b,old);else await R.write(par.id,f,b,null,1)}catch{}}
   }catch(e){console.error('sys sync',e)}}
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
 F.writeCfg=async p=>{try{const c=cfgDir(p);if(!c)return;const t=cfgStr(p);if(lastCfg[p.id]===t)return;const f=dirId(c,'user.syst'),b=new Blob([t]);if(f)await R.write(null,null,b,f,0,'cfg');else await R.write(c,'user.syst',b,null,0,'cfg');const old=dirId(c,'user.json');if(old)await R.del([old]);lastCfg[p.id]=t;F.onCfg&&F.onCfg()}catch(e){console.error('cfg',e)}};
 F.readCfg=async p=>{try{const c=cfgDir(p),cur=c&&dirId(c,'user.syst'),leg=c&&dirId(c,'user.json'),f=cur||leg;if(!f)return false;const t=await(await R.blob(f)).text(),j=JSON.parse(t);if(!j||j.format!=='reitzel-user')return false;
  const str=v=>typeof v==='string'||v===null;if(str(j.avatar))p.avatar=j.avatar;if(str(j.bg))p.bg=j.bg;if(str(j.lockbg))p.lockbg=j.lockbg;if(typeof j.letters==='boolean')p.letters=j.letters;if(j.prefs&&typeof j.prefs==='object'&&!Array.isArray(j.prefs))p.prefs=j.prefs;if(cur)lastCfg[p.id]=cfgStr(p);else await F.writeCfg(p);return true}catch(e){console.error('cfg read',e);return false}};
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
/* ---------- shared helpers ---------- */
const EXT=n=>{const i=n.lastIndexOf('.');return i>0?n.slice(i+1).toLowerCase():''};
const IMG=new Set('png jpg jpeg jpe jfif gif webp bmp svg ico avif apng cur'.split(' ')),VID=new Set('mp4 webm ogv mov m4v'.split(' ')),AUD=new Set('mp3 wav ogg oga m4a flac aac opus'.split(' '));
const TXT=new Set('syst txt md markdown json js mjs css html htm xml csv tsv log ini cfg conf yml yaml toml ts tsx jsx py sh bat c h cpp hpp java rs go rb php sql svg lua srt tex'.split(' '));
const MIME={svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',bmp:'image/bmp',ico:'image/x-icon',avif:'image/avif',mp4:'video/mp4',webm:'video/webm',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',txt:'text/plain'};
const fmtSz=b=>b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':b<1073741824?(b/1048576).toFixed(1)+' MB':(b/1073741824).toFixed(2)+' GB';
const fmtDt=t=>{const d=new Date(t);return d.toLocaleDateString([],{year:'numeric',month:'short',day:'numeric'})+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})};
const typeOf=m=>m.t==='d'?'Folder':(EXT(m.n)?EXT(m.n).toUpperCase()+' file':'File');
const iconOf=(m,small)=>m.t==='d'?(small?'folder-single':'folder'):IMG.has(EXT(m.n))?'file-image':EXT(m.n)==='txt'?'editor':'file-generic';
function modal(host,o,cb){const ov=H('div','md',host),b=H('div','mdb',ov);H('h4','',b).textContent=o.title;if(o.msg)H('p','',b).textContent=o.msg;let i;
 if(o.input!=null){i=H('input','in',b);i.value=o.input;setTimeout(()=>{i.focus();i.setSelectionRange(0,o.sel??i.value.length)},20)}
 if(o.build)o.build(b);const r=H('div','mdr',b),close=()=>ov.remove();
 if(o.cancel!==false)H('button','btn',r,'Cancel').onclick=()=>{close();o.onCancel&&o.onCancel()};
 (o.btns||['OK']).forEach((l,k,a)=>{const x=H('button','btn'+(k===a.length-1?' pri':''),r,l);x.onclick=()=>{const v=i?i.value:undefined;if(cb(l,v,close)!==false)close()}});
 ov.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape')close();if(e.key==='Enter'&&i){r.lastChild.click()}};ov.onpointerdown=e=>e.stopPropagation();return close}
/* custom dropdown */
const DEXTS=[['.txt','.txt'],['.md','.md'],['.json','.json'],['.js','.js'],['.css','.css'],['.html','.html'],['.csv','.csv'],['.log','.log'],['.xml','.xml'],['','All files (keep name)']];
function dropdown(opts,val,onch){const b=document.createElement('button');b.type='button';b.className='dd';
 const set=v=>{b.value=v;const o=opts.find(x=>x[0]===v)||opts[0];b.innerHTML='<span></span><i>▾</i>';b.firstChild.textContent=o[1]};b.set=set;set(val);
 b.onclick=e=>{e.stopPropagation();const old=document.querySelector('.ddm');if(old){old.remove();return}const r=b.getBoundingClientRect(),m=H('div','ddm',document.body);
  opts.forEach(([v,l])=>{const x=H('button',v===b.value?'on':'',m);x.textContent=l;x.onclick=ev=>{ev.stopPropagation();set(v);m.remove();onch&&onch(v)}});
  m.style.minWidth=r.width+'px';m.style.left=Math.min(r.left,innerWidth-m.offsetWidth-8)+'px';const h=m.offsetHeight;m.style.top=(r.bottom+h+8>innerHeight?Math.max(8,r.top-h-4):r.bottom+4)+'px';
  const cl=ev=>{if(!m.isConnected){removeEventListener('pointerdown',cl,true);return}if(m.contains(ev.target)||b.contains(ev.target))return;m.remove();removeEventListener('pointerdown',cl,true)};addEventListener('pointerdown',cl,true)};
 return b}
/* temporary modal "Save As / Open" window built on My Files */
const fmApp=()=>APPS[S.defFm]&&APPS[S.defFm].fm?S.defFm:'files';
const COMPOST={names:ms=>ms.length===1?'"'+ms[0].n+'"':ms.length+' items',
 async restore(ms,done){if(!await sysConfirm({title:'Restore from the compost bin?',msg:COMPOST.names(ms)+' will go back where '+(ms.length===1?'it':'they')+' came from.',ok:'Restore'}))return;try{const n=await FS.restore(ms.map(m=>m.id));RZ.toast('Restored '+n+' item'+(n===1?'':'s'));done&&done()}catch(x){RZ.toast(x.message||String(x))}},
 async purge(ms,done){if(!await sysConfirm({title:'Delete permanently?',msg:COMPOST.names(ms)+' will be erased for good. This cannot be undone.',ok:'Delete forever',danger:1}))return;try{await FS.purge(ms.map(m=>m.id));done&&done()}catch(x){RZ.toast(x.message||String(x))}},
 async empty(done){const c=FS.compostId(),n=c?FS.K.get(c).size:0;if(!n)return RZ.toast('The compost bin is already empty');
  if(!await sysConfirm({title:'Empty the compost bin?',msg:'Warning: all '+n+' item'+(n===1?'':'s')+' in the compost bin will be permanently deleted.',ok:'Continue',danger:1}))return;
  if(!await sysConfirm({title:'Are you sure?',msg:'This cannot be undone. Everything in the compost bin will be gone forever.',ok:'Yes, delete everything',danger:1}))return;
  try{await FS.emptyCompost();RZ.toast('Compost bin emptied');done&&done()}catch(x){RZ.toast(x.message||String(x))}}};
setTimeout(()=>{const sw=()=>FS.sweep().catch(()=>{});FS.ready.then(()=>{sw();setInterval(sw,6e5)})},3000);
function fileDialog(parent,o,cb){o.cb=cb;const bl=H('div','',parent.el);bl.style.cssText='position:absolute;inset:0;z-index:50;background:#0007;border-radius:inherit';
 const fa=APPS[S.defFm],d=openApp(fa&&fa.fm&&fa.dlgApp&&APPS[fa.dlgApp]?fa.dlgApp:'fsdlg',{tab:o});$('.tbar span',d.el).textContent=o.title;d.onclose=()=>bl.remove();bl.onpointerdown=e=>{e.stopPropagation();focusW(d)};
 d.el.querySelectorAll('.m,.mx,.rz').forEach(x=>x.remove());$('.tbar',d.el).ondblclick=null;
 const p=parent.el.getBoundingClientRect();d.el.style.left=Math.max(0,p.left+(p.width-d.el.offsetWidth)/2)+'px';d.el.style.top=Math.max(0,p.top+(p.height-d.el.offsetHeight)/2)+'px';return d}
/* ---------- clipboard & thumbnails ---------- */
const FSclip={ids:[],cut:false};
const THC=new Map(),thq=[];let thr=0;
function thumb(m,img,px){const k=m.id+m.m+px,c=THC.get(k);if(c){img.src=c;img.style.objectFit='cover';img.style.borderRadius='8px';return}thq.push([m,img,px,k]);pump()}
async function pump(){while(thr<3&&thq.length){const[m,img,px,k]=thq.shift();if(!img.isConnected)continue;thr++;(async()=>{try{const b=await FS.blob(m.id);let u=null;
 try{const bm=await createImageBitmap(b.type?b:new Blob([b],{type:MIME[EXT(m.n)]||''}),{resizeWidth:px,resizeQuality:'low'}),cv=document.createElement('canvas');cv.width=bm.width;cv.height=bm.height;cv.getContext('2d').drawImage(bm,0,0);bm.close&&bm.close();const tb=await new Promise(r=>cv.toBlob(r,'image/webp',.8));u=URL.createObjectURL(tb)}
 catch{if(b.size<8e6&&['svg','ico','cur'].includes(EXT(m.n)))u=URL.createObjectURL(new Blob([b],{type:MIME[EXT(m.n)]||'image/svg+xml'}))}
 if(u){THC.set(k,u);if(THC.size>500){const f=THC.keys().next().value;URL.revokeObjectURL(THC.get(f));THC.delete(f)}img.onerror=()=>{img.style.objectFit='';img.src=IC('file-image')};img.style.objectFit='cover';img.style.borderRadius='8px';img.src=u}}catch{}thr--;pump()})()}}
/* ---------- text editor bridge ---------- */
function openInEditor(id){const w=W.find(x=>x.app==='editor');if(w){focusW(w);w.edOpen(id)}else openApp('editor',{tab:id})}
/* ---------- My Files ---------- */
const FMV={list:{w:0,h:30},large:{w:132,h:150,i:96},medium:{w:100,h:112,i:64},small:{w:78,h:86,i:36}};
function renderFiles(body,w,dlg){const P=S.fm||(S.fm={view:'medium',hidden:false,ext:true}),st={cur:FS.home(),hist:[FS.home()],hi:0,q:'',items:[],sel:new Set(),anchor:-1,sort:{k:'n',d:1},tok:0};
 body.innerHTML=`<div class=fm><div class=fm-top><button class=bk title=Back>←</button><button class=fw title=Forward>→</button><button class=up title="Up">↑</button><input class="in fm-addr" spellcheck=false placeholder="Search here, or type a path starting with /"><span class=vwh></span><button class=hd title="Show hidden files">Hidden</button><button class=ex title="Show file extensions">.ext</button></div><div class=fm-main><div class=fm-side></div><div class=fm-view><div class=fm-hd></div><div class=fm-vs><div class=fm-sp></div></div></div></div>${dlg?'<div class=fm-dlg></div>':''}<div class=fm-st><span class=s1></span><span class=s2></span></div></div>`;
 const q=s=>$(s,body),addr=q('.fm-addr'),vs=q('.fm-vs'),sp=q('.fm-sp'),hd=q('.fm-hd'),fm=q('.fm'),rendered=new Map();let cols=1,dim=FMV[P.view],raf=0;
 const eb=H('button','btn dng',q('.fm-top'),'Empty compost bin'),inC=()=>FS.inCompost(st.cur);eb.style.display='none';eb.onclick=()=>COMPOST.empty(load);
 const nameOf=m=>P.ext||m.t==='d'?m.n:FS.split(m.n)[0];
 const ro=()=>!!FS.get(st.cur).ro,pathTxt=()=>FS.path(st.cur);
 const cmp=()=>{const{k,d}=st.sort,C=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});return(a,b)=>{if(a.t!==b.t)return a.t==='d'?-1:1;let r=k==='s'?(a.s||0)-(b.s||0):k==='m'?a.m-b.m:k==='t'?C.compare(EXT(a.n),EXT(b.n)):C.compare(a.n,b.n);return(r||C.compare(a.n,b.n))*d}};
 function load(){eb.style.display=inC()&&!dlg?'':'none';let it=st.q?FS.search(st.cur,st.q,P.hidden):FS.kids(st.cur).filter(m=>P.hidden||m.n[0]!=='.');it.sort(cmp());st.items=it;const keep=new Set(it.map(m=>m.id));[...st.sel].forEach(i=>keep.has(i)||st.sel.delete(i));full()}
 function full(){rendered.forEach(e=>e.remove());rendered.clear();dim=FMV[P.view];hd.className='fm-hd'+(P.view==='list'?' list':'');if(P.view==='list'){const c=st.q?'Location':'Modified';hd.style.gridTemplateColumns=lc();hd.innerHTML=`<span data-k=n>Name</span><span data-k=m>${c}</span><span data-k=t>Type</span><span data-k=s>Size</span>`;hd.querySelectorAll('span').forEach(s=>s.onclick=()=>{const k=s.dataset.k;st.sort=st.sort.k===k?{k,d:-st.sort.d}:{k,d:1};load()})}
  vs.scrollTop=Math.min(vs.scrollTop,1e9);const em=q('.fm-empty');em&&em.remove();if(!st.items.length)H('div','fm-empty',vs.parentNode.querySelector('.fm-vs'),st.q?'No matches':'This folder is empty').style.pointerEvents='none';draw();stat()}
 const lc=()=>'minmax(120px,1fr) 150px 90px 80px';
 function draw(){raf=0;const n=st.items.length,wd=vs.clientWidth;cols=P.view==='list'?1:Math.max(1,Math.floor((wd-8)/dim.w));const rows=Math.ceil(n/cols);sp.style.height=rows*dim.h+8+'px';
  const a=Math.max(0,Math.floor(vs.scrollTop/dim.h)-2),b=Math.min(rows,Math.ceil((vs.scrollTop+vs.clientHeight)/dim.h)+2),lo=a*cols,hi=Math.min(n,b*cols);
  rendered.forEach((e,i)=>{if(i<lo||i>=hi){e.remove();rendered.delete(i)}});const sx=P.view==='list'?0:(wd-cols*dim.w)/2;
  for(let i=lo;i<hi;i++){if(rendered.has(i))continue;const m=st.items[i],e=mk(m);e.dataset.i=i;e.style.top=4+Math.floor(i/cols)*dim.h+'px';if(P.view!=='list'){e.style.left=sx+(i%cols)*dim.w+'px';e.style.width=dim.w+'px';e.style.height=dim.h+'px'}else e.style.height=dim.h+'px';vs.append(e);rendered.set(i,e)}}
 function mk(m){const list=P.view==='list',e=H('div',(list?'fr':'fi')+(st.sel.has(m.id)?' sel':'')+(FSclip.cut&&FSclip.ids.includes(m.id)?' cut':''));e.dataset.id=m.id;e.title=FS.path(m.id)+(m.t==='f'?'  ·  '+fmtSz(m.s):'');
  const isImg=m.t==='f'&&IMG.has(EXT(m.n));
  if(list){e.style.gridTemplateColumns=lc();e.innerHTML=`<div class=nm><img src="${IC(iconOf(m,1))}"><b></b></div><span class=dm></span><span class=dm></span><span class=dm></span>`;$('b',e).textContent=nameOf(m);const s=e.querySelectorAll('.dm');s[0].textContent=st.q?FS.path(m.p):fmtDt(m.m);s[1].textContent=typeOf(m);s[2].textContent=m.t==='f'?fmtSz(m.s):''}
  else{const im=H('img','',e);im.src=IC(iconOf(m));im.style.cssText=`width:${dim.i}px;height:${dim.i}px`;H('span','',e).textContent=nameOf(m);if(isImg){const px=dim.i*2;im.onerror=null;thumb(m,im,px)}}
  return e}
 const sched=()=>{if(!raf)raf=requestAnimationFrame(draw)};vs.addEventListener('scroll',sched);new ResizeObserver(sched).observe(vs);
 const paint=()=>{dlgSync();rendered.forEach((e,i)=>{const m=st.items[i];e.classList.toggle('sel',!!m&&st.sel.has(m.id));e.classList.toggle('cut',!!m&&FSclip.cut&&FSclip.ids.includes(m.id))});stat()};
 function stat(){const n=st.items.length,sn=st.sel.size;let t=n+' item'+(n===1?'':'s');if(st.q)t=n+' result'+(n===1?'':'s')+' for “'+st.q+'” in '+pathTxt();if(sn){let sz=0;st.sel.forEach(i=>{const m=FS.get(i);if(m&&m.t==='f')sz+=m.s});t+=' · '+sn+' selected'+(sz?' ('+fmtSz(sz)+')':'')}q('.s1').textContent=t;q('.s2').textContent=ro()?'Read-only system location':''}
 function side(){const s=q('.fm-side');s.innerHTML='<small>Places</small>';const pl=[['Home',FS.home(),'folder-single']];['Desktop','Documents','Pictures','Downloads'].forEach(n=>{const i=FS.K.get(FS.home()).get(n.toLowerCase());i&&pl.push([n,i,'folder-single'])});pl.push(['File system','root','folder']);if(!dlg){const ci=FS.compostId();ci&&pl.push(['Compost bin',ci,'folder-single'])}pl.forEach(([n,id,ic])=>{const b=H('button',FS.isIn(st.cur,id)&&(id!=='root'||st.cur==='root')&&(id!==FS.home()||st.cur===id||!pl.some(x=>x[1]!==id&&x[1]!=='root'&&FS.isIn(st.cur,x[1])))?'on':'',s,`<img src="${IC(ic)}"><span>${n}</span>`);b.onclick=()=>go(id)})}
 function go(id,nh){if(!FS.get(id))id=FS.home();if(dlg&&FS.inCompost(id))return RZ.toast('The compost bin is not available here');st.cur=id;st.q='';st.sel.clear();st.anchor=-1;if(!nh){st.hist=st.hist.slice(0,st.hi+1);if(st.hist[st.hi]!==id){st.hist.push(id);st.hi++}}addr.value=pathTxt();vs.scrollTop=0;side();nav();load()}
 function nav(){q('.bk').disabled=st.hi<=0;q('.fw').disabled=st.hi>=st.hist.length-1;q('.up').disabled=st.cur==='root'}
 q('.bk').onclick=()=>{if(st.hi>0)go(st.hist[--st.hi],1)};q('.fw').onclick=()=>{if(st.hi<st.hist.length-1)go(st.hist[++st.hi],1)};q('.up').onclick=()=>go(FS.get(st.cur).p||'root');
 const tog=(b,k)=>{b.classList.toggle('on',!!P[k]);b.onclick=()=>{P[k]=!P[k];b.classList.toggle('on',!!P[k]);save();load()}};tog(q('.hd'),'hidden');tog(q('.ex'),'ext');q('.vwh').replaceWith(dropdown([['list','List'],['large','Large'],['medium','Medium'],['small','Small']],P.view,v=>{P.view=v;save();full()}));
 /* address bar = path box + search */
 let sT=0;const setQ=v=>{st.q=v;st.sel.clear();vs.scrollTop=0;load()};
 addr.onfocus=()=>addr.select();addr.onblur=()=>{if(!st.q)addr.value=pathTxt()};
 addr.oninput=()=>{const v=addr.value;clearTimeout(sT);if(v.startsWith('/')||v.startsWith('~')){if(st.q){st.q='';load()}return}sT=setTimeout(()=>setQ(v.trim()),60)};
 addr.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){const v=addr.value.trim(),id=v.startsWith('~')?FS.resolve(v.slice(1)||'/'):FS.resolve(v,st.cur);if(id&&FS.get(id).t==='d'){go(id);addr.blur()}else if(v.startsWith('/'))RZ.toast('Path not found')}
  else if(e.key==='Escape'){st.q='';addr.value=pathTxt();addr.blur();load()}else if(e.key==='ArrowDown'){e.preventDefault();vs.focus()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){e.preventDefault();addr.select()}};
 w.fmFind=()=>{addr.focus();addr.value='';addr.oninput()};
 /* selection */
 const idxOf=e=>{const t=e.target.closest('.fi,.fr');return t?+t.dataset.i:-1};
 vs.tabIndex=0;vs.style.outline='none';
 vs.addEventListener('pointerdown',e=>{if(e.button===2&&idxOf(e)>=0&&st.sel.has(st.items[idxOf(e)].id))return;if(e.button>2)return;const i=idxOf(e),ctl=e.ctrlKey||e.metaKey;
  if(i<0){if(!ctl){st.sel.clear();paint()}return}const m=st.items[i];if(e.shiftKey&&st.anchor>=0){const a=Math.min(st.anchor,i),b=Math.max(st.anchor,i);if(!ctl)st.sel.clear();for(let k=a;k<=b;k++)st.sel.add(st.items[k].id)}else if(ctl){st.sel.has(m.id)?st.sel.delete(m.id):st.sel.add(m.id);st.anchor=i}else{st.sel.clear();st.sel.add(m.id);st.anchor=i}paint()});
 vs.addEventListener('dblclick',e=>{const i=idxOf(e);if(i>=0)openItem(st.items[i])});
 /* rubber-band selection using index math (virtual-safe) */
 vs.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('.fi,.fr'))return;const r=vs.getBoundingClientRect(),x0=e.clientX-r.left+vs.scrollLeft,y0=e.clientY-r.top+vs.scrollTop,base=new Set(e.ctrlKey?st.sel:[]),bd=H('div','band',vs);bd.style.cssText='position:absolute;pointer-events:none;border:1px solid var(--b);background:#ffffff18;z-index:3';vs.setPointerCapture(e.pointerId);
  const mv=ev=>{const x1=ev.clientX-r.left+vs.scrollLeft,y1=ev.clientY-r.top+vs.scrollTop,xa=Math.min(x0,x1),xb=Math.max(x0,x1),ya=Math.min(y0,y1),yb=Math.max(y0,y1);Object.assign(bd.style,{left:xa+'px',top:ya+'px',width:xb-xa+'px',height:yb-ya+'px'});
   st.sel=new Set(base);const wd=vs.clientWidth,sx=P.view==='list'?0:(wd-cols*dim.w)/2,r0=Math.max(0,Math.floor((ya-4)/dim.h)),r1=Math.floor((yb-4)/dim.h);for(let rr=r0;rr<=r1;rr++)for(let c=0;c<cols;c++){const i=rr*cols+c;if(i>=st.items.length)break;if(P.view!=='list'){const l=sx+c*dim.w;if(l>xb||l+dim.w<xa)continue}st.sel.add(st.items[i].id)}paint()};
  vs.onpointermove=mv;vs.onpointerup=()=>{bd.remove();vs.onpointermove=vs.onpointerup=null}});
 /* open */
 function view(m){const ov=H('div','ov',fm),h=H('div','oh',ov),b=H('div','ob',ov);H('b','',h).textContent=m.n+'  ·  '+fmtSz(m.s);const x=H('button','btn',h,'Close');let url;const close=()=>{url&&URL.revokeObjectURL(url);ov.remove()};x.onclick=close;ov.tabIndex=0;ov.onkeydown=e=>{if(e.key==='Escape')close()};ov.focus();
  const bad=()=>{b.innerHTML='';const n=H('div','nop',b,`<img src="${IC('file-generic')}"><div>Could not preview this file</div>`);H('button','btn pri',n,'Open in Text Editor').onclick=()=>{close();openInEditor(m.id)}};
  FS.blob(m.id).then(bl=>{const e=EXT(m.n);url=URL.createObjectURL(bl.type?bl:new Blob([bl],{type:MIME[e]||''}));
   if(IMG.has(e)){const i=H('img','',b);i.onerror=bad;i.onclick=()=>i.classList.toggle('up');i.src=url}else if(VID.has(e)){const v=H('video','',b);v.controls=1;v.onerror=bad;v.src=url}else if(AUD.has(e)){const a=H('audio','',b);a.controls=1;a.onerror=bad;a.src=url}else bad()})}
 function openItem(m){if(!m)return;if(inC())return askRestore(m);if(dlg){if(m.t==='d')return go(m.id);st.sel=new Set([m.id]);paint();return dlgOk()}if(m.t==='d')return go(m.id);const e=EXT(m.n);if(e==='zip')return askExtract(m);if(IMG.has(e)&&e!=='svg'||VID.has(e)||AUD.has(e))return view(m);if(TXT.has(e)||e===''||e==='svg')return e==='svg'?view(m):openInEditor(m.id);view(m)}
 /* actions */
 const err=x=>RZ.toast(x.message||String(x)),sels=()=>st.items.filter(m=>st.sel.has(m.id)),chk=()=>{if(ro()){RZ.toast('This location is read-only');return false}return true};
 const reselect=ids=>{load();st.sel=new Set(ids);paint();const i=st.items.findIndex(m=>st.sel.has(m.id));if(i>=0){const t=Math.floor(i/cols)*dim.h;if(t<vs.scrollTop||t>vs.scrollTop+vs.clientHeight-dim.h)vs.scrollTop=t-dim.h}};
 const newFolder=()=>chk()&&modal(fm,{title:'New folder',input:'New folder'},(l,v)=>{v=v.trim();if(!FS.valid(v)){RZ.toast('Invalid name');return false}FS.mkdir(st.cur,v).then(m=>reselect([m.id]),err)});
 const newText=()=>chk()&&modal(fm,{title:'New text file',input:'New text file.txt',sel:13},(l,v)=>{v=v.trim();if(!FS.valid(v)){RZ.toast('Invalid name');return false}FS.write(st.cur,v,new Blob([])).then(m=>reselect([m.id]),err)});
 const doRename=m=>{if(m.ro)return RZ.toast('System files cannot be renamed');modal(fm,{title:'Rename',input:m.n,sel:m.t==='d'?m.n.length:FS.split(m.n)[0].length},(l,v)=>{v=v.trim();if(v===m.n)return;FS.rename(m.id,v).then(()=>reselect([m.id]),err)})};
 let arT=0;const askRestore=m=>{if(arT)return;arT=1;setTimeout(()=>arT=0,0);const l=sels();COMPOST.restore(l.length>1&&st.sel.has(m.id)?l:[m],()=>{st.sel.clear();load()})};
 const del=()=>{const s=sels();if(!s.length)return;if(inC())return COMPOST.purge(s,()=>{st.sel.clear();load()});if(!chk())return;if(s.some(m=>m.ro))return RZ.toast('System files cannot be deleted');const run=()=>FS.trash(s.map(m=>m.id)).then(()=>{st.sel.clear();load();RZ.toast(S.compost==='now'?'Deleted':'Moved to the compost bin')},err);if(S.compost==='now')modal(fm,{title:'Delete',msg:`Permanently delete ${s.length===1?'"'+s[0].n+'"':s.length+' items'}? This cannot be undone.`,btns:['Delete']},run);else run()};
 const copy=cut=>{const s=sels();if(!s.length||inC())return;if(cut&&(!chk()||s.some(m=>m.ro)))return RZ.toast('Cannot cut read-only items');FSclip.ids=s.map(m=>m.id);FSclip.cut=cut;paint();RZ.toast((cut?'Cut ':'Copied ')+s.length+' item'+(s.length>1?'s':''))};
 const paste=async()=>{if(!FSclip.ids.length||!chk())return;const ids=FSclip.ids.filter(i=>FS.get(i));try{let nn;if(FSclip.cut){nn=ids.filter(i=>FS.get(i).p!==st.cur);await FS.move(nn,st.cur);FSclip.ids=[];FSclip.cut=false}else{await FS.copy(ids,st.cur)}RZ.toast('Pasted');load();W.forEach(x=>x.fmRefresh&&x.fmRefresh())}catch(x){err(x)}};
 const zipSel=()=>{const s=sels();if(!s.length||!chk())return;modal(fm,{title:'Add to zip',msg:'Name of the zip file:',input:(s.length===1?FS.split(s[0].n)[0]:'Archive')+'.zip',sel:s.length===1?FS.split(s[0].n)[0].length:7},async(l,v)=>{v=v.trim();if(!FS.valid(v)){RZ.toast('Invalid name');return false}if(!/\.zip$/i.test(v))v+='.zip';RZ.toast('Zipping…');try{const ent=[],rec=async(m,pre)=>{const p=pre+m.n;if(m.t==='d'){ent.push({path:p+'/',dir:1,m:m.m});for(const c of FS.kids(m.id))await rec(c,p+'/')}else ent.push({path:p,blob:await FS.blob(m.id),m:m.m})};for(const m of s)await rec(m,'');const z=await ZIP.build(ent),f=await FS.write(st.cur,v,z);reselect([f.id]);RZ.toast('Created '+f.n)}catch(x){err(x)}})};
 const newZip=()=>chk()&&modal(fm,{title:'New zip archive',msg:'Name of the zip file:',input:'Archive.zip',sel:7},async(l,v)=>{v=v.trim();if(!FS.valid(v)){RZ.toast('Invalid name');return false}if(!/\.zip$/i.test(v))v+='.zip';try{const f=await FS.write(st.cur,v,await ZIP.build([]));reselect([f.id])}catch(x){err(x)}});
 const askExtract=m=>modal(fm,{title:'Extract zip',msg:`Extract “${m.n}” into a new folder here?`,btns:['Extract']},()=>{extract(m)});
 const extract=async m=>{if(!chk())return;RZ.toast('Extracting…');try{const es=await ZIP.read(await FS.blob(m.id)),root=await FS.mkdir(st.cur,FS.split(m.n)[0]),cache=new Map([['',root.id]]);
   const dirOf=async parts=>{let k='',p=root.id;for(const s of parts){k+='/'+s;if(!cache.has(k)){const e=FS.K.get(p).get(s.toLowerCase());cache.set(k,e||(await FS.mkdir(p,s)).id)}p=cache.get(k)}return p};const files=[];
   for(const e of es){const parts=e.name.split('/').filter(s=>s&&s!=='.'&&s!=='..');if(!parts.length)continue;if(e.dir){await dirOf(parts);continue}const nm=parts.pop();files.push([await dirOf(parts),nm,await e.get()])}
   await FS.writeMany(files);reselect([root.id]);RZ.toast('Extracted '+files.length+' files')}catch(x){err(x);load()}};
 const upload=()=>{if(!chk())return;const i=document.createElement('input');i.type='file';i.multiple=true;i.onchange=async()=>{try{const ns=await FS.writeMany([...i.files].map(f=>[st.cur,f.name,f]));reselect(ns.map(m=>m.id))}catch(x){err(x)}};i.click()};
 const exportF=m=>FS.blob(m.id).then(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=m.n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)});
 w.fm={menu(e){if(dlg)return[['New folder',newFolder,ro()&&'dis']];if(inC()){const t=e.target.closest('.fi,.fr');if(!t)return[['Delete all permanently...',()=>COMPOST.empty(load)]];const m=st.items[+t.dataset.i];if(!st.sel.has(m.id)){st.sel.clear();st.sel.add(m.id);paint()}const l=sels(),done=()=>{st.sel.clear();load()};return[['Restore',()=>COMPOST.restore(l,done)],['Delete permanently',()=>COMPOST.purge(l,done)]]}const t=e.target.closest('.fi,.fr');if(!t||e.target.closest('.fm-top,.fm-side')){if(e.target.closest('.fm-top,.fm-side,.fm-st'))return[['Close',()=>closeW(w)]];st.sel.clear();paint();const r=ro();return[['New folder',newFolder,r&&'dis'],['New text file (.txt)',newText,r&&'dis'],['New zip archive…',newZip,r&&'dis'],'sep',['Paste',paste,(r||!FSclip.ids.length)&&'dis'],['Import files…',upload,r&&'dis'],'sep',['Select all',()=>{st.items.forEach(m=>st.sel.add(m.id));paint()}],['Refresh',load],...(st.cur!=='root'?[['Add shortcut to this folder on desktop',()=>SC.add(FS.get(st.cur))]]:[])]}
   const m=st.items[+t.dataset.i];if(!st.sel.has(m.id)){st.sel.clear();st.sel.add(m.id);paint()}const s=sels(),one=s.length===1,lock=ro()||s.some(x=>x.ro);
   return[['Open',()=>s.forEach(openItem)],...(one&&/\.zip$/i.test(m.n)?[['Extract here…',()=>askExtract(m)]]:[]),['Open with…',()=>openWithDlg(fm,s)],'sep',['Cut',()=>copy(true),lock&&'dis'],['Copy',()=>copy(false)],['Paste',paste,(ro()||!FSclip.ids.length)&&'dis'],'sep',['Rename',()=>doRename(m),(!one||m.ro)&&'dis'],['Add to zip…',zipSel,ro()&&'dis'],['Add shortcut to desktop',()=>s.forEach(x=>SC.add(x))],...(one&&m.t==='f'?[['Download',()=>exportF(m)]]:[]),'sep',['Delete',del,lock&&'dis'],['Properties',()=>{const[n,sz]=m.t==='d'?FS.count(m.id):[0,m.s];modal(fm,{title:m.n,msg:`${typeOf(m)}\nLocation: ${FS.path(m.p)}\nSize: ${fmtSz(sz)}${m.t==='d'?' ('+n+' items inside)':''}\nModified: ${fmtDt(m.m)}${m.ro?'\nProtected system item':''}`,cancel:false})},'']].map(x=>x==='sep'?x:x.slice(0,3))}};
 w.fmRefresh=()=>{if(!FS.get(st.cur))st.cur='root';load();side()};
 fm.addEventListener('keydown',e=>{if(e.target.closest('input,select,.md'))return;if(dlg&&(e.ctrlKey||e.metaKey||e.key==='Delete'||e.key==='F2'))return;const m=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
  if(m&&k==='a'){e.preventDefault();st.items.forEach(x=>st.sel.add(x.id));paint()}else if(m&&k==='c')copy(false);else if(m&&k==='x')copy(true);else if(m&&k==='v')paste();else if(e.key==='Delete')del();else if(e.key==='F2'){const s=sels();s.length===1&&doRename(s[0])}
  else if(e.key==='Enter')sels().forEach(openItem);else if(e.key==='Backspace')q('.up').click();else if(e.altKey&&e.key==='ArrowLeft')q('.bk').click();
  else if(/^Arrow/.test(e.key)&&st.items.length){e.preventDefault();let i=st.anchor<0?0:st.anchor;const d={ArrowLeft:-1,ArrowRight:1,ArrowUp:-cols,ArrowDown:cols}[e.key];if(st.anchor>=0)i=cl(i+d,0,st.items.length-1);if(!e.shiftKey)st.sel.clear();st.sel.add(st.items[i].id);st.anchor=i;const t=Math.floor(i/cols)*dim.h;if(t<vs.scrollTop)vs.scrollTop=t;else if(t+dim.h>vs.scrollTop+vs.clientHeight)vs.scrollTop=t+dim.h-vs.clientHeight+8;draw();paint()}});
 let nameI,typeD;
 function dlgSync(){if(!dlg||!nameI)return;const s=sels();if(s.length===1&&s[0].t==='f'){nameI.value=s[0].n;if(typeD){const e='.'+EXT(s[0].n);typeD.set(DEXTS.some(x=>x[0]===e)?e:'')}}}
 function dlgOk(){if(!dlg)return;
  if(!dlg.save){const s=sels().filter(m=>m.t==='f');if(!s.length)return RZ.toast('Select a file first');closeW(w);return dlg.cb({id:s[0].id})}
  let n=nameI.value.trim();if(!n)return RZ.toast('Enter a file name');const e=typeD.value;if(e&&!n.toLowerCase().endsWith(e))n=(DEXTS.some(x=>x[0]&&x[0]==='.'+EXT(n))?FS.split(n)[0]:n)+e;
  if(!FS.valid(n))return RZ.toast('Invalid file name');if(ro())return RZ.toast('Cannot save in a read-only location');const ex=FS.K.get(st.cur).get(n.toLowerCase()),fin=()=>{closeW(w);dlg.cb({dir:st.cur,name:n})};
  if(ex){if(FS.get(ex).t==='d')return RZ.toast('A folder has that name');if(FS.get(ex).ro)return RZ.toast('Cannot overwrite a system file');modal(fm,{title:'Replace file?',msg:`“${n}” already exists. Replace it?`,btns:['Replace']},fin)}else fin()}
 if(dlg){const bar=q('.fm-dlg');bar.style.cssText='display:flex;gap:8px;align-items:center;padding:8px 10px;border-top:1px solid #ffffff14;flex:none';nameI=H('input','in',bar);nameI.style.cssText='flex:1;padding:6px 10px';nameI.value=dlg.name||'';nameI.placeholder=dlg.save?'File name':'Select a file';nameI.readOnly=!dlg.save;
  if(dlg.save){const c='.'+EXT(dlg.name||'');typeD=dropdown(DEXTS,DEXTS.some(x=>x[0]===c)?c:'');bar.append(typeD)}
  H('button','btn',bar,'Cancel').onclick=()=>closeW(w);H('button','btn pri',bar,dlg.save?'Save':'Open').onclick=dlgOk;nameI.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter')dlgOk();else if(e.key==='Escape')closeW(w)};if(dlg.save)setTimeout(()=>{nameI.focus();nameI.setSelectionRange(0,FS.split(nameI.value)[0].length)},50)}
 let rt=0;const offFs=FS.on(ev=>{if(!body.isConnected){offFs();return}if(!ev.ids.some(i=>{const m=FS.get(i);return !m||i===st.cur||FS.isIn(m.p,st.cur)}))return;clearTimeout(rt);rt=setTimeout(()=>{if(!FS.get(st.cur))return go('root');load();side()},80)});
 FS.ready.then(()=>{const t=!dlg&&w.tab&&FS.get(w.tab);if(t){if(t.t==='d')go(t.id);else{go(t.p||'root');st.sel=new Set([t.id]);paint();openItem(t)}}else go(dlg&&dlg.dir&&FS.get(dlg.dir)?dlg.dir:'root')});
}
/* ---------- Text Editor ---------- */
function renderEditor(body,w){body.innerHTML=`<div class=ed><div class=ed-side><div class=ed-sh>Open files</div><div class=ed-tabs></div><div style="padding:8px"><button class="btn nw" style="width:100%">+ New file</button></div></div><div class=ed-main><div class=ed-bar><button class=bn>New</button><button class=bo>Open</button><button class=bs>Save</button><button class=ba>Save As</button><span class=sp></span><button class=bf>Find</button><button class=bw>Wrap</button><button class=bm>A−</button><span class=fsz></span><button class=bp>A+</button></div>
<div class=ed-find><input class="in fi1" placeholder="Find"><input class="in fi2" placeholder="Replace"><button class=fp>↑</button><button class=fn>↓</button><button class=fc title="Match case">Aa</button><button class=fr1>Replace</button><button class=fra>All</button><small class=fk></small><button class=fx>✕</button></div><div class=ed-warn></div><div class=ed-upd><span></span><button class=ur>Reload</button><button class=uk>Keep editing</button></div>
<div class=ed-area><div class=ed-gut><pre></pre></div><div class=ed-ta><textarea spellcheck=false wrap=off></textarea><div class=ed-hl></div></div></div><div class=ed-stat><span class=s1></span><span class=s2></span><span class=sp></span><span class=s3></span></div></div></div>`;
 const q=s=>$(s,body),ed=q('.ed'),ta=q('textarea'),gut=q('.ed-gut pre'),tabs=q('.ed-tabs'),fb=q('.ed-find'),f1=q('.fi1'),f2=q('.fi2'),hl=q('.ed-hl'),taw=q('.ed-ta'),warn=q('.ed-warn');
 let docs=[],cur=null,uid=1,fs=13,lh=20,ver=0,lowV=-1,low='',cs=false,wrap=false,ft=0,rq=0,hlm=null;
 const mkdoc=o=>({id:uid++,fid:null,name:'Untitled.txt',dirty:false,bin:false,ro:false,sc:0,sl:0,ss:0,se:0,text:'',...o});
 const sync=()=>{if(cur){cur.text=ta.value;cur.sc=ta.scrollTop;cur.sl=ta.scrollLeft;cur.ss=ta.selectionStart;cur.se=ta.selectionEnd}};
 function tabsDraw(){tabs.innerHTML='';docs.forEach(d=>{const t=H('div','ed-tab'+(d===cur?' on':''),tabs,`${d.stale?'<i style="background:#ffb300"></i>':d.dirty?'<i></i>':''}<span></span><button>×</button>`);$('span',t).textContent=d.name;t.title=d.fid?FS.path(d.fid):'Unsaved file';t.onclick=e=>{if(e.target.closest('button'))closeDoc(d);else show(d)}})}
 const bytes=s=>{const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u};
 const latin=u=>{let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return s};
 function show(d){sync();cur=d;ta.value=d.text;ta.readOnly=d.ro;ta.scrollTop=d.sc;ta.scrollLeft=d.sl;ta.setSelectionRange(d.ss,d.se);ver++;warn.style.display=d.bin?'block':'none';warn.textContent=d.ro?'Binary file preview (truncated, read-only). Use Save As to keep a copy.':'Binary file — contents are shown as raw characters; editing may corrupt it.';tabsDraw();banner();upd();ta.focus()}
 function add(d){docs.push(d);show(d);return d}
 async function readDoc(id){const m=FS.get(id),b=await FS.blob(id),u=new Uint8Array(await b.slice(0,8192).arrayBuffer()),bin=u.includes(0);let txt,ro=false;if(bin){ro=b.size>4e6;txt=latin(new Uint8Array(await(ro?b.slice(0,4e6):b).arrayBuffer()))}else txt=await b.text();return{txt,bin,ro:ro||!!m.ro,mt:m.m}}
 w.edOpen=async id=>{const ex=docs.find(d=>d.fid===id);if(ex)return show(ex);const m=FS.get(id);if(!m)return;const r=await readDoc(id);if(cur&&!cur.fid&&!cur.dirty&&!cur.text&&docs.length===1)docs=[];add(mkdoc({fid:id,name:m.n,text:r.txt,bin:r.bin,ro:r.ro,mt:r.mt}))};
 const lines=()=>{const v=ta.value;let n=1,i=-1;while((i=v.indexOf('\n',i+1))>=0)n++;return n};
 function gutter(){rq=0;const g=gut.parentNode;g.style.display=wrap?'none':'';if(wrap)return;const n=lines(),f=Math.floor(ta.scrollTop/lh),c=Math.ceil(ta.clientHeight/lh)+1,a=[];for(let i=f;i<Math.min(n,f+c);i++)a.push(i+1);gut.textContent=a.join('\n');gut.style.transform=`translateY(${-(ta.scrollTop%lh)+f*lh-f*lh}px)`;g.style.width=Math.max(44,String(n).length*9+22)+'px'}
 function pos(){const p=ta.selectionStart,v=ta.value;let ln=1,i=-1;while((i=v.indexOf('\n',i+1))>=0&&i<p)ln++;q('.s1').textContent=`Ln ${ln}, Col ${p-v.lastIndexOf('\n',p-1)}`}
 function upd(){if(!cur)return;q('.s2').textContent=ta.value.length.toLocaleString()+' chars';q('.s3').textContent=(cur.bin?'Binary · ':'')+(cur.dirty?'Unsaved':'Saved');q('.bw').classList.toggle('on',wrap);q('.bf').classList.toggle('on',fb.classList.contains('show'));pos();if(!rq)rq=requestAnimationFrame(gutter);hlDraw()}
 let ut=0;ta.addEventListener('input',()=>{if(!cur.dirty){cur.dirty=true;tabsDraw()}ver++;clearTimeout(ut);ut=setTimeout(()=>{upd();count()},120);if(!rq)rq=requestAnimationFrame(gutter)});
 ta.addEventListener('scroll',()=>{if(!rq)rq=requestAnimationFrame(gutter);hlDraw()});['keyup','click','pointerup'].forEach(e=>ta.addEventListener(e,()=>{clearTimeout(ut);ut=setTimeout(upd,60)}));
 ta.addEventListener('pointerdown',()=>{hlm=null;hl.style.display='none'});
 ta.addEventListener('keydown',e=>{if(e.key==='Tab'&&!e.ctrlKey&&!ta.readOnly){e.preventDefault();document.execCommand('insertText',false,'\t')}});
 function size(){ta.style.fontSize=fs+'px';ta.style.lineHeight=(lh=Math.round(fs*1.55))+'px';q('.fsz').textContent=fs;gut.style.fontSize=fs+'px';gut.style.lineHeight=lh+'px';gut.parentNode.style.fontSize=fs+'px';gut.parentNode.style.lineHeight=lh+'px';upd()}
 q('.bm').onclick=()=>{fs=Math.max(9,fs-1);size()};q('.bp').onclick=()=>{fs=Math.min(32,fs+1);size()};q('.bw').onclick=()=>{wrap=!wrap;taw.classList.toggle('wrap',wrap);ta.wrap=wrap?'soft':'off';hlm=null;hl.style.display='none';upd()};
 /* files */
 const err=x=>RZ.toast(x.message||String(x)),content=d=>d.bin?new Blob([bytes(d.text)]):new Blob([d.text]);
 async function save(d,as){sync();if(d.ro&&!as)return RZ.toast('Read-only — use Save As');
  if(d.fid&&!as&&FS.get(d.fid)&&!FS.get(d.fid).ro){try{const f=await FS.write(null,null,content(d),d.fid,0,'editor:'+w.id);d.mt=f.m;d.stale=null;d.dirty=false;tabsDraw();upd();W.forEach(x=>x.fmRefresh&&x.fmRefresh());RZ.toast('Saved')}catch(x){err(x)}return}
  const m=d.fid&&FS.get(d.fid);fileDialog(w,{title:'Save As',save:true,name:d.name,dir:m&&!m.ro?m.p:(FS.resolve('/Documents')||'root')},async r=>{try{const ex=FS.K.get(r.dir).get(r.name.toLowerCase());const go=async()=>{const f=ex?await FS.write(null,null,content(d),ex,0,'editor:'+w.id):await FS.write(r.dir,r.name,content(d),null,0,'editor:'+w.id);d.fid=f.id;d.mt=f.m;d.stale=null;d.name=f.n;d.dirty=false;d.ro=false;tabsDraw();upd();W.forEach(x=>x.fmRefresh&&x.fmRefresh());RZ.toast('Saved '+f.n)};
   go()}catch(x){err(x)}})}
 function closeDoc(d){const fin=()=>{const i=docs.indexOf(d);docs.splice(i,1);if(!docs.length)add(mkdoc());else if(d===cur){cur=null;show(docs[Math.min(i,docs.length-1)])}else tabsDraw()};if(d.dirty){if(d===cur)sync();modal(ed,{title:'Unsaved changes',msg:`Save changes to “${d.name}”?`,btns:['Don’t save','Save'],cancel:true},async l=>{if(l==='Save'){await save(d);if(d.dirty)return}fin()})}else fin()}
 const openDlg=()=>fileDialog(w,{title:'Open file',dir:cur&&cur.fid&&FS.get(cur.fid)?FS.get(cur.fid).p:FS.resolve('/Documents')||'root'},r=>w.edOpen(r.id));
 const newDoc=()=>add(mkdoc());
 q('.bn').onclick=q('.nw').onclick=newDoc;q('.bo').onclick=openDlg;q('.bs').onclick=()=>save(cur);q('.ba').onclick=()=>save(cur,1);
 /* external-change detection */
 const upB=q('.ed-upd');
 function banner(){const s=cur&&cur.stale;upB.classList.toggle('show',!!s);if(!s)return;const who=s.by&&s.by.startsWith('editor:')?'another Text Editor window':s.by==='desk'?'the desktop':'another app or window';
  $('span',upB).textContent=s.gone?`“${cur.name}” was deleted or moved elsewhere.`:`“${cur.name}” was updated by ${who}.${cur.dirty?' Reloading will discard your unsaved edits.':''}`;q('.ur').style.display=s.gone?'none':''}
 q('.uk').onclick=()=>{const d=cur;if(d.stale.gone){d.fid=null;d.dirty=true}else d.mt=FS.get(d.fid).m;d.stale=null;banner();tabsDraw();upd()};
 q('.ur').onclick=async()=>{const d=cur;if(!d.fid||!FS.get(d.fid))return;const r=await readDoc(d.fid);Object.assign(d,{text:r.txt,bin:r.bin,ro:r.ro,mt:r.mt,dirty:false,stale:null});if(d===cur){const sl=ta.scrollTop;ta.value=d.text;ta.readOnly=d.ro;ta.scrollTop=sl;ver++;hlm=null;hl.style.display='none';warn.style.display=d.bin?'block':'none'}banner();tabsDraw();upd();RZ.toast('Reloaded')};
 w.onclose=FS.on(ev=>{let ch=0;for(const d of docs){if(!d.fid||!ev.ids.includes(d.fid))continue;const m=FS.get(d.fid);ch=1;if(!m){d.stale={gone:1};continue}if(m.n!==d.name)d.name=m.n;if(m.m!==d.mt){if(ev.by==='editor:'+w.id)d.mt=m.m;else d.stale={by:ev.by}}}if(ch&&cur){tabsDraw();banner()}});
 /* find / replace */
 const lowT=()=>{if(lowV!==ver){low=ta.value.toLowerCase();lowV=ver}return low};
 const hay=()=>cs?ta.value:lowT(),nd=()=>cs?f1.value:f1.value.toLowerCase();
 function count(){const n=nd();if(!fb.classList.contains('show')||!n){q('.fk').textContent='';return}const h=hay();let c=0,i=-1;while(c<100000&&(i=h.indexOf(n,i+n.length))>=0)c++;q('.fk').textContent=c?(c>=100000?'100000+':c)+' found':'No results'}
 function select(i,len){ta.setSelectionRange(i,i+len);const v=ta.value;let ln=0,p=-1;while((p=v.indexOf('\n',p+1))>=0&&p<i)ln++;const ls=v.lastIndexOf('\n',i-1)+1,col=i-ls;
  const top=ln*lh;if(!wrap){if(top<ta.scrollTop||top>ta.scrollTop+ta.clientHeight-lh*2)ta.scrollTop=Math.max(0,top-ta.clientHeight/2);const cw=chw(),x=col*cw;if(x<ta.scrollLeft||x>ta.scrollLeft+ta.clientWidth-80)ta.scrollLeft=Math.max(0,x-ta.clientWidth/3);hlm={ln,col,len,s:v.slice(ls,i)}}else{ta.focus();hlm=null;hl.style.display='none';ta.scrollTop=Math.max(0,top)}hlDraw();pos()}
 const chw=()=>{const c=chw.c||(chw.c=document.createElement('canvas').getContext('2d'));c.font=`${fs}px ui-monospace,Consolas,monospace`;return c.measureText('MMMMMMMMMM').width/10};
 function hlDraw(){if(!hlm||wrap){hl.style.display='none';return}const cw=chw(),tab=4;let col=0;for(const ch of hlm.s)col+=ch==='\t'?tab-col%tab:1;if(hlm.s.length>5000){hl.style.display='none';return}
  Object.assign(hl.style,{display:'block',left:10+col*cw-ta.scrollLeft+'px',top:8+hlm.ln*lh-ta.scrollTop+'px',width:Math.max(3,hlm.len*cw)+'px',height:lh+'px'})}
 function next(dir,keep){const n=nd();if(!n)return false;const h=hay(),L=n.length;let s=ta.selectionStart,e=ta.selectionEnd,i;
  if(dir>0){i=h.indexOf(n,keep?s:e);if(i<0)i=h.indexOf(n)}else{i=s>0?h.lastIndexOf(n,s-1):-1;if(i<0)i=h.lastIndexOf(n)}if(i<0){q('.fk').textContent='No results';return false}select(i,L);return true}
 function showFind(rep){fb.classList.add('show');const s=ta.value.slice(ta.selectionStart,ta.selectionEnd);if(s&&!s.includes('\n'))f1.value=s;f1.focus();f1.select();count();upd()}
 function hideFind(){fb.classList.remove('show');hlm=null;hl.style.display='none';ta.focus();upd()}
 w.edFind=showFind;q('.bf').onclick=()=>fb.classList.contains('show')?hideFind():showFind();q('.fx').onclick=hideFind;
 q('.fn').onclick=()=>next(1);q('.fp').onclick=()=>next(-1);q('.fc').onclick=()=>{cs=!cs;q('.fc').classList.toggle('on',cs);count()};
 let ct=0;f1.oninput=()=>{clearTimeout(ct);ct=setTimeout(()=>{count();next(1,1)},80)};
 f1.onkeydown=f2.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();if(e.target===f2)q('.fr1').click();else next(e.shiftKey?-1:1)}else if(e.key==='Escape')hideFind();else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){e.preventDefault();f1.select()}};
 q('.fr1').onclick=()=>{if(ta.readOnly)return;const n=nd();if(!n)return;const sel=ta.value.slice(ta.selectionStart,ta.selectionEnd);if((cs?sel:sel.toLowerCase())===n){ta.focus();document.execCommand('insertText',false,f2.value);ta.dispatchEvent(new Event('input'))}next(1,1);f1.focus()};
 q('.fra').onclick=()=>{if(ta.readOnly)return;const n=nd();if(!n)return;const v=ta.value,h=hay();let out=[],i=0,c=0,j;while((j=h.indexOf(n,i))>=0){out.push(v.slice(i,j));i=j+n.length;c++}if(!c)return;out.push(v.slice(i));ta.value=out.join(f2.value);ver++;cur.dirty=true;tabsDraw();upd();count();RZ.toast('Replaced '+c)};
 /* keys */
 w.edKey=e=>{const k=e.key.toLowerCase(),m=e.ctrlKey||e.metaKey;if(m&&k==='f'){e.preventDefault();showFind()}else if(m&&k==='h'){e.preventDefault();showFind(1);f2.focus()}else if(m&&k==='s'){e.preventDefault();save(cur,e.shiftKey)}else if(m&&k==='o'){e.preventDefault();openDlg()}else if(m&&k==='n'){e.preventDefault();newDoc()}else if(m&&k==='w'){e.preventDefault();closeDoc(cur)}else if(e.key==='F3'){e.preventDefault();next(e.shiftKey?-1:1)}else if(e.key==='Escape'&&fb.classList.contains('show'))hideFind();else if(m&&(e.key==='+'||e.key==='=')){fs=Math.min(32,fs+1);size()}else if(m&&e.key==='-'){fs=Math.max(9,fs-1);size()}};
 new ResizeObserver(()=>{if(!rq)rq=requestAnimationFrame(gutter)}).observe(ta);
 w.beforeClose=()=>docs.some(d=>d.dirty);
 FS.ready.then(()=>{size();if(w.tab&&FS.get(w.tab))w.edOpen(w.tab);else newDoc()});
}
/* ---------- App Store ---------- */
const CATALOG=[{id:'file-scout',name:'File Scout',icon:'file-scout',tag:'Utilities',tagline:'A clean, customizable file manager',by:'Reitzel',desc:'File Scout is a clean, highly customizable file manager with tabs, dual panes and your own layouts. Browse your files exactly the way you like.',versions:[{v:'1.0.0'}],reg(){APPS['file-scout']=SCOUT_APP}}];
const SCOUT_APP={fm:true,dlgApp:'scoutdlg',name:'File Scout',icon:'file-scout',w:1000,h:600,render:renderScout},SCOUT_DLG={name:'File Scout',icon:'file-scout',w:780,h:500,hide:true,render:(b,w)=>{w.temp=true;renderScout(b,w,w.tab)}};
window.regInstalled=()=>{if(S.installed&&S.installed['file-scout']){APPS['file-scout']=SCOUT_APP;APPS.scoutdlg=SCOUT_DLG}else{delete APPS['file-scout'];delete APPS.scoutdlg}};
const inst=()=>S.installed||(S.installed={});
function uninstall(id){delete inst()[id];S.pins=(S.pins||[]).filter(x=>x!==id);S.desk=(S.desk||[]).filter(x=>x.app!==id);SC.dropApp(id);W.filter(x=>x.app===id).forEach(closeW);delete APPS[id];save();renderTB();desk()}
function renderStore(body){body.innerHTML=`<div class=st><div class=st-nav><h2><img src="${IC('tote-store')}">App Store</h2><button data-t=d>Discover</button><button data-t=i>Installed</button></div><div class=st-main></div></div>`;
 const main=$('.st-main',body);let tab='d',qy='',sel=null;
 const nav=()=>body.querySelectorAll('.st-nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab&&!sel));
 body.querySelectorAll('.st-nav button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;sel=null;draw()});
 function card(a,p){const c=H('button','st-card',p,`<img src="${IC(a.icon)}"><div><b></b><small></small></div>`);$('b',c).textContent=a.name;$('small',c).textContent=a.tagline;const t=H('span','st-tag',$('div',c),inst()[a.id]?'Installed':a.versions.length?'Available':'No versions yet');c.onclick=()=>{sel=a;draw()}}
 function draw(){main.innerHTML='';nav();
  if(sel){const a=sel,bk=H('button','btn',main,'← Back');bk.style.alignSelf='flex-start';bk.onclick=()=>{sel=null;draw()};const h=H('div','st-hero',main,`<img src="${IC(a.icon)}"><div><h2></h2><small style="opacity:.65"></small></div>`);$('h2',h).textContent=a.name;$('small',h).textContent=a.by+' · '+a.tag;
   const v=a.versions[a.versions.length-1];if(inst()[a.id]){const r=H('div','',main);H('button','btn dng',r,'Uninstall').onclick=()=>{uninstall(a.id);draw()}}else{const b=H('button','btn pri',main,v?'Install '+v.v:'No versions installable');b.style.alignSelf='flex-start';b.disabled=!v;if(!v)b.style.opacity=.5;else b.onclick=()=>{inst()[a.id]=v.v;a.reg&&a.reg();save();RZ.toast(a.name+' installed — find it in the Start menu');draw()}}
   if(!v)H('small','',main,'There are currently no versions of this app that can be installed. Check back later.').style.opacity=.6;H('p','',main).textContent=a.desc;
   const i=H('div','st-info',main);[['Category',a.tag],['Publisher',a.by],['Latest version',v?v.v:'None available'],['Status',inst()[a.id]?'Installed ('+inst()[a.id]+')':'Not installed']].forEach(([k,x])=>{H('span','',i).textContent=k;H('span','',i).textContent=x});return}
  if(tab==='d'){const s=H('input','in',main);s.placeholder='Search apps';s.value=qy;s.oninput=()=>{qy=s.value;list()};H('h3','',main).textContent='Discover';const g=H('div','st-grid',main);const list=()=>{g.innerHTML='';const r=CATALOG.filter(a=>(a.name+a.tagline+a.tag).toLowerCase().includes(qy.toLowerCase()));r.forEach(a=>card(a,g));if(!r.length)H('div','st-empty',g,'No apps found')};list();s.onkeydown=e=>e.stopPropagation()}
  else{H('h3','',main).textContent='Installed';const l=CATALOG.filter(a=>inst()[a.id]);if(!l.length)H('div','st-empty',main,'No apps installed yet');l.forEach(a=>{const r=H('div','st-row',main,`<img src="${IC(a.icon)}"><div><b></b><br><small style="opacity:.6"></small></div>`);$('b',r).textContent=a.name;$('small',r).textContent='Version '+inst()[a.id];H('button','btn',r,'Details').onclick=()=>{sel=a;draw()};H('button','btn dng',r,'Uninstall').onclick=()=>{uninstall(a.id);draw()}})}}
 draw()}
/* ---------- desktop icons & shortcuts (/Desktop/shortcuts.syst) ---------- */
const SC=(()=>{const NAME='shortcuts.syst';let items=[],bad=false,loaded=false,inj=false,last='',fid=null,q=Promise.resolve(),lt=0,sq=0;
 const dId=()=>{const h=FS.home();return h!=='root'&&FS.K.get(h)?FS.K.get(h).get('desktop'):null},uname=b=>{let n=2,v=b;const has=x=>items.some(i=>i.name.toLowerCase()===x.toLowerCase());while(has(v))v=b+' ('+n++ +')';return v},fileId=()=>{const d=dId();return d&&FS.K.get(d).get(NAME)||null};
 const ok=j=>j&&typeof j==='object'&&j.format==='reitzel-shortcuts'&&Array.isArray(j.shortcuts)&&j.shortcuts.every(s=>s&&typeof s==='object'&&typeof s.name==='string'&&s.name&&typeof s.target==='string'&&s.target&&(s.kind==='app'||((s.kind==='file'||s.kind==='folder')&&s.target[0]==='/'))&&Number.isInteger(s.c)&&Number.isInteger(s.r)&&s.c>=0&&s.r>=0);
 const mk=s=>{const id='f'+(sq++)+'_'+Date.now().toString(36),b={id,fsc:1,app:'__sc',kind:s.kind,name:s.name,path:s.target,c:s.c,r:s.r};
  if(s.kind==='app'){const a=APPS[s.target];b.icon=a?a.icon:'file-generic';b.hidden=!a;return b}
  const i=FS.resolve(s.target),m=i&&FS.get(i);b.icon=m?iconOf(m):(s.kind==='folder'?'folder':'file-generic');return b};
 const ser=l=>JSON.stringify({format:'reitzel-shortcuts',version:1,shortcuts:l.map(x=>({name:x.name,target:x.path,kind:x.kind,c:x.c,r:x.r}))},null,2);
 last=ser([]);
 const redraw=()=>{try{if(S&&S.desk)desk()}catch{}};
 async function load(){bad=false;fid=fileId();let list=[];if(fid){try{const j=JSON.parse(await(await FS.blob(fid)).text());if(ok(j))list=j.shortcuts.map(mk);else bad=true}catch{bad=true}}items=list;last=bad?'':ser(items);loaded=true;redraw()}
 function write(){if(bad)return;const s=ser(items);if(s===last)return;last=s;q=q.then(async()=>{const f=fileId(),b=new Blob([s]);if(f)await FS.write(null,null,b,f,0,'desk');else{const d=dId();if(d)await FS.write(d,NAME,b,null,0,'desk')}fid=fileId()}).catch(console.error)}
 window.deskPre=()=>{if(loaded&&!bad&&S.desk.some(x=>!x.fsc)){S.desk.filter(x=>!x.fsc&&APPS[x.app]).forEach(x=>items.push(mk({kind:'app',target:x.app,name:x.name||APPS[x.app].name,c:x.c,r:x.r})));S.desk=S.desk.filter(x=>x.fsc);write();setTimeout(()=>save(),0)}
  if(loaded&&!bad){S.desk=S.desk.filter(x=>!x.fsc).concat(items.filter(x=>!x.hidden));inj=true}else if(bad){S.desk=S.desk.filter(x=>!x.fsc)}};
 window.deskHook=()=>{if(!inj||!S||!S.desk)return;items=S.desk.filter(x=>x.fsc).concat(items.filter(x=>x.hidden));write()};
 window.openShortcut=s=>{if(s.kind==='app'){APPS[s.path]&&openApp(s.path);return}const id=FS.resolve(s.path),m=id&&FS.get(id);if(!m)return RZ.toast('Shortcut target not found: '+s.path);const e=EXT(m.n);if(m.t==='f'&&e!=='svg'&&(TXT.has(e)||!e))openInEditor(id);else openApp(fmApp(),{tab:id})};
 FS.ready.then(()=>{load();FS.on(ev=>{if(ev.by==='desk')return;if(fileId()!==fid||(fid&&ev.ids.includes(fid))||items.some(x=>x.kind!=='app'&&ev.ids.includes(FS.resolve(x.path)))){clearTimeout(lt);lt=setTimeout(load,60)}})});
 const place=it=>{const G=grid(),tk=new Set();S.desk.forEach(o=>o.dc!=null&&tk.add(o.dc+','+o.dr));for(let c=0;c<G.c;c++)for(let r=0;r<G.r;r++)if(!tk.has(c+','+r)){it.c=c;it.r=r;return true}return false};
 const put=(it,msg)=>{if(bad)return RZ.toast('shortcuts.syst is malformed — fix or delete it first');if(!loaded)return RZ.toast('Desktop is still loading');if(!place(it))return RZ.toast('Desktop is full');items.push(it);S.desk.push(it);write();desk();RZ.toast(msg)};
 return{add(m){if(!m)return;const path=FS.path(m.id);put(mk({name:uname(m.n),target:path,kind:m.t==='d'?'folder':'file',c:0,r:0}),'Shortcut added to desktop')},
  addApp(app){put(mk({name:uname(APPS[app].name),target:app,kind:'app',c:0,r:0}),'Added to desktop')},
  reload(){loaded=false;bad=false;items=[];fid=null;last=ser([]);if(FS.who())load()},
  dropApp(id){items=items.filter(x=>!(x.kind==='app'&&x.path===id));write()}}})();
/* ---------- open-with registry & shared FS helpers ---------- */
const MEDIA=m=>m.t==='f'&&(IMG.has(EXT(m.n))||VID.has(EXT(m.n))||AUD.has(EXT(m.n)));
const OPENERS=[
 {id:'editor',name:'Text Editor',icon:'editor',test:m=>m.t==='f',open:m=>openInEditor(m.id)},
 {id:'files',name:'My Files',icon:'folder',test:m=>m.t==='d'||MEDIA(m)||EXT(m.n)==='zip',open:m=>openApp(fmApp(),{tab:m.id})},
 {id:'file-scout',name:'File Scout',icon:'file-scout',test:m=>m.t==='d'||MEDIA(m),open:m=>openApp('file-scout',{tab:m.id}),need:'file-scout'},
 {id:'terminal',name:'Terminal',icon:'terminal',test:m=>m.t==='d',open:m=>openApp('terminal',{tab:{cwd:m.id}})}];
const openersFor=ms=>OPENERS.filter(o=>(!o.admin||prof().admin)&&(!o.need||APPS[o.need])&&ms.every(o.test));
function openWithDlg(host,ms){const l=openersFor(ms);if(!l.length)return RZ.toast('No app can open this');
 modal(host,{title:'Open with',msg:ms.length>1?ms.length+' items':ms[0].n,btns:[],build(b){const g=H('div','owg',b);l.forEach(o=>{const x=H('button','ow',g,`<img src="${IC(o.icon)}"><span>${o.name}</span>`);x.onclick=()=>{b.parentNode.remove();ms.forEach(m=>o.open(m))}})}},()=>{})}
async function fsZip(ms,dir,name){const ent=[],rec=async(m,pre)=>{const p=pre+m.n;if(m.t==='d'){ent.push({path:p+'/',dir:1,m:m.m});for(const c of FS.kids(m.id))await rec(c,p+'/')}else ent.push({path:p,blob:await FS.blob(m.id),m:m.m})};for(const m of ms)await rec(m,'');return FS.write(dir,name,await ZIP.build(ent))}
async function fsExtract(m,dir){const es=await ZIP.read(await FS.blob(m.id)),root=await FS.mkdir(dir,FS.split(m.n)[0]),cache=new Map([['',root.id]]);
 const dirOf=async parts=>{let k='',p=root.id;for(const s of parts){k+='/'+s;if(!cache.has(k)){const e=FS.K.get(p).get(s.toLowerCase());cache.set(k,e||(await FS.mkdir(p,s)).id)}p=cache.get(k)}return p};const files=[];
 for(const e of es){const parts=e.name.split('/').filter(s=>s&&s!=='.'&&s!=='..');if(!parts.length)continue;if(e.dir){await dirOf(parts);continue}const nm=parts.pop();files.push([await dirOf(parts),nm,await e.get()])}
 await FS.writeMany(files);return{root,count:files.length}}
function showViewer(host,m,onText){const ov=H('div','ov',host),h=H('div','oh',ov),b=H('div','ob',ov);H('b','',h).textContent=m.n+'  ·  '+fmtSz(m.s);let url;const close=()=>{url&&URL.revokeObjectURL(url);ov.remove()};H('button','btn',h,'Close').onclick=close;ov.tabIndex=0;ov.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape'||e.key===' ')close()};ov.focus();
 const bad=()=>{b.innerHTML='';const n=H('div','nop',b,`<img src="${IC('file-generic')}"><div>Could not preview this file</div>`);H('button','btn pri',n,'Open in Text Editor').onclick=()=>{close();openInEditor(m.id)}};
 FS.blob(m.id).then(bl=>{const e=EXT(m.n);url=URL.createObjectURL(bl.type?bl:new Blob([bl],{type:MIME[e]||''}));if(IMG.has(e)){const i=H('img','',b);i.onerror=bad;i.onclick=()=>i.classList.toggle('up');i.src=url}else if(VID.has(e)){const v=H('video','',b);v.controls=1;v.onerror=bad;v.src=url}else if(AUD.has(e)){const a=H('audio','',b);a.controls=1;a.onerror=bad;a.src=url}else bad()})}
/* ---------- File Scout (Miller-column file manager) ---------- */
const SKCOL=['#ff3d8b','#c8ff2e','#34e8ff','#ffb300','#a678ff','#ff5a4d'];let skMenu=null;
function renderScout(body,w,dlg){const SS=S.scout||(S.scout={spots:[],tags:{},sort:'n',hid:false});
 body.innerHTML=`<div class=sk tabindex=0><div class=sk-rail></div><div class=sk-main><div class=sk-top><div class=sk-logo>SCOUT</div><div class=sk-pill><span>⌕</span><input class=sk-q spellcheck=false placeholder="jump to anything…   Ctrl+K"><div class=sk-res></div></div><span class=sk-sw></span><button class="sk-b sk-hid" title="Show dotfiles">dots</button></div><div class=sk-lanes></div><div class=sk-hs><i></i></div><div class=sk-tray></div><div class=sk-foot></div></div></div>`;
 const q=s=>$(s,body),sk=q('.sk'),lanesEl=q('.sk-lanes'),qi=q('.sk-q'),res=q('.sk-res'),trayEl=q('.sk-tray'),foot=q('.sk-foot');
 let nameI,typeD,ar=0;const hs=q('.sk-hs'),ht=hs.firstChild,eb=H('button','sk-b',q('.sk-top'),'EMPTY BIN');eb.style.display='none';eb.onclick=()=>COMPOST.empty(refresh);
 const hsUpd=()=>{const l=lanesEl,ov=l.scrollWidth-l.clientWidth;if(ov<=2){hs.style.visibility='hidden';return}hs.style.visibility='visible';const tw=Math.max(44,hs.clientWidth*l.clientWidth/l.scrollWidth);ht.style.width=tw+'px';ht.style.transform=`translateX(${(hs.clientWidth-tw)*l.scrollLeft/ov}px)`};
 lanesEl.addEventListener('scroll',hsUpd);
 ht.onpointerdown=e=>{e.preventDefault();ht.setPointerCapture(e.pointerId);const x0=e.clientX,s0=lanesEl.scrollLeft,ov=lanesEl.scrollWidth-lanesEl.clientWidth,tr=hs.clientWidth-ht.offsetWidth;ht.onpointermove=ev=>{lanesEl.scrollLeft=s0+(ev.clientX-x0)*ov/Math.max(1,tr)};ht.onpointerup=()=>{ht.onpointermove=ht.onpointerup=null}};
 hs.onpointerdown=e=>{if(e.target===ht)return;const r=ht.getBoundingClientRect();lanesEl.scrollBy({left:(e.clientX<r.left?-1:1)*lanesEl.clientWidth*.85,behavior:'smooth'})};
 lanesEl.addEventListener('wheel',e=>{const ls=e.target.closest('.sk-ls'),canV=ls&&ls.scrollHeight>ls.clientHeight+1;if(e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)||!canV){if(lanesEl.scrollWidth>lanesEl.clientWidth){e.preventDefault();lanesEl.scrollLeft+=e.shiftKey?(e.deltaY||e.deltaX):(e.deltaX||e.deltaY)}}},{passive:false});
 new ResizeObserver(()=>{const wd=sk.clientWidth;sk.classList.toggle('wide',wd>1250);sk.classList.toggle('tight',wd<780);sk.classList.toggle('tiny',wd<540);hsUpd()}).observe(sk);
 const st={chain:[FS.home()],lane:0,sel:new Set(),anchor:-1,lanes:[],pv:null,pvKey:''};let pvUrl=null,pvTok=0,rf=0;
 const err=x=>RZ.toast(x.message||String(x)),sels=()=>[...st.sel].map(i=>FS.get(i)).filter(Boolean);
 const kidsOf=id=>{let l=id==='@flag'?Object.keys(SS.tags).map(i=>FS.get(i)).filter(Boolean):FS.kids(id);return SS.hid?l:l.filter(m=>m.n[0]!=='.')};
 const C=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
 const cmp=()=>{const k=SS.sort;return(a,b)=>a.t!==b.t?(a.t==='d'?-1:1):k==='d'?b.m-a.m:k==='s'?(b.s||0)-(a.s||0):k==='k'?C.compare(EXT(a.n),EXT(b.n))||C.compare(a.n,b.n):C.compare(a.n,b.n)};
 const curDir=()=>{const c=st.chain[st.chain.length-1];return c==='@flag'?null:c};
 const chainTo=id=>{const a=[];while(id){a.unshift(id);const m=FS.get(id);id=m&&m.p}return a};
 /* lanes */
 function row(L,k){const m=L.items[k],e=H('div','sk-r');e.dataset.k=k;e.style.top=k*34+'px';e.innerHTML=`<u></u><img src="${IC(iconOf(m,1))}"><span></span><small></small><em>${m.t==='d'?'›':''}</em>`;const[b,x]=m.t==='d'?[m.n,'']:FS.split(m.n);$('span',e).innerHTML='';$('span',e).append(b);if(x){const s=document.createElement('s');s.textContent=x;$('span',e).append(s)}
  $('small',e).textContent=m.t==='d'?(FS.K.get(m.id)?FS.K.get(m.id).size:0)+'':fmtSz(m.s);const t=SS.tags[m.id];$('u',e).style.background=t||'transparent';$('u',e).style.borderColor=t||'#ffffff30';paintRow(e,L,m);return e}
 function paintRow(e,L,m){e.classList.toggle('sel',L.i===st.lane&&st.sel.has(m.id));e.classList.toggle('trail',st.chain[L.i+1]===m.id&&!(L.i===st.lane&&st.sel.has(m.id)))}
 function mkLane(i,id){const L={i,id,items:[],rows:new Map()},el=L.el=H('div','sk-lane'),hd=H('div','sk-lh',el),sc=L.sc=H('div','sk-ls',el),sp=H('div','',sc);sp.style.cssText='position:absolute;left:0;top:0;width:1px;pointer-events:none';let rq=0;const vt=H('div','sk-vt',el);
  const vtUpd=()=>{const h=sc.clientHeight,t=sp.offsetHeight;if(t<=h+1||!h){vt.style.display='none';return}vt.style.display='block';const th=Math.max(30,h*h/t);vt.style.height=th+'px';vt.style.top=sc.offsetTop+(h-th)*sc.scrollTop/(t-h)+'px'};
  vt.onpointerdown=e=>{e.preventDefault();e.stopPropagation();vt.setPointerCapture(e.pointerId);const y0=e.clientY,s0=sc.scrollTop,t=sp.offsetHeight,h=sc.clientHeight,th=vt.offsetHeight;vt.onpointermove=ev=>{sc.scrollTop=s0+(ev.clientY-y0)*(t-h)/Math.max(1,h-th)};vt.onpointerup=()=>{vt.onpointermove=vt.onpointerup=null}};
  new ResizeObserver(()=>L.draw()).observe(sc);
  L.load=()=>{L.items=kidsOf(id).sort(cmp());hd.innerHTML='';H('b','',hd).textContent=id==='@flag'?'FLAGGED':id===FS.home()?'HOME':(FS.get(id)||{n:'?'}).n;H('i','',hd).textContent=L.items.length;L.rows.forEach(e=>e.remove());L.rows.clear();L.draw()};
  L.draw=()=>{rq=0;vtUpd();const h=34,n=L.items.length;sp.style.height=n*h+'px';const a=Math.max(0,Math.floor(sc.scrollTop/h)-3),b=Math.min(n,Math.ceil((sc.scrollTop+sc.clientHeight)/h)+3);L.rows.forEach((e,k)=>{if(k<a||k>=b){e.remove();L.rows.delete(k)}});for(let k=a;k<b;k++)if(!L.rows.has(k)){const e=row(L,k);sc.append(e);L.rows.set(k,e)}};
  L.paint=()=>L.rows.forEach((e,k)=>L.items[k]&&paintRow(e,L,L.items[k]));
  sc.addEventListener('scroll',()=>{if(!rq)rq=requestAnimationFrame(L.draw)});
  const it=e=>{const r=e.target.closest('.sk-r');return r?L.items[+r.dataset.k]:null};
  sc.addEventListener('pointerdown',e=>{if(e.button>2)return;const m=it(e);if(!m){if(e.button===0){st.sel.clear();st.lane=i;st.chain=st.chain.slice(0,i+1);sync()}return}if(e.button===2&&st.sel.has(m.id)&&st.lane===i)return;pick(i,m,e)});
  sc.addEventListener('dblclick',e=>{const m=it(e);m&&openIt(m,i)});
  sc.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();const m=it(e);m?itemMenu(e,i,m):laneMenu(e,i)});
  lanesEl.insertBefore(el,st.pv);L.load();return L}
 function sync(){const ch=st.chain;let i=0;while(i<ch.length&&st.lanes[i]&&st.lanes[i].id===ch[i])i++;st.lanes.splice(i).forEach(L=>L.el.remove());for(;i<ch.length;i++)st.lanes[i]=mkLane(i,ch[i]);st.lanes.forEach(L=>L.paint());preview();tray();foot_();rail();const ls=lanesEl;requestAnimationFrame(()=>{hsUpd();ls.scrollTo({left:ls.scrollWidth,behavior:'smooth'})})}
 function pick(i,m,e){const L=st.lanes[i],idx=L.items.indexOf(m),ctl=e&&(e.ctrlKey||e.metaKey),sh=e&&e.shiftKey;if(st.lane!==i){st.sel.clear();st.anchor=-1}
  if(sh&&st.anchor>=0){const a=Math.min(st.anchor,idx),b=Math.max(st.anchor,idx);if(!ctl)st.sel.clear();for(let k=a;k<=b;k++)st.sel.add(L.items[k].id)}else if(ctl){st.sel.has(m.id)?st.sel.delete(m.id):st.sel.add(m.id);st.anchor=idx}else{st.sel=new Set([m.id]);st.anchor=idx}
  st.lane=i;const ms=sels();st.chain=st.chain.slice(0,i+1);if(ms.length===1&&ms[0].t==='d'&&!(dlg&&FS.inCompost(ms[0].id)))st.chain.push(ms[0].id);sync()}
 function goto(id,selId){if(dlg&&id!=='@flag'&&FS.inCompost(id))return RZ.toast('The compost bin is not available here');if(id==='@flag'){st.chain=['@flag'];st.lane=0;st.sel.clear();return sync()}if(!FS.get(id))id='root';st.chain=chainTo(id);st.sel.clear();st.lane=Math.max(0,st.chain.length-1);st.anchor=-1;
  if(selId&&FS.get(selId)){st.sel=new Set([selId]);const m=FS.get(selId);if(m.t==='d')st.chain.push(selId)}else if(st.chain.length>1){st.lane=st.chain.length-2;st.sel=new Set([id])}
  sync();const L=st.lanes[st.lane];if(L){const k=L.items.findIndex(x=>st.sel.has(x.id));if(k>=0){st.anchor=k;L.sc.scrollTop=Math.max(0,k*34-68);L.draw()}}}
 function openIt(m,i){if(dlg&&m.t==='f'){st.sel=new Set([m.id]);foot_();return dlgOk()}if(!dlg&&FS.inCompost(m.id)){if(ar)return;ar=1;setTimeout(()=>ar=0,0);const l=sels();return COMPOST.restore(l.length>1&&st.sel.has(m.id)?l:[m],()=>{st.sel.clear();refresh()})}if(m.t==='d'){const L=st.lanes[i+1];if(L&&L.items.length)pick(i+1,L.items[0]);return}const e=EXT(m.n);if(e==='zip')return modal(sk,{title:'Unstash',msg:`Unpack “${m.n}” into a new folder next to it?`,btns:['Unstash']},()=>{unstash(m)});if(MEDIA(m)||e==='svg')return showViewer(sk,m);if(TXT.has(e)||!e)return openInEditor(m.id);showViewer(sk,m)}
 /* preview lane */
 function preview(){const ms=sels(),one=ms.length===1?ms[0]:null,key=ms.map(m=>m.id+m.m).join()+(one&&one.t==='d'?'d':'');if(key===st.pvKey&&st.pv)return;st.pvKey=key;if(st.pv){st.pv.remove();st.pv=null}if(pvUrl){URL.revokeObjectURL(pvUrl);pvUrl=null}const tk=++pvTok;
  if(!ms.length||(one&&one.t==='d'))return;const el=st.pv=H('div','sk-lane sk-pvl');lanesEl.append(el);H('div','sk-lh',el,'<b>PEEK</b>');const c=H('div','sk-pvc',el);
  if(one){const e=EXT(one.n),box=H('div','sk-pvb',c);const ico=()=>{box.innerHTML=`<img class=big src="${IC(iconOf(one))}">`};
   if(IMG.has(e)||VID.has(e)||AUD.has(e)){FS.blob(one.id).then(bl=>{if(tk!==pvTok)return;pvUrl=URL.createObjectURL(bl.type?bl:new Blob([bl],{type:MIME[e]||''}));const x=document.createElement(IMG.has(e)?'img':VID.has(e)?'video':'audio');if(!IMG.has(e))x.controls=1;x.onerror=ico;x.src=pvUrl;box.append(x)})}
   else if(TXT.has(e)&&one.s<4e8){FS.blob(one.id).then(bl=>bl.slice(0,2500).text()).then(t=>{if(tk!==pvTok)return;const p=H('pre','',box);p.textContent=t})}else ico();
   H('div','sk-nm',c).textContent=one.n;const g=H('div','sk-info',c);[['KIND',typeOf(one)],['SIZE',fmtSz(one.s)],['EDITED',fmtDt(one.m)],['WHERE',FS.path(one.p)]].forEach(([k,v])=>{H('span','',g).textContent=k;H('span','',g).textContent=v});
   const fr=H('div','sk-fl',c);SKCOL.forEach(col=>{const b=H('button',SS.tags[one.id]===col?'on':'',fr);b.style.background=col;b.onclick=()=>flag([one],SS.tags[one.id]===col?null:col)});
   const bt=H('div','sk-bt',c);H('button','sk-b pri',bt,'OPEN').onclick=()=>openIt(one,st.lane);H('button','sk-b',bt,'OPEN WITH').onclick=()=>openWithDlg(sk,[one])}
  else{const tot=ms.reduce((a,m)=>a+(m.t==='f'?m.s:0),0);H('div','sk-big',c).textContent=ms.length;H('div','sk-nm',c).textContent='things picked';H('div','sk-info',c,`<span>SIZE</span><span>${fmtSz(tot)}</span>`);const bt=H('div','sk-bt',c);H('button','sk-b pri',bt,'STASH').onclick=()=>stash(ms);H('button','sk-b',bt,'CARRY').onclick=()=>carry(false)}}
 /* actions */
 const dirOK=()=>{const d=curDir();if(!d){RZ.toast('Pick a real folder first');return null}if(FS.get(d).ro){RZ.toast('That lane is read-only');return null}return d};
 const refresh=()=>{rf=0;let k=0;while(k<st.chain.length&&(st.chain[k]==='@flag'||FS.get(st.chain[k])))k++;if(k<st.chain.length){st.chain=st.chain.slice(0,Math.max(1,k));st.sel.clear()}st.lanes.forEach(L=>L.id===st.chain[L.i]&&L.load());sync()};
 const flag=(ms,c)=>{ms.forEach(m=>c?SS.tags[m.id]=c:delete SS.tags[m.id]);save();st.lanes.forEach(L=>L.load());sync()};
 const carry=cut=>{const ms=sels();if(!ms.length)return;if(cut&&ms.some(m=>m.ro||FS.get(m.p).ro))return RZ.toast('Read-only items can’t move');FSclip.ids=ms.map(m=>m.id);FSclip.cut=cut;tray();RZ.toast((cut?'Moving ':'Carrying ')+ms.length)};
 const drop=async()=>{const d=dirOK();if(!d||!FSclip.ids.length)return;const ids=FSclip.ids.filter(i=>FS.get(i));try{if(FSclip.cut){await FS.move(ids.filter(i=>FS.get(i).p!==d),d);FSclip.ids=[];FSclip.cut=false}else await FS.copy(ids,d);RZ.toast('Dropped')}catch(x){err(x)}};
 const del=()=>{const ms=sels();if(!ms.length||dlg)return;const after=()=>{st.sel.clear();st.chain=st.chain.slice(0,st.lane+1);sync()};if(FS.inCompost(ms[0].id))return COMPOST.purge(ms,after);if(ms.some(m=>m.ro||FS.get(m.p).ro))return RZ.toast('System items are read-only');const run=()=>FS.trash(ms.map(m=>m.id)).then(()=>{after();RZ.toast(S.compost==='now'?'Deleted':'Moved to the compost bin')},err);if(S.compost==='now')modal(sk,{title:'Delete',msg:`Delete ${ms.length===1?'"'+ms[0].n+'"':ms.length+' items'} forever?`,btns:['Delete']},run);else run()};
 const stash=ms=>{const d=ms[0]&&FS.get(ms[0].p);if(!d||d.ro)return RZ.toast('Can’t stash in a read-only place');modal(sk,{title:'Stash to zip',input:(ms.length===1?FS.split(ms[0].n)[0]:'Stash')+'.zip',sel:ms.length===1?FS.split(ms[0].n)[0].length:5},async(l,v)=>{v=v.trim();if(!FS.valid(v)){RZ.toast('Invalid name');return false}if(!/\.zip$/i.test(v))v+='.zip';RZ.toast('Stashing…');try{const f=await fsZip(ms,d.id,v);RZ.toast('Made '+f.n)}catch(x){err(x)}})};
 const unstash=async m=>{const d=FS.get(m.p);if(d.ro)return RZ.toast('Read-only place');RZ.toast('Unpacking…');try{const r=await fsExtract(m,d.id);RZ.toast('Unpacked '+r.count+' files')}catch(x){err(x)}};
 const rename=m=>{if(m.ro)return RZ.toast('System items can’t be renamed');modal(sk,{title:'Rename',input:m.n,sel:m.t==='d'?m.n.length:FS.split(m.n)[0].length},(l,v)=>{FS.rename(m.id,v.trim()).catch(err)})};
 const batch=ms=>{if(ms.some(m=>m.ro))return RZ.toast('System items can’t be renamed');modal(sk,{title:'Batch rename',msg:'Tokens: {name}  {n}  {ext}',input:'{name}_{n}'},async(l,v)=>{let n=0,bad=0;for(const m of ms){n++;const[b,x]=m.t==='d'?[m.n,'']:FS.split(m.n);let nn=v.replace(/\{name\}/g,b).replace(/\{n\}/g,n).replace(/\{ext\}/g,x.slice(1));if(!/\{ext\}/.test(v)&&x&&!nn.endsWith(x))nn+=x;try{await FS.rename(m.id,nn)}catch{bad++}}RZ.toast(bad?`Renamed ${n-bad}, ${bad} clashed`:'Renamed '+n)})};
 const newFolder=()=>{const d=dirOK();d&&modal(sk,{title:'New folder',input:'New folder'},(l,v)=>{v=v.trim();if(!FS.valid(v)){RZ.toast('Invalid name');return false}FS.mkdir(d,v).then(m=>goto(d,m.id),err)})};
 const newNote=()=>{const d=dirOK();d&&modal(sk,{title:'New note',input:'Note.txt',sel:4},(l,v)=>{v=v.trim();if(!FS.valid(v)){RZ.toast('Invalid name');return false}FS.write(d,v,new Blob([])).then(m=>goto(d,m.id),err)})};
 const imp=()=>{const d=dirOK();if(!d)return;const i=document.createElement('input');i.type='file';i.multiple=true;i.onchange=()=>FS.writeMany([...i.files].map(f=>[d,f.name,f])).catch(err);i.click()};
 const down=m=>FS.blob(m.id).then(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=m.n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)});
 const spot=m=>{if(!SS.spots.includes(m.id))SS.spots.push(m.id);save();rail();RZ.toast('Spot added')};
 /* custom menu */
 const closeSm=()=>{skMenu&&skMenu.remove();skMenu=null};
 function smenu(e,o){closeSm();const m=skMenu=H('div','sk-menu',document.body);H('div','sk-mh',m).textContent=o.head;
  if(o.tiles){const t=H('div','sk-mt',m);o.tiles.forEach(([g,l,f,d])=>{const b=H('button','',t,`<b>${g}</b><span>${l}</span>`);b.disabled=!!d;b.onclick=()=>{closeSm();f()}})}
  if(o.flags){const r=H('div','sk-mf',m);H('span','',r,'FLAG');SKCOL.forEach(c=>{const b=H('button','',r);b.style.background=c;b.onclick=()=>{closeSm();o.flags(c)}});H('button','x',r,'✕').onclick=()=>{closeSm();o.flags(null)}}
  if(o.apps&&o.apps.length){const r=H('div','sk-ma',m);H('span','',r,'OPEN WITH');o.apps.forEach(a=>{const b=H('button','',r,`<img src="${IC(a.icon)}">`);b.title=a.name;b.onclick=()=>{closeSm();o.ow(a)}})}
  (o.items||[]).forEach(([l,f,h,k])=>{if(l==='-')return H('hr','',m);const b=H('button','sk-mi'+(k?' '+k:''),m,'<span></span><small></small>');$('span',b).textContent=l;$('small',b).textContent=h||'';b.disabled=k==='dis';b.onclick=()=>{closeSm();f()}});
  m.style.left=Math.max(6,Math.min(e.clientX,innerWidth-m.offsetWidth-6))+'px';m.style.top=Math.max(6,Math.min(e.clientY,innerHeight-m.offsetHeight-6))+'px';
  const cl=ev=>{if(m.contains(ev.target))return;closeSm();removeEventListener('pointerdown',cl,true)};setTimeout(()=>addEventListener('pointerdown',cl,true),0)}
 function itemMenu(e,i,m){if(!st.sel.has(m.id)||st.lane!==i)pick(i,m);if(dlg)return dlgMenu(e,i);if(FS.inCompost(m.id)){const l=sels(),done=()=>{st.sel.clear();refresh()};return smenu(e,{head:'COMPOST BIN',items:[['Restore',()=>COMPOST.restore(l,done)],['Delete permanently',()=>COMPOST.purge(l,done),'','dng']]})}const ms=sels(),one=ms.length===1?ms[0]:null,lock=ms.some(x=>x.ro||FS.get(x.p).ro);
  smenu(e,{head:one?one.n:ms.length+' things',tiles:[['↗','OPEN',()=>ms.forEach(x=>openIt(x,i))],['⎘','CARRY',()=>carry(false)],['✂','MOVE',()=>carry(true),lock],['▣','STASH',()=>stash(ms),lock]],flags:c=>flag(ms,c),apps:openersFor(ms),ow:a=>ms.forEach(a.open),
   items:[...(one?[['Rename',()=>rename(one),'F2',lock&&'dis']]:[['Batch rename…',()=>batch(ms),'',lock&&'dis']]),...(one&&/\.zip$/i.test(one.n)?[['Unstash here',()=>unstash(one)]]:[]),...(one&&one.t==='d'?[['Make a Spot',()=>spot(one)]]:[]),...(one&&one.t==='f'?[['Download',()=>down(one)]]:[]),['-'],['Delete',del,'Del',lock?'dis':'dng']]})}
 function laneMenu(e,i){const L=st.lanes[i];if(!L||L.id==='@flag')return;if(dlg)return dlgMenu(e,i);if(FS.inCompost(L.id))return smenu(e,{head:'COMPOST BIN',items:[['Delete all permanently...',()=>COMPOST.empty(refresh)]]});st.sel.clear();st.lane=i;st.chain=st.chain.slice(0,i+1);sync();const d=FS.get(L.id),ro=d.ro;
  smenu(e,{head:L.id===FS.home()?'HOME':d.n,tiles:[['✚','FOLDER',newFolder,ro],['✎','NOTE',newNote,ro],['⤵','DROP',drop,ro||!FSclip.ids.length],['⇪','IMPORT',imp,ro]],apps:openersFor([d]),ow:a=>a.open(d),items:[['Select everything',()=>{L.items.forEach(m=>st.sel.add(m.id));st.lane=i;L.paint();preview();foot_()},'Ctrl+A'],['Make this a Spot',()=>spot(d)],['Refresh',refresh]]})}
 /* rail, tray, footer, sort */
 function rail(){const r=q('.sk-rail');r.innerHTML='';const sp=[['HOME',FS.home(),'folder']];for(const n of['desktop','documents','pictures','downloads']){const i=FS.K.get(FS.home()).get(n);i&&sp.push([FS.get(i).n.toUpperCase(),i,'folder-single'])}SS.spots.filter(i=>FS.get(i)).forEach(i=>sp.push([FS.get(i).n.toUpperCase().slice(0,9),i,'folder-single',1]));if(!dlg){const ci=FS.compostId();ci&&sp.push(['COMPOST',ci,'folder-single'])}sp.push(['FLAGGED','@flag','',0,'⚑']);
  const cur=st.chain[st.chain.length-1];sp.forEach(([n,id,ic,u,g])=>{const b=H('button','sk-sp'+(cur===id||(id!=='root'&&st.chain.includes(id)&&id!=='@flag')?' on':''),r,(g?`<b>${g}</b>`:`<img src="${IC(ic)}">`)+`<span></span>`);$('span',b).textContent=n;b.title=n;b.onclick=()=>goto(id);if(u)b.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();smenu(e,{head:n,items:[['Remove this Spot',()=>{SS.spots=SS.spots.filter(x=>x!==id);save();rail()},'','dng']]})}})}
 function tray(){const n=FSclip.ids.filter(i=>FS.get(i)).length;trayEl.style.display=n?'flex':'none';if(!n)return;trayEl.innerHTML='';H('b','',trayEl,FSclip.cut?'MOVING':'CARRYING');FSclip.ids.filter(i=>FS.get(i)).slice(0,5).forEach(i=>H('span','',trayEl).textContent=FS.get(i).n);if(n>5)H('em','',trayEl,'+'+(n-5));H('button','sk-b pri',trayEl,'DROP HERE').onclick=drop;H('button','sk-b',trayEl,'CLEAR').onclick=()=>{FSclip.ids=[];tray()}}
 function foot_(){dlgSync();const ms=sels(),d=curDir();eb.style.display=!dlg&&d&&FS.inCompost(d)?'':'none';let sz=0;ms.forEach(m=>sz+=m.t==='f'?m.s:0);foot.textContent=(d?FS.path(d):'flagged')+'  ·  '+(st.lanes[st.lane]?st.lanes[st.lane].items.length:0)+' here'+(ms.length?'  ·  '+ms.length+' picked'+(sz?' ('+fmtSz(sz)+')':''):'')}
 q('.sk-sw').append(dropdown([['n','Sort: A→Z'],['d','Sort: Newest'],['s','Sort: Biggest'],['k','Sort: Kind']],SS.sort,v=>{SS.sort=v;save();st.lanes.forEach(L=>L.load());sync()}));
 const hb=q('.sk-hid');hb.classList.toggle('on',!!SS.hid);hb.onclick=()=>{SS.hid=!SS.hid;hb.classList.toggle('on',!!SS.hid);save();st.lanes.forEach(L=>L.load());sync()};
 /* jump pill */
 let rs=[],ri=0,qt=0;const showRes=()=>{res.innerHTML='';res.style.display=rs.length?'block':'none';rs.forEach((m,k)=>{const b=H('button',k===ri?'on':'',res,`<img src="${IC(iconOf(m,1))}"><span></span><small></small>`);$('span',b).textContent=m.n;$('small',b).textContent=FS.path(m.p);b.onclick=()=>go_(m)})};
 const go_=m=>{qi.value='';rs=[];showRes();goto(m.t==='d'?m.id:m.p,m.id);sk.focus()};
 qi.oninput=()=>{clearTimeout(qt);qt=setTimeout(()=>{const v=qi.value.trim();if(!v){rs=[];return showRes()}if(v[0]==='/'){const id=FS.resolve(v);rs=id&&FS.get(id)?[FS.get(id)]:[]}else{const lv=v.toLowerCase();rs=FS.search('root',v,SS.hid,4000).map(m=>({m,s:(m.n.toLowerCase().indexOf(lv)*100)+m.n.length})).sort((a,b)=>a.s-b.s).slice(0,40).map(x=>x.m)}ri=0;showRes()},60)};
 qi.onkeydown=e=>{e.stopPropagation();if(e.key==='ArrowDown'){ri=Math.min(rs.length-1,ri+1);showRes();e.preventDefault()}else if(e.key==='ArrowUp'){ri=Math.max(0,ri-1);showRes();e.preventDefault()}else if(e.key==='Enter'&&rs[ri])go_(rs[ri]);else if(e.key==='Escape'){qi.value='';rs=[];showRes();sk.focus()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();qi.select()}};
 qi.onblur=()=>setTimeout(()=>{rs=[];showRes()},150);w.skFind=()=>{qi.focus();qi.select()};
 /* keyboard */
 sk.addEventListener('keydown',e=>{if(e.target.closest('input,.md,.ov'))return;const m=e.ctrlKey||e.metaKey,k=e.key.toLowerCase(),L=st.lanes[st.lane];
  if(m&&k==='k'){e.preventDefault();w.skFind()}else if(m&&k==='c')carry(false);else if(m&&k==='x')carry(true);else if(m&&k==='v')drop();else if(m&&k==='a'&&L){e.preventDefault();L.items.forEach(x=>st.sel.add(x.id));L.paint();preview();foot_()}
  else if(e.key==='Delete')del();else if(e.key==='F2'){const s=sels();s.length===1&&rename(s[0])}
  else if(e.key==='Enter'){sels().forEach(x=>openIt(x,st.lane))}else if(e.key===' '){e.preventDefault();const s=sels();s.length===1&&s[0].t==='f'&&showViewer(sk,s[0])}
  else if((e.key==='ArrowDown'||e.key==='ArrowUp')&&L&&L.items.length){e.preventDefault();let k2=st.anchor<0?(e.key==='ArrowDown'?0:L.items.length-1):cl(st.anchor+(e.key==='ArrowDown'?1:-1),0,L.items.length-1);pick(st.lane,L.items[k2],{shiftKey:e.shiftKey});st.anchor=k2;if(k2*34<L.sc.scrollTop)L.sc.scrollTop=k2*34;else if(k2*34+34>L.sc.scrollTop+L.sc.clientHeight)L.sc.scrollTop=k2*34+34-L.sc.clientHeight;L.draw()}
  else if(e.key==='ArrowRight'){const s=sels();if(s.length===1){if(s[0].t==='d'){const n=st.lanes[st.lane+1];n&&n.items.length&&pick(st.lane+1,n.items[0])}else openIt(s[0],st.lane)}}
  else if((e.key==='ArrowLeft'||e.key==='Backspace')&&st.lane>0){const d=FS.get(st.chain[st.lane]);d&&pick(st.lane-1,d)}});
 sk.addEventListener('pointerdown',e=>{if(!e.target.closest('input,button,.sk-menu'))sk.focus({preventScroll:true})});
 const offFs=FS.on(()=>{if(!body.isConnected){offFs();return}clearTimeout(rf);rf=setTimeout(refresh,90)});
 /* open / save mode (used when Scout is the default file manager) */
 function dlgSync(){if(!dlg||!nameI)return;const s=sels();if(s.length===1&&s[0].t==='f'){nameI.value=s[0].n;if(typeD){const e='.'+EXT(s[0].n);typeD.set(DEXTS.some(x=>x[0]===e)?e:'')}}}
 function dlgMenu(e,i){const d=FS.get(st.chain[i]);smenu(e,{head:'HERE',tiles:[['+','FOLDER',newFolder,!d||d.ro]]})}
 function dlgOk(){if(!dlg)return;if(!dlg.save){const s=sels().filter(m=>m.t==='f');if(!s.length)return RZ.toast('Pick a file first');closeW(w);return dlg.cb({id:s[0].id})}
  let n=nameI.value.trim();if(!n)return RZ.toast('Enter a file name');const e=typeD.value;if(e&&!n.toLowerCase().endsWith(e))n=(DEXTS.some(x=>x[0]&&x[0]==='.'+EXT(n))?FS.split(n)[0]:n)+e;
  const d=curDir();if(!d||FS.get(d).ro||FS.inCompost(d))return RZ.toast('Cannot save here');if(!FS.valid(n))return RZ.toast('Invalid file name');const ex=FS.K.get(d).get(n.toLowerCase()),fin=()=>{closeW(w);dlg.cb({dir:d,name:n})};
  if(ex){if(FS.get(ex).t==='d')return RZ.toast('A folder has that name');if(FS.get(ex).ro)return RZ.toast('Cannot overwrite a system file');modal(sk,{title:'Replace file?',msg:`"${n}" already exists. Replace it?`,btns:['Replace']},fin)}else fin()}
 if(dlg){const bar=H('div','sk-dlg',q('.sk-main'));nameI=H('input','',bar);nameI.value=dlg.name||'';nameI.placeholder=dlg.save?'File name':'Pick a file';nameI.readOnly=!dlg.save;if(dlg.save){const c='.'+EXT(dlg.name||'');typeD=dropdown(DEXTS,DEXTS.some(x=>x[0]===c)?c:'');bar.append(typeD)}
  H('button','sk-b',bar,'CANCEL').onclick=()=>closeW(w);H('button','sk-b pri',bar,dlg.save?'SAVE':'OPEN').onclick=dlgOk;nameI.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter')dlgOk();else if(e.key==='Escape')closeW(w)};if(dlg.save)setTimeout(()=>{nameI.focus();nameI.setSelectionRange(0,FS.split(nameI.value)[0].length)},50)}
 FS.ready.then(()=>{const t=w.tab&&FS.get(w.tab);if(t)goto(t.t==='d'?t.id:t.p,t.t==='d'?null:t.id);else goto(dlg&&dlg.dir&&FS.get(dlg.dir)?dlg.dir:FS.home());rail()});
}

/* ---------- Terminal ---------- */
const TK=(k,t)=>'\u0001'+k+t+'\u0002',TKS=s=>String(s).replace(/\u0001.([^\u0002]*)\u0002/g,'$1'),ESC=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const TKH=s=>ESC(s).replace(/\u0001(.)([^\u0002]*)\u0002/g,'<span class="tk-$1">$2</span>');
const SWAT_JOKES=[u=>`${u} is not in the swatters file. This incident will be reported to Santa.`,u=>`swat: Linus Torvalds has been notified. He is composing a very strongly worded email about ${u}.`,u=>`swat: nice try, ${u}. Even \`rm -rf --no-preserve-root /\` needs an admin badge.`,u=>`swat: access denied. ${u} has been added to the naughty list, right next to the guy who ran chmod -R 777 /.`,u=>`swat: ${u}, with great power comes great responsibility. You have neither. (Ask an admin.)`];
const PRIV=new Set(['reboot','poweroff','shutdown','useradd','userdel']);
const mkl=()=>{const d=document.createElement('div');d.className='tm-l';return d};
function renderTerm(body,w){const P0=prof(),user=P0.root?'root':(P0.name||'user').toLowerCase().replace(/[^a-z0-9_-]+/g,'')||'user';
 const t={cwd:w.tab&&w.tab.cwd&&FS.get(w.tab.cwd)?w.tab.cwd:FS.home(),env:{USER:user,HOME:FS.path(FS.home()),SHELL:'/bin/rzsh',TERM:'reitzel-256',EDITOR:'edit'},alias:{ll:'ls -l',la:'ls -a','..':'cd ..',cls:'clear',nano:'edit',l:'ls -l'},auth:false,last:0,busy:false,abort:false,hi:-1,askr:null,t0:Date.now()};
 const H0=S.thist||(S.thist=[]);
 body.innerHTML='<div class=tm><div class=tm-out><div class=tm-pr><span class=tm-p></span><input class=tin spellcheck=false autocomplete=off autocapitalize=off></div></div></div>';
 const out=$('.tm-out',body),pr=$('.tm-pr',body),pp=$('.tm-p',body),inp=$('.tin',body),tmEl=$('.tm',body);
 const shortPath=()=>{const h=FS.path(FS.home()),p=FS.path(t.cwd);return p===h?'~':p.startsWith(h+'/')?'~'+p.slice(h.length):p};
 const promptHtml=()=>`<span class=tk-u>${ESC(user)}@reitzel</span><span class=tk-m>:</span><span class=tk-p>${ESC(shortPath())}</span><span class=tk-m>$ </span>`;
 const setP=()=>{pp.innerHTML=promptHtml();const ti=$('.tbar span',w.el);if(ti)ti.textContent=user+'@reitzel: '+shortPath()};
 const scroll=()=>{out.scrollTop=out.scrollHeight};
 const emit=(s,cls)=>{s=String(s);if(s.length>250000)s=s.slice(0,250000)+TK('w','\n… output truncated ('+(s.length-250000)+' more characters)');const d=H('div','tm-l'+(cls?' '+cls:''));d.innerHTML=TKH(s);out.insertBefore(d,pr);while(out.children.length>600)out.firstChild.remove();scroll()};
 const e_=s=>emit(TK('e',s));
 const asked=(label,secret)=>new Promise(r=>{t.askr=r;pp.textContent=label;inp.type=secret?'password':'text';pr.style.display='flex';inp.value='';inp.focus()});
 /* path helpers */
 const P2=p=>p.replace(/^~(?=\/|$)/,()=>FS.path(FS.home()));
 const look=p=>{const id=FS.resolve(P2(p),t.cwd);return id?FS.get(id):null};
 const need=p=>{const m=look(p);if(!m)throw Error(`${p}: No such file or directory`);return m};
 const parentOf=p=>{p=P2(p).replace(/\/+$/,'')||'/';const i=p.lastIndexOf('/'),dp=i<0?'.':(p.slice(0,i)||'/'),name=p.slice(i+1),d=look(dp);if(!d||d.t!=='d')throw Error(`${p}: No such directory`);if(!name||name==='.'||name==='..')throw Error(`${p}: invalid name`);return{dir:d,name}};
 const wr=d=>{if(d.ro)throw Error('Permission denied: read-only system location (even swat can’t touch it)')};
 const rel=m=>{const p=FS.path(m.id),c=FS.path(t.cwd);return p===c?'.':p.startsWith(c==='/'?'/':c+'/')?p.slice(c==='/'?1:c.length+1):p};
 const flags=(a,long)=>{const f=new Set(),r=[];let end=false;for(const x of a){if(!end&&x==='--'){end=true;continue}if(!end&&/^-[a-zA-Z]+$/.test(x))[...x.slice(1)].forEach(c=>f.add(c));else if(!end&&/^--[a-z]/.test(x))f.add(x.slice(2));else r.push(x)}return{f,r}};
 const num=(a,def)=>{const i=a.indexOf('-n');if(i>=0&&a[i+1]){const v=+a[i+1];a.splice(i,2);return v}return def};
 const globRe=g=>new RegExp('^'+g.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\?/g,'.')+'$','i');
 const expand=(x)=>{if(x.q||!/[*?]/.test(x.w))return[x.w];const s=x.w,i=s.lastIndexOf('/'),dp=i<0?'.':(s.slice(0,i)||'/'),pat=s.slice(i+1),d=look(dp);if(!d||d.t!=='d')return[s];const re=globRe(pat),l=FS.kids(d.id).filter(m=>re.test(m.n)&&(pat[0]==='.'||m.n[0]!=='.')).map(m=>(i<0?'':s.slice(0,i+1))+m.n).sort();return l.length?l:[s]};
 const readText=async m=>{if(m.t==='d')throw Error(m.n+': Is a directory');const b=await FS.blob(m.id);return b.text()};
 const isBin=async m=>{const b=await FS.blob(m.id),u=new Uint8Array(await b.slice(0,4096).arrayBuffer());return u.includes(0)};
 const hs=n=>n<1024?String(n):n<1048576?(n/1024).toFixed(1)+'K':n<1073741824?(n/1048576).toFixed(1)+'M':(n/1073741824).toFixed(1)+'G';
 const nameTk=m=>m.t==='d'?TK('d',m.n+'/'):/^(zip)$/.test(EXT(m.n))?TK('z',m.n):IMG.has(EXT(m.n))?TK('i',m.n):m.n[0]==='.'?TK('m',m.n):m.n;
 const sortKids=(l,f)=>{const C2=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});l.sort(f.has('S')?(a,b)=>(b.s||0)-(a.s||0):f.has('t')?(a,b)=>b.m-a.m:(a,b)=>C2.compare(a.n,b.n));if(f.has('r'))l.reverse();return l};
 const writeFile=async(p,text,append)=>{const{dir,name}=parentOf(p);wr(dir);const ex=FS.K.get(dir.id).get(name.toLowerCase()),old=ex?FS.get(ex):null;if(old&&old.t==='d')throw Error(p+': Is a directory');if(old&&old.ro)throw Error('Permission denied: '+p);let s=text;if(old&&append)s=(await readText(old))+text;await FS.write(dir.id,name,new Blob([s]),old?old.id:null,0,'term')};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)),tick=async n=>{if(t.abort)throw Error('^C');if(n%4000===0)await sleep(0)};
 const walk=async(id,fn,depth=0)=>{let n=0;const rec=async(d,dp)=>{for(const m of FS.kids(d)){await tick(++n);if(await fn(m,dp)===false)continue;if(m.t==='d')await rec(m.id,dp+1)}};await rec(id,depth)};
 const calc=ex=>{let e=ex.replace(/\bpi\b/gi,'Math.PI').replace(/\^/g,'**').replace(/\b(sqrt|sin|cos|tan|abs|log|log2|log10|floor|ceil|round|min|max|pow|exp)\b/g,'Math.$1').replace(/\bln\b/g,'Math.log');
  if(!/^(?:[\d.\s+\-*\/%(),]|Math\.[A-Za-z0-9]+)+$/.test(e)||[...e.matchAll(/Math\.(\w+)/g)].some(x=>!['PI','sqrt','sin','cos','tan','abs','log','log2','log10','floor','ceil','round','min','max','pow','exp'].includes(x[1])))throw Error('calc: unsupported expression');
  const v=Function('"use strict";return ('+e+')')();if(typeof v!=='number'||!isFinite(v))throw Error('calc: not a number');return String(+v.toPrecision(14))};
 const CMD={},GR={};const def=(n,g,d,u,f)=>{CMD[n]={g,d,u,f}};
 /* ---- navigation & listing ---- */
 def('pwd','Files','Print the current folder','pwd',async()=>FS.path(t.cwd));
 def('cd','Files','Change folder','cd [folder]   (cd - goes back, cd ~ goes home)',async a=>{let p=a[0]||'~';if(p==='-'){p=t.prev?FS.path(t.prev):'~'}const m=need(p);if(m.t!=='d')throw Error(p+': Not a directory');t.prev=t.cwd;t.cwd=m.id;setP();return''});
 def('ls','Files','List folder contents','ls [-lahSRtr1] [path…]   -l long  -a hidden  -S by size  -t by time  -R recursive',async a=>{const{f,r}=flags(a),paths=r.length?r:['.'],lines=[];
  const fmt=l=>f.has('l')?l.map(m=>`${m.t==='d'?'d':'-'}${m.ro?'r-':'rw'} ${hs(m.s||0).padStart(6)}  ${new Date(m.m).toLocaleDateString([],{month:'short',day:'2-digit'})} ${new Date(m.m).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}  ${nameTk(m)}`).join('\n'):f.has('1')?l.map(nameTk).join('\n'):l.map(nameTk).join('  ');
  const list=d=>sortKids(FS.kids(d.id).filter(m=>f.has('a')||m.n[0]!=='.'),f);
  const doDir=(d,hdr,depth)=>{const l=list(d);if(hdr)lines.push(TK('a',rel(d)+':'));lines.push(fmt(l)||TK('m','(empty)'));if(f.has('R')&&depth<6)l.filter(m=>m.t==='d').forEach(x=>{lines.push('');doDir(x,true,depth+1)})};
  paths.forEach((p,i)=>{const m=need(p);if(m.t==='d')doDir(m,paths.length>1||f.has('R'),0);else lines.push(fmt([m]))});return lines.join('\n')});
 def('tree','Files','Show a folder as a tree','tree [-a] [-L depth] [path]',async a=>{const L=num(a,99),{f,r}=flags(a),root=need(r[0]||'.');let nd=0,nf=0;const o=[TK('d',root.t==='d'?(r[0]||'.'):root.n)];
  const rec=(id,pre,dep)=>{const l=sortKids(FS.kids(id).filter(m=>f.has('a')||m.n[0]!=='.'),new Set());l.forEach((m,i)=>{const last=i===l.length-1;o.push(pre+(last?'└── ':'├── ')+nameTk(m));if(m.t==='d'){nd++;if(dep<L)rec(m.id,pre+(last?'    ':'│   '),dep+1)}else nf++})};if(root.t==='d')rec(root.id,'',1);o.push('',`${nd} folders, ${nf} files`);return o.join('\n')});
 def('stat','Files','Show details about a file','stat <path…>',async a=>{if(!a.length)throw Error('stat: missing operand');return a.map(p=>{const m=need(p),[n,sz]=m.t==='d'?FS.count(m.id):[0,m.s];return[`  File: ${m.n}`,`  Type: ${typeOf(m)}${m.ro?'  (protected)':''}`,`  Path: ${FS.path(m.id)}`,`  Size: ${sz} bytes (${hs(sz)})${m.t==='d'?`  ·  ${n} items inside`:''}`,`Modify: ${new Date(m.m).toString().slice(0,24)}`].join('\n')}).join('\n\n')});
 def('file','Files','Guess what a file really is','file <path…>',async a=>{const o=[];for(const p of a){const m=need(p);if(m.t==='d'){o.push(`${p}: directory`);continue}const u=new Uint8Array(await(await FS.blob(m.id)).slice(0,16).arrayBuffer()),h=[...u].map(x=>x.toString(16).padStart(2,'0')).join('');let k=h.startsWith('89504e47')?'PNG image':h.startsWith('ffd8ff')?'JPEG image':h.startsWith('47494638')?'GIF image':h.startsWith('25504446')?'PDF document':h.startsWith('504b0304')?'Zip archive':h.startsWith('52494646')?'RIFF container (WebP/WAV)':u.includes(0)?'binary data':'text';o.push(`${p}: ${k}${EXT(m.n)&&((k.includes('image')&&!IMG.has(EXT(m.n)))||(k==='text'&&IMG.has(EXT(m.n)&&EXT(m.n)!=='svg')))?TK('w','  (extension looks wrong!)'):''}`)}return o.join('\n')});
 def('du','Files','Disk usage of files and folders','du [-ahs] [path…]',async a=>{const{f,r}=flags(a),o=[];for(const p of r.length?r:['.']){const m=need(p);const rec=async(x,disp)=>{if(x.t==='f')return x.s;let s=0;for(const c of FS.kids(x.id)){await tick(1);const cs=await rec(c,disp+'/'+c.n);s+=cs;if(c.t==='f'&&f.has('a')&&!f.has('s'))o.push(fmtsz(cs,f)+'\t'+disp+'/'+c.n)}if(!f.has('s')||disp===p)o.push(fmtsz(s,f)+'\t'+disp);return s};await rec(m,p)}return o.join('\n')});
 const fmtsz=(n,f)=>f.has('h')?hs(n):String(Math.ceil(n/1024));
 def('df','System','Storage used by the virtual disk','df',async()=>{const[n,s]=FS.count('root');let q='';try{const e=await navigator.storage.estimate();q=`\nBrowser storage: ${hs(e.usage)} used of ${hs(e.quota)} available`}catch{}return`Reitzel disk (/)  ${n} items  ${hs(s)} of file data`+q});
 /* ---- reading & text ---- */
 def('cat','Text','Print files (or piped text)','cat [-n] [file…]',async(a,c)=>{const{f,r}=flags(a);let s='';if(!r.length&&c.stdin!=null)s=c.stdin;else for(const p of r){const m=need(p);if(await isBin(m)&&m.t==='f'){s+=TK('w',p+': binary file (use `file` or `edit`)\n');continue}s+=await readText(m)}return f.has('n')?s.split('\n').map((l,i)=>String(i+1).padStart(4)+'  '+l).join('\n'):s});
 const src=async(r,c)=>{if(!r.length&&c.stdin!=null)return c.stdin;let s='';for(const p of r)s+=await readText(need(p))+'\n';return s};
 def('head','Text','First lines of a file','head [-n 10] [file]',async(a,c)=>{const n=num(a,10);return(await src(flags(a).r,c)).split('\n').slice(0,n).join('\n')});
 def('tail','Text','Last lines of a file','tail [-n 10] [file]',async(a,c)=>{const n=num(a,10);return(await src(flags(a).r,c)).replace(/\n$/,'').split('\n').slice(-n).join('\n')});
 def('echo','Text','Print text','echo [-n] text…   (use > file or >> file to write)',async a=>{const n=a[0]==='-n';return a.slice(n?1:0).join(' ')});
 def('wc','Text','Count lines, words, characters','wc [-lwc] [file…]',async(a,c)=>{const{f,r}=flags(a),all=!f.size,one=s=>{const l=s.split('\n').length-(s.endsWith('\n')?1:0),wd=(s.match(/\S+/g)||[]).length;return[(all||f.has('l'))&&l,(all||f.has('w'))&&wd,(all||f.has('c'))&&s.length].filter(x=>x!==false).join('  ')};if(!r.length)return one(c.stdin||'');const o=[];for(const p of r)o.push(one(await readText(need(p)))+'  '+p);return o.join('\n')});
 def('sort','Text','Sort lines','sort [-rnuh] [file]',async(a,c)=>{const{f,r}=flags(a);let l=(await src(r,c)).replace(/\n$/,'').split('\n');const hv=s=>{const m=/^\s*([\d.]+)([KMG]?)/i.exec(s);return m?parseFloat(m[1])*({K:1024,M:1048576,G:1073741824}[m[2].toUpperCase()]||1):0};l.sort(f.has('h')?(x,y)=>hv(x)-hv(y):f.has('n')?(x,y)=>parseFloat(x)-parseFloat(y)||0:(x,y)=>x.localeCompare(y,undefined,{numeric:false}));if(f.has('r'))l.reverse();if(f.has('u'))l=l.filter((x,i)=>x!==l[i-1]);return l.join('\n')});
 def('uniq','Text','Remove adjacent duplicate lines','uniq [-c]',async(a,c)=>{const{f,r}=flags(a),l=(await src(r,c)).replace(/\n$/,'').split('\n'),o=[];l.forEach(x=>{const z=o[o.length-1];if(z&&z[0]===x)z[1]++;else o.push([x,1])});return o.map(([x,n])=>f.has('c')?String(n).padStart(5)+' '+x:x).join('\n')});
 def('grep','Text','Search for text in files or piped text','grep [-irnlc] <pattern> [file/folder…]',async(a,c)=>{const{f,r}=flags(a);if(!r.length)throw Error('grep: missing pattern');const pat=r.shift();let re;try{re=new RegExp(pat,f.has('i')?'gi':'g')}catch{re=new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),f.has('i')?'gi':'g')}const o=[];let hits=0;
  const scan=(txt,label)=>{let cnt=0;txt.split('\n').forEach((ln,i)=>{re.lastIndex=0;if(re.test(ln)){cnt++;if(!f.has('l')&&!f.has('c')){re.lastIndex=0;const hl=ln.replace(re,m=>TK('w',m));o.push((label?TK('d',label)+TK('m',':'):'')+(f.has('n')?TK('g',String(i+1))+TK('m',':'):'')+hl)}}});if(cnt)hits+=cnt;if(f.has('c'))o.push((label?label+':':'')+cnt);else if(f.has('l')&&cnt)o.push(TK('d',label))};
  if(!r.length&&c.stdin!=null){scan(c.stdin,'');return o.join('\n')}const files=[];for(const p of r.length?r:['.']){const m=need(p);if(m.t==='d'){if(!f.has('r')&&r.length)throw Error(p+': Is a directory (use -r)');await walk(m.id,async x=>{if(x.t==='f'&&x.s<5e6)files.push(x)})}else files.push(m)}
  const multi=files.length>1||f.has('r');for(const m of files){await tick(1);if(await isBin(m))continue;scan(await readText(m),multi?rel(m):'')}if(!hits)t.last=1;return o.join('\n')});
 def('find','Files','Find files and folders','find [path] [-name pattern] [-type f|d] [-size +1m]',async a=>{let start='.',nm=null,ty=null,sz=null;const r=[...a];if(r[0]&&!r[0].startsWith('-'))start=r.shift();for(let i=0;i<r.length;i+=2){if(r[i]==='-name')nm=globRe(r[i+1]||'*');else if(r[i]==='-type')ty=r[i+1];else if(r[i]==='-size')sz=r[i+1];else throw Error('find: unknown option '+r[i])}
  const root=need(start),o=[];let lim=null;if(sz){const m=/^([+-]?)(\d+)([kmg]?)$/i.exec(sz);if(!m)throw Error('find: bad -size');lim=[m[1]||'+',+m[2]*({k:1024,m:1048576,g:1073741824}[m[3].toLowerCase()]||1)]}
  await walk(root.id,m=>{if((!nm||nm.test(m.n))&&(!ty||m.t===ty)&&(!lim||(m.t==='f'&&(lim[0]==='-'?m.s<lim[1]:m.s>lim[1]))))o.push(m.t==='d'?TK('d',rel(m)):rel(m));return o.length<5000});return o.join('\n')+(o.length>=5000?'\n'+TK('w','(stopped at 5000 results)'):'')});
 /* ---- changing things ---- */
 def('touch','Files','Create empty files / update time','touch <file…>',async a=>{for(const x of a){const{dir,name}=parentOf(x);wr(dir);const e=FS.K.get(dir.id).get(name.toLowerCase());if(e)await FS.write(null,null,await FS.blob(e),e,0,'term');else await FS.write(dir.id,name,new Blob([]),null,0,'term')}return''});
 def('mkdir','Files','Create folders','mkdir [-p] <folder…>',async a=>{const{f,r}=flags(a);if(!r.length)throw Error('mkdir: missing operand');for(const x of r){if(f.has('p')){let cur=P2(x).startsWith('/')?FS.get('root'):FS.get(t.cwd);for(const s of P2(x).split('/').filter(z=>z&&z!=='.')){if(s==='..'){cur=FS.get(cur.p||'root');continue}const e=FS.K.get(cur.id).get(s.toLowerCase());if(e){cur=FS.get(e);if(cur.t!=='d')throw Error(x+': exists and is a file')}else{wr(cur);cur=await FS.mkdir(cur.id,s)}}}else{const{dir,name}=parentOf(x);wr(dir);if(FS.K.get(dir.id).get(name.toLowerCase()))throw Error(`${x}: File exists`);await FS.mkdir(dir.id,name)}}return''});
 def('rm','Files','Remove files or folders','rm [-rf] <path…>',async a=>{const{f,r}=flags(a);if(!r.length)throw Error('rm: missing operand');const ids=[];for(const p of r){const m=look(p);if(!m){if(f.has('f'))continue;throw Error(`${p}: No such file or directory`)}if(m.id==='root')throw Error("rm: refusing to remove '/'");if(m.ro||FS.get(m.p).ro)throw Error(`${p}: Permission denied (protected system item)`);if(m.t==='d'&&!f.has('r')&&!f.has('R'))throw Error(`${p}: Is a directory (use -r)`);if(FS.isIn(t.cwd,m.id))throw Error(`${p}: contains the current folder`);ids.push(m.id)}if(ids.length)await FS.trash(ids);return''});
 def('rmdir','Files','Remove empty folders','rmdir <folder…>',async a=>{for(const p of a){const m=need(p);if(m.t!=='d')throw Error(p+': Not a directory');if(FS.K.get(m.id).size)throw Error(p+': Directory not empty');if(m.ro)throw Error(p+': Permission denied');await FS.del([m.id])}return''});
 const dest=async(srcs,dp,op)=>{if(srcs.length<1)throw Error(op+': missing destination');const to=look(dp);if(srcs.length>1&&(!to||to.t!=='d'))throw Error(`${op}: target '${dp}' is not a folder`);return to};
 def('cp','Files','Copy files or folders','cp [-r] <source…> <dest>',async a=>{const{f,r}=flags(a);if(r.length<2)throw Error('cp: missing operand');const dp=r.pop(),to=await dest(r,dp,'cp');for(const p of r){const m=need(p);if(m.t==='d'&&!f.has('r')&&!f.has('R'))throw Error(`${p}: is a folder (use -r)`);if(to&&to.t==='d'){wr(to);await FS.copy([m.id],to.id)}else{const{dir,name}=parentOf(dp);wr(dir);if(m.t==='d')throw Error('cp: cannot overwrite a file with a folder');const ex=FS.K.get(dir.id).get(name.toLowerCase());await FS.write(dir.id,name,await FS.blob(m.id),ex||null,0,'term')}}return''});
 def('mv','Files','Move or rename','mv <source…> <dest>',async a=>{const{r}=flags(a);if(r.length<2)throw Error('mv: missing operand');const dp=r.pop(),to=await dest(r,dp,'mv');for(const p of r){const m=need(p);if(m.ro||FS.get(m.p).ro)throw Error(`${p}: Permission denied (protected)`);if(to&&to.t==='d'){wr(to);await FS.move([m.id],to.id)}else{const{dir,name}=parentOf(dp);wr(dir);if(dir.id!==m.p)await FS.move([m.id],dir.id);await FS.rename(m.id,name)}}return''});
 def('zip','Files','Create a zip archive','zip <archive.zip> <path…>',async a=>{if(a.length<2)throw Error('usage: zip <archive.zip> <path…>');const nm=a[0],ms=a.slice(1).map(need),{dir,name}=parentOf(nm);wr(dir);const f=await fsZip(ms,dir.id,/\.zip$/i.test(name)?name:name+'.zip');return TK('g','created ')+f.n+` (${hs(f.s)})`});
 def('unzip','Files','Extract a zip archive','unzip <archive.zip>',async a=>{if(!a[0])throw Error('usage: unzip <archive.zip>');const m=need(a[0]);if(m.t!=='f')throw Error('not a zip file');const d=FS.get(t.cwd);wr(d);const r=await fsExtract(m,d.id);return TK('g','extracted ')+r.count+' files into '+r.root.n+'/'});
 /* ---- system ---- */
 def('whoami','System','Print the current user','whoami',async()=>prof().name+(prof().admin?TK('m','  (administrator)'):''));
 def('hostname','System','Print the machine name','hostname',async()=>'reitzel');
 def('uname','System','System information','uname [-a]',async a=>a[0]==='-a'?'ReitzelOS 1.0 reitzel wasm-browser '+navigator.platform:'ReitzelOS');
 def('date','System','Show the date and time','date',async()=>new Date().toString());
 def('uptime','System','How long this session has been up','uptime',async()=>{const s=Math.floor((Date.now()-t.t0)/1000);return`terminal up ${Math.floor(s/60)}m ${s%60}s, ${W.length} windows open`});
 def('clear','System','Clear the screen','clear   (Ctrl+L)',async()=>{[...out.children].forEach(c=>c!==pr&&c.remove());return''});
 def('exit','System','Close this terminal','exit',async()=>{setTimeout(()=>closeW(w),0);return''});
 def('history','System','Show command history','history [-c]',async a=>{if(a[0]==='-c'){H0.length=0;save();return''}return H0.map((h,i)=>String(i+1).padStart(4)+'  '+h).join('\n')});
 def('alias','System','Define shortcuts for commands','alias [name=command]',async a=>{if(!a.length)return Object.entries(t.alias).map(([k,v])=>`alias ${k}='${v}'`).join('\n');for(const x of a){const i=x.indexOf('=');if(i<1)throw Error('usage: alias name=command');t.alias[x.slice(0,i)]=x.slice(i+1)}return''});
 def('unalias','System','Remove an alias','unalias <name>',async a=>{a.forEach(x=>delete t.alias[x]);return''});
 def('export','System','Set an environment variable','export NAME=value',async a=>{for(const x of a){const i=x.indexOf('=');if(i<1)throw Error('usage: export NAME=value');t.env[x.slice(0,i)]=x.slice(i+1)}return''});
 def('env','System','List environment variables','env',async()=>Object.entries(t.env).map(([k,v])=>k+'='+v).join('\n')+'\nPWD='+FS.path(t.cwd));
 def('which','System','Say what a command is','which <command>',async a=>a.map(x=>t.alias[x]?`${x}: aliased to ${t.alias[x]}`:CMD[x]?`${x}: built-in`:`${x} not found`).join('\n'));
 def('ps','System','List open windows','ps',async()=>W.map((x,i)=>`${String(i+1).padStart(3)}  ${(APPS[x.app]||{name:x.app}).name}${x.min?TK('m','  (minimized)'):''}`).join('\n'));
 def('kill','System','Close a window by its ps number','kill <number>',async a=>{const x=W[+a[0]-1];if(!x)throw Error('kill: no such window');closeW(x);return''});
 def('apps','Apps','List installed apps','apps',async()=>Object.keys(APPS).filter(k=>!APPS[k].hide).map(k=>TK('a',k.padEnd(12))+APPS[k].name).join('\n'));
 const findApp=n=>{n=n.toLowerCase();return Object.keys(APPS).find(k=>!APPS[k].hide&&(k.toLowerCase()===n||APPS[k].name.toLowerCase()===n))||Object.keys(APPS).find(k=>!APPS[k].hide&&APPS[k].name.toLowerCase().includes(n))};
 def('launch','Apps','Start an app','launch <app>   (see `apps`)',async a=>{const k=findApp(a.join(' '));if(!k)throw Error('launch: no app called “'+a.join(' ')+'”');openApp(k);return TK('g','started ')+APPS[k].name});
 def('open','Apps','Open a file or folder in an app','open [-a editor|files|scout|terminal] <path>',async a=>{let ap=null;const i=a.indexOf('-a');if(i>=0){ap=a[i+1];a.splice(i,2)}const m=need(a[0]||'.'),l=openersFor([m]);const o=ap?l.find(x=>x.id===ap||x.id==='file-scout'&&ap==='scout'||x.name.toLowerCase()===ap):(m.t==='f'&&(TXT.has(EXT(m.n))||!EXT(m.n))?l.find(x=>x.id==='editor'):l.find(x=>x.id==='files')||l[0]);if(!o)throw Error('open: no app available'+(ap?' named '+ap:'')+' (try: '+l.map(x=>x.id).join(', ')+')');o.open(m);return TK('g','opened ')+m.n+' with '+o.name});
 def('edit','Apps','Edit a file in Text Editor','edit <file>   (creates it if missing)',async a=>{if(!a[0])throw Error('usage: edit <file>');let m=look(a[0]);if(!m){const{dir,name}=parentOf(a[0]);wr(dir);m=await FS.write(dir.id,name,new Blob([]),null,0,'term')}if(m.t!=='f')throw Error(a[0]+': Is a directory');openInEditor(m.id);return''});
 def('vim','Fun','…','vim',async()=>{throw Error('vim: you can leave any time. (Try `edit` instead. Nobody is stuck here.)')});
 def('calc','Tools','Calculator','calc <expression>   e.g. calc (3+4)*sqrt(16)',async(a,c)=>calc(a.join(' ')||(c.stdin||'')));
 def('seq','Tools','Print a sequence of numbers','seq [first] last',async a=>{const[x,y]=a.length>1?[+a[0],+a[1]]:[1,+a[0]];if(!isFinite(x)||!isFinite(y)||Math.abs(y-x)>100000)throw Error('seq: bad range');const o=[];for(let i=x;i<=y;i++)o.push(i);return o.join('\n')});
 def('sleep','Tools','Wait a number of seconds','sleep <seconds>',async a=>{const n=Math.min(+a[0]||0,600);for(let i=0;i<n*10;i++){if(t.abort)throw Error('^C');await sleep(100)}return''});
 def('neofetch','Fun','System summary, ReitzelOS style','neofetch',async()=>{const[n,s]=FS.count('root'),A=x=>TK('a',x),B=x=>TK('u',x);const logo=['  ╭───────────╮','  │  ╭─╮ ╭──╮ │','  │  ├─╯ ╰─╮│ │','  │  │ ╭─╮ ││ │','  │  ╵ ╵ ╰─╯╵ │','  ╰───────────╯'].map(x=>A(x));const info=[B(user)+'@'+B('reitzel'),'─'.repeat(user.length+8),A('OS')+'       ReitzelOS',A('Shell')+'    rzsh (Terminal)',A('Files')+'    '+n+' items, '+hs(s),A('Windows')+'  '+W.length+' open',A('Apps')+'     '+Object.keys(APPS).filter(k=>!APPS[k].hide).length,A('Browser')+'  '+(navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/)||['?'])[0],A('Role')+'     '+(prof().admin?'administrator':'standard user')];return info.map((l,i)=>(logo[i]||' '.repeat(19))+'   '+l).join('\n')});
 def('users','Admin','List profiles','users',async()=>S.profiles.map(p=>p.name+(p.admin?TK('m',' (admin)'):'')+(p.id===S.cur?TK('g','  ← you'):'')).join('\n'));
 def('useradd','Admin','Create a standard profile (needs swat)','swat useradd <name>',async a=>{if(!a[0])throw Error('usage: swat useradd <name>');if(nameTaken(a[0],null))throw Error('useradd: that name is taken');await addProfile(a[0],false);return TK('g','created ')+a[0]+' (home: '+FS.path(S.profiles[S.profiles.length-1].home)+')'});
 def('userdel','Admin','Delete a profile (needs swat)','swat userdel <name>',async a=>{const p=S.profiles.find(x=>x.name.toLowerCase()===(a[0]||'').toLowerCase());if(!p)throw Error('userdel: no such user');if(p.id===S.cur)throw Error("userdel: you can't delete the profile you're using");if(p.root)throw Error('userdel: the root profile cannot be deleted');await dropProfile(p);return TK('g','deleted ')+p.name});
 def('passwd','Admin','Change a password','passwd [user]   (others need swat)',async(a,c)=>{const me=prof(),p=a[0]?S.profiles.find(x=>x.name.toLowerCase()===a[0].toLowerCase()):me;if(!p)throw Error('passwd: no such user');if(p!==me&&!c.el)throw Error('passwd: you can only change your own password (try: swat passwd '+a[0]+')');const v=await asked('New password for '+p.name+' (empty to remove): ',true);if(v===null)throw Error('cancelled');await setPw(p,v);save();return TK('g',v?'password updated':'password removed')});
 def('reboot','Admin','Restart ReitzelOS (needs swat)','swat reboot',async()=>{setTimeout(()=>{RZleave=1;sessionStorage.setItem('rz-restart',1);location.reload()},400);return TK('w','restarting…')});
 def('poweroff','Admin','Power off (needs swat)','swat poweroff',async()=>{setTimeout(()=>powerOff(),400);return TK('w','powering off…')});CMD.shutdown=CMD.poweroff;
 def('lock','System','Lock the screen','lock',async()=>{setTimeout(()=>lockNow(),200);return''});
 def('swat','Admin','Run a command as administrator','swat <command…>   (swat !! repeats your last command)',async a=>{if(!a.length)throw Error('usage: swat <command…>');const P=prof();if(!P.admin)throw Error(SWAT_JOKES[Math.floor(Math.random()*SWAT_JOKES.length)](P.name));
  if(!t.auth){if(!P.hash){emit(TK('m','[swat] no password is set for '+P.name+', so you’re waved through. Set one in Settings → Profiles.'));t.auth=true}else{for(let i=0;i<3&&!t.auth;i++){const pw=await asked(`[swat] password for ${user}: `,true);if(pw===null)throw Error('swat: cancelled');if(await hash(pw,P.salt)===P.hash)t.auth=true;else if(i<2)e_('Sorry, try again.')}if(!t.auth)throw Error('swat: 3 incorrect password attempts')}}
  if(a[0]==='!!')a=tokenize(H0[H0.length-2]||'').filter(x=>x.w!==undefined).map(x=>x.w);if(a[0]==='swat')throw Error('swat: it’s swats all the way down, but no.');return(await call(a[0],a.slice(1),null,true))});
 def('help','System','Show this help','help [command]',async a=>{if(a[0]){const c=CMD[a[0]];if(!c)throw Error('help: no command “'+a[0]+'”');return TK('a',a[0])+' — '+c.d+'\n  usage: '+c.u}
  const g={};Object.entries(CMD).forEach(([n,c])=>{if(n==='shutdown'||n==='vim')return;(g[c.g]=g[c.g]||[]).push(n)});return[TK('u','ReitzelOS Terminal')+'  ·  type '+TK('a','help <command>')+' for details, '+TK('a','Tab')+' to complete, '+TK('a','↑↓')+' for history','Pipes (|), redirects (> >>), ; and && all work. Globs like *.txt too.','',...['Files','Text','Apps','Tools','System','Admin','Fun'].filter(k=>g[k]).map(k=>TK('d',k.padEnd(7))+g[k].map(n=>TK('a',n)).join('  ')),'',TK('g','fag')+' <what you want to do>  — describe it in plain English and I’ll run the right command.','e.g.  '+TK('m','fag find all png files   ·   fag make a folder called Taxes   ·   fag biggest files')].join('\n')});
 CMD.man=CMD.help;
 /* ---- fag: plain-English → command ---- */
 const sq=x=>{x=x.trim().replace(/^["'`]|["'`]$/g,'').replace(/[?!.]+$/,'');return /[\s'"]/.test(x)?JSON.stringify(x):x||'.'};
 const FAG=[
  [/^(?:where am i|(?:what(?:'s| is) )?(?:the )?(?:current|my) (?:folder|directory|location|path))\??$/i,()=>'pwd'],
  [/hidden (?:files|stuff|things)(?: (?:in|of|inside) (.+))?$/i,m=>'ls -la '+sq(m[1]||'.')],
  [/^(?:go|cd|navigate|jump|move|take me)(?: me)? (?:up|back)(?: a (?:folder|level))?$/i,()=>'cd ..'],
  [/^(?:go|cd|navigate|jump|move|take me)(?: me)? (?:to|into|in) (?:the )?(?:folder |directory |dir )?(.+)$/i,m=>'cd '+sq(m[1])],
  [/^(?:make|create|new|add)(?: me)? (?:a |an )?(?:new )?(?:folder|directory|dir)(?: (?:called|named))? (.+)$/i,m=>'mkdir -p '+sq(m[1])],
  [/^(?:make|create|new|add)(?: me)? (?:a |an )?(?:new )?(?:text |empty |blank )?(?:file|note)(?: (?:called|named))? (.+)$/i,m=>'touch '+sq(m[1])],
  [/^(?:delete|remove|erase|trash|get rid of|rm) (?:the )?(?:file |folder |directory )?(.+)$/i,m=>({c:'rm -r '+sq(m[1]),danger:1})],
  [/^copy (.+?) (?:to|into) (.+)$/i,m=>`cp -r ${sq(m[1])} ${sq(m[2])}`],
  [/^(?:move|rename) (.+?) (?:to|into|as) (.+)$/i,m=>`mv ${sq(m[1])} ${sq(m[2])}`],
  [/^(?:search|look|grep|find)(?: for)?(?: the)? (?:text|word|words|string|phrase|lines? containing|anything(?: saying)?) ["'“]?(.+?)["'”]?(?: (?:in|inside|within|under) (.+))?$/i,m=>`grep -rin ${JSON.stringify(m[1])} ${sq(m[2]||'.')}`],
  [/^(?:how many|count)(?: the)? (?:files|things|items)(?: (?:are )?(?:in|inside|under) (.+))?$/i,m=>`find ${sq(m[1]||'.')} -type f | wc -l`],
  [/^(?:biggest|largest|heaviest|fattest) (?:files|things|stuff|folders)(?: (?:in|inside|under|of) (.+))?$/i,m=>`du -ah ${sq(m[1]||'.')} | sort -rh | head -n 10`],
  [/^(?:find|locate|list|show|search for|look for)(?: me)?(?: all| every| the)* \.?(\w{2,5}) files(?: (?:in|inside|under) (.+))?$/i,m=>`find ${sq(m[2]||'.')} -name "*.${m[1].toLowerCase()}"`],
  [/^(?:find|locate|search for|look for) (?:a |the )?(?:file |folder )?(?:called |named )?(.+?)(?: (?:in|inside|under) (.+))?$/i,m=>`find ${sq(m[2]||'.')} -name "*${m[1].trim().replace(/["']/g,'')}*"`],
  [/^(?:how (?:big|large)(?: is)?|size of|disk usage of|space (?:used )?(?:by|in)) (.+)$/i,m=>'du -sh '+sq(m[1])],
  [/^(?:how much (?:space|storage|disk)|disk space|storage)\b.*$/i,()=>'df'],
  [/^(?:count|how many) (lines|words|chars|characters) (?:in|of) (.+)$/i,m=>`wc -${/^l/i.test(m[1])?'l':/^w/i.test(m[1])?'w':'c'} ${sq(m[2])}`],
  [/^(?:show|display|view|print|read|cat|see)(?: me)? (?:the )?(?:tree|structure|hierarchy|layout)(?: (?:of|for) (.+))?$/i,m=>'tree '+sq(m[1]||'.')],
  [/^(?:tree|structure|hierarchy)(?: of (.+))?$/i,m=>'tree '+sq(m[1]||'.')],
  [/^(?:list|show|ls|what(?:'s| is))(?: me)?(?: (?:the )?(?:files|contents|folders?|everything|stuff|things))?(?: (?:in|of|inside|from|at) (.+))?\??$/i,m=>'ls -l '+sq(m[1]||'.')],
  [/^(?:zip|compress|archive|pack)(?: up)? (.+?)(?: (?:as|to|into) (.+))?$/i,m=>`zip ${sq(m[2]||(m[1].replace(/[\/\\]+$/,'').split('/').pop()+'.zip'))} ${sq(m[1])}`],
  [/^(?:unzip|extract|decompress|unpack)(?: the)? (.+)$/i,m=>'unzip '+sq(m[1])],
  [/^(?:edit|open|modify|change) (.+?) (?:in|with|using) (?:the )?(?:text )?(?:editor|notepad)$/i,m=>'edit '+sq(m[1])],
  [/^(?:edit|modify) (.+)$/i,m=>'edit '+sq(m[1])],
  [/^(?:show|display|read|print|view|see|cat)(?: me)? (?:the )?(?:contents? of |what(?:'s| is) in |inside )?(.+)$/i,m=>'cat '+sq(m[1])],
  [/^(?:calculate|calc|compute|what(?:'s| is)|whats|solve) ([\d\s+\-*\/%^().,a-z]+?)\??$/i,m=>/\d/.test(m[1])&&/^[\d\s+\-*\/%^().,]*$|sqrt|sin|cos|pi/i.test(m[1])?'calc '+m[1]:null],
  [/^(?:list|show|what)(?: me)?(?: the)? (?:apps|applications|programs)\b.*$/i,()=>'apps'],
  [/^(?:launch|start|run|open)(?: up)?(?: the)? (.+?)(?: app| application)?$/i,m=>findApp(m[1])?'launch '+sq(m[1]):'open '+sq(m[1])],
  [/^(?:what(?:'s| is) running|running (?:apps|windows|programs)|processes)$/i,()=>'ps'],
  [/^(?:system|computer) info(?:rmation)?|about (?:this|my) (?:computer|system|os)$/i,()=>'neofetch'],
  [/^(?:what(?:'s| is) the )?(?:time|date)(?: now)?\??$|^what time is it\??$/i,()=>'date'],
  [/^who am i\??$/i,()=>'whoami'],
  [/^(?:clear|clean)(?: the)?(?: screen| terminal)?$/i,()=>'clear'],
  [/^(?:history|what did i (?:run|type))$/i,()=>'history'],
  [/^(?:lock)(?: the)?(?: screen| computer)?$/i,()=>'lock'],
  [/^(?:restart|reboot)(?: the)?(?: computer| system| os)?$/i,()=>({c:'swat reboot',danger:1})],
  [/^(?:shut ?down|power off|turn off)(?: the)?(?: computer| system| os)?$/i,()=>({c:'swat poweroff',danger:1})],
  [/^(?:help|what can you do|commands)\??$/i,()=>'help']];
 def('fag','Fun','Say what you want in plain English — I run the command','fag <what you want to do>   e.g. fag find all txt files · fag copy notes.txt to Documents · fag -n … previews only',async a=>{let dry=false;if(a[0]==='-n'){dry=true;a=a.slice(1)}let s=a.join(' ').trim().replace(/^(?:please|pls|can you|could you|would you|i (?:want|need|'d like) to|how (?:do|can) i|let'?s|just)\s+/i,'').replace(/\s+please$/i,'');
  if(!s)return[TK('g','fag')+' turns plain English into commands. Try:','  fag find all png files','  fag make a folder called Taxes','  fag biggest files in Documents','  fag copy notes.txt to Documents','  fag search for text invoice in Documents','  fag zip Documents as backup.zip','  fag what is 12*(3+4)','  fag -n delete Downloads   '+TK('m','(-n = just show the command)')].join('\n');
  for(const[re,fn]of FAG){const m=re.exec(s);if(!m)continue;let r=fn(m);if(!r)continue;const cmd=r.c||r;emit(TK('m','fag › ')+TK('a',cmd));if(dry)return'';if(r.danger){const ans=await asked('Run it? [y/N] ');if(!ans||!/^y/i.test(ans))return TK('m','fag: okay, nothing was changed.')}await runLine(cmd,true);return''}
  throw Error('fag: I couldn’t work out “'+s+'”. Run `fag` on its own for examples, or `help` for every command.')});
 /* ---- parsing & running ---- */
 function tokenize(s){const o=[];let cur='',has=false,qd=false,q=null;const vr=n=>n==='?'?String(t.last):n==='PWD'?FS.path(t.cwd):t.env[n]||'';const push=()=>{if(has){o.push({w:cur,q:qd});cur='';has=false;qd=false}};
  for(let i=0;i<s.length;i++){const c=s[i];
   if(q){if(c===q)q=null;else if(c==='\\'&&q==='"'&&i+1<s.length)cur+=s[++i];else if(c==='$'&&q==='"'){const m=/^\$(\w+|\?)/.exec(s.slice(i));if(m){cur+=vr(m[1]);i+=m[0].length-1}else cur+=c}else cur+=c;continue}
   if(c==='"'||c==="'"){q=c;has=true;qd=true;continue}
   if(c==='\\'&&i+1<s.length){cur+=s[++i];has=true;qd=true;continue}
   if(c==='$'){const m=/^\$(\w+|\?)/.exec(s.slice(i));if(m){cur+=vr(m[1]);i+=m[0].length-1;has=true;continue}}
   if(/\s/.test(c)){push();continue}
   if(c==='|'){push();o.push({op:'|'});continue}if(c===';'){push();o.push({op:';'});continue}
   if(c==='&'&&s[i+1]==='&'){push();o.push({op:'&&'});i++;continue}
   if(c==='>'){push();if(s[i+1]==='>'){o.push({op:'>>'});i++}else o.push({op:'>'});continue}
   cur+=c;has=true}
  if(q)throw Error('syntax error: unterminated quote');push();return o}
 function group(tk){const seqs=[];let cur={pipe:[{argv:[]}],op:';'},rd=null;for(const x of tk){if(x.op==='|')cur.pipe.push({argv:[]});else if(x.op===';'||x.op==='&&'){seqs.push(cur);cur={pipe:[{argv:[]}],op:x.op}}else if(x.op==='>'||x.op==='>>')rd=x.op;else{const c=cur.pipe[cur.pipe.length-1];if(rd){c.redir={m:rd,f:x.w};rd=null}else c.argv.push(x)}}if(rd)throw Error('syntax error: expected a file name after '+rd);seqs.push(cur);return seqs}
 async function call(name,args,stdin,el){const c=CMD[name];if(!c)throw Error(name+': command not found'+(CMD[name.toLowerCase()]?' (did you mean '+name.toLowerCase()+'?)':'  — try `help`'));if(PRIV.has(name)&&!el)throw Error(name+': permission denied (try: swat '+name+')');
  if(args.includes('--help'))return TK('a',name)+' — '+c.d+'\n  usage: '+c.u;return await c.f(args,{stdin,el,t})}
 async function runLine(line,quiet){let seqs;try{seqs=group(tokenize(line))}catch(x){e_(x.message);t.last=2;return}
  for(const sq_ of seqs){if(sq_.op==='&&'&&t.last!==0)continue;t.last=0;let stdin=null;
   for(let k=0;k<sq_.pipe.length;k++){const st=sq_.pipe[k];let av=st.argv;if(!av.length){if(sq_.pipe.length>1){e_('syntax error near |');t.last=2}break}
    let seen=0;while(t.alias[av[0].w]&&!av[0].q&&seen++<5)av=[...tokenize(t.alias[av[0].w]),...av.slice(1)].filter(x=>x.w!==undefined);
    const args=av.slice(1).flatMap(expand);
    try{let o=await call(av[0].w,args,stdin);o=o==null?'':String(o);const last=k===sq_.pipe.length-1;
     if(!last){stdin=TKS(o);continue}
     if(st.redir){await writeFile(st.redir.f,TKS(o).replace(/\n?$/,'\n'),st.redir.m==='>>')}else if(o!=='')emit(o)}
    catch(x){t.last=1;if(x.message!=='^C')e_(x.message||String(x));else emit(TK('m','^C'));break}}
   if(t.abort)break}}
 async function run(line){line=line.replace(/^!!$/,H0[H0.length-1]||'');if(H0[H0.length-1]!==line&&line.trim()){H0.push(line);if(H0.length>300)H0.shift();save()}t.hi=-1;
  const d=mkl();d.innerHTML=promptHtml()+ESC(line);out.insertBefore(d,pr);if(!line.trim()){scroll();return}
  t.busy=true;t.abort=false;pr.style.display='none';try{await runLine(line)}catch(x){e_(x.message||String(x))}t.busy=false;t.abort=false;setP();pr.style.display='flex';inp.focus();scroll()}
 /* completion */
 function complete(){const v=inp.value,pos=inp.selectionStart,before=v.slice(0,pos),m=/(\S*)$/.exec(before),tokenStr=m[1],isCmd=!/\s/.test(before.slice(0,m.index).trim())&&!/[|;&]\s*$/.test(before.slice(0,m.index))?before.slice(0,m.index).trim()==='':/[|;]\s*$|&&\s*$/.test(before.slice(0,m.index));let cand=[];const raw=tokenStr.replace(/\\ /g,' ');
  if(isCmd&&!/\//.test(raw))cand=[...Object.keys(CMD),...Object.keys(t.alias)].filter(c=>c.startsWith(raw)).sort();
  else{const i=raw.lastIndexOf('/'),dp=i<0?'.':(raw.slice(0,i)||'/'),pre=raw.slice(i+1).toLowerCase(),d=look(dp);if(d&&d.t==='d')cand=FS.kids(d.id).filter(x=>x.n.toLowerCase().startsWith(pre)&&(pre||x.n[0]!=='.')).map(x=>(i<0?'':raw.slice(0,i+1))+x.n+(x.t==='d'?'/':'')).sort()}
  if(!cand.length)return;let pfx=cand[0];for(const c of cand)while(!c.toLowerCase().startsWith(pfx.toLowerCase()))pfx=pfx.slice(0,-1);const one=cand.length===1,ins=(pfx.length>=raw.length?pfx:raw).replace(/ /g,'\\ ')+(one&&!pfx.endsWith('/')?' ':'');
  inp.value=before.slice(0,m.index)+ins+v.slice(pos);inp.setSelectionRange(m.index+ins.length,m.index+ins.length);
  if(!one&&t.tabs===v){emit(promptHtml().replace(/<[^>]+>/g,'')+v);emit(cand.map(c=>c.replace(/\/$/,'')===c?c:TK('d',c)).join('  '))}t.tabs=inp.value}
 inp.onkeydown=e=>{e.stopPropagation();const k=e.key,ctl=e.ctrlKey||e.metaKey;
  if(k==='Enter'){e.preventDefault();const v=inp.value;inp.value='';if(t.askr){const r=t.askr;t.askr=null;const sec=inp.type==='password';inp.type='text';const d=mkl();d.textContent=pp.textContent+(sec?'':v);out.insertBefore(d,pr);pr.style.display='none';r(v);return}if(!t.busy)run(v)}
  else if(ctl&&k.toLowerCase()==='c'&&(!window.getSelection().toString()||inp.selectionStart!==inp.selectionEnd||true)){if(t.askr){e.preventDefault();const r=t.askr;t.askr=null;inp.type='text';inp.value='';emit(TK('m','^C'));pr.style.display='none';r(null)}else if(t.busy){e.preventDefault();t.abort=true}else if(inp.selectionStart===inp.selectionEnd){e.preventDefault();const d=mkl();d.innerHTML=promptHtml()+ESC(inp.value)+TK('m','^C').replace(/\u0001.|\u0002/g,'');out.insertBefore(d,pr);inp.value='';scroll()}}
  else if(ctl&&k.toLowerCase()==='l'){e.preventDefault();CMD.clear.f()}else if(ctl&&k.toLowerCase()==='u'){e.preventDefault();inp.value=inp.value.slice(inp.selectionStart)}else if(ctl&&k.toLowerCase()==='k'){e.preventDefault();inp.value=inp.value.slice(0,inp.selectionStart)}else if(ctl&&k.toLowerCase()==='a'){e.preventDefault();inp.setSelectionRange(0,0)}else if(ctl&&k.toLowerCase()==='e'){e.preventDefault();inp.setSelectionRange(1e6,1e6)}
  else if(ctl&&k.toLowerCase()==='w'){e.preventDefault();const b=inp.value.slice(0,inp.selectionStart).replace(/\S*\s*$/,'');inp.value=b+inp.value.slice(inp.selectionStart);inp.setSelectionRange(b.length,b.length)}
  else if(k==='Tab'){e.preventDefault();if(!t.busy&&!t.askr)complete()}
  else if(k==='ArrowUp'&&!t.askr){e.preventDefault();if(t.hi<0)t.hi=H0.length;t.hi=Math.max(0,t.hi-1);if(H0[t.hi]!=null)inp.value=H0[t.hi]}else if(k==='ArrowDown'&&!t.askr){e.preventDefault();if(t.hi<0)return;t.hi++;inp.value=t.hi>=H0.length?'':H0[t.hi];if(t.hi>=H0.length)t.hi=-1}};
 tmEl.addEventListener('pointerdown',e=>{if(!window.getSelection().toString())setTimeout(()=>{if(!window.getSelection().toString())inp.focus()},0)});
 emit(TK('u','ReitzelOS Terminal')+TK('m','  ·  ')+'type '+TK('a','help')+' to see what I can do.\n');
 setP();setTimeout(()=>inp.focus(),60);
}
/* ---------- register ---------- */
Object.assign(APPS.files,{fm:true,name:'My Files',icon:'folder',w:900,h:560,render:renderFiles,ctx:(e,w)=>w.fm?w.fm.menu(e):null});
APPS.editor={name:'Text Editor',icon:'editor',w:880,h:560,render:renderEditor};
APPS.fsdlg={name:'My Files',icon:'folder',w:700,h:470,hide:true,render:(b,w)=>{w.temp=true;renderFiles(b,w,w.tab)},ctx:(e,w)=>w.fm?w.fm.menu(e):null};
APPS.terminal={name:'Terminal',icon:'terminal',w:760,h:480,render:renderTerm};
APPS.store={name:'App Store',icon:'tote-store',w:860,h:560,render:renderStore};
addEventListener('keydown',e=>{const w=W.find(x=>x.el.classList.contains('foc')&&!x.min);if(!w||document.querySelector('.md'))return;
 if(w.app==='files'||w.app==='fsdlg'){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){e.preventDefault();w.fmFind&&w.fmFind()}}else if(w.app==='file-scout'||w.app==='scoutdlg'){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();w.skFind&&w.skFind()}}else if(w.app==='editor'&&w.edKey&&!(e.target.closest&&e.target.closest('.md')))w.edKey(e)});
