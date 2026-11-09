import {auth,db} from './firebase.js?v=20260826-5';
import {Timestamp} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js';
import {listPending,updatePending,removePending,isQuotaExceeded} from './local-pending.js?v=20261107-sync2';
import {encodeData,decodeData,canonicalData,replayDecision} from './data-codec.js';
import {setDataContext,checkDataPreconditions} from './data-observer.js?v=20261107-sync2';
import {mayRecheckConflict} from './data-conflict-policy.js?v=20261107-sync2';
export const dataRetryable=e=>isQuotaExceeded(e)||/unavailable|offline|deadline-exceeded|network-request-failed|client is offline|Firebase không phản hồi/i.test(`${e?.code||''} ${e?.message||''}`);
let serial=Promise.resolve(),syncing=false;
const emit=()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event('happychild-pending-changed'));};
const exclusive=fn=>{const result=serial.then(fn,fn);serial=result.catch(()=>{});return result;};
function queuedError(entry){const e=new Error(entry.status==='pending'?'Đã lưu yêu cầu trên thiết bị. Chưa cập nhật Firebase/lịch; sẽ thử lại lần sau.':'Đã giữ yêu cầu trên thiết bị để đối chiếu; không tự chạy lại vì có thể đã ghi một phần hoặc thiếu dữ liệu gốc.');e.code='local/queued';e.operationId=entry.id;return e;}
async function digest(text){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(n=>n.toString(16).padStart(2,'0')).join('');}
async function execute(entry,fn,args){
 const ctx={uid:entry.uid,reads:new Map(),queries:[],committed:0,attempted:0,unknown:false,ambiguous:false};
 const running={...entry,status:'running',startedAt:new Date().toISOString()};await updatePending(running);setDataContext(ctx);
 try{
  if(auth.currentUser?.uid!==entry.uid)throw Error('Tài khoản đã thay đổi.');
  const result=await fn(...args);
  // A crash between server success and removal leaves 'running', which is
  // deliberately NOT replayed automatically after restart.
  await removePending(entry.id);emit();return result;
 }catch(error){
  if(dataRetryable(error)||ctx.committed>0||ctx.ambiguous){
   const queued={...entry,reads:[...ctx.reads.values()],queries:ctx.queries,committed:ctx.committed,attempted:ctx.attempted,unknown:ctx.unknown,ambiguous:ctx.ambiguous,lastAttemptAt:new Date().toISOString(),error:error.message};
   queued.status=replayDecision(queued);await updatePending(queued);emit();throw queuedError(queued);
  }
  await removePending(entry.id);throw error;
 }finally{setDataContext(null);}
}
export function durableDataAction(domain,name,args,fn){return exclusive(async()=>{
 const uid=auth.currentUser?.uid;if(!uid)throw Error('Vui lòng đăng nhập để lưu dữ liệu.');
 const encoded=encodeData(args,uid),id=`data:${uid}:${await digest(canonicalData({domain,name,args:encoded}))}`;
 const existing=(await listPending(uid)).find(e=>e.id===id);
 if(existing)throw queuedError(existing);
 const entry={id,kind:'data-action',uid,domain,name,args:encoded,title:`${ACTION_LABELS[name]||name}`,fields:encoded,savedAt:new Date().toISOString(),status:'running'};
 return execute(entry,fn,args);
});}
const ACTION_LABELS={updateSessionStatus:'Học/nghỉ của học sinh',saveTeacherLeave:'Nghỉ phép giáo viên',deleteTeacherLeave:'Xóa nghỉ phép giáo viên',saveTeacherLeaveSessionPlan:'Đổi cô / phương án dạy thay',addMakeupSession:'Xếp học bù',reassignMakeupSessionTeacher:'Đổi cô học bù',assignUnassignedSessionTeacher:'Gán giáo viên',saveSession:'Thêm/sửa lịch học',saveTestSession:'Thêm lịch test',deleteSession:'Hủy/xóa buổi học',createWeek:'Tạo tuần mới',deleteWeek:'Xóa tuần',saveStudent:'Thêm/sửa học sinh',deactivateStudent:'Ngừng học',setStudentMakeupBalance:'Điều chỉnh số dư học bù',saveTeacher:'Thêm/sửa giáo viên',saveTemplate:'Sửa lịch mẫu',removeRecord:'Xóa bản ghi',saveNote:'Thêm/sửa ghi chú',saveStudentForm:'Mục tiêu học',deleteStudentForm:'Xóa mục tiêu',saveHoliday:'Ngày lễ',deleteHoliday:'Xóa ngày lễ',markHolidayRange:'Áp dụng nghỉ lễ',saveAttendanceReportCloud:'Nhập chấm công',finalizeWeekSummary:'Chốt thống kê tuần',deleteStudent:'Xóa học sinh',deleteTeacher:'Xóa giáo viên',deleteMakeupTransaction:'Xóa giao dịch học bù',linkTuition:'Liên kết học sinh với học phí',createTuitionAccount:'Thêm hồ sơ học phí'};
export async function syncDataOutbox(user){
 if(!user?.uid||auth.currentUser?.uid!==user.uid||syncing)return {synced:0,pending:0,review:0};
 syncing=true;
 try{return await exclusive(async()=>{
  const entries=(await listPending(user.uid)).filter(e=>e.kind==='data-action'),result={synced:0,pending:0,review:0};
  for(const entry of entries){
   if(auth.currentUser?.uid!==user.uid)break;
   if(entry.status!=='pending'&&!mayRecheckConflict(entry)){if(entry.status==='running')await updatePending({...entry,status:'review',error:'Lần lưu trước bị gián đoạn; cần kiểm tra server trước khi chạy lại.'});result.review++;break;}
   try{
    const conflict=await checkDataPreconditions(entry,db,user);
    if(conflict){await updatePending({...entry,status:'conflict',error:conflict,lastAttemptAt:new Date().toISOString()});result.review++;break;}
    if(!['store','tuition'].includes(entry.domain))throw Error('Nguồn thao tác không hợp lệ.');
    const module=entry.domain==='tuition'?await import('./tuition-store.js?v=20261107-sync2'):await import('./store.js?v=20261107-sync2');
    if(!ACTION_LABELS[entry.name]||typeof module[entry.name]!=='function')throw Error('Thao tác chưa được hỗ trợ để đồng bộ an toàn.');
    await execute(entry,module[entry.name],decodeData(entry.args,user,Timestamp));result.synced++;
   }catch(e){result.pending++;if(e.code!=='local/queued')await updatePending({...entry,status:dataRetryable(e)?entry.status:'review',error:dataRetryable(e)?`Chưa thể đối chiếu/gửi lại: ${e.message}`:e.message,lastAttemptAt:new Date().toISOString()});break;}
  }
  emit();return result;
 });}finally{syncing=false;}
}
