import {monthNow,monthDates,monthLabel,previousMonth,previousRegistered,nextMonth,defaultBillingMonth,orderTuitionAccounts,tuitionConfig,dateKey,orderedMonths,normalizeName,tuitionMoney,tuitionStats,tuitionBillingStats} from "./tuition-model.js?v=20261001-2";
import {watchTuition,watchTuitionWeek,linkTuition,saveTuitionMonth,createTuitionAccount,loadTuitionExport} from "./tuition-store.js?v=20261002-1";
import {exportTuitionRoster} from "./tuition-export-roster.js?v=20260930-1";
import {escapeHtml as e,toast} from "./utils.js?v=20260913-25";
import {isQuotaExceeded,listPending,queueTuitionMonth,removePending} from './local-pending.js?v=20261001-1';
import {syncPendingTuition} from './tuition-pending-sync.js?v=20261001-1';

const money=value=>value==null?"—":new Intl.NumberFormat("vi-VN").format(value)+" ₫";
const cell=value=>e(value==null||value===""?"—":value);
const attendanceCell=(count,dates=[])=>count==null?'—':`${count}${dates.length?` (${dates.map(day=>day.slice(8,10)+'/'+day.slice(5,7)).join(', ')})`:''}`;
const title=month=>`Tháng ${monthLabel(month)}`;
const overrideNumberFields=['previousRegistered','balance','madeUp','absent','actual'];
function statsWithOverrides(stats,overrides={}) {
  if(!stats)return stats;
  const next={...stats};
  for(const key of overrideNumberFields)if(Number.isInteger(overrides[key])&&overrides[key]>=0)next[key]=overrides[key];
  for(const key of ['madeUpDates','absentDates'])if(Array.isArray(overrides[key]))next[key]=overrides[key];
  return next;
}
function parseReportDates(raw,month,label) {
  const text=String(raw||'').trim();if(!text)return undefined;
  const result=text.split(/[;,\n]+/).map(item=>item.trim()).filter(Boolean).map(item=>{
    let date=item;
    const short=item.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
    if(short)date=`${short[3]||month.slice(0,4)}-${String(Number(short[2])).padStart(2,'0')}-${String(Number(short[1])).padStart(2,'0')}`;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date.slice(0,7)!==month||!monthDates(month).includes(date))throw new Error(`${label} phải thuộc tháng ${monthLabel(month)}.`);
    return date;
  });
  return [...new Set(result)].sort();
}
function sourceTable(source) {
  const v=source.values||[],f=source.fees||[],labels=source.labels||[],fee=source.feeLabels||[];
  return `<div class="tuition-sheet-scroll" tabindex="0" aria-label="Phiếu gốc Excel, cuộn ngang để xem đầy đủ"><table class="tuition-sheet"><thead><tr>${labels.map((x,i)=>i===8?"":`<th ${i===7?'colspan="2"':""}>${cell(x)}</th>`).join("")}</tr></thead><tbody><tr><th rowspan="3" class="tuition-name">${cell(v[0])}</th>${v.slice(1,7).map(x=>`<td>${cell(x)}</td>`).join("")}<td colspan="2">${cell(v[7])}</td><td rowspan="3" class="tuition-total">${typeof v[9]==="number"?money(v[9]):cell(v[9])}</td></tr><tr class="tuition-green"><th colspan="5">${cell(fee[1])}</th><th>${cell(fee[6])}</th><th>${cell(fee[7])}</th><th>${cell(fee[8])}</th></tr><tr><td colspan="5">${cell(f[1])}</td><td>${typeof f[6]==="number"?money(f[6]):cell(f[6])}</td><td>${typeof f[7]==="number"?money(f[7]):cell(f[7])}</td><td>${cell(f[8])}</td></tr></tbody></table></div>`;
}
function liveTable(person,month,stats,config) {
  const fee=tuitionMoney(config.unitFee,stats.registered,config.adjustment||0);
  return `<div class="tuition-sheet-scroll" tabindex="0" aria-label="Bảng báo học phí, cuộn ngang để xem đầy đủ"><table class="tuition-sheet"><thead><tr><th>Tên trẻ</th><th>Số buổi đăng ký T${Number(previousMonth(month).slice(5))}</th><th>Số buổi vắng<br><small>Cần bù còn lại</small></th><th>Số buổi đã bù T${monthLabel(previousMonth(month))}</th><th>Buổi nghỉ T${monthLabel(previousMonth(month))}</th><th>Tổng buổi đã học T${monthLabel(previousMonth(month))}</th><th>Ghi chú</th><th colspan="2">Điều chỉnh học phí</th><th>Tổng học phí</th></tr></thead><tbody><tr><th rowspan="3" class="tuition-name">${e(person.fullName)}</th><td>${cell(stats.previousRegistered)}</td><td>${cell(stats.balance)}</td><td>${cell(attendanceCell(stats.madeUp,stats.madeUpDates))}</td><td>${cell(attendanceCell(stats.absent,stats.absentDates))}</td><td>${cell(stats.actual)}</td><td>${cell(config.note)}</td><td colspan="2">${money(config.adjustment||0)}<small>Trừ vào học phí tháng</small></td><td rowspan="3" class="tuition-total">${money(fee.total)}</td></tr><tr class="tuition-green"><th colspan="5">Số buổi đăng ký T${monthLabel(month)}</th><th>Học phí 1 buổi</th><th>Học phí tháng</th><th>Ghi chú / giảm trừ</th></tr><tr><td colspan="5"><strong>${stats.registered} buổi</strong></td><td>${money(config.unitFee)}</td><td>${money(fee.monthly)}</td><td>${money(config.adjustment||0)}</td></tr></tbody></table></div>`;
}

export function createTuitionFeature({state,dialog,openStudentForm,getStudentRoster}) {
  let accounts=[],loaded=false,error="",cached=false,selected="",selectedMonth=defaultBillingMonth(),query="",unsub=null,opened=new Set(),watchers=new Map(),weekRows=new Map(),weekErrors=new Map(),signature="",timer=null,pendingRender=null,loadTimer=null,pendingEntries=[],syncingPending=false;
  const visible=()=>location.hash==="#tuition";
  const account=()=>accounts.find(a=>a.id===selected);
  function leave() {for(const fn of watchers.values())fn();watchers.clear();weekRows.clear();weekErrors.clear();signature="";if(timer)clearInterval(timer);timer=null;if(pendingRender)clearTimeout(pendingRender);pendingRender=null;}
  function queueRender() {if(!visible()||pendingRender)return;pendingRender=setTimeout(()=>{pendingRender=null;if(visible())render();},60);}
  function stop() {unsub?.();unsub=null;if(loadTimer)clearTimeout(loadTimer);loadTimer=null;leave();accounts=[];loaded=false;error="";selected="";query="";opened.clear();pendingEntries=[];}
  function connectAccounts() {
    unsub?.();unsub=null;if(loadTimer)clearTimeout(loadTimer);
    loadTimer=setTimeout(()=>{if(!loaded){error="Firebase chưa phản hồi danh sách học phí sau 12 giây. Kiểm tra kết nối mạng rồi bấm Tải lại.";if(visible())render();}},12000);
    try {unsub=watchTuition((rows,fromCache)=>{if(loadTimer)clearTimeout(loadTimer);loadTimer=null;accounts=rows;loaded=true;cached=fromCache;error="";if(visible())render();},ex=>{if(loadTimer)clearTimeout(loadTimer);loadTimer=null;loaded=true;error=ex.message;if(visible())render();});}
    catch(ex){if(loadTimer)clearTimeout(loadTimer);loadTimer=null;loaded=true;error=ex.message;if(visible())render();}
  }
  function start() {stop();connectAccounts();}
  async function refreshPending(user=state.user){if(!user?.uid)return;pendingEntries=await listPending(user.uid);if(visible())render();}
  async function resumePending(user=state.user){if(!user?.uid||syncingPending)return;syncingPending=true;try{await refreshPending(user);if(!navigator.onLine||!pendingEntries.some(item=>item.kind==='tuition-month'&&item.status!=='conflict'))return;const result=await syncPendingTuition(user);await refreshPending(user);if(result.synced)toast(`Đã đồng bộ ${result.synced} phiếu học phí lưu tạm.`);if(result.conflicts)toast(`${result.conflicts} phiếu học phí có xung đột; bản local vẫn được giữ để đối chiếu.`,"error");}catch(ex){console.error('Không thể kiểm tra bản lưu tạm',ex);toast('Chưa thể kiểm tra bản lưu tạm: '+ex.message,'error');}finally{syncingPending=false;}}
  const personFor=a=>state.students.find(s=>s.id===a.studentId);
  function exportExcel(selectedAccount) {
    if(!loaded||error||!state.ready.students||!state.ready.templates||!state.ready.studentForms)return toast('Chờ danh sách học sinh và lịch mẫu tải đầy đủ trước khi xuất.','error');
    dialog('Xuất bảng học phí tháng',`<label>Tháng báo học phí<input type="month" name="month" value="${monthNow()}" min="2020-01" max="2100-12" required></label><p class="notice info">Một trang tính gồm STT, tên học sinh, số buổi đăng ký, học phí/buổi, thành tiền và dòng tổng của đúng tháng đã chọn. Bé thiếu đơn giá để trống tiền, không coi là 0 đồng.</p>`,async fd=>{
      const month=fd.get('month');let data;
      if(navigator.onLine){try{data=await loadTuitionExport(month);}catch(ex){if(!isQuotaExceeded(ex))throw ex;}}
      if(!data){const needed=state.weeks.filter(w=>dateKey(w.startDate)<=monthDates(month).at(-1)&&dateKey(w.endDate)>=month+'-01');if(!state.ready.weeks||!state.ready.holidays||needed.some(w=>!weekRows.has(w.id)||weekErrors.has(w.id)))throw new Error('Firebase hết hạn mức và thiết bị chưa có đủ lịch của tháng này để xuất chính xác. Mở tháng cần xuất khi còn kết nối rồi thử lại.');data={accounts,students:state.students,templates:state.templates,weeks:state.weeks,holidays:state.holidays,sessions:needed.flatMap(w=>weekRows.get(w.id).rows)};}
      if(pendingEntries.some(item=>item.kind==='tuition-month'&&item.month===month))data={...data,accounts:data.accounts.map(account=>{const pending=pendingEntries.find(item=>item.kind==='tuition-month'&&item.accountId===account.id&&item.month===month);return pending?{...account,months:{...account.months,[month]:{...account.months?.[month],...pending.values,unitFee:pending.values.unitFee===''?null:Number(pending.values.unitFee),adjustment:Number(pending.values.adjustment||0)}}}:account;})};
      const rows=exportTuitionRoster(data,month,getStudentRoster());
      if(!rows.length)throw new Error('Không có hồ sơ để xuất.');
      const {downloadTuitionMonthSummaryXlsx}=await import('./tuition-month-summary-export.js?v=20261001-2');
      await downloadTuitionMonthSummaryXlsx(rows,data,month);
      toast(`Đã xuất bảng ${rows.length} học sinh · tháng ${monthLabel(month)}.${pendingEntries.some(item=>item.kind==='tuition-month'&&item.month===month)?' Có dữ liệu local chưa đồng bộ.':''}`);
    },'');
    document.querySelector('#dialogSubmit').textContent='Xuất Excel';
  }
  const configFor=(a,month)=>{const base=tuitionConfig(a,month),pending=pendingEntries.find(item=>item.kind==='tuition-month'&&item.accountId===a.id&&item.month===month);return pending?{...base,...pending.values,unitFee:pending.values.unitFee===''?null:Number(pending.values.unitFee),adjustment:Number(pending.values.adjustment||0),localPending:true}:base;};
  function syncWeeks(includePrevious=false) {
    const months=includePrevious?[selectedMonth,previousMonth(selectedMonth)]:[selectedMonth];
    const ranges=months.map(month=>({start:month+"-01",end:monthDates(month).at(-1)}));
    const next=state.weeks.filter(w=>ranges.some(({start,end})=>dateKey(w.startDate)<=end&&dateKey(w.endDate)>=start));
    const key=months.join("|")+":"+next.map(w=>w.id).sort().join("|");
    if(key===signature&&watchers.size)return;
    signature=key;
    for(const [id,fn] of watchers)if(!next.some(w=>w.id===id)){fn();watchers.delete(id);weekRows.delete(id);weekErrors.delete(id);}
    for(const w of next)if(!watchers.has(w.id)) {
      watchers.set(w.id,watchTuitionWeek(w.id,(rows,fromCache)=>{weekRows.set(w.id,{rows,fromCache});weekErrors.delete(w.id);queueRender();},ex=>{weekErrors.set(w.id,ex.message);queueRender();}));
    }
    if(!timer)timer=setInterval(()=>{if(visible())render();},60000);
  }
  function statsFor(a,month) {
    const person=personFor(a);if(!person)return null;
    if(!state.ready.students||!state.ready.templates||!state.ready.weeks||!state.ready.holidays)return null;
    const required=state.weeks.filter(w=>dateKey(w.startDate)<=monthDates(month).at(-1)&&dateKey(w.endDate)>=month+"-01");
    if(required.some(w=>!weekRows.has(w.id)||weekErrors.has(w.id)))return null;
    return tuitionStats({person,month,sessions:required.flatMap(w=>weekRows.get(w.id).rows),weeks:state.weeks,templates:state.templates,holidays:state.holidays});
  }
  function savedStats(a,month) {const pending=pendingEntries.find(item=>item.kind==='tuition-month'&&item.accountId===a.id&&item.month===month);return pending?.values?.snapshot||(month<monthNow()&&a.months?.[month]?.snapshot?a.months[month].snapshot:statsFor(a,month));}
  function billingStatsFor(a,month,base=savedStats(a,month)) {return statsWithOverrides(tuitionBillingStats(a,month,base,m=>statsFor(a,m)),configFor(a,month).statsOverrides);}
  function summaryFor(a,month) {
    const source=(a.history||[]).filter(s=>s.month===month).sort((x,y)=>y.sourceRow-x.sourceRow)[0];
    const live=month>=monthNow()||!!a.months?.[month]?.snapshot||!!pendingEntries.find(item=>item.kind==='tuition-month'&&item.accountId===a.id&&item.month===month)||!source;
    if(!live)return source?{amount:typeof source.values?.[9]==="number"?source.values[9]:null,registered:source.fees?.[1]??null,source:true}:null;
    if(!personFor(a))return a.months?.[month]?{amount:null,registered:null,missing:true}:null;
    const stats=savedStats(a,month);
    if(!stats)return {amount:null,registered:null,pending:true};
    if(stats.registered<=0&&!a.months?.[month]&&!pendingEntries.some(item=>item.kind==='tuition-month'&&item.accountId===a.id&&item.month===month))return null;
    const config=configFor(a,month);
    return {amount:tuitionMoney(config.unitFee,stats.registered,config.adjustment||0).total,registered:stats.registered,missing:config.unitFee==null};
  }
  function editMonth(a,month) {
    const config=configFor(a,month),baseStats=savedStats(a,month),stats=billingStatsFor(a,month,baseStats),overrides=config.statsOverrides||{},attendanceMonth=previousMonth(month);
    if(!baseStats||!stats)return toast("Chờ lịch học tải đầy đủ trước khi sửa học phí.","error");
    const numberInput=(name,label,current)=>`<label>${label}<input type="number" name="${name}" min="0" max="10000" step="1" value="${overrides[name]??''}" placeholder="Tự động: ${current??'—'}"></label>`;
    const dateInput=(name,label,current=[])=>`<label>${label}<input name="${name}" value="${e((overrides[name]||[]).map(day=>day.split('-').reverse().join('/')).join(', '))}" placeholder="${e(current.map(day=>day.slice(8,10)+'/'+day.slice(5,7)).join(', ')||'Không có')}"></label>`;
    dialog(`Sửa phiếu học phí · ${monthLabel(month)}`,`<p>${e(personFor(a)?.fullName||a.displayName)} · <strong>${baseStats.registered} buổi đăng ký</strong></p><h3>Học phí</h3><div class="form-grid"><label>Học phí 1 buổi (đồng)<input type="number" name="unitFee" min="0" max="100000000" step="1" value="${config.unitFee??""}" placeholder="Chưa nhập"></label><label>Ghi chú / số tiền giảm trừ (đồng)<input type="number" name="adjustment" min="-1000000000" max="1000000000" step="1" value="${config.adjustment||0}"></label></div><p class="muted">Tổng = học phí 1 buổi × ${baseStats.registered} − giảm trừ. Nhập số âm nếu cần thu thêm.</p><label>Nội dung ghi chú<textarea name="note" maxlength="5000">${e(config.note||"")}</textarea></label><h3>Số liệu hiển thị trên phiếu</h3><p class="muted">Để trống để tiếp tục lấy tự động từ lịch. Các số dưới đây thuộc tháng ${monthLabel(attendanceMonth)}.</p><div class="form-grid">${numberInput('previousRegistered','Số buổi đăng ký tháng trước',stats.previousRegistered)}${month>=monthNow()?numberInput('balance','Số buổi vắng cần bù còn lại',stats.balance):''}${numberInput('madeUp','Số buổi đã bù',stats.madeUp)}${numberInput('absent','Số buổi nghỉ',stats.absent)}${numberInput('actual','Tổng buổi đã học',stats.actual)}${dateInput('madeUpDates','Ngày đã bù',stats.madeUpDates)}${dateInput('absentDates','Ngày nghỉ',stats.absentDates)}</div>${month>=monthNow()?'<p class="notice warning">Nếu nhập số buổi cần bù, giá trị này cũng được đồng bộ vào hồ sơ học sinh.</p>':''}<p class="notice info">Nếu Firebase vượt hạn mức, phiếu được lưu tạm trên thiết bị này và chờ đối chiếu khi đăng nhập lại.</p>`,async fd=>{
      const raw=Object.fromEntries(fd),statsOverrides={};
      for(const key of overrideNumberFields){if(raw[key]===undefined||raw[key]==='')continue;const parsed=Number(raw[key]);if(!Number.isSafeInteger(parsed)||parsed<0||parsed>10000)throw new Error('Số liệu báo cáo phải là số nguyên từ 0 đến 10.000.');statsOverrides[key]=parsed;}
      const madeUpDates=parseReportDates(raw.madeUpDates,attendanceMonth,'Ngày đã bù'),absentDates=parseReportDates(raw.absentDates,attendanceMonth,'Ngày nghỉ');
      if(madeUpDates)statsOverrides.madeUpDates=madeUpDates;if(absentDates)statsOverrides.absentDates=absentDates;
      const values={unitFee:raw.unitFee,adjustment:raw.adjustment,note:raw.note,statsOverrides,syncMakeupBalance:month>=monthNow()&&Object.hasOwn(statsOverrides,'balance'),snapshot:{...baseStats,capturedAt:new Date().toISOString()}},unit=values.unitFee===''?null:Number(values.unitFee),adjustment=Number(values.adjustment||0);
      if(unit!==null&&(!Number.isSafeInteger(unit)||unit<0||unit>100000000)||!Number.isSafeInteger(adjustment)||Math.abs(adjustment)>1000000000||String(values.note||'').length>5000)throw new Error('Học phí hoặc ghi chú không hợp lệ.');
      try{if(!navigator.onLine||cached||[...weekRows.values()].some(x=>x.fromCache))throw Object.assign(new Error('Chưa có kết nối Firebase mới nhất.'),{code:'offline'});await saveTuitionMonth(a,month,values,state.user);const pendingId=`tuition:${state.user.uid}:${a.id}:${month}`;if(pendingEntries.some(item=>item.id===pendingId)){await removePending(pendingId);pendingEntries=pendingEntries.filter(item=>item.id!==pendingId);}toast('Đã lưu học phí lên Firebase.');}
      catch(ex){if(!isQuotaExceeded(ex)&&ex.code!=='offline')throw ex;const pending=await queueTuitionMonth({uid:state.user.uid,accountId:a.id,month,baseRevision:a.months?.[month]?.revision||0,values});pendingEntries=[...pendingEntries.filter(item=>item.id!==pending.id),pending];toast('Đã lưu phiếu học phí tạm trên thiết bị này; chưa đồng bộ Firebase.',"error");queueRender();}
    },'');
  }
  async function exportJpg(a,month) {
    const person=personFor(a),source=(a.history||[]).filter(item=>item.month===month).sort((x,y)=>y.sourceRow-x.sourceRow)[0],base=person?savedStats(a,month):null;
    const live=month>=monthNow()||!!a.months?.[month]?.snapshot||!!pendingEntries.find(item=>item.kind==='tuition-month'&&item.accountId===a.id&&item.month===month)||!source;
    if(live&&!base)throw new Error('Chờ lịch học và hồ sơ học sinh tải đầy đủ trước khi lưu ảnh.');
    if(!base&&!source)throw new Error('Tháng này chưa có phiếu học phí để lưu ảnh.');
    const stats=live&&base?billingStatsFor(a,month,base):null;
    const config=live&&base?configFor(a,month):{};
    const status=config.localPending?'Chưa đồng bộ Firebase · dữ liệu lưu trên thiết bị':month===monthNow()?'Tháng hiện tại · tự cập nhật':month>monthNow()?'Dự báo học phí':base?'Bản lưu học phí':'Dữ liệu gốc Excel';
    const {tuitionJpgData,downloadTuitionJpg}=await import('./tuition-jpg.js?v=20261001-5');
    await downloadTuitionJpg(tuitionJpgData({name:person?.fullName||a.displayName,month,status,stats,config,source}));
  }
  function link(a) {
    const used=new Set(accounts.filter(x=>x.id!==a.id).map(x=>x.studentId)),people=state.students.filter(s=>!used.has(s.id)).sort((a,b)=>a.fullName.localeCompare(b.fullName,"vi"));
    dialog(`Liên kết học sinh · ${a.displayName}`,`<p class="notice warning">Chỉ chọn khi đây đúng là cùng một bé. Lịch sử và học phí gốc vẫn được giữ nguyên.</p><label>Tìm tên<input id="tuitionLinkSearch" type="search" placeholder="Nhập tên học sinh"></label><label>Học sinh có sẵn<select name="studentId" id="tuitionLinkSelect" required><option value="">Chọn học sinh…</option>${people.map(s=>`<option value="${e(s.id)}" ${s.id===a.studentId?"selected":""}>${e(s.fullName)}${s.active===false?" · Đã nghỉ / đợi lịch":""}</option>`).join("")}</select></label><p>Chưa có hồ sơ? <button id="tuitionCreateStudent" type="button" class="button ghost">Tạo học sinh mới</button></p>`,async fd=>linkTuition(a,fd.get("studentId"),state.user));
    document.querySelector("#tuitionLinkSearch").oninput=event=>{const q=normalizeName(event.target.value);for(const option of document.querySelector("#tuitionLinkSelect").options)option.hidden=!!option.value&&!normalizeName(option.textContent).includes(q);};
    document.querySelector("#tuitionCreateStudent").onclick=()=>openStudentForm({fullName:a.displayName});
  }
  function addAccount() {
    const used=new Set(accounts.map(a=>a.studentId)),people=state.students.filter(s=>!used.has(s.id));
    dialog("Thêm hồ sơ học phí",`<p>Chọn học sinh đã có dữ liệu. Nếu bé đã có phiếu Excel chưa liên kết, hãy liên kết phiếu đó thay vì tạo trùng.</p><label>Học sinh<select name="studentId" required><option value="">Chọn học sinh…</option>${people.map(s=>`<option value="${e(s.id)}">${e(s.fullName)}</option>`).join("")}</select></label>`,async fd=>{selected=await createTuitionAccount(state.students.find(s=>s.id===fd.get("studentId")),state.user);opened=new Set([selectedMonth]);render();});
  }
  function monthCard(a,month) {
    const current=monthNow(),source=(a.history||[]).filter(s=>s.month===month).sort((a,b)=>b.sourceRow-a.sourceRow),live=month>=current||!!a.months?.[month]?.snapshot||pendingEntries.some(item=>item.kind==='tuition-month'&&item.accountId===a.id&&item.month===month)||!source.length;
    const baseStats=live?savedStats(a,month):null,stats=billingStatsFor(a,month,baseStats),config=configFor(a,month),isCurrent=month===current;
return `<details class="tuition-month ${month>current?'tuition-forecast':''}" data-month="${month}" ${opened.has(month)?"open":""}><summary><span><strong>${title(month)}</strong><small>${config.localPending?"CHƯA ĐỒNG BỘ · lưu trên thiết bị":isCurrent?"Tháng hiện tại · tự cập nhật":month>current?"DỰ BÁO · dự tính theo lịch đăng ký":live?"Bản lưu học phí":"Dữ liệu gốc Excel"}</small></span><span>${live&&stats?money(tuitionMoney(config.unitFee,stats.registered,config.adjustment||0).total):source.length?money(typeof source[0].values[9]==="number"?source[0].values[9]:null):"—"} <span aria-hidden="true">⌄</span></span></summary><div class="tuition-month-body">${live?(!personFor(a)?`<p class="notice warning">Cần tạo thêm học sinh này hoặc liên kết hồ sơ có sẵn để tự cập nhật lịch và học phí.</p>`:!stats?`<p role="status">${weekErrors.size?"Không thể tải lịch. Vui lòng thử lại.":"Đang tải lịch học từ Firebase…"}</p>`:`${liveTable(personFor(a),month,stats,config)}<div class="tuition-card-actions"><p class="muted">01/${monthLabel(month)} – ${monthDates(month).length}/${monthLabel(month)} · ${stats.forecast||0} buổi từ lịch mẫu${config.snapshot&&month<current?` · Bản lưu ${new Date(config.snapshot.capturedAt).toLocaleString("vi-VN")}`:""}</p><button type="button" class="button primary" data-edit-fee="${month}">Sửa học phí / ghi chú</button></div>${config.unitFee==null?'<p class="notice warning">Chưa nhập học phí một buổi.</p>':""}<p class="tuition-explanation">Cột đăng ký tháng trước = số buổi đăng ký của tháng liền trước, không phải số buổi đã học. Học phí vẫn tính theo số buổi đăng ký của tháng đang xem. Cần bù = số dư còn lại trong hồ sơ (cộng dồn, cập nhật hiện tại). Đã bù, buổi nghỉ và tổng buổi đã học lấy từ tháng ${monthLabel(previousMonth(month))}; số buổi đăng ký và học phí lấy theo tháng ${monthLabel(month)}. Buổi đăng ký không gồm học bù, lịch test, buổi hủy và nghỉ lễ.</p><details class="tuition-dates"><summary>Xem ${stats.registered} ngày / giờ đăng ký</summary><div>${stats.dates.map(d=>`<span>${["CN","T2","T3","T4","T5","T6","T7"][new Date(d.date+"T12:00:00Z").getUTCDay()]} · ${d.date.split("-").reverse().join("/")} · ${e(d.start)}–${e(d.end)}</span>`).join("")||"Chưa có lịch đăng ký."}</div></details>`):""}${source.map((s,i)=>live?`<details class="tuition-source"><summary>Dữ liệu gốc Excel${source.length>1?` · bản ${i+1}, dòng ${s.sourceRow}`:""} (giữ nguyên)</summary>${sourceTable(s)}</details>`:sourceTable(s)).join("")}</div></details>`;
  }
  function renderContent() {
    if(!visible())return;
    const root=document.querySelector("#content"),focus=document.activeElement,wasSearch=focus?.id==="tuitionSearch",position=wasSearch?focus.selectionStart:0;
    const a=account();if(loaded&&!error&&state.ready.weeks)syncWeeks(!!a);
    const ordered=a?[]:orderTuitionAccounts(accounts,getStudentRoster());
    const summaries=ordered.map(person=>{try{return {person,fee:summaryFor(person,selectedMonth)}}catch(ex){console.error("Không tính được học phí",person.id,ex);return {person,fee:{amount:null,registered:null,missing:true,reason:ex.message}}}}).filter(item=>item.fee),known=summaries.filter(item=>item.fee.amount!=null),total=known.reduce((sum,item)=>sum+item.fee.amount,0),unknown=summaries.length-known.length;
    const monthEnd=monthDates(selectedMonth).at(-1),neededWeeks=state.weeks.filter(w=>dateKey(w.startDate)<=monthEnd&&dateKey(w.endDate)>=selectedMonth+"-01"),pendingWeeks=neededWeeks.filter(w=>!weekRows.has(w.id)&&!weekErrors.has(w.id));
    const loadingNote=weekErrors.size?`<p class="notice warning" role="alert">Không tải được ${weekErrors.size} tuần: ${e([...weekErrors.values()].join("; "))}. Bấm “Tải lại” để thử lại; tổng chưa đầy đủ.</p>`:pendingWeeks.length?`<p class="notice info" role="status">Đang tải lịch ${neededWeeks.length-pendingWeeks.length}/${neededWeeks.length} tuần của ${title(selectedMonth)}. Tổng học phí sẽ cập nhật khi đủ lịch.</p>`:"";
    const heading=`<div class="tuition-heading"><div><p class="eyebrow">HAPPY CHILD</p><h2>${a?e(personFor(a)?.fullName||a.displayName):"Báo học phí học sinh"}</h2><p class="muted">${a?`Tên trên Excel: ${e(a.displayName)}`:"Phiếu từng tháng · liên kết lịch học và hồ sơ học sinh"}</p></div><div class="tuition-actions">${a?'<button class="button ghost" id="tuitionBack">← Danh sách</button><button class="button ghost" id="tuitionLink">Liên kết học sinh</button><button class="button ghost" id="tuitionAddMonth">＋ Thêm tháng</button>':'<button class="button primary" id="tuitionAdd">＋ Thêm hồ sơ</button>'}<button class="button primary" id="tuitionExport">Xuất Excel</button><button class="button ghost" id="tuitionRefresh">↻ Tải lại</button></div></div>`;
    const pendingTuition=pendingEntries.filter(item=>item.kind==='tuition-month'),pendingNote=pendingTuition.length?`<div class="notice warning" role="status"><strong>${pendingTuition.length} phiếu học phí lưu trên thiết bị chưa đồng bộ.</strong> ${pendingTuition.some(item=>item.status==='conflict')?'Có phiếu xung đột: bản Firebase đã thay đổi, không tự ghi đè.':'Hệ thống sẽ thử đồng bộ khi Firebase hoạt động lại.'} <button type="button" class="button ghost small" id="tuitionSyncPending">Thử đồng bộ</button></div>`:'';
    const billingMonth=defaultBillingMonth(),monthOptions=[...new Set([billingMonth,monthNow(),selectedMonth,...accounts.flatMap(person=>[...Object.keys(person.months||{}),...(person.history||[]).map(item=>item?.month)].filter(month=>typeof month==="string"&&/^\d{4}-(0[1-9]|1[0-2])$/.test(month)))])].filter(month=>month<=billingMonth||month===selectedMonth).sort((x,y)=>y.localeCompare(x));
root.innerHTML=`<section class="tuition-view">${heading}${pendingNote}<div class="tuition-month-picker"><label>Tháng báo học phí<select id="tuitionSelectedMonth">${monthOptions.map(month=>`<option value="${month}" ${month===selectedMonth?"selected":""}>${title(month)}${month===billingMonth&&month>monthNow()?" · Thu trước":""}</option>`).join("")}</select></label></div>${error?`<p class="notice warning" role="alert">Không thể tải báo học phí: ${e(error)}</p>`:!loaded?'<p role="status">Đang tải báo học phí…</p>':`${cached?'<p class="notice warning">Đang hiển thị bản lưu trên thiết bị. Chờ kết nối Firebase để có dữ liệu mới nhất.</p>':""}${loadingNote}${a?`${!personFor(a)?'<div class="notice warning"><strong>Cần tạo thêm học sinh này</strong><p>Chưa có hồ sơ liên kết. Bấm “Liên kết học sinh” để chọn bé có sẵn hoặc tạo hồ sơ mới. Phiếu Excel vẫn được giữ nguyên.</p></div>':""}${[...weekRows.values()].some(x=>x.fromCache)?'<p class="notice warning">Một phần lịch đang lấy từ bộ nhớ thiết bị; số liệu có thể chưa mới nhất.</p>':""}<div class="tuition-months">${monthCard(a,selectedMonth)}</div>`:`<div class="tuition-summary"><span>${title(selectedMonth)} · ${summaries.length} học sinh</span><strong>${money(total)}</strong><small>${unknown?`${unknown} hồ sơ chưa có tổng chính xác (thiếu đơn giá, liên kết hoặc đang tải lịch).`:"Tổng tự cập nhật khi học phí hoặc lịch đăng ký thay đổi."}</small></div><div class="tuition-toolbar"><label>Tìm học sinh<input id="tuitionSearch" type="search" placeholder="Tên trên Excel hoặc tên trong hồ sơ…" value="${e(query)}"></label><span class="badge">${summaries.length} hồ sơ trong tháng</span></div><div class="tuition-roster">${summaries.map(({person,fee})=>`<button class="tuition-person ${personFor(person)?"":"unlinked"}" data-tuition-id="${e(person.id)}" data-search="${e(normalizeName(person.displayName+" "+(personFor(person)?.fullName||"")))}"><span class="tuition-person-icon" aria-hidden="true">${e(person.rosterNumber||"—")}</span><strong>${e(personFor(person)?.fullName||person.displayName)}</strong><span class="tuition-person-fee">${money(fee.amount)}<small>${fee.reason?e(fee.reason):fee.pending?"Đang tải lịch":fee.missing?"Cần nhập học phí / liên kết":fee.registered!=null?`${fee.registered} buổi đăng ký`:"Phiếu Excel"}</small></span><span aria-hidden="true">→</span></button>`).join("")}<p class="muted" id="tuitionSearchEmpty" hidden>Không tìm thấy học sinh trong tháng này.</p>${summaries.length?"":'<p class="muted">Không có học sinh đóng học phí trong tháng này.</p>'}</div>`}`}</section>`;
    root.querySelector("#tuitionSelectedMonth")?.addEventListener("change",event=>{selectedMonth=event.target.value;opened=new Set([selectedMonth]);leave();render();});
    root.querySelector("#tuitionSyncPending")?.addEventListener("click",()=>resumePending(state.user));
    const filterRoster=()=>{const needle=normalizeName(query),rows=[...root.querySelectorAll(".tuition-roster [data-tuition-id]")];let visibleCount=0;for(const row of rows){row.hidden=!!needle&&!row.dataset.search.includes(needle);if(!row.hidden)visibleCount++;}const emptyRow=root.querySelector("#tuitionSearchEmpty");if(emptyRow)emptyRow.hidden=!needle||visibleCount>0;};
    root.querySelector("#tuitionSearch")?.addEventListener("input",event=>{query=event.target.value;filterRoster();});
    filterRoster();
    if(wasSearch){const input=root.querySelector("#tuitionSearch");input?.focus();input?.setSelectionRange(position,position);}
    root.querySelectorAll("[data-tuition-id]").forEach(b=>b.onclick=()=>{selected=b.dataset.tuitionId;opened=new Set([selectedMonth]);render();});
    root.querySelector("#tuitionBack")?.addEventListener("click",()=>{selected="";opened.clear();render();});
    root.querySelector("#tuitionLink")?.addEventListener("click",()=>link(a));
    root.querySelector("#tuitionAdd")?.addEventListener("click",addAccount);
    root.querySelector("#tuitionExport")?.addEventListener("click",()=>exportExcel(a));
    root.querySelector("#tuitionRefresh")?.addEventListener("click",()=>{leave();loaded=false;error="";connectAccounts();render();});
    root.querySelectorAll("[data-month]").forEach(d=>d.ontoggle=()=>{if(d.open)opened.add(d.dataset.month);else opened.delete(d.dataset.month);});
    root.querySelectorAll("[data-edit-fee]").forEach(b=>b.onclick=()=>editMonth(a,b.dataset.editFee));
    root.querySelectorAll('.tuition-month').forEach(card=>{
      if(!a)return;
      let actions=card.querySelector('.tuition-card-actions');
      if(!actions&&card.querySelector('.tuition-month-body > .tuition-sheet-scroll')){actions=document.createElement('div');actions.className='tuition-card-actions';card.querySelector('.tuition-month-body').append(actions);}
      if(!actions)return;
      const month=card.dataset.month;
      if(!month)return;
      const button=document.createElement('button');button.type='button';button.className='button ghost';button.textContent='Lưu ảnh JPG';button.setAttribute('aria-label',`Lưu ảnh JPG học phí ${personFor(a)?.fullName||a.displayName} tháng ${monthLabel(month)}`);
      button.onclick=async()=>{button.disabled=true;try{await exportJpg(a,month);toast('Đã lưu ảnh JPG học phí tháng '+monthLabel(month)+'.')}catch(error){toast(error.message||'Không thể lưu ảnh JPG.','error')}finally{button.disabled=false}};
      actions.append(button);
    });
    root.querySelector("#tuitionAddMonth")?.addEventListener("click",()=>dialog("Thêm tháng báo học phí",`<label>Tháng<input name="month" type="month" value="${monthNow()}" required min="2020-01" max="2100-12"></label><p>Chỉ kế thừa đơn giá; ghi chú và giảm trừ bắt đầu trống. Không ghi đè phiếu đã có.</p>`,async fd=>{const m=fd.get("month");if(a.months?.[m]||(a.history||[]).some(s=>s.month===m))throw new Error("Tháng này đã có trong hồ sơ.");await saveTuitionMonth(a,m,configFor(a,m),state.user);opened.add(m);}));
  }
  function render() {
    try {renderContent();}
    catch(ex) {
      console.error("Không thể hiển thị Báo học phí",ex);
      const root=document.querySelector("#content");
      if(root&&visible())root.innerHTML=`<section class="tuition-view"><h2>Báo học phí</h2><p class="notice warning" role="alert">Không thể hiển thị dữ liệu: ${e(ex.message||String(ex))}</p><button type="button" class="button ghost" id="tuitionRetryRender">↻ Thử lại</button></section>`;
      root?.querySelector("#tuitionRetryRender")?.addEventListener("click",render);
    }
  }
  return {start,stop,leave,render,resumePending,refreshPending};
}
