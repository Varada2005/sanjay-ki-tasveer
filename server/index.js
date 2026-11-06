// Sanjay ki Tasveer: game server.
// Serves the static app and owns the authoritative state of every room.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');
const express = require('express');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const G = require('./game');

const ROOT = path.join(__dirname, '..');
const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L
const SNAPSHOT_MS = 3000;
const ROOM_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  }
  return out;
}

async function loadOrMakeCert(certDir) {
  const keyPath = path.join(certDir, 'key.pem');
  const certPath = path.join(certDir, 'cert.pem');
  const ipsPath = path.join(certDir, 'generated-for.json');
  const ips = JSON.stringify(lanAddresses().sort());
  // mkcert users: drop your own key.pem / cert.pem here (without generated-for.json) and they are used as-is.
  // A certificate we generated ourselves is remade when the laptop's LAN address changes (new hotspot).
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    const ours = fs.existsSync(ipsPath);
    if (!ours || fs.readFileSync(ipsPath, 'utf8') === ips) return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
  }
  const selfsigned = require('selfsigned');
  const altNames = [{ type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }, ...lanAddresses().map((ip) => ({ type: 7, ip }))];
  const pems = await selfsigned.generate([{ name: 'commonName', value: 'sanjay-ki-tasveer.local' }], {
    days: 825, keySize: 2048, algorithm: 'sha256',
    extensions: [{ name: 'basicConstraints', cA: false }, { name: 'keyUsage', digitalSignature: true, keyEncipherment: true }, { name: 'extKeyUsage', serverAuth: true }, { name: 'subjectAltName', altNames }]
  });
  fs.mkdirSync(certDir, { recursive: true });
  fs.writeFileSync(keyPath, pems.private);
  fs.writeFileSync(certPath, pems.cert);
  fs.writeFileSync(ipsPath, ips);
  return { key: pems.private, cert: pems.cert };
}

async function start(opts = {}) {
  const port = opts.port != null ? opts.port : Number(process.env.PORT || 3000);
  const useHttps = !!opts.https;
  const roomsDir = opts.roomsDir || process.env.ROOMS_DIR || path.join(ROOT, 'data', 'rooms');
  const quiet = !!opts.quiet;
  const say = (...a) => { if (!quiet) console.log(...a); };
  let data = G.loadData();
  if (opts.timing) Object.assign(data.game.timing, opts.timing); // tests shorten the rest
  const config = { publicUrl: opts.publicUrl || process.env.PUBLIC_URL || null };

  // ---------------- rooms + persistence ----------------
  const rooms = new Map(); // code -> state
  const diag = new Map();  // 'CODE:role' -> latest phone status (memory only)
  const dirty = new Set();
  fs.mkdirSync(roomsDir, { recursive: true });
  for (const f of fs.readdirSync(roomsDir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const st = JSON.parse(fs.readFileSync(path.join(roomsDir, f), 'utf8'));
      if (Date.now() - st.updatedAt > ROOM_MAX_AGE_MS) continue;
      for (const r of G.ROLES) st.players[r].connected = false;
      rooms.set(st.code, st);
    } catch (e) { say('could not read snapshot', f, e.message); }
  }
  if (rooms.size) say(`resumed ${rooms.size} room(s) from ${roomsDir}`);

  const saveNow = () => {
    for (const code of dirty) {
      const st = rooms.get(code);
      try {
        if (st) fs.writeFileSync(path.join(roomsDir, `${code}.json`), JSON.stringify(st));
        else fs.rmSync(path.join(roomsDir, `${code}.json`), { force: true });
      } catch (e) { say('snapshot failed', code, e.message); }
    }
    dirty.clear();
  };
  const snapTimer = setInterval(saveNow, SNAPSHOT_MS);

  const newCode = () => {
    let c;
    do c = Array.from({ length: 4 }, () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join('');
    while (rooms.has(c));
    return c;
  };
  const getRoom = (code, create) => {
    code = String(code || '').toUpperCase().trim();
    if (!/^[A-Z0-9]{4}$/.test(code)) return null;
    let st = rooms.get(code);
    if (!st && create) { st = G.createState(code); rooms.set(code, st); dirty.add(code); }
    return st || null;
  };

  // ---------------- http ----------------
  const app = express();
  app.disable('x-powered-by');
  // Contributions carry a photo or a voice clip, so that one route accepts more.
  const jsonSmall = express.json({ limit: '1mb' }), jsonBig = express.json({ limit: '15mb' });
  app.use((req, res, next) => (req.path === '/api/contrib' ? jsonBig : jsonSmall)(req, res, next));
  const noStore = (res) => res.set('Cache-Control', 'no-store');
  app.get('/', (req, res) => res.redirect('/host'));
    app.get('/favicon.ico', (req, res) => res.type('image/png').sendFile(path.join(ROOT, 'public', 'favicon.png')));
  app.get('/host', (req, res) => res.sendFile(path.join(ROOT, 'public', 'host.html')));
  app.get('/play', (req, res) => res.sendFile(path.join(ROOT, 'public', 'play.html')));
  app.get('/app', (req, res) => res.sendFile(path.join(ROOT, 'public', 'play.html')));
  app.get('/manifest.webmanifest', (req, res) => res.type('application/manifest+json').sendFile(path.join(ROOT, 'public', 'manifest.webmanifest')));
  app.get('/editor', (req, res) => res.redirect('/tools/editor.html'));
  app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));
  app.use('/assets/pages', express.static(path.join(ROOT, 'assets', 'pages')));
  app.use('/targets', express.static(path.join(ROOT, 'assets', 'targets')));
  app.use('/audio', express.static(path.join(ROOT, 'audio')));
  app.use('/tools', express.static(path.join(ROOT, 'tools')));
  app.get('/data/regions.json', (req, res) => { noStore(res); res.sendFile(path.join(ROOT, 'data', 'regions.json')); });

  app.get('/api/client-data', (req, res) => { noStore(res); res.json(G.clientData(data)); });
  app.get('/api/editor-meta', (req, res) => {
    noStore(res);
    res.json({
      puzzles: data.game.puzzles.map((p) => p.id),
      candidates: [...data.game.candidates.map((c) => c.id), ...Object.keys(data.game.otherOldMen || {})],
      ambients: ['gola', 'bells', 'wheel', 'kulfi', 'potter', 'bangles', 'pangat', 'chai', 'marbles', 'jar', 'whistle', 'flute', 'crow', 'camera', 'water', 'cowries']
    });
  });
  app.get('/api/host-meta', (req, res) => { noStore(res); res.json(G.hostMeta(data)); });
  app.get('/api/config', (req, res) => { noStore(res); res.json({ publicUrl: config.publicUrl, lan: lanAddresses(), port, https: useHttps }); });
  app.get('/api/qr.svg', async (req, res) => {
    try {
      const svg = await QRCode.toString(String(req.query.text || '').slice(0, 500), { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
      res.type('image/svg+xml').send(svg);
    } catch (e) { res.status(400).send(e.message); }
  });
  // Which recorded lines exist, so phones don't request missing mp3s one by one.
  app.get('/api/audio-manifest', (req, res) => {
    noStore(res);
    const out = {};
    for (const lang of data.game.languages) {
      const dir = path.join(ROOT, 'audio', lang);
      out[lang] = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)) : [];
    }
    const amb = path.join(ROOT, 'audio', 'ambient');
    out.ambient = fs.existsSync(amb) ? fs.readdirSync(amb).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)) : [];
    res.json(out);
  });
  app.get('/api/rooms/:code/export', (req, res) => {
    const st = getRoom(req.params.code, false);
    if (!st) return res.status(404).json({ error: 'no such room' });
    res.set('Content-Disposition', `attachment; filename="room-${st.code}-${new Date().toISOString().replace(/[:.]/g, '-')}.json"`);
    res.json(G.hostState(st));
  });
  // ---------------- Contribute: voices, photos of old objects, regional words ----------------
  // A shared reference library for players, designers and illustrators. Stored on the server's disk.
  const contribDir = opts.contribDir || process.env.CONTRIB_DIR || path.join(ROOT, 'data', 'contrib');
  const contribFiles = path.join(contribDir, 'files');
  fs.mkdirSync(contribFiles, { recursive: true });
  const contribIndex = path.join(contribDir, 'index.json');
  const readContrib = () => { try { return JSON.parse(fs.readFileSync(contribIndex, 'utf8')); } catch (e) { return []; } };
  const clip = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);
  app.post('/api/contrib', (req, res) => {
    const b = req.body || {};
    const kind = ['voice', 'photo', 'word'].includes(b.kind) ? b.kind : null;
    if (!kind) return res.status(400).json({ error: 'kind must be voice, photo or word' });
    const item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind, at: Date.now(),
      name: clip(b.name, 60), place: clip(b.place, 60), lang: clip(b.lang, 10), title: clip(b.title, 120), note: clip(b.note, 600),
      word: clip(b.word, 80), meaning: clip(b.meaning, 300) };
    if (kind === 'word' && !item.word) return res.status(400).json({ error: 'word missing' });
    if (kind !== 'word') {
      const m = /^data:(audio\/[a-z0-9.+-]+|image\/(?:jpeg|png|webp))(?:;[^,]*)?;base64,(.+)$/i.exec(String(b.data || ''));
      if (!m) return res.status(400).json({ error: 'file missing' });
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[m[1]] || (/mp4|aac|m4a/.test(m[1]) ? 'm4a' : /ogg/.test(m[1]) ? 'ogg' : 'webm');
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 12 * 1024 * 1024) return res.status(413).json({ error: 'file too large' });
      item.file = `${item.id}.${ext}`;
      item.mime = m[1];
      fs.writeFileSync(path.join(contribFiles, item.file), buf);
    }
    const all = readContrib();
    all.push(item);
    fs.writeFileSync(contribIndex, JSON.stringify(all, null, 1));
    res.json({ ok: true, item });
  });
  app.get('/api/contrib', (req, res) => { noStore(res); res.json(readContrib().slice().reverse()); });
  app.use('/contrib-files', express.static(contribFiles));
  app.get('/contrib', (req, res) => res.sendFile(path.join(ROOT, 'public', 'contrib.html')));

  app.get('/healthz', (req, res) => res.json({ ok: true, rooms: rooms.size }));

  let server;
  if (useHttps) server = https.createServer(await loadOrMakeCert(path.join(ROOT, 'certs')), app);
  else server = http.createServer(app);

  // ---------------- sockets ----------------
  const io = new Server(server, { pingInterval: 10000, pingTimeout: 8000, connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 } });

  const sendState = (st) => {
    const now = Date.now();
    io.to(`room:${st.code}`).emit('state', G.publicState(st, now));
    io.to(`host:${st.code}`).emit('host:state', G.hostState(st, now));
    dirty.add(st.code);
  };
  const roster = (st) => G.publicState(st).players;

  io.on('connection', (socket) => {
    socket.data = { room: null, role: null, clientId: null, host: false };

    // Phone: arrive in a room (no role yet, or reclaim a role this phone already holds).
    socket.on('hello', ({ room, clientId } = {}, ack = () => {}) => {
      const st = getRoom(room, true);
      if (!st) return ack({ ok: false, error: 'bad_room' });
      socket.data.room = st.code;
      socket.data.clientId = String(clientId || '').slice(0, 64) || socket.id;
      socket.join(`room:${st.code}`);
      let role = null;
      for (const r of G.ROLES) if (st.players[r].clientId === socket.data.clientId) role = r;
      if (role) bindRole(st, role);
      ack({ ok: true, room: st.code, role, players: roster(st), state: G.publicState(st) });
      sendState(st);
    });

    const bindRole = (st, role) => {
      socket.data.role = role;
      const p = st.players[role];
      const wasConnected = p.connected;
      p.clientId = socket.data.clientId;
      p.connected = true;
      p.lastSeen = Date.now();
      if (!wasConnected) st.log.push({ t: Date.now(), role, type: 'connect' });
    };

    // Phones only join a game the dashboard opened (so a typo cannot split the two phones).
    socket.on('room:check', ({ room } = {}, ack = () => {}) => {
      const code = String(room || '').toUpperCase().trim();
      ack({ exists: /^[A-Z0-9]{4}$/.test(code) && rooms.has(code) });
    });

    // Live status from a phone for the dashboard: camera/tap, page found, errors. Not stored.
    socket.on('diag', (d = {}) => {
      const st = getRoom(socket.data.room, false);
      const role = socket.data.role;
      if (!st || !G.ROLES.includes(role) || st.players[role].clientId !== socket.data.clientId) return;
      diag.set(st.code + ':' + role, { at: Date.now(), mode: String(d.mode || '').slice(0, 10), found: !!d.found, error: String(d.error || '').slice(0, 120), cam: Number(d.cam) || 0, device: String(d.device || '').slice(0, 60) });
      io.to(`host:${st.code}`).emit('host:diag', { role, ...diag.get(st.code + ':' + role) });
    });

    socket.on('claim', ({ role, lang } = {}, ack = () => {}) => {
      const st = getRoom(socket.data.room, false);
      if (!st) return ack({ ok: false, error: 'no_room' });
      if (role === 'spectator') { socket.data.role = 'spectator'; return ack({ ok: true, role: 'spectator', state: G.publicState(st) }); }
      if (!G.ROLES.includes(role)) return ack({ ok: false, error: 'bad_role' });
      const p = st.players[role];
      const now = Date.now();
      const free = !p.clientId || p.clientId === socket.data.clientId || (!p.connected && now - p.lastSeen > G.ROLE_TAKEOVER_MS);
      if (!free) {
        const other = G.ROLES.find((r) => r !== role);
        const otherFree = !st.players[other].clientId || st.players[other].clientId === socket.data.clientId;
        return ack({ ok: false, error: 'taken', spectator: !otherFree, players: roster(st) });
      }
      // A phone holds at most one role.
      for (const r of G.ROLES) if (r !== role && st.players[r].clientId === socket.data.clientId) st.players[r] = { clientId: null, connected: false, lang: 'hi', lastSeen: 0 };
      if (p.clientId && p.clientId !== socket.data.clientId) st.log.push({ t: now, role, type: 'role_takeover' });
      bindRole(st, role);
      if (lang && data.game.languages.includes(lang)) p.lang = lang;
      st.log.push({ t: now, role, type: 'claim' });
      ack({ ok: true, role, state: G.publicState(st) });
      sendState(st);
    });

    socket.on('lang', ({ lang } = {}) => {
      const st = getRoom(socket.data.room, false);
      if (!st || !G.ROLES.includes(socket.data.role) || !data.game.languages.includes(lang)) return;
      st.players[socket.data.role].lang = lang;
      st.log.push({ t: Date.now(), role: socket.data.role, type: 'lang', lang });
      sendState(st);
    });

    // Every gameplay action goes through the same reducer.
    socket.on('act', (ev = {}, ack = () => {}) => {
      const st = getRoom(socket.data.room, false);
      const role = socket.data.role;
      if (!st || !G.ROLES.includes(role)) return ack({ ok: false, replies: [{ type: 'ignored', reason: 'not_player' }] });
      if (st.players[role].clientId !== socket.data.clientId) return ack({ ok: false, replies: [{ type: 'ignored', reason: 'role_lost' }] });
      const type = String(ev.type || '');
      if (!['hook', 'code', 'guess', 'ambient', 'hint'].includes(type)) return ack({ ok: false, replies: [{ type: 'ignored', reason: 'bad_type' }] });
      const { replies, broadcast } = G.applyEvent(data, st, { type, role, regionId: String(ev.regionId || ''), code: ev.code, via: ev.via, puzzleId: String(ev.puzzleId || '') }, Date.now());
      for (const b of broadcast) io.to(`room:${st.code}`).emit('bcast', b);
      for (const b of broadcast) io.to(`host:${st.code}`).emit('bcast', b);
      ack({ ok: true, replies });
      sendState(st);
    });

    socket.on('reset', (_, ack = () => {}) => {
      const code = socket.data.room;
      const st = getRoom(code, false);
      if (!st) return ack({ ok: false });
      const fresh = G.resetProgress(st);
      rooms.set(code, fresh);
      io.to(`room:${code}`).emit('bcast', { type: 'reset' });
      sendState(fresh);
      ack({ ok: true });
    });

    // ----- host screen -----
    socket.on('host:new', (_, ack = () => {}) => {
      const st = getRoom(newCode(), true);
      ack({ ok: true, room: st.code });
    });
    socket.on('host:watch', ({ room } = {}, ack = () => {}) => {
      const st = getRoom(room, true);
      if (!st) return ack({ ok: false });
      socket.data.host = true;
      for (const r of socket.rooms) if (r.startsWith('host:')) socket.leave(r);
      socket.join(`host:${st.code}`);
      ack({ ok: true, room: st.code, state: G.hostState(st), diag: G.ROLES.map((r) => ({ role: r, ...(diag.get(st.code + ':' + r) || {}) })) });
    });
    socket.on('host:reset', ({ room, freeRoles } = {}, ack = () => {}) => {
      const st = getRoom(room, false);
      if (!st) return ack({ ok: false });
      const fresh = G.resetProgress(st);
      if (freeRoles) for (const r of G.ROLES) fresh.players[r] = { clientId: null, connected: false, lang: 'hi', lastSeen: 0 };
      rooms.set(st.code, fresh);
      io.to(`room:${st.code}`).emit('bcast', { type: 'reset', freeRoles: !!freeRoles });
      sendState(fresh);
      ack({ ok: true });
    });

    socket.on('disconnect', () => {
      const st = getRoom(socket.data.room, false);
      const role = socket.data.role;
      if (!st || !G.ROLES.includes(role)) return;
      const p = st.players[role];
      if (p.clientId !== socket.data.clientId) return;
      // Another socket of the same phone may still be connected (fast reconnect).
      const still = [...(io.sockets.adapter.rooms.get(`room:${st.code}`) || [])].some((id) => {
        const s = io.sockets.sockets.get(id);
        return s && s.id !== socket.id && s.data.clientId === p.clientId && s.data.role === role;
      });
      if (still) return;
      p.connected = false;
      p.lastSeen = Date.now();
      st.log.push({ t: Date.now(), role, type: 'disconnect' });
      sendState(st);
    });
  });

  // Rests end on their own: tick resting rooms once a second.
  const restTimer = setInterval(() => {
    const now = Date.now();
    for (const st of rooms.values()) {
      if (st.restUntil != null && now >= st.restUntil) {
        G.applyEvent(data, st, { type: 'tick' }, now);
        io.to(`room:${st.code}`).emit('bcast', { type: 'rest_end' });
        sendState(st);
      }
    }
  }, 1000);

  await new Promise((resolve) => server.listen(port, '0.0.0.0', resolve));
  const actualPort = server.address().port;
  const scheme = useHttps ? 'https' : 'http';
  const close = async () => {
    clearInterval(snapTimer);
    clearInterval(restTimer);
    saveNow();
    io.close();
    await new Promise((r) => server.close(() => r()));
  };
  const reloadData = () => { data = G.loadData(); };
  return { app, server, io, rooms, port: actualPort, scheme, config, close, saveNow, reloadData };
}

async function main() {
  const useHttps = process.argv.includes('--https') || process.env.HTTPS === '1';
  const port = Number(process.env.PORT || (useHttps ? 3443 : 3000));
  const srv = await start({ port, https: useHttps });
  const urls = [`${srv.scheme}://localhost:${srv.port}`, ...lanAddresses().map((ip) => `${srv.scheme}://${ip}:${srv.port}`)];
  console.log('\nSanjay ki Tasveer is running.');
  for (const u of urls) console.log('  ' + u + '/host');
  if (process.env.RENDER_EXTERNAL_URL) {
    srv.config.publicUrl = process.env.RENDER_EXTERNAL_URL;
    console.log('  public: ' + srv.config.publicUrl + '/host');
  }
  // In HTTPS / hotspot mode, phones join over the LAN address: show it as a QR.
  if (useHttps) {
    let current = '';
    const announce = async () => {
      const ips = lanAddresses();
      const key = ips.join(',');
      if (key === current) return;
      const first = !current;
      current = key;
      if (!ips.length) { console.log('\nNo Wi-Fi / hotspot address right now: connect the laptop to a network.'); return; }
      // New Wi-Fi: make a certificate for the new address and swap it in without restarting.
      if (!first) srv.server.setSecureContext(await loadOrMakeCert(path.join(ROOT, 'certs')));
      const lanUrl = `${srv.scheme}://${ips[0]}:${srv.port}/host`;
      srv.config.publicUrl = `${srv.scheme}://${ips[0]}:${srv.port}`;
      if (!first) console.log('\nThe laptop joined a different network. New address below; reload /host and rescan the QR.');
      console.log(`\nOpen ${lanUrl} on the laptop (the QR below opens it on another device). Phones: scan the QR on that page.`);
      console.log('(First visit on each phone: accept the certificate warning, see README mode C.)\n');
      require('qrcode-terminal').generate(lanUrl, { small: true });
    };
    await announce();
    setInterval(() => announce().catch((e) => console.log('address check failed:', e.message)), 5000).unref();
  }
  if (!useHttps && !process.env.RENDER_EXTERNAL_URL) {
    console.log('\nNote: this is plain HTTP. Phones can only use TAP MODE here; the camera needs HTTPS.');
    console.log('For the camera run  npm run https  (same Wi-Fi/hotspot) or  npm run tunnel  (internet).\n');
  }
  const shutdown = async () => { await srv.close(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { start, lanAddresses };
