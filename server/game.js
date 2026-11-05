// Authoritative game rules for "Sanjay ki Tasveer" (riddle-chain version).
// Pure functions only (no sockets, no timers), so the same code runs in the
// server, the simulation tests and the integration tests.
//
// Flow: a phone scans a peppermint wrapper on its own page -> the server opens that
// wrapper's puzzle (a rhyming riddle + a number pad on that phone). The answer is a
// number printed on the OTHER page, at the place Sanjay went next. Right: a photo
// piece for both phones and "go to the next place". Wrong: the riddle again; from the
// 3rd wrong answer on, also a picture of where to look.
'use strict';
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ROLES = ['teen', 'dadi'];
const ROLE_TAKEOVER_MS = 30000; // a role whose phone has been gone this long can be claimed by another phone

function loadJSON(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
}

// Game + regions bundle with lookup tables.
function loadData() {
  const game = loadJSON('game.json');
  const regionsFile = loadJSON('regions.json');
  const regions = {};
  for (const r of regionsFile.regions) regions[r.id] = r;
  const puzzleById = {};
  for (const p of game.puzzles) puzzleById[p.id] = p;
  const puzzleByWrapper = {};
  for (const p of game.puzzles) puzzleByWrapper[p.wrapperRegionId] = p;
  const candidateById = {};
  for (const c of game.candidates) candidateById[c.id] = c;
  return { game, regionsFile, regions, puzzleById, puzzleByWrapper, candidateById };
}

function createState(code, now = Date.now()) {
  return {
    code,
    createdAt: now,
    updatedAt: now,
    seq: 0,
    players: {
      teen: { clientId: null, connected: false, lang: 'hi', lastSeen: 0 },
      dadi: { clientId: null, connected: false, lang: 'hi', lastSeen: 0 }
    },
    seen: {},           // puzzleId -> first time its wrapper was scanned
    solved: {},         // puzzleId -> { at, by }
    pieces: [],         // photo slots, in the order they were won
    attempts: {},       // puzzleId -> { wrong }
    wrongGuesses: 0,    // resets after a rest
    guesses: [],        // every final guess, for the host
    restUntil: null,
    won: null,
    lastNext: null,
    log: []
  };
}

// Reset progress but keep who is holding which phone.
function resetProgress(state, now = Date.now()) {
  const fresh = createState(state.code, now);
  fresh.players = state.players;
  fresh.log = [...state.log, { t: now, type: 'reset' }];
  fresh.seq = state.seq + 1;
  return fresh;
}

function isResting(state, now) {
  return state.restUntil != null && now < state.restUntil;
}

// What phones are allowed to see: no answers, no client ids, no log.
function publicState(state, now = Date.now()) {
  const players = {};
  for (const r of ROLES) {
    const p = state.players[r];
    // freeInMs: 0 = anyone may take this role now; otherwise how long until an offline phone's role opens up.
    const freeInMs = !p.clientId ? 0 : p.connected ? null : Math.max(0, p.lastSeen + ROLE_TAKEOVER_MS - now);
    players[r] = { taken: !!p.clientId, connected: p.connected, lang: p.lang, freeInMs };
  }
  return {
    code: state.code,
    seq: state.seq,
    players,
    seen: Object.keys(state.seen || {}),
    solved: Object.keys(state.solved),
    pieces: state.pieces.slice(),
    wrongGuesses: state.wrongGuesses,
    resting: isResting(state, now),
    restRemainingMs: isResting(state, now) ? state.restUntil - now : 0,
    won: state.won ? { at: state.won.at, by: state.won.by } : null
  };
}

// Host sees everything except client ids.
function hostState(state, now = Date.now()) {
  return {
    ...publicState(state, now),
    attempts: state.attempts,
    solvedDetail: state.solved,
    seenDetail: state.seen || {},
    guesses: state.guesses,
    lastNext: state.lastNext,
    createdAt: state.createdAt,
    log: state.log
  };
}

// Where to go after puzzle `fromId`: the next UNSOLVED puzzle along the chain
// (wrapping round), or 'final' once all six are solved. The chain alternates
// pages, so following it always hands the next wrapper to the other phone.
function nextTarget(data, state, fromId) {
  const chain = data.game.chain;
  const i = chain.indexOf(fromId);
  for (let k = 1; k <= chain.length; k++) {
    const id = chain[(i + k) % chain.length];
    if (!state.solved[id]) return id;
  }
  return 'final';
}
function nextLineId(data, fromId, target) {
  if (target === 'final') return 'next.final';
  const from = data.puzzleById[fromId], to = data.puzzleById[target];
  return `next.${from.page === to.page ? 'same' : 'across'}.${target}`;
}

function regionRole(data, regionId) {
  const r = data.regions[regionId];
  if (!r) return null;
  if (r.type === 'hook' && data.puzzleByWrapper[regionId]) return { kind: 'wrapper', puzzle: data.puzzleByWrapper[regionId], region: r };
  if (r.type === 'candidate') return { kind: 'candidate', region: r };
  if (r.type === 'ambient') return { kind: 'ambient', region: r };
  return { kind: 'none', region: r };
}

/**
 * Apply one phone event. Returns { state, replies, broadcast }.
 *  replies:   messages for the acting phone only
 *  broadcast: messages for every device in the room (both phones, spectators, host)
 * The state object is mutated in place and also returned.
 */
function applyEvent(data, state, ev, now = Date.now()) {
  const replies = [];
  const broadcast = [];
  const { role, regionId } = ev;
  if (!state.seen) state.seen = {};
  const out = () => {
    state.updatedAt = now;
    state.seq += 1;
    return { state, replies, broadcast };
  };
  const log = (entry) => state.log.push({ t: now, role, page: role, ...(ev.via ? { via: ev.via } : {}), ...entry });

  // A rest ends by itself once its time has passed.
  if (state.restUntil != null && now >= state.restUntil) {
    state.restUntil = null;
    state.wrongGuesses = 0;
    log({ type: 'rest_end' });
  }
  if (ev.type === 'tick') return out();

  if (!ROLES.includes(role)) {
    replies.push({ type: 'ignored', reason: 'no_role' });
    return out();
  }
  const rr = regionRole(data, regionId);
  if (!rr || rr.region.page !== role) {
    // A phone may only act on things printed on its own page.
    replies.push({ type: 'ignored', reason: 'bad_region', regionId });
    return out();
  }
  const resting = isResting(state, now);
  const visualClue = (p) => (((state.attempts[p.id] || {}).wrong || 0) >= data.game.timing.wrongBeforeVisualClue
    ? { page: p.answerSource.page, regionId: p.answerSource.regionId } : null);
  const puzzleReply = (type, p, extra = {}) => ({
    type, regionId: p.wrapperRegionId, puzzleId: p.id, codeLength: p.answer.length,
    solved: !!state.solved[p.id], wrong: (state.attempts[p.id] || {}).wrong || 0, visualClue: visualClue(p), ...extra
  });

  switch (ev.type) {
    case 'hook': {
      if (rr.kind !== 'wrapper') break;
      if (resting) { replies.push({ type: 'resting' }); break; }
      const p = rr.puzzle;
      const first = !state.seen[p.id];
      if (first) state.seen[p.id] = now;
      log({ type: 'puzzle_open', puzzleId: p.id, regionId, first });
      if (state.solved[p.id]) {
        const target = nextTarget(data, state, p.id);
        replies.push(puzzleReply('puzzle', p, { lines: [`${p.id}.solved`, nextLineId(data, p.id, target)], next: target }));
      } else {
        replies.push(puzzleReply('puzzle', p, { lines: [`${p.id}.riddle`] }));
      }
      break;
    }
    case 'ambient': {
      if (rr.kind !== 'ambient') break;
      log({ type: 'ambient', regionId });
      replies.push({ type: 'ambient', regionId, sound: rr.region.ambient });
      break;
    }
    case 'code': {
      if (rr.kind !== 'wrapper') break;
      if (resting) { replies.push({ type: 'resting' }); break; }
      const p = rr.puzzle;
      const code = String(ev.code || '');
      if (!/^\d{1,6}$/.test(code)) { replies.push({ type: 'ignored', reason: 'bad_code' }); break; }
      if (state.solved[p.id]) {
        const target = nextTarget(data, state, p.id);
        log({ type: 'code_duplicate', puzzleId: p.id, code });
        replies.push(puzzleReply('result', p, { result: 'already', lines: [`${p.id}.solved`, nextLineId(data, p.id, target)], next: target }));
        break;
      }
      const a = (state.attempts[p.id] = state.attempts[p.id] || { wrong: 0 });
      if (code === p.answer) {
        state.solved[p.id] = { at: now, by: role };
        state.pieces.push(p.photoPiece);
        const target = nextTarget(data, state, p.id);
        state.lastNext = target;
        log({ type: 'solved', puzzleId: p.id, code, piece: p.photoPiece, next: target });
        replies.push(puzzleReply('result', p, { result: 'solved', piece: p.photoPiece, lines: [`${p.id}.solved`, nextLineId(data, p.id, target)], next: target }));
        broadcast.push({ type: 'piece', piece: p.photoPiece, puzzleId: p.id, by: role });
      } else {
        a.wrong += 1;
        log({ type: 'code_wrong', puzzleId: p.id, code, wrong: a.wrong });
        // Wrong: the same riddle again; from the 3rd miss on, a picture of where to look.
        replies.push(puzzleReply('result', p, { result: 'wrong', lines: [`${p.id}.riddle`] }));
      }
      break;
    }
    case 'guess': {
      if (rr.kind !== 'candidate') break;
      const cid = rr.region.candidateId;
      if (state.won) {
        replies.push({ type: 'guess', candidateId: cid, correct: cid === 'sanjay', lines: [cid === 'sanjay' ? 'cand.sanjay' : lineForCandidate(cid)], afterWin: true });
        break;
      }
      if (resting) { replies.push({ type: 'resting' }); break; }
      const cand = data.candidateById[cid];
      const correct = !!(cand && cand.isSanjay);
      state.guesses.push({ at: now, by: role, candidateId: cid, correct, pieces: state.pieces.length });
      if (correct) {
        state.won = { at: now, by: role, pieces: state.pieces.length };
        log({ type: 'guess_right', candidateId: cid, regionId, pieces: state.pieces.length });
        broadcast.push({ type: 'celebrate', by: role, lines: ['cand.sanjay'] });
      } else {
        state.wrongGuesses += 1;
        log({ type: 'guess_wrong', candidateId: cid, regionId, wrongGuesses: state.wrongGuesses });
        replies.push({ type: 'guess', candidateId: cid, correct: false, lines: [lineForCandidate(cid)] });
        if (state.wrongGuesses >= data.game.timing.maxWrongGuesses) {
          state.restUntil = now + data.game.timing.restMs;
          log({ type: 'rest_start', until: state.restUntil });
          broadcast.push({ type: 'rest', ms: data.game.timing.restMs });
        }
      }
      break;
    }
    default:
      replies.push({ type: 'ignored', reason: 'unknown_event' });
  }
  if (!replies.length && !broadcast.length) replies.push({ type: 'ignored', reason: 'wrong_event_for_region', regionId });
  return out();
}

function lineForCandidate(cid) {
  return cid.startsWith('other_') ? `other.${cid}` : `cand.${cid}`;
}

// Flatten every spoken line into { lineId: { hi, mr, gu } } for the phones and tests.
function lineTable(game) {
  const out = {};
  const put = (id, lang, text) => { (out[id] = out[id] || {})[lang] = text; };
  for (const lang of game.languages) {
    for (const p of game.puzzles) for (const [k, v] of Object.entries(p.lines[lang] || {})) put(`${p.id}.${k}`, lang, v);
    const nx = (game.next || {})[lang] || {};
    for (const kind of ['across', 'same']) for (const [k, v] of Object.entries(nx[kind] || {})) {
      if (k === 'final') put('next.final', lang, v); else put(`next.${kind}.${k}`, lang, v);
    }
    // The poem + "take your phone" shown before the scanner starts (spoken, so the voice paces the reading).
    if (game.intro) {
      if (game.intro.poem && game.intro.poem[lang]) put('intro.poem', lang, game.intro.poem[lang].join('\n'));
      if (game.intro.take && game.intro.take[lang]) put('intro.take', lang, game.intro.take[lang]);
    }
    for (const c of game.candidates) put(`cand.${c.id}`, lang, ((c.lines || {})[lang] || {}).voice);
    for (const [id, o] of Object.entries(game.otherOldMen || {})) put(`other.${id}`, lang, ((o.lines || {})[lang] || {}).voice);
  }
  return out;
}

// What the phone needs to run: regions, timing, slots, puzzles and lines. Never the answers.
function clientData(data) {
  const g = data.game;
  return {
    title: g.title,
    languages: g.languages,
    timing: g.timing,
    slots: g.slots,
    regions: data.regionsFile.regions,
    pageSize: data.regionsFile.pageSize,
    puzzles: g.puzzles.map((p) => ({ id: p.id, page: p.page, wrapperRegionId: p.wrapperRegionId, codeLength: p.answer.length, answerSource: { page: p.answerSource.page, regionId: p.answerSource.regionId } })),
    lines: lineTable(g)
  };
}

// For the presenter's host screen (it is allowed to know the answers).
function hostMeta(data) {
  return {
    chain: data.game.chain,
    puzzles: data.game.puzzles.map((p) => ({ id: p.id, page: p.page, place: p.place, answer: p.answer, meaning: p.meaning, piece: p.photoPiece, source: p.answerSource.object }))
  };
}

module.exports = { ROLES, ROLE_TAKEOVER_MS, loadData, createState, resetProgress, applyEvent, publicState, hostState, isResting, nextTarget, regionRole, lineTable, clientData, hostMeta };
