'use strict';
/* apps/browser.js — Spot The Web: built-in browser (id stays "spotweb" so saved pins/shortcuts keep working) */
(()=>{
const TABS=new Map();let tseq=1;
const SK=()=>'stw.'+S.cur;
const SDEF={engine:'https://duckduckgo.com/?q=%s',popups:false,downloads:false,scope:'dir',bm:[{n:'Wikipedia',u:'https://en.wikipedia.org'},{n:'Example',u:'https://example.com'},{n:'My Files',u:'file:///'}],hist:[],block:[]};
const BS=Apps.store('spotweb',SDEF,SK),sget=BS.get,sput=BS.set;

const KNOWN=['google.com','youtube.com','facebook.com','instagram.com','twitter.com','x.com','linkedin.com','github.com','netflix.com','amazon.com','paypal.com','bing.com','reddit.com','discord.com','whatsapp.com','tiktok.com','pinterest.com','twitch.tv','spotify.com','openai.com','chatgpt.com','claude.ai','microsoft.com','apple.com'];
const hostOf=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return''}};
const isBlocked=(h,c)=>[...KNOWN,...c.block].some(k=>h===k||h.endsWith('.'+k));
const DL=/\.(zip|rar|7z|tar|gz|tgz|bz2|xz|exe|msi|dmg|pkg|deb|rpm|apk|iso|jar)$/i;
const TY={html:'text/html',htm:'text/html',css:'text/css',js:'text/javascript',mjs:'text/javascript',json:'application/json',txt:'text/plain',svg:'image/svg+xml',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf',pdf:'application/pdf',xml:'application/xml',csv:'text/csv',wasm:'application/wasm',md:'text/plain'};
const typeOf=n=>{const e=EXT(n);return TY[e]||MIME[e]||'application/octet-stream'};
const TEXTX=new Set(['txt','md','json','js','mjs','css','csv','xml','log','ts','py','c','h','cpp','java','sh','yml','yaml','ini','toml','rtf','cfg']);
const ALLOW=()=>Apps.allow('spotweb',['autoplay','encrypted-media','picture-in-picture','web-share','screen-wake-lock']);
const sico=(d,f)=>`<svg viewBox="0 0 24 24" width=18 height=18 ${f?'fill=currentColor':'fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round'}>${d}</svg>`;
const I={bk:sico('<path d="M15 5l-7 7 7 7"/>'),fw:sico('<path d="M9 5l7 7-7 7"/>'),rl:sico('<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>'),x:sico('<path d="M6 6l12 12M18 6L6 18"/>'),hm:sico('<path d="M4 11l8-7 8 7M6 10v10h4v-6h4v6h4V10"/>'),st:sico('<path d="M12 3l2.9 6 6.6.8-4.9 4.5 1.3 6.7L12 17.7 6.1 21l1.3-6.7L2.5 9.8 9.1 9z"/>'),mn:sico('<circle cx=12 cy=5 r=1.8/><circle cx=12 cy=12 r=1.8/><circle cx=12 cy=19 r=1.8/>',1),pl:sico('<path d="M12 5v14M5 12h14"/>'),lk:sico('<path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z"/>'),fi:sico('<path d="M6 3h8l4 4v14H6zM14 3v4h4"/>'),sp:sico('<circle cx=12 cy=12 r=8/><circle cx=12 cy=12 r=2.5 fill=currentColor />')};
const LOGO=`<div class=stw-logo><span style="color:#3700ff">S</span><span style="color:#a600ff">p</span><i class=stw-o></i><span style="color:#007bff">t</span><span class=th>The <b>Web</b></span><span class=stw-sp>🕷️</span></div>`;
const WEBSVG=`<svg class=stw-web viewBox="0 0 200 200" fill=none stroke=#3700ff stroke-width=1.2><path d="M0 0L200 200M0 40L160 200M0 90L110 200M40 0L200 160M90 0L200 110M0 0L200 0M0 0L0 200"/><path d="M0 30Q30 30 30 0M0 70Q70 70 70 0M0 115Q115 115 115 0M0 160Q160 160 160 0M0 200Q200 200 200 0"/></svg>`;

const normURL=(raw,c)=>{raw=(raw||'').trim();if(!raw)return'browse.stw';
 if(/^file:\/\//i.test(raw))return'file:///'+raw.replace(/^file:\/+/i,'');
 if(/^[~\/]/.test(raw)&&!/\s/.test(raw))return'file://'+encodeURI(raw[0]==='~'?(FS.path(FS.home())+raw.slice(1)).replace(/\/+$/,'')||'/':raw);
 const m=raw.match(/^(?:stw:\/\/|https?:\/\/)?((?:[\w-]+\.)*[\w-]+\.stw)(\/.*)?$/i);if(m)return m[1].toLowerCase()+(m[2]||'');
 if(/^https?:\/\//i.test(raw)){return location.protocol==='https:'&&/^http:\/\//i.test(raw)&&!/^http:\/\/(localhost|127\.)/i.test(raw)?raw.replace(/^http:/i,'https:'):raw}
 if(!/\s/.test(raw)&&(/^[\w-]+(\.[\w-]+)+(:\d+)?([\/?#]|$)/.test(raw)||/^localhost(:\d+)?([\/?#]|$)/.test(raw)))return'https://'+raw;
 return c.engine.replace('%s',encodeURIComponent(raw))};
const kindOf=u=>/^file:\/\//.test(u)?'file':/^[\w.-]+\.stw(\/|$)/.test(u)?'stw':'web';
const fpath=u=>{let p=u.replace(/^file:\/+/,'/').split('#')[0].split('?')[0];try{p=decodeURI(p)}catch{}return p||'/'};
const asyncRep=async(s,re,fn)=>{const ms=[...s.matchAll(re)],rs=await Promise.all(ms.map(m=>fn(m)));let o='',i=0;ms.forEach((m,k)=>{o+=s.slice(i,m.index)+rs[k];i=m.index+m[0].length});return o+s.slice(i)};

/* ---- the script injected into every local (file://) page: makes it feel like a real site ---- */
function stwShim(C){
 var pend={},seq=0,T=window.top;
 function send(t,d,tr){T.postMessage(Object.assign({stw:1,tab:C.tab,t:t},d),'*',tr)}
 function req(t,d){return new Promise(function(res,rej){var id=++seq;pend[id]=[res,rej];send(t,Object.assign({id:id},d))})}
 addEventListener('message',function(e){var m=e.data;if(!m||!m.stwr)return;var p=pend[m.id];if(!p)return;delete pend[m.id];m.err?p[1](new Error(m.err)):p[0](m.res)});
 function norm(p){var o=[];p.split('/').forEach(function(s){if(!s||s==='.')return;if(s==='..')o.pop();else o.push(s)});return '/'+o.join('/')}
 function abs(u){u=String(u);if(/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(u)){if(/^file:\/\//i.test(u)){var f=u.replace(/^file:\/+/i,'/').split('#')[0].split('?')[0];try{f=decodeURI(f)}catch(e){}return norm(f)}return null}
  var p=u.split('#')[0].split('?')[0];try{p=decodeURI(p)}catch(e){}return p?norm(p[0]==='/'?p:C.dir+p):null}
 function furl(p,h){return 'file://'+encodeURI(p)+(h||'')}
 var self=C.dir+C.file;
 /* fetch / XHR to local files go through the OS file system (permission checked) */
 var oF=window.fetch;window.fetch=function(i,o){var u=(i&&i.url)||String(i),p=abs(u);if(p===null)return oF.apply(this,arguments);
  return req('read',{path:p}).then(function(r){return new Response(r.buf,{status:200,headers:{'content-type':r.type}})},function(){return new Response('Not found',{status:404,statusText:'Not Found'})})};
 var X=XMLHttpRequest.prototype,xo=X.open,xs=X.send;
 X.open=function(m,u){this._p=abs(u);return xo.apply(this,arguments)};
 X.send=function(){var x=this;if(x._p==null)return xs.apply(this,arguments);
  req('read',{path:x._p}).then(function(r){xd(x,200,'OK',r)},function(){xd(x,404,'Not Found',null)})};
 function xd(x,st,tx,r){var rt=x.responseType,v=null;if(r){if(rt==='arraybuffer')v=r.buf;else if(rt==='blob')v=new Blob([r.buf],{type:r.type});else if(rt==='json'){try{v=JSON.parse(new TextDecoder().decode(r.buf))}catch(e){}}else v=new TextDecoder().decode(r.buf)}
  var o={readyState:4,status:st,statusText:tx,response:v,responseText:(!rt||rt==='text')&&r?v:'',responseURL:x._p};
  for(var k in o)Object.defineProperty(x,k,{value:o[k],configurable:true});
  x.getResponseHeader=function(h){return /content-type/i.test(h)&&r?r.type:null};
  ['readystatechange','load','loadend'].forEach(function(n){var ev=new Event(n),h=x['on'+n];h&&h.call(x,ev);x.dispatchEvent(ev)})}
 /* dynamically assigned src/href */
 function dyn(P,prop){var d=Object.getOwnPropertyDescriptor(P.prototype,prop);if(!d||!d.set)return;
  Object.defineProperty(P.prototype,prop,{get:d.get,set:function(v){var el=this,p=abs(v);if(p===null)return d.set.call(el,v);
   req('read',{path:p,css:el instanceof HTMLLinkElement}).then(function(r){d.set.call(el,URL.createObjectURL(new Blob([r.buf],{type:r.type})))},function(){d.set.call(el,'data:,')})},configurable:true})}
 [[HTMLImageElement,'src'],[HTMLScriptElement,'src'],[HTMLMediaElement,'src'],[HTMLSourceElement,'src'],[HTMLTrackElement,'src'],[HTMLLinkElement,'href']].forEach(function(a){dyn(a[0],a[1])});
 var sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){var l=String(n).toLowerCase();
  if(l==='src'&&(this instanceof HTMLImageElement||this instanceof HTMLScriptElement||this instanceof HTMLMediaElement||this instanceof HTMLSourceElement||this instanceof HTMLTrackElement)){this.src=v;return}
  if(l==='href'&&this instanceof HTMLLinkElement){this.href=v;return}return sa.apply(this,arguments)};
 /* navigation: links, forms, window.open */
 addEventListener('pointerdown',function(){send('focus')},true);
 function go(h,blank){var p=abs(h),url;if(p!==null){url=furl(p,h.indexOf('#')>-1?h.slice(h.indexOf('#')):'')}else if(/^(mailto|tel|javascript|data|blob|about):/i.test(h))return;else url=h.indexOf('//')===0?'https:'+h:h;send(blank?'open':'nav',{url:url})}
 document.addEventListener('click',function(e){if(e.defaultPrevented)return;var t=e.target;
  var f=t.closest&&t.closest('input[type=file]');if(f){e.preventDefault();pick(f);return}
  var a=t.closest&&t.closest('a[href],area[href]');if(!a)return;var h=a.getAttribute('href');if(!h||h[0]==='#'||/^javascript:/i.test(h))return;
  if(a.hasAttribute('download')){e.preventDefault();dl(a);return}
  if(abs(h)===self&&h.indexOf('#')>-1)return;
  e.preventDefault();go(h,a.target==='_blank')},false);
 document.addEventListener('submit',function(e){var f=e.target;if(e.defaultPrevented||(f.method||'get').toLowerCase()!=='get')return;e.preventDefault();
  var act=f.getAttribute('action')||furl(self),p=abs(act),base=p!==null?furl(p):act,q=new URLSearchParams(new FormData(f)).toString();send('nav',{url:base.split('#')[0]+(base.indexOf('?')>-1?'&':'?')+q})},false);
 window.open=function(u){if(u)go(String(u),true);return null};window.close=function(){send('close')};
 /* downloads -> OS file system */
 function dl(a){var h=a.getAttribute('href'),p=abs(h),name=a.getAttribute('download')||h.split('?')[0].split('/').pop()||'download';
  (p!==null?req('read',{path:p}):oF.call(window,h).then(function(r){return r.arrayBuffer().then(function(b){return{buf:b,type:r.headers.get('content-type')||''}})})).then(function(r){send('save',{name:name,buf:r.buf,type:r.type})},function(){})}
 var ac=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.hasAttribute('download'))return dl(this);return ac.apply(this,arguments)};
 /* uploads -> OS file picker */
 function pick(inp){req('pick',{accept:inp.accept,multiple:inp.multiple}).then(function(fs){if(!fs||!fs.length)return;var dt=new DataTransfer();fs.forEach(function(f){dt.items.add(new File([f.buf],f.name,{type:f.type}))});inp.files=dt.files;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}))},function(){})}
 var ic=HTMLInputElement.prototype.click;HTMLInputElement.prototype.click=function(){if(this.type==='file')return pick(this);return ic.apply(this,arguments)};
 /* fullscreen -> maximised OS window */
 var fe=null,fs0='';function fev(el){['fullscreenchange','webkitfullscreenchange'].forEach(function(n){var ev=new Event(n,{bubbles:true});el&&el.dispatchEvent(ev);document.dispatchEvent(ev)})}
 function enter(){var el=this;if(fe)leave();fe=el;fs0=el.style.cssText;el.style.cssText+=';position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important;background:#000;margin:0!important';send('fs',{on:true});fev(el);return Promise.resolve()}
 function leave(){var el=fe;if(!el)return Promise.resolve();el.style.cssText=fs0;fe=null;send('fs',{on:false});fev(el);return Promise.resolve()}
 Element.prototype.requestFullscreen=Element.prototype.webkitRequestFullscreen=enter;document.exitFullscreen=document.webkitExitFullscreen=leave;
 ['fullscreenElement','webkitFullscreenElement'].forEach(function(n){Object.defineProperty(Document.prototype,n,{get:function(){return fe},configurable:true})});
 ['fullscreenEnabled','webkitFullscreenEnabled'].forEach(function(n){Object.defineProperty(Document.prototype,n,{get:function(){return true},configurable:true})});
 addEventListener('keydown',function(e){if(e.key==='Escape'&&fe)leave()});
 /* storage that survives (a real "file origin") */
 function mkS(init,save){var d=Object.assign({},init||{}),api={getItem:function(k){return k in d?String(d[k]):null},setItem:function(k,v){d[k]=String(v);save&&save(d)},removeItem:function(k){delete d[k];save&&save(d)},clear:function(){d={};save&&save(d)},key:function(i){return Object.keys(d)[i]||null}};
  return new Proxy(api,{get:function(t,k){if(k==='length')return Object.keys(d).length;if(k in t)return t[k];return k in d?d[k]:undefined},set:function(t,k,v){t.setItem(k,v);return true},deleteProperty:function(t,k){t.removeItem(k);return true},ownKeys:function(){return Object.keys(d)},getOwnPropertyDescriptor:function(t,k){return k in d?{value:d[k],enumerable:true,configurable:true}:undefined}})}
 try{Object.defineProperty(window,'localStorage',{value:mkS(C.ls,function(d){send('ls',{data:d})}),configurable:true});Object.defineProperty(window,'sessionStorage',{value:mkS({}),configurable:true})}catch(e){}
 var lt;setInterval(function(){if(document.title!==lt){lt=document.title;send('title',{title:lt})}},700);
 document.addEventListener('contextmenu',function(e){if(!e.defaultPrevented)e.preventDefault()});
}

function renderSpot(body,w){
 body.innerHTML=`<div class=stw><div class=stw-tabs></div><div class=stw-bar><button class=ib data-a=bk title=Back>${I.bk}</button><button class=ib data-a=fw title=Forward>${I.fw}</button><button class=ib data-a=rl title=Reload>${I.rl}</button><button class=ib data-a=hm title=Home>${I.hm}</button><div class=stw-om><span class=ls></span><input spellcheck=false placeholder="Search or type a web address, file:// path or .stw page"><button class=ib data-a=st title="Bookmark this page">${I.st}</button></div><button class=ib data-a=mn title="Spot The Web menu">${I.mn}</button></div><div class=stw-load></div><div class=stw-views><div class=stw-shield></div></div></div>`;
 const q=s=>body.querySelector(s),tabsEl=q('.stw-tabs'),views=q('.stw-views'),om=q('.stw-om input'),ld=q('.stw-load');
 const tabs=[];let cur=null,maxPrev=false;
 const cfg=()=>sget();
 const hist=(u,title)=>{if(u==='browse.stw'||/^[\w.-]+\.stw/.test(u))return;const c=sget();c.hist=c.hist.filter(x=>x.u!==u);c.hist.unshift({u,n:title||u,t:Date.now()});c.hist.length=Math.min(c.hist.length,300);sput(c)};
 const lab=t=>t.title||(t.kind==='web'?hostOf(t.url):t.url)||'New tab';

 function drawTabs(){tabsEl.innerHTML='';tabs.forEach(t=>{const e=H('div','stw-tab'+(t===cur?' on':''),tabsEl,`<div class=fv></div><span></span><button class=ib>${I.x}</button>`);e.querySelector('span').textContent=lab(t);e.querySelector('.fv').textContent=(lab(t)[0]||'S').toUpperCase();e.title=lab(t);
   e.onpointerdown=ev=>{if(ev.target.closest('button'))return;activate(t)};e.querySelector('button').onclick=ev=>{ev.stopPropagation();closeTab(t)};e.onauxclick=ev=>{if(ev.button===1)closeTab(t)}});
  const n=H('button','ib stw-new',tabsEl,I.pl);n.title='New tab';n.onclick=()=>addTab('browse.stw');
  tabsEl.querySelectorAll('.stw-tab').forEach(e=>e.style.flexBasis=Math.max(46,Math.min(220,(tabsEl.clientWidth-60)/tabs.length))+'px')}
 function ui(){const t=cur;if(!t)return;q('[data-a=bk]').disabled=t.hi<=0;q('[data-a=fw]').disabled=t.hi>=t.h.length-1;q('[data-a=rl]').innerHTML=t.loading?I.x:I.rl;ld.classList.toggle('on',!!t.loading);
  if(document.activeElement!==om)om.value=t.url==='browse.stw'?'':t.url.replace(/^file:\/\/\//,'file:///');
  q('.ls').innerHTML=t.kind==='web'&&/^https:/.test(t.url)?I.lk:t.kind==='file'?I.fi:I.sp;
  q('[data-a=st]').classList.toggle('on',cfg().bm.some(b=>b.u===t.url));drawTabs();$('.tbar span',w.el).textContent=lab(t)+' — Spot The Web'}
 function addTab(raw){const t={id:'s'+w.id+'_'+tseq++,h:[],hi:-1,url:'',kind:'stw',v:H('div','stw-v',views),urls:[],cache:new Map(),w};TABS.set(t.id,t);tabs.push(t);activate(t);go(t,raw);return t}
 function activate(t){cur=t;tabs.forEach(x=>x.v.classList.toggle('on',x===t));ui();if(!t.url)om.focus()}
 function closeTab(t){clean(t);t.v.remove();TABS.delete(t.id);const i=tabs.indexOf(t);tabs.splice(i,1);if(!tabs.length)return closeW(w);if(cur===t)activate(tabs[Math.min(i,tabs.length-1)]);else ui()}
 function clean(t){clearTimeout(t.to);t.urls.forEach(u=>URL.revokeObjectURL(u));t.urls=[];t.cache.clear();t.f=null;t.loading=0}

 async function save(name,blob){const home=FS.home(),dd=FS.K.get(home)&&FS.K.get(home).get('downloads');const m=await FS.write(dd||home,name,blob);RZ.toast('Saved to '+(dd?'Downloads':'your files')+': '+m.n);return m}
 async function download(t,url){RZ.toast('Downloading…');try{const r=await fetch(url);if(!r.ok)throw 0;const b=await r.blob();await save(decodeURIComponent(new URL(url).pathname.split('/').pop())||'download',b)}catch{blockedPage(t,url,'dl')}}

 function go(t,raw,o={}){const c=cfg(),u=normURL(raw,c);
  if(kindOf(u)==='web'&&DL.test((()=>{try{return new URL(u).pathname}catch{return''}})())){download(t,u);return}
  if(!o.np){t.h=t.h.slice(0,t.hi+1);if(t.h[t.hi]!==u){t.h.push(u);t.hi=t.h.length-1}}
  t.url=u;t.kind=kindOf(u);t.force=o.force;t.title='';show(t)}
 function jump(t,d){const i=t.hi+d;if(i<0||i>=t.h.length)return;t.hi=i;t.url=t.h[i];t.kind=kindOf(t.url);t.title='';t.force=0;show(t)}
 function show(t){clean(t);t.v.innerHTML='';t.v.scrollTop=0;t.tok=(t.tok||0)+1;
  if(t.kind==='stw')internal(t);else if(t.kind==='file')loadFile(t);else loadWeb(t);ui()}
 function done(t,title){t.loading=0;clearTimeout(t.to);if(title)t.title=title;hist(t.url,t.title);ui()}

 /* ---------------- web ---------------- */
 function loadWeb(t){const c=cfg(),u=t.url,host=hostOf(u);
  if(!host)return blockedPage(t,u,'bad');
  if(!t.force&&isBlocked(host,c))return blockedPage(t,u,'known');
  const f=document.createElement('iframe');f.className='stw-fr';
  f.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-modals allow-pointer-lock allow-presentation allow-orientation-lock'+(c.popups&&Apps.can('net.popups','spotweb')?' allow-popups allow-popups-to-escape-sandbox':'')+(c.downloads&&Apps.can('net.downloads','spotweb')?' allow-downloads':''));
  f.setAttribute('allow',ALLOW());f.referrerPolicy='strict-origin-when-cross-origin';
  t.f=f;t.loading=1;f.onload=()=>done(t,t.title||host);t.v.append(f);f.src=u;
  t.to=setTimeout(()=>{if(!t.loading||t.f!==f)return;const b=H('div','stw-banner',t.v,'<span>This is taking a while — the site may not allow being shown here.</span>');
   [['Show blocked page',()=>blockedPage(t,u,'known',1)],['Open in a real tab',()=>window.open(u,'_blank','noopener')],['Keep waiting',()=>b.remove()]].forEach(([l,fn])=>H('button','',b,l).onclick=fn)},14000)}
 function blockedPage(t,u,why,mark){clean(t);t.v.innerHTML='';t.loading=0;const host=hostOf(u)||u;
  if(mark){const c=cfg();if(host&&!c.block.includes(host)){c.block.push(host);sput(c)}}
  const msg={known:`<b>${host}</b> doesn’t allow itself to be shown inside another page, so Spot The Web can’t display it.`,dl:'The file couldn’t be downloaded because the site doesn’t allow other pages to fetch it.',bad:'That address doesn’t look right.'}[why]||'';
  const p=H('div','stw-pg err',t.v,`<svg width=84 height=84 viewBox="0 0 24 24" fill=none stroke=#9aa0a6 stroke-width=1.4 stroke-linecap=round><circle cx=12 cy=12 r=9 /><path d="M5.6 5.6l12.8 12.8"/></svg><h2>This page is blocked</h2><p>${msg}</p><p style="font-size:12px;color:#80868b">ERR_BLOCKED_BY_RESPONSE · ${host}</p><div class=row></div>`);
  const r=$('.row',p);if(why==='known'){H('button','b pri',r,'Try anyway').onclick=()=>{const c=cfg();c.block=c.block.filter(x=>x!==host);sput(c);go(t,u,{np:1,force:1})}}
  if(why!=='bad')H('button','b',r,'Open in a real tab').onclick=()=>window.open(u,'_blank','noopener');
  H('button','b',r,'Go home').onclick=()=>go(t,'browse.stw');t.title='Blocked';ui()}

 /* ---------------- .stw internal pages ---------------- */
 function internal(t){const host=t.url.split('/')[0],c=cfg(),pg=H('div','stw-pg',t.v);t.title='';
  const search=(par)=>{const f=H('form','stw-sf',par,`${sico('<circle cx=11 cy=11 r=7 /><path d="M20 20l-4-4"/>')}<input placeholder="Search the web or type an address" autofocus spellcheck=false>`);const i=$('input',f);i.onkeydown=e=>e.stopPropagation();f.onsubmit=e=>{e.preventDefault();go(t,i.value)};setTimeout(()=>i.focus(),30)};
  if(host==='browse.stw'){t.title='New tab';pg.insertAdjacentHTML('afterbegin',WEBSVG+LOGO);search(pg);const tl=H('div','stw-tiles',pg);const cols=['#3700ff','#a600ff','#007bff','#ff3d71','#f29900','#12b886'];
   c.bm.forEach((b,i)=>{const e=H('button','stw-tile',tl,'<i></i><span></span>');$('i',e).textContent=(b.n[0]||'?').toUpperCase();$('i',e).style.background=cols[i%cols.length];$('span',e).textContent=b.n;e.onclick=()=>go(t,b.u)});
   const ft=H('p','',pg,'Pages ending in <code>.stw</code> live inside Spot The Web · try <code>about.stw</code>, <code>history.stw</code>, <code>settings.stw</code> or <code>file:///</code>');ft.style.cssText='margin-top:36px;font-size:12px;color:#80868b'}
  else if(host==='history.stw'){t.title='History';H('h2','',pg,'History');const l=H('div','stw-list',pg);const b=H('button','b',pg,'Clear browsing data');b.onclick=()=>{const x=cfg();x.hist=[];sput(x);show(t)};
   if(!c.hist.length)H('p','',l,'Nothing here yet.');c.hist.forEach(h=>{const a=H('a','',l,'<b></b><small></small>');$('b',a).textContent=h.n&&h.n!==h.u?h.n+' — '+h.u:h.u;$('small',a).textContent=new Date(h.t).toLocaleString();a.onclick=()=>go(t,h.u)})}
  else if(host==='settings.stw'){t.title='Settings';H('h2','',pg,'Settings');const s=H('div','stw-set',pg);const R=(a,b,el)=>{const r=H('div','r',s,'<div><b></b><small></small></div>');$('b',r).textContent=a;$('small',r).textContent=b;r.append(el)};
   const sel=H('select');[['https://duckduckgo.com/?q=%s','DuckDuckGo'],['https://en.wikipedia.org/w/index.php?search=%s','Wikipedia'],['https://www.bing.com/search?q=%s','Bing'],['https://www.google.com/search?q=%s','Google'],['https://search.brave.com/search?q=%s','Brave Search']].forEach(([v,l])=>H('option','',sel,l).value=v);sel.value=c.engine;sel.onchange=()=>{const x=cfg();x.engine=sel.value;sput(x)};R('Search engine','Used when you type something that isn’t an address. Some engines refuse to be framed.',sel);
   const cb=(k,a,b)=>{const e=H('input');e.type='checkbox';e.checked=!!c[k];e.onchange=()=>{const x=cfg();x[k]=e.checked;sput(x)};R(a,b,e)};
   cb('popups','Allow pop-ups','Lets sites open new real browser tabs. Off keeps everything inside ReitzelOS. Takes effect on next load.');
   cb('downloads','Allow web-page downloads to your real computer','Off means sites can’t save files outside ReitzelOS (archives you open are saved to Downloads instead).');
   const sc=H('select');[['dir','Only the page’s own folder'],['home','All of my files']].forEach(([v,l])=>H('option','',sc,l).value=v);sc.value=c.scope;sc.onchange=()=>{const x=cfg();x.scope=sc.value;sput(x)};R('Local pages can read','What a file:// page may load, fetch or link to.',sc);
   const rb=H('button','b',null,'Reset');rb.onclick=()=>{BS.reset();show(t)};R('Reset Spot The Web','Clears bookmarks, history and settings.',rb)}
  else if(host==='about.stw'){t.title='About';pg.insertAdjacentHTML('afterbegin',LOGO);H('p','',pg,'A tiny browser that lives inside ReitzelOS.');const l=H('p','',pg,'<b>Sites</b> are shown in a sandboxed frame — sites that forbid framing show a blocked page.<br><b>Your files</b> open from <code>file:///</code> addresses, with uploads, downloads and full-screen routed through ReitzelOS.<br><b>.stw</b> addresses are handled by the browser itself.');l.style.marginTop='24px'}
  else{t.title='Not found';pg.className='stw-pg err';pg.innerHTML=`<svg width=84 height=84 viewBox="0 0 24 24" fill=none stroke=#9aa0a6 stroke-width=1.4><circle cx=12 cy=12 r=9 /><path d="M9 9.5a3 3 0 1 1 4 2.8c-.7.4-1 .9-1 1.7M12 17.5v.1"/></svg><h2>This .stw page doesn’t exist</h2><p><b>${t.url.replace(/</g,'&lt;')}</b> isn’t a Spot The Web address.</p><div class=row></div>`;H('button','b pri',$('.row',pg),'Go to browse.stw').onclick=()=>go(t,'browse.stw')}
  done(t)}

 /* ---------------- file:// ---------------- */
 const inScope=(t,id)=>!t.scope||t.scope==='root'||FS.isIn(id,t.scope);
 async function blobFor(t,ref,dir,css){if(!ref||/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref))return null;
  const p=ref.split('#')[0].split('?')[0];if(!p)return null;let id;try{id=FS.resolve(decodeURI(p),p[0]==='/'?'root':dir)}catch{return null}
  const m=id&&FS.get(id);if(!m||m.t!=='f'||!inScope(t,id))return null;if(t.cache.has(id))return t.cache.get(id);
  const b=await FS.blob(id),ty=typeOf(m.n);let out;if(EXT(m.n)==='css')out=new Blob([await cssRw(t,await b.text(),m.p)],{type:'text/css'});else out=new Blob([b],{type:ty});
  const u=URL.createObjectURL(out);t.urls.push(u);t.cache.set(id,u);return u}
 const cssRw=async(t,s,dir)=>{s=await asyncRep(s,/url\(\s*(['"]?)([^'")]+)\1\s*\)/g,async m=>{const u=await blobFor(t,m[2].trim(),dir);return u?`url("${u}")`:m[0]});
  return asyncRep(s,/@import\s+(['"])([^'"]+)\1/g,async m=>{const u=await blobFor(t,m[2],dir);return u?`@import "${u}"`:m[0]})};
 const textOf=async(t,ref,dir)=>{const p=(ref||'').split('#')[0].split('?')[0];if(!p||/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(p))return null;let id;try{id=FS.resolve(decodeURI(p),p[0]==='/'?'root':dir)}catch{return null}
  const m=id&&FS.get(id);if(!m||m.t!=='f'||!inScope(t,id))return null;return{m,text:await(await FS.blob(id)).text()}};
 async function buildHtml(t,id,depth){const m=FS.get(id),dir=m.p,dp=FS.path(dir).replace(/\/?$/,'/');
  const doc=new DOMParser().parseFromString(await(await FS.blob(id)).text(),'text/html'),jobs=[];
  const safe=s=>s.replace(/<\/(script)/gi,'<\\/$1');
  doc.querySelectorAll('script[src]').forEach(el=>jobs.push((async()=>{const r=await textOf(t,el.getAttribute('src'),dir);if(r){el.removeAttribute('src');el.textContent=safe(r.text)}})()));
  doc.querySelectorAll('link[href]').forEach(el=>jobs.push((async()=>{const rel=(el.getAttribute('rel')||'').toLowerCase();if(rel.includes('stylesheet')){const r=await textOf(t,el.getAttribute('href'),dir);if(r){const s=doc.createElement('style');s.textContent=await cssRw(t,r.text,r.m.p);if(el.media)s.media=el.media;el.replaceWith(s)}}else{const u=await blobFor(t,el.getAttribute('href'),dir);if(u)el.setAttribute('href',u)}})()));
  doc.querySelectorAll('style').forEach(el=>jobs.push((async()=>{el.textContent=await cssRw(t,el.textContent,dir)})()));
  doc.querySelectorAll('[style]').forEach(el=>jobs.push((async()=>{el.setAttribute('style',await cssRw(t,el.getAttribute('style'),dir))})()));
  doc.querySelectorAll('[src]:not(script)').forEach(el=>jobs.push((async()=>{const ref=el.getAttribute('src');
   if(/^i?frame$/i.test(el.tagName)&&depth<2){const r=await textOf(t,ref,dir);if(r&&/^(html?|xhtml)$/.test(EXT(r.m.n))){el.removeAttribute('src');el.setAttribute('srcdoc',await buildHtml(t,r.m.id,depth+1));return}}
   const u=await blobFor(t,ref,dir);if(u)el.setAttribute('src',u)})()));
  doc.querySelectorAll('[poster],object[data],[srcset]').forEach(el=>jobs.push((async()=>{for(const a of['poster','data']){const v=el.getAttribute(a);if(v){const u=await blobFor(t,v,dir);if(u)el.setAttribute(a,u)}}
   const ss=el.getAttribute('srcset');if(ss)el.setAttribute('srcset',(await Promise.all(ss.split(',').map(async x=>{const[a,...b]=x.trim().split(/\s+/);return[(await blobFor(t,a,dir))||a,...b].join(' ')}))).join(', '))})()));
  await Promise.all(jobs);
  let ls={};try{ls=JSON.parse(localStorage.getItem('stwls.'+S.cur+'.'+FS.path(id))||'{}')}catch{}
  const sc=doc.createElement('script');sc.textContent='('+stwShim.toString()+')('+JSON.stringify({tab:t.id,dir:dp,file:m.n,ls}).replace(/</g,'\\u003c')+')';
  (doc.head||doc.documentElement).prepend(sc);return'<!doctype html>'+doc.documentElement.outerHTML}
 async function loadFile(t){const tok=t.tok,path=fpath(t.url);let id;try{id=FS.resolve(path)}catch{id=null}const m=id&&FS.get(id);
  const err=(h,p)=>{t.v.innerHTML='';const pg=H('div','stw-pg err',t.v,`<svg width=84 height=84 viewBox="0 0 24 24" fill=none stroke=#9aa0a6 stroke-width=1.4 stroke-linecap=round><path d="M6 3h8l4 4v14H6zM14 3v4h4M9 13l6 5M15 13l-6 5"/></svg><h2>${h}</h2><p></p><div class=row></div>`);$('p',pg).textContent=p;H('button','b pri',$('.row',pg),'Go home').onclick=()=>go(t,'browse.stw');t.title='File not found';done(t)};
  if(!m)return err('File not found',path+' doesn’t exist, or you don’t have access to it.');
  t.title=m.n||'/';const c=cfg();
  if(m.t==='d'){t.title=m.n||'Files';const pg=H('div','stw-pg',t.v);pg.style.alignItems='stretch';pg.innerHTML='<h2></h2><div class=stw-list style="width:100%"></div>';$('h2',pg).textContent='Index of '+(path||'/');const l=$('.stw-list',pg);
   if(m.p!=null){const a=H('a','',l,'<b>📁 ..</b>');a.onclick=()=>go(t,'file://'+encodeURI(FS.path(m.p)))}
   FS.kids(id).slice().sort((a,b)=>(a.t===b.t?0:a.t==='d'?-1:1)||a.n.localeCompare(b.n,undefined,{numeric:true})).forEach(k=>{const a=H('a','',l,'<b></b><small></small>');$('b',a).textContent=(k.t==='d'?'📁 ':'📄 ')+k.n;$('small',a).textContent=(k.t==='f'?fmtSz(k.s||0)+' · ':'')+new Date(k.m).toLocaleDateString();a.onclick=()=>go(t,'file://'+encodeURI(FS.path(k.id)))});
   if(!l.children.length)H('p','',l,'This folder is empty.');return done(t)}
  const ext=EXT(m.n);
  try{if(/^(html?|xhtml)$/.test(ext)){t.scope=c.scope==='home'?FS.home():m.p;const html=await buildHtml(t,id,0);if(t.tok!==tok)return;
    const f=document.createElement('iframe');f.className='stw-fr';f.setAttribute('sandbox','allow-scripts allow-forms allow-modals allow-pointer-lock allow-presentation');f.setAttribute('allow',ALLOW().replace(/clipboard-read; /,''));t.f=f;t.loading=1;f.onload=()=>done(t);f.srcdoc=html;t.v.append(f);return}
   const b=await FS.blob(id),url=URL.createObjectURL(new Blob([b],{type:typeOf(m.n)}));t.urls.push(url);
   if(ext==='pdf'){const f=document.createElement('iframe');f.className='stw-fr';f.src=url;t.v.append(f)}
   else if(/^image\//.test(typeOf(m.n))){const d=H('div','stw-media',t.v);const i=H('img','',d);i.src=url}
   else if(/^(video|audio)\//.test(typeOf(m.n))){const d=H('div','stw-media',t.v);const v=H(typeOf(m.n)[0]==='v'?'video':'audio','',d);v.controls=true;v.src=url}
   else if(TEXTX.has(ext)||b.size<2e5){const tx=await b.text();if(/\0/.test(tx.slice(0,2000)))throw 0;H('pre','stw-txt',t.v).textContent=tx}
   else throw 0;
   done(t)}catch{err('Can’t display this file',m.n+' isn’t a type Spot The Web can show.')}}

 /* ---------------- messages from local pages ---------------- */
 w.stwMsg=async(e)=>{const m=e.data,t=TABS.get(m.tab);if(!t||t.w!==w||!t.f)return;let s=e.source,ok=0;for(let i=0;i<6&&s;i++){if(s===t.f.contentWindow){ok=1;break}if(s===s.parent)break;s=s.parent}if(!ok)return;
  const rep=(res,err,tr)=>{try{e.source.postMessage({stwr:1,id:m.id,res,err},'*',tr||[])}catch{}};
  try{switch(m.t){
   case'read':{const p=m.path;let id=FS.resolve(p);const f=id&&FS.get(id);if(!f||f.t!=='f'||!inScope(t,id))return rep(null,'denied');let b=await FS.blob(id);let buf;
     if(m.css&&EXT(f.n)==='css')buf=new TextEncoder().encode(await cssRw(t,await b.text(),f.p)).buffer;else buf=await b.arrayBuffer();rep({buf,type:typeOf(f.n)},null,[buf]);break}
   case'nav':go(t,m.url);break;
   case'open':addTab(m.url);break;
   case'title':t.title=String(m.title||'').slice(0,120)||t.title;ui();break;
   case'focus':focusW(w);break;
   case'close':closeTab(t);break;
   case'fs':{if(m.on){maxPrev=w.max;if(!w.max)toggleMax(w)}else if(!maxPrev&&w.max)toggleMax(w);break}
   case'save':await save(String(m.name||'download').replace(/[\\/]/g,'_'),new Blob([m.buf],{type:m.type||''}));break;
   case'ls':try{localStorage.setItem('stwls.'+S.cur+'.'+FS.path(FS.resolve(t.url?fpath(t.url):'/')),JSON.stringify(m.data))}catch{}break;
   case'pick':{const d=FS.home();fileDialog(w,{title:'Choose a file to upload',dir:d},async r=>{const f=FS.get(r.id);if(!f)return rep([]);const b=await FS.blob(f.id);const buf=await b.arrayBuffer();rep([{name:f.n,type:typeOf(f.n),buf}],null,[buf])});break}
  }}catch(x){rep(null,String(x&&x.message||x))}};

 /* ---------------- chrome ---------------- */
 let menu=null;const closeMenu=()=>{menu&&menu.remove();menu=null};
 q('.stw-bar').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||!cur)return;const a=b.dataset.a,t=cur;closeMenu();
  if(a==='bk')jump(t,-1);else if(a==='fw')jump(t,1);else if(a==='hm')go(t,'browse.stw');
  else if(a==='rl'){if(t.loading){if(t.f)t.f.src='about:blank';clean(t);ui()}else show(t)}
  else if(a==='st'){const c=cfg(),i=c.bm.findIndex(x=>x.u===t.url);if(i>-1)c.bm.splice(i,1);else c.bm.push({n:lab(t).slice(0,24),u:t.url});sput(c);ui()}
  else if(a==='mn'){e.stopPropagation();const items=[['New tab',()=>addTab('browse.stw')],['History',()=>go(t,'history.stw')],['Settings',()=>go(t,'settings.stw')],'-',[w.max?'Restore window size':'Maximize window',()=>toggleMax(w)],...(t.kind==='web'?[['Page not showing? Mark as blocked',()=>blockedPage(t,t.url,'known',1)],['Open in a real tab',()=>window.open(t.url,'_blank','noopener')]]:[]),'-',['About Spot The Web',()=>go(t,'about.stw')]];
   menu=H('div','stw-menu',q('.stw-bar'));items.forEach(it=>{if(it==='-')return H('hr','',menu);const x=H('button','',menu);x.textContent=it[0];x.onclick=()=>{closeMenu();it[1]()}})}});
 addEventListener('pointerdown',e=>{if(menu&&!e.target.closest('.stw-menu,[data-a=mn]'))closeMenu()},true);
 om.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'&&cur){go(cur,om.value);om.blur()}else if(e.key==='Escape'){om.blur();ui()}};om.onfocus=()=>om.select();om.onblur=ui;
 w.onclose=(oc=>()=>{tabs.slice().forEach(clean);tabs.forEach(t=>TABS.delete(t.id));oc&&oc()})(w.onclose);
 new ResizeObserver(()=>cur&&drawTabs()).observe(tabsEl);
 FS.ready.then(()=>addTab(w.tab&&typeof w.tab==='string'?w.tab:'browse.stw'));
}
addEventListener('message',e=>{const m=e.data;if(!m||!m.stw)return;const t=TABS.get(m.tab);t&&t.w.stwMsg&&t.w.stwMsg(e)});
Apps.register('spotweb',{name:'Spot The Web',icon:'browser',w:1000,h:640,cat:'internet',perms:['net.frames','net.popups','net.downloads','clipboard','media','location','fs'],render:renderSpot});
})();
