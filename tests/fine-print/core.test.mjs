import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {seal,unseal,normalizeCase,cleanReview,cleanTurn,importRecord,sourceUrls} from '../../lib/fine-print/core.mjs';
import {requestPayload,runAction} from '../../lib/fine-print/service.mjs';
import {extractDocument,isPublicIP,verifySource} from '../../lib/fine-print/documents.mjs';
import {caseFile,review,turn,finalTurn,output} from './fixtures.mjs';
const clone=v=>structuredClone(v);
const secret='unit-test-only-secret';
const initial={caseId:'4f9d7c58-2d1f-46b3-90dc-834f3d92a8de',case:caseFile,report:review,history:[],round:0};
function context(response={id:'resp_test',status:'queued'}){
  const calls=[];
  return {user:'alice',secret,calls,quota:async(...a)=>calls.push(['quota',...a]),extract:extractDocument,verify:async s=>({...s,status:'unverified',verification:'Mock source checker.',checked_at:'test'}),fetcher:async(url,options)=>{calls.push(['provider',url,options]);return Response.json(response);}};
}
test('case tokens resist tampering, account swapping, expiry and key rotation',()=>{
  const token=seal(initial,'alice',secret,100);
  assert.deepEqual(unseal(token,'alice',secret,101),initial);
  for(const args of [[token,'bob',secret,101],[token,'alice','other',101],[token,'alice',secret,8e6],[token.slice(0,40)+'x'+token.slice(41),'alice',secret,101]])assert.throws(()=>unseal(...args));
  assert.ok(!token.includes('Fictional'));
});
test('case limits, negative amounts, currency and document types are enforced',()=>{
  assert.equal(normalizeCase(caseFile).money.estimated_costs,null);
  for(const patch of [{amount:'-1'},{currency:'BTC'},{documents:[{name:'x',text:'x'.repeat(100001)}]},{documents:'x'}])assert.throws(()=>normalizeCase({...caseFile,...patch}));
});
test('unknown and duplicate citations or non-HTTPS URLs fail',()=>{
  const a=clone(review);a.opening[0].source_ids=['S9'];assert.throws(()=>cleanReview(a));
  const b=clone(review);b.sources.push(clone(b.sources[0]));assert.throws(()=>cleanReview(b));
  const c=clone(review);c.sources[0].url='http://localhost/';assert.throws(()=>cleanReview(c));
  assert.equal(cleanReview(review).profile.amount,'12000');
});
test('closing must finish; unknown money stays null; negative and invalid selected outcomes fail',()=>{
  assert.throws(()=>cleanTurn(turn,review,3,false));
  assert.throws(()=>cleanTurn(turn,review,1,true));
  assert.equal(cleanTurn(finalTurn,review,3,true).outcomes[0].pay.amount,null);
  const t=clone(finalTurn);t.outcomes[0].pay.amount=-1;assert.throws(()=>cleanTurn(t,review,3,true));
  assert.throws(()=>cleanTurn({...finalTurn,selected_outcome:7},review,3,true));
});
test('saved records cannot import trusted source verification or paid speech entitlement',()=>{
  const r=clone(review);Object.assign(r.sources[0],{status:'quote_matched',verification:'forged',checked_at:'today'});
  const imported=importRecord({format:'fine-print-case-record-v1',case:caseFile,research:r,hearing:[]});
  assert.equal(imported.report.sources[0].status,'unverified');assert.equal(imported.imported,true);
});
test('research forces live search and structured output; hearings have no search tool',()=>{
  const r=requestPayload('research',initial,{proceed:true});assert.equal(r.tools[0].type,'web_search');assert.equal(r.tool_choice,'required');assert.equal(r.background,true);assert.equal(r.store,false);assert.equal(r.text.format.strict,true);assert.ok(r.max_tool_calls<=10);
  const t=requestPayload('turn',initial,{answer:'test',evidence:[]});assert.equal(t.tools,undefined);assert.ok(t.instructions.includes('ONLY on the reviewed record'));
});
test('paid creation reserves durable quota before a single provider request',async()=>{
  const ctx=context();const r=await runAction('research',{case:caseFile,proceed:true},ctx);assert.equal(ctx.calls[0][0],'quota');assert.equal(ctx.calls[1][0],'provider');assert.equal(ctx.calls.length,2);assert.equal(unseal(r.job,'alice',secret).kind,'research');
});
test('quota denial never calls the model',async()=>{
  const ctx=context();ctx.quota=async()=>{throw Error('quota');};await assert.rejects(runAction('research',{case:caseFile},ctx));assert.equal(ctx.calls.length,0);
});
test('provider failure is sanitized and never automatically retried',async()=>{
  const ctx=context();let n=0;ctx.fetcher=async()=>{n++;return Response.json({private:'DO NOT EXPOSE'},{status:429});};
  await assert.rejects(runAction('research',{case:caseFile},ctx),e=>!e.message.includes('DO NOT EXPOSE'));assert.equal(n,1);
});
test('background research completes after a fresh server instance using only its sealed job',async()=>{
  const created=await runAction('research',{case:caseFile,proceed:true},context());
  const fresh=context(output(review,true));const done=await runAction('poll',{job:created.job},fresh);
  assert.equal(done.status,'done');assert.equal(done.state.report.sources[0].status,'unverified');assert.equal(done.state.case.currency,'GBP');assert.equal(fresh.calls.filter(c=>c[0]==='quota').length,0);
});
test('no-search output cannot become a researched case',async()=>{
  const created=await runAction('research',{case:caseFile},context());await assert.rejects(runAction('poll',{job:created.job},context(output(review,false))));
});
test('live hearing and explicit closing carry selected evidence and preserve null financial results',async()=>{
  const created=await runAction('turn',{stateToken:seal(initial,'alice',secret),answer:'The approval is disputed; request the original.',evidence:['E1'],closing:true},context());
  const done=await runAction('poll',{job:created.job},context(output(finalTurn)));
  assert.equal(done.state.round,3);assert.deepEqual(done.state.history[0].evidence,['E1']);assert.equal(done.result.outcomes[0].receive.amount,null);
  await assert.rejects(runAction('turn',{stateToken:done.stateToken,answer:'again',evidence:[]},context()));
});
test('cancellation is bound to the owner and never runs a new model request',async()=>{
  const created=await runAction('research',{case:caseFile},context());const ctx=context({status:'cancelled'});await runAction('cancel',{job:created.job},ctx);assert.match(ctx.calls[0][1],/resp_test\/cancel$/);await assert.rejects(runAction('cancel',{job:created.job},{...ctx,user:'bob'}));
});
test('speech cannot turn arbitrary or imported text into a billing endpoint',async()=>{
  const ctx=context();ctx.speechKey='test-voice-secret';
  await assert.rejects(runAction('speech',{stateToken:seal(initial,'alice',secret),role:'judge',text:'arbitrary text'},ctx));
  await assert.rejects(runAction('speech',{stateToken:seal({...initial,imported:true},'alice',secret),role:'judge',text:review.opening[0].text},ctx));assert.equal(ctx.calls.length,0);
});
test('UTF-8 upload extraction preserves text and refuses oversize or unsupported uploads',async()=>{
  const text='Fictional case: £12,000 fee. Türkçe açıklama.';assert.equal((await extractDocument('case.txt',Buffer.from(text).toString('base64'))).text,text);
  await assert.rejects(extractDocument('x.exe','eA=='));await assert.rejects(extractDocument('x.txt','*'));await assert.rejects(extractDocument('x.txt',Buffer.from('x'.repeat(100001)).toString('base64')));
});
test('public source checks reject private, local, metadata and mapped addresses',()=>{
  for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','::1','::ffff:127.0.0.1','fc00::1','100.64.0.1','0.0.0.0'])assert.equal(isPublicIP(ip),false,ip);assert.equal(isPublicIP('8.8.8.8'),true);
});
test('uncited URLs remain visible but unverified without fetching them',async()=>{
  const result=await verifySource(review.sources[0],new Set());assert.equal(result.status,'unverified');assert.match(result.verification,/not present/);assert.ok(sourceUrls(output(review,true)).has('https://example.org/law'));
});
test('web release keeps keys, local CLI and private records out of browser assets',async()=>{
  const app=await readFile('public/games/fine-print/src/app.js','utf8');assert.ok(!app.includes('ChatGPT session'));assert.ok(!app.includes('/api/jobs/'));assert.ok(app.includes('3 MB'));
  const adapter=await readFile('public/games/fine-print/src/cloud-client.js','utf8');assert.ok(adapter.includes('sessionStorage'));assert.ok(!adapter.includes('OPENAI_API_KEY'));
  const sql=await readFile('supabase/migrations/202609160001_fine_print.sql','utf8');assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/auth.uid\(\)/);assert.match(sql,/revoke all on public.fine_print_usage/);
});
