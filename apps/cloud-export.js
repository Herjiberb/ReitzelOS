'use strict';
/* apps/cloud-export.js — Cloud Export (installable): zip your files and send them out */
(()=>{
Apps.style('cloud-export',`
/* ---------- Cloud Export ---------- */
.cx{height:100%;overflow:auto;background:#fafaf9;color:#171717;font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;display:block}
.cx *{box-sizing:border-box}
.cx-in{max-width:760px;margin:0 auto;padding:30px 28px 44px}
.cx-hd{display:flex;gap:14px;align-items:center}.cx-hd img{width:44px;height:44px}
.cx h1{font-size:25px;font-weight:650;letter-spacing:-.02em;margin:0;color:#171717}
.cx-sub{color:#737373;margin:2px 0 0}
.cx-card{background:#fff;border:1px solid #e7e5e4;border-radius:14px;padding:18px 20px;margin-top:16px}
.cx-card h2{font-size:13px;font-weight:650;margin:0 0 4px;color:#171717;letter-spacing:.01em}
.cx-card>p{margin:0 0 12px;color:#737373;font-size:13px}
.cx-tools{display:flex;gap:8px;align-items:center;margin-bottom:8px}.cx-tools span{margin-left:auto;color:#737373;font-size:12.5px}
.cx .cx-btn{border:1px solid #d6d3d1;background:#fff;color:#171717;border-radius:9px;padding:6px 13px;font:inherit;font-size:13px;cursor:pointer;transition:.12s}
.cx .cx-btn:hover{background:#f5f5f4}.cx .cx-btn.pri{background:#171717;border-color:#171717;color:#fff}.cx .cx-btn.pri:hover{background:#363636}.cx .cx-btn:disabled{opacity:.45;pointer-events:none}
.cx-tree{border:1px solid #efeeec;border-radius:10px;max-height:260px;overflow:auto;padding:4px;background:#fcfcfb}
.cx-row{display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:7px;min-height:28px}.cx-row:hover{background:#f3f2f0}
.cx-row .tg{width:18px;height:18px;border:0;background:none;color:#737373;cursor:pointer;padding:0;font-size:11px;flex:none}
.cx-row .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cx-row .sz{color:#a8a29e;font-size:12px;flex:none}
.cx input[type=checkbox]{accent-color:#171717;width:15px;height:15px;margin:0;flex:none}
.cx-set{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:11px 0;border-top:1px solid #f1f0ee}.cx-set:first-of-type{border-top:0}
.cx-set b{font-weight:550;display:block;color:#171717}.cx-set small{color:#8a8580;font-size:12.5px;display:block}
.cx .cx-f{border:1px solid #d6d3d1;background:#fff;color:#171717;border-radius:8px;padding:6px 10px;font:inherit;font-size:13px;min-width:170px;outline:0}.cx .cx-f:focus{border-color:#171717}
.cx input.sw{appearance:none;-webkit-appearance:none;width:36px;height:21px;border-radius:99px;background:#d6d3d1;position:relative;cursor:pointer;transition:.15s;flex:none}
.cx input.sw::after{content:"";position:absolute;top:2px;left:2px;width:17px;height:17px;border-radius:50%;background:#fff;transition:.15s;box-shadow:0 1px 2px #0003}.cx input.sw:checked{background:#171717}.cx input.sw:checked::after{left:17px}
.cx-go{display:flex;align-items:center;gap:14px}.cx-go .info{flex:1}.cx-go .info b{font-size:15px;color:#171717}.cx-go .info small{display:block;color:#737373}
.cx-bar{height:6px;border-radius:9px;background:#efeeec;overflow:hidden;margin-top:14px;display:none}.cx-bar i{display:block;height:100%;width:0;background:#171717;transition:width .15s}
.cx-msg{margin-top:10px;color:#525252;font-size:13px}

`);


/* =========================== CLOUD EXPORT =========================== */
const CT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=u=>{let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CT[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
const dosT=d=>{d=new Date(d||Date.now());const y=Math.max(1980,d.getFullYear());return[(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),((y-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()]};
const enc=new TextEncoder();
async function deflate(u){const s=new Blob([u]).stream().pipeThrough(new CompressionStream('deflate-raw'));return new Uint8Array(await new Response(s).arrayBuffer())}
class ZipW{
 constructor(){this.p=[];this.cd=[];this.off=0;this.n=0}
 async add(name,data,mt,comp,dir){
  const nb=enc.encode(name+(dir?'/':'')),[tm,dt]=dosT(mt);let crc=0,body=data||new Uint8Array(0),method=0;
  if(!dir&&body.length){crc=crc32(body);if(comp&&typeof CompressionStream!=='undefined'){const z=await deflate(body);if(z.length<body.length){body=z;method=8}}}
  const usz=dir?0:(data?data.length:0);if(this.off+body.length>4e9||usz>4e9)throw Error('Archive part too large for ZIP (4 GB). Use "Split into parts".');
  const lh=new DataView(new ArrayBuffer(30));lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(8,method,true);lh.setUint16(10,tm,true);lh.setUint16(12,dt,true);lh.setUint32(14,crc,true);lh.setUint32(18,body.length,true);lh.setUint32(22,usz,true);lh.setUint16(26,nb.length,true);lh.setUint16(28,0,true);
  const ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(10,method,true);ch.setUint16(12,tm,true);ch.setUint16(14,dt,true);ch.setUint32(16,crc,true);ch.setUint32(20,body.length,true);ch.setUint32(24,usz,true);ch.setUint16(28,nb.length,true);ch.setUint32(38,dir?0x10:0,true);ch.setUint32(42,this.off,true);
  this.cd.push(ch.buffer,nb);this.p.push(lh.buffer,nb,body);this.off+=30+nb.length+body.length;this.n++}
 done(){let cs=0;this.cd.forEach(x=>cs+=x.byteLength);const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,this.n,true);e.setUint16(10,this.n,true);e.setUint32(12,cs,true);e.setUint32(16,this.off,true);return new Blob([...this.p,...this.cd,e.buffer],{type:'application/zip'})}
}

const CX_DEF={name:'ReitzelOS Export',stamp:true,comp:'deflate',flat:false,wrap:true,hidden:false,empty:true,maxSize:0,excl:'',split:0,manifest:false,dates:true};
const cxKey=()=>'cx.'+S.cur;
const CXS=Apps.store('cloud-export',CX_DEF,cxKey),cxLoad=CXS.get;
const MB=1048576;

function renderCloud(body,w){
 const cfg=cxLoad(),save=()=>CXS.set(cfg);
 body.innerHTML=`<div class=cx><div class=cx-in><div class=cx-hd><img src="${IC('cloud-export')}"><div><h1>Cloud Export</h1><p class=cx-sub>Send your files to your computer as a single zip.</p></div></div>
 <div class=cx-card><h2>1 · Choose what to export</h2><p>Tick folders or individual files. Only files you have access to are shown.</p><div class=cx-tools><button class=cx-btn data-a=all>Select all</button><button class=cx-btn data-a=none>Clear</button><button class=cx-btn data-a=open>Expand all</button><button class=cx-btn data-a=shut>Collapse</button><span class=cnt></span></div><div class=cx-tree></div></div>
 <div class=cx-card><h2>2 · Settings</h2><div class=sets></div></div>
 <div class=cx-card><div class=cx-go><div class=info><b class=sum>Nothing selected</b><small class=det></small></div><button class="cx-btn" data-a=reset>Reset settings</button><button class="cx-btn pri" data-a=go>Export</button></div><div class=cx-bar><i></i></div><div class=cx-msg></div></div></div></div>`;
 const q=s=>body.querySelector(s),tree=q('.cx-tree'),chk=new Set(),open=new Set();
 const root=()=>FS.home();
 const kids=id=>FS.kids(id).slice().sort((a,b)=>(a.t===b.t?0:a.t==='d'?-1:1)||a.n.localeCompare(b.n,undefined,{numeric:true}));
 const all=(id,f)=>{for(const k of kids(id)){f(k);if(k.t==='d')all(k.id,f)}};
 const stat=id=>{let c=0,t=0;all(id,k=>{if(k.t==='f'){t++;if(chk.has(k.id))c++}});return[c,t]};
 const toggle=(id,on)=>{const m=FS.get(id);if(!m)return;const f=x=>on?chk.add(x):chk.delete(x);f(id);if(m.t==='d')all(id,k=>f(k.id))};
 function draw(){tree.innerHTML='';const walk=(id,depth)=>{for(const m of kids(id)){const r=H('div','cx-row',tree);r.style.paddingLeft=6+depth*18+'px';
   const tg=H('button','tg',r,m.t==='d'?(open.has(m.id)?'▾':'▸'):'');if(m.t==='d')tg.onclick=()=>{open.has(m.id)?open.delete(m.id):open.add(m.id);draw()};
   const cb=H('input','',r);cb.type='checkbox';
   if(m.t==='d'){const[c,t]=stat(m.id);cb.checked=t?c===t:chk.has(m.id);cb.indeterminate=c>0&&c<t}else cb.checked=chk.has(m.id);
   cb.onchange=()=>{toggle(m.id,cb.checked);draw();sum()};
   H('span','nm',r).textContent=(m.t==='d'?'📁 ':'')+m.n;if(m.t==='f')H('span','sz',r).textContent=fmtSz(m.s||0);
   if(m.t==='d'&&open.has(m.id))walk(m.id,depth+1)}};
  walk(root(),0);if(!tree.children.length)tree.innerHTML='<div class=cx-row style="color:#a8a29e">No files yet.</div>';sum()}
 const exSet=()=>new Set(cfg.excl.toLowerCase().split(/[,\s]+/).map(x=>x.replace(/^\./,'')).filter(Boolean));
 function plan(){const ex=exSet(),lim=cfg.maxSize*MB,files=[],dirs=[],base=root();
  const rel=id=>{const a=[];let x=id;while(x&&x!==base){const m=FS.get(x);if(!m)break;a.push(m.n);x=m.p}return a.reverse()};
  all(base,m=>{const r=rel(m.id);if(!cfg.hidden&&r.some(s=>s[0]==='.'))return;if(!chk.has(m.id))return;
   if(m.t==='d'){if(cfg.empty&&!cfg.flat&&!FS.kids(m.id).length)dirs.push(r.join('/'));return}
   if(ex.has(EXT(m.n)))return;if(lim&&m.s>lim)return;files.push({id:m.id,m,path:cfg.flat?m.n:r.join('/')})});
  if(cfg.flat){const seen=new Map();files.forEach(f=>{const k=f.path.toLowerCase();if(seen.has(k)){const[b,e]=FS.split(f.path);let i=2;while(seen.has((b+' ('+i+')'+e).toLowerCase()))i++;f.path=b+' ('+i+')'+e}seen.set(f.path.toLowerCase(),1)})}
  return{files,dirs,size:files.reduce((a,f)=>a+(f.m.s||0),0)}}
 function sum(){const p=plan(),n=p.files.length;q('.sum').textContent=n?`${n} file${n>1?'s':''} · ${fmtSz(p.size)}`:'Nothing selected';
  const parts=cfg.split&&p.size?Math.ceil(p.size/(cfg.split*MB)):1;q('.det').textContent=n?(parts>1?`About ${parts} zip parts`:'One zip file')+(cfg.comp==='deflate'?' · compressed':' · uncompressed'):'Tick something above to begin';
  q('.cnt').textContent=chk.size?'':'';q('[data-a=go]').disabled=!n}
 /* settings */
 const sets=q('.sets');
 const row=(t,d,el)=>{const r=H('div','cx-set',sets,`<div><b></b><small></small></div>`);r.querySelector('b').textContent=t;r.querySelector('small').textContent=d;r.append(el);return el};
 const tgl=(k,t,d)=>{const e=H('input','sw');e.type='checkbox';e.checked=!!cfg[k];e.onchange=()=>{cfg[k]=e.checked;save();sum()};row(t,d,e)};
 const sel=(k,t,d,opts,num)=>{const e=H('select','cx-f');opts.forEach(([v,l])=>{const o=H('option','',e);o.value=v;o.textContent=l});e.value=cfg[k];e.onchange=()=>{cfg[k]=num?+e.value:e.value;save();sum()};row(t,d,e)};
 const txt=(k,t,d,ph)=>{const e=H('input','cx-f');e.type='text';e.value=cfg[k];e.placeholder=ph||'';e.oninput=()=>{cfg[k]=e.value;save();sum()};e.onkeydown=ev=>ev.stopPropagation();row(t,d,e)};
 const mk=()=>{sets.innerHTML='';
  txt('name','Archive name','The file will be saved as this name plus .zip.','ReitzelOS Export');
  tgl('stamp','Add date to name','Appends today\'s date, e.g. “Export 2026-10-25”.');
  sel('comp','Compression','Smaller files take a little longer to build.',[['deflate','Compressed (smaller)'],['store','None (fastest)']]);
  sel('flat','Folder structure','Keep your folders, or put every file in one folder.',[['false','Keep folders'],['true','Flatten']]);
  sets.lastChild.querySelector('select').value=String(cfg.flat);sets.lastChild.querySelector('select').onchange=e=>{cfg.flat=e.target.value==='true';save();sum()};
  tgl('wrap','Wrap in a top-level folder','Extracts into one tidy folder instead of spilling files.');
  tgl('hidden','Include hidden files','Files and folders whose names start with a dot.');
  tgl('empty','Include empty folders','Keeps ticked folders even when they contain nothing.');
  sel('maxSize','Skip very large files','Leave out any single file above this size.',[[0,'No limit'],[10,'10 MB'],[50,'50 MB'],[100,'100 MB'],[500,'500 MB'],[1024,'1 GB']],1);
  txt('excl','Exclude file types','Comma separated, e.g. tmp, log, bak.','tmp, log');
  sel('split','Split into parts','Several smaller zips for slow or limited connections.',[[0,'Single file'],[100,'100 MB parts'],[500,'500 MB parts'],[1024,'1 GB parts'],[2048,'2 GB parts']],1);
  tgl('dates','Keep modified dates','Stores each file\'s last-modified time.');
  tgl('manifest','Add a file list','Includes a manifest.txt listing everything exported.')};
 mk();
 body.querySelectorAll('[data-a]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.a;
  if(a==='all'){toggle(root(),true);chk.delete(root())}else if(a==='none')chk.clear();else if(a==='open')all(root(),m=>{if(m.t==='d')open.add(m.id)});else if(a==='shut')open.clear();
  else if(a==='reset'){Object.assign(cfg,CX_DEF);save();mk();sum()}else if(a==='go')run();
  if(['all','none','open','shut'].includes(a))draw()}));
 let busy=0;
 async function run(){if(busy)return;const p=plan();if(!p.files.length&&!p.dirs.length)return;busy=1;const go=q('[data-a=go]'),bar=q('.cx-bar'),fill=bar.firstChild,msg=q('.cx-msg');go.disabled=true;bar.style.display='block';fill.style.width='0';msg.textContent='Preparing…';
  try{const stamp=cfg.stamp?' '+new Date().toISOString().slice(0,10):'',base=((cfg.name||'Export').replace(/[\\/:*?"<>|]/g,'').trim()||'Export')+stamp,limit=cfg.split?cfg.split*MB:Infinity;
   const top=cfg.wrap?base+'/':'';let z=new ZipW(),part=1,cur=0,done=0,total=p.size||1,made=[],list=[];
   const flush=()=>{if(!z.n)return;made.push(z.done());z=new ZipW();cur=0;part++};
   for(const d of p.dirs)await z.add(top+d,null,Date.now(),false,true);
   for(const f of p.files){if(cur&&cur+(f.m.s||0)>limit)flush();
    const u=new Uint8Array(await(await FS.blob(f.id)).arrayBuffer());await z.add(top+f.path,u,cfg.dates?f.m.m:Date.now(),cfg.comp==='deflate');cur+=u.length;done+=u.length;list.push(f.path+'\t'+fmtSz(u.length));
    fill.style.width=Math.min(97,done/total*100)+'%';msg.textContent=`Packing ${f.m.n}…`;await new Promise(r=>setTimeout(r))}
   if(cfg.manifest)await z.add(top+'manifest.txt',enc.encode('Exported from ReitzelOS on '+new Date().toLocaleString()+'\n\n'+list.join('\n')),Date.now(),false);
   flush();fill.style.width='100%';
   made.forEach((b,i)=>setTimeout(()=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=base+(made.length>1?` (part ${i+1} of ${made.length})`:'')+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),6e4)},i*500));
   msg.textContent=`Done — ${made.length>1?made.length+' zip files are':'your zip is'} downloading to your computer.`;RZ.toast('Export ready')}
  catch(e){msg.textContent='Export failed: '+(e.message||e)}
  busy=0;go.disabled=false;setTimeout(()=>{bar.style.display='none'},1800)}
 FS.ready.then(()=>{toggle(root(),true);chk.delete(root());for(const k of kids(root()))if(k.t==='d')open.add(k.id);draw()});
 const off=FS.on(()=>{if(w.el.isConnected)draw()});const oc=w.onclose;w.onclose=()=>{off();oc&&oc()};
}
const CLOUD_APP={name:'Cloud Export',icon:'cloud-export',w:820,h:620,cat:'utilities',perms:['fs'],noctx:true,render:renderCloud};
Apps.installable({id:'cloud-export',name:'Cloud Export',icon:'cloud-export',tag:'Utilities',tagline:'Export your files to your computer as a zip',by:'Reitzel',desc:'Cloud Export packs some or all of your files into a zip and sends it to your main computer. Pick exactly what to include, choose compression, split large exports into parts, skip hidden or oversized files and more.',versions:[{v:'1.0.0'}]},{'cloud-export':CLOUD_APP});
})();
