import assert from 'node:assert/strict';
import {tuitionDisplayBalance} from '../js/tuition-model.js';
const a={id:'dinh-bao',months:{}};
const p=(id,month,value)=>({kind:'tuition-balance',accountId:id,month,values:{value,onlyIfUnclosed:true},status:'pending'});
const pending=[p('dinh-bao','2026-09',2),p('dinh-bao','2026-10',5),p('dinh-bao','2026-11',5),p('zero','2026-10',0)];
for(const [month,value]of [['2026-09',2],['2026-10',5],['2026-11',5]]){const state=tuitionDisplayBalance(a,month,99,pending,'2026-11');assert.equal(state.balance,value);assert.equal(state.balanceLabel,String(value));assert.equal(state.balancePending,true);}
assert.equal(tuitionDisplayBalance({id:'zero'},'2026-10',99,pending,'2026-11').balanceLabel,'0');
assert.equal(tuitionDisplayBalance({id:'other'},'2026-10',99,pending,'2026-11').balance,null,'No cross-student or live-balance leakage');
const closed={...a,months:{'2026-10':{balanceClose:{value:7,capturedAt:'2026-10-31'}}}};
assert.equal(tuitionDisplayBalance(closed,'2026-10',99,pending,'2026-11').balance,7,'Never replace an already closed server balance with an unclosed import');
console.log('PASS all-month local balance display, zero, student isolation, closed balance protection');
const manual={...a,months:{'2026-10':{statsOverrides:{balance:0}}}};
assert.equal(tuitionDisplayBalance(manual,'2026-10',99,pending,'2026-11').balanceLabel,'0','Manual zero wins over imported automatic value');
assert.equal(tuitionDisplayBalance(manual,'2026-10',99,pending,'2026-11').balanceStatus,'manual');
