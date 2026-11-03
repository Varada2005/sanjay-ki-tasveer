// Sound for the phone: recorded voice lines if present (audio/{lang}/{lineId}.mp3),
// otherwise the Web Speech API; plus small synthesised chimes and stall ambiences.
// Nothing here ever listens: no microphone, no recording.

let ctx = null;
let manifest = { hi: [], mr: [], gu: [], ambient: [] };
let lines = {};
let lang = 'hi';
let subtitleCb = () => {};
let queue = Promise.resolve();
let currentEl = null;
let stopToken = 0;
const missing = new Set();
window.__missingLines = missing;

export function configure(opts) {
  if (opts.lines) lines = opts.lines;
  if (opts.lang) lang = opts.lang;
  if (opts.manifest) manifest = opts.manifest;
  if (opts.onSubtitle) subtitleCb = opts.onSubtitle;
}
export const setLang = (l) => { lang = l; };

// Must be called from a user gesture (the Start button) for iOS.
export function unlock() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const b = ctx.createBuffer(1, 1, 22050);
    const s = ctx.createBufferSource();
    s.buffer = b; s.connect(ctx.destination); s.start(0);
  } catch (e) {}
  try {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
      speechSynthesis.getVoices();
    }
  } catch (e) {}
}

export function restart() {
  stopAll();
  try { if (ctx) ctx.close(); } catch (e) {}
  ctx = null;
  unlock();
}

export function stopAll() {
  stopToken++;
  queue = Promise.resolve();
  try { speechSynthesis.cancel(); } catch (e) {}
  if (currentEl) { try { currentEl.pause(); } catch (e) {} currentEl = null; }
  subtitleCb('');
}

// ---------- voice lines ----------
function textFor(id, l) {
  const t = lines[id] && lines[id][l];
  return t && !/^TODO/.test(t) ? t : null;
}

function pickVoice(bcp) {
  try {
    const vs = speechSynthesis.getVoices();
    const base = bcp.split('-')[0];
    return vs.find((v) => v.lang === bcp) || vs.find((v) => v.lang.replace('_', '-').startsWith(base)) || vs.find((v) => v.lang.startsWith('hi')) || null;
  } catch (e) { return null; }
}

function speak(text, l, token) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return setTimeout(resolve, 600 + text.length * 55);
    const bcp = { hi: 'hi-IN', mr: 'mr-IN', gu: 'gu-IN', en: 'en-IN' }[l] || 'hi-IN';
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(bcp);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = bcp;
    u.rate = 0.92;
    let done = false;
    const end = () => { if (!done) { done = true; resolve(); } };
    u.onend = end; u.onerror = end;
    // Safety net: some Androids never fire onend.
    setTimeout(end, 2500 + text.length * 120);
    if (token !== stopToken) return end();
    speechSynthesis.speak(u);
  });
}

function playFile(url, token) {
  return new Promise((resolve) => {
    if (token !== stopToken) return resolve();
    const a = new Audio(url);
    currentEl = a;
    const end = () => { if (currentEl === a) currentEl = null; resolve(); };
    a.onended = end; a.onerror = end;
    a.play().catch(end);
  });
}

async function playOne(id, token) {
  if (token !== stopToken) return;
  // 1) recording in the chosen language, 2) Hindi recording, 3) speech in the language, 4) Hindi speech.
  const recLang = (manifest[lang] || []).includes(id) ? lang : (manifest.hi || []).includes(id) ? 'hi' : null;
  const text = textFor(id, lang) || textFor(id, 'hi') || '';
  subtitleCb(text);
  if (recLang) await playFile(`/audio/${recLang}/${encodeURIComponent(id)}.mp3`, token);
  else {
    if (!missing.has(`${lang}/${id}`)) { missing.add(`${lang}/${id}`); console.info(`[audio] no recording yet for ${lang}/${id}.mp3, using speech`); }
    if (text) await speak(text, textFor(id, lang) ? lang : 'hi', token);
  }
  if (token === stopToken) subtitleCb('');
}

// Lines play one after another; a new call waits for the previous ones.
export function playLines(ids, { interrupt = false, delay = 0 } = {}) {
  if (interrupt) stopAll();
  const token = stopToken;
  queue = queue.then(async () => {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    for (const id of ids) await playOne(id, token);
  });
  return queue;
}

// ---------- synthesised sounds ----------
function ac() { if (!ctx) unlock(); return ctx; }
function env(g, t0, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}
function tone(freq, t0, dur, { type = 'sine', vol = 0.2, attack = 0.005, dest } = {}) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  env(g, t0, attack, vol, dur);
  o.connect(g).connect(dest || c.destination);
  o.start(t0); o.stop(t0 + attack + dur + 0.05);
  return o;
}
function noiseBuf(sec) {
  const c = ac();
  const b = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function noise(t0, dur, { freq = 1000, q = 1, vol = 0.1, type = 'bandpass', attack = 0.05 } = {}) {
  const c = ac(); if (!c) return;
  const s = c.createBufferSource(); s.buffer = noiseBuf(dur + attack + 0.1);
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); env(g, t0, attack, vol, dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(t0); s.stop(t0 + attack + dur + 0.1);
}
const bell = (f, t, vol = 0.18, dur = 1.6) => { tone(f, t, dur, { vol }); tone(f * 2.76, t, dur * 0.5, { vol: vol * 0.35 }); tone(f * 5.4, t, dur * 0.25, { vol: vol * 0.15 }); };
const tink = (f, t, vol = 0.08) => { tone(f, t, 0.25, { vol, type: 'triangle' }); tone(f * 1.5, t, 0.15, { vol: vol * 0.5 }); };

export function chime() {
  const c = ac(); if (!c) return; const t = c.currentTime + 0.02;
  bell(1318, t, 0.12, 1.1); bell(1760, t + 0.12, 0.1, 1.3);
}
export function pieceBell() {
  const c = ac(); if (!c) return; const t = c.currentTime + 0.02;
  bell(660, t, 0.2, 2.2); bell(990, t + 0.18, 0.14, 2.0); bell(1320, t + 0.36, 0.1, 1.8);
  try { navigator.vibrate && navigator.vibrate([40, 60, 40]); } catch (e) {}
}
export function softBlip() { const c = ac(); if (!c) return; tone(520, c.currentTime + 0.01, 0.12, { vol: 0.05 }); }

const AMBIENT = {
  kulfi(t) { for (let i = 0; i < 6; i++) bell(1900 + (i % 2) * 140, t + i * 0.16, 0.07, 0.4); },
  potter(t) { const c = ac(); const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = 55; env(g, t, 0.3, 0.04, 1.6); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 200; o.connect(f).connect(g).connect(c.destination); o.start(t); o.stop(t + 2.1); tone(140, t + 0.6, 0.2, { vol: 0.15, type: 'triangle' }); tone(120, t + 1.1, 0.2, { vol: 0.12, type: 'triangle' }); },
  marbles(t) { for (let i = 0; i < 7; i++) tink(2400 + Math.random() * 900, t + i * 0.13 + Math.random() * 0.05, 0.06); },
  jar(t) { tink(1800, t, 0.08); tink(2200, t + 0.2, 0.06); tink(2600, t + 0.33, 0.05); },
  whistle(t) { const c = ac(); const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(); o.frequency.value = 1500; l.frequency.value = 9; lg.gain.value = 60; l.connect(lg).connect(o.frequency); env(g, t, 0.05, 0.08, 0.9); o.connect(g).connect(c.destination); o.start(t); l.start(t); o.stop(t + 1.1); l.stop(t + 1.1); },
  flute(t) { [587, 659, 784, 659].forEach((f, i) => tone(f, t + i * 0.32, 0.35, { vol: 0.07, attack: 0.06 })); noise(t, 1.2, { freq: 900, q: 4, vol: 0.01 }); },
  pangat(t) { noise(t, 1.8, { freq: 500, q: 0.7, vol: 0.05, attack: 0.3 }); tink(3100, t + 0.4, 0.05); tink(2900, t + 1.0, 0.04); },
  chai(t) { noise(t, 1.0, { freq: 2500, q: 0.8, vol: 0.05, attack: 0.1 }); tink(2100, t + 1.15, 0.06); },
  bangles(t) { for (let i = 0; i < 9; i++) tink(3200 + Math.random() * 1400, t + i * 0.09 + Math.random() * 0.04, 0.05); },
  wheel(t) { const c = ac(); for (let i = 0; i < 2; i++) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t + i * 0.7); o.frequency.linearRampToValueAtTime(240, t + i * 0.7 + 0.4); env(g, t + i * 0.7, 0.05, 0.025, 0.4); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 5; o.connect(f).connect(g).connect(c.destination); o.start(t + i * 0.7); o.stop(t + i * 0.7 + 0.6); } },
  gola(t) { for (let i = 0; i < 4; i++) noise(t + i * 0.3, 0.2, { freq: 4000, q: 1.5, vol: 0.05, attack: 0.02 }); },
  bells(t) { bell(880, t, 0.06, 0.8); bell(990, t + 0.35, 0.05, 0.8); bell(880, t + 0.8, 0.04, 0.8); },
  crow(t) { for (let i = 0; i < 2; i++) { noise(t + i * 0.45, 0.22, { freq: 1300, q: 6, vol: 0.12, attack: 0.02 }); tone(620, t + i * 0.45, 0.2, { type: 'sawtooth', vol: 0.03 }); } },
  camera(t) { noise(t, 0.04, { freq: 3000, q: 1, vol: 0.12, attack: 0.002 }); noise(t + 0.09, 0.05, { freq: 1800, q: 1, vol: 0.1, attack: 0.002 }); },
  water(t) { noise(t, 1.6, { freq: 700, q: 0.5, vol: 0.06, type: 'lowpass', attack: 0.2 }); for (let i = 0; i < 4; i++) tone(500 + Math.random() * 400, t + 0.2 + i * 0.3, 0.12, { vol: 0.04 }); },
  cowries(t) { for (let i = 0; i < 7; i++) tink(1600 + Math.random() * 700, t + i * 0.06 + Math.random() * 0.03, 0.05); }
};

export function ambient(name) {
  if (!name) return Promise.resolve();
  if ((manifest.ambient || []).includes(name)) {
    const a = new Audio(`/audio/ambient/${name}.mp3`);
    a.volume = 0.6;
    a.play().catch(() => {});
    return new Promise((r) => setTimeout(r, 900));
  }
  const c = ac(); if (!c || !AMBIENT[name]) return Promise.resolve();
  try { AMBIENT[name](c.currentTime + 0.02); } catch (e) {}
  return new Promise((r) => setTimeout(r, 700));
}
