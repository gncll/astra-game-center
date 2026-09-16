import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import protocol from './protocol.json' with { type: 'json' };

export { protocol };
export class CaseError extends Error { constructor(message, status=400) { super(message); this.status=status; } }
export function check(condition, message) { if (!condition) throw new CaseError(message); }
export const roles=['judge','claimant','defendant','claimant_counsel','defendant_counsel'];
const currencies=['','TRY','USD','GBP','EUR','CAD','AUD'];
export const keyFor = secret => createHash('sha256').update('fine-print-web-v1\0'+secret).digest();
export function seal(value, user, secret, now=Date.now()) {
  check(Boolean(secret),'Research is not configured.');
  const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',keyFor(secret),iv);
  const plain=JSON.stringify({value,user,expires:now+2*60*60*1000});
  check(Buffer.byteLength(plain)<1_500_000,'The case record is too large.');
  return Buffer.concat([iv,cipher.update(plain),cipher.final(),cipher.getAuthTag()]).toString('base64url');
}
export function unseal(token,user,secret,now=Date.now()) {
  try {
    if(typeof token!=='string'||token.length>2_100_000||!secret)throw Error();
    const b=Buffer.from(token,'base64url');
    if(b.length<29)throw Error();
    const d=createDecipheriv('aes-256-gcm',keyFor(secret),b.subarray(0,12));d.setAuthTag(b.subarray(-16));
    const data=JSON.parse(Buffer.concat([d.update(b.subarray(12,-16)),d.final()]).toString());
    if(data.user!==user||data.expires<now)throw Error();
    return data.value;
  }catch{throw new CaseError('This case session expired. Reopen your exported record or prepare the hearing again.',403);}
}
export function validate(v,s) {
  const types=Array.isArray(s.type)?s.type:[s.type];
  const type=v===null?'null':Array.isArray(v)?'array':typeof v;
  check(types.includes(type)||(types.includes('integer')&&Number.isInteger(v)),'The model returned an invalid case record. Please retry explicitly.');
  if(s.enum)check(s.enum.includes(v),'Unexpected case field.');
  if(type==='string')check(v.length<=30000,'A case field is too long.');
  if(type==='number')check(Number.isFinite(v)&&Math.abs(v)<=1e12,'Invalid monetary value.');
  if(type==='array'){check(v.length<=40,'Too many case items.');v.forEach(x=>validate(x,s.items));}
  if(type==='object'){
    check(Object.keys(v).length===s.required.length&&s.required.every(k=>Object.hasOwn(v,k)),'Missing or unexpected case fields.');
    for(const k of s.required)validate(v[k],s.properties[k]);
  }
  return v;
}
export function references(value,sources,evidence) {
  if(Array.isArray(value)){value.forEach(x=>references(x,sources,evidence));return;}
  if(!value||typeof value!=='object')return;
  for(const [k,v] of Object.entries(value)){
    if(k==='source_ids')check(v.every(id=>sources.has(id)),'The model cited an unknown legal source.');
    else if(k==='evidence_ids')check(v.every(id=>evidence.has(id)),'The model cited an unknown exhibit.');
    else references(v,sources,evidence);
  }
}
export function normalizeCase(raw) {
  check(raw&&typeof raw==='object'&&!Array.isArray(raw)&&JSON.stringify(raw).length<=180000,'Case limit: 180,000 characters.');
  const c={};
  for(const k of Object.keys(protocol.review.properties.profile.properties)){
    check(raw[k]===undefined||typeof raw[k]==='string','Invalid case details.');c[k]=raw[k]||'';
  }
  check(currencies.includes(c.currency),'Select a supported currency.');
  for(const k of ['amount','costs'])check(c[k]===''||(/^\d+(\.\d+)?$/.test(c[k])&&Number(c[k])<=1e12),'Enter a nonnegative amount or leave it blank.');
  check(Array.isArray(raw.documents)&&raw.documents.length<=8,'Attach up to eight documents.');
  c.documents=raw.documents.map(d=>{
    check(d&&typeof d.name==='string'&&d.name.length<=240&&typeof d.text==='string'&&d.text.length<=100000,'Invalid document or document over 100,000 characters.');
    return {name:d.name,text:d.text};
  });
  check(c.documents.reduce((n,d)=>n+d.text.length,0)<=150000,'Combined document limit: 150,000 characters.');
  c.interview_answers=typeof raw.interview_answers==='string'?raw.interview_answers.slice(0,20000):'';
  c.money={currency:c.currency,disputed_amount:c.amount===''?null:Number(c.amount),estimated_costs:c.costs===''?null:Number(c.costs)};
  return c;
}
export function cleanReview(raw, imported=false) {
  const r=structuredClone(raw);
  if(imported)r.sources=r.sources.map(s=>Object.fromEntries(Object.keys(protocol.review.properties.sources.items.properties).map(k=>[k,s[k]])));
  validate(r,protocol.review);
  check(r.sources.length<=8&&r.evidence.length<=8&&r.questions.length<=2,'Too many sources, exhibits or questions.');
  for(const [items,prefix] of [[r.sources,'S'],[r.evidence,'E'],[r.issues,'I']]){
    check(new Set(items.map(x=>x.id)).size===items.length&&items.every(x=>new RegExp('^'+prefix+'[1-9][0-9]?$').test(x.id)),'Invalid or duplicate reference IDs.');
  }
  for(const s of r.sources){let u;try{u=new URL(s.url);}catch{}check(u?.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443'),'Only public HTTPS legal sources are allowed.');}
  check(currencies.includes(r.profile.currency),'Invalid researched currency.');
  for(const k of ['amount','costs'])check(r.profile[k]===''||(/^\d+(\.\d+)?$/.test(r.profile[k])&&Number(r.profile[k])<=1e12),'Invalid researched amount.');
  references(r,new Set(r.sources.map(s=>s.id)),new Set(r.evidence.map(e=>e.id)));
  return r;
}
export function cleanTurn(t,report,round,closing) {
  validate(t,protocol.turn);references(t,new Set(report.sources.map(s=>s.id)),new Set(report.evidence.map(e=>e.id)));
  check(t.lines.length>0,'The hearing returned no dialogue.');
  if(round>=3||closing)check(t.finished,'The court did not complete the requested closing.');
  if(t.finished){
    check(t.outcomes.length>0&&t.selected_outcome>=0&&t.selected_outcome<t.outcomes.length&&t.verdict.length>0,'The verdict is incomplete.');
    for(const o of t.outcomes)for(const k of ['pay','receive','costs'])check(o[k].amount===null||o[k].amount>=0,'Invalid outcome amount.');
  }else check(t.outcomes.length===0&&!t.verdict,'An unfinished hearing cannot contain a verdict.');
  return t;
}
export function importRecord(record) {
  check(record?.format==='fine-print-case-record-v1'&&JSON.stringify(record).length<=500000,'Invalid saved record or over 500,000 characters.');
  const c=normalizeCase(record.case),report=cleanReview(record.research,true);
  report.sources.forEach(s=>Object.assign(s,{status:'unverified',verification:'Imported record. This citation has not been checked in this session.',checked_at:'Recorded session'}));
  check(Array.isArray(record.hearing)&&record.hearing.length<=3,'Invalid hearing history.');
  const history=record.hearing.map((h,i)=>{
    check(typeof h.answer==='string'&&h.answer.length<=6000&&Array.isArray(h.evidence)&&h.evidence.every(id=>report.evidence.some(e=>e.id===id)),'Invalid saved response.');
    return {answer:h.answer,evidence:h.evidence,response:cleanTurn(h.response,report,i+1,false)};
  });
  return {caseId:randomUUID(),case:c,report,history,round:history.at(-1)?.response.finished?3:history.length,imported:true};
}
export function sourceUrls(response) {
  const urls=new Set();
  for(const item of response.output||[]){
    if(item.type==='web_search_call'){
      if(item.action?.url)urls.add(item.action.url);
      for(const s of item.action?.sources||[])if(s.url)urls.add(s.url);
    }
    for(const c of item.content||[])for(const a of c.annotations||[])if(a.type==='url_citation'&&a.url)urls.add(a.url);
  }
  return urls;
}
export function modelJSON(response) {
  const text=(response.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
  try{return JSON.parse(text);}catch{throw new CaseError('The model did not return a complete case record. Retry this step explicitly.');}
}
