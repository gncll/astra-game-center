import { randomUUID } from 'node:crypto';
import { CaseError,check,seal,unseal,protocol,roles,normalizeCase,cleanReview,cleanTurn,importRecord,modelJSON,sourceUrls } from './core.mjs';

const voicesByRole={judge:'George',claimant:'Adam',defendant:'Charlie',claimant_counsel:'Daniel',defendant_counsel:'Liam'};
let voiceCache=null;
export function requestPayload(kind,state,submission={}) {
  const research=kind==='research';
  const input=research?{case:state.case,interview_answers:submission.answers||'',proceed_with_available_evidence:submission.proceed,prior_public_sources:[]}:
    {case:state.case,review:state.report,history:state.history,latest_answer:submission.answer,selected_evidence:submission.evidence,round_number:state.round+1,closing_requested:submission.closing};
  return {
    model:process.env.FINE_PRINT_MODEL||'gpt-6-astra',background:true,store:false,
    reasoning:{effort:'medium'},max_output_tokens:14000,
    instructions:(research?protocol.researchInstructions:protocol.hearingInstructions).replace('{{DATE}}',new Date().toISOString().slice(0,10)),
    input:JSON.stringify(input),
    text:{format:{type:'json_schema',name:research?'case_review':'hearing_turn',strict:true,schema:research?protocol.review:protocol.turn}},
    ...(research?{tools:[{type:'web_search',external_web_access:true,search_context_size:'medium'}],tool_choice:'required',max_tool_calls:10,include:['web_search_call.action.sources']}:{})
  };
}
export async function provider(path,key,body,fetcher=fetch) {
  if(!key)throw new CaseError('OpenAI research has not been configured by Game Center.',503);
  let r;
  try{r=await fetcher('https://api.openai.com/v1/responses'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(45000)});}catch{throw new CaseError('OpenAI did not confirm the request. Do not repeatedly retry: it may still be processing. Your case remains in this tab.',502);}
  if(!r.ok){
    const status=r.status;
    // Provider errors may contain private input; never return or log their bodies.
    throw new CaseError(status===429?'OpenAI usage or billing limit reached. Try later.':status===401?'The server’s OpenAI key was not accepted.':status===404?'This model or research job is unavailable. The administrator may need to set FINE_PRINT_MODEL.':'OpenAI could not complete this step. Please retry explicitly.',status===429?429:502);
  }
  return r.json();
}
export async function runAction(action,body,ctx) {
  const {user,secret,quota,extract,verify,fetcher=fetch}=ctx;
  const load=()=>unseal(body.stateToken,user,secret);
  const pack=state=>({state,stateToken:seal(state,user,secret)});
  if(action==='extract')return extract(body.name,body.data);
  if(action==='restore')return {ok:true,...pack(importRecord(body.record))};
  if(action==='session')return body.stateToken?{...pack(load())}:{state:null};
  if(action==='replay'){const s=load();check(s.report?.status==='ready','Prepare a hearing first.');s.history=[];s.round=0;return {ok:true,...pack(s)};}
  if(action==='clear')return {ok:true,state:null,stateToken:null};
  if(action==='research'||action==='turn'){
    if(!secret)throw new CaseError('OpenAI research has not been configured by Game Center.',503);
    let state,submission;
    if(action==='research'){
      const c=normalizeCase(body.case);check(c.narrative.trim().length>=30||c.documents.length>0,'Upload a case document or describe your situation.');
      state={caseId:randomUUID(),case:c,report:null,history:[],round:0};
      submission={answers:typeof body.answers==='string'?body.answers.slice(0,20000):'',proceed:!!body.proceed||!!body.answers?.trim()};
    }else{
      state=load();check(state.report?.status==='ready'&&state.round<3&&!state.history.at(-1)?.response.finished,'This hearing has ended or is not ready.');
      check(typeof body.answer==='string'&&body.answer.trim().length>0&&body.answer.length<=6000,'Write 1–6,000 characters.');
      check(Array.isArray(body.evidence)&&body.evidence.length<=8&&body.evidence.every(id=>state.report.evidence.some(e=>e.id===id)),'Unknown evidence selection.');
      submission={answer:body.answer.trim(),evidence:body.evidence,closing:!!body.closing};
    }
    await quota(action,1,state.caseId);
    const response=await provider('',secret,requestPayload(action,state,submission),fetcher);
    check(typeof response.id==='string'&&/^resp_[\w-]+$/.test(response.id),'The provider returned an invalid job ID.');
    const job={responseId:response.id,kind:action,submission,state,created:Date.now()};
    return {job:seal(job,user,secret),...pack(state),kind:action,submission};
  }
  if(action==='poll'||action==='cancel'){
    const j=unseal(body.job,user,secret);
    check(/^resp_[\w-]+$/.test(j.responseId||'')&&['research','turn'].includes(j.kind),'Invalid research job.');
    if(action==='cancel'){await provider('/'+j.responseId+'/cancel',secret,{},fetcher);return {ok:true};}
    if(Date.now()-j.created>9*60*1000){
      await provider('/'+j.responseId+'/cancel',secret,{},fetcher).catch(()=>{});
      return {status:'error',error:'This research step exceeded nine minutes and was cancelled. Your case remains in this tab.'};
    }
    const response=await provider('/'+j.responseId,secret,undefined,fetcher);
    if(['queued','in_progress'].includes(response.status))return {status:'running',progress:j.kind==='research'?'Researching primary sources and preparing both sides':'Considering your answer against the reviewed record'};
    if(response.status!=='completed')return {status:'error',error:response.status==='cancelled'?'Cancelled. Your case remains in this tab.':'The model could not finish this step. Your case remains in this tab. Retry explicitly.'};
    const state=j.state;
    let result;
    if(j.kind==='research'){
      check((response.output||[]).some(x=>x.type==='web_search_call'&&x.status==='completed'),'The research did not complete a live web search. Retry explicitly.');
      result=cleanReview(modelJSON(response));
      if(j.submission.proceed)check(result.status==='ready','The model requested more information despite conditional continuation.');
      const urls=sourceUrls(response);
      result.sources=await Promise.all(result.sources.map(s=>verify(s,urls)));
      state.report=result;
      Object.assign(state.case,result.profile);
      state.case.money={currency:result.profile.currency,disputed_amount:result.profile.amount===''?null:Number(result.profile.amount),estimated_costs:result.profile.costs===''?null:Number(result.profile.costs)};
    }else{
      result=cleanTurn(modelJSON(response),state.report,state.round+1,j.submission.closing);
      state.history.push({answer:j.submission.answer,evidence:j.submission.evidence,response:result});state.round=result.finished?3:state.round+1;
    }
    return {status:'done',result,...pack(state)};
  }
  if(action==='speech'){
    const state=load(),{role,text}=body;
    const lines=[...(state.report?.opening||[]),...state.history.flatMap(h=>h.response.lines)];
    check(!state.imported&&roles.includes(role)&&typeof text==='string'&&text.length>0&&text.length<=1400&&lines.some(l=>l.role===role&&l.text===text),'Only newly generated hearing lines can be narrated. Imported records use subtitles until researched again.');
    const key=ctx.speechKey;
    if(!key)throw new CaseError('ElevenLabs is not connected. Continue with subtitles.',503);
    if(!voiceCache||voiceCache.expires<Date.now()){
      const r=await fetcher('https://api.elevenlabs.io/v1/voices',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(15000)});
      if(!r.ok)throw new CaseError('ElevenLabs could not load the courtroom voices. Continue with subtitles.',502);
      const available=(await r.json()).voices||[],used=new Set(),map={};
      for(const role of roles){const v=available.find(v=>v.name===voicesByRole[role]&&!used.has(v.voice_id))||available.find(v=>!used.has(v.voice_id));check(v&&/^[\w-]+$/.test(v.voice_id),'Five distinct ElevenLabs voices are required.');map[role]=v.voice_id;used.add(v.voice_id);}
      voiceCache={map,expires:Date.now()+15*60*1000};
    }
    await quota('speech',text.length,state.caseId);
    let r;
    try{r=await fetcher('https://api.elevenlabs.io/v1/text-to-speech/'+voiceCache.map[role]+'?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({text,model_id:'eleven_multilingual_v2',voice_settings:{stability:.55,similarity_boost:.75}}),signal:AbortSignal.timeout(45000)});}catch{throw new CaseError('Voice generation did not finish. Continue with subtitles; no automatic paid retry was made.',502);}
    if(!r.ok)throw new CaseError('ElevenLabs could not generate this line. Continue with subtitles.',502);
    const bytes=Buffer.from(await r.arrayBuffer());
    check(bytes.length>64&&bytes.length<4_000_000&&(bytes.subarray(0,3).toString()==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224)),'The voice response was not valid MP3 audio.');
    return {audio:bytes};
  }
  throw new CaseError('Not found.',404);
}
