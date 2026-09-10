import {CABIN,MEDKIT,inCabin} from './demo-world.js';
export const MISSION_ID='S01';
export function createMission(){return{doorOpen:false,entered:false,complete:false,inventory:[]};}
export function updateMission(m,p){if(m.doorOpen&&inCabin(p))m.entered=true;}
export function interaction(m,p){
 if(!m.doorOpen&&Math.abs(p.x-CABIN.x)<1&&p.z>CABIN.z+2.7&&p.z<CABIN.z+4.1)return 'door';
 if(m.entered&&!m.complete&&inCabin(p)&&Math.hypot(p.x-MEDKIT.x,p.z-MEDKIT.z)<1.25)return 'medkit';
 return null;
}
export function interact(m,p){const action=interaction(m,p);if(action==='door')m.doorOpen=true;if(action==='medkit'){m.complete=true;m.inventory.push('S01-first-aid-kit');}return action;}
export function objective(m){return m.complete?'First aid secured':m.entered?'Collect the first-aid kit':m.doorOpen?'Go inside the ranger cabin':'Reach the ranger cabin';}
