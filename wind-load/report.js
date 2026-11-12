/* ===== Thuyết minh: mô hình khối → DOCX (OMML) và HTML in ===== */
const TM = (() => {
  // ---------- định dạng số ----------
  function fmt(x, n = 2) {
    if (x == null || !isFinite(x)) return '—';
    let s = (+x).toFixed(n);
    if (s === '-0' || /^-0[.,]0*$/.test(s)) s = s.slice(1);
    return s.replace('.', ',');
  }
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ---------- mini parser công thức ----------
  // cú pháp: x_{..} x^{..} \frac{a}{b} \sqrt{x} \text{..} \( .. \) {nhóm}
  function parse(src) {
    let i = 0;
    function group() { // sau '{'
      const out = seq('}'); i++; return out;
    }
    function atom() {
      const c = src[i];
      if (c === '{') { i++; return { g: group() }; }
      if (c === '\\') {
        const m = /^\\([a-zA-Z]+|\(|\))/.exec(src.slice(i));
        const cmd = m[1]; i += m[0].length;
        if (cmd === 'frac') { i++; const a = group(); i++; const b = group(); return { f: [a, b] }; }
        if (cmd === 'sqrt') { i++; return { rad: group() }; }
        if (cmd === 'text') { i++; let s = ''; while (src[i] !== '}') s += src[i++]; i++; return { tx: s }; }
        if (cmd === '(') { const inner = seq('\\)'); i += 2; return { d: inner }; }
        return { t: cmd };
      }
      i++; return { t: c };
    }
    function seq(stop) {
      const out = [];
      while (i < src.length && !src.startsWith(stop, i)) {
        const c = src[i];
        if (c === '_' || c === '^') {
          i++;
          const arg = src[i] === '{' ? (i++, group()) : [atom()];
          const base = out.pop() || { t: '' };
          if (c === '_' ) out.push(base.sup && !base.sub ? { ...base, sub: arg } : { base, sub: arg });
          else out.push(base.sub && !base.sup && base.base ? { ...base, sup: arg } : { base, sup: arg });
          continue;
        }
        out.push(atom());
      }
      return out;
    }
    const r = seq('\u0000');
    // gộp ký tự thường liền nhau thành chuỗi (trừ chữ cái đứng trước _ ^ đã tách)
    return merge(r);
  }
  function merge(arr) {
    const out = [];
    for (const n of arr) {
      if (n.t != null && out.length && out[out.length - 1].t != null) out[out.length - 1].t += n.t;
      else out.push(walk(n));
    }
    return out;
  }
  function walk(n) {
    if (n.g) return { g: merge(n.g) };
    if (n.f) return { f: [merge(n.f[0]), merge(n.f[1])] };
    if (n.rad) return { rad: merge(n.rad) };
    if (n.d) return { d: merge(n.d) };
    if (n.base) {
      const o = { base: walk(n.base) };
      if (n.sub) o.sub = merge(n.sub);
      if (n.sup) o.sup = merge(n.sup);
      return o;
    }
    return n;
  }

  // ---------- OMML ----------
  const MR = (s, plain) => `<m:r>${plain ? '<m:rPr><m:sty m:val="p"/></m:rPr>' : ''}<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr><m:t xml:space="preserve">${esc(s)}</m:t></m:r>`;
  function omText(s) {
    // chữ số, dấu, từ ≥ 2 chữ (ln, exp, max, min, khi) → kiểu thường; chữ cái đơn → nghiêng; chữ có gạch trên → m:bar
    return s.replace(/ᾱ/g, 'α\u0304').replace(/([A-Za-z\u00C0-\u024F\u1E00-\u1EFF]{2,})|([A-Za-zα-ωΑ-Ωᾱℓ][\u0300-\u036f]?)|([^A-Za-zα-ωΑ-Ωᾱℓ]+)/g, (m, w, l, o) => {
      if (w) return MR(w, /^(ln|exp|max|min|khi|với|và|log)$/.test(w) || /[\u00C0-\u024F\u1E00-\u1EFF]/.test(w));
      if (o) return MR(o, true);
      if (l.length > 1) return `<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>${MR(l[0], false)}</m:e></m:bar>`;
      return MR(l, false);
    });
  }
  function om(nodes) { return nodes.map(omNode).join(''); }
  function omNode(n) {
    if (n.t != null) return omText(n.t);
    if (n.tx != null) return MR(n.tx, true);
    if (n.g) return om(n.g);
    if (n.f) return `<m:f><m:num>${om(n.f[0])}</m:num><m:den>${om(n.f[1])}</m:den></m:f>`;
    if (n.rad) return `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${om(n.rad)}</m:e></m:rad>`;
    if (n.d) return `<m:d><m:e>${om(n.d)}</m:e></m:d>`;
    if (n.base) {
      const b = omNode(n.base);
      if (n.sub && n.sup) return `<m:sSubSup><m:e>${b}</m:e><m:sub>${om(n.sub)}</m:sub><m:sup>${om(n.sup)}</m:sup></m:sSubSup>`;
      if (n.sub) return `<m:sSub><m:e>${b}</m:e><m:sub>${om(n.sub)}</m:sub></m:sSub>`;
      return `<m:sSup><m:e>${b}</m:e><m:sup>${om(n.sup)}</m:sup></m:sSup>`;
    }
    return '';
  }
  const omath = src => `<m:oMath>${om(parse(src))}</m:oMath>`;

  // ---------- HTML công thức ----------
  function hm(nodes) { return nodes.map(hmNode).join(''); }
  function hmText(s) {
    return s.replace(/ᾱ/g, 'α\u0304').replace(/([A-Za-z\u00C0-\u024F\u1E00-\u1EFF]{2,})|([A-Za-zα-ωΑ-Ωᾱℓ][\u0300-\u036f]?)|([^A-Za-zα-ωΑ-Ωᾱℓ]+)/g, (m, w, l, o) => {
      if (w) return `<span class="up">${esc(w)}</span>`;
      if (o) return esc(o);
      if (l.length > 1) return `<i class="ov">${esc(l[0])}</i>`;
      return `<i>${esc(l)}</i>`;
    });
  }
  function hmNode(n) {
    if (n.t != null) return hmText(n.t);
    if (n.tx != null) return `<span class="up">${esc(n.tx)}</span>`;
    if (n.g) return hm(n.g);
    if (n.f) return `<span class="fr"><span>${hm(n.f[0])}</span><span>${hm(n.f[1])}</span></span>`;
    if (n.rad) return `<span class="rad">√<span class="rc">${hm(n.rad)}</span></span>`;
    if (n.d) return `<span class="par">(</span>${hm(n.d)}<span class="par">)</span>`;
    if (n.base) {
      let s = hmNode(n.base);
      if (n.sub && n.sup) return `${s}<span class="ss"><sup>${hm(n.sup)}</sup><sub>${hm(n.sub)}</sub></span>`;
      if (n.sub) s += `<sub>${hm(n.sub)}</sub>`;
      if (n.sup) s += `<sup>${hm(n.sup)}</sup>`;
      return s;
    }
    return '';
  }
  const hmath = src => `<span class="m">${hm(parse(src))}</span>`;

  // ---------- nội dung thuyết minh ----------
  const DIRNAME = { X: 'phương X', Y: 'phương Y' };
  const TERR_DESC = {
    A: 'trống trải, không có hoặc có rất ít vật cản cao không quá 1,5 m (bờ biển thoáng, mặt sông, hồ lớn, đồng muối, cánh đồng không có cây cao...)',
    B: 'tương đối trống trải, có một số vật cản thưa thớt cao không quá 10 m (vùng ngoại ô ít nhà, thị trấn, làng mạc, rừng thưa hoặc rừng non, vùng trồng cây thưa...)',
    C: 'bị che chắn mạnh, có nhiều vật cản sát nhau cao từ 10 m trở lên (trong thành phố, vùng rừng rậm...)',
  };

  function build(inp, R, meta, CB) {
    const W = WIND, B = [];
    const T = d => W.TERRAIN[R.dirs[d].terrain];
    const same = inp.terrainX === inp.terrainY;
    const p = (...runs) => B.push({ t: 'p', runs });
    const eq = (m, n) => B.push({ t: 'eq', m, n });
    const h1 = text => B.push({ t: 'h1', text });
    const h2 = text => B.push({ t: 'h2', text });
    const bul = (...runs) => B.push({ t: 'bul', runs });
    const tbl = (caption, head, rows, opt = {}) => B.push({ t: 'table', caption, head, rows, ...opt });
    const m = s => { const k = /^(.*\S) \(([^()\\]*)\)$/.exec(s); return k ? [{ m: k[1] }, ` (${k[2]})`] : { m: s }; };
    const X = R.dirs.X, Y = R.dirs.Y;

    B.push({ t: 'title', text: 'THUYẾT MINH TÍNH TOÁN TẢI TRỌNG GIÓ' });
    B.push({ t: 'subtitle', text: 'Theo TCVN 2737:2023 – Tải trọng và tác động' });
    const info = [
      ['Công trình', meta.project || '—'], ['Hạng mục', meta.item || '—'], ['Địa điểm xây dựng', meta.address || '—'],
      ['Người tính', meta.author || '—'], ['Người kiểm tra', meta.checker || '—'], ['Ngày', meta.date || '—'],
    ];
    tbl(null, null, info, { widths: [30, 70], plain: true });

    h1('1. CƠ SỞ TÍNH TOÁN');
    bul('TCVN 2737:2023 Tải trọng và tác động [1].');
    bul('QCVN 02:2022/BXD Quy chuẩn kỹ thuật quốc gia về số liệu điều kiện tự nhiên dùng trong xây dựng [2].');
    p('Điều 10 của [1] áp dụng cho công trình có chiều cao không lớn hơn 200 m hoặc nhịp không lớn hơn 150 m (10.1.1). Công trình có chiều cao ', m(`H = ${fmt(R.H)}\\text{ m}`), R.H <= 200 ? ', nằm trong phạm vi áp dụng.' : ', vượt phạm vi áp dụng — cần số liệu và phương pháp riêng.');
    p('Tải trọng gió chính được quy về lực tập trung đặt tại tâm hình học của sàn mỗi tầng, xét theo hai phương X và Y của mặt bằng công trình.');

    h1('2. SỐ LIỆU ĐẦU VÀO');
    h2('2.1. Số liệu gió tại địa điểm xây dựng');
    const s = inp.site;
    if (!s.manual) p('Địa danh hành chính theo Bảng 5.1 [2]: ', { b: `${s.provinceName} – ${s.text}` }, '.');
    else p('Số liệu gió nhập theo ', { b: s.source || 'số liệu do người thiết kế cung cấp' }, '.');
    tbl('Bảng 1. Số liệu gió', ['Đại lượng', 'Ký hiệu', 'Giá trị', 'Nguồn'], [
      ['Vùng áp lực gió', '', s.zone || '—', 'Bảng 5.1 [2]'],
      ['Áp lực gió cơ sở (3 s, 20 năm)', m('W_0'), `${fmt(R.W0, Number.isInteger(R.W0) ? 0 : 2)} daN/m²`, 'Bảng 7 [1]; Bảng 5.1 [2]'],
      ['Vận tốc gió 3 s, chu kỳ lặp 50 năm', m('V_{3s,50}'), `${fmt(R.V, Number.isInteger(R.V) ? 0 : 1)} m/s`, 'Bảng 5.1 [2]'],
      ['Hệ số chuyển đổi chu kỳ lặp 20 → 10 năm', m('γ_T'), fmt(W.GAMMA_T, 3), '10.2.2 [1]'],
    ], { widths: [42, 14, 18, 26], align: ['l', 'c', 'c', 'l'] });
    p('Áp lực gió 3 s ứng với chu kỳ lặp 10 năm:');
    eq(`W_{3s,10} = γ_T·W_0 = ${fmt(W.GAMMA_T, 3)} × ${fmt(R.W0, Number.isInteger(R.W0) ? 0 : 2)} = ${fmt(R.W3, 2)} \\text{ daN/m²}`, '');

    h2('2.2. Dạng địa hình');
    const terrList = same ? [['X', 'Y']] : [['X'], ['Y']];
    for (const ds of terrList) {
      const t = R.dirs[ds[0]].terrain;
      p(`Dạng địa hình ${t}${same ? '' : ' (' + DIRNAME[ds[0]] + ')'}: ${TERR_DESC[t]} (Bảng 8 [1]).`);
    }
    if (!same) p('Theo Chú thích 2, Bảng 9 [1], dạng địa hình được phép khác nhau theo hướng gió.');
    const tset = [...new Set([inp.terrainX, inp.terrainY])];
    tbl('Bảng 2. Các hệ số phụ thuộc dạng địa hình (Bảng 8, Bảng 10 [1])',
      ['Dạng', m('z_g (m)'), m('z_{min} (m)'), m('α'), m('c_r'), m('ℓ (m)'), m('ε̄'), m('b̄'), m('ᾱ')],
      tset.map(t => { const q = W.TERRAIN[t]; return [t, fmt(q.zg), fmt(q.zmin), fmt(q.alpha, 1), fmt(q.cr), fmt(q.l), q.epsT, fmt(q.bbar), q.abarT]; }),
      { align: Array(9).fill('c') });

    h2('2.3. Kích thước và đặc trưng động lực của công trình');
    tbl('Bảng 3. Thông số công trình', ['Đại lượng', 'Ký hiệu', 'Giá trị'], [
      ['Chiều rộng (kích thước theo phương Y)', m('B'), `${fmt(R.B)} m`],
      ['Chiều dài (kích thước theo phương X)', m('L'), `${fmt(R.L)} m`],
      ...(inp.ground && Math.abs(R.zGround - R.zBase) > 1e-9 ? [['Mặt đất tự nhiên', '', inp.ground.text]] : []),
      ['Chiều cao chịu gió (từ mặt đất tự nhiên đến đỉnh)', m('H'), `${fmt(R.H)} m`],
      ['Số tầng tính gió', m('n'), String(R.stories.length)],
      ['Loại kết cấu', '', W.STRUCT[inp.struct].name],
      ['Độ cản', m('β'), fmt(R.beta, 3)],
      ['Chu kỳ dao động riêng thứ nhất phương X', m('T_{1x}'), `${fmt(inp.Tx, 3)} s`],
      ['Chu kỳ dao động riêng thứ nhất phương Y', m('T_{1y}'), `${fmt(inp.Ty, 3)} s`],
    ], { widths: [56, 16, 28], align: ['l', 'c', 'c'] });
    if (Math.abs(R.zGround - R.zBase) > 1e-9) { const nb = R.stories.filter(s => s.below).length; p(`Mặt đất tự nhiên ${inp.ground ? inp.ground.text : ''}. `, 'Tải trọng gió chỉ tác dụng lên phần công trình nằm trên mặt đất tự nhiên; chiều cao ', m('H'), ', độ cao ', m('z'), ' của các sàn và chiều cao đón gió đều tính từ mặt đất tự nhiên', nb ? `; ${nb} tầng nằm dưới mặt đất không chịu tải trọng gió.` : '.'); }
    p('Chu kỳ dao động riêng lấy từ kết quả phân tích dao động của mô hình kết cấu', meta.periodSource ? ` (${meta.periodSource})` : '', '.');

    h1('3. GIÁ TRỊ TIÊU CHUẨN VÀ TÍNH TOÁN CỦA TẢI TRỌNG GIÓ');
    p('Giá trị tiêu chuẩn của tải trọng gió tại độ cao tương đương ', m('z_e'), ' (10.2.2 [1]):');
    eq('W_k = W_{3s,10}·k\\(z_e\\)·c·G_f', '(10)');
    p('Giá trị tính toán: ', m('W_{tt} = γ_f·W_k'), ', với hệ số độ tin cậy ', m(`γ_f = ${fmt(R.gf, 1)}`), ' (10.1.6 [1]). Khi kiểm tra theo trạng thái giới hạn thứ hai dùng giá trị tiêu chuẩn (', m('γ_f = 1,0'), ', 4.2 [1]).');

    h1('4. HỆ SỐ k(ze)');
    p('Hệ số kể đến sự thay đổi áp lực gió theo độ cao và dạng địa hình (10.2.5 [1]):');
    eq('k\\(z_e\\) = 2,01·\\(\\frac{z_e}{z_g}\\)^{2/α}', '(12)');
    p('trong đó ', m('z_e'), ' lấy không nhỏ hơn ', m('z_{min}'), '; ', m('k(z_e)'), ' lấy không lớn hơn 1,99; 1,97 và 1,98 tương ứng với dạng địa hình A, B, C.');
    p('Độ cao tương đương ', m('z_e'), ' của nhà xác định theo 10.2.4 b) [1], với ', m('b'), ' là chiều rộng nhà vuông góc với hướng gió, ', m('h = H'), ' là chiều cao nhà:');
    for (const D of ['X', 'Y']) {
      const d = R.dirs[D], b = d.b, h = R.H;
      const M = v => fmt(v) + '\\text{ m}';
      let c;
      if (h <= b) c = [m(`h = ${M(h)} ≤ b = ${M(b)}`), ' → ', m(`z_e = h = ${M(h)}`), ' với mọi tầng.'];
      else if (h <= 2 * b) c = [m(`b = ${M(b)} < h = ${M(h)} ≤ 2b = ${M(2 * b)}`), ' → ', m('z_e = h'), ' khi ', m('z > b'), '; ', m('z_e = b'), ' khi ', m('0 < z ≤ b'), '.'];
      else c = [m(`h = ${M(h)} > 2b = ${M(2 * b)}`), ' → ', m('z_e = h'), ' khi ', m(`z ≥ h – b = ${M(h - b)}`), '; ', m('z_e = z'), ' khi ', m('b < z < h – b'), '; ', m('z_e = b'), ' khi ', m('0 < z ≤ b'), '.'];
      bul({ b: `Gió ${DIRNAME[D]}: ` }, ...c);
    }

    h1('5. HỆ SỐ HIỆU ỨNG GIẬT Gf');
    p('Theo 10.2.7 [1]: kết cấu "cứng" (', m('T_1 ≤ 1\\text{ s}'), ') lấy ', m('G_f = 0,85'), '; kết cấu "mềm" (', m('T_1 > 1\\text{ s}'), ') xác định theo công thức:');
    eq('G_f = 0,925·\\(\\frac{1 + 1,7·I\\(z_s\\)·\\sqrt{g_Q^2·Q^2 + g_R^2·R^2}}{1 + 1,7·g_v·I\\(z_s\\)}\\)', '(13)');
    p('Các đại lượng thành phần:');
    eq('I\\(z_s\\) = c_r·\\(\\frac{10}{z_s}\\)^{1/6};   z_s = 0,6h', '(14)');
    eq('g_R = \\sqrt{2ln\\(3600n_1\\)} + \\frac{0,577}{\\sqrt{2ln\\(3600n_1\\)}};   g_Q = g_v = 3,4', '(15)');
    eq('Q = \\sqrt{\\frac{1}{1 + 0,63·\\(\\frac{b + h}{L\\(z_s\\)}\\)^{0,63}}};   L\\(z_s\\) = ℓ·\\(\\frac{z_s}{10}\\)^{ε̄}', '(16), (17)');
    eq('R = \\sqrt{\\frac{1}{β}·R_n·R_h·R_b·\\(0,53 + 0,47R_d\\)}', '(18)');
    eq('R_n = \\frac{7,47N_1}{\\(1 + 10,3N_1\\)^{5/3}};   N_1 = \\frac{n_1·L\\(z_s\\)}{V\\(z_s\\)_{3600s,50}}', '(19), (20)');
    eq('V\\(z_s\\)_{3600s,50} = b̄·\\(\\frac{z_s}{10}\\)^{ᾱ}·V_{3s,50}', '(21)');
    eq('R_ℓ = \\frac{1}{η} – \\frac{1}{2η^2}·\\(1 – e^{–2η}\\);   η_h = \\frac{4,6n_1h}{V\\(z_s\\)};  η_b = \\frac{4,6n_1b}{V\\(z_s\\)};  η_d = \\frac{15,4n_1d}{V\\(z_s\\)}', '(22)–(24)');
    p('với ', m('b'), ' – chiều rộng công trình vuông góc với hướng gió, ', m('d'), ' – chiều sâu công trình theo hướng gió, ', m('n_1 = 1/T_1'), ' – tần số dao động riêng cơ bản thứ nhất.');
    const g = D => R.dirs[D].gust;
    const gr = (name, sym, f, n = 4) => [name, m(sym), fmt(f(X), n), fmt(f(Y), n)];
    tbl('Bảng 4. Kết quả tính hệ số hiệu ứng giật', ['Đại lượng', 'Ký hiệu', 'Gió phương X', 'Gió phương Y'], [
      ['Dạng địa hình', '', X.terrain, Y.terrain],
      gr('Bề rộng đón gió', 'b (m)', d => d.b, 2),
      gr('Chiều sâu theo hướng gió', 'd (m)', d => d.d, 2),
      gr('Chu kỳ dao động riêng', 'T_1 (s)', d => d.T1, 3),
      gr('Tần số dao động riêng', 'n_1 (Hz)', d => d.gust.n1, 4),
      gr('Độ cao tương đương', 'z_s (m)', d => d.gust.zs, 2),
      gr('Độ rối', 'I\\(z_s\\)', d => d.gust.Iz),
      gr('Thang nguyên kích thước xoáy', 'L\\(z_s\\) (m)', d => d.gust.Lz, 2),
      gr('Vận tốc gió trung bình 3600 s', 'V\\(z_s\\) (m/s)', d => d.gust.Vz, 2),
      gr('Hệ số phản ứng nền', 'Q', d => d.gust.Q),
      gr('Hệ số đỉnh cộng hưởng', 'g_R', d => d.gust.gR),
      gr('', 'N_1', d => d.gust.N1),
      gr('', 'R_n', d => d.gust.Rn),
      gr('', 'η_h', d => d.gust.eh), gr('', 'η_b', d => d.gust.eb), gr('', 'η_d', d => d.gust.ed),
      gr('', 'R_h', d => d.gust.Rh), gr('', 'R_b', d => d.gust.Rb), gr('', 'R_d', d => d.gust.Rd),
      gr('Hệ số phản ứng cộng hưởng', 'R', d => d.gust.R),
      ['Phân loại kết cấu', '', g('X').rigid ? 'Cứng (T₁ ≤ 1 s)' : 'Mềm (T₁ > 1 s)', g('Y').rigid ? 'Cứng (T₁ ≤ 1 s)' : 'Mềm (T₁ > 1 s)'],
      [{ b: 'Hệ số hiệu ứng giật' }, m('G_f'), { b: fmt(g('X').Gf, 4) }, { b: fmt(g('Y').Gf, 4) }],
    ], { widths: [38, 18, 22, 22], align: ['l', 'c', 'c', 'c'], small: true });
    for (const D of ['X', 'Y']) {
      const q = g(D);
      if (q.rigid) p(`Gió ${DIRNAME[D]}: `, m(`T_1 = ${fmt(R.dirs[D].T1, 3)}\\text{ s} ≤ 1\\text{ s}`), ' → ', m('G_f = 0,85'), '.');
      else eq(`G_{f,${D}} = 0,925·\\(\\frac{1 + 1,7×${fmt(q.Iz, 4)}×\\sqrt{3,4^2×${fmt(q.Q, 4)}^2 + ${fmt(q.gR, 4)}^2×${fmt(q.R, 4)}^2}}{1 + 1,7×3,4×${fmt(q.Iz, 4)}}\\) = ${fmt(q.Gf, 4)}`, '');
    }

    h1('6. HỆ SỐ KHÍ ĐỘNG c');
    p('Hệ số khí động xác định theo Phụ lục F [1]. Khi ', m('h/d ≤ 5'), ' dùng hệ số áp lực ngoài ', m('c_e'), ' cho tường thẳng đứng của nhà mặt bằng chữ nhật (F.4, Bảng F.4) và lấy tổng mặt đón gió và mặt khuất gió ', m('c = |c_{e,D}| + |c_{e,E}|'), '; khi ', m('h/d > 5'), ' dùng hệ số cản chính diện của công trình hình lăng trụ ', m('c_x = k_λ·c_{x∞}'), ' (F.16, F.18).');
    for (const D of ['X', 'Y']) {
      const d = R.dirs[D], a = d.f4, f = d.f16;
      h2(`6.${D === 'X' ? 1 : 2}. Gió ${DIRNAME[D]} (b = ${fmt(d.b)} m, d = ${fmt(d.d)} m, h = ${fmt(R.H)} m)`);
      p('Tỉ số ', m(`h/d = ${fmt(R.H)}/${fmt(d.d)} = ${fmt(a.hd, 3)}`), d.method === 'F4' ? ' ≤ 5 → dùng Bảng F.4.' : ' > 5 → dùng F.16.');
      if (d.method === 'F4') {
        p('Hệ số ', m('c_e'), ' nội suy tuyến tính theo ', m('h/d'), ' từ Bảng F.4; bề rộng các vùng theo Hình F.5a với ', m(`e = min\\(b; 2h\\) = ${fmt(a.e)}\\text{ m}`), ` (trường hợp ${a.cas}):`);
        tbl(`Bảng ${D === 'X' ? 5 : 6}. Hệ số khí động ce các vùng – gió ${DIRNAME[D]}`, ['Vùng', 'A', 'B', 'C', 'D', 'E'], [
          ['Hệ số ce', fmt(a.cA, 3), fmt(a.cB, 3), a.wC > 0 ? fmt(a.cC, 3) : '—', '+' + fmt(a.cD, 3), fmt(a.cE, 3)],
          ['Bề rộng vùng (m)', fmt(a.wA), a.wB > 0 ? fmt(a.wB) : '—', a.wC > 0 ? fmt(a.wC) : '—', fmt(a.wD), fmt(a.wE)],
        ], { align: Array(6).fill('c') });
        eq(`c_${D} = |c_{e,D}| + |c_{e,E}| = ${fmt(Math.abs(a.cD), 3)} + ${fmt(Math.abs(a.cE), 3)} = ${fmt(d.c, 3)}`, '');
      } else {
        p('Độ mảnh ', m(`λ = L/b = ${fmt(f.lam, 3)}`), `; độ mảnh hiệu dụng theo Bảng F.15: `, m(f.lamRule.replace('λe', 'λ_e') + ` = ${fmt(f.lamE, 3)}`), '; ', m(`k_λ = ${fmt(f.kl, 3)}`), ' (Hình F.27, ', m('φ = 1'), ').');
        p('Tỉ số ', m(`d/b = ${fmt(f.db, 3)}`), ' → ', m(`c_{x∞} = ${fmt(f.cinf, 3)}`), ' (Hình F.22).');
        eq(`c_${D} = k_λ·c_{x∞} = ${fmt(f.kl, 3)} × ${fmt(f.cinf, 3)} = ${fmt(d.c, 3)}`, '(F.6)');
      }
    }

    h1('7. TẢI TRỌNG GIÓ TÁC DỤNG LÊN CÁC TẦNG');
    p('Lực gió tập trung tại tầng thứ i:');
    eq('W_{tc,i} = W_{3s,10}·k\\(z_{e,i}\\)·c·G_f·b_i·h_{đ,i}·10^{–2} \\text{ (kN)};   W_{tt,i} = γ_f·W_{tc,i}', '');
    p('trong đó ', m('b_i'), ' là bề rộng đón gió của tầng, ', m('h_{đ,i}'), ' là chiều cao đón gió (nửa chiều cao tầng i cộng nửa chiều cao tầng phía trên; tầng mái lấy nửa chiều cao tầng mái; bỏ phần nằm dưới mặt đất tự nhiên), ' + (Math.abs(R.zGround - R.zBase) > 1e-9 ? 'z là chiều cao sàn tính từ mặt đất tự nhiên, ' : '') + '10', { sup: '–2' }, ' quy đổi daN sang kN.');
    for (const D of ['X', 'Y']) {
      const d = R.dirs[D];
      p({ b: `Gió ${DIRNAME[D]}: ` }, m(`W_{3s,10}·c·G_f = ${fmt(R.W3, 2)} × ${fmt(d.c, 3)} × ${fmt(d.gust.Gf, 4)} = ${fmt(R.W3 * d.c * d.gust.Gf, 2)} \\text{ daN/m²}`), `; dạng địa hình ${d.terrain}.`);
      const rows = d.rows.filter((r, i) => !R.stories[i].below).map(r => [r.name, fmt(r.z), fmt(r.zeUse), fmt(r.k, 3), fmt(r.Wk, 2), fmt(r.width), fmt(r.trib), fmt(r.Ftc, 2), fmt(r.Ftt, 2)]);
      rows.push([{ b: 'Tổng' }, '', '', '', '', '', '', { b: fmt(d.Vtc, 2) }, { b: fmt(d.Vtt, 2) }]);
      tbl(`Bảng ${D === 'X' ? 7 : 8}. Tải trọng gió các tầng – gió ${DIRNAME[D]}`,
        ['Tầng', m('z (m)'), m('z_e (m)'), m('k\\(z_e\\)'), m('W_k (daN/m²)'), m('b (m)'), m('h_đ (m)'), m('W_{tc} (kN)'), m('W_{tt} (kN)')],
        rows, { align: ['l', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'c'], small: true });
    }
    tbl('Bảng 9. Tổng hợp tại chân công trình', ['Đại lượng', 'Gió phương X', 'Gió phương Y'], [
      ['Hệ số khí động c', fmt(X.c, 3), fmt(Y.c, 3)],
      ['Hệ số hiệu ứng giật Gf', fmt(X.gust.Gf, 4), fmt(Y.gust.Gf, 4)],
      ['Tổng lực cắt tiêu chuẩn (kN)', fmt(X.Vtc, 1), fmt(Y.Vtc, 1)],
      ['Tổng lực cắt tính toán (kN)', fmt(X.Vtt, 1), fmt(Y.Vtt, 1)],
      ['Mô men lật tính toán tại chân (kN·m)', fmt(X.Mtt, 0), fmt(Y.Mtt, 0)],
    ], { widths: [50, 25, 25], align: ['l', 'c', 'c'] });

    if (CB) {
      const P = CB.params, cfg = CB.cfg, CO = COMBO;
      const f2 = v => fmt(v, 2), fc = v => { const r = CO.round(v), t = String(+Math.abs(r).toFixed(4)).replace('.', ','); return (r < 0 ? '–' : '') + t; };
      h1('8. TỔ HỢP TẢI TRỌNG');
      p('Tổ hợp tải trọng lập theo mục 6 [1]: tổ hợp cơ bản theo công thức (1), tổ hợp đặc biệt theo công thức (2)', cfg.eq ? '; tổ hợp có tải trọng động đất theo TCVN 9386:2012 [3]' : '', '. Hệ số trong bảng là hệ số nhân với giá trị của từng trường hợp tải khai báo trong mô hình.');
      eq('C_m = γ_n·\\(∑γ_{f,i}·G_{k,i} + ∑γ_{f,j}·ψ_{L,j}·Q_{k,L,j} + ∑γ_{f,m}·ψ_{t,m}·Q_{k,t,m}\\)', '(1)');
      if (cfg.xcc) eq('C_a = ∑γ_{f,i}·G_{k,i} + ∑γ_{f,j}·ψ_{L,j}·Q_{k,L,j} + ∑γ_{f,m}·ψ_{t,m}·Q_{k,t,m} + A_d', '(2)');
      const caseRows = CO.CASES.filter(k => CB.used.includes(k)).map(k => [CO.nameOf(cfg, k), CO.CASE_DESC[k],
        k === 'WX' || k === 'WY' ? 'Giá trị tiêu chuẩn Wtc (mục 7)' : k === 'XCC' ? 'Giá trị tính toán qd (8.6.2)' : k === 'EX' || k === 'EY' ? 'Tác động thiết kế (TCVN 9386)' : 'Giá trị tiêu chuẩn']);
      tbl('Bảng 10. Các trường hợp tải', ['Tên', 'Trường hợp tải', 'Giá trị khai báo'], caseRows, { widths: [16, 40, 44], align: ['l', 'l', 'l'] });
      const gfr = (lab, k) => [lab, f2(P.b[k]), cfg.xcc ? f2(P.a[k]) : '—', '1,00'];
      tbl('Bảng 11. Hệ số dùng lập tổ hợp', ['Hệ số', 'Tổ hợp cơ bản', 'Tổ hợp đặc biệt', 'TTGH2'], [
        ['Hệ số tầm quan trọng γn (Bảng H.1, H.3)', f2(P.gn), '—', '1,00'],
        gfr('γf bản thân kết cấu DL (Bảng 1)', 'DL'), gfr('γf hoàn thiện SDL (Bảng 1)', 'SDL'), gfr('γf tường WALL (Bảng 1)', 'WALL'), gfr('γf hoạt tải LL (8.3.5)', 'LL'),
        ['γf tải trọng gió (10.1.6)', f2(P.gfWind), cfg.xcc ? f2(P.gfWind) : '—', '1,00'],
        ['ψt tải ngắn hạn chủ đạo / thứ hai (6.4, 6.5)', `${f2(P.psiB[0])} / ${f2(P.psiB[1])}`, cfg.xcc ? `${f2(P.psiA[0])} / ${f2(P.psiA[1])}` : '—', `${f2(P.psiB[0])} / ${f2(P.psiB[1])}`],
        ...(cfg.eq ? [['ψ2 hoạt tải trong tổ hợp động đất (' + P.catText + ')', fmt(P.psi2, 1), '—', '—']] : []),
        ['Hệ số giảm hoạt tải (giá trị tiêu chuẩn giảm, 8.3.3)', '—', '—', f2(P.llRed)],
      ], { widths: [52, 16, 16, 16], align: ['l', 'c', 'c', 'c'] });
      const cols = CB.used, hd = ['Tổ hợp', ...cols.map(k => CO.nameOf(cfg, k))];
      const rowOf = r => [r.name, ...cols.map(k => r.f[k] == null ? '' : fc(r.f[k]))];
      tbl(`Bảng 12. Tổ hợp tải trọng TTGH1 (${CB.uls.length} tổ hợp)`, hd, CB.uls.map(rowOf), { align: ['l', ...cols.map(() => 'c')], small: true });
      tbl(`Bảng 13. Tổ hợp tải trọng TTGH2 (${CB.sls.length} tổ hợp)`, hd, CB.sls.map(rowOf), { align: ['l', ...cols.map(() => 'c')], small: true });
      const grpTxt = { 'co-ban': 'tổ hợp cơ bản', 'dong-dat': 'tổ hợp có động đất', 'dac-biet': 'tổ hợp đặc biệt có xe chữa cháy' };
      const ranges = [];
      for (const r of CB.uls) { const L = ranges[ranges.length - 1]; if (L && L.g === r.group) L.b = r.name; else ranges.push({ g: r.group, a: r.name, b: r.name }); }
      p('Trong Bảng 12: ', ranges.map(x => `${x.a.replace('Combo-TTGH1-', '')}–${x.b.replace('Combo-TTGH1-', '')}: ${grpTxt[x.g]}`).join('; '), '. Tổ hợp TTGH2 cuối cùng dùng giá trị tiêu chuẩn giảm của hoạt tải (8.3.3 [1]).');
    }

    h1(CB ? '9. GHI CHÚ' : '8. GHI CHÚ');
    const notes = [...R.warn, ...R.note];
    for (const D of ['X', 'Y']) if (R.dirs[D].gfE) notes.push(`Gió ${DIRNAME[D]}: Gf tính sơ bộ theo Phụ lục E.1 [1] = ${fmt(R.dirs[D].gfE, 3)} (chỉ để đối chiếu; kết quả dùng Gf = ${fmt(R.dirs[D].gust.Gf, 4)} theo công thức (13)).`);
    notes.push('Lực gió đặt tại tâm hình học của sàn; mô men xoắn WMz (10.2.1, phương án hai) chưa được xét trong thuyết minh này.');
    notes.push('Kích động xoáy cộng hưởng và dao động mất ổn định khí động (10.1.2 b, c) cần được kiểm tra riêng khi công trình thuộc phạm vi 10.1.4.');
    if (!inp.site.manual) notes.push('Địa danh hành chính lấy theo QCVN 02:2022/BXD (theo đơn vị hành chính trước khi sắp xếp năm 2025).');
    notes.forEach(n => bul(n));

    h1('TÀI LIỆU THAM KHẢO');
    p('[1] TCVN 2737:2023 Tải trọng và tác động.');
    p('[2] QCVN 02:2022/BXD Quy chuẩn kỹ thuật quốc gia về Số liệu điều kiện tự nhiên dùng trong xây dựng.');
    if (CB && CB.cfg.eq) p('[3] TCVN 9386:2012 Thiết kế công trình chịu động đất.');
    return B;
  }

  // ---------- DOCX ----------
  const TW = 9071; // bề rộng vùng chữ (twip)
  function runs(arr, opt = {}) {
    return arr.map(r => {
      if (r == null || r === '') return '';
      if (typeof r === 'string') return wr(r, opt);
      if (Array.isArray(r)) return runs(r, opt);
      if (r.m != null) return omath(r.m);
      if (r.b != null) return wr(r.b, { ...opt, b: true });
      if (r.sup != null) return wr(r.sup, { ...opt, sup: true });
      return '';
    }).join('');
  }
  function wr(text, o = {}) {
    const pr = (o.b ? '<w:b/>' : '') + (o.i ? '<w:i/>' : '') + (o.sz ? `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>` : '') + (o.sup ? '<w:vertAlign w:val="superscript"/>' : '');
    return `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
  }
  function cellRuns(c, o) { return Array.isArray(c) ? runs(c, o) : runs([c], o); }
  function docxBody(blocks) {
    const out = [];
    for (const b of blocks) {
      if (b.t === 'title') out.push(`<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>${wr(b.text)}</w:p>`);
      else if (b.t === 'subtitle') out.push(`<w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr>${wr(b.text)}</w:p>`);
      else if (b.t === 'h1') out.push(`<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>${wr(b.text)}</w:p>`);
      else if (b.t === 'h2') out.push(`<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>${wr(b.text)}</w:p>`);
      else if (b.t === 'p') out.push(`<w:p>${runs(b.runs)}</w:p>`);
      else if (b.t === 'bul') out.push(`<w:p><w:pPr><w:ind w:left="425" w:hanging="283"/></w:pPr>${wr('–')}<w:r><w:tab/></w:r>${runs(b.runs)}</w:p>`);
      else if (b.t === 'eq') out.push(`<w:p><w:pPr><w:pStyle w:val="Equation"/><w:tabs><w:tab w:val="center" w:pos="${Math.round(TW / 2)}"/><w:tab w:val="right" w:pos="${TW}"/></w:tabs></w:pPr><w:r><w:tab/></w:r>${omath(b.m)}${b.n ? `<w:r><w:tab/><w:t>${esc(b.n)}</w:t></w:r>` : ''}</w:p>`);
      else if (b.t === 'table') out.push(docxTable(b));
    }
    return out.join('');
  }
  function docxTable(b) {
    const ncol = (b.head || b.rows[0]).length;
    const widths = b.widths || Array(ncol).fill(100 / ncol);
    const tw = widths.map(w => Math.round(TW * w / 100));
    const sz = b.small ? 20 : 22;
    const bd = b.plain ? 'nil' : 'single';
    const borders = `<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(k => `<w:${k} w:val="${bd}" w:sz="4" w:space="0" w:color="000000"/>`).join('')}</w:tblBorders>`;
    const al = i => ({ l: 'left', c: 'center', r: 'right' })[(b.align || [])[i] || 'l'];
    const cell = (c, i, head) => `<w:tc><w:tcPr><w:tcW w:w="${tw[i]}" w:type="dxa"/>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="E8EDF2"/>' : ''}<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="TableText"/><w:jc w:val="${head ? 'center' : al(i)}"/></w:pPr>${cellRuns(c, { sz, b: head })}</w:p></w:tc>`;
    let x = '';
    if (b.caption) x += `<w:p><w:pPr><w:pStyle w:val="Caption"/><w:keepNext/></w:pPr>${wr(b.caption)}</w:p>`;
    x += `<w:tbl><w:tblPr><w:tblW w:w="${tw.reduce((a, c) => a + c, 0)}" w:type="dxa"/><w:jc w:val="center"/>${borders}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${tw.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
    if (b.head) x += `<w:tr><w:trPr><w:tblHeader/></w:trPr>${b.head.map((c, i) => cell(c, i, true)).join('')}</w:tr>`;
    for (const r of b.rows) x += `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r.map((c, i) => cell(c, i, false)).join('')}</w:tr>`;
    x += '</w:tbl><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>';
    return x;
  }
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  function docxFiles(blocks, meta) {
    const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${docxBody(blocks)}<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1701" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const font = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>';
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${NS}>
<w:docDefaults><w:rPrDefault><w:rPr>${font}<w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="80" w:line="300" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="0" w:after="60"/><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="240"/><w:jc w:val="center"/></w:pPr><w:rPr><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="100"/><w:jc w:val="left"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/><w:jc w:val="left"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="caption"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="120" w:after="60"/><w:jc w:val="center"/></w:pPr><w:rPr><w:i/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Equation"><w:name w:val="Equation"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="60" w:after="100"/><w:jc w:val="left"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="20" w:after="20" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/><w:jc w:val="right"/></w:pPr><w:rPr><w:sz w:val="20"/></w:rPr></w:style>
</w:styles>`;
    const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}><w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr>${wr((meta.project ? meta.project + ' – ' : '') + 'Thuyết minh tải trọng gió – Trang ')}<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;
    const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
    const drels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`;
    const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc('Thuyết minh tải trọng gió' + (meta.project ? ' – ' + meta.project : ''))}</dc:title><dc:creator>${esc(meta.author || '')}</dc:creator></cp:coreProperties>`;
    return { '[Content_Types].xml': ct, '_rels/.rels': rels, 'word/document.xml': doc, 'word/styles.xml': styles, 'word/footer1.xml': footer, 'word/_rels/document.xml.rels': drels, 'docProps/core.xml': core };
  }

  // ---------- ZIP (stored) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {
    const enc = new TextEncoder();
    const parts = [], central = [];
    let off = 0;
    for (const [name, content] of Object.entries(files)) {
      const nb = enc.encode(name), data = typeof content === 'string' ? enc.encode(content) : content;
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, nb.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), nb, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, nb.length, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), nb);
      off += 30 + nb.length + data.length;
    }
    const csize = central.reduce((a, c) => a + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, Object.keys(files).length, true); end.setUint16(10, Object.keys(files).length, true);
    end.setUint32(12, csize, true); end.setUint32(16, off, true);
    const all = [...parts, ...central, new Uint8Array(end.buffer)];
    const out = new Uint8Array(all.reduce((a, c) => a + c.length, 0));
    let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
    return out;
  }
  const docx = (blocks, meta) => zip(docxFiles(blocks, meta));

  // ---------- HTML (xem trước + bản in) ----------
  function hRuns(arr) {
    return arr.map(r => {
      if (r == null || r === '') return '';
      if (typeof r === 'string') return esc(r);
      if (Array.isArray(r)) return hRuns(r);
      if (r.m != null) return hmath(r.m);
      if (r.b != null) return `<b>${esc(r.b)}</b>`;
      if (r.sup != null) return `<sup>${esc(r.sup)}</sup>`;
      return '';
    }).join('');
  }
  const hCell = c => Array.isArray(c) ? hRuns(c) : hRuns([c]);
  function html(blocks) {
    return blocks.map(b => {
      if (b.t === 'title') return `<h1 class="tm-title">${esc(b.text)}</h1>`;
      if (b.t === 'subtitle') return `<p class="tm-sub">${esc(b.text)}</p>`;
      if (b.t === 'h1') return `<h2>${esc(b.text)}</h2>`;
      if (b.t === 'h2') return `<h3>${esc(b.text)}</h3>`;
      if (b.t === 'p') return `<p>${hRuns(b.runs)}</p>`;
      if (b.t === 'bul') return `<p class="bul">– ${hRuns(b.runs)}</p>`;
      if (b.t === 'eq') return `<div class="eq"><span class="eqb">${hmath(b.m)}</span><span class="eqn">${esc(b.n || '')}</span></div>`;
      if (b.t === 'table') {
        const al = i => (b.align || [])[i] || 'l';
        let x = b.caption ? `<p class="cap">${esc(b.caption)}</p>` : '';
        x += `<div class="ttw"><table class="${b.plain ? 'plain' : ''} ${b.small ? 'small' : ''}">`;
        if (b.widths) x += `<colgroup>${b.widths.map(w => `<col style="width:${w}%">`).join('')}</colgroup>`;
        if (b.head) x += `<thead><tr>${b.head.map(c => `<th>${hCell(c)}</th>`).join('')}</tr></thead>`;
        x += `<tbody>${b.rows.map(r => `<tr>${r.map((c, i) => `<td class="a${al(i)}">${hCell(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
        return x;
      }
      return '';
    }).join('\n');
  }
  const CSS = `.tm{font-family:"Times New Roman",Times,serif;font-size:13pt;line-height:1.45;color:#000}
.tm .tm-title{font-size:16pt;text-align:center;margin:0 0 2pt;font-weight:700}
.tm .tm-sub{text-align:center;font-style:italic;margin:0 0 14pt}
.tm h2{font-size:13pt;font-weight:700;margin:14pt 0 6pt}
.tm h3{font-size:13pt;font-weight:700;font-style:italic;margin:10pt 0 4pt}
.tm p{margin:0 0 5pt;text-align:justify}
.tm p.bul{padding-left:1.2em;text-indent:-0.8em}
.tm .cap{text-align:center;font-style:italic;font-size:12pt;margin:8pt 0 3pt}
.tm .eq{display:flex;align-items:center;margin:4pt 0 7pt}
.tm .eqb{flex:1;text-align:center}
.tm .eqn{min-width:5.5em;text-align:right}
.tm .ttw{overflow-x:auto}
.tm table{border-collapse:collapse;margin:0 auto 6pt;width:100%;font-size:11pt}
.tm table.small{font-size:10pt}
.tm th,.tm td{border:0.75pt solid #000;padding:2pt 4pt;vertical-align:middle}
.tm th{background:#e8edf2;text-align:center}
.tm table.plain td{border:none;padding:1pt 4pt}
.tm td.ac{text-align:center}.tm td.ar{text-align:right}
.tm .m{font-family:"Cambria Math","STIX Two Math","Times New Roman",serif;white-space:nowrap}
.tm .m i{font-style:italic}
.tm .m .up{font-style:normal}
.tm .m .ov{text-decoration:overline}
.tm .fr{display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;margin:0 2px}
.tm .fr>span:first-child{border-bottom:0.8px solid currentColor;padding:0 2px}
.tm .fr>span{line-height:1.2}
.tm .rad .rc{border-top:0.8px solid currentColor;padding:0 1px}
.tm .ss{display:inline-flex;flex-direction:column;vertical-align:middle;font-size:0.75em;line-height:1}
.tm .ss sup,.tm .ss sub{vertical-align:baseline}
.tm sub,.tm sup{font-size:0.72em}`;
  function printable(blocks, meta) {
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc('Thuyết minh tải trọng gió' + (meta.project ? ' – ' + meta.project : ''))}</title><style>
@page{size:A4;margin:20mm 20mm 20mm 30mm}
body{margin:0;background:#eef0f2}
.sheet{background:#fff;max-width:170mm;margin:12mm auto;padding:18mm 20mm 18mm 26mm;box-shadow:0 1px 6px rgba(0,0,0,.15)}
.bar{position:sticky;top:0;background:#1f2a36;color:#fff;font:14px system-ui,sans-serif;padding:10px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.bar button{font:inherit;padding:6px 14px;border:0;border-radius:4px;background:#e8792b;color:#fff;cursor:pointer}
@media print{.bar{display:none}body{background:#fff}.sheet{box-shadow:none;margin:0;padding:0;max-width:none}.tm table{page-break-inside:auto}.tm tr{page-break-inside:avoid}.tm h2,.tm h3,.tm .cap{page-break-after:avoid}}
${CSS}</style></head><body><div class="bar"><button onclick="window.print()">In / Lưu PDF</button><span>Chọn máy in “Lưu thành PDF” (Save as PDF), khổ A4.</span></div><div class="sheet tm">${html(blocks)}</div></body></html>`;
  }

  return { fmt, build, docx, docxFiles, zip, html, printable, CSS, parse };
})();
if (typeof module !== 'undefined') module.exports = TM;
