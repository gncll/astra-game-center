import {inBounds,onRoad} from './district.js';
import {blocked,PROPS} from './world.js';
export const CAR_START={x:3.8,z:13,angle:Math.PI};
export function createCar(){return {...CAR_START,speed:0,steer:0,wheel:0,distance:0,occupied:false,transition:0,braking:false,hit:false};}
export function localPoint(c,x,z){return {x:c.x+x*Math.cos(c.angle)+z*Math.sin(c.angle),z:c.z-x*Math.sin(c.angle)+z*Math.cos(c.angle)};}
export function pointInCar(p,c,r=.3){const dx=p.x-c.x,dz=p.z-c.z,x=dx*Math.cos(c.angle)-dz*Math.sin(c.angle),z=dx*Math.sin(c.angle)+dz*Math.cos(c.angle);return Math.abs(x)<1.02+r&&Math.abs(z)<2.32+r;}
export function carDoors(c){return [localPoint(c,-1.65,-.1),localPoint(c,1.65,-.1)];}
export function canEnter(p,c){return !c.occupied&&c.transition===0&&carDoors(c).some(q=>Math.hypot(p.x-q.x,p.z-q.z)<1.65);}
export function exitPoint(c,layout){if(Math.abs(c.speed)>.5||c.transition>0)return null;return carDoors(c).find(p=>!blocked(p.x,p.z,layout)&&!pointInCar(p,c))??null;}
export function walkingLayout(layout,c){return {...layout,dynamicBlocked:(x,z,r)=>pointInCar({x,z},c,r)};}
function overlaps(c,b){const co=Math.cos(c.angle),si=Math.sin(c.angle),dx=b.x-c.x,dz=b.z-c.z;return Math.abs(dx)<Math.abs(co)*1.02+Math.abs(si)*2.32+b.w/2&&Math.abs(dz)<Math.abs(si)*1.02+Math.abs(co)*2.32+b.d/2&&Math.abs(dx*co-dz*si)<1.02+Math.abs(co)*b.w/2+Math.abs(si)*b.d/2&&Math.abs(dx*si+dz*co)<2.32+Math.abs(si)*b.w/2+Math.abs(co)*b.d/2;}
export function carBlocked(c,layout){
 // Keep all four corners on the road; the small demo has solid kerbs.
 for(const x of [-1.02,1.02])for(const z of [-2.32,2.32]){const p=localPoint(c,x,z);if(!inBounds(p.x,p.z,.5)||!onRoad(p.x,p.z,.05))return true;}
 return [...layout.buildings,...layout.cars,...PROPS].some(b=>overlaps(c,b));
}
export function updateCar(c,input,dt,layout){
 if(!c.occupied||c.transition>0)return 0;
 const n=Math.max(1,Math.ceil(dt/(1/120))),h=dt/n;let travelled=0;c.hit=false;c.braking=!!input.brake||input.throttle*c.speed<-.2;
 for(let i=0;i<n;i++){
  const target=-input.steer*(.52/(1+Math.abs(c.speed)*.075));c.steer+=(target-c.steer)*(1-Math.exp(-h*9));
  const drag=.35+.035*c.speed*c.speed;let acc=input.throttle*(input.throttle*c.speed<0?12:6.5);
  if(input.brake)acc=-Math.sign(c.speed)*15;
  const old=c.speed;c.speed=Math.max(-4.5,Math.min(13,c.speed+acc*h));
  if(!input.throttle||input.brake)c.speed=Math.sign(c.speed)*Math.max(0,Math.abs(c.speed)-drag*h);
  if(input.brake&&old*c.speed<0)c.speed=0;
  const angle=c.angle+c.speed/2.8*Math.tan(c.steer)*h;
  const next={...c,angle,x:c.x+Math.sin((c.angle+angle)/2)*c.speed*h,z:c.z+Math.cos((c.angle+angle)/2)*c.speed*h};
  if(carBlocked(next,layout)){c.hit=c.hit||Math.abs(c.speed)>1;c.speed=0;break;}
  const d=Math.hypot(next.x-c.x,next.z-c.z);travelled+=d;c.x=next.x;c.z=next.z;c.angle=angle;c.wheel+=c.speed*h/.35;
 }
 c.distance+=travelled;return travelled;
}
// Small deterministic grid route for the optional walk-to-car helper, using real collisions.
export function pathToCar(p,c,layout){
 const map=walkingLayout(layout,c),goals=carDoors(c).filter(q=>!blocked(q.x,q.z,map));if(!goals.length)return [];
 const size=.5,key=(x,z)=>`${x},${z}`,sx=Math.round(p.x/size),sz=Math.round(p.z/size),queue=[[sx,sz]],prev=new Map([[key(sx,sz),null]]);let found=null;
 for(let i=0;i<queue.length&&i<50000;i++){
  const [x,z]=queue[i],pos={x:x*size,z:z*size};if(goals.some(g=>Math.hypot(pos.x-g.x,pos.z-g.z)<.4)){found=[x,z];break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz,k=key(xx,zz);if(prev.has(k)||!inBounds(xx*size,zz*size)||blocked(xx*size,zz*size,map,.38))continue;prev.set(k,[x,z]);queue.push([xx,zz]);}
 }
 if(!found)return [];
 const path=[];for(let at=found;at;at=prev.get(key(...at)))path.push({x:at[0]*size,z:at[1]*size});return path.reverse();
}
