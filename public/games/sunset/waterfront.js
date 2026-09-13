// S05 simulation: one authoritative bridge state for visuals and collisions.
import {district} from './district.js?v=20260911-s06a';
export const BRIDGE={x:0,south:-270,north:-310,gateSouth:-263,gateNorth:-317,width:16};
export const BRIDGE_ANGLE=1.24;
export const WATERFRONT_PROPS=[...[-268,-312].flatMap(z=>[[-115,110],[-24,28],[84,150]].map(([x,w])=>({x,z,w,d:.36,h:1.3}))),...[-9.8,9.8].map(x=>({x,z:-269,w:3.1,d:4.1,h:8.5})),...[-21,21].map(x=>({x,z:-259,w:4,d:.6,h:.6})),{x:100,z:-386.2,w:65,d:.36,h:1.3},...[[-7,-112],[7,-112],[-7,-192],[7,-192],[-20,-253],[20,-253],[-18,-328],[18,-328],[84,-355],[114,-355]].map(([x,z])=>({x,z,w:.45,d:.45,h:10}))];
const durations={open:32,warning:6,closingGates:3,clearing:0,raising:7,boat:14,lowering:7,openingGates:3};
const sequence=Object.keys(durations);
const ease=t=>t*t*(3-2*t),clamp=t=>Math.max(0,Math.min(1,t));
export function createWaterfront(){return {phase:'open',elapsed:0,time:0,cycles:0,leaf:0,gate:0,planeTime:0,landingCount:0};}
export function onWater(x,z,r=0){const river=district.river;if(!river||z+r<=river.minZ||z-r>=river.maxZ)return false;return !river.bridges.some(b=>Math.abs(x-b.x)+r<b.width/2-.35);}
export function bridgeOccupied(car,player){
 // A conservative oriented-body envelope leaves room for both bumpers and pedestrians.
 const reach=car?Math.abs(Math.cos(car.angle))*2.32+Math.abs(Math.sin(car.angle))*1.02:0;
 return !!(car&&Math.abs(car.x)<10&&car.z+reach>BRIDGE.gateNorth-1&&car.z-reach<BRIDGE.gateSouth+1)||!!(player&&!car?.occupied&&Math.abs(player.x)<9&&player.z>BRIDGE.gateNorth-1&&player.z<BRIDGE.gateSouth+1);
}
export function updateWaterfront(s,dt,car,player,paused=false,trafficOccupied=false){
 if(paused)return;dt=Math.max(0,dt);s.time+=dt;
 // Manual driving may ride the moving leaf. Pedestrians and ordinary traffic still hold it.
 const holdCar=car?.freeRoam&&car.occupied&&!car.obeyTraffic?null:car,holdPlayer=car?.occupied?null:player;
 const oldPlane=s.planeTime;s.planeTime+=dt;s.landingCount+=Math.floor((s.planeTime+92)/150)-Math.floor((oldPlane+92)/150);
 s.elapsed+=dt;
 for(let n=0;n<12;n++){
  const duration=durations[s.phase];
  if(s.phase==='clearing') {if(bridgeOccupied(holdCar,holdPlayer)||trafficOccupied){s.elapsed=0;break;}}
  else if(s.elapsed<duration)break;
  // Do not lower gate arms onto a body straddling either stop line.
  if(s.phase==='warning'&&(gateOccupied(holdCar,holdPlayer)||bridgeOccupied(holdCar,holdPlayer)||trafficOccupied)){s.elapsed=duration;break;}
  s.elapsed=Math.max(0,s.elapsed-duration);s.phase=sequence[(sequence.indexOf(s.phase)+1)%sequence.length];if(s.phase==='open')s.cycles++;
 }
 const t=clamp(s.elapsed/(durations[s.phase]||1));
 s.leaf=s.phase==='raising'?ease(t):s.phase==='boat'?1:s.phase==='lowering'?1-ease(t):0;
 s.gate=s.phase==='closingGates'?ease(t):s.phase==='openingGates'?1-ease(t):['clearing','raising','boat','lowering'].includes(s.phase)?1:0;
 if(s.phase==='open'){s.brokenSouth=false;s.brokenNorth=false;}
}
function gateOccupied(c,p){return [BRIDGE.gateNorth,BRIDGE.gateSouth].some(z=>c&&Math.abs(c.x)<10&&Math.abs(c.z-z)<3.1||p&&!c?.occupied&&Math.abs(p.x)<9&&Math.abs(p.z-z)<1);}
export function bridgeBoxes(s){
 const boxes=[];
 if(s.phase!=='open'&&s.phase!=='warning')for(const z of [BRIDGE.gateNorth,BRIDGE.gateSouth])boxes.push({x:0,z,w:16,d:.4,h:1.2,kind:'bridge-gate'});
 if(s.leaf>0||['raising','boat','lowering'].includes(s.phase))boxes.push({x:0,z:-290,w:16,d:40,h:25,kind:'bridge-deck'});
 return boxes;
}
export function bridgeLabel(s){return ({open:'Bridge open to road traffic',warning:'Bridge opening soon · Prepare to stop',closingGates:'Stop · Gates closing',clearing:'Waiting for the bridge to clear',raising:'Bridge lifting · Use Laurel detour',boat:'Boat crossing · Use Laurel detour',lowering:'Bridge lowering · Please wait',openingGates:'Gates opening · Stand by'})[s.phase];}
export function aircraftAt(time){
 const t=((time%150)+150)%150;
 // +X heading, 58s touchdown, 84s rollout ends; taxi away beyond the playable area.
 if(t<58){const u=t/58;return {x:-780+u*650,y:2.0+Math.pow(1-u,1.3)*135,z:-442,heading:Math.PI/2,pitch:.035*Math.min(1,(58-t)/6),stage:'Approaching runway',gear:true};}
 if(t<84){const u=(t-58)/26;return {x:-130+360*(2*u-u*u),y:2.0,z:-442,heading:Math.PI/2,pitch:0,stage:'Touchdown / rollout',gear:true};}
 if(t<112){const u=(t-84)/28;return {x:230+u*115,y:2.0,z:-442+(3*u*u-2*u*u*u)*30,heading:Math.atan2(115,180*u*(1-u)),pitch:0,stage:'Taxiing to the apron',gear:true};}
 const u=(t-112)/38;return {x:345+u*470,y:2.0,z:-412,heading:Math.PI/2,pitch:0,stage:'Taxiing behind the hangars',gear:true,opacity:1-clamp((u-.3)/.25)};
}
export function boatAt(s){const total=s.phase==='raising'?s.elapsed/7*.15:s.phase==='boat'?.15+s.elapsed/14*.7:s.phase==='lowering'?.85+s.elapsed/7*.15:0;return {x:-115+230*total,z:-290,y:-2.65,visible:['raising','boat','lowering'].includes(s.phase)};}
