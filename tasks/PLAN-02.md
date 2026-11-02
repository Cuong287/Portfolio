# Kế hoạch đã duyệt — Giai đoạn 2: Dọn dẹp Portfolio (thực thi)

Giai đoạn 1 (kiểm kê) đã xong bằng xác minh trực tiếp của orchestrator (grep
README.md, meta tags og:image/twitter:image/icon trong 4 trang, và `slab-design/`
— không có task worker riêng, không có báo cáo kiểm kê riêng).

## Quyết định của người dùng
1. 4 ảnh `assets/images/projects/pbl3/*.png` — không dùng nữa → xóa.
2. `logo.png` — giữ cho tương lai (branding) → di chuyển, không xóa.
3. 2 screenshot "before" trong `assets/screenshots/` — xóa.
4. Đồng ý cấu trúc `assets/images/branding/` và `assets/images/people/`.
5. Tên thư mục cho `profile.png`: `people/`.
6. `tmp/pdf-recrop/` — chưa quyết định, không đụng trong giai đoạn này.

## Xác minh đã làm trước khi lập kế hoạch
- `logo.png`: không có trong 4 trang HTML chính, `README.md`, `slab-design/`;
  không có thẻ `og:image`/`twitter:image`/favicon/`apple-touch-icon` nào trong
  toàn repo.
- `profile.png`: chỉ dùng tại `index.html:602`.
- 4 ảnh `pbl3`: không xuất hiện ở bất kỳ đâu (4 trang HTML, README, slab-design/).
- 2 screenshot "before": không được 4 trang HTML tham chiếu.
- `assets/images/projects/pbl3/` hiện chỉ chứa đúng 4 file cần xóa.
- `assets/images/branding/` và `assets/images/people/` chưa tồn tại.

## Task thực thi (Codex)

### T01 — Di chuyển `logo.png`/`profile.png`, sửa 1 dòng `index.html`
- Di chuyển `logo.png` → `assets/images/branding/logo.png`.
- Di chuyển `profile.png` → `assets/images/people/profile.png`.
- Sửa `index.html:602`: `src="profile.png"` → `src="assets/images/people/profile.png"`.
- Đối chiếu SHA-256 trước/sau di chuyển.
- Không sửa gì khác trong `index.html`; không đụng 3 trang kia, `slab-design/`,
  `tmp/`, file cấu hình quy trình.

### T02 — Xóa 6 ảnh không dùng + thư mục `pbl3/` rỗng
- Xóa đúng từng đường dẫn tường minh (không wildcard):
  `assets/images/projects/pbl3/deformed-shape.png`,
  `assets/images/projects/pbl3/internal-forces.png`,
  `assets/images/projects/pbl3/structural-model.png`,
  `assets/images/projects/pbl3/wind-loading.png`,
  `assets/screenshots/academic-projects-before-desktop-viewport.png`,
  `assets/screenshots/academic-projects-before-mobile-viewport.png`.
- Xóa thư mục `assets/images/projects/pbl3/` sau khi xác nhận đã rỗng.
- Không xóa thư mục `assets/screenshots/` (chỉ 2 file bên trong); không đụng ảnh
  khác hay HTML nào.

## Kiểm chứng tổng thể — orchestrator tự làm (không giao worker)
Sau khi T01 + T02 xong, trước khi merge vào `main`:
- `git status --short`, `git diff --name-status`, `git diff --check`,
  `git diff -- index.html` — chỉ đúng phạm vi đã duyệt.
- Mở cả 4 trang trong browser: ảnh chân dung tải từ đường dẫn mới, không 404 /
  lỗi console, luồng chính (lightbox, nav) vẫn chạy.
- Xác nhận `logo.png`/`profile.png` không còn ở gốc, `pbl3/` không còn tồn tại,
  `tmp/`, `slab-design/` không đổi.

## Điểm cần người dùng quyết định
Không còn.
