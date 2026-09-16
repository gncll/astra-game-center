import { lookup } from 'node:dns/promises';
import https from 'node:https';
import { inflateRawSync } from 'node:zlib';
import { decodeHTML } from 'entities';
import ipaddr from 'ipaddr.js';
import { CaseError,check } from './core.mjs';

export function docxText(b) {
  // Read only the main XML member; bound decompression independently of ZIP metadata.
  let end=-1;
  for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)if(b.readUInt32LE(i)===0x06054b50){end=i;break;}
  check(end>=0,'This DOCX archive could not be read.');
  let pos=b.readUInt32LE(end+16),total=0,xml;
  const count=b.readUInt16LE(end+10);check(count<=2000,'This DOCX contains too many members.');
  for(let i=0;i<count;i++){
    check(pos+46<=b.length&&b.readUInt32LE(pos)===0x02014b50,'Invalid DOCX directory.');
    const compressed=b.readUInt32LE(pos+20),size=b.readUInt32LE(pos+24),nameLen=b.readUInt16LE(pos+28),extra=b.readUInt16LE(pos+30),comment=b.readUInt16LE(pos+32),offset=b.readUInt32LE(pos+42),method=b.readUInt16LE(pos+10);
    total+=size;check(total<=30*1024*1024,'The expanded DOCX is too large.');
    const name=b.subarray(pos+46,pos+46+nameLen).toString();
    if(name==='word/document.xml'){
      check(!xml&&size<=2*1024*1024&&offset+30<=b.length&&b.readUInt32LE(offset)===0x04034b50,'Invalid or oversized DOCX text.');
      const start=offset+30+b.readUInt16LE(offset+26)+b.readUInt16LE(offset+28);check(start+compressed<=b.length,'Truncated DOCX.');
      const data=b.subarray(start,start+compressed);
      check(method===0||method===8,'Unsupported DOCX compression.');
      xml=(method===0?data:inflateRawSync(data,{maxOutputLength:2*1024*1024})).toString('utf8');
    }
    pos+=46+nameLen+extra+comment;
  }
  check(xml,'This file has no Word document text.');
  return decodeHTML(xml.replace(/<w:tab\b[^>]*\/>/g,'\t').replace(/<\/w:p>/g,'\n').replace(/<[^>]*>/g,''));
}
export async function pdfText(data) {
  const { PDFParse }=await import('pdf-parse');
  const p=new PDFParse({data:new Uint8Array(data),isEvalSupported:false});
  try{
    const info=await p.getInfo();check(info.total<=100,'PDF limit: 100 pages.');
    const result=await p.getText();
    const text=result.pages.map(p=>'[Page '+p.num+']\n'+p.text).join('\n\n');
    check(result.pages.map(p=>p.text).join('').trim().length>=30,'No readable PDF text was found. Upload a text-based PDF or TXT; scans need OCR first.');
    return text;
  }finally{await p.destroy();}
}
export async function extractDocument(name,data) {
  check(typeof name==='string'&&name.length<=240&&typeof data==='string'&&data.length<=4_194_304&&/^[A-Za-z0-9+/]*={0,2}$/.test(data)&&data.length%4===0,'Invalid upload or file larger than 3 MB.');
  const bytes=Buffer.from(data,'base64');check(bytes.length>0&&bytes.length<=3*1024*1024,'Each file must be 1 byte–3 MB.');
  const ext=name.toLowerCase().split('.').at(-1);let text;
  try{
    if(ext==='pdf')text=await pdfText(bytes);
    else if(ext==='docx')text=docxText(bytes);
    else if(['txt','md','json'].includes(ext))text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    else throw new CaseError('Upload PDF, DOCX, TXT, MD or JSON.');
  }catch(e){if(e instanceof CaseError)throw e;throw new CaseError('This document could not be read. Use an unlocked text-based PDF, DOCX or UTF-8 TXT.');}
  check(text.length<=100000,'This document exceeds 100,000 extracted characters.');
  check(text.trim().length>0,'This document contains no readable text.');
  return {name:name.split(/[\\/]/).at(-1),text};
}
export function isPublicIP(ip){try{let a=ipaddr.parse(ip);if(a.kind()==='ipv6'&&a.isIPv4MappedAddress())a=a.toIPv4Address();return a.range()==='unicast';}catch{return false;}}
export async function publicPage(raw,redirects=0) {
  const u=new URL(raw);
  check(u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&redirects<=3,'Not a public HTTPS source.');
  const host=u.hostname.replace(/^\[|\]$/g,'');
  const addresses=await lookup(host,{all:true});check(addresses.length>0&&addresses.every(x=>isPublicIP(x.address)),'Private network source blocked.');
  const a=addresses[0];
  // Pin the vetted DNS answer to the TLS connection; redirects are checked afresh.
  const result=await new Promise((resolve,reject)=>{
    const req=https.get(u,{headers:{'User-Agent':'FinePrint-SourceCheck/1.0','Accept':'text/html,application/pdf,text/plain','Accept-Encoding':'identity'},lookup:(_h,opts,cb)=>opts?.all?cb(null,[a]):cb(null,a.address,a.family)},res=>{
      if([301,302,303,307,308].includes(res.statusCode)){res.resume();resolve({redirect:res.headers.location});return;}
      if(res.statusCode!==200){res.resume();reject(new Error('Source unavailable'));return;}
      const chunks=[];let size=0;
      res.on('data',c=>{size+=c.length;if(size>6_000_000){req.destroy(new Error('Source too large'));return;}chunks.push(c);});
      res.on('error',reject);res.on('end',()=>resolve({bytes:Buffer.concat(chunks),type:res.headers['content-type']||''}));
    });
    const timer=setTimeout(()=>req.destroy(new Error('Source timed out')),12000);
    req.on('close',()=>clearTimeout(timer));req.on('error',reject);
  });
  if(result.redirect)return publicPage(new URL(result.redirect,u).href,redirects+1);
  return result;
}
const normal=s=>s.normalize('NFKC').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\s+/g,' ').trim().toLowerCase();
export async function verifySource(source,urls) {
  const result={...source,checked_at:new Date().toISOString(),status:'unverified',verification:'The quotation could not be independently matched. Treat the legal conclusion as unverified.'};
  const canonical=s=>{try{const u=new URL(s);u.hash='';return u.href.replace(/\/$/,'');}catch{return '';}};
  if(![...urls].some(u=>canonical(u)===canonical(source.url))){result.verification='This URL was not present in the model’s web-search source record.';return result;}
  if(source.quote.trim().split(/\s+/).length>25||source.quote.length<15){result.verification='The quotation did not meet the independent source-check limits.';return result;}
  try{
    const page=await publicPage(source.url);
    const text=page.type.includes('pdf')?await pdfText(page.bytes):decodeHTML(page.bytes.toString('utf8').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' '));
    if(normal(text).includes(normal(source.quote))){result.status='quote_matched';result.verification='Retrieved independently and quotation matched. This confirms the quoted text, not legal applicability or the outcome.';}
  }catch{/* Keep the source and its explicit uncertainty, never silently drop it. */}
  return result;
}
