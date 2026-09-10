// Local synthesized placeholder effects, not recorded skateboard samples.
export class SkateAudio {
 constructor(){this.enabled=false;this.ctx=null;}
 toggle(){if(globalThis.AstraSilentTest)return false;this.enabled=!this.enabled;if(this.enabled){this.ctx??=new AudioContext();this.ctx.resume();}return this.enabled;}
 hit(kind){if(!this.enabled||!this.ctx)return;const c=this.ctx,d=kind==='land'?.17:kind==='pop'?.07:.3;
  const buffer=c.createBuffer(1,c.sampleRate*d,c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*7);
  const src=c.createBufferSource();src.buffer=buffer;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=kind==='land'?950:2600;const gain=c.createGain();gain.gain.value=.11;src.connect(filter).connect(gain).connect(c.destination);src.start();
 }
 quiet(){this.ctx?.suspend();} resume(){if(this.enabled)this.ctx?.resume();}
}
