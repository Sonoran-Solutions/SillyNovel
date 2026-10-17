"""Validate one fresh integrated package, not historical artifact totals."""
from pathlib import Path
import hashlib, json, re, subprocess, sys
repo = Path(__file__).resolve().parents[3]
out = Path(sys.argv[1]).resolve()
load = lambda p: json.loads((out / p).read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
pins, runs, inputs = load('pins.json'), load('runs.json'), load('inputs.json')
for art in json.loads((repo / 'tests/fixtures/m12-stage/manifest.json').read_text()):
    assert sha(repo / 'tests/fixtures/m12-stage' / art['file']) == art['sha256']
assert len(runs) == 9
assert pins['node'] == 'v26.8.1' and pins['sqlite'] == '3.53.4'
assert pins['browser']['version'] == '151.0.7922.34'
assert pins['host'] == '7e8663cd9c184a550b37238218bdd32c6efc68e9'
for path, value in inputs.items():
    assert sha(repo / path) == value, path
for run in runs:
    assert run['candidate'] == pins['candidate'] and run['exitCode'] == 0, run
    if 'tests' in run:
        assert run['tests'] == run['pass'] and run['fail'] == run['skipped'] == run['cancelled'] == 0, run
    else:
        record = load(run['name'] + '/evidence.json')
        assert record['candidate'] == pins['candidate'] and record['result'] == 'PASS'
        assert record['browser'] == pins['browser']['version'] and record['host'] == pins['host']
        assert run['checkpointCount'] == len(record['checks'])
        assert record['portabilityNativeBefore'] == record['portabilityNativeAfter']
group = load('groups/evidence.json')['groups']
assert group['nativeBefore'] == group['nativeAfter']
assert len(set(group['members'])) == len(set(group['manualActors'])) == 4
assert [c['name'] for c in group['cards']].count('Mira') == 2
assert sum(bool(a['present'] and a['slot']) for a in group['saved']['scene']['actors']) == 3
assert group['saved']['scene']['actors'][3]['slot'] is None
for name in ['outgoing','committed','bundle']:
    assert not re.search('temporary-expression|prefixSha256|session-source|groupId|members',json.dumps(group[name]))
detail = load('native-integrity-branches/evidence.json')['candidatePreparation']
visual = detail['phases'][0]
assert visual['before'] == visual['after'] and visual['allowedSettingsChanges'] == []
assert any('User Avatars/lantern-persona.png' in p for p in visual['before']['files'])
assert detail['copy']['parentPath'] != detail['copy']['copyPath']
assert detail['copy']['before']['files'][detail['copy']['parentPath']] == detail['copy']['before']['files'][detail['copy']['copyPath']]
assert detail['branch']['allowedCardChange']['field'] == 'chat'
assert detail['activeBranch']['hadAppliedExpression'] and detail['activeBranch']['lateCommittedSaveIgnored']
assert detail['activeBranch']['name'] != detail['branch']['name']
assert detail['generation']['requests'] and not re.search('sillynovel|prefixSha256|session-source|temporary-expression|projectId|actorId',json.dumps(detail['generation']['requests']),re.I)
generation = detail['generation']
assert generation['activeSyntheticPersona'] and generation['before']['settings']['user_avatar'] == 'lantern-persona.png'
assert [{k:m[k] for k in ('role','content')} for m in generation['requests'][0]['messages'] if m['role'] != 'system'] == generation['expectedMessages']
assert all(v not in json.dumps(generation['requests']) for v in generation['excludedVisualIds'])
cleanup = load('cleanup/evidence.json')['cleanup']
assert cleanup['nativeBefore'] == cleanup['nativeAfter']
assert cleanup['revisions']['beforeCleanup'] == cleanup['revisions']['afterCleanup']
assert cleanup['revisions']['afterSave'] == cleanup['revisions']['beforeCleanup'] + 1
assert cleanup['quota']['before']['logical'] - cleanup['quota']['after']['logical'] == cleanup['quota']['receipt']['reclaimedBytes']
assert cleanup['quota']['afterUpload']['logical'] > cleanup['quota']['after']['logical']
assert detail['fixture']['individualTurns'] == 20 and len(detail['fixture']['groupMessages']) == 6
for run in runs[3:]:
    for file in (out / run['name']).glob('*.png'):
        assert file.read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
for path,value in load('artifacts.json').items():
    assert sha(out / path) == value, path
assert subprocess.run(['git','diff','--check'],cwd=repo).returncode == 0
print('PASS', pins['candidate'], ':', len(inputs), 'frozen inputs;', [(r['name'],r.get('tests',r['checkpointCount'])) for r in runs], '; native inventory',visual['before']['count'],'files;',len(load('artifacts.json')),'artifact hashes; physical/owner gates NOT_TESTED/NOT_RUN')
