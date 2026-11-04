// Kahani Akhbaar: the phone app. Portrait app shell (language, table pairing, books,
// spreads, side) around the landscape game. The game itself is a thin client: it reports
// what the player points at and shows what the server decides; it never judges an answer.
import I from './icons.js';
import * as audio from './audio.js';
import { regionAt, polygonArea, interiorPoint } from './regions.js';
import { loadPhoto, drawAssembled, pieceThumb } from './photo.js';
import { TapView } from './tapmode.js';
import { LANGS, t, pick, setUiLang } from './i18n.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const store = {
  get(k) { try { return localStorage.getItem('sanjay.' + k); } catch (e) { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem('sanjay.' + k); else localStorage.setItem('sanjay.' + k, v); } catch (e) {} }
};
const MIN_REGION_PX2 = 900;   // a region smaller than ~30x30 css px on screen is ignored
const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

// ---------------- state ----------------
const qs = new URLSearchParams(location.search);
// The "table" is the room that the two phones at one stand share. Paired once, remembered.
const validCode = (c) => /^[A-Z0-9]{4}$/.test(c || '');
let table = (qs.get('table') || qs.get('room') || store.get('table') || '').toUpperCase();
if (!validCode(table)) table = '';
let room = table;
let clientId = store.get('clientId');
if (!clientId) { clientId = Math.random().toString(36).slice(2) + Date.now().toString(36); store.set('clientId', clientId); }
// Tests open several "phones" in one browser: ?cid= keeps them apart.
if (qs.get('cid')) clientId = qs.get('cid');
let role = null;               // 'teen' | 'dadi' | 'spectator'
let side = null;               // 'blue' | 'yellow'
let lang = qs.get('lang') || store.get('lang');   // null until onboarding
const settings = { tap: store.get('tap') === '1' || qs.get('tap') === '1', subs: store.get('subs') === '1', debug: qs.get('debug') === '1' };
let D = null;                  // client data: regions, timing, lines
let BOOKS = null, book = null, spread = null;
let regionsById = {};
let photo = null;
let state = null;              // public room state from the server
let started = false;
let curScreen = null;
let tracker = null, tapView = null;
let celebrated = false;
const shownPieces = new Set();
const animating = new Set();

// ---------------- boot ----------------
for (const el of $$('[data-icon]')) el.innerHTML = I[el.dataset.icon] || '';

const socket = io({ transports: ['websocket', 'polling'] });
const pendingActs = [];

async function boot() {
  [D, BOOKS] = await Promise.all([fetch('/api/client-data').then((r) => r.json()), fetch('/books.json').then((r) => r.json())]);
  for (const r of D.regions) regionsById[r.id] = r;
  let manifest = {};
  try { manifest = await (await fetch('/api/audio-manifest')).json(); } catch (e) {}
  audio.configure({ lines: D.lines, lang: lang || 'hi', manifest, onSubtitle: showSubtitle });
  loadPhoto().then((p) => { photo = p; renderStrip(); }).catch((e) => console.warn('photo', e));
  book = BOOKS.books.find((b) => b.current) || BOOKS.books[0];
  spread = book.spreads.find((s) => s.playable);
  if (table) store.set('table', table);
  if (lang) store.set('lang', lang);
  setUiLang(lang || 'en');
  applyTexts();
  if (!lang) return show('lang');
  if (!table) return show('table');
  hello();
  // Test / presenter shortcut: ?side=blue|yellow jumps to the place screen.
  if (qs.get('side')) { goSide(); chooseSide(qs.get('side')); return; }
  goHome();
}

function show(name) {
  curScreen = name;
  for (const s of $$('.screen')) s.classList.toggle('on', s.id === 's-' + name);
  $('#topbar').hidden = !(name === 'play' || name === 'spectator');
  document.body.classList.toggle('in-game', name === 'play' || name === 'spectator');
  checkRotate();
}

// Every [data-t] element shows the interface text in the chosen language.
function applyTexts() {
  for (const el of $$('[data-t]')) el.textContent = t(el.dataset.t);
  document.documentElement.lang = lang || 'en';
  $('#brand-name').textContent = BOOKS ? BOOKS.app.name : '';
  $('#home-brand').textContent = BOOKS ? BOOKS.app.name : '';
  $('#brand-tag').textContent = BOOKS ? pick(BOOKS.app.tagline) : '';
  $('#langs').innerHTML = LANGS.map((l) => `<button class="lang ${l.id === lang ? 'sel' : ''}" data-lang="${l.id}">${l.label}</button>`).join('');
  for (const b of $$('#langs .lang')) b.onclick = () => { setLang(b.dataset.lang); show(table ? 'home' : 'table'); if (table) { hello(); goHome(); } };
}

function setLang(l) {
  lang = l;
  store.set('lang', l);
  setUiLang(l);
  audio.setLang(l);
  applyTexts();
  if (role && role !== 'spectator') socket.emit('lang', { lang: l });
  if (curScreen === 'home') goHome();
  if (curScreen === 'side') goSide();
  if (sheet.puzzleId) $('#riddle').textContent = lineText(`${sheet.puzzleId}.riddle`);
}

// ---------------- network ----------------
function hello() {
  if (!validCode(table)) return;
  room = table;
  socket.emit('hello', { room, clientId }, (res) => {
    if (!res || !res.ok) return;
    applyState(res.state);
    if (res.role) { role = res.role; flushPending(); }
  });
}
socket.on('connect', hello);

function act(type, regionId, extra = {}) {
  return new Promise((resolve) => {
    const msg = { type, regionId, via: settings.tap ? 'tap' : 'camera', ...extra };
    const send = () => socket.timeout(6000).emit('act', msg, (err, res) => {
      if (err) { pendingActs.push({ msg, resolve }); return; }
      resolve(res);
    });
    if (socket.connected) send(); else pendingActs.push({ msg, resolve });
  }).then((res) => { if (res && res.replies) handleReplies(res.replies); return res; });
}
function flushPending() {
  const list = pendingActs.splice(0);
  for (const p of list) socket.timeout(6000).emit('act', p.msg, (err, res) => { if (err) pendingActs.push(p); else p.resolve(res); });
}

socket.on('state', applyState);
socket.on('bcast', (b) => {
  if (b.type === 'piece') revealPiece(b.piece);
  else if (b.type === 'celebrate') celebrate(true);
  else if (b.type === 'reset') onReset(b);
});

function applyState(s) {
  if (!s) return;
  state = s;
  // A role held by a phone that went offline opens up after a while: grey it only until then.
  for (const r of ['teen', 'dadi']) { const p = s.players[r]; p.freeAt = p.freeInMs == null ? Infinity : Date.now() + p.freeInMs; }
  clearTimeout(applyState.t);
  const next = Math.min(...['teen', 'dadi'].map((r) => s.players[r].freeAt).filter((x) => x > Date.now()));
  if (next !== Infinity) applyState.t = setTimeout(renderDots, next - Date.now() + 50);
  renderDots();
  renderStrip();
  $('#rest').hidden = !s.resting;
  if (s.resting) closeLock();
  if (s.won && !celebrated && started) celebrate(false);
  if (role === 'spectator') renderSpectator();
}

function onReset(b) {
  closeLock();
  shownPieces.clear();
  celebrated = false;
  $('#celebrate').hidden = true;
  audio.stopAll();
  if (b.freeRoles) { role = null; side = null; if (started) exitGame(); else if (curScreen === 'side') goSide(); }
}

// ---------------- onboarding: table pairing ----------------
async function showTableCode() {
  $('#table-choose').hidden = true;
  $('#table-join').hidden = true;
  $('#table-show').hidden = false;
  $('#table-code').textContent = table;
  const url = `${location.origin}/play?table=${table}`;
  try { $('#table-qr').innerHTML = await (await fetch(`/api/qr.svg?text=${encodeURIComponent(url)}`)).text(); } catch (e) {}
  $('#table-continue').hidden = false;
  $('#table-skip').hidden = true;
}
function setTable(code) {
  table = code; room = code;
  store.set('table', code);
  role = null; side = null;
  hello();
}
$('#table-new').onclick = () => socket.emit('host:new', {}, (res) => { if (res && res.ok) { setTable(res.room); showTableCode(); } });
$('#table-join-open').onclick = () => { $('#table-choose').hidden = true; $('#table-join').hidden = false; $('#table-input').focus(); };
$('#table-input').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); });
$('#table-join-go').onclick = () => {
  const c = $('#table-input').value;
  if (!validCode(c)) { $('#table-input').classList.add('shake'); setTimeout(() => $('#table-input').classList.remove('shake'), 450); return; }
  setTable(c); goHome();
};
$('#table-skip').onclick = () => goHome();
$('#table-continue').onclick = () => goHome();
function openTableScreen() {
  $('#table-choose').hidden = false; $('#table-join').hidden = true; $('#table-show').hidden = true;
  $('#table-continue').hidden = true; $('#table-skip').hidden = false;
  show('table');
}

// ---------------- home (Figma 1130:278) ----------------
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 2200);
}
function goHome() {
  const total = D.puzzles.length;
  const solved = state ? state.solved.length : 0;
  const pct = Math.round((solved / total) * 100);
  const cover = (b) => `<div class="fig-cover" style="background-image:url(${b.cover});background-position:${b.coverPos || 'center'}"></div>`;
  $('#home-brand').textContent = BOOKS.app.name;
  $('#home-current').innerHTML = `<div class="fig-card">
      ${cover(book)}
      <div class="fig-card-body">
        <div class="fig-title">${pick(book.title)}</div>
        <div class="fig-meta">${t('nPuzzles', { n: total })} &nbsp;| ${pick(book.month)}</div>
        <div class="fig-desc">${pick(book.description)}</div>
        <div class="fig-prog-row"><span>${t('nSolved', { a: solved, b: total })}</span><span>${pct}%</span></div>
        <div class="fig-prog"><i style="width:${pct}%"></i></div>
        <button class="fig-btn" id="open-current"><span data-icon="playLine" class="fig-btn-ic">${I.playLine}</span>${solved ? t('resumeBtn') : t('startBtn')}</button>
      </div></div>`;
  $('#open-current').onclick = () => { if (!table) return openTableScreen(); goSide(); };
  $('#home-previous').innerHTML = BOOKS.books.filter((b) => !b.current).map((b) => `<button class="fig-mini" data-book="${b.id}">
      ${cover(b)}<div class="fig-mini-title">${pick(b.title)}</div><div class="fig-mini-meta">${pick(b.shortMonth || b.month)} &nbsp;·&nbsp; ${t('nPuzzles', { n: b.puzzles || 6 })}</div></button>`).join('');
  for (const el of $$('#home-previous .fig-mini')) el.onclick = () => toast(t('notAvailable'));
  $('#home-table').innerHTML = table ? `${t('table')} <b>${table}</b>` : `<button class="fig-link" id="pair-now">${t('tableTitle')}</button>`;
  if (!table) $('#pair-now').onclick = openTableScreen;
  show('home');
}
$('#nav-search').onclick = () => toast(t('comingSoonShort'));
$('#nav-profile').onclick = () => toast(t('comingSoonShort'));

// ---------------- pick a side (Figma 1133:545) ----------------
// Orange circle on top, blue below, matching the dots printed on the pages.
// Tapping a circle claims that side and starts the game straight away.
function goSide() {
  $('#side-title').textContent = pick(book.title);
  $('#sides').innerHTML = ['yellow', 'blue'].map((c) => {
    const meta = BOOKS.sides[c];
    return `<button class="side-circle" data-side="${c}" style="--side:${meta.color}" aria-label="${pick(meta.name)}"><span class="taken-tag">${t('taken')}</span></button>`;
  }).join('');
  for (const el of $$('#sides .side-circle')) el.onclick = () => chooseSide(el.dataset.side, true);
  renderDots();
  show('side');
}
function chooseSide(c, fromTap) {
  // Inside the tap: unlock sound and ask for full screen + landscape (needs the user's gesture).
  if (fromTap) { audio.unlock(); enterLandscape(); }
  const wanted = spread.sides[c].role;
  const go = () => socket.emit('claim', { role: wanted, lang }, (res) => {
    if (res && res.ok) {
      role = res.role; side = c;
      applyState(res.state);
      startGame();
    } else {
      leaveLandscape();
      if (res && res.spectator) { $('#watch-btn').hidden = false; }
      const el = $(`#sides [data-side="${c}"]`);
      if (el) { el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 450); }
    }
  });
  if (socket.connected) go(); else socket.once('connect', () => setTimeout(go, 300));
}
for (const b of $$('[data-back]')) b.onclick = () => goHome();
$('#home-settings').onclick = () => openMenu();
$('#game-menu').onclick = () => openMenu();
// Header back: closes an open riddle first, otherwise leaves the game.
$('#game-back').onclick = () => { if ($('#lock').classList.contains('open')) closeLock(); else if (role === 'spectator') { started = false; goHome(); } else exitGame(); };

function renderDots() {
  if (!state || !spread) return;
  const roleOf = (c) => spread.sides[c].role;
  for (const el of $$('#sides .side-circle')) {
    const p = state.players[roleOf(el.dataset.side)];
    el.classList.toggle('taken', p.taken && Date.now() < p.freeAt && role !== roleOf(el.dataset.side));
    el.classList.toggle('mine', role === roleOf(el.dataset.side));
  }
  const partner = role === 'teen' ? 'dadi' : role === 'dadi' ? 'teen' : null;
  const others = partner ? [partner] : ['teen', 'dadi'];
  const on = others.some((r) => state.players[r].connected);
  $('#partner-dot').className = 'dot' + (partner && state.players[partner].connected ? ' on' : '');
  $('#side-partner-dot').className = 'dot' + (on ? ' on' : '');
  $('#side-partner').textContent = `${t('partner')}: ${on ? t('partnerOn') : t('partnerWaiting')}`;
  $('#watch-btn').hidden = !(['teen', 'dadi'].every((r) => state.players[r].taken && Date.now() < state.players[r].freeAt) && !role);
  if (curScreen === 'home') { const p = $('.fig-prog i'); if (p) goHome(); }
}
$('#watch-btn').addEventListener('click', becomeSpectator);

// ---------------- start / landscape ----------------
function fillGameHeader() {
  const meta = BOOKS.sides[side] || BOOKS.sides.blue;
  const sd = spread.sides[side] || spread.sides.blue;
  $('#game-title').textContent = pick(book.title);
  $('#game-dot').style.background = meta.color;
  $('#game-page').textContent = `${t('page')} ${sd.pageNo}`;
  $('#page-preview-img').src = sd.page;
  $('#page-preview-dot').style.background = meta.color;
}
async function startGame() {
  audio.unlock();
  started = true;
  fillGameHeader();
  show('play');
  keepAwake();
  await startView();
  updateHint();
  if (state && state.won && !celebrated) celebrate(false);
}
// Full screen + landscape lock where the browser allows it (Android Chrome, installed app).
// Elsewhere (iPhone Safari) a "turn your phone" picture shows until the phone is sideways.
async function enterLandscape() {
  try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) {}
  try { if (window.screen.orientation && window.screen.orientation.lock) await window.screen.orientation.lock('landscape'); } catch (e) {}
}
async function leaveLandscape() {
  try { if (window.screen.orientation && window.screen.orientation.unlock) window.screen.orientation.unlock(); } catch (e) {}
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) {}
}
async function exitGame() {
  stopViews();
  closeLock();
  started = false;
  $('#menu').hidden = true;
  try { if (window.screen.orientation && window.screen.orientation.unlock) window.screen.orientation.unlock(); } catch (e) {}
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) {}
  goSide();
}
function checkRotate() {
  const inGame = curScreen === 'play' || curScreen === 'spectator';
  $('#rotate').hidden = !(inGame && window.innerHeight > window.innerWidth);
}
window.addEventListener('resize', checkRotate);
window.addEventListener('orientationchange', () => setTimeout(checkRotate, 200));

function becomeSpectator() {
  role = 'spectator';
  socket.emit('claim', { role: 'spectator' }, () => {});
  started = true;
  show('spectator');
  renderSpectator();
}

let wakeLock = null;
async function keepAwake() { try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {} }

// ---------------- camera / tap views ----------------
// ---------------- camera choices ----------------
// Some Android phones deliver a corrupted stream (half green, grey with coloured stripes)
// for the default camera request. We try a standard size first, and if the first frames
// look broken we move on to the next size / back camera automatically. The presenter menu
// can also step through them ("Switch camera"). The working choice is remembered.
const SIZES = [{ width: { ideal: 1280 }, height: { ideal: 720 } }, { width: { ideal: 640 }, height: { ideal: 480 } }, { width: { ideal: 1920 }, height: { ideal: 1080 } }];
let backCameras = [];          // deviceIds of rear cameras, known after the first permission
let camIndex = Number(store.get('camIndex') || 0);
let autoRetries = 0;
function cameraProfiles() {
  const list = SIZES.map((s) => ({ ...s }));
  for (const id of backCameras) list.push({ deviceId: { exact: id }, ...SIZES[0] });
  return list;
}
async function findBackCameras() {
  try {
    const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput' && d.deviceId);
    const back = devs.filter((d) => /back|rear|environment|world/i.test(d.label));
    backCameras = (back.length ? back : devs).map((d) => d.deviceId);
  } catch (e) {}
}
function nextCamera() {
  const n = cameraProfiles().length;
  camIndex = (camIndex + 1) % n;
  store.set('camIndex', String(camIndex));
}

async function startView() {
  stopViews();
  const page = role;
  const [W, H] = D.pageSize[page];
  cameraError = '';
  if (!settings.tap) {
    try {
      if (!window.isSecureContext || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) throw new Error('camera needs HTTPS: run npm run https (or tunnel / Render)');
      const head = await fetch(`/targets/${page}.mind`, { method: 'HEAD' });
      if (!head.ok) throw new Error('target file missing: run npm run targets');
      const { PageTracker } = await import('./ar.js');
      const profiles = cameraProfiles();
      if (camIndex >= profiles.length) camIndex = 0;
      tracker = new PageTracker({
        container: $('#ar-container'), targetUrl: `/targets/${page}.mind`, aspect: H / W,
        camera: profiles[camIndex],
        onFrame: (hit) => { updateDots(trackingOn ? tracker : null); feed(hit, 'camera'); },
        onTracking: (on) => { trackingOn = on; if (!on) lostSince = Date.now(); updateHint(); },
        onBrokenFeed: async () => {
          // Corrupted picture: try the next camera setting, a few times, then tap mode.
          await findBackCameras();
          console.warn('[camera] feed looks corrupted with setting', camIndex, '- trying the next one');
          if (++autoRetries > cameraProfiles().length) { cameraError = 'camera picture corrupted on every setting'; stopViews(); startTap(page); return; }
          nextCamera();
          await startView();
        }
      });
      $('#crosshair').classList.remove('tap', 'hidden');
      $('#crosshair').style.left = '';
      $('#crosshair').style.top = '';
      trackingOn = false; lostSince = Date.now(); hintTimer();
      await tracker.start();
      findBackCameras();
      return;
    } catch (e) {
      cameraError = (e && (e.message || e.name)) || 'camera failed';
      console.warn('[camera] falling back to tap mode:', cameraError);
      tracker = null;
      // fall through to tap mode for this session (the saved setting is untouched)
    }
  }
  startTap(page);
}

function startTap(page) {
  const cv = $('#tap-canvas');
  cv.hidden = false;
  $('#hint').classList.remove('show');
  $('#crosshair').classList.add('tap', 'hidden');
  tapView = new TapView({ canvas: cv, imageUrl: `/assets/pages/${page}.png`, onPoint: (p) => { tapPoint = p; }, drawOverlay: drawTapOverlay, insetTop: $('#topbar').offsetHeight || 56 });
  window.__tapView = tapView;
  const view = tapView;
  const loop = () => {
    if (tapView !== view) return; // this view was replaced
    if (tapPoint) {
      const ch = $('#crosshair');
      ch.style.left = tapPoint.x + 'px';
      ch.style.top = tapPoint.y + 'px';
      ch.classList.remove('hidden');
    } else $('#crosshair').classList.add('hidden');
    updateDots(tapView);
    feed(tapPoint, 'tap');
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  updateHint();
}
let tapPoint = null;
let cameraError = '';
let trackingOn = false;

function stopViews() {
  if (tracker) { tracker.stop(); tracker = null; }
  if (tapView) { tapView.destroy(); tapView = null; }
  $('#tap-canvas').hidden = true;
  hideDots();
  const o = $('#overlay'); o.getContext('2d').clearRect(0, 0, o.width, o.height);
}

let lostSince = Date.now();
// The words under the page preview: what to do right now.
function updateHint() {
  const tip = $('#scan-tip');
  if (!tip) return;
  tip.textContent = tapView ? t('tapClue') : tracker && trackingOn ? t('pointAtClue') : t('scanPage');
  tip.classList.toggle('tracking', !!(tracker && trackingOn));
}
function hintTimer() { if (tracker) { updateHint(); setTimeout(hintTimer, 400); } }

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !started || role === 'spectator') return;
  keepAwake();
  if (!socket.connected) socket.connect();
  if (tracker) await startView(); // camera streams die when the phone sleeps
});

// ---------------- dwell engine ----------------
// The same region must stay under the crosshair (or finger) for the whole dwell.
let cur = { id: null, since: 0, fired: false };
function blocked() {
  return !started || role === 'spectator' || $('#lock').classList.contains('open') || !$('#menu').hidden || !$('#rest').hidden ||
    !$('#celebrate').hidden || !$('#photo-view').hidden || !$('#rotate').hidden || (state && state.resting);
}

function screenArea(region) {
  const view = tracker || tapView;
  if (!view) return Infinity;
  try { return polygonArea(region.polygon.map(([u, v]) => view.toScreen(u, v))); } catch (e) { return Infinity; }
}

function feed(hit, source) {
  if (settings.debug) drawDebug(hit, source);
  if (blocked()) { setRing(0); cur = { id: null, since: 0, fired: false }; return; }
  let region = hit ? regionAt(D.regions, role, hit.u, hit.v) : null;
  if (region && screenArea(region) < MIN_REGION_PX2) region = null;
  const now = performance.now();
  if (!region) { cur = { id: null, since: 0, fired: false }; setRing(0); return; }
  if (region.id !== cur.id) {
    cur = { id: region.id, since: now, fired: false };
    if (region.type === 'hook' || region.type === 'candidate') vibrate(15); // a light tick: you are on a clue
  }
  if (cur.fired) { setRing(0); return; }
  const need = region.type === 'candidate' ? D.timing.candidateDwellMs : D.timing.dwellMs;
  const p = (now - cur.since) / need;
  setRing(Math.min(1, p));
  if (p >= 1) { cur.fired = true; setRing(0); trigger(region); }
}

let ringVal = -1;
function setRing(p) {
  if (Math.abs(p - ringVal) < 0.01) return;
  ringVal = p;
  $('#ring').style.strokeDasharray = `${(p * 100).toFixed(1)} 100`;
  $('#ring').style.opacity = p > 0.01 ? 1 : 0;
}

function trigger(region) {
  audio.softBlip();
  switch (region.type) {
    case 'hook': vibrate([40, 30, 80]); return act('hook', region.id);
    case 'candidate': return act('guess', region.id);
    case 'ambient': return act('ambient', region.id);
  }
  return Promise.resolve(null);
}

// For tests and the presenter: fire a region as if it had been dwelt on.
window.__debugDwell = (regionId) => {
  const r = regionsById[regionId];
  if (!r || r.page !== role) return Promise.resolve({ ok: false, error: 'not on this page' });
  return trigger(r);
};
window.__state = () => ({ role, state, lockOpen: $('#lock').classList.contains('open'), shownPieces: [...shownPieces], puzzle: sheet.puzzleId, clueShown: !$('#clue').hidden, doneShown: !$('#done').hidden });

// ---------------- replies ----------------
function handleReplies(replies) {
  for (const r of replies) {
    switch (r.type) {
      case 'puzzle':
        audio.chime();
        openPuzzle(r);
        break;
      case 'result':
        $('#lock').classList.remove('busy');
        if (r.result === 'solved' || r.result === 'already') showDone(r);
        else wrongAnswer(r);
        break;
      case 'guess':
        showFace(r.candidateId);
        audio.playLines(r.lines, { interrupt: true }).then(hideFace);
        break;
      case 'ambient':
        audio.ambient(r.sound);
        break;
      case 'resting':
        $('#rest').hidden = false;
        break;
    }
  }
}

// ---------- pictures cut from the pages ----------
const pageImgs = {};
function pageImage(page) {
  if (!pageImgs[page]) { const i = new Image(); i.src = `/assets/pages/${page}.png`; pageImgs[page] = i; }
  return pageImgs[page];
}
// Draw the bounding box of a region (plus a margin) into a canvas. Used for the wrapper
// picture on the puzzle sheet and for the picture clue (a spot on the partner's page).
function drawCrop(cv, regionId, height, pad = 0.12) {
  const r = regionsById[regionId];
  if (!r) return;
  const img = pageImage(r.page);
  const draw = () => {
    const W = img.naturalWidth, H = img.naturalHeight;
    const xs = r.polygon.map((p) => p[0] * W), ys = r.polygon.map((p) => p[1] * H);
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const px = (x1 - x0) * pad, py = (y1 - y0) * pad;
    x0 = Math.max(0, x0 - px); y0 = Math.max(0, y0 - py); x1 = Math.min(W, x1 + px); y1 = Math.min(H, y1 + py);
    const k = (height * 2) / (y1 - y0);
    cv.width = Math.round((x1 - x0) * k); cv.height = Math.round((y1 - y0) * k);
    cv.getContext('2d').drawImage(img, x0, y0, x1 - x0, y1 - y0, 0, 0, cv.width, cv.height);
  };
  if (img.complete && img.naturalWidth) draw(); else img.addEventListener('load', draw, { once: true });
}
const pageIcon = (page) => I[page === 'teen' ? 'jhoola' : 'neem'];

function showFace(cid) {
  const f = $('#face-bubble');
  f.querySelector('img').src = `/assets/faces/${cid.startsWith('other_') ? 'other' : cid}.svg`;
  f.hidden = false;
  clearTimeout(showFace.t);
  showFace.t = setTimeout(hideFace, 9000);
}
function hideFace() { $('#face-bubble').hidden = true; }

function showSubtitle(text) {
  const el = $('#subtitle');
  // The puzzle sheet already shows its own text.
  const onSheet = $('#lock').classList.contains('open');
  el.textContent = text || '';
  el.hidden = !(settings.subs && text && !onSheet);
}

// The written text of a line in the chosen language (Marathi/Gujarati TODO -> Hindi).
function lineText(id) {
  const t = D.lines[id] || {};
  return t[lang] && !/^TODO/.test(t[lang]) ? t[lang] : t.hi || '';
}

// ---------------- puzzle sheet ----------------
// Scan a wrapper -> its riddle (written + spoken) and a number pad with one box per digit.
// Wrong -> the same riddle again; from the 3rd miss, a picture of where to look on the
// partner's page. Right -> what the number meant + where Sanjay went next.
const sheet = { puzzleId: null, regionId: null, len: 3, lines: [] };
let lockDigits = [];

function openPuzzle(r) {
  Object.assign(sheet, { puzzleId: r.puzzleId, regionId: r.regionId, len: r.codeLength, lines: r.lines });
  lockDigits = [];
  drawCrop($('#lock-pic'), r.regionId, 64);
  $('#riddle').textContent = lineText(`${r.puzzleId}.riddle`);
  showClue(r.visualClue);
  $('#lock').classList.remove('busy');
  $('#lock').classList.add('open');
  document.body.classList.add('puzzle-open');
  $('#lock').scrollTop = 0;
  $('#lock').setAttribute('aria-hidden', 'false');
  $('#lock-backdrop').hidden = false;
  if (r.solved) { showDone(r); return; }
  $('#entry').hidden = false;
  $('#done').hidden = true;
  $('#lock').classList.remove('solved');
  buildBoxes();
  audio.playLines(r.lines, { interrupt: true, delay: 600 });
}

function wrongAnswer(r) {
  // Not the number: clear the boxes and read the same riddle again.
  lockDigits = []; renderBoxes();
  for (const el of [$('#lock .boxes'), $('#riddle')]) { el.classList.remove('wobble', 'again'); void el.offsetWidth; }
  $('#lock .boxes').classList.add('wobble');
  $('#riddle').classList.add('again');
  showClue(r.visualClue);
  sheet.lines = r.lines;
  audio.playLines(r.lines, { interrupt: true });
}

function showClue(vc) {
  const el = $('#clue');
  if (!vc) { el.hidden = true; return; }
  drawCrop($('#clue-pic'), vc.regionId, 104, 0.6);
  $('#clue-who').innerHTML = pageIcon(vc.page);
  el.hidden = false;
}

function showDone(r) {
  const typed = lockDigits.join('');
  $('#entry').hidden = true;
  $('#clue').hidden = true;
  $('#done').hidden = false;
  $('#lock').classList.add('solved');
  $('#done-answer').textContent = r.result === 'solved' ? typed : '';
  $('#done-text').textContent = r.lines.map(lineText).join('\n\n');
  // Who goes next: the page icon of the next wrapper, or a peppermint for the final search.
  $('#done-who').innerHTML = r.next === 'final' ? I.peppermint : pageIcon((D.puzzles.find((p) => p.id === r.next) || {}).page);
  sheet.lines = r.lines;
  audio.playLines(r.lines, { interrupt: true, delay: r.result === 'solved' ? 1500 : 300 });
}

function closeLock() {
  document.body.classList.remove('puzzle-open');
  $('#lock').classList.remove('open', 'busy');
  $('#lock').style.transform = '';
  $('#lock').setAttribute('aria-hidden', 'true');
  $('#lock-backdrop').hidden = true;
  sheet.puzzleId = null; sheet.regionId = null;
}
function buildBoxes() {
  const bx = $('#boxes');
  bx.innerHTML = '';
  for (let i = 0; i < sheet.len; i++) { const s = document.createElement('span'); s.className = 'box'; bx.appendChild(s); }
  renderBoxes();
}
function renderBoxes() {
  $$('#boxes .box').forEach((b, i) => { b.textContent = lockDigits[i] != null ? lockDigits[i] : ''; });
  $('#lock [data-k="ok"]').disabled = lockDigits.length !== sheet.len;
}
for (const b of $$('#lock .keypad button')) b.addEventListener('click', () => {
  const k = b.dataset.k;
  if (k === 'back') lockDigits = [];
  else if (k === 'ok') {
    if (lockDigits.length !== sheet.len || !sheet.regionId) return;
    $('#lock').classList.add('busy');
    act('code', sheet.regionId, { code: lockDigits.join('') });
    return;
  } else if (lockDigits.length < sheet.len) lockDigits.push(k);
  renderBoxes();
});
$('#replay').addEventListener('click', () => audio.playLines(sheet.lines, { interrupt: true }));
$('#done-close').addEventListener('click', () => { audio.stopAll(); closeLock(); });
$('#lock-backdrop').addEventListener('click', closeLock);
// Swipe down on the handle or the riddle card to close.
(() => {
  const el = $('#lock');
  let y0 = null;
  el.addEventListener('pointerdown', (e) => { if (!e.target.closest('.grab, .riddle-card') || e.target.closest('.replay')) return; y0 = e.clientY; el.style.transition = 'none'; });
  el.addEventListener('pointermove', (e) => { if (y0 == null) return; el.style.transform = `translateY(${Math.max(0, e.clientY - y0)}px)`; });
  const end = (e) => {
    if (y0 == null) return;
    const dy = e.clientY - y0; y0 = null;
    el.style.transition = ''; el.style.transform = '';
    if (dy > 70) closeLock();
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
})();

// ---------------- torn photo strip ----------------
function renderStrip() {
  const strip = $('#strip');
  if (!D) return;
  if (!strip.children.length) {
    for (const s of D.slots) { const d = document.createElement('div'); d.className = 'slot'; d.dataset.slot = s; strip.appendChild(d); }
  }
  const have = state ? state.pieces : [];
  for (const el of strip.children) {
    const s = el.dataset.slot;
    const filled = have.includes(s) && !animating.has(s);
    if (el.dataset.filled === String(filled) && el.firstChild) continue;
    if (!photo) continue;
    el.dataset.filled = String(filled);
    el.classList.toggle('filled', filled);
    el.innerHTML = '';
    el.appendChild(pieceThumb(photo, s, !filled));
    if (filled) shownPieces.add(s);
  }
}

function revealPiece(slot) {
  audio.pieceBell();
  if (!photo || role === null) { renderStrip(); return; }
  animating.add(slot);
  const layer = $('#reveal');
  layer.hidden = false;
  const c = pieceThumb(photo, slot, false);
  c.className = 'flying grow';
  // fit inside 60% of the width and 55% of the height (landscape screens are short)
  const k0 = Math.min((window.innerWidth * 0.6) / c.width, (window.innerHeight * 0.55) / c.height, 260 / c.width);
  const w = c.width * k0, h = c.height * k0;
  Object.assign(c.style, { width: w + 'px', height: h + 'px', left: (innerWidth - w) / 2 + 'px', top: (innerHeight - h) / 2 + 'px' });
  layer.appendChild(c);
  setTimeout(() => {
    const target = $(`#strip .slot[data-slot="${slot}"]`);
    const r = target ? target.getBoundingClientRect() : { left: 0, top: 0, width: 40, height: 40 };
    c.classList.remove('grow');
    const k = Math.min(r.width / w, r.height / h) * 0.92;
    Object.assign(c.style, { width: w * k + 'px', height: h * k + 'px', left: r.left + (r.width - w * k) / 2 + 'px', top: r.top + (r.height - h * k) / 2 + 'px' });
  }, 1300);
  setTimeout(() => {
    c.remove();
    if (!layer.children.length) layer.hidden = true;
    animating.delete(slot);
    renderStrip();
    const t = $(`#strip .slot[data-slot="${slot}"]`);
    if (t) { t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); }
  }, 2300);
}

// Short tap on the strip: see the photo so far. Hold 3 s: presenter menu.
(() => {
  const strip = $('#strip');
  let t0 = 0, timer = null;
  strip.addEventListener('pointerdown', () => {
    t0 = Date.now();
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; openMenu(); }, 3000);
  });
  const cancel = () => { clearTimeout(timer); timer = null; };
  strip.addEventListener('pointerup', cancel);
  strip.addEventListener('pointercancel', cancel);
  strip.addEventListener('pointerleave', cancel);
  strip.addEventListener('click', () => { if (Date.now() - t0 < 600) openPhotoView(); });
  strip.addEventListener('contextmenu', (e) => e.preventDefault());
})();

function sizeCanvas(cv) { cv.width = photo.W; cv.height = photo.H; return cv.getContext('2d'); }
function openPhotoView() {
  if (!photo) return;
  drawAssembled(sizeCanvas($('#photo-canvas')), photo, state ? state.pieces : []);
  $('#photo-view').hidden = false;
}
$('#photo-view').addEventListener('click', () => { $('#photo-view').hidden = true; });

function renderSpectator() {
  if (!photo) return setTimeout(renderSpectator, 300);
  drawAssembled(sizeCanvas($('#spectator-photo')), photo, state ? state.pieces : []);
}

// ---------------- celebration ----------------
function celebrate(withVoice) {
  celebrated = true;
  closeLock();
  const el = $('#celebrate');
  el.hidden = false;
  if (photo) { const ctx = sizeCanvas($('#celebrate-photo')); ctx.drawImage(photo.full, 0, 0); }
  const conf = $('#confetti');
  conf.innerHTML = '';
  for (let i = 0; i < 36; i++) {
    const s = document.createElement('span');
    s.innerHTML = I.peppermint;
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDuration = 4 + Math.random() * 4 + 's';
    s.style.animationDelay = Math.random() * 3 + 's';
    conf.appendChild(s);
  }
  if (withVoice) { audio.pieceBell(); audio.playLines(['cand.sanjay'], { interrupt: true, delay: 900 }); }
  el.dataset.since = Date.now();
}
$('#celebrate').addEventListener('click', (e) => {
  if (Date.now() - Number(e.currentTarget.dataset.since || 0) > 3000) e.currentTarget.hidden = true;
});

// ---------------- settings menu ----------------
// Opened from the gear on Home, the gear in the game sidebar, or a 3 s long-press on the photo strip.
function openMenu() {
  audio.softBlip();
  const m = $('#menu');
  m.hidden = false;
  m.classList.toggle('in-game', started);
  $('#set-langs').innerHTML = LANGS.map((l) => `<button class="chip ${l.id === lang ? 'sel' : ''}" data-lang="${l.id}">${l.label}</button>`).join('');
  for (const c of $$('#set-langs .chip')) c.onclick = () => { setLang(c.dataset.lang); openMenu(); };
  $('#set-table').textContent = table || '—';
  const onOff = (v) => (v ? t('on') : t('off'));
  $('#set-tap').textContent = `${t('tapMode')}: ${onOff(settings.tap)}`;
  $('#set-subs').textContent = `${t('subtitles')}: ${onOff(settings.subs)}`;
  $('#set-debug').textContent = `${t('outlines')}: ${onOff(settings.debug)}`;
  const reset = m.querySelector('[data-m="reset"]');
  reset.classList.remove('arm');
  reset.textContent = t('resetGame');
  $('#menu-info').textContent = `${t('about')} · ${t('table')} ${table || '—'} · ${role || '—'} · ${lang} · ${tracker ? 'camera' : tapView ? 'tap' : '—'} · cam ${camIndex + 1}/${cameraProfiles().length} · missing recordings ${window.__missingLines.size}${cameraError ? ' · ' + cameraError : ''}`;
}
for (const b of $$('#menu [data-m]')) b.addEventListener('click', async () => {
  const m = b.dataset.m;
  if (m === 'close') { $('#menu').hidden = true; return; }
  if (m === 'tap') { settings.tap = !settings.tap; store.set('tap', settings.tap ? '1' : '0'); $('#menu').hidden = true; if (started && role && role !== 'spectator') await startView(); return; }
  if (m === 'camera') { await findBackCameras(); nextCamera(); autoRetries = 0; $('#menu').hidden = true; if (settings.tap) { settings.tap = false; store.set('tap', '0'); } if (started && role && role !== 'spectator') await startView(); return; }
  if (m === 'audio') { audio.restart(); audio.chime(); }
  if (m === 'subs') { settings.subs = !settings.subs; store.set('subs', settings.subs ? '1' : '0'); }
  if (m === 'debug') {
    settings.debug = !settings.debug; $('#debug-text').hidden = !settings.debug;
    if (!settings.debug) { const o = $('#overlay'); o.getContext('2d').clearRect(0, 0, o.width, o.height); }
    if (tapView) tapView.draw();
  }
  if (m === 'table') { $('#menu').hidden = true; if (started) await exitGame(); openTableScreen(); return; }
  if (m === 'exit') { await exitGame(); return; }
  if (m === 'reset') {
    if (!b.classList.contains('arm')) { b.classList.add('arm'); b.textContent = t('confirmReset'); return; }
    socket.emit('reset', {}, () => {});
    $('#menu').hidden = true;
    return;
  }
  openMenu();
});

// ---------------- glowing clue dots ----------------
// A soft glowing dot floats over every peppermint wrapper on your page (camera: while the
// page is tracked; tap mode: always). Solved wrappers keep a small tick. Once the photo is
// complete, the old men get dots too, for the final search.
const dotEls = {};
const anchorCache = {};
function anchorOf(r) { return anchorCache[r.id] || (anchorCache[r.id] = interiorPoint(r.polygon)); }
function updateDots(view) {
  const layer = $('#dots');
  const solved = new Set(state ? state.solved : []);
  const allDone = state && state.pieces.length >= (D.slots || []).length && !state.won;
  const w = window.innerWidth, h = window.innerHeight;
  for (const r of D.regions) {
    if (r.page !== role) continue;
    const show = r.type === 'hook' || (r.type === 'candidate' && allDone);
    let el = dotEls[r.id];
    if (!show) { if (el) el.hidden = true; continue; }
    if (!el) {
      el = dotEls[r.id] = document.createElement('span');
      el.className = 'clue-dot';
      el.dataset.region = r.id;
      layer.appendChild(el);
    }
    const kind = r.type === 'candidate' ? 'man' : solved.has(r.puzzleId) ? 'done' : 'open';
    if (el.dataset.kind !== kind) { el.dataset.kind = kind; el.className = `clue-dot ${kind}`; }
    if (!view) { el.hidden = true; continue; }
    const [u, v] = anchorOf(r);
    const [x, y] = view.toScreen(u, v);
    const on = x > -20 && y > -20 && x < w + 20 && y < h + 20;
    el.hidden = !on;
    if (on) el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
}
function hideDots() { for (const el of Object.values(dotEls)) el.hidden = true; }

// ---------------- debug overlay ----------------
const COLORS = { hook: '#ff5252', candidate: '#40c4ff', ambient: '#bcaaa4', clue: '#69f0ae' };
function drawPolys(ctx, view) {
  for (const r of D.regions) {
    if (r.page !== role) continue;
    ctx.beginPath();
    r.polygon.forEach(([u, v], i) => { const [x, y] = view.toScreen(u, v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath();
    ctx.strokeStyle = COLORS[r.type]; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = COLORS[r.type] + '33'; ctx.fill();
  }
}
function drawTapOverlay(ctx, view) { if (settings.debug) drawPolys(ctx, view); }
function drawDebug(hit, source) {
  const t = $('#debug-text');
  t.hidden = false;
  const r = hit ? regionAt(D.regions, role, hit.u, hit.v) : null;
  t.textContent = hit ? `u ${hit.u.toFixed(3)} v ${hit.v.toFixed(3)} ${r ? r.id + ' ' + Math.round(screenArea(r)) + 'px²' : '-'}` : `${source}: no page`;
  if (source !== 'camera') return;
  const o = $('#overlay');
  if (o.width !== o.clientWidth) { o.width = o.clientWidth; o.height = o.clientHeight; }
  const ctx = o.getContext('2d');
  ctx.clearRect(0, 0, o.width, o.height);
  if (hit && tracker) drawPolys(ctx, tracker);
}

boot();
