import * as THREE from 'three';
import {CampScene} from './demo-camp-scene.js';
import {survivalClearing,pondDistance} from './demo-survival-layout.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {TRAIL,TREES,ROCKS,CABIN,random,heightAt,pathDistance,cameraPose,floorHeight,inCabin,cameraBlocked} from './demo-world.js';
const V=THREE.Vector3;
export class ForestDemo {
 constructor(canvas){
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.95;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x708b8e);this.scene.fog=new THREE.Fog(0x708b8e,12,39);this.camera=new THREE.PerspectiveCamera(48,1,.06,100);this.yaw=.24;this.pitch=.015;this.distance=3.65;this.target=new V();this.cameraReady=false;this.elapsed=0;
  this.scene.add(new THREE.HemisphereLight(0xc0d8e2,0x7b8270,2.8),new THREE.AmbientLight(0xabbabd,.7));
  const fill=new THREE.DirectionalLight(0xbcd4dc,1.25);fill.position.set(4,7,12);this.scene.add(fill);
  const sun=new THREE.DirectionalLight(0xd7e2df,1.2);sun.position.set(-12,23,-10);sun.target.position.set(0,0,0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-17,right:17,top:18,bottom:-17,near:1,far:60});sun.shadow.bias=-.00015;sun.shadow.normalBias=.018;this.scene.add(sun,sun.target);this.sun=sun;
  const cabinLight=new THREE.PointLight(0xffbb64,16,9,2);cabinLight.position.set(CABIN.x+1.1,2.2,CABIN.z+3);this.scene.add(cabinLight);
  this.resize();window.addEventListener('resize',()=>this.resize());
 }
 resize(){this.renderer.setSize(innerWidth,innerHeight,false);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();}
 async init(status){
  const loader=new GLTFLoader(),tex=new THREE.TextureLoader();this.assets={};let count=0;
  await Promise.all(['survivor','pine-0','pine-1','rocks','ferns','grass','roots','cabin','camp'].map(async name=>{const gltf=await loader.loadAsync(`models/demo/${name==='survivor'?'survivor-actions':name}.glb`);this.assets[name]=gltf;status(`Preparing the trail · ${++count}/9`);}));
  const [floor,normal,rough,wood,mud]=await Promise.all(['assets/source/demo/ground/forest_floor_diff_1k.jpg','assets/source/demo/ground/forest_floor_nor_gl_1k.jpg','assets/source/demo/ground/forest_floor_rough_1k.jpg','assets/weathered-wood.png','assets/source/demo/ground/mud_forest_diff_1k.jpg'].map(p=>tex.loadAsync(p)));
  floor.colorSpace=wood.colorSpace=mud.colorSpace=THREE.SRGBColorSpace;for(const t of [floor,normal,rough,wood,mud]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());}
  this.ground(floor,normal,rough,mud);
  for(let variant=0;variant<2;variant++)this.instances(this.assets['pine-'+variant].scene,TREES.filter(t=>t.variant===variant),true);
  const rockMeshes=[];this.assets.rocks.scene.traverse(o=>{if(o.isMesh)rockMeshes.push(o);});rockMeshes.sort((a,b)=>a.name.localeCompare(b.name));
  const fernMeshes=[];this.assets.ferns.scene.traverse(o=>{if(o.isMesh)fernMeshes.push(o);});fernMeshes.sort((a,b)=>a.name.localeCompare(b.name));
  const rng=random(468),ferns=[],stones=[];
  for(let i=0;i<850;i++){const x=(rng()-.5)*40,z=-20+rng()*40,d=pathDistance(x,z);if(survivalClearing(x,z)||d<1.08||Math.hypot(x-CABIN.x,z-CABIN.z)<4.9||Math.sin(x*.8)*Math.cos(z*.5)<-.42)continue;ferns.push({x,z,scale:.35+rng()*.9,rotation:rng()*Math.PI*2});}
  for(let i=0;i<160;i++){const x=(rng()-.5)*23,z=-16+rng()*28;if(survivalClearing(x,z)||Math.hypot(x-CABIN.x,z-CABIN.z)<4.8)continue;stones.push({x,z,scale:.045+rng()*.08,rotation:rng()*6.28});}
  for(let i=0;i<fernMeshes.length;i++)this.instances(fernMeshes[i],ferns.filter((_,j)=>j%fernMeshes.length===i),false);
  for(let i=0;i<rockMeshes.length;i++)this.instances(rockMeshes[i],[...ROCKS.filter(r=>r.variant===i),...stones.filter((_,j)=>j%rockMeshes.length===i)],true);
  const grassMeshes=[],rootMeshes=[];this.assets.grass.scene.traverse(o=>{if(o.isMesh){const triangles=o.geometry.index.count/3;if(triangles>=800&&triangles<1500)grassMeshes.push(o);}});grassMeshes.sort((a,b)=>a.name.localeCompare(b.name));this.assets.roots.scene.traverse(o=>{if(o.isMesh)rootMeshes.push(o);});
  const grasses=[],roots=[];for(let i=0;i<2800;i++){const x=(rng()-.5)*35,z=-20+rng()*34,d=pathDistance(x,z);if(survivalClearing(x,z)||d<.9||Math.hypot(x-CABIN.x,z-CABIN.z)<4.8||Math.sin(x*.8)*Math.cos(z*.6)<-.1)continue;grasses.push({x,z,scale:.8+rng()*1.5,rotation:rng()*6.28});}
  for(let i=0;i<3;i++)this.instances(grassMeshes[i],grasses.filter((_,j)=>j%3===i),false);
  for(const tree of TREES.filter(t=>Math.hypot(t.x,t.z)<14)){for(let i=0;i<3;i++){const angle=i/3*6.28+tree.rotation;roots.push({x:tree.x+Math.cos(angle)*.38,z:tree.z+Math.sin(angle)*.38,scale:tree.scale*.65,rotation:-angle,dy:-.015});}}
  for(let i=0;i<rootMeshes.length;i++)this.instances(rootMeshes[i],roots.filter((_,j)=>j%rootMeshes.length===i),false);
  this.cabin(wood);this.dressing(wood);this.sky();
  this.player=this.assets.survivor.scene;this.player.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material.envMapIntensity=.4;if(o.material.map)o.material.map.anisotropy=8;if(o.material.name==='Weathered olive canvas'){o.material.color.setScalar(1);o.material.normalScale.set(.18,.18);o.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n float clothLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)); diffuseColor.rgb=vec3(.11,.135,.078)*(.75+clothLuma*.7);');};}if(o.material.name==='Woven straps')o.material.color.setRGB(1.1,.65,.17);}});this.scene.add(this.player);this.mixer=new THREE.AnimationMixer(this.player);this.actions={};for(const clip of this.assets.survivor.animations)this.actions[clip.name]=this.mixer.clipAction(clip);this.current='Idle';this.actions.Idle.play();this.actions.Walk.setEffectiveTimeScale(.72);this.camp=new CampScene(this.scene,this.assets,this.player,wood);
 }
 ground(map,normal,rough,mud){
  const g=new THREE.PlaneGeometry(75,75,250,250);g.rotateX(-Math.PI/2);const p=g.attributes.position,colors=[],trails=[],a=new THREE.Color(0xb8c4a8),b=new THREE.Color(0xc8b398);
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,heightAt(x,z));const noise=Math.sin(x*4.7+z*2.6)*.15+Math.sin(z*7.2-x*2.1)*.09,t=1-THREE.MathUtils.smoothstep(pathDistance(x,z)+noise,.4,1.25),c=a.clone().lerp(b,t);colors.push(c.r,c.g,c.b);trails.push(t*.72);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('trail',new THREE.Float32BufferAttribute(trails,1));g.computeVertexNormals();for(const t of [map,normal,rough])t.repeat.set(25,25);
  const m=new THREE.MeshStandardMaterial({map,normalMap:normal,normalScale:new THREE.Vector2(.45,.45),roughnessMap:rough,roughness:.97,vertexColors:true});
  m.onBeforeCompile=shader=>{shader.uniforms.mudMap={value:mud};shader.vertexShader='attribute float trail; varying float vTrail;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vTrail=trail;');shader.fragmentShader='uniform sampler2D mudMap; varying float vTrail;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n vec3 soil=texture2D(mudMap,vMapUv).rgb; diffuseColor.rgb=mix(diffuseColor.rgb,soil*vec3(1.65,1.7,1.62),vTrail);');};
  const ground=new THREE.Mesh(g,m);ground.receiveShadow=true;this.scene.add(ground);
 }
 instances(source,items,shadow){
  source.updateWorldMatrix(true,true);const cells=new Map();for(const item of items){const key=Math.floor(item.x/10)+','+Math.floor(item.z/10);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(item);}
  source.traverse(o=>{if(!o.isMesh)return;o.material.envMapIntensity=.25;if(o.material.map)o.material.map.anisotropy=4;if(o.material.name==='Scanned pine bark')o.material.color.setScalar(1.7);if(o.material.name.includes('Needles')){o.material.emissiveMap=o.material.map;o.material.emissive=new THREE.Color(0xffffff);o.material.emissiveIntensity=.7;o.material.normalScale.set(.25,.25);}
   for(const group of cells.values()){const mesh=new THREE.InstancedMesh(o.geometry,o.material,group.length);mesh.castShadow=shadow&&(!o.material.name.includes('Needles')||group.some(p=>pathDistance(p.x,p.z)<5));mesh.receiveShadow=true;const temp=new THREE.Object3D();group.forEach((p,i)=>{temp.position.set(p.x,heightAt(p.x,p.z)+(p.dy||0)-(source.name.includes('rock')?.04:0),p.z);temp.rotation.set(0,p.rotation||0,0);temp.scale.setScalar(p.scale);temp.updateMatrix();mesh.setMatrixAt(i,temp.matrix.clone().multiply(o.matrixWorld));});mesh.computeBoundingSphere();this.scene.add(mesh);}
  });
 }
 cabin(wood){const prepared=new Set();const cabin=this.assets.cabin.scene;cabin.position.set(CABIN.x,0,CABIN.z);cabin.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;const m=o.material;if(['wood','woodlight','wooddark','roof'].includes(m.name)){const p=o.geometry.attributes.position,n=o.geometry.attributes.normal,uv=[];for(let i=0;i<p.count;i++){uv.push((Math.abs(n.getX(i))>.6?p.getZ(i):p.getX(i))*.5,(Math.abs(n.getY(i))>.6?p.getZ(i):p.getY(i))*.5);}o.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));m.map=wood;m.bumpMap=wood;m.bumpScale=.035;if(!prepared.has(m)){m.color.multiplyScalar(1.3);prepared.add(m);}m.roughness=.88;}if(m.name==='light'){m.emissive=new THREE.Color(0xffb351);m.emissiveIntensity=1.2;}});this.scene.add(cabin);this.door=cabin.getObjectByName('CabinDoorPivot');this.medkit=cabin.getObjectByName('MissionMedkit');this.doorProgress=0;
  const roomLight=new THREE.PointLight(0xffd4a0,17,8,2);roomLight.position.set(CABIN.x+.1,2.85,CABIN.z-.3);this.scene.add(roomLight);
  const tableLight=new THREE.PointLight(0xffdbab,3,3,2);tableLight.position.set(CABIN.x+1.65,2.15,CABIN.z-1.85);this.scene.add(tableLight);
 }
 dressing(wood){
  const timber=new THREE.MeshStandardMaterial({map:wood,color:0x79644a,roughness:1}),metal=new THREE.MeshStandardMaterial({color:0x343a37,roughness:.8});
  const log=new THREE.Mesh(new THREE.CylinderGeometry(.13,.18,3.5,12),timber);log.rotation.z=1.47;log.rotation.y=.55;log.position.set(-3.8,heightAt(-3.8,4)+.18,4);log.castShadow=log.receiveShadow=true;this.scene.add(log);
  const post=new THREE.Mesh(new THREE.BoxGeometry(.13,1.7,.13),timber);post.position.set(-1.75,heightAt(-1.75,-2)+.85,-2);post.castShadow=true;this.scene.add(post);
  const sign=new THREE.Mesh(new THREE.BoxGeometry(1.18,.34,.06),timber);sign.position.copy(post.position).add(new V(0,.56,.105));sign.rotation.y=-.18;this.scene.add(sign);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#e1d4b4';ctx.font='bold 34px Georgia';ctx.textAlign='center';ctx.fillText('← RANGER STATION',256,78);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(1.09,.27),new THREE.MeshStandardMaterial({map:texture,transparent:true,roughness:1}));label.position.copy(sign.position).add(new V(-.006,0,.034));label.rotation.y=sign.rotation.y;this.scene.add(label);
  // A weathered supply box gives the destination a human scale.
  const box=new THREE.Mesh(new THREE.BoxGeometry(.7,.48,.5),timber);box.position.set(CABIN.x+2,.25,CABIN.z+3.5);box.rotation.y=.16;box.castShadow=box.receiveShadow=true;this.scene.add(box);
  for(const x of [-.23,.23]){const band=new THREE.Mesh(new THREE.BoxGeometry(.025,.5,.52),metal);band.position.copy(box.position).add(new V(x,0,0));this.scene.add(band);}
 }
 sky(){const sky=new THREE.Mesh(new THREE.SphereGeometry(80,24,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p;void main(){float h=clamp(normalize(p).y,0.,1.);vec3 c=mix(vec3(.42,.52,.54),vec3(.22,.34,.39),h);gl_FragColor=vec4(c,1.);}'}));this.scene.add(sky);}
 orbit(dx,dy){this.yaw-=dx*.005;this.pitch=THREE.MathUtils.clamp(this.pitch+dy*.003,-.2,.4);}
 frame(p,moving,dt,freeze=false,mission={},survival={}){this.elapsed+=dt;
  this.doorProgress=THREE.MathUtils.damp(this.doorProgress,mission.doorOpen?1:0,6,freeze?0:dt);this.door.rotation.y=-Math.PI*.55*this.doorProgress;this.medkit.visible=!mission.complete;
  this.player.position.set(p.x,floorHeight(p.x,p.z),p.z);this.player.rotation.y+=Math.atan2(Math.sin(p.angle-this.player.rotation.y),Math.cos(p.angle-this.player.rotation.y))*(1-Math.exp(-dt*12));const actionNames={chop:'Chop',light:'Stoke',cast:'Cast',fish:'Fish',catch:'Fish',cook:'Cook',eat:'Eat'},next=freeze?this.current:actionNames[survival.action?.kind]||(moving?'Walk':'Idle');if(next!==this.current){this.actions[this.current].fadeOut(.18);this.actions[next].reset().setEffectiveTimeScale(next==='Walk'?.72:1).fadeIn(.18).play();this.current=next;}this.mixer.update(freeze?0:dt);
  const desiredFov=inCabin(p)?55:48;if(Math.abs(this.camera.fov-desiredFov)>.01){this.camera.fov=THREE.MathUtils.damp(this.camera.fov,desiredFov,5,dt);this.camera.updateProjectionMatrix();}
  const pose=cameraPose(p,this.yaw,this.pitch,this.distance,mission.doorOpen),pos=new V(pose.position.x,pose.position.y,pose.position.z),target=new V(pose.target.x,pose.target.y,pose.target.z);if(!this.cameraReady){this.camera.position.copy(pos);this.target.copy(target);this.cameraReady=true;}else{this.camera.position.lerp(pos,1-Math.exp(-dt*12));this.target.lerp(target,1-Math.exp(-dt*12));}if(cameraBlocked(this.camera.position.x,this.camera.position.y,this.camera.position.z,mission.doorOpen))this.camera.position.copy(pos);
  // A wall can force the camera into the character: hide its surface at that short distance.
  this.player.visible=this.camera.position.distanceTo(this.player.position.clone().add(new V(0,1.48,0)))>.7;
  this.camp.frame(survival,p,dt,freeze);this.camera.lookAt(this.target);this.renderer.render(this.scene,this.camera);
 }
 reset(){this.yaw=.24;this.pitch=.015;this.distance=3.65;this.cameraReady=false;this.player.rotation.y=Math.PI;this.doorProgress=0;this.door.rotation.y=0;this.medkit.visible=true;}
}
