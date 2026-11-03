"""Validate one DYL-193 replay package: pins, runtime byte-identity with the candidate, row exits, artifact hashes.
It does not validate the dyl60 campaign layout (tests/probes/dyl60/validate.py does that) and it cannot turn a
SYNTHETIC row into a physical or assistive result. Usage: python3 tests/probes/dyl193/validate.py <package-dir>"""
from pathlib import Path
import hashlib, json, subprocess, sys
repo = Path(__file__).resolve().parents[3]
out = Path(sys.argv[1]).resolve()
load = lambda p: json.loads((out / p).read_text())
sha = lambda b: hashlib.sha256(b).hexdigest()
pins, runs, inputs = load('pins.json'), load('runs.json'), load('inputs.json')
assert pins['node'] == 'v26.8.1' and pins['browser']['version'] == '151.0.7922.34'
assert pins['host'] == '7e8663cd9c184a550b37238218bdd32c6efc68e9' and pins['hostVersion'] == '1.19.0'
assert pins['runtimeDiffFromCandidate']['exit'] == 0
for path in ['index.js', 'style.css', 'manifest.json']:
    assert sha(subprocess.check_output(['git', 'show', pins['candidate'] + ':' + path], cwd=repo)) == inputs[path], path
for path, value in inputs.items():
    if path.startswith(('src/', 'plugins/')) and not path.startswith('plugins/sillynovel-storage/node_modules'):
        assert sha(subprocess.check_output(['git', 'show', pins['candidate'] + ':' + path], cwd=repo)) == value, path
    assert sha((repo / path).read_bytes()) == value, path
rows = {r['name']: r for r in runs}
assert set(rows) >= {'adb-devices', 'adb-mdns', 'scaling', 'motion', 'assistive', 'groups'}
device = (out / 'device.txt').read_text()
assert 'Physical status: ' in device
for name in ['scaling', 'motion', 'assistive', 'groups']:
    run = rows[name]; record = load(name + '/evidence.json')
    assert run['exitCode'] == 0 and record['result'] == 'PASS' and record['candidate'] == pins['probeHead'], name
    assert record['host'] == pins['host'] and record['browser'] == pins['browser']['version'], name
    assert run['checkpointCount'] == len(record['checks']) >= 1, name
    assert record['synthetic'] == (name != 'groups'), name
    for file in (out / name).glob('*.png'):
        assert file.read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
for path, value in load('artifacts.json').items():
    assert sha((out / path).read_bytes()) == value, path
assert subprocess.run(['git', 'diff', '--check'], cwd=repo).returncode == 0
print('PASS DYL-193 package: candidate', pins['candidate'], 'probe head', pins['probeHead'], '; runtime byte-identical;', [(n, rows[n]['checkpointCount']) for n in ['scaling', 'motion', 'assistive', 'groups']], '; device', 'BLOCKED' if 'BLOCKED' in device else 'see device.txt', '; SYNTHETIC rows stay synthetic; screen reader and tablet NOT_TESTED')
