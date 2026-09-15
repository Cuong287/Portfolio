const CONCRETES = {
  'B12.5': { rb: 7.5, rbt: .66, eb: 21500 }, 'B15': { rb: 8.5, rbt: .75, eb: 24000 },
  'B20': { rb: 11.5, rbt: .9, eb: 27500 }, 'B25': { rb: 14.5, rbt: 1.05, eb: 30000 },
  'B30': { rb: 17, rbt: 1.15, eb: 32500 }, 'B35': { rb: 19.5, rbt: 1.3, eb: 34500 },
  'B40': { rb: 22, rbt: 1.4, eb: 36000 }, 'B45': { rb: 25, rbt: 1.5, eb: 37000 },
  'B50': { rb: 27.5, rbt: 1.6, eb: 38000 }, 'B55': { rb: 30, rbt: 1.7, eb: 39000 }, 'B60': { rb: 33, rbt: 1.8, eb: 39500 }
};
const STEELS = { 'CB240-T': { rs: 210, es: 200000 }, 'CB300-T': { rs: 260, es: 200000 }, 'CB300-V': { rs: 260, es: 200000 }, 'CB400-V': { rs: 350, es: 200000 }, 'CB500-V': { rs: 435, es: 200000 } };
const EXAMPLE = [
  ['S1','X','Gối trái',-21.56,8000,1000,150,32,14,200], ['S1','X','Nhịp',10.15,10000,1000,150,31,12,100], ['S1','X','Gối phải',-23.54,4000,1000,150,32,14,200],
  ['S1','Y','Gối trái',-59.6,5000,1000,150,32,14,200], ['S1','Y','Nhịp',50,5000,1000,150,31,12,100], ['S1','Y','Gối phải',-84.32,5000,1000,150,32,14,200]
];
const $ = (selector) => document.querySelector(selector);
const body = $('#strip-body');

function fillSelect(select, options, value) { select.innerHTML = Object.keys(options).map(key => `<option ${key === value ? 'selected' : ''}>${key}</option>`).join(''); }
function numberInput(value, min, step = '1') { return `<input type="number" value="${value}" min="${min}" step="${step}">`; }
function rowMarkup(values) {
  const defaultA = Number($('#cover')?.value || 25) + 6;
  const [name, direction, position, moment, span, width, depth, a, diameter, spacing] = values || ['', 'X', 'Nhịp', '', '', 1000, 150, defaultA, 12, 150];
  return `<tr><td><input aria-label="Tên dải" value="${name}"></td><td><select aria-label="Phương"><option ${direction === 'X' ? 'selected' : ''}>X</option><option ${direction === 'Y' ? 'selected' : ''}>Y</option></select></td><td><select aria-label="Vị trí"><option ${position === 'Gối trái' ? 'selected' : ''}>Gối trái</option><option ${position === 'Nhịp' ? 'selected' : ''}>Nhịp</option><option ${position === 'Gối phải' ? 'selected' : ''}>Gối phải</option></select></td><td>${numberInput(moment, 0, '.01')}</td><td>${numberInput(span, 1)}</td><td>${numberInput(width, 1)}</td><td>${numberInput(depth, 1)}</td><td>${numberInput(a, 0)}</td><td>${numberInput(diameter, 6)}</td><td>${numberInput(spacing, 50)}</td><td><button type="button" class="delete-row" aria-label="Xóa dải">×</button></td></tr>`;
}
function addRow(values) { body.insertAdjacentHTML('beforeend', rowMarkup(values)); }
function allRows() { return [...body.querySelectorAll('tr')].map(tr => { const fields = [...tr.querySelectorAll('input,select')]; return { name: fields[0].value.trim() || '—', direction: fields[1].value, position: fields[2].value, moment: Number(fields[3].value), span: Number(fields[4].value), width: Number(fields[5].value), depth: Number(fields[6].value), a: Number(fields[7].value), diameter: Number(fields[8].value), spacing: Number(fields[9].value) }; }); }
function material() { const concrete = CONCRETES[$('#concrete').value]; const steel = STEELS[$('#steel').value]; const epsB2 = .0035; const xiR = .8 / (1 + steel.rs / (steel.es * epsB2)); return { ...concrete, ...steel, xiR, alphaR: xiR * (1 - .5 * xiR), rhoLimit: xiR * concrete.rb / steel.rs }; }
function renderMaterial() { const m = material(); const stats = [['R<sub>b</sub>', `${m.rb.toFixed(2)} MPa`], ['R<sub>bt</sub>', `${m.rbt.toFixed(2)} MPa`], ['E<sub>b</sub>', `${m.eb.toLocaleString('en-US')} MPa`], ['R<sub>s</sub>', `${m.rs} MPa`], ['ξ<sub>R</sub>', m.xiR.toFixed(3)], ['α<sub>R</sub>', m.alphaR.toFixed(3)]]; $('#material-summary').innerHTML = stats.map(([name, value]) => `<div class="material-stat"><dt>${name}</dt><dd>${value}</dd></div>`).join(''); }
function calculate(row, m) {
  const h0 = row.depth - row.a;
  if (![row.moment,row.span,row.width,row.depth,row.a,row.diameter,row.spacing].every(Number.isFinite) || row.moment === 0 || h0 <= 0 || row.spacing <= 0) return { ...row, error: 'Thiếu hoặc sai dữ liệu hình học / nội lực.' };
  const alpha = Math.abs(row.moment) * 1e6 / (m.rb * row.width * h0 ** 2);
  if (alpha >= .5) return { ...row, h0, alpha, error: 'αm ≥ 0.500. Tăng chiều dày hoặc kiểm tra lại mô-men.' };
  const xi = 1 - Math.sqrt(1 - 2 * alpha);
  const asReq = xi * m.rb * row.width * h0 / m.rs;
  const asProv = Math.PI * row.diameter ** 2 / 4 * row.width / row.spacing;
  const rhoReq = asReq / (row.width * h0);
  const rhoProv = asProv / (row.width * h0);
  const rhoMin = .001, rhoOptMin = Number($('#rho-min').value) / 100, rhoOptMax = Number($('#rho-max-opt').value) / 100;
  const warnings = [];
  if (alpha > m.alphaR) warnings.push('αm vượt αR');
  if (rhoReq > m.rhoLimit) warnings.push('ρ yêu cầu vượt giới hạn');
  if (asProv + .001 < asReq) warnings.push('Aₛ bố trí thiếu');
  if (rhoProv < rhoMin || rhoProv > m.rhoLimit) warnings.push('ρ bố trí ngoài giới hạn');
  const optimum = rhoReq >= rhoOptMin && rhoReq <= rhoOptMax;
  return { ...row, h0, alpha, xi, asReq, asProv, rhoReq, rhoProv, optimum, warnings, pass: warnings.length === 0 };
}
function n(value, digits = 0) { return Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }) : '—'; }
function renderResults(results) {
  const valid = results.filter(r => !r.error); const pass = results.filter(r => r.pass).length; const issues = results.length - pass;
  const maxReq = valid.length ? Math.max(...valid.map(r => r.asReq)) : NaN; const maxRho = valid.length ? Math.max(...valid.map(r => r.rhoReq)) * 100 : NaN;
  $('#metrics').innerHTML = `<article><span>Dải hợp lệ</span><strong>${pass} / ${results.length}</strong><small>đạt các kiểm tra TTGH I</small></article><article><span>A<sub>s,req</sub> lớn nhất</span><strong>${n(maxReq)} </strong><small>mm²/m</small></article><article><span>Hàm lượng lớn nhất</span><strong>${n(maxRho, 2)}</strong><small>% yêu cầu</small></article><article><span>Cần rà soát</span><strong>${issues}</strong><small>α<sub>m</sub> hoặc bố trí thép</small></article>`;
  $('#result-body').innerHTML = results.map(r => {
    const status = r.error ? r.error : r.pass ? (r.optimum ? 'Thỏa · tối ưu' : 'Thỏa') : r.warnings.join('; ');
    const kind = r.error || !r.pass ? 'fail' : r.optimum ? 'pass' : 'warn';
    return `<tr><td>${r.name}</td><td>${r.direction}</td><td>${r.position}</td><td>${n(r.h0)}</td><td>${n(r.alpha,3)}</td><td>${n(r.xi,3)}</td><td>${n(r.asReq)}</td><td>${n(r.asProv)}</td><td>${n(r.rhoReq*100,2)}%</td><td>${n(r.rhoProv*100,2)}%</td><td class="status ${kind}">${status}</td></tr>`;
  }).join('');
}
function run() { const rows = allRows(); const invalidBlank = rows.some(r => !r.name || !r.moment || !r.span); if (!rows.length || invalidBlank) { $('#form-message').textContent = 'Hãy điền tên dải, mô-men MEd và nhịp L cho mỗi dòng.'; return; } const results = rows.map(row => calculate(row, material())); window.lastResults = results; renderResults(results); const passes = results.filter(r => r.pass).length; $('#form-message').textContent = `Đã tính ${results.length} dải. ${passes} dải thỏa các kiểm tra đang áp dụng.`; }
function csvCell(value) { return `"${String(value).replaceAll('"', '""')}"`; }
function exportCsv() { if (!window.lastResults?.length) { $('#form-message').textContent = 'Cần tính cốt thép trước khi tải kết quả.'; return; } const headers = ['Dải','Phương','Vị trí','MEd (kN.m)','h0 (mm)','alpha_m','xi','As yêu cầu (mm2/m)','As bố trí (mm2/m)','rho yêu cầu (%)','rho bố trí (%)','Kết quả']; const lines = [headers, ...window.lastResults.map(r => [r.name,r.direction,r.position,r.moment,r.h0,r.alpha,r.xi,r.asReq,r.asProv,r.rhoReq*100,r.rhoProv*100,r.error || (r.pass ? 'Thỏa' : r.warnings.join('; '))])].map(row => row.map(csvCell).join(',')); const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }); const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'slab-design-results.csv' }); link.click(); URL.revokeObjectURL(link.href); }

fillSelect($('#concrete'), CONCRETES, 'B30'); fillSelect($('#steel'), STEELS, 'CB300-V'); renderMaterial(); EXAMPLE.forEach(addRow);
$('#concrete').addEventListener('change', renderMaterial); $('#steel').addEventListener('change', renderMaterial);
$('#add-row').addEventListener('click', () => addRow()); $('#load-example').addEventListener('click', () => { body.innerHTML = ''; EXAMPLE.forEach(addRow); $('#form-message').textContent = 'Đã nạp lại ví dụ từ workbook tham chiếu.'; });
body.addEventListener('click', (event) => { const button = event.target.closest('.delete-row'); if (button) { button.closest('tr').remove(); } });
$('#slab-form').addEventListener('submit', (event) => { event.preventDefault(); run(); }); $('#export-csv').addEventListener('click', exportCsv);
