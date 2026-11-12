// Kiểm thử bộ sinh tổ hợp tải trọng: khớp bảng tính Cemcons THTT VER3 (giữ nguyên cách lập).
// Chạy: node wind-load/tests/combos.test.js
const assert = require('assert');
const path = require('path');
const COMBO = require(path.join(__dirname, '..', 'combos.js'));
const fx = require(path.join(__dirname, 'fixtures', 'excel-cemcons-thtt-ver3.json'));

let groups = 0;
const same = (got, exp, where) => {
  assert.strictEqual(got.length, exp.length, `${where}: số tổ hợp`);
  exp.forEach((e, i) => {
    const g = got[i];
    assert.strictEqual(g.name, e.name, `${where} #${i + 1}: tên`);
    assert.deepStrictEqual(Object.keys(g.f).sort(), Object.keys(e.f).sort(), `${e.name}: các trường hợp tải`);
    for (const k of Object.keys(e.f)) assert.ok(Math.abs(g.f[k] - e.f[k]) <= 1e-12, `${e.name} ${k}: ${g.f[k]} ≠ ${e.f[k]}`);
  });
};

// 1–4. Khớp Excel với mặc định (γf như bảng tính gốc) và các cấp hậu quả / loại sàn khác
for (const c of fx.cases) {
  const r = COMBO.build({ gn: c.gn, cat: c.cat });
  same(r.uls, c.uls, `TTGH1 ${c.gn}/${c.cat}`); same(r.sls, c.sls, `TTGH2 ${c.gn}/${c.cat}`);
  groups++;
}

// 5. Tắt nhóm động đất / xe chữa cháy: số tổ hợp và đánh số lại liên tục
{
  const r = COMBO.build({ eq: false, xcc: false });
  assert.strictEqual(r.uls.length, 13); assert.strictEqual(r.uls[12].name, 'Combo-TTGH1-13');
  assert.ok(!r.used.includes('EX') && !r.used.includes('XCC'));
  const r2 = COMBO.build({ eq: false });
  assert.strictEqual(r2.uls.length, 26); assert.deepStrictEqual(r2.uls[13].f, fx.cases[0].uls[29].f);
  groups++;
}

// 6. Đổi γf theo Bảng 1 / 8.3.5 và γn = 1,2 (Chú thích Bảng H.1)
{
  const r = COMBO.build({ gn: 'C3P', b: { SDL: 'ct', LL: 'k' } });
  assert.ok(Math.abs(r.uls[0].f.SDL - 1.3 * 1.2) < 1e-12 && Math.abs(r.uls[0].f.LL - 1.2 * 1.2) < 1e-12);
  assert.ok(Math.abs(r.uls[1].f.WX - 2.1 * 0.9 * 1.2) < 1e-12);
  const xcc = r.uls.find(c => c.group === 'dac-biet');
  assert.strictEqual(xcc.f.DL, 1.1, 'tổ hợp đặc biệt không nhân γn (công thức 2)');
  assert.strictEqual(r.sls[0].f.SDL, 1, 'TTGH2: γf = 1, γn = 1');
  groups++;
}

// 7. Bảng ETABS: mỗi dòng một trường hợp tải, tên theo mô hình
{
  const r = COMBO.build({ names: { WX: 'GIO-X', DL: ' ' } });
  const rows = COMBO.etabsRows(r);
  const n = [...r.uls, ...r.sls].reduce((t, c) => t + Object.keys(c.f).length, 0);
  assert.strictEqual(rows.length, n);
  assert.deepStrictEqual(rows[0], ['Combo-TTGH1-1', 'Linear Add', 'No', 'DL', 1.1]);
  assert.ok(rows.some(x => x[3] === 'GIO-X'));
  assert.ok(Object.keys(COMBO.normalize({ gn: 'Z', cat: 'Q', b: { DL: 'zz' } })).length && COMBO.normalize({ gn: 'Z' }).gn === 'C2');
  groups++;
}
console.log(`${groups} nhóm kiểm thử tổ hợp: PASS`);
