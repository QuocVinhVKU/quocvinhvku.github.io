import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {addDays,isoDate,weekLabel,overlap,floorScheduleTime} from '../js/utils.js';
const source=fs.readFileSync(new URL('../js/store.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport /g,'');
const templates=[
  {id:'morning',studentId:'a',teacherId:'quynh',dayOfWeek:0,startTime:'08:00',endTime:'09:00',active:true,note:'Ghi chú gốc'},
  {id:'evening',studentId:'b',teacherId:'quynh',dayOfWeek:0,startTime:'16:00',endTime:'17:00',active:true},
  {id:'next-day',studentId:'c',teacherId:'quynh',dayOfWeek:1,startTime:'08:00',endTime:'09:00',active:true},
  {id:'other-teacher',studentId:'d',teacherId:'ngoc',dayOfWeek:0,startTime:'08:00',endTime:'09:00',active:true},
];
async function create(leaves,{failRead=false,existing=false}={}){
  const writes=[];let committed=false;
  const ctx=vm.createContext({
    db:{},addDays,isoDate,weekLabel,overlap,floorScheduleTime,canonicalRosterKey:x=>x,
    Timestamp:{fromDate:d=>({toDate:()=>d})},serverTimestamp:()=>0,setTimeout:()=>0,
    collection:(_db,...path)=>path.join('/'),doc:(_db,...path)=>({path:path.join('/'),id:path.at(-1)}),
    getDoc:async()=>({exists:()=>existing}),
    getDocs:async path=>{assert.equal(path,'teacherLeaves');if(failRead)throw Error('Quota exceeded');return {docs:leaves.map((leave,i)=>({id:'leave-'+i,data:()=>leave}))};},
    writeBatch:()=>({set:(ref,data)=>writes.push({ref,data}),commit:async()=>{committed=true;}}),
  });
  vm.runInContext(source,ctx);
  ctx.templates=templates;ctx.user={uid:'tester'};
  const promise=vm.runInContext("createWeek({weekNumber:7,startDate:'2026-10-12'},templates,[],user)",ctx);
  if(failRead||existing)await assert.rejects(promise);
  else assert.equal(await promise,'week-2026-10-12');
  return {writes,committed};
}
const leave={teacherId:'quynh',startDate:'2026-10-12',endDate:'2026-10-12',leaveType:'full_day'};
let result=await create([leave]);
const sessions=result.writes.filter(w=>w.ref.path.includes('/sessions/')).map(w=>w.data);
assert.equal(result.committed,true);
for(const s of sessions.filter(s=>s.dateKey==='2026-10-12'&&s.substituteForTeacherId==='quynh')){
  assert.equal(s.teacherId,'');assert.equal(s.teacherLeaveAction,'pending');assert.equal(s.status,'scheduled');assert.equal(s.teacherLeaveId,'leave-0');
}
assert.equal(sessions.find(s=>s.studentId==='a').teacherLeaveOriginalNote,'Ghi chú gốc');
assert.equal(sessions.find(s=>s.studentId==='c').teacherId,'quynh');
assert.equal(sessions.find(s=>s.studentId==='d').teacherId,'ngoc');
assert.equal(templates[0].teacherId,'quynh');
result=await create([{...leave,leaveType:'session',startTime:'08:00',endTime:'09:00'}]);
const hourly=result.writes.filter(w=>w.ref.path.includes('/sessions/')).map(w=>w.data);
assert.equal(hourly.find(s=>s.studentId==='a').teacherId,'');
assert.equal(hourly.find(s=>s.studentId==='b').teacherId,'quynh');
result=await create([{...leave,endDate:'2026-10-13'}]);
assert.equal(result.writes.find(w=>w.data.studentId==='c').data.teacherId,'');
result=await create([{...leave,startDate:'2026-10-01',endDate:'2026-10-02'}]);
assert.equal(result.writes.find(w=>w.data.studentId==='a').data.teacherId,'quynh');
for(const opts of [{failRead:true},{existing:true}]){
  result=await create([leave],opts);assert.equal(result.committed,false);assert.equal(result.writes.length,0);
}
console.log('PASS: saved full-day/hourly/range leave applied atomically; templates unchanged; read failures cannot create invalid weeks');
