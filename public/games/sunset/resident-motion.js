import {blocked,floorAt} from './world.js';
import {onRoad} from './district.js';

// Closed pavement paths keep people away from the drivable road network.
export const RESIDENT_ROUTES=[
 [[-7.65,-12],[-7.65,-68],[-8.2,-68],[-8.2,-12]],
 [[7.65,-12],[7.65,-68],[8.2,-68],[8.2,-12]],
 [[-7.75,7.8],[-7.75,16],[-8.25,16],[-8.25,7.8]],
 [[7.75,7.8],[7.75,16],[8.25,16],[8.25,7.8]],
 [[-40.3,-12],[-40.3,-68],[-39.75,-68],[-39.75,-12]],
 [[40.3,-12],[40.3,-68],[39.75,-68],[39.75,-12]],
 [[-12,-72.25],[-35,-72.25],[-35,-71.7],[-12,-71.7]],
 [[12,-72.25],[35,-72.25],[35,-71.7],[12,-71.7]],
];
export function routeLength(points){return points.reduce((s,p,i)=>s+Math.hypot(p[0]-points[(i+1)%points.length][0],p[1]-points[(i+1)%points.length][1]),0);}
export function routePoint(points,distance){let d=((distance%routeLength(points))+routeLength(points))%routeLength(points);for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<=length)return{x:a[0]+(b[0]-a[0])*d/length,z:a[1]+(b[1]-a[1])*d/length,angle:Math.atan2(b[0]-a[0],b[1]-a[1])};d-=length;}}
const SPECS=[[0,4],[0,24],[0,46],[1,2],[1,23],[1,44],[2,.2],[3,16.8],[4,8],[4,36],[5,16],[5,44],[6,5],[7,13]];
export function createResidents(){return SPECS.map(([route,start],id)=>({id,route,start,progress:start,...routePoint(RESIDENT_ROUTES[route],start),speed:.85+(id%4)*.08,moved:0,yielding:false}));}
export function stepResidents(people,dt,layout,player,paused=false){
 if(paused)return;
 for(const p of people){p.moved=0;p.yielding=false;const distance=Math.min(dt,.05)*p.speed,next=routePoint(RESIDENT_ROUTES[p.route],p.progress+distance);
  const approaching=player&&Math.hypot(next.x-player.x,next.z-player.z)<.85&&Math.hypot(next.x-player.x,next.z-player.z)<Math.hypot(p.x-player.x,p.z-player.z);
  const following=people.some(q=>q!==p&&Math.hypot(next.x-q.x,next.z-q.z)<.50&&Math.hypot(next.x-q.x,next.z-q.z)<Math.hypot(p.x-q.x,p.z-q.z));
  if(approaching||following||onRoad(next.x,next.z)||blocked(next.x,next.z,layout,.25)){p.yielding=true;continue;}
  p.progress+=distance;p.moved=Math.hypot(next.x-p.x,next.z-p.z);p.x=next.x;p.z=next.z;p.angle=next.angle;
 }
}
export function residentsBlock(people,x,z,r=.3){return people.some(p=>Math.hypot(p.x-x,p.z-z)<r+.23);}
export function residentFloor(p){return floorAt(p.x,p.z);}
export function steerAroundResidents(p,v,people,layout){
 const free=(x,z)=>!blocked(x,z,layout)&&!residentsBlock(people,x,z,.38);
 if(free(p.x+v.x*.95,p.z+v.z*.95))return v;
 for(const a of [Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2]){const x=v.x*Math.cos(a)-v.z*Math.sin(a),z=v.x*Math.sin(a)+v.z*Math.cos(a);if(free(p.x+x*.95,p.z+z*.95))return{x,z};}
 return{x:0,z:0};
}
