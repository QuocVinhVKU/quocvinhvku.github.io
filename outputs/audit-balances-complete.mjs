import fs from 'node:fs';
import {reconcileBalances,importedCount} from '../happychild/js/tuition-reconcile.js';
const data=JSON.parse(fs.readFileSync('C:/Users/kurob/Downloads/happychild-audit-complete.json','utf8'));
const backup=JSON.parse(fs.readFileSync(new URL('./tuition-october-recovery-source.json',import.meta.url),'utf8'));
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]/g,'');
const rows=data.accounts.map(a=>{
 const person=data.students.find(s=>s.id===a.studentId),local=data.pending.filter(p=>p.kind==='tuition-balance'&&p.accountId===a.id);
 const source=[...(a.history||[])].filter(h=>h.month==='2026-09').sort((a,b)=>b.sourceRow-a.sourceRow)[0];
 const calculated=reconcileBalances(a,person,data.sessions,data.holidays,new Date(data.capturedAt));
 const explicit=Object.entries(a.months||{}).filter(([m,c])=>m>='2026-09'&&m<='2026-11').flatMap(([month,c])=>Object.hasOwn(c.statsOverrides||{},'balance')?[{month,value:c.statsOverrides.balance}]:[]);
 let backupContinuation=[];
 const pendingOctober=local.find(p=>p.month==='2026-10'&&p.values.reason.includes('bản sao phiếu T10'));
 if(pendingOctober){const matches=backup.rows.filter(b=>normalize(b.sheet)===normalize(a.displayName));if(matches.length===1&&matches[0].balance===pendingOctober.values.value){backupContinuation=reconcileBalances({...a,months:{...a.months,'2026-10':{...a.months?.['2026-10'],balanceClose:{value:pendingOctober.values.value}}}},person,data.sessions,data.holidays,new Date(data.capturedAt)).rows.filter(r=>r.month==='2026-11').map(r=>({...r,source:'T10 từ bản sao + nghỉ/bù T10, bao gồm overrides'}));}}
 const comparisons=calculated.rows.map(r=>({month:r.month,opening:r.opening,absent:r.absent,madeUp:r.madeUp,expected:r.value,absentSource:r.absentSource,madeUpSource:r.madeUpSource,local:local.find(p=>p.month===r.month)?.values.value,manualBalance:explicit.find(x=>x.month===r.month)?.value}));
 const countOverrideMonths=Object.entries(a.months||{}).filter(([m,c])=>m>='2026-09'&&m<='2026-11'&&(Object.hasOwn(c.statsOverrides||{},'absent')||Object.hasOwn(c.statsOverrides||{},'madeUp'))).map(([month,c])=>({month,...c.statsOverrides}));
 const contradictoryEnrollment=!!person?.enrollmentStartDate&&data.sessions.some(s=>s.studentId===person.id&&s.dateKey<person.enrollmentStartDate&&!['cancelled','holiday'].includes(s.status));
 return {id:a.id,name:a.displayName,sourceSeptember:source?.values?.slice(2,5),blankSeptember:!!source&&source.values?.slice(2,5).every(v=>v==null),parsedSeptember:source?.values?.slice(2,5).map(importedCount),explicit,local:local.map(p=>({month:p.month,value:p.values.value,reason:p.values.reason})),comparisons,backupContinuation,countOverrideMonths,skipped:calculated.skipped,contradictoryEnrollment};
});
const diffs=rows.flatMap(a=>a.comparisons.filter(c=>c.local!==c.expected).map(c=>({id:a.id,name:a.name,...c})));
const manualConflicts=rows.flatMap(a=>a.comparisons.filter(c=>c.manualBalance!=null&&c.manualBalance!==c.expected).map(c=>({name:a.name,...c})));
const uncertainBackups=rows.filter(r=>r.backupContinuation.length).map(r=>({name:r.name,rows:r.backupContinuation.map(c=>({month:c.month,opening:c.opening,absent:c.absent,madeUp:c.madeUp,value:c.value,explicit:r.explicit.find(x=>x.month===c.month)?.value}))}));
const summary={accounts:rows.length,sessions:data.sessions.length,comparisons:rows.reduce((n,r)=>n+r.comparisons.length,0),diffs,manualConflicts,backupContinuation:uncertainBackups,countOverrides:rows.filter(r=>r.countOverrideMonths.length).map(r=>({name:r.name,months:r.countOverrideMonths})),blankSeptember:rows.filter(r=>r.blankSeptember).map(r=>r.name),contradictoryEnrollment:rows.filter(r=>r.contradictoryEnrollment).map(r=>r.name)};
fs.writeFileSync('D:/2DUnityGame/.codex/happychild-balance-full-audit.json',JSON.stringify({capturedAt:data.capturedAt,summary,rows},null,2));
console.log(JSON.stringify(summary,null,2));
const manualScenario=[];
for(const a of rows){let carry=null;for(const c of a.comparisons){const explicit=a.explicit.find(x=>x.month===c.month);const candidate=(carry??c.opening)+c.absent-c.madeUp;carry=explicit?.value??candidate;if(carry!==c.local)manualScenario.push({name:a.name,month:c.month,local:c.local,manualPriority:carry,direct:!!explicit});}}
const cell=v=>v==null?'—':String(v).replace(/\|/g,'/').replace(/\n/g,' ');
const report=[
 '# Rà soát đầy đủ số dư cần bù — 05/11/2026',
 '',`Nguồn đọc lúc ${data.capturedAt}: ${data.accounts.length} hồ sơ học phí, ${data.students.length} hồ sơ học sinh, ${data.sessions.length} buổi trong 9 tuần liên quan. Đã tải nguồn một lần để đối chiếu offline, không sửa Firebase hoặc hàng đợi local trong đợt rà soát này.`,
 '', '## Kết quả và giới hạn',
 '', '- 120 ô có đủ chuỗi tính theo nguồn hiện lưu: 118 khớp local, 2 khác local (NẾP và XOÀI T11). NAM HY đã được sửa 0 ở lượt trước.',
 '- Đã kiểm tra cả 5 phiếu có chỉnh tay tổng nghỉ/bù và mọi tháng có chỉnh tay số dư. Không bỏ qua giá trị 0.',
 '- 13 ô có số dư nhập tay khác phép cộng dồn. Cần quyết định ưu tiên nguồn nào; không tự coi số tính là số đúng thực tế.',
 '- 12 ô T10 local có nguồn bản sao Excel riêng. Từ các mốc này có 10 đề xuất T11 không âm; đó là đề xuất, chưa nhập hoặc chốt.',
 '- 21 hồ sơ có các ô nguồn T9 để trống. Tính chúng bằng 0 chỉ là giả định. Những giá trị suy từ giả định này không được coi là đã xác minh hoàn toàn.',
 '- Số đã chốt của GẤU được giữ nguyên. Không sửa lịch học, học phí, số dư học sinh hiện tại hay dữ liệu Firebase.',
 '', '## 1. Chênh lệch với công thức đã gồm nghỉ/bù chỉnh tay', '',
 '|Hồ sơ|Phiếu|Local|Phép tính|Số dư nhập tay|', '|---|---|---:|---|---:|',
 ...diffs.map(c=>`|${c.name}|${c.month}|${c.local}|${c.opening}+${c.absent}−${c.madeUp}=${c.expected}|${cell(c.manualBalance)}|`),
 '', '## 2. Mâu thuẫn giữa số dư nhập tay và phép tính', '',
 '|Hồ sơ|Phiếu|Nhập tay|Theo công thức|Local|', '|---|---|---:|---:|---:|',
 ...manualConflicts.map(c=>`|${c.name}|${c.month}|${c.manualBalance}|${c.expected}|${c.local}|`),
 '', '## 3. Ảnh hưởng dây chuyền nếu ưu tiên số dư nhập tay', '',
 'Bảng dưới là kịch bản so sánh, không phải số đã chọn để sửa. Khi thay tồn T10, phải tính lại T11 từ tồn mới, không chỉ sửa một ô.', '',
 '|Hồ sơ|Phiếu|Local hiện tại|Kịch bản ưu tiên nhập tay|Nguồn gây thay đổi|','|---|---|---:|---:|---|',
 ...manualScenario.map(c=>`|${c.name}|${c.month}|${c.local}|${c.manualPriority}|${c.direct?'Số dư nhập tay tháng này':'Tồn chuyển từ tháng trước'}|`),
 '', '## 4. Đề xuất nối từ bản sao T10 sang T11', '',
 '|Hồ sơ|Tồn T10 bản sao|Nghỉ|Bù|Đề xuất T11|Nhập tay T11|','|---|---:|---:|---:|---:|---:|',
 ...uncertainBackups.flatMap(a=>a.rows.map(c=>`|${a.name}|${c.opening}|${c.absent}|${c.madeUp}|${c.value}|${cell(c.explicit)}|`)),
 '', 'RIN và THIÊN ÂN: nối từ mốc bản sao vẫn ra âm nên chưa đề xuất số T11. Không ép về 0.',
 '', '## 5. Chi tiết theo từng hồ sơ', '',
 '|Hồ sơ / ID|T9: vắng / bù / không bù|T10 tính / local|T11 tính / local|Cảnh báo|','|---|---|---|---|---|',
 ...rows.map(a=>{const col=m=>{const c=a.comparisons.find(c=>c.month===m),l=a.local.find(l=>l.month===m);return `${cell(c?.expected)} / ${cell(l?.value)}`;};const alerts=[a.blankSeptember?'T9 trống, đang giả định 0':'',a.countOverrideMonths.length?'Có chỉnh tay nghỉ/bù':'',a.explicit.length?'Có số dư nhập tay':'',a.skipped.map(s=>`${s.month}: ${s.reason}`).join('; ')].filter(Boolean).join('; ');return `|${a.name} (${a.id})|${cell(a.sourceSeptember?.map(cell).join(' / '))}|${col('2026-10')}|${col('2026-11')}|${cell(alerts)}|`;}),
 '', 'Không khẳng định tất cả đúng khi các nguồn mâu thuẫn. Cần xác nhận nguồn ưu tiên trước khi sửa/chốt các ô ở mục 2 và chuỗi tháng sau liên quan.'
];
fs.writeFileSync('D:/2DUnityGame/.codex/ra-soat-so-du-day-du-2026-11-05.md',report.join('\n'));
