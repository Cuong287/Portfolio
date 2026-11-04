# Task 03: Rà soát nội dung index.html, academic-projects.html, awards.html

## Mục tiêu
Đây là nhiệm vụ **chỉ đọc + đề xuất**, KHÔNG sửa file nào. Rà soát 3 trang
`index.html`, `academic-projects.html`, `awards.html` để tìm lỗi và đề xuất cách
sửa (không tự sửa), gồm:
1. Lỗi chính tả/ngữ pháp tiếng Anh.
2. Câu văn thiếu tự nhiên (không giống người bản xứ viết).
3. Số liệu hoặc ngày tháng mâu thuẫn giữa các trang (ví dụ: cùng một giải
   thưởng/sự kiện nhưng ghi ngày khác nhau, điểm số khác nhau, tên dự án viết
   khác nhau giữa các trang).
4. Tên người/chức danh/tên giải thưởng viết không thống nhất (ví dụ: "Le Van
   Cuong" vs "Cuong Le", viết hoa không nhất quán, viết tắt khác nhau).
5. Link hỏng hoặc trỏ sai (href rỗng, href="#" không có ý nghĩa, link nội bộ trỏ
   tới file/anchor không tồn tại, link ảnh trỏ tới file không tồn tại).
6. Thẻ HTML lỗi (tag không đóng, thẻ lồng sai, thuộc tính trùng, id trùng trong
   cùng một trang).
7. Ảnh thiếu `alt` hoặc `alt` không mô tả đúng nội dung ảnh.
8. Thông tin thiếu hoặc có vẻ lạc hậu (ví dụ: "năm cuối" nhưng không rõ năm nào,
   placeholder còn sót lại, phần nội dung có dấu hiệu chưa hoàn thiện).

## Được đọc
- `index.html` (toàn bộ)
- `academic-projects.html` (toàn bộ)
- `awards.html` (toàn bộ)

Được phép đối chiếu nội dung CHÉO giữa 3 file này (ví dụ so sánh tên dự án, ngày
tháng, số liệu nhắc tới ở nhiều trang) để tìm mâu thuẫn.

## Ngoài phạm vi (tuyệt đối không đụng/không đọc)
- KHÔNG sửa bất kỳ file nào, kể cả 3 file trên — đây là nhiệm vụ chỉ đọc.
- KHÔNG đọc hay phân tích `research.html` (ngoài phạm vi nhiệm vụ này).
- KHÔNG đọc `slab-design/**` (ứng dụng con độc lập, không liên quan).
- KHÔNG đọc/đụng `TODO.md`, `tasks/`, `CLAUDE.md`, `AGENTS.md`, `.codex/`,
  `.claude/settings.local.json`, `.env*`, `.git/`.
- KHÔNG chạy lệnh git (`commit`, `push`, `merge`, v.v.). KHÔNG truy cập mạng
  (không tự tra cứu web để xác minh sự thật — nếu cần xác minh một thông tin
  thực tế, đánh dấu "cần người dùng xác nhận" thay vì tự tra cứu hay suy đoán).
- KHÔNG thêm/sửa dependency, cấu hình, hay bất kỳ file nào ngoài báo cáo.

## Ngữ cảnh đã trích
- Đây là trang portfolio cá nhân (ngành Kỹ thuật Xây dựng) của người dùng, viết
  bằng tiếng Anh, giọng văn trang trọng, súc tích. `index.html` là trang chủ;
  `academic-projects.html` liệt kê các dự án học thuật; `awards.html` liệt kê
  giải thưởng/học bổng/thành tích.
- Toàn bộ CSS/JS của cả 3 trang là nội tuyến (không có file `.css`/`.js` rời),
  nên lỗi thẻ HTML cần xem trực tiếp trong các file này.
- Ảnh dùng trong 3 trang nằm ở `assets/images/{awards,projects/pbl5}/`,
  `assets/images/people/profile.png`, `assets/images/branding/logo.png` — nếu
  phát hiện `src` trỏ tới đường dẫn không tồn tại trong cấu trúc này, đó là link
  ảnh hỏng, cần báo cáo kèm đường dẫn chính xác bị sai.
- **Những gì là sự thật về cuộc đời người dùng (tên giải thưởng cụ thể, ngày
  tháng, điểm số, thứ hạng, tên trường/tổ chức trao giải) mà bạn (worker) không
  có cách nào xác minh độc lập — TUYỆT ĐỐI không đoán đúng/sai hay tự "sửa cho
  đúng". Chỉ được chỉ ra nếu có SỰ MÂU THUẪN rõ ràng giữa các trang (ví dụ cùng
  một giải thưởng nhưng 2 trang ghi 2 ngày khác nhau) và đánh dấu "cần người
  dùng xác nhận" — không tự quyết định cái nào đúng.**

## Hoàn thành khi
Báo cáo liệt kê mọi phát hiện, mỗi phát hiện gồm đủ các trường sau, chia thành 3
nhóm theo mức độ nghiêm trọng (Nghiêm trọng / Trung bình / Nhẹ — tự đánh giá dựa
trên mức ảnh hưởng tới người đọc hoặc độ tin cậy của trang):

- **File và dòng** (số dòng chính xác trong file đã đọc).
- **Trích đoạn nguyên văn** (copy chính xác đoạn text/HTML có lỗi, không diễn
  giải).
- **Vì sao sai** (giải thích ngắn gọn).
- **Đề xuất sửa thành gì** (viết rõ nội dung đề xuất, không chỉ nói "sửa lại").
- **Mức chắc chắn**: "chắc chắn" (lỗi khách quan, rõ ràng — chính tả, HTML lỗi,
  link hỏng, alt thiếu) hoặc "cần người dùng xác nhận" (liên quan tới sự thật
  cá nhân không xác minh được, hoặc phán đoán về văn phong/cách diễn đạt mà có
  thể người dùng cố ý viết vậy).

Nếu không tìm thấy lỗi nào ở một hạng mục trong 8 hạng mục mục tiêu, ghi rõ "đã
kiểm tra, không thấy lỗi" thay vì bỏ qua không nhắc tới.

## Báo cáo (ghi vào .dispatch/REPORT.md)
- Toàn bộ danh sách phát hiện theo định dạng trên, chia theo mức độ nghiêm
  trọng.
- Tổng số phát hiện theo từng hạng mục trong 8 hạng mục mục tiêu (kể cả hạng
  mục không có lỗi).
- Điểm không chắc chắn, giả định đã dùng.
- Thiếu thông tin gì (nếu có) khiến bạn không đánh giá được một phần nào đó,
  thay vì tự khám phá thêm file ngoài phạm vi.
