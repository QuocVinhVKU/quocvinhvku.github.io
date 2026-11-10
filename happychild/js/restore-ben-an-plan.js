export const BEN_AN_ID='student-sheet5-r20';
export const BEN_AN_FROM='2026-11-01';
export const overlap=(a,b)=>a.startTime<b.endTime&&b.startTime<a.endTime;
const key=r=>`${r.dayOfWeek}|${r.startTime}|${r.endTime}`;
const dateKey=d=>`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
const live=r=>!['absent','holiday','cancelled'].includes(r.status);
export function planBenAnRestore({student,source,templates,weeks,teachers,leaves=[],holidays=[]}){
 if(student?.id!==BEN_AN_ID||String(student.fullName||'').trim().toUpperCase()!=='BEN AN')throw Error('Không đúng hồ sơ BEN AN; dừng để tránh sửa nhầm bé.');
 if(student.active===false&&student.stoppedDate!==BEN_AN_FROM)throw Error(`Ngày ngừng hiện tại là ${student.stoppedDate||'chưa rõ'}, khác bản sao 01/11/2026. Cần đối chiếu lại.`);
 const regular=source.filter(r=>r.studentId===BEN_AN_ID&&r.dateKey<BEN_AN_FROM&&r.type==='regular');
 const patterns=[...new Map(regular.map(r=>[key(r),r])).values()];
 if(patterns.length!==3||[1,3,5].some(day=>!patterns.some(r=>r.dayOfWeek===day&&r.startTime==='19:00'&&r.endTime==='20:00'&&r.teacherId==='teacher-sheet5-tien')))throw Error('Lịch sử gần nhất không khớp thứ 3–5–7, 19–20h, cô Tiên. Không tự suy đoán lịch.');
 const issues=[],newTemplates=[],sessions=[],existing=[];
 for(const p of patterns){
  const teacher=teachers.find(t=>t.id===p.teacherId);if(!teacher||teacher.active===false)issues.push(`Cô trong lịch cũ ${p.teacherId} không còn hoạt động.`);
  const own=templates.filter(t=>t.studentId===BEN_AN_ID&&Number(t.dayOfWeek)===p.dayOfWeek&&overlap(t,p));
  if(own.some(t=>key(t)!==key(p)||t.teacherId!==p.teacherId))issues.push(`BEN AN có lịch mẫu khác ở thứ ${p.dayOfWeek+2}; cần chọn lịch đúng.`);
  const other=templates.find(t=>t.active!==false&&t.studentId!==BEN_AN_ID&&Number(t.dayOfWeek)===p.dayOfWeek&&t.teacherId===p.teacherId&&overlap(t,p));
  if(other)issues.push(`Lịch mẫu thứ ${p.dayOfWeek+2} 19–20h: cô Tiên đã dạy học sinh khác (${other.studentId}).`);
  const seats=templates.filter(t=>t.active!==false&&t.studentId!==BEN_AN_ID&&Number(t.dayOfWeek)===p.dayOfWeek&&overlap(t,p));
  if(new Set(seats.map(t=>t.studentId)).size>=7)issues.push(`Lịch mẫu thứ ${p.dayOfWeek+2} 19–20h đã đủ 7 phòng.`);
  let template=own.find(t=>key(t)===key(p)&&t.teacherId===p.teacherId);
  if(!template){template={id:p.sourceTemplateId||`restore-ben-an-${p.dayOfWeek}`,studentId:BEN_AN_ID,teacherId:p.teacherId,dayOfWeek:p.dayOfWeek,startTime:p.startTime,endTime:p.endTime,capacity:1,active:true,note:'Khôi phục BEN AN sau thao tác ngừng học nhầm từ 01/11/2026'};newTemplates.push(template);}
  else if(template.active===false)newTemplates.push({...template,active:true});
  for(const week of weeks){const start=week.startKey,end=week.endKey;if(end<BEN_AN_FROM)continue;
   const day=new Date(`${start}T12:00:00Z`);day.setUTCDate(day.getUTCDate()+p.dayOfWeek);const date=dateKey(day);if(date<BEN_AN_FROM||date>end)continue;
   const slot={...p,dateKey:date};
   const ownRows=week.sessions.filter(r=>r.studentId===BEN_AN_ID&&r.dateKey===date&&overlap(r,slot));
   if(ownRows.length){if(ownRows.length===1&&ownRows[0].type==='regular'&&key(ownRows[0])===key(p)){existing.push({weekId:week.id,session:ownRows[0]});continue;}issues.push(`BEN AN có buổi khác ${date} 19–20h; giữ nguyên, không ghi đè.`);continue;}
   const holiday=holidays.some(h=>date>=h.startDate&&date<=h.endDate);
   const leave=leaves.some(l=>l.teacherId===p.teacherId&&date>=l.startDate&&date<=l.endDate&&(l.leaveType==='full_day'||overlap(l,slot)));
   const peers=week.sessions.filter(r=>r.dateKey===date&&live(r)&&overlap(r,slot));
   if(!holiday&&leave)issues.push(`${date} 19–20h: cô Tiên đang nghỉ phép; cần chọn cô dạy thay.`);
   if(!holiday&&peers.some(r=>r.teacherId===p.teacherId))issues.push(`${date} 19–20h: cô Tiên có buổi khác.`);
   if(!holiday&&new Set(peers.map(r=>r.type==='test'?`test:${r.id}`:r.studentId||r.id)).size>=7)issues.push(`${date} 19–20h đã đủ 7 phòng.`);
   sessions.push({id:`restore-ben-an-${date}`,weekId:week.id,studentId:BEN_AN_ID,teacherId:p.teacherId,dayOfWeek:p.dayOfWeek,dateKey:date,startTime:p.startTime,endTime:p.endTime,capacity:1,type:'regular',status:holiday?'holiday':'scheduled',sourceTemplateId:template.id,note:'Khôi phục sau thao tác ngừng học nhầm từ 01/11/2026; đối chiếu trạng thái học/nghỉ theo thực tế.'});
  }
 }
 return {from:BEN_AN_FROM,patterns:patterns.map(p=>({dayOfWeek:p.dayOfWeek,startTime:p.startTime,endTime:p.endTime,teacherId:p.teacherId})),templates:newTemplates,sessions,existing,issues:[...new Set(issues)]};
}
