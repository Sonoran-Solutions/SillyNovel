"""Validate this documentation package and retained historical inputs; no runtime tests."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

root = Path(__file__).resolve().parents[3]
here = Path(__file__).resolve().parent
snapshot = json.loads((here / 'inspection.json').read_text())
baseline = snapshot['fetchedMain']
expected = {
    29: 'ad70bb52e0f46155a5c7b1e5c3da957536612dc9',
    30: 'd3f5761c03fec7fc5d97b0698da718af7af9c187',
    31: '5a9b87f14d5a008e9801aa2260efe40d9e22f5b7',
    32: 'f9497aebf59cbeae07a2b6391d0cff17e81bcc76',
}
for pr in snapshot['github']:
    assert pr['merged'] and pr['state'] == 'closed' and pr['base'] == 'main'
    assert pr['merge_commit_sha'] == expected[pr['number']]
    subprocess.run(['git', 'merge-base', '--is-ancestor', pr['merge_commit_sha'], baseline], cwd=root, check=True)
assert {i['id']: i['status'] for i in snapshot['linear']} == {
    'DYL-22': 'Done', 'DYL-23': 'Done', 'DYL-60': 'Backlog', 'DYL-61': 'Backlog',
    'DYL-62': 'In Review', 'DYL-63': 'In Review', 'DYL-55': 'Done', 'DYL-56': 'Backlog',
}

def anchors(path):
    seen, result = {}, set()
    for line in path.read_text().splitlines():
        if not re.match(r'^#{1,6} ', line):
            continue
        value = re.sub(r'[^\w\- ]', '', re.sub(r'^#+ ', '', line).lower()).replace(' ', '-')
        suffix = seen.get(value, 0)
        result.add(value + (f'-{suffix}' if suffix else ''))
        seen[value] = suffix + 1
    return result

files = ['docs/M1_4_GATE_A_READINESS.md', 'docs/STATUS.md', 'docs/DECISIONS.md']
links = 0
for name in files:
    path = root / name
    content = path.read_text()
    assert len(re.findall(r'^```', content, re.M)) % 2 == 0, name
    for target in re.findall(r'\]\(([^)]+)\)', content):
        if '://' in target:
            continue
        file, _, anchor = target.partition('#')
        resolved = (path.parent / file).resolve() if file else path
        assert resolved.is_file(), (name, target)
        if anchor and resolved.suffix == '.md':
            assert anchor in anchors(resolved), (name, target)
        links += 1
    width = None
    for line in content.splitlines():
        if not line.startswith('|'):
            width = None
            continue
        count = len(re.split(r'(?<!\\)\|', line))
        if width is None:
            width = count
        assert count == width, (name, line)

doc = (root / files[0]).read_text()
ids = [f'T{i:02}' for i in range(1, 15)] + ['T19', 'T22', 'T23', 'T27', 'T28', 'T29', 'T30']
for test_id in ids:
    assert test_id in doc, test_id
for text in ['Decision F: undecided', 'Gate A: NOT_RUN', 'DYL-60: Backlog', 'Exact proposed F1 amendment', 'F2 —', 'NOT_TESTED', 'UNSUPPORTED', 'BLOCKED', 'REVISE']:
    assert text in doc, text
assets = json.loads((root / 'tests/fixtures/m12-stage/manifest.json').read_text())
for asset in assets:
    assert hashlib.sha256((root / 'tests/fixtures/m12-stage' / asset['file']).read_bytes()).hexdigest() == asset['sha256']
    if asset['file'] != 'oversized.png':
        assert asset['sha256'] in doc, asset['file']
proof = json.loads((root / 'docs/evidence/native-groups/review/proof-hashes.json').read_text())
for name, digest in proof.items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == digest, name
checksums = json.loads((root / 'docs/evidence/native-groups/review/checksums.json').read_text())
for name, digest in checksums.items():
    assert hashlib.sha256((root / 'docs/evidence/native-groups/review' / name).read_bytes()).hexdigest() == digest, name
changed = subprocess.check_output(['git', 'diff', baseline, '--name-only'], cwd=root, text=True).splitlines()
assert all(name.startswith('docs/') for name in changed), changed
subprocess.run(['git', 'diff', '--check'], cwd=root, check=True)
print(f'PASS documentation only: {links} relative links/anchors, fences/tables in {len(files)} documents; {len(ids)} required test IDs; 4 merge ancestors; 8 issue states; {len(assets)} fixture hashes; {len(proof)} historical input hashes; {len(checksums)} retained correction-artifact hashes. No runtime validation.')
