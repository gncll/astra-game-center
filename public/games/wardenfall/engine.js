(function(root){
'use strict';
const TYPES = {
 ranger:{name:'Ranger Lodge',role:'Physical • rapid fire',cost:80,damage:23,rate:.75,range:156,color:'#e7ba6d',sprite:0,desc:'Precise volleys punish lightly armored raiders.',branches:[{name:'Eagle Eye',desc:'+45% range, +30% damage',range:1.45,damage:1.3},{name:'Volley',desc:'Strike 3 enemies with each attack',multi:3}]},
 arcane:{name:'Arcane Sanctum',role:'Magic • armor piercing',cost:115,damage:52,rate:1.35,range:143,color:'#ca9dff',sprite:1,desc:'Pure arcane bolts ignore enemy armor.',branches:[{name:'Spellbreaker',desc:'Double damage against armored foes',breaker:true},{name:'Chain Lightning',desc:'Bolts chain to 3 nearby enemies',chain:3}]},
 cannon:{name:'Ironclad Battery',role:'Siege • area damage',cost:145,damage:58,rate:2.1,range:162,splash:57,color:'#ffc181',sprite:2,desc:'Explosive shells break up dense enemy formations.',branches:[{name:'Siegebreaker',desc:'+85% impact damage',damage:1.85},{name:'Earthshaker',desc:'+60% blast radius, slows enemies',splash:1.6,slow:true}]},
 frost:{name:'Frostspire',role:'Frost • crowd control',cost:100,damage:17,rate:.95,range:133,color:'#8cdef5',sprite:3,desc:'Chilling bolts slow their target by 45%.',branches:[{name:'Deep Winter',desc:'Freeze enemies solid for 0.7 seconds',freeze:true},{name:'Blizzard',desc:'Chilling attacks hit a small area',aoe:true}]},
 grove:{name:'Elderwood Shrine',role:'Nature • poison & support',cost:125,damage:18,rate:1.2,range:143,color:'#a7d777',sprite:4,desc:'Poisons foes; nearby towers gain 15% attack speed.',branches:[{name:'Wild Growth',desc:'Nearby towers deal 25% more damage',aura:true},{name:'Venomheart',desc:'Poison deals triple damage',venom:true}]},
 storm:{name:'Stormcaller',role:'Lightning • chain attacks',cost:160,damage:32,rate:1.1,range:153,chain:3,color:'#90d9ff',sprite:5,desc:'Lightning leaps between three nearby enemies and ignores armor.',branches:[{name:'Tempest',desc:'Lightning chains to 5 enemies',chain:5},{name:'Thunderclap',desc:'Each lightning strike stuns for 0.35 seconds',stun:.35}]},
 dragon:{name:'Dragon Roost',role:'Dragonfire • blast & burn',cost:195,damage:62,rate:2,range:156,splash:49,color:'#ff9a50',sprite:6,desc:'A perched dragon hurls fireballs that burn clustered enemies for 3 seconds.',branches:[{name:'Hellfire',desc:'Burn damage doubles and lasts 5 seconds',inferno:true},{name:'Scorched Earth',desc:'+60% blast radius and slowing flames',splash:1.6,slow:true}]},
 spirit:{name:'Spirit Well',role:'Spirit • curse & restoration',cost:175,damage:38,rate:1.25,range:148,color:'#83f2d8',sprite:7,desc:'Curses enemies to take 15% more damage from every source for 4 seconds.',branches:[{name:'Soul Rend',desc:'Cursed enemies take 30% more damage',curse:.3},{name:'Ancestral Grace',desc:'Each attack heals Aldric for 12 health within range',heal:12}]}
};
const LEVELS=['Founding','Fortified','Specialized','Exalted','Legendary'];
const CAPSTONES={ranger:'Royal barrage: 2 extra targets per volley.',arcane:'Astral power: +30% spell damage.',cannon:'Titan shells: +35% blast radius.',frost:'Everfrost: every strike freezes for at least 0.4 seconds.',grove:'Worldtree: double poison damage.',storm:'Thunderlord: lightning jumps to 2 extra enemies.',dragon:'Ancient wyrm: double burn damage.',spirit:'Spirit ascendant: curses amplify damage by another 15%.'};
const ENEMIES={
 raider:{name:'Orc Raider',hp:90,speed:37,armor:.06,reward:9,sprite:6,scale:1},
 skeleton:{name:'Risen Soldier',hp:120,speed:32,armor:.3,reward:11,sprite:7,scale:.96},
 runner:{name:'Bloodrunner',hp:72,speed:67,armor:0,reward:9,sprite:6,scale:.8},
 brute:{name:'Stonehide Ogre',hp:385,speed:25,armor:.4,reward:23,sprite:8,scale:1.45},
 wraith:{name:'Frostbound Wraith',hp:165,speed:45,armor:.12,reward:14,sprite:7,scale:1.12},
 boss:{name:'Gorath the Siegebreaker',hp:2700,speed:19,armor:.3,reward:160,sprite:8,scale:2.3}
};
const MAPS=[
 {id:'verdant',name:'The Verdant March',region:'Kingdom of Elderglen',subtitle:'Hold the road. Protect the realm.',asset:'verdant.png',tag:'I',waves:10,path:[[0,242],[140,242],[247,253],[296,291],[287,345],[308,398],[361,440],[440,464],[497,453],[539,409],[567,327],[608,283],[664,271],[708,291],[741,350],[794,375],[840,373],[878,351]],pads:[[151,307],[343,220],[391,360],[432,523],[519,352],[550,244],[650,352],[730,422],[821,435],[737,238]],color:'#b6d398'},
 {id:'frost',name:'Frostcrown Pass',region:'The Northern Reach',subtitle:'An ancient evil stirs beneath the ice.',asset:'frost.png',tag:'II',waves:10,path:[[0,242],[140,242],[247,253],[296,291],[287,345],[308,398],[361,440],[440,464],[497,453],[539,409],[567,327],[608,283],[664,271],[708,291],[741,350],[794,375],[840,373],[878,351]],pads:[[151,307],[343,220],[391,360],[432,523],[519,352],[550,244],[650,352],[730,422],[821,435],[737,238]],color:'#a5ddeb'},
 {id:'blight',name:'The Blighted Hollow',region:'Beyond the Ashen Veil',subtitle:'End the siege at the heart of the corruption.',asset:'blight.png',tag:'III',waves:10,path:[[0,242],[140,242],[247,253],[296,291],[287,345],[308,398],[361,440],[440,464],[497,453],[539,409],[567,327],[608,283],[664,271],[708,291],[741,350],[794,375],[840,373],[878,351]],pads:[[151,307],[343,220],[391,360],[432,523],[519,352],[550,244],[650,352],[730,422],[821,435],[737,238]],color:'#cfade9'}
];
// The northern road is mirrored. Regional rules alter the useful tower mix.
MAPS[1].path=MAPS[1].path.map(([x,y])=>[1000-x,y]);
MAPS[1].pads=MAPS[1].pads.map(([x,y])=>[1000-x,y]);
MAPS[0].rule='Royal roads: a balanced battlefield for every tower class.';
MAPS[1].rule='Northern winds: slower enemies; Winter’s grasp lasts 25% longer.';
MAPS[2].rule='Living corruption: enemies regenerate unless poisoned. Bring a grove.';
const RELICS={ember:{name:'Emberheart Sigil',desc:'All towers deal 16% more damage.',icon:'fire'},gale:{name:'Galeweaver’s Feather',desc:'All towers attack 12% faster.',icon:'flower'},dawn:{name:'Dawnstone Pendant',desc:'Ability cooldowns drop 22%; Aldric gains 90 maximum health.',icon:'cross'}};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function makePath(points){
 const samples=[];
 for(let i=0;i<points.length-1;i++){
  const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
  for(let j=0;j<24;j++){let t=j/24;const at=k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t);samples.push({x:at(0),y:at(1)});}
 } samples.push({x:points.at(-1)[0],y:points.at(-1)[1]});let length=0;
 samples.forEach((p,i)=>{if(i)length+=dist(p,samples[i-1]);p.d=length;});return{samples,length};
}
function position(path,d){
 const s=path.samples;let lo=0,hi=s.length-1;while(lo<hi){let mid=(lo+hi)>>1;if(s[mid].d<d)lo=mid+1;else hi=mid;}if(lo===0)return{x:s[0].x,y:s[0].y};const a=s[lo-1],b=s[lo],t=Math.min(1,(d-a.d)/(b.d-a.d));return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
}
function wavePlan(w,map=0){
 const list=[];const n=7+w*2+map*2;
 for(let i=0;i<n;i++){
  let type=w>=3&&i%5===2?'skeleton':'raider';
  if(w>=2&&i%5===1)type='runner';if(w>=4&&i%7===4)type='brute';if(w>=6&&i%6===3)type='wraith';
  list.push({type,at:i*(w>6?.65:.85)});
 }if(w===5)list.push({type:'brute',at:n*.85+1});if(w===10)list.push({type:'boss',at:n*.65+1});return list;
}
class Game{
 constructor(mapIndex=0,talents={}){
  this.mapIndex=mapIndex;this.map=MAPS[mapIndex];this.talents=talents;this.path=makePath(this.map.path);this.gold=420+(talents.wealth||0)*35;this.lives=20;this.wave=0;this.phase='prepare';this.enemies=[];this.towers=[];this.events=[];this.queue=[];this.waveTime=0;this.time=0;this.kills=0;this.damage=0;this.nextId=1;this.cooldowns={meteor:0,frost:0,rally:0};this.hero={x:mapIndex===1?176:824,y:372,tx:mapIndex===1?176:824,ty:372,hp:300,maxHp:300,level:1,xp:0,cd:0,revive:0};this.totalEarned=0;
 }
 emit(type,data={}){this.events.push({type,...data});}
 drainEvents(){const e=this.events;this.events=[];return e;}
 stats(t){const a=TYPES[t.type],b=t.branch==null?{}:a.branches[t.branch],legend=t.level===5,up=1+(t.level-1)*.42;return{...a,damage:a.damage*up*(b.damage||1)*(legend&&t.type==='arcane'?1.3:1)*(1+(this.talents.power||0)*.06)*(this.relic==='ember'?1.16:1),range:a.range*(1+(t.level-1)*.06)*(b.range||1),rate:a.rate/(1+(t.level-1)*.12)/(this.relic==='gale'?1.12:1),splash:(a.splash||0)*(b.splash||1)*(legend&&t.type==='cannon'?1.35:1),chain:(b.chain||a.chain||0)+(legend&&t.type==='storm'?2:0),multi:(b.multi||1)+(legend&&t.type==='ranger'?2:0),burnDamage:t.type==='dragon'?(12+t.level*3)*(b.inferno?2:1)*(legend?2:1):0,cursePower:t.type==='spirit'?(b.curse||.15)+(legend?.15:0):0,branch:b};}
 chooseRelic(key){if(!RELICS[key]||this.relic||this.wave<5||this.phase!=='prepare')return false;this.relic=key;if(key==='dawn'){this.hero.maxHp+=90;this.hero.hp=this.hero.maxHp;}this.emit('relic',{key});return true;}
 build(type,pad){
  if(!TYPES[type]||!this.map.pads[pad]||this.towers.some(t=>t.pad===pad)||this.gold<TYPES[type].cost||['won','lost'].includes(this.phase))return false;
  const [x,y]=this.map.pads[pad];const t={id:this.nextId++,type,pad,x,y,level:1,branch:null,cd:.25,spent:TYPES[type].cost,kills:0,damage:0,target:'first'};this.towers.push(t);this.gold-=t.spent;this.emit('build',{tower:t});return t;
 }
 upgradeCost(t){return t.level>=5?0:Math.round(TYPES[t.type].cost*[0,.8,1.25,1.65,2.15][t.level]);}
 upgrade(id,branch){const t=this.towers.find(t=>t.id===id);if(!t||t.level>=5)return false;if(t.level===2&&branch!==0&&branch!==1)return false;const cost=this.upgradeCost(t);if(this.gold<cost)return false;this.gold-=cost;t.spent+=cost;t.level++;if(t.level===3)t.branch=branch;this.emit('upgrade',{tower:t});return true;}
 sell(id){const t=this.towers.find(t=>t.id===id);if(!t)return false;this.gold+=Math.floor(t.spent*.7);this.towers=this.towers.filter(t=>t.id!==id);this.emit('sell',{x:t.x,y:t.y});return true;}
 startWave(){if(this.phase!=='prepare'||this.wave>=this.map.waves)return false;this.wave++;this.queue=wavePlan(this.wave,this.mapIndex);this.waveTime=0;this.phase='battle';this.emit('wave',{wave:this.wave});return true;}
 spawn(type,overrides={}){const def=ENEMIES[type],scale=1+(this.wave-1)*.16+this.mapIndex*.22;const e={...def,...overrides,id:this.nextId++,type,maxHp:def.hp*scale,hp:def.hp*scale,d:0,x:0,y:187,slow:0,freeze:0,poison:0,poisonDamage:0,attackCd:0,dead:false,hit:0,owner:null};this.enemies.push(e);return e;}
 hit(e,amount,source,kind='physical'){
  if(e.dead)return;const dealt=Math.min(e.hp,amount*(kind==='magic'?1:1-e.armor)*(e.curse>0?1+e.cursePower:1));e.hp-=dealt;e.hit=.13;this.damage+=dealt;if(source){source.damage=(source.damage||0)+dealt;}
  if(e.hp<=0){e.dead=true;this.kills++;this.gold+=e.reward;this.totalEarned+=e.reward;if(source)source.kills=(source.kills||0)+1;this.hero.xp+=10;this.emit('kill',{x:e.x,y:e.y,reward:e.reward,boss:e.type==='boss',actor:{sprite:e.sprite,scale:e.scale,d:e.d,x:e.x,y:e.y,facing:e.facing}});if(this.hero.xp>=this.hero.level*80){this.hero.xp-=this.hero.level*80;this.hero.level++;this.hero.maxHp+=45;this.hero.hp=this.hero.maxHp;this.emit('level',{level:this.hero.level});}}
 }
 cast(spell,x,y){
  if(!Object.hasOwn(this.cooldowns,spell)||this.cooldowns[spell]>0||this.phase!=='battle')return false;
  const reduction=(1-(this.talents.wisdom||0)*.08)*(this.relic==='dawn'?.78:1);
  if(spell==='meteor'){this.cooldowns.meteor=30*reduction;this.enemies.forEach(e=>{if(dist(e,{x,y})<112)this.hit(e,230+this.hero.level*18,null,'magic');});this.emit('meteor',{x,y});}
  if(spell==='frost'){this.cooldowns.frost=23*reduction;this.enemies.forEach(e=>{if(dist(e,{x,y})<142){e.freeze=3.8*(this.mapIndex===1?1.25:1);e.slow=6;}});this.emit('frost',{x,y});}
  if(spell==='rally'){this.cooldowns.rally=35*reduction;this.hero.hp=this.hero.maxHp;this.hero.revive=0;this.rally=8;this.emit('rally',{x:this.hero.x,y:this.hero.y});}
  return true;
 }
 moveHero(x,y){this.hero.tx=Math.max(20,Math.min(965,x));this.hero.ty=Math.max(80,Math.min(595,y));this.emit('move',{x:this.hero.tx,y:this.hero.ty});}
 step(dt){
  dt=Math.min(.1,Math.max(0,dt));if(this.phase!=='battle'&&this.phase!=='prepare')return;this.time+=dt;this.rally=Math.max(0,(this.rally||0)-dt);
  for(const s in this.cooldowns)this.cooldowns[s]=Math.max(0,this.cooldowns[s]-dt);
  const h=this.hero;h.cd-=dt;h.revive=Math.max(0,h.revive-dt);if(h.hp<=0&&h.revive===0)h.hp=h.maxHp;
  const hd=dist(h,{x:h.tx,y:h.ty});h.moving=hd>2&&h.hp>0;if(h.moving){const step=Math.min(hd,86*dt);if(Math.abs(h.tx-h.x)>1)h.facing=h.tx>h.x?1:-1;h.walkDistance=(h.walkDistance||0)+step;h.x+=(h.tx-h.x)/hd*step;h.y+=(h.ty-h.y)/hd*step;}
  if(this.phase==='prepare'){if(h.hp>0)h.hp=Math.min(h.maxHp,h.hp+dt*30);return;}
  this.waveTime+=dt;
  while(this.queue.length&&this.queue[0].at<=this.waveTime){const item=this.queue.shift();this.spawn(item.type);}
  for(const e of this.enemies){
   if(e.dead)continue;e.slow=Math.max(0,e.slow-dt);e.freeze=Math.max(0,e.freeze-dt);e.stun=Math.max(0,(e.stun||0)-dt);e.curse=Math.max(0,(e.curse||0)-dt);e.hit=Math.max(0,e.hit-dt);e.attackCd-=dt;
   if(e.burn>0){e.burn-=dt;this.hit(e,e.burnDamage*dt,e.burnOwner,'magic');if(e.dead)continue;}
   if(e.poison>0){e.poison-=dt;this.hit(e,e.poisonDamage*dt,e.owner,'magic');if(e.dead)continue;}
   else if(this.mapIndex===2)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.012*dt);
   if(e.type==='boss'){
    if(e.hp/e.maxHp<.66&&!e.ironhide){e.ironhide=true;e.armor=Math.min(.6,e.armor+.18);this.emit('boss-phase',{phase:2,name:'Ironhide',detail:'His armor hardens. Arcane damage cuts through.',x:e.x,y:e.y});}
    if(e.hp/e.maxHp<.33&&!e.enraged){e.enraged=true;this.emit('boss-phase',{phase:3,name:'Last Fury',detail:'Gorath charges and summons the fallen!',x:e.x,y:e.y});for(let i=0;i<4;i++){const add=this.spawn('skeleton');add.d=Math.max(0,e.d-25-i*19);Object.assign(add,position(this.path,add.d));}}
   }
   let blocked=false;
   if(h.hp>0&&dist(e,h)<38){blocked=true;if(e.freeze<=0&&e.stun<=0&&e.attackCd<=0){e.attackCd=e.enraged?.8:1.2;h.hp-=e.type==='boss'?75:e.type==='brute'?32:12;this.emit('melee',{x:h.x,y:h.y,color:'#f2ac88'});if(h.hp<=0){h.hp=0;h.revive=12;this.emit('heroDown');}}}
   e.moving=!blocked&&e.freeze<=0&&e.stun<=0;if(e.moving)e.d+=e.speed*dt*(this.mapIndex===1?.9:1)*(e.slow>0?.55:1)*(e.enraged?1.35:1);
   const p=position(this.path,e.d);if(Math.abs(p.x-e.x)>.001)e.facing=p.x>e.x?1:-1;e.x=p.x;e.y=p.y;
   if(e.d>=this.path.length){e.dead=true;this.lives-=e.type==='boss'?5:1;this.emit('leak',{x:e.x,y:e.y});if(this.lives<=0){this.lives=0;this.phase='lost';this.emit('lost');return;}}
  }
  if(h.hp>0&&h.cd<=0){const e=this.enemies.find(e=>!e.dead&&dist(e,h)<87);if(e){h.cd=.9;this.hit(e,31+h.level*8,null,'magic');this.emit('shot',{x:h.x,y:h.y-25,tx:e.x,ty:e.y-15,color:'#ffe7a2',kind:'hero'});}}
  for(const t of this.towers){
   const a=this.stats(t);const groves=this.towers.filter(v=>v.type==='grove'&&v.id!==t.id&&dist(t,v)<165);const buff=groves.length>0?1.15:1;t.cd-=dt*buff*(this.rally>0?1.4:1);if(t.cd>0)continue;
   const targets=this.enemies.filter(e=>!e.dead&&dist(t,e)<a.range);if(!targets.length)continue;
   targets.sort(t.target==='strong'?(u,v)=>v.hp-u.hp:t.target==='near'?(u,v)=>dist(u,t)-dist(v,t):(u,v)=>v.d-u.d);const e=targets[0];t.cd=a.rate;
   const damage=a.damage*(groves.some(g=>this.stats(g).branch.aura)?1.25:1);let victims=[e];
   if(a.splash||a.branch.aoe)victims=this.enemies.filter(v=>!v.dead&&dist(v,e)<(a.splash||60));
   else if(a.chain){while(victims.length<a.chain){const last=victims.at(-1),next=targets.filter(v=>!victims.includes(v)&&dist(v,last)<110).sort((u,v)=>dist(u,last)-dist(v,last))[0];if(!next)break;victims.push(next);}}
   else if(a.multi>1)victims=targets.slice(0,a.multi);
   for(const [index,v] of victims.entries()){
    const magic=!['ranger','cannon'].includes(t.type);this.hit(v,damage*(a.branch.breaker&&v.armor>.2?2:1),t,magic?'magic':'physical');
    if(t.type==='frost'||a.branch.slow)v.slow=2.5;if(a.branch.freeze||t.type==='frost'&&t.level===5)v.freeze=Math.max(v.freeze,a.branch.freeze?.7:.4);
    if(a.branch.stun)v.stun=a.branch.stun;
    if(t.type==='grove'){v.poison=3;v.poisonDamage=(a.branch.venom?36:12)*(t.level===5?2:1);v.owner=t;}
    if(t.type==='dragon'){v.burn=a.branch.inferno?5:3;v.burnDamage=a.burnDamage;v.burnOwner=t;}
    if(t.type==='spirit'){v.cursePower=Math.max(v.curse>0?v.cursePower:0,a.cursePower);v.curse=4;}
    if(v===e||a.chain||a.multi>1){const from=a.chain&&index>0?victims[index-1]:null;this.emit('shot',{x:from?from.x:t.x,y:from?from.y-15:t.y-48,tx:v.x,ty:v.y-15,color:a.color,kind:t.type,splash:a.splash,chain:!!a.chain});}
   }
   if(a.branch.heal&&h.hp>0&&h.hp<h.maxHp&&dist(t,h)<a.range){h.hp=Math.min(h.maxHp,h.hp+a.branch.heal);this.emit('heal',{x:h.x,y:h.y});}
  }
  this.enemies=this.enemies.filter(e=>!e.dead);
  if(this.queue.length===0&&this.enemies.length===0){const bonus=50+this.wave*18;this.gold+=bonus;this.emit('clear',{wave:this.wave,bonus});if(this.wave===this.map.waves){this.phase='won';this.emit('won',{stars:this.lives>=18?3:this.lives>=10?2:1});}else this.phase='prepare';}
 }
}
const api={Game,TYPES,ENEMIES,MAPS,RELICS,LEVELS,CAPSTONES,makePath,position,wavePlan,dist};if(typeof module!=='undefined')module.exports=api;else root.WardenCore=api;
})(typeof window!=='undefined'?window:globalThis);
