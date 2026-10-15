import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { PNG } from '../../../plugins/sillynovel-storage/node_modules/pngjs/lib/png.js';
import { bundleJob } from '../../../plugins/sillynovel-storage/bundle.mjs';
import CRC from '../../../plugins/sillynovel-storage/node_modules/pngjs/lib/crc.js';
import { digest } from '../../../plugins/sillynovel-storage/png.mjs';
const image=new PNG({width:2048,height:2048});
for(let i=0;i<image.data.length;i+=4){image.data[i]=i%251;image.data[i+1]=(i>>>10)%251;image.data[i+2]=(i>>>14)%251;image.data[i+3]=255;}
const bytes=PNG.sync.write(image),id='11111111-1111-4111-8111-111111111111';
const snapshot={name:'Maximum pixel fixture',scene:{backgroundAssetId:id,backgroundLocked:true,actors:[]},assets:[{id,sha256:digest(bytes),bytes}]};
const lag=monitorEventLoopDelay({resolution:10});lag.enable();let peak=process.memoryUsage().rss;
const sampler=setInterval(()=>peak=Math.max(peak,process.memoryUsage().rss),5);const started=performance.now();
const bundle=Buffer.from(await bundleJob('encode',snapshot)),exportMs=performance.now()-started;
const importStart=performance.now();const copy=await bundleJob('decode',bundle);assert.equal(copy.assets[0].sha256,digest(bytes));
const importMs=performance.now()-importStart;clearInterval(sampler);lag.disable();
console.log(JSON.stringify({node:process.version,pixels:2048*2048,pngBytes:bytes.length,bundleBytes:bundle.length,sha256:digest(bytes),exportMs,importMs,peakRSS:Math.max(peak,process.memoryUsage().rss),eventLoopDelayMaxMs:lag.max/1e6},null,2));

// A second synthetic fixture reaches the encoded-byte ceiling and nearly all pixels.
const dense=new PNG({width:2048,height:2047});dense.data.set(image.data.subarray(0,dense.data.length));
function paddedPNG(bytes,target) {
 const n=target-bytes.length-12;assert.ok(n>=0);const chunk=Buffer.alloc(n+12);chunk.writeUInt32BE(n,0);chunk.write('tEXt',4);chunk.writeUInt32BE(CRC.crc32(chunk.subarray(4,n+8))>>>0,n+8);
 return Buffer.concat([bytes.subarray(0,-12),chunk,bytes.subarray(-12)]);
}
const first=paddedPNG(PNG.sync.write(dense),5*1024*1024),small=new PNG({width:1,height:1}),second=paddedPNG(PNG.sync.write(small),1024*1024);
const secondId='22222222-2222-4222-8222-222222222222';
const maximum={name:'Maximum bytes fixture',scene:{backgroundAssetId:id,backgroundLocked:true,actors:[{actorId:'33333333-3333-4333-8333-333333333333',name:'Actor',spriteAssetId:secondId,slot:'left',present:true,locks:{presence:true,slot:true,outfit:true}}]},assets:[{id,bytes:first,sha256:digest(first)},{id:secondId,bytes:second,sha256:digest(second)}]};
const maxStart=performance.now();const encoded=Buffer.from(await bundleJob('encode',maximum));const decoded=await bundleJob('decode',encoded);assert.equal(decoded.assets.length,2);
console.log(JSON.stringify({scenario:'maximum encoded bytes',pngBytes:first.length+second.length,pixels:2048*2047+1,bundleBytes:encoded.length,roundtripMs:performance.now()-maxStart,maxRSS:process.resourceUsage().maxRSS*1024},null,2));
