export class Session {
  constructor() { this.reset(); }
  reset(free = false) { this.free=free; this.remaining=120; this.score=0; this.landings=0; this.phase='playing'; }
  step(dt) { if(this.phase!=='playing'||this.free)return; this.remaining=Math.max(0,this.remaining-dt); this.check(); }
  record(score,clean=false) { if(this.phase!=='playing')return; this.score=score; if(clean)this.landings++; this.check(); }
  check() { if(this.free)return; if(this.score>=1500&&this.landings>=3)this.phase='won'; else if(this.remaining<=0)this.phase='lost'; }
}
