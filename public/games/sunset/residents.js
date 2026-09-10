import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createResidents,stepResidents,residentFloor,residentsBlock} from './resident-motion.js';

export class Residents {
 constructor(scene,gltf,layout){
  this.layout=layout;this.people=createResidents();this.elapsed=0;
  const outfits=[0x214467,0x354c36,0x729ca9,0x592932,0xb7bdc2,0x403452];
  this.actors=this.people.map((p,i)=>{
   const root=clone(gltf.scene);root.scale.setScalar([.96,1.025,.91,1][i%4]);
   root.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;o.geometry.computeBoundingSphere();o.boundingSphere=o.geometry.boundingSphere.clone();o.boundingSphere.radius+=.5;o.frustumCulled=true;const m=o.material=o.material.clone();m.envMapIntensity=.4;if(m.map)m.map.anisotropy=4;
    if(m.name.includes('Worn cotton')){const tint=new T.Color(outfits[i%outfits.length]);m.onBeforeCompile=s=>{s.uniforms.residentTint={value:tint};s.vertexShader='varying float clothY;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nclothY=(modelMatrix*vec4(transformed,1.)).y;');s.fragmentShader='varying float clothY;uniform vec3 residentTint;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat l=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=(clothY>1.15?residentTint:vec3(.07,.10,.13))*(.6+l*1.8);');};}
    if(m.name.includes('skin'))m.color.set([0xfff5e4,0xc18d6f,0xe4bca3,0x9d7965][i%4]);
   });
   const mixer=new T.AnimationMixer(root),walk=mixer.clipAction(gltf.animations.find(a=>a.name==='Walk')),idle=mixer.clipAction(gltf.animations.find(a=>a.name==='Idle'));walk.play();walk.time=i*.17;walk.timeScale=p.speed/1.35;idle.play();idle.setEffectiveWeight(0);scene.add(root);return{root,mixer,walk,idle};
  });this.place(0);this.reset();
 }
 reset(){this.people=createResidents();this.elapsed=0;this.actors.forEach((a,i)=>{a.mixer.setTime(i*.17);});this.place(0);}
 blocked(x,z,r){return residentsBlock(this.people,x,z,r);}
 place(dt){this.people.forEach((p,i)=>{const a=this.actors[i];a.root.position.set(p.x,residentFloor(p),p.z);if(dt===0)a.root.rotation.y=p.angle;else a.root.rotation.y+=Math.atan2(Math.sin(p.angle-a.root.rotation.y),Math.cos(p.angle-a.root.rotation.y))*(1-Math.exp(-dt*8));});}
 update(dt,player,paused){if(paused)return;this.elapsed+=dt;stepResidents(this.people,dt,this.layout,player);this.place(dt);this.people.forEach((p,i)=>{const a=this.actors[i],weight=p.moved>.0001?1:0;a.walk.setEffectiveWeight(weight);a.idle.setEffectiveWeight(1-weight);a.root.visible=Math.hypot(p.x-player.x,p.z-player.z)<85;if(a.root.visible)a.mixer.update(dt);});}
 status(){return `${this.people.length} residents · Walking ${this.people.filter(p=>p.moved>.0001).length} · Time ${this.elapsed.toFixed(1)}s · First ${this.people[0].x.toFixed(2)},${this.people[0].z.toFixed(2)}`;}
}
