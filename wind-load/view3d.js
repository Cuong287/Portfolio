/* ===== Mô hình 3D tải gió: tự vẽ trên canvas (phép chiếu phối cảnh + sắp xếp theo độ sâu) ===== */
const View3D = (() => {
  const YAW0 = 0.72, PITCH0 = 0.42;
  const st = { yaw: YAW0, pitch: PITCH0, zoom: 1, show: 'both', val: 'tt', layer: 'force' };
  let cv, ctx, wrap, tip, R, hits = [], ro = null, drag = null, pinch = null, raf = 0, Fmt, esc, tipFn;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function hex(c) {
    c = c.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  }
  const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
  const shade = (rgb, k) => `rgb(${rgb.map(v => Math.round(Math.min(255, v * k))).join(',')})`;

  function mount(el, results, opts) {
    wrap = el; R = results; Fmt = opts.fmt; esc = opts.esc; tipFn = opts.tip;
    Object.assign(st, opts.state || {});
    cv = el.querySelector('canvas'); tip = el.querySelector('.vtip'); ctx = cv.getContext('2d');
    if (ro) ro.disconnect();
    ro = new ResizeObserver(() => draw()); ro.observe(el);
    cv.onpointerdown = down; cv.onpointermove = move; cv.onpointerup = up; cv.onpointercancel = up;
    cv.onpointerleave = e => { if (e.pointerType !== 'touch' && !drag) hideTip(); };
    cv.onwheel = e => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); zoomBy(Math.exp(-e.deltaY * 0.004)); };
    draw();
  }
  function update(results, opts) { R = results; Object.assign(st, opts || {}); draw(); }
  function zoomBy(f) { st.zoom = Math.min(6, Math.max(0.35, st.zoom * f)); schedule(); }
  function preset(v) {
    // camera nằm phía đón gió (−X, −Y): mặt −X thấy được khi sin(yaw) > 0, mặt −Y khi cos(yaw) > 0
    if (v === '3d') { st.yaw = YAW0; st.pitch = PITCH0; st.zoom = 1; }
    else if (v === 'x') { st.yaw = 0.03; st.pitch = 0.05; st.zoom = 1; } // mặt đứng thấy mũi tên gió X nằm ngang
    else if (v === 'y') { st.yaw = Math.PI / 2 - 0.03; st.pitch = 0.05; st.zoom = 1; }
    else if (v === 'top') { st.yaw = YAW0; st.pitch = 1.45; st.zoom = 1; }
    draw();
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }

  // ---- tương tác ----
  const pts = new Map();
  function down(e) {
    cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: st.zoom }; drag = null; }
    else drag = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch, moved: false, touch: e.pointerType === 'touch' };
  }
  function move(e) {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; st.zoom = Math.min(6, Math.max(0.35, pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)); schedule(); return; }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (drag.moved) {
        st.yaw = drag.yaw - dx * 0.008;
        st.pitch = Math.min(1.5, Math.max(0.02, drag.pitch + dy * 0.006));
        hideTip(); schedule();
      }
      return;
    }
    if (e.pointerType !== 'touch') hover(e);
  }
  function up(e) {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (drag && !drag.moved) hover(e);
    drag = null;
  }
  function hideTip() { if (tip) tip.hidden = true; if (hl) { hl = null; draw(); } }
  let hl = null;
  function hover(e) {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let hit = null;
    for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (h.seg ? segDist(x, y, h.seg) < 7 : inPoly(x, y, h.poly)) { hit = h; break; }
    }
    if (!hit) { hideTip(); return; }
    const key = hit.zone ? 'z' + hit.zone : hit.D + hit.i;
    if (!hit.zone && (!hl || hl.key !== key)) { hl = { key, D: hit.D, i: hit.i }; draw(); }
    const ZN = { A: 'tường bên, sát mép đón gió', B: 'tường bên, giữa', C: 'tường bên, phía sau', D: 'tường đón gió', E: 'tường khuất gió' };
    tip.innerHTML = hit.zone ? `<b>Vùng ${hit.zone}</b> · ${ZN[hit.zone]}<br>c<sub>e</sub> = ${hit.ce > 0 ? '+' : ''}${Fmt(hit.ce, 3)} (${hit.ce >= 0 ? 'áp lực đẩy vào' : 'hút ra'})<br>bề rộng vùng ${Fmt(hit.w, 2)} m · gió phương ${st.show === 'Y' ? 'Y' : 'X'}` : `<span style="font-weight:600">Gió phương ${hit.D}</span><br>` + tipFn(hit.D, hit.i);
    tip.hidden = false;
    const w = wrap.clientWidth;
    let left = x + 14; if (left + tip.offsetWidth > w - 6) left = x - tip.offsetWidth - 14; if (left < 6) left = 6;
    let top = y - tip.offsetHeight - 10; if (top < 6) top = y + 16;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function segDist(px, py, [ax, ay, bx, by]) {
    const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1)));
    return Math.hypot(px - ax - t * vx, py - ay - t * vy);
  }
  function inPoly(x, y, p) {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
    return c;
  }

  // ---- vẽ ----
  function draw() {
    if (!cv || !R) return;
    const W = wrap.clientWidth, Hc = cv.clientHeight;
    if (!W || !Hc) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hc * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(Hc * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hc);
    const C = { ink: css('--ink'), muted: css('--muted'), line: css('--line'), panel: css('--panel'), sunk: css('--sunk'), x: css('--x'), y: css('--y'), h0: hex(css('--heat0')), h1: hex(css('--heat1')), wall: hex(css('--wall')), acc: css('--accent'), press: hex(css('--press')), suct: hex(css('--suct')), pressS: css('--press'), suctS: css('--suct') };
    const rows = R.stories, n = rows.length, H = R.H;
    const showX = st.show !== 'Y', showY = st.show !== 'X';
    const key = st.val === 'tt' ? 'Ftt' : 'Ftc';
    const maxDX = Math.max(...rows.map(s => s.byUse)), maxDY = Math.max(...rows.map(s => s.bxUse));
    const S = Math.max(H, maxDX, maxDY);
    // thang lực và áp lực
    const zonesOn = st.layer === 'zones';
    const ZD = st.show === 'Y' ? 'Y' : 'X', ZR = R.dirs[ZD], zf4 = ZR.f4, zOK = zonesOn && ZR.method === 'F4';
    const ceCol = ce => mix(C.wall, ce >= 0 ? C.press : C.suct, 0.25 + 0.75 * Math.min(1, Math.abs(ce) / 1.2));
    const dirs = zonesOn ? [] : [showX && 'X', showY && 'Y'].filter(Boolean);
    const fMax = Math.max(1e-9, ...dirs.flatMap(D => R.dirs[D].rows.map(r => r[key])));
    const wAll = dirs.length ? dirs.flatMap(D => R.dirs[D].rows.map(r => r.Wk)) : [0];
    const wMin = Math.min(...wAll), wMax = Math.max(...wAll);
    const heat = w => mix(C.h0, C.h1, wMax - wMin < 1e-9 ? 0.7 : 0.15 + 0.85 * (w - wMin) / (wMax - wMin));
    const arrMax = Math.max(0.55 * Math.max(maxDX, maxDY), 0.16 * H);
    const gap = 0.012 * S;
    // camera
    const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    const zc = H * 0.5;
    const ext = Math.max(maxDX, maxDY) / 2 + arrMax + gap;
    const radius = Math.hypot(ext, ext * 0.5, H / 2 + 0.1 * S); // khối cầu bao, không đổi khi xoay
    const Dcam = 6 * radius;
    const scale = Math.min(W, Hc) / (2 * radius * 1.12) * st.zoom;
    const ox = W / 2, oy = Hc / 2;
    function P(x, y, z) {
      const x1 = x * cy - y * sy, y1 = x * sy + y * cy, cz = z - zc;
      const up = y1 * sp + cz * cp, depth = y1 * cp - cz * sp;
      const f = Dcam / (Dcam + depth);
      return [ox + x1 * scale * f, oy - up * scale * f, depth];
    }
    const camDepthOfNormal = (nx, ny, nz) => { const y1 = nx * sy + ny * cy; return y1 * cp - nz * sp; };
    const items = [];
    hits = [];
    // mặt đất
    const G = ext * 1.25, step = niceStep(G / 4);
    ctx.lineWidth = 1; ctx.strokeStyle = C.line;
    for (let v = -Math.floor(G / step) * step; v <= G + 1e-9; v += step) {
      line(P(v, -G, 0), P(v, G, 0)); line(P(-G, v, 0), P(G, v, 0));
    }
    function line(a, b) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    // khối tầng (từ dưới lên)
    for (let i = n - 1; i >= 0; i--) {
      const s = rows[i], z1 = s.z, z0 = Math.max(0, s.z - s.hs), hx = s.byUse / 2, hy = s.bxUse / 2;
      if (z1 <= 1e-9) continue; // tầng nằm dưới mặt đất tự nhiên: không vẽ
      const above = i > 0 ? rows[i - 1] : null;
      const faces = [
        { n: [-1, 0, 0], q: [[-hx, hy, z0], [-hx, -hy, z0], [-hx, -hy, z1], [-hx, hy, z1]], D: 'X' },
        { n: [1, 0, 0], q: [[hx, -hy, z0], [hx, hy, z0], [hx, hy, z1], [hx, -hy, z1]] },
        { n: [0, -1, 0], q: [[-hx, -hy, z0], [hx, -hy, z0], [hx, -hy, z1], [-hx, -hy, z1]], D: 'Y' },
        { n: [0, 1, 0], q: [[hx, hy, z0], [-hx, hy, z0], [-hx, hy, z1], [hx, hy, z1]] },
      ];
      if (!above || above.byUse !== s.byUse || above.bxUse !== s.bxUse) faces.push({ n: [0, 0, 1], q: [[-hx, -hy, z1], [hx, -hy, z1], [hx, hy, z1], [-hx, hy, z1]], top: true });
      for (const f of faces) {
        if (camDepthOfNormal(...f.n) >= -1e-6) continue; // mặt quay lưng
        const pp = f.q.map(p => P(...p));
        const depth = pp.reduce((a, p) => a + p[2], 0) / 4;
        const light = f.top ? 1.06 : 0.82 + 0.16 * Math.abs(f.n[0] * Math.cos(st.yaw) + f.n[1] * Math.sin(st.yaw));
        const it = { depth, polys: [] };
        const windward = !zonesOn && f.D && ((f.D === 'X' && showX) || (f.D === 'Y' && showY));
        if (zOK && !f.top) { zoneFace(it, f, s, i, z0, z1, hx, hy, pp, light); items.push(it); continue; }
        if (!windward) it.polys.push({ p: pp, fill: shade(C.wall, light), stroke: C.line });
        else {
          // nửa trên: áp lực của sàn i; nửa dưới: áp lực sàn bên dưới (i+1) hoặc truyền xuống móng
          const zm = Math.max(z0, s.z - s.hs / 2), D = f.D, rD = R.dirs[D].rows;
          const sub = (za, zb) => f.q.map((p, k) => P(p[0], p[1], k < 2 ? za : zb));
          const lowerW = i < n - 1 ? rD[i + 1].Wk : null;
          it.polys.push({ p: sub(zm, z1), fill: heat(rD[i].Wk), stroke: null, hit: { D, i } });
          if (zm > z0 + 1e-9) it.polys.push({ p: sub(z0, zm), fill: lowerW == null ? shade(C.wall, light) : heat(lowerW), stroke: null, hit: lowerW == null ? null : { D, i: i + 1 }, hatch: lowerW == null });
          it.polys.push({ p: pp, fill: null, stroke: C.line });
          if (hl && hl.D === D) {
            if (hl.i === i) it.polys.push({ p: sub(zm, z1), fill: null, stroke: C.acc, lw: 2 });
            if (hl.i === i + 1) it.polys.push({ p: sub(z0, zm), fill: null, stroke: C.acc, lw: 2 });
          }
        }
        items.push(it);
      }
    }
    // ----- vùng ce theo Bảng F.4 -----
    function zoneFace(it, f, s, i, z0, z1, hx, hy, pp, light) {
      const along = ZD === 'X' ? 0 : 1; // trục theo hướng gió
      const nAlong = f.n[along], nSide = f.n[1 - along];
      const role = nAlong === -1 ? 'D' : nAlong === 1 ? 'E' : 'S';
      if (role !== 'S') {
        const ce = role === 'D' ? zf4.cD : zf4.cE;
        it.polys.push({ p: pp, fill: ceCol(ce), stroke: C.line, zhit: { zone: role, ce, w: role === 'D' ? zf4.wD : zf4.wE } });
        return;
      }
      const half = along === 0 ? hx : hy, dep = 2 * half, other = (along === 0 ? hy : hx) * nSide;
      const segs = [['A', zf4.cA, zf4.wA], ['B', zf4.cB, zf4.wB], ['C', zf4.cC, zf4.wC]];
      let t = 0;
      for (const [zn, ce, w] of segs) {
        if (w <= 0 || t >= dep - 1e-9) continue;
        const a = -half + t, b = -half + Math.min(dep, t + w); t += w;
        const q = along === 0 ? [[a, other, z0], [b, other, z0], [b, other, z1], [a, other, z1]] : [[other, a, z0], [other, b, z0], [other, b, z1], [other, a, z1]];
        it.polys.push({ p: q.map(p => P(...p)), fill: ceCol(ce), stroke: null, zhit: { zone: zn, ce, w } });
      }
      it.polys.push({ p: pp, fill: null, stroke: C.line });
    }
    const zLabels = [];
    if (zOK) {
      const zm = H * 0.55, si = rows.findIndex(s => s.z - s.hs <= zm && zm <= s.z + 1e-9), s = rows[Math.max(0, si)];
      const hx = s.byUse / 2, hy = s.bxUse / 2, along = ZD === 'X' ? 0 : 1, half = along === 0 ? hx : hy, oth = along === 0 ? hy : hx;
      const L = Math.max(arrMax * 0.55, 0.08 * S);
      const pt = (u, v2, z) => along === 0 ? P(u, v2, z) : P(v2, u, z);
      const zarrow = (zone, ce, u0, v0, du, dv) => { // (u0,v0): điểm trên mặt; (du,dv): pháp tuyến ra ngoài
        const len = Math.max(Math.abs(ce) * L, 0.02 * S), col = ce >= 0 ? C.pressS : C.suctS;
        let a, b;
        if (ce >= 0) { a = pt(u0 + du * (len + gap), v0 + dv * (len + gap), zm); b = pt(u0 + du * gap, v0 + dv * gap, zm); }
        else { a = pt(u0 + du * gap, v0 + dv * gap, zm); b = pt(u0 + du * (len + gap), v0 + dv * (len + gap), zm); }
        items.push({ depth: (a[2] + b[2]) / 2 - 0.001 * S, arrow: { a, b, col, w: 2.4 } });
        const lp = ce >= 0 ? a : b;
        zLabels.push({ x: lp[0], y: lp[1], d: lp[2], t: `${zone}  ${ce > 0 ? '+' : ''}${Fmt(ce, 2)}`, col, dx: (b[0] - a[0]) * (ce >= 0 ? -1 : 1) });
      };
      zarrow('D', zf4.cD, -half, 0, -1, 0);
      zarrow('E', zf4.cE, half, 0, 1, 0);
      let t = 0;
      for (const [zn, ce, w] of [['A', zf4.cA, zf4.wA], ['B', zf4.cB, zf4.wB], ['C', zf4.cC, zf4.wC]]) {
        if (w <= 0 || t >= 2 * half - 1e-9) continue;
        const mid = -half + t + Math.min(w, 2 * half - t) / 2; t += w;
        zarrow(zn, ce, mid, -oth, 0, -1); zarrow(zn, ce, mid, oth, 0, 1);
      }
    }
    // mũi tên lực
    const labels = [];
    for (const D of dirs) {
      const rD = R.dirs[D].rows, col = D === 'X' ? C.x : C.y;
      rD.forEach((r, i) => {
        if (!(r[key] > 0)) return; // tầng dưới mặt đất
        const s = rows[i], len = Math.max(r[key] / fMax * arrMax, 0.02 * S), zr = Math.max(r.z, 0);
        let a, b;
        if (D === 'X') { const x = -s.byUse / 2 - gap; a = P(x - len, 0, zr); b = P(x, 0, zr); }
        else { const y = -s.bxUse / 2 - gap; a = P(0, y - len, zr); b = P(0, y, zr); }
        const isHl = hl && hl.D === D && hl.i === i;
        items.push({ depth: (a[2] + b[2]) / 2 - 0.001 * S, arrow: { a, b, col: isHl ? C.acc : col, w: isHl ? 3 : Math.max(1.4, Math.min(2.6, 260 / n / 4)) } });
        hits.push({ seg: [a[0], a[1], b[0], b[1]], D, i, depth: (a[2] + b[2]) / 2 });
        labels.push({ x: a[0], y: a[1], d: a[2], dx: a[0] - b[0], t: Fmt(r[key], r[key] >= 1000 ? 0 : 1), col, pri: r[key] });
      });
    }
    items.sort((p, q) => q.depth - p.depth);
    const solids = [];
    for (const it of items) {
      if (it.arrow) { arrow(it.arrow); continue; }
      for (const p of it.polys) {
        ctx.beginPath(); p.p.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
        if (p.fill) { ctx.fillStyle = p.fill; ctx.fill(); }
        if (p.hatch) { ctx.save(); ctx.clip(); ctx.strokeStyle = C.muted; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; const xs = p.p.map(q => q[0]), ys = p.p.map(q => q[1]); for (let x = Math.min(...xs) - 60; x < Math.max(...xs); x += 6) { ctx.beginPath(); ctx.moveTo(x, Math.max(...ys)); ctx.lineTo(x + 60, Math.min(...ys)); ctx.stroke(); } ctx.restore(); }
        if (p.stroke) { ctx.strokeStyle = p.stroke; ctx.lineWidth = p.lw || 0.8; ctx.stroke(); }
        if (p.hit) hits.push({ poly: p.p.map(q => [q[0], q[1]]), ...p.hit });
        if (p.zhit) hits.push({ poly: p.p.map(q => [q[0], q[1]]), ...p.zhit });
        if (p.fill) solids.push({ poly: p.p, d: it.depth });
      }
    }
    function arrow({ a, b, col, w }) {
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, h = Math.min(Math.max(6, w * 3.2), L * 0.6);
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0] - ux * h * 0.8, b[1] - uy * h * 0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] - ux * h - uy * h * 0.5, b[1] - uy * h + ux * h * 0.5); ctx.lineTo(b[0] - ux * h + uy * h * 0.5, b[1] - uy * h - ux * h * 0.5); ctx.closePath(); ctx.fill();
    }
    hits.sort((p, q) => (p.seg ? 1 : 0) - (q.seg ? 1 : 0));
    const placed = [];
    // nhãn hướng gió (đặt trước để nhãn số tránh)
    ctx.font = '600 12px ' + css('--f-ui'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const D of dirs) {
      const s = rows[0];
      const p = D === 'X' ? P(-s.byUse / 2 - gap - arrMax * 0.5, 0, H + 0.1 * S) : P(0, -s.bxUse / 2 - gap - arrMax * 0.5, H + 0.1 * S);
      const w = ctx.measureText('Gió ' + D).width;
      ctx.fillStyle = D === 'X' ? C.x : C.y; ctx.fillText('Gió ' + D, p[0], p[1]);
      placed.push([p[0] - w / 2 - 3, p[1] - 8, p[0] + w / 2 + 3, p[1] + 8]);
    }
    // nhãn giá trị: đặt phía đuôi mũi tên, tránh chồng nhau và tránh chỗ bị khối nhà che
    ctx.font = '500 11px ' + css('--f-num');
    labels.sort((p, q) => q.pri - p.pri);
    for (const l of labels) {
      const w = ctx.measureText(l.t).width + 6;
      const left = l.dx <= 0; // mũi tên hướng sang phải → nhãn bên trái đuôi
      const box = left ? [l.x - w - 3, l.y - 7, l.x - 3, l.y + 7] : [l.x + 3, l.y - 7, l.x + w + 3, l.y + 7];
      if (solids.some(s => s.d < l.d && inPoly(l.x, l.y, s.poly))) continue;
      if (box[0] < 2 || box[2] > W - 2 || placed.some(b => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) continue;
      placed.push(box);
      ctx.fillStyle = C.panel; ctx.globalAlpha = 0.85; ctx.fillRect(box[0], box[1], w, 14); ctx.globalAlpha = 1;
      ctx.fillStyle = l.col; ctx.textAlign = left ? 'right' : 'left'; ctx.fillText(l.t, left ? l.x - 6 : l.x + 6, l.y + 0.5);
    }
    if (zOK) {
      ctx.font = '600 12px ' + css('--f-num');
      for (const l of zLabels) {
        if (solids.some(s => s.d < l.d && inPoly(l.x, l.y, s.poly))) continue;
        const w = ctx.measureText(l.t).width + 8, left = l.dx <= 0;
        const box = left ? [l.x - w - 3, l.y - 8, l.x - 3, l.y + 8] : [l.x + 3, l.y - 8, l.x + w + 3, l.y + 8];
        if (placed.some(b => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) continue;
        placed.push(box);
        ctx.fillStyle = C.panel; ctx.globalAlpha = 0.9; ctx.fillRect(box[0], box[1], w, 16); ctx.globalAlpha = 1;
        ctx.fillStyle = l.col; ctx.textAlign = left ? 'right' : 'left'; ctx.fillText(l.t, left ? l.x - 7 : l.x + 7, l.y + 0.5);
      }
      // mũi tên hướng gió lớn
      const s = rows[0], half = ZD === 'X' ? s.byUse / 2 : s.bxUse / 2, L = arrMax * 0.9, zz = H + 0.12 * S;
      const e0 = half + 0.3 * L, a = ZD === 'X' ? P(-e0 - L, 0, zz) : P(0, -e0 - L, zz), b = ZD === 'X' ? P(-e0, 0, zz) : P(0, -e0, zz);
      arrow({ a, b, col: ZD === 'X' ? C.x : C.y, w: 3 });
      ctx.font = '600 12px ' + css('--f-ui'); ctx.fillStyle = ZD === 'X' ? C.x : C.y; ctx.textAlign = 'right'; ctx.fillText('Gió ' + ZD, a[0] - 6, a[1]);
    } else if (zonesOn) {
      ctx.font = '500 13px ' + css('--f-ui'); ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      ctx.fillText(`Gió phương ${ZD}: h/d = ${Fmt(zf4.hd, 2)} > 5, tính theo F.16 (hệ số cản tổng cx), không chia vùng ce.`, W / 2, 24);
    }
    // trục toạ độ
    const ax = 36, ay = Hc - 34, al = 22;
    const axv = (x, y, z) => { const x1 = x * cy - y * sy, y1 = x * sy + y * cy; return [ax + x1 * al, ay - (y1 * sp + z * cp) * al]; };
    [['X', [1, 0, 0], C.x], ['Y', [0, 1, 0], C.y], ['Z', [0, 0, 1], C.muted]].forEach(([t, v, col]) => {
      const e = axv(...v); ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(e[0], e[1]); ctx.stroke();
      ctx.fillStyle = col; ctx.font = '600 11px ' + css('--f-ui'); ctx.fillText(t, ax + (e[0] - ax) * 1.35, ay + (e[1] - ay) * 1.35 + 1);
    });
    // chú giải màu
    const lg = wrap.parentElement.querySelector('.v3legend');
    if (lg && zonesOn) { lg.innerHTML = zOK ? `<span>Hệ số c<sub>e</sub> (Bảng F.4)</span><span class="num">hút −1,2</span><span class="bar" style="background:linear-gradient(90deg,${ceCol(-1.2)},${ceCol(-0.3)} 49%,${ceCol(0.3)} 51%,${ceCol(0.8)})"></span><span class="num">+0,8 đẩy</span><span>· e = ${Fmt(zf4.e, 2)} m (${zf4.cas}) · c = |c<sub>D</sub>| + |c<sub>E</sub>| = ${Fmt(ZR.c, 3)}</span>` : `<span>Phương ${ZD} dùng F.16, không có vùng c<sub>e</sub>.</span>`; }
    else if (lg) lg.innerHTML = `<span>Áp lực W<sub>k</sub> trên mặt đón gió (daN/m²)</span><span class="bar" style="background:linear-gradient(90deg,${heat(wMin)},${heat(wMax)})"></span><span class="num">${Fmt(wMin, 1)} – ${Fmt(wMax, 1)}</span><span class="hatch"></span><span>½h₁ truyền xuống móng</span>`;
  }
  function niceStep(raw) { const p = Math.pow(10, Math.floor(Math.log10(raw))); const n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  function unmount() { if (ro) { ro.disconnect(); ro = null; } cv = null; }
  return { mount, update, unmount, preset, zoomBy, draw, st };
})();

if (typeof module !== 'undefined') module.exports = View3D;
