import * as THREE from 'three';
import {CUT_TREE,LOG_PICKUP,CAMP,POND,FISH_STOP} from './demo-survival-layout.js';
import {heightAt} from './demo-world.js';
const V=THREE.Vector3;
export class CampScene{
 constructor(scene,assets,player,wood){
  this.scene=scene;this.player=player;this.time=0;this.root=new THREE.Group();scene.add(this.root);
  const source=assets.camp.scene;let scannedStone;assets.rocks.scene.traverse(o=>{if(o.isMesh&&!scannedStone)scannedStone=o.material;});
  const clone=name=>{const o=source.getObjectByName(name).clone(true);o.traverse(c=>{if(c.isMesh){c.castShadow=c.receiveShadow=true;c.material=c.material.name==='camp stone'?scannedStone.clone():c.material.clone();if(c.material.name==='camp wood'){c.material.map=wood;c.material.bumpMap=wood;c.material.bumpScale=.015;}}});this.root.add(o);return o;};
  const put=(o,p,y=0)=>o.position.set(p.x,heightAt(p.x,p.z)+y,p.z);
  this.stump=clone('Stump');put(this.stump,CUT_TREE);this.stump.scale.setScalar(.55);
  this.tree=assets['pine-0'].scene.clone(true);this.tree.scale.setScalar(.52);this.tree.position.set(CUT_TREE.x,heightAt(CUT_TREE.x,CUT_TREE.z)+.32,CUT_TREE.z);this.tree.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});this.root.add(this.tree);
  this.logs=clone('Logs');put(this.logs,LOG_PICKUP);
  this.ring=clone('FireRing');put(this.ring,CAMP);this.fuel=clone('Firewood');put(this.fuel,CAMP);this.rack=clone('CookingRack');put(this.rack,CAMP);
  this.axe=clone('Axe');this.rod=clone('FishingRod');this.fish=clone('Trout');this.cookingFish=clone('Trout');put(this.cookingFish,CAMP,.62);this.cookingFish.rotation.y=.3;
  this.hand=null;player.traverse(o=>{if(o.isBone&&(o.name==='handR'||o.name==='hand_R'||o.name==='hand.R'))this.hand=o;});
  if(!this.hand)throw new Error('Right-hand bone is required for survival tools');
  this.flames=[];const flameGeometry=new THREE.SphereGeometry(1,12,12);
  for(let i=0;i<7;i++){const m=new THREE.ShaderMaterial({uniforms:{time:{value:0},seed:{value:i*1.37}},transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,vertexShader:'uniform float time;uniform float seed;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.x*=.12+sin(uv.y*3.14159)*.88;p.x+=sin(time*7.+uv.y*9.+seed)*.04*uv.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:'uniform float time;uniform float seed;varying vec2 vUv;void main(){float edge=pow(max(0.,1.-abs(vUv.x-.5)*2.),1.6);float h=smoothstep(0.,.12,vUv.y)*(1.-smoothstep(.35,1.,vUv.y));float n=.65+.2*sin(vUv.y*23.-time*10.+seed)+.1*sin(vUv.x*37.+time*3.);vec3 c=mix(vec3(1.,.78,.16),vec3(1.,.12,.005),vUv.y);gl_FragColor=vec4(c,edge*h*n*.65);}'});const o=new THREE.Mesh(new THREE.PlaneGeometry(.32,.8,6,12),m);this.root.add(o);this.flames.push(o);}
  this.smoke=[];const sm=new THREE.MeshBasicMaterial({color:0x8d9084,transparent:true,opacity:.08,depthWrite:false});for(let i=0;i<5;i++){const o=new THREE.Mesh(flameGeometry,sm);this.root.add(o);this.smoke.push(o);}
  this.firelight=new THREE.PointLight(0xffa441,0,7,2);this.firelight.position.set(CAMP.x,heightAt(CAMP.x,CAMP.z)+.65,CAMP.z);scene.add(this.firelight);
  const pondGeo=new THREE.CircleGeometry(1,80);pondGeo.rotateX(-Math.PI/2);pondGeo.scale(POND.rx,1,POND.rz);
  this.waterMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0}},transparent:true,side:THREE.DoubleSide,vertexShader:'varying vec2 vUv; varying vec3 wp; void main(){vUv=uv; vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',fragmentShader:'uniform float time;varying vec2 vUv;varying vec3 wp;void main(){float w=.5*sin(wp.x*5.3+wp.z*2.4+time*1.3+.8*sin(wp.z*1.5+time*.3))+.3*sin(wp.z*9.-wp.x*1.7-time*.8);float ripple=pow(max(0.,w),5.);vec3 c=mix(vec3(.055,.16,.135),vec3(.32,.49,.47),.48+.1*w)+ripple*.035;float edge=1.-smoothstep(.44,.50,length(vUv-.5));gl_FragColor=vec4(c,.85*edge+.08);}'});
  this.water=new THREE.Mesh(pondGeo,this.waterMaterial);this.water.position.set(POND.x,POND.level,POND.z);this.root.add(this.water);
  // A modest shoreline and reed clumps make the water edge readable.
  const shoreMat=new THREE.MeshStandardMaterial({color:0x626755,roughness:.95});for(let i=0;i<22;i++){const a=i/22*Math.PI*2,p={x:POND.x+Math.cos(a)*POND.rx*1.07,z:POND.z+Math.sin(a)*POND.rz*1.07};const o=new THREE.Mesh(new THREE.IcosahedronGeometry(.12+(i%4)*.025,1),shoreMat);put(o,p,.02);o.scale.set(1.5,.65,1);this.root.add(o);}
  const reedMat=new THREE.MeshStandardMaterial({color:0x656644,roughness:1});for(let i=0;i<40;i++){const a=.4+(i/40)*4.7,p={x:POND.x+Math.cos(a)*POND.rx*.99,z:POND.z+Math.sin(a)*POND.rz*.99};const o=new THREE.Mesh(new THREE.CylinderGeometry(.007,.012,.4+(i%5)*.08,5),reedMat);o.position.set(p.x,POND.level+.2+(i%5)*.04,p.z);o.rotation.z=Math.sin(i)*.12;this.root.add(o);}
  this.bobber=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),new THREE.MeshBasicMaterial({color:0xf15c31}));this.bobber.position.set(POND.x-.5,POND.level+.07,POND.z);this.root.add(this.bobber);
  this.line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V(),new V()]),new THREE.LineBasicMaterial({color:0xdad5ad,transparent:true,opacity:.8}));this.root.add(this.line);
  this.ripple=new THREE.Mesh(new THREE.RingGeometry(.12,.145,48),new THREE.MeshBasicMaterial({color:0xd8e6c6,transparent:true,opacity:.55,side:THREE.DoubleSide}));this.ripple.rotation.x=-Math.PI/2;this.root.add(this.ripple);
  this.markers=[];for(const [p,label] of [[CUT_TREE,'FIREWOOD'],[CAMP,'CAMPFIRE'],[FISH_STOP,'FISHING BANK']])this.marker(p,label,wood);
 }
 marker(p,label,wood){const x=p.x+.7,z=p.z-.7;const post=new THREE.Mesh(new THREE.BoxGeometry(.065,.75,.065),new THREE.MeshStandardMaterial({map:wood,color:0x887854,roughness:1}));post.position.set(x,heightAt(x,z)+.37,z);this.root.add(post);const c=document.createElement('canvas');c.width=512;c.height=100;const ctx=c.getContext('2d');ctx.fillStyle='#24392e';ctx.fillRect(0,0,512,100);ctx.strokeStyle='#baad79';ctx.lineWidth=6;ctx.strokeRect(4,4,504,92);ctx.fillStyle='#efe3bd';ctx.font='bold 38px Georgia';ctx.textAlign='center';ctx.fillText(label,256,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.78,.155),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));mesh.position.set(x,heightAt(x,z)+.76,z);this.root.add(mesh);}
 frame(s,p,dt,freeze){
  if(!freeze)this.time+=dt;const t=this.time,a=s.action,kind=a?.kind;this.waterMaterial.uniforms.time.value=t;
  const fall=THREE.MathUtils.smoothstep(s.fall,0,2);this.tree.rotation.z=fall*Math.PI*.49+(s.hits<4&&kind==='chop'?Math.sin(a.elapsed*24)*.005:0);this.tree.position.y=heightAt(CUT_TREE.x,CUT_TREE.z)+.17*fall;this.stump.visible=s.hits>=4;
  this.logs.visible=s.hits>=4&&s.fall>=2&&!s.woodCollected;this.fuel.visible=s.fire||kind==='light'&&a.elapsed>.8;
  this.firelight.intensity=s.fire?4+Math.sin(t*11)*.6:0;
  this.flames.forEach((o,i)=>{o.visible=s.fire;const q=t*(1.1+i*.08)+i*2.1;o.material.uniforms.time.value=t;o.position.set(CAMP.x+Math.sin(i*3)*.19,heightAt(CAMP.x,CAMP.z)+.47+Math.sin(q)*.035,CAMP.z+Math.cos(i*3)*.19);o.scale.set(.7+(i%3)*.14,.65+Math.sin(q)*.16,1);o.rotation.y=Math.atan2(p.x-CAMP.x,p.z-CAMP.z);});
  this.smoke.forEach((o,i)=>{o.visible=s.fire;const f=(t*.22+i/5)%1;o.position.set(CAMP.x+.4*f, heightAt(CAMP.x,CAMP.z)+.65+f*2,CAMP.z+Math.sin(i)*f*.14);o.scale.setScalar(.08+f*.26);});
  this.cookingFish.visible=(kind==='cook'||s.mealReady)&&!s.eaten;
  if(this.cookingFish.visible)this.cookingFish.traverse(o=>{if(o.isMesh&&o.material.name==='trout scales')o.material.color.set(s.mealReady?0xa66f38:0x91a690);});
  this.player.updateWorldMatrix(true,true);const hand=new V();this.hand.getWorldPosition(hand);
  const angle=p.angle,forward=new V(Math.sin(angle),0,Math.cos(angle));
  this.axe.visible=kind==='chop';this.rod.visible=['cast','fish','catch'].includes(kind);this.fish.visible=kind==='catch'||kind==='eat';
  if(this.axe.visible){const strike=THREE.MathUtils.smoothstep(a.elapsed,.35,.63),recover=1-THREE.MathUtils.smoothstep(a.elapsed,.69,.9);const direction=forward.clone().multiplyScalar(.4+.6*strike*recover).add(new V(0,.9-1.1*strike*recover,0)).normalize();this.axe.position.copy(hand);this.axe.quaternion.setFromUnitVectors(new V(0,1,0),direction);this.axe.rotateY(Math.PI/2);}
  if(this.rod.visible){let loft=.32;if(kind==='cast')loft=1.6-1.28*Math.min(1,a.elapsed/a.duration);this.rod.position.copy(hand);this.rod.quaternion.setFromUnitVectors(new V(0,1,0),forward.clone().add(new V(0,loft,0)).normalize());}
  const fishing=['cast','fish','catch'].includes(kind);this.bobber.visible=this.line.visible=this.ripple.visible=fishing;
  if(fishing){const bite=kind==='fish'&&a.phase==='bite';this.bobber.position.y=POND.level+.06+(bite?Math.sin(t*24)*.085:Math.sin(t*3)*.012);this.ripple.position.set(this.bobber.position.x,POND.level+.015,this.bobber.position.z);this.ripple.scale.setScalar(.8+(t*(bite?2:.5)%1)*2);this.ripple.material.opacity=bite?.75:.27;const tip=new V(0,2.15,.08).applyQuaternion(this.rod.quaternion).add(hand);const coords=this.line.geometry.attributes.position;coords.setXYZ(0,tip.x,tip.y,tip.z);coords.setXYZ(1,this.bobber.position.x,this.bobber.position.y,this.bobber.position.z);coords.needsUpdate=true;this.line.geometry.computeBoundingSphere();}
  if(this.fish.visible){if(kind==='catch'){const f=Math.min(1,a.elapsed/a.duration);this.fish.position.copy(this.bobber.position).lerp(hand,f);this.fish.position.y+=Math.sin(f*Math.PI)*.65;}else this.fish.position.copy(hand);this.fish.rotation.set(0,t*5,Math.sin(t*18)*.25);}
 }
}
