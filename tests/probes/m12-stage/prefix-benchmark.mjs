// Actual prefix implementation, synthetic history; not a whole-browser heap benchmark.
// Run: node --expose-gc tests/probes/m12-stage/prefix-benchmark.mjs
import assert from 'node:assert/strict';
import { fingerprintHistory, MAX_PREFIX_MS } from '../../../src/source-prefix.mjs';
assert.equal(typeof global.gc,'function','Run with --expose-gc for comparable retained-memory measurements');
const MiB=1024*1024;
const history=Array.from({length:1000},(_,i)=>({sourceKey:'source-'+i,revision:1,swipeId:0,author:{kind:'assistant',label:'Mira'},text:String(i).padStart(4,'0')+'x'.repeat(1496)}));
const memory=()=>{const m=process.memoryUsage();return m.heapUsed+m.arrayBuffers;};
global.gc();const baseline=memory();let peak=baseline,calls=0;
const digest=crypto.subtle.digest.bind(crypto.subtle);
crypto.subtle.digest=async(...args)=>{calls++;peak=Math.max(peak,memory());const result=await digest(...args);peak=Math.max(peak,memory());return result;};
let cache;
async function run() {const start=performance.now();cache=await fingerprintHistory(history,'benchmark-session',cache,()=>true);return performance.now()-start;}
try {
    const coldMs=await run();const coldCalls=calls;
    global.gc();const retainedBytes=memory()-baseline;
    const warmMs=await run();assert.equal(calls,coldCalls,'navigation must not rehash unchanged history');
    history[999]={...history[999],revision:2,text:'changed tail'.padEnd(1500,'x')};
    const tailMs=await run();assert.equal(calls,coldCalls+1,'tail update must hash once');
    const metrics={messages:1000,charactersPerMessage:1500,swipeTextIncluded:true,coldMs,warmMs,tailMs,coldCalls,retainedBytes,peakBytes:peak-baseline,encodedBytes:cache.entries.reduce((sum,e)=>sum+e.bytes.byteLength,0),budgets:{coldMs:MAX_PREFIX_MS,warmMs:100,tailMs:250,retainedBytes:16*MiB,peakBytes:64*MiB},node:process.version};
    console.log(JSON.stringify(metrics,null,2));
    for(const [key,budget] of Object.entries(metrics.budgets))assert.ok(metrics[key]<=budget,`${key}: ${metrics[key]} exceeds ${budget}`);
} finally {crypto.subtle.digest=digest;}
