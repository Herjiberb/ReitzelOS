'use strict';
/* apps/browser.js — Spot The Web: built-in browser (id stays "spotweb" so saved pins/shortcuts keep working) */
(()=>{
const TABS=new Map();let tseq=1;
const SK=()=>'stw.'+S.cur;
const SDEF={engine:'https://www.google.com/search?q=%s&igu=1',v:0,popups:false,downloads:false,scope:'dir',bm:[{n:'Wikipedia',u:'https://en.wikipedia.org'},{n:'Example',u:'https://example.com'},{n:'My Files',u:'file:///'}],hist:[],block:[]};
const BS=Apps.store('spotweb',SDEF,SK),sput=BS.set,sget=()=>{const c=BS.get();if(c.v!==2){if(/duckduckgo\.com/.test(c.engine))c.engine=SDEF.engine;c.v=2;BS.set(c)}return c};
Apps.style('spotweb',`
/* ---------- Spot The Web ---------- */
.stw{display:flex;flex-direction:column;height:100%;background:#fff;color:#202124;font:13px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;position:relative}
.stw *{box-sizing:border-box}
.stw-tabs{display:flex;align-items:flex-end;background:#dee1e6;padding:6px 8px 0;flex:none;height:40px;gap:1px}
.stw-tab{display:flex;align-items:center;gap:7px;flex:0 1 220px;min-width:46px;height:34px;padding:0 6px 0 11px;border-radius:9px 9px 0 0;color:#5f6368;cursor:default;position:relative}
.stw-tab:not(.on):hover{background:#ffffff80}.stw-tab.on{background:#fff;color:#202124}
.stw-tab span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.stw-tab .fv{width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#3700ff,#ff3d71);flex:none;font-size:9px;color:#fff;display:grid;place-items:center;font-weight:700}
.stw .ib{width:30px;height:30px;border:0;background:none;border-radius:50%;color:#5f6368;display:grid;place-items:center;cursor:pointer;padding:0;flex:none}
.stw .ib:hover{background:#0000001a}.stw .ib svg{display:block;pointer-events:none;flex:none}.stw .ib:disabled{opacity:.35;pointer-events:none}.stw-pg,.stw-pg *,.stw-dev *,.stw-om input{user-select:text;-webkit-user-select:text}.stw-pg ::selection,.stw-om input::selection{background:#3700ff55}.stw-tab .ib{width:20px;height:20px}.stw-tab .ib svg{width:12px;height:12px}
.stw-new{margin:0 0 4px 4px}
.stw-bar{display:flex;align-items:center;gap:2px;padding:5px 8px;background:#fff;border-bottom:1px solid #dadce0;flex:none;position:relative}
.stw-om{flex:1;display:flex;align-items:center;gap:6px;height:32px;margin:0 6px;padding:0 6px 0 12px;background:#f1f3f4;border-radius:16px;border:2px solid transparent;min-width:0}
.stw-om:focus-within{background:#fff;border-color:#1a73e8}
.stw-om input{flex:1;border:0;background:none;outline:0;font:inherit;font-size:14px;color:#202124;min-width:0;padding:0}
.stw-om svg.ls{color:#5f6368;flex:none}.stw .ib.on{color:#f4b400}
.stw-load{height:2px;background:transparent;flex:none;overflow:hidden;position:relative}
.stw-load.on::after{content:"";position:absolute;top:0;left:0;height:100%;width:40%;background:#1a73e8;animation:stwl 1.1s ease-in-out infinite}
@keyframes stwl{0%{left:-40%}100%{left:100%}}
.stw-views{flex:1;position:relative;min-height:0;background:#fff}
.stw-v{position:absolute;inset:0;display:none;overflow:auto;background:#fff}.stw-v.on{display:block}
.stw-fr{width:100%;height:100%;border:0;display:block;background:#fff}
.stw-shield{position:absolute;inset:0;z-index:5;display:none}.win:not(.foc) .stw-shield{display:block}
.stw-menu{position:absolute;right:8px;top:44px;z-index:9;min-width:230px;background:#fff;border-radius:10px;box-shadow:0 4px 22px #0003,0 0 0 1px #0000001a;padding:6px 0}
.stw-menu button{display:block;width:100%;text-align:left;border:0;background:none;padding:8px 18px;font:inherit;color:#202124;cursor:pointer}.stw-menu button:hover{background:#f1f3f4}.stw-menu hr{border:0;border-top:1px solid #e8eaed;margin:5px 0}
.stw-banner{position:absolute;left:0;right:0;top:0;z-index:4;background:#fef7e0;border-bottom:1px solid #f0dca0;padding:7px 12px;display:flex;gap:8px;align-items:center;color:#5f4b00}
.stw-banner button,.stw-pg button.b{border:1px solid #dadce0;background:#fff;border-radius:16px;padding:5px 14px;font:inherit;color:#1a73e8;cursor:pointer}
.stw-banner span{flex:1}
.stw-pg{min-height:100%;display:flex;flex-direction:column;align-items:center;padding:42px 24px 40px;background:#fff;color:#202124;position:relative}
.stw-pg.err{justify-content:center;text-align:center;padding-bottom:90px}
.stw-pg h2{font-weight:500;font-size:22px;margin:14px 0 6px}.stw-pg p{color:#5f6368;max-width:520px;line-height:1.55;margin:4px 0}
.stw-pg button.b.pri{background:#1a73e8;color:#fff;border-color:#1a73e8}.stw-pg .row{display:flex;gap:8px;margin-top:18px;flex-wrap:wrap;justify-content:center}
.stw-pg code{background:#f1f3f4;padding:1px 6px;border-radius:5px}
.stw-logo{font-size:68px;font-weight:800;letter-spacing:-3px;line-height:1;margin-top:7vh;display:flex;align-items:center;user-select:none;position:relative;white-space:nowrap}
.stw-logo .th{font-weight:300;letter-spacing:-2px;margin-left:16px;color:#3c4043}.stw-logo .th b{font-weight:800;background:linear-gradient(135deg,#3700ff,#a600ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.stw-o{width:50px;height:50px;border-radius:50%;border:10px solid #ff3d71;display:inline-block;position:relative;margin:0 2px;flex:none}
.stw-o::after{content:"";position:absolute;width:12px;height:12px;border-radius:50%;background:#ffb300;left:7px;top:7px}
.stw-o::before{content:"";position:absolute;width:20px;height:9px;border-radius:5px;background:#ff3d71;right:-24px;bottom:-11px;transform:rotate(45deg)}
.stw-sp{position:absolute;right:-4px;top:-8px;font-size:22px;transform-origin:50% -60px;animation:stwsw 3.2s ease-in-out infinite}
.stw-sp::before{content:"";position:absolute;left:50%;bottom:100%;width:1px;height:44px;background:#9aa0a6}
@keyframes stwsw{0%,100%{transform:rotate(7deg)}50%{transform:rotate(-7deg)}}
.stw-sf{display:flex;align-items:center;gap:10px;width:min(600px,92%);height:50px;margin:34px 0 28px;padding:0 20px;border:1px solid #dfe1e5;border-radius:26px;background:#fff;transition:.15s}
.stw-sf:hover,.stw-sf:focus-within{box-shadow:0 1px 8px #20212447;border-color:transparent}
.stw-sf input{flex:1;border:0;outline:0;background:none;font:inherit;font-size:16px;color:#202124}
.stw-tiles{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;max-width:640px}
.stw-tile{width:98px;border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:7px;padding:10px 4px;border-radius:12px;cursor:pointer;font:inherit;color:#3c4043}
.stw-tile:hover{background:#f1f3f4}.stw-tile i{width:44px;height:44px;border-radius:50%;background:#f1f3f4;display:grid;place-items:center;font-style:normal;font-weight:700;font-size:18px;color:#fff}
.stw-tile span{max-width:92px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
.stw-web{position:absolute;right:0;top:0;opacity:.07;pointer-events:none;width:300px}
.stw-list{width:min(720px,94%);margin-top:14px}.stw-list a{display:flex;gap:14px;padding:9px 10px;border-radius:8px;color:#202124;text-decoration:none;cursor:pointer}.stw-list a:hover{background:#f1f3f4}
.stw-list small{color:#80868b;margin-left:auto;white-space:nowrap}.stw-list b{font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stw-set{width:min(620px,94%);margin-top:14px}.stw-set .r{display:flex;gap:14px;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid #e8eaed}.stw-set small{display:block;color:#5f6368}
.stw-set select{border:1px solid #dadce0;border-radius:8px;padding:6px 8px;font:inherit;background:#fff;color:#202124}
.stw-set input[type=checkbox]{width:18px;height:18px;accent-color:#1a73e8}
.stw-media{position:absolute;inset:0;display:grid;place-items:center;background:#0e0e10}.stw-media>*{max-width:100%;max-height:100%}
.stw-txt{margin:0;padding:14px 18px;white-space:pre-wrap;word-break:break-word;font:13px/1.5 ui-monospace,Consolas,monospace;color:#202124}
.stw-main{flex:1;display:flex;min-height:0;position:relative}
.stw-views{min-width:0}
.stw-hl{position:absolute;pointer-events:none;z-index:3;background:rgba(77,141,255,.28);outline:1px solid #4d8dff;display:none}
.stw-rs{display:none;flex:none;width:6px;margin:0 -3px;z-index:6;cursor:col-resize;position:relative}
.stw-rs:hover,.stw-rs.on{background:#1a73e866}
.stw-main.dev .stw-rs{display:block}
.stw-main.rsz .stw-views{pointer-events:none}
.stw-dev{display:none;flex-direction:column;flex:none;width:var(--dw,380px);min-width:240px;max-width:75%;background:#1e1f24;color:#d7dae0;border-left:1px solid #000;font:12px/1.45 system-ui,sans-serif;user-select:text}
.stw-main.dev .stw-dev{display:flex}
.stw .dv-h{display:flex;align-items:center;gap:2px;padding:0 4px 0 6px;height:34px;background:#2a2c33;flex:none;border-bottom:1px solid #000}
.stw .dv-h button{border:0;background:none;color:#aeb3bd;padding:0 9px;height:100%;font:inherit;cursor:pointer;border-bottom:2px solid transparent}
.stw .dv-h button:hover{color:#fff}.stw .dv-h button.on{color:#fff;border-bottom-color:#4d8dff}
.stw .dv-h .sp{flex:1}.stw .dv-h .dvx{height:26px;width:26px;padding:0;display:grid;place-items:center;border-radius:6px;border-bottom:0}.stw .dv-h .dvx:hover{background:#ffffff1f}
.dv-b{flex:1;min-height:0;display:flex;flex-direction:column}
.stw .dv-tool{display:flex;gap:4px;padding:4px 6px;border-bottom:1px solid #000;background:#25272d;flex:none;align-items:center}
.stw .dv-tool button,.stw .dv-tool select,.stw .dv-tool input{background:#34363e;color:#d7dae0;border:1px solid #444752;border-radius:5px;padding:2px 8px;font:inherit;height:24px;outline:0;cursor:pointer}
.stw .dv-tool input{cursor:text;flex:1;min-width:0}.stw .dv-tool button:hover{background:#41444e}.stw .dv-tool button.on{background:#2b4a85;border-color:#4d8dff}
.dv-hint{color:#7d828d;padding:4px 2px;font-size:11.5px}
.dv-note{padding:16px;color:#8b909a;line-height:1.5}
.dv-log{flex:1;overflow:auto;font:12px/1.45 ui-monospace,Consolas,monospace;min-height:0}
.dv-r{padding:3px 8px;border-bottom:1px solid #2c2e35;white-space:pre-wrap;word-break:break-word}
.dv-r.warn{background:#3a3217;color:#f5d56b}.dv-r.error{background:#3a1a1c;color:#ff8a8a}.dv-r.in{color:#8ab4ff}.dv-r.out{color:#9fe3a8}.dv-r.sys{color:#7d828d;font-style:italic}
.dv-ci{display:flex;align-items:center;border-top:1px solid #000;flex:none;background:#25272d}.dv-ci span{padding:0 4px 0 9px;color:#4d8dff;font-family:ui-monospace,monospace}
.stw .dv-ci input{flex:1;border:0;background:none;color:#d7dae0;font:12px ui-monospace,Consolas,monospace;padding:8px 6px;outline:0;min-width:0}
.dv-tree{flex:1;overflow:auto;padding:4px 0;font:12px/1.55 ui-monospace,Consolas,monospace;min-height:60px}
.dv-n{white-space:nowrap;cursor:default;padding-right:8px;overflow:hidden;text-overflow:ellipsis}.dv-n:hover{background:#2f3340}.dv-n.sel{background:#2b4a85;color:#fff}
.dv-ar{display:inline-block;width:12px;text-align:center;color:#8b909a;cursor:pointer;font-size:10px}
.dv-n .tg{color:#e57fa0}.dv-n .an{color:#f0b270}.dv-n .av{color:#8fd0f5}.dv-n.tx{color:#c3c7cf}.dv-n.cm{color:#6f9f6f}
.dv-det{flex:none;height:38%;overflow:auto;border-top:1px solid #000;padding:6px 8px;background:#202228}
.dv-det h4{font:600 11.5px ui-monospace,Consolas,monospace;color:#c3c7cf;margin:6px 0 4px;word-break:break-all}
.dv-t{border-collapse:collapse;width:100%;font:11.5px ui-monospace,Consolas,monospace}.dv-t td{padding:1px 6px 1px 0;vertical-align:top;word-break:break-all}.dv-t td:first-child{color:#f0b270;white-space:nowrap}
.dv-net{flex:1;overflow:auto;min-height:0;font:11.5px ui-monospace,Consolas,monospace}
.dv-nr{display:grid;grid-template-columns:44px 44px 1fr auto;gap:6px;padding:3px 8px;border-bottom:1px solid #2c2e35}.dv-nr b{color:#7bd88f}.dv-nr.bad b{color:#ff8a8a}.dv-nr span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dv-nr em{color:#7d828d;font-style:normal}
.dv-src{flex:1;overflow:auto;margin:0;padding:6px 8px;white-space:pre;font:11.5px/1.5 ui-monospace,Consolas,monospace;color:#c3c7cf;tab-size:2;min-height:0}
.stw-om.stale input{color:#80868b;font-style:italic}.stw-om.stale svg.ls{color:#e8710a}

`);

const KNOWN=['duckduckgo.com','google.com','youtube.com','facebook.com','instagram.com','twitter.com','x.com','linkedin.com','github.com','netflix.com','amazon.com','paypal.com','bing.com','reddit.com','discord.com','whatsapp.com','tiktok.com','pinterest.com','twitch.tv','spotify.com','openai.com','chatgpt.com','claude.ai','microsoft.com','apple.com'];
const hostOf=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return''}};
const isBlocked=(h,c,u)=>!/[?&]igu=1(&|#|$)/.test(u||'')&&[...KNOWN,...c.block].some(k=>h===k||h.endsWith('.'+k));
const DL=/\.(zip|rar|7z|tar|gz|tgz|bz2|xz|exe|msi|dmg|pkg|deb|rpm|apk|iso|jar)$/i;
const TY={html:'text/html',htm:'text/html',css:'text/css',js:'text/javascript',mjs:'text/javascript',json:'application/json',txt:'text/plain',svg:'image/svg+xml',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf',pdf:'application/pdf',xml:'application/xml',csv:'text/csv',wasm:'application/wasm',md:'text/plain'};
const typeOf=n=>{const e=EXT(n);return TY[e]||MIME[e]||'application/octet-stream'};
const TEXTX=new Set(['txt','md','json','js','mjs','css','csv','xml','log','ts','py','c','h','cpp','java','sh','yml','yaml','ini','toml','rtf','cfg']);
const ALLOW=()=>Apps.allow('spotweb',['autoplay','encrypted-media','picture-in-picture','web-share','screen-wake-lock']);
const sico=(d,f)=>`<svg viewBox="0 0 24 24" width=18 height=18 ${f?'fill=currentColor':'fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round'}>${d}</svg>`;
const I={bk:sico('<path d="M15 5l-7 7 7 7"/>'),fw:sico('<path d="M9 5l7 7-7 7"/>'),rl:sico('<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>'),x:sico('<path d="M6 6l12 12M18 6L6 18"/>'),hm:sico('<path d="M4 11l8-7 8 7M6 10v10h4v-6h4v6h4V10"/>'),st:sico('<path d="M12 3l2.9 6 6.6.8-4.9 4.5 1.3 6.7L12 17.7 6.1 21l1.3-6.7L2.5 9.8 9.1 9z"/>'),mn:sico('<circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/>',1),pl:sico('<path d="M12 5v14M5 12h14"/>'),lk:sico('<path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z"/>'),wn:sico('<path d="M12 4l9 16H3zM12 10v4M12 17v.1"/>'),dv:sico('<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12"/>'),fi:sico('<path d="M6 3h8l4 4v14H6zM14 3v4h4"/>'),sp:sico('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/>')};
const LOGO=`<div class=stw-logo><span style="color:#3700ff">S</span><span style="color:#a600ff">p</span><i class=stw-o></i><span style="color:#007bff">t</span><span class=th>The <b>Web</b></span><span class=stw-sp>🕷️</span></div>`;
const WEBSVG=`<svg class=stw-web viewBox="0 0 200 200" fill=none stroke=#3700ff stroke-width=1.2><path d="M0 0L200 200M0 40L160 200M0 90L110 200M40 0L200 160M90 0L200 110M0 0L200 0M0 0L0 200"/><path d="M0 30Q30 30 30 0M0 70Q70 70 70 0M0 115Q115 115 115 0M0 160Q160 160 160 0M0 200Q200 200 200 0"/></svg>`;

const igu=u=>{if(kindOf(u)!=='web')return u;try{const x=new URL(u);if(/^(www\.)?google\.[a-z.]+$/.test(x.hostname)&&/^\/(webhp|search)?\/?$/.test(x.pathname)&&!x.searchParams.has('igu')){x.searchParams.set('igu','1');return x.href}}catch{}return u};
const normURL=(raw,c)=>igu(normURL0(raw,c));
const normURL0=(raw,c)=>{raw=(raw||'').trim();if(!raw)return'browse.stw';
 if(/^file:\/\//i.test(raw))return'file:///'+raw.replace(/^file:\/+/i,'');
 if(/^[~\/]/.test(raw)&&!/\s/.test(raw))return'file://'+encodeURI(raw[0]==='~'?(FS.path(FS.home())+raw.slice(1)).replace(/\/+$/,'')||'/':raw);
 const m=raw.match(/^(?:stw:\/\/|https?:\/\/)?((?:[\w-]+\.)*[\w-]+\.stw)(\/.*)?$/i);if(m)return m[1].toLowerCase()+(m[2]||'');
 if(/^https?:\/\//i.test(raw)){return location.protocol==='https:'&&/^http:\/\//i.test(raw)&&!/^http:\/\/(localhost|127\.)/i.test(raw)?raw.replace(/^http:/i,'https:'):raw}
 if(!/\s/.test(raw)&&(/^[\w-]+(\.[\w-]+)+(:\d+)?([\/?#]|$)/.test(raw)||/^localhost(:\d+)?([\/?#]|$)/.test(raw)))return'https://'+raw;
 return c.engine.replace('%s',encodeURIComponent(raw))};
const kindOf=u=>/^file:\/\//.test(u)?'file':/^[\w.-]+\.stw(\/|$)/.test(u)?'stw':'web';
const fpath=u=>{let p=u.replace(/^file:\/+/,'/').split('#')[0].split('?')[0];try{p=decodeURI(p)}catch{}return p||'/'};
const asyncRep=async(s,re,fn)=>{const ms=[...s.matchAll(re)],rs=await Promise.all(ms.map(m=>fn(m)));let o='',i=0;ms.forEach((m,k)=>{o+=s.slice(i,m.index)+rs[k];i=m.index+m[0].length});return o+s.slice(i)};

function domSer(root,path,depth){var n=root;for(var i=0;i<path.length;i++)n=n&&n.childNodes[path[i]];if(!n)return null;
 function vis(c){return (c.nodeType===1&&!(c.hasAttribute&&c.hasAttribute('data-stw')))||(c.nodeType===3&&c.textContent.trim())||c.nodeType===8}
 function ser(n,p,d){var o={p:p,t:n.nodeType};if(n.nodeType===1){o.n=n.tagName.toLowerCase();o.a=[];for(var i=0;i<n.attributes.length;i++){var at=n.attributes[i];o.a.push([at.name,at.value.length>300?at.value.slice(0,300)+'...':at.value])}
  var kids=[];for(var j=0;j<n.childNodes.length;j++){var c=n.childNodes[j];if(vis(c))kids.push([c,j])}o.k=kids.length;if(d>0)o.c=kids.map(function(x){return ser(x[0],p.concat(x[1]),d-1)})}else o.x=n.textContent.slice(0,300);return o}
 return ser(n,path,depth)}
/* ---- the script injected into every local (file://) page: makes it feel like a real site ---- */
function stwShim(C,D){
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
 var armed=0,armT=0;function arm(){armed=1;clearTimeout(armT);armT=setTimeout(function(){armed=0},1500)}['pointerdown','pointerup','keydown','touchend'].forEach(function(n){addEventListener(n,arm,true)});
 function go(h,blank){armed=0;var p=abs(h),url;if(p!==null){url=furl(p,h.indexOf('#')>-1?h.slice(h.indexOf('#')):'')}else if(/^(mailto|tel|javascript|data|blob|about):/i.test(h))return;else url=h.indexOf('//')===0?'https:'+h:h;send(blank?'open':'nav',{url:url})}
 document.addEventListener('click',function(e){if(e.defaultPrevented)return;var t=e.target;
  var f=t.closest&&t.closest('input[type=file]');if(f){e.preventDefault();pick(f);return}
  var a=t.closest&&t.closest('a[href],area[href]');if(!a&&e.composedPath){var cp=e.composedPath();for(var i=0;i<cp.length;i++){if(cp[i].matches&&cp[i].matches('a[href],area[href]')){a=cp[i];break}}}
  if(!a){var d=t.closest&&t.closest('[data-href],[data-url],[data-link]');var dh=d&&(d.getAttribute('data-href')||d.getAttribute('data-url')||d.getAttribute('data-link'));if(dh&&/^(https?:|\/|\.|[\w-]+\.[\w.-]+)/i.test(dh)){e.preventDefault();go(dh,e.ctrlKey||e.metaKey)}return}var h=a.getAttribute('href');if(!h||h[0]==='#'||/^javascript:/i.test(h))return;
  if(a.hasAttribute('download')){e.preventDefault();dl(a);return}
  if(abs(h)===self&&h.indexOf('#')>-1)return;
  e.preventDefault();go(h,a.target==='_blank'||e.ctrlKey||e.metaKey)},false);
 document.addEventListener('auxclick',function(e){if(e.button!==1)return;var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href');if(!h||h[0]==='#'||/^javascript:/i.test(h))return;e.preventDefault();go(h,true)},false);
 /* script navigation (location.href=..., buttons that redirect): catch with the Navigation API where the browser allows it */
 try{if(window.navigation&&navigation.addEventListener)navigation.addEventListener('navigate',function(e){if(!armed||!e.cancelable||e.hashChange||e.downloadRequest||e.formData)return;var ty=e.navigationType;if(ty==='reload'||ty==='traverse')return;var u=e.destination&&e.destination.url;if(!u||/^(javascript|data|blob):/i.test(u))return;if(u.split('#')[0]===String(location.href).split('#')[0])return;e.preventDefault();armed=0;go(u,false)})}catch(x){}
 document.addEventListener('submit',function(e){var f=e.target;if(e.defaultPrevented||(f.method||'get').toLowerCase()!=='get')return;e.preventDefault();
  var sb=e.submitter,act=(sb&&sb.getAttribute&&sb.getAttribute('formaction'))||f.getAttribute('action')||furl(self),p=abs(act),base=p!==null?furl(p):act,q=new URLSearchParams(new FormData(f)).toString();send('nav',{url:base.split('#')[0]+(base.indexOf('?')>-1?'&':'?')+q})},false);
 window.open=function(u){if(u)go(String(u),true);return null};
 /* Reitzel emoji inside pages */
 if(C.emo&&C.emo.map){var ER=new RegExp(C.emo.rx,'gu'),EK=/^(INPUT|TEXTAREA|SELECT|SCRIPT|STYLE|NOSCRIPT)$/;
  var efix=function(n){if(n.nodeType===3){var s=n.nodeValue;ER.lastIndex=0;if(!ER.test(s))return;var p=n.parentNode;if(!p||EK.test(p.nodeName)||p.isContentEditable||(p.closest&&p.closest('svg,[contenteditable]')))return;var fr=document.createDocumentFragment(),last=0,m;ER.lastIndex=0;
    while((m=ER.exec(s))){var u=C.emo.map[String.fromCodePoint(m[0].codePointAt(0))];if(!u)continue;fr.append(s.slice(last,m.index));var i=document.createElement('img');i.src=u;i.alt=m[0];i.style.cssText='width:1.15em;height:1.15em;vertical-align:-.2em;display:inline-block';fr.append(i);last=m.index+m[0].length}fr.append(s.slice(last));p.replaceChild(fr,n)}
   else if(n.nodeType===1&&!EK.test(n.nodeName)){for(var c=n.firstChild;c;){var nx=c.nextSibling;efix(c);c=nx}}};
  new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==='characterData')efix(m.target);else m.addedNodes.forEach(efix)})}).observe(document,{childList:true,subtree:true,characterData:true});
  if(document.body)efix(document.body);document.addEventListener('DOMContentLoaded',function(){efix(document.body)})}
window.close=function(){send('close')};
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
  /* ---- developer hooks: console, network, context menu, shortcuts, inspector ---- */
 function dvPv(v,d,seen){try{var t=typeof v;if(v===null)return 'null';if(t==='undefined')return 'undefined';if(t==='string')return d?JSON.stringify(v.length>120?v.slice(0,120)+'...':v):v;if(t==='function')return 'f '+(v.name||'anonymous')+'()';if(t!=='object')return String(v);if(v instanceof Error)return v.stack||String(v);
  if(v.nodeType===1)return '<'+v.tagName.toLowerCase()+(v.id?'#'+v.id:'')+(typeof v.className==='string'&&v.className.trim()?'.'+v.className.trim().split(/\s+/).join('.'):'')+'>';
  seen=seen||[];if(seen.indexOf(v)>-1)return '[Circular]';if((d||0)>2)return Array.isArray(v)?'[...]':'{...}';seen.push(v);var o;
  if(Array.isArray(v)){o='['+v.slice(0,30).map(function(x){return dvPv(x,(d||0)+1,seen)}).join(', ')+(v.length>30?', ...+'+(v.length-30):'')+']'}
  else{var ks=Object.keys(v);o=(v.constructor&&v.constructor.name&&v.constructor.name!=='Object'?v.constructor.name+' ':'')+'{'+ks.slice(0,20).map(function(k){return k+': '+dvPv(v[k],(d||0)+1,seen)}).join(', ')+(ks.length>20?', ...':'')+'}'}
  seen.pop();return o}catch(e){return '[unreadable]'}}
 ['log','info','warn','error','debug'].forEach(function(l){var o=console[l];console[l]=function(){try{send('log',{lv:l==='debug'?'log':l,a:[].map.call(arguments,function(x){return dvPv(x,0)})})}catch(e){}return o.apply(console,arguments)}});
 var occ=console.clear;console.clear=function(){send('clr');return occ&&occ.apply(console,arguments)};
 addEventListener('error',function(e){send('log',{lv:'error',a:[(e.message||'Error')+(e.filename?'  ('+String(e.filename).split('/').pop()+':'+e.lineno+')':'')]})});
 addEventListener('unhandledrejection',function(e){send('log',{lv:'error',a:['Uncaught (in promise) '+dvPv(e.reason,0)]})});
 var f1=window.fetch;window.fetch=function(i,o){var u=(i&&i.url)||String(i),m=((o&&o.method)||(i&&i.method)||'GET').toUpperCase(),t0=Date.now();
  return f1.apply(this,arguments).then(function(r){send('net',{m:m,u:u,s:r.status,ms:Date.now()-t0,ty:(r.headers.get('content-type')||'').split(';')[0]});return r},function(er){send('net',{m:m,u:u,s:0,ms:Date.now()-t0,ty:'failed'});throw er})};
 var xo2=X.open,xs2=X.send;X.open=function(m,u){this._m=m;this._u=String(u);return xo2.apply(this,arguments)};
 X.send=function(){var x=this,t0=Date.now();x.addEventListener('loadend',function(){send('net',{m:String(x._m||'GET').toUpperCase(),u:x._u,s:x.status,ms:Date.now()-t0,ty:'xhr'})});return xs2.apply(this,arguments)};
 function dvPath(n){var p=[];while(n&&n!==document.documentElement){var par=n.parentNode;if(!par)break;p.unshift([].indexOf.call(par.childNodes,n));n=par}return p}
 function dvAt(p){var n=document.documentElement;for(var i=0;i<p.length&&n;i++)n=n.childNodes[p[i]];return n}
 function dvRes(h){var p=abs(h);if(p!==null)return furl(p);if(/^(mailto|tel|javascript|data|blob|about):/i.test(h))return h;return h.indexOf('//')===0?'https:'+h:h}
 var hlEl=null,pkm=null;
 function dvHl(p){if(!hlEl){hlEl=document.createElement('div');hlEl.setAttribute('data-stw','1');hlEl.style.cssText='position:fixed;pointer-events:none;z-index:2147483646;background:rgba(77,141,255,.28);outline:1px solid #4d8dff;display:none';(document.body||document.documentElement).appendChild(hlEl)}
  var n=p&&dvAt(p);if(n&&n.nodeType===3)n=n.parentNode;if(!n||n.nodeType!==1||n===document.documentElement){hlEl.style.display='none';return}var r=n.getBoundingClientRect();hlEl.style.display='block';hlEl.style.left=r.left+'px';hlEl.style.top=r.top+'px';hlEl.style.width=r.width+'px';hlEl.style.height=r.height+'px'}
 function dvPick(on){if(pkm){document.removeEventListener('mousemove',pkm.m,true);document.removeEventListener('click',pkm.c,true);document.removeEventListener('keydown',pkm.k,true);pkm=null;dvHl(null)}if(!on)return;
  pkm={m:function(e){dvHl(dvPath(e.target))},c:function(e){e.preventDefault();e.stopPropagation();var p=dvPath(e.target);dvPick(false);send('picked',{path:p})},k:function(e){if(e.key==='Escape'){dvPick(false);send('picked',{path:null})}}};
  document.addEventListener('mousemove',pkm.m,true);document.addEventListener('click',pkm.c,true);document.addEventListener('keydown',pkm.k,true)}
 addEventListener('message',function(e){var m=e.data;if(!m||!m.stwq||e.source!==T)return;var id=m.id;function ok(r){send('qr',{id:id,res:r})}function no(x){send('qr',{id:id,err:String(x&&x.message||x)})}
  try{switch(m.t){
   case 'dom':ok(D(document.documentElement,m.path||[],m.depth||1));break;
   case 'sel':{var n=dvAt(m.path||[]);if(n&&n.nodeType===3)n=n.parentNode;if(!n||n.nodeType!==1)return ok(null);var r=n.getBoundingClientRect(),cs=getComputedStyle(n),o={};
    ['display','position','color','background-color','font','margin','padding','z-index'].forEach(function(k){o[k]=cs.getPropertyValue(k)});ok({w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,x:Math.round(r.left),y:Math.round(r.top),css:o});break}
   case 'hl':dvHl(m.path);ok(1);break;
   case 'pick':dvPick(!!m.on);ok(1);break;
   case 'cmd':document.execCommand(m.c);ok(1);break;
   case 'eval':{var rv;try{rv=(0,eval)('('+m.code+'\n)')}catch(x){if(x instanceof SyntaxError)rv=(0,eval)(m.code);else throw x}
    if(rv&&typeof rv.then==='function')rv.then(function(v){ok({s:'Promise > '+dvPv(v,0)})},no);else ok({s:dvPv(rv,0)});break}
  }}catch(x){no(x)}});
 document.addEventListener('contextmenu',function(e){if(e.defaultPrevented&&!e.shiftKey)return;e.preventDefault();var t=e.target,a=t.closest&&t.closest('a[href]'),im=t.closest&&t.closest('img,video,audio,canvas'),
  d={x:e.clientX,y:e.clientY,path:dvPath(t),sel:String(getSelection()||'').slice(0,500),edit:!!(t.isContentEditable||/^(input|textarea)$/i.test(t.tagName||''))};
  if(a){var h=a.getAttribute('href');if(h&&h[0]!=='#'&&!/^javascript:/i.test(h))d.link=dvRes(h)}
  if(im){var k=im.tagName.toLowerCase();if(k==='canvas'){try{d.img={k:k,src:im.toDataURL()}}catch(x){}}else d.img={k:k,src:im.currentSrc||im.src||''}}
  send('ctx',d)});
 var HOTC=/^(t|w|l|d|r|s|h|u|i|j|tab|pageup|pagedown|[1-9]|f4)$/i,HOTA=/^(t|w|d|arrowleft|arrowright)$/i;
 addEventListener('keydown',function(e){if(e.defaultPrevented)return;var k=e.key,c=e.ctrlKey||e.metaKey,hot=(c&&!e.altKey&&HOTC.test(k))||(e.altKey&&!c&&HOTA.test(k))||k==='F5'||k==='F6'||k==='F12';if(!hot)return;e.preventDefault();send('key',{key:k,ctrl:e.ctrlKey,meta:e.metaKey,shift:e.shiftKey,alt:e.altKey})});
}

function renderSpot(body,w){
 body.innerHTML=`<div class=stw><div class=stw-tabs></div><div class=stw-bar><button class=ib data-a=bk title=Back>${I.bk}</button><button class=ib data-a=fw title=Forward>${I.fw}</button><button class=ib data-a=rl title=Reload>${I.rl}</button><button class=ib data-a=hm title=Home>${I.hm}</button><div class=stw-om><span class=ls></span><input spellcheck=false placeholder="Search or type a web address, file:// path or .stw page"><button class=ib data-a=st title="Bookmark this page">${I.st}</button></div><button class=ib data-a=dv title="Developer tools (F12)">${I.dv}</button><button class=ib data-a=mn title="Spot The Web menu">${I.mn}</button></div><div class=stw-load></div><div class=stw-main><div class=stw-views><div class=stw-shield></div></div><div class=stw-rs></div><aside class=stw-dev></aside></div></div>`;
 const q=s=>body.querySelector(s),tabsEl=q('.stw-tabs'),views=q('.stw-views'),om=q('.stw-om input'),ld=q('.stw-load');
 const tabs=[];let cur=null,maxPrev=false;
 const cfg=()=>sget();
 const hist=(u,title)=>{if(u==='browse.stw'||/^[\w.-]+\.stw/.test(u))return;const c=sget();c.hist=c.hist.filter(x=>x.u!==u);c.hist.unshift({u,n:title||u,t:Date.now()});c.hist.length=Math.min(c.hist.length,300);sput(c)};
 const lab=t=>t.title||(t.kind==='web'?hostOf(t.url):t.url)||'New tab';

 function drawTabs(){tabsEl.innerHTML='';tabs.forEach(t=>{const e=H('div','stw-tab'+(t===cur?' on':''),tabsEl,`<div class=fv></div><span></span><button class=ib>${I.x}</button>`);e.querySelector('span').textContent=lab(t);e.querySelector('.fv').textContent=(lab(t)[0]||'S').toUpperCase();e.title=lab(t);e._t=t;
   e.onpointerdown=ev=>{if(ev.target.closest('button'))return;activate(t)};e.querySelector('button').onclick=ev=>{ev.stopPropagation();closeTab(t)};e.onauxclick=ev=>{if(ev.button===1)closeTab(t)}});
  const n=H('button','ib stw-new',tabsEl,I.pl);n.title='New tab';n.onclick=()=>addTab('browse.stw');
  tabsEl.querySelectorAll('.stw-tab').forEach(e=>e.style.flexBasis=Math.max(46,Math.min(220,(tabsEl.clientWidth-60)/tabs.length))+'px')}
 function ui(){const t=cur;if(!t)return;q('[data-a=bk]').disabled=t.hi<=0;q('[data-a=fw]').disabled=t.hi>=t.h.length-1;q('[data-a=rl]').innerHTML=t.loading?I.x:I.rl;ld.classList.toggle('on',!!t.loading);
  if(document.activeElement!==om)om.value=t.url==='browse.stw'?'':t.url.replace(/^file:\/\/\//,'file:///');
  const stale=t.kind==='web'&&t.stale;q('.stw-om').classList.toggle('stale',!!stale);q('.stw-om').title=stale?'You clicked a link inside this page. Browsers hide the new address of other sites, so this still shows where you started.':'';q('.ls').innerHTML=stale?I.wn:t.kind==='web'&&/^https:/.test(t.url)?I.lk:t.kind==='file'?I.fi:I.sp;
  q('[data-a=st]').classList.toggle('on',cfg().bm.some(b=>b.u===t.url));drawTabs();$('.tbar span',w.el).textContent=lab(t)+' — Spot The Web'}
 function addTab(raw){const t={id:'s'+w.id+'_'+tseq++,h:[],hi:-1,url:'',kind:'stw',v:H('div','stw-v',views),urls:[],cache:new Map(),w};TABS.set(t.id,t);tabs.push(t);activate(t);go(t,raw);return t}
 function activate(t){cur=t;tabs.forEach(x=>x.v.classList.toggle('on',x===t));ui();if(DV.open)draw();if(!t.url)om.focus()}
 function closeTab(t){stopPick(t);if(t.url&&t.url!=='browse.stw'){closed.push(t.url);closed.length>20&&closed.shift()}clean(t);t.v.remove();TABS.delete(t.id);const i=tabs.indexOf(t);tabs.splice(i,1);if(!tabs.length)return closeW(w);if(cur===t)activate(tabs[Math.min(i,tabs.length-1)]);else ui()}
 function clean(t){clearTimeout(t.to);t.urls.forEach(u=>URL.revokeObjectURL(u));t.urls=[];t.cache.clear();t.f=null;t.loading=0}

 async function save(name,blob){const home=FS.home(),dd=FS.K.get(home)&&FS.K.get(home).get('downloads');const m=await FS.write(dd||home,name,blob);RZ.toast('Saved to '+(dd?'Downloads':'your files')+': '+m.n);return m}
 async function download(t,url){RZ.toast('Downloading…');try{const r=await fetch(url);if(!r.ok)throw 0;const b=await r.blob();await save(decodeURIComponent(new URL(url).pathname.split('/').pop())||'download',b)}catch{blockedPage(t,url,'dl')}}

 function go(t,raw,o={}){const c=cfg(),u=normURL(raw,c);
  if(kindOf(u)==='web'&&DL.test((()=>{try{return new URL(u).pathname}catch{return''}})())){download(t,u);return}
  if(!o.np){t.h=t.h.slice(0,t.hi+1);if(t.h[t.hi]!==u){t.h.push(u);t.hi=t.h.length-1}}
  t.url=u;t.kind=kindOf(u);t.force=o.force;t.title='';show(t)}
 function jump(t,d){const i=t.hi+d;if(i<0||i>=t.h.length)return;t.hi=i;t.url=t.h[i];t.kind=kindOf(t.url);t.title='';t.force=0;show(t)}
 function show(t){clean(t);t.v.innerHTML='';t.v.scrollTop=0;t.tok=(t.tok||0)+1;t.loads=0;t.stale=0;t.logs=[{lv:'sys',a:['Navigated to '+t.url]}];t.net=[];if(t.pk)t.pk();ovOff();if(DV.open&&t===cur&&DV.tab!=='source')draw();
  if(t.kind==='stw')internal(t);else if(t.kind==='file')loadFile(t);else loadWeb(t);ui()}
 function done(t,title){t.loading=0;clearTimeout(t.to);if(title)t.title=title;hist(t.url,t.title);ui();if(DV.open&&t===cur&&(DV.tab==='elements'||DV.tab==='source'))draw()}

 /* ---------------- web ---------------- */
 function loadWeb(t){const c=cfg(),u=t.url,host=hostOf(u);
  if(!host)return blockedPage(t,u,'bad');
  if(!t.force&&isBlocked(host,c,u))return blockedPage(t,u,'known');
  const f=document.createElement('iframe');f.className='stw-fr';
  f.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-modals allow-pointer-lock allow-presentation allow-orientation-lock'+(c.popups&&Apps.can('net.popups','spotweb')?' allow-popups allow-popups-to-escape-sandbox':'')+(c.downloads&&Apps.can('net.downloads','spotweb')?' allow-downloads':''));
  f.setAttribute('allow',ALLOW());f.referrerPolicy='strict-origin-when-cross-origin';
  t.f=f;t.loading=1;f.onload=()=>{t.loads=(t.loads||0)+1;if(t.loads>1){let nu=null;try{nu=f.contentWindow.location.href}catch{}if(nu&&nu!=='about:blank'&&nu!==t.url){t.url=nu;t.h[t.hi]=nu;t.stale=0}else t.stale=1}done(t,t.title||host)};t.v.append(f);f.src=u;
  t.to=setTimeout(()=>{if(!t.loading||t.f!==f)return;const b=H('div','stw-banner',t.v,'<span>This is taking a while — the site may not allow being shown here.</span>');
   [['Show blocked page',()=>blockedPage(t,u,'known',1)],['Open in a real tab',()=>window.open(u,'_blank','noopener')],['Keep waiting',()=>b.remove()]].forEach(([l,fn])=>H('button','',b,l).onclick=fn)},8000)}
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
   const sel=H('select');[[SDEF.engine,'Google (recommended)'],['https://en.wikipedia.org/w/index.php?search=%s','Wikipedia'],['https://www.bing.com/search?q=%s','Bing (may not show here)'],['https://search.brave.com/search?q=%s','Brave Search (may not show here)'],['https://duckduckgo.com/?q=%s','DuckDuckGo (blocks being shown here)']].forEach(([v,l])=>H('option','',sel,l).value=v);sel.value=c.engine;sel.onchange=()=>{const x=cfg();x.engine=sel.value;sput(x)};R('Search engine','Used when you type something that isn’t an address. Some engines refuse to be framed.',sel);
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
  const sc=doc.createElement('script');sc.setAttribute('data-stw','1');sc.textContent='('+stwShim.toString()+')('+JSON.stringify({tab:t.id,dir:dp,file:m.n,ls,emo:window.RZEmoji&&RZEmoji.shim()}).replace(/</g,'\\u003c')+',('+domSer.toString()+'))';
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
   case'focus':focusW(w);typeof closeCtx==='function'&&closeCtx();break;
   case'log':pushLog(t,{lv:m.lv,a:m.a});break;
   case'clr':t.logs=[];if(t===cur&&DV.open&&DV.tab==='console')draw();break;
   case'net':pushNet(t,m);break;
   case'ctx':{focusW(w);const r=t.f.getBoundingClientRect();ctx({clientX:r.left+m.x,clientY:r.top+m.y},pageItems(t,m));break}
   case'key':w.stwKey({key:m.key,ctrlKey:m.ctrl,metaKey:m.meta,shiftKey:m.shift,altKey:m.alt,preventDefault(){}});break;
   case'qr':{const p=t.pq&&t.pq.get(m.id);if(p){t.pq.delete(m.id);m.err?p[1](new Error(m.err)):p[0](m.res)}break}
   case'picked':t.onPicked&&t.onPicked(m.path);break;
   case'close':closeTab(t);break;
   case'fs':{if(m.on){maxPrev=w.max;if(!w.max)toggleMax(w)}else if(!maxPrev&&w.max)toggleMax(w);break}
   case'save':await save(String(m.name||'download').replace(/[\\/]/g,'_'),new Blob([m.buf],{type:m.type||''}));break;
   case'ls':try{localStorage.setItem('stwls.'+S.cur+'.'+FS.path(FS.resolve(t.url?fpath(t.url):'/')),JSON.stringify(m.data))}catch{}break;
   case'pick':{const d=FS.home();fileDialog(w,{title:'Choose a file to upload',dir:d},async r=>{const f=FS.get(r.id);if(!f)return rep([]);const b=await FS.blob(f.id);const buf=await b.arrayBuffer();rep([{name:f.n,type:typeOf(f.n),buf}],null,[buf])});break}
  }}catch(x){rep(null,String(x&&x.message||x))}};

 /* ---------------- chrome ---------------- */
 /* ---------------- keyboard shortcuts ---------------- */
 const closed=[];
 const typing=e=>{e.stopPropagation();return !!((e.ctrlKey||e.metaKey||e.altKey||/^F\d+$/.test(e.key))&&w.stwKey(e))};
 function reload(t){if(t.loading){if(t.f)t.f.src='about:blank';clean(t);ui()}else show(t)}
 function toggleBm(t){const c=cfg(),i=c.bm.findIndex(x=>x.u===t.url);if(i>-1)c.bm.splice(i,1);else c.bm.push({n:lab(t).slice(0,24),u:t.url});sput(c);ui()}
 function nextTab(d){const i=tabs.indexOf(cur);activate(tabs[(i+d+tabs.length)%tabs.length])}
 w.stwKey=e=>{if(!cur)return false;const c=e.ctrlKey||e.metaKey,s=e.shiftKey,a=e.altKey,k=e.key.length===1?e.key.toLowerCase():e.key;let r=true;
  if(a&&!c&&k==='t'||c&&!s&&!a&&k==='t')addTab('browse.stw');
  else if(c&&s&&k==='t'){const u=closed.pop();u?addTab(u):RZ.toast('No recently closed tabs')}
  else if(a&&!c&&k==='w'||c&&!a&&k==='w'||c&&k==='F4')closeTab(cur);
  else if(c&&k==='Tab')nextTab(s?-1:1);
  else if(c&&k==='PageDown')nextTab(1);else if(c&&k==='PageUp')nextTab(-1);
  else if(c&&!a&&/^[1-9]$/.test(k)){const t=tabs[k==='9'?tabs.length-1:+k-1];t&&activate(t)}
  else if(c&&k==='l'||a&&!c&&k==='d'||k==='F6'){om.focus();om.select()}
  else if(c&&!a&&k==='r'||k==='F5')reload(cur);
  else if(a&&k==='ArrowLeft')jump(cur,-1);else if(a&&k==='ArrowRight')jump(cur,1);
  else if(c&&!a&&k==='d')toggleBm(cur);
  else if(c&&!a&&k==='h')addTab('history.stw');
  else if(c&&!a&&!s&&k==='s')savePage(cur);
  else if(c&&!a&&k==='u')openDev('source');
  else if(k==='F12'||c&&s&&(k==='i'||k==='j'))toggleDev();
  else r=false;
  if(r)e.preventDefault();return r};

 /* ---------------- save things into the OS file system ---------------- */
 const dlDir=()=>{const h=FS.home(),d=FS.K.get(h)&&FS.K.get(h).get('downloads');return d||h};
 function saveBlob(name,blob){if(!Apps.need('fs','spotweb'))return;
  fileDialog(w,{title:'Save As',save:true,name,dir:dlDir()},async r=>{try{const ex=FS.K.get(r.dir).get(r.name.toLowerCase());
   if(ex&&!await sysConfirm({title:'Replace file?',msg:r.name+' already exists here.',ok:'Replace'}))return;
   const f=ex?await FS.write(null,null,blob,ex,0,'spotweb:'+w.id):await FS.write(r.dir,r.name,blob,null,0,'spotweb:'+w.id);
   W.forEach(x=>x.fmRefresh&&x.fmRefresh());RZ.toast('Saved '+f.n)}catch(x){RZ.toast(x.message||String(x))}})}
 const EXTOF={'image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/webp':'webp','image/svg+xml':'svg','image/avif':'avif','video/mp4':'mp4','video/webm':'webm','audio/mpeg':'mp3','audio/ogg':'ogg','audio/wav':'wav'};
 const idOf=(t,u)=>{for(const[k,v]of t.cache)if(v===u)return k};
 const srcUrl=(t,s)=>{if(/^blob:/.test(s)){const id=idOf(t,s);return id?'file://'+encodeURI(FS.path(id)):null}return/^https?:/.test(s)?s:null};
 const nameFor=(s,b,id)=>{if(id&&FS.get(id))return FS.get(id).n;let n='';if(!/^(data|blob):/.test(s))try{n=decodeURIComponent(new URL(s).pathname.split('/').pop())}catch{}n=n.replace(/[\\/:*?"<>|]/g,'_')||'file';if(!/\.[a-z0-9]{2,5}$/i.test(n)&&EXTOF[b.type])n+='.'+EXTOF[b.type];return n.slice(0,100)};
 const noRead='The site does not let other pages read this file, so it cannot be saved from here. Try "Open in new tab" instead.';
 async function saveMedia(t,src){try{const id=/^blob:/.test(src)&&idOf(t,src);let b;if(id)b=await FS.blob(id);else{const r=await fetch(src);if(!r.ok)throw 0;b=await r.blob()}saveBlob(nameFor(src,b,id),b)}catch{RZ.toast(noRead)}}
 async function saveUrl(t,u){try{if(kindOf(u)==='file'){const id=FS.resolve(fpath(u)),m=id&&FS.get(id);if(!m||m.t!=='f')throw 0;return saveBlob(m.n,await FS.blob(id))}const r=await fetch(u);if(!r.ok)throw 0;const b=await r.blob();saveBlob(nameFor(u,b),b)}catch{RZ.toast(noRead)}}
 async function savePage(t){if(!t)return;try{
  if(t.kind==='file'){const id=FS.resolve(fpath(t.url)),m=id&&FS.get(id);if(!m||m.t!=='f')return RZ.toast('Only files can be saved');return saveBlob(m.n,await FS.blob(id))}
  if(t.kind==='stw')return saveBlob((lab(t).replace(/[\\/:*?"<>|]/g,'_')||'page')+'.html',new Blob(['<!doctype html><meta charset=utf-8><title>'+escH(lab(t))+'</title>'+t.v.innerHTML],{type:'text/html'}));
  const r=await fetch(t.url);if(!r.ok)throw 0;let h=await r.text();h=h.replace(/<head[^>]*>/i,'$&<base href="'+t.url.replace(/"/g,'')+'">');saveBlob((hostOf(t.url)||'page')+'.html',new Blob([h],{type:'text/html'}))
 }catch{RZ.toast('This site does not let other pages read it, so Spot The Web cannot save it.')}}

 /* ---------------- page context menu ---------------- */
 const copy=s=>{if(!Apps.need('clipboard','spotweb'))return;(navigator.clipboard?navigator.clipboard.writeText(s):Promise.reject()).then(()=>RZ.toast('Copied'),()=>{const a=document.createElement('textarea');a.value=s;document.body.append(a);a.select();try{document.execCommand('copy');RZ.toast('Copied')}catch{}a.remove()})};
 const isNav=u=>/^(https?:|file:|[\w.-]+\.stw)/i.test(u||'')?0:'dis';
 const cmd=(t,c)=>{if(t.kind==='file'&&t.f)Q(t,'cmd',{c}).catch(()=>{});else document.execCommand(c)};
 function pageItems(t,d){const it=[],sep=()=>{it.length&&it[it.length-1]!=='sep'&&it.push('sep')};
  if(d.link){it.push(['Open link',()=>go(t,d.link),isNav(d.link)],['Open link in new tab',()=>addTab(d.link),isNav(d.link)],['Copy link address',()=>copy(d.link)],['Save link as...',()=>saveUrl(t,d.link),isNav(d.link)]);sep()}
  if(d.img&&d.img.src){const nu=srcUrl(t,d.img.src),k=d.img.k==='img'?'image':d.img.k;it.push(['Open '+k+' in new tab',()=>addTab(nu),nu?0:'dis'],['Save '+k+' as...',()=>saveMedia(t,d.img.src)],['Copy '+k+' address',()=>copy(nu),nu?0:'dis']);sep()}
  if(d.edit){it.push(['Cut',()=>cmd(t,'cut')],['Copy',()=>cmd(t,'copy')],['Select all',()=>cmd(t,'selectAll')]);sep()}
  else if(d.sel){it.push(['Copy',()=>cmd(t,'copy')],['Search for "'+d.sel.slice(0,22).trim()+(d.sel.length>22?'...':'')+'"',()=>addTab(d.sel)]);sep()}
  it.push(['Back',()=>jump(t,-1),t.hi>0?0:'dis'],['Forward',()=>jump(t,1),t.hi<t.h.length-1?0:'dis'],['Reload',()=>reload(t)],'sep',['Save page as...',()=>savePage(t)],['View page source',()=>openDev('source')],['Inspect',()=>inspectAt(t,d.path||[])]);return it}
 const pathIn=(root,n)=>{const p=[];while(n&&n!==root){const par=n.parentNode;if(!par)return[];p.unshift([].indexOf.call(par.childNodes,n));n=par}return n===root?p:[]};
 w.stwCtx=e=>{const tg=e.target,t=cur;if(!t)return null;
  const te=tg.closest('.stw-tab');if(te&&te._t){const tt=te._t;return[['New tab',()=>addTab('browse.stw')],['Reload',()=>reload(tt)],['Duplicate',()=>addTab(tt.url)],'sep',['Close tab',()=>closeTab(tt)],['Close other tabs',()=>tabs.filter(x=>x!==tt).forEach(closeTab)],['Reopen closed tab',()=>{const u=closed.pop();u&&addTab(u)},closed.length?0:'dis']]}
  if(tg===om)return[['Cut',()=>{om.focus();document.execCommand('cut')}],['Copy',()=>{om.focus();document.execCommand('copy')}],['Paste',async()=>{try{const x=await navigator.clipboard.readText();om.focus();document.execCommand('insertText',false,x)}catch{RZ.toast('Clipboard access denied')}}],['Select all',()=>{om.focus();om.select()}]];
  if(tg.closest('.stw-dev'))return[['Copy',()=>document.execCommand('copy')],['Select all',()=>document.execCommand('selectAll')],'sep',['Close developer tools',closeDev]];
  if(tg.closest('.stw-v')){const root=t.v.firstElementChild,m=tg.closest('img,video,audio'),sel=String(getSelection()||'').slice(0,500);
   return pageItems(t,{path:root?pathIn(root,tg):[],sel,img:m&&m.currentSrc?{k:m.tagName.toLowerCase(),src:m.currentSrc}:null,edit:!!tg.closest('input,textarea')})}
  return null};

 /* ---------------- developer sidebar (Console / Elements / Network / Source) ---------------- */
 const main=q('.stw-main'),dev=q('.stw-dev'),rs=q('.stw-rs');
 const DV=Object.assign({open:false,tab:'console',w:380},cfg().dev||{});
 const dvSave=()=>{const c=cfg();c.dev={open:DV.open,tab:DV.tab,w:DV.w};sput(c)};
 const escH=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const capOf=t=>t.kind==='web'?{dom:0,js:0,why:'This site comes from another origin, so the browser does not let Spot The Web look inside it. Console, elements and network are available for pages from your files (file:///) and .stw pages. Source may still work if the site allows it.'}:t.kind==='file'&&t.f?{dom:1,js:1}:{dom:1,js:0,why:'Internal pages and files have no JavaScript console.'};
 let liveLog=null,liveNet=null,qn=0,ov=null;
 function devUI(){main.classList.toggle('dev',DV.open);dev.style.setProperty('--dw',DV.w+'px');if(DV.open)draw()}
 function openDev(tab){DV.open=true;if(tab)DV.tab=tab;dvSave();devUI()}
 function closeDev(){DV.open=false;dvSave();if(cur)stopPick(cur);devUI()}
 const toggleDev=()=>DV.open?closeDev():openDev();
 function inspectAt(t,path){t.pend=path;openDev('elements')}
 rs.onpointerdown=e=>{rs.setPointerCapture(e.pointerId);main.classList.add('rsz');rs.classList.add('on');const sx=e.clientX,sw=DV.w;
  rs.onpointermove=ev=>{DV.w=Math.round(Math.max(240,Math.min(main.clientWidth*.75,sw+(sx-ev.clientX))));dev.style.setProperty('--dw',DV.w+'px')};
  rs.onpointerup=()=>{rs.onpointermove=rs.onpointerup=null;main.classList.remove('rsz');rs.classList.remove('on');dvSave()}};
 /* talk to the page: frames via postMessage, internal pages directly */
 const ovOff=()=>{ov&&(ov.style.display='none')};
 const nodeAt=(root,p)=>{let n=root;for(let i=0;i<p.length&&n;i++)n=n.childNodes[p[i]];return n};
 function Q(t,type,data){data=data||{};
  if(t.kind==='web')return Promise.reject(new Error('Not available for this site'));
  if(t.kind==='file'&&t.f)return new Promise((res,rej)=>{const id=++qn;(t.pq||(t.pq=new Map())).set(id,[res,rej]);try{t.f.contentWindow.postMessage(Object.assign({stwq:1,id,t:type},data),'*')}catch(x){t.pq.delete(id);return rej(x)}setTimeout(()=>{if(t.pq.delete(id))rej(new Error('The page did not respond'))},4000)});
  return localQ(t,type,data)}
 async function localQ(t,type,d){const root=t.v.firstElementChild;if(!root)return null;
  if(type==='dom')return domSer(root,d.path||[],d.depth||1);
  if(type==='hl'||type==='sel'){let n=d.path&&nodeAt(root,d.path);if(n&&n.nodeType===3)n=n.parentNode;
   if(type==='hl'){if(!ov)ov=H('div','stw-hl',views);if(!n||n.nodeType!==1||n===root){ov.style.display='none';return 1}const r=n.getBoundingClientRect(),v=views.getBoundingClientRect();Object.assign(ov.style,{display:'block',left:r.left-v.left+'px',top:r.top-v.top+'px',width:r.width+'px',height:r.height+'px'});return 1}
   if(!n||n.nodeType!==1)return null;const r=n.getBoundingClientRect(),cs=getComputedStyle(n),o={};['display','position','color','background-color','font','margin','padding','z-index'].forEach(k=>o[k]=cs.getPropertyValue(k));return{w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,x:Math.round(r.left),y:Math.round(r.top),css:o}}
  if(type==='pick'){if(t.pk)t.pk();if(!d.on)return 1;const mv=e=>localQ(t,'hl',{path:pathIn(root,e.target)}),ck=e=>{e.preventDefault();e.stopPropagation();const p=pathIn(root,e.target);t.pk();t.onPicked&&t.onPicked(p)};
   t.v.addEventListener('mousemove',mv,true);t.v.addEventListener('click',ck,true);t.pk=()=>{t.v.removeEventListener('mousemove',mv,true);t.v.removeEventListener('click',ck,true);ovOff();t.pk=null};return 1}
  if(type==='cmd'){document.execCommand(d.c);return 1}
  throw new Error('Not available here')}
 function stopPick(t){if(t.pk)t.pk();if(t.kind==='file'&&t.f)Q(t,'pick',{on:0}).catch(()=>{});ovOff()}
 function pushLog(t,r){(t.logs||(t.logs=[])).push(r);if(t.logs.length>500)t.logs.shift();if(t===cur&&liveLog&&liveLog.isConnected)liveLog._add(r)}
 function pushNet(t,m){(t.net||(t.net=[])).push({m:m.m,u:m.u,s:m.s,ms:m.ms,ty:m.ty});if(t.net.length>300)t.net.shift();if(t===cur&&liveNet&&liveNet.isConnected)liveNet._add(t.net[t.net.length-1])}
 function draw(){const t=cur;dev.innerHTML='';liveLog=liveNet=null;if(!t)return;
  const h=H('div','dv-h',dev);[['console','Console'],['elements','Elements'],['network','Network'],['source','Source']].forEach(([k,l])=>{const b=H('button',DV.tab===k?'on':'',h,l);b.onclick=()=>{DV.tab=k;dvSave();draw()}});
  H('span','sp',h);const x=H('button','dvx',h,I.x);x.title='Close (F12)';x.onclick=closeDev;
  const body=H('div','dv-b',dev);({console:pConsole,elements:pElements,network:pNet,source:pSource})[DV.tab](t,body)}
 function pConsole(t,body){const cap=capOf(t),tool=H('div','dv-tool',body),cl=H('button','',tool,'Clear'),sel=H('select','',tool),fi=H('input','',tool);
  [['all','All levels'],['error','Errors'],['warn','Warnings'],['info','Info'],['log','Logs']].forEach(([v,l])=>H('option','',sel,l).value=v);fi.placeholder='Filter';fi.onkeydown=typing;
  if(cap.why)H('div','dv-note',body,cap.why);
  const box=H('div','dv-log',body),okRow=r=>(sel.value==='all'||r.lv===sel.value)&&(!fi.value||r.a.join(' ').toLowerCase().includes(fi.value.toLowerCase()));
  const row=r=>{const d=H('div','dv-r '+(r.lv||''),box);d.textContent=r.a.join(' ')};
  const paint=()=>{box.innerHTML='';(t.logs||[]).forEach(r=>okRow(r)&&row(r));box.scrollTop=box.scrollHeight};
  box._add=r=>{if(okRow(r)){row(r);box.scrollTop=box.scrollHeight}};liveLog=box;sel.onchange=fi.oninput=paint;cl.onclick=()=>{t.logs=[];paint()};paint();
  const ci=H('div','dv-ci',body,'<span>&gt;</span><input spellcheck=false autocomplete=off>'),inp=$('input',ci);inp.placeholder=cap.js?'Run JavaScript in this page':'Console input unavailable';inp.disabled=!cap.js;
  t.ch=t.ch||[];let hi=t.ch.length;
  inp.onkeydown=async e=>{if(typing(e))return;
   if(e.key==='Enter'&&inp.value.trim()){const code=inp.value;t.ch.push(code);hi=t.ch.length;inp.value='';pushLog(t,{lv:'in',a:['> '+code]});try{const r=await Q(t,'eval',{code});pushLog(t,{lv:'out',a:['< '+r.s]})}catch(x){pushLog(t,{lv:'error',a:[String(x.message||x)]})}}
   else if(e.key==='ArrowUp'&&hi>0){inp.value=t.ch[--hi];e.preventDefault()}
   else if(e.key==='ArrowDown'){hi=Math.min(t.ch.length,hi+1);inp.value=t.ch[hi]||'';e.preventDefault()}};
  if(cap.js)setTimeout(()=>inp.focus(),0)}
 function pNet(t,body){const tool=H('div','dv-tool',body),cl=H('button','',tool,'Clear');H('span','dv-hint',tool,'Requests made by the page (fetch / XHR)');
  const cap=capOf(t);if(!cap.js)H('div','dv-note',body,cap.why);
  const box=H('div','dv-net',body),row=n=>{const r=H('div','dv-nr'+(n.s>=400||!n.s?' bad':''),box,'<b></b><i></i><span></span><em></em>');r.title=n.u;$('b',r).textContent=n.s||'ERR';$('i',r).textContent=n.m;$('span',r).textContent=n.u.split('?')[0].split('/').filter(Boolean).pop()||n.u;$('em',r).textContent=n.ms+' ms'};
  const paint=()=>{box.innerHTML='';(t.net||[]).forEach(row);if(cap.js&&!(t.net||[]).length)H('div','dv-note',box,'No requests yet.')};box._add=n=>{const nt=box.querySelector('.dv-note');nt&&nt.remove();row(n)};liveNet=box;cl.onclick=()=>{t.net=[];paint()};paint()}
 async function srcOf(t){if(t.kind==='file'){const id=FS.resolve(fpath(t.url)),m=id&&FS.get(id);if(!m||m.t!=='f')throw new Error('No source for folders');const b=await FS.blob(id);if(b.size>2e6)throw new Error('File is too large to show');const tx=await b.text();if(/\0/.test(tx.slice(0,2000)))throw new Error('Binary file');return tx}
  if(t.kind==='stw')return t.v.innerHTML;try{const r=await fetch(t.url);if(!r.ok)throw 0;return await r.text()}catch{throw new Error('This site does not let other pages read its source.')}}
 async function pSource(t,body){const tool=H('div','dv-tool',body),cp=H('button','',tool,'Copy'),sv=H('button','',tool,'Save as...'),pre=H('pre','dv-src',body,'Loading...');let tx='';
  cp.onclick=()=>tx&&copy(tx);sv.onclick=()=>tx&&saveBlob((t.kind==='file'?(FS.get(FS.resolve(fpath(t.url)))||{}).n:'source')+(t.kind==='file'?'':'.html'),new Blob([tx],{type:'text/plain'}));
  try{tx=await srcOf(t);pre.textContent=tx.length>4e5?tx.slice(0,4e5)+'\n... (truncated)':tx}catch(x){pre.className='dv-note';pre.textContent=x.message}}
 function pElements(t,body){const cap=capOf(t);if(!cap.dom){H('div','dv-note',body,cap.why);return}
  const tool=H('div','dv-tool',body),pk=H('button','',tool,'Pick element'),rf=H('button','',tool,'Refresh'),tree=H('div','dv-tree',body),det=H('div','dv-det',body,'<div class=dv-hint>Select an element to see its details.</div>');
  let root=null,selN=null;const open=new Set([''] ),key=n=>n.p.join(','),attr=(n,k)=>{const a=n.a.find(x=>x[0]===k);return a?a[1]:''};
  const hlNode=n=>Q(t,'hl',{path:n?n.p:null}).catch(()=>{});
  const tg=s=>'<span class=tg>'+s+'</span>';
  const wire=(r,n)=>{r.onclick=()=>select(n);r.onmouseenter=()=>hlNode(n);r.onmouseleave=()=>hlNode(selN)};
  const add=(n,dep)=>{
   if(n.t!==1){const r=H('div','dv-n '+(n.t===8?'cm':'tx'),tree);r.style.paddingLeft=(dep*12+14)+'px';r.textContent=n.t===8?'<!-- '+n.x.trim()+' -->':n.x.trim();wire(r,n);return}
   const isOpen=open.has(key(n))&&n.k>0&&n.c,r=H('div','dv-n'+(selN&&key(selN)===key(n)?' sel':''),tree);r.style.paddingLeft=dep*12+'px';
   const ar=H('span','dv-ar',r,n.k?(isOpen?'v':'>'):'');
   r.insertAdjacentHTML('beforeend',tg('&lt;'+n.n)+n.a.map(([k,v])=>' <span class=an>'+escH(k)+'</span>=<span class=av>"'+escH(v)+'"</span>').join('')+tg('&gt;')+(!isOpen&&n.k?' ... '+tg('&lt;/'+n.n+'&gt;'):''));
   ar.onclick=async e=>{e.stopPropagation();if(!n.k)return;if(open.has(key(n)))open.delete(key(n));else{open.add(key(n));if(!n.c)await load(n)}render()};wire(r,n);
   if(isOpen){n.c.forEach(c=>add(c,dep+1));const e=H('div','dv-n',tree,tg('&lt;/'+n.n+'&gt;'));e.style.paddingLeft=dep*12+12+'px'}};
  const render=()=>{const st=tree.scrollTop;tree.innerHTML='';if(root)add(root,0);else H('div','dv-note',tree,'Nothing to show yet.');tree.scrollTop=st};
  async function load(n){try{const r=await Q(t,'dom',{path:n.p,depth:1});n.c=r&&r.c||[]}catch{n.c=[]}}
  async function refresh(){try{root=await Q(t,'dom',{path:[],depth:3});open.add('');const b=root&&root.c&&root.c.find(x=>x.n==='body');b&&open.add(key(b))}catch(x){root=null}render()}
  async function showDet(n){det.innerHTML='';if(!n)return;if(n.t!==1){H('div','dv-n tx',det).textContent=n.x||'';return}
   H('h4','',det).textContent=n.n+(attr(n,'id')?'#'+attr(n,'id'):'')+(attr(n,'class')?'.'+attr(n,'class').trim().split(/\s+/).join('.'):'');
   const tb=H('table','dv-t',det);n.a.forEach(([k,v])=>{const r=H('tr','',tb,'<td></td><td></td>');r.cells[0].textContent=k;r.cells[1].textContent=v});
   try{const s=await Q(t,'sel',{path:n.p});if(s&&selN===n){H('h4','',det).textContent=s.w+' x '+s.h+' px  at '+s.x+', '+s.y;const t2=H('table','dv-t',det);Object.entries(s.css).forEach(([k,v])=>{const r=H('tr','',t2,'<td></td><td></td>');r.cells[0].textContent=k;r.cells[1].textContent=v})}}catch{}}
  function select(n){selN=n;render();showDet(n);hlNode(n)}
  async function reveal(path){if(!root)await refresh();if(!root)return;let n=root;for(const idx of path){open.add(key(n));if(!n.c)await load(n);const c=n.c.find(x=>x.p[x.p.length-1]===idx);if(!c)break;n=c}select(n);const s=tree.querySelector('.sel');s&&s.scrollIntoView({block:'center'})}
  t.onPicked=p=>{pk.classList.remove('on');if(p)reveal(p)};
  pk.onclick=()=>{const on=!pk.classList.contains('on');pk.classList.toggle('on',on);Q(t,'pick',{on}).catch(()=>pk.classList.remove('on'))};
  rf.onclick=refresh;refresh().then(()=>{if(t.pend){const p=t.pend;t.pend=null;reveal(p)}})}
 devUI();
 let menu=null;const closeMenu=()=>{menu&&menu.remove();menu=null};
 q('.stw-bar').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||!cur)return;const a=b.dataset.a,t=cur;closeMenu();
  if(a==='bk')jump(t,-1);else if(a==='fw')jump(t,1);else if(a==='hm')go(t,'browse.stw');
  else if(a==='rl')reload(t);
  else if(a==='st')toggleBm(t);
  else if(a==='dv')toggleDev();
  else if(a==='mn'){e.stopPropagation();const items=[['New tab',()=>addTab('browse.stw')],['History',()=>go(t,'history.stw')],['Settings',()=>go(t,'settings.stw')],'-',['Save page as...  Ctrl+S',()=>savePage(t)],['Developer tools  F12',()=>toggleDev()],['View page source  Ctrl+U',()=>openDev('source')],'-',[w.max?'Restore window size':'Maximize window',()=>toggleMax(w)],...(t.kind==='web'?[['Page not showing? Mark as blocked',()=>blockedPage(t,t.url,'known',1)],['Open in a real tab',()=>window.open(t.url,'_blank','noopener')]]:[]),'-',['About Spot The Web',()=>go(t,'about.stw')]];
   menu=H('div','stw-menu',q('.stw-bar'));items.forEach(it=>{if(it==='-')return H('hr','',menu);const x=H('button','',menu);x.textContent=it[0];x.onclick=()=>{closeMenu();it[1]()}})}});
 addEventListener('pointerdown',e=>{if(menu&&!e.target.closest('.stw-menu,[data-a=mn]'))closeMenu()},true);
 om.onkeydown=e=>{if(typing(e))return;if(e.key==='Enter'&&cur){go(cur,om.value);om.blur()}else if(e.key==='Escape'){om.blur();ui()}};om.onfocus=()=>om.select();om.onblur=ui;
 w.onclose=(oc=>()=>{tabs.forEach(stopPick);tabs.slice().forEach(clean);tabs.forEach(t=>TABS.delete(t.id));oc&&oc()})(w.onclose);
 new ResizeObserver(()=>cur&&drawTabs()).observe(tabsEl);
 FS.ready.then(()=>addTab(w.tab&&typeof w.tab==='string'?w.tab:'browse.stw'));
}
addEventListener('message',e=>{const m=e.data;if(!m||!m.stw)return;const t=TABS.get(m.tab);t&&t.w.stwMsg&&t.w.stwMsg(e)});
Apps.register('spotweb',{name:'Spot The Web',icon:'browser',w:1000,h:640,cat:'internet',perms:['net.frames','net.popups','net.downloads','clipboard','media','location','fs'],render:renderSpot,ctx:(e,w)=>w.stwCtx?w.stwCtx(e):null,onKey:(e,w)=>w.stwKey&&w.stwKey(e)});
})();
