// Test B: 100,000+ random playthroughs against the real rules (server/game.js),
// plus the face-table logic.
'use strict';
const G = require('../server/game');
const { check, section, done, rng, combos } = require('./lib');

const data = G.loadData();
const { game } = data;
const P = game.puzzles;
const RUNS_PER_CONFIG = Number(process.env.SIM_RUNS || 1900); // 6 starts x 3 x 3 x 1900 = 102,600

const candRegions = data.regionsFile.regions.filter((r) => r.type === 'candidate');
const wrongCands = candRegions.filter((r) => r.candidateId !== 'sanjay');
const sanjayRegion = candRegions.find((r) => r.candidateId === 'sanjay');

const totals = { runs: 0, complete: 0, deadlocks: 0, alternationBreaks: 0, alternationRuns: 0, rests: 0, restViolations: 0, wrongSolved: 0, events: 0, wins: 0, duplicatePieces: 0, badNext: 0, clueViolations: 0 };

function runOnce(start, follow, missRate, seed) {
  const r = rng(seed);
  const st = G.createState('SIMU', 0);
  let now = 1000;
  const ev = (e) => { now += 50 + Math.floor(r() * 2000); totals.events++; return G.applyEvent(data, st, e, now); };
  const restCheck = () => {
    if (!G.isResting(st, now)) return;
    totals.rests++;
    const a = ev({ type: 'guess', role: 'dadi', regionId: sanjayRegion.id });
    const b = ev({ type: 'hook', role: P[0].page, regionId: P[0].wrapperRegionId });
    if (st.restUntil != null && now < st.restUntil && !(a.replies[0].type === 'resting' && b.replies[0].type === 'resting')) totals.restViolations++;
    now = st.restUntil + 1;
    ev({ type: 'tick' });
    if (st.restUntil != null || st.wrongGuesses !== 0) totals.restViolations++;
  };
  const maybeGuess = () => {
    if (r() < 0.12) {
      const c = wrongCands[Math.floor(r() * wrongCands.length)];
      ev({ type: 'guess', role: c.page, regionId: c.id });
      if (st.restUntil != null) totals.restViolations++;
      restCheck();
    }
  };

  let target = start;
  const pages = [];
  let steps = 0;
  while (Object.keys(st.solved).length < 6) {
    if (++steps > 60) { totals.deadlocks++; return false; }
    const p = data.puzzleById[target];
    const open = ev({ type: 'hook', role: p.page, regionId: p.wrapperRegionId }).replies[0];
    if (open.type !== 'puzzle' || open.lines[0] !== `${p.id}.riddle`) return false;
    maybeGuess();
    let misses = 0;
    while (r() < missRate && misses < 6) {
      let wrong; do wrong = String(Math.floor(r() * 10 ** p.answer.length)).padStart(p.answer.length, '0'); while (wrong === p.answer);
      const res = ev({ type: 'code', role: p.page, regionId: p.wrapperRegionId, code: wrong }).replies[0];
      misses++;
      if (res.result !== 'wrong' || res.lines.join() !== `${p.id}.riddle`) totals.wrongSolved++;
      if ((st.attempts[p.id].wrong >= game.timing.wrongBeforeVisualClue) !== !!res.visualClue) totals.clueViolations++;
    }
    maybeGuess();
    const res = ev({ type: 'code', role: p.page, regionId: p.wrapperRegionId, code: p.answer }).replies[0];
    if (res.result !== 'solved') return false;
    pages.push(p.page);
    // "next" always points to an unsolved puzzle, or to the final search when all are solved
    const unsolved = P.filter((x) => !st.solved[x.id]);
    if (unsolved.length ? (res.next === 'final' || st.solved[res.next]) : res.next !== 'final') totals.badNext++;
    if (r() < 0.05) {
      const n = st.pieces.length;
      const d = ev({ type: 'code', role: p.page, regionId: p.wrapperRegionId, code: p.answer }).replies[0];
      if (d.result !== 'already' || st.pieces.length !== n) totals.duplicatePieces++;
    }
    if (!unsolved.length) break;
    target = r() < follow ? res.next : unsolved[Math.floor(r() * unsolved.length)].id;
  }
  if (follow === 1) {
    totals.alternationRuns++;
    for (let i = 1; i < pages.length; i++) if (pages[i] === pages[i - 1]) { totals.alternationBreaks++; break; }
  }
  if (new Set(st.pieces).size !== 6 || st.pieces.length !== 6) return false;
  if (G.isResting(st, now)) { now = st.restUntil + 1; ev({ type: 'tick' }); }
  ev({ type: 'guess', role: 'dadi', regionId: sanjayRegion.id });
  if (st.won) totals.wins++;
  return true;
}

section('Simulation');
const t0 = Date.now();
let seed = 1;
const perConfig = [];
for (const start of game.chain) for (const follow of [1, 0.5, 0]) for (const miss of [0, 0.3, 0.6]) {
  let ok = 0;
  for (let i = 0; i < RUNS_PER_CONFIG; i++) { totals.runs++; if (runOnce(start, follow, miss, seed++)) { ok++; totals.complete++; } }
  perConfig.push({ start, follow, miss, ok });
}
console.log(`  ${totals.runs} playthroughs, ${totals.events} events, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(`  complete: ${totals.complete}/${totals.runs}   deadlocks: ${totals.deadlocks}   wins: ${totals.wins}`);
console.log(`  pointer-following runs: ${totals.alternationRuns}, page alternation breaks: ${totals.alternationBreaks}, bad "next" pointers: ${totals.badNext}`);
console.log(`  rests: ${totals.rests}, rest violations: ${totals.restViolations}, picture-clue violations: ${totals.clueViolations}, duplicate pieces: ${totals.duplicatePieces}`);
check(totals.runs >= 100000, `at least 100,000 playthroughs (${totals.runs})`);
check(totals.complete === totals.runs, 'every run reaches 6 pieces');
check(totals.deadlocks === 0, 'no deadlock');
check(totals.wins === totals.runs, 'Sanjay can always be found at the end');
check(totals.alternationBreaks === 0, 'following the "next" pointer, the phones strictly alternate teen/dadi');
check(totals.badNext === 0, '"next" always points to an unsolved puzzle, or to Sanjay when all are solved');
check(totals.wrongSolved === 0, 'wrong answers never solve and always repeat the riddle');
check(totals.clueViolations === 0, 'picture clue appears exactly from the 3rd wrong answer');
check(totals.restViolations === 0 && totals.rests === 0, 'wrong guesses never pause the game');
check(totals.duplicatePieces === 0, 'duplicate solves never add a piece');
for (const c of perConfig) check(c.ok === RUNS_PER_CONFIG, `start ${c.start}, follow ${c.follow * 100}%, misses ${c.miss * 100}%: ${c.ok}/${RUNS_PER_CONFIG}`);

for (const start of game.chain) {
  const st = G.createState('SEQ', 0);
  let target = start, now = 0;
  const seq = [];
  while (target && target !== 'final') {
    const p = data.puzzleById[target];
    const res = G.applyEvent(data, st, { type: 'code', role: p.page, regionId: p.wrapperRegionId, code: p.answer }, (now += 1000)).replies[0];
    seq.push(`${p.id}@${p.page[0].toUpperCase()}=${p.answer}`);
    target = res.next;
  }
  console.log(`  start ${start}: ${seq.join(' -> ')} -> ${target}`);
}

{
  const st = G.createState('REST', 0);
  const [c1, c2] = wrongCands;
  for (let i = 0; i < 5; i++) {
    const c = i % 2 ? c1 : c2;
    const r = G.applyEvent(data, st, { type: 'guess', role: i % 2 ? 'teen' : 'dadi', regionId: c.id }, 1000 + i);
    check(r.replies[0].type === 'guess' && !r.replies[0].correct && !r.broadcast.some((b) => b.type === 'rest') && !G.isResting(st, 1000 + i), `wrong guess ${i + 1} (from either phone): the man answers, the game continues`);
  }
  const win = G.applyEvent(data, st, { type: 'guess', role: 'teen', regionId: sanjayRegion.id }, 9000);
  check(win.broadcast.some((b) => b.type === 'celebrate') && st.won, 'Find Sanjay works at any time, from either phone');
}

section('Face table');
const FEATS = ['red_headcloth', 'eyebrow_scar', 'curled_moustache', 'murki', 'mole', 'gap_tooth'];
const sanjay = game.candidates.find((c) => c.isSanjay);
const others = game.candidates.filter((c) => !c.isSanjay);
check(FEATS.every((f) => sanjay.features[f]), 'Sanjay has all 6 features');
check(others.every((c) => !FEATS.every((f) => c.features[f])), 'no other candidate has all 6 features');
check(game.candidates.filter((c) => c.features.red_headcloth).length === 4, '4 of 6 men wear red on the head');
const identifies = (set) => !others.some((c) => set.every((f) => c.features[f]));
const expected = { 3: [10, 20], 4: [13, 15], 5: [6, 6], 6: [1, 1] };
for (let k = 1; k <= 6; k++) {
  const cs = combos(FEATS, k);
  const n = cs.filter(identifies).length;
  console.log(`  ${k} piece(s): ${n}/${cs.length} combinations identify Sanjay`);
  if (expected[k]) check(n === expected[k][0] && cs.length === expected[k][1], `${k} pieces: ${expected[k][0]}/${expected[k][1]}`);
}
const chainFeats = game.chain.map((id) => game.featureForSlot[data.puzzleById[id].photoPiece]);
for (let k = 1; k <= 6; k++) if (identifies(chainFeats.slice(0, k))) { console.log(`  following the chain from p1, Sanjay is identifiable after ${k} pieces`); break; }

done('Simulation');
