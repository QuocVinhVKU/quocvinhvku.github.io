const STORAGE_PREFIX="happychild:attendance-report:";

const text=value=>String(value??"").trim();
const number=value=>Number.isFinite(Number(value))?Number(value):0;
const normalize=value=>text(value).toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/\s+/g," ");

function monthFromLabel(value){
  const match=text(value).match(/(\d{1,2})[-\/]?(\d{1,2})[-\/](\d{4}).*?(\d{1,2})[-\/]?(\d{1,2})[-\/](\d{4})/);
  if(!match)return "";
  return `${match[3]}-${String(Number(match[2])).padStart(2,"0")}`;
}

function workingDays(value){
  const match=text(value).match(/([\d.,]+)\s*\/\s*([\d.,]+)/);
  return match?{standard:number(match[1].replace(",",".")),actual:number(match[2].replace(",","."))}:{standard:0,actual:0};
}

const minutes=value=>{const parts=text(value).match(/^(\d{1,2}):(\d{2})$/);return parts?Number(parts[1])*60+Number(parts[2]):null};
const timeLabel=value=>`${String(Math.floor(value/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`;

function attendanceDetails(workbook,month){
  const settingsName=workbook.SheetNames.find(name=>normalize(name).includes("cai dat xep ca")),scheduleById=new Map(),detailsById=new Map();
  if(settingsName){const rows=globalThis.XLSX.utils.sheet_to_json(workbook.Sheets[settingsName],{header:1,raw:false,defval:""});for(const row of rows.slice(4)){const id=text(row[0]);if(!id)continue;const dates=new Map();for(let day=1;day<=31;day++){const code=text(row[day+2]);if(code)dates.set(day,code)}scheduleById.set(id,dates)}}
  const [yearValue,monthValue]=month.split("-").map(Number),shift={morningIn:470,morningOut:610,afternoonIn:890,afternoonOut:1220};
  workbook.SheetNames.filter(name=>/^\d+(?:,\d+)*$/.test(name)).forEach(sheetName=>{const rows=globalThis.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{header:1,raw:false,defval:""});for(let base=0;base<45;base+=15){const employeeId=text(rows[4]?.[base+9]);if(!employeeId)continue;const events=[];for(const row of rows.slice(12)){const match=text(row[base]).match(/^(\d{1,2})\s*(.*)$/);if(!match)continue;const day=Number(match[1]),shiftCode=scheduleById.get(employeeId)?.get(day);if(!shiftCode)continue;const dateKey=`${yearValue}-${String(monthValue).padStart(2,"0")}-${String(day).padStart(2,"0")}`,dayLabel=text(match[2]),checks=[{offset:1,kind:"late",period:"Sáng",scheduled:shift.morningIn},{offset:3,kind:"early",period:"Sáng",scheduled:shift.morningOut},{offset:6,kind:"late",period:"Chiều",scheduled:shift.afternoonIn},{offset:8,kind:"early",period:"Chiều",scheduled:shift.afternoonOut}];for(const check of checks){const actual=minutes(row[base+check.offset]);if(actual==null)continue;const difference=check.kind==="late"?actual-check.scheduled:check.scheduled-actual;if(difference>0)events.push({dateKey,dayLabel,kind:check.kind,period:check.period,scheduledTime:timeLabel(check.scheduled),actualTime:timeLabel(actual),minutes:difference})}}
      detailsById.set(employeeId,events)
    }});
  return detailsById;
}

export function parseAttendanceWorkbook(buffer,fileName=""){
  if(!globalThis.XLSX)throw new Error("Chưa tải được bộ đọc Excel. Hãy kiểm tra mạng rồi thử lại.");
  const workbook=globalThis.XLSX.read(buffer,{type:"array",cellDates:false}),sheetName=workbook.SheetNames.find(name=>normalize(name).includes("tong hop cham cong"));
  if(!sheetName)throw new Error("Không tìm thấy trang “Bảng tổng hợp chấm công” trong file.");
  const rows=globalThis.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{header:1,raw:true,defval:""});
  const headerIndex=rows.findIndex(row=>normalize(row?.[0])==="ma nhan vien"&&normalize(row?.[1])==="ho ten");
  if(headerIndex<0)throw new Error("Không nhận diện được hàng tiêu đề của bảng tổng hợp chấm công.");
  const month=rows.slice(0,headerIndex).map(row=>monthFromLabel(row?.[0])).find(Boolean)||"";
  const details=attendanceDetails(workbook,month);
  const employees=rows.slice(headerIndex+2).filter(row=>text(row?.[1])).map(row=>{
    const days=workingDays(row[11]);
    const employeeId=text(row[0]);return {employeeId,name:text(row[1]),department:text(row[2]),standardHours:number(row[3]),actualHours:number(row[4]),lateCount:number(row[5]),lateMinutes:number(row[6]),earlyCount:number(row[7]),earlyMinutes:number(row[8]),overtimeHours:number(row[9])+number(row[10]),standardDays:days.standard,actualDays:days.actual,absenceDays:number(row[13]),leaveDays:number(row[14]),events:details.get(employeeId)||[]};
  }).filter(item=>item.name);
  if(!employees.length)throw new Error("File không có dữ liệu nhân viên trong bảng tổng hợp.");
  return {version:1,month,fileName:text(fileName),sheetName,importedAt:new Date().toISOString(),employees};
}

export function attendanceSummary(report){
  const employees=(report?.employees||[]).filter(item=>number(item.actualDays)>0),sum=field=>employees.reduce((total,item)=>total+number(item[field]),0);
  return {employeeCount:employees.length,lateCount:sum("lateCount"),lateMinutes:sum("lateMinutes"),earlyCount:sum("earlyCount"),earlyMinutes:sum("earlyMinutes"),absenceDays:sum("absenceDays"),punctualCount:employees.filter(item=>item.actualDays>0&&!item.lateCount&&!item.earlyCount).length};
}

export function saveAttendanceReport(report){
  if(!report?.month)throw new Error("Không xác định được tháng trong file chấm công.");
  const visible={...report,employees:(report.employees||[]).filter(item=>number(item.actualDays)>0)};
  localStorage.setItem(STORAGE_PREFIX+report.month,JSON.stringify(visible));
}

export function loadAttendanceReport(month){
  try{const report=JSON.parse(localStorage.getItem(STORAGE_PREFIX+month)||"null");return report?{...report,employees:(report.employees||[]).filter(item=>number(item.actualDays)>0)}:null}catch{return null}
}

export function attendanceRows(report){
  return (report?.employees||[]).filter(item=>number(item.actualDays)>0);
}
