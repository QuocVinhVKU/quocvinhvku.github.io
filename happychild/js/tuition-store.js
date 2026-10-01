import {db} from "./firebase.js?v=20260826-5";
import {collection,doc,onSnapshot,runTransaction,serverTimestamp,FieldPath,getDocsFromServer} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import {dateKey,monthDates,nextMonth,previousMonth} from "./tuition-model.js?v=20260930-3";

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
    const after={unitFee,adjustment,note,statsOverrides,revision:(before.revision||0)+1,...(values.snapshot?{snapshot:values.snapshot}:before.snapshot?{snapshot:before.snapshot}:{})};
    // Patch only this month; never overwrite another month's fees or import history.
    tx.update(ref,new FieldPath("months",month),after,"updatedAt",serverTimestamp(),"updatedBy",user.uid);
    if(studentRef){const oldBalance=Math.max(0,Number(studentSnap.data().makeupBalance)||0),newBalance=statsOverrides.balance;tx.update(studentRef,{makeupBalance:newBalance,makeupBalanceSource:`tuition:${account.id}:${month}`,updatedAt:serverTimestamp(),updatedBy:user.uid});tx.set(doc(collection(db,'auditLogs')),{entityType:'student',entityId:current.studentId,action:'makeup_balance_adjusted_from_tuition',before:{makeupBalance:oldBalance},after:{makeupBalance:newBalance},reason:`Sửa số buổi cần bù trong phiếu học phí tháng ${month}`,userId:user.uid,createdAt:serverTimestamp()});}
    audit(tx,`${account.id}/${month}`,user,"tuition_updated",before,after,`Cập nhật phiếu báo học phí tháng ${month}`);
  });
}
