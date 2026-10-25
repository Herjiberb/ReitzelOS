'use strict';
/* apps/editor.js — Text Editor */
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
Apps.register('editor',{name:'Text Editor',icon:'editor',w:880,h:560,cat:'files',perms:['fs'],render:renderEditor,
 onKey:(e,w)=>{if(w.edKey&&!(e.target.closest&&e.target.closest('.md')))w.edKey(e)}});
