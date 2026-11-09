import {listPending,queueTuitionBalance,updatePending} from './local-pending.js?v=20261105-pending4';
import {protectedBalance} from './tuition-balance-policy.js';
export async function importLocalBalances(payload,user,accounts=[]){
 if(!user?.uid||!Array.isArray(payload?.rows)||payload.rows.length>1000)throw Error('Tệp bản lưu không hợp lệ.');
 const keys=new Set();
 for(const r of payload.rows){const key=`${r.accountId}/${r.month}`;if(keys.has(key)||!r.accountId||r.accountId.length>160||!/^2026-(09|10|11)$/.test(r.month)||!Number.isSafeInteger(r.value)||r.value<0||r.value>10000||!r.reason||r.reason.length>1000)throw Error('Dữ liệu số dư không hợp lệ/trùng.');keys.add(key);}
 const pending=await listPending(user.uid);let saved=0,kept=0;
 for(const r of payload.rows){
  const existing=pending.find(p=>p.kind==='tuition-balance'&&p.accountId===r.accountId&&p.month===r.month);
  if(existing&&!existing.values.onlyIfUnclosed){kept++;continue;}
  const protection=protectedBalance(accounts.find(a=>a.id===r.accountId)?.months?.[r.month])||(r.protected===true?{value:r.value,source:'manual'}:null);
  if(protection){
    const entry=existing||await queueTuitionBalance({uid:user.uid,accountId:r.accountId,month:r.month,value:protection.value,reason:r.reason,displayName:String(r.name||''),baseRevision:null,onlyIfUnclosed:true});
    await updatePending({...entry,status:'protected',protectedValue:protection.value,error:'Giữ nguyên số đã nhập tay/đã chốt.'});kept++;continue;
  }
  await queueTuitionBalance({uid:user.uid,accountId:r.accountId,month:r.month,value:r.value,reason:r.reason,displayName:String(r.name||'').slice(0,200),baseRevision:null,onlyIfUnclosed:true});saved++;
 }
 return {saved,kept};
}
// This file exists only on this computer and is excluded from git. It bridges
// local browser profiles without ever shipping historical pupil data online.
export async function restoreComputerLocalBalances(user,accounts=[],env=globalThis){
 if(!user?.uid||!['127.0.0.1','localhost','[::1]'].includes(env.location?.hostname))return {saved:0,kept:0};
 const response=await env.fetch('./.local/tuition-pending-balances.json',{cache:'no-store'});
 if(response.status===404)return {saved:0,kept:0};
 if(!response.ok)throw Error('Không đọc được bản đối chiếu trên máy này.');
 const text=await response.text();
 const hash=Array.from(new Uint8Array(await env.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const key=`happychild:computer-balances:${user.uid}:${hash}`;
 if(env.localStorage.getItem(key)==='done')return {saved:0,kept:0};
 const result=await importLocalBalances(JSON.parse(text),user,accounts);
 env.localStorage.setItem(key,'done');
 return result;
}
