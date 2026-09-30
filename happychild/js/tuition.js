import {monthNow,monthDates,monthLabel,previousMonth,previousRegistered,nextMonth,orderTuitionAccounts,tuitionConfig,dateKey,orderedMonths,normalizeName,tuitionMoney,tuitionStats,tuitionBillingStats} from "./tuition-model.js?v=20260930-6";
import {watchTuition,watchTuitionWeek,linkTuition,saveTuitionMonth,createTuitionAccount,loadTuitionExport} from "./tuition-store.js?v=20260930-3";
import {exportTuitionRoster} from "./tuition-export-roster.js?v=20260930-1";
import {escapeHtml as e,toast} from "./utils.js?v=20260913-25";

const money=value=>value==null?"—":new Intl.NumberFormat("vi-VN").format(value)+" ₫";
const cell=value=>e(value==null||value===""?"—":value);
const title=month=>`Tháng ${monthLabel(month)}`;
function sourceTable(source) {
  const v=source.values||[],f=source.fees||[],labels=source.labels||[],fee=source.feeLabels||[];
  return `<div class="tuition-sheet-scroll" tabindex="0" aria-label="Phiếu gốc Excel, cuộn ngang để xem đầy đủ"><table class="tuition-sheet"><thead><tr>${labels.map((x,i)=>i===8?"":`<th ${i===7?'colspan="2"':""}>${cell(x)}</th>`).join("")}</tr></thead><tbody><tr><th rowspan="3" class="tuition-name">${cell(v[0])}</th>${v.slice(1,7).map(x=>`<td>${cell(x)}</td>`).join("")}<td colspan="2">${cell(v[7])}</td><td rowspan="3" class="tuition-total">${typeof v[9]==="number"?money(v[9]):cell(v[9])}</td></tr><tr class="tuition-green"><th colspan="5">${cell(fee[1])}</th><th>${cell(fee[6])}</th><th>${cell(fee[7])}</th><th>${cell(fee[8])}</th></tr><tr><td colspan="5">${cell(f[1])}</td><td>${typeof f[6]==="number"?money(f[6]):cell(f[6])}</td><td>${typeof f[7]==="number"?money(f[7]):cell(f[7])}</td><td>${cell(f[8])}</td></tr></tbody></table></div>`;
}
function liveTable(person,month,stats,config) {
  const fee=tuitionMoney(config.unitFee,stats.registered,config.adjustment||0);
  return `<div class="tuition-sheet-scroll" tabindex="0" aria-label="Bảng báo học phí, cuộn ngang để xem đầy đủ"><table class="tuition-sheet"><thead><tr><th>Tên trẻ</th><th>Số buổi đăng ký T${Number(previousMonth(month).slice(5))}</th><th>Số buổi vắng<br><small>Cần bù còn lại</small></th><th>Số buổi đã bù T${monthLabel(previousMonth(month))}</th><th>Buổi nghỉ T${monthLabel(previousMonth(month))}</th><th>Tổng buổi đã học T${monthLabel(previousMonth(month))}</th><th>Ghi chú</th><th colspan="2">Điều chỉnh học phí</th><th>Tổng học phí</th></tr></thead><tbody><tr><th rowspan="3" class="tuition-name">${e(person.fullName)}</th><td>${cell(stats.previousRegistered)}</td><td>${cell(stats.balance)}</td><td>${cell(stats.madeUp)}</td><td>${cell(stats.absent)}</td><td>${cell(stats.actual)}</td><td>${cell(config.note)}</td><td colspan="2">${money(config.adjustment||0)}<small>Trừ vào học phí tháng</small></td><td rowspan="3" class="tuition-total">${money(fee.total)}</td></tr><tr class="tuition-green"><th colspan="5">Số buổi đăng ký T${monthLabel(month)}</th><th>Học phí 1 buổi</th><th>Học phí tháng</th><th>Ghi chú / giảm trừ</th></tr><tr><td colspan="5"><strong>${stats.registered} buổi</strong></td><td>${money(config.unitFee)}</td><td>${money(fee.monthly)}</td><td>${money(config.adjustment||0)}</td></tr></tbody></table></div>`;
}

export function createTuitionFeature({state,dialog,openStudentForm,getStudentRoster}) {
  let accounts=[],loaded=false,error="",cached=false,selected="",selectedMonth=nextMonth(monthNow()),query="",unsub=null,opened=new Set(),watchers=new Map(),weekRows=new Map(),weekErrors=new Map(),signature="",timer=null,pendingRender=null,loadTimer=null;
  const visible=()=>location.hash==="#tuition";
  const account=()=>accounts.find(a=>a.id===selected);
  function leave() {for(const fn of watchers.values())fn();watchers.clear();weekRows.clear();weekErrors.clear();signature="";if(timer)clearInterval(timer);timer=null;if(pendingRender)clearTimeout(pendingRender);pendingRender=null;}
  function queueRender() {if(!visible()||pendingRender)return;pendingRender=setTimeout(()=>{pendingRender=null;if(visible())render();},60);}
  function stop() {unsub?.();unsub=null;if(loadTimer)clearTimeout(loadTimer);loadTimer=null;leave();accounts=[];loaded=false;error="";selected="";query="";opened.clear();}
  function connectAccounts() {
    unsub?.();unsub=null;if(loadTimer)clearTimeout(loadTimer);
    loadTimer=setTimeout(()=>{if(!loaded){error="Firebase chưa phản hồi danh sách học phí sau 12 giây. Kiểm tra kết nối mạng rồi bấm Tải lại.";if(visible())render();}},12000);
    try {unsub=watchTuition((rows,fromCache)=>{if(loadTimer)clearTimeout(loadTimer);loadTimer=null;accounts=rows;loaded=true;cached=fromCache;error="";if(visible())render();},ex=>{if(loadTimer)clearTimeout(loadTimer);loadTimer=null;loaded=true;error=ex.message;if(visible())render();});}
    catch(ex){if(loadTimer)clearTimeout(loadTimer);loadTimer=null;loaded=true;error=ex.message;if(visible())render();}
  }
  function start() {stop();connectAccounts();}
  const personFor=a=>state.students.find(s=>s.id===a.studentId);
  function exportExcel(selectedAccount) {
    if(!loaded||error||!state.ready.students||!state.ready.templates||!state.ready.studentForms)return toast('Chờ danh sách học sinh và lịch mẫu tải đầy đủ trước khi xuất.','error');
    dialog('Xuất Excel báo học phí',`<label>Tháng báo học phí<input type="month" name="month" value="${nextMonth(monthNow())}" min="2020-01" max="2100-12" required></label><p class="notice info">Xuất tất cả học sinh đang học trong tháng đã chọn, kể cả bé ngừng học giữa tháng có lịch học. Mỗi bé một trang tính theo phiếu mẫu: tháng chọn ở đầu, tô vàng cam; các tháng trước nằm bên dưới. Thứ tự giống tab Học sinh. Bé chưa có hồ sơ học phí vẫn được xuất, đơn giá để trống.</p><p class="muted">Đọc dữ liệu mới từ Firebase. Giữ nguyên phiếu gốc Excel; không sửa dữ liệu đã lưu.</p>`,async fd=>{
      if(!navigator.onLine)throw new Error('Cần kết nối mạng để xuất số liệu mới nhất từ Firebase.');
      const month=fd.get('month'),data=await loadTuitionExport(month),rows=exportTuitionRoster(data,month,getStudentRoster());
      if(!rows.length)throw new Error('Không có hồ sơ để xuất.');
      const {downloadTuitionCardsXlsx}=await import('./tuition-card-export.js?v=20260930-2');
      await downloadTuitionCardsXlsx(rows,data,month);
      toast(`Đã xuất ${rows.length} hồ sơ · ${monthLabel(month)} và lịch sử các tháng trước.`);
    },'');
    document.querySelector('#dialogSubmit').textContent='Xuất Excel';
  }
  const configFor=tuitionConfig;
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
  function savedStats(a,month) {return month<monthNow()&&a.months?.[month]?.snapshot?a.months[month].snapshot:statsFor(a,month);}
  function summaryFor(a,month) {
    const source=(a.history||[]).filter(s=>s.month===month).sort((x,y)=>y.sourceRow-x.sourceRow)[0];
    const live=month>=monthNow()||!!a.months?.[month]?.snapshot||!source;
    if(!live)return source?{amount:typeof source.values?.[9]==="number"?source.values[9]:null,registered:source.fees?.[1]??null,source:true}:null;
    if(!personFor(a))return a.months?.[month]?{amount:null,registered:null,missing:true}:null;
    const stats=savedStats(a,month);
    if(!stats)return {amount:null,registered:null,pending:true};
    if(stats.registered<=0&&!a.months?.[month])return null;
    const config=configFor(a,month);
    return {amount:tuitionMoney(config.unitFee,stats.registered,config.adjustment||0).total,registered:stats.registered,missing:config.unitFee==null};
  }
  function editMonth(a,month) {
    const config=configFor(a,month),stats=savedStats(a,month);
    if(!stats)return toast("Chờ lịch học tải đầy đủ trước khi sửa học phí.","error");
    dialog(`Học phí · ${monthLabel(month)}`,`<p>${e(personFor(a)?.fullName||a.displayName)} · <strong>${stats.registered} buổi đăng ký</strong></p><div class="form-grid"><label>Học phí 1 buổi (đồng)<input type="number" name="unitFee" min="0" max="100000000" step="1" value="${config.unitFee??""}" placeholder="Chưa nhập"></label><label>Ghi chú / số tiền giảm trừ (đồng)<input type="number" name="adjustment" min="-1000000000" max="1000000000" step="1" value="${config.adjustment||0}"></label></div><p class="muted">Tổng = học phí 1 buổi × ${stats.registered} − giảm trừ. Nhập số âm nếu cần thu thêm. Không tự chuyển giảm trừ sang tháng sau.</p><label>Nội dung ghi chú<textarea name="note" maxlength="5000">${e(config.note||"")}</textarea></label><p class="notice info">Lưu trực tiếp lên Firebase. Bản số liệu tại thời điểm lưu được giữ để tra cứu khi tháng này đã qua; không sửa lịch học hoặc số buổi cần bù.</p>`,async fd=>{
      if(!navigator.onLine||cached||[...weekRows.values()].some(x=>x.fromCache))throw new Error("Chờ tải dữ liệu mới nhất từ Firebase trước khi lưu học phí.");
      await saveTuitionMonth(a,month,{...Object.fromEntries(fd),snapshot:{...stats,capturedAt:new Date().toISOString()}},state.user);
    });
  }
  function link(a) {
    const used=new Set(accounts.filter(x=>x.id!==a.id).map(x=>x.studentId)),people=state.students.filter(s=>!used.has(s.id)).sort((a,b)=>a.fullName.localeCompare(b.fullName,"vi"));
    dialog(`Liên kết học sinh · ${a.displayName}`,`<p class="notice warning">Chỉ chọn khi đây đúng là cùng một bé. Lịch sử và học phí gốc vẫn được giữ nguyên.</p><label>Tìm tên<input id="tuitionLinkSearch" type="search" placeholder="Nhập tên học sinh"></label><label>Học sinh có sẵn<select name="studentId" id="tuitionLinkSelect" required><option value="">Chọn học sinh…</option>${people.map(s=>`<option value="${e(s.id)}" ${s.id===a.studentId?"selected":""}>${e(s.fullName)}${s.active===false?" · Đã nghỉ / đợi lịch":""}</option>`).join("")}</select></label><p>Chưa có hồ sơ? <button id="tuitionCreateStudent" type="button" class="button ghost">Tạo học sinh mới</button></p>`,async fd=>linkTuition(a,fd.get("studentId"),state.user));
    document.querySelector("#tuitionLinkSearch").oninput=event=>{const q=normalizeName(event.target.value);for(const option of document.querySelector("#tuitionLinkSelect").options)option.hidden=!!option.value&&!normalizeName(option.textContent).includes(q);};
    document.querySelector("#tuitionCreateStudent").onclick=()=>openStudentForm({fullName:a.displayName});
  }
  function addAccount() {
    const used=new Set(accounts.map(a=>a.studentId)),people=state.students.filter(s=>!used.has(s.id));
    dialog("Thêm hồ sơ học phí",`<p>Chọn học sinh đã có dữ liệu. Nếu bé đã có phiếu Excel chưa liên kết, hãy liên kết phiếu đó thay vì tạo trùng.</p><label>Học sinh<select name="studentId" required><option value="">Chọn học sinh…</option>${people.map(s=>`<option value="${e(s.id)}">${e(s.fullName)}</option>`).join("")}</select></label>`,async fd=>{selected=await createTuitionAccount(state.students.find(s=>s.id===fd.get("studentId")),state.user);opened=new Set([nextMonth(monthNow())]);render();});
  }
  function monthCard(a,month) {
    const current=monthNow(),source=(a.history||[]).filter(s=>s.month===month).sort((a,b)=>b.sourceRow-a.sourceRow),live=month>=current||!!a.months?.[month]?.snapshot||!source.length;
    const baseStats=live?savedStats(a,month):null,stats=tuitionBillingStats(a,month,baseStats,m=>statsFor(a,m)),config=configFor(a,month),isCurrent=month===current;
    return `<details class="tuition-month ${month>current?'tuition-forecast':''}" data-month="${month}" ${opened.has(month)?"open":""}><summary><span><strong>${title(month)}</strong><small>${isCurrent?"Tháng hiện tại · tự cập nhật":month>current?"DỰ BÁO · dự tính theo lịch đăng ký":live?"Bản lưu học phí":"Dữ liệu gốc Excel"}</small></span><span>${live&&stats?money(tuitionMoney(config.unitFee,stats.registered,config.adjustment||0).total):source.length?money(typeof source[0].values[9]==="number"?source[0].values[9]:null):"—"} <span aria-hidden="true">⌄</span></span></summary><div class="tuition-month-body">${live?(!personFor(a)?`<p class="notice warning">Cần tạo thêm học sinh này hoặc liên kết hồ sơ có sẵn để tự cập nhật lịch và học phí.</p>`:!stats?`<p role="status">${weekErrors.size?"Không thể tải lịch. Vui lòng thử lại.":"Đang tải lịch học từ Firebase…"}</p>`:`${liveTable(personFor(a),month,stats,config)}<div class="tuition-card-actions"><p class="muted">01/${monthLabel(month)} – ${monthDates(month).length}/${monthLabel(month)} · ${stats.forecast||0} buổi từ lịch mẫu${config.snapshot&&month<current?` · Bản lưu ${new Date(config.snapshot.capturedAt).toLocaleString("vi-VN")}`:""}</p><button type="button" class="button primary" data-edit-fee="${month}">Sửa học phí / ghi chú</button></div>${config.unitFee==null?'<p class="notice warning">Chưa nhập học phí một buổi.</p>':""}<p class="tuition-explanation">Cột đăng ký tháng trước = số buổi đăng ký của tháng liền trước, không phải số buổi đã học. Học phí vẫn tính theo số buổi đăng ký của tháng đang xem. Cần bù = số dư còn lại trong hồ sơ (cộng dồn, cập nhật hiện tại). Đã bù, buổi nghỉ và tổng buổi đã học lấy từ tháng ${monthLabel(previousMonth(month))}; số buổi đăng ký và học phí lấy theo tháng ${monthLabel(month)}. Buổi đăng ký không gồm học bù, lịch test, buổi hủy và nghỉ lễ.</p><details class="tuition-dates"><summary>Xem ${stats.registered} ngày / giờ đăng ký</summary><div>${stats.dates.map(d=>`<span>${["CN","T2","T3","T4","T5","T6","T7"][new Date(d.date+"T12:00:00Z").getUTCDay()]} · ${d.date.split("-").reverse().join("/")} · ${e(d.start)}–${e(d.end)}</span>`).join("")||"Chưa có lịch đăng ký."}</div></details>`):""}${source.map((s,i)=>live?`<details class="tuition-source"><summary>Dữ liệu gốc Excel${source.length>1?` · bản ${i+1}, dòng ${s.sourceRow}`:""} (giữ nguyên)</summary>${sourceTable(s)}</details>`:sourceTable(s)).join("")}</div></details>`;
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
    const monthOptions=[...new Set([nextMonth(monthNow()),monthNow(),selectedMonth,...accounts.flatMap(person=>[...Object.keys(person.months||{}),...(person.history||[]).map(item=>item?.month)].filter(month=>typeof month==="string"&&/^\d{4}-(0[1-9]|1[0-2])$/.test(month)))])].sort((x,y)=>y.localeCompare(x));
root.innerHTML=`<section class="tuition-view">${heading}<div class="tuition-month-picker"><label>Tháng báo học phí<select id="tuitionSelectedMonth">${monthOptions.map(month=>`<option value="${month}" ${month===selectedMonth?"selected":""}>${title(month)}${month===nextMonth(monthNow())?" · Thu trước":""}</option>`).join("")}</select></label></div>${error?`<p class="notice warning" role="alert">Không thể tải báo học phí: ${e(error)}</p>`:!loaded?'<p role="status">Đang tải báo học phí…</p>':`${cached?'<p class="notice warning">Đang hiển thị bản lưu trên thiết bị. Chờ kết nối Firebase để có dữ liệu mới nhất.</p>':""}${loadingNote}${a?`${!personFor(a)?'<div class="notice warning"><strong>Cần tạo thêm học sinh này</strong><p>Chưa có hồ sơ liên kết. Bấm “Liên kết học sinh” để chọn bé có sẵn hoặc tạo hồ sơ mới. Phiếu Excel vẫn được giữ nguyên.</p></div>':""}${[...weekRows.values()].some(x=>x.fromCache)?'<p class="notice warning">Một phần lịch đang lấy từ bộ nhớ thiết bị; số liệu có thể chưa mới nhất.</p>':""}<div class="tuition-months">${monthCard(a,selectedMonth)}</div>`:`<div class="tuition-summary"><span>${title(selectedMonth)} · ${summaries.length} học sinh</span><strong>${money(total)}</strong><small>${unknown?`${unknown} hồ sơ chưa có tổng chính xác (thiếu đơn giá, liên kết hoặc đang tải lịch).`:"Tổng tự cập nhật khi học phí hoặc lịch đăng ký thay đổi."}</small></div><div class="tuition-toolbar"><label>Tìm học sinh<input id="tuitionSearch" type="search" placeholder="Tên trên Excel hoặc tên trong hồ sơ…" value="${e(query)}"></label><span class="badge">${summaries.length} hồ sơ trong tháng</span></div><div class="tuition-roster">${summaries.filter(({person})=>normalizeName(person.displayName+" "+(personFor(person)?.fullName||"")).includes(normalizeName(query))).map(({person,fee})=>`<button class="tuition-person ${personFor(person)?"":"unlinked"}" data-tuition-id="${e(person.id)}"><span class="tuition-person-icon" aria-hidden="true">${e(person.rosterNumber||"—")}</span><strong>${e(personFor(person)?.fullName||person.displayName)}</strong><span class="tuition-person-fee">${money(fee.amount)}<small>${fee.reason?e(fee.reason):fee.pending?"Đang tải lịch":fee.missing?"Cần nhập học phí / liên kết":fee.registered!=null?`${fee.registered} buổi đăng ký`:"Phiếu Excel"}</small></span><span aria-hidden="true">→</span></button>`).join("")||'<p class="muted">Không có học sinh đóng học phí trong tháng này.</p>'}</div>`}`}</section>`;
    root.querySelector("#tuitionSelectedMonth")?.addEventListener("change",event=>{selectedMonth=event.target.value;opened=new Set([selectedMonth]);leave();render();});
    root.querySelector("#tuitionSearch")?.addEventListener("input",event=>{query=event.target.value;render();});
    if(wasSearch){const input=root.querySelector("#tuitionSearch");input?.focus();input?.setSelectionRange(position,position);}
    root.querySelectorAll("[data-tuition-id]").forEach(b=>b.onclick=()=>{selected=b.dataset.tuitionId;opened=new Set([selectedMonth]);render();});
    root.querySelector("#tuitionBack")?.addEventListener("click",()=>{selected="";opened.clear();render();});
    root.querySelector("#tuitionLink")?.addEventListener("click",()=>link(a));
    root.querySelector("#tuitionAdd")?.addEventListener("click",addAccount);
    root.querySelector("#tuitionExport")?.addEventListener("click",()=>exportExcel(a));
    root.querySelector("#tuitionRefresh")?.addEventListener("click",()=>{leave();loaded=false;error="";connectAccounts();render();});
    root.querySelectorAll("[data-month]").forEach(d=>d.ontoggle=()=>{if(d.open)opened.add(d.dataset.month);else opened.delete(d.dataset.month);});
    root.querySelectorAll("[data-edit-fee]").forEach(b=>b.onclick=()=>editMonth(a,b.dataset.editFee));
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
  return {start,stop,leave,render};
}
