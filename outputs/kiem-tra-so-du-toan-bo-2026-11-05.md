# Kiểm tra số dư cần bù — 05/11/2026

ĐÍNH CHÍNH SAU ĐỢT KIỂM TRA: phát hiện trường hợp NAM HY (tên phiếu AN HY) T11 có `statsOverrides.madeUp=1`, ngày bù 29/10, nhưng lịch tuần chưa có document học bù tương ứng. Phép tính trước đã bỏ qua chỉnh tay này nên ra 1; đúng theo phiếu là 0 + 1 − 1 = 0. Đã sửa bản đối chiếu local và logic ưu tiên tổng nghỉ/bù chỉnh tay. Vì vậy kết luận “120 ô khớp” bên dưới chỉ là đối chiếu với lịch, không phải xác nhận đã bao gồm mọi chỉnh tay trên phiếu.

Rà nguồn chỉnh tay phát hiện 5 phiếu T11 có tổng nghỉ/bù overrides: NAM HY (bù 1), XOÀI (nghỉ 9, số dư nhập tay 0), MINH QUÂN NẾP (nghỉ 3, bù 2, số dư nhập tay 5), TRẦN NHẬT MINH ANH và TRẦN NHẬT MINH THY (mỗi bé nghỉ 1, số dư nhập tay 1). Chưa tự sửa hàng đợi bốn hồ sơ còn lại trong lần xử lý NAM HY; cần đối chiếu cả phần số dư nhập tay và lịch bù trước khi đồng bộ. Không được khẳng định toàn bộ hàng đợi đã khớp số liệu chỉnh tay.

Đợt kiểm tra chỉ đọc. Không cập nhật Firebase hoặc thay đổi hàng đợi local.

Đã đọc trực tiếp 80 tài khoản học phí, lịch của 9 tuần giao tháng 9–10 (2.377 document buổi học, có cả phần ngày giao tháng), đối chiếu với hàng đợi local của cùng tài khoản đăng nhập.

## Kết quả

- 120 ô số dư T10/T11 tính theo chuỗi tồn đầu kỳ + nghỉ - đã bù khớp các giá trị local hiện tại; không phát hiện sai lệch số học khác sau khi sửa ĐÌNH BẢO.
- 12 ô T10 khác lấy từ bản sao Excel, không phải kết quả chuỗi tính được từ T9. Phải giữ nhãn nguồn khác nhau, không coi là đã xác minh độc lập bằng lịch.
- 1 ô local T9 của ĐÌNH BẢO = 2 theo xác nhận người dùng; T10 = 5, T11 = 5.
- GẤU (DUY THÔNG) có số đã chốt trên Firebase: T10 = 4, T11 = 4. Giữ nguyên, không áp phép tính mới lên số đã chốt.
- 21 ô thuộc 17 hồ sơ còn thiếu. Không ép về 0 và không lấy số dư hiện tại để điền ngược.

## Ví dụ chuỗi đối chiếu

|Hồ sơ|Tồn từ phiếu T9|Phiếu T10|Phiếu T11|
|---|---:|---|---|
|ĐÌNH BẢO|3 − 1 = 2|2 + 3 − 0 = 5|5 + 2 − 2 = 5|
|DŨNG|6 − 5 = 1|1 + 2 − 1 = 2|2 + 2 − 2 = 2|
|NEMO|5 − 4 = 1|1 + 4 − 1 = 4|4 + 2 − 3 = 3|
|VY|4 − 0 = 4|4 + 4 − 3 = 5|5 + 1 − 2 = 4|
|KHẢI MINH|8 − 4 = 4|4 + 0 − 2 = 2|2 + 2 − 4 = 0|
|BON|7 − 4 = 3|3 + 2 − 3 = 2|2 + 4 − 2 = 4|
|VÂN MY|5 − 4 = 1|1 + 4 − 4 = 1|1 + 1 − 1 = 1|
|MON NGUYÊN|5 − 3 = 2|2 + 2 − 2 = 2|2 + 0 − 2 = 0|
|TÚ ANH|2 − 1 = 1|1 + 2 − 1 = 2|2 + 1 − 3 = 0|
|BẢO BẢO|3 − 0 = 3|3 + 4 − 1 = 6|6 + 2 − 1 = 7|
|TIGER|5 − 0 = 5|5 + 8 − 0 = 13|13 + 7 − 0 = 20|

Các cột nghỉ/bù trong phiếu T10 lấy lịch T9; trong phiếu T11 lấy lịch T10, theo thiết kế báo học phí hiện tại. Không cộng lại hai lần các số đã nằm trong phiếu T9.

## Các ô chưa đủ căn cứ

|Hồ sơ|Ô còn thiếu|Lý do từ chuỗi T9|
|---|---|---|
|MINH QUANG|T10, T11|0 + 0 − 1 ra âm|
|DÂU TÂY|T10, T11|0 + 1 − 3 ra âm|
|KHÁNH|T10, T11|T9: 7 − 2 − 5 = 0; tiếp theo 0 + 2 − 3 ra âm|
|BỘT|T10, T11|Không có nguồn số đầu kỳ T9|
|LUCAS|T11|T10 = 0; tiếp theo 0 + 1 − 2 ra âm|
|BẮP (NAM THÀNH)|T11|T9 ghi vắng 4 nhưng đã bù 5; T10 = 1 chỉ có từ bản sao|
|RIN|T11|Chuỗi T9 ra âm; T10 = 0 từ bản sao|
|KEN|T11|1 + 1 − 3 ra âm; T10 = 0 từ bản sao|
|PHI PHI|T11|T9 ghi vắng 2, bù 3; T10 = 4 từ bản sao|
|MAI ANH|T11|0 + 1 − 2 ra âm; T10 = 0 từ bản sao|
|NAM|T11|0 + 0 − 1 ra âm; T10 = 0 từ bản sao|
|HOÀNG KHÔI|T11|Thiếu nguồn T9; T10 = 1 từ bản sao|
|GIA BẢO|T11|Thiếu nguồn T9; T10 = 0 từ bản sao|
|TRẦN NHẬT MINH ANH|T11|Thiếu nguồn T9; T10 = 0 từ bản sao|
|TRẦN NHẬT MINH THY|T11|Thiếu nguồn T9; T10 = 0 từ bản sao|
|THIÊN ÂN|T11|Thiếu nguồn T9; T10 = 0 từ bản sao|
|ANH THƯ|T11|Thiếu nguồn T9; T10 = 0 từ bản sao|

Các hồ sơ có T10 từ bản sao có thể tiếp tục đối chiếu riêng lịch tháng 10 và các điều chỉnh trước khi điền T11; thiếu chuỗi T9 không đồng nghĩa chắc chắn không thể phục hồi T11.

## Giới hạn độ tin cậy

21 hồ sơ có cả ba ô nguồn vắng/đã bù/không bù của T9 để trống: HAGO, AN HY, MINH QUANG, MINH HOÀNG - MON, THIÊN MỸ - DÂU, SU HÀO, BUN, THIÊN AN, RIN, LUCAS, MINH KEN, DUY KHANG, PHÚC AN, XÁ XÍU, PHÚC LỚN, GIA HUY - BẮP, TUỆ MINH, DÂU TÂY, HÀ CHÂU, CÁT TIÊN, HOÀNG KIM.

Cách tính hiện tại quy ước ô trống trong dòng Excel đã nhập là 0. Đây là giả định, không phải bằng chứng rằng lịch sử không có buổi còn thiếu. Vì vậy “khớp công thức” không đồng nghĩa “đã chốt đúng thực tế”.

Một số hồ sơ có hoàn/không bù hoặc điều chỉnh thủ công trong lịch sử. Đợt kiểm tra này đối chiếu phiếu và trạng thái lịch hiện lưu, chưa tái dựng toàn bộ giao dịch điều chỉnh. Không nên ghi đè số đã xác nhận bằng phép tính tự động nếu nguồn mâu thuẫn.
