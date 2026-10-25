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
   if(!M.has('root')){const now=Date.now(),ns=[{id:'root',p:null,n:'',t:'d',s:0,m:now}];link(ns[0]);for(const n of['Documents','Pictures','Downloads','Desktop']){const m={id:nid(),p:'root',n,t:'d',s:0,m:now};link(m);ns.push(m)}await persist(ns,[],[])}
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
  search(root,q,hidden,limit=20000){q=q.toLowerCase();const out=[],st=[root];while(st.length&&out.length<limit){const d=st.pop();const k=K.get(d);if(!k)continue;for(const[ln,id]of k){if(!hidden&&ln[0]==='.')continue;if(ln.includes(q))out.push(M.get(id));const m=M.get(id);if(m.t==='d')st.push(id)}}return out},
  count(id){let n=0,sz=0;const st=[id];while(st.length){const k=K.get(st.pop());if(k)for(const c of k.values()){const m=M.get(c);n++;sz+=m.s||0;if(m.t==='d')st.push(c)}}return[n,sz]},
  async syncSys(){try{let sys=F.resolve('/.system');sys=sys?M.get(sys):await F.mkdir('root','.system',1);let as=K.get(sys.id).get('assets');as=as?M.get(as):await F.mkdir(sys.id,'assets',1);
   const files=['index.html','style.css','os.js','apps.js','sw.js'],assets=['reitzel','folder','folder-single','compass-settings','network','editor','file-image','file-generic','file-scout','tote-store'].map(x=>x+'-icon.svg');
   for(const[par,list,pf]of[[sys,files,''],[as,assets,'assets/']])for(const f of list){try{const r=await fetch(pf+f);if(!r.ok)continue;const b=await r.blob(),old=K.get(par.id).get(f);
    if(old&&M.get(old).s===b.size)continue;if(old)await F.write(null,f,b,old);else await F.write(par.id,f,b,null,1)}catch{}}
   }catch(e){console.error('sys sync',e)}}
 };return F})();
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
function fileDialog(parent,o,cb){o.cb=cb;const bl=H('div','',parent.el);bl.style.cssText='position:absolute;inset:0;z-index:50;background:#0007;border-radius:inherit';
 const d=openApp('fsdlg',{tab:o});$('.tbar span',d.el).textContent=o.title;d.onclose=()=>bl.remove();bl.onpointerdown=e=>{e.stopPropagation();focusW(d)};
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
function renderFiles(body,w,dlg){const P=S.fm||(S.fm={view:'medium',hidden:false,ext:true}),st={cur:'root',hist:['root'],hi:0,q:'',items:[],sel:new Set(),anchor:-1,sort:{k:'n',d:1},tok:0};
 body.innerHTML=`<div class=fm><div class=fm-top><button class=bk title=Back>←</button><button class=fw title=Forward>→</button><button class=up title="Up">↑</button><input class="in fm-addr" spellcheck=false placeholder="Search here, or type a path starting with /"><span class=vwh></span><button class=hd title="Show hidden files">Hidden</button><button class=ex title="Show file extensions">.ext</button></div><div class=fm-main><div class=fm-side></div><div class=fm-view><div class=fm-hd></div><div class=fm-vs><div class=fm-sp></div></div></div></div>${dlg?'<div class=fm-dlg></div>':''}<div class=fm-st><span class=s1></span><span class=s2></span></div></div>`;
 const q=s=>$(s,body),addr=q('.fm-addr'),vs=q('.fm-vs'),sp=q('.fm-sp'),hd=q('.fm-hd'),fm=q('.fm'),rendered=new Map();let cols=1,dim=FMV[P.view],raf=0;
 const nameOf=m=>P.ext||m.t==='d'?m.n:FS.split(m.n)[0];
 const ro=()=>!!FS.get(st.cur).ro,pathTxt=()=>FS.path(st.cur);
 const cmp=()=>{const{k,d}=st.sort,C=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});return(a,b)=>{if(a.t!==b.t)return a.t==='d'?-1:1;let r=k==='s'?(a.s||0)-(b.s||0):k==='m'?a.m-b.m:k==='t'?C.compare(EXT(a.n),EXT(b.n)):C.compare(a.n,b.n);return(r||C.compare(a.n,b.n))*d}};
 function load(){let it=st.q?FS.search(st.cur,st.q,P.hidden):FS.kids(st.cur).filter(m=>P.hidden||m.n[0]!=='.');it.sort(cmp());st.items=it;const keep=new Set(it.map(m=>m.id));[...st.sel].forEach(i=>keep.has(i)||st.sel.delete(i));full()}
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
 function side(){const s=q('.fm-side');s.innerHTML='<small>Places</small>';const pl=[['Home','root','folder-single']];['Desktop','Documents','Pictures','Downloads'].forEach(n=>{const i=FS.K.get('root').get(n.toLowerCase());i&&pl.push([n,i,'folder-single'])});pl.forEach(([n,id,ic])=>{const b=H('button',FS.isIn(st.cur,id)&&(id!=='root'||st.cur==='root')?'on':'',s,`<img src="${IC(ic)}"><span>${n}</span>`);b.onclick=()=>go(id)})}
 function go(id,nh){if(!FS.get(id))id='root';st.cur=id;st.q='';st.sel.clear();st.anchor=-1;if(!nh){st.hist=st.hist.slice(0,st.hi+1);if(st.hist[st.hi]!==id){st.hist.push(id);st.hi++}}addr.value=pathTxt();vs.scrollTop=0;side();nav();load()}
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
 function openItem(m){if(!m)return;if(dlg){if(m.t==='d')return go(m.id);st.sel=new Set([m.id]);paint();return dlgOk()}if(m.t==='d')return go(m.id);const e=EXT(m.n);if(e==='zip')return askExtract(m);if(IMG.has(e)&&e!=='svg'||VID.has(e)||AUD.has(e))return view(m);if(TXT.has(e)||e===''||e==='svg')return e==='svg'?view(m):openInEditor(m.id);view(m)}
 /* actions */
 const err=x=>RZ.toast(x.message||String(x)),sels=()=>st.items.filter(m=>st.sel.has(m.id)),chk=()=>{if(ro()){RZ.toast('This location is read-only');return false}return true};
 const reselect=ids=>{load();st.sel=new Set(ids);paint();const i=st.items.findIndex(m=>st.sel.has(m.id));if(i>=0){const t=Math.floor(i/cols)*dim.h;if(t<vs.scrollTop||t>vs.scrollTop+vs.clientHeight-dim.h)vs.scrollTop=t-dim.h}};
 const newFolder=()=>chk()&&modal(fm,{title:'New folder',input:'New folder'},(l,v)=>{v=v.trim();if(!FS.valid(v)){RZ.toast('Invalid name');return false}FS.mkdir(st.cur,v).then(m=>reselect([m.id]),err)});
 const newText=()=>chk()&&modal(fm,{title:'New text file',input:'New text file.txt',sel:13},(l,v)=>{v=v.trim();if(!FS.valid(v)){RZ.toast('Invalid name');return false}FS.write(st.cur,v,new Blob([])).then(m=>reselect([m.id]),err)});
 const doRename=m=>{if(m.ro)return RZ.toast('System files cannot be renamed');modal(fm,{title:'Rename',input:m.n,sel:m.t==='d'?m.n.length:FS.split(m.n)[0].length},(l,v)=>{v=v.trim();if(v===m.n)return;FS.rename(m.id,v).then(()=>reselect([m.id]),err)})};
 const del=()=>{const s=sels();if(!s.length||!chk())return;if(s.some(m=>m.ro))return RZ.toast('System files cannot be deleted');modal(fm,{title:'Delete',msg:`Permanently delete ${s.length===1?'“'+s[0].n+'”':s.length+' items'}? This cannot be undone.`,btns:['Delete']},()=>{FS.del(s.map(m=>m.id)).then(()=>{st.sel.clear();load()},err)})};
 const copy=cut=>{const s=sels();if(!s.length)return;if(cut&&(!chk()||s.some(m=>m.ro)))return RZ.toast('Cannot cut read-only items');FSclip.ids=s.map(m=>m.id);FSclip.cut=cut;paint();RZ.toast((cut?'Cut ':'Copied ')+s.length+' item'+(s.length>1?'s':''))};
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
 w.fm={menu(e){if(dlg)return[['New folder',newFolder,ro()&&'dis']];const t=e.target.closest('.fi,.fr');if(!t||e.target.closest('.fm-top,.fm-side')){if(e.target.closest('.fm-top,.fm-side,.fm-st'))return[['Close',()=>closeW(w)]];st.sel.clear();paint();const r=ro();return[['New folder',newFolder,r&&'dis'],['New text file (.txt)',newText,r&&'dis'],['New zip archive…',newZip,r&&'dis'],'sep',['Paste',paste,(r||!FSclip.ids.length)&&'dis'],['Import files…',upload,r&&'dis'],'sep',['Select all',()=>{st.items.forEach(m=>st.sel.add(m.id));paint()}],['Refresh',load],...(st.cur!=='root'?[['Add shortcut to this folder on desktop',()=>SC.add(FS.get(st.cur))]]:[])]}
   const m=st.items[+t.dataset.i];if(!st.sel.has(m.id)){st.sel.clear();st.sel.add(m.id);paint()}const s=sels(),one=s.length===1,lock=ro()||s.some(x=>x.ro);
   return[['Open',()=>s.forEach(openItem)],...(one&&/\.zip$/i.test(m.n)?[['Extract here…',()=>askExtract(m)]]:[]),...(one&&m.t==='f'&&TXT.has(EXT(m.n))?[['Open in Text Editor',()=>openInEditor(m.id)]]:[]),'sep',['Cut',()=>copy(true),lock&&'dis'],['Copy',()=>copy(false)],['Paste',paste,(ro()||!FSclip.ids.length)&&'dis'],'sep',['Rename',()=>doRename(m),(!one||m.ro)&&'dis'],['Add to zip…',zipSel,ro()&&'dis'],['Add shortcut to desktop',()=>s.forEach(x=>SC.add(x))],...(one&&m.t==='f'?[['Download',()=>exportF(m)]]:[]),'sep',['Delete',del,lock&&'dis'],['Properties',()=>{const[n,sz]=m.t==='d'?FS.count(m.id):[0,m.s];modal(fm,{title:m.n,msg:`${typeOf(m)}\nLocation: ${FS.path(m.p)}\nSize: ${fmtSz(sz)}${m.t==='d'?' ('+n+' items inside)':''}\nModified: ${fmtDt(m.m)}${m.ro?'\nProtected system item':''}`,cancel:false})},'']].map(x=>x==='sep'?x:x.slice(0,3))}};
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
const CATALOG=[{id:'file-scout',name:'File Scout',icon:'file-scout',tag:'Utilities',tagline:'A clean, customizable file manager',by:'Reitzel',desc:'File Scout is a clean, highly customizable file manager with tabs, dual panes and your own layouts. Browse your files exactly the way you like.',versions:[]}];
const inst=()=>S.installed||(S.installed={});
function uninstall(id){delete inst()[id];S.pins=(S.pins||[]).filter(x=>x!==id);S.desk=(S.desk||[]).filter(x=>x.app!==id);W.filter(x=>x.app===id).forEach(closeW);delete APPS[id];save();renderTB();desk()}
function renderStore(body){body.innerHTML=`<div class=st><div class=st-nav><h2><img src="${IC('tote-store')}">App Store</h2><button data-t=d>Discover</button><button data-t=i>Installed</button></div><div class=st-main></div></div>`;
 const main=$('.st-main',body);let tab='d',qy='',sel=null;
 const nav=()=>body.querySelectorAll('.st-nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab&&!sel));
 body.querySelectorAll('.st-nav button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;sel=null;draw()});
 function card(a,p){const c=H('button','st-card',p,`<img src="${IC(a.icon)}"><div><b></b><small></small></div>`);$('b',c).textContent=a.name;$('small',c).textContent=a.tagline;const t=H('span','st-tag',$('div',c),inst()[a.id]?'Installed':a.versions.length?'Available':'No versions yet');c.onclick=()=>{sel=a;draw()}}
 function draw(){main.innerHTML='';nav();
  if(sel){const a=sel,bk=H('button','btn',main,'← Back');bk.style.alignSelf='flex-start';bk.onclick=()=>{sel=null;draw()};const h=H('div','st-hero',main,`<img src="${IC(a.icon)}"><div><h2></h2><small style="opacity:.65"></small></div>`);$('h2',h).textContent=a.name;$('small',h).textContent=a.by+' · '+a.tag;
   const v=a.versions[a.versions.length-1];if(inst()[a.id]){const r=H('div','',main);H('button','btn dng',r,'Uninstall').onclick=()=>{uninstall(a.id);draw()}}else{const b=H('button','btn pri',main,v?'Install '+v.v:'No versions installable');b.style.alignSelf='flex-start';b.disabled=!v;if(!v)b.style.opacity=.5;else b.onclick=()=>{inst()[a.id]=v.v;save();draw()}}
   if(!v)H('small','',main,'There are currently no versions of this app that can be installed. Check back later.').style.opacity=.6;H('p','',main).textContent=a.desc;
   const i=H('div','st-info',main);[['Category',a.tag],['Publisher',a.by],['Latest version',v?v.v:'None available'],['Status',inst()[a.id]?'Installed ('+inst()[a.id]+')':'Not installed']].forEach(([k,x])=>{H('span','',i).textContent=k;H('span','',i).textContent=x});return}
  if(tab==='d'){const s=H('input','in',main);s.placeholder='Search apps';s.value=qy;s.oninput=()=>{qy=s.value;list()};H('h3','',main).textContent='Discover';const g=H('div','st-grid',main);const list=()=>{g.innerHTML='';const r=CATALOG.filter(a=>(a.name+a.tagline+a.tag).toLowerCase().includes(qy.toLowerCase()));r.forEach(a=>card(a,g));if(!r.length)H('div','st-empty',g,'No apps found')};list();s.onkeydown=e=>e.stopPropagation()}
  else{H('h3','',main).textContent='Installed';const l=CATALOG.filter(a=>inst()[a.id]);if(!l.length)H('div','st-empty',main,'No apps installed yet');l.forEach(a=>{const r=H('div','st-row',main,`<img src="${IC(a.icon)}"><div><b></b><br><small style="opacity:.6"></small></div>`);$('b',r).textContent=a.name;$('small',r).textContent='Version '+inst()[a.id];H('button','btn',r,'Details').onclick=()=>{sel=a;draw()};H('button','btn dng',r,'Uninstall').onclick=()=>{uninstall(a.id);draw()}})}}
 draw()}
/* ---------- desktop shortcuts (/Desktop/shortcuts.syst) ---------- */
const SC=(()=>{const NAME='shortcuts.syst';let items=[],bad=false,last='',fid=null,q=Promise.resolve(),lt=0;
 const dId=()=>FS.K.get('root').get('desktop'),fileId=()=>{const d=dId();return d&&FS.K.get(d).get(NAME)||null};
 const ok=j=>j&&typeof j==='object'&&j.format==='reitzel-shortcuts'&&Array.isArray(j.shortcuts)&&j.shortcuts.every(s=>s&&typeof s==='object'&&typeof s.name==='string'&&s.name&&typeof s.target==='string'&&s.target[0]==='/'&&(s.kind==='file'||s.kind==='folder')&&Number.isInteger(s.c)&&Number.isInteger(s.r)&&s.c>=0&&s.r>=0);
 const mk=(s,i)=>{const id=FS.resolve(s.target),m=id&&FS.get(id);return{id:'f'+i+'_'+s.target,fsc:1,app:'__sc',name:s.name,path:s.target,kind:s.kind,c:s.c,r:s.r,icon:m?iconOf(m):(s.kind==='folder'?'folder':'file-generic')}};
 const ser=l=>JSON.stringify({format:'reitzel-shortcuts',version:1,shortcuts:l.map(x=>({name:x.name,target:x.path,kind:x.kind,c:x.c,r:x.r}))},null,2);
 last=ser([]);
 const redraw=()=>{try{if(S&&S.desk)desk()}catch{}};
 async function load(){bad=false;fid=fileId();let list=[];if(fid){try{const j=JSON.parse(await(await FS.blob(fid)).text());if(ok(j))list=j.shortcuts.map(mk);else bad=true}catch{bad=true}}items=list;last=bad?'':ser(items);redraw()}
 function write(){if(bad)return;const s=ser(items);if(s===last)return;last=s;q=q.then(async()=>{const f=fileId(),b=new Blob([s]);if(f)await FS.write(null,null,b,f,0,'desk');else{let d=dId();if(!d)d=(await FS.mkdir('root','Desktop')).id;await FS.write(d,NAME,b,null,0,'desk')}fid=fileId()}).catch(console.error)}
 window.deskPre=()=>{S.desk=S.desk.filter(x=>!x.fsc).concat(items)};
 window.deskHook=()=>{if(!S||!S.desk)return;items=S.desk.filter(x=>x.fsc);write()};
 window.openShortcut=s=>{const id=FS.resolve(s.path),m=id&&FS.get(id);if(!m)return RZ.toast('Shortcut target not found: '+s.path);const e=EXT(m.n);if(m.t==='f'&&e!=='svg'&&(TXT.has(e)||!e))openInEditor(id);else openApp('files',{tab:id})};
 FS.ready.then(()=>{load();FS.on(ev=>{if(ev.by==='desk')return;if(fileId()!==fid||(fid&&ev.ids.includes(fid))||items.some(x=>ev.ids.includes(FS.resolve(x.path)))){clearTimeout(lt);lt=setTimeout(load,60)}})});
 return{add(m){if(!m)return;if(bad)return RZ.toast('shortcuts.syst is malformed — fix or delete it first');const path=FS.path(m.id);if(items.some(x=>x.path===path))return RZ.toast('Already on the desktop');
  const G=grid(),tk=new Set();S.desk.forEach(o=>o.dc!=null&&tk.add(o.dc+','+o.dr));let pos=null;for(let c=0;c<G.c&&!pos;c++)for(let r=0;r<G.r;r++)if(!tk.has(c+','+r)){pos=[c,r];break}if(!pos)return RZ.toast('Desktop is full');
  const it=mk({name:m.n,target:path,kind:m.t==='d'?'folder':'file',c:pos[0],r:pos[1]},items.length+Date.now());items.push(it);S.desk.push(it);write();desk();RZ.toast('Shortcut added to desktop')}}})();
/* ---------- register ---------- */
Object.assign(APPS.files,{name:'My Files',icon:'folder',w:900,h:560,render:renderFiles,ctx:(e,w)=>w.fm?w.fm.menu(e):null});
APPS.editor={name:'Text Editor',icon:'editor',w:880,h:560,render:renderEditor};
APPS.fsdlg={name:'My Files',icon:'folder',w:700,h:470,hide:true,render:(b,w)=>{w.temp=true;renderFiles(b,w,w.tab)},ctx:(e,w)=>w.fm?w.fm.menu(e):null};
APPS.store={name:'App Store',icon:'tote-store',w:860,h:560,render:renderStore};
addEventListener('keydown',e=>{const w=W.find(x=>x.el.classList.contains('foc')&&!x.min);if(!w||document.querySelector('.md'))return;
 if(w.app==='files'||w.app==='fsdlg'){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){e.preventDefault();w.fmFind&&w.fmFind()}}else if(w.app==='editor'&&w.edKey&&!(e.target.closest&&e.target.closest('.md')))w.edKey(e)});
