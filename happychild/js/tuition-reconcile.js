import {manualBalance} from './tuition-balance-policy.js';
// Historical reconstruction only: never seed past invoices with today's balance.
export function importedCount(value) {
  if(value==null||value==='')return 0;
  if(typeof value==='number')return Number.isInteger(value)&&value>=0?value:null;
  const text=String(value).trim();
  if(/^\d+$/.test(text))return Number(text);
  const parts=text.split('+'),counts=parts.map(part=>part.trim().match(/^(\d+)\s*(?:b\b|buổi\b|tháng\b|\()/i));
  return counts.every(Boolean)?counts.reduce((sum,m)=>sum+Number(m[1]),0):null;
}
export function reconcileBalances(account,person,sessions,holidays=[],now=new Date()) {
  const rows=[],skipped=[];
  const september=account.months?.['2026-09']||{};
  const imported=[...(account.history||[])].filter(h=>h.month==='2026-09').sort((a,b)=>b.sourceRow-a.sourceRow)[0];
  let value=null,source='';
  if(september.balanceClose){value=september.balanceClose.value;source='balanceClose:2026-09';}
  else if(manualBalance(september)!==null){value=manualBalance(september);source='manual:2026-09';}
  else if(imported){
    const absent=importedCount(imported.values?.[2]),madeUp=importedCount(imported.values?.[3]),waived=importedCount(imported.values?.[4]);
    if([absent,madeUp,waived].every(v=>v!==null)&&absent-madeUp-waived>=0){value=absent-madeUp-waived;source='history:2026-09 (vắng - đã bù - không bù; ô trống = 0)';}
  }else if(person?.enrollmentStartDate>='2026-09-01'&&!sessions.some(s=>s.studentId===person.id&&s.dateKey<person.enrollmentStartDate&&s.status!=='cancelled')){value=0;source=`enrollmentStartDate:${person.enrollmentStartDate}`;}
  for(const [month,period] of [['2026-10','2026-09'],['2026-11','2026-10']]){
    const closed=account.months?.[month]?.balanceClose;
    if(closed){value=closed.value;source=`balanceClose:${month}`;continue;}
    const manual=manualBalance(account.months?.[month]);
    if(manual!==null){value=manual;source=`manual:${month}`;continue;}
    if(person?.enrollmentStartDate?.slice(0,7)>month){skipped.push({month,reason:'Trước tháng bắt đầu học'});continue;}
    if(!person||value===null){skipped.push({month,reason:!person?'Không có học sinh liên kết':'Thiếu/sai số dư đầu tháng 9'});continue;}
    const own=new Map(),priority={cancelled:0,holiday:1,scheduled:2,makeup_scheduled:2,absent:3,attended:4,makeup_completed:4};
    for(const s of sessions){
      if(s.studentId!==person.id||!s.dateKey?.startsWith(period+'-')||s.type==='test'||s.isTestSlot)continue;
      const key=`${s.dateKey}|${s.startTime}|${s.endTime}|${s.type||'regular'}`;
      if(!own.has(key)||(priority[s.status]||0)>(priority[own.get(key).status]||0))own.set(key,s);
    }
    const holiday=s=>s.status==='holiday'||holidays.some(h=>h.startDate<=s.dateKey&&h.endDate>=s.dateKey);
    // Explicit metadata only. Do not hard-code an absence ID as non-credit:
    // historical corrections may later require including that absence.
    const noCredit=s=>s.affectsMakeupBalance===false;
    const absences=[...own.values()].filter(s=>!holiday(s)&&!noCredit(s)&&s.type!=='makeup'&&s.status==='absent');
    const makeups=[...own.values()].filter(s=>!holiday(s)&&s.type==='makeup'&&s.usesMakeupCredit!==false&&(s.status==='makeup_completed'||s.status==='makeup_scheduled'&&new Date(`${s.dateKey}T${s.endTime}:00+07:00`)<=now));
    // The bill already supports manually reconciled attendance totals. The
    // rollforward must use those same totals, not silently fall back to calendar.
    const overrides=account.months?.[month]?.statsOverrides||{},validCount=v=>Number.isSafeInteger(v)&&v>=0;
    const absent=validCount(overrides.absent)?overrides.absent:absences.length;
    const madeUp=validCount(overrides.madeUp)?overrides.madeUp:makeups.length;
    const result=value+absent-madeUp;
    if(result<0){skipped.push({month,reason:`Số dư âm (${value}+${absent}-${madeUp}); cần đối chiếu điều chỉnh`});value=null;continue;}
    rows.push({month,value:result,opening:value,openingSource:source,period,absent,madeUp,absentSource:validCount(overrides.absent)?'statsOverrides.absent':'calendar',madeUpSource:validCount(overrides.madeUp)?'statsOverrides.madeUp':'calendar',absenceSessions:absences.map(s=>`${s.weekId}/${s.id}`),makeupSessions:makeups.map(s=>`${s.weekId}/${s.id}`)});
    value=result;source=`reconstructed:${month}`;
  }
  return {rows,skipped};
}
