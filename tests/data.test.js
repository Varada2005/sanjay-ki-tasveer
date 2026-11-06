// Test A: the riddle-chain data is complete, consistent and logical.
'use strict';
const G = require('../server/game');
const { check, section, done, polysOverlap, inside, interiorPoint, edgeDistance } = require('./lib');

const data = G.loadData();
const { game, regions, regionsFile } = data;
const P = game.puzzles;
const pageOf = (id) => regions[id] && regions[id].page;

section('Puzzles and the chain');
check(P.length === 6, `exactly 6 puzzles (got ${P.length})`);
check(P.filter((p) => p.page === 'teen').length === 3 && P.filter((p) => p.page === 'dadi').length === 3, '3 wrappers on each page');
check(game.chain.length === 6 && new Set(game.chain).size === 6 && game.chain.every((id) => data.puzzleById[id]), 'chain lists all 6 puzzles once');
for (let i = 0; i < 6; i++) {
  const a = data.puzzleById[game.chain[i]], b = data.puzzleById[game.chain[(i + 1) % 6]];
  check(a.page !== b.page, `chain ${a.id} (${a.page}) -> ${b.id} (${b.page}) crosses the spine`);
}
const answers = new Set();
for (const p of P) {
  check(/^\d{2,4}$/.test(p.answer), `${p.id}: answer is 2 to 4 digits (${p.answer})`);
  check(!answers.has(p.answer), `${p.id}: answer ${p.answer} is unique`);
  answers.add(p.answer);
  check(typeof p.meaning === 'string' && p.meaning.length > 20, `${p.id}: the number has a narrative meaning`);
  check(regions[p.wrapperRegionId] && regions[p.wrapperRegionId].type === 'hook' && regions[p.wrapperRegionId].puzzleId === p.id, `${p.id}: wrapper region ${p.wrapperRegionId} exists and links back`);
  check(pageOf(p.wrapperRegionId) === p.page, `${p.id}: wrapper is on the ${p.page} page`);
  const src = regions[p.answerSource.regionId];
  check(src && src.type === 'clue' && src.puzzleId === p.id, `${p.id}: answer source ${p.answerSource.regionId} exists`);
  check(src && src.page === p.answerSource.page && p.answerSource.page !== p.page, `${p.id}: the answer is on the OTHER page (${p.answerSource.page}), so both players are needed`);
  check(p.needs.some((n) => n.page === 'teen') && p.needs.some((n) => n.page === 'dadi'), `${p.id}: needs items from both pages`);
  // The answer is read at the place the NEXT wrapper sits (that is what makes the number lead on).
  const nextP = data.puzzleById[game.chain[(game.chain.indexOf(p.id) + 1) % 6]];
  if (p.id !== game.chain[5]) {
    check(regions[nextP.wrapperRegionId].page === p.answerSource.page, `${p.id}: answer is found on the page of the next wrapper (${nextP.id})`);
    const a = regions[p.answerSource.regionId].polygon, w = regions[nextP.wrapperRegionId].polygon;
    const near = polysOverlap(a, w) || Math.min(...a.map((pt) => edgeDistance(pt, w))) < 0.12;
    const named = regions[nextP.wrapperRegionId].note.includes(p.answer);
    check(near || named, `${p.id}: the answer is read beside, or names, the next wrapper's place ${nextP.wrapperRegionId}`);
  }
}
check(new Set(P.map((p) => p.photoPiece)).size === 6 && P.every((p) => game.slots.includes(p.photoPiece)), 'every puzzle has its own photo piece, covering all 6');

section('Regions');
const ids = regionsFile.regions.map((r) => r.id);
check(new Set(ids).size === ids.length, 'region ids are unique');
for (const r of regionsFile.regions) {
  check(['teen', 'dadi'].includes(r.page), `${r.id}: valid page`);
  check(['hook', 'candidate', 'ambient', 'clue'].includes(r.type), `${r.id}: valid type (${r.type})`);
  check(r.polygon.length >= 3 && r.polygon.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1), `${r.id}: polygon is normalised`);
  check(typeof r.note === 'string' && r.note.length > 5, `${r.id}: has a note`);
}
check(regionsFile.regions.filter((r) => r.type === 'hook').length === 6, 'exactly 6 wrappers');
for (const p of ['teen', 'dadi']) {
  const rs = regionsFile.regions.filter((r) => r.page === p && (r.type === 'hook' || r.type === 'candidate'));
  let overlaps = 0;
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    if (polysOverlap(rs[i].polygon, rs[j].polygon)) { overlaps++; check(false, `overlap on ${p}: ${rs[i].id} x ${rs[j].id}`); }
  }
  check(overlaps === 0, `${p}: wrapper and candidate polygons do not overlap`);
}

for (const p of ['teen', 'dadi']) {
  const hooks = regionsFile.regions.filter((r) => r.page === p && r.type === 'hook');
  const amb = regionsFile.regions.filter((r) => r.page === p && r.type === 'ambient');
  for (const h of hooks) for (const m of amb) check(!polysOverlap(h.polygon, m.polygon), `${p}: sound-only area ${m.id} does not cover wrapper ${h.id}`);
}

section('Wrapper hit zones are tight and clear of everything else');
for (const r of regionsFile.regions.filter((x) => x.type === 'hook')) {
  const xs = r.polygon.map((p) => p[0]), ys = r.polygon.map((p) => p[1]);
  const [PW, PH] = regionsFile.pageSize[r.page];
  const wPct = (Math.max(...xs) - Math.min(...xs)) * 100, hPct = ((Math.max(...ys) - Math.min(...ys)) * PH / PW) * 100;
  check(Math.max(wPct, hPct) <= 8.7 && Math.min(wPct, hPct) >= 3.3, `${r.id}: hit zone is santra-goli-sized (${wPct.toFixed(1)} x ${hPct.toFixed(1)} % of the page width)`);
  check(Array.isArray(r.anchor) && inside(r.anchor, r.polygon), `${r.id}: anchor (the glowing dot) is inside its zone`);
  for (const o of regionsFile.regions.filter((x) => x.page === r.page && x.id !== r.id && (x.type === 'candidate' || x.type === 'hook'))) {
    const gap = Math.min(...r.polygon.map((pt) => edgeDistance(pt, o.polygon)));
    check(!polysOverlap(r.polygon, o.polygon) && gap >= 0.017, `${r.id} keeps at least 1.7 % of the page width from ${o.id} (gap ${(gap * 100).toFixed(1)} %)`);
  }
}

section('Candidates');
check(game.candidates.length === 6 && game.candidates.filter((c) => c.isSanjay).length === 1, 'Sanjay + A..E, one Sanjay');
for (const c of game.candidates) {
  const rs = regionsFile.regions.filter((r) => r.type === 'candidate' && r.candidateId === c.id);
  check(rs.length >= 1 && rs.every((r) => r.page === c.page), `candidate ${c.id} has a region on the ${c.page} page`);
}
const sanjayRegion = regionsFile.regions.find((r) => r.candidateId === 'sanjay');
check(polysOverlap(sanjayRegion.polygon, regions[P.find((p) => p.id === game.chain[5]).answerSource.regionId].polygon) ||
  Math.min(...sanjayRegion.polygon.map((pt) => edgeDistance(pt, regions[P.find((p) => p.id === game.chain[5]).answerSource.regionId].polygon))) < 0.12,
  'the last answer (5:30 sign) is at the santra goli stall where Sanjay stands');
for (const r of regionsFile.regions.filter((r) => r.type === 'candidate' && r.candidateId.startsWith('other_'))) check(!!game.otherOldMen[r.candidateId], `${r.id}: other old man has a line`);

section('Lines: one rhyming riddle per wrapper, success, next');
const L = G.lineTable(game);
const need = [];
for (const p of P) {
  need.push(`${p.id}.riddle`, `${p.id}.solved`);
  const rid = p.lines.hi.riddle;
  const rows = rid.split('\n');
  check(rows.length === 2, `${p.id}: riddle is one rhyming couplet (2 lines)`);
  // rhyme check: the last two letters of each couplet's lines match (Devanagari, ignoring punctuation)
  const end = (s) => s.replace(/[।,?!.\s]+$/u, '').slice(-2);
  const rhymes = (a, b) => end(a) === end(b) || end(a).slice(-1) === end(b).slice(-1);
  check(rhymes(rows[0], rows[1]), `${p.id}: the couplet rhymes (${end(rows[0])}/${end(rows[1])})`);
  for (const lang of ['mr', 'gu']) check(!!p.lines[lang], `${p.id}: ${lang} placeholder exists`);
}
for (const id of game.chain) need.push(`next.across.${id}`, `next.same.${id}`);
need.push('next.final');
for (const id of [...game.chain, 'final']) need.push(`nav.${id}`);
need.push('intro.take', 'intro.mission');
for (const p of P) need.push(`${p.id}.hint`);
for (const c of game.candidates) need.push(`cand.${c.id}`);
for (const k of Object.keys(game.otherOldMen)) need.push(`other.${k}`);
for (const id of need) check(L[id] && L[id].hi && L[id].hi.trim().length > 3 && !/TODO/.test(L[id].hi), `line ${id} exists in Hindi`);
const BANNED = /\b(matlab|matalab|yaani|yani|means|meaning)\b|मतलब|यानी|यानि|अर्थात|माने/i;
for (const [id, v] of Object.entries(L)) for (const [lang, s] of Object.entries(v)) check(!(s && BANNED.test(s)), `line ${lang}/${id} has no explanation word`);
for (const [id, v] of Object.entries(L)) check(/[ऀ-ॿ]/.test(v.hi || ''), `line ${id} is in Devanagari`);
const emitted = new Set(need);
for (const id of Object.keys(L)) check(emitted.has(id), `line ${id} is used`);

// Riddles hint, they do not tell: no answer digits, no name of the answer object; the Hint line names it plainly.
const OBJ = { p1: ['दुकान', 'बोर्ड'], p2: ['कुल्फ़ी', 'घड़ा', 'घड़े', 'मटका', 'मटके'], p3: ['टिकट', 'डिब्बा'], p4: ['चूड़ी', 'चूड़ियाँ', 'दर्जन'], p5: ['शादी', 'स्टूडियो'], p6: ['संतरा गोली', 'दुकान'] };
const DIGITS = { '0': 'शून्य', '1': 'एक', '2': 'दो', '3': 'तीन', '5': 'पाँच', '6': 'छह', '9': 'नौ' };
for (const p of P) {
  const rid = p.lines.hi.riddle;
  check(!/[0-9०-९]/.test(rid) && !/[0-9]/.test(p.lines.en.riddle), `${p.id}: riddle has no digits`);
  check(!OBJ[p.id].some((w) => rid.includes(w)), `${p.id}: riddle does not name the answer object (${OBJ[p.id].join(', ')})`);
  check(rid.split(/\s+/).length <= 22, `${p.id}: riddle is short (${rid.split(/\s+/).length} words)`);
  check(p.lines.hi.hint && p.lines.en.hint && OBJ[p.id].some((w) => p.lines.hi.hint.includes(w)), `${p.id}: the Hint names where to look`);
}
const WRAP = { p1: 'बोरी', p2: 'पप्पू', p3: 'कुल्फ़ी', p4: 'डिब्बे', p5: 'चूड़ी', p6: 'फ़ोटो' };
for (const p of P) {
  check(game.nav.hi[p.id].includes(WRAP[p.id]), `Hint for the way to ${p.id} names its place plainly (${WRAP[p.id]})`);
  const nx = game.next.hi.across[p.id];
  check(!nx.includes(WRAP[p.id]) && !/पप्पू|बोरी|कुल्फ़ी|मटका|चूड़ी|फ़ोटो वाले|स्टूडियो|डिब्बे|झूले/.test(nx), `the spoken way to ${p.id} is a riddle: it names no object`);
  check(/मैं कौन\?/.test(nx) && /What am I\?/.test(game.next.en.across[p.id]), `the way to ${p.id} asks "What am I?"`);
  check(!/[0-9०-९]/.test(nx) && nx.split(/\s+/).length <= 45, `the way to ${p.id} has no digits and is short (${nx.split(/\s+/).length} words)`);
}
check(/मैं कौन\?/.test(game.next.hi.across.final) && game.nav.hi.final.includes('लाल पगड़ी'), 'the last one asks "Who am I?"; its Hint describes Sanjay plainly');
check(!Object.values(game.next.hi.same).some((s) => s.includes('उस पार')), '"same page" next lines never say "across"');

section('Mela intro, ending and book list');
for (const lang of ['hi', 'en', 'mr', 'gu']) {
  check(typeof game.intro.take[lang] === 'string' && game.intro.take[lang].length > 5, `intro "take your phone" line (${lang})`);
  check(typeof game.intro.mission[lang] === 'string' && game.intro.mission[lang].length > 10 && game.intro.mission[lang].length < 140, `intro mission line (${lang}) is short`);
  check(game.ending && game.ending.title && game.ending.title[lang], `ending title (${lang})`);
}
check(/संजय/.test(game.intro.mission.hi) && /संतरा गोली/.test(game.intro.mission.hi), 'the mission names Sanjay and the santra goli');
check(/शाम|सूरज/.test(L['cand.sanjay'].hi) && /संतरा गोली/.test(L['cand.sanjay'].hi), 'Sanjay\'s ending line: the santra goli at sunset');
// "peppermint" is gone everywhere players can see or hear
const everything = JSON.stringify(G.lineTable(game)) + JSON.stringify(require('../public/books.json')) + require('fs').readFileSync(require('path').join(__dirname, '..', 'public', 'js', 'i18n.js'), 'utf8');
check(!/peppermint|पीपरमिंट|पेपरमिंट|પીપરમિન્ટ/i.test(everything), 'no line or interface text says peppermint (santra goli everywhere)');
const books = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'public', 'books.json'), 'utf8'));
const cur = books.books.find((b) => b.current);
check(cur.spreads.length === 5, 'the current book has 5 spreads');
check(cur.spreads.filter((s) => s.playable).length === 1, 'exactly one spread is playable');
for (const s of cur.spreads) for (const lang of ['en', 'hi', 'mr', 'gu']) check(s.title && s.title[lang] && s.title[lang].length > 2, `spread ${s.n} has a ${lang} title`);

section('Every answer at every wrapper (through the real rules)');
for (const p of P) {
  const w = regions[p.wrapperRegionId];
  const aim = interiorPoint(w.polygon);
  const hit = regionsFile.regions.filter((r) => r.page === w.page && (r.type === 'hook' || r.type === 'candidate') && inside(aim, r.polygon));
  check(hit.length === 1 && hit[0].id === w.id, `aiming inside ${w.id} finds only that wrapper`);
  for (const q of P) {
    const st = G.createState('MTRX', 0);
    const open = G.applyEvent(data, st, { type: 'hook', role: w.page, regionId: w.id }, 1).replies[0];
    check(open.type === 'puzzle' && open.puzzleId === p.id && open.lines[0] === `${p.id}.riddle` && open.codeLength === p.answer.length, `${w.id}: scanning opens ${p.id}'s riddle with ${p.answer.length} boxes`);
    const res = G.applyEvent(data, st, { type: 'code', role: w.page, regionId: w.id, code: q.answer }, 2).replies[0];
    if (q.id === p.id) {
      check(res.result === 'solved' && res.piece === p.photoPiece && st.pieces.join() === p.photoPiece, `${p.id}: ${p.answer} solves it and gives the ${p.photoPiece} piece`);
      const nextId = game.chain[(game.chain.indexOf(p.id) + 1) % 6];
      check(res.lines[0] === `${p.id}.solved` && res.next === nextId && res.lines[1] === `next.across.${nextId}`, `${p.id}: success explains the number, then sends you to ${nextId}`);
    } else {
      check(res.result === 'wrong' && res.lines.join() === `${p.id}.riddle` && st.pieces.length === 0, `${p.id}: ${q.answer} (${q.id}'s answer) is wrong and repeats ${p.id}'s riddle`);
    }
  }
  const other = w.page === 'teen' ? 'dadi' : 'teen';
  const st = G.createState('MTRX', 0);
  check(G.applyEvent(data, st, { type: 'code', role: other, regionId: w.id, code: p.answer }, 1).replies[0].type === 'ignored', `${p.id}: the other phone cannot open this wrapper`);
}

section('Wrong answers: riddle again, picture clue from the 3rd miss');
for (const p of P) {
  const st = G.createState('MISS', 0);
  const w = p.wrapperRegionId, page = p.page;
  let r;
  for (let i = 1; i <= 4; i++) {
    r = G.applyEvent(data, st, { type: 'code', role: page, regionId: w, code: p.answer === '99' ? '98' : '99' }, i).replies[0];
    check(r.lines.join() === `${p.id}.riddle`, `${p.id} miss ${i}: the same riddle repeats`);
    check(i < 3 ? r.visualClue === null : (r.visualClue && r.visualClue.regionId === p.answerSource.regionId && r.visualClue.page === p.answerSource.page), `${p.id} miss ${i}: picture clue ${i < 3 ? 'not yet' : 'shows the answer spot on the ' + p.answerSource.page + ' page'}`);
  }
  const reopen = G.applyEvent(data, st, { type: 'hook', role: page, regionId: w }, 9).replies[0];
  check(reopen.visualClue && reopen.wrong === 4, `${p.id}: scanning again keeps the picture clue`);
  check(G.applyEvent(data, st, { type: 'code', role: page, regionId: w, code: p.answer }, 10).replies[0].result === 'solved', `${p.id}: still solvable after misses`);
}

section('Photo: each torn piece shows its own feature');
const photo = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'public', 'assets', 'photo', 'photo.json'), 'utf8'));
check(Object.keys(photo.pieces).sort().join() === game.slots.slice().sort().join(), 'photo has exactly the 6 game slots');
for (const [slot, pts] of Object.entries(photo.features)) for (const pt of pts) {
  const own = inside(pt, photo.pieces[slot]);
  const margin = own ? edgeDistance(pt, photo.pieces[slot]) : 0;
  check(own && margin >= photo.tearAmplitude + 2, `${slot}: feature point ${pt} is inside its piece (${margin.toFixed(1)} px from the tear)`);
}

done('Data');
