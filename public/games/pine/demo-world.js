import {CUT_TREE,CAMP,POND,pondDistance,survivalClearing} from './demo-survival-layout.js';
export const START={x:0,z:7};
export const CABIN={x:-4,z:-10,w:6,d:5.4};
export const TRAIL=[{x:0,z:10},{x:0,z:5},{x:.6,z:1},{x:-1.3,z:-2.5},{x:-4,z:-4.7}];
export function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function pathDistance(x,z){let best=Infinity;for(let i=1;i<TRAIL.length;i++){const a=TRAIL[i-1],b=TRAIL[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));best=Math.min(best,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));}return best;}
function originalHeightAt(x,z){const nearCabin=Math.max(0,Math.min(1,(Math.hypot(x-CABIN.x,z-CABIN.z)-5)/3)),edge=Math.max(0,Math.abs(x)-7,z-9,-z-16),shoulder=Math.max(0,Math.min(1,(pathDistance(x,z)-.6)/3));return(.075*Math.sin(x*.62)+.075*Math.cos(z*.46)+.04*Math.sin(x*.9+z*.7)+shoulder*.22)*nearCabin+(1-Math.exp(-edge*.2))*(3.5+Math.sin(x*.2+z*.1)*1.3);}
export function heightAt(x,z){const r=pondDistance(x,z),shore=Math.max(0,Math.min(1,(1.85-r)/.7)),blend=Math.max(0,Math.min(1,(1.13-r)/.28)),land=originalHeightAt(x,z)*(1-shore)+.14*shore;return land*(1-blend)+(-.65)*blend;}
const rng=random(863),trees=[];
for(let z=-37;z<=35;z+=3.6)for(let x=-36;x<=36;x+=3.6){const tx=x+(rng()-.5)*2.6,tz=z+(rng()-.5)*2.6;if(survivalClearing(tx,tz)||pathDistance(tx,tz)<2.8||Math.hypot(tx-CABIN.x,tz-CABIN.z)<5.7||Math.hypot(tx-1.2,tz-9)<3.5)continue;trees.push({x:tx,z:tz,scale:.7+rng()*.55,rotation:rng()*6.28,variant:trees.length%2});}
export const TREES=trees;
export const ROCKS=[{x:-2.2,z:5,scale:.67,variant:0},{x:2.65,z:3.6,scale:.8,variant:3},{x:2.7,z:-.9,scale:.95,variant:1},{x:-3.7,z:1.3,scale:1.1,variant:4},{x:3.5,z:-5.3,scale:1.3,variant:5},{x:-7.3,z:-4,scale:1.1,variant:2},{x:-3,z:9.6,scale:.6,variant:3}];
// Measured extents of the six Blender exports (x radius, z radius, height).
export const ROCK_SHAPES=[[1.119,1.685,1.473],[1.328,1.632,1.262],[1.055,1.040,1.1],[1.064,.983,1.769],[.909,1.5,1.206],[1.063,1.379,1.262]];
export function insideRock(x,z,r=0,y=0){return ROCKS.some(t=>{const [rx,rz,h]=ROCK_SHAPES[t.variant];return y<heightAt(t.x,t.z)+h*t.scale+r&&((x-t.x)/(rx*t.scale+r))**2+((z-t.z)/(rz*t.scale+r))**2<1;});}
// The cabin is a shell, not one solid obstacle. Dimensions match build_demo_cabin.py.
export const CABIN_WALLS=[
 {x:-3,z:0,w:.18,d:5.58},{x:3,z:0,w:.18,d:5.58},{x:0,z:-2.7,w:6,d:.18},
 {x:-1.92,z:2.7,w:2.16,d:.18},{x:1.92,z:2.7,w:2.16,d:.18},
 {x:-1.62,z:3.48,w:.1,d:1.4},{x:1.62,z:3.48,w:.1,d:1.4}
];
export const FURNITURE=[{x:1.65,z:-1.85,w:1.8,d:.8},{x:-1.9,z:-.8,w:1.25,d:2.1},{x:-.2,z:-2.05,w:.8,d:.6}];
export const MEDKIT={x:CABIN.x+1.65,z:CABIN.z-1.85};
export const DOOR_STOP={x:CABIN.x,z:CABIN.z+3.5};
export const SUPPLY_ROUTE=[{x:CABIN.x,z:CABIN.z+1.6},{x:CABIN.x+.3,z:CABIN.z+.2},{x:CABIN.x+1.6,z:CABIN.z-.83}];
export const CABIN_ROUTE=[...TRAIL.slice(1),DOOR_STOP];
export function inCabin(p){return Math.abs(p.x-CABIN.x)<2.85&&p.z>CABIN.z-2.55&&p.z<CABIN.z+2.58;}
export function floorHeight(x,z){
 const lx=x-CABIN.x,lz=z-CABIN.z;
 if(Math.abs(lx)<=3&&Math.abs(lz)<=2.79||Math.abs(lx)<=1.7&&lz>=2.7&&lz<=4.2)return .5;
 if(Math.abs(lx)<=1.05&&lz>4.2&&lz<=5.4)return Math.min(.5,Math.ceil((5.4-lz)/.3)*.125);
 return heightAt(x,z);
}
function nearBox(x,z,r,b){const dx=Math.max(0,Math.abs(x-CABIN.x-b.x)-b.w/2),dz=Math.max(0,Math.abs(z-CABIN.z-b.z)-b.d/2);return dx*dx+dz*dz<r*r;}
export function doorCollision(x,z,r=.24,open=false){
 const ax=CABIN.x-.75,az=CABIN.z+2.73,angle=open?-Math.PI*.55:0,dx=Math.cos(angle)*1.47,dz=-Math.sin(angle)*1.47;
 const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
 return Math.hypot(x-ax-t*dx,z-az-t*dz)<r+.04;
}
export function blocked(x,z,r=.24,doorOpen=false){return pondDistance(x,z)<1.04+r/3||Math.hypot(x-CUT_TREE.x,z-CUT_TREE.z)<CUT_TREE.r+r||Math.hypot(x-CAMP.x,z-CAMP.z)<CAMP.r+r||x< -10+r||x>10-r||z< -14+r||z>11-r||CABIN_WALLS.some(b=>nearBox(x,z,r,b))||FURNITURE.some(b=>nearBox(x,z,r,b))||doorCollision(x,z,r,doorOpen)||TREES.some(t=>Math.hypot(x-t.x,z-t.z)<.22*t.scale+r)||insideRock(x,z,r);}
export function move(p,dx,dz,doorOpen=false){
 const distance=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(distance/.06));let x=p.x,z=p.z;
 const canStep=(nx,nz)=>!blocked(nx,nz,.24,doorOpen)&&Math.abs(floorHeight(nx,nz)-floorHeight(x,z))<=.14;
 for(let i=0;i<steps;i++){if(canStep(x+dx/steps,z))x+=dx/steps;if(canStep(x,z+dz/steps))z+=dz/steps;}
 return{x,z,distance:Math.hypot(x-p.x,z-p.z)};
}
export function cameraBlocked(x,y,z,doorOpen=false){return y<floorHeight(x,z)+.15||y<3.25&&y>.4&&(CABIN_WALLS.some(b=>nearBox(x,z,.14,b))||doorCollision(x,z,.14,doorOpen))||insideRock(x,z,.15,y)||TREES.some(t=>Math.hypot(x-t.x,z-t.z)<.22*t.scale+.15);}
export function cameraPose(p,yaw,pitch,distance,doorOpen=false){
 const sx=Math.sin(yaw),cz=Math.cos(yaw),inside=inCabin(p),h=floorHeight(p.x,p.z);
 // Inside the small room, bring the camera over the shoulder rather than through a wall.
 if(inside)distance=Math.min(distance,1.95);
 const origin={x:p.x,y:h+1.48,z:p.z},desired={x:p.x+sx*distance+cz*(inside?.35:.48),y:h+1.55+Math.sin(pitch)*distance,z:p.z+cz*distance-sx*(inside?.35:.48)};let fraction=1;
 for(let i=1;i<=50;i++){const t=i/50,x=origin.x+(desired.x-origin.x)*t,z=origin.z+(desired.z-origin.z)*t,y=origin.y+(desired.y-origin.y)*t;if(cameraBlocked(x,y,z,doorOpen)){fraction=Math.max(0,t-.04);break;}}
 return{position:{x:origin.x+(desired.x-origin.x)*fraction,y:origin.y+(desired.y-origin.y)*fraction,z:origin.z+(desired.z-origin.z)*fraction},target:{x:p.x-sx*.65,y:h+(inside?1.4:1.05),z:p.z-cz*.65},close:fraction*distance<.65};
}
