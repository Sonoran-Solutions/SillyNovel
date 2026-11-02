"""Run from any directory: verify discovery and fail-closed missing/extra suites."""
from pathlib import Path
import json, shutil, subprocess, sys, tempfile

runner = Path(__file__).with_name('run.py')
def discover(script, cwd):
    return subprocess.run([sys.executable, str(script), '--list-tests'], cwd=cwd, capture_output=True, text=True)

with tempfile.TemporaryDirectory(prefix='sn-discovery-check-') as directory:
    root = Path(directory)
    baseline = discover(runner, runner.parents[3])
    foreign = discover(runner, root)
    assert baseline.returncode == foreign.returncode == 0
    assert baseline.stdout == foreign.stdout
    suites = json.loads(baseline.stdout)
    assert {name: len(files) for name, files in suites.items()} == {'node': 8, 'storage': 5, 'browser': 1}
    copied = root / 'tests/probes/dyl60/run.py'
    copied.parent.mkdir(parents=True)
    shutil.copyfile(runner, copied)
    for files in suites.values():
        for name in files:
            path = root / name;path.parent.mkdir(parents=True, exist_ok=True);path.touch()
    assert discover(copied, root).returncode == 0
    extra = root / 'plugins/sillynovel-storage/test/unexpected.test.mjs';extra.touch()
    assert discover(copied, root).returncode != 0
    extra.unlink()
    for name in suites['storage']:
        (root / name).unlink()
    assert discover(copied, root).returncode != 0
    for name in suites['storage']:
        (root / name).touch()
    (root / suites['node'][0]).unlink()
    assert discover(copied, root).returncode != 0
print('PASS: identical repository/foreign-cwd discovery; 8/5/1 files; unexpected, empty and missing suites refused')
