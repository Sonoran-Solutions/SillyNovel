#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { createBackup, inspectBackup, restoreBackup, migrateBackup } from '../recovery.mjs';

// A separate process enforces elapsed time even during synchronous SQLite/PNG work.
if(!process.env.SN_RECOVERY_CHILD) {
    const child=spawn(process.execPath,process.argv.slice(1),{stdio:'inherit',env:{...process.env,SN_RECOVERY_CHILD:'1'}});
    const timer=setTimeout(()=>{child.kill('SIGKILL');console.error(JSON.stringify({code:'RECOVERY_TIMEOUT'}));},120000);
    child.once('error',()=>{clearTimeout(timer);process.exitCode=1;});
    child.once('exit',code=>{clearTimeout(timer);process.exitCode=code??1;});
    for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>child.kill(signal));
} else try {
    const {values,positionals}=parseArgs({allowPositionals:true,options:{'data-root':{type:'string'}}});
    const [command,source,destination]=positionals;
    if(!['backup','inspect','restore','migrate'].includes(command) || !source || positionals.length!==(command==='inspect'?2:3) || values['data-root'] && command!=='inspect')
        throw Object.assign(Error(),{code:'USAGE: backup SOURCE_DB NEW_BACKUP_DIR | inspect BACKUP_DIR [--data-root TARGET_DATA_ROOT] | restore BACKUP_DIR TARGET_DATA_ROOT/.sillynovel-projects.sqlite | migrate V1_BACKUP_DIR NEW_TARGET_DATA_ROOT/.sillynovel-projects.sqlite'});
    const result=command==='backup'?await createBackup(source,destination):command==='inspect'?inspectBackup(source,values['data-root']):command==='migrate'?migrateBackup(source,destination):restoreBackup(source,destination);
    console.log(JSON.stringify(result));
} catch(error) {
    console.error(JSON.stringify({code:error.code?.startsWith('ERR_')?'RECOVERY_FAILED':error.code||'RECOVERY_FAILED'}));process.exitCode=1;
}
