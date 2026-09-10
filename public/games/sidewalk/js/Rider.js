import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { loadKenney, instantiateKenney } from './Assets.js';
export async function attachRider(skater) {
 const gltf=await loadKenney('character-skate-boy');
 const rig=clone(gltf.scene); const box=new THREE.Box3().setFromObject(rig), size=box.getSize(new THREE.Vector3());
 rig.scale.setScalar(1.22/size.y); rig.rotation.y=-Math.PI/2;
 rig.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 const holder=new THREE.Group(); holder.position.y=.22; holder.add(rig); skater.model.add(holder);
 skater.parts.riderRoot.visible=false;
 const mixer=new THREE.AnimationMixer(rig); const actions={};
 for(const name of ['skate','skate-stand','skate-air','skate-grab']) {const clip=gltf.animations.find(c=>c.name===name); if(clip)actions[name]=mixer.clipAction(clip);}
 let current='';
 const {group:board}=await instantiateKenney('skateboard',{targetFootprint:1.18,alignLongestAxisTo:'z'});
 skater.setKenneyBoard(board,{yOffset:-.075});
 return { rig, animations:Object.keys(actions), update(dt){
   const name=skater.airborne?(skater.grabPose?'skate-grab':'skate-air'):(Math.abs(skater.linearSpeed)>.3?'skate':'skate-stand');
   if(name!==current&&actions[name]){actions[current]?.fadeOut(.15);actions[name].reset().fadeIn(.15).play();current=name;}
   mixer.update(dt);
   holder.position.y=.22-skater.ollieCrouch*.14;
   holder.rotation.z=skater.angularSpeed*.035;
   board.rotation.z=skater.trickSpinFlip;
   board.rotation.x=skater.parts.deck.rotation.x;
 }};
}
