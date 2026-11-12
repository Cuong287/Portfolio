# Đặc tả kỹ thuật – Tải trọng gió theo TCVN 2737:2023

App con `wind-load/` của portfolio. HTML/CSS/JS thuần, không bước build.
Nguồn gốc: chuyển từ bảng tính Cemcons_Wind_TCVN_2737-2023_Ver4.8.xlsm (benchmark), cập nhật 12/11/2026.

## Cấu trúc
| File | Nội dung |
|---|---|
| `index.html` | giao diện |
| `styles.css` | kiểu trình bày (sáng/tối, điện thoại) |
| `engine.js` | phần tính: ze, k(ze), Gf, F.4/F.16, lực tầng, mặt đất tự nhiên (`WIND`) |
| `report.js` | thuyết minh: dựng nội dung, xuất .docx (OMML) và bản in .html (`TM`) |
| `view3d.js` | mô hình 3D tự vẽ trên canvas (`View3D`) |
| `combos.js` | tổ hợp tải trọng TTGH1/TTGH2 cho ETABS (`COMBO`) |
| `app.js` | điều khiển giao diện, sơ đồ mặt đứng, mặt bằng chia vùng, xuất file, lưu hồ sơ |
| `data/qcvn02-2022-bang-5-1.js` | QCVN 02:2022/BXD Bảng 5.1 (`QC`) |
| `tests/` | regression test bằng Node `assert` |

Tiêu chuẩn tham chiếu: TCVN 2737:2023 (mục 6, 7, 8, 10, Phụ lục E, F, H); QCVN 02:2022/BXD (mục 5.2–5.3, Bảng 5.1, 5.2); TCVN 9386:2012 (tổ hợp động đất).

## Quyết định đã chốt (10/11/2026)
1. Hình F.22 tại d/b = 1: lấy theo Excel (đường thẳng log, cx∞ ≈ 2,15), không lấy nhãn 2,1.
2. Thuyết minh: xuất Word (.docx) sửa được, công thức là phương trình Word (OMML); có số liệu của người dùng. PDF: lưu từ Word hoặc từ bản in .html.
3. Lưu bản web và hồ sơ vào project Por; bản nguồn tách file đặt trong repo portfolio (`wind-load/`, 12/11/2026).
4. Phạm vi: nhà cao tầng, giữ nguyên cách tính của Excel, chỉ sửa lỗi.

## Quyết định bổ sung (11/11/2026)
5. Dạng địa hình: mặc định một ô dùng chung hai phương (như Excel); tích "Địa hình khác nhau theo hướng gió" mới tách phương Y (Chú thích 2, Bảng 9).
6. Mặt đất tự nhiên (chốt 11/11 chiều, sau 3 lần sửa): ô nhóm "Mặt đất tự nhiên" gồm Sàn so sánh (Đáy công trình hoặc một sàn trong bảng tầng) – Mặt đất (thấp hơn / ngang / cao hơn) – Khoảng cách (m, số dương), kèm hình mặt đứng nhỏ cập nhật ngay và dòng giải thích. Không dùng khái niệm cốt ±0.000. Bảng tầng hiện "Cao trên mặt đất". H, z các sàn và chiều cao đón gió tính từ MĐTN; dải đón gió cắt ở mặt đất, tầng nằm dưới đất không chịu gió. Mô men lật quanh MĐTN với cánh tay đòn thật. Mặc định Đáy công trình – ngang → như Excel. Hồ sơ lưu theo các cách nhập cũ tự quy đổi.
7. Nửa dưới tầng thấp nhất (½h₁) không gán vào sàn nào, truyền thẳng xuống móng (giữ cách phân tải của Excel); lực cắt chân trên web chưa gồm phần này.

## Cách tính (giữ như Excel)
- Wk = W3s,10 · k(ze) · c · Gf; W3s,10 = 0,852·W0; γf = 2,1 (10.1.6). Lực tầng = Wk · b · h_đón gió / 100 (kN), đặt tại tâm sàn.
- ze theo 10.2.4b; k(ze) = 2,01(ze/zg)^(2/α), ze ≥ zmin, k ≤ 1,99/1,97/1,98.
- Gf theo (13)–(24); T1 ≤ 1 s → 0,85. zs = 0,6h.
- c: h/d ≤ 5 → Bảng F.4, c = |cD| + |cE| (nội suy theo h/d); h/d > 5 → F.16, c = kλ·cx∞. Mặt khuất gió dùng cùng k(ze) như Excel (phù hợp lời văn 10.2.4).
- Cao đón gió = ½ tầng đó + ½ tầng trên; tầng mái ½ tầng mái.
- W0, V3s,50 tra theo QCVN 02:2022/BXD Bảng 5.1 (334 dòng, 63 tỉnh). V3s,50 phải tra theo địa danh (vùng IV có 55 và 56 m/s).

## Lỗi của Excel đã sửa
| Lỗi | Sửa |
|---|---|
| ze < zmin trả chữ "Zmin" → #VALUE! | lấy ze = zmin (10.2.5) |
| Thiếu chặn trên k(ze) | chặn 1,99/1,97/1,98 |
| noisuy_c: d/b < 0,1 trả 0,9 (đúng là 2,0) | sửa nhánh ngoài miền |
| ns_klamda: λe < 1 ra < 0,6; λe > 1000 rỗng | chặn [0,6; 1,0] |
| Tra địa danh hỏng (#REF!) | nhúng Bảng 5.1 QCVN 02 |
| Thuyết minh Word cũ ghi V3s,50 vùng IV = 56, vùng V trống | lấy theo địa danh (IV: 55/56; V: 61) |
| Modify Story làm tròn chiều cao tầng, lưu số dạng chữ | bảng tầng nhập số trực tiếp |

## Bổ sung
- Địa hình riêng cho từng phương (Chú thích 2, Bảng 9); nhập tay W0/V3s,50, tính W0 = 0,0613·V0² (10.2.3).
- Cảnh báo: H > 200 m (10.1.1); λe > 20 → kiểm tra kích động xoáy (10.1.4); ghi chú Gf sơ bộ Phụ lục E.1.
- Xuất: thuyết minh .docx, bản in .html, CSV lực tầng cho ETABS (có cột cao độ và chiều cao trên MĐTN), hồ sơ .json; lưu hồ sơ trong tài khoản.
- Trực quan (tab Tải trọng tầng): sơ đồ mặt đứng lực tại sàn / áp lực Wk (cùng tỉ lệ hai phương, rê chuột xem chi tiết); mô hình 3D tự vẽ (xoay, phóng to, góc nhìn có sẵn) với lớp lực tầng và lớp vùng ce F.4.
- Tab Hệ số khí động: mặt bằng chia vùng A, B, C, D, E theo Hình F.5a cho từng phương (khi h/d ≤ 5).

## Tổ hợp tải trọng (tab "Tổ hợp tải trọng", 12/11/2026)
Nguồn: Cemcons.vn_THTT_TCVN_2737-2023._VER3.xlsx. Quyết định của người dùng: giữ nguyên cách lập của Excel (kể cả các điểm lệch nêu dưới); γf cho chọn theo tiêu chuẩn; không thêm tổ hợp 0,9·DL + gió.
- Trường hợp tải: DL, SDL, WALL, LL, WX, WY, EX, EY, XCC (đổi tên được cho khớp mô hình ETABS).
- TTGH1 cơ bản (13, công thức 1): γn·γf·ψt; ψt = 1,0 chủ đạo / 0,9 thứ hai (6.4); gió γf = 2,1 (10.1.6). γn theo Bảng H.1 (0,87 / 1,00 / 1,15; ≥ 1,2 cho nhà > 250 m, mái nhịp > 120 m).
- TTGH1 động đất (16, TCVN 9386): 1,0·(DL+SDL+WALL) ± EX ± 0,3EY và ngược lại; 8 tổ hợp không hoạt tải + 8 tổ hợp có ψ₂·LL. ψ₂ theo loại sàn A–H (0,3/0,3/0,6/0,6/0,8/0,6/0,3/0).
- TTGH1 đặc biệt có xe chữa cháy (13, công thức 2, không nhân γn): ψt = 0,5 / 0,3 (6.5); XCC hệ số 1 (khai báo giá trị tính toán 8.6.2).
- TTGH2 (14): γf = 1 (4.2 b), γn = 1 (H.3); tổ hợp cuối dùng 0,35·LL (giá trị tiêu chuẩn giảm, 8.3.3).
- γf chọn được: hằng tải theo Bảng 1 (1,05 / 1,1 / 1,2 / 1,3 / đất 1,1 / 1,15); hoạt tải 1,3 (8.3.5 a) hoặc 1,2 (bãi đỗ xe 8.5.5; kho, xe bốc xếp Bảng 3). Mặc định như Excel: cơ bản DL 1,1, SDL 1,2, WALL 1,1, LL 1,3; đặc biệt DL 1,1, SDL 1,2, WALL 1,3, LL 1,3.
- Gió trong ETABS khai báo giá trị tiêu chuẩn (cột FX_tc, FY_tc), vì hệ số tổ hợp đã gồm 2,1.
- Đã đối chiếu trực tiếp bản PDF TCVN 2737:2023 (trang 11–17, 21–23, 88) ngày 12/11/2026.
- Điểm lệch so với tiêu chuẩn đã báo người dùng, giữ theo Excel: (1) tổ hợp 35–38 hoạt tải lấy ψ = 0,5 cùng lúc với gió chủ đạo (6.5 chỉ một tải chủ đạo, phần còn lại 0,3); (2) WALL 1,3 ở nhóm xe chữa cháy, 1,1 ở nhóm cơ bản (Bảng 1: khối xây 1,1; tường ngăn tạm thời là tải tạm thời dài hạn theo 5.4 a, nhưng khi là tải dài hạn duy nhất thì ψL,1 = 1 (6.3) nên hệ số tổ hợp không đổi so với coi là thường xuyên); (3) công thức TTGH2 của SDL/WALL tham chiếu nhầm ô trong Excel – không ảnh hưởng vì mọi hệ số bằng 1; (4) chưa có tổ hợp 0,9·DL + gió (7.3).
- Xuất: bảng Load Combination Definitions (Name, Type, Is Auto, Load Name, SF) dạng .csv hoặc sao chép; mục 8 trong thuyết minh (Bảng 10–13), tắt được.

## Chưa làm / giới hạn
- Chưa xét mô men xoắn WMz, kích động xoáy, mái/tường chắn mái, Phụ lục C (mốc chuẩn mặt đất dốc), kiểm tra chuyển vị Bảng G.5.
- Địa danh theo tên trước sắp xếp ĐVHC 2025; Bộ Xây dựng đang dự thảo Sửa đổi 1 QCVN 02 (dự thảo 30/01/2026) — cập nhật khi ban hành.
