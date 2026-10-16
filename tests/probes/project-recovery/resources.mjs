import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {performance} from 'node:perf_hooks';
import {PNG} from '../../../plugins/sillynovel-storage/node_modules/pngjs/lib/png.js';
import CRC from '../../../plugins/sillynovel-storage/node_modules/pngjs/lib/crc.js';
import {openStore} from '../../../plugins/sillynovel-storage/store.mjs';
import {digest} from '../../../plugins/sillynovel-storage/png.mjs';
import {createBackup,inspectBackup,restoreBackup,DATABASE_NAME,LIMITS} from '../../../plugins/sillynovel-storage/recovery.mjs';
const root=mkdtempSync(join(tmpdir(),'sn-recovery-resources-'));
for(const [name,projectCount,assetsPerProject,padding,edge=1]of [['representative',4,3,4096],['larger-synthetic',100,10,128*1024],['maximum-single-PNG',1,1,0,4000]]){
 const dir=join(root,name);mkdirSync(dir,{mode:0o700});const source=join(dir,'source.sqlite'),backup=join(dir,'backup'),target=join(dir,'target');mkdirSync(target,{mode:0o700});mkdirSync(join(target,'_storage'));
 const store=openStore(source),projects=[];
 for(let i=0;i<projectCount;i++){const handle='synthetic-'+(i%5),created=1000+i%5,owner=JSON.stringify([handle,created]);projects.push({owner,...store.create(owner,{name:'Synthetic duplicate'})});const key='user:'+handle;writeFileSync(join(target,'_storage',digest(Buffer.from(key))),JSON.stringify({key,value:{handle,created}}));}store.close();
 const image=new PNG({width:edge,height:edge});image.data.set([32,96,128,255]);const original=PNG.sync.write(image),chunk=Buffer.alloc(padding+12);chunk.writeUInt32BE(padding,0);chunk.write('tEXt',4);chunk.writeUInt32BE(CRC.crc32(chunk.subarray(4,padding+8))>>>0,padding+8);const bytes=Buffer.concat([original.subarray(0,-12),chunk,original.subarray(-12)]),sha=digest(bytes);
 const db=new DatabaseSync(source),insert=db.prepare('INSERT INTO assets VALUES (?,?,?,?,?,?)');db.exec('BEGIN IMMEDIATE');
 for(const p of projects){let ref;for(let i=0;i<assetsPerProject;i++){const id=randomUUID();ref??=id;insert.run(id,p.projectId,sha,edge,edge,bytes);}db.prepare('UPDATE projects SET revision=7,scene=? WHERE id=?').run(JSON.stringify({backgroundAssetId:ref,backgroundLocked:true,actors:[]}),p.projectId);}db.exec('COMMIT');db.close();
 const started=performance.now();const made=await createBackup(source,backup),backupMs=performance.now()-started;
 const inspectStart=performance.now(),valid=inspectBackup(backup,target),inspectMs=performance.now()-inspectStart;
 const restoreStart=performance.now();restoreBackup(backup,join(target,DATABASE_NAME));const restoreMs=performance.now()-restoreStart;
 assert.equal(valid.projects,projectCount);assert.equal(valid.assets,projectCount*assetsPerProject);assert.equal(inspectBackup(backup,target).sha256,made.sha256);
 console.log(JSON.stringify({scenario:name,root:dir,node:process.version,limits:LIMITS,projects:projectCount,assets:valid.assets,sourceBytes:statSync(source).size,snapshotBytes:made.byteLength,snapshotSHA256:made.sha256,manifestSHA256:digest(readFileSync(join(backup,'manifest.json'))),pngSHA256:sha,pngBytes:bytes.length,decodedPixels:edge*edge,backupMs,inspectMs,restoreMs,peakRSS:process.resourceUsage().maxRSS*1024,sqlite:made.sqlite,journalMode:made.journalMode}));
}
