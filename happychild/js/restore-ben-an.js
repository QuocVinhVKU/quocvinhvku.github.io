import {auth,db} from './firebase.js?v=20260826-5';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js';
import {doc,collection,query,where,getDocFromServer,getDocsFromServer,runTransaction,Timestamp,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js';
import {BEN_AN_ID,BEN_AN_FROM,planBenAnRestore} from './restore-ben-an-plan.js?v=20261110-1';
import {encodeData,canonicalData} from './data-codec.js';
const $=id=>document.getElementById(id);
let preview=null,busy=false;
const dateKey=value=>{if(!value?.toDate)throw Error('Ngày tuần không hợp lệ.');const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value.toDate());const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;};
const rows=snap=>snap.docs.map(s=>({id:s.id,...s.data()}));
function controls(){const ok=Boolean(auth.currentUser)&&!busy;$('inspect').disabled=!ok;$('restore').disabled=!ok||!preview||preview.plan.issues.length>0||!$('confirm').checked;}
function message(e){return /resource-exhausted|quota/i.test(`${e.code} ${e.message}`)?'Firebase hết quota: chưa xác nhận khôi phục thành công. Giữ trang này và bấm Kiểm tra lại khi quota hồi phục.':e.message||String(e);}
onAuthStateChanged(auth,user=>{preview=null;$('preview').hidden=true;$('authStatus').textContent=user?'Đã đăng nhập. Có thể kiểm tra dữ liệu hiện tại.':'Chưa đăng nhập trên địa chỉ này. Mở HappyChild ở liên kết bên dưới, đăng nhập rồi quay lại trang này.';controls();});
$('confirm').onchange=controls;
async function inspect(){
 const user=auth.currentUser;if(!user)throw Error('Vui lòng đăng nhập.');
 const guards=new Map();const keep=s=>{guards.set(s.ref.path,s);return s;};
 const studentSnap=keep(await getDocFromServer(doc(db,'students',BEN_AN_ID)));
 if(!studentSnap.exists())throw Error('Không tìm thấy hồ sơ BEN AN. Không tạo hồ sơ thay thế.');
 const [weekSnap,templateSnap,teacherSnap,leaveSnap,holidaySnap]=await Promise.all(['weeks','scheduleTemplates','teachers','teacherLeaves','holidays'].map(name=>getDocsFromServer(collection(db,name))));
 [templateSnap,teacherSnap,leaveSnap,holidaySnap].forEach(s=>s.docs.forEach(keep));
 const weekRows=weekSnap.docs.map(s=>({id:s.id,...s.data(),startKey:dateKey(s.data().startDate),endKey:dateKey(s.data().endDate),snap:s}));
 const prior=weekRows.filter(w=>w.endKey<BEN_AN_FROM).sort((a,b)=>b.endKey.localeCompare(a.endKey));let source=[];
 for(const w of prior){const s=await getDocsFromServer(query(collection(db,'weeks',w.id,'sessions'),where('studentId','==',BEN_AN_ID)));s.docs.forEach(keep);source=rows(s).filter(r=>r.type==='regular');if(source.length)break;}
 if(!source.length)throw Error('Không tìm thấy lịch trước ngày ngừng. Cần đối chiếu bản sao, không tự tạo lịch đoán.');
 const weeks=[];
 for(const w of weekRows.filter(w=>w.endKey>=BEN_AN_FROM)){keep(w.snap);const sessions=await getDocsFromServer(collection(db,'weeks',w.id,'sessions'));weeks.push({...w,sessions:rows(sessions)});}
 const plan=planBenAnRestore({student:{id:studentSnap.id,...studentSnap.data()},source,templates:rows(templateSnap),teachers:rows(teacherSnap),weeks,leaves:rows(leaveSnap),holidays:rows(holidaySnap)});
 const targets=[...plan.templates.map(t=>doc(db,'scheduleTemplates',t.id)),...plan.sessions.map(s=>doc(db,'weeks',s.weekId,'sessions',s.id))];
 for(const ref of targets){const snap=keep(await getDocFromServer(ref));if(snap.exists()&&ref.path.includes('/sessions/'))plan.issues.push(`Mã buổi khôi phục đã tồn tại: ${ref.path}. Cần tải lại/đối chiếu, không ghi đè.`);if(snap.exists()&&!ref.path.includes('/sessions/')&&snap.data().studentId!==BEN_AN_ID)plan.issues.push(`Mã lịch mẫu thuộc học sinh khác: ${ref.id}.`);}
 if(plan.sessions.length+plan.templates.length+weeks.length+2>450)plan.issues.push('Quá nhiều lịch để lưu nguyên khối; cần chia kế hoạch có đối chiếu.');
 if(auth.currentUser?.uid!==user.uid)throw Error('Tài khoản đã thay đổi.');
 return {uid:user.uid,plan,guards,student:studentSnap.data(),weeks};
}
function showPreview(data){const {plan,student}=data;$('preview').hidden=false;$('confirm').checked=false;$('summary').textContent=[`Hồ sơ: BEN AN (${BEN_AN_ID})`,`Trạng thái hiện tại: ${student.active===false?'Đã nghỉ':'Đang học'} · ngày ngừng: ${student.stoppedDate||'không có'}`,`Khôi phục từ: 01/11/2026`,`Lịch đối chiếu: thứ 3, 5, 7 · 19:00–20:00 · cô Tiên`,`Lịch mẫu cần thêm/bật: ${plan.templates.length}`,`Buổi cần thêm trong các tuần đã tạo: ${plan.sessions.length}`,`Buổi đã tồn tại giữ nguyên: ${plan.existing.length}`,`Số dư cần bù giữ nguyên: ${student.makeupBalance??'chưa rõ'}`,...plan.sessions.map(s=>`${s.dateKey} 19–20h${s.status==='holiday'?' · nghỉ lễ':''}`)].join('\n');$('issues').replaceChildren();for(const issue of plan.issues){const li=document.createElement('li');li.textContent=issue;$('issues').append(li);}if(plan.issues.length)$('result').textContent='Chưa lưu: cần giải quyết các xung đột phía trên trước.';else $('result').textContent='Đã kiểm tra. Chưa thay đổi Firebase; tích xác nhận rồi bấm bước 2.';}
$('inspect').onclick=async()=>{busy=true;preview=null;$('result').textContent='Đang đọc dữ liệu hiện tại từ Firebase…';controls();try{preview=await inspect();showPreview(preview);}catch(e){$('result').textContent=message(e);}finally{busy=false;controls();}};
$('restore').onclick=async()=>{
 if(!preview||!$('confirm').checked||preview.plan.issues.length)return;
 const uid=auth.currentUser?.uid;if(uid!==preview.uid)return;
 busy=true;controls();$('result').textContent='Đang kiểm tra lại và lưu nguyên khối lên Firebase…';
 try{
  // Fresh collection checks immediately before saving. Never reuse an old preview.
  const fresh=await inspect();if(fresh.uid!==uid||fresh.plan.issues.length)throw Error('Dữ liệu đã thay đổi hoặc phát sinh trùng lịch. Bấm bước 1 để xem lại.');
  const {plan,guards}=fresh;const signature=v=>canonicalData(encodeData(v,uid));
  if(signature(plan)!==signature(preview.plan))throw Error('Kế hoạch đã thay đổi từ lúc xem trước. Bấm bước 1 để kiểm tra lại.');
  const auditRef=doc(collection(db,'auditLogs'));
  await runTransaction(db,async tx=>{
   if(auth.currentUser?.uid!==uid)throw Error('Tài khoản đã thay đổi.');
   const baseline=[...guards.values()];const current=await Promise.all(baseline.map(s=>tx.get(s.ref)));
   current.forEach((snap,i)=>{const original=baseline[i];if(snap.exists()!==original.exists()||snap.exists()&&signature(snap.data())!==signature(original.data()))throw Error(`Dữ liệu vừa thay đổi: ${original.ref.path}. Bấm bước 1 để đối chiếu lại.`);});
   const stamp={updatedAt:serverTimestamp(),updatedBy:uid};
   tx.update(doc(db,'students',BEN_AN_ID),{active:true,enrollmentStatus:'active',stoppedDate:'',stoppedOrder:null,...stamp});
   for(const t of plan.templates){const {id,...payload}=t;const ref=doc(db,'scheduleTemplates',id);if(guards.get(ref.path)?.exists())tx.update(ref,{active:true,...stamp});else tx.set(ref,{...payload,createdAt:serverTimestamp(),createdBy:uid,...stamp});}
   for(const s of plan.sessions){const {id,weekId,...payload}=s;tx.set(doc(db,'weeks',weekId,'sessions',id),{...payload,date:Timestamp.fromDate(new Date(`${s.dateKey}T12:00:00+07:00`)),createdAt:serverTimestamp(),createdBy:uid,...stamp});}
   for(const weekId of new Set(plan.sessions.map(s=>s.weekId)))tx.update(doc(db,'weeks',weekId),{status:'active',summaryDirtyAt:serverTimestamp(),...stamp});
   tx.set(auditRef,{entityType:'student',entityId:BEN_AN_ID,action:'student_stop_mistake_restored',before:{active:fresh.student.active,enrollmentStatus:fresh.student.enrollmentStatus||'',stoppedDate:fresh.student.stoppedDate||'',makeupBalance:fresh.student.makeupBalance||0},after:{active:true,enrollmentStatus:'active',stoppedDate:'',fromDate:BEN_AN_FROM,restoredTemplateIds:plan.templates.map(t=>t.id),restoredSessions:plan.sessions.map(s=>({weekId:s.weekId,id:s.id,dateKey:s.dateKey,teacherId:s.teacherId}))},reason:'Theo yêu cầu: BEN AN bị đánh ngừng nhầm. Khôi phục từ 01/11/2026 và lịch mẫu, giữ lịch sử và số dư.',userId:uid,createdAt:serverTimestamp()});
  });
  preview=null;
  const verified=await getDocFromServer(doc(db,'students',BEN_AN_ID));if(!verified.exists()||verified.data().active!==true)throw Error('Lệnh lưu đã trả về nhưng chưa xác minh được hồ sơ. Không bấm lại; kiểm tra Lịch sử trước.');
  $('result').textContent=`ĐÃ LƯU FIREBASE: BEN AN đang học; đã khôi phục ${plan.templates.length} lịch mẫu và ${plan.sessions.length} buổi từ 01/11/2026. Giữ ${plan.existing.length} buổi đã có, không đổi số dư cần bù/học phí nhập tay. Mở lại HappyChild để xem. Các buổi quá khứ cần đối chiếu trạng thái học/nghỉ thực tế.`;
 }catch(e){$('result').textContent=message(e);preview=null;}finally{busy=false;controls();}
};
