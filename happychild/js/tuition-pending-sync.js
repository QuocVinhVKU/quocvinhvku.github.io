import {db} from './firebase.js?v=20260826-5';
import {doc,getDocFromServer} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js';
import {saveTuitionMonth,closeTuitionAccountBalance} from './tuition-store.js?v=20261105-preserve7';
import {listPending,removePending,updatePending,isQuotaExceeded} from './local-pending.js?v=20261001-1';
import {classifyTuitionPending} from './tuition-pending-decision.js?v=20261105-preserve7';

export async function syncPendingTuition(user){
  const entries=(await listPending(user.uid)).filter(item=>['tuition-month','tuition-balance'].includes(item.kind)),result={synced:0,pending:0,protected:0,conflicts:0,errors:[]};
  for(const entry of entries){
    if(entry.status==='protected'){result.protected++;continue;}
    if(entry.status==='conflict'){result.conflicts++;continue;}
    try{
      const snapshot=await getDocFromServer(doc(db,'tuitionAccounts',entry.accountId));
      if(!snapshot.exists()){await updatePending({...entry,status:'conflict',error:'Hồ sơ học phí đã bị xóa trên Firebase.'});result.conflicts++;continue;}
      const current=snapshot.data(),serverMonth=current.months?.[entry.month],decision=classifyTuitionPending(serverMonth,entry);
      if(decision==='already-synced'){await removePending(entry.id);result.synced++;continue;}
      if(decision==='protected'){await updatePending({...entry,status:'protected',protectedValue:serverMonth.statsOverrides.balance,error:'Giữ nguyên số dư đã nhập tay; không tự chốt đè.'});result.protected++;continue;}
      if(decision==='conflict'){await updatePending({...entry,status:'conflict',error:'Tháng này đã được sửa trên thiết bị khác. Cần đối chiếu trước khi ghi.'});result.conflicts++;continue;}
      if(entry.kind==='tuition-balance')await closeTuitionAccountBalance({id:entry.accountId,...current},entry.month,entry.values.value,entry.values.reason,user,{replace:entry.values.replace,onlyIfUnclosed:entry.values.onlyIfUnclosed});
      else await saveTuitionMonth({id:entry.accountId,...current},entry.month,entry.values,user);
      await removePending(entry.id);result.synced++;
    }catch(error){result.pending++;result.errors.push(error.message||String(error));if(isQuotaExceeded(error))break;}
  }
  result.pending+=(entries.length-result.synced-result.protected-result.conflicts-result.pending);
  return result;
}
