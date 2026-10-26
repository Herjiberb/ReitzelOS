'use strict';
/* apps/clipboard.js — clipboard history (shortcuts that open it live in apps/keys.js).
   History lives in <home>/.config/clipboard.syst so it survives reloads and is private to each profile.
   Unpinned entries: newest 20 from the last 24 hours. Pinned entries stay until removed. */
(()=>{
const FILE='clipboard.syst',MAXN=20,MAXAGE=864e5,MAXLEN=200000,MAXPIN=100;
const on=k=>S[k]!==false;
let items=[],loadedFor=null,chain=Promise.resolve(),wt=0,lastEd=null,panel=null,sel=0,internal=0;
const unlocked=()=>{const l=document.getElementById('lock');return !l||l.classList.contains('hide')};
const nid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const prune=()=>{const now=Date.now();const pin=items.filter(i=>i.p).slice(0,MAXPIN),rest=items.filter(i=>!i.p&&now-i.t<MAXAGE).slice(0,MAXN);items=[...pin,...rest].sort((a,b)=>b.t-a.t)};

/* ---------- storage ---------- */
const cfgDir=async()=>{const h=FS.home();if(!h||h==='root')return null;let c=FS.K.get(h)&&FS.K.get(h).get('.config');if(!c){const m=await FS.mkdir(h,'.config');c=m.id}return c};
async function load(){try{await FS.ready}catch{}
 const c=await cfgDir();items=[];loadedFor=S.cur;if(!c)return;const id=FS.K.get(c).get(FILE);
 if(id){try{const j=JSON.parse(await(await FS.blob(id)).text());if(j&&Array.isArray(j.items))items=j.items.filter(i=>i&&typeof i.x==='string'&&i.t)}catch{}}
 prune()}
function save(){clearTimeout(wt);wt=setTimeout(()=>{const who=loadedFor,snap=JSON.stringify({format:'reitzel-clipboard',version:1,items});chain=chain.then(async()=>{try{if(who!==S.cur)return;const c=await cfgDir();if(!c)return;const id=FS.K.get(c).get(FILE),b=new Blob([snap],{type:'application/json'});if(id)await FS.write(null,null,b,id);else await FS.write(c,FILE,b)}catch(e){console.warn('clipboard history not saved',e)}})},350)}
const ensure=()=>{if(loadedFor===S.cur&&items)return chain;chain=chain.then(load);return chain};

/* ---------- recording ---------- */
function add(text){if(!on('cbOn')||!unlocked()||typeof text!=='string'||!text.trim()||text.length>MAXLEN)return;
 ensure().then(()=>{const o=items.find(i=>i.x===text);if(o){o.t=Date.now()}else items.unshift({i:nid(),x:text,t:Date.now(),p:false});items.sort((a,b)=>b.t-a.t);prune();save();panel&&draw()})}
const pw=el=>el&&el.tagName==='INPUT'&&/password/i.test(el.type);
const selText=()=>{const a=document.activeElement;if(a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT')){if(pw(a))return'';if(typeof a.selectionStart==='number')return a.value.slice(a.selectionStart,a.selectionEnd)}return String(getSelection()||'')};
['copy','cut'].forEach(t=>addEventListener(t,e=>{if(pw(e.target))return;let x='';try{x=e.clipboardData&&e.clipboardData.getData('text/plain')}catch{}add(x||selText())},true));
addEventListener('paste',e=>{if(pw(e.target)||e.target.closest&&e.target.closest('.cbh'))return;try{add(e.clipboardData.getData('text/plain'))}catch{}},true);
try{const cb=navigator.clipboard,w=cb&&cb.writeText;if(w)cb.writeText=function(t){if(!internal)add(t);return w.apply(this,arguments)}}catch{}
addEventListener('focusin',e=>{const t=e.target;if(!t||!t.closest||t.closest('.cbh')||pw(t))return;if(t.matches&&(t.matches('textarea')||t.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=button]):not([type=file])')||t.isContentEditable))lastEd=t},true);

/* ---------- inserting ---------- */
function insert(text){const el=lastEd&&lastEd.isConnected?lastEd:null;close();
 if(el){el.focus();let ok=false;try{ok=document.execCommand('insertText',false,text)}catch{}
  if(!ok&&!el.isContentEditable){try{const s=el.selectionStart??el.value.length,e=el.selectionEnd??s;el.setRangeText(text,s,e,'end');el.dispatchEvent(new Event('input',{bubbles:true}));ok=true}catch{}}
  if(ok)return}
 internal=1;(navigator.clipboard?navigator.clipboard.writeText(text):Promise.reject()).then(()=>RZ.toast('Copied — press Ctrl+V to paste'),()=>RZ.toast('Nothing to paste into')).finally(()=>internal=0)}

/* ---------- panel ---------- */
const ago=t=>{const s=(Date.now()-t)/1e3;return s<60?'just now':s<3600?Math.floor(s/60)+' min ago':Math.floor(s/3600)+' h ago'};
function close(){if(panel){panel.remove();panel=null}}
function draw(){if(!panel)return;const list=panel.querySelector('.cbl');list.innerHTML='';const vis=items.slice().sort((a,b)=>(b.p-a.p)||(b.t-a.t));sel=Math.min(sel,Math.max(0,vis.length-1));
 if(!vis.length){H('div','cbe',list,'Nothing copied yet. Copy some text and it will show up here.');return}
 let last=null;vis.forEach((it,n)=>{if(it.p!==last){last=it.p;H('div','cbh2',list).textContent=it.p?'Pinned':'Recent'}
  const r=H('div','ci'+(n===sel?' on':''),list),b=H('button','cx',r),tx=H('span','ct',b);tx.textContent=it.x.length>400?it.x.slice(0,400)+'…':it.x;H('small','',b).textContent=ago(it.t)+(it.x.length>60?' · '+it.x.length+' chars':'');
  b.onclick=e=>{e.stopPropagation();insert(it.x)};
  const pb=H('button','cb pn'+(it.p?' on':''),r,it.p?'Unpin':'Pin');pb.onclick=e=>{e.stopPropagation();it.p=!it.p;prune();save();draw()};
  const db=H('button','cb dl',r,'✕');db.title='Delete';db.onclick=e=>{e.stopPropagation();items=items.filter(x=>x!==it);save();draw()}});
 const o=list.querySelector('.ci.on');o&&o.scrollIntoView({block:'nearest'})}
function open(){if(!on('cbOn'))return;if(panel){close();return}closePop();const p=panel=H('div','pop cbh',pop);
 p.innerHTML='<div class=cbt><b>Clipboard history</b><span></span><button class=cb>Clear unpinned</button></div><div class=cbl></div><small class=cbf>Click to paste · Pin keeps an item · Unpinned: last 24 h, up to 20</small>';
 p.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault()});p.addEventListener('pointerdown',e=>e.stopPropagation());p.onclick=e=>e.stopPropagation();
 p.querySelector('.cbt button').onclick=e=>{e.stopPropagation();items=items.filter(i=>i.p);save();draw()};
 sel=0;draw();ensure().then(()=>{if(panel===p)draw()})}
const clear=all=>{items=all?[]:items.filter(i=>i.p);save();panel&&draw()};
window.Clip={open,close,clear,toggle:open};
new MutationObserver(()=>{if(panel&&!panel.isConnected)panel=null}).observe(pop,{childList:true});

/* ---------- keys while the panel is open ---------- */
addEventListener('keydown',e=>{if(!unlocked())return;
 if(panel&&!e.ctrlKey&&!e.metaKey&&!e.altKey){const vis=items.length;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopImmediatePropagation();sel=(sel+(e.key==='ArrowDown'?1:-1)+vis)%Math.max(1,vis);draw();return}
  if(e.key==='Enter'&&vis){e.preventDefault();e.stopImmediatePropagation();const v=items.slice().sort((a,b)=>(b.p-a.p)||(b.t-a.t))[sel];v&&insert(v.x);return}
  if(e.key==='Delete'&&vis){e.preventDefault();e.stopImmediatePropagation();const v=items.slice().sort((a,b)=>(b.p-a.p)||(b.t-a.t))[sel];items=items.filter(x=>x!==v);save();draw();return}}
},true);
})();
