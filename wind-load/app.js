(() => {
  const $ = id => document.getElementById(id);
  const F = TM.fmt;
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const LS_KEY = 'gio-tcvn2737-draft-v1';

  // ---------- trạng thái ----------
  function example() {
    const stories = WIND.makeStories(7, 4.2, 4.5); stories[0].hs = 4.4;
    const hn = QC.findIndex(p => p.id === 1);
    const row = QC[hn].rows.findIndex(r => r.text.startsWith('Huyện Thường Tín (các'));
    return {
      example: true,
      meta: { project: 'Nhà văn phòng 7 tầng (ví dụ)', item: 'Khối nhà chính', address: 'Huyện Thường Tín, TP Hà Nội', author: '', checker: '', date: new Date().toLocaleDateString('vi-VN'), periodSource: 'ETABS' },
      site: { prov: hn, row, manual: false, zone: 'II', W0: 95, V3s50: 44, source: '' },
      B: 30, L: 21, Tx: 2.312, Ty: 1.929, terrainX: 'B', terrainY: 'B', terrainSplit: false, struct: 'rc', gRef: '', gRel: 'eq', gVal: 0,
      gen: { n: 7, h: 4.2, h1: 4.5 }, stories,
    };
  }
  function blank() {
    const s = example();
    s.example = false;
    s.meta = { project: '', item: '', address: '', author: '', checker: '', date: new Date().toLocaleDateString('vi-VN'), periodSource: 'ETABS' };
    return s;
  }
  let S;
  try { const raw = localStorage.getItem(LS_KEY); S = raw ? JSON.parse(raw) : null; } catch (e) { S = null; }
  if (!S || !S.stories) S = example();
  const migrate = s => {
    if (!s) return s;
    if (s.zBase != null && +s.zBase) s.zGround = +(+(s.zGround || 0) - +s.zBase).toFixed(4);
    delete s.zBase;
    if (s.cotDat == null && s.gRel == null) { s.lv0 = ''; s.cotDat = s.zGround != null && s.zGround !== '' ? +s.zGround : 0; } // bản cũ: mặt đất đo từ chân công trình
    delete s.zGround;
    if (s.gRel == null) { const c = +s.cotDat || 0; s.gRef = s.lv0 || ''; s.gRel = Math.abs(c) < 5e-4 ? 'eq' : c < 0 ? 'below' : 'above'; s.gVal = Math.abs(c); } // bản dùng cốt ±0.000
    delete s.lv0; delete s.cotDat;
    return s;
  };
  migrate(S);
  const persist = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { } };

  function siteData() {
    if (S.site.manual) return { manual: true, zone: S.site.zone, W0: +S.site.W0, V3s50: +S.site.V3s50, source: S.site.source };
    const p = QC[S.site.prov], r = p && p.rows[S.site.row];
    if (!r) return { manual: true, zone: S.site.zone, W0: +S.site.W0, V3s50: +S.site.V3s50 };
    return { manual: false, zone: r.zone, W0: r.W0, V3s50: r.V3s50, V10: r.V10m50, provinceName: `${p.id}. ${p.name}`, text: r.text };
  }
  // mặt đất tự nhiên mô tả theo một sàn trong bảng tầng ('' = đáy công trình): cao hơn / ngang / thấp hơn sàn đó
  function levelOf(name) {
    if (!name) return 0;
    let z = 0, found = null;
    for (let i = S.stories.length - 1; i >= 0; i--) { z += +S.stories[i].hs || 0; if (S.stories[i].name === name && found == null) found = z; }
    return found;
  }
  function ground() {
    let h = levelOf(S.gRef); const ok = h != null;
    if (!ok) h = 0;
    const name = ok && S.gRef ? S.gRef : '';
    const rel = S.gRel || 'eq', v = rel === 'eq' ? 0 : (S.gVal === '' || S.gVal == null ? NaN : +S.gVal);
    const zGround = h + (rel === 'below' ? -v : rel === 'above' ? v : 0);
    const refTxt = name ? `sàn ${name}` : 'đáy công trình';
    const text = rel === 'eq' || v === 0 ? `ngang ${refTxt}` : `${rel === 'below' ? 'thấp hơn' : 'cao hơn'} ${refTxt} ${F(v, 2)} m`;
    return { name, rel, v, h, zGround, text };
  }
  function input() {
    return { site: siteData(), B: +S.B, L: +S.L, Tx: +S.Tx, Ty: +S.Ty, terrainX: S.terrainX, terrainY: S.terrainY, struct: S.struct, stories: S.stories, zBase: 0, zGround: ground().zGround, ground: ground() };
  }
  function valid(inp) {
    const bad = [];
    if (!(inp.B > 0)) bad.push('chiều rộng B'); if (!(inp.L > 0)) bad.push('chiều dài L');
    if (!(inp.Tx > 0)) bad.push('chu kỳ T₁ phương X'); if (!(inp.Ty > 0)) bad.push('chu kỳ T₁ phương Y');
    if (!(inp.site.W0 > 0)) bad.push('W₀'); if (!(inp.site.V3s50 > 0)) bad.push('V₃ₛ,₅₀');
    if (!inp.stories.length || inp.stories.some(s => !(+s.hs > 0))) bad.push('chiều cao tầng (phải > 0)');
    if (!isFinite(inp.zGround) || inp.ground.v < 0) bad.push('khoảng cách giữa mặt đất tự nhiên và sàn (số mét ≥ 0)');
    else if (inp.stories.length && inp.stories.every(s => +s.hs > 0) && inp.stories.reduce((t, s) => t + +s.hs, 0) <= inp.zGround + 0.5) bad.push('mặt đất tự nhiên (phải thấp hơn đỉnh công trình ít nhất 0,5 m)');
    return bad;
  }

  // ---------- nhập liệu: hồ sơ ----------
  const metaMap = { mProject: 'project', mItem: 'item', mAddress: 'address', mAuthor: 'author', mChecker: 'checker', mDate: 'date', mPeriod: 'periodSource' };
  function fillInputs() {
    for (const [id, k] of Object.entries(metaMap)) $(id).value = S.meta[k] || '';
    // địa danh
    $('selProv').innerHTML = QC.map((p, i) => `<option value="${i}">${p.id}. ${esc(p.name)}</option>`).join('');
    $('selProv').value = S.site.prov;
    fillRows();
    $('chkManual').checked = !!S.site.manual;
    $('mZone').value = S.site.zone || 'II'; $('mW0').value = S.site.W0 ?? ''; $('mV').value = S.site.V3s50 ?? ''; $('mSource').value = S.site.source || '';
    $('iB').value = S.B; $('iL').value = S.L; $('iTx').value = S.Tx; $('iTy').value = S.Ty; $('gRel').value = S.gRel || 'eq'; $('gVal').value = S.gVal ?? 0; $('gVal').disabled = (S.gRel || 'eq') === 'eq';
    if (S.terrainSplit == null) S.terrainSplit = S.terrainX !== S.terrainY;
    $('iTerX').value = S.terrainX; $('iTerY').value = S.terrainY; $('iStruct').value = S.struct;
    $('chkTerSplit').checked = !!S.terrainSplit; terMode();
    $('gN').value = S.gen.n; $('gH').value = S.gen.h; $('gH1').value = S.gen.h1;
    siteMode(); renderStories();
  }
  function fillRows() {
    const p = QC[S.site.prov];
    $('selRow').innerHTML = p.rows.map((r, i) => `<option value="${i}">[${r.zone}] ${esc(r.text.length > 90 ? r.text.slice(0, 88) + '…' : r.text)}</option>`).join('');
    if (S.site.row >= p.rows.length) S.site.row = 0;
    $('selRow').value = S.site.row;
  }
  function siteMode() {
    $('siteManual').hidden = !S.site.manual;
    $('siteAuto').hidden = !!S.site.manual;
  }
  function renderSiteCard() {
    const d = siteData();
    $('siteCard').innerHTML = `<div><small>Vùng</small><b><span class="zone">${esc(d.zone || '—')}</span></b></div>
      <div><small>W₀ (daN/m²)</small><b>${F(d.W0, Number.isInteger(+d.W0) ? 0 : 2)}</b></div><div><small>V₃ₛ,₅₀ (m/s)</small><b>${F(d.V3s50, Number.isInteger(+d.V3s50) ? 0 : 1)}</b></div>
      <div><small>W₃ₛ,₁₀ (daN/m²)</small><b>${F(d.W0 * WIND.GAMMA_T, 2)}</b></div>
      ${d.manual ? `<div class="full">Số liệu nhập tay${d.source ? ': ' + esc(d.source) : ''}.</div>` : `<div class="full">${esc(d.text)}${d.V10 ? ` · V₁₀ₘ,₅₀ = ${d.V10} m/s` : ''}</div>`}`;
  }

  // hình mặt đứng nhỏ: vị trí mặt đất so với các tầng
  function groundSketch(gd) {
    const st = R.stories, n = st.length, top = st[0].zAbs, zg = R.zGround;
    const lo = Math.min(0, zg), hi = Math.max(top, zg), W = 340, Hh = 204, y0 = 12, y1 = Hh - 34;
    const sy = z => y1 - (z - lo) / (hi - lo || 1) * (y1 - y0);
    const bx0 = 118, bx1 = 178, gy = sy(zg);
    const halo = 'paint-order:stroke;stroke:var(--panel);stroke-width:3px;stroke-linejoin:round';
    let g = `<defs><pattern id="gsH" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--muted)" stroke-width="1"/></pattern></defs>`;
    g += `<rect x="6" y="${gy}" width="${W - 12}" height="${Math.max(0, Hh - 4 - gy)}" style="fill:url(#gsH);opacity:.35"/>`;
    g += `<rect x="${bx0}" y="${sy(top)}" width="${bx1 - bx0}" height="${sy(0) - sy(top)}" style="fill:var(--sunk);stroke:var(--ink)" stroke-width="1.2"/>`;
    if (zg > 0) g += `<rect x="${bx0}" y="${gy}" width="${bx1 - bx0}" height="${sy(0) - gy}" style="fill:var(--muted);opacity:.3"/>`;
    st.forEach((s, i) => { const y = sy(s.zAbs); if (i) g += `<line x1="${bx0}" x2="${bx1}" y1="${y}" y2="${y}" style="stroke:var(--line)"/>`; });
    // mặt đất
    g += `<line x1="6" x2="${W - 6}" y1="${gy}" y2="${gy}" style="stroke:var(--ink)" stroke-width="1.6"/>`;
    // sàn mốc (cam) và nhãn sàn bên phải: sàn mốc trước, rồi đỉnh, rồi tầng dưới cùng
    const ri = gd.name ? st.findIndex(s => s.name === gd.name) : -1, yRef = sy(gd.h);
    g += `<line x1="${bx0 - 4}" x2="${bx1 + 4}" y1="${yRef}" y2="${yRef}" style="stroke:var(--accent)" stroke-width="2"/>`;
    const labels = [[yRef, gd.name ? `${gd.name} ← sàn chọn` : 'Đáy công trình ← mốc', true]];
    labels.push([sy(top), st[0].name, false]);
    if (n > 1 && ri !== n - 1) labels.push([sy(st[n - 1].zAbs), st[n - 1].name, false]);
    const placed = [];
    for (let [y, t, isRef] of labels) {
      if (isRef && Math.abs(y - gy) < 9) y = Math.min(y, gy) - 7; // tránh nằm trên đường mặt đất
      if (placed.some(p => Math.abs(p - y) < 12)) continue; placed.push(y);
      g += `<text x="${bx1 + 8}" y="${y + 3.5}" style="${halo};${isRef ? 'fill:var(--accent);font-weight:600' : ''}">${esc(t)}</text>`;
    }
    // nhãn mặt đất bên trái (2 dòng), ghi luôn quan hệ với sàn chọn
    const up = gd.rel === 'above' && sy(0) - gy < 30 ? false : true;
    g += `<text x="8" y="${gy + 13}" style="${halo};fill:var(--ink);font-weight:600">Mặt đất</text>`;
    if (gd.rel !== 'eq' && gd.v > 0) g += `<text x="8" y="${gy + 25}" style="${halo};fill:var(--ink)">${gd.rel === 'below' ? 'thấp' : 'cao'} hơn ${F(gd.v, 2)} m</text>`;
    // kích thước H (từ mặt đất tới đỉnh), bên trái công trình
    const xh = bx0 - 16, yt = sy(top);
    g += `<line x1="${xh}" x2="${xh}" y1="${yt}" y2="${gy}" style="stroke:var(--x)" stroke-width="1.2"/><path d="M${xh} ${yt} l-3 6 h6z M${xh} ${gy} l-3 -6 h6z" style="fill:var(--x)"/>`;
    g += `<text x="${xh - 5}" y="${(yt + gy) / 2 - 2}" text-anchor="end" style="${halo};fill:var(--x);font-weight:600">H = ${F(R.H, 2)} m</text><text x="${xh - 5}" y="${(yt + gy) / 2 + 11}" text-anchor="end" style="${halo};fill:var(--x)">chịu gió</text>`;
    return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Vị trí mặt đất tự nhiên so với công trình">${g}</svg>`;
  }

  // ---------- bảng tầng ----------
  function fillLv0() {
    const sel = $('gRef'), names = S.stories.map(s => s.name).reverse();
    sel.innerHTML = `<option value="">Đáy công trình</option>` + names.map(n => `<option value="${esc(n)}">Sàn ${esc(n)}</option>`).join('');
    sel.value = names.includes(S.gRef) ? S.gRef : '';
  }
  function renderStories() {
    fillLv0();
    const tb = $('tblSt').tBodies[0];
    tb.innerHTML = S.stories.map((s, i) => `<tr data-i="${i}">
      <td><input data-k="name" value="${esc(s.name)}" aria-label="Tên tầng" style="min-width:80px"></td>
      <td><input data-k="hs" type="number" step="any" min="0" value="${esc(s.hs)}" aria-label="Cao tầng" style="min-width:70px"></td>
      <td class="c" data-z></td>
      <td><input data-k="bx" type="number" step="any" min="0" value="${esc(s.bx ?? '')}" aria-label="Bề rộng phương X" style="min-width:70px"></td>
      <td><input data-k="by" type="number" step="any" min="0" value="${esc(s.by ?? '')}" aria-label="Bề rộng phương Y" style="min-width:70px"></td>
      <td><input data-k="trib" type="number" step="any" min="0" value="${esc(s.trib ?? '')}" aria-label="Cao đón gió" style="min-width:70px"></td>
      <td><button class="del" type="button" data-del="${i}" aria-label="Xoá tầng ${esc(s.name)}" title="Xoá tầng">×</button></td></tr>`).join('');
  }
  function updateStoryComputed(R) {
    const rows = $('tblSt').tBodies[0].rows;
    R.stories.forEach((s, i) => {
      const tr = rows[i]; if (!tr) return;
      tr.querySelector('[data-z]').textContent = s.z < -5e-4 ? '−' + F(-s.z) : F(Math.max(s.z, 0)); tr.classList.toggle('under', !!s.below);
      tr.querySelector('[data-k=bx]').placeholder = F(R.B);
      tr.querySelector('[data-k=by]').placeholder = F(R.L);
      tr.querySelector('[data-k=trib]').placeholder = F(s.tribAuto);
    });
  }

  // ---------- kết quả ----------
  let R = null, lastInp = null;
  function recompute() {
    const inp = input();
    renderSiteCard();
    const bad = valid(inp);
    $('exBadge').hidden = !S.example;
    $('hdrProj').textContent = S.meta.project || '';
    if (bad.length) {
      R = null;
      $('kpis').innerHTML = '';
      $('alerts').innerHTML = `<div class="alert w"><b>Thiếu hoặc sai số liệu:</b> ${esc(bad.join(', '))}. Kiểm tra lại các ô bên trái.</div>`;
      ['tLoad', 'tGf', 'tAero'].forEach(id => $(id).innerHTML = '');
      $('tmPrev').innerHTML = '';
      return;
    }
    R = WIND.compute(inp); lastInp = inp;
    updateStoryComputed(R);
    summaries(inp);
    renderKpis(); renderAlerts(); renderLoad(); renderGf(); renderAero();
    if (!$('tTM').hidden) renderTM();
    persist();
  }
  function summaries(inp) {
    $('sMeta').textContent = S.meta.project || '';
    $('sSite').textContent = `Vùng ${inp.site.zone} · W₀ ${F(inp.site.W0, 0)} · V ${F(inp.site.V3s50, 0)}`;
    $('sBld').textContent = `${F(R.B, 1)} × ${F(R.L, 1)} × ${F(R.H, 1)} m${R.zGround ? ' (từ MĐTN)' : ''}`;
    $('sSt').textContent = `${R.stories.length} tầng · H = ${F(R.H)} m`;
    const under = R.stories.filter(s => s.below).map(s => s.name);
    $('zgInfo').innerHTML = `Mặt đất tự nhiên ${esc(inp.ground.text)}. Chiều cao chịu gió <i>H</i> = <b>${F(R.H)} m</b> (từ mặt đất lên đỉnh).${under.length ? ` Tầng nằm dưới đất, không chịu gió: ${esc(under.join(', '))}.` : ''}`;
    $('gSketch').innerHTML = groundSketch(inp.ground);
  }
  function renderKpis() {
    const X = R.dirs.X, Y = R.dirs.Y;
    const xy = (a, b, n) => `<div class="xy"><span><em class="tx">X</em>${a}</span><span><em class="ty">Y</em>${b}</span></div>`;
    $('kpis').innerHTML = `
      <div class="kpi"><span class="lab">Áp lực gió W₃ₛ,₁₀</span><span class="val">${F(R.W3, 2)}<span class="u">daN/m²</span></span></div>
      <div class="kpi"><span class="lab">Hệ số hiệu ứng giật G<sub>f</sub></span>${xy(F(X.gust.Gf, 3), F(Y.gust.Gf, 3))}</div>
      <div class="kpi"><span class="lab">Hệ số khí động c <span class="chip">${X.method === Y.method ? X.method : X.method + ' / ' + Y.method}</span></span>${xy(F(X.c, 3), F(Y.c, 3))}</div>
      <div class="kpi"><span class="lab">Tổng lực cắt tính toán (kN)</span>${xy(F(X.Vtt, 0), F(Y.Vtt, 0))}</div>
      <div class="kpi"><span class="lab">Mô men lật tính toán (kN·m)</span>${xy(F(X.Mtt, 0), F(Y.Mtt, 0))}</div>`;
  }
  function renderAlerts() {
    const W = R.warn.map(t => `<div class="alert w"><b>Cảnh báo</b> ${esc(t)}</div>`);
    const N = R.note.map(t => `<div class="alert n">${esc(t)}</div>`);
    $('alerts').innerHTML = W.join('') + N.join('');
  }
  // ---------- sơ đồ mặt đứng ----------
  const VIZ = (() => { try { return { mode: 'force', val: 'tt', show: 'both', ...JSON.parse(localStorage.getItem(LS_KEY + '-viz') || '{}') }; } catch (e) { return { mode: 'force', val: 'tt' }; } })();
  const saveViz = () => { try { localStorage.setItem(LS_KEY + '-viz', JSON.stringify(VIZ)); } catch (e) { } };
  function niceStep(raw) { const p = Math.pow(10, Math.floor(Math.log10(raw))); const n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
  const fF = v => F(v, v >= 1000 ? 0 : 1);
  function bands(rows) { // dải chịu gió của mỗi tầng: [z − ½h tầng, z + ½h tầng trên], cắt ở mặt đất
    return rows.map((r, i) => ({ lo: R.stories[i].bandLo, hi: R.stories[i].bandHi }));
  }
  function elevation(D, cm) {
    const d = R.dirs[D], rows = d.rows, n = rows.length, H = R.H, col = D === 'X' ? 'var(--x)' : 'var(--y)';
    const W = 400, top = 30, plotH = 440, axisW = 44, labW = 50, bottomPad = 22;
    const sy = z => top + plotH * (1 - z / H);
    const bw = Math.min(150, Math.max(30, d.b * plotH / H));
    const bR = W - axisW - 4, bL = bR - bw, arrMax = bL - labW - 10, x0 = bL - 3;
    const vis = rows.map((_, i) => i).filter(i => !R.stories[i].below); // tầng có phần trên mặt đất
    const nBelow = n - vis.length;
    const zc = z => Math.max(z, 0);
    const minGap = Math.min(99, ...vis.slice(1).map((i, k) => sy(zc(rows[i].z)) - sy(zc(rows[vis[k]].z))));
    const key = VIZ.val === 'tt' ? 'Ftt' : 'Ftc';
    let g = '';
    // trục cao độ
    const st = niceStep(H / 6);
    for (let z = 0; z <= H + 1e-9; z += st) {
      const y = sy(z);
      g += `<line x1="${labW}" x2="${bR + 6}" y1="${y}" y2="${y}" style="stroke:var(--line)" stroke-dasharray="2 3"/><text x="${bR + 9}" y="${y + 3.5}">${F(z, st < 1 ? 1 : 0)}</text>`;
    }
    g += `<text x="${W - 2}" y="${top - 12}" text-anchor="end">z (m)</text>`;
    // công trình
    g += `<rect x="${bL}" y="${sy(H)}" width="${bw}" height="${plotH}" style="fill:var(--sunk);stroke:var(--ink)" stroke-width="1.3"/>`;
    vis.forEach(i => { const r = rows[i]; if (i && r.z > 0) g += `<line x1="${bL}" x2="${bR}" y1="${sy(r.z)}" y2="${sy(r.z)}" style="stroke:var(--line)" stroke-width="${minGap < 5 ? 0.5 : 1}"/>`; });
    g += `<text x="${(bL + bR) / 2}" y="${top + plotH + 15}" text-anchor="middle">b = ${F(d.b, 1)} m</text>`;
    // mặt đất
    const gy = sy(0);
    g += `<line x1="6" x2="${W - 6}" y1="${gy}" y2="${gy}" style="stroke:var(--ink)" stroke-width="1.3"/>`;
    for (let x = bL - 2; x < bR + 4; x += 7) g += `<line x1="${x}" x2="${x - 5}" y1="${gy}" y2="${gy + 5}" style="stroke:var(--muted)" stroke-width="0.8"/>`;
    if (R.zGround) g += `<text x="10" y="${gy - 4}" style="font-size:9px">Mặt đất tự nhiên${nBelow ? ` · ${nBelow} tầng dưới đất` : ''}</text>`;
    // hướng gió
    g += `<g style="stroke:${col};fill:none" stroke-width="1.4" stroke-linecap="round"><path d="M8 ${top - 18} h30 M14 ${top - 12} h28 M8 ${top - 6} h22"/><path d="M38 ${top - 22} l6 4 -6 4" stroke-linejoin="round"/></g><text x="50" y="${top - 9}" style="fill:${col};font-weight:600;font-family:var(--f-ui);font-size:11px">Gió ${D}</text>`;
    const B = bands(rows);
    if (VIZ.mode === 'force') {
      const sw = Math.max(1.1, Math.min(3, minGap * 0.28));
      const iMax = vis.reduce((m, i) => rows[i][key] > rows[m][key] ? i : m, vis[0]);
      const order = [iMax, vis[0], vis[vis.length - 1], ...vis], placed = [];
      const lab = new Set();
      for (const i of order) { const y = sy(zc(rows[i].z)); if (!lab.has(i) && placed.every(p => Math.abs(p - y) >= 12)) { lab.add(i); placed.push(y); } }
      vis.forEach(i => {
        const r = rows[i];
        const y = sy(zc(r.z)), len = Math.max(2, r[key] / cm.f * arrMax), xs = x0 - len, ah = Math.max(3.5, sw * 2.2);
        g += `<line x1="${xs}" x2="${x0 - ah}" y1="${y}" y2="${y}" style="stroke:${col}" stroke-width="${sw}"/><path d="M${x0} ${y} l${-ah * 1.5} ${-ah} v${ah * 2}z" style="fill:${col}"/>`;
        if (lab.has(i)) g += `<text class="val" x="${xs - 4}" y="${y + 3.5}" text-anchor="end">${fF(r[key])}</text>`;
      });
    } else {
      let path = `M${x0} ${sy(B[vis[0]].hi)}`;
      vis.forEach(i => { const x = x0 - rows[i].Wk / cm.w * arrMax; path += ` H${x} V${sy(B[i].lo)}`; });
      path += ` H${x0}Z`;
      g += `<path d="${path}" style="fill:${col};fill-opacity:.18;stroke:${col}" stroke-width="1.4" stroke-linejoin="round"/>`;
      let prev = null, lastY = -99;
      vis.forEach(i => {
        const r = rows[i], v = F(r.Wk, 1);
        const ym = Math.max((sy(B[i].hi) + Math.min(sy(B[i].lo), sy(B[i].hi) + 14)) / 2 + 3.5, top + 4);
        if (v !== prev && ym - lastY >= 12) { g += `<text class="val" x="${x0 - r.Wk / cm.w * arrMax - 4}" y="${ym}" text-anchor="end">${v}</text>`; lastY = ym; }
        prev = v;
      });
      if (B[vis[vis.length - 1]].lo > 1e-6) g += `<text x="${x0 - 4}" y="${gy - 3}" text-anchor="end" style="font-size:9px">½h₁ truyền thẳng xuống móng</text>`;
    }
    // vùng rê chuột
    g += `<rect class="hl" x="0" y="0" width="0" height="0" style="fill:var(--accent);fill-opacity:.13;pointer-events:none"/>`;
    vis.forEach(i => { const y1 = sy(B[i].hi), y2 = sy(B[i].lo); g += `<rect data-i="${i}" x="0" y="${y1}" width="${bR}" height="${Math.max(1, y2 - y1)}" style="fill:transparent"/>`; });
    const Hs = top + plotH + bottomPad;
    return `<svg viewBox="0 0 ${W} ${Hs}" role="img" aria-label="Sơ đồ tải trọng gió phương ${D} theo chiều cao">${g}</svg>`;
  }
  function vizHtml() {
    const X = R.dirs.X, Y = R.dirs.Y, key = VIZ.val === 'tt' ? 'Ftt' : 'Ftc';
    const cm = { f: Math.max(...X.rows.map(r => r[key]), ...Y.rows.map(r => r[key]), 1e-9), w: Math.max(...X.rows.map(r => r.Wk), ...Y.rows.map(r => r.Wk), 1e-9) };
    const seg = (grp, opts) => `<div class="seg" role="group">${opts.map(([v, t]) => `<button type="button" data-${grp}="${v}" aria-pressed="${VIZ[grp] === v}">${t}</button>`).join('')}</div>`;
    const panel = D => {
      const d = R.dirs[D], V = VIZ.val === 'tt' ? d.Vtt : d.Vtc, M = VIZ.val === 'tt' ? d.Mtt : d.Mtt / R.gf;
      return `<div class="vp" data-d="${D}"><h4><em class="${D === 'X' ? 'tx' : 'ty'}">${D}</em>Gió phương ${D}<span class="meta">c = ${F(d.c, 3)} · G<sub>f</sub> = ${F(d.gust.Gf, 3)} · địa hình ${d.terrain}</span></h4>
        ${elevation(D, cm)}
        <div class="foot"><span>Lực cắt chân <b>${F(V, 0)}</b> kN</span><span>Mô men lật <b>${F(M, 0)}</b> kN·m</span></div><div class="vtip" hidden></div></div>`;
    };
    const modes = seg('mode', [['force', 'Lực tại sàn'], ['press', 'Áp lực W<sub>k</sub>'], ['model', 'Mô hình 3D']]);
    if (VIZ.mode === 'model') {
      VIZ.show = VIZ.show || 'both';
      const sum = D => { const d = R.dirs[D]; return `<span><em class="${D === 'X' ? 'tx' : 'ty'}">${D}</em> Lực cắt chân <b>${F(VIZ.val === 'tt' ? d.Vtt : d.Vtc, 0)}</b> kN · c = ${F(d.c, 3)} · G<sub>f</sub> = ${F(d.gust.Gf, 3)}</span>`; };
      VIZ.layer = VIZ.layer || 'force';
      if (VIZ.layer === 'zones' && VIZ.show === 'both') VIZ.show = 'X';
      const shows = VIZ.layer === 'zones' ? [['X', 'Gió X'], ['Y', 'Gió Y']] : [['X', 'Gió X'], ['Y', 'Gió Y'], ['both', 'Cả hai']];
      return `<div class="vizctl">${modes}${seg('layer', [['force', 'Lực tầng'], ['zones', 'Vùng c<sub>e</sub> (F.4)']])}${seg('show', shows)}${VIZ.layer === 'force' ? seg('val', [['tt', 'Tính toán'], ['tc', 'Tiêu chuẩn']]) : ''}</div>
      <div class="v3">
        <div class="v3bar"><div class="seg" role="group" aria-label="Góc nhìn"><button type="button" data-view="3d">3D</button><button type="button" data-view="x">Mặt đứng gió X</button><button type="button" data-view="y">Mặt đứng gió Y</button><button type="button" data-view="top">Từ trên</button></div>
          <div class="seg" role="group" aria-label="Thu phóng"><button type="button" data-zoom="out" aria-label="Thu nhỏ">−</button><button type="button" data-zoom="in" aria-label="Phóng to">+</button></div></div>
        <div class="v3wrap"><canvas id="cv3" aria-label="Mô hình 3D công trình với tải trọng gió" role="img"></canvas><div class="vtip" hidden></div></div>
        <div class="v3legend"></div>
        <div class="v3foot">${VIZ.layer === 'zones' ? '' : (VIZ.show !== 'Y' ? sum('X') : '') + (VIZ.show !== 'X' ? sum('Y') : '')}</div>
        <p class="hint" style="margin:0">Kéo để xoay mô hình (trên điện thoại kéo ngang), Ctrl + cuộn hoặc chụm hai ngón để phóng to. Rê chuột hoặc chạm vào mũi tên, dải màu để xem số liệu tầng.</p>
      </div>`;
    }
    const unit = VIZ.mode === 'force' ? `Mũi tên: lực ${VIZ.val === 'tt' ? 'tính toán W<sub>tt</sub>' : 'tiêu chuẩn W<sub>tc</sub>'} tại sàn (kN), cùng tỉ lệ cho hai phương` : 'Áp lực tiêu chuẩn W<sub>k</sub> trên mặt đón gió (daN/m²), cùng tỉ lệ cho hai phương';
    return `<div class="vizctl">${modes}${VIZ.mode === 'force' ? seg('val', [['tt', 'Tính toán'], ['tc', 'Tiêu chuẩn']]) : ''}<span class="hint">${unit}. Rê chuột (hoặc chạm) vào tầng để xem chi tiết.</span></div>
      <div class="vpanels">${panel('X')}${panel('Y')}</div>`;
  }
  function tipHtml(D, i) {
    const r = R.dirs[D].rows[i];
    return `<b>${esc(r.name)}</b> · z = ${F(r.z)} m<br>z<sub>e</sub> = ${F(r.zeUse)} m · k = ${F(r.k, 3)}<br>W<sub>k</sub> = ${F(r.Wk, 1)} daN/m²<br>b = ${F(r.width)} m · h<sub>đ</sub> = ${F(r.trib)} m<br>W<sub>tc</sub> = ${F(r.Ftc, 1)} kN · <b>W<sub>tt</sub> = ${F(r.Ftt, 1)} kN</b>`;
  }
  function vizHover(e) {
    const t = e.target.closest && e.target.closest('rect[data-i]');
    document.querySelectorAll('#tLoad .vp').forEach(vp => {
      const hl = vp.querySelector('.hl'), tip = vp.querySelector('.vtip');
      if (!t) { hl.setAttribute('width', 0); tip.hidden = true; return; }
      const i = t.dataset.i, src = vp.querySelector(`rect[data-i="${i}"]`);
      ['x', 'y', 'width', 'height'].forEach(k => hl.setAttribute(k, src.getAttribute(k)));
      if (vp.contains(t)) {
        tip.innerHTML = tipHtml(vp.dataset.d, +i); tip.hidden = false;
        const box = vp.getBoundingClientRect(), rb = src.getBoundingClientRect();
        const svgTop = vp.querySelector('svg').getBoundingClientRect().top - box.top; let top = rb.top - box.top + rb.height / 2 - tip.offsetHeight - 8; if (top < svgTop) top = rb.bottom - box.top + 8;
        tip.style.top = top + 'px'; tip.style.left = Math.max(6, Math.min(box.width - tip.offsetWidth - 6, 12)) + 'px';
      } else tip.hidden = true;
    });
  }
  function renderLoad() {
    const X = R.dirs.X, Y = R.dirs.Y;
    let h = `<div class="viz">${vizHtml()}</div>`;
    h += `<h3 class="sub" style="margin-top:16px">Bảng lực gió theo tầng</h3><div class="tw"><table class="res"><thead><tr><th rowspan="2">Tầng</th><th rowspan="2">z (m)<br><span style="font-size:10.5px">trên mặt đất</span></th><th colspan="4" class="gx" style="text-align:center">Gió phương X</th><th colspan="4" class="gy" style="text-align:center">Gió phương Y</th></tr>
      <tr><th class="gx">z<sub>e</sub></th><th class="gx">k(z<sub>e</sub>)</th><th class="gx">W<sub>tc</sub> kN</th><th class="gx">W<sub>tt</sub> kN</th><th class="gy">z<sub>e</sub></th><th class="gy">k(z<sub>e</sub>)</th><th class="gy">W<sub>tc</sub> kN</th><th class="gy">W<sub>tt</sub> kN</th></tr></thead><tbody>`;
    X.rows.forEach((x, i) => {
      const y = Y.rows[i];
      h += `<tr class="${R.stories[i].below ? 'under' : ''}"><td>${esc(x.name)}</td><td>${F(x.z)}</td><td class="${x.raised ? 'flag' : ''}">${F(x.zeUse)}</td><td>${F(x.k, 3)}</td><td>${F(x.Ftc, 2)}</td><td>${F(x.Ftt, 2)}</td><td class="${y.raised ? 'flag' : ''}">${F(y.zeUse)}</td><td>${F(y.k, 3)}</td><td>${F(y.Ftc, 2)}</td><td>${F(y.Ftt, 2)}</td></tr>`;
    });
    h += `<tr class="tot"><td>Tổng</td><td></td><td></td><td></td><td>${F(X.Vtc, 1)}</td><td>${F(X.Vtt, 1)}</td><td></td><td></td><td>${F(Y.Vtc, 1)}</td><td>${F(Y.Vtt, 1)}</td></tr></tbody></table></div>`;
    $('tLoad').innerHTML = h;
    mount3d();
  }
  function mount3d() {
    const w = $('tLoad').querySelector('.v3wrap');
    if (!w) { View3D.unmount(); return; }
    View3D.mount(w, R, { fmt: F, esc, tip: tipHtml, state: { show: VIZ.show, val: VIZ.val, layer: VIZ.layer || 'force' } });
  }
  $('tLoad').addEventListener('click', e => {
    const b = e.target.closest('.seg button'); if (!b) return;
    if (b.dataset.view) {
      const v = b.dataset.view;
      if ((v === 'x' || v === 'y') && VIZ.show !== v.toUpperCase()) { VIZ.show = v.toUpperCase(); saveViz(); $('tLoad').querySelector('.viz').innerHTML = vizHtml(); mount3d(); }
      View3D.preset(v); return;
    }
    if (b.dataset.zoom) { View3D.zoomBy(b.dataset.zoom === 'in' ? 1.25 : 0.8); return; }
    if (b.dataset.mode) VIZ.mode = b.dataset.mode; if (b.dataset.val) VIZ.val = b.dataset.val; if (b.dataset.show) VIZ.show = b.dataset.show; if (b.dataset.layer) VIZ.layer = b.dataset.layer;
    saveViz(); $('tLoad').querySelector('.viz').innerHTML = vizHtml(); mount3d();
  });
  $('tLoad').addEventListener('pointermove', vizHover);
  $('tLoad').addEventListener('pointerdown', vizHover);
  $('tLoad').addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') vizHover({ target: document.body }); });
  function renderGf() {
    const X = R.dirs.X, Y = R.dirs.Y;
    const r = (lab, f, n = 4) => `<tr><td>${lab}</td><td>${f(X)}</td><td>${f(Y)}</td></tr>`;
    const g = (k, n = 4) => d => F(d.gust[k], n);
    let h = `<div class="tw"><table class="res"><thead><tr><th>Đại lượng</th><th class="gx">Gió phương X</th><th class="gy">Gió phương Y</th></tr></thead><tbody>
      ${r('Dạng địa hình', d => d.terrain)}${r('b – bề rộng đón gió (m)', d => F(d.b))}${r('d – chiều sâu theo hướng gió (m)', d => F(d.d))}
      ${r('T₁ (s)', d => F(d.T1, 3))}${r('n₁ = 1/T₁ (Hz)', g('n1'))}${r('z<sub>s</sub> = 0,6h (m)', g('zs', 2))}${r('I(z<sub>s</sub>)', g('Iz'))}${r('L(z<sub>s</sub>) (m)', g('Lz', 2))}
      ${r('V(z<sub>s</sub>)₃₆₀₀ₛ,₅₀ (m/s)', g('Vz', 2))}${r('Q', g('Q'))}${r('g<sub>R</sub>', g('gR'))}${r('N₁', g('N1'))}${r('R<sub>n</sub>', g('Rn'))}
      ${r('η<sub>h</sub> / η<sub>b</sub> / η<sub>d</sub>', d => `${F(d.gust.eh, 3)} / ${F(d.gust.eb, 3)} / ${F(d.gust.ed, 3)}`)}
      ${r('R<sub>h</sub> / R<sub>b</sub> / R<sub>d</sub>', d => `${F(d.gust.Rh, 3)} / ${F(d.gust.Rb, 3)} / ${F(d.gust.Rd, 3)}`)}
      ${r('R', g('R'))}${r('Phân loại', d => d.gust.rigid ? 'Cứng (T₁ ≤ 1 s)' : 'Mềm (T₁ > 1 s)')}
      <tr class="tot"><td>G<sub>f</sub></td><td>${F(X.gust.Gf, 4)}</td><td>${F(Y.gust.Gf, 4)}</td></tr></tbody></table></div>`;
    if (X.gfE || Y.gfE) h += `<p class="hint" style="margin-top:10px">Đối chiếu G<sub>f</sub> sơ bộ theo Phụ lục E.1: X = ${X.gfE ? F(X.gfE, 3) : '—'}, Y = ${Y.gfE ? F(Y.gfE, 3) : '—'}.</p>`;
    $('tGf').innerHTML = h;
  }
  function renderAero() {
    let h = '<div class="two">';
    for (const D of ['X', 'Y']) {
      const d = R.dirs[D], a = d.f4, f = d.f16;
      h += `<div><h3 class="sub"><em class="${D === 'X' ? 'tx' : 'ty'}" style="font-style:normal;color:#fff;padding:0 5px;border-radius:3px;font-size:11px">${D}</em> Gió phương ${D}<span class="chip">dùng ${d.method}</span></h3>
        <div class="tw"><table class="res"><tbody>
        <tr><td>b × d × h (m)</td><td>${F(d.b)} × ${F(d.d)} × ${F(R.H)}</td></tr>
        <tr><td>h/d</td><td>${F(a.hd, 3)}</td></tr>
        ${a.hd <= 5 ? `<tr><td>c<sub>e</sub> vùng A / B / C</td><td>${F(a.cA, 2)} / ${F(a.cB, 2)} / ${a.wC > 0 ? F(a.cC, 2) : '—'}</td></tr>
        <tr><td>c<sub>e</sub> vùng D (đón gió) / E (khuất gió)</td><td>+${F(a.cD, 3)} / ${F(a.cE, 3)}</td></tr>
        <tr><td>e = min(b; 2h) (m) · trường hợp</td><td>${F(a.e)} · ${a.cas}</td></tr>
        <tr><td>Bề rộng vùng A / B / C (m)</td><td>${F(a.wA)} / ${a.wB > 0 ? F(a.wB) : '—'} / ${a.wC > 0 ? F(a.wC) : '—'}</td></tr>
        <tr><td>F.4: |c<sub>D</sub>| + |c<sub>E</sub>|</td><td>${F(a.c, 3)}</td></tr>` : ''}
        <tr><td>λ · ${f.lamRule}</td><td>${F(f.lam, 3)} · ${F(f.lamE, 3)}</td></tr>
        <tr><td>k<sub>λ</sub> (Hình F.27)</td><td>${F(f.kl, 3)}</td></tr>
        <tr><td>d/b · c<sub>x∞</sub> (Hình F.22)</td><td>${F(f.db, 3)} · ${F(f.cinf, 3)}</td></tr>
        <tr><td>F.16: k<sub>λ</sub>·c<sub>x∞</sub></td><td>${F(f.c, 3)}</td></tr>
        <tr class="tot"><td>c dùng tính toán</td><td>${F(d.c, 3)}</td></tr></tbody></table></div>${planF4(D)}</div>`;
    }
    h += '</div><p class="hint" style="margin-top:10px">Quy tắc chọn theo bảng tính gốc: h/d ≤ 5 dùng Bảng F.4 (|c<sub>D</sub>| + |c<sub>E</sub>|), h/d > 5 dùng F.16 (c<sub>x</sub> = k<sub>λ</sub>·c<sub>x∞</sub>).</p>';
    $('tAero').innerHTML = h;
  }
  // Mặt bằng chia vùng ce theo Hình F.5a / Bảng F.4
  function planF4(D) {
    const d = R.dirs[D], a = d.f4;
    if (a.hd > 5) return `<p class="hint" style="margin-top:10px">h/d = ${F(a.hd, 2)} > 5: Bảng F.4 không áp dụng, dùng hệ số cản tổng c<sub>x</sub> theo F.16 nên không chia vùng.</p>`;
    const col = D === 'X' ? 'var(--x)' : 'var(--y)';
    const W = 420, Hh = 330, cy0 = 165, maxW = 195, maxH = 130;
    const k = Math.min(maxW / d.d, maxH / d.b);
    const pw = Math.max(36, d.d * k), ph = Math.max(36, d.b * k);
    const x0 = 132, x1 = x0 + pw, y0 = cy0 - ph / 2, y1 = y0 + ph;
    const T = 30; // độ dày dải ứng với |ce| = 1
    const cc = ce => ce >= 0 ? 'var(--press)' : 'var(--suct)';
    let g = '';
    const strip = (pts, ce) => `<polygon points="${pts.map(p => p.join(',')).join(' ')}" style="fill:${cc(ce)};fill-opacity:.22;stroke:${cc(ce)}" stroke-width="1"/>`;
    const arr = (xa, ya, xb, yb, ce) => { const ux = xb - xa, uy = yb - ya, L = Math.hypot(ux, uy) || 1, h = 5; const ex = ux / L, ey = uy / L; return `<line x1="${xa}" y1="${ya}" x2="${xb - ex * h}" y2="${yb - ey * h}" style="stroke:${cc(ce)}" stroke-width="1.3"/><path d="M${xb} ${yb} l${-ex * h * 1.4 - ey * h * 0.7} ${-ey * h * 1.4 + ex * h * 0.7} l${ey * h * 1.4} ${-ex * h * 1.4}z" style="fill:${cc(ce)}"/>`; };
    const lab = (x, y, t, anchor = 'middle', cls = 'val') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;
    const sg = v => (v > 0 ? '+' : '') + F(v, 2);
    // D: đón gió (cạnh trái), áp lực đẩy vào
    const tD = Math.abs(a.cD) * T;
    g += strip([[x0 - tD, y0], [x0, y0], [x0, y1], [x0 - tD, y1]], a.cD);
    for (let j = 1; j <= 4; j++) { const yy = y0 + ph * j / 5; g += arr(x0 - tD + 2, yy, x0 - 1, yy, a.cD); }
    g += lab(x0 - tD - 6, cy0 - 4, 'D', 'end', 'zl') + lab(x0 - tD - 6, cy0 + 11, sg(a.cD), 'end');
    // E: khuất gió (cạnh phải), hút ra
    const tE = Math.abs(a.cE) * T;
    g += strip([[x1, y0], [x1 + tE, y0], [x1 + tE, y1], [x1, y1]], a.cE);
    for (let j = 1; j <= 4; j++) { const yy = y0 + ph * j / 5; g += arr(x1 + 1, yy, x1 + tE - 2, yy, a.cE); }
    g += lab(x1 + tE + 6, cy0 - 4, 'E', 'start', 'zl') + lab(x1 + tE + 6, cy0 + 11, sg(a.cE), 'start');
    // A, B, C: tường bên (trên và dưới), hút ra
    let t = 0;
    for (const [zn, ce, w] of [['A', a.cA, a.wA], ['B', a.cB, a.wB], ['C', a.cC, a.wC]]) {
      if (w <= 0) continue;
      const xa = x0 + t / d.d * pw, xb = x0 + Math.min(d.d, t + w) / d.d * pw; t += w;
      const th = Math.abs(ce) * T, xm = (xa + xb) / 2;
      g += strip([[xa, y0 - th], [xb, y0 - th], [xb, y0], [xa, y0]], ce) + strip([[xa, y1], [xb, y1], [xb, y1 + th], [xa, y1 + th]], ce);
      const na = Math.max(1, Math.min(4, Math.round((xb - xa) / 22)));
      for (let j = 0; j < na; j++) { const xx = xa + (xb - xa) * (j + 0.5) / na; g += arr(xx, y0 - 1, xx, y0 - th + 2, ce) + arr(xx, y1 + 1, xx, y1 + th - 2, ce); }
      g += `<line x1="${xa}" x2="${xa}" y1="${y0 - th - 4}" y2="${y1 + th + 4}" style="stroke:var(--muted)" stroke-dasharray="2 2"/>`;
      g += lab(xm, y0 - th - 22, zn, 'middle', 'zl') + lab(xm, y0 - th - 8, sg(ce)) + lab(xm, y1 + th + 15, zn, 'middle', 'zl');
      g += lab(xm, y1 + th + 29, F(Math.min(w, d.d - (t - w)), 2) + ' m', 'middle', 'dim');
    }
    g += `<line x1="${x1}" x2="${x1}" y1="${y0 - 4}" y2="${y1 + 4}" style="stroke:var(--muted)" stroke-dasharray="2 2"/>`;
    // công trình
    g += `<rect x="${x0}" y="${y0}" width="${pw}" height="${ph}" style="fill:var(--sunk);stroke:var(--ink)" stroke-width="1.4"/>`;
    g += lab((x0 + x1) / 2, cy0 + 4, `d = ${F(d.d, 1)} m`, 'middle', 'dim') + `<text class="dim" x="${x1 - 6}" y="${y0 + 14}" text-anchor="end">b = ${F(d.b, 1)} m</text>`;
    // hướng gió
    for (let j = 0; j < 3; j++) { const yy = cy0 - 30 + j * 30; g += `<line x1="10" x2="48" y1="${yy}" y2="${yy}" style="stroke:${col}" stroke-width="2"/><path d="M54 ${yy} l-9 -5 v10z" style="fill:${col}"/>`; }
    g += `<text x="12" y="${cy0 - 42}" style="fill:${col};font-weight:600;font-family:var(--f-ui);font-size:12px">Gió ${D}</text>`;
    return `<div class="planf4"><h3 class="sub" style="margin:12px 0 4px"><span>Mặt bằng chia vùng c<sub>e</sub> (Hình F.5a)</span></h3>
      <svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Mặt bằng chia vùng áp lực gió phương ${D}">${g}</svg>
      <p class="hint" style="margin:2px 0 0">e = min(b; 2h) = ${F(a.e, 2)} m (${a.cas}). Dải cam: áp lực đẩy vào tường; dải xanh: hút ra. Độ dày dải tỉ lệ với |c<sub>e</sub>|. Dùng tính lực tầng: c = |c<sub>D</sub>| + |c<sub>E</sub>| = ${F(d.c, 3)}${d.method === 'F4' ? '' : ' (phương này đang dùng F.16)'}.</p></div>`;
  }
  function tmBlocks() { return TM.build(lastInp, R, S.meta); }
  function renderTM() { if (R) $('tmPrev').innerHTML = TM.html(tmBlocks()); }

  // ---------- lưu file ----------
  let dlP = null;
  async function saveFile(filename, data, msgEl) {
    const msg = $(msgEl);
    msg.className = 'status'; msg.textContent = 'Đang chuẩn bị file…';
    if (window.claude && typeof window.claude.use === 'function') {
      dlP = dlP || window.claude.use('downloads');
      const dl = await dlP;
      if (!dl) { msg.className = 'status err'; msg.textContent = 'Trang này không được phép tải file ở chế độ xem hiện tại. Mở trang trong claude.ai để tải.'; return; }
      try {
        await dl.save({ filename, data });
        msg.className = 'status ok'; msg.textContent = `Đã gửi file ${filename}.`;
      } catch (e) {
        msg.className = 'status err';
        msg.textContent = e && e.code === 'declined' ? 'Bạn đã huỷ tải file.' : e && e.code === 'rate_limited' ? 'Đang có một hộp thoại tải file mở, thử lại sau giây lát.' : `Không tải được file (${(e && e.code) || 'lỗi'}).`;
      }
      return;
    }
    // bản chạy ngoài claude.ai (file .html lưu trên máy)
    const blob = data instanceof Blob ? data : new Blob([data]);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    msg.className = 'status ok'; msg.textContent = `Đã tải ${filename}.`;
  }
  const slug = () => (S.meta.project || 'cong-trinh').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'cong-trinh';
  function needR(el) { if (!R) { $(el).className = 'status err'; $(el).textContent = 'Chưa có kết quả hợp lệ để xuất.'; return false; } return true; }
  function exportDocx() { if (!needR('expMsg')) return; saveFile(`TM-gio-${slug()}.docx`, new Blob([TM.docx(tmBlocks(), S.meta)]), 'expMsg'); }
  function exportPrint() { if (!needR('expMsg')) return; saveFile(`TM-gio-${slug()}-ban-in.html`, TM.printable(tmBlocks(), S.meta), 'expMsg'); }
  function exportCsv() {
    if (!needR('expMsg')) return;
    const X = R.dirs.X.rows, Y = R.dirs.Y.rows;
    const n = v => (+v).toFixed(3);
    const lines = ['Story,Elevation_from_base_m,Height_above_ground_m,Bx_m,By_m,Htrib_m,FX_tc_kN,FY_tc_kN,FX_tt_kN,FY_tt_kN'];
    X.forEach((x, i) => lines.push([`"${x.name.replace(/"/g, '""')}"`, n(R.stories[i].zAbs), n(x.z), n(x.width), n(Y[i].width), n(x.trib), n(x.Ftc), n(Y[i].Ftc), n(x.Ftt), n(Y[i].Ftt)].join(',')));
    saveFile(`Wind-ETABS-${slug()}.csv`, '﻿' + lines.join('\r\n') + '\r\n', 'expMsg');
  }
  function exportJson() { saveFile(`Ho-so-gio-${slug()}.json`, JSON.stringify({ app: 'gio-tcvn2737', v: 1, state: S }, null, 1), 'saveMsg'); }
  function loadState(st, from) {
    if (!st || !Array.isArray(st.stories) || !st.site) throw new Error('bad');
    S = migrate({ ...blank(), ...st, example: false });
    fillInputs(); recompute();
    $('saveMsg').className = 'status ok'; $('saveMsg').textContent = `Đã mở hồ sơ ${from}.`;
  }

  // ---------- hồ sơ lưu trong tài khoản (db) ----------
  let db = null, uid = null, unsub = null, pendingDel = null;
  async function initDb() {
    if (!(window.claude && window.claude.use)) { $('bSave').hidden = true; return; }
    try {
      const [d, u] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!d || !u) { $('bSave').hidden = true; $('savedList').innerHTML = '<p class="hint">Lưu hồ sơ trong tài khoản cần đăng nhập claude.ai. Dùng “Tải hồ sơ (.json)” để lưu trên máy.</p>'; return; }
      uid = await u.id();
      if (!uid) { $('bSave').hidden = true; return; }
      db = d;
      $('savedList').innerHTML = '<p class="hint">Đang tải danh sách hồ sơ…</p>';
      const timer = setTimeout(() => { if ($('savedList').textContent.includes('Đang tải')) $('savedList').innerHTML = '<p class="hint">Chưa tải được danh sách hồ sơ. Tải lại trang để thử lại.</p>'; }, 10000);
      unsub = db.collection('data/users/' + uid).orderBy('updated', 'desc').limit(50).onSnapshot(snap => { clearTimeout(timer); renderSaved(snap.docs); }, err => { clearTimeout(timer); $('savedList').innerHTML = `<p class="hint">Không đọc được hồ sơ đã lưu (${esc(err && err.code)}).</p>`; });
    } catch (e) { $('bSave').hidden = true; }
  }
  function renderSaved(docs) {
    if (!docs.length) { $('savedList').innerHTML = '<p class="hint">Chưa có hồ sơ nào. Bấm “Lưu hồ sơ hiện tại” để lưu; hồ sơ chỉ bạn xem được.</p>'; return; }
    $('savedList').innerHTML = docs.map(d => {
      const v = d.data() || {};
      const t = v.updated ? new Date(v.updated).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '';
      const conf = pendingDel === d.id ? `<span class="confirm">Xoá hồ sơ này? <button class="btn small" data-delyes="${esc(d.id)}" type="button">Xoá</button><button class="btn small ghost" data-delno type="button">Huỷ</button></span>` : `<button class="btn small ghost" data-delask="${esc(d.id)}" type="button">Xoá</button>`;
      return `<div class="it"><span class="nm">${esc(v.name || 'Không tên')}</span><time>${esc(t)}</time><button class="btn small" data-open="${esc(d.id)}" type="button">Mở</button>${conf}</div>`;
    }).join('');
    lastDocs = docs;
  }
  let lastDocs = [];
  async function saveDb() {
    if (!db) return;
    const msg = $('saveMsg');
    const id = S.docId || ('p' + Date.now().toString(36));
    try {
      S.docId = id;
      await db.collection('data/users/' + uid).doc(id).set({ name: S.meta.project || 'Không tên', updated: Date.now(), state: JSON.stringify(S) });
      persist();
      msg.className = 'status ok'; msg.textContent = 'Đã lưu hồ sơ.';
    } catch (e) { msg.className = 'status err'; msg.textContent = e && e.code === 'quota_exceeded' ? 'Hết dung lượng lưu, hãy xoá bớt hồ sơ cũ.' : `Không lưu được (${(e && e.code) || 'lỗi'}).`; }
  }

  // ---------- sự kiện ----------
  let tmr = null;
  const schedule = () => { clearTimeout(tmr); tmr = setTimeout(recompute, 120); };
  const edited = () => { if (S.example) { S.example = false; } };
  for (const [id, k] of Object.entries(metaMap)) $(id).addEventListener('input', e => { S.meta[k] = e.target.value; edited(); schedule(); });
  $('selProv').addEventListener('change', e => { S.site.prov = +e.target.value; S.site.row = 0; fillRows(); edited(); schedule(); });
  $('selRow').addEventListener('change', e => { S.site.row = +e.target.value; edited(); schedule(); });
  $('chkManual').addEventListener('change', e => {
    S.site.manual = e.target.checked;
    if (S.site.manual) { const d = (() => { const p = QC[S.site.prov], r = p.rows[S.site.row]; return r; })(); if (d && !S.site.W0Set) { S.site.zone = d.zone; S.site.W0 = d.W0; S.site.V3s50 = d.V3s50; $('mZone').value = d.zone; $('mW0').value = d.W0; $('mV').value = d.V3s50; } }
    siteMode(); edited(); schedule();
  });
  $('mZone').addEventListener('change', e => { S.site.zone = e.target.value; S.site.W0 = WIND.W0_ZONE[e.target.value]; $('mW0').value = S.site.W0; S.site.W0Set = true; edited(); schedule(); });
  $('mW0').addEventListener('input', e => { S.site.W0 = e.target.value; S.site.W0Set = true; edited(); schedule(); });
  $('mV').addEventListener('input', e => { S.site.V3s50 = e.target.value; S.site.W0Set = true; edited(); schedule(); });
  $('mV0').addEventListener('input', e => { const v = +e.target.value; if (v > 0) { S.site.W0 = +(0.0613 * v * v).toFixed(2); $('mW0').value = S.site.W0; S.site.W0Set = true; edited(); schedule(); } });
  $('mSource').addEventListener('input', e => { S.site.source = e.target.value; schedule(); });
  [['iB', 'B'], ['iL', 'L'], ['iTx', 'Tx'], ['iTy', 'Ty']].forEach(([id, k]) => $(id).addEventListener('input', e => { S[k] = e.target.value; edited(); schedule(); }));
  function terMode() {
    $('terYBox').hidden = !S.terrainSplit;
    $('terLab').textContent = S.terrainSplit ? 'Dạng địa hình – gió phương X (Bảng 8)' : 'Dạng địa hình (Bảng 8)';
    if (!S.terrainSplit) { S.terrainY = S.terrainX; $('iTerY').value = S.terrainX; }
  }
  $('iTerX').addEventListener('change', e => { S.terrainX = e.target.value; if (!S.terrainSplit) { S.terrainY = S.terrainX; $('iTerY').value = S.terrainX; } edited(); schedule(); });
  $('chkTerSplit').addEventListener('change', e => { S.terrainSplit = e.target.checked; terMode(); edited(); schedule(); });
  [['iTerY', 'terrainY'], ['iStruct', 'struct']].forEach(([id, k]) => $(id).addEventListener('change', e => { S[k] = e.target.value; edited(); schedule(); }));
  [['gN', 'n'], ['gH', 'h'], ['gH1', 'h1']].forEach(([id, k]) => $(id).addEventListener('input', e => { S.gen[k] = e.target.value; }));
  function genStories() {
    const n = Math.round(+S.gen.n), h = +S.gen.h, h1 = +S.gen.h1;
    if (!(n >= 1 && n <= 300 && h > 0 && h1 > 0)) { $('pasteMsg').textContent = ''; alertInline('Số tầng phải từ 1 đến 300, chiều cao tầng > 0.'); return; }
    S.stories = WIND.makeStories(n, h, h1); edited(); renderStories(); recompute();
  }
  function alertInline(t) { $('alerts').insertAdjacentHTML('afterbegin', `<div class="alert w">${esc(t)}</div>`); }
  $('bGen').addEventListener('click', () => { $('genConfirm').hidden = false; });
  $('bGenNo').addEventListener('click', () => { $('genConfirm').hidden = true; });
  $('bGenYes').addEventListener('click', () => { $('genConfirm').hidden = true; genStories(); });
  $('bPasteT').addEventListener('click', () => { $('pasteBox').hidden = !$('pasteBox').hidden; });
  $('bPasteApply').addEventListener('click', () => {
    const rows = [];
    for (const line of $('pasteTxt').value.split(/\r?\n/)) {
      const t = line.trim(); if (!t) continue;
      const parts = t.split(/\t|;|\s{2,}|,(?=\s*\d)/).map(s => s.trim()).filter(Boolean);
      const nums = parts.map(p => +p.replace(',', '.')).filter((v, i) => i > 0 && isFinite(v));
      if (parts.length >= 2 && nums.length && nums[0] > 0) rows.push({ name: parts[0], hs: nums[0], bx: null, by: null, trib: null });
    }
    if (!rows.length) { $('pasteMsg').className = 'status err'; $('pasteMsg').textContent = 'Không đọc được dòng nào. Mỗi dòng cần: tên tầng, chiều cao (m).'; return; }
    S.stories = rows; S.gen.n = rows.length; $('gN').value = rows.length; edited(); renderStories(); recompute();
    $('pasteMsg').className = 'status ok'; $('pasteMsg').textContent = `Đã nhận ${rows.length} tầng.`;
  });
  $('bAddTop').addEventListener('click', () => {
    const top = S.stories[0];
    S.stories.unshift({ name: 'Story' + (S.stories.length + 1), hs: top ? top.hs : 3.5, bx: null, by: null, trib: null });
    edited(); renderStories(); recompute();
  });
  $('gRef').addEventListener('change', e => { S.gRef = e.target.value; edited(); schedule(); });
  $('gRel').addEventListener('change', e => { S.gRel = e.target.value; $('gVal').disabled = S.gRel === 'eq'; if (S.gRel !== 'eq' && !(+S.gVal > 0)) { S.gVal = 0.45; $('gVal').value = 0.45; } edited(); schedule(); });
  $('gVal').addEventListener('input', e => { S.gVal = e.target.value; edited(); schedule(); });
  $('tblSt').addEventListener('input', e => {
    const k = e.target.dataset.k; if (!k) return;
    const i = +e.target.closest('tr').dataset.i;
    if (k === 'name' && S.gRef === S.stories[i].name) S.gRef = e.target.value; // giữ sàn mốc khi đổi tên
    S.stories[i][k] = k === 'name' ? e.target.value : (e.target.value === '' ? null : e.target.value);
    if (k === 'name') fillLv0();
    edited(); schedule();
  });
  $('tblSt').addEventListener('click', e => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    if (S.stories.length <= 1) return;
    S.stories.splice(+b.dataset.del, 1); edited(); renderStories(); recompute();
  });
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
    ['tLoad', 'tGf', 'tAero', 'tTM'].forEach(id => $(id).hidden = id !== b.dataset.tab);
    if (b.dataset.tab === 'tTM') renderTM();
    try { localStorage.setItem(LS_KEY + '-tab', b.dataset.tab); } catch (e) { }
  }));
  $('bDocx').addEventListener('click', exportDocx); $('bDocx2').addEventListener('click', exportDocx);
  $('bPrint').addEventListener('click', exportPrint); $('bCsv').addEventListener('click', exportCsv);
  $('bJson').addEventListener('click', exportJson);
  $('bSave').addEventListener('click', saveDb);
  $('bNew').addEventListener('click', () => { S = blank(); delete S.docId; fillInputs(); recompute(); $('saveMsg').className = 'status'; $('saveMsg').textContent = 'Đã tạo hồ sơ mới từ mẫu 7 tầng; sửa số liệu theo công trình của bạn.'; });
  $('fJson').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const j = JSON.parse(await f.text()); const st = j.state || j; delete st.docId; loadState(st, f.name); }
    catch (err) { $('saveMsg').className = 'status err'; $('saveMsg').textContent = 'File không phải hồ sơ hợp lệ của công cụ này.'; }
    e.target.value = '';
  });
  $('savedList').addEventListener('click', async e => {
    const t = e.target;
    if (t.dataset.open) {
      const d = lastDocs.find(x => x.id === t.dataset.open); if (!d) return;
      try { const st = JSON.parse(d.data().state); st.docId = d.id; loadState(st, '“' + (d.data().name || '') + '”'); } catch (err) { $('saveMsg').className = 'status err'; $('saveMsg').textContent = 'Hồ sơ bị lỗi, không mở được.'; }
    } else if (t.dataset.delask) { pendingDel = t.dataset.delask; renderSaved(lastDocs); }
    else if (t.hasAttribute('data-delno')) { pendingDel = null; renderSaved(lastDocs); }
    else if (t.dataset.delyes) {
      const id = t.dataset.delyes; pendingDel = null;
      try { await db.collection('data/users/' + uid).doc(id).delete(); if (S.docId === id) delete S.docId; } catch (err) { $('saveMsg').className = 'status err'; $('saveMsg').textContent = 'Không xoá được hồ sơ.'; }
    }
  });

  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => View3D.draw()); new MutationObserver(() => View3D.draw()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { }
  // ---------- khởi động ----------
  fillInputs();
  try { const tab = localStorage.getItem(LS_KEY + '-tab'); if (tab) document.querySelector(`.tabs [data-tab="${tab}"]`)?.click(); } catch (e) { }
  recompute();
  initDb();
})();
