'use strict';
/* apps/emoji.js — Reitzel emoji: swaps system emoji for the OS's own artwork stored in emojis/.
   Add a new emoji: drop emojis/<name>.svg and add its character(s) to FILES below. */
const RZEmoji=(()=>{
 const DIR='emojis/',FILES={folder:['\u{1F4C1}','\u{1F4C2}'],document:['\u{1F4C4}','\u{1F4C3}'],spider:['\u{1F577}'],evergreen:['\u{1F332}'],'grinning-face':['\u{1F600}'],applause:['\u{1F44F}']};
 const map={},uris={};for(const k in FILES)FILES[k].forEach(c=>map[c]=k);
 const RX=new RegExp('(?:'+Object.keys(map).join('|')+')[\\u{1F3FB}-\\u{1F3FF}]?\\uFE0F?','gu');
 const url=n=>DIR+n+'.svg',base=m=>map[String.fromCodePoint(m.codePointAt(0))];
 const SKIP='input,textarea,select,script,style,noscript,svg,[contenteditable=""],[contenteditable="true"],.noemo';
 const img=ch=>{const i=document.createElement('img');i.className='rzemo';i.src=url(base(ch));i.alt=ch;i.draggable=false;return i};
 function text(n){const s=n.nodeValue;RX.lastIndex=0;if(!RX.test(s))return;const p=n.parentElement;if(!p||p.closest(SKIP))return;
  const fr=document.createDocumentFragment();let last=0,m;RX.lastIndex=0;while((m=RX.exec(s))){fr.append(s.slice(last,m.index),img(m[0]));last=m.index+m[0].length}fr.append(s.slice(last));n.replaceWith(fr)}
 function fix(n){if(!n)return;if(n.nodeType===3)return text(n);if(n.nodeType!==1||n.matches(SKIP))return;const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT),a=[];while(w.nextNode())a.push(w.currentNode);a.forEach(text)}
 const q=new Set();let raf=0;
 const flush=()=>{raf=0;const l=[...q];q.clear();l.forEach(n=>{if(n.isConnected)fix(n)})};
 const css=document.createElement('style');css.textContent='img.rzemo{width:1.15em;height:1.15em;vertical-align:-.2em;display:inline-block;pointer-events:none;-webkit-user-drag:none}';document.head.append(css);
 new MutationObserver(ms=>{for(const m of ms){if(m.type==='childList')m.addedNodes.forEach(n=>q.add(n));else q.add(m.target)}if(!raf)raf=requestAnimationFrame(flush)}).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
 fix(document.body);
 Object.keys(FILES).forEach(k=>{new Image().src=url(k);fetch(url(k)).then(r=>r.text()).then(t=>{FILES[k].forEach(c=>uris[c]='data:image/svg+xml;utf8,'+encodeURIComponent(t))}).catch(()=>{})});

 /* ---------- Color emoji font: generated at runtime, cached in IndexedDB ----------
    Source of truth = the same emojis/*.svg + FILES registry above. Each SVG is rasterised (PNG, for CBDT/Chrome)
    and embedded as-is (OpenType-SVG, for Firefox/Safari) into a TTF assembled in a Worker, saved in IndexedDB and
    loaded as FontFace 'RZEmoji'. Only changed emojis are re-rasterised; everything runs idle/off-thread. */
 const FAM='RZEmoji',extras={};let face=null,syncing=false,again=false,timer=0;
 const idb=new Promise(res=>{try{const r=indexedDB.open('rz-emoji-font',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>res(null)}catch(e){res(null)}});
 const kv=(m,k,v)=>idb.then(d=>d?new Promise(res=>{try{const t=d.transaction('kv',m==='r'?'readonly':'readwrite'),st=t.objectStore('kv'),q=m==='r'?st.get(k):st.put(v,k);q.onsuccess=()=>res(q.result);q.onerror=()=>res()}catch(e){res()}}):undefined);
 const hash=t=>{let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)+t.length};
 /* strip metadata/title/desc (c2pa blobs are huge), return viewBox + inner markup */
 function norm(src){const d=new DOMParser().parseFromString(src,'image/svg+xml'),r=d.documentElement;if(!r||r.nodeName==='parsererror'||d.getElementsByTagName('parsererror').length)return null;
  r.querySelectorAll('metadata,title,desc').forEach(n=>n.remove());
  const vb=r.getAttribute('viewBox')||'0 0 '+(parseFloat(r.getAttribute('width'))||128)+' '+(parseFloat(r.getAttribute('height'))||128);
  const xs=new XMLSerializer();let inner='';r.childNodes.forEach(n=>inner+=xs.serializeToString(n));return{vb,inner}}
 const NS='xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';
 async function raster(n){const u=URL.createObjectURL(new Blob([`<svg ${NS} viewBox="${n.vb}" width="128" height="128">${n.inner}</svg>`],{type:'image/svg+xml'}));
  try{const im=new Image();im.src=u;await im.decode();const c=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(128,128):Object.assign(document.createElement('canvas'),{width:128,height:128});
   c.getContext('2d').drawImage(im,0,0,128,128);const b=await(c.convertToBlob?c.convertToBlob({type:'image/png'}):new Promise(r=>c.toBlob(r,'image/png')));return await b.arrayBuffer()}finally{URL.revokeObjectURL(u)}}
 /* Worker: assembles TTF (glyf stub + cmap + CBDT/CBLC bitmaps + SVG table) */
 function builder(){
  onmessage=e=>{const G=e.data.glyphs,N=G.length+2,te=new TextEncoder();
   const W=()=>{const a=[];const o={u8:v=>{a.push(v&255);return o},u16:v=>{a.push((v>>8)&255,v&255);return o},u32:v=>{a.push((v>>>24)&255,(v>>16)&255,(v>>8)&255,v&255);return o},
     i16:v=>o.u16(v&65535),z:n=>{for(let i=0;i<n;i++)a.push(0);return o},tag:t=>{for(const c of t)a.push(c.charCodeAt(0));return o},get len(){return a.length},done:()=>Uint8Array.from(a)};return o};
   const cat=l=>{let n=0;l.forEach(x=>n+=x.length);const r=new Uint8Array(n);let p=0;l.forEach(x=>{r.set(x,p);p+=x.length});return r};
   const T={};
   /* cmap */
   const cm=[];G.forEach((g,i)=>g.cps.forEach(c=>cm.push([c,i+2])));[0xFE0F,0x1F3FB,0x1F3FC,0x1F3FD,0x1F3FE,0x1F3FF].forEach(c=>{if(!cm.some(x=>x[0]===c))cm.push([c,1])});
   cm.sort((a,b)=>a[0]-b[0]);const bmp=cm.filter(x=>x[0]<0xFFFF),sc=bmp.length+1;
   let es=1,ent=0;while(es*2<=sc){es*=2;ent++}
   const f4=W().u16(4).u16(16+sc*8).u16(0).u16(sc*2).u16(es*2).u16(ent).u16(sc*2-es*2);
   bmp.forEach(x=>f4.u16(x[0]));f4.u16(0xFFFF);f4.u16(0);bmp.forEach(x=>f4.u16(x[0]));f4.u16(0xFFFF);
   bmp.forEach(x=>f4.u16((x[1]-x[0])&65535));f4.u16(1);f4.z(sc*2);
   const f12=W().u16(12).u16(0).u32(16+cm.length*12).u32(0).u32(cm.length);cm.forEach(x=>f12.u32(x[0]).u32(x[0]).u32(x[1]));
   const a4=f4.done(),a12=f12.done();
   T.cmap=cat([W().u16(0).u16(2).u16(3).u16(1).u32(20).u16(3).u16(10).u32(20+a4.length).done(),a4,a12]);
   /* head/hhea/maxp/hmtx/glyf/loca/post/OS2/name */
   T.head=W().u32(0x10000).u32(0x10000).u32(0).u32(0x5F0F3CF5).u16(3).u16(2048).z(16).z(8).u16(0).u16(8).i16(2).i16(0).i16(0).done();
   T.hhea=W().u32(0x10000).i16(1888).i16(-160).i16(0).u16(2400).i16(0).i16(0).i16(0).i16(1).i16(0).i16(0).z(8).i16(0).u16(N).done();
   T.maxp=W().u32(0x10000).u16(N).u16(0).u16(0).u16(0).u16(0).u16(1).z(16).done();
   const hm=W();for(let i=0;i<N;i++)hm.u16(i===1?0:2400).i16(0);T.hmtx=hm.done();
   T.glyf=new Uint8Array(4);const lo=W();for(let i=0;i<=N;i++)lo.u16(0);T.loca=lo.done();
   T.post=W().u32(0x30000).u32(0).i16(-100).i16(50).z(20).done();
   T['OS/2']=W().u16(3).i16(2400).u16(400).u16(5).u16(0).i16(1331).i16(1433).i16(0).i16(286).i16(1331).i16(1433).i16(0).i16(983).i16(102).i16(530).i16(0).z(10)
    .u32(0).u32(0x02000000).u32(0).u32(0).tag('RZ  ').u16(0x40).u16(0xFFFF).u16(0xFFFF).i16(1888).i16(-160).i16(0).u16(1888).u16(160).u32(1).u32(0).i16(0).i16(0).u16(0).u16(32).u16(1).done();
   const nm=[[1,'RZEmoji'],[2,'Regular'],[4,'RZEmoji'],[6,'RZEmoji-Regular']],nh=W().u16(0).u16(4).u16(54),ns=W();
   nm.forEach(([id,s])=>{nh.u16(3).u16(1).u16(0x409).u16(id).u16(s.length*2).u16(ns.len);for(const c of s)ns.u16(c.charCodeAt(0))});
   T.name=cat([nh.done(),ns.done()]);
   /* CBDT + CBLC */
   const db=[W().u16(3).u16(0).done()],offs=[];let o=0;
   G.forEach(g=>{const png=new Uint8Array(g.png),w=W().u8(128).u8(128).u8(11).u8(118).u8(150).u32(png.length).done();offs.push(o);db.push(w,png);o+=w.length+png.length});offs.push(o);
   T.CBDT=cat(db);
   const ln=W().u8(118).u8(-10&255).u8(150).z(2).u8(0).u8(0).u8(0).u8(118).u8(-10&255).z(2).done();
   const sub=W().u16(1).u16(17).u32(4);offs.forEach(v=>sub.u32(v));const sa=sub.done();
   T.CBLC=cat([W().u16(3).u16(0).u32(1).u32(56).u32(8+sa.length).u32(1).u32(0).done(),ln,ln,W().u16(2).u16(N-1).u8(128).u8(128).u8(32).u8(1).done(),W().u16(2).u16(N-1).u32(8).done(),sa]);
   /* SVG */
   const docs=G.map((g,i)=>te.encode(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="glyph${i+2}"><svg x="0" y="-1888" width="2048" height="2048" viewBox="${g.vb}">${g.inner}</svg></g></svg>`));
   const si=W().u16(G.length);let dof=2+G.length*12;docs.forEach((d,i)=>{si.u16(i+2).u16(i+2).u32(dof).u32(d.length);dof+=d.length});
   T['SVG ']=cat([W().u16(0).u32(10).u32(0).done(),si.done(),...docs]);
   /* assemble sfnt */
   const tags=Object.keys(T).sort(),nt=tags.length;let e2=1,sh=0;while(e2*2<=nt){e2*=2;sh++}
   const dir=W().u32(0x10000).u16(nt).u16(e2*16).u16(sh).u16(nt*16-e2*16);let pos=12+nt*16;const body=[],sum=(u)=>{let s=0;for(let i=0;i<u.length;i+=4)s=(s+(((u[i]<<24)|((u[i+1]||0)<<16)|((u[i+2]||0)<<8)|(u[i+3]||0))>>>0))>>>0;return s};
   let headAt=0;tags.forEach(t=>{const d=T[t],pad=new Uint8Array((d.length+3&~3));pad.set(d);if(t==='head')headAt=pos;dir.tag(t).u32(sum(pad)).u32(pos).u32(d.length);body.push(pad);pos+=pad.length});
   const out=cat([dir.done(),...body]),adj=(0xB1B0AFBA-sum(out))>>>0;new DataView(out.buffer).setUint32(headAt+8,adj);
   postMessage(out.buffer,[out.buffer])}}
 let wk=null;
 const build=glyphs=>new Promise((res,rej)=>{if(!wk)wk=new Worker(URL.createObjectURL(new Blob(['('+builder+')()'],{type:'text/javascript'})));
  wk.onmessage=e=>res(e.data);wk.onerror=e=>rej(e);wk.postMessage({glyphs},glyphs.map(g=>g.png))});
 async function apply(buf){try{const f=new FontFace(FAM,buf);await f.load();document.fonts.add(f);if(face)document.fonts.delete(face);face=f;return true}catch(e){return false}}
 /* make every stylesheet font stack start with RZEmoji (inputs/textareas/contenteditable included) */
 function patch(){const own=[];for(const sh of document.styleSheets){let rs;try{rs=sh.cssRules}catch(e){continue}
   for(const r of rs){if(r.type!==1)continue;const ff=r.style.fontFamily;if(ff&&!/RZEmoji|^(inherit|initial|unset)$/i.test(ff.trim()))r.style.fontFamily=FAM+','+ff}
   own.push(sh)}
  const sh=own[0];if(sh&&!document.documentElement.hasAttribute('data-rzf')){document.documentElement.setAttribute('data-rzf','');try{sh.insertRule('input,textarea,select,[contenteditable]{font-family:RZEmoji,system-ui,"Segoe UI",sans-serif}',0)}catch(e){}}}
 async function sync(){if(syncing){again=true;return}syncing=true;
  try{const items=[];
   await Promise.all(Object.keys(FILES).map(k=>fetch(url(k)).then(r=>r.ok?r.text():'').then(t=>{if(t)items.push({name:k,cps:FILES[k],src:t})}).catch(()=>{})));
   for(const k in extras)items.push({name:k,cps:extras[k].cps,src:extras[k].src});
   items.sort((a,b)=>a.name<b.name?-1:1);
   items.forEach(i=>{i.h=hash(i.src)});
   const sig=items.map(i=>i.name+i.h+i.cps.join(',')).join('|'),saved=await kv('r','font');
   if(saved&&saved.sig===sig)return;
   const cache=(await kv('r','glyphs'))||{},next={},glyphs=[];
   for(const i of items){let c=cache[i.name];
    if(!c||c.h!==i.h){const n=norm(i.src);if(!n)continue;try{c={h:i.h,vb:n.vb,inner:n.inner,png:await raster(n)}}catch(e){continue}}
    next[i.name]=c;glyphs.push({cps:i.cps.map(ch=>ch.codePointAt(0)),png:c.png.slice(0),vb:c.vb,inner:c.inner});
    await new Promise(r=>setTimeout(r))}   /* yield: no frame hitches */
   if(!glyphs.length)return;
   const buf=await build(glyphs);
   await kv('w','glyphs',next);await kv('w','font',{sig,buf});await apply(buf.slice(0))}
  catch(e){console.warn('RZEmoji font sync failed',e)}
  finally{syncing=false;if(again){again=false;sync()}}}
 const idle=f=>window.requestIdleCallback?requestIdleCallback(f,{timeout:2000}):setTimeout(f,200);
 patch();addEventListener('load',patch);
 kv('r','font').then(s=>s&&s.buf&&apply(s.buf.slice(0))).finally(()=>idle(sync));
 /* runtime API: RZEmoji.add('name',['\u{1F680}'],svgText) → included in the font within moments */
 const add=(name,chars,src)=>{extras[name]={cps:[].concat(chars),src};clearTimeout(timer);timer=setTimeout(()=>idle(sync),400)};
 return{add,sync,patch,map,url,fix,html:s=>String(s).replace(RX,m=>`<img class=rzemo src="${url(base(m))}" alt="${m}">`),shim:()=>({rx:RX.source,map:{...uris}})}
})();
