'use strict';
/* apps/keys.js — every global keyboard shortcut in one place.
   Ctrl+Alt+Space ... Start      Ctrl+Alt+T ... Terminal    Ctrl+Alt+F ... My Files
   Ctrl+Alt+S ....... Settings   Ctrl+Alt+L ... Lock        Ctrl+Alt+V ... Clipboard history
   Tapping the Super key on its own also opens Start (no Super+key combos).
   Keys used by the clipboard panel itself (arrows, Enter, Delete, Esc) stay in apps/clipboard.js. */
(()=>{
const MAC=/Mac|iPhone|iPad/.test(navigator.platform||'');
const on=k=>S[k]!==false;
const unlocked=()=>{const l=document.getElementById('lock');return !l||l.classList.contains('hide')};
const startToggle=()=>(window.toggleStartX||toggleStart0)();
const eat=e=>{e.preventDefault();e.stopImmediatePropagation()};

/* Ctrl+Alt+<key>; matched by physical key so keyboard layout does not matter */
const CA={Space:startToggle,KeyT:()=>openApp('terminal'),KeyF:()=>openApp('files'),KeyS:()=>openApp('settings'),KeyL:()=>lockNow(),KeyV:()=>window.Clip&&Clip.open()};

let md=false,combo=false;
addEventListener('keydown',e=>{if(!unlocked())return;
 if(e.ctrlKey&&e.altKey&&!e.shiftKey&&!e.metaKey){const fn=CA[e.code];if(fn){eat(e);fn();return}}
 if(MAC||!on('superKey'))return;
 if(e.key==='Meta'){if(!e.repeat){md=true;combo=false}return}
 if(md||e.metaKey)combo=true},true);
/* a lone Super tap opens Start */
addEventListener('keyup',e=>{if(e.key!=='Meta')return;const tap=md&&!combo;md=false;combo=false;if(tap&&!MAC&&on('superKey')&&unlocked())startToggle()},true);
addEventListener('pointerdown',()=>{if(md)combo=true},true);
addEventListener('blur',()=>{md=false;combo=false});

/* capture the Super key at OS level (Chromium, fullscreen only) */
const kl=()=>{try{if(!navigator.keyboard)return;if(on('superKey')&&document.fullscreenElement)navigator.keyboard.lock(['MetaLeft','MetaRight']);else navigator.keyboard.unlock()}catch{}};
document.addEventListener('fullscreenchange',kl);
window.captureSuper=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();kl();RZ.toast(navigator.keyboard&&navigator.keyboard.lock?'Super key captured while fullscreen':'This browser cannot capture the Super key')}catch{RZ.toast('Could not enter fullscreen')}};
})();
