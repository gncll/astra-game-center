import {pavementHeight} from './district.js?v=20260911-s06a';
import {BRIDGE,BRIDGE_ANGLE} from './waterfront.js?v=20260911-s06a';

export function carSurface(x,z,water){
 if(z<=BRIDGE.north||z>=BRIDGE.south)return {y:pavementHeight(x,z),slopeX:0,slopeZ:0};
 if(Math.abs(x+48)<7.65)return {y:0,slopeX:0,slopeZ:0};
 if(Math.abs(x)>7.65)return null;
 const angle=(water?.leaf??0)*BRIDGE_ANGLE,length=20*Math.cos(angle);
 if(z>=BRIDGE.south-length)return {y:(BRIDGE.south-z)*Math.tan(angle),slopeX:0,slopeZ:-Math.tan(angle),leaf:'south',along:(BRIDGE.south-z)/Math.cos(angle),angle};
 if(z<=BRIDGE.north+length)return {y:(z-BRIDGE.north)*Math.tan(angle),slopeX:0,slopeZ:Math.tan(angle),leaf:'north',along:(z-BRIDGE.north)/Math.cos(angle),angle};
 return null;
}

export function supportPose(c,water){
 const center=carSurface(c.x,c.z,water);if(!center)return null;
 const co=Math.cos(c.angle),si=Math.sin(c.angle);
 const hinge=Math.min(Math.abs(c.z-BRIDGE.south),Math.abs(c.z-BRIDGE.north));
 if(Math.abs(c.x)<6.5&&hinge<1.5&&(water?.leaf??0)>.001){
  // Fit the two axles where flat road meets the leaf, rather than snapping the entire car upright.
  let pitch=c.pitch??0,roll=c.roll??0,heights;
  for(let i=0;i<12;i++){
   heights=[];
   for(const x of [-.83,.83])for(const z of [1.38,-1.38]){
    const rx=x*Math.cos(roll),rz=z*Math.cos(pitch)-x*Math.sin(roll)*Math.sin(pitch);
    heights.push(carSurface(c.x+rx*co+rz*si,c.z-rx*si+rz*co,water)?.y??center.y);
   }
   const front=(heights[0]+heights[2])/2,back=(heights[1]+heights[3])/2;
   pitch+=(Math.atan2(front-back,2.76*Math.cos(pitch))-pitch)*.6;
   roll+=(Math.atan2((heights[2]+heights[3]-heights[0]-heights[1])/2,1.66*Math.cos(roll))-roll)*.6;
  }
  return {...center,leaf:null,ramp:true,y:heights.reduce((a,b)=>a+b,0)/4,pitch,roll};
 }
 if(center.leaf){
  // Resolve the plane directly so a steep leaf remains solid all the way to its tip.
  return {...center,pitch:Math.atan(center.slopeZ*co),roll:Math.atan(-center.slopeZ*si)};
 }
 const heights=[];
 for(const x of [-.83,.83])for(const z of [1.38,-1.38]){
  const s=carSurface(c.x+x*co+z*si,c.z-x*si+z*co,water);heights.push(s?.y??center.y);
 }
 return {...center,y:heights.reduce((a,b)=>a+b,0)/4,pitch:Math.atan2((heights[0]+heights[2]-heights[1]-heights[3])/2,2.76),roll:Math.atan2((heights[2]+heights[3]-heights[0]-heights[1])/2,1.66)};
}

export function carryBridge(c,water){
 if(!c.bridgeLeaf||c.airborne)return;
 const angle=(water?.leaf??0)*BRIDGE_ANGLE,old=c.bridgeAngle??angle;
 if(angle===old)return;
 const sign=c.bridgeLeaf==='south'?-1:1,hinge=c.bridgeLeaf==='south'?BRIDGE.south:BRIDGE.north;
 c.z=hinge+sign*c.bridgeAlong*Math.cos(angle);
 c.y=c.bridgeAlong*Math.sin(angle);
 c.bridgeAngle=angle;
}

export function followSurface(c,pose,h){
 const oldY=c.y??0;
 if(pose.leaf||pose.ramp){c.y=pose.y;c.pitch=pose.pitch;c.roll=pose.roll;}
 else{
  const blend=1-Math.exp(-h*24);c.y+=(pose.y-c.y)*blend;c.pitch+=(pose.pitch-c.pitch)*blend;c.roll+=(pose.roll-c.roll)*blend;
 }
 c.vy=(c.y-oldY)/h;c.airborne=false;c.bridgeLeaf=pose.leaf??null;c.bridgeAlong=pose.along??0;c.bridgeAngle=pose.angle??0;
 if(!pose.leaf&&!pose.ramp&&(c.z>-257||c.z<-323)&&c.y<.3)c.lastSafe={x:c.x,z:c.z,angle:c.angle,y:pose.y};
}

export function recoverCar(c){
 const safe=c.lastSafe??{x:0,z:-250,angle:Math.PI,y:0};
 Object.assign(c,safe,{speed:0,vy:0,pitch:0,roll:0,airborne:false,bridgeLeaf:null,knockX:0,knockZ:0});
 c.recoveries=(c.recoveries??0)+1;c.splash=true;
}
