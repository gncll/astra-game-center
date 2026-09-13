import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {aircraftAt,boatAt,BRIDGE,BRIDGE_ANGLE} from './waterfront.js?v=20260911-s06a';
export class WaterfrontScene{
 constructor(scene){this.scene=scene;this.leaves=[];this.gates=[];this.warnings=[];}
 async init(){
  const loader=new GLTFLoader(),names=['waterfront','bridge-leaf','bridge-gate','airliner','harbor-launch'];
  const assets=await Promise.all(names.map(n=>loader.loadAsync(`models/${n}-s05.glb?v=20260911-s06a`)));
  for(const gltf of assets)gltf.scene.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;const m=o.material;m.envMapIntensity=.55;if(m.name==='glass'){m.metalness=.45;m.roughness=.23;}if(m.name==='white')m.roughness=.65;if(m.name==='stone')m.color.multiplyScalar(.83);if(['asphalt','grass','stone'].includes(m.name)){m.onBeforeCompile=s=>{s.vertexShader='varying vec3 harborSurface;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n harborSurface=(modelMatrix*vec4(transformed,1.)).xyz;');s.fragmentShader='varying vec3 harborSurface;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n float grain=fract(sin(dot(floor(harborSurface.xz*35.),vec2(12.9898,78.233)))*43758.5453);diffuseColor.rgb*=.92+grain*.13;');};m.customProgramCacheKey=()=> 'harbor-surface-v1';}});
  this.static=assets[0].scene;this.scene.add(this.static);
  for(const [z,rotation] of [[BRIDGE.south,0],[BRIDGE.north,Math.PI]]){
   const pivot=new T.Group();pivot.position.set(0,0,z);const orientation=new T.Group();orientation.rotation.y=rotation;orientation.add(assets[1].scene.clone(true));pivot.add(orientation);this.scene.add(pivot);this.leaves.push(pivot);
  }
  for(const z of [BRIDGE.gateSouth,BRIDGE.gateNorth]){
   const pivot=new T.Group();pivot.position.set(-8,1.2,z);pivot.add(assets[2].scene.clone(true));this.scene.add(pivot);this.gates.push(pivot);
   for(const side of [-1,1]){
    const m=new T.MeshStandardMaterial({color:0x4e1010,emissive:0xff2412,emissiveIntensity:0,toneMapped:false});
    const lamp=new T.Mesh(new T.SphereGeometry(.25,12,8),m);lamp.position.set(side*8.3,3.7,z-1);this.scene.add(lamp);this.warnings.push(m);
   }
  }
  this.aircraft=new T.Group();this.aircraft.add(assets[3].scene);this.scene.add(this.aircraft);
  this.launch=new T.Group();this.launch.add(assets[4].scene);this.launch.rotation.y=Math.PI/2;this.scene.add(this.launch);
  this.waterMaterial=new T.ShaderMaterial({uniforms:{time:{value:0},baseColor:{value:new T.Color(0x297a7e)}},vertexShader:`varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`varying vec3 world;uniform float time;uniform vec3 baseColor;void main(){float ripple=sin(world.x*.42+world.z*.8+time*.9)*sin(world.x*.9-world.z*.3-time*.6);float glint=pow(max(0.,ripple),9.);vec3 c=baseColor*(.78+.16*ripple)+vec3(.55,.49,.28)*glint*.7;gl_FragColor=vec4(c,1.);}`});
  this.water=new T.Mesh(new T.PlaneGeometry(1200,40),this.waterMaterial);this.water.rotation.x=-Math.PI/2;this.water.position.set(100,-3,-290);this.scene.add(this.water);
  const wakeMat=new T.MeshBasicMaterial({color:0xd7eee4,transparent:true,opacity:.24,depthWrite:false});this.wake=new T.Mesh(new T.PlaneGeometry(10,4),wakeMat);this.wake.rotation.x=-Math.PI/2;this.scene.add(this.wake);
 }
 update(s){
  this.leaves[0].rotation.x=s.leaf*BRIDGE_ANGLE;this.leaves[1].rotation.x=-s.leaf*BRIDGE_ANGLE;
  this.gates.forEach((gate,i)=>{const broken=s[i===0?'brokenSouth':'brokenNorth'];gate.rotation.set(0,broken?Math.PI/2:0,broken?-.08:(1-s.gate)*Math.PI/2);});
  this.warnings.forEach((m,i)=>{m.emissiveIntensity=s.phase!=='open'&&(Math.floor(s.time*2)+i)%2===0?2.5:.05;});
  const plane=aircraftAt(s.planeTime);this.aircraft.position.set(plane.x,plane.y,plane.z);this.aircraft.rotation.set(0,plane.heading,-plane.pitch);
  this.aircraft.visible=plane.opacity===undefined||plane.opacity>.01;
  // Fade only behind the eastern service hangar, never on the approach/landing path.
  if(plane.opacity!==undefined){this.aircraft.traverse(o=>{if(o.isMesh){o.material.transparent=plane.opacity<1;o.material.opacity=plane.opacity;}});}else this.aircraft.traverse(o=>{if(o.isMesh){o.material.transparent=false;o.material.opacity=1;}});
  const boat=boatAt(s);this.launch.position.set(boat.x,boat.y,boat.z);this.launch.visible=boat.visible;this.launch.rotation.z=Math.sin(s.time*1.2)*.025;this.wake.visible=boat.visible;this.wake.position.set(boat.x-8,-2.985,boat.z);
  this.waterMaterial.uniforms.time.value=s.time;
 }
}
