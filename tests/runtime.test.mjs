import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {gameEntry} from '../lib/security.mjs';
const require=createRequire(import.meta.url);
const {parse}=require('next/dist/compiled/acorn/acorn.js');
const root=resolve('public');
const manifest=JSON.parse(readFileSync('docs/runtime-source-manifest.json','utf8'));
test('every web ESM dependency and external GLB resource is packaged',()=>{
 for(const [game,files] of Object.entries(manifest)){
  const html=readFileSync(root+gameEntry(game),'utf8');
  const imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  const folder=dirname(root+gameEntry(game));
  for(const file of files){
   const path=resolve(folder,file.path);assert.ok(existsSync(path),path);
   if(/\.m?js$/.test(path)){
    const code=parse(readFileSync(path,'utf8'),{ecmaVersion:'latest',sourceType:'module'});
    for(const item of code.body.filter(n=>n.source)){
     const specifier=item.source.value;
     const alias=Object.keys(imports).sort((a,b)=>b.length-a.length).find(k=>specifier===k||k.endsWith('/')&&specifier.startsWith(k));
     const dep=specifier.startsWith('.')?resolve(dirname(path),specifier.split('?')[0]):alias?resolve(folder,imports[alias]+specifier.slice(alias.length)):null;
     assert.ok(dep&&existsSync(dep),path+' -> '+specifier);
    }
   }
   if(path.endsWith('.glb')){
    const glb=readFileSync(path),model=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
    for(const item of [...(model.images||[]),...(model.buffers||[])])if(item.uri&&!item.uri.startsWith('data:'))assert.ok(existsSync(resolve(dirname(path),item.uri)),path+' -> '+item.uri);
   }
  }
 }
});
