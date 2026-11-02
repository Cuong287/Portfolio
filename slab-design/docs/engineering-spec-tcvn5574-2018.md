# Đặc tả kỹ thuật V1 — thiết kế uốn sàn BTCT

## Mục đích và ranh giới V1

Tài liệu này đóng khung mô-đun V1 theo workbook tham chiếu `Cemcons_SlabTCVN_Ver1.2.1_UnLockView.xlsm`, sheet `1.Tinh thep san`: kiểm tra **TTGH cường độ (ULS) theo uốn cho dải sàn rộng 1 m**. V1 tính diện tích cốt thép kéo yêu cầu, diện tích bố trí và các trạng thái kiểm tra hiện đang có trong Table1 của workbook.

Không thuộc V1: kiểm tra TTGH2/serviceability, nứt, võng, điều kiện cấu tạo đầy đủ, tải trọng/nội lực, tổ hợp tải, thiết kế đục lỗ, cắt, neo, thép mũ, bố trí bản vẽ và lựa chọn thép tự động. Sheet `2.Kiem tra TTGH2` tồn tại trong workbook và là bước phụ thuộc sau ULS, nhưng không được mô tả như một kết quả của V1.

## Nguồn và mức độ xác nhận

- Nguồn benchmark: workbook được cung cấp, sheet `1.Tinh thep san`, Table1 các hàng 17–22; bảng vật liệu ở `PhuLuc-Excel`.
- Các công thức, ngưỡng và trạng thái bên dưới là **Excel-derived**: được truy vết từ workbook, chưa phải là xác nhận độc lập theo văn bản TCVN 5574:2018.
- Mọi yêu cầu pháp quy/tiêu chuẩn phải được đối chiếu văn bản TCVN có kiểm soát phiên bản trước khi dùng cho phát hành. Các điểm còn thiếu bằng chứng được quản lý trong `tcvn-5574-2018-verification-register.md`.

## Quy ước đầu vào và vật liệu

Đơn vị tính trong V1: MPa, mm, kN·m, mm² và tỷ lệ không thứ nguyên. Dải tính có `b = 1000 mm` trong các benchmark hiện có, nhưng `b` vẫn là một đầu vào công thức.

| Đại lượng | Ký hiệu | Đơn vị | Nguồn workbook mặc định |
| --- | --- | ---: | --- |
| Cấp bê tông | — | — | `G3 = B30` |
| Cường độ nén tính toán | `Rb` | MPa | `G4`, tra `Bang_RbRbt`, nhân `yb`; B30 = 17 |
| Cường độ kéo bê tông | `Rbt` | MPa | `G5`; B30 = 1.15 |
| Mô đun bê tông | `Eb` | MPa | `G6`; B30 = 32,500 |
| Nhóm cốt thép | — | — | `G7 = CB300-V` |
| Cường độ thép kéo | `Rs` | MPa | `G8`; CB300-V = 260 |
| Mô đun thép | `Es` | MPa | `G10`; CB300-V = 200,000 |
| Hệ số bê tông | `yb` | — | `M7 = 1` |
| Biến dạng bê tông | `εb2` | — | `M4 = 0.0035` |
| Lớp bảo vệ nhập | `c` / `cbv` | mm | `M8 = 25`, named range `cbv` |
| Tỷ lệ cốt thép tối đa | `ρmax` / `umax` | — | `M9 = xR × Rb / Rs` |
| Dải tỷ lệ “tối ưu” | `ρop,min`, `ρop,max` | — | `M10 = 0.006`, `M11 = 0.009` |

Với các giá trị mặc định, `xR = 0.8 / (1 + Rs / (Es × εb2)) = 0.5833333333`, `aR = xR × (1 − 0.5 × xR) = 0.4131944444`, và `ρmax = 0.03814102564`.

## Chuỗi tính toán Table1

Mỗi **case hiệu lực** của Table1 có: dải sàn, phương (`X` hoặc `Y`), vị trí (gối trái, nhịp, gối phải), mô-men `Mtt`, `Lnhịp`, `b`, `h`, khoảng cách thép `a` và đường kính `φ`. Trong cache workbook, chỉ hàng đầu của từng cụm có thể chứa giá trị `S1`/phương; các hàng dưới để trống ô đó. Fixture giữ nguyên `input` thô theo từng hàng và tạo `effective_input` tự đủ cho test bằng quy tắc carry-forward theo cụm hiển thị: hàng 17–19 là `S1/X`, hàng 20–22 là `S1/Y`. Quy tắc này là chuẩn hóa fixture, không phải công thức Excel và không thay đổi giá trị tính toán.

| Bước | Công thức workbook | Cell/cột nguồn |
| --- | --- | --- |
| Chiều cao làm việc | `h0 = h − (cbv + 0.5 × φ)` | Table1 cột `h0`, công thức hàng 17–22 |
| Hệ số mô-men | `αm = ABS(Mtt) × 10^6 / (Rb × b × h0²)` | cột `αm` |
| Chiều cao vùng nén tương đối | `ξ = 1 − SQRT(1 − 2 × αm)` | cột `ξ` |
| Thép yêu cầu | `As,tt = ξ × Rb × b × h0 / Rs` | cột `As,tt` |
| Tỷ lệ thép yêu cầu | `ρtt = As,tt / (b × h0)` | cột `mtt` |
| Thép bố trí | `As,bt = PI() × φ² / 4 × (b / a)` | cột `As,bt` |
| Tỷ lệ thép bố trí | `ρbt = As,bt / (b × h0)` | cột `mbt` |

Các đường dẫn công thức cụ thể: `G4 = HLOOKUP($G$3,Bang_RbRbt,2,FALSE)*yb`; `G8 = VLOOKUP($G$7,Bang_Rs,3,0)`; `M5 = 0.8/(1+G8/(G10*M4))`; `M9 = $M$5*Rb/Rs`. Tại Table1, công thức `h0` tham chiếu named range `cbv`, các công thức còn lại tham chiếu `Rb`, `Rs`, `umax`, `u_opmin`, `u_opmax`.

## Kiểm tra và chuỗi trạng thái

Workbook dùng đúng chuỗi chữ tiếng Việt sau:

| Kiểm tra | Điều kiện Excel-derived | Kết quả |
| --- | --- | --- |
| Tỷ lệ yêu cầu trong miền | `0.001 ≤ ρtt ≤ ρmax` | `Thỏa` / `Không thỏa` |
| Tỷ lệ yêu cầu trong dải tối ưu | `ρop,min ≤ ρtt ≤ ρop,max` | `Thỏa` / `Không thỏa` |
| Diện tích bố trí đủ | `As,bt ≥ As,tt` | `Thỏa` / `Không thỏa` |
| Tỷ lệ bố trí trong miền | `0.001 ≤ ρbt ≤ ρmax` | `Thỏa` / `Không thỏa` |

Workbook có tính `aR` và `xR`, nhưng Table1 benchmark không có ô trạng thái trực tiếp cho `αm ≤ aR` hoặc `ξ ≤ xR`. V1 chỉ được coi đây là giá trị tham chiếu cho đến khi register xác nhận cách áp dụng tiêu chuẩn.

## Quy ước dấu mô-men

`Mtt` được lưu có dấu: benchmark gối là âm, nhịp là dương. Trong công thức sức kháng uốn của Table1, workbook lấy `ABS(Mtt)` trước khi tính `αm`; vì vậy `As,tt` không phân biệt dấu. Dấu và trường `vị trí` phải được giữ trong đầu vào/hiển thị để chỉ mặt/miền bố trí thép, không được âm hóa diện tích thép.

## Phụ thuộc đường kính φ

Đường kính không chỉ thay đổi diện tích thép bố trí. `φ` đi vào `h0`, rồi ảnh hưởng `αm`, `ξ`, `As,tt`, `ρtt`; đồng thời đi trực tiếp vào `As,bt` và `ρbt`. Do đó, mọi thao tác đổi `φ` trong sản phẩm tương lai phải tính lại toàn bộ chuỗi, không chỉ cập nhật `As,bt`.

Fixture có hai dạng bằng chứng:

1. Sáu case `direct_workbook_row_17` đến `direct_workbook_row_22` là giá trị cache trích xuất trực tiếp. Các hàng có `φ=14` cho `h0=118`, các hàng có `φ=12` cho `h0=119` với cùng `h=150`, `c=25`. Với hàng có ô nhãn trống, chỉ `effective_input` được carry-forward để case test tự đủ; số liệu thô vẫn nằm trong `input`.
2. Case `formula_derived_phi12_from_row17` là minh họa kiểm soát từ chính công thức hàng 17 khi thay riêng `φ` từ 14 xuống 12. Nó **không** là giá trị trích xuất trực tiếp và không được dùng làm baseline hồi quy của workbook.

## Ranh giới UI và dữ liệu

Đặc tả này không quy định giao diện hay tự động đề xuất. Nếu sau này triển khai, UI phải lưu mô-men có dấu, hiển thị đơn vị, và map trạng thái bằng đúng chuỗi fixture. Danh mục vật liệu, giá trị thiết kế và bất kỳ ngưỡng cấu tạo nào phải có provenance từ workbook hoặc văn bản tiêu chuẩn đã được reviewer xác nhận.
