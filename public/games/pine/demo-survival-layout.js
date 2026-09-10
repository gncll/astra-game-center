export const CUT_TREE={x:-5.4,z:7,r:.3};
export const LOG_PICKUP={x:-4.7,z:7};
export const CAMP={x:-.7,z:3.2,r:.65};
export const CAMP_STOP={x:-.5,z:4.55};
export const TREE_STOP={x:-4.23,z:7};
export const POND={x:6.2,z:7.2,rx:3.05,rz:2.5,level:-.02};
export const FISH_STOP={x:2.65,z:7.2};
export function pondDistance(x,z){return Math.hypot((x-POND.x)/POND.rx,(z-POND.z)/POND.rz);}
export function survivalClearing(x,z){return pondDistance(x,z)<1.32||Math.hypot(x-CUT_TREE.x,z-CUT_TREE.z)<2.05||Math.hypot(x-CAMP.x,z-CAMP.z)<1.9;}
