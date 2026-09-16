import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
let child,origin,logs='';
before(async()=>{
 const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));origin='http://127.0.0.1:'+port;
 child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{env:{...process.env,SITE_URL:origin},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',chunk=>logs+=chunk);child.stderr.on('data',chunk=>logs+=chunk);
 for(let i=0;i<80;i++){try{const response=await fetch(origin+'/login');if(response.ok)return;}catch{}if(child.exitCode!==null)throw new Error(logs);await delay(150);}
 throw new Error('Test server did not start: '+logs);
});
after(async()=>{if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));}});
test('library and game entry redirect signed-out users',async()=>{
 for(const path of ['/library','/play/wardenfall','/games/wardenfall/index.html','/play/sidewalk','/games/sidewalk/index.html','/play/sunset','/games/sunset/index.html','/play/pine','/games/pine/demo.html','/play/fine-print','/games/fine-print/index.html']){
  const response=await fetch(origin+path,{redirect:'manual'});assert.ok([302,303,307].includes(response.status),path);assert.equal(new URL(response.headers.get('location'),origin).pathname,'/login');
 }
});
test('new 3D games and their shared loading files require a verified session',async()=>{
 for(const path of ['boot.mjs','loading.mjs','center.css','sidewalk/models/westside.glb','sidewalk/vendor/three/build/three.module.js','sidewalk/mini-skate/Models/GLB%20format/Textures/colormap.png','sunset/models/city-s05.glb','sunset/models/bridge-leaf-s05.glb','sunset/models/airliner-s05.glb','sunset/vehicle-surface.js','sunset/assets/audio/S01-engine.mp3','pine/models/demo/survivor-actions.glb','pine/demo.js','fine-print/models/courtroom.glb','fine-print/models/court-actor.glb','fine-print/src/cloud-client.js','fine-print/example-case.txt']){
  const response=await fetch(origin+'/games/'+path,{redirect:'manual'});assert.equal(response.status,401,path);
 }
});
test('direct scripts, large images and audio cannot bypass login',async()=>{
 for(const path of ['game.js','engine.js','account.js','assets/towers-v2.png','assets/audio/ready.mp3']){
  const response=await fetch(origin+'/games/wardenfall/'+path,{redirect:'manual'});assert.equal(response.status,401,path);assert.match(response.headers.get('cache-control'),/private/);
 }
});
test('API access rejects forged session cookies',async()=>{
 for(const cookie of ['', 'sb-ikguxhirspkjvcdgasth-auth-token=base64-eyJ1c2VyIjp7ImlkIjoiYXR0YWNrZXIifX0']){
  const response=await fetch(origin+'/api/library',{headers:{cookie}});assert.equal(response.status,401);
 }
});
test('cross-site email requests are rejected without sending mail',async()=>{
 const response=await fetch(origin+'/auth/start',{method:'POST',headers:{'Origin':'https://attacker.example','Content-Type':'application/json','X-Astra-Request':'1'},body:JSON.stringify({email:'nobody@example.com'})});assert.equal(response.status,403);
});
test('missing callback credentials cannot log in or redirect off-site',async()=>{
 const response=await fetch(origin+'/auth/callback?next=https://attacker.example',{redirect:'manual'});assert.ok([302,303,307].includes(response.status));const url=new URL(response.headers.get('location'));assert.equal(url.origin,origin);assert.equal(url.pathname,'/login');
});
test('public login artwork remains available',async()=>{
 const response=await fetch(origin+'/center/brand.svg');assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/svg/);
});

test("Fine Print provider routes require a verified account",async()=>{
 for(const route of ["config","poll","speech","research"]){const r=await fetch(origin+"/api/fine-print/"+route);assert.equal(r.status,401);}
});
