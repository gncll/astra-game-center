"""Package only the approved Sunset Block runtime; leave every other game untouched.
Usage: python3 scripts/package-sunset.py /path/to/Games
"""
from pathlib import Path
import hashlib,json,re,shutil,subprocess,struct,sys
root=Path(sys.argv[1]).resolve()
web=Path(__file__).resolve().parents[1]
manifest={}
def package(game, folder, entry, files, aliases):
    source = root / folder
    target = web / 'public/games' / game
    copied = {}
    def copy(name):
        name = str(Path(name))
        if name in copied:
            return
        origin = (source / name).resolve()
        assert origin.is_relative_to(source), name
        assert origin.is_file(), str(origin)
        approved = allowed.get(name)
        assert approved, f'Runtime file is not in the approved S06 manifest: {name}'
        source_hash = hashlib.sha256(origin.read_bytes()).hexdigest()
        assert source_hash == approved['sha256'], f'Source changed after S06 validation: {name}'
        destination = name.replace('node_modules/', 'vendor/', 1) if name.startswith('node_modules/') else name
        dest = target / destination
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(origin, dest)
        copied[name] = {'source': name, 'path': destination, 'bytes': origin.stat().st_size,
                        'sha256': source_hash}
        if origin.suffix == '.glb':
            with origin.open('rb') as stream:
                header = stream.read(20)
                model = json.loads(stream.read(struct.unpack_from('<I', header, 12)[0]))
            for resource in model.get('images', []) + model.get('buffers', []):
                uri = resource.get('uri', '')
                if uri and not uri.startswith('data:'):
                    copy(str((origin.parent / uri).resolve().relative_to(source)))
        if origin.suffix in ('.js', '.mjs'):
            deps = json.loads(subprocess.check_output(['node', str(web / 'scripts/module-imports.cjs'), str(origin)], text=True))
            for dep in deps:
                dep = dep.split('?')[0]
                if dep.startswith('.'):
                    resolved = (origin.parent / dep).resolve()
                else:
                    match = next((key for key in sorted(aliases, key=len, reverse=True)
                                  if dep == key or key.endswith('/') and dep.startswith(key)), None)
                    if match is None:
                        raise ValueError(f'Unmapped module {dep} in {name}')
                    resolved = source / (aliases[match] + dep[len(match):])
                copy(str(resolved.relative_to(source)))
    for name in files:
        copy(name)
    copy(entry)
    manifest[game] = sorted(copied.values(), key=lambda row: row['path'])
    return target

def edit(folder, name, before, after):
    path = folder / name
    text = path.read_text()
    assert before in text, f'Adaptation anchor missing: {name}: {before[:65]}'
    path.write_text(text.replace(before, after))


source=root/'Sunset Block'
release=json.loads((source/'docs/s06-runtime-manifest.json').read_text())
assert release['release']=='S06'
allowed={row['path']:row for row in release['files']}
version=release['cacheVersion']
files=['index.html','style.css','world-layout.json','vendor/THREE-LICENSE.txt']
files += [row['path'] for row in release['files'] if row['path'].startswith(('models/','assets/'))]
target=package('sunset','Sunset Block','main.js',files,{'three':'vendor/three.module.js','three/addons/':'vendor/addons/'})
# Remove only old Sunset files described by the preceding release manifest.
manifest_path=web/'docs/runtime-source-manifest.json'
all_games=json.loads(manifest_path.read_text())
keep={row['path'] for row in manifest['sunset']}
for row in all_games.get('sunset',[]):
    old=(target/row['path']).resolve()
    assert old.is_relative_to(target)
    if row['path'] not in keep and old.is_file():old.unlink()
edit(target,'index.html',f'<script type="module" src="main.js?v={version}"></script>',f'<script type="module" src="/games/boot.mjs" data-game-entry="./main.js?v={version}"></script>')
edit(target,'index.html','<div class="time">','<a class="astra-return" href="/library">← Game Center</a><div class="time">')
edit(target,'index.html','Blender character · local demo','Blender character · Astra Games')
edit(target,'index.html','<a href="audio-check.html" target="_blank">Silent audio verification</a>','')
edit(target,'main.js','async function setSound(on){soundChoice=on;','async function setSound(on){on=Boolean(on&&!globalThis.AstraSilentTest);soundChoice=on;')
edit(target,'main.js',"$('find-car').disabled=false;reset();","$('find-car').disabled=false;reset();globalThis.AstraGameReady?.();")
edit(target,'main.js',".catch(e=>{$('status').textContent='The scene could not load. '",".catch(e=>{globalThis.AstraGameError?.();$('status').textContent='The scene could not load. '")
loading='<div id="astra-loading" aria-label="Loading Sunset Block"><div class="astra-loading-card">\n<img src="/center/assets/sunset.png" alt="Sunset Block logo"><p class="astra-loading-brand">ASTRA GAME CENTER</p>\n<h1>Sunset Block</h1><p id="astra-loading-status" role="status">Preparing your game…</p>\n<progress aria-label="Loading game"></progress><button id="astra-loading-retry" hidden>Try again</button>\n<a href="/library">← Back to collection</a></div></div>'
edit(target,'index.html','</head>','<link rel="stylesheet" href="/games/center.css"></head>')
edit(target,'index.html','<body>','<body>'+loading)
all_games['sunset']=manifest['sunset']
manifest_path.write_text(json.dumps(all_games,indent=2)+'\n')
receipt={'release':'S06','date':'2026-09-13','entry':'index.html','cacheVersion':version,'files':[]}
for row in manifest['sunset']:
    data=(target/row['path']).read_bytes()
    receipt['files'].append({**row,'packagedBytes':len(data),'packagedSha256':hashlib.sha256(data).hexdigest()})
(web/'docs/sunset-release-manifest.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('Sunset S06:',len(receipt['files']),'files,',round(sum(row['packagedBytes'] for row in receipt['files'])/1048576,2),'MiB')
