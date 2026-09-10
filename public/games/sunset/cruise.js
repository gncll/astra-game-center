const points=[];
function line(x,z){const p=points.at(-1);if(!p){points.push({x,z});return;}const n=Math.ceil(Math.hypot(x-p.x,z-p.z));for(let i=1;i<=n;i++)points.push({x:p.x+(x-p.x)*i/n,z:p.z+(z-p.z)*i/n});}
function arc(cx,cz,a,b){for(let i=1;i<=16;i++){const t=a+(b-a)*i/16;points.push({x:cx+Math.cos(t)*8,z:cz+Math.sin(t)*8});}}
line(0,4);line(0,-72);arc(8,-72,Math.PI,1.5*Math.PI);line(40,-80);arc(40,-72,-Math.PI/2,0);line(48,-8);arc(40,-8,0,Math.PI/2);line(-40,0);arc(-40,-8,Math.PI/2,Math.PI);line(-48,-72);arc(-40,-72,Math.PI,1.5*Math.PI);line(-8,-80);arc(-8,-72,-Math.PI/2,0);line(0,13);
export const CRUISE_PATH=points;
export function createCruise(){return {index:0,finished:false};}
export function cruiseInput(state,car){
 let closest=Infinity,best=state.index;for(let i=state.index;i<Math.min(points.length,state.index+18);i++){const d=Math.hypot(points[i].x-car.x,points[i].z-car.z);if(d<closest){closest=d;best=i;}}state.index=best;
 if(best>=points.length-3&&Math.hypot(car.x,car.z-13)<2){state.finished=Math.abs(car.speed)<.05;return {throttle:0,steer:0,brake:true};}
 const target=points[Math.min(points.length-1,best+4)],dx=target.x-car.x,dz=target.z-car.z,dist=Math.max(1,Math.hypot(dx,dz)),angle=Math.atan2(dx,dz),error=Math.atan2(Math.sin(angle-car.angle),Math.cos(angle-car.angle));
 const desired=Math.atan2(2*2.8*Math.sin(error),dist),limit=.52/(1+Math.abs(car.speed)*.075),steer=-Math.max(-1,Math.min(1,desired/limit));
 const speed=Math.abs(error)>.25?3.7:6.2;return {throttle:car.speed<speed-.15?1:0,steer,brake:car.speed>speed+.4};
}
