import {test} from 'node:test';
import assert from 'node:assert/strict';
import {watchLoading} from '../public/games/loading.mjs';
test('loading stays visible until ready and a failed load offers a real reload',()=>{
 let removed=false,reloaded=false;const frames=[];
 const progress={hidden:false},retry={hidden:true},status={textContent:''};
 const panel={dataset:{},querySelector:()=>progress,remove:()=>removed=true};
 globalThis.document={getElementById:id=>({'astra-loading':panel,'astra-loading-status':status,'astra-loading-retry':retry}[id])};
 globalThis.location={reload:()=>reloaded=true};globalThis.requestAnimationFrame=cb=>frames.push(cb);
 try{
  const loading=watchLoading();loading.update('Preparing the trail · 3/9');assert.equal(status.textContent,'Preparing the trail · 3/9');assert.equal(removed,false);
  loading.ready();assert.equal(removed,false);frames.shift()();assert.equal(removed,false);frames.shift()();assert.equal(removed,true);
  removed=false;const failed=watchLoading();failed.fail();assert.equal(removed,false);assert.equal(progress.hidden,true);assert.equal(retry.hidden,false);retry.onclick();assert.equal(reloaded,true);
 }finally{for(const key of ['document','location','requestAnimationFrame','AstraGameReady','AstraGameLoading','AstraGameError'])delete globalThis[key];}
});
