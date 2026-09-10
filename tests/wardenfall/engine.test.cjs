const assert=require('node:assert/strict');
const {Game,TYPES,MAPS,position}=require('../../public/games/wardenfall/engine.js');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS',name);}
function tick(g,seconds){for(let i=0;i<seconds*60;i++)g.step(1/60);}
test('Construction charges gold and prevents duplicate, invalid, unaffordable placements',()=>{const g=new Game();assert.equal(g.build('none',0),false);assert.equal(g.build('ranger',55),false);const t=g.build('ranger',0);assert.equal(g.gold,340);assert.equal(g.build('arcane',0),false);g.gold=0;assert.equal(g.build('frost',1),false);assert.equal(g.towers.length,1);assert.equal(t.level,1);});
test('Upgrades require funds and an explicit level-3 specialization; sale returns 70%',()=>{const g=new Game();const t=g.build('arcane',1);const before=g.stats(t).damage;assert(g.upgrade(t.id));assert(g.stats(t).damage>before);assert.equal(g.upgrade(t.id),false);g.gold=999;assert(g.upgrade(t.id,1));assert(g.upgrade(t.id));assert.equal(t.level,4);assert.equal(t.branch,1);g.gold=999;assert(g.upgrade(t.id));assert.equal(t.level,5);assert.equal(g.upgrade(t.id,0),false);assert.equal(g.stats(t).branch.chain,3);const gold=g.gold,refund=Math.floor(t.spent*.7);assert(g.sell(t.id));assert.equal(g.gold,gold+refund);assert.equal(g.towers.length,0);});
test('Magic bypasses armor; poison and kills award gold only once',()=>{const g=new Game();g.wave=1;const e=g.spawn('brute');e.armor=.5;const hp=e.hp;g.hit(e,100,null,'physical');assert.equal(e.hp,hp-50);g.hit(e,100,null,'magic');assert.equal(e.hp,hp-150);const money=g.gold;g.hit(e,1e6,null,'magic');g.hit(e,1e6,null,'magic');assert.equal(g.gold,money+e.reward);assert.equal(g.kills,1);});
test('Spells enforce battle and cooldown, freeze stops motion, rally restores champion',()=>{const g=new Game();assert.equal(g.cast('meteor',100,100),false);g.startWave();g.queue=[];const e=g.spawn('brute');e.d=300;Object.assign(e,position(g.path,e.d));assert(g.cast('frost',e.x,e.y));const d=e.d;tick(g,1);assert.equal(e.d,d);assert.equal(g.cast('frost',e.x,e.y),false);assert.equal(g.cast('invalid',0,0),false);g.hero.hp=1;assert(g.cast('rally',0,0));assert.equal(g.hero.hp,g.hero.maxHp);});
test('Hero moves, blocks enemies, earns levels and revives',()=>{const g=new Game();g.moveHero(200,300);tick(g,3);assert(g.hero.x<824);g.hero.hp=0;g.hero.revive=.5;tick(g,1);assert.equal(g.hero.hp,g.hero.maxHp);g.wave=1;for(let i=0;i<8;i++)g.hit(g.spawn('raider'),1e6,null,'magic');assert.equal(g.hero.level,2);});
test('Leaks damage the fortress and cause a terminal defeat',()=>{const g=new Game();g.startWave();g.queue=[];g.lives=1;const e=g.spawn('raider');e.d=g.path.length-.1;g.step(.1);assert.equal(g.phase,'lost');assert.equal(g.lives,0);const time=g.time;g.step(.1);assert.equal(g.time,time);});
test('Waves cannot overlap and grant a clear bonus',()=>{const g=new Game();assert(g.startWave());assert.equal(g.startWave(),false);g.queue=[];const before=g.gold;g.step(.1);assert.equal(g.phase,'prepare');assert.equal(g.gold,before+68);assert.equal(g.wave,1);});
test('All specializations work during mixed-enemy combat',()=>{for(const type of Object.keys(TYPES))for(let branch=0;branch<2;branch++){const g=new Game();g.gold=1e5;const t=g.build(type,0);g.upgrade(t.id);g.upgrade(t.id,branch);g.startWave();g.queue=[];for(let i=0;i<4;i++){const e=g.spawn('brute');e.d=120+i*8;Object.assign(e,position(g.path,e.d));}tick(g,4);assert(t.damage>0,`${type} branch ${branch} never attacks`);}});
const campaign=[];
test('Mid-battle relics grant exactly one meaningful reward',()=>{const g=new Game();g.gold=1000;const t=g.build('ranger',0),base=g.stats(t).damage;assert.equal(g.chooseRelic('ember'),false);g.wave=5;assert(g.chooseRelic('ember'));assert.equal(g.stats(t).damage,base*1.16);assert.equal(g.chooseRelic('dawn'),false);assert.equal(g.chooseRelic('unknown'),false);});
test('Northern geography mirrors correctly and corruption regeneration is countered by poison',()=>{const north=new Game(1),south=new Game(0);assert.equal(north.path.samples[0].x,1000-south.path.samples[0].x);assert.equal(north.hero.x,176);const g=new Game(2);g.startWave();g.queue=[];const e=g.spawn('brute');e.hp=100;g.step(.1);assert(e.hp>100);e.poison=2;e.poisonDamage=12;const hp=e.hp;g.step(.1);assert(e.hp<hp);});
for(let map=0;map<3;map++)test(`Chapter ${map+1} can be won across all ten waves with earned currency`,()=>{
 const g=new Game(map);const layout=[['ranger',0],['arcane',6],['cannon',2],['frost',4],['grove',1],['arcane',5],['cannon',7],['ranger',3],['arcane',9],['frost',8]];
 for(let w=1;w<=10;w++){
  for(const[k,p]of layout)if(!g.towers.some(t=>t.pad===p))g.build(k,p);
  for(const t of g.towers)if(t.level===1&&g.gold>=g.upgradeCost(t))g.upgrade(t.id);
  for(const t of g.towers)if(t.level===2&&g.gold>=g.upgradeCost(t))g.upgrade(t.id,1);
  assert(g.startWave());let elapsed=0;
  while(g.phase==='battle'&&elapsed<180){g.step(1/60);elapsed+=1/60;g.drainEvents();}
  assert.notEqual(g.phase,'lost',`map ${map} lost on wave ${w}`);assert(elapsed<180,'wave hung');
 }
 assert.equal(g.phase,'won');campaign.push({map:MAPS[map].name,lives:g.lives,kills:g.kills,gold:g.gold,towers:g.towers.length,time:+g.time.toFixed(1)});
});
test('Gorath changes phases once and calls exactly four reinforcements',()=>{const g=new Game();g.startWave();g.queue=[];const e=g.spawn('boss');e.d=200;Object.assign(e,position(g.path,e.d));e.hp=e.maxHp*.65;g.step(.01);assert(e.ironhide);assert(!e.enraged);const armor=e.armor;e.hp=e.maxHp*.32;g.step(.01);assert(e.enraged);assert.equal(g.enemies.filter(e=>e.type==='skeleton').length,4);tick(g,.2);assert.equal(e.armor,armor);assert.equal(g.enemies.filter(e=>e.type==='skeleton').length,4);const phases=g.drainEvents().filter(e=>e.type==='boss-phase');assert.deepEqual(phases.map(e=>e.phase),[2,3]);});
test('Walking state and distance freeze with ice, and frozen enemies cannot attack',()=>{const g=new Game();g.startWave();g.queue=[];const e=g.spawn('brute');e.d=200;Object.assign(e,position(g.path,e.d));g.step(.1);assert(e.moving);const d=e.d;e.freeze=3;g.hero.x=e.x;g.hero.y=e.y;g.hero.tx=e.x;g.hero.ty=e.y;const hp=g.hero.hp;tick(g,.2);assert.equal(e.moving,false);assert.equal(e.d,d);assert.equal(g.hero.hp,hp);g.moveHero(500,300);g.step(.1);assert(g.hero.moving);assert(g.hero.walkDistance>0);});
test('All eight classes and sixteen branches progress to level 5 with increasing stats and a hard cap',()=>{
 assert.equal(Object.keys(TYPES).length,8);
 for(const type of Object.keys(TYPES))for(let branch=0;branch<2;branch++){
  const g=new Game();g.gold=10000;const t=g.build(type,0);let prior=g.stats(t),spent=TYPES[type].cost;
  for(let level=2;level<=5;level++){const cost=g.upgradeCost(t),gold=g.gold;g.gold=cost-1;assert.equal(g.upgrade(t.id,branch),false);assert.equal(t.level,level-1);g.gold=gold;assert(g.upgrade(t.id,branch));assert.equal(t.level,level);assert.equal(g.gold,gold-cost);spent+=cost;const stats=g.stats(t);assert(stats.damage>prior.damage);assert(stats.range>prior.range);assert(stats.rate<prior.rate);prior=stats;if(level>=3)assert.equal(t.branch,branch);}
  assert.equal(t.spent,spent);const gold=g.gold;assert.equal(g.upgrade(t.id,0),false);assert.equal(g.gold,gold);assert.equal(t.branch,branch);assert.equal(g.upgradeCost(t),0);
 }
});
function arena(type,level=1,branch=0){const g=new Game();g.gold=10000;const t=g.build(type,0);while(t.level<level)g.upgrade(t.id,branch);g.startWave();g.queue=[];g.hero.x=g.hero.tx=950;g.hero.y=g.hero.ty=600;t.cd=0;return{g,t};}
function target(g,d=135){const e=g.spawn('brute');e.d=d;e.hp=e.maxHp=10000;Object.assign(e,position(g.path,d));return e;}
test('Storm chains hit 3, 5 or 7 distinct nearby enemies; Thunderclap stops motion and attacks',()=>{
 for(const [level,branch,count]of[[1,0,3],[3,0,5],[5,0,7]]){const {g,t}=arena('storm',level,branch);const enemies=Array.from({length:8},(_,i)=>target(g,120+i*5));g.step(.01);assert.equal(enemies.filter(e=>e.hp<e.maxHp).length,count);assert.equal(g.drainEvents().filter(e=>e.type==='shot'&&e.kind==='storm').length,count);}
 const {g}=arena('storm',3,1),e=target(g);g.step(.01);assert(e.stun>0);g.hero.x=g.hero.tx=e.x;g.hero.y=g.hero.ty=e.y;const d=e.d,hp=g.hero.hp;g.step(.1);assert.equal(e.d,d);assert.equal(g.hero.hp,hp);
});
test('Dragonfire burns an area, keeps damage credit, and legendary Hellfire increases the burn',()=>{
 const {g,t}=arena('dragon',5,0),enemies=[target(g,130),target(g,140)];g.step(.01);for(const e of enemies){assert(e.burn>0);assert.equal(e.burnDamage,108);assert.equal(e.burnOwner,t);}const before=enemies[0].hp,damage=t.damage;t.cd=10;g.step(.1);assert(enemies[0].hp<before);assert(t.damage>damage);enemies[0].hp=.01;const kills=g.kills;g.step(.1);assert.equal(g.kills,kills+1);assert.equal(t.kills,1);
});
test('Spirit curses amplify allied damage, expire, and Ancestral Grace heals only a living nearby hero',()=>{
 const {g,t}=arena('spirit',5,0),e=target(g);g.step(.01);assert(Math.abs(e.cursePower-.45)<1e-8);const before=e.hp;g.hit(e,100,null,'magic');assert(Math.abs(e.hp-(before-145))<1e-8);t.cd=100;tick(g,4.1);assert.equal(e.curse,0);
 const a=arena('spirit',3,1),foe=target(a.g);a.g.hero.x=a.g.hero.tx=a.t.x;a.g.hero.y=a.g.hero.ty=a.t.y+20;a.g.hero.hp=100;a.g.step(.01);assert.equal(a.g.hero.hp,112);a.g.hero.hp=0;a.g.hero.revive=10;a.t.cd=0;a.g.step(.01);assert.equal(a.g.hero.hp,0);
});
test('Legendary ranger, arcane, cannon, frost and grove powers affect real attacks',()=>{
 const {g,t}=arena('ranger',5,1),enemies=Array.from({length:6},(_,i)=>target(g,120+i*5));g.step(.01);assert.equal(enemies.filter(e=>e.hp<e.maxHp).length,5);
 for(const type of ['arcane','cannon']){const a=arena(type,5);const current=a.g.stats(a.t),four=a.g.stats({...a.t,level:4});assert(type==='arcane'?current.damage/four.damage>1.5:current.splash/four.splash===1.35);}
 const f=arena('frost',5,1),frozen=target(f.g);f.g.step(.01);assert.equal(frozen.freeze,.4);
 const n=arena('grove',5,1),poisoned=target(n.g);n.g.step(.01);assert.equal(poisoned.poisonDamage,72);
});
test('New fantasy classes and legendary upgrades are affordable through a complete earned-gold campaign',()=>{
 const g=new Game();const layout=[['ranger',0],['arcane',6],['dragon',2],['frost',4],['storm',1],['spirit',5],['grove',7],['cannon',3]];
 for(let wave=1;wave<=10;wave++){
  for(const[type,pad]of layout)if(!g.towers.some(t=>t.pad===pad))g.build(type,pad);
  for(const t of g.towers)if(t.level<2&&g.gold>=g.upgradeCost(t))g.upgrade(t.id);
  const focus=g.towers.find(t=>['dragon','storm','spirit'].includes(t.type)&&t.level<5);if(focus)while(focus.level<5&&g.gold>=g.upgradeCost(focus))g.upgrade(focus.id,focus.level===2?1:undefined);
  if(wave>5&&!g.relic)g.chooseRelic('ember');assert(g.startWave());let time=0;while(g.phase==='battle'&&time<180){g.step(1/60);time+=1/60;g.drainEvents();}assert.notEqual(g.phase,'lost');assert(time<180);
 }
 assert.equal(g.phase,'won');assert(g.towers.some(t=>t.level===5),'At least one fantasy tower must reach level 5 with earned gold');campaign.push({map:'Eight-class legendary campaign',lives:g.lives,gold:g.gold,legendary:g.towers.filter(t=>t.level===5).map(t=>t.type),time:+g.time.toFixed(1)});
});
console.log(JSON.stringify({passed,campaign},null,2));
