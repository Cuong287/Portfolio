# Portfolio

Quy tắc chung (vai trò, quy trình giao việc/duyệt/sửa, an toàn) nằm trong `~/.claude/CLAUDE.md`. File này chỉ chứa phần **riêng của dự án**.

## Mô tả ngắn
Trang portfolio cá nhân (Lê Văn Cường) host trên GitHub Pages: các trang HTML tĩnh
(index, academic-projects, awards, research) giới thiệu dự án, giải thưởng, nghiên cứu.
Trong thư mục `slab-design/` có một ứng dụng con độc lập: công cụ tính toán cốt thép
sàn bê tông theo TCVN 5574:2018 (HTML/CSS/JS thuần, có test engine riêng).
Thư mục `wind-load/` là ứng dụng con thứ hai: tính tải trọng gió nhà cao tầng theo
TCVN 2737:2023 (HTML/CSS/JS thuần, có test engine riêng), được gắn link từ thẻ
"04 / ENGINEERING TOOL" trong mục Works của `index.html`.

## Công nghệ và cấu trúc
- Ngôn ngữ/framework: HTML/CSS/JavaScript thuần (vanilla), không build tool, không framework,
  không `package.json` ở gốc.
- Thư mục chính:
  - `index.html`, `academic-projects.html`, `awards.html`, `research.html` — các trang portfolio.
  - `assets/images/`, `assets/screenshots/` — ảnh dự án, giải thưởng, nghiên cứu, ảnh chụp màn hình.
  - `slab-design/` — app con tính cốt thép sàn (TCVN 5574:2018): `index.html`, `app.js`, `engine.js`,
    `styles.css`, `calculator-refinement.css`, `docs/` (spec + verification register), `tests/`
    (regression test bằng Node `assert`, không dùng framework test).
  - `wind-load/` — app con tính tải trọng gió (TCVN 2737:2023, chuyển từ Excel Cemcons Wind v4.8):
    `index.html`, `styles.css`, `engine.js` (tính toán), `report.js` (thuyết minh .docx/bản in),
    `view3d.js` (mô hình 3D), `combos.js` (tổ hợp tải trọng cho ETABS), `app.js`,
    `data/qcvn02-2022-bang-5-1.js` (QCVN 02:2022 Bảng 5.1),
    `docs/` (spec + verification register), `tests/` (regression test bằng Node `assert`).
  - `tmp/` — thư mục scratch tạm (gitignored; `tmp/pdf-recrop/` đã xóa 2026-11-10).
- Quy ước đặt tên/định dạng: tên file kebab-case; `slab-design/` có `AGENTS.md` riêng quy định
  ranh giới (không sửa code ngoài `slab-design/**` khi làm việc trong app này, giữ nguyên
  kiến trúc HTML/CSS/JS thuần, không đổi công thức kỹ thuật để "cho qua" test).

## Lệnh kiểm chứng
- Test: `node slab-design/tests/engine-regression.test.js` (regression test cho engine tính
  cốt thép), `node wind-load/tests/engine-regression.test.js` (engine tải trọng gió) và
  `node wind-load/tests/combos.test.js` (tổ hợp tải trọng);
  trang portfolio chính chưa có test tự động.
- Lint/typecheck: chưa có.
- Build: không cần build (site tĩnh, mở trực tiếp file HTML hoặc serve qua static server).
- Chạy thử: mở trực tiếp `index.html`/`slab-design/index.html` bằng trình duyệt, hoặc
  `npx serve .` / `python -m http.server` rồi mở `http://localhost:<port>`.

## Kiểm chứng theo loại việc trong dự án này
- Code (JS trong `slab-design/`): chạy `node slab-design/tests/engine-regression.test.js`,
  kiểm tra output `PASS`. Thay đổi công thức kỹ thuật phải đối chiếu với
  `slab-design/docs/engineering-spec-tcvn5574-2018.md` và file Excel benchmark
  `Cemcons_SlabTCVN_Ver1.2.1_UnLockView.xlsm`.
- Code (JS trong `wind-load/`): chạy `node wind-load/tests/engine-regression.test.js`, kiểm tra
  7 nhóm `PASS`. Thay đổi công thức phải đối chiếu `wind-load/docs/engineering-spec-tcvn2737-2023.md`,
  TCVN 2737:2023 và file Excel benchmark `Cemcons_Wind_TCVN_2737-2023_Ver4.8.xlsm`.
  Tổ hợp tải trọng (`combos.js`): chạy `node wind-load/tests/combos.test.js` (7 nhóm `PASS`),
  đối chiếu mục 6 TCVN 2737:2023 và Excel `Cemcons.vn_THTT_TCVN_2737-2023._VER3.xlsx`.
- Web: mở thử trang trong browser (desktop + mobile viewport), kiểm tra console không lỗi,
  kiểm tra luồng chính: điều hướng giữa các trang, lightbox ảnh, scroll-spy nav.
- Tài liệu/nội dung: đối chiếu số liệu/giải thưởng/dự án với nguồn gốc (hồ sơ cá nhân),
  kiểm tra link ảnh không hỏng, giữ giọng văn hiện có (tiếng Anh, trang trọng, súc tích).

## Cấm đụng (worker và orchestrator đều cần hỏi người dùng trước)
- `google5ff38ad1296e1c4e.html` — file xác minh quyền sở hữu Google Search Console, không sửa/xóa.
- `.codex/`, `slab-design/.agents/` — cấu hình/skill của công cụ AI, không phải nội dung portfolio.
- `slab-design/AGENTS.md` — ranh giới riêng của app con, chỉ người dùng chỉnh.
- Không có secret/API key thật trong repo hiện tại; nếu sau này thêm `.env`, áp dụng quy tắc
  chung ở `~/.claude/CLAUDE.md`.

## Dữ liệu nhạy cảm
Không có dữ liệu cá nhân/khách hàng bí mật. Ảnh (`profile.png`, ảnh giải thưởng/dự án) là
nội dung công khai dùng để hiển thị trên site.

## Việc cần nhớ giữa các phiên
Xem `TODO.md`.
