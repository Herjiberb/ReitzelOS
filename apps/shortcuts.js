'use strict';
/* apps/shortcuts.js — desktop icons & shortcuts (/Desktop/shortcuts.syst) */
const SC=(()=>{const NAME='shortcuts.syst';let items=[],bad=false,loaded=false,inj=false,last='',fid=null,q=Promise.resolve(),lt=0,sq=0,owner=null,shown=new Set(),tok=0;
 const dId=()=>{const h=FS.home();return h!=='root'&&FS.K.get(h)?FS.K.get(h).get('desktop'):null},uname=b=>{let n=2,v=b;const has=x=>items.some(i=>i.name.toLowerCase()===x.toLowerCase());while(has(v))v=b+' ('+n++ +')';return v},fileId=()=>{const d=dId();return d&&FS.K.get(d).get(NAME)||null};
 const one=s=>s&&typeof s==='object'&&typeof s.name==='string'&&s.name&&typeof s.target==='string'&&s.target&&(s.kind==='app'||((s.kind==='file'||s.kind==='folder')&&s.target[0]==='/'))&&Number.isInteger(s.c)&&Number.isInteger(s.r)&&s.c>=0&&s.r>=0;
 /* lenient: one malformed entry no longer discards the whole desktop */
 const ok=j=>j&&typeof j==='object'&&j.format==='reitzel-shortcuts'&&Array.isArray(j.shortcuts);
 const mk=s=>{const id='f'+(sq++)+'_'+Date.now().toString(36),b={id,fsc:1,app:'__sc',kind:s.kind,name:s.name,path:s.target,c:s.c,r:s.r};
  if(s.kind==='app'){const a=APPS[s.target];b.icon=a?a.icon:'file-generic';b.hidden=!a;return b}
  const i=FS.resolve(s.target),m=i&&FS.get(i);b.icon=m?iconOf(m):(s.kind==='folder'?'folder':'file-generic');return b};
 const ser=l=>JSON.stringify({format:'reitzel-shortcuts',version:1,shortcuts:l.map(x=>({name:x.name,target:x.path,kind:x.kind,c:x.c,r:x.r}))},null,2);
 last=ser([]);
 const redraw=()=>{try{if(S&&S.desk)desk()}catch{}};
 const backup=w=>{try{return JSON.parse(localStorage.getItem('rz-sc:'+w))}catch{return null}};
 async function load(again){const my=++tok;await q;bad=false;const who=S&&S.cur;fid=fileId();let list=[],useB=false;
  if(fid){try{const j=JSON.parse(await(await FS.blob(fid)).text());if(ok(j))list=j.shortcuts.filter(one).map(mk);else bad=true}catch{bad=true}if(bad&&!again){await new Promise(r=>setTimeout(r,250));return load(1)}}
  if(my!==tok)return;
  /* a copy saved synchronously on every change (survives a reload that cut the file write short); used only if newer than the file */
  if(!bad){const b=backup(who),fm=fid&&FS.get(fid)?FS.get(fid).m:0;if(b&&b.t>fm&&typeof b.s==='string'){try{const j=JSON.parse(b.s);if(ok(j)){const l2=j.shortcuts.filter(one).map(mk);if(ser(l2)!==ser(list)){list=l2;useB=true}}}catch{}}}
  /* nothing changed on disk: keep the live icon objects instead of rebuilding them (this was what made icons jump) */
  if(loaded&&!bad&&owner===who&&!useB&&ser(list)===last)return;
  items=list;owner=who;shown=new Set();last=bad?'':(useB?'':ser(items));loaded=true;redraw();if(useB)write()}
 function write(){if(bad||!loaded||owner!==(S&&S.cur))return;const t=ser(items);if(t===last)return;last=t;const who=owner,d0=dId(),f0=fileId();
  try{localStorage.setItem('rz-sc:'+who,JSON.stringify({t:Date.now(),s:t}))}catch{}
  q=q.then(async()=>{const b=new Blob([t]);if(f0)await FS.write(null,null,b,f0,0,'desk');else if(d0)await FS.write(d0,NAME,b,null,0,'desk');if(owner===who)fid=fileId()}).catch(console.error)}
 window.deskPre=()=>{if(bad){S.desk=S.desk.filter(x=>!x.fsc);return}if(!loaded||owner!==S.cur)return;
  items.forEach(x=>{if(x.kind==='app'){const a=APPS[x.path];x.hidden=!a;if(a)x.icon=a.icon}});
  if(S.desk.some(x=>!x.fsc&&x.app&&APPS[x.app])){S.desk.filter(x=>!x.fsc&&x.app&&APPS[x.app]).forEach(x=>items.push(mk({kind:'app',target:x.app,name:x.name||APPS[x.app].name,c:x.c,r:x.r})));S.desk=S.desk.filter(x=>x.fsc);write();setTimeout(()=>save(),0)}
  /* icons whose app is not mounted yet (store apps load a moment after sign-in) stay in the list, hidden, and come back on the next redraw */
  const vis=items.filter(x=>!x.hidden);shown=new Set(vis);S.desk=S.desk.filter(x=>!x.fsc).concat(vis);inj=true};
 /* only icons that were on the desktop and are now gone count as deleted; hidden ones are never dropped */
 window.deskHook=()=>{if(!inj||!loaded||bad||owner!==S.cur||!S.desk)return;const now=new Set(S.desk.filter(x=>x.fsc));items=items.filter(x=>!shown.has(x)||now.has(x));now.forEach(x=>{if(!items.includes(x)){items.push(x);shown.add(x)}});write()};
 window.openShortcut=s=>{if(s.kind==='app'){APPS[s.path]&&openApp(s.path);return}const id=FS.resolve(s.path),m=id&&FS.get(id);if(!m)return RZ.toast('Shortcut target not found: '+s.path);const e=EXT(m.n);if(m.t==='f'&&e==='xctu'&&typeof Xctu!=='undefined')return Xctu.open(id);if(m.t==='f'&&e!=='svg'&&(TXT.has(e)||!e))openInEditor(id);else openApp(fmApp(),{tab:id})};
 FS.ready.then(()=>{load();FS.on(ev=>{if(ev.by==='desk')return;if(fileId()!==fid||(fid&&ev.ids.includes(fid))||items.some(x=>x.kind!=='app'&&ev.ids.includes(FS.resolve(x.path)))){clearTimeout(lt);lt=setTimeout(load,60)}})});
 const place=it=>{const G=grid(),tk=new Set();S.desk.forEach(o=>o.dc!=null&&tk.add(o.dc+','+o.dr));for(let c=0;c<G.c;c++)for(let r=0;r<G.r;r++)if(!tk.has(c+','+r)){it.c=c;it.r=r;return true}return false};
 const put=(it,msg)=>{if(bad)return RZ.toast('shortcuts.syst is malformed — fix or delete it first');if(!loaded)return RZ.toast('Desktop is still loading');if(!place(it))return RZ.toast('Desktop is full');items.push(it);shown.add(it);S.desk.push(it);write();desk();RZ.toast(msg)};
 return{add(m){if(!m)return;const path=FS.path(m.id);put(mk({name:uname(m.n),target:path,kind:m.t==='d'?'folder':'file',c:0,r:0}),'Shortcut added to desktop')},
  addApp(app){put(mk({name:uname(APPS[app].name),target:app,kind:'app',c:0,r:0}),'Added to desktop')},
  reload(){tok++;loaded=false;bad=false;items=[];owner=null;shown=new Set();fid=null;last=ser([]);if(FS.who())load()},
  refresh:redraw,
  dropApp(id){/* keep entry: it hides while the app is missing and returns on reinstall */items.forEach(x=>{if(x.kind==='app'&&x.path===id)x.hidden=true})}}})();
