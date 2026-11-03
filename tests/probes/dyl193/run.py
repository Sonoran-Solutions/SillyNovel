"""DYL-193 replay supervisor; stdlib only. Runs the device discovery and the four rows serially, each under a
deadline with bounded retained output, keeps every owned host root, and writes pins/runs/artifacts like dyl60/run.py.
Usage: SILLYTAVERN_ROOT=... SN_PLAYWRIGHT_MODULE=... python3 tests/probes/dyl193/run.py <out-dir> <candidate-sha>"""
from pathlib import Path
import datetime, hashlib, json, os, shlex, shutil, subprocess, sys, time

repo = Path(__file__).resolve().parents[3]
host = Path(os.environ['SILLYTAVERN_ROOT']).resolve()
out = Path(sys.argv[1]).resolve(); candidate = sys.argv[2]
out.mkdir(parents=True, exist_ok=False)
env = {k: v for k, v in os.environ.items() if not (k.startswith('SN_') and k.endswith('_RUN'))}
HEAD_KEEP, TAIL_KEEP, LIMITS = 1024 * 1024, 4 * 1024 * 1024, {'device': 120, 'row': 600}
def output(args, cwd=repo):
    return subprocess.check_output(args, cwd=cwd, env=env, text=True).strip()
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def save(name, value):
    (out / name).write_text(json.dumps(value, indent=2) + '\n')
def bounded(path):
    data = path.read_bytes()
    if len(data) > HEAD_KEEP + TAIL_KEEP:
        path.write_bytes(data[:HEAD_KEEP] + b'\n...[retained head/tail; %d bytes dropped]...\n' % (len(data) - HEAD_KEEP - TAIL_KEEP) + data[-TAIL_KEEP:])
    return len(data)
def supervised(name, command, limit, flags={}):
    started = datetime.datetime.now(datetime.timezone.utc).isoformat(); tick = time.monotonic()
    print('START', name, flush=True)
    with (out / (name + '.txt')).open('w') as log:
        try:
            code = subprocess.run(command, cwd=repo, env=env | flags, stdout=log, stderr=subprocess.STDOUT, timeout=limit, start_new_session=True).returncode
        except subprocess.TimeoutExpired as e:
            code = 124
    produced = bounded(out / (name + '.txt'))
    run = {'name': name, 'command': shlex.join(command), 'deadlineSeconds': limit, 'startedUTC': started, 'endedUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'elapsedSeconds': round(time.monotonic() - tick, 3), 'exitCode': code, 'log': name + '.txt', 'bytesProduced': produced}
    print('END', name, 'exit', code, 'elapsed', run['elapsedSeconds'], flush=True)
    return run

head = output(['git', 'rev-parse', 'HEAD'])
assert subprocess.run(['git', 'diff', '--quiet', 'HEAD', '--', 'index.js', 'style.css', 'manifest.json', 'src', 'tests', 'plugins'], cwd=repo).returncode == 0, 'Commit executable changes before running'
assert not output(['git', 'ls-files', '--others', '--exclude-standard', 'src', 'tests', 'plugins']), 'Untracked candidate inputs'
runtime_diff = subprocess.run(['git', 'diff', '--quiet', candidate, head, '--', 'src', 'index.js', 'style.css', 'plugins', 'manifest.json'], cwd=repo).returncode
assert runtime_diff == 0, 'Runtime differs from the candidate; this is not a replay of the candidate'
tests_diff = output(['git', 'diff', '--stat', candidate, head, '--', 'tests'])
assert output(['git', '-C', str(host), 'rev-parse', 'HEAD']) == '7e8663cd9c184a550b37238218bdd32c6efc68e9'
assert not output(['git', '-C', str(host), 'status', '--porcelain', '--untracked-files=no'])
assert output(['node', '--version']) == 'v26.8.1'
tracked = output(['git', 'ls-files', '-z']).split('\0')
inputs = {p: sha(repo / p) for p in tracked if p and (p.startswith(('src/', 'tests/', 'plugins/')) or p in ('index.js', 'style.css', 'manifest.json'))}
save('inputs.json', inputs)
browser = json.loads(output(['node', '--input-type=module', '-e', "const {chromium}=await import(process.env.SN_PLAYWRIGHT_MODULE);const b=await chromium.launch({headless:true});console.log(JSON.stringify({version:b.version(),executable:chromium.executablePath()}));await b.close();"]))
assert browser['version'] == '151.0.7922.34', browser
browser['sha256'] = sha(Path(browser['executable']))
pins = {'candidate': candidate, 'probeHead': head, 'runtimeDiffFromCandidate': {'command': 'git diff --quiet %s %s -- src index.js style.css plugins manifest.json' % (candidate, head), 'exit': runtime_diff}, 'testsDiffFromCandidate': tests_diff,
        'host': output(['git', '-C', str(host), 'rev-parse', 'HEAD']), 'hostVersion': json.loads((host / 'package.json').read_text())['version'], 'node': output(['node', '--version']), 'npm': output(['npm', '--version']), 'nodeExecutableSha256': sha(Path(shutil.which('node')).resolve()),
        'browser': browser, 'hostRoot': str(host), 'playwrightModule': env['SN_PLAYWRIGHT_MODULE'], 'playwrightVersion': json.loads((Path(env['SN_PLAYWRIGHT_MODULE']).parent / 'package.json').read_text())['version'],
        'hostHashes': {p: sha(host / p) for p in ['package.json', 'package-lock.json', 'public/script.js', 'public/scripts/bookmarks.js', 'public/scripts/group-chats.js', 'src/constants.js', 'src/users.js', 'src/plugin-loader.js']}, 'platform': output(['uname', '-srm']), 'adb': shutil.which('adb')}
save('pins.json', pins)
runs = []
# Device discovery exactly as at Gate A: inventory only. Never pair, connect, unlock, install or change a setting.
device_lines = []
for name, command in [('adb-devices', ['adb', 'devices', '-l']), ('adb-mdns', ['adb', 'mdns', 'services'])]:
    run = supervised(name, command, LIMITS['device']); runs.append(run)
    device_lines.append('Authorized discovery: %s, exit %d.\n%s' % (shlex.join(command), run['exitCode'], (out / run['log']).read_text().strip()))
devices = [l for l in (out / 'adb-devices.txt').read_text().splitlines() if l.strip() and not l.startswith(('*', 'List of devices'))]
device_status = 'ATTACHED' if devices else 'BLOCKED'
device_lines.append('\nPhysical status: %s.' % device_status + ('' if devices else ' No device serial/model/Android/browser/IME/display configuration available.\nNeeded: operator provides an already paired, connected, unlocked Samsung Galaxy Tab S8+ using the established wireless-ADB setup. No new pairing, unlocking or settings change attempted.\nActual touch, virtual keyboard/IME, device text scaling, device 200 % zoom, device reduced motion, file picker, import/export and cleanup by touch: NOT_TESTED.\nAssistive technology: NOT_TESTED. Synthetic accessibility-tree assertions do not substitute.'))
(out / 'device.txt').write_text('\n'.join(device_lines) + '\n')
print('DEVICE', device_status, flush=True)
if devices:
    print('A device is attached; this supervisor records inventory only. Drive it separately as at Gate A and record facts.json by hand.', flush=True)
save('runs.json', runs)
for row in ['scaling', 'motion', 'assistive', 'groups']:
    assert output(['git', 'rev-parse', 'HEAD']) == head
    assert all(sha(repo / p) == v for p, v in inputs.items()), 'Frozen input changed'
    run = supervised(row, ['node', 'tests/probes/dyl193/host.mjs', str(host), row], LIMITS['row'])
    text = (out / (row + '.txt')).read_text()
    run['checkpointCount'] = text.count('\nPASS ') + text.startswith('PASS ')
    found = [l for l in text.splitlines() if l.startswith('Owned evidence root ')]
    if found:
        owned = Path(found[0].split(' ', 3)[3]); run['ownedRoot'] = str(owned)
        destination = out / row; destination.mkdir()
        for file in sorted(owned.iterdir()):
            if file.is_file() and file.suffix in ('.json', '.log', '.png', '.yaml', '.mjs', '.txt'):
                shutil.copy2(file, destination / file.name)
        record = json.loads((owned / 'evidence.json').read_text()) if (owned / 'evidence.json').exists() else {}
        run['result'] = record.get('result', 'NO_EVIDENCE'); run['synthetic'] = record.get('synthetic')
    runs.append(run); save('runs.json', runs)
assert all(sha(repo / p) == v for p, v in inputs.items())
save('artifacts.json', {str(p.relative_to(out)): sha(p) for p in sorted(out.rglob('*')) if p.is_file() and p.name != 'artifacts.json'})
failed = [r['name'] for r in runs if r['exitCode'] != 0 and r['name'] not in ('adb-devices', 'adb-mdns')]
print(('FAIL rows ' + ','.join(failed)) if failed else 'PASS replay rows', 'candidate', candidate, 'probe head', head, 'device', device_status, flush=True)
sys.exit(1 if failed else 0)
