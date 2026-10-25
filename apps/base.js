'use strict';
/* =====================================================================
   apps/base.js — AppKit: the ground rules for every Reitzel OS app
   ---------------------------------------------------------------------
   RULES
   1. Every app is registered through Apps.register(id, def) (built-in) or
      Apps.installable(storeEntry, {id:def,...}) (App Store apps). Never
      write to APPS directly.
   2. def = { name, icon, w, h, cat, perms:[...], render(body,win),
              ctx?, onKey?(e,win), hide?, admin?, fm?, noctx? }
      cat   : system | files | utilities | internet
      icon  : assets/<icon>-icon.svg
      perms : the ONLY capabilities the app may use (see Apps.PERMS).
      admin : true = only administrator profiles can open it.
   3. Check capabilities with Apps.can(perm, appId) / Apps.need(...) instead
      of reading profile flags yourself. Admin-only perms are enforced here.
   4. Per-profile settings go through Apps.store(); CSS through Apps.style();
      keyboard shortcuts through def.onKey. No private listeners/style tags.
   5. Prebuilt helpers (file types, sizes, dates, modal, dropdown, confirm,
      toast) live below / on Apps so apps don't re-define them.
   Files in apps/: one file per app, named after the app.
   ===================================================================== */

/* ---------- prebuilt helpers every app can use (file types, formatting, dialogs, dropdowns) ---------- */
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

/* ---------- Apps: registry, permissions, storage, styles ---------- */
const Apps=(()=>{
 const CATS={system:'System',files:'Files',utilities:'Utilities',internet:'Internet'};
 /* every capability an app may declare. admin:true = needs an administrator profile */
 const PERMS={
  fs:{label:'Read and write your files'},
  admin:{label:'Administrator tools',admin:true},
  desktop:{label:'Add desktop shortcuts and pins'},
  'net.frames':{label:'Show web content'},
  'net.popups':{label:'Open pop-up windows'},
  'net.downloads':{label:'Download files from websites'},
  clipboard:{label:'Use the clipboard',feat:['clipboard-read','clipboard-write']},
  media:{label:'Use camera and microphone',feat:['camera','microphone']},
  location:{label:'Use your location',feat:['geolocation']}
 };
 const man={},groups=[],catalog=[],css={};
 const isAdmin=()=>{try{return !!prof().admin}catch{return false}};
 /* user-revoked permissions, per profile: {appId:{perm:false}} */
 const PK=()=>'rz.perm.'+S.cur;
 const policy=()=>{try{return JSON.parse(localStorage.getItem(PK())||'{}')}catch{return{}}};
 const setPerm=(id,perm,on)=>{const p=policy();(p[id]||(p[id]={}))[perm]=!!on;try{localStorage.setItem(PK(),JSON.stringify(p))}catch{}};
 const can=(perm,id)=>{const d=PERMS[perm];if(!d)return false;if(d.admin&&!isAdmin())return false;
  if(id){const m=man[id];if(!m||!m.perms.includes(perm))return false;const r=policy()[id];if(r&&r[perm]===false)return false}return true};
 const need=(perm,id,quiet)=>can(perm,id)||(quiet||RZ.toast('Permission denied: '+(PERMS[perm]?PERMS[perm].label:perm)),false);
 const canOpen=id=>{const m=APPS[id];if(!m)return false;if(m.admin&&!isAdmin()){RZ.toast(m.name+' is for administrators only');return false}return true};
 /* iframe "allow" string: base features plus those the app declared AND is granted */
 const allow=(id,base)=>base.concat(...Object.keys(PERMS).filter(k=>PERMS[k].feat&&can(k,id)).map(k=>PERMS[k].feat)).join('; ');
 function register(id,d){
  const m=Object.assign({id,icon:id,w:720,h:460,cat:'utilities',perms:[]},d);
  m.perms=m.perms.filter(p=>PERMS[p]||console.warn('Unknown permission',p,'in app',id));
  if(!CATS[m.cat])console.warn('Unknown category',m.cat,'in app',id);
  APPS[id]=man[id]=m;return m}
 /* App Store app: entry = catalog metadata (id,name,icon,tag,tagline,by,desc,versions), defs = {appId:def} (first = main app, rest = companions like dialogs) */
 function installable(entry,defs){groups.push({id:entry.id,defs});catalog.push(entry);return entry}
 const gOf=id=>groups.find(g=>g.id===id||id in g.defs);
 const mount=g=>Object.keys(g.defs).forEach(k=>register(k,g.defs[k]));
 const unmount=id=>{const g=gOf(id);(g?Object.keys(g.defs):[id]).forEach(k=>{delete APPS[k];delete man[k]})};
 /* called by the OS on profile switch / startup: mount exactly the installed apps */
 const sync=()=>groups.forEach(g=>S.installed&&S.installed[g.id]?mount(g):unmount(g.id));
 /* per-profile settings: Apps.store(id,defaults[,legacyKeyFn]) -> {get,set,reset} */
 const store=(id,def,key)=>{const k=key||(()=>'app.'+id+'.'+S.cur);
  return{get:()=>{try{return Object.assign({},def,JSON.parse(localStorage.getItem(k())||'{}'))}catch{return{...def}}},
   set:c=>{try{localStorage.setItem(k(),JSON.stringify(c))}catch{}},reset:()=>{try{localStorage.removeItem(k())}catch{}}}};
 const style=(id,txt)=>{let e=css[id];if(!e){e=css[id]=document.createElement('style');e.dataset.app=id;document.head.append(e)}e.textContent=txt};
 const list=cat=>Object.values(man).filter(m=>!m.hide&&(!cat||m.cat===cat));
 /* one shared shortcut dispatcher: the focused window's app handles its own keys via def.onKey */
 addEventListener('keydown',e=>{const w=W.find(x=>x.el.classList.contains('foc')&&!x.min);if(!w||document.querySelector('.md'))return;const m=APPS[w.app];m&&m.onKey&&m.onKey(e,w)});
 window.regInstalled=sync;
 return{CATS,PERMS,catalog,register,installable,unmount,sync,store,style,list,can,need,canOpen,allow,setPerm,isAdmin,
  open:(id,o)=>openApp(id,o),toast:m=>RZ.toast(m),confirm:o=>sysConfirm(o),modal,dropdown,
  fmt:{size:fmtSz,date:fmtDt},file:{EXT,IMG,VID,AUD:typeof AUD!=='undefined'?AUD:null,TXT,MIME,typeOf,iconOf}}
})();
