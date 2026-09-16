// This adapter is included only in the authenticated web release.
let userId='',snapshot=null,job=null;
let submitting=false;
const sounds=new Map();
const storageKey=()=>`astra:${userId}:fine-print:v1`;
function save(){try{sessionStorage.setItem(storageKey(),JSON.stringify({snapshot,job}));}catch{throw new Error('This tab could not save the case. Export your record before leaving.');}}
async function request(action,body={},binary=false){
  const r=await fetch('/api/fine-print/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Astra-Request':'1'},body:JSON.stringify({...body,stateToken:snapshot?.stateToken,job:body.job||job?.id})});
  if(!r.ok){let error;try{error=(await r.json()).error;}catch{}throw new Error(error||'Game Center could not complete this request. Your case remains in this tab.');}
  return binary?r.blob():r.json();
}
function accept(data){if(Object.hasOwn(data,'state')){snapshot=data.state?{state:data.state,stateToken:data.stateToken}:null;save();}}
export async function cloudConfig(){
  const r=await fetch('/api/fine-print/config');if(!r.ok)throw new Error('Sign in to Game Center to open your case.');
  const c=await r.json();
  if(userId!==c.user){userId=c.user;try{const saved=JSON.parse(sessionStorage.getItem(storageKey())||'null');snapshot=saved?.snapshot||null;job=saved?.job||null;}catch{snapshot=null;job=null;}}
  return {...c,case_loaded:!!snapshot?.state?.case};
}
export async function cloudSession(){
  if(!snapshot)return {};
  // Check the current account and sealed state on every restore.
  const data=await request('session');accept(data);
  return {...snapshot.state,job};
}
export async function cloudPoll(id){
  const data=await request('poll',{job:id});
  if(data.status!=='running'){job=null;accept(data);save();}
  return data;
}
export async function cloudAPI(action,body,binary=false){
  if(action==='speech'){
    const key=JSON.stringify([snapshot?.state?.caseId,body.role,body.text]);
    if(sounds.has(key))return sounds.get(key);
    const blob=await request(action,body,true);sounds.set(key,blob);return blob;
  }
  if(['research','turn','restore','replay'].includes(action)&&job)throw new Error('Finish or cancel the current step first. Reload to reconnect to it.');
  if(submitting)throw new Error('Your previous request is still being submitted.');
  submitting=true;
  try{
  if(action==='clear'&&job)await request('cancel');
  const data=await request(action,body,binary);
  accept(data);
  if(data.job){job={id:data.job,kind:data.kind,submission:data.submission,progress:'Reconnecting to your research'};save();}
  if(action==='clear'){job=null;sounds.clear();sessionStorage.removeItem(storageKey());}
  return data;
  }finally{submitting=false;}
}
