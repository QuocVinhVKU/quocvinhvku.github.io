// Tuition uses calendar months, never the number of weeks displayed in the UI.
const monthFormatter=new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit"});
const dateFormatter=new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"});
const dayFormatter=new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Ho_Chi_Minh",day:"2-digit"});
export const monthNow = (now = new Date()) => monthFormatter.format(now).replace(/^(\d{2})\/(\d{4})$/, "$2-$1");
export function monthDates(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Tháng không hợp lệ.");
  const [y,m] = month.split("-").map(Number);
  return Array.from({length:new Date(Date.UTC(y,m,0)).getUTCDate()}, (_,i)=>`${month}-${String(i+1).padStart(2,"0")}`);
}
export function dateKey(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = value?.toDate ? value.toDate() : new Date(value);
  if (!value || Number.isNaN(d.getTime())) return "";
  return dateFormatter.format(d);
}
export const monthLabel = month => `${month.slice(5)}/${month.slice(0,4)}`;
export function previousMonth(month) {
  monthDates(month);
  const [year,number]=month.split("-").map(Number);
  return number===1?`${year-1}-12`:`${year}-${String(number-1).padStart(2,"0")}`;
}
export function nextMonth(month) {
  monthDates(month);
  const [year,number]=month.split("-").map(Number);
  return number===12?`${year+1}-01`:`${year}-${String(number+1).padStart(2,"0")}`;
}
export function defaultBillingMonth(now = new Date()) {
  const current = monthNow(now);
  const day = Number(dayFormatter.format(now));
  return day >= 5 ? nextMonth(current) : current;
}
export function orderTuitionAccounts(accounts,roster) {
  const rank=new Map(roster.map((entry,index)=>[entry.person.id,{index,number:entry.number}]));
  return accounts.map(account=>({...account,rosterNumber:rank.get(account.studentId)?.number??""})).sort((a,b)=>(rank.get(a.studentId)?.index??Infinity)-(rank.get(b.studentId)?.index??Infinity)||a.displayName.localeCompare(b.displayName,"vi"));
}
export function tuitionConfig(account,month) {
  const existing=account.months?.[month];
  if(existing?.unitFee!=null)return existing;
  const prior=Object.entries(account.months||{}).filter(([key])=>key<month).sort(([a],[b])=>b.localeCompare(a)).find(([,v])=>v.unitFee!=null)?.[1];
  const source=[...(account.history||[])].filter(s=>s.month<=month).sort((a,b)=>b.month.localeCompare(a.month)||b.sourceRow-a.sourceRow).find(s=>typeof s.fees?.[6]==="number");
  return {adjustment:0,note:"",...existing,unitFee:prior?.unitFee??source?.fees?.[6]??null};
}
export function previousRegistered(account,month,compute,current=monthNow()) {
  const previous=previousMonth(month),valid=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0;
  if(previous>=current)return compute(previous)?.registered??null;
  // The previous month's registration total is not its attendance count.
  const snapshot=account.months?.[previous]?.snapshot;
  if(valid(snapshot?.registered))return snapshot.registered;
  const history=[...(account.history||[])].sort((a,b)=>b.sourceRow-a.sourceRow);
  const previousSource=history.find(s=>s.month===previous&&valid(s.fees?.[1]));
  if(previousSource)return previousSource.fees[1];
  const carried=history.find(s=>s.month===month&&valid(s.values?.[1]));
  if(carried)return carried.values[1];
  return compute(previous)?.registered??null;
}
// Billing-month registration stays in place; attendance is from the preceding month.
// Never mutate imported history or reinterpret an older snapshot as prior-month data.
export function tuitionDisplayBalance(account,month,baseBalance,pendingEntries=[],current=monthNow()) {
  const saved=tuitionBalanceState(account,month,baseBalance,current);
  const pending=pendingEntries.find(p=>p.kind==='tuition-balance'&&p.accountId===account.id&&p.month===month);
  if(!pending||['closed','manual'].includes(saved.balanceStatus)&&pending.values.onlyIfUnclosed)return saved;
  if(pending.status==='protected'&&Number.isSafeInteger(pending.protectedValue))return {balance:pending.protectedValue,balanceStatus:'manual',balanceLabel:String(pending.protectedValue),balanceNote:'Giữ nguyên số đã nhập tay'};
  const value=pending.values?.value;
  if(!Number.isSafeInteger(value)||value<0)return saved;
  return {balance:value,balanceStatus:pending.status==='conflict'?'conflict':'pending',balanceLabel:String(value),balancePending:true,balanceNote:pending.status==='conflict'?'Bản local cần đối chiếu':'Đã lưu local · chưa đồng bộ Firebase'};
}
export function tuitionBalanceState(account,month,baseBalance,current=monthNow()) {
  const config=account.months?.[month]||{},close=config.balanceClose;
  const valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
  if(valid(close?.value)&&close.capturedAt)return {balance:close.value,balanceStatus:'closed',balanceLabel:String(close.value),balanceClosedAt:close.capturedAt};
  if(Number.isSafeInteger(config.statsOverrides?.balance)&&config.statsOverrides.balance>=0)return {balance:config.statsOverrides.balance,balanceStatus:'manual',balanceLabel:String(config.statsOverrides.balance),balanceNote:'Giữ nguyên số đã nhập tay'};
  const imported=[...(account.history||[])].filter(s=>s.month===month).sort((a,b)=>b.sourceRow-a.sourceRow)[0]?.values?.[2];
  const reference=config.balanceRecovery?.value??config.statsOverrides?.balance??config.snapshot?.balance??imported;
  if(month<current)return {balance:null,balanceStatus:'unclosed',balanceLabel:'Chưa chốt số dư',balanceReference:valid(reference)?reference:null,balanceReferenceSource:config.balanceRecovery?.source||'Phiếu/bản lưu cũ chưa có xác nhận chốt'};
  if(month>current)return {balance:null,balanceStatus:'forecast',balanceLabel:'Chưa chốt số dư'};
  return {balance:valid(baseBalance)?baseBalance:null,balanceStatus:'live',balanceLabel:valid(baseBalance)?String(baseBalance):'—'};
}
export function tuitionBillingStats(account,month,base,compute) {
  if(!base)return null;
  const attendanceMonth=previousMonth(month),prior=compute(attendanceMonth);
  return {...base,...tuitionBalanceState(account,month,base.balance),attendanceMonth,previousRegistered:previousRegistered(account,month,compute),madeUp:prior?.madeUp??null,madeUpDates:prior?.madeUpDates??[],absent:prior?.absent??null,absentDates:prior?.absentDates??[],actual:prior?.actual??null};
}
// A balance-only recovery is not a full billing snapshot. Wait for live month
// data when registration is absent, then overlay only saved fields.
export function mergeTuitionSnapshot(base,snapshot) {
  if(!snapshot)return base;
  const validRegistration=typeof snapshot.registered==='number'&&Number.isFinite(snapshot.registered)&&snapshot.registered>=0;
  if(!base&&!validRegistration)return null;
  return {...(base||{}),...snapshot,dates:Array.isArray(snapshot.dates)?snapshot.dates:base?.dates||[]};
}
export const normalizeName = name => String(name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase().replace(/[^a-z0-9]/g,"");
export function orderedMonths(account, current = monthNow()) {
  const keys = new Set([current, nextMonth(current), ...Object.keys(account.months||{}), ...(account.history||[]).map(x=>x.month)]);
  const upcoming=nextMonth(current);
  return [...keys].sort((a,b)=>a===b?0:a===upcoming?-1:b===upcoming?1:b.localeCompare(a));
}
export function tuitionMoney(rate, count, adjustment = 0) {
  if (rate === null || rate === undefined || rate === "") return {monthly:null,total:null};
  if (![rate,count,adjustment].every(Number.isFinite) || rate<0 || count<0) throw new Error("Học phí không hợp lệ.");
  const monthly = Math.round(rate*count);
  return {monthly,total:monthly-adjustment};
}
export function tuitionStats({person,month,sessions=[],weeks=[],templates=[],holidays=[],now=new Date()}) {
  const dates = monthDates(month), current = monthNow(now), own = new Map();
  // Duplicate documents for the same child/slot count only once. A cancellation
  // does not hide a separate, still-valid document for that same slot.
  const priority = {cancelled:0,holiday:1,scheduled:2,makeup_scheduled:2,absent:3,attended:4,makeup_completed:4};
  for (const s of sessions.filter(s=>s.studentId===person.id&&s.dateKey?.startsWith(month+"-")&&s.type!=="test"&&!s.isTestSlot)) {
    const key = `${s.dateKey}|${s.startTime}|${s.endTime}`;
    if (!own.has(key)||(priority[s.status]||0)>(priority[own.get(key).status]||0)) own.set(key,s);
  }
  const isHoliday = day=>holidays.some(h=>h.startDate<=day&&h.endDate>=day);
  const eligible = day=>!(person.stoppedDate&&day>=person.stoppedDate)&&!(person.enrollmentStartDate&&day<person.enrollmentStartDate);
  const covered = day=>weeks.some(w=>dateKey(w.startDate)<=day&&dateKey(w.endDate)>=day);
  // Registration is independent of attendance and makeup. In particular, a
  // makeup document at the same time must not replace an absent regular lesson.
  const registrations=new Map(),forecast=[];
  for (const s of sessions) {
    if(s.studentId!==person.id||!s.dateKey?.startsWith(month+"-")||s.isTestSlot||![undefined,"regular"].includes(s.type)||['holiday','cancelled'].includes(s.status)||!eligible(s.dateKey)||isHoliday(s.dateKey))continue;
    registrations.set(`${s.dateKey}|${s.startTime}|${s.endTime}`,s);
  }
  const regular=[...registrations.values()];
  // Do not reconstruct missing historical weeks with today's edited template.
  if (month>=current && person.active!==false && person.enrollmentStatus!=="waiting") {
    for (const day of dates) {
      if (covered(day)||!eligible(day)||isHoliday(day)) continue;
      const weekday = (new Date(day+"T12:00:00Z").getUTCDay()+6)%7;
      const slots = new Map(templates.filter(t=>t.studentId===person.id&&t.active!==false&&Number(t.dayOfWeek)===weekday).map(t=>[`${t.startTime}|${t.endTime}`,t]));
      for (const t of slots.values()) forecast.push({dateKey:day,startTime:t.startTime,endTime:t.endTime});
    }
  }
  const ended = s=>s.teacherLeaveAction!=="pending"&&now.getTime()>=new Date(`${s.dateKey}T${s.endTime}:00+07:00`).getTime();
  const learnedSessions=[...own.values()].filter(s=>s.type!=="makeup"&&!isHoliday(s.dateKey)&&(s.status==="attended"||(s.status==="scheduled"&&ended(s))));
  const madeUpSessions=[...own.values()].filter(s=>s.type==="makeup"&&!isHoliday(s.dateKey)&&(s.status==="makeup_completed"||(s.status==="makeup_scheduled"&&ended(s))));
  const absentSessions=[...own.values()].filter(s=>s.status==="absent"&&!isHoliday(s.dateKey));
  const uniqueDays=rows=>[...new Set(rows.map(s=>s.dateKey).filter(Boolean))].sort();
  const learned=learnedSessions.length,madeUp=madeUpSessions.length;
  return {registered:regular.length+forecast.length,forecast:forecast.length,learned,madeUp,madeUpDates:uniqueDays(madeUpSessions),actual:learned+madeUp,absent:absentSessions.length,absentDates:uniqueDays(absentSessions),balance:month<current?null:Math.max(0,Number(person.makeupBalance)||0),dates:[...regular,...forecast].sort((a,b)=>a.dateKey.localeCompare(b.dateKey)||a.startTime.localeCompare(b.startTime)).map(s=>({date:s.dateKey,start:s.startTime,end:s.endTime}))};
}
