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

export function parseAttendanceWorkbook(buffer,fileName=""){
  if(!globalThis.XLSX)throw new Error("Chưa tải được bộ đọc Excel. Hãy kiểm tra mạng rồi thử lại.");
  const workbook=globalThis.XLSX.read(buffer,{type:"array",cellDates:false}),sheetName=workbook.SheetNames.find(name=>normalize(name).includes("tong hop cham cong"));
  if(!sheetName)throw new Error("Không tìm thấy trang “Bảng tổng hợp chấm công” trong file.");
  const rows=globalThis.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{header:1,raw:true,defval:""});
  const headerIndex=rows.findIndex(row=>normalize(row?.[0])==="ma nhan vien"&&normalize(row?.[1])==="ho ten");
  if(headerIndex<0)throw new Error("Không nhận diện được hàng tiêu đề của bảng tổng hợp chấm công.");
  const month=rows.slice(0,headerIndex).map(row=>monthFromLabel(row?.[0])).find(Boolean)||"";
  const employees=rows.slice(headerIndex+2).filter(row=>text(row?.[1])).map(row=>{
    const days=workingDays(row[11]);
    return {employeeId:text(row[0]),name:text(row[1]),department:text(row[2]),standardHours:number(row[3]),actualHours:number(row[4]),lateCount:number(row[5]),lateMinutes:number(row[6]),earlyCount:number(row[7]),earlyMinutes:number(row[8]),overtimeHours:number(row[9])+number(row[10]),standardDays:days.standard,actualDays:days.actual,absenceDays:number(row[13]),leaveDays:number(row[14])};
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
