// Tiny test helpers (no test framework needed).
'use strict';
let failures = 0, passes = 0;
const results = [];
function check(cond, msg) {
  if (cond) { passes++; return true; }
  failures++;
  results.push('FAIL ' + msg);
  console.log('  \x1b[31mFAIL\x1b[0m ' + msg);
  return false;
}
function section(name) { console.log('\n== ' + name); }
function done(name) {
  console.log(`\n${name}: ${passes} checks passed, ${failures} failed`);
  process.exitCode = failures ? 1 : 0;
  return { passes, failures };
}
function segX(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
function inside(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// Two simple polygons overlap if any edges cross or one contains a vertex of the other.
function polysOverlap(A, B) {
  for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) if (segX(A[i], A[(i + 1) % A.length], B[j], B[(j + 1) % B.length])) return true;
  return A.some((p) => inside(p, B)) || B.some((p) => inside(p, A));
}
// A point well inside a polygon (farthest from its edges on a grid), for aiming/tapping in tests.
function interiorPoint(poly) {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let best = null, bestD = -1;
  for (let i = 1; i < 40; i++) for (let j = 1; j < 40; j++) {
    const p = [x0 + ((x1 - x0) * i) / 40, y0 + ((y1 - y0) * j) / 40];
    if (!inside(p, poly)) continue;
    const d = edgeDistance(p, poly);
    if (d > bestD) { bestD = d; best = p; }
  }
  return best;
}
function edgeDistance(p, poly) {
  let m = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    m = Math.min(m, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
  }
  return m;
}
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function combos(arr, k) {
  const out = [];
  const rec = (start, acc) => { if (acc.length === k) return out.push(acc.slice()); for (let i = start; i < arr.length; i++) { acc.push(arr[i]); rec(i + 1, acc); acc.pop(); } };
  rec(0, []);
  return out;
}
module.exports = { check, section, done, polysOverlap, rng, combos, inside, interiorPoint, edgeDistance };
