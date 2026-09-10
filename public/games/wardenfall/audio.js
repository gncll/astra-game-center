/* Recorded dialogue plus bounded procedural battle audio. All assets work offline. */
(()=>{'use strict';
const LINES={ready:'For the realm. Your command, my blade.',move:'On my way.',wave:'Enemies approach. Hold the line!',boss:'The siege lord approaches. Stand your ground!',clear:'The road is clear. Reinforce our defenses.',build:'Our defenses are ready.',upgrade:'Stronger than ever.',rally:'Stand together! For the realm!',meteor:'Let the heavens fall!',frost:'Winter, bind them!',won:'The realm endures. Victory is ours!',lost:'Rally the survivors. We will return.',heroDown:'I will rise again.',relic:'An ancient power is ours.',level:'The light grows stronger.'};
class WardenAudio{
 constructor(){
  this.settings={enabled:true,voice:.95,effects:.55,ambience:.16,water:.12};
  try{const p=JSON.parse(localStorage.getItem('wardenfall-audio-v1:'+window.AstraGameUserId));if(p){this.settings.enabled=p.enabled!==false;for(const k of ['voice','effects','ambience','water'])if(Number.isFinite(p[k]))this.settings[k]=Math.max(0,Math.min(1,p[k]));}}catch{}
  this.testing=Boolean(window.AstraSilentTest);this.buffers={};this.samplesStarted=false;this.unlocked=false;this.paused=false;this.ctx=null;this.lastVoice=-1e9;this.lastEffect={};this.stepTimer=0;this.natureSources={};this.voicesPlayed=0;this.activeEffects=0;this.voiceToken=0;
  this.player=document.getElementById('voice-player');this.player.dataset.audioMix='woodland-stream-v3';this.player.volume=this.settings.voice;this.player.muted=!this.settings.enabled;
  this.player.onended=()=>{this.player.dataset.playback='ended';document.getElementById('voice-caption').classList.remove('show');};
  this.player.onerror=()=>{this.player.dataset.playback='error';this.status('Voice could not load. Reload the game.');};
 }
 save(){try{localStorage.setItem('wardenfall-audio-v1:'+window.AstraGameUserId,JSON.stringify(this.settings));}catch{}}
 status(text){document.getElementById('audio-status').textContent=text;}
 async unlock(){
  if(!this.settings.enabled||this.testing||this.paused)return;
  const first=!this.unlocked;this.unlocked=true;
  try{
   if(!this.ctx){
    const a=this.ctx=new(window.AudioContext||window.webkitAudioContext)();
    this.fx=a.createGain();this.fx.gain.value=this.settings.effects;this.fx.connect(a.destination);
    this.ambient=a.createGain();this.ambient.gain.value=this.settings.ambience;this.ambient.connect(a.destination);
    this.water=a.createGain();this.water.gain.value=this.settings.water;this.water.connect(a.destination);
    this.noise=a.createBuffer(1,a.sampleRate*3,a.sampleRate);let last=0;const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++){last=(last+.035*(Math.random()*2-1))/1.035;data[i]=last*3.5;}
   }
   if(this.ctx.state==='suspended')await this.ctx.resume();
   if(!this.settings.enabled||this.paused||this.testing){this.ctx.suspend();return;}
   if(!this.samplesStarted){this.samplesStarted=true;this.loadSamples();}this.ensureNature();this.status('ElevenLabs · voices, battle, forest & flowing water');
   if(first)this.speak('ready');
  }catch{this.status('Use the sound button to enable audio.');}
 }
 async loadSamples(){
  const files=Object.fromEntries(['ranger','cannon','arcane','frost','grove','hero','step'].map(k=>[k,'sfx-'+k+'.mp3']));
  files.woodland='ambience-woodland-v3.mp3';files.stream='ambience-stream-v3.mp3';
  await Promise.all(Object.entries(files).map(async([k,file])=>{try{const r=await fetch('assets/audio/'+file);if(!r.ok)return;this.buffers[k]=await this.ctx.decodeAudioData(await r.arrayBuffer());}catch{}}));this.ensureNature();
 }
 ensureNature(){
  if(!this.settings.enabled||!this.unlocked||this.testing||this.paused||!this.ctx||this.ctx.state!=='running')return;
  for(const [key,channel] of [['woodland','ambience'],['stream','water']]){
   if(!this.buffers[key]||this.natureSources[key]||!this.settings[channel])continue;
   const source=this.ctx.createBufferSource(),fade=this.ctx.createGain(),now=this.ctx.currentTime;
   source.buffer=this.buffers[key];source.loop=true;source.connect(fade);fade.connect(channel==='ambience'?this.ambient:this.water);fade.gain.setValueAtTime(0,now);fade.gain.linearRampToValueAtTime(1,now+.8);
   this.natureSources[key]=source;source.onended=()=>{if(this.natureSources[key]===source)delete this.natureSources[key];source.disconnect();fade.disconnect();};source.start();
  }
 }
 stopNature(){for(const key of Object.keys(this.natureSources)){const source=this.natureSources[key];delete this.natureSources[key];source.stop();}}
 syncVolumes(){this.player.volume=this.settings.voice;for(const [key,node] of [['effects',this.fx],['ambience',this.ambient],['water',this.water]])if(node)node.gain.value=this.settings.enabled&&!this.testing?this.settings[key]:0;}
 setEnabled(enabled){this.settings.enabled=enabled;this.save();this.syncVolumes();if(enabled){this.player.muted=false;this.unlock();}else{this.stopNature();this.resumeVoice=false;this.player.pause();this.player.muted=true;this.player.dataset.playback='muted';if(this.ctx)this.ctx.suspend();document.getElementById('voice-caption').classList.remove('show');this.status('All sound muted');}}
 setVolume(channel,value){if(!['voice','effects','ambience','water'].includes(channel)||!Number.isFinite(value))return;this.settings[channel]=Math.max(0,Math.min(1,value));this.syncVolumes();this.ensureNature();this.save();}
 setPaused(paused){if(this.paused===paused)return;this.paused=paused;if(paused){this.stopNature();this.resumeVoice=!this.player.paused;this.player.pause();if(this.ctx)this.ctx.suspend();}else if(this.settings.enabled&&this.unlocked&&!this.testing){this.unlock();if(this.resumeVoice)this.player.play().catch(()=>{});this.resumeVoice=false;}}

 stopVoice(){this.resumeVoice=false;this.voiceToken++;this.player.pause();this.player.currentTime=0;document.getElementById('voice-caption').classList.remove('show');}
 speak(id,priority=false){
  if(this.testing||!this.settings.enabled||!this.unlocked||this.paused||!LINES[id]||this.settings.voice===0)return;
  const now=performance.now();if(!priority&&(!this.player.paused||now-this.lastVoice<3000))return;
  const token=++this.voiceToken;this.lastVoice=now;this.player.pause();this.player.src='assets/audio/'+id+'.mp3';this.player.volume=this.settings.voice;this.player.dataset.line=id;this.player.dataset.playback='starting';
  const caption=document.getElementById('voice-caption');caption.textContent='ALDRIC  ·  '+LINES[id];caption.classList.add('show');
  this.player.play().then(()=>{if(token!==this.voiceToken)return;this.voicesPlayed++;this.player.dataset.playback='playing';this.status('Voice playing · '+LINES[id]);}).catch(()=>{if(token!==this.voiceToken)return;this.player.dataset.playback='blocked';this.status('Click Test voice to enable playback.');});
 }
 play(kind){
  if(this.testing||!this.settings.enabled||!this.unlocked||this.paused||!this.ctx||this.ctx.state!=='running'||this.activeEffects>=18)return;
  kind={storm:'arcane',dragon:'cannon',spirit:'grove'}[kind]||kind;
  const a=this.ctx,now=a.currentTime;if(now-(this.lastEffect[kind]??-100)<(kind==='step'?.1:.075))return;this.lastEffect[kind]=now;
  if(this.buffers[kind]){const source=a.createBufferSource(),gain=a.createGain();source.buffer=this.buffers[kind];source.playbackRate.value=.95+Math.random()*.1;gain.gain.value=kind==='step'?.18:kind==='cannon'?.8:.55;source.connect(gain);gain.connect(this.fx);source.start();this.activeEffects++;source.onended=()=>{this.activeEffects--;source.disconnect();gain.disconnect();};return;}

  const tones={ranger:[720,170,.07],arcane:[310,900,.2],cannon:[95,28,.32],frost:[1550,410,.2],grove:[200,460,.17],hero:[520,170,.11],build:[330,660,.23],kill:[740,950,.06],meteor:[80,23,.8],wave:[200,410,.3],clear:[440,880,.3],rally:[320,640,.5],step:[110,55,.07]};
  const [from,to,duration]=tones[kind]||tones.build;const o=a.createOscillator(),g=a.createGain();o.type=['cannon','meteor','step'].includes(kind)?'triangle':'sine';o.frequency.setValueAtTime(from,now);o.frequency.exponentialRampToValueAtTime(to,now+duration);
  const volume=kind==='step'?.05:kind==='meteor'?.28:kind==='cannon'?.18:.10;g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);o.connect(g);g.connect(this.fx);o.start();o.stop(now+duration);this.activeEffects++;o.onended=()=>{this.activeEffects--;o.disconnect();g.disconnect();};
  if(['cannon','meteor','hero','step','ranger'].includes(kind)){const n=a.createBufferSource(),ng=a.createGain(),filter=a.createBiquadFilter();n.buffer=this.noise;filter.type='lowpass';filter.frequency.value=kind==='hero'?2800:kind==='ranger'?4500:600;ng.gain.setValueAtTime(kind==='meteor'?1.2:kind==='cannon'?.7:.2,now);ng.gain.exponentialRampToValueAtTime(.001,now+duration);n.connect(filter);filter.connect(ng);ng.connect(this.fx);n.start(0,Math.random());n.stop(now+duration);n.onended=()=>{n.disconnect();filter.disconnect();ng.disconnect();};}
 }
 tick(dt,movingEnemies){
  if(!this.settings.enabled||!this.unlocked||this.paused||this.testing||!this.ctx)return;
  this.stepTimer-=dt;this.ensureNature();
  if(movingEnemies&&this.stepTimer<=0){this.play('step');this.stepTimer=Math.max(.16,.42-movingEnemies*.008);}
 }

}
window.WardenAudio=WardenAudio;
})();
