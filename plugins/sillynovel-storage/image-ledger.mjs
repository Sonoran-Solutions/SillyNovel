import { randomUUID } from 'node:crypto';
import { demand, exact, validId } from './schema.mjs';

export const UNRESOLVED = ['pending','cancelled','timeout-unknown','unknown'];
export const TRANSITIONS = {
    pending:['candidate','failed','stale','cancelled','timeout-unknown'],
    cancelled:['stale','abandoned'],
    'timeout-unknown':['candidate','failed','stale','abandoned','unknown'],
    unknown:['reconciled','abandoned'],
    candidate:['imported','discarded'],
    reconciled:['imported','discarded'],
};
const TERMINAL = ['imported','discarded','failed','stale','abandoned'];
const hash = v => typeof v==='string' && /^[0-9a-f]{64}$/.test(v);
const tabId = v => typeof v==='string' && v.length>0 && v.length<=128 && !/[\x00-\x1f]/.test(v);
const object = v => v && typeof v==='object' && !Array.isArray(v);
const time = v => Number.isSafeInteger(v) && v>=0;
const optional = (body,required,allowed=[]) => exact(body,[...required,...allowed.filter(k=>Object.hasOwn(body??{},k))]);
const bounded = body => demand(Buffer.byteLength(JSON.stringify(body))<=32768,'BODY_LIMIT',413);
export const hostPathValid = path => {
    if(typeof path!=='string' || !path.startsWith('/user/images/') || /[%\\]/.test(path) || path.includes('//') || path.split('/').includes('..') || !/\.png$/i.test(path))return false;
    try {return new URL(path,'http://localhost').pathname===path;} catch {return false;}
};
export const imageJsonRow = row => row ? Object.fromEntries(Object.entries(row).map(([key,value])=>[
    key==='asset'?'assetId':key.replace(/_([a-z])/g,(_,c)=>c.toUpperCase()),key==='settings'?JSON.parse(value):value])) : null;

// Shared with offline inspection: the ledger never makes an asset reference hard.
export function validateImageSession(s) {
    demand(validId(s.id) && validId(s.project) && typeof s.owner==='string' && tabId(s.tab) && hash(s.workflow_sha256)
        && s.allowance===5 && Number.isSafeInteger(s.used) && s.used>=0 && s.used<=5
        && time(s.started_at) && time(s.heartbeat_at) && s.heartbeat_at>=s.started_at
        && (s.ended_at===null || time(s.ended_at) && s.ended_at>=s.started_at),'INVALID_IMAGE_LEDGER');
}
export function validateImageJob(j) {
    let settings;try {settings=JSON.parse(j.settings);} catch {demand(false,'INVALID_IMAGE_LEDGER');}
    demand(validId(j.id) && validId(j.session) && validId(j.project) && typeof j.owner==='string'
        && hash(j.payload_sha256) && hash(j.workflow_sha256) && typeof j.review==='string'
        && Buffer.byteLength(j.review)<=32768 && typeof j.settings==='string' && Buffer.byteLength(j.settings)<=32768
        && object(settings) && ['fixed','random'].includes(j.seed_policy)
        && [...UNRESOLVED,'candidate','reconciled',...TERMINAL].includes(j.state)
        && time(j.submitted_at) && time(j.deadline_at) && j.deadline_at-j.submitted_at>=1000 && j.deadline_at-j.submitted_at<=600000
        && (j.settled_at===null ? UNRESOLVED.includes(j.state) : time(j.settled_at) && j.settled_at>=j.submitted_at && !UNRESOLVED.includes(j.state))
        && (j.host_path===null || hostPathValid(j.host_path)) && (j.result_sha256===null || hash(j.result_sha256))
        && (j.asset===null || validId(j.asset)) && (j.state!=='imported' || validId(j.asset))
        && (j.host_deleted_at===null || time(j.host_deleted_at) && j.host_deleted_at>=j.submitted_at && j.host_path!==null && ['discarded','imported','abandoned'].includes(j.state)), 'INVALID_IMAGE_LEDGER');
}

export function imageLedger(db,transaction,load,asset) {
    const session = (owner,project,id) => {
        demand(validId(id),'NOT_FOUND',404);
        const row=db.prepare('SELECT * FROM image_sessions WHERE owner=? AND project=? AND id=?').get(owner,project,id);
        demand(row,'NOT_FOUND',404);return row;
    };
    const job = (owner,project,id) => {
        demand(validId(id),'NOT_FOUND',404);
        const row=db.prepare('SELECT * FROM image_jobs WHERE owner=? AND project=? AND id=?').get(owner,project,id);
        demand(row,'NOT_FOUND',404);return row;
    };
    const open = (owner,project) => db.prepare('SELECT * FROM image_sessions WHERE owner=? AND project=? AND ended_at IS NULL').get(owner,project);
    const holder = (s,tab) => demand(s && s.tab===tab && s.ended_at===null,'LEASE_LOST',409);
    const unresolved = (owner,project) => db.prepare("SELECT * FROM image_jobs WHERE owner=? AND project=? AND state IN ('pending','cancelled','timeout-unknown','unknown') ORDER BY submitted_at,id").all(owner,project);
    return {
        imageSession(owner,project) {
            return transaction(()=>{load(owner,project);return {session:imageJsonRow(open(owner,project)),jobs:unresolved(owner,project).map(imageJsonRow)};});
        },
        beginImageSession(owner,project,body) {
            return transaction(()=>{
                load(owner,project);
                demand(optional(body,['tab','workflowSha256'],['takeover']) && tabId(body.tab) && hash(body.workflowSha256) && (!Object.hasOwn(body,'takeover') || typeof body.takeover==='boolean'));
                const prior=open(owner,project),now=Date.now();
                if(prior) {
                    if(!body.takeover)throw Object.assign(Error('LEASE_HELD'),{code:'LEASE_HELD',status:409,details:{status:now-prior.heartbeat_at>90000?'stale':'held',heartbeatAt:prior.heartbeat_at,tab:prior.tab}});
                    db.prepare('UPDATE image_sessions SET tab=?,heartbeat_at=? WHERE owner=? AND project=? AND id=?').run(body.tab,now,owner,project,prior.id);
                    return imageJsonRow(session(owner,project,prior.id));
                }
                const id=randomUUID();
                db.prepare('INSERT INTO image_sessions VALUES (?,?,?,?,?,5,0,?,?,NULL)').run(id,owner,project,body.tab,body.workflowSha256,now,now);
                return imageJsonRow(session(owner,project,id));
            });
        },
        heartbeatImageSession(owner,project,body) {
            return transaction(()=>{
                load(owner,project);demand(exact(body,['sessionId','tab']) && tabId(body.tab));
                const s=session(owner,project,body.sessionId);holder(s,body.tab);
                db.prepare('UPDATE image_sessions SET heartbeat_at=? WHERE owner=? AND project=? AND id=?').run(Date.now(),owner,project,s.id);
                return imageJsonRow(session(owner,project,s.id));
            });
        },
        endImageSession(owner,project,body) {
            return transaction(()=>{
                load(owner,project);demand(exact(body,['sessionId','tab']) && tabId(body.tab));
                const s=session(owner,project,body.sessionId);demand(s.tab===body.tab,'LEASE_LOST',409);
                db.prepare('UPDATE image_sessions SET ended_at=coalesce(ended_at,?) WHERE owner=? AND project=? AND id=?').run(Date.now(),owner,project,s.id);
                return imageJsonRow(session(owner,project,s.id));
            });
        },
        reserveImageJob(owner,project,body) {
            return transaction(()=>{
                load(owner,project);
                demand(exact(body,['sessionId','tab','payloadSha256','workflowSha256','review','settings','seedPolicy','deadlineMs']) && tabId(body.tab)
                    && hash(body.payloadSha256) && hash(body.workflowSha256) && typeof body.review==='string' && object(body.settings)
                    && ['fixed','random'].includes(body.seedPolicy) && Number.isSafeInteger(body.deadlineMs) && body.deadlineMs>=1000 && body.deadlineMs<=600000);
                bounded(body);
                const s=session(owner,project,body.sessionId);holder(s,body.tab);
                demand(unresolved(owner,project).length===0,'IN_FLIGHT',409);
                demand(s.used<s.allowance,'ALLOWANCE_EXHAUSTED',409);
                demand(s.workflow_sha256===body.workflowSha256,'WORKFLOW_CHANGED',409);
                demand(db.prepare('SELECT count(*) AS n FROM image_jobs WHERE owner=? AND project=?').get(owner,project).n<500,'LEDGER_FULL',409);
                const id=randomUUID(),now=Date.now();
                db.prepare("INSERT INTO image_jobs (id,session,owner,project,payload_sha256,workflow_sha256,review,settings,seed_policy,state,submitted_at,deadline_at) VALUES (?,?,?,?,?,?,?,?,?,'pending',?,?)")
                    .run(id,s.id,owner,project,body.payloadSha256,body.workflowSha256,body.review,JSON.stringify(body.settings),body.seedPolicy,now,now+body.deadlineMs);
                db.prepare('UPDATE image_sessions SET used=used+1 WHERE owner=? AND project=? AND id=?').run(owner,project,s.id);
                return imageJsonRow(job(owner,project,id));
            });
        },
        transitionImageJob(owner,project,id,body) {
            return transaction(()=>{
                load(owner,project);const j=job(owner,project,id);
                demand(optional(body,['tab','state'],['hostPath','resultSha256','assetId']) && tabId(body.tab) && typeof body.state==='string');
                bounded(body);
                demand(TRANSITIONS[j.state]?.includes(body.state),'INVALID_TRANSITION',409);
                if(['pending','cancelled','timeout-unknown'].includes(j.state))demand(session(owner,project,j.session).tab===body.tab,'LEASE_LOST',409);
                else if(j.state==='unknown')holder(open(owner,project),body.tab);
                if(Object.hasOwn(body,'hostPath'))demand(hostPathValid(body.hostPath),'INVALID_PATH');
                if(Object.hasOwn(body,'resultSha256'))demand(hash(body.resultSha256));
                demand(!Object.hasOwn(body,'assetId') || body.state==='imported','INVALID_TRANSITION',409);
                if(body.state==='imported') {demand(validId(body.assetId));asset(owner,project,body.assetId);}
                const settled=UNRESOLVED.includes(j.state) && !UNRESOLVED.includes(body.state)?Date.now():j.settled_at;
                db.prepare('UPDATE image_jobs SET state=?,settled_at=?,host_path=?,result_sha256=?,asset=? WHERE owner=? AND project=? AND id=?')
                    .run(body.state,settled,body.hostPath??j.host_path,body.resultSha256??j.result_sha256,body.assetId??j.asset,owner,project,id);
                return imageJsonRow(job(owner,project,id));
            });
        },
        imageHostDeleted(owner,project,id,body) {
            return transaction(()=>{
                load(owner,project);const j=job(owner,project,id);demand(exact(body,[]));
                demand(['discarded','imported','abandoned'].includes(j.state) && j.host_path!==null,'INVALID_TRANSITION',409);
                db.prepare('UPDATE image_jobs SET host_deleted_at=coalesce(host_deleted_at,?) WHERE owner=? AND project=? AND id=?').run(Date.now(),owner,project,id);
                return imageJsonRow(job(owner,project,id));
            });
        },
        imageJobs(owner,project,query={}) {
            load(owner,project);demand(optional(query,[],['limit']) && (query.limit===undefined || typeof query.limit==='string' && /^[1-9][0-9]*$/.test(query.limit) && Number.isSafeInteger(Number(query.limit))));
            return db.prepare('SELECT * FROM image_jobs WHERE owner=? AND project=? ORDER BY submitted_at DESC,rowid DESC LIMIT ?').all(owner,project,Math.min(Number(query.limit??500),500)).map(imageJsonRow);
        },
        imageCache(owner,project,query) {
            load(owner,project);demand(exact(query,['payload']) && hash(query.payload));
            return db.prepare("SELECT * FROM image_jobs WHERE owner=? AND project=? AND payload_sha256=? AND state='imported' AND asset IS NOT NULL ORDER BY submitted_at DESC,rowid DESC").all(owner,project,query.payload).map(imageJsonRow);
        },
        cleanupImageJobs(owner,project,body) {
            return transaction(()=>{
                load(owner,project);demand(exact(body,['jobIds']) && Array.isArray(body.jobIds) && body.jobIds.length>0 && body.jobIds.length<=500 && body.jobIds.every(validId) && new Set(body.jobIds).size===body.jobIds.length);
                const rows=body.jobIds.map(id=>job(owner,project,id));
                demand(rows.every(j=>TERMINAL.includes(j.state)),'UNRESOLVED_JOB',409);
                for(const j of rows)db.prepare('DELETE FROM image_jobs WHERE owner=? AND project=? AND id=?').run(owner,project,j.id);
                return {deletedIds:body.jobIds,deletedCount:rows.length};
            });
        },
    };
}
