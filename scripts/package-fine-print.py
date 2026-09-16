#!/usr/bin/env python3
"""Publish only The Fine Print's allowlisted runtime and cloud adapter."""
import argparse, hashlib, json, shutil
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('--source',type=Path,required=True)
p.add_argument('--destination',type=Path,default=Path.cwd())
a=p.parse_args();source=a.source.resolve();dest=a.destination.resolve()
manifest=[]
def put(relative,data,origin):
    target=dest/relative;target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes(data)
    manifest.append({'path':relative,'source':origin,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
def replace(text,before,after):
    if before not in text:raise RuntimeError('Source adapter anchor changed: '+before[:70])
    return text.replace(before,after)
prefix='/games/fine-print'
runtime=json.loads((source/'runtime-manifest.json').read_text())
for item in runtime['files']:
    if item['scope']!='browser':continue
    path=item['path'];data=(source/path).read_bytes()
    if path.endswith(('.html','.js','.css')):
        text=data.decode()
        for folder in ['assets','src','models','vendor']:
            text=text.replace('/'+folder+'/',prefix+'/'+folder+'/') if path!='src/courtroom3d.js' or folder=='models' else text
        if path=='index.html':
            text=text.replace('href="/styles.css"','href="'+prefix+'/styles.css"')
            text=text.replace('<div id="app"></div>','<div id="app"></div><div id="web-loading" role="status"><img src="/center/assets/fine-print.png" alt="The Fine Print"><p id="web-status">Opening your case file…</p><button id="web-retry" hidden>Try again</button><a href="/library">Back to Game Center</a></div>')
            text=text.replace('</head>','<script type="module" src="'+prefix+'/src/boot.js"></script></head>')
        if path=='src/app.js':
            text="import {cloudAPI,cloudConfig,cloudSession,cloudPoll} from './cloud-client.js';\n"+text
            start=text.index('async function api(');end=text.index('\nfunction button(',start)
            text=text[:start]+'const api=cloudAPI;'+text[end:]
            text=replace(text,"const r=await fetch('/api/jobs/'+id);if(!r.ok)throw new Error('The research session expired. Your documents remain in this tab.');const j=await r.json();","const j=await cloudPoll(id);")
            text=replace(text,"const s=await(await fetch('/api/session')).json();","const s=await cloudSession();")
            text=replace(text,"await (await fetch('/api/config')).json()","await cloudConfig()")
            text=replace(text,"await(await fetch('/api/config')).json()","await cloudConfig()")
            text=replace(text,"catch{render();toast('Start the local server with ./start.sh, then reload.')}","catch(e){render();toast(e.message);window.dispatchEvent(new CustomEvent('fine-print-error',{detail:e.message}))}")
            text=replace(text,"if(!await restoreSession())render();","if(!await restoreSession())render();window.dispatchEvent(new Event('fine-print-ready'));")
            text=replace(text,'8*1024*1024','3*1024*1024').replace('8 MB','3 MB')
            text=replace(text,'href="/" aria-label="The Fine Print home"','href="/library" aria-label="Back to Game Center" title="Back to Game Center"')
            text=text.replace('Codex research','OpenAI web research')
            text=replace(text,'Documents are sent to Codex using your ChatGPT session. Spoken lines go to ElevenLabs. This local app keeps case data in memory for up to two hours.', 'Documents are sent to OpenAI for live web research. Spoken lines go to ElevenLabs. Your case is saved in this account’s browser tab; export it before closing. Daily research and voice limits apply.')
            text=replace(text,'runs your contract-review skill with Codex','runs your contract-review skill with OpenAI')
            text=replace(text,'Uploaded text goes to Codex via your ChatGPT session. Narration text goes to ElevenLabs. The local server keeps cases and speech in memory for up to two hours; completed research and active hearings can be resumed by reloading within the session. Only checked public quotations may be saved to the skill source cache. Download a record to keep it.', 'Uploaded text goes to OpenAI; spoken lines go to ElevenLabs. The browser tab holds your case and a signed, account-bound session that expires after two hours without renewal. OpenAI background jobs are temporarily stored for polling; provider data policies apply. No case documents are saved in Game Center’s database. Export your record before closing the tab. Imported records use subtitles until researched again.')
            text=replace(text,'Codex uses your account allowance. ElevenLabs narration is capped at 6,000 characters per case session.', 'The web service uses API billing. Each account can start 3 research requests and 12 hearing responses per UTC day. Narration is capped at 6,000 characters per case and 12,000 per account per day; site-wide limits also apply. Replaying a cached line in this tab uses no new voice request.')
            text=text.replace('this local session','this browser tab').replace('reopen it locally','reopen it in this tab')
            # A dropped polling connection retains the sealed job. Reload reconnects without a new paid call.
            text=text.replace("toast(e.message)}}poll()}","toast(e.message+' Reload to reconnect to this step without starting another request.')}}poll()}")
        data=text.encode()
    put('public/games/fine-print/'+path,data,path)
for name in ['core.mjs','service.mjs','documents.mjs','protocol.json']:
    put('lib/fine-print/'+name,(source/'web'/name).read_bytes(),'web/'+name)
for name,target in [('client.js','public/games/fine-print/src/cloud-client.js'),('boot.js','public/games/fine-print/src/boot.js'),('route.ts','app/api/fine-print/[action]/route.ts'),('202609160001_fine_print.sql','supabase/migrations/202609160001_fine_print.sql'),('package-fine-print.py','scripts/package-fine-print.py')]:
    put(target,(source/'web'/name).read_bytes(),'web/'+name)
style=dest/'public/games/fine-print/styles.css'
data=style.read_bytes()+b'\n#web-loading{position:fixed;inset:0;z-index:100;background:#182b27;color:#f4f0e6;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px;font:16px Georgia,serif}#web-loading img{width:160px;height:160px;border-radius:24px}#web-loading a{color:#c8b580}#web-retry{padding:12px 28px}#web-loading[hidden]{display:none}\n'
put('public/games/fine-print/styles.css',data,'styles.css + web loading styles')
for name in ['core.test.mjs','fixtures.mjs']:
    if (source/'tests/web'/name).exists():put('tests/fine-print/'+name,(source/'tests/web'/name).read_bytes(),'tests/web/'+name)
if (source/'assets/game-center-icon.png').exists():put('public/center/assets/fine-print.png',(source/'assets/game-center-icon.png').read_bytes(),'assets/game-center-icon.png')
put('public/games/fine-print/example-case.txt',(source/'examples/The-Fine-Print-Demo-Case.txt').read_bytes(),'examples/The-Fine-Print-Demo-Case.txt')
unique={item['path']:item for item in manifest}
(dest/'docs/fine-print-release-manifest.json').write_text(json.dumps({'format':'fine-print-web-v1','files':list(unique.values())},indent=2)+'\n')
print('Packaged',len(unique),'allowlisted files. No other games modified.')
