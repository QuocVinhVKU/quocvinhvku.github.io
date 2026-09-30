import {monthDates,monthNow,orderTuitionAccounts} from './tuition-model.js?v=20260930-6';

export function exportTuitionRoster(data,month,roster,now=new Date()) {
  const first=month+'-01',last=monthDates(month).at(-1);
  const eligible=data.students.filter(person=>{
    if(person.stoppedDate&&person.stoppedDate<=first||person.enrollmentStartDate&&person.enrollmentStartDate>last)return false;
    if(data.sessions.some(s=>s.studentId===person.id&&s.dateKey>=first&&s.dateKey<=last&&s.type!=='test'&&!s.isTestSlot&&!['cancelled','holiday'].includes(s.status)))return true;
    if(person.enrollmentStatus==='waiting'||person.archived||person.stoppedDate&&person.stoppedDate<=first||person.enrollmentStartDate&&person.enrollmentStartDate>last)return false;
    if(person.active!==false&&month>=monthNow(now))return true;
    return !!(person.stoppedDate&&person.stoppedDate>first&&(!person.enrollmentStartDate||person.enrollmentStartDate<=last));
  });
  const rows=eligible.flatMap(person=>{
    const linked=data.accounts.filter(a=>a.studentId===person.id);
    return linked.length?linked:[{id:'export-'+person.id,studentId:person.id,displayName:person.fullName,history:[],months:{}}];
  });
  // An unlinked imported invoice still proves enrollment in the selected month.
  rows.push(...data.accounts.filter(a=>!data.students.some(p=>p.id===a.studentId)&&(a.history||[]).some(h=>h.month===month)));
  return orderTuitionAccounts(rows,roster);
}

export function tuitionExportMonths(account,month,current=monthNow()) {
  return [...new Set([month,...(current<=month?[current]:[]),...Object.keys(account.months||{}),...(account.history||[]).map(h=>h.month)])].filter(m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m)&&m<=month).sort((a,b)=>b.localeCompare(a));
}
