'use strict';
/* apps/keys.js — every global keyboard shortcut in one place.
   Super tap ............ Start            Super+V / Ctrl+Alt+V .. Clipboard history
   Super+E .............. My Files         Super+I ............... Settings
   Ctrl+Alt+L ........... Lock             Ctrl+Alt+T ............ Terminal
   Ctrl+Alt+Space ....... Start (works everywhere, incl. macOS)
   Keys used by the clipboard panel itself (arrows, Enter, Delete, Esc) stay in apps/clipboard.js. */
(()=>{
const MAC=/Mac|iPhone|iPad/.test(navigator.platform||'');
const on=k=>S[k]!==false;
const unlocked=()=>{const l=document.getElementById('lock');return !l||l.classList.contains('hide')};
const startToggle=()=>(window.toggleStartX||toggleStart0)();
const eat=e=>{e.preventDefault();e.stopImmediatePropagation()};
const clip=()=>window.Clip&&Clip.open();

/* shortcuts that work on every platform */
const ANY=[
 [e=>e.ctrlKey&&e.altKey&&!e.shiftKey&&e.code==='KeyV',clip],
 [e=>e.ctrlKey&&e.altKey&&!e.shiftKey&&e.code==='KeyT',()=>openApp('terminal')],
 [e=>e.ctrlKey&&e.altKey&&!e.shiftKey&&e.code==='Space'&&on('superKey'),startToggle],
 [e=>e.ctrlKey&&e.altKey&&!e.shiftKey&&e.code==='KeyL',()=>lockNow()]];
/* Super (Windows) key combos */
const SUPER={KeyV:clip,KeyE:()=>openApp('files'),KeyI:()=>openApp('settings')};

let md=false,combo=false;
addEventListener('keydown',e=>{if(!unlocked())return;
 for(const[t,fn]of ANY)if(t(e)){eat(e);fn();return}
 if(MAC||!on('superKey'))return;
 if(e.key==='Meta'){if(!e.repeat){md=true;combo=false}return}
 if(md||e.metaKey){combo=true;const fn=SUPER[e.code];if(fn){eat(e);fn()}}},true);
addEventListener('keyup',e=>{if(e.key!=='Meta')return;const tap=md&&!combo;md=false;combo=false;if(tap&&!MAC&&on('superKey')&&unlocked())startToggle()},true);
addEventListener('pointerdown',()=>{if(md)combo=true},true);
addEventListener('blur',()=>{md=false;combo=false});

/* capture the Super key at OS level (Chromium, fullscreen only) */
const kl=()=>{try{if(!navigator.keyboard)return;if(on('superKey')&&document.fullscreenElement)navigator.keyboard.lock(['MetaLeft','MetaRight']);else navigator.keyboard.unlock()}catch{}};
document.addEventListener('fullscreenchange',kl);
window.captureSuper=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();kl();RZ.toast(navigator.keyboard&&navigator.keyboard.lock?'Super key captured while fullscreen':'This browser cannot capture the Super key')}catch{RZ.toast('Could not enter fullscreen')}};
})();
