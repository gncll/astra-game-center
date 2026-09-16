import * as THREE from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {clone} from '../vendor/SkeletonUtils.js';

const poses={
  wide:[[0,2.9,6.6],[0,1.7,-2.0]],
  judge:[[.5,2.4,-1.35],[0,2.05,-4.2]],
  claimant_counsel:[[-3.0,1.85,-.8],[-2.25,1.45,1.46]],
  defendant_counsel:[[1.15,1.84,-.55],[2.25,1.45,1.46]],
  claimant:[[-2.4,1.7,.1],[-3.25,1.13,1.5]],
  defendant:[[2.4,1.7,.1],[3.25,1.13,1.5]],
};

export class Courtroom3D {
  constructor(amplitude){this.amplitude=amplitude;this.actors={};this.role='judge';this.view='wide';this.active=false;this.speaking=false;this.frames=[];this.target=new THREE.Vector3();this.time=0;}
  async mount(host){
    this.host=host;this.active=true;
    try{
      if(!this.ready)this.ready=this.init();
      await this.ready;
      if(this.host!==host||!this.active)return;
      host.replaceChildren(this.renderer.domElement);
      this.observer?.disconnect();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
      host.dataset.state='ready';host.setAttribute('aria-label','Live 3D courtroom with a judge, two counsel and two parties');
      if(!this.frame){this.last=performance.now();this.frame=requestAnimationFrame(t=>this.tick(t));}
    }catch(e){
      host.dataset.state='error';host.replaceChildren();const p=document.createElement('p');p.className='court-load-error';p.textContent='The 3D courtroom could not load. Reload this page to retry; your prepared case stays in this local session.';host.append(p);console.error('Courtroom load failed',e);throw e;
    }
  }
  async init(){
    const renderer=this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
    renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','Animated 3D courtroom');
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.unmount();this.host.dataset.state='error';this.host.setAttribute('aria-label','3D graphics context lost. Reload to resume.');});
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#b8b8a4');this.scene.fog=new THREE.Fog('#797a68',20,42);
    this.camera=new THREE.PerspectiveCamera(42,1,.05,65);this.camera.position.fromArray(poses.wide[0]);this.target.fromArray(poses.wide[1]);
    this.scene.add(new THREE.HemisphereLight(0xe4efff,0x69533b,1.3));
    const sunlight=new THREE.DirectionalLight(0xffdfa3,3.9);sunlight.position.set(-5,7,1);sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);sunlight.shadow.radius=3;sunlight.shadow.blurSamples=8;Object.assign(sunlight.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.5,far:24});sunlight.shadow.bias=-.0003;sunlight.shadow.normalBias=.025;this.scene.add(sunlight);
    const fill=new THREE.DirectionalLight(0xe5edff,.85);fill.position.set(3,4,7);this.scene.add(fill);
    const back=new THREE.DirectionalLight(0xffce89,1.8);back.position.set(0,5,-4);this.scene.add(back);
    // Embedded GLB textures use HTML images so the local CSP does not require blob fetch access.
    const loader=new GLTFLoader();loader.register(parser=>{parser.textureLoader=new THREE.TextureLoader(parser.options.manager);return {name:'FINE_PRINT_LOCAL_TEXTURES'};});const [room,human]=await Promise.all([loader.loadAsync('/games/fine-print/models/courtroom.glb'),loader.loadAsync('/games/fine-print/models/court-actor.glb')]);
    const pixels=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4;const grain=Math.sin(x*1.3+Math.sin(y*.055)*2.5)*.035+Math.sin(x*4.1+y*.04)*.018;const v=Math.round(222+grain*180);pixels[i]=v;pixels[i+1]=v;pixels[i+2]=v;pixels[i+3]=255;}const wood=new THREE.DataTexture(pixels,128,128);wood.wrapS=wood.wrapT=THREE.RepeatWrapping;wood.repeat.set(3,1);wood.needsUpdate=true;wood.colorSpace=THREE.SRGBColorSpace;wood.magFilter=THREE.LinearFilter;wood.minFilter=THREE.LinearFilter;
    const skyCanvas=document.createElement('canvas');skyCanvas.width=256;skyCanvas.height=512;const sky=skyCanvas.getContext('2d');const gradient=sky.createLinearGradient(0,0,0,512);gradient.addColorStop(0,'#9bacb8');gradient.addColorStop(.7,'#e4c394');gradient.addColorStop(1,'#c9aa76');sky.fillStyle=gradient;sky.fillRect(0,0,256,512);for(let i=0;i<14;i++){const h=30+((i*47)%150);sky.fillStyle=i%2?'#989588':'#8b928b';sky.fillRect(i*21-10,512-h,18,h);for(let y=512-h+9;y<500;y+=16){sky.fillStyle='#c8bb91';sky.fillRect(i*21-5,y,3,5);}}const skyTexture=new THREE.CanvasTexture(skyCanvas);skyTexture.colorSpace=THREE.SRGBColorSpace;
    room.scene.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.castShadow=true;if(/Walnut|Parquet/.test(o.material.name)){o.material.map=wood;o.material.roughness=.53;}if(o.material.name==='Daylight glazing'){o.material.map=skyTexture;o.material.emissiveMap=skyTexture;o.material.color.setHex(0xffffff);o.material.emissive.setHex(0xffffff);o.material.emissiveIntensity=.45;}}});this.scene.add(room.scene);
    const specs=[['judge',0,.88,-4.2,0,true,0x13151a],['claimant_counsel',-2.25,0,1.48,Math.PI,false,0x283442],['defendant_counsel',2.25,0,1.48,Math.PI,false,0x35312d],['claimant',-3.25,0,1.52,Math.PI,true,0x475651],['defendant',3.25,0,1.52,Math.PI,true,0x485062]];
    for(const [role,x,y,z,rotation,seated,color] of specs){
      const model=clone(human.scene);model.position.set(x,y,z);model.rotation.y=rotation;if(role==='judge')model.scale.setScalar(1.12);
      const mouths=[];
      model.traverse(o=>{
        if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
        o.material=o.material.clone();o.material.side=THREE.DoubleSide;
        if(o.material.name==='Counsel tailored charcoal')o.material.color.setHex(color);
        if(role==='judge'&&o.material.name.includes('Hair')){o.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.38,0.36,0.33),0.76);');};}
        if(o.material.name.includes('Hair'))o.material.color.setHex(role==='judge'?0xc7c6c1:role==='defendant'?0x71573f:0x544538);
        if(o.morphTargetDictionary?.SpeechOpen!==undefined)mouths.push([o,o.morphTargetDictionary.SpeechOpen]);
        if(o.name.startsWith('Judicial')||o.name.startsWith('Judge_bands'))o.visible=role==='judge';
        if(role==='judge'&&(/Silk_necktie|Notched_lapel/.test(o.name)))o.visible=false;
      });
      const mixer=new THREE.AnimationMixer(model);const animation=human.animations.find(a=>a.name===(seated?'Drive':'Idle'));if(animation)mixer.clipAction(animation).play();mixer.update(.01);
      this.actors[role]={model,mixer,mouths,head:model.getObjectByName('head'),hand:model.getObjectByName('forearmR'),seated,open:0};const actor=this.actors[role];actor.headRest=actor.head?.quaternion.clone();actor.handRest=actor.hand?.quaternion.clone();this.scene.add(model);
    }
    this.camera.lookAt(this.target);
  }
  resize(){if(!this.host||!this.renderer)return;const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  unmount(){this.active=false;if(this.frame)cancelAnimationFrame(this.frame);this.frame=null;this.observer?.disconnect();this.setSpeaking(false);}
  setRole(role){this.role=poses[role]?role:'judge';}
  setView(view){this.view=view==='wide'?'wide':'speaker';}
  setSpeaking(value){this.speaking=value;}
  tick(now){
    if(!this.active)return;this.frame=requestAnimationFrame(t=>this.tick(t));
    const elapsed=now-this.last;this.last=now;const dt=Math.min(elapsed/1000,.06);this.time+=dt;
    if(elapsed>0){this.frames.push(elapsed);if(this.frames.length>3600)this.frames.shift();}
    const pose=poses[this.view==='wide'?'wide':this.role]||poses.wide,blend=1-Math.exp(-dt*3);
    this.camera.position.lerp(new THREE.Vector3(...pose[0]),blend);this.target.lerp(new THREE.Vector3(...pose[1]),blend);this.camera.lookAt(this.target);
    let opening=0;
    for(const [role,a] of Object.entries(this.actors)){
      a.mixer.update(dt);if(a.headRest)a.head.quaternion.copy(a.headRest);if(a.handRest)a.hand.quaternion.copy(a.handRest);const talking=this.speaking&&role===this.role;const level=talking?Math.min(1,this.amplitude()*7):0;
      a.open=THREE.MathUtils.lerp(a.open,level,Math.min(1,dt*24));for(const [mesh,index] of a.mouths)mesh.morphTargetInfluences[index]=a.open;
      if(talking&&a.head){a.head.rotation.x+=Math.sin(this.time*2.4)*.028;a.head.rotation.z+=Math.sin(this.time*1.7)*.024;}
      if(talking&&a.hand)a.hand.rotation.z+=Math.sin(this.time*2)*.07;
      if(role===this.role)opening=a.open;
    }
    this.renderer.render(this.scene,this.camera);
    if(!this.statsAt||now-this.statsAt>250){
      this.statsAt=now;const mean=this.frames.reduce((a,b)=>a+b,0)/Math.max(1,this.frames.length),ordered=[...this.frames].sort((a,b)=>a-b);const canvas=this.renderer.domElement;
      Object.assign(canvas.dataset,{speaker:this.role,view:this.view,speaking:String(this.speaking),mouthOpen:opening.toFixed(3),fps:(1000/mean).toFixed(1),p95Ms:(ordered[Math.floor(ordered.length*.95)]||0).toFixed(1),samples:String(this.frames.length),durationMs:(mean*this.frames.length).toFixed(0),pixelRatio:String(this.renderer.getPixelRatio()),triangles:String(this.renderer.info.render.triangles),drawCalls:String(this.renderer.info.render.calls)});
    }
  }
}
