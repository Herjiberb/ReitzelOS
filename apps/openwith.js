'use strict';
/* apps/openwith.js — open-with registry, media viewer & shared FS helpers */
/* ---------- open-with registry & shared FS helpers ---------- */
const MEDIA=m=>m.t==='f'&&(IMG.has(EXT(m.n))||VID.has(EXT(m.n))||AUD.has(EXT(m.n)));
const OPENERS=[
 {id:'editor',name:'Text Editor',icon:'editor',test:m=>m.t==='f',open:m=>openInEditor(m.id)},
 {id:'files',name:'My Files',icon:'folder',test:m=>m.t==='d'||MEDIA(m)||EXT(m.n)==='zip',open:m=>openApp(fmApp(),{tab:m.id})},
 {id:'spotweb',name:'Spot The Web',icon:'browser',test:m=>m.t==='f'&&/^(html?|xhtml|svg)$/.test(EXT(m.n)),open:m=>openApp('spotweb',{tab:'file://'+encodeURI(FS.path(m.id))}),need:'spotweb'},
 {id:'file-scout',name:'File Scout',icon:'file-scout',test:m=>m.t==='d'||MEDIA(m),open:m=>openApp('file-scout',{tab:m.id}),need:'file-scout'},
 {id:'terminal',name:'Terminal',icon:'terminal',test:m=>m.t==='d',open:m=>openApp('terminal',{tab:{cwd:m.id}})}];
const openersFor=ms=>OPENERS.filter(o=>(!o.admin||Apps.isAdmin())&&(!o.need||APPS[o.need])&&ms.every(o.test));
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
