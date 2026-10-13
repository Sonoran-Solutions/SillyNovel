import assert from 'node:assert/strict';
import test from 'node:test';
import { fingerprintHistory, MAX_PREFIX_BYTES, MAX_PREFIX_MS } from '../src/source-prefix.mjs';
import { fingerprintSourcePrefix } from './probes/dyl19/source-anchor.mjs';

const record = (key, text, swipeId = null, revision = 1) => ({ sourceKey:key, text, swipeId, revision, author:{kind:'assistant',label:'Mira'} });
const hash = (history, previous = null, owner = 'session-test') => fingerprintHistory(history, owner, previous, () => true);
function reference(history, owner = 'session-test') {
    const messages = history.map(s => ({ role:s.author.kind, author:{kind:'unresolved',label:s.author.label}, text:s.text,
        swipe:s.swipeId == null ? null : {id:s.swipeId,text:s.text} }));
    return messages.map((_,selectedIndex) => fingerprintSourcePrefix({owner:{userStoreKey:owner},scope:{kind:'session',key:owner},messages,selectedIndex}));
}
test('prefixes retain exact sn-source-v1 semantics through edits, insertion, deletion, reorder and owner changes', async () => {
    const a=record('a','日本語 😀\n"quoted" \\ \u0000'), b=record('b','same',0), c=record('c','same',1);
    let cache=null;
    for (const history of [[a,b,c],[a,b,c,record('d','tail')],[a,record('b','edited',0,2),c],[a,c],[c,a],[c,b,a],[]]) {
        cache=await hash(history,cache);
        assert.deepEqual(cache.sources.map(s=>s.prefixSha256),reference(history));
        assert.deepEqual(cache.sources.map(s=>s.key),history.map(s=>s.sourceKey));
    }
    cache=await hash([a,b],cache,'different-owner');
    assert.deepEqual(cache.sources.map(s=>s.prefixSha256),reference([a,b],'different-owner'));
});
test('unchanged history reuses hashes, tail edit hashes once, historical edit hashes its suffix', async () => {
    const digest=crypto.subtle.digest.bind(crypto.subtle); let calls=0;
    crypto.subtle.digest=(...args)=>{calls++;return digest(...args);};
    try {
        const history=[record('a','one'),record('b','two'),record('c','three')];
        const first=await hash(history); assert.equal(calls,3);
        const warm=await hash(history.map(s=>({...s})),first); assert.equal(calls,3);
        const tail=await hash([...history.slice(0,2),record('c','tail',null,2)],warm); assert.equal(calls,4);
        const edited=await hash([record('a','new',null,2),...history.slice(1)],tail); assert.equal(calls,7);
        assert.deepEqual(first.sources.map(s=>s.prefixSha256),reference(history));
        assert.notEqual(edited.sources[0].prefixSha256,first.sources[0].prefixSha256);
        assert.equal(warm.entries[0],first.entries[0]);
    } finally {crypto.subtle.digest=digest;}
});
test('stale work cannot return a cache; size and elapsed-time ceilings refuse without truncation', async () => {
    let checks=0;
    assert.equal(await fingerprintHistory([record('a','one')],'owner',null,()=>++checks<4),null);
    await assert.rejects(hash([record('a','x'.repeat(MAX_PREFIX_BYTES))]),/8 MiB/);
    const descriptor=Object.getOwnPropertyDescriptor(globalThis,'performance'); let now=0;
    Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now++ ? MAX_PREFIX_MS+1 : 0}});
    try {await assert.rejects(hash([record('a','one')]),/5 seconds/);}
    finally {Object.defineProperty(globalThis,'performance',descriptor);}
});
