# Kế hoạch đã duyệt — T04: Sửa 13 lỗi "chắc chắn" từ rà soát nội dung

Nguồn: báo cáo rà soát của Antigravity (task 03-review, chỉ đọc), 23 phát hiện
tổng cộng, 13 trong số đó được đánh dấu "chắc chắn" (không phải dữ kiện cá nhân
cần xác nhận). Orchestrator đã tự xác minh toàn bộ dòng/nội dung với file thật
trước khi lập kế hoạch này (bỏ qua bước Codex lập kế hoạch theo người dùng đồng
ý — việc đã đủ chi tiết, không cần khám phá thêm).

Tier: **light** (toàn bộ là thay thế text/thuộc tính chính xác theo dòng).

## Điều chỉnh so với đề xuất gốc của agy
Finding #21 (role="button" dư thừa trên `<summary>`): agy đề xuất bỏ cả
`role="button"`, `aria-expanded`, `aria-controls`. Orchestrator chỉ áp dụng bỏ
`role="button"` — giữ nguyên `aria-expanded`/`aria-controls` vì chúng là fallback
hợp lệ khi JS tắt, xóa đi không giải quyết lỗi mà có thể giảm khả năng tiếp cận.

## Danh sách sửa đổi (đầy đủ, xem brief `tasks/04.md` để biết chi tiết từng dòng)

### academic-projects.html
1. CSS dòng 144: thêm `display:block;` vào selector `.case-image-frame,.etabs-visual-frame`
2. Dòng 433, 527, 533, 539, 545, 551, 557: đổi `<div class="case-image-frame">`/`<div class="etabs-visual-frame">` → `<span>` (7 vị trí)
3. Dòng 553: `Class 8.8` → `Grade 8.8`
4. Dòng 599, 601: bỏ gạch nối `reinforced-concrete` → `reinforced concrete`
5. Dòng 647: `Plaxis` → `PLAXIS`
6. Dòng 544: `I-800÷500×400×14×10` → `I-(800–500)×400×14×10`
7. Dòng 445: `(16T)` → `(16 tons)`; dòng 553: `80.15 T` → `80.15 tons`; dòng 559: `93.14 T` → `93.14 tons`
8. Dòng 440, 604, 626: bỏ `role="button"` trên `<summary>`
9. Dòng 433, 527: alt `30m by 149.5m` → `30 m × 149.5 m`
10. Dòng 660: điền `alt` cho `#lightboxImage`
11. Dòng 381: thêm `role="link"` vào span `disabled-link`
12. Dòng 606, 628: `<h3>Verified project scope</h3>` → `<h3>Project scope</h3>`
13. Dòng 607: viết lại đoạn mô tả (bỏ giọng "ghi chú hệ thống")

### awards.html
14. CSS dòng 122: thêm `display:block;` vào selector `.awards-moment-media,.awards-research-media`
15. Dòng 395, 422, 466, 507: đổi `<div>` → `<span>` (4 vị trí)
16. Dòng 504: viết đầy đủ tên trường thay cho `DUT`
17. Dòng 505, 511: thống nhất `wind-load` có gạch nối
18. Dòng 360, 380: `national Olympiad` → `National Mechanics Olympiad`
19. Dòng 621: điền `alt` cho `#lightboxImage`
20. Dòng 295: thêm `role="link"` vào span `disabled-link`

### index.html
21. Dòng 659: thêm `role="link"` vào span `disabled-link`

## Ngoài phạm vi
Mọi nội dung khác trong 3 file; `research.html`, `slab-design/`, ảnh, file cấu
hình quy trình.

## Kiểm chứng
- Đọc toàn bộ diff, đối chiếu đúng danh sách trên (không thừa/thiếu).
- Mở cả 3 trang trong browser: layout các khối ảnh (`case-image-frame`,
  `etabs-visual-frame`, `awards-moment-media`, `awards-research-media`) không vỡ
  sau khi đổi div→span, lightbox vẫn hoạt động, không lỗi console.
