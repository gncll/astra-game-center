const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const nodes={},requests=[],sources=[];
 function node(id){return nodes[id]||(nodes[id]={textContent:'',dataset:{},classList:{add(){},remove(){}},paused:true,currentTime:0,volume:1,muted:false,pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}});}
 const context={window:{},document:{getElementById:node},localStorage:{getItem(){return null;},setItem(){}},performance:{now:()=>10000},Math,fetch:async url=>{requests.push(url);return{ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../../public/games/wardenfall/audio.js'),'utf8'),context);
 const a=new context.window.WardenAudio();let stops=0;
 const gain=()=>({gain:{value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}},connect(){},disconnect(){}});
 a.ctx={state:'running',currentTime:0,decodeAudioData:async()=>({duration:19.2}),createGain:gain,createBufferSource(){return{loop:false,playbackRate:{value:1},connect(){},disconnect(){},start(){sources.push(this);},stop(){stops++;this.onended?.();}};},suspend(){this.state='suspended';return Promise.resolve();},resume(){this.state='running';return Promise.resolve();}};
 a.fx=gain();a.ambient=gain();a.water=gain();a.unlocked=true;a.samplesStarted=true;a.syncVolumes();
 return{a,requests,sources,stops:()=>stops};
}
(async()=>{
 const first=setup(),a=first.a;await a.loadSamples();a.speak('wave');assert.equal(a.player.paused,false);
 a.setEnabled(false);assert(a.player.paused&&a.player.muted);assert.equal(a.fx.gain.value,0);assert.equal(a.ambient.gain.value,0);assert.equal(a.water.gain.value,0);assert.equal(Object.keys(a.natureSources).length,0);assert.equal(first.stops(),2);
 a.speak('meteor',true);a.setPaused(true);a.setPaused(false);assert.equal(a.ctx.state,'suspended');assert(a.player.paused);
 a.setVolume('water',.37);assert.equal(a.water.gain.value,0,'Volume edits cannot unmute audio');assert.equal(first.sources.length,2);
 a.setEnabled(true);await new Promise(setImmediate);assert.equal(a.water.gain.value,.37);assert.equal(first.sources.length,4);a.ensureNature();a.tick(30,0);assert.equal(first.sources.length,4,'Only one loop per nature channel');
 console.log('PASS master mute stops voices, effects, forest and water; volume edits preserve mute');
 const second=setup(),b=second.a;await b.loadSamples();assert.equal(second.sources.length,2);assert(second.sources.every(s=>s.loop));assert.equal(second.requests.filter(x=>x.includes('ambience-')).length,2);assert(!second.requests.some(x=>x.includes('sfx-forest')||x.includes('ambience-bird')),'Previous ambience is never loaded');
 b.setPaused(true);assert.equal(Object.keys(b.natureSources).length,0);b.ensureNature();assert.equal(second.sources.length,2);b.setPaused(false);await new Promise(setImmediate);assert.equal(second.sources.length,4);b.setPaused(false);assert.equal(second.sources.length,4);
 b.testing=true;b.setPaused(true);b.speak('wave',true);b.play('storm');b.ensureNature();b.tick(1,160);assert(b.player.paused);assert.equal(second.sources.length,4);
 console.log('PASS two independent recorded nature loops; pause, resume and benchmark remain bounded and silent');
 const third=setup(),c=third.a;c.unlocked=false;await c.loadSamples();assert.equal(third.sources.length,0,'Asset loading before a gesture cannot play audio');c.unlocked=true;c.setVolume('ambience',0);c.setVolume('water',0);c.stopNature();c.ensureNature();assert.equal(Object.keys(c.natureSources).length,0);c.setVolume('water',.2);assert.equal(Object.keys(c.natureSources).length,1);assert(c.natureSources.stream);
 console.log('PASS forest and stream volume controls work independently and respect autoplay consent');
})().catch(e=>{console.error(e);process.exitCode=1;});
