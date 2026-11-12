# Bảng kiểm chứng – wind-load (TCVN 2737:2023)

Cập nhật 12/11/2026. Lệnh: `node wind-load/tests/engine-regression.test.js` và `node wind-load/tests/combos.test.js` (mỗi lệnh 7 nhóm `PASS`).

| # | Nội dung | Benchmark | Kết quả |
|---|---|---|---|
| 1 | Ví dụ 7 tầng: Gf, c, lực 7 tầng × 2 phương | Excel Cemcons v4.8 (giá trị đã tính trong file) | khớp, sai số tương đối ≤ 1e-15 (`tests/fixtures/excel-cemcons-v4.8-7-tang.json`) |
| 2 | 9 trường hợp: nhà 100 m, tháp mảnh F.16, nhà thấp T ≤ 1 s, có tầng hầm, mặt đất giữa tầng / ngang sàn / thấp hơn chân | Bản tính độc lập viết lại từ công thức TCVN (Python) | khớp tuyệt đối lực, lực cắt, mô men; F.16 lệch ≤ 0,2% do Excel dùng công thức gần đúng cho Hình F.22/F.27 (đã chốt giữ theo Excel) (`tests/fixtures/independent-crosscheck.json`) |
| 3 | Sửa lỗi Excel: cx∞ ngoài miền, kλ ngoài miền, ze < zmin, chặn k(ze) | Hình F.22, F.27; 10.2.5; ghi chú Bảng 8 | đạt |
| 4 | Chia vùng ce (A, B, C, D, E) | Bảng F.4, Hình F.5a; tính tay | đạt |
| 5 | Dữ liệu QCVN 02 Bảng 5.1: 63 tỉnh, 334 dòng, W0 khớp vùng | PDF quy chuẩn trang 42–63 (đếm dòng giá trị, đối chiếu trực quan trang 59) | đạt |
| 6 | Thuyết minh Word | Kiểm tra XSD OOXML + OMML; đọc bằng python-docx, pandoc | đạt (công thức chưa được xem trực tiếp trong Microsoft Word) |
| 7 | Giao diện: sơ đồ mặt đứng (25 mục), mặt đất tự nhiên (16 mục), mô hình 3D, vùng F.4, điện thoại, sáng/tối | Kiểm thử tự động bằng Playwright (chạy ngoài repo) | đạt, không lỗi console |
| 8 | Tổ hợp tải trọng: 42 TTGH1 + 14 TTGH2, mọi hệ số | Excel Cemcons THTT VER3: giá trị lưu trong file (C2, sàn A) và 3 bộ tính lại bằng LibreOffice (C3/E, C1/H, C2/C) | khớp tuyệt đối (≤ 1e-12) (`tests/fixtures/excel-cemcons-thtt-ver3.json`) |
| 9 | Tab tổ hợp: đổi γn, loại sàn, γf, tắt nhóm, đổi tên, CSV/sao chép, lưu lại, hồ sơ cũ, thuyết minh, điện thoại, nền tối | Playwright (13 mục); .docx qua kiểm tra XSD | đạt |

Chưa kiểm chứng: nhập bảng tổ hợp vào ETABS thật (định dạng theo mẫu bảng Load Combination Definitions); ψ₂ chưa đối chiếu bản gốc TCVN 9386:2012 (lấy theo Excel, trùng EN 1990 Bảng A1.1); hiển thị công thức trong Microsoft Word thật; tải file trong trình duyệt của người dùng (bản GitHub Pages dùng tải trực tiếp, không cần quyền).
