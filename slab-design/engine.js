(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SlabEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Excel-derived tables: PhuLuc-Excel (Bang_RbRbt, Bang_Eb, Bang_Rs).
  const CONCRETES = Object.freeze({
    'B12.5': { rb: 7.5, rbt: 0.66, eb: 21500 }, 'B15': { rb: 8.5, rbt: 0.75, eb: 24000 },
    'B20': { rb: 11.5, rbt: 0.9, eb: 27500 }, 'B25': { rb: 14.5, rbt: 1.05, eb: 30000 },
    'B30': { rb: 17, rbt: 1.15, eb: 32500 }, 'B35': { rb: 19.5, rbt: 1.3, eb: 34500 },
    'B40': { rb: 22, rbt: 1.4, eb: 36000 }, 'B45': { rb: 25, rbt: 1.5, eb: 37000 },
    'B50': { rb: 27.5, rbt: 1.6, eb: 38000 }, 'B55': { rb: 30, rbt: 1.7, eb: 39000 }, 'B60': { rb: 33, rbt: 1.8, eb: 39500 }
  });
  const STEELS = Object.freeze({
    'CB240-T': { rs: 210, rsc: 210, es: 200000 }, 'CB300-T': { rs: 260, rsc: 260, es: 200000 },
    'CB300-V': { rs: 260, rsc: 260, es: 200000 }, 'CB400-V': { rs: 350, rsc: 350, es: 200000 }, 'CB500-V': { rs: 435, rsc: 435, es: 200000 }
  });
  const STATUS = Object.freeze({ PASS: 'Thỏa', FAIL: 'Không thỏa' });
  const DEFAULTS = Object.freeze({ epsilonB2: 0.0035, gammaB: 1, rhoMin: 0.001, rhoOptMin: 0.006, rhoOptMax: 0.009 });
  // Excel-derived catalogue: PhuLuc-Excel!A98:R107. Single-bar rows are 6, 8, 10, 12, 14, 16.
  // Rows 6/8 and 8/10 are bundled-bar entries and are intentionally outside V1 recommendations.
  const DEFAULT_CANDIDATES = Object.freeze({
    diameters: [6, 8, 10, 12, 14, 16],
    spacings: [70, 75, 80, 90, 100, 110, 120, 125, 130, 140, 150, 160, 170, 180, 190, 200, 250]
  });

  function material(concreteClass, steelGroup, options) {
    const concrete = CONCRETES[concreteClass]; const steel = STEELS[steelGroup];
    if (!concrete || !steel) return null;
    const settings = { ...DEFAULTS, ...(options || {}) };
    const rb = concrete.rb * settings.gammaB;
    const xR = 0.8 / (1 + steel.rs / (steel.es * settings.epsilonB2));
    return { concreteClass, steelGroup, ...concrete, ...steel, rb, xR, alphaR: xR * (1 - 0.5 * xR), rhoMax: xR * rb / steel.rs, ...settings };
  }
  function status(condition) { return condition ? STATUS.PASS : STATUS.FAIL; }
  function finitePositive(value) { return Number.isFinite(value) && value > 0; }

  function calculate(input, mat) {
    const row = { ...input }; const errors = [];
    if (!mat) return { ...row, errors: ['Vật liệu không hợp lệ.'], valid: false };
    ['b', 'h', 'phi', 'spacing', 'cover'].forEach((key) => { if (!finitePositive(Number(row[key]))) errors.push(`${key} phải lớn hơn 0.`); });
    if (!Number.isFinite(Number(row.Mtt)) || Number(row.Mtt) === 0) errors.push('Mtt phải là mô-men khác 0.');
    if (errors.length) return { ...row, errors, valid: false };
    const b = Number(row.b), h = Number(row.h), phi = Number(row.phi), spacing = Number(row.spacing), cover = Number(row.cover), Mtt = Number(row.Mtt);
    const h0 = h - (cover + 0.5 * phi);
    if (!(h0 > 0)) return { ...row, h0, errors: ['h0 phải lớn hơn 0. Kiểm tra h, lớp bảo vệ và φ.'], valid: false };
    const alpha_m = Math.abs(Mtt) * 1e6 / (mat.rb * b * h0 ** 2);
    if (alpha_m >= 0.5) return { ...row, h0, alpha_m, errors: ['αm ≥ 0.500; biểu thức ξ không còn thực.'], valid: false };
    const xi = 1 - Math.sqrt(1 - 2 * alpha_m);
    const As_required = xi * mat.rb * b * h0 / mat.rs;
    const rho_required = As_required / (b * h0);
    const As_provided = Math.PI * phi ** 2 / 4 * (b / spacing);
    const rho_provided = As_provided / (b * h0);
    const checks = {
      rho_required_bounds: status(mat.rhoMin <= rho_required && rho_required <= mat.rhoMax),
      rho_required_optimum: status(mat.rhoOptMin <= rho_required && rho_required <= mat.rhoOptMax),
      area_provided: status(As_provided >= As_required),
      rho_provided_bounds: status(mat.rhoMin <= rho_provided && rho_provided <= mat.rhoMax)
    };
    const reviewWarnings = [];
    if (alpha_m > mat.alphaR) reviewWarnings.push('αm vượt αR');
    if (xi > mat.xR) reviewWarnings.push('ξ vượt ξR');
    const valid = checks.rho_required_bounds === STATUS.PASS && checks.area_provided === STATUS.PASS && checks.rho_provided_bounds === STATUS.PASS && !reviewWarnings.length;
    return { ...row, h0, alpha_m, xi, As_required, rho_required, As_provided, rho_provided, checks, reviewWarnings, errors: [], valid };
  }

  function recommend(input, mat, candidates) {
    const set = { ...DEFAULT_CANDIDATES, ...(candidates || {}) }; const proposals = [];
    for (const phi of set.diameters) for (const spacing of set.spacings) {
      const result = calculate({ ...input, phi, spacing }, mat);
      if (!result.valid) continue;
      proposals.push({ phi, spacing, result, score: [result.As_provided - result.As_required, result.rho_provided, -spacing, phi] });
    }
    proposals.sort((a, b) => a.score[0] - b.score[0] || a.score[1] - b.score[1] || a.score[2] - b.score[2] || a.score[3] - b.score[3]);
    return proposals;
  }

  return { CONCRETES, STEELS, STATUS, DEFAULTS, DEFAULT_CANDIDATES, material, calculate, recommend };
});
