"""Serial frozen-candidate campaign; stdlib only. Keeps every log and owned host root."""
from pathlib import Path
import datetime, hashlib, json, os, re, shlex, shutil, subprocess, sys, time

repo = Path(__file__).resolve().parents[3]
host = Path(os.environ['SILLYTAVERN_ROOT']).resolve()
out = Path(sys.argv[1]).resolve()
out.mkdir(parents=True, exist_ok=False)
env = {k: v for k, v in os.environ.items() if not (k.startswith('SN_') and k.endswith('_RUN'))}
def output(args):
    return subprocess.check_output(args, cwd=repo, env=env, text=True).strip()
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def save(name, value):
    (out / name).write_text(json.dumps(value, indent=2) + '\n')

candidate = output(['git', 'rev-parse', 'HEAD'])
assert subprocess.run(['git','diff','--quiet','HEAD','--','index.js','style.css','manifest.json','src','tests','plugins'],cwd=repo).returncode == 0, 'Commit executable changes before freezing'
assert not output(['git','ls-files','--others','--exclude-standard','src','tests','plugins']), 'Untracked candidate inputs'
assert output(['git', '-C', str(host), 'rev-parse', 'HEAD']) == '7e8663cd9c184a550b37238218bdd32c6efc68e9'
assert not output(['git', '-C', str(host), 'status', '--porcelain', '--untracked-files=no'])
assert output(['node', '--version']) == 'v26.8.1'
tracked = output(['git', 'ls-files', '-z']).split('\0')
inputs = {p: sha(repo / p) for p in tracked if p and (p.startswith(('src/', 'tests/', 'plugins/')) or p in ('index.js', 'style.css', 'manifest.json'))}
save('inputs.json', inputs)
browser_info = output(['node', '--input-type=module', '-e', "const {chromium}=await import(process.env.SN_PLAYWRIGHT_MODULE);const b=await chromium.launch({headless:true});console.log(JSON.stringify({version:b.version(),executable:chromium.executablePath()}));await b.close();"])
browser = json.loads(browser_info)
assert browser['version'] == '151.0.7922.34', browser
browser['sha256'] = sha(Path(browser['executable']))
pins = {'candidate': candidate, 'host': output(['git', '-C', str(host), 'rev-parse', 'HEAD']), 'hostVersion': json.loads((host / 'package.json').read_text())['version'], 'node': output(['node', '--version']), 'npm': output(['npm', '--version']), 'nodeExecutableSha256': sha(Path(shutil.which('node')).resolve()), 'sqlite': output(['node', '--input-type=module', '-e', "import {DatabaseSync} from 'node:sqlite';console.log(new DatabaseSync(':memory:').prepare('select sqlite_version() as v').get().v)"]), 'browser': browser, 'hostRoot': str(host), 'playwrightModule': env['SN_PLAYWRIGHT_MODULE'], 'playwrightVersion': json.loads((Path(env['SN_PLAYWRIGHT_MODULE']).parent / 'package.json').read_text())['version'], 'hostHashes': {p: sha(host / p) for p in ['package.json', 'package-lock.json', 'public/script.js', 'public/scripts/bookmarks.js', 'public/scripts/group-chats.js', 'src/constants.js', 'src/users.js', 'src/plugin-loader.js']}, 'platform': output(['uname', '-srm'])}
assert pins['sqlite'] == '3.53.4'
pins['toolingHashes'] = {str(p): sha(p) for p in [Path(env['SN_PLAYWRIGHT_MODULE']), Path(env['SN_PLAYWRIGHT_MODULE']).parent / 'package.json', Path(env['SN_PLAYWRIGHT_MODULE']).parent.parent / 'playwright-core/browsers.json']}
save('pins.json', pins)
steps = [('node', ['node', '--test', '--test-isolation=none', *['tests/' + p + '.test.mjs' for p in ['m0', 'm1-reader-source', 'm1-source-prefix', 'm1-scene-reducer', 'm1-project-scene', 'm1-project-expressions']], *map(str, sorted((Path('tests/probes/dyl19')).glob('*.test.mjs')))], {}, 300), ('storage', ['node', '--test', '--test-isolation=none', *map(str, sorted(Path('plugins/sillynovel-storage/test').glob('*.test.mjs')))], {}, 600), ('browser', ['node', '--test', '--test-isolation=none', 'tests/m1-reader-browser.test.mjs'], {}, 300)]
for name, flags in [('stage-library-migration', ['STAGE_UX','LIBRARY','MIGRATION']), ('expressions',['EXPRESSIONS']), ('groups',['GROUP']), ('recovery',['RECOVERY']), ('cleanup',['CLEANUP']), ('native-integrity-branches',['CANDIDATE'])]:
    steps.append((name, ['node','tests/probes/project-portability/host.mjs',str(host)], {f'SN_{f}_RUN':'1' for f in flags}, 600))
runs = []
for name, command, flags, limit in steps:
    assert output(['git', 'rev-parse', 'HEAD']) == candidate
    assert all(sha(repo / p) == v for p, v in inputs.items()), 'Frozen input changed'
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    tick = time.monotonic()
    print('START', name, flush=True)
    with (out / (name + '.txt')).open('w') as log:
        try:
            result = subprocess.run(command, cwd=repo, env=env | flags, stdout=log, stderr=subprocess.STDOUT, timeout=limit)
            code = result.returncode
        except subprocess.TimeoutExpired:
            code = 124
    text = (out / (name + '.txt')).read_text()
    run = {'name':name, 'candidate':candidate, 'command':shlex.join(command), 'environment':flags, 'startedUTC':started, 'endedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'elapsedSeconds':round(time.monotonic()-tick,3), 'exitCode':code, 'log':name+'.txt', 'checkpointCount':len(re.findall(r'^PASS ',text,re.M))}
    for key in ['tests','pass','fail','cancelled','skipped','todo']:
        m = re.search(r'(?:ℹ |# )'+key+r' (\d+)',text)
        if m: run[key] = int(m[1])
    found = re.search(r'Owned evidence root (\S+)',text)
    if found:
        owned = Path(found[1]); run['ownedRoot'] = str(owned)
        destination = out / name; destination.mkdir()
        for file in sorted(owned.iterdir()):
            if file.is_file() and file.suffix in ('.json','.log','.png','.yaml','.mjs'):
                shutil.copy2(file,destination / file.name)
        if (owned / 'evidence.json').exists():
            record = json.loads((owned / 'evidence.json').read_text())
            assert record['candidate'] == candidate
            run['result'] = record['result']
    runs.append(run);save('runs.json',runs)
    print('END',name,'exit',code,'elapsed',run['elapsedSeconds'],flush=True)
    if code:
        sys.exit(code)
assert all(sha(repo / p) == v for p,v in inputs.items())
save('artifacts.json',{str(p.relative_to(out)):sha(p) for p in sorted(out.rglob('*')) if p.is_file() and p.name != 'artifacts.json'})
print('PASS frozen campaign',candidate,flush=True)
