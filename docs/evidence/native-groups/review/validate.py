from pathlib import Path
import hashlib,json,re,subprocess
root=Path(__file__).resolve().parents[4]
here=Path(__file__).resolve().parent
old=here.parent
original=json.loads((old/'checksums.json').read_text())
for name,want in original.items():
    assert hashlib.sha256((old/name).read_bytes()).hexdigest()==want,name
proof=json.loads((here/'proof-hashes.json').read_text())
for name,want in proof.items():
    assert hashlib.sha256((root/name).read_bytes()).hexdigest()==want,name
host=json.loads((here/'host.json').read_text())
assert host['result']=='PASS'
assert host['candidate']==(here/'tested-sha.txt').read_text().strip()
g=host['groups']
assert g['nativeBefore']==g['nativeAfter']
assert len(g['members'])==len(set(g['members']))==4
assert [c['name'] for c in g['cards']].count('Mira')==2
assert len(g['manualActors'])==len(set(g['manualActors']))==4
assert [s['name'] for s in g['sources']]==['Mira','Mira','Rowan','Sage']
assert g['sources'][0]['mes']==g['sources'][1]['mes']
assert len(g['saved']['scene']['actors'])==4
assert sum(bool(a['present'] and a['slot']) for a in g['saved']['scene']['actors'])==3
assert g['saved']['scene']['actors'][3]['slot'] is None
assert g['outgoing']['scene']==g['saved']['scene']
assert g['outgoing']['catalog']==g['saved']['catalog']
assert json.loads(g['committed']['scene'])==g['saved']['scene']
assert json.loads(g['committed']['catalog'])==g['saved']['catalog']
for name in ['outgoing','committed','bundle']:
    assert not re.search(r'temporary-expression|prefixSha256|session-source|groupId|members',json.dumps(g[name])),name
assert g['bundle']['version']==1 and 'catalog' not in g['bundle']
assert g['backup']['schemaVersion']==2
assert g['replacementGroup']['id']!=g['groups'][1]['id']
for name,value in g['nativeBefore'].items():
    if '/characters/' in name:
        assert value==g['nativeAfterDeletionAndRecreation'][name],name
for file in g['screenshots']:
    assert (here/file).is_file(),file
for name,count in [('node-tests.txt',153),('browser-tests.txt',81),('storage-tests.txt',126)]:
    log=(here/name).read_text()
    assert re.search(r'(?:ℹ |# )tests '+str(count)+r'\b',log),name
    assert re.search(r'(?:ℹ |# )pass '+str(count)+r'\b',log),name
    assert re.search(r'(?:ℹ |# )fail 0\b',log),name
    assert re.search(r'(?:ℹ |# )skipped 0\b',log),name
links=0
for file in ['README.md','docs/M1_NATIVE_GROUPS.md','docs/M1_NATIVE_GROUPS_IMPLEMENTATION.md','docs/STATUS.md','docs/DECISIONS.md','docs/TESTING.md','docs/M1_NATIVE_GROUPS_REVIEW.md']:
    content=(root/file).read_text()
    # Check new integration links; historical reports have independent validators.
    for target in re.findall(r'\]\(([^)]+)\)',content):
        if not ('NATIVE_GROUPS' in target or 'native-groups/' in target):continue
        path=target.split('#')[0]
        assert ((root/file).parent/path).exists(),(file,target)
        links+=1
subprocess.run(['git','diff','--check'],cwd=root,check=True)
print(f'PASS: {len(original)} original evidence files unchanged; {len(proof)} frozen inputs; {len(host["checks"])} actual-host checkpoints; 153 Node / 81 Chromium / 126 storage; {len(g["nativeBefore"])} identical named native files; {len(g["screenshots"])} screenshots; {links} integration links')
