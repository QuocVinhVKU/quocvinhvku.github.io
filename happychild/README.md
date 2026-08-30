# HappyChild

Ứng dụng web quản lý học sinh, lịch tuần, nghỉ học và học bù tại:

`https://zinhpixry.website/happychild/`

Source và bản phát hành được lưu trực tiếp trong `happychild/`. Trên Windows không thể duy trì đồng thời hai thư mục chỉ khác chữ hoa/thường, còn GitHub Pages phân biệt chữ hoa/thường; dùng tên chữ thường bảo đảm URL công khai hoạt động đúng.

## Kiến trúc

- HTML/CSS/JavaScript module, không cần bundler.
- Logo chính thức được lưu tại `assets/happychild-logo.jpg` và dùng cho màn đăng nhập, thanh bên cùng favicon.
- Firebase Authentication bằng email/mật khẩu; mọi tài khoản đăng nhập hợp lệ đều có quyền chỉnh sửa.
- Cloud Firestore đồng bộ thời gian thực.
- Firestore transaction bảo vệ số dư nghỉ/học bù.
- Lịch sử giao dịch và audit log không thể sửa; chủ sở hữu có thể xóa dữ liệu thử nghiệm.
- Quản lý học sinh và giáo viên; mỗi buổi học gắn với một học sinh và một cô dạy.
- Danh sách học sinh giữ STT toàn cục theo thứ tự dòng của Trang tính5, đồng thời hiển thị và lọc theo giáo viên phụ trách.
- Trang Giáo viên nhóm gọn danh sách các bé theo từng cô, có tìm kiếm và nút mở/thu gọn toàn bộ.
- Click trực tiếp ngày trống để thêm khung giờ, hoặc thêm học sinh vào khung giờ đang có.
- Kiểm tra trùng lịch học sinh/giáo viên và giới hạn sức chứa của khung giờ.
- Lịch tuần lấy **khung giờ làm thứ tự chính** giống T9.xlsx: `08:00–09:00 → 09:00–10:00 → 15:00–16:00…`. Trong mỗi khung giờ, mỗi bé chỉ chiếm một dòng, các bé cùng cô được xếp liền nhau và màu giáo viên được giữ trên từng lịch. Mỗi nút ngày vẫn mở được chi tiết để sửa, xin nghỉ hoặc xếp học bù.
- Tuần đã qua hiển thị bảng tổng kết học, nghỉ phép, học bù, hủy, giờ học sinh và giờ giáo viên. Nút **Chốt tuần** lưu một bản thống kê cố định vào Firestore; nếu lịch được sửa sau đó, hệ thống cảnh báo và nút **Cập nhật lại** sẽ chốt lại số liệu mới. Báo cáo tháng hiển thị số tuần đã chốt trên tổng số tuần có dữ liệu.
- Mọi thao tác thêm, sửa, xóa hoặc đổi trạng thái buổi học đều tự mở lại tuần đã chốt; số liệu cũ chỉ được dùng để đối chiếu cho đến khi người dùng bấm **Cập nhật lại**.
- Trang Lịch mẫu nhóm theo **Thứ → Khung giờ → Giáo viên và học sinh**. Các nhóm mặc định thu gọn; tìm kiếm hoặc lọc sẽ tự mở đúng nhóm phù hợp.
- Ghi chú theo ngày, nhắc sinh nhật hôm nay/ngày mai và báo cáo giờ học theo tháng.
- Menu **Tháng này** tổng hợp sinh nhật học sinh/giáo viên và ghi chú; báo cáo tháng tách giờ đã học, nghỉ, học bù và giờ dạy thực tế của giáo viên.
- Quản lý Link Form theo từng giáo viên, giữ màu nhóm như bảng Excel, tự tách khoảng thời gian từ tiêu đề Form, lưu các mục tiêu cũ theo thứ tự Link 1, Link 2… và tổng hợp tiến độ trả kết quả.
- Lịch tuần tìm được theo tên học sinh. Click một học sinh để xem lịch sử theo tuần, note từng buổi và thống kê tuần/tháng/toàn thời gian.

## Chạy trên máy

Không mở trực tiếp bằng `file://`. Tại thư mục gốc repository, dùng một static server, ví dụ:

```bash
python -m http.server 8080
```

Sau đó mở `http://localhost:8080/happychild/`.

Trên Windows có thể nhấp đúp `happychild/start-local.bat`; script sẽ khởi động máy chủ cục bộ và tự mở đúng URL trong trình duyệt.

## Cấu hình Firebase Console

### 1. Bật Authentication

Vào **Authentication → Sign-in method → Email/Password**, bật Email/Password. Không bật đăng ký công khai trong ứng dụng.

### 2. Tạo tài khoản quản trị

Vào **Authentication → Users → Add user** và tạo:

- Email: `dangquocvinh02112001@gmail.com`
- Mật khẩu: quản trị viên tự đặt và giữ riêng.

Ứng dụng không còn bắt buộc tạo document `users/{UID}`. Chỉ cần tài khoản tồn tại trong Firebase Authentication là có thể đăng nhập và chỉnh sửa. Nếu muốn lưu hồ sơ hiển thị, có thể tùy chọn tạo document:

```text
email        = "dangquocvinh02112001@gmail.com"
displayName  = "Đặng Quốc Vinh"
role         = "admin"
active       = true
createdAt    = timestamp hiện tại
updatedAt    = timestamp hiện tại
```

Document ID phải là UID, không dùng email. Đây chỉ là hồ sơ tùy chọn; ứng dụng không lưu mật khẩu.

### 3. Authorized domains

Thêm tại **Authentication → Settings → Authorized domains**:

- `zinhpixry.website`
- `www.zinhpixry.website`
- `quocvinhvku.github.io`
- `localhost`
- `127.0.0.1`

Không nhập giao thức hoặc `/happychild/`.

### 4. Firestore và Security Rules

Tạo Firestore ở Production mode. Từ thư mục `happychild`, đăng nhập Firebase CLI và deploy:

```bash
firebase login
firebase use happychild-bff96
firebase deploy --only firestore:rules,firestore:indexes
```

Rules hiện cho phép mọi tài khoản Firebase Authentication đã đăng nhập chỉnh sửa dữ liệu nghiệp vụ. Audit/giao dịch không thể sửa và chỉ UID chủ sở hữu cấu hình trong `firestore.rules` được xóa dữ liệu test; người chưa đăng nhập vẫn bị từ chối. Không dùng rule công khai `allow read, write: if true`.

Sau mỗi lần thêm collection mới (ví dụ `notes`) hoặc thay đổi quyền, phải publish lại `firestore.rules`; nếu không menu mới sẽ báo `Missing or insufficient permissions`.

Collection `studentForms` được dùng cho màn hình **Link Form**, vì vậy bản rules có `match /studentForms/{id}` phải được publish trước khi thêm hoặc sửa dữ liệu trên production.

Khi bật tính năng lưu mục tiêu cũ, phải publish bản rules cho phép trường `studentForms.linkHistory`; nếu chưa publish, thao tác đổi Link Form sẽ bị từ chối dù các thao tác khác vẫn hoạt động.

## Link Form và dữ liệu Trang tính5

- Màn hình **Link Form** có các cột: STT, học sinh, ngày sinh, link, thời gian, kết quả, thời lượng giáo viên và ghi chú.
- Dữ liệu được nhóm theo giáo viên theo đúng thứ tự xuất hiện trong Trang tính5; mỗi nhóm dùng màu của giáo viên và có thể mở/thu gọn.
- Trạng thái kết quả được tính trực tiếp từ ngày kết thúc và ngày ghi nhận: ghi nhận đúng hoặc trước hạn là **Đúng hạn**; chưa ghi nhận sau hạn hoặc ghi nhận sau hạn là **Cô trễ kết quả**. Ngày kết thúc vẫn được tính là đang chờ, chỉ bắt đầu trễ từ ngày kế tiếp.
- Chỉ ô **Kết quả** của hồ sơ trễ được tô đỏ, kèm số ngày trễ; tiêu đề nhóm giáo viên cũng hiện số hồ sơ trễ. Thanh tổng kết toàn bộ hiển thị Tổng Form, Cô trễ kết quả, Đúng hạn, Đang chờ và Cần kiểm tra, đồng thời có bộ lọc theo trạng thái.
- Các tiêu đề chỉ có ngày/tháng dùng năm tạo hồ sơ làm năm neo ổn định. Khoảng ngày thiếu/sai, ngày ghi nhận tương lai hoặc trước ngày bắt đầu được xếp vào **Cần kiểm tra**, không tự quy trách nhiệm trễ cho giáo viên.
- Tiêu đề như `Nam Hy 8/6 - 8/9` được tách tự động thành `8/6-8/9`. Parser hỗ trợ dấu `-`, `–`, `—`, từ `đến` và ngày có hoặc không có năm.
- Khi nhập workbook, công cụ chạy ở môi trường tin cậy đọc tiêu đề trực tiếp từ các link Google Form công khai rồi lưu `formTitle` vào Firestore.
- Trình duyệt trên website tĩnh không thể đọc nội dung Google Form chỉ từ URL do chính sách CORS. Khi thêm/sửa thủ công, hãy dán cả tiêu đề Form; khoảng thời gian vẫn được tự điền ngay khi nhập tiêu đề.
- Các dòng chưa có link hoặc tiêu đề chưa chứa khoảng ngày vẫn được giữ để người dùng bổ sung, thay vì tự đoán dữ liệu.

## Dữ liệu mẫu

Nút **Cài đặt → Khởi tạo dữ liệu mẫu** chỉ xuất hiện với tài khoản chủ sở hữu sau khi hệ thống tải xong và xác nhận cả học sinh, giáo viên lẫn Link Form đều đang trống. Cơ chế này tránh vô tình thêm dữ liệu thử vào danh sách production. Nút tạo 5 học sinh và 5 lịch mẫu bằng ID cố định nên có thể chạy lại mà không nhân bản dữ liệu.

Dữ liệu mẫu cũng tạo giáo viên `Cô Ngân`. Có thể thêm/sửa giáo viên tại menu **Giáo viên**.

Sau đó mở **Lịch tuần → Tạo tuần** để sao chép lịch mẫu sang một tuần độc lập.

## Lịch mẫu nhập từ T8 (1).xlsx

- Trang tính `Trang tính2` đã được đối chiếu với danh sách 60 học sinh hiện hành. Sau hiệu chỉnh danh tính và bổ sung lịch Nếp, hệ thống lưu 239 lịch cố định của 60 học sinh, từ Thứ Hai đến Thứ Bảy; Chủ nhật không có lịch.
- Mỗi lịch thường giữ sức chứa mặc định là 1. Khi nhiều học sinh học cùng cô và cùng giờ, sức chứa của khung giờ là tổng số lịch thường trong nhóm; lịch học bù không tự làm tăng sức chứa.
- Giáo viên của **từng lịch** được xác định từ màu của chính ô giờ trong workbook, không lấy từ cô phụ trách chung của học sinh. Một bé có thể học với nhiều cô trong cùng tuần; `primaryTeacherId` chỉ dùng để nhóm hồ sơ/roster, còn `scheduleTemplates.teacherId` và `sessions.teacherId` là cô thực dạy buổi đó.
- Bảng màu giờ học: Cô Tiên `#B6D7A8`/`#D9EAD3`, Cô Thùy `#C482D2`, Cô Hân `#548235`/`#38761D`, Cô Dương `#FBBC04`/`#FFC000`/`#E0A31E`, Cô Mai `#FF0000`, Cô Ngọc `#134F5C`, Cô Quỳnh `#F48E93`. Ví dụ XOÀI 16:00–17:00 học Cô Mai vào Thứ Hai/Tư/Sáu và Cô Dương vào Thứ Ba/Năm.
- Ô ghi `bù 9h` không được đưa vào lịch lặp. Hai ô không tô màu nhưng trùng đúng lịch đã có cũng không tạo bản sao.
- Hiệu chỉnh nghiệp vụ ngày 22/08/2026: `DUY THÔNG` được gộp vào **Gấu**; lịch 09:00 mang tên `TRIẾT` cũ được chuyển sang **VĨNH AN - BƠ**; `DẦN` được gộp vào **TRIẾT** với lịch 17:00–18:00 Thứ Hai/Tư/Sáu; **NẾP** học 18:00–19:00 Thứ Ba/Năm.

## Lịch mẫu hiện hành từ T9.xlsx

- Nguồn hiện hành là `Trang tính2!A1:BU8` của `T9.xlsx`: 245 lịch cố định, 63 học sinh, từ Thứ Hai đến Thứ Bảy.
- Website đồng bộ một lần sau khi đăng nhập: ghi lịch T9 bằng ID ổn định, xóa lịch mẫu nguồn cũ nhưng không sửa các tuần đã tạo trước đó. Nếu mất mạng giữa chừng, lần đăng nhập sau có thể chạy lại an toàn.
- Năm học sinh chưa có trong roster cũ (`ĐÌNH BẢO`, `thu lee`, `HAGO`, `UY LẠC`, `THIÊN MỸ`) được tạo hồ sơ tối thiểu để không làm mất lịch trong sheet.
- T9 có hai cột tên `VY`. Theo xác nhận của chủ cơ sở, cột `V` chỉ có một ô 15:00–16:00 Thứ Bảy được loại bỏ; lịch `VY` hợp lệ ở cột `BR` vẫn giữ 19:00–20:00 Thứ Hai/Tư/Sáu.
- Các ô `bù 9h`, `lớp 1` và ô không có màu giáo viên không được coi là lịch cố định. Màu của từng ô giờ tiếp tục quyết định cô thực dạy; toàn bộ giờ được làm tròn xuống số giờ tròn và sức chứa mỗi lịch là 1.
- Danh sách hiện hành có 63 bé và chỉ giữ một hồ sơ cho mỗi danh tính. `DUY THÔNG` được gộp vào **Gấu**; `DẦN`/`Trí` được gộp vào **TRIẾT**; các cột lặp của **MAI ANH**, **MIE** và **VY** vẫn dùng chung một hồ sơ học sinh.
- `BEN SÁNG` và `ĐỨC THÀNH` không còn trong T9 nên bị loại khỏi roster, Link Form và lịch mẫu hiện hành. Nếu hồ sơ còn được tham chiếu bởi tuần/giao dịch cũ, hệ thống giữ một bản lưu trữ ẩn thay vì xóa vật lý để báo cáo lịch sử không hiện “Học sinh đã xóa”.
- Mọi học sinh được giữ lại trong T9 đều có ít nhất một lịch cố định hợp lệ; không có bé nào bị bỏ hoàn toàn vì thiếu màu hoặc giờ. Các ô ngoại lệ nói trên chỉ bị loại riêng lẻ.

## Quy tắc nghỉ và học bù

- Quy ước nhập giờ theo ngữ cảnh: `8h–10h` là buổi sáng; một mốc duy nhất là ca kéo dài một giờ, ví dụ `9h` → `09:00–10:00`, `8h15` → `08:00–09:00`, còn `3h` → `15:00–16:00`. Tất cả số phút được làm tròn xuống: `17:05–18:05` → `17:00–18:00`, `18:10–19:10` → `18:00–19:00`, `7h15–8h15` → `19:00–20:00`.
- Khi một buổi `Đã xếp lịch` đã qua giờ kết thúc, hệ thống tự chuyển sang `Đã học`; buổi `Xếp học bù` tự chuyển sang `Đã học bù` và trừ số dư bằng Firestore transaction. Việc kiểm tra chạy ngay khi tải tuần và lặp mỗi phút khi trang đang mở.
- Các trạng thái `Xin nghỉ` và `Đã hủy` không bị cơ chế tự động ghi đè. Thời điểm kết thúc được tính theo ngày, giờ và múi giờ của thiết bị đang mở website.
- Đánh dấu `Xin nghỉ`: cộng đúng 1 buổi cần bù.
- Lưu lại cùng trạng thái: không cộng thêm.
- Hoàn tác nghỉ: tạo giao dịch đảo và trừ lại 1.
- Xếp lịch bù: chưa trừ số dư.
- Khi xếp lịch bù phải chọn giáo viên; giao diện đánh dấu cô còn trống hoặc đang bận.
- Bé đã có một buổi đang hoạt động trùng khung giờ sẽ bị loại khỏi danh sách xếp bù. Nếu có chỗ nghỉ ngay trước hoặc sau ca chính của bé, màn hình Học bù hiển thị gợi ý học hai ca liên tục.
- `Xin nghỉ` và `Đã hủy` không chiếm sức chứa, nên lớp 1/1 có thể nhận một bé khác vào bù. Với lớp nhiều bé, sức chứa khung giờ là tổng sức chứa của các lịch thường trong nhóm.
- Đánh dấu `Đã học bù`: trừ đúng 1.
- Hoàn tác hoàn thành bù: cộng phục hồi 1.
- Số dư không được nhỏ hơn 0.

## Phát hành GitHub Pages

Commit thư mục `happychild/` cùng website hiện tại. Không đổi `index.html` ở thư mục gốc.

Custom domain trong `CNAME` là `www.zinhpixry.website`. DNS của tên miền gốc `zinhpixry.website` chỉ nên dùng các bản ghi A/AAAA chính thức của GitHub Pages và phải được GitHub cấp chứng chỉ chứa cả tên miền gốc lẫn `www`. Không để thêm bản ghi chuyển tiếp của nhà đăng ký (ví dụ IP parking/redirect), vì nó có thể làm HTTPS của tên miền gốc báo sai chứng chỉ trước khi kịp chuyển sang `www`.

## Dọn dữ liệu thử nghiệm

- Mỗi màn hình dữ liệu có biểu tượng thùng rác tương ứng.
- Tại **Cài đặt → Dọn dữ liệu thử nghiệm**, chủ sở hữu có thể xóa toàn bộ tuần, buổi học, lịch mẫu, học sinh, giáo viên, ghi chú, giao dịch và lịch sử.
- Thao tác xóa toàn bộ yêu cầu nhập chính xác `XOA DU LIEU TEST` và xác nhận lần hai. Tài khoản Firebase Authentication không bị xóa.

## Firebase Hosting (tùy chọn)

`firebase.json` có rewrite riêng `/happychild/**` và không rewrite toàn bộ domain. Chỉ triển khai Hosting sau khi xác nhận DNS/custom domain đang trỏ đúng dự án Firebase.

## Sao lưu

Firestore managed export cần Google Cloud Storage và quyền phù hợp. Với dự án nhỏ, có thể định kỳ xuất dữ liệu bằng công cụ Admin SDK chạy ở môi trường tin cậy. Tuyệt đối không đưa service-account JSON vào repository hoặc frontend.

## Lỗi thường gặp

- **Không đăng nhập được:** kiểm tra tài khoản có tồn tại trong Firebase Authentication và Email/Password đã được bật.
- **Missing or insufficient permissions:** chưa deploy `firestore.rules` hoặc UID chưa được cấp quyền.
- **Unauthorized domain:** thêm hostname vào Authorized domains.
- **Trang trắng/404:** phải truy cập `/happychild/` qua HTTP(S), không mở file trực tiếp.
- **Đang kết nối quá lâu:** kiểm tra mạng hoặc trình chặn quảng cáo có chặn `gstatic.com` / `firebaseapp.com`; giao diện sẽ hiện nút tải lại thay vì quay vô hạn.
- **Cần index:** bản hiện tại tự sắp xếp lịch tuần ở trình duyệt nên không cần composite index `date + startTime`; với truy vấn mới khác, deploy `firestore.indexes.json` hoặc dùng link Firebase trả về trong console.
