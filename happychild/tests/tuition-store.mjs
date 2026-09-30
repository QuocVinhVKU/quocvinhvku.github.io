// Run with node --experimental-vm-modules; no Firebase writes or credentials.
import vm from 'node:vm';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as model from '../js/tuition-model.js';
const original={displayName:'An',studentId:'s',history:[{month:'2026-08',values:[1,2]}],months:{'2026-09':{unitFee:300000,adjustment:0,note:'',revision:2},'2026-10':{unitFee:290000,revision:1}}};
let database=new Map([['tuitionAccounts/a',structuredClone(original)],['students/s',{}],['students/b',{}],['tuitionStudentLinks/s',{accountId:'a'}]]),writes=[];
class FieldPath {constructor(...parts){this.parts=parts;}}
const context=vm.createContext({console});
const api={getDocsFromServer:async()=>({docs:[]}),collection:(_db,...p)=>p.join('/'),doc:(base,...parts)=>parts.length?parts.join('/'):base+'/audit',serverTimestamp:()=>"SERVER_TIME",FieldPath,onSnapshot:()=>()=>{},runTransaction:async(_db,fn)=>{
 const pending=[];
 const tx={get:async ref=>({exists:()=>database.has(ref),data:()=>structuredClone(database.get(ref))}),set:(ref,v)=>pending.push(['set',ref,v]),delete:ref=>pending.push(['delete',ref]),update:(ref,...args)=>pending.push(['update',ref,args])};
 await fn(tx);
 for(const [op,ref,value]of pending){if(op==='set')database.set(ref,value);else if(op==='delete')database.delete(ref);else {const target=database.get(ref);if(value.length===1)Object.assign(target,value[0]);else for(let i=0;i<value.length;i+=2){const key=value[i];if(key instanceof FieldPath)target[key.parts[0]][key.parts[1]]=value[i+1];else target[key]=value[i+1];}}}
 writes.push(...pending);
}};
const sdk=new vm.SyntheticModule(Object.keys(api),function(){for(const[k,v]of Object.entries(api))this.setExport(k,v);},{context});
const firebase=new vm.SyntheticModule(['db'],function(){this.setExport('db',{});},{context});
const modelModule=new vm.SyntheticModule(Object.keys(model),function(){for(const[k,v]of Object.entries(model))this.setExport(k,v);},{context});
const module=new vm.SourceTextModule(await fs.readFile(new URL('../js/tuition-store.js',import.meta.url),'utf8'),{context});
await module.link(specifier=>specifier.startsWith('./firebase')?firebase:specifier.startsWith('./tuition-model')?modelModule:sdk);await module.evaluate();
const {saveTuitionMonth,linkTuition,createTuitionAccount}=module.namespace,user={uid:'test'};
const account={id:'a',...structuredClone(original)};
await saveTuitionMonth(account,'2026-09',{unitFee:310000,adjustment:100000,note:'giảm trừ'},user);
assert.equal(database.get('tuitionAccounts/a').months['2026-09'].revision,3);
assert.equal(database.get('tuitionAccounts/a').months['2026-10'].unitFee,290000);
assert.deepEqual(database.get('tuitionAccounts/a').history,original.history);
await assert.rejects(()=>saveTuitionMonth(account,'2026-09',{unitFee:10},user),/thiết bị khác/);
await assert.rejects(()=>saveTuitionMonth(account,'2026-10',{unitFee:-1},user),/Học phí/);
await linkTuition(account,'b',user);
assert.equal(database.get('tuitionAccounts/a').studentId,'b');assert.equal(database.has('tuitionStudentLinks/s'),false);
assert.equal(database.get('tuitionStudentLinks/b').accountId,'a');
await assert.rejects(()=>saveTuitionMonth(account,'2026-10',{unitFee:10},user),/thiết bị khác/);
await assert.rejects(()=>linkTuition(account,'s',user),/Liên kết đã thay đổi/);
await assert.rejects(()=>createTuitionAccount({id:'b',fullName:'Bình'},user),/đã có hồ sơ/);
assert.ok(writes.some(w=>w[0]==='set'&&w[1].startsWith('auditLogs/')));
await saveTuitionMonth({id:'a',...structuredClone(database.get('tuitionAccounts/a'))},'2026-11',{unitFee:null},user);
assert.equal(database.get('tuitionAccounts/a').months['2026-11'].unitFee,null,'Missing price must not become a free session');
console.log('Tuition storage: isolated-month patch, immutable history, revision conflicts, link conflicts, duplicate protection, audit passed.');
