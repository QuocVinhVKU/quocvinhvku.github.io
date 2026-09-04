export const DAYS = ["Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7","Chủ nhật"];
export const STATUS = {scheduled:"Đã xếp lịch",attended:"Đã học",absent:"Xin nghỉ",makeup_scheduled:"Xếp học bù",makeup_completed:"Đã học bù",holiday:"Nghỉ lễ",cancelled:"Đã hủy"};
export function elapsedSessionTarget(session,now=new Date()){
  const type=String(session?.type||"regular"),status=String(session?.status||""),eligible=type==="makeup"?status==="makeup_scheduled":status==="scheduled";if(!eligible||!/^\d{4}-\d{2}-\d{2}$/.test(String(session?.dateKey||""))||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(session?.endTime||"")))return null;const nowMs=now instanceof Date?now.getTime():new Date(now).getTime(),endedAt=new Date(`${session.dateKey}T${session.endTime}:00`);if(!Number.isFinite(nowMs)||Number.isNaN(endedAt.getTime())||endedAt.getTime()>nowMs)return null;return type==="makeup"?"makeup_completed":"attended";
}
export function parseScheduleTimeRange(value){
  const compact=String(value||"").normalize("NFC").toLocaleUpperCase("vi").replace(/\s+/g,"").replace(/ĐẾN/g,"-").replace(/[–—]/g,"-").replace(/GIỜ/g,"H").replace(/\./g,":"),parseToken=token=>{const match=String(token||"").match(/^(\d{1,2})(?:(?:H|:)(\d{1,2})?)?$/);if(!match)return null;const hour=Number(match[1]),minute=Number(match[2]||0);if(hour>23||minute>59)return null;return hour*60+minute},format=minutes=>`${String(Math.floor(minutes/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;
  if(!compact)return null;const parts=compact.split("-");if(parts.length>2||parts.some(part=>!part))return null;const rawStart=parseToken(parts[0]);if(rawStart==null)return null;const startHour=Math.floor(rawStart/60),start=startHour>=3&&startHour<=7?rawStart+720:rawStart;let end=parts.length===1?start+60:parseToken(parts[1]);if(end==null)return null;if(parts.length===2&&end<=start&&end+720>start)end+=720;if(end<=start||end>1439)return null;const roundedStart=Math.floor(start/60)*60,roundedEnd=Math.floor(end/60)*60;if(roundedEnd<=roundedStart)return null;return [format(roundedStart),format(roundedEnd)];
}
export const floorScheduleTime=value=>{const match=String(value||"").trim().match(/^([01]\d|2[0-3]):[0-5]\d$/);return match?`${match[1]}:00`:null};
export const pad=n=>String(n).padStart(2,"0");
export const localDate=d=>{const x=d?.toDate?d.toDate():new Date(d);return Number.isNaN(x.getTime())?"—":`${pad(x.getDate())}/${pad(x.getMonth()+1)}/${x.getFullYear()}`};
export const isoDate=d=>{const x=new Date(d);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`};
export const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);x.setHours(12,0,0,0);return x};
export const weekLabel=(number,start,end)=>`Tuần ${number} (${localDate(start)}–${localDate(end)})`;
export const escapeHtml=value=>String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
export const overlap=(aStart,aEnd,bStart,bEnd)=>aStart<bEnd&&bStart<aEnd;
const daysInMonth=(month,year)=>{if(month===2){if(year==null)return 29;return year%400===0||(year%4===0&&year%100!==0)?29:28}return [4,6,9,11].includes(month)?30:31};
const validFormDateParts=(day,month,year)=>Number.isInteger(day)&&Number.isInteger(month)&&(year==null||(Number.isInteger(year)&&year>=2000&&year<=2100))&&month>=1&&month<=12&&day>=1&&day<=daysInMonth(month,year);
/**
 * Trích khoảng ngày từ tiêu đề Google Form, ví dụ:
 * "Nam Hy 8/6 - 8/9" hoặc "Nam Hy 08/06/2026 – 08/09/2026".
 * Năm là tùy chọn và chỉ được giữ lại khi có trong tiêu đề.
 */
export function parseFormPeriod(title=""){
  const text=String(title||"").trim();
  if(!text)return null;
  const match=text.match(/(?:^|[^\d])(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{4}))?\s*(?:-|\u2013|\u2014|\u2212|đến)\s*(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{4}))?(?!\d)/iu);
  if(!match)return null;
  const startParts={day:Number(match[1]),month:Number(match[2]),year:match[3]?Number(match[3]):null};
  const endParts={day:Number(match[4]),month:Number(match[5]),year:match[6]?Number(match[6]):null};
  if(!validFormDateParts(startParts.day,startParts.month,startParts.year)||!validFormDateParts(endParts.day,endParts.month,endParts.year))return null;
  const display=parts=>`${parts.day}/${parts.month}${parts.year==null?"":`/${parts.year}`}`;
  const courseStart=display(startParts),courseEnd=display(endParts);
  return {courseStart,courseEnd,coursePeriod:`${courseStart}-${courseEnd}`,startParts,endParts};
}
export const parseFormTitleDateRange=parseFormPeriod;
export const parseDateRangeFromFormTitle=parseFormPeriod;

const dateOnlyParts=value=>{
  if(value?.toDate)value=value.toDate();
  if(value instanceof Date){
    if(Number.isNaN(value.getTime()))return null;
    return {year:value.getFullYear(),month:value.getMonth()+1,day:value.getDate()};
  }
  const text=String(value??"").trim(),iso=text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if(!iso)return null;
  const parts={year:Number(iso[1]),month:Number(iso[2]),day:Number(iso[3])};
  return validFormDateParts(parts.day,parts.month,parts.year)?parts:null;
};
const courseDateParts=value=>{
  const text=String(value??"").trim(),match=text.match(/^(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{4}))?$/);
  if(!match)return null;
  const parts={day:Number(match[1]),month:Number(match[2]),year:match[3]?Number(match[3]):null};
  return validFormDateParts(parts.day,parts.month,parts.year)?parts:null;
};
const dateKey=parts=>`${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
const dateOrdinal=parts=>Date.UTC(parts.year,parts.month-1,parts.day)/86400000;
const dateAnchorYear=(form,startParts,endParts)=>{
  if(endParts?.year)return endParts.year;
  const created=dateOnlyParts(form?.createdAt);
  if(created)return created.year;
  if(startParts?.year)return startParts.year;
  return null;
};

/**
 * Xác định tình trạng ghi kết quả của một Link Form theo ngày (không theo giờ).
 * Ngày kết thúc có thể là d/m hoặc d/m/yyyy. Với năm bị lược bỏ, năm tạo hồ sơ
 * được dùng làm mốc ổn định. Nếu không có năm hay createdAt thì trả `unknown`,
 * tránh để trạng thái của cùng một hồ sơ tự đổi chỉ vì người dùng mở trang ở năm khác.
 */
export function getFormResultStatus(form={},today=new Date()){
  const todayParts=dateOnlyParts(today)||dateOnlyParts(new Date()),startParts=courseDateParts(form.courseStart),endParts=courseDateParts(form.courseEnd);
  if(!endParts)return {status:"unknown",isLate:false,deadlineDate:"",resultDate:"",daysLate:0,reason:"invalid_deadline"};
  const anchorYear=dateAnchorYear(form,startParts,endParts);
  if(!anchorYear)return {status:"unknown",isLate:false,deadlineDate:"",resultDate:"",daysLate:0,reason:"invalid_deadline"};
  let endYear=endParts.year||anchorYear;
  if(!endParts.year&&startParts&&(!startParts.year||startParts.year===anchorYear)){
    const startYear=anchorYear;
    if(startParts.month>endParts.month||(startParts.month===endParts.month&&startParts.day>endParts.day))endYear=startYear+1;
  }
  const deadline={...endParts,year:endYear};
  if(!validFormDateParts(deadline.day,deadline.month,deadline.year))return {status:"unknown",isLate:false,deadlineDate:"",resultDate:"",daysLate:0,reason:"invalid_deadline"};
  const deadlineDate=dateKey(deadline),deadlineOrdinal=dateOrdinal(deadline),rawResult=String(form.resultRecordedDate??"").trim();
  if(rawResult){
    const result=dateOnlyParts(form.resultRecordedDate);
    if(!result)return {status:"unknown",isLate:false,deadlineDate,resultDate:"",daysLate:0,reason:"invalid_result"};
    const resultOrdinal=dateOrdinal(result),daysLate=Math.max(0,resultOrdinal-deadlineOrdinal),isLate=daysLate>0;
    return {status:isLate?"late":"on_time",isLate,deadlineDate,resultDate:dateKey(result),daysLate,reason:isLate?"recorded_late":"recorded_on_time"};
  }
  const daysLate=Math.max(0,dateOrdinal(todayParts)-deadlineOrdinal),isLate=daysLate>0;
  return {status:isLate?"late":"pending",isLate,deadlineDate,resultDate:"",daysLate,reason:isLate?"missing_overdue":"awaiting_result"};
}
export function toast(message,type="ok") { const el=document.createElement("div");el.className=`toast ${type}`;el.textContent=message;document.querySelector("#toastRegion").append(el);setTimeout(()=>el.remove(),3500); }
export function setBusy(button,busy,text="Đang lưu…"){if(!button)return;button.disabled=busy;if(busy){button.dataset.oldText=button.textContent;button.textContent=text}else if(button.dataset.oldText)button.textContent=button.dataset.oldText}
export function initials(name="A"){return name.trim().split(/\s+/).slice(-2).map(x=>x[0]).join("").toUpperCase()}
