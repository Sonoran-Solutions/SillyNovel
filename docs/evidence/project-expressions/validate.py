from pathlib import Path
import hashlib,json,re,struct,subprocess
root=Path(__file__).resolve().parents[3]
evidence=Path(__file__).resolve().parent
proof=json.loads((evidence/'proof-hashes.json').read_text())
for name,digest in proof['inputs'].items():
    assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest,name
    frozen=subprocess.check_output(['git','show',proof['frozenCandidate']+':'+name],cwd=root)
    assert hashlib.sha256(frozen).hexdigest()==digest,name
    if name.startswith('plugins/') or name.startswith('tests/fixtures/'):
        storage=subprocess.check_output(['git','show',proof['storageCampaignStart']+':'+name],cwd=root)
        assert storage==frozen,'Storage input changed: '+name
print(len(proof['inputs']),'frozen input hashes match; storage inputs unchanged')
for name,count in [('node-tests.txt',123),('storage-tests.txt',126),('browser-tests.txt',57)]:
    text=(evidence/name).read_text()
    for key,value in [('tests',count),('pass',count),('fail',0),('cancelled',0),('skipped',0)]:
        assert re.search(r'\b'+key+r' '+str(value)+r'\b',text),(name,key)
    print(name,count,'PASS')
host=json.loads((evidence/'host.json').read_text())
assert host['candidate']==proof['frozenCandidate'] and host['result']=='PASS'
assert len(host['checks'])==16
x=host['expressions']
assert x['nativeBefore']==x['nativeAfter'] and len(x['nativeBefore'])==36
assert host['portabilityNativeBefore']==host['portabilityNativeAfter']
assert x['outgoing']['scene']==x['original']['scene']==x['saved']['scene']
assert x['outgoing']['catalog']==x['original']['catalog']==x['saved']['catalog']
assert not re.search('expression|prefixSha256|session-source',json.dumps(x['outgoing']))
print('16 host groups; 36 native hashes unchanged; global scene/catalog save equality; no expression payload')
assert len(x['screenshots'])==8
for name in x['screenshots']:
    data=(evidence/name).read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n'
    dimensions=struct.unpack('>II',data[16:24]);assert dimensions==((390,800) if 'narrow' in name else (1440,1100))
print('8 screenshots match desktop/narrow dimensions')
for name in ['M1_PROJECT_EXPRESSIONS.md','M1_PROJECT_EXPRESSIONS_IMPLEMENTATION.md']:
    path=root/'docs'/name;text=path.read_text();assert 'FINAL_' not in text
    assert text.count('```')%2==0
    for dest in re.findall(r'\]\(([^)]+)\)',text):
        if '://' in dest or dest.startswith('#'):continue
        assert (path.parent/dest.split('#')[0]).exists(),(name,dest)
print('Contract/handoff links and Markdown fences verified')
