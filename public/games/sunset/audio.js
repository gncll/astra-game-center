export const AUDIO_FILES={city:'S01-city.mp3',engine:'S01-engine.mp3',ignition:'S01-ignition.mp3',door:'S01-door.mp3',stepA:'step-a.mp3',stepB:'step-b.mp3',radioSoul:'radio-soul.mp3',radioNight:'radio-night.mp3',dj:'radio-dj.mp3'};
export function loopBuffer(ctx,source){
 const fade=Math.min(Math.floor(source.sampleRate*.12),Math.floor(source.length/8)),n=source.length-fade,out=ctx.createBuffer(source.numberOfChannels,n,source.sampleRate);
 for(let ch=0;ch<source.numberOfChannels;ch++){const src=source.getChannelData(ch),dst=out.getChannelData(ch);dst.set(src.subarray(fade));for(let i=0;i<fade;i++){const t=i/fade;dst[n-fade+i]=src[n+i]*(1-t)+src[i]*t;}}
 return out;
}
export class GameAudio{
 constructor(context=null){this.ctx=context;this.buffers={};this.ready=false;this.enabled=false;this.steps=0;this.shots=new Set();this.error=null;this.radioOn=true;this.station=0;this.radioVolume=.65;this.introPlayed=false;this.duckUntil=0;}
 async prepare(){
  if(this.loading)return this.loading;
  this.ctx??=new (window.AudioContext||window.webkitAudioContext)();const ctx=this.ctx;
  this.master?.disconnect();this.master=ctx.createGain();this.master.gain.value=0;this.master.connect(ctx.destination);this.djGate=ctx.createGain();this.djGate.gain.value=0;this.djGate.connect(this.master);
  this.loading=(async()=>{
   await Promise.all(Object.entries(AUDIO_FILES).map(async([id,file])=>{const r=await fetch(`assets/audio/${file}`);if(!r.ok)throw new Error('Audio file '+file+' unavailable');this.buffers[id]=await ctx.decodeAudioData(await r.arrayBuffer());}));
   this.city=this.loop('city',.52);this.engine=this.loop('engine',0);this.engine.source.playbackRate.value=.75;this.radios=[this.loop('radioSoul',0),this.loop('radioNight',0)];this.bridgeMotor=this.loop('engine',0);this.bridgeMotor.source.playbackRate.value=.43;this.jet=this.loop('engine',0);this.jet.source.playbackRate.value=2.15;this.water=this.loop('city',0);this.ready=true;this.error=null;
  })().catch(e=>{this.error=e.message;this.loading=null;throw e;});return this.loading;
 }
 loop(id,gain){const c=this.ctx,source=c.createBufferSource(),level=c.createGain();source.buffer=loopBuffer(c,this.buffers[id]);source.loop=true;level.gain.value=gain;source.connect(level).connect(this.master);source.start();return {source,level};}
 async enable(v){this.enabled=v;if(!v){if(this.master)this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.025);return;}
  // Create/resume in the trusted gesture before awaiting network/decode.
  this.ctx??=new (window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')await this.ctx.resume();await this.prepare();
 }
 update({paused=false,driving=false,speed=0,throttle=0},at=this.ctx?.currentTime??0){if(!this.ready)return;this.master.gain.setTargetAtTime(this.enabled&&!paused?.8:0,at,.04);this.city.level.gain.setTargetAtTime(driving?.36:.58,at,.2);this.djGate.gain.setTargetAtTime(driving&&this.radioOn?1:0,at,.15);this.engine.level.gain.setTargetAtTime(driving?(this.radioOn?.48:.7)+Math.abs(throttle)*.13:0,at,.15);for(let i=0;i<2;i++)this.radios[i].level.gain.setTargetAtTime(driving&&this.radioOn&&this.station===i?this.radioVolume*(at<this.duckUntil?.24:1):0,at,.25);this.engine.source.playbackRate.setTargetAtTime(.7+Math.min(1.4,Math.abs(speed)*.095)+Math.abs(throttle)*.12,at,.12);}
 waterfront({bridgeDistance=1000,jetDistance=1000,moving=false,riverDistance=1000,paused=false},at=this.ctx?.currentTime??0){if(!this.ready)return;const t=at;this.bridgeMotor.level.gain.setTargetAtTime(!paused&&moving?.25/(1+bridgeDistance*bridgeDistance/1100):0,t,paused?.03:.2);this.jet.level.gain.setTargetAtTime(paused?0:.25/(1+jetDistance*jetDistance/16000),t,paused?.03:.5);this.water.level.gain.setTargetAtTime(paused?0:.10/(1+riverDistance*riverDistance/800),t,paused?.03:.4);}
 play(id,gain=1,pan=0,at=this.ctx?.currentTime??0){if(!this.ready||!this.enabled)return;const c=this.ctx,s=c.createBufferSource(),g=c.createGain(),p=c.createStereoPanner();s.buffer=this.buffers[id];g.gain.value=gain;p.pan.value=pan;s.connect(g).connect(p).connect(id==='dj'?this.djGate:this.master);this.shots.add(s);s.onended=()=>{s.disconnect();g.disconnect();p.disconnect();this.shots.delete(s);};s.start(at);}
 enterCar(at=this.ctx?.currentTime??0){if(!this.ready||!this.enabled)return;if(!this.introPlayed&&this.radioOn){this.introPlayed=true;this.duckUntil=at+4.6;this.play('dj',.7,0,at+.9);}}
 nextStation(){this.station=(this.station+1)%2;this.radioOn=true;}
 stationName(){return this.station===0?'SUNSET FM · 92.4':'AFTERHOURS · 103.1';}
 step(){this.steps++;this.play(this.steps%2?'stepA':'stepB',.82,this.steps%2?-.13:.13);}
 reset(){for(const s of this.shots){try{s.stop();}catch{}}this.shots.clear();this.steps=0;this.introPlayed=false;this.duckUntil=0;}
 status(){return !this.enabled&&!this.ctx?'Muted · Audio loads when enabled':this.error?'Audio error: '+this.error:!this.ctx?'Sound awaits your first move':!this.ready?'Audio loading':`${this.enabled?'Sound on':'Muted'} · ${Object.keys(this.buffers).length} decoded clips · ${this.ctx.state}`;}
}
