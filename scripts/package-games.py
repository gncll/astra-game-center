"""Copy the three approved local games using explicit runtime lists and ESM dependencies.

Usage: python3 scripts/package-games.py /path/to/Games
Original game projects are read-only. Adaptations below apply only to the web copies.
"""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import struct
import sys

root = Path(sys.argv[1]).resolve()
web = Path(__file__).resolve().parents[1]
manifest = {}

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
        destination = name.replace('node_modules/', 'vendor/', 1) if name.startswith('node_modules/') else name
        dest = target / destination
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(origin, dest)
        copied[name] = {'source': name, 'path': destination, 'bytes': origin.stat().st_size,
                        'sha256': hashlib.sha256(origin.read_bytes()).hexdigest()}
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

sidewalk_source = root / 'Sidewalk Session'
kenney = re.search(r'KENNEY_NAMES = \[([^\]]+)\]', (sidewalk_source / 'js/Assets.js').read_text()).group(1)
names = re.findall(r"'([^']+)'", kenney)
sidewalk_files = ['index.html', 'style.css', 'models/westside.glb', 'LICENSE', 'mini-skate/License.txt']
for name in names:
    sidewalk_files.append(f'mini-skate/Models/GLB format/{name}.glb')
# Collision recipes fetch these OBJ geometries; the rest of the pack is not shipped.
for name in ['half-pipe', 'rail-low', 'obstacle-box', 'bowl-side']:
    sidewalk_files.append(f'mini-skate/Models/OBJ format/{name}.obj')
sidewalk_files.extend(f'node_modules/{name}/LICENSE' for name in ['three', 'crashcat', 'mathcat'])
sidewalk = package('sidewalk', 'Sidewalk Session', 'js/main.js', sidewalk_files, {
    'three': 'node_modules/three/build/three.module.js',
    'three/addons/': 'node_modules/three/examples/jsm/',
    'crashcat': 'node_modules/crashcat/dist/index.js',
    'mathcat': 'node_modules/mathcat/dist/index.js',
})
edit(sidewalk, 'index.html', './node_modules/', './vendor/')
edit(sidewalk, 'index.html', '<script type="module" src="js/main.js"></script>',
     '<script type="module" src="/games/boot.mjs" data-game-entry="./js/main.js"></script>')
edit(sidewalk, 'index.html', '<div class="top-tools">', '<div class="top-tools"><a class="astra-return" href="/library">← Game Center</a>')
edit(sidewalk, 'index.html', 'LOCAL / NO SIGN-IN', 'ASTRA GAME CENTER')
edit(sidewalk, 'js/main.js', "debug?'sidewalk-test-best':'sidewalk-best-v1'", "(debug?'sidewalk-test-best:':'sidewalk-best-v1:')+globalThis.AstraGameUserId")
edit(sidewalk, 'js/main.js', 'FPS · LOCAL SESSION', 'FPS · ASTRA SESSION')
edit(sidewalk, 'js/Audio.js', 'toggle(){this.enabled=', 'toggle(){if(globalThis.AstraSilentTest)return false;this.enabled=')
edit(sidewalk, 'js/main.js', "$('start').disabled=false;", "globalThis.AstraGameReady?.();$('start').disabled=false;")
edit(sidewalk, 'js/main.js', "init().catch(e=>{console.error(e);", "init().catch(e=>{globalThis.AstraGameError?.();console.error(e);")

sunset_files = ['index.html', 'style.css', 'world-layout.json', 'vendor/THREE-LICENSE.txt']
sunset_files += [f'models/{name}.glb' for name in ['city', 'alex', 'sports-car', 'resident', 'district-detail', 'parked-sports-car']]
sunset_files += [f'assets/{name}_{kind}.jpg' for name in ['asphalt_02', 'concrete_pavement', 'plastered_wall_02'] for kind in ['diff', 'nor_gl', 'rough']]
sunset_files += ['assets/palm-bark.jpg', 'assets/kloppenheim_06_puresky_2k.hdr']
sunset_files += [f'assets/audio/{name}.mp3' for name in ['S01-city', 'S01-engine', 'S01-ignition', 'S01-door', 'step-a', 'step-b', 'radio-soul', 'radio-night', 'radio-dj']]
sunset = package('sunset', 'Sunset Block', 'main.js', sunset_files, {
    'three': 'vendor/three.module.js', 'three/addons/': 'vendor/addons/',
})
edit(sunset, 'index.html', '<script type="module" src="main.js"></script>',
     '<script type="module" src="/games/boot.mjs" data-game-entry="./main.js"></script>')
edit(sunset, 'index.html', '<div class="time">', '<a class="astra-return" href="/library">← Game Center</a><div class="time">')
edit(sunset, 'index.html', 'Blender character · local demo', 'Blender character · Astra Games')
edit(sunset, 'index.html', '<a href="audio-check.html" target="_blank">Silent audio verification</a>', '')
edit(sunset, 'main.js', 'async function setSound(on){soundChoice=on;', 'async function setSound(on){on=Boolean(on&&!globalThis.AstraSilentTest);soundChoice=on;')
edit(sunset, 'main.js', "$('find-car').disabled=false;reset();", "$('find-car').disabled=false;reset();globalThis.AstraGameReady?.();")
edit(sunset, 'main.js', ".catch(e=>{$('status').textContent='The scene could not load. '", ".catch(e=>{globalThis.AstraGameError?.();$('status').textContent='The scene could not load. '")

pine_files = ['demo.html', 'demo.css', 'vendor/THREE-LICENSE.txt', 'assets/weathered-wood.png']
pine_files += [f'models/demo/{name}.glb' for name in ['survivor-actions', 'pine-0', 'pine-1', 'rocks', 'ferns', 'grass', 'roots', 'cabin', 'camp']]
pine_files += [f'assets/source/demo/ground/{name}.jpg' for name in ['forest_floor_diff_1k', 'forest_floor_nor_gl_1k', 'forest_floor_rough_1k', 'mud_forest_diff_1k']]
pine_files += [f'assets/audio/{name}.mp3' for name in ['ambience-rain', 'ambience-campfire', 'ambience-stream-v3', 'sfx-step-wood-a', 'sfx-step-wood-b', 'sfx-step-dirt-a', 'sfx-step-dirt-b', 'sfx-axe-swing', 'sfx-axe-hit', 'sfx-supply', 'sfx-eat']]
pine = package('pine', 'Pine Hollow', 'demo.js', pine_files, {
    'three': 'vendor/three.module.js', 'three/addons/': 'vendor/addons/',
})
edit(pine, 'demo.html', '<script type="module" src="demo.js?v=s02-help-1"></script>',
     '<script type="module" src="/games/boot.mjs" data-game-entry="./demo.js?v=s02-help-1"></script>')
edit(pine, 'demo.html', '<div class="actions">', '<div class="actions"><a class="astra-return" href="/library">← Game Center</a>')
edit(pine, 'demo.js', "$('sound').onclick=()=>{sound=!sound;", "$('sound').onclick=()=>{sound=globalThis.AstraSilentTest?false:!sound;")
edit(pine, 'demo.js', 'scene.init(text=>status.textContent=text)', 'scene.init(text=>{status.textContent=text;globalThis.AstraGameLoading?.(text);})')
edit(pine, 'demo.js', "renderMission();}catch(error){status.textContent=", "renderMission();globalThis.AstraGameReady?.();}catch(error){globalThis.AstraGameError?.();status.textContent=")

def loading_markup(game, name):
    return f'''<div id="astra-loading" aria-label="Loading {name}"><div class="astra-loading-card">
<img src="/center/assets/{game}.png" alt="{name} logo"><p class="astra-loading-brand">ASTRA GAME CENTER</p>
<h1>{name}</h1><p id="astra-loading-status" role="status">Preparing your game…</p>
<progress aria-label="Loading game"></progress><button id="astra-loading-retry" hidden>Try again</button>
<a href="/library">← Back to collection</a></div></div>'''

for folder, html, game, name in [(sidewalk, 'index.html', 'sidewalk', 'Sidewalk Session'), (sunset, 'index.html', 'sunset', 'Sunset Block'), (pine, 'demo.html', 'pine', 'Pine Hollow')]:
    edit(folder, html, '</head>', '<link rel="stylesheet" href="/games/center.css"></head>')
    edit(folder, html, '<body>', '<body>' + loading_markup(game, name))

(web / 'docs/runtime-source-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
for game, files in manifest.items():
    print(game, len(files), round(sum(f['bytes'] for f in files)/1048576, 2), 'MiB')
