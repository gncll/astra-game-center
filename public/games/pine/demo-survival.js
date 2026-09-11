import {CUT_TREE,LOG_PICKUP,CAMP,CAMP_STOP,TREE_STOP,POND,FISH_STOP} from './demo-survival-layout.js';
export const SURVIVAL_ID='S02';
const near=(p,q,r)=>Math.hypot(p.x-q.x,p.z-q.z)<r;
export function createSurvival(){return{hits:0,fall:0,wood:0,woodCollected:false,fire:false,raw:0,cooked:0,eaten:false,mealReady:false,fishCaught:0,attempts:0,action:null,events:[]};}
function emit(s,type){s.events.push(type);}
export function survivalInteraction(s,p){
 if(s.action){if(s.action.kind==='fish'&&s.action.phase==='bite'&&near(p,FISH_STOP,1.15))return{kind:'reel',label:'E · Reel in — now!',target:POND};return null;}
 if(!s.woodCollected){
  if(s.hits<4&&near(p,CUT_TREE,1.65))return{kind:'chop',label:`E · Chop tree · ${s.hits} / 4`,target:CUT_TREE};
  if(s.hits>=4&&s.fall>=2&&near(p,LOG_PICKUP,1.65))return{kind:'wood',label:'E · Collect 3 logs',target:LOG_PICKUP};
 }
 if(near(p,CAMP,1.85)){
  if(!s.fire&&s.wood>=3)return{kind:'light',label:'E · Build & light fire · 3 logs',target:CAMP};
  if(s.fire&&s.raw>0)return{kind:'cook',label:'E · Cook fish',target:CAMP};
  if(s.cooked>0)return{kind:'eat',label:'E · Eat cooked fish',target:CAMP};
 }
 if(s.fire&&!s.mealReady&&s.raw===0&&near(p,FISH_STOP,1.15))return{kind:'cast',label:'E · Cast fishing rod',target:POND};
 return null;
}
// Explain unavailable actions at the place where the player tries them.
export function survivalHint(s,p){
 if(s.action||survivalInteraction(s,p))return '';
 if(!s.woodCollected){
  if(s.hits>=4&&near(p,LOG_PICKUP,2.7))return s.fall<2?'Wait for the tree to finish falling, then press E to collect the 3 logs.':'Move closer to the pile of logs, then press E to collect them.';
  if(s.hits<4&&near(p,CUT_TREE,2.7))return 'Move closer to the marked pine, then press E to chop.';
 }
 if(near(p,CAMP,2.8)){
  if(!s.fire&&s.wood<3)return s.hits>=4?'Collect the 3 logs beside the fallen tree first, then bring them here.':`The fire needs 3 logs. You have ${s.wood}. Chop the marked pine, then collect its wood.`;
  if(!s.fire)return 'Move closer to the stone fire ring, then press E to light it.';
  if(s.raw>0||s.cooked>0)return 'Move closer to the fire to cook or eat your fish.';
  return s.mealReady?'Your campfire meal is complete. You can explore the cabin.':'The fire is burning. Go to the fishing bank to catch dinner.';
 }
 if(near(p,FISH_STOP,3.2)){
  if(!s.fire)return 'Fishing unlocks after you light the campfire. First gather 3 logs and bring them to the fire ring.';
  if(s.raw>0)return 'You already caught a fish. Return to the campfire and press E to cook it.';
  if(s.mealReady)return 'Your campfire meal is complete. You can explore the cabin.';
  return 'Move to the fishing bank beside the float, then press E to cast.';
 }
 return '';
}
export function startSurvival(s,p){
 const a=survivalInteraction(s,p);if(!a)return null;
 if(a.kind==='reel'){s.action={kind:'catch',elapsed:0,duration:1.2};emit(s,'catch');return a;}
 if(a.kind==='wood'){s.wood=3;s.woodCollected=true;emit(s,'wood');return a;}
 const timings={chop:.9,light:2.3,cast:1.15,cook:5,eat:1.5};
 s.action={kind:a.kind,elapsed:0,duration:timings[a.kind],origin:{x:p.x,z:p.z},hit:false};
 emit(s,a.kind==='chop'?'swing':a.kind);return a;
}
export function tickSurvival(s,dt,paused=false){
 if(paused)return;dt=Math.max(0,Math.min(dt,.1));
 if(s.hits>=4&&s.fall<2){s.fall=Math.min(2,s.fall+dt);if(s.fall>=2)emit(s,'tree-down');}
 const a=s.action;if(!a)return;a.elapsed+=dt;
 if(a.kind==='chop'&&!a.hit&&a.elapsed>=.57){a.hit=true;s.hits++;emit(s,'axe-hit');if(s.hits===4)emit(s,'tree-fall');}
 if(a.kind==='fish'){
  if(a.phase==='waiting'&&a.elapsed>=a.biteAt){a.phase='bite';emit(s,'bite');}
  if(a.elapsed>=a.biteAt+2.3){s.action=null;emit(s,'miss');}
  return;
 }
 if(a.elapsed<a.duration)return;
 s.action=null;
 if(a.kind==='light'){if(s.wood>=3&&!s.fire){s.wood-=3;s.fire=true;emit(s,'fire-lit');}}
 if(a.kind==='cast'){s.attempts++;s.action={kind:'fish',phase:'waiting',elapsed:0,biteAt:2.6+(s.attempts%3)*.55};emit(s,'line-in');}
 if(a.kind==='catch'){s.raw++;s.fishCaught++;emit(s,'fish-secured');}
 if(a.kind==='cook'&&s.fire&&s.raw>0){s.raw--;s.cooked++;s.mealReady=true;emit(s,'cooked');}
 if(a.kind==='eat'&&s.cooked>0){s.cooked--;s.eaten=true;emit(s,'eaten');}
}
export function cancelSurvival(s){if(!s.action)return false;if(s.action.kind==='fish'||s.action.kind==='cast'){s.action=null;emit(s,'cancel');return true;}return false;}
export function survivalGoal(s){
 if(!s.woodCollected)return TREE_STOP;
 if(!s.fire)return CAMP_STOP;
 if(!s.raw&&!s.mealReady)return FISH_STOP;
 return CAMP_STOP;
}
export function survivalObjective(s){
 if(s.eaten)return{step:'SURVIVED · 4 / 4',title:'A warm meal, at last.',hint:'You gathered wood, lit a fire, caught a fish and cooked dinner. The cabin is still yours to explore.'};
 if(s.mealReady)return{step:'MISSION COMPLETE · 4 / 4',title:'Dinner is ready',hint:'Your fish is cooked. Press E by the fire to eat, or explore the ranger cabin.'};
 if(!s.woodCollected)return{step:'S02 · 1 / 4',title:s.hits<4?'Gather firewood':'Collect the fallen wood',hint:s.hits<4?'The marked pine is west of the trail. Get close and press E for each axe swing.':'The tree is down. Collect its logs for the campfire.'};
 if(!s.fire)return{step:'S02 · 2 / 4',title:'Build a campfire',hint:'Bring 3 logs to the stone fire ring. Press E to build and light it.'};
 if(!s.raw)return{step:'S02 · 3 / 4',title:'Catch dinner',hint:s.action?.kind==='fish'?s.action.phase==='bite'?'A bite! Press E now to reel it in.':'Watch the float. Wait for a bite, then press E.':'Go to the pond bank. Cast with E; reel with E when the fish bites.'};
 return{step:'S02 · 4 / 4',title:'Cook your catch',hint:'Return to the campfire and press E. Cook the raw fish over the flames.'};
}
