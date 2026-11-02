# Sổ đăng ký xác nhận TCVN 5574:2018 — V1 ULS uốn sàn

Trạng thái trong sổ này không xác nhận điều khoản TCVN. Nó ghi những phần đang được lấy tạm từ workbook để reviewer đối chiếu văn bản tiêu chuẩn có kiểm soát.

| ID | Yêu cầu cần xác nhận | Nguồn tạm thời | Ánh xạ workbook | Bằng chứng còn cần | Trạng thái | Owner reviewer |
| --- | --- | --- | --- | --- | --- | --- |
| TCVN-ULS-01 | Điều kiện áp dụng mô hình uốn một lớp thép kéo cho dải sàn 1 m | Công thức Table1 | `1.Tinh thep san` cột `αm` đến `As,tt` | Điều/khoản, giới hạn hình học và giả thiết vật liệu trong bản TCVN được kiểm soát | Chưa xác minh | Engineering reviewer |
| TCVN-MAT-02 | Giá trị `Rb`, `Rbt`, `Eb` theo cấp bê tông và hệ số `yb` | `PhuLuc-Excel` | `Bang_RbRbt`, `Bang_Eb`; `G4:G6`, `M7` | Bảng/điều khoản TCVN và phạm vi áp dụng bê tông nặng | Chưa xác minh | Materials reviewer |
| TCVN-MAT-03 | Giá trị `Rs`, `Rsc`, `Es` theo nhóm thép | `PhuLuc-Excel` | `Bang_Rs`; `G8:G10` | Bảng/điều khoản TCVN, cấp thép và cách dùng cường độ tính toán | Chưa xác minh | Materials reviewer |
| TCVN-ULS-04 | Biểu thức `xR = 0.8/(1+Rs/(Es×εb2))`, `aR = xR(1−0.5xR)` và `εb2=0.0035` | `M4:M6` | `M4`, `M5`, `M6` | Điều/khoản, ký hiệu chuẩn và điều kiện dùng | Chưa xác minh | Engineering reviewer |
| TCVN-ULS-05 | Công thức `αm`, `ξ`, `As,tt` và quy đổi kN·m sang N·mm | Table1 | Hàng 17–22 cột `αm`, `ξ`, `As,tt` | Điều/khoản, giới hạn miền sử dụng và quy ước đơn vị | Chưa xác minh | Engineering reviewer |
| TCVN-DET-06 | Mức `ρmin = 0.001` và `ρmax = xR×Rb/Rs` | Table1 và `M9` | Cột `O`, `V`; `M9` | Điều/khoản cho tỷ lệ cốt thép tối thiểu/tối đa áp dụng cho bản | Chưa xác minh | Detailing reviewer |
| TCVN-DET-07 | Dải `ρop,min=0.006`, `ρop,max=0.009` | Workbook nhập cứng | `M10:M11`, cột `P` | Nguồn tiêu chuẩn hoặc quy định nội bộ được phê duyệt; nếu là heuristic phải đổi nhãn | Chưa xác minh | Engineering reviewer |
| TCVN-DET-08 | Cách xác định lớp bảo vệ `c` và việc dùng `h0=h-(c+0.5φ)` | Workbook nhập cứng | `M8`, Table1 cột `h0` | Điều/khoản về lớp bảo vệ, vị trí lớp thép và trường hợp nhiều lớp | Chưa xác minh | Detailing reviewer |
| TCVN-ULS-09 | Xử lý mô-men âm/dương và mặt bố trí thép | Table1 dùng `ABS(Mtt)` | Cột `Mtt`, `αm`, `vị trí` | Điều/khoản và quy tắc chi tiết hóa thép trên/dưới cho gối/nhịp | Chưa xác minh | Engineering reviewer |
| TCVN-SLS-10 | Kiểm tra TTGH2 sau ULS | Sheet dịch vụ riêng | `2.Kiem tra TTGH2` | Phạm vi, điều khoản nứt/võng và các đầu vào liên kết | Ngoài phạm vi V1; chưa xác minh | Serviceability reviewer |

## Tiêu chí đóng register

Reviewer chỉ chuyển một dòng sang “Đã xác minh” khi lưu được tham chiếu điều/khoản hoặc bảng trong bản TCVN 5574:2018 được kiểm soát, kiểm tra đúng ký hiệu/đơn vị, và ghi rõ nếu workbook khác tiêu chuẩn. Không thay đổi công thức sản phẩm chỉ dựa trên register này.
