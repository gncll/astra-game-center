import {ForestDemo} from './demo-scene.js';
import {START,CABIN_ROUTE,SUPPLY_ROUTE,move,blocked,floorHeight,inCabin} from './demo-world.js';
import {createMission,updateMission,interaction,interact,objective} from './demo-mission.js';
import {createSurvival,survivalInteraction,survivalHint,startSurvival,tickSurvival,cancelSurvival,survivalGoal,survivalObjective} from './demo-survival.js?v=s02-help-1';
import {findRoute} from './demo-navigation.js';
import {CAMP,POND} from './demo-survival-layout.js';
const $=id=>document.getElementById(id),canvas=$('world'),status=$('status'),scene=new ForestDemo(canvas),keys=new Set();
let player={...START,angle:Math.PI},mission=createMission(),survival=createSurvival(),questMode='survival',auto=false,path=[],route=0,paused=false,ready=false,last=performance.now(),distance=0,stepDistance=0,stepIndex=0,sound=false,frames=[],measure=null,fpsTimer=0,front=false;
const ambience=new Audio('assets/audio/ambience-rain.mp3');ambience.loop=true;ambience.volume=.17;const activeSteps=new Set();const fireAudio=new Audio('assets/audio/ambience-campfire.mp3'),waterAudio=new Audio('assets/audio/ambience-stream-v3.mp3');fireAudio.loop=waterAudio.loop=true;
function silence(){ambience.pause();fireAudio.pause();waterAudio.pause();activeSteps.forEach(a=>a.pause());activeSteps.clear();}
function syncSound(){if(sound&&!paused&&!document.hidden){ambience.play().catch(()=>{});waterAudio.play().catch(()=>{});if(survival.fire)fireAudio.play().catch(()=>{});}else silence();}
function playEffect(file,volume=.3){if(!sound||paused||document.hidden)return;const a=new Audio('assets/audio/'+file+'.mp3');a.volume=volume;activeSteps.add(a);a.onended=()=>activeSteps.delete(a);a.play().catch(()=>activeSteps.delete(a));}
function availableInteraction(){const cabin=interaction(mission,player);if(cabin&&!survival.action)return{kind:cabin,system:'cabin',label:cabin==='door'?'E · Open door':'E · Take first-aid kit'};const action=survivalInteraction(survival,player);return action?{...action,system:'survival'}:null;}

function renderMission(){
 const q=survivalObjective(survival),cabin=questMode==='cabin';
 $('objective').textContent=cabin?objective(mission):q.title;$('quest').classList.toggle('complete',cabin?mission.complete:survival.mealReady);
 $('quest-step').textContent=cabin?(mission.complete?'FIRST AID SECURED':mission.entered?'S01 · 3 / 3':mission.doorOpen?'S01 · 2 / 3':'S01 · 1 / 3'):q.step;
 $('quest-hint').textContent=cabin?(mission.complete?'Medical supplies collected. You can return to the campfire meal.':mission.entered?'The red medical bag is on the table. Get close and press E.':mission.doorOpen?'Step inside and search the supply table.':'Follow the trail, climb the steps, then press E to open the door.'):q.hint;
 $('inventory').textContent=`Wood ${survival.wood} · Raw fish ${survival.raw} · Cooked fish ${survival.cooked}${mission.complete?' · First aid 1':''}`;
 $('survivalquest').setAttribute('aria-pressed',String(!cabin));$('cabinquest').setAttribute('aria-pressed',String(cabin));
 const action=ready&&!paused?availableInteraction():null;$('interact').hidden=!action;$('walk').hidden=!!survival.action||!!action&&!auto;
 const hint=ready&&!paused&&!action?survivalHint(survival,player):'';
 $('interaction-hint').hidden=!hint;if($('interaction-hint').textContent!==hint)$('interaction-hint').textContent=hint;
 $('interact').textContent=action?.label||'E · Interact';$('interact').classList.toggle('bite',action?.kind==='reel');
 $('walk').textContent=auto?'Stop walking':cabin?(mission.complete?'Walk back outside':mission.doorOpen?'Walk to supplies':'Walk to cabin'):!survival.woodCollected?'Walk to firewood':!survival.fire?'Walk to campfire':!survival.raw&&!survival.mealReady?'Walk to fishing bank':'Return to campfire';
 const a=survival.action;$('action-ui').hidden=!a;
 if(a){const labels={chop:'Swinging axe…',light:'Building and lighting the fire…',cast:'Casting the line…',fish:a.phase==='bite'?'BITE! Press E now':'Waiting for a bite…',catch:'Reeling in your catch…',cook:`Cooking fish · ${Math.max(0,a.duration-a.elapsed).toFixed(1)} s`,eat:'Eating the warm fish…'};$('action-label').textContent=labels[a.kind];$('action-progress').value=a.elapsed/(a.duration||a.biteAt+2.3);$('action-ui').classList.toggle('bite',a.phase==='bite');}
}
function setAuto(value){
 if(survival.action)return;auto=value;
 if(value){
  const goal=questMode==='survival'?survivalGoal(survival):mission.complete?START:mission.doorOpen?SUPPLY_ROUTE.at(-1):CABIN_ROUTE.at(-1);
  path=findRoute(player,goal,mission.doorOpen);route=0;
  if(!path.length){auto=false;status.textContent='This route is blocked. Move into the clearing with WASD and try again.';}
  else{document.body.classList.add('exploring');status.textContent='Following the route · WASD to take control';}
 }
 renderMission();
}
function restart(){
 if(measure){measure=null;$('result').textContent='Measurement stopped by restart.';}
 player={...START,angle:Math.PI};mission=createMission();survival=createSurvival();questMode='survival';silence();auto=false;path=[];route=0;distance=stepDistance=0;keys.clear();front=false;scene.reset();paused=false;
 document.body.classList.remove('paused','exploring');$('pause').textContent='Pause';$('view').textContent='Front view';status.textContent='Axe, rod and fire starter are in your backpack. Find wood for a warm meal.';renderMission();syncSound();
}
function use(){
 if(!ready||paused)return;const action=availableInteraction();if(!action){status.textContent=survivalHint(survival,player)||'Get close to the marked tree, fire ring, fishing bank or cabin door to interact.';return;}auto=false;document.body.classList.add('exploring');
 if(action.system==='cabin'){
  const done=interact(mission,player);if(done==='door')status.textContent='Door opened. Go inside and find the first-aid kit.';
  if(done==='medkit')status.textContent='First aid secured. Return to your campfire meal when ready.';
 }else{
  const done=startSurvival(survival,player);if(done){player.angle=Math.atan2(done.target.x-player.x,done.target.z-player.z);scene.yaw=player.angle+Math.PI+.3;scene.distance=3.65;status.textContent=done.kind==='wood'?'3 logs collected. Bring them to the fire ring.':'Your axe, rod and cooking gear equip automatically.';}
 }
 renderMission();canvas.focus();
}
$('survivalquest').onclick=()=>{questMode='survival';auto=false;renderMission();};$('cabinquest').onclick=()=>{questMode='cabin';auto=false;renderMission();};
$('walk').onclick=()=>{if(ready){setAuto(!auto);canvas.focus();}};$('restart').onclick=restart;$('interact').onclick=use;
$('sound').onclick=()=>{sound=globalThis.AstraSilentTest?false:!sound;$('sound').textContent=sound?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(sound));syncSound();};
$('pause').onclick=()=>{paused=!paused;keys.clear();document.body.classList.toggle('paused',paused);$('pause').textContent=paused?'Resume':'Pause';renderMission();syncSound();};
$('view').onclick=()=>{front=!front;scene.yaw=player.angle+(front?0:Math.PI)+.18;$('view').textContent=front?'Behind view':'Front view';};
const movement=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
window.addEventListener('keydown',e=>{
 if([...movement,'KeyJ','KeyL','KeyE','Escape'].includes(e.code)){
  e.preventDefault();if(!ready)return;keys.add(e.code);
  if(e.code==='Escape'&&!e.repeat)$('pause').click();if(e.code==='KeyE'&&!e.repeat)use();
  if(movement.includes(e.code)&&!paused){cancelSurvival(survival);if(auto)setAuto(false);document.body.classList.add('exploring');status.textContent=inCabin(player)?'Search the supply table · E to interact':'WASD to explore · E to use nearby objects';}
 }
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{keys.clear();last=performance.now();syncSound();if(document.hidden&&measure){$('result').textContent='Measurement interrupted: keep this tab visible.';measure=null;}});
let drag=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus();});canvas.addEventListener('pointermove',e=>{if(drag){scene.orbit(e.clientX-drag.x,e.clientY-drag.y);drag={x:e.clientX,y:e.clientY};}});canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{e.preventDefault();scene.distance=Math.max(2.2,Math.min(6,scene.distance+e.deltaY*.003));},{passive:false});
$('benchmark').onclick=()=>{if(!ready)return;measure={elapsed:0,samples:[],walkFrames:0,idleFrames:0};$('result').textContent='Measuring the current scene for 20 seconds…';};
function tick(now){
 requestAnimationFrame(tick);const raw=(now-last)/1000;last=now;if(!ready||document.hidden)return;const dt=Math.min(raw,.05);let moved=0;
 if(!paused){
  let x=0,z=0;
  if(auto&&!survival.action){const goal=path[route],dx=goal.x-player.x,dz=goal.z-player.z,d=Math.hypot(dx,dz);
   if(d<.06){route++;if(route>=path.length){auto=false;status.textContent='Destination reached. Press E to interact.';renderMission();}}
   else{x=dx/d;z=dz/d;}
  }else if(!survival.action){
   x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));z=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));const c=Math.cos(scene.yaw),s=Math.sin(scene.yaw);[x,z]=[x*c+z*s,z*c-x*s];
  }
  if(keys.has('KeyJ'))scene.yaw+=dt*1.4;if(keys.has('KeyL'))scene.yaw-=dt*1.4;
  const len=Math.hypot(x,z);if(len>0){x/=len;z/=len;const next=move(player,x*1.26*dt,z*1.26*dt,mission.doorOpen);moved=next.distance;player.x=next.x;player.z=next.z;if(moved>.0001)player.angle=Math.atan2(x,z);distance+=moved;}
  updateMission(mission,player);tickSurvival(survival,dt);renderMission();
  for(const event of survival.events.splice(0)){
   const sounds={'swing':'sfx-axe-swing','axe-hit':'sfx-axe-hit','tree-fall':'sfx-axe-hit','wood':'sfx-supply','catch':'sfx-supply','cooked':'sfx-supply','eaten':'sfx-eat'};if(sounds[event])playEffect(sounds[event]);
   const messages={'axe-hit':`Axe hit · ${survival.hits} / 4`,'tree-fall':'Timber! Wait for the tree to fall, then collect the wood.','tree-down':'The tree is down. Press E to collect the logs.','fire-lit':'Fire lit. Take your rod to the pond bank.','line-in':'Line cast. Wait for the float to dip.','bite':'A bite! Press E now!','miss':'The fish got away. Press E to cast again.','fish-secured':'Fish caught! Bring it back to the campfire.','cooked':'Dinner is ready — mission complete. Press E to eat.','eaten':'Warm and fed. You made it through your first campfire meal.','cancel':'Line reeled back in. Cast again when you are ready.'};if(messages[event])status.textContent=messages[event];if(event==='fire-lit')syncSound();
  }
  fireAudio.volume=survival.fire?.32/(1+Math.hypot(player.x-CAMP.x,player.z-CAMP.z)*.3):0;waterAudio.volume=.14/(1+Math.hypot(player.x-POND.x,player.z-POND.z)*.18);
  if(moved>0&&distance-stepDistance>.5){stepDistance=distance;if(sound){const surface=floorHeight(player.x,player.z)>.3?'wood':'dirt';const a=new Audio(`assets/audio/sfx-step-${surface}-${stepIndex++%2?'b':'a'}.mp3`);a.volume=.24;a.playbackRate=.95+(stepIndex%3)*.035;activeSteps.add(a);a.onended=()=>activeSteps.delete(a);a.play().catch(()=>activeSteps.delete(a));}}
 }
 scene.frame(player,moved>.0001,dt,paused,mission,survival);frames.push(raw*1000);if(frames.length>120)frames.shift();fpsTimer+=dt;
 if(fpsTimer>.5){fpsTimer=0;const fps=1000/(frames.reduce((a,b)=>a+b,0)/frames.length);$('metrics').textContent=`${fps.toFixed(1)} FPS · ${scene.current}\n${distance.toFixed(1)} m walked · x ${player.x.toFixed(2)} / z ${player.z.toFixed(2)} / floor ${floorHeight(player.x,player.z).toFixed(3)} m\nS02 · hits ${survival.hits}/4 · wood ${survival.wood} · fire ${survival.fire} · raw ${survival.raw} · cooked ${survival.cooked} · meal ${survival.mealReady}\nS01 · door ${mission.doorOpen?'open':'closed'} · inside ${inCabin(player)} · complete ${mission.complete}\n${scene.renderer.info.render.calls} draws · ${scene.renderer.info.render.triangles.toLocaleString()} triangles\n${innerWidth} × ${innerHeight} · DPR ${scene.renderer.getPixelRatio()}`;}
 if(measure&&!paused){measure.elapsed+=raw;if(measure.elapsed>1){measure.samples.push(raw*1000);if(moved>.0001)measure.walkFrames++;else measure.idleFrames++;}if(measure.elapsed>=20){const a=measure.samples.slice().sort((a,b)=>a-b),mean=a.reduce((x,y)=>x+y,0)/a.length;const result={fps:+(1000/mean).toFixed(2),p95ms:+a[Math.floor(a.length*.95)].toFixed(2),walkFrames:measure.walkFrames,idleFrames:measure.idleFrames,distance:+distance.toFixed(2),destinationReached:!auto,collisionFree:!blocked(player.x,player.z,.24,mission.doorOpen),floor:floorHeight(player.x,player.z),resolution:[innerWidth,innerHeight],dpr:scene.renderer.getPixelRatio(),draws:scene.renderer.info.render.calls,triangles:scene.renderer.info.render.triangles};$('result').textContent=JSON.stringify(result,null,2);measure=null;}}
}
requestAnimationFrame(tick);
try{await scene.init(text=>{status.textContent=text;globalThis.AstraGameLoading?.(text);});scene.reset();ready=true;for(const id of ['restart','view','walk'])$(id).disabled=false;status.textContent='Axe, rod and fire starter are in your backpack. Find wood for a warm meal.';renderMission();globalThis.AstraGameReady?.();}catch(error){globalThis.AstraGameError?.();status.textContent='The forest could not load. Please reload to try again.';console.error(error);}
