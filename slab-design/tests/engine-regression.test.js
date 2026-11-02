const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Engine = require('../engine.js');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'uls-bending-v1.json'), 'utf8'));
const mat = Engine.material(fixture.material_defaults.concrete_class, fixture.material_defaults.steel_group, {
  rhoMin: fixture.material_defaults.rho_min, rhoOptMin: fixture.material_defaults.rho_opt_min, rhoOptMax: fixture.material_defaults.rho_opt_max
});
assert.deepStrictEqual(Engine.DEFAULT_CANDIDATES.diameters, [6, 8, 10, 12, 14, 16], 'catalogue diameters must match PhuLuc-Excel A100:A107 single-bar rows');
assert.deepStrictEqual(Engine.DEFAULT_CANDIDATES.spacings, [70, 75, 80, 90, 100, 110, 120, 125, 130, 140, 150, 160, 170, 180, 190, 200, 250], 'catalogue spacings must match PhuLuc-Excel B99:R99');
function close(actual, expected, tolerance, label) { assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`); }
for (const test of fixture.cases) {
  const r = Engine.calculate({ ...test.effective_input, cover: fixture.material_defaults.cover_cbv }, mat); const e = test.expected;
  assert.ok(r.valid || e.area_provided === Engine.STATUS.FAIL, test.id + ' should calculate');
  close(r.h0, e.h0, fixture.tolerances.length_mm.absolute, test.id + ' h0');
  ['alpha_m', 'xi', 'rho_required', 'rho_provided'].forEach((k) => close(r[k], e[k], fixture.tolerances.dimensionless.absolute, test.id + ' ' + k));
  ['As_required', 'As_provided'].forEach((k) => close(r[k], e[k], fixture.tolerances.area_mm2.absolute, test.id + ' ' + k));
  Object.entries(e).filter(([k]) => k.includes('_bounds') || k.includes('_optimum') || k === 'area_provided').forEach(([k, v]) => assert.strictEqual(r.checks[k], v, test.id + ' ' + k));
}
const invalid = Engine.calculate({ Mtt: 10, b: 1000, h: 30, cover: 25, phi: 12, spacing: 150 }, mat); assert.strictEqual(invalid.valid, false);
const base = fixture.cases[0].effective_input; const phi14 = Engine.calculate({ ...base, cover: 25, phi: 14, spacing: 200 }, mat); const phi12 = Engine.calculate({ ...base, cover: 25, phi: 12, spacing: 200 }, mat); assert.notStrictEqual(phi14.h0, phi12.h0); assert.notStrictEqual(phi14.As_required, phi12.As_required);
const derived = fixture.phi_dependency_demonstration.expected_at_phi12; const derivedResult = Engine.calculate({ ...base, cover: fixture.material_defaults.cover_cbv, phi: 12, spacing: 200 }, mat);
close(derivedResult.h0, derived.h0, fixture.tolerances.length_mm.absolute, 'derived phi h0'); ['alpha_m', 'xi', 'rho_required', 'rho_provided'].forEach(k => close(derivedResult[k], derived[k], fixture.tolerances.dimensionless.absolute, 'derived phi ' + k)); ['As_required', 'As_provided'].forEach(k => close(derivedResult[k], derived[k], fixture.tolerances.area_mm2.absolute, 'derived phi ' + k)); ['rho_required_bounds', 'rho_required_optimum', 'area_provided', 'rho_provided_bounds'].forEach(k => assert.strictEqual(derivedResult.checks[k], derived[k], 'derived phi ' + k));
const recommendationInput = { ...base, cover: 25 }; const one = Engine.recommend(recommendationInput, mat); const two = Engine.recommend(recommendationInput, mat); assert.deepStrictEqual(one.map(x => [x.phi, x.spacing]), two.map(x => [x.phi, x.spacing])); assert.ok(one.length > 0); assert.ok(one.every(x => x.result.valid));
const catalogueInput = { ...fixture.cases[1].effective_input, cover: fixture.material_defaults.cover_cbv };
const perPhi = Engine.DEFAULT_CANDIDATES.diameters.map(phi => Engine.calculate({ ...catalogueInput, phi, spacing: 70 }, mat));
assert.strictEqual(perPhi.length, Engine.DEFAULT_CANDIDATES.diameters.length, 'every catalogue diameter must be calculated');
assert.ok(perPhi.every(r => !r.errors.length), 'representative input must calculate for every catalogue diameter');
assert.strictEqual(new Set(perPhi.map(r => r.h0)).size, perPhi.length, 'h0 must be recomputed per phi');
assert.strictEqual(new Set(perPhi.map(r => r.alpha_m)).size, perPhi.length, 'alpha_m must be recomputed per phi');
assert.strictEqual(new Set(perPhi.map(r => r.xi)).size, perPhi.length, 'xi must be recomputed per phi');
assert.strictEqual(new Set(perPhi.map(r => r.As_required)).size, perPhi.length, 'As_required must be recomputed per phi');
const searched = Engine.recommend(catalogueInput, mat, { diameters: Engine.DEFAULT_CANDIDATES.diameters, spacings: [70] });
assert.deepStrictEqual(new Set(searched.map(x => x.phi)), new Set(Engine.DEFAULT_CANDIDATES.diameters), 'every catalogue diameter must be searched and yield a valid arrangement for the representative input');
assert.ok(searched.every(x => x.result.valid), 'returned recommendations must be valid');
function compareScore(a, b) { for (let i = 0; i < a.length; i += 1) { if (a[i] !== b[i]) return a[i] - b[i]; } return 0; }
assert.ok(searched.every((x, i, xs) => i === 0 || compareScore(xs[i - 1].score, x.score) <= 0), 'recommendations must retain ascending engine ranking');
console.log(`PASS: ${fixture.cases.length} fixture cases, invalid input, phi dependency, recommendation validity/ranking/repeatability`);
