import fs from 'node:fs';
import {reconcileBalances} from '../happychild/js/tuition-reconcile.js';
import {protectedBalance} from '../happychild/js/tuition-balance-policy.js';
const input=JSON.parse(fs.readFileSync('C:/Users/kurob/Downloads/happychild-audit-complete.json','utf8'));
const path='D:/2DUnityGame/.codex/happychild-pending-balances.json';
const before=JSON.parse(fs.readFileSync(path,'utf8'));
const rows=new Map(before.rows.map(r=>[`${r.accountId}/${r.month}`,r]));
const changes=[],protectedRows=[];
const set=(a,r)=>{const key=`${a.id}/${r.month}`,old=rows.get(key);if(old?.value!==r.value||!!old?.protected!==!!r.protected)changes.push({name:a.displayName,month:r.month,before:old?.value??null,after:r.value,protected:!!r.protected});rows.set(key,{accountId:a.id,name:a.displayName,...r});};
for(const a of input.accounts){
 const person=input.students.find(p=>p.id===a.studentId);
 for(const month of ['2026-09','2026-10','2026-11']){const p=protectedBalance(a.months?.[month]);if(p){set(a,{month,value:p.value,protected:true,reason:`Giữ nguyên số ${p.source==='manual'?'nhập tay':'đã chốt'} theo yêu cầu 05/11/2026, không tự ghi đè.`,baseRevision:a.months[month].revision||0});protectedRows.push({name:a.displayName,month,value:p.value,source:p.source});}}
 const calculated=reconcileBalances(a,person,input.sessions,input.holidays,new Date(input.capturedAt));
 for(const r of calculated.rows)set(a,{month:r.month,value:r.value,reason:`${r.opening}+${r.absent}-${r.madeUp}=${r.value}; tồn từ ${r.openingSource}; nghỉ: ${r.absentSource}; bù: ${r.madeUpSource}. Chỉ điền ô chưa nhập tay/chưa chốt.`});
 const existingOct=rows.get(`${a.id}/2026-10`);
 if(existingOct&&!protectedBalance(a.months?.['2026-10'])&&existingOct.reason.includes('bản sao phiếu T10')){
  const anchor={...a,months:{...a.months,'2026-10':{...a.months?.['2026-10'],balanceClose:{value:existingOct.value}}}};
  for(const r of reconcileBalances(anchor,person,input.sessions,input.holidays,new Date(input.capturedAt)).rows.filter(r=>r.month==='2026-11'))set(a,{month:r.month,value:r.value,reason:`Tồn T10 từ bản sao: ${r.opening}; + nghỉ ${r.absent} - bù ${r.madeUp} = ${r.value}. Giữ nguyên mọi ô nhập tay/chốt.`});
 }
}
const payload={source:'manual-preservation-2026-11-05',rows:[...rows.values()]};
fs.writeFileSync(path,JSON.stringify(payload,null,2));
fs.writeFileSync('D:/2DUnityGame/.codex/happychild-preserve-manual-result.json',JSON.stringify({protectedRows,changes,total:payload.rows.length},null,2));
console.log(JSON.stringify({total:payload.rows.length,protected:protectedRows.length,changes},null,2));
