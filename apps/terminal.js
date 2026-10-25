'use strict';
/* apps/terminal.js — Terminal */
const TK=(k,t)=>'\u0001'+k+t+'\u0002',TKS=s=>String(s).replace(/\u0001.([^\u0002]*)\u0002/g,'$1'),ESC=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const TKH=s=>ESC(s).replace(/\u0001(.)([^\u0002]*)\u0002/g,'<span class="tk-$1">$2</span>');
const SWAT_JOKES=[u=>`${u} is not in the swatters file. This incident will be reported to Santa.`,u=>`swat: Linus Torvalds has been notified. He is composing a very strongly worded email about ${u}.`,u=>`swat: nice try, ${u}. Even \`rm -rf --no-preserve-root /\` needs an admin badge.`,u=>`swat: access denied. ${u} has been added to the naughty list, right next to the guy who ran chmod -R 777 /.`,u=>`swat: ${u}, with great power comes great responsibility. You have neither. (Ask an admin.)`];
const PRIV=new Set(['reboot','poweroff','shutdown','useradd','userdel']);
const mkl=()=>{const d=document.createElement('div');d.className='tm-l';return d};
function renderTerm(body,w){const P0=prof(),user=P0.root?'root':(P0.name||'user').toLowerCase().replace(/[^a-z0-9_-]+/g,'')||'user';
 const t={cwd:w.tab&&w.tab.cwd&&FS.get(w.tab.cwd)?w.tab.cwd:FS.home(),env:{USER:user,HOME:FS.path(FS.home()),SHELL:'/bin/rzsh',TERM:'reitzel-256',EDITOR:'edit'},alias:{ll:'ls -l',la:'ls -a','..':'cd ..',cls:'clear',nano:'edit',l:'ls -l'},auth:false,last:0,busy:false,abort:false,hi:-1,askr:null,t0:Date.now()};
 const H0=S.thist||(S.thist=[]);
 body.innerHTML='<div class=tm><div class=tm-out><div class=tm-pr><span class=tm-p></span><input class=tin spellcheck=false autocomplete=off autocapitalize=off></div></div></div>';
 const out=$('.tm-out',body),pr=$('.tm-pr',body),pp=$('.tm-p',body),inp=$('.tin',body),tmEl=$('.tm',body);
 const shortPath=()=>{const h=FS.path(FS.home()),p=FS.path(t.cwd);return p===h?'~':p.startsWith(h+'/')?'~'+p.slice(h.length):p};
 const promptHtml=()=>`<span class=tk-u>${ESC(user)}@reitzel</span><span class=tk-m>:</span><span class=tk-p>${ESC(shortPath())}</span><span class=tk-m>$ </span>`;
 const setP=()=>{pp.innerHTML=promptHtml();const ti=$('.tbar span',w.el);if(ti)ti.textContent=user+'@reitzel: '+shortPath()};
 const scroll=()=>{out.scrollTop=out.scrollHeight};
 const emit=(s,cls)=>{s=String(s);if(s.length>250000)s=s.slice(0,250000)+TK('w','\n… output truncated ('+(s.length-250000)+' more characters)');const d=H('div','tm-l'+(cls?' '+cls:''));d.innerHTML=TKH(s);out.insertBefore(d,pr);while(out.children.length>600)out.firstChild.remove();scroll()};
 const e_=s=>emit(TK('e',s));
 const asked=(label,secret)=>new Promise(r=>{t.askr=r;pp.textContent=label;inp.type=secret?'password':'text';pr.style.display='flex';inp.value='';inp.focus()});
 /* path helpers */
 const P2=p=>p.replace(/^~(?=\/|$)/,()=>FS.path(FS.home()));
 const look=p=>{const id=FS.resolve(P2(p),t.cwd);return id?FS.get(id):null};
 const need=p=>{const m=look(p);if(!m)throw Error(`${p}: No such file or directory`);return m};
 const parentOf=p=>{p=P2(p).replace(/\/+$/,'')||'/';const i=p.lastIndexOf('/'),dp=i<0?'.':(p.slice(0,i)||'/'),name=p.slice(i+1),d=look(dp);if(!d||d.t!=='d')throw Error(`${p}: No such directory`);if(!name||name==='.'||name==='..')throw Error(`${p}: invalid name`);return{dir:d,name}};
 const wr=d=>{if(d.ro)throw Error('Permission denied: read-only system location (even swat can’t touch it)')};
 const rel=m=>{const p=FS.path(m.id),c=FS.path(t.cwd);return p===c?'.':p.startsWith(c==='/'?'/':c+'/')?p.slice(c==='/'?1:c.length+1):p};
 const flags=(a,long)=>{const f=new Set(),r=[];let end=false;for(const x of a){if(!end&&x==='--'){end=true;continue}if(!end&&/^-[a-zA-Z]+$/.test(x))[...x.slice(1)].forEach(c=>f.add(c));else if(!end&&/^--[a-z]/.test(x))f.add(x.slice(2));else r.push(x)}return{f,r}};
 const num=(a,def)=>{const i=a.indexOf('-n');if(i>=0&&a[i+1]){const v=+a[i+1];a.splice(i,2);return v}return def};
 const globRe=g=>new RegExp('^'+g.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\?/g,'.')+'$','i');
 const expand=(x)=>{if(x.q||!/[*?]/.test(x.w))return[x.w];const s=x.w,i=s.lastIndexOf('/'),dp=i<0?'.':(s.slice(0,i)||'/'),pat=s.slice(i+1),d=look(dp);if(!d||d.t!=='d')return[s];const re=globRe(pat),l=FS.kids(d.id).filter(m=>re.test(m.n)&&(pat[0]==='.'||m.n[0]!=='.')).map(m=>(i<0?'':s.slice(0,i+1))+m.n).sort();return l.length?l:[s]};
 const readText=async m=>{if(m.t==='d')throw Error(m.n+': Is a directory');const b=await FS.blob(m.id);return b.text()};
 const isBin=async m=>{const b=await FS.blob(m.id),u=new Uint8Array(await b.slice(0,4096).arrayBuffer());return u.includes(0)};
 const hs=n=>n<1024?String(n):n<1048576?(n/1024).toFixed(1)+'K':n<1073741824?(n/1048576).toFixed(1)+'M':(n/1073741824).toFixed(1)+'G';
 const nameTk=m=>m.t==='d'?TK('d',m.n+'/'):/^(zip)$/.test(EXT(m.n))?TK('z',m.n):IMG.has(EXT(m.n))?TK('i',m.n):m.n[0]==='.'?TK('m',m.n):m.n;
 const sortKids=(l,f)=>{const C2=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});l.sort(f.has('S')?(a,b)=>(b.s||0)-(a.s||0):f.has('t')?(a,b)=>b.m-a.m:(a,b)=>C2.compare(a.n,b.n));if(f.has('r'))l.reverse();return l};
 const writeFile=async(p,text,append)=>{const{dir,name}=parentOf(p);wr(dir);const ex=FS.K.get(dir.id).get(name.toLowerCase()),old=ex?FS.get(ex):null;if(old&&old.t==='d')throw Error(p+': Is a directory');if(old&&old.ro)throw Error('Permission denied: '+p);let s=text;if(old&&append)s=(await readText(old))+text;await FS.write(dir.id,name,new Blob([s]),old?old.id:null,0,'term')};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)),tick=async n=>{if(t.abort)throw Error('^C');if(n%4000===0)await sleep(0)};
 const walk=async(id,fn,depth=0)=>{let n=0;const rec=async(d,dp)=>{for(const m of FS.kids(d)){await tick(++n);if(await fn(m,dp)===false)continue;if(m.t==='d')await rec(m.id,dp+1)}};await rec(id,depth)};
 const calc=ex=>{let e=ex.replace(/\bpi\b/gi,'Math.PI').replace(/\^/g,'**').replace(/\b(sqrt|sin|cos|tan|abs|log|log2|log10|floor|ceil|round|min|max|pow|exp)\b/g,'Math.$1').replace(/\bln\b/g,'Math.log');
  if(!/^(?:[\d.\s+\-*\/%(),]|Math\.[A-Za-z0-9]+)+$/.test(e)||[...e.matchAll(/Math\.(\w+)/g)].some(x=>!['PI','sqrt','sin','cos','tan','abs','log','log2','log10','floor','ceil','round','min','max','pow','exp'].includes(x[1])))throw Error('calc: unsupported expression');
  const v=Function('"use strict";return ('+e+')')();if(typeof v!=='number'||!isFinite(v))throw Error('calc: not a number');return String(+v.toPrecision(14))};
 const CMD={},GR={};const def=(n,g,d,u,f)=>{CMD[n]={g,d,u,f}};
 /* ---- navigation & listing ---- */
 def('pwd','Files','Print the current folder','pwd',async()=>FS.path(t.cwd));
 def('cd','Files','Change folder','cd [folder]   (cd - goes back, cd ~ goes home)',async a=>{let p=a[0]||'~';if(p==='-'){p=t.prev?FS.path(t.prev):'~'}const m=need(p);if(m.t!=='d')throw Error(p+': Not a directory');t.prev=t.cwd;t.cwd=m.id;setP();return''});
 def('ls','Files','List folder contents','ls [-lahSRtr1] [path…]   -l long  -a hidden  -S by size  -t by time  -R recursive',async a=>{const{f,r}=flags(a),paths=r.length?r:['.'],lines=[];
  const fmt=l=>f.has('l')?l.map(m=>`${m.t==='d'?'d':'-'}${m.ro?'r-':'rw'} ${hs(m.s||0).padStart(6)}  ${new Date(m.m).toLocaleDateString([],{month:'short',day:'2-digit'})} ${new Date(m.m).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}  ${nameTk(m)}`).join('\n'):f.has('1')?l.map(nameTk).join('\n'):l.map(nameTk).join('  ');
  const list=d=>sortKids(FS.kids(d.id).filter(m=>f.has('a')||m.n[0]!=='.'),f);
  const doDir=(d,hdr,depth)=>{const l=list(d);if(hdr)lines.push(TK('a',rel(d)+':'));lines.push(fmt(l)||TK('m','(empty)'));if(f.has('R')&&depth<6)l.filter(m=>m.t==='d').forEach(x=>{lines.push('');doDir(x,true,depth+1)})};
  paths.forEach((p,i)=>{const m=need(p);if(m.t==='d')doDir(m,paths.length>1||f.has('R'),0);else lines.push(fmt([m]))});return lines.join('\n')});
 def('tree','Files','Show a folder as a tree','tree [-a] [-L depth] [path]',async a=>{const L=num(a,99),{f,r}=flags(a),root=need(r[0]||'.');let nd=0,nf=0;const o=[TK('d',root.t==='d'?(r[0]||'.'):root.n)];
  const rec=(id,pre,dep)=>{const l=sortKids(FS.kids(id).filter(m=>f.has('a')||m.n[0]!=='.'),new Set());l.forEach((m,i)=>{const last=i===l.length-1;o.push(pre+(last?'└── ':'├── ')+nameTk(m));if(m.t==='d'){nd++;if(dep<L)rec(m.id,pre+(last?'    ':'│   '),dep+1)}else nf++})};if(root.t==='d')rec(root.id,'',1);o.push('',`${nd} folders, ${nf} files`);return o.join('\n')});
 def('stat','Files','Show details about a file','stat <path…>',async a=>{if(!a.length)throw Error('stat: missing operand');return a.map(p=>{const m=need(p),[n,sz]=m.t==='d'?FS.count(m.id):[0,m.s];return[`  File: ${m.n}`,`  Type: ${typeOf(m)}${m.ro?'  (protected)':''}`,`  Path: ${FS.path(m.id)}`,`  Size: ${sz} bytes (${hs(sz)})${m.t==='d'?`  ·  ${n} items inside`:''}`,`Modify: ${new Date(m.m).toString().slice(0,24)}`].join('\n')}).join('\n\n')});
 def('file','Files','Guess what a file really is','file <path…>',async a=>{const o=[];for(const p of a){const m=need(p);if(m.t==='d'){o.push(`${p}: directory`);continue}const u=new Uint8Array(await(await FS.blob(m.id)).slice(0,16).arrayBuffer()),h=[...u].map(x=>x.toString(16).padStart(2,'0')).join('');let k=h.startsWith('89504e47')?'PNG image':h.startsWith('ffd8ff')?'JPEG image':h.startsWith('47494638')?'GIF image':h.startsWith('25504446')?'PDF document':h.startsWith('504b0304')?'Zip archive':h.startsWith('52494646')?'RIFF container (WebP/WAV)':u.includes(0)?'binary data':'text';o.push(`${p}: ${k}${EXT(m.n)&&((k.includes('image')&&!IMG.has(EXT(m.n)))||(k==='text'&&IMG.has(EXT(m.n)&&EXT(m.n)!=='svg')))?TK('w','  (extension looks wrong!)'):''}`)}return o.join('\n')});
 def('du','Files','Disk usage of files and folders','du [-ahs] [path…]',async a=>{const{f,r}=flags(a),o=[];for(const p of r.length?r:['.']){const m=need(p);const rec=async(x,disp)=>{if(x.t==='f')return x.s;let s=0;for(const c of FS.kids(x.id)){await tick(1);const cs=await rec(c,disp+'/'+c.n);s+=cs;if(c.t==='f'&&f.has('a')&&!f.has('s'))o.push(fmtsz(cs,f)+'\t'+disp+'/'+c.n)}if(!f.has('s')||disp===p)o.push(fmtsz(s,f)+'\t'+disp);return s};await rec(m,p)}return o.join('\n')});
 const fmtsz=(n,f)=>f.has('h')?hs(n):String(Math.ceil(n/1024));
 def('df','System','Storage used by the virtual disk','df',async()=>{const[n,s]=FS.count('root');let q='';try{const e=await navigator.storage.estimate();q=`\nBrowser storage: ${hs(e.usage)} used of ${hs(e.quota)} available`}catch{}return`Reitzel disk (/)  ${n} items  ${hs(s)} of file data`+q});
 /* ---- reading & text ---- */
 def('cat','Text','Print files (or piped text)','cat [-n] [file…]',async(a,c)=>{const{f,r}=flags(a);let s='';if(!r.length&&c.stdin!=null)s=c.stdin;else for(const p of r){const m=need(p);if(await isBin(m)&&m.t==='f'){s+=TK('w',p+': binary file (use `file` or `edit`)\n');continue}s+=await readText(m)}return f.has('n')?s.split('\n').map((l,i)=>String(i+1).padStart(4)+'  '+l).join('\n'):s});
 const src=async(r,c)=>{if(!r.length&&c.stdin!=null)return c.stdin;let s='';for(const p of r)s+=await readText(need(p))+'\n';return s};
 def('head','Text','First lines of a file','head [-n 10] [file]',async(a,c)=>{const n=num(a,10);return(await src(flags(a).r,c)).split('\n').slice(0,n).join('\n')});
 def('tail','Text','Last lines of a file','tail [-n 10] [file]',async(a,c)=>{const n=num(a,10);return(await src(flags(a).r,c)).replace(/\n$/,'').split('\n').slice(-n).join('\n')});
 def('echo','Text','Print text','echo [-n] text…   (use > file or >> file to write)',async a=>{const n=a[0]==='-n';return a.slice(n?1:0).join(' ')});
 def('wc','Text','Count lines, words, characters','wc [-lwc] [file…]',async(a,c)=>{const{f,r}=flags(a),all=!f.size,one=s=>{const l=s.split('\n').length-(s.endsWith('\n')?1:0),wd=(s.match(/\S+/g)||[]).length;return[(all||f.has('l'))&&l,(all||f.has('w'))&&wd,(all||f.has('c'))&&s.length].filter(x=>x!==false).join('  ')};if(!r.length)return one(c.stdin||'');const o=[];for(const p of r)o.push(one(await readText(need(p)))+'  '+p);return o.join('\n')});
 def('sort','Text','Sort lines','sort [-rnuh] [file]',async(a,c)=>{const{f,r}=flags(a);let l=(await src(r,c)).replace(/\n$/,'').split('\n');const hv=s=>{const m=/^\s*([\d.]+)([KMG]?)/i.exec(s);return m?parseFloat(m[1])*({K:1024,M:1048576,G:1073741824}[m[2].toUpperCase()]||1):0};l.sort(f.has('h')?(x,y)=>hv(x)-hv(y):f.has('n')?(x,y)=>parseFloat(x)-parseFloat(y)||0:(x,y)=>x.localeCompare(y,undefined,{numeric:false}));if(f.has('r'))l.reverse();if(f.has('u'))l=l.filter((x,i)=>x!==l[i-1]);return l.join('\n')});
 def('uniq','Text','Remove adjacent duplicate lines','uniq [-c]',async(a,c)=>{const{f,r}=flags(a),l=(await src(r,c)).replace(/\n$/,'').split('\n'),o=[];l.forEach(x=>{const z=o[o.length-1];if(z&&z[0]===x)z[1]++;else o.push([x,1])});return o.map(([x,n])=>f.has('c')?String(n).padStart(5)+' '+x:x).join('\n')});
 def('grep','Text','Search for text in files or piped text','grep [-irnlc] <pattern> [file/folder…]',async(a,c)=>{const{f,r}=flags(a);if(!r.length)throw Error('grep: missing pattern');const pat=r.shift();let re;try{re=new RegExp(pat,f.has('i')?'gi':'g')}catch{re=new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),f.has('i')?'gi':'g')}const o=[];let hits=0;
  const scan=(txt,label)=>{let cnt=0;txt.split('\n').forEach((ln,i)=>{re.lastIndex=0;if(re.test(ln)){cnt++;if(!f.has('l')&&!f.has('c')){re.lastIndex=0;const hl=ln.replace(re,m=>TK('w',m));o.push((label?TK('d',label)+TK('m',':'):'')+(f.has('n')?TK('g',String(i+1))+TK('m',':'):'')+hl)}}});if(cnt)hits+=cnt;if(f.has('c'))o.push((label?label+':':'')+cnt);else if(f.has('l')&&cnt)o.push(TK('d',label))};
  if(!r.length&&c.stdin!=null){scan(c.stdin,'');return o.join('\n')}const files=[];for(const p of r.length?r:['.']){const m=need(p);if(m.t==='d'){if(!f.has('r')&&r.length)throw Error(p+': Is a directory (use -r)');await walk(m.id,async x=>{if(x.t==='f'&&x.s<5e6)files.push(x)})}else files.push(m)}
  const multi=files.length>1||f.has('r');for(const m of files){await tick(1);if(await isBin(m))continue;scan(await readText(m),multi?rel(m):'')}if(!hits)t.last=1;return o.join('\n')});
 def('find','Files','Find files and folders','find [path] [-name pattern] [-type f|d] [-size +1m]',async a=>{let start='.',nm=null,ty=null,sz=null;const r=[...a];if(r[0]&&!r[0].startsWith('-'))start=r.shift();for(let i=0;i<r.length;i+=2){if(r[i]==='-name')nm=globRe(r[i+1]||'*');else if(r[i]==='-type')ty=r[i+1];else if(r[i]==='-size')sz=r[i+1];else throw Error('find: unknown option '+r[i])}
  const root=need(start),o=[];let lim=null;if(sz){const m=/^([+-]?)(\d+)([kmg]?)$/i.exec(sz);if(!m)throw Error('find: bad -size');lim=[m[1]||'+',+m[2]*({k:1024,m:1048576,g:1073741824}[m[3].toLowerCase()]||1)]}
  await walk(root.id,m=>{if((!nm||nm.test(m.n))&&(!ty||m.t===ty)&&(!lim||(m.t==='f'&&(lim[0]==='-'?m.s<lim[1]:m.s>lim[1]))))o.push(m.t==='d'?TK('d',rel(m)):rel(m));return o.length<5000});return o.join('\n')+(o.length>=5000?'\n'+TK('w','(stopped at 5000 results)'):'')});
 /* ---- changing things ---- */
 def('touch','Files','Create empty files / update time','touch <file…>',async a=>{for(const x of a){const{dir,name}=parentOf(x);wr(dir);const e=FS.K.get(dir.id).get(name.toLowerCase());if(e)await FS.write(null,null,await FS.blob(e),e,0,'term');else await FS.write(dir.id,name,new Blob([]),null,0,'term')}return''});
 def('mkdir','Files','Create folders','mkdir [-p] <folder…>',async a=>{const{f,r}=flags(a);if(!r.length)throw Error('mkdir: missing operand');for(const x of r){if(f.has('p')){let cur=P2(x).startsWith('/')?FS.get('root'):FS.get(t.cwd);for(const s of P2(x).split('/').filter(z=>z&&z!=='.')){if(s==='..'){cur=FS.get(cur.p||'root');continue}const e=FS.K.get(cur.id).get(s.toLowerCase());if(e){cur=FS.get(e);if(cur.t!=='d')throw Error(x+': exists and is a file')}else{wr(cur);cur=await FS.mkdir(cur.id,s)}}}else{const{dir,name}=parentOf(x);wr(dir);if(FS.K.get(dir.id).get(name.toLowerCase()))throw Error(`${x}: File exists`);await FS.mkdir(dir.id,name)}}return''});
 def('rm','Files','Remove files or folders','rm [-rf] <path…>',async a=>{const{f,r}=flags(a);if(!r.length)throw Error('rm: missing operand');const ids=[];for(const p of r){const m=look(p);if(!m){if(f.has('f'))continue;throw Error(`${p}: No such file or directory`)}if(m.id==='root')throw Error("rm: refusing to remove '/'");if(m.ro||FS.get(m.p).ro)throw Error(`${p}: Permission denied (protected system item)`);if(m.t==='d'&&!f.has('r')&&!f.has('R'))throw Error(`${p}: Is a directory (use -r)`);if(FS.isIn(t.cwd,m.id))throw Error(`${p}: contains the current folder`);ids.push(m.id)}if(ids.length)await FS.trash(ids);return''});
 def('rmdir','Files','Remove empty folders','rmdir <folder…>',async a=>{for(const p of a){const m=need(p);if(m.t!=='d')throw Error(p+': Not a directory');if(FS.K.get(m.id).size)throw Error(p+': Directory not empty');if(m.ro)throw Error(p+': Permission denied');await FS.del([m.id])}return''});
 const dest=async(srcs,dp,op)=>{if(srcs.length<1)throw Error(op+': missing destination');const to=look(dp);if(srcs.length>1&&(!to||to.t!=='d'))throw Error(`${op}: target '${dp}' is not a folder`);return to};
 def('cp','Files','Copy files or folders','cp [-r] <source…> <dest>',async a=>{const{f,r}=flags(a);if(r.length<2)throw Error('cp: missing operand');const dp=r.pop(),to=await dest(r,dp,'cp');for(const p of r){const m=need(p);if(m.t==='d'&&!f.has('r')&&!f.has('R'))throw Error(`${p}: is a folder (use -r)`);if(to&&to.t==='d'){wr(to);await FS.copy([m.id],to.id)}else{const{dir,name}=parentOf(dp);wr(dir);if(m.t==='d')throw Error('cp: cannot overwrite a file with a folder');const ex=FS.K.get(dir.id).get(name.toLowerCase());await FS.write(dir.id,name,await FS.blob(m.id),ex||null,0,'term')}}return''});
 def('mv','Files','Move or rename','mv <source…> <dest>',async a=>{const{r}=flags(a);if(r.length<2)throw Error('mv: missing operand');const dp=r.pop(),to=await dest(r,dp,'mv');for(const p of r){const m=need(p);if(m.ro||FS.get(m.p).ro)throw Error(`${p}: Permission denied (protected)`);if(to&&to.t==='d'){wr(to);await FS.move([m.id],to.id)}else{const{dir,name}=parentOf(dp);wr(dir);if(dir.id!==m.p)await FS.move([m.id],dir.id);await FS.rename(m.id,name)}}return''});
 def('zip','Files','Create a zip archive','zip <archive.zip> <path…>',async a=>{if(a.length<2)throw Error('usage: zip <archive.zip> <path…>');const nm=a[0],ms=a.slice(1).map(need),{dir,name}=parentOf(nm);wr(dir);const f=await fsZip(ms,dir.id,/\.zip$/i.test(name)?name:name+'.zip');return TK('g','created ')+f.n+` (${hs(f.s)})`});
 def('unzip','Files','Extract a zip archive','unzip <archive.zip>',async a=>{if(!a[0])throw Error('usage: unzip <archive.zip>');const m=need(a[0]);if(m.t!=='f')throw Error('not a zip file');const d=FS.get(t.cwd);wr(d);const r=await fsExtract(m,d.id);return TK('g','extracted ')+r.count+' files into '+r.root.n+'/'});
 /* ---- system ---- */
 def('whoami','System','Print the current user','whoami',async()=>prof().name+(Apps.isAdmin()?TK('m','  (administrator)'):''));
 def('hostname','System','Print the machine name','hostname',async()=>'reitzel');
 def('uname','System','System information','uname [-a]',async a=>a[0]==='-a'?'ReitzelOS 1.0 reitzel wasm-browser '+navigator.platform:'ReitzelOS');
 def('date','System','Show the date and time','date',async()=>new Date().toString());
 def('uptime','System','How long this session has been up','uptime',async()=>{const s=Math.floor((Date.now()-t.t0)/1000);return`terminal up ${Math.floor(s/60)}m ${s%60}s, ${W.length} windows open`});
 def('clear','System','Clear the screen','clear   (Ctrl+L)',async()=>{[...out.children].forEach(c=>c!==pr&&c.remove());return''});
 def('exit','System','Close this terminal','exit',async()=>{setTimeout(()=>closeW(w),0);return''});
 def('history','System','Show command history','history [-c]',async a=>{if(a[0]==='-c'){H0.length=0;save();return''}return H0.map((h,i)=>String(i+1).padStart(4)+'  '+h).join('\n')});
 def('alias','System','Define shortcuts for commands','alias [name=command]',async a=>{if(!a.length)return Object.entries(t.alias).map(([k,v])=>`alias ${k}='${v}'`).join('\n');for(const x of a){const i=x.indexOf('=');if(i<1)throw Error('usage: alias name=command');t.alias[x.slice(0,i)]=x.slice(i+1)}return''});
 def('unalias','System','Remove an alias','unalias <name>',async a=>{a.forEach(x=>delete t.alias[x]);return''});
 def('export','System','Set an environment variable','export NAME=value',async a=>{for(const x of a){const i=x.indexOf('=');if(i<1)throw Error('usage: export NAME=value');t.env[x.slice(0,i)]=x.slice(i+1)}return''});
 def('env','System','List environment variables','env',async()=>Object.entries(t.env).map(([k,v])=>k+'='+v).join('\n')+'\nPWD='+FS.path(t.cwd));
 def('which','System','Say what a command is','which <command>',async a=>a.map(x=>t.alias[x]?`${x}: aliased to ${t.alias[x]}`:CMD[x]?`${x}: built-in`:`${x} not found`).join('\n'));
 def('ps','System','List open windows','ps',async()=>W.map((x,i)=>`${String(i+1).padStart(3)}  ${(APPS[x.app]||{name:x.app}).name}${x.min?TK('m','  (minimized)'):''}`).join('\n'));
 def('kill','System','Close a window by its ps number','kill <number>',async a=>{const x=W[+a[0]-1];if(!x)throw Error('kill: no such window');closeW(x);return''});
 def('apps','Apps','List installed apps','apps',async()=>Object.keys(APPS).filter(k=>!APPS[k].hide).map(k=>TK('a',k.padEnd(12))+APPS[k].name).join('\n'));
 const findApp=n=>{n=n.toLowerCase();return Object.keys(APPS).find(k=>!APPS[k].hide&&(k.toLowerCase()===n||APPS[k].name.toLowerCase()===n))||Object.keys(APPS).find(k=>!APPS[k].hide&&APPS[k].name.toLowerCase().includes(n))};
 def('launch','Apps','Start an app','launch <app>   (see `apps`)',async a=>{const k=findApp(a.join(' '));if(!k)throw Error('launch: no app called “'+a.join(' ')+'”');openApp(k);return TK('g','started ')+APPS[k].name});
 def('open','Apps','Open a file or folder in an app','open [-a editor|files|scout|terminal] <path>',async a=>{let ap=null;const i=a.indexOf('-a');if(i>=0){ap=a[i+1];a.splice(i,2)}const m=need(a[0]||'.'),l=openersFor([m]);const o=ap?l.find(x=>x.id===ap||x.id==='file-scout'&&ap==='scout'||x.name.toLowerCase()===ap):(m.t==='f'&&(TXT.has(EXT(m.n))||!EXT(m.n))?l.find(x=>x.id==='editor'):l.find(x=>x.id==='files')||l[0]);if(!o)throw Error('open: no app available'+(ap?' named '+ap:'')+' (try: '+l.map(x=>x.id).join(', ')+')');o.open(m);return TK('g','opened ')+m.n+' with '+o.name});
 def('edit','Apps','Edit a file in Text Editor','edit <file>   (creates it if missing)',async a=>{if(!a[0])throw Error('usage: edit <file>');let m=look(a[0]);if(!m){const{dir,name}=parentOf(a[0]);wr(dir);m=await FS.write(dir.id,name,new Blob([]),null,0,'term')}if(m.t!=='f')throw Error(a[0]+': Is a directory');openInEditor(m.id);return''});
 def('vim','Fun','…','vim',async()=>{throw Error('vim: you can leave any time. (Try `edit` instead. Nobody is stuck here.)')});
 def('calc','Tools','Calculator','calc <expression>   e.g. calc (3+4)*sqrt(16)',async(a,c)=>calc(a.join(' ')||(c.stdin||'')));
 def('seq','Tools','Print a sequence of numbers','seq [first] last',async a=>{const[x,y]=a.length>1?[+a[0],+a[1]]:[1,+a[0]];if(!isFinite(x)||!isFinite(y)||Math.abs(y-x)>100000)throw Error('seq: bad range');const o=[];for(let i=x;i<=y;i++)o.push(i);return o.join('\n')});
 def('sleep','Tools','Wait a number of seconds','sleep <seconds>',async a=>{const n=Math.min(+a[0]||0,600);for(let i=0;i<n*10;i++){if(t.abort)throw Error('^C');await sleep(100)}return''});
 def('neofetch','Fun','System summary, ReitzelOS style','neofetch',async()=>{const[n,s]=FS.count('root'),A=x=>TK('a',x),B=x=>TK('u',x);const logo=['  ╭───────────╮','  │  ╭─╮ ╭──╮ │','  │  ├─╯ ╰─╮│ │','  │  │ ╭─╮ ││ │','  │  ╵ ╵ ╰─╯╵ │','  ╰───────────╯'].map(x=>A(x));const info=[B(user)+'@'+B('reitzel'),'─'.repeat(user.length+8),A('OS')+'       ReitzelOS',A('Shell')+'    rzsh (Terminal)',A('Files')+'    '+n+' items, '+hs(s),A('Windows')+'  '+W.length+' open',A('Apps')+'     '+Object.keys(APPS).filter(k=>!APPS[k].hide).length,A('Browser')+'  '+(navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/)||['?'])[0],A('Role')+'     '+(Apps.isAdmin()?'administrator':'standard user')];return info.map((l,i)=>(logo[i]||' '.repeat(19))+'   '+l).join('\n')});
 def('users','Admin','List profiles','users',async()=>S.profiles.map(p=>p.name+(p.admin?TK('m',' (admin)'):'')+(p.id===S.cur?TK('g','  ← you'):'')).join('\n'));
 def('useradd','Admin','Create a standard profile (needs swat)','swat useradd <name>',async a=>{if(!a[0])throw Error('usage: swat useradd <name>');if(nameTaken(a[0],null))throw Error('useradd: that name is taken');await addProfile(a[0],false);return TK('g','created ')+a[0]+' (home: '+FS.path(S.profiles[S.profiles.length-1].home)+')'});
 def('userdel','Admin','Delete a profile (needs swat)','swat userdel <name>',async a=>{const p=S.profiles.find(x=>x.name.toLowerCase()===(a[0]||'').toLowerCase());if(!p)throw Error('userdel: no such user');if(p.id===S.cur)throw Error("userdel: you can't delete the profile you're using");if(p.root)throw Error('userdel: the root profile cannot be deleted');await dropProfile(p);return TK('g','deleted ')+p.name});
 def('passwd','Admin','Change a password','passwd [user]   (others need swat)',async(a,c)=>{const me=prof(),p=a[0]?S.profiles.find(x=>x.name.toLowerCase()===a[0].toLowerCase()):me;if(!p)throw Error('passwd: no such user');if(p!==me&&!c.el)throw Error('passwd: you can only change your own password (try: swat passwd '+a[0]+')');const v=await asked('New password for '+p.name+' (empty to remove): ',true);if(v===null)throw Error('cancelled');await setPw(p,v);save();return TK('g',v?'password updated':'password removed')});
 def('reboot','Admin','Restart ReitzelOS (needs swat)','swat reboot',async()=>{setTimeout(()=>{RZleave=1;sessionStorage.setItem('rz-restart',1);location.reload()},400);return TK('w','restarting…')});
 def('poweroff','Admin','Power off (needs swat)','swat poweroff',async()=>{setTimeout(()=>powerOff(),400);return TK('w','powering off…')});CMD.shutdown=CMD.poweroff;
 def('lock','System','Lock the screen','lock',async()=>{setTimeout(()=>lockNow(),200);return''});
 def('swat','Admin','Run a command as administrator','swat <command…>   (swat !! repeats your last command)',async a=>{if(!a.length)throw Error('usage: swat <command…>');const P=prof();if(!P.admin)throw Error(SWAT_JOKES[Math.floor(Math.random()*SWAT_JOKES.length)](P.name));
  if(!t.auth){if(!P.hash){emit(TK('m','[swat] no password is set for '+P.name+', so you’re waved through. Set one in Settings → Profiles.'));t.auth=true}else{for(let i=0;i<3&&!t.auth;i++){const pw=await asked(`[swat] password for ${user}: `,true);if(pw===null)throw Error('swat: cancelled');if(await hash(pw,P.salt)===P.hash)t.auth=true;else if(i<2)e_('Sorry, try again.')}if(!t.auth)throw Error('swat: 3 incorrect password attempts')}}
  if(a[0]==='!!')a=tokenize(H0[H0.length-2]||'').filter(x=>x.w!==undefined).map(x=>x.w);if(a[0]==='swat')throw Error('swat: it’s swats all the way down, but no.');return(await call(a[0],a.slice(1),null,true))});
 def('help','System','Show this help','help [command]',async a=>{if(a[0]){const c=CMD[a[0]];if(!c)throw Error('help: no command “'+a[0]+'”');return TK('a',a[0])+' — '+c.d+'\n  usage: '+c.u}
  const g={};Object.entries(CMD).forEach(([n,c])=>{if(n==='shutdown'||n==='vim')return;(g[c.g]=g[c.g]||[]).push(n)});return[TK('u','ReitzelOS Terminal')+'  ·  type '+TK('a','help <command>')+' for details, '+TK('a','Tab')+' to complete, '+TK('a','↑↓')+' for history','Pipes (|), redirects (> >>), ; and && all work. Globs like *.txt too.','',...['Files','Text','Apps','Tools','System','Admin','Fun'].filter(k=>g[k]).map(k=>TK('d',k.padEnd(7))+g[k].map(n=>TK('a',n)).join('  ')),'',TK('g','fag')+' <what you want to do>  — describe it in plain English and I’ll run the right command.','e.g.  '+TK('m','fag find all png files   ·   fag make a folder called Taxes   ·   fag biggest files')].join('\n')});
 CMD.man=CMD.help;
 typeof Xctu!=='undefined'&&Xctu.terminal({def,asked,TK,look,parentOf,wr,t,FS,emit});
 /* ---- fag: plain-English → command ---- */
 const sq=x=>{x=x.trim().replace(/^["'`]|["'`]$/g,'').replace(/[?!.]+$/,'');return /[\s'"]/.test(x)?JSON.stringify(x):x||'.'};
 const FAG=[
  [/^(?:where am i|(?:what(?:'s| is) )?(?:the )?(?:current|my) (?:folder|directory|location|path))\??$/i,()=>'pwd'],
  [/hidden (?:files|stuff|things)(?: (?:in|of|inside) (.+))?$/i,m=>'ls -la '+sq(m[1]||'.')],
  [/^(?:go|cd|navigate|jump|move|take me)(?: me)? (?:up|back)(?: a (?:folder|level))?$/i,()=>'cd ..'],
  [/^(?:go|cd|navigate|jump|move|take me)(?: me)? (?:to|into|in) (?:the )?(?:folder |directory |dir )?(.+)$/i,m=>'cd '+sq(m[1])],
  [/^(?:make|create|new|add)(?: me)? (?:a |an )?(?:new )?(?:folder|directory|dir)(?: (?:called|named))? (.+)$/i,m=>'mkdir -p '+sq(m[1])],
  [/^(?:make|create|new|add)(?: me)? (?:a |an )?(?:new )?(?:text |empty |blank )?(?:file|note)(?: (?:called|named))? (.+)$/i,m=>'touch '+sq(m[1])],
  [/^(?:delete|remove|erase|trash|get rid of|rm) (?:the )?(?:file |folder |directory )?(.+)$/i,m=>({c:'rm -r '+sq(m[1]),danger:1})],
  [/^copy (.+?) (?:to|into) (.+)$/i,m=>`cp -r ${sq(m[1])} ${sq(m[2])}`],
  [/^(?:move|rename) (.+?) (?:to|into|as) (.+)$/i,m=>`mv ${sq(m[1])} ${sq(m[2])}`],
  [/^(?:search|look|grep|find)(?: for)?(?: the)? (?:text|word|words|string|phrase|lines? containing|anything(?: saying)?) ["'“]?(.+?)["'”]?(?: (?:in|inside|within|under) (.+))?$/i,m=>`grep -rin ${JSON.stringify(m[1])} ${sq(m[2]||'.')}`],
  [/^(?:how many|count)(?: the)? (?:files|things|items)(?: (?:are )?(?:in|inside|under) (.+))?$/i,m=>`find ${sq(m[1]||'.')} -type f | wc -l`],
  [/^(?:biggest|largest|heaviest|fattest) (?:files|things|stuff|folders)(?: (?:in|inside|under|of) (.+))?$/i,m=>`du -ah ${sq(m[1]||'.')} | sort -rh | head -n 10`],
  [/^(?:find|locate|list|show|search for|look for)(?: me)?(?: all| every| the)* \.?(\w{2,5}) files(?: (?:in|inside|under) (.+))?$/i,m=>`find ${sq(m[2]||'.')} -name "*.${m[1].toLowerCase()}"`],
  [/^(?:find|locate|search for|look for) (?:a |the )?(?:file |folder )?(?:called |named )?(.+?)(?: (?:in|inside|under) (.+))?$/i,m=>`find ${sq(m[2]||'.')} -name "*${m[1].trim().replace(/["']/g,'')}*"`],
  [/^(?:how (?:big|large)(?: is)?|size of|disk usage of|space (?:used )?(?:by|in)) (.+)$/i,m=>'du -sh '+sq(m[1])],
  [/^(?:how much (?:space|storage|disk)|disk space|storage)\b.*$/i,()=>'df'],
  [/^(?:count|how many) (lines|words|chars|characters) (?:in|of) (.+)$/i,m=>`wc -${/^l/i.test(m[1])?'l':/^w/i.test(m[1])?'w':'c'} ${sq(m[2])}`],
  [/^(?:show|display|view|print|read|cat|see)(?: me)? (?:the )?(?:tree|structure|hierarchy|layout)(?: (?:of|for) (.+))?$/i,m=>'tree '+sq(m[1]||'.')],
  [/^(?:tree|structure|hierarchy)(?: of (.+))?$/i,m=>'tree '+sq(m[1]||'.')],
  [/^(?:list|show|ls|what(?:'s| is))(?: me)?(?: (?:the )?(?:files|contents|folders?|everything|stuff|things))?(?: (?:in|of|inside|from|at) (.+))?\??$/i,m=>'ls -l '+sq(m[1]||'.')],
  [/^(?:zip|compress|archive|pack)(?: up)? (.+?)(?: (?:as|to|into) (.+))?$/i,m=>`zip ${sq(m[2]||(m[1].replace(/[\/\\]+$/,'').split('/').pop()+'.zip'))} ${sq(m[1])}`],
  [/^(?:unzip|extract|decompress|unpack)(?: the)? (.+)$/i,m=>'unzip '+sq(m[1])],
  [/^(?:edit|open|modify|change) (.+?) (?:in|with|using) (?:the )?(?:text )?(?:editor|notepad)$/i,m=>'edit '+sq(m[1])],
  [/^(?:edit|modify) (.+)$/i,m=>'edit '+sq(m[1])],
  [/^(?:show|display|read|print|view|see|cat)(?: me)? (?:the )?(?:contents? of |what(?:'s| is) in |inside )?(.+)$/i,m=>'cat '+sq(m[1])],
  [/^(?:calculate|calc|compute|what(?:'s| is)|whats|solve) ([\d\s+\-*\/%^().,a-z]+?)\??$/i,m=>/\d/.test(m[1])&&/^[\d\s+\-*\/%^().,]*$|sqrt|sin|cos|pi/i.test(m[1])?'calc '+m[1]:null],
  [/^(?:list|show|what)(?: me)?(?: the)? (?:apps|applications|programs)\b.*$/i,()=>'apps'],
  [/^(?:launch|start|run|open)(?: up)?(?: the)? (.+?)(?: app| application)?$/i,m=>findApp(m[1])?'launch '+sq(m[1]):'open '+sq(m[1])],
  [/^(?:what(?:'s| is) running|running (?:apps|windows|programs)|processes)$/i,()=>'ps'],
  [/^(?:system|computer) info(?:rmation)?|about (?:this|my) (?:computer|system|os)$/i,()=>'neofetch'],
  [/^(?:what(?:'s| is) the )?(?:time|date)(?: now)?\??$|^what time is it\??$/i,()=>'date'],
  [/^who am i\??$/i,()=>'whoami'],
  [/^(?:clear|clean)(?: the)?(?: screen| terminal)?$/i,()=>'clear'],
  [/^(?:history|what did i (?:run|type))$/i,()=>'history'],
  [/^(?:lock)(?: the)?(?: screen| computer)?$/i,()=>'lock'],
  [/^(?:restart|reboot)(?: the)?(?: computer| system| os)?$/i,()=>({c:'swat reboot',danger:1})],
  [/^(?:shut ?down|power off|turn off)(?: the)?(?: computer| system| os)?$/i,()=>({c:'swat poweroff',danger:1})],
  [/^(?:help|what can you do|commands)\??$/i,()=>'help']];
 def('fag','Fun','Say what you want in plain English — I run the command','fag <what you want to do>   e.g. fag find all txt files · fag copy notes.txt to Documents · fag -n … previews only',async a=>{let dry=false;if(a[0]==='-n'){dry=true;a=a.slice(1)}let s=a.join(' ').trim().replace(/^(?:please|pls|can you|could you|would you|i (?:want|need|'d like) to|how (?:do|can) i|let'?s|just)\s+/i,'').replace(/\s+please$/i,'');
  if(!s)return[TK('g','fag')+' turns plain English into commands. Try:','  fag find all png files','  fag make a folder called Taxes','  fag biggest files in Documents','  fag copy notes.txt to Documents','  fag search for text invoice in Documents','  fag zip Documents as backup.zip','  fag what is 12*(3+4)','  fag -n delete Downloads   '+TK('m','(-n = just show the command)')].join('\n');
  for(const[re,fn]of FAG){const m=re.exec(s);if(!m)continue;let r=fn(m);if(!r)continue;const cmd=r.c||r;emit(TK('m','fag › ')+TK('a',cmd));if(dry)return'';if(r.danger){const ans=await asked('Run it? [y/N] ');if(!ans||!/^y/i.test(ans))return TK('m','fag: okay, nothing was changed.')}await runLine(cmd,true);return''}
  throw Error('fag: I couldn’t work out “'+s+'”. Run `fag` on its own for examples, or `help` for every command.')});
 /* ---- parsing & running ---- */
 function tokenize(s){const o=[];let cur='',has=false,qd=false,q=null;const vr=n=>n==='?'?String(t.last):n==='PWD'?FS.path(t.cwd):t.env[n]||'';const push=()=>{if(has){o.push({w:cur,q:qd});cur='';has=false;qd=false}};
  for(let i=0;i<s.length;i++){const c=s[i];
   if(q){if(c===q)q=null;else if(c==='\\'&&q==='"'&&i+1<s.length)cur+=s[++i];else if(c==='$'&&q==='"'){const m=/^\$(\w+|\?)/.exec(s.slice(i));if(m){cur+=vr(m[1]);i+=m[0].length-1}else cur+=c}else cur+=c;continue}
   if(c==='"'||c==="'"){q=c;has=true;qd=true;continue}
   if(c==='\\'&&i+1<s.length){cur+=s[++i];has=true;qd=true;continue}
   if(c==='$'){const m=/^\$(\w+|\?)/.exec(s.slice(i));if(m){cur+=vr(m[1]);i+=m[0].length-1;has=true;continue}}
   if(/\s/.test(c)){push();continue}
   if(c==='|'){push();o.push({op:'|'});continue}if(c===';'){push();o.push({op:';'});continue}
   if(c==='&'&&s[i+1]==='&'){push();o.push({op:'&&'});i++;continue}
   if(c==='>'){push();if(s[i+1]==='>'){o.push({op:'>>'});i++}else o.push({op:'>'});continue}
   cur+=c;has=true}
  if(q)throw Error('syntax error: unterminated quote');push();return o}
 function group(tk){const seqs=[];let cur={pipe:[{argv:[]}],op:';'},rd=null;for(const x of tk){if(x.op==='|')cur.pipe.push({argv:[]});else if(x.op===';'||x.op==='&&'){seqs.push(cur);cur={pipe:[{argv:[]}],op:x.op}}else if(x.op==='>'||x.op==='>>')rd=x.op;else{const c=cur.pipe[cur.pipe.length-1];if(rd){c.redir={m:rd,f:x.w};rd=null}else c.argv.push(x)}}if(rd)throw Error('syntax error: expected a file name after '+rd);seqs.push(cur);return seqs}
 async function call(name,args,stdin,el){const c=CMD[name];if(!c)throw Error(name+': command not found'+(CMD[name.toLowerCase()]?' (did you mean '+name.toLowerCase()+'?)':'  — try `help`'));if(PRIV.has(name)&&!el)throw Error(name+': permission denied (try: swat '+name+')');
  if(args.includes('--help'))return TK('a',name)+' — '+c.d+'\n  usage: '+c.u;return await c.f(args,{stdin,el,t})}
 async function runLine(line,quiet){let seqs;try{seqs=group(tokenize(line))}catch(x){e_(x.message);t.last=2;return}
  for(const sq_ of seqs){if(sq_.op==='&&'&&t.last!==0)continue;t.last=0;let stdin=null;
   for(let k=0;k<sq_.pipe.length;k++){const st=sq_.pipe[k];let av=st.argv;if(!av.length){if(sq_.pipe.length>1){e_('syntax error near |');t.last=2}break}
    let seen=0;while(t.alias[av[0].w]&&!av[0].q&&seen++<5)av=[...tokenize(t.alias[av[0].w]),...av.slice(1)].filter(x=>x.w!==undefined);
    const args=av.slice(1).flatMap(expand);
    try{let o=await call(av[0].w,args,stdin);o=o==null?'':String(o);const last=k===sq_.pipe.length-1;
     if(!last){stdin=TKS(o);continue}
     if(st.redir){await writeFile(st.redir.f,TKS(o).replace(/\n?$/,'\n'),st.redir.m==='>>')}else if(o!=='')emit(o)}
    catch(x){t.last=1;if(x.message!=='^C')e_(x.message||String(x));else emit(TK('m','^C'));break}}
   if(t.abort)break}}
 async function run(line){line=line.replace(/^!!$/,H0[H0.length-1]||'');if(H0[H0.length-1]!==line&&line.trim()){H0.push(line);if(H0.length>300)H0.shift();save()}t.hi=-1;
  const d=mkl();d.innerHTML=promptHtml()+ESC(line);out.insertBefore(d,pr);if(!line.trim()){scroll();return}
  t.busy=true;t.abort=false;pr.style.display='none';try{await runLine(line)}catch(x){e_(x.message||String(x))}t.busy=false;t.abort=false;setP();pr.style.display='flex';inp.focus();scroll()}
 /* completion */
 function complete(){const v=inp.value,pos=inp.selectionStart,before=v.slice(0,pos),m=/(\S*)$/.exec(before),tokenStr=m[1],isCmd=!/\s/.test(before.slice(0,m.index).trim())&&!/[|;&]\s*$/.test(before.slice(0,m.index))?before.slice(0,m.index).trim()==='':/[|;]\s*$|&&\s*$/.test(before.slice(0,m.index));let cand=[];const raw=tokenStr.replace(/\\ /g,' ');
  if(isCmd&&!/\//.test(raw))cand=[...Object.keys(CMD),...Object.keys(t.alias)].filter(c=>c.startsWith(raw)).sort();
  else{const i=raw.lastIndexOf('/'),dp=i<0?'.':(raw.slice(0,i)||'/'),pre=raw.slice(i+1).toLowerCase(),d=look(dp);if(d&&d.t==='d')cand=FS.kids(d.id).filter(x=>x.n.toLowerCase().startsWith(pre)&&(pre||x.n[0]!=='.')).map(x=>(i<0?'':raw.slice(0,i+1))+x.n+(x.t==='d'?'/':'')).sort()}
  if(!cand.length)return;let pfx=cand[0];for(const c of cand)while(!c.toLowerCase().startsWith(pfx.toLowerCase()))pfx=pfx.slice(0,-1);const one=cand.length===1,ins=(pfx.length>=raw.length?pfx:raw).replace(/ /g,'\\ ')+(one&&!pfx.endsWith('/')?' ':'');
  inp.value=before.slice(0,m.index)+ins+v.slice(pos);inp.setSelectionRange(m.index+ins.length,m.index+ins.length);
  if(!one&&t.tabs===v){emit(promptHtml().replace(/<[^>]+>/g,'')+v);emit(cand.map(c=>c.replace(/\/$/,'')===c?c:TK('d',c)).join('  '))}t.tabs=inp.value}
 inp.onkeydown=e=>{e.stopPropagation();const k=e.key,ctl=e.ctrlKey||e.metaKey;
  if(k==='Enter'){e.preventDefault();const v=inp.value;inp.value='';if(t.askr){const r=t.askr;t.askr=null;const sec=inp.type==='password';inp.type='text';const d=mkl();d.textContent=pp.textContent+(sec?'':v);out.insertBefore(d,pr);pr.style.display='none';r(v);return}if(!t.busy)run(v)}
  else if(ctl&&k.toLowerCase()==='c'&&(!window.getSelection().toString()||inp.selectionStart!==inp.selectionEnd||true)){if(t.askr){e.preventDefault();const r=t.askr;t.askr=null;inp.type='text';inp.value='';emit(TK('m','^C'));pr.style.display='none';r(null)}else if(t.busy){e.preventDefault();t.abort=true}else if(inp.selectionStart===inp.selectionEnd){e.preventDefault();const d=mkl();d.innerHTML=promptHtml()+ESC(inp.value)+TK('m','^C').replace(/\u0001.|\u0002/g,'');out.insertBefore(d,pr);inp.value='';scroll()}}
  else if(ctl&&k.toLowerCase()==='l'){e.preventDefault();CMD.clear.f()}else if(ctl&&k.toLowerCase()==='u'){e.preventDefault();inp.value=inp.value.slice(inp.selectionStart)}else if(ctl&&k.toLowerCase()==='k'){e.preventDefault();inp.value=inp.value.slice(0,inp.selectionStart)}else if(ctl&&k.toLowerCase()==='a'){e.preventDefault();inp.setSelectionRange(0,0)}else if(ctl&&k.toLowerCase()==='e'){e.preventDefault();inp.setSelectionRange(1e6,1e6)}
  else if(ctl&&k.toLowerCase()==='w'){e.preventDefault();const b=inp.value.slice(0,inp.selectionStart).replace(/\S*\s*$/,'');inp.value=b+inp.value.slice(inp.selectionStart);inp.setSelectionRange(b.length,b.length)}
  else if(k==='Tab'){e.preventDefault();if(!t.busy&&!t.askr)complete()}
  else if(k==='ArrowUp'&&!t.askr){e.preventDefault();if(t.hi<0)t.hi=H0.length;t.hi=Math.max(0,t.hi-1);if(H0[t.hi]!=null)inp.value=H0[t.hi]}else if(k==='ArrowDown'&&!t.askr){e.preventDefault();if(t.hi<0)return;t.hi++;inp.value=t.hi>=H0.length?'':H0[t.hi];if(t.hi>=H0.length)t.hi=-1}};
 tmEl.addEventListener('pointerdown',e=>{if(!window.getSelection().toString())setTimeout(()=>{if(!window.getSelection().toString())inp.focus()},0)});
 emit(TK('u','ReitzelOS Terminal')+TK('m','  ·  ')+'type '+TK('a','help')+' to see what I can do.\n');
 setP();setTimeout(()=>inp.focus(),60);
}
Apps.register('terminal',{name:'Terminal',icon:'terminal',w:760,h:480,cat:'system',perms:['fs','admin'],render:renderTerm});
