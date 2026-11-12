# TODO - Portfolio

Chỉ orchestrator (Claude) được sửa file này. Cập nhật lần cuối: 2026-11-12

## Đang làm
<!-- Mẫu: - [ ] T1 Tên việc | Codex | nhánh task/T1 | trạng thái (đã giao / chờ duyệt / đang sửa) -->

## Chờ người dùng quyết định
- 05 nhóm A (để nguyên tạm thời, chưa xác minh): "Fourth-year" (index), mốc thời gian của GPA 3.60, cao độ vai cột +6.20 vs chú thích KC-02 "+7.00 m", ký hiệu CT1–CT4/CT5/CT6, 384 bu lông M42 vs 10M42/chân cột, nhãn "Primary steel 201.4 tons" (gồm cả 28.10 t bản mã), cao độ đỉnh mái +11.28 vs tính ra ≈ +10.60. Chi tiết: `tasks/05.md`.
- 05-C12: thêm mục kinh nghiệm thực tập DINCO E&C — người dùng đồng ý, CHỜ nội dung (vị trí, thời gian, công việc, kết quả).
- 05-C11: thẻ Awards ở index nhắc "certificates, and professional activities" nhưng trang Awards không có — người dùng: chưa xử lý.
- 05-C13: dự án 02/03 đang dùng hình minh họa ý tưởng — người dùng có bản vẽ thật nhưng chưa thêm.
- 05-C14: `research.html` vẫn giữ "Coming soon" — người dùng: chưa mở.

## Đã xong
- [x] 02-T01 Di chuyển logo.png → assets/images/branding/, profile.png → assets/images/people/, sửa index.html:602 | Codex | đã merge vào main
- [x] 02-T02 Xóa 4 ảnh pbl3/ không dùng + 2 screenshot "before" + thư mục pbl3/ rỗng | Codex | đã merge vào main
- [x] 03-review Rà soát nội dung index/academic-projects/awards.html (chỉ đọc, không sửa) | Antigravity | đã duyệt, đã trình người dùng
- [x] 04-content-fixes Sửa 21 mục (13 lỗi "chắc chắn" từ 03-review) | Codex | đã merge vào main
- [x] 05-style-fixes Nhóm B (chính tả Anh-Anh, bỏ "Verified", thống nhất tons/Grade 8.8, bỏ tên file .xlsm) | Claude sửa trực tiếp | đã commit
- [x] 05-tmp Xóa `tmp/pdf-recrop/` (và `tmp/` rỗng) theo quyết định người dùng
- [x] 06-white-bg Đổi nền 4 trang portfolio từ kem (#f3f0e8) sang trắng; dải phụ --paper-deep → xám trung tính #f4f4f2 (slab-design giữ nguyên) | Claude | đã commit
- [x] 07-gbc-palette Đổi bảng màu theo gbc-engineers.com: nhấn cobalt #0019B3 (biến --accent), chữ #292929, xám trung tính thay xám ngả xanh lá, khối Contact nền cobalt, nút chính cobalt; giữ bố cục + phông | Claude | đã commit
- [x] 08-accent-restraint Phương án A sau đánh giá của agent: cobalt chỉ làm tín hiệu (số mục, nút, gạch nav, vạch hero, viền trên ô trang trí, khối Contact); bỏ mọi tint cobalt nhạt (ngả tím) → xám trung tính; nhãn #737373, nhấn phụ #4d4d4d; thẻ nền trắng đặc | Claude | đã commit
- [x] 09-text-tiers Thống nhất màu chữ 3 bậc (#292929 / #4d4d4d / #666666), nhãn trên dải tối #a3a3a3; sửa 5 chỗ dưới chuẩn tương phản (min 1.84 → 5.15) | subagent làm trên bản sao, Claude duyệt + đo lại | đã commit
- [x] 10-wind-load Thêm app con `wind-load/`: tính tải trọng gió TCVN 2737:2023 (chuyển từ Excel Cemcons Wind v4.8 + sửa lỗi, tra QCVN 02:2022, sơ đồ mặt đứng, mô hình 3D, vùng ce F.4, mặt đất tự nhiên, xuất thuyết minh .docx/CSV ETABS); test `node wind-load/tests/engine-regression.test.js` 7/7 PASS | Claude | đã commit (người dùng)
- [x] 11-wind-load-link Gắn link `wind-load/index.html`: thẻ rộng "04 / ENGINEERING TOOL – Wind Load Calculator" dưới 3 thẻ mục Works (index.html, CSS `.card--wide`); nút "← Portfolio" trong app; cập nhật CLAUDE.md (cấu trúc + lệnh test) | Claude | CHƯA commit
- [x] 12-wind-load-standalone Bỏ nút "← Portfolio" trong `wind-load/` để gửi riêng link công cụ không dẫn về portfolio (theo yêu cầu người dùng); link một chiều từ thẻ 04 ở index vẫn giữ | Claude | CHƯA commit
- [x] 13-wind-load-light Cố định giao diện sáng cho `wind-load/` (`data-theme="light"` trên thẻ html) để đồng bộ portfolio; trước đó trang theo chế độ tối của máy nên hiện nền đen | Claude | CHƯA commit
