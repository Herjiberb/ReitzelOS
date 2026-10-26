'use strict';
const CACHE_NAME='reitzel-v18';
const FILES=['./','./index.html','./style.css','./os.js','./apps/emoji.js','./apps/base.js','./apps/fs.js','./apps/files.js','./apps/editor.js','./apps/store.js','./apps/shortcuts.js','./apps/openwith.js','./apps/file-scout.js','./apps/xctu.js','./apps/resource-manager.js','./apps/terminal.js','./apps/cloud-export.js','./apps/browser.js','./apps/customize.js','./apps/clipboard.js','./apps/keys.js','./emojis/folder.svg','./emojis/document.svg','./emojis/spider.svg','./emojis/evergreen.svg','./emojis/grinning-face.svg','./emojis/applause.svg','./assets/reitzel-icon.svg','./assets/folder-icon.svg','./assets/compass-settings-icon.svg','./assets/network-icon.svg','./assets/cloud-export-icon.svg','./assets/browser-icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE_NAME).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
if(e.request.method!=='GET')return;
const u=new URL(e.request.url);
if(u.origin!==self.location.origin)return;
if(e.request.mode==='navigate'||/\.(?:html|js|css)$/i.test(u.pathname)){
e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE_NAME).then(k=>k.put(e.request,c));}return r;}).catch(async()=>{const r=await caches.match(e.request);if(r)return r;if(e.request.mode==='navigate')return(await caches.match('./index.html'))||Response.error();return Response.error();}));
return;
}
e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
