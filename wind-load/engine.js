/* ===== Wind engine: TCVN 2737:2023, cách tính theo bảng Excel Cemcons v4.8 (đã sửa lỗi) ===== */
const WIND = (() => {
  const TERRAIN = {
    A: { zg: 213.36, zmin: 2.13, alpha: 11.5, cr: 0.15, l: 198.12, eps: 1 / 8, bbar: 0.80, abar: 1 / 9, kmax: 1.99, epsT: '1/8', abarT: '1/9' },
    B: { zg: 274.32, zmin: 4.57, alpha: 9.5, cr: 0.20, l: 152.40, eps: 1 / 5, bbar: 0.65, abar: 1 / 6.5, kmax: 1.97, epsT: '1/5', abarT: '1/6,5' },
    C: { zg: 365.76, zmin: 9.14, alpha: 7.0, cr: 0.30, l: 97.54, eps: 1 / 3, bbar: 0.45, abar: 1 / 4, kmax: 1.98, epsT: '1/3', abarT: '1/4' },
  };
  const STRUCT = {
    rc: { name: 'Kết cấu bê tông cốt thép', beta: 0.02 },
    comp: { name: 'Kết cấu liên hợp thép – bê tông', beta: 0.015 },
    steel: { name: 'Kết cấu thép', beta: 0.01 },
  };
  const W0_ZONE = { I: 65, II: 95, III: 125, IV: 155, V: 185 };
  const GAMMA_T = 0.852, GAMMA_F = 2.1, GQ = 3.4, GV = 3.4;
  const log10 = Math.log10;
  const vn = (x, n) => (+x).toFixed(n).replace('.', ',');

  // 10.2.4 b) — độ cao tương đương cho nhà; 10.2.5 — ze >= zmin
  function zeRaw(z, b, h) {
    if (h <= b) return h;
    if (h <= 2 * b) return z > b ? h : b;
    if (z >= h - b) return h;
    if (z > b) return z;
    return b;
  }
  function kze(ze, t) {
    const T = TERRAIN[t];
    const zeUse = Math.max(ze, T.zmin);
    const kRaw = 2.01 * Math.pow(zeUse / T.zg, 2 / T.alpha);
    return { zeUse, kRaw, k: Math.min(kRaw, T.kmax), raisedZmin: ze < T.zmin, capped: kRaw > T.kmax };
  }

  // Hình F.27 (φ = 1), công thức theo VBA ns_klamda, chặn trong [0,6 ; 1,0]
  function klam(le) {
    let k;
    if (le < 1) k = 0.6;
    else if (le < 10) k = 0.6 + 0.1 * log10(le);
    else if (le < 100) k = 0.45 + 0.25 * log10(le);
    else k = 0.61 + 0.17 * log10(le);
    return Math.min(Math.max(k, 0.6), 1);
  }
  // Hình F.22, công thức theo VBA noisuy_c (đường vẽ, 2,15 tại d/b = 1), sửa nhánh ngoài miền
  function cxInf(db) {
    if (db <= 0.2) return 2.0;
    if (db <= 0.7) return 0.73 * log10(db) + 2.51;
    if (db <= 5) return -1.64 * log10(db) + 2.15;
    if (db <= 10) return -0.33 * log10(db) + 1.23;
    return 0.9;
  }

  // Bảng F.4 + Hình F.5a (theo VBA Hesoc)
  function f4(b, d, h) {
    const hd = h / d;
    let cA = -1.2, cB = -0.8, cC = -0.5, cD, cE;
    if (hd > 1) { cD = 0.8; cE = ((5 - hd) * (-0.5) - 0.7 * (hd - 1)) / 4; }
    else if (hd > 0.25) { cD = ((1 - hd) * 0.7 + 0.8 * (hd - 0.25)) / 0.75; cE = ((1 - hd) * (-0.3) - 0.5 * (hd - 0.25)) / 0.75; }
    else { cD = 0.7; cE = -0.3; }
    const e = Math.min(b, 2 * h);
    let wA, wB, wC, cas;
    if (e >= 5 * d) { wA = d; wB = 0; wC = 0; cas = 'e ≥ 5d'; }
    else if (e >= d) { wA = e / 5; wB = d - e / 5; wC = 0; cas = 'd ≤ e < 5d'; }
    else { wA = e / 5; wB = 0.8 * e; wC = d - e; cas = 'e < d'; }
    return { hd, cA, cB, cC, cD, cE, e, wA, wB, wC, wD: b, wE: b, cas, c: Math.abs(cD) + Math.abs(cE) };
  }
  function f16(b, d, h) {
    const lam = Math.max(b, h) / Math.min(b, h);
    const tall = Math.min(b, h) < h; // chiều cao là kích thước lớn nhất → công xôn từ mặt đất (Bảng F.15)
    const lamE = tall ? 2 * lam : 0.5 * lam;
    const kl = klam(lamE);
    const db = d / b;
    const cinf = cxInf(db);
    return { lam, lamE, lamRule: tall ? 'λe = 2λ' : 'λe = λ/2', kl, db, cinf, c: kl * cinf };
  }

  // 10.2.7 — hệ số hiệu ứng giật
  function gust(p) { // p: {b, d, h, T1, terrain, beta, V}
    const T = TERRAIN[p.terrain];
    const n1 = 1 / p.T1;
    const zs = 0.6 * p.h;
    const Iz = T.cr * Math.pow(10 / zs, 1 / 6);
    const Lz = T.l * Math.pow(zs / 10, T.eps);
    const Vz = T.bbar * Math.pow(zs / 10, T.abar) * p.V;
    const Q = Math.sqrt(1 / (1 + 0.63 * Math.pow((p.b + p.h) / Lz, 0.63)));
    const lnn = Math.sqrt(2 * Math.log(3600 * n1));
    const gR = lnn + 0.577 / lnn;
    const N1 = n1 * Lz / Vz;
    const Rn = 7.47 * N1 / Math.pow(1 + 10.3 * N1, 5 / 3);
    const eh = 4.6 * n1 * p.h / Vz, eb = 4.6 * n1 * p.b / Vz, ed = 15.4 * n1 * p.d / Vz;
    const Rf = x => (x === 0 ? 1 : 1 / x - (1 - Math.exp(-2 * x)) / (2 * x * x));
    const Rh = Rf(eh), Rb = Rf(eb), Rd = Rf(ed);
    const R = Math.sqrt((1 / p.beta) * Rn * Rh * Rb * (0.53 + 0.47 * Rd));
    const rigid = p.T1 <= 1;
    const Gflex = 0.925 * (1 + 1.7 * Iz * Math.sqrt(GQ * GQ * Q * Q + gR * gR * R * R)) / (1 + 1.7 * GV * Iz);
    return { n1, zs, Iz, Lz, Vz, Q, gR, N1, Rn, eh, eb, ed, Rh, Rb, Rd, R, rigid, Gflex, Gf: rigid ? 0.85 : Gflex };
  }

  function makeStories(n, hTyp, h1) {
    const s = [];
    for (let i = n; i >= 1; i--) s.push({ name: 'Story' + i, hs: i === 1 ? h1 : hTyp, bx: null, by: null, trib: null });
    return s;
  }

  function compute(inp) {
    const warn = [], note = [];
    const site = inp.site;
    const W0 = site.W0, V = site.V3s50;
    const W3 = GAMMA_T * W0;
    const gf = inp.gammaF ?? GAMMA_F;
    const B = inp.B, L = inp.L;
    const beta = STRUCT[inp.struct].beta;
    // tầng: danh sách từ trên xuống
    const st = inp.stories.map(s => ({ ...s }));
    // cao độ: zAbs theo hệ cao độ công trình; z = chiều cao trên mặt đất tự nhiên (dùng tính gió)
    const zBase = +(inp.zBase || 0), zGround = +(inp.zGround || 0);
    let z = zBase;
    for (let i = st.length - 1; i >= 0; i--) { z = +(z + +st[i].hs).toFixed(6); st[i].zAbs = z; st[i].z = +(z - zGround).toFixed(6); }
    const H = st.length ? st[0].z : 0;
    st.forEach((s, i) => {
      const above = i === 0 ? 0 : +st[i - 1].hs;
      // dải đón gió [z − ½h tầng, z + ½h tầng trên], bỏ phần dưới mặt đất
      s.bandLo = Math.max(s.z - 0.5 * s.hs, 0); s.bandHi = s.z + 0.5 * above;
      s.tribAuto = Math.max(0, s.bandHi - s.bandLo);
      s.below = s.bandHi <= 1e-9;
      s.tribUse = s.trib != null && s.trib !== '' ? +s.trib : s.tribAuto;
      s.bxUse = s.bx != null && s.bx !== '' ? +s.bx : B;
      s.byUse = s.by != null && s.by !== '' ? +s.by : L;
    });

    const dirs = {};
    for (const D of ['X', 'Y']) {
      const b = D === 'X' ? B : L, d = D === 'X' ? L : B;
      const terrain = D === 'X' ? inp.terrainX : inp.terrainY;
      const T1 = D === 'X' ? inp.Tx : inp.Ty;
      const g = gust({ b, d, h: H, T1, terrain, beta, V });
      const a4 = f4(b, d, H), a16 = f16(b, d, H);
      const method = a4.hd > 5 ? 'F16' : 'F4';
      const c = method === 'F16' ? a16.c : a4.c;
      const rows = st.map(s => {
        const zr = zeRaw(s.z, b, H);
        const kk = kze(zr, terrain);
        const width = D === 'X' ? s.bxUse : s.byUse;
        const Wk = W3 * kk.k * c * g.Gf; // daN/m2
        const Ftc = Wk * width * s.tribUse / 100; // kN
        return { name: s.name, z: s.z, ze: zr, zeUse: kk.zeUse, k: kk.k, kRaw: kk.kRaw, raised: kk.raisedZmin, capped: kk.capped, width, trib: s.tribUse, Wk, Ftc, Ftt: Ftc * gf };
      });
      const V0 = rows.reduce((a, r) => a + r.Ftt, 0), V0tc = rows.reduce((a, r) => a + r.Ftc, 0);
      const M0 = rows.reduce((a, r) => a + r.Ftt * r.z, 0);
      dirs[D] = { D, b, d, terrain, T1, gust: g, f4: a4, f16: a16, method, c, rows, Vtc: V0tc, Vtt: V0, Mtt: M0 };
      if (a16.lamE > 20) warn.push(`Phương ${D}: độ mảnh hiệu dụng λe = ${vn(a16.lamE, 1)} > 20 — phải kiểm tra kích động xoáy cộng hưởng (10.1.4, γf = 1,0).`);
      if (rows.some(r => r.raised)) note.push(`Phương ${D}: một số tầng có ze < zmin = ${vn(TERRAIN[terrain].zmin, 2)} m, đã lấy ze = zmin (10.2.5).`);
      if (rows.some(r => r.capped)) note.push(`Phương ${D}: k(ze) đã chặn ở ${vn(TERRAIN[terrain].kmax, 2)} (ghi chú Bảng 8).`);
      if (g.rigid) note.push(`Phương ${D}: T1 = ${vn(T1, 3)} s ≤ 1 s → kết cấu "cứng", lấy Gf = 0,85 (10.2.7.2).`);
      if (method === 'F16' && (a16.db < 0.1 || a16.db > 100)) note.push(`Phương ${D}: d/b = ${vn(a16.db, 3)} nằm ngoài miền Hình F.22, lấy giá trị đầu mút.`);
      if (!g.rigid && H <= 150) {
        const ge = inp.struct === 'steel' ? 0.85 + H / 1010 : inp.struct === 'rc' ? 0.85 + H / 2840 : null;
        if (ge) dirs[D].gfE = ge;
      }
    }
    if (H > 200) warn.push(`Chiều cao H = ${vn(H, 2)} m > 200 m — ngoài phạm vi áp dụng của điều 10 (10.1.1).`);
    if (site.manual && W0_ZONE[site.zone] && Math.abs(W0_ZONE[site.zone] - W0) > 1e-9) note.push(`W0 = ${vn(W0, Number.isInteger(+W0) ? 0 : 2)} daN/m² khác giá trị Bảng 7 của vùng ${site.zone} (${W0_ZONE[site.zone]} daN/m²) — dùng W0 nhập tay.`);
    if (!st.length) warn.push('Chưa có tầng nào.');
    const nb = st.filter(s => s.below).length;
    if (Math.abs(zGround - zBase) > 1e-9) note.push(`Chiều cao chịu gió H = ${vn(H, 2)} m, tính từ mặt đất tự nhiên${nb ? `; ${nb} tầng nằm hoàn toàn dưới mặt đất, không chịu gió` : ''}.`);
    return { W0, V, W3, gf, H, B, L, beta, zBase, zGround, stories: st, dirs, warn, note };
  }

  return { TERRAIN, STRUCT, W0_ZONE, GAMMA_T, GAMMA_F, GQ, GV, zeRaw, kze, klam, cxInf, f4, f16, gust, makeStories, compute };
})();
if (typeof module !== 'undefined') module.exports = WIND;
