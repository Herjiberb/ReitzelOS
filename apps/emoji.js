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
 return{map,url,fix,html:s=>String(s).replace(RX,m=>`<img class=rzemo src="${url(base(m))}" alt="${m}">`),shim:()=>({rx:RX.source,map:{...uris}})}
})();
