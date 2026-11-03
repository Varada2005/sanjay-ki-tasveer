// npm test: runs A (data), B (simulation), C (integration), D (UI) in order.
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');

const suites = [
  ['A  data', 'data.test.js'],
  ['B  simulation', 'sim.test.js'],
  ['C  two-client integration', 'integration.test.js'],
  ['D  UI smoke (Playwright)', 'ui.test.js']
];
const summary = [];
for (const [name, file] of suites) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const out = (r.stdout || '') + (r.stderr || '');
  process.stdout.write(out);
  const m = out.match(/(\d+) checks passed, (\d+) failed/);
  const skipped = /skipped/.test(out) && !m;
  summary.push({ name, ok: r.status === 0, passed: m ? +m[1] : 0, failed: m ? +m[2] : 0, skipped, s: ((Date.now() - t0) / 1000).toFixed(1) });
}
console.log('\n================ SUMMARY ================');
for (const s of summary) console.log(`${s.ok ? 'PASS' : 'FAIL'}  ${s.name.padEnd(30)} ${s.skipped ? 'skipped' : `${s.passed} passed, ${s.failed} failed`}  (${s.s} s)`);
process.exit(summary.every((s) => s.ok) ? 0 : 1);
