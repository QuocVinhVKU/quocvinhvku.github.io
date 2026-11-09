import fs from 'node:fs';
throw new Error('Bộ sinh cũ đã dừng để tránh ghi đè số nhập tay. Dùng apply-manual-balance-policy.mjs sau khi đọc lại nguồn.');
const pairs=`NHẬT GIA=excel-03d0d3d07a8ffbc28292
HAGO=excel-06ad383d46be1a2956da
KHÔI=excel-176062cd72a69777cfeb
BẢO HÂN MIE=excel-1d069b8c54e51136db75
BẢO BẢO=excel-23f37f5f373955b93787
AN HY=excel-30f5982ed224facaab21
NEMO=excel-3231210903632a632679
MINH HOÀNG - MON=excel-332b8f7f3043da50c13a
DŨNG=excel-34a03f273f607a8f2f62
THIÊN MỸ - DÂU=excel-366768acf28c144cec0a
MINH DUY=excel-38a77581f48d75f53663
XOÀI=excel-3accea6c6f0876b55c7c
SU HÀO=excel-3c564dc1635a5bc4eab8
BUN=excel-3eabb5ef11594d57fc45
THIÊN AN=excel-3f912e540995c8aa1837
LUCAS=excel-475e0686eb742c1033d4
MINH QUÂN NẾP=excel-47ccfecb0368ff6ce075
THẢO MY=excel-4fd8bb8d5a67d0b3ba2f
MINH KEN=excel-558231ca4a3f88ff5e5f
DUY KHANG=excel-55b1ec23291b483407f8
ANH MINH=excel-567a8437fea9782d0da1
PHÚC AN=excel-5693ce9157d1fb6bcd96
KHẢI MINH=excel-62b2717e783adfed566d
BEN 9H=excel-694cf252eabc9814ba20
AN KỲ=excel-6ac43ae31980e02fe3df
VY=excel-6c117a01bec31b74a76b
QUỲNH THƯ=excel-74710aa387bd6e33df5b
BƠ=excel-772fb711eff94f5a08ba
XÁ XÍU=excel-7811791a68ee7792f727
ĐÌNH BẢO=excel-7ac10860bf7dda6a3d74
GẠO=excel-7b8a1fe281c75b70882f
NGỌC - NA=excel-801625d2ce3f12d8c821
GURU=excel-85f6115cb119f8138eaf
UY LẠC=excel-8ad74fdea03bec6db1a5
PHÚC LỚN=excel-92aa4bad0dbf1b83c4ef
TÚ ANH=excel-a01f0628b71c134eef81
CÁO=excel-a9c9f8981c8ef2369898
GIA HUY - BẮP=excel-affabec707fbf76b9112
TUỆ MINH=excel-b85671859574443c7b4f
ĐẬU=excel-cfca038c2d3533b402d4
BON=excel-d88cd3e331764ddc7ec5
KHANG 3T=excel-d9af04020ad7238ba590
VÂN MY=excel-d9cb8617ef50b573e89e
BEN=excel-dc1813c6b54ade95acef
MINH ANH ALN=excel-e08ada08b68e802a5854
MON NGUYÊN=excel-e54596b64455ba5a136c
MINH TRIẾT (hồ sơ Excel cũ)=excel-e7d50cf0f2af865ffde1
TIGER=excel-eda0b68b535db8b53514
HÀ CHÂU=excel-f431933a6df13fd7cc92
CÁT TIÊN=excel-f6b4cb8be7af02aff7ea
MỠ=excel-f97ad6e51f8f40c54421
HOÀNG KIM=excel-fc89db181f66d4fc1185
KHÁNH ĐOAN=student-An4tylJBzbCP9sqZfPKJ
MINH TRIẾT (hồ sơ mới tháng 11)=student-Kfw21AVpxbBJ7X1I9ahE
SINGH GIA VINH=student-LnbJwXiqTzBFSrXdsGJr
AN PHƯỚC=student-V7Yvi47Tnc8h0x8964Nj
THANH MINH ĐỨC=student-mxkb0ebvnyrmSEBgMK0F
NGUYỄN ĐĂNG KHOA=student-oELaqme6QxdfA24JmV5p
NHẬT AN=student-p4rAjVOMC1uapwS6OATf
THẢO NHI=student-pzMTEbpDAIUFgmQh2DiN
LÊ UYỂN DU=student-um5J8wtlfU4l5Hx3cVXn
HUỆ MẪN=student-vZu4OB7QfQGsvy64Q1YU
BÁ THIÊN=student-xeV8DOjCnmi0RR9Ao4wF`;
const ids=Object.fromEntries(pairs.split('\n').map(line=>line.split('=')));
const text=fs.readFileSync(new URL('./so-du-can-bu-thang-10-11-cho-dong-bo.md',import.meta.url),'utf8');
const rows=[];
for(const line of text.split('\n')){
 const [,name,oct,nov]=line.trim().split('|');if(!ids[name])continue;
 for(const [month,raw]of [['2026-10',oct],['2026-11',nov]])if(/^\d+$/.test(raw))rows.push({accountId:ids[name],name,month,value:Number(raw),reason:'Bảng đối chiếu 05/11/2026: tồn từ phiếu tháng 9 + nghỉ - đã bù của từng tháng; không dùng số dư hiện tại. Chỉ điền khi chưa chốt.'});
}
if(rows.length!==120)throw Error(`Expected 120 rows, got ${rows.length}`);
const extraIds={RIN:'excel-3fad684ea7c787773630','MAI ANH':'excel-a84e901bbbdaa040fb39','BẮP':'excel-327a1d86f961eb6d1fbc',KEN:'excel-60287af6fcb065238659','PHI PHI':'excel-77bc07921797758a234f',NAM:'excel-b1c2cf402bc8746707f0','Hoàng Khôi':'excel-aaf85760e7f74dd644d9','Gia Bảo':'student-R2fuN3NU7Gay2EGsERju','Thiên Ân':'student-hqP9u2VFOUuVCQ6xI7Dv','Trần Nhật Minh Anh':'student-ZfvZddHcEqtYdr3PmTvy','Trần Nhật Minh Thy':'student-f0W0gl2FyktcsRvze6ot','Anh Thư':'student-vXC5tR5A4Gw5Lgm9P0us'};
const backup=JSON.parse(fs.readFileSync(new URL('./tuition-october-recovery-source.json',import.meta.url),'utf8'));
for(const [sheet,accountId]of Object.entries(extraIds)){
 const match=backup.rows.filter(r=>r.sheet===sheet);if(match.length!==1||!Number.isSafeInteger(match[0].balance))throw Error(`Ambiguous source ${sheet}`);
 rows.push({accountId,name:sheet,month:'2026-10',value:match[0].balance,reason:`Bổ sung ô thiếu từ bản sao phiếu T10: ${backup.source}; sheet ${sheet}, ô ${match[0].cell}; không dùng số dư hiện tại. Chỉ điền khi chưa chốt.`});
}
const dinhBao='excel-7ac10860bf7dda6a3d74';
for(const row of rows.filter(r=>r.accountId===dinhBao)){row.value=5;row.reason='Người dùng đối chiếu 05/11/2026: T9 vắng 3, bù 1 => còn 2; T10 vắng 3, bù 0 => còn 5; T11 vắng 2, bù 2 => còn 5. Thay thế cách tính trước.';}
rows.push({accountId:dinhBao,name:'ĐÌNH BẢO',month:'2026-09',value:2,reason:'Người dùng xác nhận 05/11/2026: tháng 9 vắng 3, bù 1, còn 2 buổi.'});
const namHy=rows.find(r=>r.accountId==='excel-30f5982ed224facaab21'&&r.month==='2026-11');
namHy.value=0;namHy.reason='Đối chiếu 05/11/2026: T10 còn 0; phiếu T11 nghỉ 1, bù 1 (statsOverrides.madeUp=1, ngày 29/10); 0+1-1=0. Không bỏ qua số liệu chỉnh tay trên phiếu.';
fs.writeFileSync('D:/2DUnityGame/.codex/happychild-pending-balances.json',JSON.stringify({source:'so-du-can-bu-thang-10-11-cho-dong-bo.md',rows},null,2));
console.log(`${rows.length} số dư / ${new Set(rows.map(r=>r.accountId)).size} hồ sơ`);
