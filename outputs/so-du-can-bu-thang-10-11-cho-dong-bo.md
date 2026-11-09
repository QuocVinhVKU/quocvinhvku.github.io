# Kết quả tính chờ đồng bộ — 05/11/2026

CHƯA LƯU FIREBASE. Giao dịch ban đầu bị `resource-exhausted` trước bước ghi.

CẬP NHẬT: Đã đưa 120 số dư ở bảng dưới và 12 số dư T10 từ bản sao Excel (tổng 132 ô / 75 hồ sơ) vào IndexedDB của phiên local `http://127.0.0.1:8080`, đã đọc lại xác nhận đủ 132 mục. Hàng đợi tự thử đồng bộ khi đăng nhập lại; chỉ điền tháng chưa chốt, không ghi đè tháng đã chốt hoặc bản local có sẵn. Không xóa dữ liệu trình duyệt trước khi đồng bộ. Dữ liệu không tự chuyển sang Chrome/profile/origin khác.

Đã đọc 80 hồ sơ và 2.627 buổi học. Tính được 120 ô số dư cho 63 hồ sơ. GẤU đã có số chốt nên không ghi đè.

Quy tắc: tồn đầu tháng 9 từ phiếu Excel tháng 9 = vắng trừ đã bù trừ không bù; ô trống trong dòng đã nhập được quy ước là 0. Phiếu T10 cộng nghỉ/trừ học bù dùng số dư trong tháng 9; phiếu T11 tiếp tục theo tháng 10. Không dùng makeupBalance hiện tại để điền ngược lịch sử. Không tính nghỉ lễ, buổi học thêm usesMakeupCredit=false, lịch trùng hoặc buổi nghỉ Đình Bảo 03/09 được nhập với yêu cầu không cộng số dư. Số âm/thiếu nguồn giữ chưa chốt.

|Hồ sơ|T10|T11|
|---|---:|---:|
|NHẬT GIA|3|4|
|HAGO|0|0|
|KHÔI|0|0|
|BẢO HÂN MIE|8|8|
|BẢO BẢO|6|7|
|AN HY|0|0|
|NEMO|4|3|
|MINH HOÀNG - MON|0|1|
|DŨNG|2|2|
|THIÊN MỸ - DÂU|0|2|
|MINH DUY|1|1|
|XOÀI|4|10|
|SU HÀO|1|1|
|BUN|0|0|
|THIÊN AN|0|1|
|LUCAS|0|chưa đủ căn cứ|
|MINH QUÂN NẾP|4|4|
|THẢO MY|6|13|
|MINH KEN|1|0|
|DUY KHANG|1|1|
|ANH MINH|1|0|
|PHÚC AN|0|0|
|KHẢI MINH|2|0|
|BEN 9H|5|7|
|AN KỲ|6|10|
|VY|5|4|
|QUỲNH THƯ|1|3|
|BƠ|6|6|
|XÁ XÍU|0|0|
|ĐÌNH BẢO|5|5|
|GẠO|3|1|
|NGỌC - NA|2|3|
|GURU|1|4|
|UY LẠC|1|0|
|PHÚC LỚN|0|0|
|TÚ ANH|2|0|
|CÁO|4|5|
|GIA HUY - BẮP|4|5|
|TUỆ MINH|2|3|
|ĐẬU|1|1|
|BON|2|4|
|KHANG 3T|5|8|
|VÂN MY|1|1|
|BEN|2|4|
|MINH ANH ALN|3|3|
|MON NGUYÊN|2|0|
|MINH TRIẾT (hồ sơ Excel cũ)|2|4|
|TIGER|13|20|
|HÀ CHÂU|1|3|
|CÁT TIÊN|0|1|
|MỠ|1|1|
|HOÀNG KIM|0|0|
|KHÁNH ĐOAN|trước nhập học|0|
|MINH TRIẾT (hồ sơ mới tháng 11)|trước nhập học|0|
|SINGH GIA VINH|0|0|
|AN PHƯỚC|0|0|
|THANH MINH ĐỨC|trước nhập học|0|
|NGUYỄN ĐĂNG KHOA|0|0|
|NHẬT AN|trước nhập học|0|
|THẢO NHI|0|1|
|LÊ UYỂN DU|0|1|
|HUỆ MẪN|0|8|
|BÁ THIÊN|trước nhập học|0|

## Bổ sung T10 từ bản sao đã đối chiếu

Đính chính theo người dùng: ĐÌNH BẢO T9 = 3 - 1 = 2; T10 = 2 + 3 - 0 = 5; T11 = 5 + 2 - 2 = 5. Đã sửa hai mục T10/T11 và thêm T9 vào local, tổng 133 mục. Các mục khác chưa bị tính lại theo giả định mới.

Nguồn: `D:/Downloads/Bao-hoc-phi-2026-10-kem-lich-su (3).xlsx`, đúng sheet của từng bé, ô C6. Đây là số ghi trên phiếu T10 trong bản sao, không phải số dư hiện tại; nguồn được ghi trong từng bản lưu tạm.

|Hồ sơ|T10|
|---|---:|
|RIN|0|
|MAI ANH|0|
|BẮP (NAM THÀNH)|1|
|KEN|0|
|PHI PHI|4|
|NAM|0|
|HOÀNG KHÔI|1|
|GIA BẢO|0|
|THIÊN ÂN|0|
|TRẦN NHẬT MINH ANH|0|
|TRẦN NHẬT MINH THY|0|
|ANH THƯ|0|

Còn thiếu cả T10/T11: MINH QUANG, DÂU TÂY, KHÁNH, BỘT. Còn thiếu T11: 12 hồ sơ trong bảng bổ sung và LUCAS. Chưa đủ nguồn đầu kỳ/lịch tháng 10 để tính tiếp; không ép về 0. GẤU không thuộc đợt nhập vì đã có số chốt.
