const points=[];
function line(x,z){const p=points.at(-1);if(!p){points.push({x,z});return;}const n=Math.ceil(Math.hypot(x-p.x,z-p.z));for(let i=1;i<=n;i++)points.push({x:p.x+(x-p.x)*i/n,z:p.z+(z-p.z)*i/n});}
function arc(x,z,a,b){for(let i=1;i<=16;i++){const angle=a+(b-a)*i/16;points.push({x:x+Math.cos(angle)*8,z:z+Math.sin(angle)*8});}}
line(0,4);line(0,-332);arc(8,-332,Math.PI,Math.PI*1.5);line(88,-340);arc(88,-348,Math.PI/2,0);line(96,-368);arc(104,-368,Math.PI,Math.PI*1.5);line(120,-376);arc(120,-368,-Math.PI/2,0);line(128,-348);arc(120,-348,0,Math.PI/2);line(-40,-340);arc(-40,-332,-Math.PI/2,-Math.PI);line(-48,-8);arc(-40,-8,Math.PI,Math.PI/2);line(-8,0);arc(-8,8,-Math.PI/2,0);line(0,13);
export const HARBOR_PATH=points;
export function createHarborTour(){return {index:0,finished:false,waiting:false,airportVisited:false,hold:0,arrivalLanding:null};}
export function harborInput(state,car,water,dt){
 let best=state.index,closest=Infinity;for(let i=best;i<Math.min(points.length,best+20);i++){const d=Math.hypot(points[i].x-car.x,points[i].z-car.z);if(d<closest){closest=d;best=i;}}state.index=best;
 if(best>points.length-4&&Math.hypot(car.x,car.z-13)<2){state.finished=Math.abs(car.speed)<.05;return {throttle:0,steer:0,brake:true};}
 state.waiting=Math.abs(car.x)<9&&car.z< -245&&car.z> -265&&water.phase!=='open';
 if(state.waiting)return {throttle:0,steer:0,brake:true};
 if(!state.airportVisited&&car.x>107&&car.x<119&&car.z< -373){state.arrivalLanding??=water.landingCount;state.hold+=dt;if(state.hold<12||water.landingCount===state.arrivalLanding)return {throttle:0,steer:0,brake:true};state.airportVisited=true;}
 const target=points[Math.min(points.length-1,best+4)],dx=target.x-car.x,dz=target.z-car.z,dist=Math.max(1,Math.hypot(dx,dz));
 const error=Math.atan2(Math.sin(Math.atan2(dx,dz)-car.angle),Math.cos(Math.atan2(dx,dz)-car.angle));
 const steer=-Math.max(-1,Math.min(1,Math.atan2(5.6*Math.sin(error),dist)/(.52/(1+Math.abs(car.speed)*.075))));
 let speed=Math.abs(error)>.25?3.7:7.2;
 if(Math.abs(car.x)<8&&car.z<-236&&car.z>-267)speed=3.5;
 return {throttle:car.speed<speed-.15?1:0,steer,brake:car.speed>speed+.4};
}
