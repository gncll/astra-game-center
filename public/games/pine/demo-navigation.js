import {blocked,floorHeight,move} from './demo-world.js';
// A small A* grid for the walking assistance. Player input still uses move directly.
export function findRoute(start,goal,doorOpen=false){
 const cell=.2,key=(x,z)=>x+','+z,round=v=>Math.round(v/cell),position=(x,z)=>({x:x*cell,z:z*cell}),nodes=new Map(),cache=new Map(),heap=[];
 function push(n){heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p;}heap[i]=n;}
 function pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;}
 function free(x,z){const k=key(x,z);if(!cache.has(k)){const p=position(x,z);cache.set(k,!blocked(p.x,p.z,.25,doorOpen));}return cache.get(k);}
 function closest(p){let best=null,d=Infinity;const sx=round(p.x),sz=round(p.z);for(let x=sx-2;x<=sx+2;x++)for(let z=sz-2;z<=sz+2;z++){const q=position(x,z),dd=Math.hypot(q.x-p.x,q.z-p.z);if(dd<d&&free(x,z)){const m=move(p,q.x-p.x,q.z-p.z,doorOpen);if(Math.hypot(m.x-q.x,m.z-q.z)<.01){best={x,z};d=dd;}}}return best;}
 const a=closest(start),b=closest(goal);if(!a||!b)return[];
 const heuristic=(x,z)=>Math.hypot(x-b.x,z-b.z),first={...a,g:0,f:heuristic(a.x,a.z),parent:null};nodes.set(key(a.x,a.z),first);push(first);
 let end=null;
 for(let iterations=0;heap.length&&iterations<16000;iterations++){
  const current=pop();if(current.closed)continue;current.closed=true;
  if(current.x===b.x&&current.z===b.z){end=current;break;}
  const cp=position(current.x,current.z),h=floorHeight(cp.x,cp.z);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=current.x+dx,z=current.z+dz;if(!free(x,z)||dx&&dz&&(!free(current.x,z)||!free(x,current.z)))continue;
   const p=position(x,z);if(Math.abs(floorHeight(p.x,p.z)-h)>.14)continue;
   const g=current.g+Math.hypot(dx,dz),k=key(x,z),old=nodes.get(k);if(old&&old.g<=g)continue;
   const next={x,z,g,f:g+heuristic(x,z),parent:current};nodes.set(k,next);push(next);
  }
 }
 if(!end)return[];
 const route=[];while(end){route.push(position(end.x,end.z));end=end.parent;}route.reverse();
 // Keep grid corners: cutting straight across them can clip the camp ring or a stair edge.
 route.push(goal);return route;
}
