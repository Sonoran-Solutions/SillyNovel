from pathlib import Path
import hashlib,json,re,struct,subprocess
root=Path(__file__).resolve().parents[4]
evidence=Path(__file__).resolve().parent
proof=json.loads((evidence/'proof-hashes.json').read_text())
old=json.loads((evidence.parent/'proof-hashes.json').read_text())
for name,digest in proof['inputs'].items():
    assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest,name
    frozen=subprocess.check_output(['git','show',proof['frozenCorrection']+':'+name],cwd=root)
    assert hashlib.sha256(frozen).hexdigest()==digest,name
    if name.startswith('plugins/') or name.startswith('tests/fixtures/'):assert digest==old['inputs'][name],name
print(len(proof['inputs']),'frozen input hashes verified; inherited storage inputs unchanged')
for path,count in [(evidence/'node-tests.txt',124),(evidence/'browser-tests.txt',59),(evidence.parent/'storage-tests.txt',126)]:
    text=path.read_text()
    for key,value in [('tests',count),('pass',count),('fail',0),('cancelled',0),('skipped',0)]:assert re.search(r'\b'+key+r' '+str(value)+r'\b',text),(path,key)
    print(path.name,count,'PASS', '(inherited; not rerun)' if path.parent!=evidence else '')
red=(evidence/'development/reorder-before-fix.txt').read_text();assert re.search(r'\bfail 2\b',red) and red.count('remove overlay synchronously')==2
host=json.loads((evidence/'host.json').read_text());assert host['candidate']==proof['frozenCorrection'] and host['result']=='PASS' and len(host['checks'])==16
x=host['expressions'];assert x['nativeBefore']==x['nativeAfter'] and len(x['nativeBefore'])==36
assert host['portabilityNativeBefore']==host['portabilityNativeAfter']
assert x['outgoing']['scene']==x['original']['scene']==x['saved']['scene'];assert x['outgoing']['catalog']==x['original']['catalog']==x['saved']['catalog']
assert not re.search('expression|prefixSha256|session-source',json.dumps(x['outgoing']))
assert len(x['screenshots'])==8
for name in x['screenshots']:
    data=(evidence/name).read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n';assert struct.unpack('>II',data[16:24])==((390,800) if 'narrow' in name else (1440,1100))
print('Before-fix regressions fail as expected; 16 host groups; 36 native hashes unchanged; global-only save; 8 screenshots')
p=root/'docs/M1_PROJECT_EXPRESSIONS_REVIEW.md';text=p.read_text();assert text.count('```')%2==0
for dest in re.findall(r'\]\(([^)]+)\)',text):
    if '://' not in dest and not dest.startswith('#'):assert (p.parent/dest.split('#')[0]).exists(),dest
print('Correction handoff links and Markdown fences verified')
