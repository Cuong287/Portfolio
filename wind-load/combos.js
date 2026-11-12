/* Tổ hợp tải trọng theo TCVN 2737:2023 (mục 6) và TCVN 9386:2012 cho mô hình ETABS.
   Giữ nguyên cách lập của bảng tính Cemcons_THTT_TCVN_2737-2023 VER3 (42 tổ hợp TTGH1, 14 tổ hợp TTGH2);
   hệ số γf của từng trường hợp tải được chọn theo Bảng 1, 8.3.5 và Bảng 3 của tiêu chuẩn. */
const COMBO = (() => {
  // Bảng H.1 – hệ số tầm quan trọng (TTGH1); TTGH2 lấy 1,0 (H.3)
  const GN = {
    C1: { v: 0.87, t: 'C1 – mức độ quan trọng thấp' },
    C2: { v: 1.0, t: 'C2 – mức độ quan trọng trung bình' },
    C3: { v: 1.15, t: 'C3 – mức độ quan trọng cao' },
    C3P: { v: 1.2, t: 'C3 – nhà cao trên 250 m hoặc mái nhịp trên 120 m (Chú thích Bảng H.1)' },
  };
  // Bảng 1 – γf của trọng lượng kết cấu và đất
  const GF_PERM = {
    kl: { v: 1.05, t: 'Kết cấu kim loại' },
    bt: { v: 1.1, t: 'Bê tông > 1 600 kg/m³, bê tông cốt thép, khối xây, gỗ' },
    nm: { v: 1.2, t: 'Bê tông ≤ 1 600 kg/m³, lớp ngăn cách, căn phẳng, hoàn thiện – chế tạo trong nhà máy' },
    ct: { v: 1.3, t: 'Bê tông ≤ 1 600 kg/m³, lớp ngăn cách, căn phẳng, hoàn thiện – làm ngoài công trường' },
    dn: { v: 1.1, t: 'Đất nguyên thổ' },
    dd: { v: 1.15, t: 'Đất đắp' },
  };
  // γf của hoạt tải: 8.3.5 a) tải phân bố đều Bảng 4; 8.5.5 bãi đỗ xe Bảng 5; Bảng 3 mục 4–6 (xe bốc xếp, vật liệu chất kho, kho sách)
  const GF_LIVE = {
    u: { v: 1.3, t: 'Tải phân bố đều trên sàn, mái, cầu thang (Bảng 4; 8.3.5 a)' },
    k: { v: 1.2, t: 'Bãi đỗ xe (Bảng 5; 8.5.5); vật liệu chất kho, kho sách, kho lưu trữ, xe bốc xếp (Bảng 3)' },
  };
  // ψ2 cho tổ hợp có động đất: TCVN 9386:2012 dẫn EN 1990 Bảng A1.1 (giá trị như bảng tính gốc)
  const PSI2 = {
    A: { v: 0.3, t: 'A – Khu vực nhà ở' },
    B: { v: 0.3, t: 'B – Văn phòng' },
    C: { v: 0.6, t: 'C – Khu vực hội họp, tập trung đông người' },
    D: { v: 0.6, t: 'D – Khu vực mua bán' },
    E: { v: 0.8, t: 'E – Kho chứa' },
    F: { v: 0.6, t: 'F – Giao thông, xe ≤ 30 kN' },
    G: { v: 0.3, t: 'G – Giao thông, xe 30 kN đến 160 kN' },
    H: { v: 0, t: 'H – Mái' },
  };
  const GF_WIND = 2.1;            // 10.1.6
  const PSI_B = [1, 0.9];         // 6.4: ψt,1 chủ đạo; ψt,2 thứ hai
  const PSI_A = [0.5, 0.3];       // 6.5: tổ hợp đặc biệt
  const LL_RED = 0.35;            // 8.3.3: giá trị tiêu chuẩn giảm (TTGH2, tổ hợp 14 của bảng tính gốc)
  const CASES = ['DL', 'SDL', 'WALL', 'LL', 'WX', 'WY', 'EX', 'EY', 'XCC'];
  const CASE_DESC = {
    DL: 'Trọng lượng bản thân kết cấu', SDL: 'Tải hoàn thiện', WALL: 'Tải tường', LL: 'Hoạt tải phân bố đều',
    WX: 'Tải trọng gió phương X', WY: 'Tải trọng gió phương Y', EX: 'Động đất phương X', EY: 'Động đất phương Y', XCC: 'Tải trọng xe chữa cháy',
  };
  const defaults = () => ({
    gn: 'C2', cat: 'A', eq: true, xcc: true, inTM: true,
    b: { DL: 'bt', SDL: 'nm', WALL: 'bt', LL: 'u' },   // tổ hợp cơ bản (như bảng tính gốc: 1,1 / 1,2 / 1,1 / 1,3)
    a: { DL: 'bt', SDL: 'nm', WALL: 'ct', LL: 'u' },   // tổ hợp đặc biệt XCC (như bảng tính gốc: 1,1 / 1,2 / 1,3 / 1,3)
    names: Object.fromEntries(CASES.map(k => [k, k])),
  });
  function normalize(c) {
    const d = defaults();
    if (!c || typeof c !== 'object') return d;
    const o = { ...d, ...c, b: { ...d.b, ...(c.b || {}) }, a: { ...d.a, ...(c.a || {}) }, names: { ...d.names, ...(c.names || {}) } };
    if (!GN[o.gn]) o.gn = d.gn; if (!PSI2[o.cat]) o.cat = d.cat;
    for (const g of ['b', 'a']) { for (const k of ['DL', 'SDL', 'WALL']) if (!GF_PERM[o[g][k]]) o[g][k] = d[g][k]; if (!GF_LIVE[o[g].LL]) o[g].LL = d[g].LL; }
    for (const k of CASES) if (typeof o.names[k] !== 'string') o.names[k] = k;
    return o;
  }

  // Lập tổ hợp. Thứ tự phép nhân giữ như công thức trong bảng tính gốc để kết quả trùng khớp.
  function build(cfgIn) {
    const cfg = normalize(cfgIn);
    const J = GN[cfg.gn].v, psi2 = PSI2[cfg.cat].v;
    const K = GF_PERM[cfg.b.DL].v, L = GF_PERM[cfg.b.SDL].v, M = GF_PERM[cfg.b.WALL].v, N = GF_LIVE[cfg.b.LL].v, O = GF_WIND;
    const [P, Q] = PSI_B;
    const uls = [], sls = [];
    const put = (arr, group, desc, f) => { const g = {}; for (const k of CASES) if (f[k] != null && f[k] !== 0) g[k] = f[k]; arr.push({ group, desc, f: g }); };
    const W = [['WX', 1], ['WX', -1], ['WY', 1], ['WY', -1]];
    const sg = (s, k) => (s > 0 ? '+' : '−') + k;
    // --- TTGH1: tổ hợp cơ bản, công thức (1) ---
    const perm = () => ({ DL: K * J, SDL: L * J, WALL: M * J });
    put(uls, 'co-ban', 'Thường xuyên + hoạt tải', { ...perm(), LL: N * P * J });
    for (const [w, s] of W) put(uls, 'co-ban', `Hoạt tải chủ đạo, ${sg(s, w)} thứ hai`, { ...perm(), LL: N * P * J, [w]: s * O * Q * J });
    for (const [w, s] of W) put(uls, 'co-ban', `${sg(s, w)} chủ đạo, hoạt tải thứ hai`, { ...perm(), LL: N * Q * J, [w]: s * O * P * J });
    for (const [w, s] of W) put(uls, 'co-ban', `Thường xuyên ${sg(s, w)} (không hoạt tải)`, { ...perm(), [w]: s * O * P * J });
    // --- TTGH1: tổ hợp có động đất (TCVN 9386) ---
    if (cfg.eq) {
      const E = [[1, 0.3], [-1, 0.3], [-1, -0.3], [1, -0.3], [0.3, 1], [0.3, -1], [-0.3, 1], [-0.3, -1]];
      const ed = (ex, ey) => [ex, ey].map((v, i) => `${v < 0 ? '−' : '+'}${Math.abs(v) === 1 ? '' : '0,3'}${i ? 'EY' : 'EX'}`).join(' ');
      for (const [ex, ey] of E) put(uls, 'dong-dat', `Động đất ${ed(ex, ey)} (không hoạt tải)`, { DL: 1, SDL: 1, WALL: 1, EX: ex, EY: ey });
      for (const [ex, ey] of E) put(uls, 'dong-dat', `Động đất ${ed(ex, ey)} + ψ₂·hoạt tải`, { DL: 1, SDL: 1, WALL: 1, LL: psi2, EX: ex, EY: ey });
    }
    // --- TTGH1: tổ hợp đặc biệt có xe chữa cháy, công thức (2) – không nhân γn ---
    if (cfg.xcc) {
      const Ka = GF_PERM[cfg.a.DL].v, La = GF_PERM[cfg.a.SDL].v, Ma = GF_PERM[cfg.a.WALL].v, Na = GF_LIVE[cfg.a.LL].v;
      const [Pa, Qa] = PSI_A;
      const pa = () => ({ DL: Ka, SDL: La, WALL: Ma, XCC: 1 });
      put(uls, 'dac-biet', 'Xe chữa cháy + hoạt tải', { ...pa(), LL: Na * Pa });
      for (const [w, s] of W) put(uls, 'dac-biet', `Xe chữa cháy + hoạt tải chủ đạo, ${sg(s, w)}`, { ...pa(), LL: Na * Pa, [w]: s * O * Qa });
      // Bảng tính gốc: nhóm này lấy ψ = 0,5 cho cả hoạt tải và gió (giữ nguyên theo yêu cầu, xem nhật ký quyết định)
      for (const [w, s] of W) put(uls, 'dac-biet', `Xe chữa cháy + hoạt tải, ${sg(s, w)} chủ đạo`, { ...pa(), LL: Na * Pa, [w]: s * O * Pa });
      for (const [w, s] of W) put(uls, 'dac-biet', `Xe chữa cháy ${sg(s, w)} (không hoạt tải)`, { ...pa(), [w]: s * O * Pa });
    }
    // --- TTGH2: γf = 1 (4.2 b), γn = 1 (H.3) ---
    const one = { DL: 1, SDL: 1, WALL: 1 };
    put(sls, 'ttgh2', 'Thường xuyên + hoạt tải', { ...one, LL: 1 });
    for (const [w, s] of W) put(sls, 'ttgh2', `Hoạt tải chủ đạo, ${sg(s, w)} thứ hai`, { ...one, LL: 1, [w]: s * Q });
    for (const [w, s] of W) put(sls, 'ttgh2', `${sg(s, w)} chủ đạo, hoạt tải thứ hai`, { ...one, LL: Q, [w]: s * 1 });
    for (const [w, s] of W) put(sls, 'ttgh2', `Thường xuyên ${sg(s, w)} (không hoạt tải)`, { ...one, [w]: s * 1 });
    put(sls, 'ttgh2', 'Thường xuyên + giá trị tiêu chuẩn giảm của hoạt tải (8.3.3)', { ...one, LL: LL_RED });

    uls.forEach((c, i) => c.name = `Combo-TTGH1-${i + 1}`);
    sls.forEach((c, i) => c.name = `Combo-TTGH2-${i + 1}`);
    const used = CASES.filter(k => [...uls, ...sls].some(c => c.f[k] != null));
    return {
      cfg, uls, sls, used,
      params: {
        gn: J, gnText: GN[cfg.gn].t, psi2, catText: PSI2[cfg.cat].t, gfWind: O, psiB: PSI_B, psiA: PSI_A, llRed: LL_RED,
        b: { DL: K, SDL: L, WALL: M, LL: N }, a: { DL: GF_PERM[cfg.a.DL].v, SDL: GF_PERM[cfg.a.SDL].v, WALL: GF_PERM[cfg.a.WALL].v, LL: GF_LIVE[cfg.a.LL].v },
      },
    };
  }
  const nameOf = (cfg, k) => (cfg.names[k] || '').trim() || k;
  // Bảng "Load Combination Definitions" của ETABS: Name, Type, Is Auto, Load Name, SF
  function etabsRows(res) {
    const out = [];
    for (const c of [...res.uls, ...res.sls]) {
      let first = true;
      for (const k of CASES) if (c.f[k] != null) { out.push([c.name, first ? 'Linear Add' : '', first ? 'No' : '', nameOf(res.cfg, k), c.f[k]]); first = false; }
    }
    return out;
  }
  const round = v => +v.toPrecision(12); // bỏ sai số dấu phẩy động khi xuất (1,1×1,15 = 1,265)
  return { GN, GF_PERM, GF_LIVE, PSI2, CASES, CASE_DESC, GF_WIND, PSI_B, PSI_A, LL_RED, defaults, normalize, build, etabsRows, nameOf, round };
})();
if (typeof module !== 'undefined') module.exports = COMBO;
