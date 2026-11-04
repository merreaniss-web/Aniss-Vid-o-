/* ANISS STUDIO — local-first nonlinear video editor */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const UI = {
  app:$('app'), projectName:$('projectName'), saveState:$('saveState'), fileInput:$('fileInput'),
  assetGrid:$('assetGrid'), audioGrid:$('audioGrid'), stockGrid:$('stockGrid'), previewCanvas:$('previewCanvas'),
  stage:$('stage'), stageEmpty:$('stageEmpty'), stageHud:$('stageHud'), inspector:$('inspectorContent'),
  trackList:$('trackList'), timelineScroll:$('timelineScroll'), timelineInner:$('timelineInner'),
  ruler:$('ruler'), rulerTicks:$('rulerTicks'), rulerPlayhead:$('rulerPlayhead'),
  toastArea:$('toastArea'), exportModal:$('exportModal'),
};
const ctx = UI.previewCanvas.getContext('2d', { alpha:false, desynchronized:true });
const uid = () => (crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (seconds, frames=false) => {
  const t=Math.max(0,Number(seconds)||0), h=Math.floor(t/3600), m=Math.floor(t%3600/60), s=t%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(Math.floor(s)).padStart(2,'0')}${frames?'.'+String(Math.floor((s%1)*100)).padStart(2,'0'):''}`;
};
const prettySize = bytes => bytes < 1024*1024 ? `${(bytes/1024).toFixed(0)} Ko` : `${(bytes/1024/1024).toFixed(1)} Mo`;
const mediaType = file => file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':file.type.startsWith('image/')?'image':null;
const state = {
  project:{name:'Sans titre — Projet 01',width:1920,height:1080,fps:30,bg:'#000000',snap:true,linked:false,autosave:true},
  tracks:[
    {id:'v2',name:'Vidéo 2',kind:'video',muted:false,hidden:false,locked:false},
    {id:'v1',name:'Vidéo 1',kind:'video',muted:false,hidden:false,locked:false},
    {id:'a1',name:'Audio 1',kind:'audio',muted:false,hidden:false,locked:false},
    {id:'t1',name:'Texte',kind:'text',muted:false,hidden:false,locked:false},
  ],
  clips:[], assets:[], selected:null, multiSelected:new Set(), selectedAssets:new Set(), playhead:0, zoom:54,
  playing:false, exporting:false, dirty:false, history:[], future:[], currentLibrary:'media',
};
const objectUrls = new Set();
let rafId=0, lastFrameTime=0, saveTimer=0, dbPromise=null, dragState=null, suppressNextClick=false, exportStop=false, voiceRecorder=null, voiceChunks=[], speechRecognition=null, recognitionActive=false;
const persistedMediaIds = new Set();
let audioContext=null, audioSourceNodes=new WeakMap();
const stockCatalog = [
  {id:'stock-violet-video',name:'Violet Dream — Motion',file:'assets/stock/violet-dream.mp4',type:'video',tag:'Cinematic'},
  {id:'stock-ocean-video',name:'Deep Ocean — Motion',file:'assets/stock/deep-ocean.mp4',type:'video',tag:'Atmosphere'},
  {id:'s-purple-velvet',name:'Purple Velvet',file:'assets/stock/purple-velvet.jpg',type:'image',tag:'4K'},
  {id:'s-blue-hour',name:'Blue Hour',file:'assets/stock/blue-hour.jpg',type:'image',tag:'4K'},
  {id:'s-amber-luxe',name:'Amber Luxe',file:'assets/stock/amber-luxe.jpg',type:'image',tag:'4K'},
  {id:'s-aurora-teal',name:'Aurora Teal',file:'assets/stock/aurora-teal.jpg',type:'image',tag:'4K'},
  {id:'s-emerald-glass',name:'Emerald Glass',file:'assets/stock/emerald-glass.jpg',type:'image',tag:'4K'},
  {id:'s-rose-noir',name:'Rose Noir',file:'assets/stock/rose-noir.jpg',type:'image',tag:'4K'},
  {id:'s-arctic-silver',name:'Arctic Silver',file:'assets/stock/arctic-silver.jpg',type:'image',tag:'4K'},
  {id:'s-solar-gold',name:'Solar Gold',file:'assets/stock/solar-gold.jpg',type:'image',tag:'4K'},
  {id:'s-crimson-night',name:'Crimson Night',file:'assets/stock/crimson-night.jpg',type:'image',tag:'4K'},
  {id:'s-indigo-wave',name:'Indigo Wave',file:'assets/stock/indigo-wave.jpg',type:'image',tag:'4K'},
  {id:'s-copper-dust',name:'Copper Dust',file:'assets/stock/copper-dust.jpg',type:'image',tag:'HD'},
  {id:'s-mint-future',name:'Mint Future',file:'assets/stock/mint-future.jpg',type:'image',tag:'HD'},
  {id:'s-deep-plum',name:'Deep Plum',file:'assets/stock/deep-plum.jpg',type:'image',tag:'HD'},
  {id:'s-neon-cyan',name:'Neon Cyan',file:'assets/stock/neon-cyan.jpg',type:'image',tag:'HD'},
  {id:'s-desert-dusk',name:'Desert Dusk',file:'assets/stock/desert-dusk.jpg',type:'image',tag:'HD'},
  {id:'s-forest-mist',name:'Forest Mist',file:'assets/stock/forest-mist.jpg',type:'image',tag:'HD'},
  {id:'s-violet-chrome',name:'Violet Chrome',file:'assets/stock/violet-chrome.jpg',type:'image',tag:'HD'},
  {id:'s-midnight-red',name:'Midnight Red',file:'assets/stock/midnight-red.jpg',type:'image',tag:'HD'},
  {id:'s-ocean-depth',name:'Ocean Depth',file:'assets/stock/ocean-depth.jpg',type:'image',tag:'HD'},
  {id:'s-champagne',name:'Champagne',file:'assets/stock/champagne.jpg',type:'image',tag:'HD'},
  {id:'s-graphite',name:'Graphite',file:'assets/stock/graphite.jpg',type:'image',tag:'HD'},
  {id:'s-pink-nebula',name:'Pink Nebula',file:'assets/stock/pink-nebula.jpg',type:'image',tag:'HD'},
  {id:'s-sapphire',name:'Sapphire',file:'assets/stock/sapphire.jpg',type:'image',tag:'HD'},
  {id:'s-jade-night',name:'Jade Night',file:'assets/stock/jade-night.jpg',type:'image',tag:'HD'}
]
const stickers = ['✨','🔥','💜','⭐','🪩','❤️','⚡','🌈','🎬','🎧','🎉','☀️','🌙','💎','🦋','🚀','📍','🎵','💫','🤍','🌊','🌸','🏁','🖤','🎀','🍒','💥','✈️','🏆','👑'];

function toast(message, type='info', duration=2600) {
  const node=document.createElement('div'); node.className=`toast ${type}`; node.textContent=message; UI.toastArea.append(node);
  setTimeout(()=>node.remove(),duration);
}
function markDirty() {
  state.dirty=true; UI.saveState.classList.add('saving'); UI.saveState.innerHTML='<i></i> Sauvegarde…';
  clearTimeout(saveTimer); if(state.project.autosave) saveTimer=setTimeout(persistLocal,650);
}
function markSaved() { state.dirty=false; UI.saveState.classList.remove('saving'); UI.saveState.innerHTML='<i></i> Enregistré localement'; }
function cloneSerializable() { return {
  project:{...state.project}, tracks:state.tracks.map(t=>({...t})), clips:state.clips.map(c=>({...c,transform:{...c.transform},filters:{...c.filters},keyframes:(c.keyframes||[]).map(k=>({...k}))})),
  selected:state.selected, playhead:state.playhead,
}; }
function snapshot() { return JSON.stringify(cloneSerializable()); }
function checkpoint() { state.history.push(snapshot()); if(state.history.length>100)state.history.shift(); state.future=[]; updateHistoryButtons(); }
function updateHistoryButtons() { $('undoBtn').disabled=!state.history.length; $('redoBtn').disabled=!state.future.length; }
function applySnapshot(raw) { const data=JSON.parse(raw); state.project={...state.project,...data.project}; state.tracks=data.tracks||state.tracks; state.clips=data.clips||[]; state.selected=data.selected||null; state.multiSelected=new Set(state.selected?[state.selected]:[]); state.playhead=data.playhead||0; applyProjectUI(); renderAll(); seek(state.playhead); markDirty(); updateHistoryButtons(); }
function undo() { if(!state.history.length)return; state.future.push(snapshot()); applySnapshot(state.history.pop()); toast('Modification annulée'); }
function redo() { if(!state.future.length)return; state.history.push(snapshot()); applySnapshot(state.future.pop()); toast('Modification rétablie'); }

/* Persistent local storage */
function openDB() {
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){reject(new Error('IndexedDB indisponible'));return;}
    const request=indexedDB.open('aniss-studio-local',2);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('projects'))db.createObjectStore('projects');if(!db.objectStoreNames.contains('media'))db.createObjectStore('media');};
    request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error);
  }); return dbPromise;
}
async function idbSet(store,key,value) { const db=await openDB(); return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);}); }
async function idbGet(store,key) { const db=await openDB(); return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly'),r=tx.objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}); }
async function persistLocal() {
  try {
    const project=cloneSerializable(); project.assetRefs=state.assets.map(a=>a.id);
    await idbSet('projects','last',project);
    for(const a of state.assets) if(a.file&&!persistedMediaIds.has(a.id)){await idbSet('media',a.id,{id:a.id,name:a.name,type:a.type,mime:a.mime||a.file.type,size:a.file.size,file:a.file,duration:a.duration||0,stock:!!a.stock});persistedMediaIds.add(a.id);}
    markSaved();
  } catch(error) { UI.saveState.classList.remove('saving'); UI.saveState.innerHTML='<i></i> Sauvegarde indisponible'; console.warn(error); }
}
async function restoreLocal() {
  try {
    const project=await idbGet('projects','last'); if(!project)return;
    state.project={...state.project,...project.project}; state.tracks=project.tracks||state.tracks; state.clips=project.clips||[]; state.playhead=project.playhead||0;
    for(const id of project.assetRefs||[]) {const saved=await idbGet('media',id);if(saved?.file){createAssetFromFile(saved.file,saved.name,{id:saved.id,stock:saved.stock,duration:saved.duration,quiet:true});persistedMediaIds.add(saved.id);}}
    applyProjectUI(); renderAll(); seek(state.playhead); markSaved();
    if(state.assets.length) toast('Dernier projet restauré depuis cet appareil','success');
  } catch(error) { console.warn('Restauration locale impossible',error); }
}

/* Media assets */
function makeMediaElement(asset) {
  if(asset.type==='image') { const im=new Image(); im.decoding='async'; im.src=asset.url; asset.element=im; im.onload=()=>drawFrame(state.playhead); return; }
  const el=document.createElement(asset.type==='video'?'video':'audio'); el.src=asset.url; el.preload='auto'; el.playsInline=true; el.crossOrigin='anonymous'; el.onloadedmetadata=()=>{asset.duration=Number.isFinite(el.duration)?el.duration:asset.duration||0;asset.width=el.videoWidth||0;asset.height=el.videoHeight||0;renderAssets();}; el.onseeked=()=>{if(!state.playing&&!state.exporting)drawFrame(state.playhead);}; el.onerror=()=>toast(`Impossible de lire ${asset.name}`, 'error',4000); asset.element=el;
}
function createAssetFromFile(file,name=file.name,opts={}) {
  const type=opts.type||mediaType(file); if(!type)return null;
  const url=URL.createObjectURL(file); objectUrls.add(url);
  const asset={id:opts.id||uid(),name:name||file.name,type,file,url,mime:file.type||opts.mime||'',size:file.size||0,duration:opts.duration|| (type==='image'?5:0),stock:!!opts.stock,waveform:null,element:null};
  makeMediaElement(asset); state.assets.push(asset);
  if(type==='audio') buildWaveform(asset);
  return asset;
}
async function buildWaveform(asset) {
  try {
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    const ac=new C();const buffer=await ac.decodeAudioData(await asset.file.arrayBuffer());const channel=buffer.getChannelData(0),bars=120,step=Math.max(1,Math.floor(channel.length/bars));const values=[];
    for(let i=0;i<bars;i++){let peak=0;for(let j=i*step;j<Math.min(channel.length,(i+1)*step);j+=3)peak=Math.max(peak,Math.abs(channel[j]));values.push(Math.round(peak*100)/100);}
    asset.waveform=values;ac.close();renderTimeline();
  } catch(_) { /* codec unavailable; waveform remains decorative */ }
}
function addFiles(files) {
  const added=[]; for(const file of [...files]) {const type=mediaType(file);if(!type){toast(`Format non pris en charge : ${file.name}`,'error');continue;} const a=createAssetFromFile(file);if(a)added.push(a);}
  renderAssets(); if(added.length)toast(`${added.length} média${added.length>1?'s':''} importé${added.length>1?'s':''}`,'success'); markDirty();
}
function assetById(id){return state.assets.find(a=>a.id===id);}
function selectAsset(id) { state.selectedAssets.clear(); state.selectedAssets.add(id); renderAssets(); }
function formatDuration(n){return Number.isFinite(n)&&n>0?fmt(n):'Durée inconnue';}
function addAssetCard(asset,container,showAdd=true) {
  const card=document.createElement('div');card.className='asset-card'+(state.selectedAssets.has(asset.id)?' selected':'');card.dataset.assetId=asset.id;
  const thumb=document.createElement('div');thumb.className='asset-thumb';
  if(asset.type==='image'){const im=document.createElement('img');im.src=asset.url;thumb.append(im);} else if(asset.type==='video'){const v=document.createElement('video');v.src=asset.url;v.muted=true;v.preload='metadata';v.addEventListener('loadeddata',()=>{try{v.currentTime=Math.min(1,v.duration/3)}catch(_){}});thumb.append(v);} else thumb.textContent='♫';
  const tag=document.createElement('span');tag.className='asset-type';tag.textContent=asset.type.toUpperCase();thumb.append(tag);
  const info=document.createElement('div');info.className='asset-card-info';info.innerHTML=`<b title="${esc(asset.name)}">${esc(asset.name)}</b><span>${formatDuration(asset.duration)} · ${prettySize(asset.size||0)}</span>`;
  card.append(thumb,info);
  if(showAdd){const button=document.createElement('button');button.className='asset-add';button.textContent='+';button.title='Ajouter à la timeline';button.addEventListener('click',e=>{e.stopPropagation();addAssetToTimeline(asset.id);});card.append(button);}
  card.addEventListener('click',e=>{if(e.detail===2){addAssetToTimeline(asset.id);return;}selectAsset(asset.id);});
  card.draggable=true;card.addEventListener('dragstart',e=>{e.dataTransfer.setData('application/x-aniss-asset',asset.id);e.dataTransfer.effectAllowed='copy';});container.append(card);
}
function renderAssets() {
  const query=$('mediaSearch').value.toLowerCase(),filter=$('mediaFilter').value;
  UI.assetGrid.innerHTML=''; const filtered=state.assets.filter(a=>(filter==='all'||a.type===filter)&&(!query||a.name.toLowerCase().includes(query)));
  if(!filtered.length){UI.assetGrid.innerHTML='<div class="empty-library">'+(state.assets.length?'Aucun résultat.':'Votre bibliothèque est vide.<br><small>Importez un premier média pour commencer.</small>')+'</div>';}
  else filtered.forEach(a=>addAssetCard(a,UI.assetGrid));
  $('audioGrid').innerHTML=''; const audio=state.assets.filter(a=>a.type==='audio');
  if(!audio.length)$('audioGrid').innerHTML='<div class="empty-library">Aucun fichier audio.</div>';
  audio.forEach(a=>{const row=document.createElement('div');row.className='audio-row';row.innerHTML=`<div class="audio-row-icon">♫</div><div style="flex:1;min-width:0"><b>${esc(a.name)}</b><span>${formatDuration(a.duration)} · ${prettySize(a.size)}</span></div><button class="square-btn">＋</button>`;row.querySelector('button').onclick=()=>addAssetToTimeline(a.id);$('audioGrid').append(row);});
}
async function loadStock() {
  const grid=$('stockGrid');grid.innerHTML='';
  for(const item of stockCatalog){
    const card=document.createElement('div');card.className='stock-card';
    const mediaMarkup=item.type==='video'?`<video muted loop playsinline preload="metadata" src="${item.file}"></video>`:`<img loading="lazy" src="${item.file}" alt="${esc(item.name)}">`;
    card.innerHTML=`<div class="stock-thumb">${mediaMarkup}</div><b>${esc(item.name)}</b>`;
    const v=card.querySelector('video');if(v){card.addEventListener('mouseenter',()=>v.play().catch(()=>{}));card.addEventListener('mouseleave',()=>{v.pause();try{v.currentTime=0}catch(_){}});}
    card.addEventListener('click',async()=>{try{let a=state.assets.find(x=>x.id===item.id);if(!a){const response=await fetch(item.file);if(!response.ok)throw new Error('Fichier stock introuvable');const blob=await response.blob();const mime=item.type==='video'?'video/mp4':'image/jpeg';const file=new File([blob],`${item.name}.${item.type==='video'?'mp4':'jpg'}`,{type:mime});a=createAssetFromFile(file,file.name,{id:item.id,stock:true});renderAssets();}addAssetToTimeline(a.id);toast(`${item.name} ajouté au montage`,'success');}catch(error){toast('Impossible de charger cet élément stock','error');}});
    grid.append(card);
  }
}

/* Timeline and clips */
function trackById(id){return state.tracks.find(t=>t.id===id);}
function clipDuration(c){return Math.max(0.02,(c.end-c.start)/Math.max(.05,c.speed||1));}
function clipEnd(c){return c.position+clipDuration(c);}
function projectDuration(){return Math.max(0,...state.clips.map(clipEnd));}
function trackClips(trackId){return state.clips.filter(c=>c.trackId===trackId).sort((a,b)=>a.position-b.position);}
function firstTrack(kind){return state.tracks.find(t=>t.kind===kind)||state.tracks[0];}
function addAssetToTimeline(assetId,trackId=null,position=null) {
  const a=assetById(assetId);if(!a)return;
  const kind=a.type==='audio'?'audio':'video';let target=trackById(trackId)||firstTrack(kind);if(!target||target.kind!==kind)target=firstTrack(kind)||createTrack(kind);if(target.locked){toast('Cette piste est verrouillée','error');return;}
  checkpoint();const maxEnd=Math.max(0,...trackClips(target.id).map(clipEnd));
  const c={id:uid(),type:a.type,assetId:a.id,trackId:target.id,position:position==null?maxEnd:Math.max(0,position),start:0,end:a.duration||5,speed:1,volume:1,muted:false,opacity:1,transform:{x:0,y:0,scale:1,rotation:0},filters:{brightness:100,contrast:100,saturation:100,blur:0},fadeIn:0,fadeOut:0,keyframes:[],waveform:a.waveform||null};
  state.clips.push(c);state.selected=c.id;renderAll();seek(c.position);markDirty();
}
function addTitle(preset='title',text=null) {
  checkpoint();const defaults={title:{text:'Votre titre',fontSize:88,y:.5,weight:800,background:false,align:'center'},subtitle:{text:'Ajoutez votre sous-titre',fontSize:42,y:.82,weight:600,background:true,align:'center'},lower:{text:'NOM · LIEU · DATE',fontSize:34,y:.86,weight:750,background:true,align:'left'},quote:{text:'« Votre histoire commence ici. »',fontSize:54,y:.5,weight:650,background:false,align:'center'}};
  const d=defaults[preset]||defaults.title;const track=firstTrack('text')||createTrack('text');
  const c={id:uid(),type:'text',text:text||d.text,preset,trackId:track.id,position:state.playhead,start:0,end:4,speed:1,opacity:1,transform:{x:0,y:d.y,scale:1,rotation:0},style:{fontSize:d.fontSize,weight:d.weight,color:'#ffffff',font:'Inter, system-ui, sans-serif',align:d.align,background:d.background,backgroundColor:'#121826dd',padding:18,stroke:'#00000000',shadow:true,italic:false},fadeIn:.2,fadeOut:.2,keyframes:[]};
  state.clips.push(c);state.selected=c.id;renderAll();markDirty();toast('Titre ajouté à la timeline','success');
}
function addSticker(emoji) { addTitle('title',emoji);const c=selectedClip();if(c){c.style.fontSize=130;c.style.shadow=true;c.transform.y=.5;}renderAll(); }
function addShape(shape) { checkpoint();const track=firstTrack('text');const c={id:uid(),type:'shape',shape,text:'',trackId:track.id,position:state.playhead,start:0,end:4,speed:1,opacity:1,transform:{x:0,y:0,scale:1,rotation:0},style:{color:'#9a77f7',fontSize:180,weight:700,align:'center',background:false},fadeIn:0,fadeOut:0,keyframes:[]};state.clips.push(c);state.selected=c.id;renderAll();markDirty(); }
function createTrack(kind='video') { const counts={video:state.tracks.filter(t=>t.kind==='video').length+1,audio:state.tracks.filter(t=>t.kind==='audio').length+1,text:state.tracks.filter(t=>t.kind==='text').length+1};const id=uid();state.tracks.unshift({id,name:`${kind==='video'?'Vidéo':kind==='audio'?'Audio':'Texte'} ${counts[kind]}`,kind,muted:false,hidden:false,locked:false});renderTimeline();markDirty();return trackById(id); }
function removeClip(id) { const c=state.clips.find(x=>x.id===id);if(!c)return;state.clips=state.clips.filter(x=>x.id!==id);if(state.selected===id)state.selected=null;state.multiSelected.delete(id);renderAll();markDirty(); }
function selectedClip(){return state.clips.find(c=>c.id===state.selected)||null;}
function splitSelected() {
  const c=selectedClip();if(!c){toast('Sélectionnez un clip dans la timeline');return;}
  const at=state.playhead;if(at<=c.position+.025||at>=clipEnd(c)-.025){toast('Placez la tête de lecture à l’intérieur du clip','error');return;}
  checkpoint();const sourceCut=c.start+(at-c.position)*c.speed;
  const second={...c,id:uid(),position:at,start:sourceCut,transform:{...c.transform},filters:{...c.filters},style:c.style?{...c.style}:undefined,keyframes:(c.keyframes||[]).filter(k=>k.time>(at-c.position)).map(k=>({...k,time:k.time-(at-c.position)}))};
  c.end=sourceCut;c.keyframes=(c.keyframes||[]).filter(k=>k.time<=(at-c.position));
  state.clips.push(second);state.selected=second.id;renderAll();markDirty();toast('Clip fractionné','success');
}
function duplicateSelected() {const chosen=state.multiSelected.size?[...state.multiSelected].map(id=>state.clips.find(c=>c.id===id)).filter(Boolean):[selectedClip()].filter(Boolean);if(!chosen.length)return;checkpoint();const ids=[];for(const c of chosen){const copy={...c,id:uid(),position:clipEnd(c)+.05,transform:{...c.transform},filters:c.filters?{...c.filters}:undefined,style:c.style?{...c.style}:undefined,keyframes:(c.keyframes||[]).map(k=>({...k}))};state.clips.push(copy);ids.push(copy.id);}state.selected=ids[0];state.multiSelected=new Set(ids);renderAll();markDirty();}
function deleteSelected() {const ids=state.multiSelected.size?[...state.multiSelected]:state.selected?[state.selected]:[];if(!ids.length)return;checkpoint();state.clips=state.clips.filter(c=>!ids.includes(c.id));state.selected=null;state.multiSelected.clear();renderAll();markDirty();}
function snapPosition(c,position) {if(!state.project.snap)return Math.max(0,position);const threshold=10/state.zoom;let best=position;let dist=threshold;for(const other of state.clips){if(other.id===c.id)continue;for(const t of [other.position,clipEnd(other)]){const d=Math.abs(t-position);if(d<dist){best=t;dist=d;}}}for(const t of [state.playhead,0]){const d=Math.abs(t-position);if(d<dist){best=t;dist=d;}}return Math.max(0,best);}
function timelineScaleWidth(){return Math.max(800,(projectDuration()+12)*state.zoom);}
function renderTimeline() {
  const width=timelineScaleWidth();UI.timelineInner.style.width=(88+width)+'px';UI.ruler.style.width=width+'px';UI.rulerTicks.innerHTML='';
  const step=state.zoom<24?5:state.zoom<42?2:1;for(let t=0;t<=Math.ceil(width/state.zoom);t+=step){const tick=document.createElement('div');tick.className='ruler-tick';tick.style.left=(t*state.zoom)+'px';tick.textContent=fmt(t).slice(3,8);UI.rulerTicks.append(tick);}
  UI.trackList.innerHTML='';
  state.tracks.forEach(track=>{
    const row=document.createElement('div');row.className='track-row';row.dataset.trackId=track.id;row.dataset.type=track.kind;
    const label=document.createElement('div');label.className='track-label';label.innerHTML=`<span class="track-symbol">${track.kind==='video'?'▣':track.kind==='audio'?'♫':'T'}</span><span class="track-name" title="Double-cliquer pour renommer">${esc(track.name)}</span><span class="track-controls"><button data-track-action="mute" class="${track.muted?'active':''}" title="Muet">${track.kind==='audio'?'M':'◉'}</button><button data-track-action="hide" class="${track.hidden?'active':''}" title="Masquer">◌</button><button data-track-action="lock" class="${track.locked?'active':''}" title="Verrouiller">${track.locked?'▣':'□'}</button></span>`;
    label.addEventListener('click',e=>{const action=e.target.closest('[data-track-action]')?.dataset.trackAction;if(action){checkpoint();if(action==='mute')track.muted=!track.muted;else if(action==='hide')track.hidden=!track.hidden;else if(action==='lock')track.locked=!track.locked;renderAll();markDirty();e.stopPropagation();}});
    label.querySelector('.track-name').addEventListener('dblclick',()=>{const name=prompt('Nom de la piste',track.name);if(name?.trim()){checkpoint();track.name=name.trim();renderTimeline();markDirty();}});
    const lane=document.createElement('div');lane.className='track-lane';lane.style.width=width+'px';lane.style.backgroundSize=`${state.zoom}px 100%`;lane.dataset.trackId=track.id;lane.addEventListener('click',e=>{if(e.target.closest('.timeline-clip'))return;const rect=lane.getBoundingClientRect();stopPlayback();seek(Math.max(0,(e.clientX-rect.left)/state.zoom));});
    lane.addEventListener('dragover',e=>{e.preventDefault();lane.classList.add('drop-active')});lane.addEventListener('dragleave',()=>lane.classList.remove('drop-active'));lane.addEventListener('drop',e=>{e.preventDefault();lane.classList.remove('drop-active');const id=e.dataTransfer.getData('application/x-aniss-asset');if(id)addAssetToTimeline(id,track.id,Math.max(0,(e.clientX-lane.getBoundingClientRect().left)/state.zoom));});
    for(const c of trackClips(track.id)) lane.append(buildClipNode(c));
    row.append(label,lane);UI.trackList.append(row);
  });
  updatePlayheadUI();$('timelineDuration').textContent=fmt(projectDuration()).slice(3,8);$('timelineStatus').textContent=state.playing?'Lecture en cours':'Prêt';$('selectionStatus').textContent=state.multiSelected.size?`${state.multiSelected.size} élément${state.multiSelected.size>1?'s':''} sélectionné${state.multiSelected.size>1?'s':''}`:'Aucun élément sélectionné';
}
function buildClipNode(c) {
  const asset=assetById(c.assetId),node=document.createElement('div');node.className=`timeline-clip ${c.type==='audio'?'audio':c.type==='text'||c.type==='shape'?'text':c.type==='image'?'image':''}${(state.selected===c.id||state.multiSelected.has(c.id))?' selected':''}`;node.dataset.clipId=c.id;node.style.left=(c.position*state.zoom)+'px';node.style.width=Math.max(14,clipDuration(c)*state.zoom)+'px';node.title=c.type==='text'?c.text:asset?.name||c.type;
  if(asset?.type==='image'){const bg=document.createElement('div');bg.className='clip-thumb';bg.style.backgroundImage=`url("${asset.url}")`;node.append(bg);}
  const name=document.createElement('span');name.className='clip-label';name.textContent=c.type==='text'?c.text:c.type==='shape'?`Forme · ${c.shape}`:asset?.name||'Média';node.append(name);
  const meta=document.createElement('span');meta.className='clip-meta';meta.textContent=`${fmt(c.position).slice(3,8)} · ${fmt(clipEnd(c)).slice(3,8)}`;node.append(meta);
  if(c.type==='audio'&&asset?.waveform){const wave=document.createElement('div');wave.className='clip-wave';asset.waveform.slice(0,80).forEach(v=>{const bar=document.createElement('i');bar.style.height=Math.max(2,v*14)+'px';wave.append(bar);});node.append(wave);}
  if(c.fadeIn>0){const x=document.createElement('i');x.className='clip-transition';x.style.left='0';x.style.width=Math.max(8,c.fadeIn*state.zoom)+'px';node.append(x);}if(c.fadeOut>0){const x=document.createElement('i');x.className='clip-transition';x.style.right='0';x.style.width=Math.max(8,c.fadeOut*state.zoom)+'px';node.append(x);}
  const left=document.createElement('i'),right=document.createElement('i');left.className='clip-handle left';right.className='clip-handle right';node.append(left,right);
  node.addEventListener('pointerdown',e=>startClipDrag(e,c,node));node.addEventListener('click',e=>{if(suppressNextClick){suppressNextClick=false;return;}if(dragState?.moved)return;if(e.ctrlKey||e.metaKey){if(state.multiSelected.has(c.id)){state.multiSelected.delete(c.id);if(state.selected===c.id)state.selected=[...state.multiSelected].at(-1)||null;}else{state.multiSelected.add(c.id);state.selected=c.id;}if(!state.multiSelected.size)state.selected=null;}else{state.selected=c.id;state.multiSelected=new Set([c.id]);}renderTimeline();renderInspector();});return node;
}
function startClipDrag(e,c,node) {
  if(e.button!==0)return;const track=trackById(c.trackId);if(track?.locked){toast('Piste verrouillée');return;}
  const handle=e.target.classList.contains('clip-handle')?(e.target.classList.contains('left')?'left':'right'):null;
  if(!state.multiSelected.has(c.id)){state.selected=c.id;state.multiSelected=new Set([c.id]);}const group=state.multiSelected.size>1?[...state.multiSelected].map(id=>state.clips.find(x=>x.id===id)).filter(Boolean):state.clips.filter(x=>c.linkGroup&&x.linkGroup===c.linkGroup);dragState={id:c.id,mode:handle||'move',startX:e.clientX,origPosition:c.position,origStart:c.start,origEnd:c.end,moved:false,origTrack:c.trackId,before:snapshot(),group:group.map(x=>({id:x.id,position:x.position,trackId:x.trackId}))};
  node.setPointerCapture(e.pointerId);const move=ev=>{
    if(!dragState)return;const delta=(ev.clientX-dragState.startX)/state.zoom;if(Math.abs(delta)>.025)dragState.moved=true;if(!dragState.moved)return;
    if(dragState.mode==='move'){const newPos=snapPosition(c,dragState.origPosition+delta);c.position=newPos;const applied=newPos-dragState.origPosition;for(const item of dragState.group){const linked=state.clips.find(x=>x.id===item.id);if(linked&&linked.id!==c.id)linked.position=Math.max(0,item.position+applied);}const lane=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.track-lane');if(lane){const candidate=trackById(lane.dataset.trackId);if(candidate&&candidate.kind===trackById(c.trackId)?.kind&&!candidate.locked)c.trackId=candidate.id;}}
    else if(dragState.mode==='left'){const change=clamp(delta,-dragState.origPosition,clipDuration(c)*c.speed-.04);c.position=dragState.origPosition+change;c.start=Math.max(0,dragState.origStart+change*c.speed);}
    else {const asset=assetById(c.assetId),limit=asset?.duration||dragState.origEnd+100;c.end=clamp(dragState.origEnd+delta*c.speed,c.start+.04,limit);}
    node.style.left=c.position*state.zoom+'px';node.style.width=Math.max(14,clipDuration(c)*state.zoom)+'px';
  };
  const up=()=>{node.removeEventListener('pointermove',move);node.removeEventListener('pointerup',up);node.removeEventListener('pointercancel',up);if(dragState?.moved){suppressNextClick=true;setTimeout(()=>suppressNextClick=false,80);state.history.push(dragState.before);if(state.history.length>100)state.history.shift();state.future=[];updateHistoryButtons();renderAll();markDirty();}dragState=null;};node.addEventListener('pointermove',move);node.addEventListener('pointerup',up);node.addEventListener('pointercancel',up);
}
function updatePlayheadUI() {UI.rulerPlayhead.style.left=(state.playhead*state.zoom)+'px';document.querySelectorAll('.track-lane').forEach(l=>{let p=l.querySelector('.timeline-playhead-lane');if(!p){p=document.createElement('div');p.className='timeline-playhead-lane';l.append(p);}p.style.left=(state.playhead*state.zoom)+'px';});$('currentTime').textContent=fmt(state.playhead,true);$('durationTime').textContent=fmt(projectDuration(),true);$('hudTime').textContent=fmt(state.playhead);$('timelineDuration').textContent=fmt(projectDuration()).slice(3,8);}
function renderAll(){renderAssets();renderTimeline();renderInspector();drawFrame(state.playhead);updateHistoryButtons();}

/* Keyframes, compositing and preview */
function keyframeValues(c,time) {
  const frames=(c.keyframes||[]).slice().sort((a,b)=>a.time-b.time);if(!frames.length)return {...(c.transform||{}),opacity:c.opacity??1};
  const local=time-c.position;let before=null,after=null;for(const f of frames){if(f.time<=local)before=f;if(f.time>=local&&!after)after=f;}
  if(!before)return {...(frames[0].values||{}),opacity:frames[0].values?.opacity??c.opacity??1};if(!after)return {...(before.values||{}),opacity:before.values?.opacity??c.opacity??1};if(before===after)return {...before.values};
  const p=clamp((local-before.time)/(after.time-before.time),0,1),out={};const keys=new Set([...Object.keys(before.values||{}),...Object.keys(after.values||{})]);for(const key of keys){const a=before.values?.[key]??c.transform?.[key]??c.opacity??0,b=after.values?.[key]??a;out[key]=typeof a==='number'&&typeof b==='number'?a+(b-a)*p:b;}return out;
}
function fadeOpacity(c,time) {let o=c.opacity??1;if(c.fadeIn>0)o*=clamp((time-c.position)/c.fadeIn,0,1);if(c.fadeOut>0)o*=clamp((clipEnd(c)-time)/c.fadeOut,0,1);return o;}
function fitSource(source,w,h) {
  const sw=source.videoWidth||source.naturalWidth||source.width,sh=source.videoHeight||source.naturalHeight||source.height;if(!sw||!sh)return null;
  const factor=Math.min(w/sw,h/sh);return {x:(w-sw*factor)/2,y:(h-sh*factor)/2,w:sw*factor,h:sh*factor};
}
function drawClipVisual(c,time) {
  const a=assetById(c.assetId);if(!a||!a.element)return;
  const source=a.element;if(a.type==='video'&&source.readyState<2)return;
  const vals=keyframeValues(c,time),trans=c.transform||{},w=UI.previewCanvas.width,h=UI.previewCanvas.height,alpha=fadeOpacity(c,time)*(vals.opacity??1);
  if(alpha<=0)return;const rect=fitSource(source,w,h);if(!rect)return;
  ctx.save();ctx.globalAlpha=clamp(alpha,0,1);ctx.translate(w/2+(vals.x??trans.x??0),h/2+(vals.y??trans.y??0));ctx.rotate(((vals.rotation??trans.rotation??0)*Math.PI)/180);const scale=vals.scale??trans.scale??1;ctx.scale(scale,scale);ctx.filter=`brightness(${c.filters?.brightness??100}%) contrast(${c.filters?.contrast??100}%) saturate(${c.filters?.saturation??100}%) blur(${c.filters?.blur??0}px)`;ctx.drawImage(source,rect.x-w/2,rect.y-h/2,rect.w,rect.h);ctx.restore();
}
function drawTextClip(c,time) {
  const w=UI.previewCanvas.width,h=UI.previewCanvas.height,vals=keyframeValues(c,time),tr=c.transform||{},style=c.style||{},fontSize=(style.fontSize||62)*(vals.scale??tr.scale??1);let text=c.text||'';if(c.type==='shape'){drawShape(c,vals);return;}
  ctx.save();ctx.globalAlpha=clamp(fadeOpacity(c,time)*(vals.opacity??1),0,1);ctx.translate(w/2+(vals.x??tr.x??0),h*(vals.y??tr.y??.5));ctx.rotate(((vals.rotation??tr.rotation??0)*Math.PI)/180);ctx.textAlign=style.align||'center';ctx.textBaseline='middle';ctx.font=`${style.italic?'italic ':''}${style.weight||700} ${fontSize}px ${style.font||'Inter, system-ui, sans-serif'}`;
  const lines=text.split('\n'),lineHeight=fontSize*1.18,maxWidth=w*.88,metrics=lines.map(line=>ctx.measureText(line).width);const widest=Math.min(maxWidth,Math.max(1,...metrics));
  if(style.background){const pad=style.padding||15;ctx.fillStyle=style.backgroundColor||'#111827dd';roundRect(ctx,-widest/2-pad,-(lines.length*lineHeight)/2-pad,widest+pad*2,lines.length*lineHeight+pad*2,12);ctx.fill();}
  ctx.fillStyle=style.color||'#fff';ctx.shadowColor=style.shadow?'#000b':'transparent';ctx.shadowBlur=style.shadow?Math.max(5,fontSize*.12):0;ctx.shadowOffsetY=style.shadow?3:0;if(style.stroke&&style.stroke!=='#00000000'){ctx.lineWidth=Math.max(2,fontSize*.035);ctx.strokeStyle=style.stroke;lines.forEach((line,i)=>ctx.strokeText(line,0,(i-(lines.length-1)/2)*lineHeight,maxWidth));}
  lines.forEach((line,i)=>ctx.fillText(line,0,(i-(lines.length-1)/2)*lineHeight,maxWidth));ctx.restore();
}
function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function drawShape(c,vals){const w=UI.previewCanvas.width,h=UI.previewCanvas.height,t=c.transform||{},s=c.style||{},x=w/2+(vals.x??t.x??0),y=h/2+(vals.y??t.y??0),size=s.fontSize||180;ctx.save();ctx.globalAlpha=fadeOpacity(c,state.playhead)*(vals.opacity??1);ctx.translate(x,y);ctx.rotate(((vals.rotation??t.rotation??0)*Math.PI)/180);ctx.scale(vals.scale??t.scale??1,vals.scale??t.scale??1);ctx.fillStyle=s.color||'#9a77f7';ctx.strokeStyle=s.color||'#9a77f7';ctx.lineWidth=Math.max(4,size*.05);if(c.shape==='circle'){ctx.beginPath();ctx.arc(0,0,size*.45,0,Math.PI*2);ctx.fill();}else if(c.shape==='line'){ctx.beginPath();ctx.moveTo(-size/2,0);ctx.lineTo(size/2,0);ctx.stroke();}else if(c.shape==='star'){ctx.beginPath();for(let i=0;i<10;i++){let a=-Math.PI/2+i*Math.PI/5,r=i%2?size*.2:size*.45;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();}else{ctx.beginPath();ctx.roundRect(-size*.45,-size*.25,size*.9,size*.5,12);ctx.fill();}ctx.restore();}
function activeVisualClips(time) {return state.clips.filter(c=>{const tr=trackById(c.trackId);return tr?.kind==='video'&& !tr.hidden && time>=c.position && time<clipEnd(c) && c.type!=='audio'&&c.type!=='text'&&c.type!=='shape';}).sort((a,b)=>state.tracks.findIndex(t=>t.id===b.trackId)-state.tracks.findIndex(t=>t.id===a.trackId));}
function drawFrame(time=state.playhead,realtime=false) {
  const w=UI.previewCanvas.width,h=UI.previewCanvas.height;ctx.save();ctx.clearRect(0,0,w,h);ctx.fillStyle=state.project.bg||'#000';ctx.fillRect(0,0,w,h);
  // Keep source media aligned to the active clip's local time.
  const actives=activeVisualClips(time);const activeAssetIds=new Set(actives.map(c=>c.assetId));
  for(const a of state.assets.filter(a=>a.type==='video')){const el=a.element;const c=actives.filter(x=>x.assetId===a.id).at(-1);if(c){const target=c.start+(time-c.position)*c.speed;if(el.readyState>=1&&Math.abs((el.currentTime||0)-target)>(realtime?.12:.025)){try{el.currentTime=Math.max(0,target);}catch(_){}}el.playbackRate=c.speed;if(realtime&&el.paused)el.play().catch(()=>{});if(!realtime&&!el.paused)el.pause();}else if(!el.paused)el.pause();}
  for(const c of actives)drawClipVisual(c,time);
  for(const c of state.clips){const tr=trackById(c.trackId);if(!tr||tr.hidden||time<c.position||time>=clipEnd(c))continue;if(c.type==='text'||c.type==='shape')drawTextClip(c,time);}
  if(state.project.watermark){ctx.save();ctx.font='600 18px system-ui';ctx.fillStyle='#ffffffaa';ctx.textAlign='right';ctx.fillText('ANISS STUDIO',w-24,h-22);ctx.restore();}
  ctx.restore();UI.stageEmpty.hidden=state.clips.length>0;updatePlayheadUI();
}
function seek(time) {state.playhead=clamp(time,0,Math.max(projectDuration(),0));drawFrame(state.playhead,false);}
function syncPlayback(time) {
  const active=new Set();
  for(const c of state.clips){const tr=trackById(c.trackId);if(!tr||tr.kind!=='audio'&&c.type!=='video')continue;if(tr.muted||tr.hidden||c.muted||time<c.position||time>=clipEnd(c))continue;const a=assetById(c.assetId);if(!a||!['audio','video'].includes(a.type))continue;active.add(a.id);const el=a.element;const target=c.start+(time-c.position)*c.speed;if(el.readyState>=1&&Math.abs((el.currentTime||0)-target)>.35){try{el.currentTime=target;}catch(_){}}el.playbackRate=c.speed;el.volume=clamp(c.volume??1,0,1);if(el.paused)el.play().catch(()=>{});}
  for(const a of state.assets.filter(x=>x.type==='audio'||x.type==='video'))if(!active.has(a.id)&&a.element&&!a.element.paused)a.element.pause();
}
function stopPlayback(){state.playing=false;cancelAnimationFrame(rafId);for(const a of state.assets.filter(a=>a.type==='audio'||a.type==='video'))a.element?.pause();$('playBtn').textContent='▶';$('timelineStatus').textContent='Prêt';drawFrame(state.playhead,false);}
function playbackFrame(now){if(!state.playing)return;const dt=Math.min(.1,Math.max(0,(now-lastFrameTime)/1000));lastFrameTime=now;state.playhead+=dt;if(state.playhead>=projectDuration()){stopPlayback();seek(projectDuration());return;}syncPlayback(state.playhead);drawFrame(state.playhead,true);rafId=requestAnimationFrame(playbackFrame);}
function togglePlayback(){if(state.exporting)return;if(state.playing){stopPlayback();return;}if(!projectDuration()){toast('Ajoutez un média à la timeline pour lancer la lecture');return;}if(state.playhead>=projectDuration())state.playhead=0;state.playing=true;$('playBtn').textContent='Ⅱ';$('timelineStatus').textContent='Lecture en cours';lastFrameTime=performance.now();syncPlayback(state.playhead);rafId=requestAnimationFrame(playbackFrame);}
function stepFrames(delta){stopPlayback();seek(state.playhead+delta/(state.project.fps||30));}

/* Inspector */
function field(label,html){return `<div class="control-row"><label>${label}</label>${html}</div>`;}
function rangeField(label,key,value,min,max,step=1,unit='') {return `<div class="control-row"><label>${label}</label><div class="range-wrap"><input type="range" data-prop="${key}" min="${min}" max="${max}" step="${step}" value="${value}"><span data-value="${key}">${Number(value).toFixed(step<1?2:0)}${unit}</span></div></div>`;}
function renderInspector() {
  const c=selectedClip();const root=UI.inspector;
  if(!c){$('inspectorSubtitle').textContent='Paramètres du projet';root.innerHTML=`<div class="inspector-section"><div class="inspector-section-title">PROJET</div>${field('Format vidéo',`<select id="inspectorRatio"><option value="1920x1080">16:9 · Paysage</option><option value="1080x1920">9:16 · Portrait</option><option value="1080x1080">1:1 · Carré</option><option value="1080x1350">4:5 · Portrait</option><option value="1440x1080">4:3 · Classique</option><option value="2560x1440">16:9 · QHD</option><option value="3840x2160">16:9 · 4K UHD</option></select>`)}${field('Images par seconde',`<select id="inspectorFps"><option>24</option><option>25</option><option>30</option><option>50</option><option>60</option></select>`)}${field('Arrière-plan',`<input type="color" id="inspectorBg" value="${state.project.bg}">`)}</div><div class="inspector-placeholder"><div>◈</div><b>Aucun élément sélectionné</b><span>Sélectionnez un clip dans la timeline pour modifier ses propriétés, son apparence et ses animations.</span></div>`;
    $('inspectorRatio').value=`${state.project.width}x${state.project.height}`;$('inspectorFps').value=String(state.project.fps);$('inspectorBg').onchange=e=>{checkpoint();state.project.bg=e.target.value;drawFrame();markDirty();};$('inspectorRatio').onchange=e=>setProjectRatio(e.target.value);$('inspectorFps').onchange=e=>{checkpoint();state.project.fps=+e.target.value;markDirty();};return;}
  $('inspectorSubtitle').textContent=c.type==='text'?'Texte & typographie':c.type==='shape'?'Forme & apparence':c.type==='audio'?'Audio & mixage':'Vidéo & transformation';
  let html='';
  html+=`<div class="inspector-group"><div class="group-head"><b>CLIP</b><button id="resetClip">Réinitialiser</button></div>${field('Nom',`<input id="clipName" value="${esc(c.type==='text'?c.text:assetById(c.assetId)?.name||c.type)}">`)}<div class="control-inline">${field('Position (s)',`<input type="number" id="clipPosition" min="0" step="0.05" value="${c.position.toFixed(2)}">`)}${field('Vitesse',`<select id="clipSpeed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option><option value="3">3×</option></select>`)}</div><div class="control-inline">${field('Début source (s)',`<input type="number" id="clipStart" min="0" step="0.05" value="${c.start.toFixed(2)}">`)}${field('Fin source (s)',`<input type="number" id="clipEnd" min="0.05" step="0.05" value="${c.end.toFixed(2)}">`)}</div></div>`;
  if(c.type==='text') {
    html+=`<div class="inspector-group"><div class="group-head"><b>TYPOGRAPHIE</b></div>${field('Texte',`<textarea id="textValue" rows="3">${esc(c.text)}</textarea>`)}<div class="control-inline">${field('Police',`<select id="textFont"><option value="Inter, system-ui, sans-serif">Inter / Système</option><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="Impact, sans-serif">Impact</option><option value="monospace">Monospace</option></select>`)}${field('Graisse',`<select id="textWeight"><option value="400">Normal</option><option value="600">Demi-gras</option><option value="700">Gras</option><option value="800">Extra-gras</option><option value="900">Noir</option></select>`)}</div><div class="control-inline">${field('Taille (px)',`<input id="textSize" type="number" min="8" max="360" value="${c.style?.fontSize||60}">`)}${field('Couleur',`<input id="textColor" type="color" value="${c.style?.color||'#ffffff'}">`)}</div><div class="control-inline">${field('Alignement',`<select id="textAlign"><option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option></select>`)}${field('Fond',`<select id="textBackground"><option value="false">Transparent</option><option value="true">Bandeau</option></select>`)}</div><div class="inspector-action-row"><button id="textItalic">Italique</button><button id="textShadow">Ombre</button><button id="textBgColor">Style de fond</button></div></div>`;
    html+=rangeField('Position verticale','textY',c.transform?.y??.5,0,1,.01,'');
  } else if(c.type==='shape') {
    html+=`<div class="inspector-group"><div class="group-head"><b>APPARENCE</b></div>${field('Forme',`<select id="shapeType"><option value="rect">Rectangle</option><option value="circle">Cercle</option><option value="line">Ligne</option><option value="star">Étoile</option></select>`)}${field('Couleur',`<input id="shapeColor" type="color" value="${c.style?.color||'#9a77f7'}">`)}</div>`;
  }
  html+=`<div class="inspector-group"><div class="group-head"><b>TRANSFORMATION</b><button id="addKeyframe">◇ Ajouter une image clé</button></div><div class="control-inline">${field('Position X',`<input id="transformX" type="number" step="1" value="${c.transform?.x||0}">`)}${c.type==='text'?'':field('Position Y',`<input id="transformY" type="number" step="1" value="${c.transform?.y||0}">`)}</div>${rangeField('Échelle','scale',c.transform?.scale||1,.1,4,.05,'×')}${rangeField('Rotation','rotation',c.transform?.rotation||0,-180,180,1,'°')}${rangeField('Opacité','opacity',c.opacity??1,0,1,.01,'')}</div>`;
  if(c.type==='video'||c.type==='image') html+=`<div class="inspector-group"><div class="group-head"><b>AJUSTEMENTS</b><button id="filterReset">Réinitialiser</button></div>${rangeField('Luminosité','brightness',c.filters?.brightness??100,0,200,1,'%')}${rangeField('Contraste','contrast',c.filters?.contrast??100,0,200,1,'%')}${rangeField('Saturation','saturation',c.filters?.saturation??100,0,200,1,'%')}${rangeField('Flou','blur',c.filters?.blur??0,0,20,.5,' px')}<div class="inspector-action-row"><button data-filter="cinematic">Cinéma</button><button data-filter="vivid">Vif</button><button data-filter="mono">N&B</button></div></div>`;
  if(c.type==='audio'||c.type==='video') html+=`<div class="inspector-group"><div class="group-head"><b>AUDIO</b></div>${rangeField('Volume','volume',c.volume??1,0,2,.02,'×')}<div class="inspector-action-row"><button id="muteClip">${c.muted?'Activer le son':'Couper le son'}</button><button id="audioFade">Fondu audio 1 s</button></div></div>`;
  html+=`<div class="inspector-group"><div class="group-head"><b>ANIMATION & TRANSITIONS</b></div><div class="control-inline">${field('Fondu entrant (s)',`<input id="fadeIn" type="number" min="0" step="0.1" value="${c.fadeIn||0}">`)}${field('Fondu sortant (s)',`<input id="fadeOut" type="number" min="0" step="0.1" value="${c.fadeOut||0}">`)}</div><div class="inspector-action-row"><button id="fadePreset">Fondu doux</button><button id="keyframeClear">Effacer clés</button></div><p class="note">Images clés : placez la tête de lecture, ajoutez une clé, changez les paramètres, puis ajoutez une autre clé plus loin.</p></div>`;
  root.innerHTML=html;
  if($('clipSpeed'))$('clipSpeed').value=String(c.speed);
  if($('textFont'))$('textFont').value=c.style?.font||'Inter, system-ui, sans-serif';if($('textWeight'))$('textWeight').value=String(c.style?.weight||700);if($('textAlign'))$('textAlign').value=c.style?.align||'center';if($('textBackground'))$('textBackground').value=String(!!c.style?.background);if($('shapeType'))$('shapeType').value=c.shape||'rect';
  bindInspector(c);
}
function bindInspector(c) {
  const on=(id,event,fn)=>{const el=$(id);if(el)el.addEventListener(event,fn);};
  const mutate=fn=>{checkpoint();fn();renderTimeline();drawFrame(state.playhead);markDirty();};
  on('clipName','change',e=>{mutate(()=>{if(c.type==='text')c.text=e.target.value;else c.customName=e.target.value;});renderInspector();});
  on('clipPosition','change',e=>mutate(()=>c.position=Math.max(0,+e.target.value)));
  on('clipSpeed','change',e=>mutate(()=>c.speed=+e.target.value));
  on('clipStart','change',e=>mutate(()=>c.start=clamp(+e.target.value,0,c.end-.04)));
  on('clipEnd','change',e=>mutate(()=>c.end=Math.max(c.start+.04,+e.target.value)));
  on('textValue','focus',()=>checkpoint());on('textValue','input',e=>{c.text=e.target.value;drawFrame(state.playhead);renderTimeline();markDirty();});
  on('textFont','change',e=>mutate(()=>c.style.font=e.target.value));on('textWeight','change',e=>mutate(()=>c.style.weight=+e.target.value));
  on('textSize','change',e=>mutate(()=>c.style.fontSize=clamp(+e.target.value,8,360)));on('textColor','input',e=>{c.style.color=e.target.value;drawFrame();markDirty();});
  on('textAlign','change',e=>mutate(()=>c.style.align=e.target.value));on('textBackground','change',e=>mutate(()=>c.style.background=e.target.value==='true'));
  on('textItalic','click',()=>mutate(()=>c.style.italic=!c.style.italic));on('textShadow','click',()=>mutate(()=>c.style.shadow=!c.style.shadow));on('textBgColor','click',()=>mutate(()=>c.style.backgroundColor=c.style.backgroundColor==='#31214ddd'?'#121826dd':'#31214ddd'));
  on('textY','pointerdown',()=>checkpoint());on('textY','input',e=>{c.transform.y=+e.target.value;drawFrame();markDirty();});
  on('shapeType','change',e=>mutate(()=>c.shape=e.target.value));on('shapeColor','input',e=>{c.style.color=e.target.value;drawFrame();markDirty();});
  on('transformX','change',e=>mutate(()=>c.transform.x=+e.target.value));on('transformY','change',e=>mutate(()=>c.transform.y=+e.target.value));
  root.querySelectorAll('[data-prop]').forEach(input=>{let captured=false;const capture=()=>{if(!captured){checkpoint();captured=true;}};input.addEventListener('pointerdown',capture);input.addEventListener('touchstart',capture,{passive:true});input.addEventListener('input',()=>{capture();const key=input.dataset.prop,value=+input.value;if(key==='volume')c.volume=value;else if(key==='opacity')c.opacity=value;else if(['brightness','contrast','saturation','blur'].includes(key)){c.filters[key]=value;}else if(key==='textY')c.transform.y=value;else c.transform[key]=value;const out=root.querySelector(`[data-value="${key}"]`);if(out)out.textContent=key==='scale'?value.toFixed(2)+'×':key==='rotation'?value+'°':key==='blur'?value+' px':key==='opacity'||key==='textY'?Math.round(value*100)+'%':value+(key==='volume'?'×':'%');drawFrame();markDirty();});input.addEventListener('change',()=>{captured=false;renderTimeline();markDirty();});});
  on('resetClip','click',()=>{checkpoint();c.speed=1;c.volume=1;c.opacity=1;c.transform={x:0,y:0,scale:1,rotation:0};c.filters={brightness:100,contrast:100,saturation:100,blur:0};c.fadeIn=0;c.fadeOut=0;renderAll();markDirty();});
  on('filterReset','click',()=>mutate(()=>c.filters={brightness:100,contrast:100,saturation:100,blur:0}));
  root.querySelectorAll('[data-filter]').forEach(btn=>btn.onclick=()=>mutate(()=>{const p=btn.dataset.filter;c.filters=p==='cinematic'?{brightness:96,contrast:118,saturation:86,blur:0}:p==='vivid'?{brightness:105,contrast:110,saturation:145,blur:0}:p==='mono'?{brightness:100,contrast:110,saturation:0,blur:0}:{brightness:100,contrast:100,saturation:100,blur:0};}));
  on('muteClip','click',()=>mutate(()=>c.muted=!c.muted));on('audioFade','click',()=>mutate(()=>{c.fadeIn=1;c.fadeOut=1;}));
  on('fadeIn','change',e=>mutate(()=>c.fadeIn=Math.max(0,+e.target.value)));on('fadeOut','change',e=>mutate(()=>c.fadeOut=Math.max(0,+e.target.value)));
  on('fadePreset','click',()=>mutate(()=>{c.fadeIn=Math.min(1,clipDuration(c)/2);c.fadeOut=Math.min(1,clipDuration(c)/2);}));
  on('keyframeClear','click',()=>mutate(()=>c.keyframes=[]));on('addKeyframe','click',()=>addKeyframe(c));
}
function addKeyframe(c) {checkpoint();const local=clamp(state.playhead-c.position,0,clipDuration(c));const values={...(c.transform||{}),opacity:c.opacity??1};const idx=(c.keyframes||[]).findIndex(k=>Math.abs(k.time-local)<.03);if(idx>=0)c.keyframes[idx].values=values;else c.keyframes.push({time:local,values});c.keyframes.sort((a,b)=>a.time-b.time);renderInspector();renderTimeline();markDirty();toast('Image clé ajoutée','success');}
function setProjectRatio(value) {const [w,h]=value.split('x').map(Number);checkpoint();state.project.width=w;state.project.height=h;resizeCanvas();applyProjectUI();renderAll();markDirty();}
function resizeCanvas() {const w=state.project.width,h=state.project.height;UI.previewCanvas.width=w;UI.previewCanvas.height=h;UI.stage.style.aspectRatio=`${w}/${h}`;$('stageHud').querySelector('#hudFormat').textContent=`${w} × ${h} · ${(w/h).toFixed(2)}:1`;}
function applyProjectUI(){UI.projectName.value=state.project.name;$('timelineProjectName').textContent=state.project.name;if($('projectRatio'))$('projectRatio').value=`${state.project.width}x${state.project.height}`;if($('projectFps'))$('projectFps').value=String(state.project.fps);if($('projectBg'))$('projectBg').value=state.project.bg;resizeCanvas();}

/* Voice-over and speech captions */
async function toggleVoiceRecord() {
  if(voiceRecorder&&voiceRecorder.state==='recording'){voiceRecorder.stop();return;}
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});voiceChunks=[];voiceRecorder=new MediaRecorder(stream);const started=performance.now();voiceRecorder.ondataavailable=e=>{if(e.data.size)voiceChunks.push(e.data);};voiceRecorder.onstop=()=>{const blob=new Blob(voiceChunks,{type:voiceRecorder.mimeType||'audio/webm'});const ext=blob.type.includes('mp4')?'m4a':'webm';const file=new File([blob],`Voix-off ${new Date().toLocaleTimeString('fr-FR').replace(/:/g,'-')}.${ext}`,{type:blob.type});const a=createAssetFromFile(file);renderAssets();addAssetToTimeline(a.id);stream.getTracks().forEach(t=>t.stop());$('recordStatus').textContent='Enregistrement ajouté à la timeline';$('recordToggleBtn').textContent='● Enregistrer à nouveau';$('recordIndicator').classList.remove('recording');toast('Voix off ajoutée au montage','success');};voiceRecorder.start(250);$('recordIndicator').classList.add('recording');$('recordStatus').textContent='Enregistrement en cours';$('recordToggleBtn').textContent='■ Arrêter';$('recordClock').textContent='REC';
  }catch(error){toast('Accès au microphone refusé ou indisponible','error',4000);}
}
function startSpeechCaptions() {
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){toast('Reconnaissance vocale non prise en charge par ce navigateur','error',4000);return;}
  if(recognitionActive){speechRecognition?.stop();recognitionActive=false;$('autoCaptionBtn').textContent='✧ Sous-titres vocaux (bêta)';return;}
  speechRecognition=new Recognition();speechRecognition.lang='fr-FR';speechRecognition.continuous=true;speechRecognition.interimResults=false;recognitionActive=true;$('autoCaptionBtn').textContent='■ Arrêter la dictée';toast('Parlez : chaque phrase reconnue sera ajoutée comme sous-titre');
  speechRecognition.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){if(!e.results[i].isFinal)continue;const words=e.results[i][0].transcript.trim();if(!words)continue;checkpoint();const duration=Math.max(2,words.split(/\s+/).length*.32);const track=firstTrack('text');state.clips.push({id:uid(),type:'text',text:words,preset:'subtitle',trackId:track.id,position:state.playhead,start:0,end:duration,speed:1,opacity:1,transform:{x:0,y:.84,scale:1,rotation:0},style:{fontSize:38,weight:700,color:'#ffffff',font:'Inter, system-ui, sans-serif',align:'center',background:true,backgroundColor:'#090d18cc',padding:16,shadow:true},fadeIn:.12,fadeOut:.12,keyframes:[]});state.playhead+=duration;renderAll();markDirty();}};
  speechRecognition.onerror=e=>{toast(`Reconnaissance vocale : ${e.error}`,'error');recognitionActive=false;$('autoCaptionBtn').textContent='✧ Sous-titres vocaux (bêta)';};speechRecognition.onend=()=>{recognitionActive=false;$('autoCaptionBtn').textContent='✧ Sous-titres vocaux (bêta)';};speechRecognition.start();
}

/* Export */
function setExportProgress(label,percent){$('exportProgressWrap').hidden=false;$('exportProgressLabel').textContent=label;$('exportProgressValue').textContent=`${Math.round(percent)}%`;$('exportProgressBar').style.width=`${percent}%`;}
function supportedMime(format) {const candidates=format==='mp4'?['video/mp4;codecs="avc1.42E01E,mp4a.40.2"','video/mp4']:format==='webm'?['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']:['video/mp4;codecs="avc1.42E01E,mp4a.40.2"','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];return candidates.find(m=>MediaRecorder.isTypeSupported(m));}
function decodeAudioFile(file,ac) {return file.arrayBuffer().then(buf=>ac.decodeAudioData(buf.slice(0)));}
async function exportProject() {
  if(state.exporting)return;if(!state.clips.length){toast('Ajoutez des éléments à la timeline avant l’export','error');return;}
  if(!UI.previewCanvas.captureStream||!window.MediaRecorder){toast('Cet appareil/navigateur ne prend pas en charge le rendu vidéo natif. Essayez Safari récent, Chrome ou Edge.','error',5000);return;}
  const fps=+$('exportFps').value,format=$('exportFormat').value,quality=+$('exportBitrate').value,includeAudio=$('exportAudio').checked;state.project.watermark=$('exportWatermark').checked;
  const mime=supportedMime(format);if(!mime){toast(format==='mp4'?'Encodage MP4 non disponible dans ce navigateur. Choisissez Automatique ou WebM.':'Aucun format vidéo compatible détecté.','error',5000);return;}
  let [width,height]=[state.project.width,state.project.height];const resolution=$('exportResolution').value;if(resolution!=='project'){const target=+resolution,ratio=width/height;height=target;width=Math.round(target*ratio);if(width>3840||height>3840){toast('Résolution trop élevée pour cet appareil','error');return;}}
  const oldWidth=UI.previewCanvas.width,oldHeight=UI.previewCanvas.height;resizeCanvas();if(width!==oldWidth||height!==oldHeight){UI.previewCanvas.width=width;UI.previewCanvas.height=height;}
  const length=projectDuration();if(!length){toast('La timeline est vide','error');return;}
  state.exporting=true;exportStop=false;stopPlayback();$('startExportBtn').disabled=true;$('cancelExportBtn').textContent='Arrêter';
  let stream=null,recorder=null,ac=null,audioDestination=null,sourceNodes=[],chunks=[];
  try {
    setExportProgress('Préparation de la scène…',1);
    const preferred=mime.includes('mp4')?'mp4':'webm';$('exportSummary').textContent=`${width} × ${height} · ${fps} FPS · ${fmt(length)} · ${preferred.toUpperCase()}`;
    const canvasStream=UI.previewCanvas.captureStream(fps);const outTracks=[...canvasStream.getVideoTracks()];
    if(includeAudio){const AC=window.AudioContext||window.webkitAudioContext;if(AC){ac=new AC();await ac.resume();audioDestination=ac.createMediaStreamDestination();
      const audioClips=state.clips.filter(c=>{const tr=trackById(c.trackId);return !tr?.muted&&!c.muted&&(tr?.kind==='audio'||c.type==='video')&&['audio','video'].includes(c.type);});
      for(let i=0;i<audioClips.length;i++){if(exportStop)throw new Error('Export arrêté');const c=audioClips[i],a=assetById(c.assetId);if(!a?.file)continue;setExportProgress(`Préparation audio ${i+1}/${audioClips.length}…`,Math.min(17,2+i/Math.max(1,audioClips.length)*15));try{const buffer=await decodeAudioFile(a.file,ac),source=ac.createBufferSource(),gain=ac.createGain();source.buffer=buffer;source.playbackRate.value=c.speed;gain.gain.value=c.volume??1;source.connect(gain);gain.connect(audioDestination);const startAt=ac.currentTime+Math.max(0,c.position),fadeIn=Math.min(c.fadeIn||0,clipDuration(c)/2),fadeOut=Math.min(c.fadeOut||0,clipDuration(c)/2);if(fadeIn>0){gain.gain.setValueAtTime(0,startAt);gain.gain.linearRampToValueAtTime(c.volume??1,startAt+fadeIn);}if(fadeOut>0){const endAt=startAt+clipDuration(c);gain.gain.setValueAtTime(c.volume??1,Math.max(startAt,endAt-fadeOut));gain.gain.linearRampToValueAtTime(0,endAt);}source.start(startAt,c.start,Math.max(.02,c.end-c.start));sourceNodes.push(source);}catch(err){console.warn('Piste audio ignorée à l’export',a.name,err);}}
      outTracks.push(...audioDestination.stream.getAudioTracks());
    }}
    stream=new MediaStream(outTracks);recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:quality,audioBitsPerSecond:192000});recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
    const finished=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||new Error('Erreur MediaRecorder'));});
    recorder.start(750);const started=performance.now();let lastYield=started;
    await new Promise((resolve,reject)=>{
      const frame=now=>{
        if(exportStop){if(recorder.state!=='inactive')recorder.stop();reject(new Error('Export arrêté'));return;}
        const t=Math.min(length,(now-started)/1000);state.playhead=t;drawFrame(t,true);const pct=18+t/length*80;setExportProgress(`Rendu vidéo… ${fmt(t)} / ${fmt(length)}`,pct);
        if(t>=length){if(recorder.state!=='inactive')recorder.stop();resolve();return;}
        rafId=requestAnimationFrame(frame);
      };rafId=requestAnimationFrame(frame);
    });
    await finished;
    if(!chunks.length)throw new Error('Le navigateur n’a produit aucune donnée vidéo.');
    const blob=new Blob(chunks,{type:mime});if(blob.size<1000)throw new Error('Fichier rendu trop petit : vérifiez les codecs de vos médias.');
    const extension=mime.includes('mp4')?'mp4':'webm';const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${(state.project.name||'ANISS-STUDIO').replace(/[^a-z0-9-_]+/gi,'-')}.${extension}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),120000);
    setExportProgress(`Export terminé · ${prettySize(blob.size)}`,100);toast(`Export vidéo terminé (${extension.toUpperCase()} · ${prettySize(blob.size)})`,'success',5000);
  } catch(error) {if(error.message!=='Export arrêté')toast(`Export impossible : ${error.message}`,'error',6000);setExportProgress(error.message,0);}
  finally {cancelAnimationFrame(rafId);sourceNodes.forEach(s=>{try{s.stop();}catch(_){}});if(stream)stream.getTracks().forEach(t=>t.stop());if(ac)await ac.close().catch(()=>{});state.exporting=false;state.playhead=0;UI.previewCanvas.width=oldWidth;UI.previewCanvas.height=oldHeight;resizeCanvas();drawFrame(0);$('startExportBtn').disabled=false;$('cancelExportBtn').textContent='Fermer';}
}

/* Project package (.asp JSON with embedded source media) */
function blobToDataURL(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});}
function dataURLToBlob(dataURL){const [meta,data]=dataURL.split(',');const mime=meta.match(/:(.*?);/)?.[1]||'application/octet-stream';const binary=atob(data);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new Blob([bytes],{type:mime});}
async function exportProjectFile(includeMedia=true){try{toast('Préparation du fichier projet…');const payload={app:'ANISS STUDIO',version:'PRO-1.0',project:cloneSerializable(),tracks:state.tracks,clips:state.clips,media:[]};if(includeMedia){for(let i=0;i<state.assets.length;i++){const a=state.assets[i];payload.media.push({id:a.id,name:a.name,type:a.type,mime:a.mime||a.file.type,duration:a.duration,stock:a.stock,data:await blobToDataURL(a.file)});}}const blob=new Blob([JSON.stringify(payload)],{type:'application/x-aniss-project'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${(state.project.name||'ANISS-STUDIO').replace(/[^a-z0-9-_]+/gi,'-')}.asp`;link.click();setTimeout(()=>URL.revokeObjectURL(url),120000);toast(`Projet exporté · ${prettySize(blob.size)}`,'success',5000);}catch(error){toast(`Impossible d’exporter le projet : ${error.message}`,'error',5000);}}
async function importProjectFile(file){try{const text=await file.text(),data=JSON.parse(text);if(data.app!=='ANISS STUDIO')throw new Error('Ce fichier ne semble pas être un projet ANISS STUDIO.');stopPlayback();state.assets.forEach(a=>URL.revokeObjectURL(a.url));state.assets=[];persistedMediaIds.clear();state.clips=data.clips||data.project?.clips||[];state.tracks=data.tracks||data.project?.tracks||state.tracks;state.project={...state.project,...data.project?.project};state.selected=null;state.multiSelected.clear();for(const item of data.media||[]){const blob=dataURLToBlob(item.data),sourceFile=new File([blob],item.name,{type:item.mime||blob.type});createAssetFromFile(sourceFile,item.name,{id:item.id,type:item.type,duration:item.duration,stock:item.stock});}applyProjectUI();renderAll();seek(0);markDirty();toast('Projet importé avec ses médias','success',5000);}catch(error){toast(`Ouverture impossible : ${error.message}`,'error',5000);}}

/* UI wiring */
function bindUI() {
  $('importBtn').onclick=$('browseBtn').onclick=$('importTopBtn').onclick=()=>$('fileInput').click();$('audioImportBtn').onclick=()=>$('fileInput').click();$('fileInput').onchange=e=>{addFiles(e.target.files);e.target.value='';};
  $('dropzone').ondragover=e=>{e.preventDefault();$('dropzone').classList.add('dragover');};$('dropzone').ondragleave=()=>$('dropzone').classList.remove('dragover');$('dropzone').ondrop=e=>{e.preventDefault();$('dropzone').classList.remove('dragover');addFiles(e.dataTransfer.files);};
  document.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes('Files'))e.preventDefault();});document.addEventListener('drop',e=>{if(e.target.closest?.('#dropzone'))return;if(e.dataTransfer?.files?.length){e.preventDefault();addFiles(e.dataTransfer.files);}});
  $('mediaSearch').oninput=renderAssets;$('mediaFilter').onchange=renderAssets;
  document.querySelectorAll('.panel-tab').forEach(btn=>btn.onclick=()=>{state.currentLibrary=btn.dataset.library;document.querySelectorAll('.panel-tab').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('.library-view').forEach(v=>v.classList.toggle('active',v.id===`library-${state.currentLibrary}`));});
  $('playBtn').onclick=togglePlayback;$('stepBackBtn').onclick=()=>stepFrames(-1);$('stepForwardBtn').onclick=()=>stepFrames(1);$('jumpStartBtn').onclick=()=>{stopPlayback();seek(0);};$('jumpEndBtn').onclick=()=>{stopPlayback();seek(projectDuration());};
  $('resetInspectorBtn').onclick=()=>{state.selected=null;state.multiSelected.clear();renderInspector();renderTimeline();};
  $('splitBtn').onclick=splitSelected;$('duplicateBtn').onclick=duplicateSelected;$('deleteBtn').onclick=deleteSelected;$('addTrackBtn').onclick=()=>{const kind=prompt('Type de piste : video, audio ou text','video');if(kind&&['video','audio','text'].includes(kind)){createTrack(kind);toast('Piste ajoutée','success');}};
  $('snapBtn').onclick=()=>{state.project.snap=!state.project.snap;$('snapBtn').dataset.active=String(state.project.snap);markDirty();};$('linkBtn').onclick=()=>{const chosen=state.clips.filter(c=>state.multiSelected.has(c.id));if(chosen.length<2){toast('Ctrl/Cmd + clic sur plusieurs clips, puis appuyez sur Lier.');return;}const existing=chosen.every(c=>c.linkGroup)&&new Set(chosen.map(c=>c.linkGroup)).size===1;if(existing){checkpoint();chosen.forEach(c=>delete c.linkGroup);$('linkBtn').dataset.active='false';toast('Liaison supprimée');}else{checkpoint();const group=uid();chosen.forEach(c=>c.linkGroup=group);$('linkBtn').dataset.active='true';toast(`${chosen.length} clips liés`,'success');}markDirty();renderTimeline();};
  $('timelineZoom').oninput=e=>{state.zoom=+e.target.value;renderTimeline();};$('zoomInBtn').onclick=()=>{state.zoom=Math.min(160,state.zoom*1.2);$('timelineZoom').value=state.zoom;renderTimeline();};$('zoomOutBtn').onclick=()=>{state.zoom=Math.max(12,state.zoom/1.2);$('timelineZoom').value=state.zoom;renderTimeline();};$('fitTimelineBtn').onclick=()=>{const available=UI.timelineScroll.clientWidth-110;state.zoom=clamp(available/Math.max(8,projectDuration()+2),12,160);$('timelineZoom').value=state.zoom;renderTimeline();};
  $('undoBtn').onclick=undo;$('redoBtn').onclick=redo;
  $('projectName').onchange=e=>{state.project.name=e.target.value.trim()||'Sans titre';$('timelineProjectName').textContent=state.project.name;markDirty();};
  $('projectRatio').onchange=e=>setProjectRatio(e.target.value);$('projectFps').onchange=e=>{checkpoint();state.project.fps=+e.target.value;markDirty();};$('projectBg').oninput=e=>{state.project.bg=e.target.value;drawFrame();markDirty();};
  $('fullscreenBtn').onclick=()=>{if(UI.stage.requestFullscreen)UI.stage.requestFullscreen().catch(()=>{});else toast('Plein écran non disponible');};$('safeAreaBtn').onclick=()=>{$('stageGuides').hidden=!$('stageGuides').hidden;};$('snapshotBtn').onclick=()=>{UI.previewCanvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ANISS-STUDIO-capture.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);},'image/png');};$('previewQuality').onchange=e=>{const v=+e.target.value;UI.previewCanvas.style.imageRendering=v<1?'auto':'auto';};
  $('projectBtn').onclick=e=>{const menu=$('projectMenu');menu.hidden=!menu.hidden;e.stopPropagation();};document.addEventListener('click',e=>{if(!e.target.closest('#projectMenu')&&!e.target.closest('#projectBtn'))$('projectMenu').hidden=true;});
  $('projectMenu').querySelectorAll('[data-project-action]').forEach(btn=>btn.onclick=async()=>{const action=btn.dataset.projectAction;$('projectMenu').hidden=true;if(action==='new'){if(confirm('Créer un nouveau projet ? Les médias importés resteront dans la bibliothèque.')){checkpoint();state.clips=[];state.selected=null;state.playhead=0;renderAll();markDirty();}}else if(action==='open')$('projectFileInput').click();else if(action==='save'){await persistLocal();toast('Projet sauvegardé sur cet appareil','success');}else if(action==='saveas')exportProjectFile(true);else if(action==='autosave'){state.project.autosave=!state.project.autosave;toast(`Sauvegarde automatique ${state.project.autosave?'activée':'désactivée'}`);if(state.project.autosave)markDirty();}else if(action==='settings')toast('Les préférences du projet sont disponibles dans l’inspecteur.');});
  $('projectFileInput').onchange=e=>{if(e.target.files[0])importProjectFile(e.target.files[0]);e.target.value='';};$('exportTopBtn').onclick=()=>openExport();$('startExportBtn').onclick=exportProject;$('cancelExportBtn').onclick=()=>{if(state.exporting){exportStop=true;$('cancelExportBtn').textContent='Arrêt en cours…';}else $('exportModal').hidden=true;};
  document.querySelectorAll('[data-close]').forEach(btn=>btn.onclick=()=>$(btn.dataset.close).hidden=true);$('recordVoiceBtn').onclick=()=>{$('recordModal').hidden=false;};$('recordToggleBtn').onclick=toggleVoiceRecord;$('autoCaptionBtn').onclick=startSpeechCaptions;
  document.querySelectorAll('.text-preset').forEach(btn=>btn.onclick=()=>addTitle(btn.dataset.preset));$('stickerGrid').innerHTML='';stickers.forEach(s=>{const b=document.createElement('button');b.className='sticker-btn';b.textContent=s;b.title='Ajouter '+s;b.onclick=()=>addSticker(s);$('stickerGrid').append(b);});document.querySelectorAll('[data-shape]').forEach(b=>b.onclick=()=>addShape(b.dataset.shape));
  $('storageBtn').onclick=async()=>{try{const estimate=await navigator.storage?.estimate?.();toast(estimate?`Stockage utilisé : ${prettySize(estimate.usage||0)} / ${prettySize(estimate.quota||0)}`:'Stockage local du navigateur');}catch(_){toast('Stockage local du navigateur');}};
  $('ruler').addEventListener('click',e=>{stopPlayback();const rect=$('ruler').getBoundingClientRect();seek(Math.max(0,(e.clientX-rect.left)/state.zoom));});
  document.addEventListener('keydown',e=>{const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;if(e.code==='Space'){e.preventDefault();togglePlayback();}else if(e.key.toLowerCase()==='s'){e.preventDefault();splitSelected();}else if(e.key==='Delete'||e.key==='Backspace')deleteSelected();else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();duplicateSelected();}else if(e.key==='ArrowLeft')stepFrames(-1);else if(e.key==='ArrowRight')stepFrames(1);});
  window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
}
function openExport(){if(!state.clips.length){toast('Ajoutez des éléments à la timeline avant l’export');return;}drawFrame(state.playhead);const mini=$('exportThumb'),mctx=mini.getContext('2d');mctx.drawImage(UI.previewCanvas,0,0,mini.width,mini.height);$('exportProjectName').textContent=state.project.name;$('exportSummary').textContent=`${state.project.width} × ${state.project.height} · ${state.project.fps} FPS · ${fmt(projectDuration())}`;$('exportFps').value=String(state.project.fps);$('exportProgressWrap').hidden=true;$('startExportBtn').disabled=false;$('cancelExportBtn').textContent='Annuler';$('exportModal').hidden=false;}

/* Boot */
async function boot(){bindUI();applyProjectUI();$('timelineZoom').value=state.zoom;renderAll();await restoreLocal();await loadStock();if('serviceWorker'in navigator && location.protocol!=='file:'){navigator.serviceWorker.register('./sw.js').catch(()=>{});}updateHistoryButtons();}
boot();
})();
