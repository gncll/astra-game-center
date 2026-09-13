import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCar,updateCar,carBlocked,exitPoint} from '../public/games/sunset/vehicle.js';
import {createWaterfront,updateWaterfront,bridgeBoxes,BRIDGE_ANGLE} from '../public/games/sunset/waterfront.js';
import {supportPose,followSurface} from '../public/games/sunset/vehicle-surface.js';
import {contact} from '../public/games/sunset/traffic.js';
const source=JSON.parse(fs.readFileSync(new URL('../public/games/sunset/world-layout.json',import.meta.url)));
function setup(x=0,z=-250,angle=Math.PI){
 const water=createWaterfront(),layout={...source,waterfront:()=>water,obstacles:()=>bridgeBoxes(water)};
 const car={...createCar(),x,z,angle,occupied:true,lastSafe:{x,z,angle,y:0}};
 return {car,water,layout};
}
function drive(state,seconds,hz=120,input={throttle:1,steer:0},moving=false){
 const {car,water,layout}=state;let maxY=car.y,airborne=false,hit=false;
 for(let i=0;i<seconds*hz;i++){
  if(moving)updateWaterfront(water,1/hz,car,null);
  updateCar(car,input,1/hz,layout);maxY=Math.max(maxY,car.y);airborne||=car.airborne;hit||=car.hit;
 }
 return {maxY,airborne,hit};
}
test('manual car climbs the real 16cm kerb and brakes on the pavement at 30/60/120Hz',()=>{
 for(const hz of [30,60,120]){
  const s=setup(3.8,-107,Math.PI/2);drive(s,.9,hz);drive(s,1,hz,{throttle:0,steer:0,brake:true});
  assert.ok(s.car.x>7.3&&s.car.x<7.7);assert.ok(Math.abs(s.car.y-.16)<.005);
  assert.equal(s.car.speed,0);assert.equal(carBlocked(s.car,s.layout),false);assert.equal(s.car.recoveries,0);
 }
});
test('leaving the roadway does not remove building collision or permit a high speed tunnel',()=>{
 const s=setup(3.8,-107,Math.PI/2);s.layout.buildings.push({x:13,z:-107,w:2,d:10,h:8});
 drive(s,4);assert.ok(s.car.x<10);assert.equal(s.car.speed,0);assert.equal(carBlocked(s.car,s.layout),false);
});
test('manual car pushes the barrier aside, climbs a fully raised leaf and leaves its tip',()=>{
 const s=setup();Object.assign(s.water,{phase:'boat',leaf:1,gate:1});
 const result=drive(s,5);assert.ok(s.water.brokenSouth);assert.ok(result.maxY>20);assert.ok(result.airborne);assert.equal(result.hit,false);
 assert.equal(exitPoint(s.car,s.layout),null);
});
test('a stationary car is carried by the opening leaf while traffic still holds the bridge',()=>{
 const s=setup(0,-279);followSurface(s.car,supportPose(s.car,s.water),1/120);
 Object.assign(s.water,{phase:'raising',elapsed:0,gate:1});
 drive(s,3,120,{throttle:0,steer:0,brake:true},true);
 assert.ok(s.water.leaf>.3);assert.ok(s.car.y>3);assert.ok(s.car.z>-279);
 assert.ok(Math.abs(s.car.pitch-s.water.leaf*BRIDGE_ANGLE)<.01);assert.equal(s.car.airborne,false);
 const held=createWaterfront();held.phase='warning';held.elapsed=6;
 updateWaterfront(held,1,null,null,false,true);assert.equal(held.phase,'warning');
});
test('partly raised bridge supports a real ballistic jump and landing on the far bank',()=>{
 const results=[];
 for(const hz of [30,60,120]){
  const s=setup();Object.assign(s.water,{phase:'raising',leaf:.32,gate:1});
  const result=drive(s,7,hz);assert.ok(result.airborne&&result.maxY>8);assert.equal(result.hit,false);
  assert.ok(s.car.z<-320);assert.ok(s.car.y<.05);assert.equal(s.car.airborne,false);assert.equal(s.car.recoveries,0);results.push(s.car);
 }
 for(const c of results)assert.ok(Math.abs(c.z-results[0].z)<.02);
});
test('a moving bridge keeps opening under manual driving; falling in water returns to the last bank',()=>{
 const results=[];
 for(const hz of [30,60,120]){
  const s=setup();Object.assign(s.water,{phase:'raising',elapsed:1,leaf:.05,gate:1});
  const result=drive(s,8,hz,undefined,true);assert.ok(result.airborne&&result.maxY>20);
  assert.equal(s.water.leaf,1);assert.equal(s.car.recoveries,1);assert.ok(s.car.z>-260&&s.car.z<-250);assert.equal(s.car.y,0);assert.ok(!carBlocked(s.car,s.layout));results.push(result.maxY);
 }
 assert.ok(Math.max(...results)-Math.min(...results)<.25);
});
test('an airborne vehicle passes above traffic but still collides near road height',()=>{
 const a=createCar(),b=createCar();a.y=4;assert.equal(contact(a,b),null);
 a.y=.16;assert.ok(contact(a,b));
});
