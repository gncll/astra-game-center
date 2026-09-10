import {district} from './district-data.js';
export {district};
export function onRoad(x,z,inset=0){return district.roads.some(r=>{const lateral=r.axis==='z'?x:z,long=r.axis==='z'?z:x;return Math.abs(lateral-r.at)<r.width/2-inset&&long>=r.min+inset&&long<=r.max-inset;});}
export function inBounds(x,z,margin=0){const b=district.bounds;return x>=b.minX+margin&&x<=b.maxX-margin&&z>=b.minZ+margin&&z<=b.maxZ-margin;}
export function pavementHeight(x,z){if(onRoad(x,z))return 0;return district.roads.some(r=>{const lateral=r.axis==='z'?x:z,long=r.axis==='z'?z:x;return Math.abs(lateral-r.at)<=r.width/2+4&&long>=r.min&&long<=r.max;})?.16:0;}
export function signalPhase(seconds,offset=0){const t=((seconds+offset)%32+32)%32;return {ns:t<12?'green':t<15?'amber':'red',ew:t<16?'red':t<28?'green':t<31?'amber':'red'};}
export const DISTRICT_PROPS=[...district.lamps.map(p=>({x:p.x,z:p.z,w:.34,d:.34,h:5.8})),...district.signals.flatMap(j=>[[7,-7],[-7,7],[7,7],[-7,-7]].map(([x,z])=>({x:j.x+x,z:j.z+z,w:.32,d:.32,h:6})))];
