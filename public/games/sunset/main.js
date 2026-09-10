import {steerAroundResidents} from './resident-motion.js';
import {createCruise,cruiseInput} from './cruise.js';
import {district} from './district.js';
import {CityScene} from './scene.js';
import {START,PLACES,TOUR,move,inputVector,visit,blocked} from './world.js';
import {createCar,canEnter,exitPoint,walkingLayout,pathToCar,updateCar,carBlocked} from './vehicle.js';
import {GameAudio} from './audio.js';
const $=id=>document.getElementById(id),view=new CityScene($('world')),sound=new GameAudio(),map=$('map').getContext('2d');
let cruise=null;
let player={...START},car=createCar(),seen=new Set(),keys=new Set(),pause=false,loaded=false,tour=-1,route=[],distance=0,last=0,clock=0,toastTimer=0,drag=null,orbitUntil=0,measurement=null,probe=null,driveProbe=null,soundChoice=null,footPhase=0,mission=false,lastThrottle=0;
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');toastTimer=4;}
async function setSound(on){on=Boolean(on&&!globalThis.AstraSilentTest);soundChoice=on;$('sound').textContent=on?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(on));$('quiet').hidden=true;try{await sound.enable(on);if(on&&car.occupied)sound.enterCar();}catch(e){toast('Audio could not load. Use Sound on to retry.');}}
function unlockSound(){if(soundChoice===null)setSound(true);}
function reset(){cruise=null;player={...START};car=createCar();seen.clear();keys.clear();tour=-1;route=[];distance=0;probe=driveProbe=null;pause=false;mission=false;footPhase=0;sound.reset();$('paused').hidden=true;$('pause').textContent='Pause';$('intro').classList.remove('compact');$('status').textContent='Two blocks to explore. Find your car, follow the lights, and take the long way home.';view.reset();if(['S02','S03','S04'].includes(new URLSearchParams(location.search).get('review'))){car={...createCar(),x:1.62,z:new URLSearchParams(location.search).get('review')!=='S02'?12:5.49,angle:3.124,occupied:true};player={x:car.x,z:car.z,angle:car.angle,speed:0};view.yaw=6.27;view.pitch=.04;$('intro').classList.add('compact');soundChoice=false;sound.enabled=false;}}
function setPause(v){pause=v;keys.clear();probe=driveProbe=null;lastThrottle=0;$('paused').hidden=!v;$('pause').textContent=v?'Resume':'Pause';sound.update({paused:v||document.hidden,driving:car.occupied,speed:car.speed});}
function interact(){if(!loaded||pause||car.transition>0)return;unlockSound();
 if(car.occupied){if(Math.abs(car.speed)>.5){toast('Stop the car before getting out · Space to brake');return;}const point=exitPoint(car,view.layout);if(!point){toast('Door blocked · Move the car to an open space');return;}car.occupied=false;car.speed=0;cruise=null;car.transition=.7;player={...point,angle:car.angle,speed:0};sound.play('door',.9);keys.clear();driveProbe=null;view.ready=false;if(car.distance>=25&&!mission){mission=true;toast('S01 complete · A drive around Sunset. Welcome home.');}else toast('Parked · E to get back in');
 }else if(canEnter(player,car)){car.occupied=true;car.transition=.7;player.speed=0;tour=-1;route=[];probe=null;keys.clear();view.yaw=car.angle+Math.PI;view.pitch=.04;view.ready=false;sound.play('door',.85);sound.play('ignition',.85,0,(sound.ctx?.currentTime??0)+.2);sound.enterCar();$('intro').classList.add('compact');toast('W / S accelerate & reverse · A / D steer · Space brake');
 }else toast('Walk up to a door of the blue sports car');
}
function goToCar(){if(!loaded||pause||car.occupied)return;unlockSound();tour=-1;probe=null;route=pathToCar(player,car,view.layout);if(!route.length){toast('No clear path · Walk closer to the blue sports car');return;}$('intro').classList.add('compact');toast('Walking to your car · WASD to take over');}
window.addEventListener('keydown',e=>{
 if(e.target.tagName==='BUTTON'&&['Space','Enter'].includes(e.code))return;
 const movement=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
 if([...movement,'Space'].includes(e.code))e.preventDefault();
 if(e.code==='Space')cruise=null;
 if(!e.repeat){if(e.code==='Escape'){document.body.classList.remove('photo');setPause(!pause);}if(e.code==='KeyE')interact();if(e.code==='KeyR'){view.yaw=(car.occupied?car.angle:player.angle)+Math.PI;orbitUntil=0;}if(e.code==='KeyP')document.body.classList.toggle('photo');if(e.code==='KeyM')setSound(!sound.enabled);if(e.code==='KeyN'&&car.occupied){sound.nextStation();toast(sound.stationName());}if(e.code==='KeyB'&&car.occupied)sound.radioOn=!sound.radioOn;}
 keys.add(e.code);if(movement.includes(e.code)){cruise=null;unlockSound();tour=-1;route=[];probe=driveProbe=null;}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();probe=driveProbe=null;drag=null;lastThrottle=0;});
document.addEventListener('visibilitychange',()=>{keys.clear();probe=driveProbe=null;last=0;sound.update({paused:pause||document.hidden,driving:car.occupied,speed:car.speed});});
$('world').addEventListener('pointerdown',e=>{unlockSound();drag={x:e.clientX,y:e.clientY};$('world').setPointerCapture(e.pointerId);$('world').focus();});
$('world').addEventListener('pointermove',e=>{if(!drag)return;view.yaw-=(e.clientX-drag.x)*.005;view.pitch=Math.max(-.2,Math.min(.65,view.pitch+(e.clientY-drag.y)*.004));drag={x:e.clientX,y:e.clientY};orbitUntil=clock+4;});
$('world').addEventListener('pointerup',()=>drag=null);
$('world').addEventListener('wheel',e=>{e.preventDefault();view.distance=Math.max(2.2,Math.min(7,view.distance+e.deltaY*.003));},{passive:false});
$('tour').onclick=()=>{if(car.occupied){toast('Park and step out to explore on foot');return;}unlockSound();tour=0;route=[];setPause(false);$('intro').classList.add('compact');toast('A stroll through Sunset · WASD to take over');};
$('find-car').onclick=goToCar;$('car-guide').onclick=goToCar;$('interact').onclick=interact;
$('camera').onclick=()=>{view.yaw=(car.occupied?car.angle:player.angle)+Math.PI;view.pitch=.04;orbitUntil=0;};
$('pause').onclick=()=>setPause(!pause);$('restart').onclick=reset;$('photo').onclick=()=>document.body.classList.toggle('photo');
$('radio-next').onclick=()=>{sound.nextStation();unlockSound();};$('radio-toggle').onclick=()=>{sound.radioOn=!sound.radioOn;if(sound.radioOn)unlockSound();};$('radio-volume').oninput=e=>sound.radioVolume=Number(e.target.value)/100;
$('quiet').onclick=()=>{setSound(false);toast('Muted · M or Sound on when you want audio');};$('sound').onclick=()=>setSound(!sound.enabled);
$('reference').onclick=()=>{document.body.classList.add('reference');view.renderer.setPixelRatio(1);view.resize();};$('responsive').onclick=()=>{document.body.classList.remove('reference');view.resize();};
$('forward').onclick=()=>{if(car.occupied||pause)return;probe={x:0,z:-1,time:3};tour=-1;route=[];};$('right').onclick=()=>{if(car.occupied||pause)return;probe={x:1,z:0,time:3};tour=-1;route=[];};
for(const [id,steer,seconds] of [['drive-test',0,3],['left-test',-1,1],['right-test',1,1],['reverse-test',0,-1]])$(id).onclick=()=>{if(!car.occupied||pause)return;driveProbe={steer,time:Math.abs(seconds),reverse:seconds<0};keys.clear();};
$('cruise').onclick=()=>{if(!car.occupied||pause)return;if(car.z<2||car.z>20||Math.abs(car.x)>5||Math.abs(car.speed)>.5){toast('Start the block tour beside your original parking spot');return;}cruise=createCruise();driveProbe=null;toast('Two-block cruise · WASD or Brake to take over');};
$('brake').onclick=()=>{cruise=null;keys.clear();driveProbe={time:0,steer:0};};
$('measure').onclick=()=>{measurement={started:performance.now(),frames:[],distanceStart:distance,driveStart:car.distance};$('metrics').textContent='Measuring the current view for 10 seconds…';};
function drawMap(){const c=map;c.fillStyle='#2c4037';c.fillRect(0,0,220,160);const sx=220/120,sz=160/130,tx=x=>110+x*sx,tz=z=>12+(z+90)*sz;c.fillStyle='#717a69';for(const r of district.roads){if(r.axis==='z')c.fillRect(tx(r.at-r.width/2),tz(r.min),r.width*sx,(r.max-r.min)*sz);else c.fillRect(tx(r.min),tz(r.at-r.width/2),(r.max-r.min)*sx,r.width*sz);}c.fillStyle='#495a4b';for(const b of view.layout.buildings)c.fillRect(tx(b.x-b.w/2),tz(b.z-b.d/2),b.w*sx,b.d*sz);for(const p of PLACES){c.fillStyle=seen.has(p.id)?'#94c6a0':'#dfbe80';c.beginPath();c.arc(tx(p.x),tz(p.z),3,0,Math.PI*2);c.fill();}c.fillStyle='#72c9ec';c.fillRect(tx(car.x)-3,tz(car.z)-4,6,8);c.save();c.translate(tx(player.x),tz(player.z));c.rotate(-player.angle);c.fillStyle='#fff4d9';c.beginPath();c.moveTo(0,6);c.lineTo(-4,-4);c.lineTo(4,-4);c.closePath();c.fill();c.restore();c.font='9px sans-serif';c.fillStyle='#c6c8b7';c.fillText('N',205,13);$('visited').textContent=`${seen.size} / 3`;$('district').textContent=mission?'FIRST DRIVE COMPLETE':player.x< -30?'LAUREL QUARTER':player.x>30?'PALOMA QUARTER':player.z< -70?'NORTH AVENUE':'SUNSET BOULEVARD';}
function hud(){const driving=car.occupied;$('radio-hud').hidden=!driving;$('station').textContent=sound.stationName();$('track').textContent=sound.radioOn?(sound.station===0?'Palm Drive · Soul & funk':'Streetlight · Electronic'):'RADIO OFF';$('radio-toggle').textContent=sound.radioOn?'Radio off':'Radio on';$('radio-hud').classList.toggle('radio-playing',sound.ready&&sound.enabled&&sound.radioOn&&!pause);$('vehicle-hud').hidden=!driving;$('speed').textContent=Math.round(Math.abs(car.speed)*3.6);$('gear').textContent=car.speed<-.1?'R':car.speed>.1?'D':'P';$('driven').textContent=`${Math.min(25,Math.floor(car.distance))} / 25 m`;$('mission').textContent=mission?'First drive complete':car.distance>=25?'Park & step out · E':'Take the sports car for a short drive';$('walk-keys').hidden=driving;$('drive-keys').hidden=!driving;$('car-guide').hidden=driving;$('interact').hidden=!driving&&!canEnter(player,car);$('interact').textContent=driving?'E · Get out':'E · Enter car';$('interact').disabled=pause||car.transition>0;$('brake').hidden=!driving;$('cruise').hidden=!driving;}
function frame(now){
 requestAnimationFrame(frame);const realDt=last?(now-last)/1000:1/60;last=now;const dt=Math.min(realDt,.05);if(!loaded)return;clock+=dt;let moved=0;
 if(!pause&&!document.hidden){
  car.transition=Math.max(0,car.transition-dt);
  if(car.occupied){
   let throttle=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),steer=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),brake=keys.has('Space');
   if(cruise){const input=cruiseInput(cruise,car);throttle=input.throttle;steer=input.steer;brake=input.brake;if(cruise.finished){cruise=null;toast("Two blocks explored · Welcome back to Sunset");}}
   if(driveProbe){driveProbe.time-=dt;throttle=driveProbe.time>0?(driveProbe.reverse?-1:1):0;steer=driveProbe.steer;brake=driveProbe.time<=0;if(brake&&Math.abs(car.speed)<.02)driveProbe=null;}
   updateCar(car,{throttle,steer,brake},dt,view.layout);lastThrottle=throttle;player.x=car.x;player.z=car.z;player.angle=car.angle;player.speed=0;
   if(!drag&&clock>orbitUntil&&Math.abs(car.speed)>.25)view.yaw+=Math.atan2(Math.sin(car.angle+Math.PI-view.yaw),Math.cos(car.angle+Math.PI-view.yaw))*(1-Math.exp(-dt*3));
   if(car.hit)toast('Easy on the bumper · S to reverse');
  }else if(car.transition===0){
   let x=0,z=0,run=keys.has('ShiftLeft')||keys.has('ShiftRight');const target=route[0]??(tour>=0?TOUR[tour]:null);
   if(target){const dx=target.x-player.x,dz=target.z-player.z,l=Math.hypot(dx,dz);if(l<.13){if(route.length){route.shift();if(!route.length)toast('E · Enter your blue sports car');}else{tour++;if(tour>=TOUR.length){tour=-1;toast('The neighborhood is yours. Keep exploring.');}}}else{x=dx/l;z=dz/l;view.yaw+=Math.atan2(Math.sin(Math.atan2(-dx,-dz)-view.yaw),Math.cos(Math.atan2(-dx,-dz)-view.yaw))*(1-Math.exp(-dt*1.5));}}
   else{const side=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),forward=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));const v=inputVector(probe?.x??side,probe?.z??forward,view.yaw);x=v.x;z=v.z;}
   if(probe){probe.time-=dt;if(probe.time<=0)probe=null;}
   if(target){const v=steerAroundResidents(player,{x,z},view.residents.people,walkingLayout(view.layout,car));x=v.x;z=v.z;}
   const active=Math.hypot(x,z)>.01,desired=active?(run?5.5:2.5):0;player.speed+=(desired-player.speed)*(1-Math.exp(-dt*10));
   if(active){player.angle=Math.atan2(x,z);moved=move(player,x*player.speed*dt,z*player.speed*dt,{...walkingLayout(view.layout,car),dynamicBlocked:(px,pz,pr)=>walkingLayout(view.layout,car).dynamicBlocked(px,pz,pr)||view.residents.blocked(px,pz,pr)});distance+=moved;if(moved>.001)$('intro').classList.add('compact');footPhase+=moved;if(footPhase>.72){footPhase%=.72;sound.step();}}
   const before=seen.size;visit(player,seen);if(seen.size>before){const place=PLACES.find(p=>Math.hypot(player.x-p.x,player.z-p.z)<2.5);toast(seen.size===3?'Neighborhood explored · Enjoy the evening':place.name+' · Discovered');}
  }
 }
 sound.update({paused:pause||document.hidden,driving:car.occupied,speed:car.speed,throttle:lastThrottle});
 view.frame(player,moved>.0005,dt,pause||document.hidden,car);drawMap();hud();
 if(Math.floor(clock*2)!==Math.floor((clock-dt)*2))$('live').textContent=`Position ${player.x.toFixed(2)}, ${player.z.toFixed(2)} · Walked ${distance.toFixed(1)}m\n${view.current} · ${pause?'Paused':'Playing'} · Camera ${view.yaw.toFixed(2)}\nCar ${car.x.toFixed(2)}, ${car.z.toFixed(2)} · ${car.speed.toFixed(2)} m/s · Heading ${car.angle.toFixed(3)}\nDriven ${car.distance.toFixed(1)}m · ${car.occupied?'In car':'On foot'} · ${carBlocked(car,view.layout)?'Car blocked':'Car clear'}\n${sound.status()} · Radio ${sound.radioOn?sound.stationName():'off'} · S01 ${mission?'complete':'in progress'}\n${view.lights.status()} · 2 city blocks · Tour ${cruise?cruise.index:'off'}\n${view.residents.status()}`;
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('show');}
 if(measurement&&!document.hidden){measurement.frames.push(realDt*1000);if(now-measurement.started>=10000){const f=measurement.frames.filter(x=>x<250),sorted=[...f].sort((a,b)=>a-b),info=view.renderer.info;const result={fps:+(1000*f.length/f.reduce((a,b)=>a+b,0)).toFixed(2),p95ms:+sorted[Math.floor(sorted.length*.95)].toFixed(2),frames:f.length,drawCalls:info.render.calls,triangles:info.render.triangles,width:view.renderer.domElement.width,height:view.renderer.domElement.height,walked:+(distance-measurement.distanceStart).toFixed(2),driven:+(car.distance-measurement.driveStart).toFixed(2),collisionFree:!carBlocked(car,view.layout)&&(car.occupied||!blocked(player.x,player.z,walkingLayout(view.layout,car))),visited:seen.size};$('metrics').textContent=JSON.stringify(result,null,2);measurement=null;}}
}
requestAnimationFrame(frame);view.init().then(()=>{loaded=true;$('tour').disabled=false;$('find-car').disabled=false;reset();globalThis.AstraGameReady?.();}).catch(e=>{globalThis.AstraGameError?.();$('status').textContent='The scene could not load. '+e.message;console.error(e);});
