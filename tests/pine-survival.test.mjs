import test from 'node:test';
import assert from 'node:assert/strict';
import {createSurvival,startSurvival,tickSurvival,survivalInteraction,survivalHint} from '../public/games/pine/demo-survival.js';
import {TREE_STOP,CAMP_STOP,FISH_STOP,LOG_PICKUP} from '../public/games/pine/demo-survival-layout.js';
import {move,blocked} from '../public/games/pine/demo-world.js';

const advance=(s,seconds)=>{for(let i=0;i<Math.ceil(seconds/.025);i++)tickSurvival(s,.025);};
function chop(s){for(let i=0;i<4;i++){assert.equal(startSurvival(s,TREE_STOP)?.kind,'chop');advance(s,1);}advance(s,2);}
test('fallen wood can be collected beside the logs outside the old trunk interaction radius',()=>{
 const s=createSurvival();chop(s);
 const p=move(TREE_STOP,.73,0);
 assert.equal(blocked(p.x,p.z),false);
 assert.ok(Math.hypot(p.x-LOG_PICKUP.x,p.z-LOG_PICKUP.z)<1.65);
 assert.equal(survivalInteraction(s,p)?.kind,'wood');
 assert.equal(startSurvival(s,p)?.kind,'wood');assert.equal(s.wood,3);
 assert.equal(startSurvival(s,p),null);assert.equal(s.wood,3);
});
test('wood pickup remains gated by four hits, the fall, proximity and single collection',()=>{
 const s=createSurvival();assert.notEqual(survivalInteraction(s,LOG_PICKUP)?.kind,'wood');
 for(let i=0;i<4;i++){startSurvival(s,TREE_STOP);advance(s,1);}
 assert.ok(s.fall<2);assert.equal(survivalInteraction(s,LOG_PICKUP),null);advance(s,2);
 const far=move(TREE_STOP,2.1,0);assert.equal(survivalInteraction(s,far),null);
 assert.match(survivalHint(s,far),/pile of logs/);
 assert.equal(s.wood,0);
});
test('the shipped game completes wood → fire → fish → cooking with actual timed actions',()=>{
 const s=createSurvival();assert.equal(startSurvival(s,CAMP_STOP),null);assert.equal(startSurvival(s,FISH_STOP),null);
 chop(s);startSurvival(s,move(TREE_STOP,.73,0));
 assert.equal(startSurvival(s,CAMP_STOP)?.kind,'light');advance(s,2.5);assert.equal(s.wood,0);assert.equal(s.fire,true);
 assert.equal(startSurvival(s,FISH_STOP)?.kind,'cast');advance(s,1.2);advance(s,3.8);
 assert.equal(startSurvival(s,FISH_STOP)?.kind,'reel');advance(s,1.3);assert.equal(s.raw,1);
 assert.equal(startSurvival(s,CAMP_STOP)?.kind,'cook');advance(s,5.2);
 assert.equal(s.raw,0);assert.equal(s.cooked,1);assert.equal(s.mealReady,true);
 assert.equal(startSurvival(s,CAMP_STOP)?.kind,'eat');advance(s,1.6);assert.equal(s.eaten,true);assert.equal(s.cooked,0);
});
