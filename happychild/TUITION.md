# Báo học phí

Mở menu **Báo học phí** (`#tuition`), chọn học sinh, mở phiếu tháng.

- Tháng hiện tại mở sẵn; tháng sắp tới được đánh dấu; lịch sử xếp từ mới đến cũ.
- Danh sách và STT dùng chung thứ tự của tab Học sinh (khung giờ từ sớm đến muộn). Hồ sơ chưa liên kết nằm cuối, không tự đánh STT giả.
- **Xuất Excel**: chọn tháng và phạm vi (tất cả hồ sơ hoặc học sinh đang xem). File `.xlsx` có hai trang **Học phí** và **Dự báo** tháng kế tiếp, phần dự báo tô cam/vàng. Lấy dữ liệu mới trực tiếp từ Firebase; không sửa dữ liệu nguồn. Hồ sơ thiếu liên kết/đơn giá vẫn xuất nhưng ghi rõ phần thiếu, không coi học phí chưa biết là 0. Tổng là tổng các khoản đã xác định.
- Tháng dự báo kế tiếp luôn hiện tự động, kể cả chưa lưu cấu hình tháng đó; chỉ kế thừa đơn giá, không kế thừa giảm trừ.
- **Liên kết học sinh** nối phiếu Excel với hồ sơ có sẵn. Chưa có hồ sơ thì dùng **Tạo học sinh mới**, sau đó quay lại liên kết. Một học sinh chỉ có một hồ sơ học phí.
- **Sửa học phí / ghi chú** sửa đơn giá, tiền giảm trừ và nội dung ghi chú. Số âm ở giảm trừ nghĩa là thu thêm. Tháng mới chỉ kế thừa đơn giá, không kế thừa giảm trừ.
- Tổng tiền = đơn giá × buổi đăng ký − tiền giảm trừ. Không tự suy ra số tiền từ câu chữ trong ghi chú.
- Cột đầu sau tên trẻ là **Số buổi đăng ký của tháng trước**: phiếu T9 ghi T8, phiếu T10 ghi T9 (T1 lấy T12 năm trước). Tháng cũ lấy bản lưu/Excel; tháng trước còn đang hiện hành lấy số đăng ký cập nhật từ lịch. Đây không phải buổi đã học, và không thay đổi số đăng ký dùng tính tiền của tháng đang xem.
- Đăng ký tính từ ngày 1 đến hết tháng: dùng buổi thường trong tuần đã tạo; những ngày chưa tạo tuần dùng lịch mẫu cho tháng hiện tại/tương lai. Không cộng lịch test, học bù, buổi hủy, nghỉ lễ hay ngày từ ngày ngừng học. Xin nghỉ vẫn là một buổi đã đăng ký.
- Các buổi trùng hoàn toàn cùng học sinh/ngày/giờ chỉ đếm một lần. Có danh sách ngày/giờ đăng ký để kiểm tra.
- Buổi học thường và buổi bù hoàn thành lấy từ lịch thực tế. Cần bù lấy từ số dư hiện tại của học sinh, gồm dư các tháng trước; không thay đổi số dư khi lưu học phí.
- Tháng hiện tại tự cập nhật. Khi lưu học phí, một bản số liệu có thời gian lưu được giữ lại để tra cứu sau khi tháng qua. Đây là bản lưu tại thời điểm bấm Lưu, không phải cơ chế chốt tự động cuối tháng.
- **Dữ liệu gốc Excel** là bản đọc nguyên trạng, gồm các ghi chú và phiếu có tiêu đề tháng trùng nhau. Không ghi đè các phiếu gốc bằng phép tính hiện tại.

## Lưu trữ và đồng bộ

`tuitionAccounts/{id}` chứa liên kết, lịch sử nhập nguyên trạng và cấu hình từng tháng. `tuitionStudentLinks/{studentId}` khóa liên kết duy nhất. Lưu qua giao dịch Firebase, kiểm tra phiên bản tháng và liên kết trước khi cập nhật để ngăn ghi đè giữa thiết bị. Có nhật ký trong `auditLogs`.

Đã nhập một lần từ workbook ngày 30/09/2026: 64 hồ sơ, 649 phiếu lịch sử; thêm cấu hình tháng 10. Không có dữ liệu học phí cá nhân hoặc bản Excel nguồn trong mã website, không chạy lại import khi đăng nhập/deploy. Dữ liệu thật nằm ở Firestore, chỉ đọc sau đăng nhập.

Phần quy tắc cho hai collection mới nằm trong `firestore.rules`. Khi triển khai quy tắc, giữ các match này; không quay về bản rules cũ thiếu collection học phí. Thay đổi giao diện cần được triển khai cùng `tuition.css`, `js/tuition*.js`, `index.html` và `js/app.js`.

## Kiểm thử

```text
node happychild/tests/tuition-model.mjs
node --experimental-vm-modules happychild/tests/tuition-store.mjs
node happychild/tests/tuition-ui.mjs
```

Kiểm thử model/giao dịch không kết nối Firebase. Kiểm thử giao diện dùng trình duyệt headless, Firebase giả lập trong bộ nhớ và máy chủ HTTP tạm; không ghi dữ liệu thật. Đường dẫn Node/Playwright/Chrome trong test UI theo runtime Windows của workspace.
