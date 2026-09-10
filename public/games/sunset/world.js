import {inBounds,pavementHeight,DISTRICT_PROPS} from './district.js';
export const START={x:6.5,z:9.3,angle:Math.PI,speed:0};
export const PLACES=[{id:'S00-diner',name:'Sunset Diner',x:8,z:-10},{id:'S00-records',name:'Marlow Records',x:-8,z:-22},{id:'S00-plaza',name:'Palm Court',x:8,z:-43}];
export const TOUR=[{x:8,z:9.3},{x:8,z:-10},{x:8,z:0},{x:-8,z:0},{x:-8,z:-22},{x:-8,z:0},{x:8,z:0},{x:8,z:-43}];
export const PROPS=[...[[-8.9,-9],[-8.9,19],[-8.8,-32],[9,-26],[9,22],[-8.9,-50],[9,-48]].map(([x,z])=>({x,z,w:.32,d:.32,h:4.5})),...[-1,1].flatMap(side=>[-62,-46,-29,-10,18,28,38].map(z=>({x:side*7,z,w:.4,d:.4,h:14}))),...DISTRICT_PROPS,{x:6.8,z:7,w:.45,d:.35},{x:-6.8,z:-7,w:.45,d:.35},...[12,15,19].map(x=>({x,z:-3.65,w:1.8,d:.9}))];
export function blocked(x,z,layout,r=.3){if(!inBounds(x,z)||layout.dynamicBlocked?.(x,z,r))return true;return [...layout.buildings,...layout.cars,...PROPS].some(b=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r);}
export const floorAt=pavementHeight;
export function move(p,dx,dz,layout){const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));let dist=0;for(let i=0;i<n;i++){const ox=p.x,oz=p.z;if(!blocked(p.x+dx/n,p.z,layout))p.x+=dx/n;if(!blocked(p.x,p.z+dz/n,layout))p.z+=dz/n;dist+=Math.hypot(p.x-ox,p.z-oz);}return dist;}
export function inputVector(x,z,yaw){const l=Math.hypot(x,z);if(!l)return{x:0,z:0};return{x:(x*Math.cos(yaw)+z*Math.sin(yaw))/l,z:(-x*Math.sin(yaw)+z*Math.cos(yaw))/l};}
export function cameraDistance(p,desired,layout){const t={x:p.x,y:floorAt(p.x,p.z)+1.35,z:p.z};for(let i=1;i<=35;i++){const a=i/35,x=t.x+(desired.x-t.x)*a,z=t.z+(desired.z-t.z)*a,y=t.y+(desired.y-t.y)*a;const hit=layout.buildings.some(b=>Math.abs(x-b.x)<b.w/2+.15&&Math.abs(z-b.z)<b.d/2+.15&&y<b.h+.3)||PROPS.some(b=>b.w<.5&&Math.abs(x-b.x)<b.w/2+.18&&Math.abs(z-b.z)<b.d/2+.18&&y<(b.h??1));if(hit)return Math.max(.18,(i-2)/35);}return 1;}
export function visit(p,seen){for(const place of PLACES)if(Math.hypot(p.x-place.x,p.z-place.z)<2.5)seen.add(place.id);return seen.size===PLACES.length;}
