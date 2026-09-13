import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../js/store.js',import.meta.url),'utf8');
const context=vm.createContext({
  db:{}, collection:()=>({}), doc:()=>({}),
  getDocs:async()=>({docs:[]}),
  runTransaction:async(_db,fn)=>fn({
    get:async()=>({exists:()=>true,data:()=>({teacherLeaveAction:'replacement',teacherId:'substitute'})}),
    update:()=>{throw new Error('Automatic write must be blocked');},
  }),
  canonicalRosterKey:value=>value,
});
vm.runInContext(source.replace(/^import .*;\r?\n/gm,'').replace(/\bexport /g,''),context);
const result=await vm.runInContext(`saveTeacherLeaveSessionPlan('week',{id:'session',studentId:'child'}, {id:'leave',teacherId:'mai'},'student_off','',{uid:'user'},true)`,context);
assert.equal(result,false);
assert.ok(source.includes('if(leavePlan)continue;'));
assert.ok(source.includes('if(!data.teacherLeaveAction&&sourceId'));
const statusBody=source.split('export async function updateSessionStatus')[1].split('export async function saveTeacherLeaveSessionPlan')[0];
assert.ok(!statusBody.includes('leaveId'));
console.log('PASS: automatic defaults blocked; template updates/deletions protected; status scope valid');
