import { currentAccount } from '@/lib/auth';
import { allowedOrigins } from '@/lib/config';
import { validMutation } from '@/lib/security.mjs';
import { json } from '@/lib/http';
import { runAction } from '@/lib/fine-print/service.mjs';
import { extractDocument, verifySource } from '@/lib/fine-print/documents.mjs';
import { CaseError } from '@/lib/fine-print/core.mjs';

export const runtime='nodejs';
export const maxDuration=60;
const noStore={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
type Context={params:Promise<{action:string}>};
export async function GET(_request:Request,context:Context) {
  const account=await currentAccount();if(!account)return json({error:'Sign in to Game Center.'},401);
  if((await context.params).action!=='config')return json({error:'Not found.'},404);
  return json({user:account.user.id,model:process.env.FINE_PRINT_MODEL||'gpt-6-astra',engine:'OpenAI · live web research',skill:'contract-review',tts:Boolean(process.env.ELEVENLABS_API_KEY),research:Boolean(process.env.OPENAI_API_KEY)});
}
export async function POST(request:Request,context:Context) {
  if(!validMutation(request.headers,allowedOrigins()))return json({error:'Start this action from Game Center.'},403);
  const account=await currentAccount();if(!account)return json({error:'Sign in to Game Center.'},401);
  try{
    const reader=request.body?.getReader();if(!reader)throw new CaseError('Request body required.');
    const limit=4_300_000,chunks:Uint8Array[]=[];let size=0;
    if(Number(request.headers.get('content-length')||0)>limit){await reader.cancel();throw new CaseError('Request exceeds the web upload limit.');}
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new CaseError('Request exceeds the web upload limit.');}chunks.push(value);}
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new CaseError('Invalid request.');}
    if(!body||Array.isArray(body)||typeof body!=='object')throw new CaseError('Invalid request.');
    const action=(await context.params).action;
    const result=await runAction(action,body,{
      user:account.user.id,secret:process.env.OPENAI_API_KEY||'',speechKey:process.env.ELEVENLABS_API_KEY||'',extract:extractDocument,verify:verifySource,
      quota:async(kind:string,amount:number,caseId:string)=>{
        const {data,error}=await account.client.rpc('reserve_fine_print_usage',{p_kind:kind,p_amount:amount,p_case:caseId});
        if(error)throw new CaseError('The web research usage service is not ready. Please try later.',503);
        if(data!==true)throw new CaseError('The daily research or narration allowance has been reached. Continue with your saved record and subtitles, or return tomorrow.',429);
      }
    });
    if(result.audio)return new Response(new Uint8Array(result.audio),{headers:{...noStore,'Content-Type':'audio/mpeg'}});
    return json(result);
  }catch(error){return error instanceof CaseError?json({error:error.message},error.status):json({error:'This step could not be completed. Your case remains in this tab.'},500);}
}
