import {escapeHtml as e} from './utils.js?v=20260913-25';
export function localBalanceTable(entries,month,accounts=[],selected=''){
 const rows=entries.filter(p=>p.kind==='tuition-balance'&&p.status!=='protected'&&p.month===month&&(!selected||p.accountId===selected));
 if(!rows.length)return '';
 return `<details class="card" aria-label="Số dư cần bù lưu local" ${selected||!accounts.length?'open':''}><summary><strong>${rows.length} số dư cần bù lưu trên thiết bị · ${e(month)}</strong></summary><p>Hiển thị độc lập với Firebase. Chưa đồng bộ, chưa phải số đã chốt trên máy chủ.</p><div class="tuition-sheet-scroll"><table class="tuition-sheet"><thead><tr><th>Học sinh</th><th>Cần bù còn lại</th><th>Trạng thái</th></tr></thead><tbody>${rows.map(p=>`<tr><th>${e(accounts.find(a=>a.id===p.accountId)?.displayName||p.displayName||p.accountId)}</th><td><strong>${p.values.value} buổi</strong></td><td>${p.status==='conflict'?'Có xung đột — cần đối chiếu':'Chưa đồng bộ'}</td></tr>`).join('')}</tbody></table></div></details>`;
}
