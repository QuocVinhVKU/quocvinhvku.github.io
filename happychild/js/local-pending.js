const DB_NAME='happychild-pending-v1',STORE='operations';
export const isQuotaExceeded=error=>/resource-exhausted|quota[- ]?exceeded|quota exceeded/i.test(`${error?.code||''} ${error?.message||error||''}`);

function database(){
  return new Promise((resolve,reject)=>{
    if(!globalThis.indexedDB)return reject(new Error('Trình duyệt không cho phép lưu dữ liệu cục bộ.'));
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Không mở được bộ nhớ cục bộ.'));
  });
}
async function operation(mode,value){
  const db=await database();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE),request=typeof value==='string'?store.delete(value):mode==='readonly'?store.getAll():store.put(value);
    let result;request.onsuccess=()=>{result=request.result;};request.onerror=()=>reject(request.error);
    tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||new Error('Không ghi được bộ nhớ cục bộ.'));tx.onabort=()=>reject(tx.error||new Error('Lưu tạm bị hủy.'));
  });}finally{db.close();}
}
export async function listPending(uid){return (await operation('readonly')||[]).filter(item=>item.uid===uid).sort((a,b)=>a.savedAt.localeCompare(b.savedAt));}
export async function removePending(id){await operation('readwrite',id);}
export async function updatePending(item){await operation('readwrite',item);}
export async function queueTuitionMonth({uid,accountId,month,baseRevision,values}){
  if(!uid||!accountId||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Không thể lưu tạm hồ sơ học phí không hợp lệ.');
  const id=`tuition:${uid}:${accountId}:${month}`,existing=(await listPending(uid)).find(item=>item.id===id);
  const item={id,kind:'tuition-month',uid,accountId,month,baseRevision:existing?.baseRevision??baseRevision,values,savedAt:new Date().toISOString(),status:'pending'};
  await operation('readwrite',item);return item;
}
export async function queueFormDraft({uid,title,fields}){
  if(!uid||!title)throw new Error('Không thể lưu bản nháp không có tài khoản hoặc tên biểu mẫu.');
  const item={id:`draft:${uid}:${crypto.randomUUID()}`,kind:'form-draft',uid,title,fields,savedAt:new Date().toISOString(),status:'manual'};
  await operation('readwrite',item);return item;
}
