import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../js/store.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport /g,'');
async function check(balance,oldStatus,oldPlan,plan,expectedDelta){
  const writes=[],logs=[];
  const context=vm.createContext({db:{},canonicalRosterKey:x=>x,
    collection:(_db,...path)=>path.join('/'),doc:(...args)=>({path:args.filter(x=>typeof x==='string').join('/')}),
    getDocs:async()=>({docs:[]}),serverTimestamp:()=>0,increment:x=>({increment:x}),
    runTransaction:async(_db,fn)=>fn({get:async ref=>({exists:()=>true,data:()=>ref.path==='students/child'?{makeupBalance:balance}:{type:'regular',status:oldStatus,teacherLeaveAction:oldPlan,teacherId:'',teacherLeaveOriginalStatus:'scheduled'}}),update:(ref,data)=>writes.push({ref,data}),set:(_ref,data)=>logs.push(data)})});
  vm.runInContext(source,context);
  await vm.runInContext(`saveTeacherLeaveSessionPlan('week',{id:'session',studentId:'child'},{id:'leave',teacherId:'mai'},'${plan}','',{uid:'user'})`,context);
  const studentWrite=writes.find(x=>x.ref.path==='students/child');
  assert.equal(studentWrite?.data.makeupBalance.increment||0,expectedDelta);
  assert.equal(logs[0].after.makeupBalance,balance+expectedDelta);
  assert.equal(writes.find(x=>x.ref.path==='weeks/week/sessions/session').data.status,plan==='pending'?'scheduled':'absent');
}
await check(0,'absent','student_off','pending',0);
await check(3,'absent','student_off','pending',-1);
await check(0,'scheduled','pending','pending',0);
await check(2,'absent','student_off','student_off',0);
await check(0,'scheduled','pending','student_off',1);
console.log('PASS: zero balance reversal, normal reversal, repeated saves, and new absence credit');
