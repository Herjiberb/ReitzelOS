'use strict';
/* apps/shortcuts.js — desktop icons & shortcuts (/Desktop/shortcuts.syst) */
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
 window.openShortcut=s=>{if(s.kind==='app'){APPS[s.path]&&openApp(s.path);return}const id=FS.resolve(s.path),m=id&&FS.get(id);if(!m)return RZ.toast('Shortcut target not found: '+s.path);const e=EXT(m.n);if(m.t==='f'&&e==='xctu'&&typeof Xctu!=='undefined')return Xctu.open(id);if(m.t==='f'&&e!=='svg'&&(TXT.has(e)||!e))openInEditor(id);else openApp(fmApp(),{tab:id})};
 FS.ready.then(()=>{load();FS.on(ev=>{if(ev.by==='desk')return;if(fileId()!==fid||(fid&&ev.ids.includes(fid))||items.some(x=>x.kind!=='app'&&ev.ids.includes(FS.resolve(x.path)))){clearTimeout(lt);lt=setTimeout(load,60)}})});
 const place=it=>{const G=grid(),tk=new Set();S.desk.forEach(o=>o.dc!=null&&tk.add(o.dc+','+o.dr));for(let c=0;c<G.c;c++)for(let r=0;r<G.r;r++)if(!tk.has(c+','+r)){it.c=c;it.r=r;return true}return false};
 const put=(it,msg)=>{if(bad)return RZ.toast('shortcuts.syst is malformed — fix or delete it first');if(!loaded)return RZ.toast('Desktop is still loading');if(!place(it))return RZ.toast('Desktop is full');items.push(it);S.desk.push(it);write();desk();RZ.toast(msg)};
 return{add(m){if(!m)return;const path=FS.path(m.id);put(mk({name:uname(m.n),target:path,kind:m.t==='d'?'folder':'file',c:0,r:0}),'Shortcut added to desktop')},
  addApp(app){put(mk({name:uname(APPS[app].name),target:app,kind:'app',c:0,r:0}),'Added to desktop')},
  reload(){loaded=false;bad=false;items=[];fid=null;last=ser([]);if(FS.who())load()},
  dropApp(id){items=items.filter(x=>!(x.kind==='app'&&x.path===id));write()}}})();
