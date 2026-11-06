// Test C: two (and three) real socket.io clients against a real server.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { io } = require('socket.io-client');
const { start } = require('../server');
const G = require('../server/game');
const { check, section, done, rng } = require('./lib');

const data = G.loadData();
const T = data.game.puzzles;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const roomsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sanjay-rooms-'));
const TIMING = { restMs: 1500 };

class Phone {
  constructor(port, clientId) { this.port = port; this.clientId = clientId; this.state = null; this.bcasts = []; this.connect(); }
  connect() {
    this.s = io(`http://localhost:${this.port}`, { transports: ['websocket'], forceNew: true, reconnection: true, reconnectionDelay: 100 });
    this.s.on('state', (st) => { this.state = st; });
    this.s.on('bcast', (b) => this.bcasts.push(b));
  }
  call(ev, payload) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), 5000); this.s.emit(ev, payload, (r) => { clearTimeout(t); res(r); }); }); }
  async join(room, role) {
    if (!this.s.connected) await new Promise((r) => this.s.once('connect', r));
    const h = await this.call('hello', { room, clientId: this.clientId });
    if (role && h.role !== role) return this.call('claim', { role, lang: 'hi' });
    return h;
  }
  act(type, regionId, extra = {}) { return this.call('act', { type, regionId, ...extra }); }
  close() { this.s.close(); }
}

async function settle(...phones) {
  // wait until all phones have seen the same seq
  for (let i = 0; i < 50; i++) {
    await wait(20);
    const seqs = phones.map((p) => p.state && p.state.seq);
    if (seqs.every((s) => s === seqs[0] && s != null)) return;
  }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  let srv = await start({ port: 0, quiet: true, roomsDir, timing: TIMING });
  let port = srv.port;
  const host = io(`http://localhost:${port}`, { transports: ['websocket'], forceNew: true });
  const hostCall = (ev, p) => new Promise((r) => host.emit(ev, p, r));
  await new Promise((r) => host.on('connect', r));

  // ---------------------------------------------------------------
  section('Full games in random order (x5)');
  for (let g = 0; g < 5; g++) {
    const r = rng(100 + g);
    const { room } = await hostCall('host:new', {});
    const teen = new Phone(port, `teen-${g}`), dadi = new Phone(port, `dadi-${g}`);
    const P = { teen, dadi };
    check((await teen.join(room, 'teen')).ok, `game ${g}: teen joins ${room}`);
    check((await dadi.join(room, 'dadi')).ok, `game ${g}: dadi joins ${room}`);
    const order = T.map((t) => t.id).sort(() => r() - 0.5);
    for (const id of order) {
      const t = data.puzzleById[id];
      const op = await P[t.page].act('hook', t.wrapperRegionId);
      check(op.replies[0].type === 'puzzle' && op.replies[0].lines[0] === `${id}.riddle`, `game ${g} ${id}: scanning the wrapper opens its riddle`);
      const w = await P[t.page].act('code', t.wrapperRegionId, { code: t.answer === '99' ? '98' : '99' });
      check(w.replies[0].result === 'wrong' && w.replies[0].lines[0] === `${id}.riddle`, `game ${g} ${id}: wrong answer repeats the riddle`);
      const ok = await P[t.page].act('code', t.wrapperRegionId, { code: t.answer });
      check(ok.replies[0].result === 'solved', `game ${g} ${id}: solved with ${t.answer}`);
      // wrong page: a phone cannot act on the other page's wrappers
      const other = t.page === 'teen' ? dadi : teen;
      const bad = await other.act('code', t.wrapperRegionId, { code: t.answer });
      check(bad.replies[0].type === 'ignored', `game ${g} ${id}: the other phone cannot use this wrapper`);
    }
    await settle(teen, dadi);
    check(teen.state.pieces.length === 6, `game ${g}: 6 pieces`);
    const guess = await dadi.act('guess', 'cand_sanjay');
    await settle(teen, dadi);
    check(!!teen.state.won && !!dadi.state.won, `game ${g}: won on both phones`);
    check(teen.bcasts.some((b) => b.type === 'celebrate') && dadi.bcasts.some((b) => b.type === 'celebrate'), `game ${g}: celebration on both phones`);
    check(teen.bcasts.filter((b) => b.type === 'piece').length === 6 && dadi.bcasts.filter((b) => b.type === 'piece').length === 6, `game ${g}: both phones received 6 piece events`);
    check(same(teen.state, dadi.state), `game ${g}: identical final state`);
    teen.close(); dadi.close();
  }

  // ---------------------------------------------------------------
  section('Disconnect / reconnect mid-puzzle, simultaneous codes, duplicate solve');
  {
    const { room } = await hostCall('host:new', {});
    let teen = new Phone(port, 'teen-rc'), dadi = new Phone(port, 'dadi-rc');
    await teen.join(room, 'teen'); await dadi.join(room, 'dadi');
    const t1 = data.puzzleById.p3; // kulfi (dadi) gives the eyes piece
    await dadi.act('hook', t1.wrapperRegionId);
    // teen phone locks / drops in the middle of thread 1
    teen.close();
    await wait(150);
    await settle(dadi);
    check(dadi.state.players.teen.connected === false, 'dadi sees teen go offline');
    check((await dadi.act('code', t1.wrapperRegionId, { code: t1.answer })).replies[0].result === 'solved', 'dadi solves while teen is offline');
    teen = new Phone(port, 'teen-rc');            // same phone (same clientId) comes back
    const h = await teen.join(room);
    check(h.role === 'teen', 'teen is given its role back automatically');
    check(h.state.pieces.includes('eyes'), 'teen receives the full state on rejoin');
    await settle(teen, dadi);
    check(dadi.state.players.teen.connected === true, 'dadi sees teen back online');
    // socket.io's own transport reconnect
    teen.s.io.engine.close();
    await wait(400);
    await teen.join(room);
    await settle(teen, dadi);
    check(teen.state.players.teen.connected, 'transport drop recovers');

    // both phones enter codes at the same moment
    const t2 = data.puzzleById.p2, t4 = data.puzzleById.p1;
    const [a, b] = await Promise.all([teen.act('code', t2.wrapperRegionId, { code: t2.answer }), dadi.act('code', t4.wrapperRegionId, { code: t4.answer })]);
    check(a.replies[0].result === 'solved' && b.replies[0].result === 'solved', 'simultaneous codes on both phones both solve');
    // the same correct code twice at once (double tap)
    const t3 = data.puzzleById.p4;
    const [c, d] = await Promise.all([teen.act('code', t3.wrapperRegionId, { code: t3.answer }), teen.act('code', t3.wrapperRegionId, { code: t3.answer })]);
    const results = [c.replies[0].result, d.replies[0].result].sort();
    check(same(results, ['already', 'solved']), `duplicate solve: one solved, one already (${results})`);
    await settle(teen, dadi);
    check(teen.state.pieces.length === 4 && new Set(teen.state.pieces).size === 4, 'no duplicate piece');
    check(same(teen.state, dadi.state), 'identical state after concurrency');

    // ---------------------------------------------------------------
    section('Taken role, third device, wrong guesses continue');
    const third = new Phone(port, 'third');
    await third.join(room);
    const cl = await third.call('claim', { role: 'teen' });
    check(cl.ok === false && cl.error === 'taken', 'a taken role is refused');
    check(cl.spectator === true, 'full room: third device is told to spectate');
    check((await third.call('claim', { role: 'spectator' })).ok, 'third device becomes a spectator');
    const sp = await third.act('code', t1.wrapperRegionId, { code: t1.answer });
    check(sp.ok === false, 'spectator cannot act');
    // wrong guesses from either phone: the man answers, nobody is paused
    const w1 = await dadi.act('guess', 'cand_A');
    const w2 = await teen.act('guess', 'cand_B');
    await settle(teen, dadi, third);
    check(w1.replies[0].type === 'guess' && !w1.replies[0].correct && w2.replies[0].type === 'guess' && !w2.replies[0].correct, 'wrong guesses get the man\'s answer, from either phone');
    check(!teen.state.resting && !dadi.state.resting && !teen.bcasts.some((x) => x.type === 'rest'), 'no rest after wrong guesses');
    check(same(teen.state, dadi.state) && same(dadi.state, third.state), 'teen, dadi and spectator hold identical state');

    // ---------------------------------------------------------------
    section('Server restart resumes from snapshot');
    const before = JSON.stringify(dadi.state.pieces);
    teen.close(); dadi.close(); third.close(); host.close();
    await srv.close();
    srv = await start({ port, quiet: true, roomsDir, timing: TIMING });
    teen = new Phone(port, 'teen-rc'); dadi = new Phone(port, 'dadi-rc');
    const h2 = await teen.join(room); await dadi.join(room);
    await settle(teen, dadi);
    check(h2.role === 'teen', 'after restart the teen phone keeps its role');
    check(JSON.stringify(teen.state.pieces) === before, 'after restart the pieces are still there');
    // finish the remaining threads and win
    for (const t of T) if (!teen.state.solved.includes(t.id)) await (t.page === 'teen' ? teen : dadi).act('code', t.wrapperRegionId, { code: t.answer });
    await dadi.act('guess', 'cand_sanjay');
    await settle(teen, dadi);
    check(teen.state.pieces.length === 6 && teen.state.won, 'game completes after restart');
    check(same(teen.state, dadi.state), 'identical final state after restart');
    // reset
    await new Promise((r) => dadi.s.emit('reset', {}, r));
    await settle(teen, dadi);
    check(teen.state.pieces.length === 0 && teen.state.players.teen.taken, 'reset clears progress, keeps roles');
    teen.close(); dadi.close();
  }
  await srv.close();
  fs.rmSync(roomsDir, { recursive: true, force: true });
  done('Integration');
  process.exit(process.exitCode || 0);
})().catch((e) => { console.error(e); process.exit(1); });
