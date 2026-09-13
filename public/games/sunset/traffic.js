// Lane-following traffic switches to planar impact motion, then rejoins its lane.
import {district,signalPhase} from './district.js?v=20260911-s06a';
import {carBlocked,pointInCar} from './vehicle.js?v=20260911-s06a';
import {bridgeOccupied} from './waterfront.js?v=20260911-s06a';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function circuit(left,right,top,bottom,clockwise){
 const lane=clockwise?2.55:-2.55,L=left+lane,R=right-lane,T=top+lane,B=bottom-lane,r=8,points=[];
 const line=(x,z)=>{const a=points.at(-1);if(!a){points.push({x,z});return;}const n=Math.ceil(Math.hypot(x-a.x,z-a.z)/.8);for(let i=1;i<=n;i++)points.push({x:a.x+(x-a.x)*i/n,z:a.z+(z-a.z)*i/n});};
 const arc=(x,z,a,b)=>{for(let i=1;i<=24;i++){const t=a+(b-a)*i/24;points.push({x:x+r*Math.cos(t),z:z+r*Math.sin(t)});}};
 line(L,B-r);line(L,T+r);arc(L+r,T+r,Math.PI,Math.PI*1.5);line(R-r,T);arc(R-r,T+r,-Math.PI/2,0);line(R,B-r);arc(R-r,B-r,0,Math.PI/2);line(L+r,B);arc(L+r,B-r,Math.PI/2,Math.PI);
 if(!clockwise)points.reverse();
 let length=0;const segments=points.map((p,i)=>{const q=points[(i+1)%points.length],d=Math.hypot(q.x-p.x,q.z-p.z),s={...p,dx:q.x-p.x,dz:q.z-p.z,d,start:length};length+=d;return s;}).filter(p=>p.d>1e-6);
 return {segments,length};
}
export const TRAFFIC_ROUTES=[circuit(-48,0,-340,0,true),circuit(-48,0,-340,0,false),circuit(0,48,-240,0,true),circuit(0,48,-240,0,false)];
export function routePoint(route,distance){const s=((distance%route.length)+route.length)%route.length;const p=route.segments.find(p=>p.start+p.d>s)??route.segments.at(-1),t=clamp((s-p.start)/p.d,0,1);return {x:p.x+p.dx*t,z:p.z+p.dz*t,angle:Math.atan2(p.dx,p.dz)};}
export function createTraffic(){return {time:0,impacts:0,lastImpact:null,cars:Array.from({length:10},(_,i)=>{const route=i%4,s=(Math.floor(i/4)*.31+.12+(i%4)*.09)*TRAFFIC_ROUTES[route].length;return {id:i,route,s,...routePoint(TRAFFIC_ROUTES[route],s),speed:4.6+i%3*.4,desired:5.2+i%3*.5,wheel:0,damage:0,dentX:0,dentZ:2,mode:'lane',vx:0,vz:0,spin:0,timer:0,braking:false,stoppedFor:'',cooldown:0};})};}
function axes(c){return [{x:Math.cos(c.angle),z:-Math.sin(c.angle)},{x:Math.sin(c.angle),z:Math.cos(c.angle)}];}
// Oriented rectangles, not bounding circles: neighboring lanes can pass naturally.
export function contact(a,b){if(Math.abs((a.y??0)-(b.y??0))>1.7)return null;const aa=axes(a),bb=axes(b),dx=b.x-a.x,dz=b.z-a.z;let depth=Infinity,normal;
 for(const n of [...aa,...bb]){const radius=as=>1.02*Math.abs(n.x*as[0].x+n.z*as[0].z)+2.32*Math.abs(n.x*as[1].x+n.z*as[1].z);const projection=dx*n.x+dz*n.z,overlap=radius(aa)+radius(bb)-Math.abs(projection);if(overlap<=0)return null;if(overlap<depth){depth=overlap;normal={x:n.x*Math.sign(projection||1),z:n.z*Math.sign(projection||1)};}}
 return {...normal,depth};
}
export function trafficBlocked(traffic,x,z,r=.3){return traffic.cars.some(c=>pointInCar({x,z},c,r));}
export function trafficOnBridge(traffic){return traffic.cars.some(c=>bridgeOccupied(c,null));}
function gapAhead(c,other){if(Math.abs((c.y??0)-(other.y??0))>1.7)return Infinity;const dx=other.x-c.x,dz=other.z-c.z,forward=dx*Math.sin(c.angle)+dz*Math.cos(c.angle),side=dx*Math.cos(c.angle)-dz*Math.sin(c.angle);return forward>0&&Math.abs(side)<2.15?forward-4.7:Infinity;}
export function trafficStop(c,traffic,car,player,water){
 let gap=Infinity,reason='';const take=(d,r)=>{if(d<gap){gap=d;reason=r;}};
 for(const other of [...traffic.cars,car].filter(o=>o&&o!==c))take(gapAhead(c,other),'vehicle');
 if(player&&!car?.occupied){const dx=player.x-c.x,dz=player.z-c.z,f=dx*Math.sin(c.angle)+dz*Math.cos(c.angle),side=dx*Math.cos(c.angle)-dz*Math.sin(c.angle);if(f>0&&Math.abs(side)<1.8)take(f-3.1,'pedestrian');}
 const ns=Math.abs(Math.cos(c.angle))>.96,ew=Math.abs(Math.sin(c.angle))>.96;
 if(ns||ew)for(const j of district.signals){const long=ns?(j.z-c.z)*Math.sign(Math.cos(c.angle)):(j.x-c.x)*Math.sign(Math.sin(c.angle)),side=ns?Math.abs(c.x-j.x):Math.abs(c.z-j.z);if(side<5.5&&long>8.3&&signalPhase(traffic.time,j.offset)[ns?'ns':'ew']!=='green')take(long-10,'signal');}
 if(Math.abs(c.x)<8&&ns&&water.phase!=='open'){const north=Math.cos(c.angle)<0;if(north&&c.z>-260)take(c.z+263-3.1,'bridge');if(!north&&c.z<-320)take(-317-c.z-3.1,'bridge');}
 return {gap,reason};
}
function velocity(c){return c.mode==='impact'?{x:c.vx,z:c.vz}:{x:Math.sin(c.angle)*c.speed+(c.knockX||0),z:Math.cos(c.angle)*c.speed+(c.knockZ||0)};}
function damage(c,amount,n){c.damage=clamp((c.damage||0)+amount,0,1);c.dentX=n.x*Math.cos(c.angle)-n.z*Math.sin(c.angle);c.dentZ=n.x*Math.sin(c.angle)+n.z*Math.cos(c.angle);c.shock=Math.min(1,amount*3);}
function separate(c,dx,dz,layout){const next={...c,x:c.x+dx,z:c.z+dz};if(!carBlocked(next,layout)){c.x=next.x;c.z=next.z;return true;}return false;}
function collide(traffic,a,b,layout,playerCar=false){const hit=contact(a,b);if(!hit)return;const av=velocity(a),bv=velocity(b),closing=(av.x-bv.x)*hit.x+(av.z-bv.z)*hit.z;
 const half=(hit.depth+.008)/2;if(!separate(a,-hit.x*half,-hit.z*half,layout))separate(b,hit.x*half*2,hit.z*half*2,layout);else if(!separate(b,hit.x*half,hit.z*half,layout))separate(a,-hit.x*half,-hit.z*half,layout);
 if(closing<.15)return;
 const impulse=Math.min(11,closing*.68),va={x:av.x-hit.x*impulse,z:av.z-hit.z*impulse},vb={x:bv.x+hit.x*impulse,z:bv.z+hit.z*impulse};
 if(playerCar){a.speed=va.x*Math.sin(a.angle)+va.z*Math.cos(a.angle);a.knockX=va.x-Math.sin(a.angle)*a.speed;a.knockZ=va.z-Math.cos(a.angle)*a.speed;a.hit=true;}
 else{a.vx=va.x;a.vz=va.z;a.mode='impact';a.timer=0;a.spin=clamp((hit.x*Math.cos(a.angle)-hit.z*Math.sin(a.angle))*closing*.06,-.8,.8);}
 b.vx=vb.x;b.vz=vb.z;b.mode='impact';b.timer=0;b.spin=clamp((hit.x*Math.cos(b.angle)-hit.z*Math.sin(b.angle))*closing*.08,-.8,.8);
 if(!a.cooldown&&!b.cooldown){traffic.impacts++;traffic.lastImpact={x:(a.x+b.x)/2,z:(a.z+b.z)/2,strength:closing,time:traffic.time};damage(a,closing*.032,hit);damage(b,closing*.04,{x:-hit.x,z:-hit.z});a.cooldown=b.cooldown=.55;}
}
export function resolveTraffic(traffic,car,layout){for(const c of traffic.cars)collide(traffic,car,c,layout,true);for(let i=0;i<traffic.cars.length;i++)for(let j=i+1;j<traffic.cars.length;j++)collide(traffic,traffic.cars[i],traffic.cars[j],layout);}
export function updateTraffic(traffic,dt,car,player,water,layout,paused=false){if(paused)return;
 const n=Math.ceil(dt*120),h=dt/n;for(let step=0;step<n;step++){traffic.time+=h;car.cooldown=Math.max(0,(car.cooldown||0)-h);car.shock=Math.max(0,(car.shock||0)-h*2);
 for(const c of traffic.cars){c.cooldown=Math.max(0,c.cooldown-h);c.shock=Math.max(0,(c.shock||0)-h*2);c.timer+=h;
  if(c.mode==='impact'){const nx=c.vx*h,nz=c.vz*h;if(!separate(c,nx,nz,layout)){c.vx*=-.15;c.vz*=-.15;c.spin=0;}const angle=c.angle+c.spin*h;if(!carBlocked({...c,angle},layout))c.angle=angle;c.vx*=Math.exp(-h*1.7);c.vz*=Math.exp(-h*1.7);c.spin*=Math.exp(-h*2);c.speed=Math.hypot(c.vx,c.vz);c.braking=true;c.stoppedFor='recovering';if(c.timer>2&&c.speed<.35){c.mode='recover';c.timer=0;}continue;}
  if(c.mode==='recover'){const route=TRAFFIC_ROUTES[c.route];let nearest=Infinity,target;for(const p of route.segments){const d=Math.hypot(c.x-p.x,c.z-p.z);if(d<nearest){nearest=d;target=p;}}const desired=routePoint(route,target.start+2),dx=desired.x-c.x,dz=desired.z-c.z,len=Math.hypot(dx,dz),angle=c.angle+wrap(desired.angle-c.angle)*Math.min(1,h*2);const next={...c,x:c.x+dx/Math.max(.1,len)*h*1.5,z:c.z+dz/Math.max(.1,len)*h*1.5,angle};if(!carBlocked(next,layout)&&![car,...traffic.cars.filter(o=>o!==c)].some(o=>contact(next,o))){c.x=next.x;c.z=next.z;c.angle=angle;c.wheel+=h*1.5/.35;}if(nearest<.18&&Math.abs(wrap(c.angle-desired.angle))<.15){c.s=target.start;c.mode='lane';c.speed=0;}continue;}
  const stop=trafficStop(c,traffic,car,player,water);let target=Math.min(c.desired,Math.sqrt(Math.max(0,stop.gap-.8)*8));const look=routePoint(TRAFFIC_ROUTES[c.route],c.s+7);if(Math.abs(wrap(look.angle-c.angle))>.12)target=Math.min(target,3.3);c.braking=target<c.speed-.2;c.stoppedFor=target<.3?stop.reason:'';c.speed+=clamp(target-c.speed,-5*h,2.2*h);const s=c.s+c.speed*h,next={...c,...routePoint(TRAFFIC_ROUTES[c.route],s)};
  if(carBlocked(next,layout)||stop.gap<.35){c.speed=0;c.braking=true;}else{c.s=s;c.x=next.x;c.z=next.z;c.angle=next.angle;c.wheel+=c.speed*h/.35;}
 }
 // Traffic impacts are checked during substeps so queue collisions cannot tunnel.
 for(let i=0;i<traffic.cars.length;i++)for(let j=i+1;j<traffic.cars.length;j++)collide(traffic,traffic.cars[i],traffic.cars[j],layout);
 }
}
export function assistTraffic(input,car,traffic,water){const {gap}=trafficStop(car,traffic,car,null,water);return gap<Math.max(1.2,car.speed*car.speed/8+1.2)?{...input,throttle:0,brake:true}:input;}
