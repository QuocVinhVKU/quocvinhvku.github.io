import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const fullSource=fs.readFileSync(new URL('../js/store.js',import.meta.url),'utf8')
  .replace(/^import .*;\r?\n/gm,'')
  .replace(/\bexport /g,'');
const start=fullSource.indexOf('async function updateSessionStatus');
const end=fullSource.indexOf('async function saveTeacherLeaveSessionPlan');
const source=fullSource.slice(start,end);

async function changeStatus({balance,oldStatus,newStatus}){
  const writes=[],ledger=[],audit=[];
  const context=vm.createContext({
    db:{},validSessionType:value=>value||'regular',
    validSessionStatus:(value,type)=>value||(type==='makeup'?'makeup_scheduled':'scheduled'),
    limitedText:value=>String(value||''),dirtyWeekPatch:()=>({dirty:true}),serverTimestamp:()=>0,
    increment:value=>({increment:value}),collection:(_db,...path)=>path.join('/'),
    doc:(...args)=>({path:args.filter(value=>typeof value==='string').join('/')}),
    runTransaction:async(_db,fn)=>fn({
      get:async ref=>({exists:()=>true,data:()=>ref.path==='students/student-1'?{makeupBalance:balance}:{type:'regular',status:oldStatus,note:''}}),
      update:(ref,data)=>writes.push({path:ref.path,data}),
      set:(_ref,data)=>(data.entityType==='session'?audit:ledger).push(data)
    })
  });
  vm.runInContext(source,context);
  const result=await vm.runInContext(`updateSessionStatus('week-1',{id:'session-1',studentId:'student-1'},'${newStatus}',{uid:'user-1'},'')`,context);
  return {result,writes,ledger,audit};
}

const absent=await changeStatus({balance:3,oldStatus:'scheduled',newStatus:'absent'});
assert.equal(absent.result.delta,1);
assert.equal(absent.result.balance,4);
assert.equal(absent.writes.find(item=>item.path==='students/student-1').data.makeupBalance.increment,1);
assert.equal(absent.ledger[0].type,'credit');
assert.equal(absent.ledger[0].quantity,1);
assert.equal(absent.audit[0].after.makeupBalance,4);

const undo=await changeStatus({balance:4,oldStatus:'absent',newStatus:'scheduled'});
assert.equal(undo.result.delta,-1);
assert.equal(undo.result.balance,3);
assert.equal(undo.ledger[0].type,'reversal');

const markedAttended=await changeStatus({balance:4,oldStatus:'absent',newStatus:'attended'});
assert.equal(markedAttended.result.delta,-1);
assert.equal(markedAttended.result.balance,3);
assert.equal(markedAttended.writes.find(item=>item.path==='students/student-1').data.makeupBalance.increment,-1);
assert.equal(markedAttended.ledger[0].type,'reversal');

const repeated=await changeStatus({balance:4,oldStatus:'absent',newStatus:'absent'});
assert.equal(repeated.result.changed,false);
assert.equal(repeated.result.delta,0);
assert.equal(repeated.result.balance,4);

console.log('PASS: regular absence adds one; changing absence to attended/scheduled subtracts one; repeated click is idempotent');
