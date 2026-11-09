import {db} from "./firebase.js?v=20260826-5";
import {collection,doc,onSnapshot,runTransaction,serverTimestamp,FieldPath,getDocsFromServer} from "./data-observer.js?v=20261107-sync2";
import {dateKey,monthDates,nextMonth,previousMonth,monthNow} from "./tuition-model.js?v=20261105-history1";

// Close only the actual current month. Never backfill a past month's balance
// from today's student records or treat an unlinked student as a zero balance.
export async function closeTuitionMonthBalances(month,accounts,user,{replace=false}={}) {
  if(!user?.uid)throw new Error('Vui lòng đăng nhập lại.');
  if(month!==monthNow())throw new Error('Chỉ chốt số dư hiện tại cho tháng hiện tại. Tháng cũ phải đối chiếu nguồn lịch sử.');
  const unique=[...new Map(accounts.map(a=>[a.id,a])).values()];
  if(!unique.length)throw new Error('Không có hồ sơ để chốt.');
  if(unique.length>150)throw new Error('Vượt giới hạn 150 phiếu cho một lần chốt.');
  return runTransaction(db,async tx=>{
    const refs=unique.map(a=>doc(db,'tuitionAccounts',a.id));
    const snaps=await Promise.all(refs.map(ref=>tx.get(ref)));
    const studentIds=[...new Set(snaps.filter(s=>s.exists()).map(s=>s.data().studentId).filter(Boolean))];
    const studentSnaps=await Promise.all(studentIds.map(id=>tx.get(doc(db,'students',id))));
    const students=new Map(studentSnaps.filter(s=>s.exists()).map(s=>[s.id,s.data()]));
    const capturedAt=new Date().toISOString(),writes=[],skipped=[];
    snaps.forEach((snap,i)=>{
      if(!snap.exists())throw new Error('Hồ sơ học phí đã bị xóa. Hãy tải lại.');
      const a=snap.data(),before=a.months?.[month]||{},expected=unique[i];
      if((before.revision||0)!==(expected.months?.[month]?.revision||0)||(a.studentId||'')!==(expected.studentId||''))throw new Error('Phiếu đã thay đổi trên thiết bị khác. Hãy tải lại trước khi chốt.');
      if(before.balanceClose&&!replace){skipped.push({id:snap.id,reason:'Đã chốt'});return;}
      if(Object.hasOwn(before.statsOverrides||{},'balance')){skipped.push({id:snap.id,reason:'Giữ nguyên số dư đã nhập tay'});return;}
      const student=students.get(a.studentId);
      if(!student){skipped.push({id:snap.id,reason:'Chưa liên kết học sinh hợp lệ'});return;}
      const value=student.makeupBalance;
      if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw new Error(`Số dư không hợp lệ: ${a.displayName||snap.id}. Chưa chốt phiếu nào.`);
      const balanceClose={value,capturedAt,studentId:a.studentId,closedBy:user.uid,source:'student_balance_at_close',version:(before.balanceClose?.version||0)+1};
      writes.push({ref:refs[i],id:snap.id,before:before.balanceClose||null,balanceClose,revision:(before.revision||0)+1});
    });
    for(const w of writes){
      tx.update(w.ref,new FieldPath('months',month,'balanceClose'),w.balanceClose,new FieldPath('months',month,'revision'),w.revision,'updatedAt',serverTimestamp(),'updatedBy',user.uid);
      audit(tx,`${w.id}/${month}`,user,w.before?'tuition_balance_reclosed':'tuition_balance_closed',{balanceClose:w.before},{balanceClose:w.balanceClose},`Chốt số dư cần bù tháng ${month} tại thời điểm lưu; không phải số dư hồi tố`);
    }
    return {saved:writes.length,skipped,capturedAt};
  });
}

export async function loadTuitionExport(month) {
  const names=['tuitionAccounts','students','scheduleTemplates','weeks','holidays'];
  const rows=await Promise.all(names.map(async name=>(await getDocsFromServer(collection(db,name))).docs.map(d=>({id:d.id,...d.data()}))));
  const [accounts,students,templates,weeks,holidays]=rows;
  const needed=weeks.filter(w=>dateKey(w.startDate)<=monthDates(month).at(-1));
  const groups=[];let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,needed.length)},async()=>{while(cursor<needed.length){const w=needed[cursor++];groups.push((await getDocsFromServer(collection(db,'weeks',w.id,'sessions'))).docs.map(d=>({id:d.id,...d.data(),weekId:w.id})));}}));
  return {accounts,students,templates,weeks,holidays,sessions:groups.flat()};
}

export const watchTuition = (next,error) => onSnapshot(collection(db,"tuitionAccounts"),{includeMetadataChanges:true},snap=>next(snap.docs.map(d=>({id:d.id,...d.data()})),snap.metadata.fromCache),error);
export async function closeTuitionAccountBalance(account,month,value,reason,user,{replace=false,onlyIfUnclosed=false}={}) {
  monthDates(month);
  if(!user?.uid)throw new Error('Vui lòng đăng nhập lại.');
  if(month>monthNow())throw new Error('Không chốt số dư cho tháng dự báo.');
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0||value>10000)throw new Error('Số dư phải là số nguyên từ 0 đến 10.000.');
  const note=String(reason||'').trim();
  if(!note||note.length>1000)throw new Error('Nhập nguồn đối chiếu/ghi chú chốt (tối đa 1.000 ký tự).');
  return runTransaction(db,async tx=>{
    const ref=doc(db,'tuitionAccounts',account.id),snap=await tx.get(ref);
    if(!snap.exists())throw new Error('Không tìm thấy hồ sơ học phí.');
    const current=snap.data(),before=current.months?.[month]||{};
    if(onlyIfUnclosed&&Object.hasOwn(before.statsOverrides||{},'balance'))throw new Error('Số dư đã được nhập tay. Không tự động ghi đè.');
    if((before.revision||0)!==(account.months?.[month]?.revision||0))throw new Error('Phiếu đã thay đổi trên thiết bị khác. Hãy mở lại trước khi chốt.');
    if(before.balanceClose&&!replace)throw new Error('Phiếu đã chốt. Cần xác nhận chốt lại.');
    const balanceClose={value,capturedAt:new Date().toISOString(),closedBy:user.uid,studentId:current.studentId||'',source:'manual_historical_reconciliation',reason:note,version:(before.balanceClose?.version||0)+1};
    tx.update(ref,new FieldPath('months',month,'balanceClose'),balanceClose,new FieldPath('months',month,'revision'),(before.revision||0)+1,'updatedAt',serverTimestamp(),'updatedBy',user.uid);
    audit(tx,`${account.id}/${month}`,user,before.balanceClose?'tuition_balance_reclosed':'tuition_balance_closed',{balanceClose:before.balanceClose||null},{balanceClose},note);
    return balanceClose;
  });
}
export const watchTuitionWeek = (id,next,error) => onSnapshot(collection(db,"weeks",id,"sessions"),{includeMetadataChanges:true},snap=>next(snap.docs.map(d=>({id:d.id,...d.data()})),snap.metadata.fromCache),error);
function audit(tx,id,user,action,before,after,reason) {
  tx.set(doc(collection(db,"auditLogs")),{entityType:"tuition",entityId:id,action,before,after,reason,userId:user.uid,createdAt:serverTimestamp()});
}
export async function createTuitionAccount(person,user) {
  const id=`student-${person.id}`;
  await runTransaction(db,async tx=>{
    const ref=doc(db,"tuitionAccounts",id),lock=doc(db,"tuitionStudentLinks",person.id);
    const [existing,linked,student]=await Promise.all([tx.get(ref),tx.get(lock),tx.get(doc(db,"students",person.id))]);
    if (existing.exists()||linked.exists()) throw new Error("Học sinh đã có hồ sơ học phí. Hãy chọn hồ sơ trong danh sách.");
    if (!student.exists()) throw new Error("Không tìm thấy học sinh.");
    tx.set(ref,{displayName:person.fullName,studentId:person.id,history:[],months:{},source:"manual",createdAt:serverTimestamp(),updatedAt:serverTimestamp(),createdBy:user.uid,updatedBy:user.uid});
    tx.set(lock,{accountId:id,updatedBy:user.uid,updatedAt:serverTimestamp()});
    audit(tx,id,user,"tuition_created",{},{studentId:person.id},"Tạo hồ sơ báo học phí");
  });
  return id;
}
export async function linkTuition(account,studentId,user) {
  if (!user?.uid||!studentId) throw new Error("Vui lòng chọn học sinh.");
  await runTransaction(db,async tx=>{
    const ref=doc(db,"tuitionAccounts",account.id),snap=await tx.get(ref);
    if (!snap.exists()) throw new Error("Không tìm thấy hồ sơ học phí.");
    const current=snap.data();
    if ((current.studentId||"")!==(account.studentId||"")) throw new Error("Liên kết đã thay đổi trên thiết bị khác. Hãy mở lại.");
    const student=await tx.get(doc(db,"students",studentId)),lock=doc(db,"tuitionStudentLinks",studentId),existing=await tx.get(lock);
    if (!student.exists()) throw new Error("Cần tạo thêm học sinh này trước khi liên kết.");
    if (existing.exists()&&existing.data().accountId!==account.id) throw new Error("Học sinh đã liên kết với một hồ sơ học phí khác.");
    tx.set(lock,{accountId:account.id,updatedBy:user.uid,updatedAt:serverTimestamp()});
    if (current.studentId&&current.studentId!==studentId) tx.delete(doc(db,"tuitionStudentLinks",current.studentId));
    tx.update(ref,{studentId,updatedBy:user.uid,updatedAt:serverTimestamp()});
    audit(tx,account.id,user,"tuition_linked",{studentId:current.studentId||""},{studentId},"Liên kết hồ sơ báo học phí với học sinh");
  });
}
export async function saveTuitionMonth(account,month,values,user) {
  if (!user?.uid||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Tháng hoặc tài khoản không hợp lệ.");
  const unitFee=values.unitFee==null||values.unitFee===""?null:Number(values.unitFee),adjustment=Number(values.adjustment||0),note=String(values.note||"").trim();
  const statsOverrides={},allowedNumbers=['previousRegistered','balance','madeUp','absent','actual'];
  for(const key of allowedNumbers)if(values.statsOverrides?.[key]!==undefined){const number=Number(values.statsOverrides[key]);if(!Number.isSafeInteger(number)||number<0||number>10000)throw new Error("Số liệu báo cáo không hợp lệ.");statsOverrides[key]=number;}
  for(const key of ['madeUpDates','absentDates'])if(Array.isArray(values.statsOverrides?.[key])){const dates=[...new Set(values.statsOverrides[key].map(String))].sort();if(dates.some(date=>!/^\d{4}-\d{2}-\d{2}$/.test(date)||date.slice(0,7)!==previousMonth(month)))throw new Error("Ngày nghỉ hoặc học bù không thuộc tháng báo cáo.");statsOverrides[key]=dates;}
  if (unitFee!==null&&(!Number.isSafeInteger(unitFee)||unitFee<0||unitFee>100000000)) throw new Error("Học phí một buổi phải là số nguyên từ 0 đến 100 triệu đồng.");
  if (!Number.isSafeInteger(adjustment)||Math.abs(adjustment)>1000000000||note.length>5000) throw new Error("Số tiền điều chỉnh hoặc ghi chú không hợp lệ.");
  await runTransaction(db,async tx=>{
    const ref=doc(db,"tuitionAccounts",account.id),snap=await tx.get(ref);
    if (!snap.exists()) throw new Error("Không tìm thấy hồ sơ học phí.");
    const current=snap.data(),before=current.months?.[month]||{};
    if ((before.revision||0)!==(account.months?.[month]?.revision||0)||(current.studentId||"")!==(account.studentId||"")) throw new Error("Dữ liệu đã được sửa trên thiết bị khác. Đóng biểu mẫu và mở lại để tránh ghi đè.");
    const shouldSyncBalance=values.syncMakeupBalance===true&&Object.hasOwn(statsOverrides,'balance')&&!!current.studentId,studentRef=shouldSyncBalance?doc(db,'students',current.studentId):null,studentSnap=studentRef?await tx.get(studentRef):null;
    if(shouldSyncBalance&&!studentSnap.exists())throw new Error('Không tìm thấy hồ sơ học sinh để cập nhật số buổi cần bù.');
    // Older clients omitted balance when editing historical fees. Never erase
    // an archived balance merely because this field was absent from a form.
    if(!Object.hasOwn(statsOverrides,'balance')&&Object.hasOwn(before.statsOverrides||{},'balance'))statsOverrides.balance=before.statsOverrides.balance;
    const snapshot=values.snapshot?{...values.snapshot}:before.snapshot?{...before.snapshot}:null;
    if(snapshot&&snapshot.balance==null&&before.snapshot?.balance!=null)snapshot.balance=before.snapshot.balance;
    const after={unitFee,adjustment,note,statsOverrides,revision:(before.revision||0)+1,...(snapshot?{snapshot}:{}),...(before.balanceClose?{balanceClose:before.balanceClose}:{}),...(before.balanceRecovery?{balanceRecovery:before.balanceRecovery}:{})};
    // Patch only this month; never overwrite another month's fees or import history.
    tx.update(ref,new FieldPath("months",month),after,"updatedAt",serverTimestamp(),"updatedBy",user.uid);
    if(studentRef){const oldBalance=Math.max(0,Number(studentSnap.data().makeupBalance)||0),newBalance=statsOverrides.balance;tx.update(studentRef,{makeupBalance:newBalance,makeupBalanceSource:`tuition:${account.id}:${month}`,updatedAt:serverTimestamp(),updatedBy:user.uid});tx.set(doc(collection(db,'auditLogs')),{entityType:'student',entityId:current.studentId,action:'makeup_balance_adjusted_from_tuition',before:{makeupBalance:oldBalance},after:{makeupBalance:newBalance},reason:`Sửa số buổi cần bù trong phiếu học phí tháng ${month}`,userId:user.uid,createdAt:serverTimestamp()});}
    audit(tx,`${account.id}/${month}`,user,"tuition_updated",before,after,`Cập nhật phiếu báo học phí tháng ${month}`);
  });
}
