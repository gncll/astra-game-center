import * as T from 'three';
export function dentMaterial(material){
 const uniforms={amount:{value:0},point:{value:new T.Vector2(0,2)}};
 material.onBeforeCompile=s=>{s.uniforms.trafficDent=uniforms.amount;s.uniforms.trafficHit=uniforms.point;s.vertexShader='uniform float trafficDent;uniform vec2 trafficHit;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n float proximity=exp(-distance(position.xz,trafficHit)*1.8);transformed.xz-=normalize(trafficHit+vec2(.001))*proximity*trafficDent*.30;transformed.y-=proximity*trafficDent*.08;');};
 material.customProgramCacheKey=()=> 'sunset-impact-v1';material.needsUpdate=true;
 return c=>{uniforms.amount.value=c.damage||0;uniforms.point.value.set((c.dentX||0)*1.1,(c.dentZ||0)*2.2);};
}
export class TrafficScene{
 constructor(scene,template){this.cars=[];const colors=[0xc9b785,0x75372b,0x435b68,0xb8c3c6,0x28322f,0xa7a197,0x667451,0xcea651,0x657990,0x773b36];
 for(let i=0;i<10;i++){const root=template.clone(true),paints=[],brakes=[];root.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;o.material=o.material.clone();o.material.envMapIntensity=.5;if(o.material.name==='Ocean enamel'){o.material.color.set(colors[i]);o.material.roughness=.32;paints.push(dentMaterial(o.material));}if(o.material.name==='Brake')brakes.push(o.material);if(o.material.name==='Glass'){o.material.transparent=true;o.material.opacity=.7;o.material.depthWrite=false;o.castShadow=false;}});scene.add(root);this.cars.push({root,paints,brakes});}
 this.spark=new T.InstancedMesh(new T.SphereGeometry(.035,4,3),new T.MeshBasicMaterial({color:0xffcf78,toneMapped:false}),12);this.spark.frustumCulled=false;scene.add(this.spark);this.dummy=new T.Object3D();
 }
 update(traffic,player){traffic.cars.forEach((c,i)=>{const v=this.cars[i];v.root.position.set(c.x,(c.shock||0)*.025,c.z);v.root.rotation.set(0,c.angle,(c.shock||0)*Math.sin(traffic.time*28)*.035);v.root.visible=Math.hypot(c.x-player.x,c.z-player.z)<260;v.paints.forEach(f=>f(c));v.brakes.forEach(m=>m.emissiveIntensity=c.mode!=='lane'?(Math.floor(traffic.time*3)%2?2:.2):c.braking?2:.15);});
 const hit=traffic.lastImpact,age=hit?traffic.time-hit.time:9;this.spark.visible=age<.45&&hit.strength>2;if(this.spark.visible)for(let i=0;i<12;i++){const angle=i*2.4;this.dummy.position.set(hit.x+Math.cos(angle)*age*2,.25+Math.sin(age/.45*Math.PI)*.65,hit.z+Math.sin(angle)*age*2);this.dummy.scale.setScalar(1-age/.45);this.dummy.updateMatrix();this.spark.setMatrixAt(i,this.dummy.matrix);}this.spark.instanceMatrix.needsUpdate=true;
 }
}
