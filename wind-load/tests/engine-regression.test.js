// Regression test cho wind-load (TCVN 2737:2023). Chạy: node wind-load/tests/engine-regression.test.js
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const W = require('../engine.js');
global.WIND = W;
const TM = require('../report.js');
const QC = require('../data/qcvn02-2022-bang-5-1.js');
const fx = f => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8'));
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('PASS ' + name); };
const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${msg}: ${a} ≠ ${b}`);
const stories = hs => hs.map((h, i) => ({ name: 'S' + (hs.length - i), hs: h }));

test('Khớp bảng tính Excel Cemcons v4.8 (ví dụ 7 tầng)', () => {
  const { input: c, expected: e } = fx('excel-cemcons-v4.8-7-tang.json');
  const R = W.compute({ site: { W0: c.W0, V3s50: c.V3s50 }, B: c.B, L: c.L, Tx: c.Tx, Ty: c.Ty, terrainX: c.terrain, terrainY: c.terrain, struct: c.struct, stories: stories(c.stories_top_down) });
  close(R.dirs.X.gust.Gf, e.GfX, 1e-12, 'Gf X'); close(R.dirs.Y.gust.Gf, e.GfY, 1e-12, 'Gf Y');
  close(R.dirs.X.c, e.cX, 1e-12, 'c X'); close(R.dirs.Y.c, e.cY, 1e-12, 'c Y');
  R.dirs.X.rows.forEach((r, i) => close(r.Ftc, e.FX[i], 1e-12, 'F X tầng ' + i));
  R.dirs.Y.rows.forEach((r, i) => close(r.Ftc, e.FY[i], 1e-12, 'F Y tầng ' + i));
});

test('Khớp bản tính độc lập (mặt đất tự nhiên, tầng hầm, F.16)', () => {
  const { cases } = fx('independent-crosscheck.json');
  for (const [name, { input: c, expected: e }] of Object.entries(cases)) {
    const R = W.compute({ site: { W0: c.W0, V3s50: c.V }, B: c.B, L: c.L, Tx: c.Tx, Ty: c.Ty, terrainX: c.tX, terrainY: c.tY, struct: c.struct, stories: stories(c.stories), zGround: c.zg || 0 });
    const tol = R.dirs.X.method === 'F16' || R.dirs.Y.method === 'F16' ? 5e-3 : 1e-9; // F.16: Excel dùng công thức gần đúng cho Hình F.22/F.27
    close(R.H, e.H, 1e-9, name + ' H');
    for (const D of ['X', 'Y']) {
      const d = R.dirs[D], p = e[D];
      close(d.gust.Gf, p.Gf, 1e-9, `${name} Gf ${D}`);
      close(d.c, p.c, tol, `${name} c ${D}`);
      d.rows.forEach((r, i) => close(r.Ftc, p.F[i], tol, `${name} F ${D} tầng ${i}`));
      close(d.Vtt, p.V, tol, `${name} V ${D}`); close(d.Mtt, p.M, tol, `${name} M ${D}`);
    }
  }
});

test('Mặt đất tự nhiên: dải đón gió cắt ở mặt đất, tầng dưới đất không chịu gió', () => {
  const R = W.compute({ site: { W0: 95, V3s50: 44 }, B: 30, L: 21, Tx: 2.312, Ty: 1.929, terrainX: 'B', terrainY: 'B', struct: 'rc', stories: stories([4.4, 4.2, 4.2, 4.2, 4.2, 4.2, 4.5, 3, 3]), zGround: 5.55 });
  close(R.H, 30.35, 1e-9, 'H');
  close(R.stories[7].tribUse, 2.70, 1e-9, 'chiều cao đón gió sàn Story2');
  assert.ok(R.stories[8].below && R.dirs.X.rows[8].Ftc === 0, 'Story1 phải có lực = 0');
});

test('Sửa lỗi Excel: ngoài miền biểu đồ, ze < zmin, chặn k(ze)', () => {
  assert.strictEqual(W.cxInf(0.05), 2.0); assert.strictEqual(W.cxInf(60), 0.9);
  assert.strictEqual(W.klam(0.5), 0.6); assert.strictEqual(W.klam(2000), 1);
  const k = W.kze(2, 'C'); assert.ok(k.raisedZmin && k.zeUse === 9.14);
  assert.ok(W.kze(400, 'A').k <= 1.99);
});

test('Chia vùng ce theo Hình F.5a / Bảng F.4', () => {
  const x = W.f4(30, 21, 29.9), y = W.f4(21, 30, 29.9);
  close(x.wA, 6, 1e-12, 'X vùng A'); close(x.wB, 15, 1e-12, 'X vùng B'); assert.strictEqual(x.wC, 0);
  close(y.wA, 4.2, 1e-12, 'Y vùng A'); close(y.wB, 16.8, 1e-12, 'Y vùng B'); close(y.wC, 9, 1e-12, 'Y vùng C');
  close(x.cE, -0.521, 1e-3, 'cE phương X');
});

test('Dữ liệu QCVN 02:2022 Bảng 5.1', () => {
  assert.strictEqual(QC.length, 63);
  const rows = QC.flatMap(p => p.rows);
  assert.strictEqual(rows.length, 334);
  for (const r of rows) assert.strictEqual(r.W0, W.W0_ZONE[r.zone], 'W0 khớp vùng: ' + r.text);
});

test('Thuyết minh Word: tạo được file .docx có công thức OMML', () => {
  const inp = { site: { W0: 95, V3s50: 44, zone: 'II', provinceName: '1. Thành phố Hà Nội', text: 'Huyện Thường Tín' }, B: 30, L: 21, Tx: 2.312, Ty: 1.929, terrainX: 'B', terrainY: 'B', struct: 'rc', stories: stories([4.4, 4.2, 4.2, 4.2, 4.2, 4.2, 4.5]) };
  const files = TM.docxFiles(TM.build(inp, W.compute(inp), { project: 'Kiểm thử' }), { project: 'Kiểm thử' });
  assert.ok(files['word/document.xml'].includes('<m:oMath>'));
  const z = TM.docx(TM.build(inp, W.compute(inp), {}), {});
  assert.ok(z[0] === 0x50 && z[1] === 0x4b, 'file zip');
});

console.log(`\n${n} nhóm kiểm thử: PASS`);
