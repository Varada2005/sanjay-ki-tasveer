// Generates placeholder, hand-drawn-style faces for Sanjay and look-alikes A–E
// from the face table in data/game.json:   npm run faces
// Output: public/assets/faces/{id}.svg  and  public/assets/photo/sanjay.svg (the photo that gets torn).
// Replace public/assets/photo/sanjay.svg (or point photo.json at a PNG) with the final art.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const game = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'game.json'), 'utf8'));

// Tiny deterministic wobble so lines look hand-drawn.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function wobblyPath(points, r, amp = 1.6, close = true) {
  const p = points.map(([x, y]) => [x + (r() - 0.5) * amp * 2, y + (r() - 0.5) * amp * 2]);
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 1; i < p.length + (close ? 1 : 0); i++) {
    const a = p[(i - 1) % p.length], b = p[i % p.length];
    const mx = (a[0] + b[0]) / 2 + (r() - 0.5) * amp, my = (a[1] + b[1]) / 2 + (r() - 0.5) * amp;
    d += ` Q${mx.toFixed(1)},${my.toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`;
  }
  return d + (close ? 'Z' : '');
}
const ellipsePts = (cx, cy, rx, ry, n = 24) => Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((2 * Math.PI * i) / n), cy + ry * Math.sin((2 * Math.PI * i) / n)]);

function face(f, seed, opts = {}) {
  const r = rng(seed);
  const ink = '#3b2a1e';
  const skin = opts.skin || '#c98d5f';
  const W = 300, H = 400;
  const s = [];
  s.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
  s.push(`<defs><radialGradient id="vg" cx="50%" cy="45%" r="70%"><stop offset="60%" stop-color="#efe0bf"/><stop offset="100%" stop-color="#cdb185"/></radialGradient>
  <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.2  0 0 0 0.08 0"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>`);
  s.push(`<rect width="${W}" height="${H}" fill="url(#vg)"/>`);
  // kurta + neck
  s.push(`<path d="${wobblyPath([[40, 400], [60, 352], [112, 330], [188, 330], [240, 352], [260, 400]], r)}" fill="#f1eadb" stroke="${ink}" stroke-width="2.5"/>`);
  s.push(`<path d="${wobblyPath([[122, 300], [178, 300], [182, 345], [150, 360], [118, 345]], r)}" fill="${skin}" stroke="${ink}" stroke-width="2"/>`);
  // ears (left = viewer's left)
  s.push(`<path d="${wobblyPath(ellipsePts(62, 236, 15, 26, 12), r)}" fill="${skin}" stroke="${ink}" stroke-width="2.5"/>`);
  s.push(`<path d="${wobblyPath(ellipsePts(238, 236, 15, 26, 12), r)}" fill="${skin}" stroke="${ink}" stroke-width="2.5"/>`);
  if (f.murki) s.push(`<circle cx="58" cy="268" r="8" fill="none" stroke="#d9a400" stroke-width="4"/><circle cx="58" cy="268" r="8" fill="none" stroke="${ink}" stroke-width="1"/>`);
  // face
  s.push(`<path d="${wobblyPath(ellipsePts(150, 232, 86, 106, 28), r, 1.8)}" fill="${skin}" stroke="${ink}" stroke-width="3"/>`);
  // wrinkles
  s.push(`<path d="M112,162 q38,-8 76,0 M118,172 q32,-6 64,0" fill="none" stroke="${ink}" stroke-width="1.4" opacity=".55"/>`);
  // head: red headcloth, or a white cap / bare grey hair
  if (f.red_headcloth) {
    s.push(`<path d="${wobblyPath([[58, 170], [62, 110], [96, 64], [150, 46], [206, 62], [240, 108], [244, 170], [210, 150], [150, 142], [92, 150]], r, 2.2)}" fill="#b43a2e" stroke="${ink}" stroke-width="3"/>`);
    s.push(`<path d="M70,130 q80,-40 168,-6 M64,152 q90,-36 176,-10 M92,84 q60,-20 120,4" fill="none" stroke="#7d2219" stroke-width="3"/>`);
  } else if (opts.cap) {
    s.push(`<path d="${wobblyPath([[66, 160], [72, 108], [150, 92], [228, 108], [234, 160], [150, 150]], r, 2)}" fill="#f7f4ec" stroke="${ink}" stroke-width="3"/>`);
  } else {
    s.push(`<path d="${wobblyPath([[64, 200], [70, 150], [110, 128], [190, 128], [230, 150], [236, 200], [220, 170], [150, 150], [80, 170]], r, 2)}" fill="#d8d3c8" stroke="${ink}" stroke-width="2.5"/>`);
  }
  // eyebrows (grey, bushy)
  s.push(`<path d="M92,186 q22,-14 46,-2" fill="none" stroke="#e8e4da" stroke-width="7" stroke-linecap="round"/><path d="M92,186 q22,-14 46,-2" fill="none" stroke="${ink}" stroke-width="1.5"/>`);
  s.push(`<path d="M162,184 q24,-12 46,2" fill="none" stroke="#e8e4da" stroke-width="7" stroke-linecap="round"/><path d="M162,184 q24,-12 46,2" fill="none" stroke="${ink}" stroke-width="1.5"/>`);
  if (f.eyebrow_scar) s.push(`<path d="M108,168 l12,26 M116,166 l11,24" stroke="#7a3b2a" stroke-width="3" stroke-linecap="round"/>`);
  // eyes: smiling crescents
  s.push(`<path d="M100,208 q15,-12 30,0" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/><path d="M170,208 q15,-12 30,0" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`);
  s.push(`<path d="M96,220 q8,6 18,4 M186,224 q10,2 18,-4" fill="none" stroke="${ink}" stroke-width="1.3" opacity=".6"/>`);
  // nose
  s.push(`<path d="M150,210 q-6,24 -14,34 q14,8 28,0" fill="none" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"/>`);
  // mole on the right cheek (viewer's right)
  if (f.mole) s.push(`<circle cx="222" cy="252" r="5.5" fill="#2a1a10"/>`);
  // moustache
  if (f.curled_moustache) {
    s.push(`<path d="M150,262 q-24,-8 -40,4 q-12,10 -10,-6 q-6,18 10,20 q22,2 40,-8 q18,10 40,8 q16,-2 10,-20 q2,16 -10,6 q-16,-12 -40,-4z" fill="#ece8df" stroke="${ink}" stroke-width="2.2"/>`);
  } else {
    s.push(`<path d="M150,262 q-26,-6 -42,8 q-6,14 0,26 q8,-14 20,-16 q12,-2 22,-6 q10,4 22,6 q12,2 20,16 q6,-12 0,-26 q-16,-14 -42,-8z" fill="#ece8df" stroke="${ink}" stroke-width="2.2"/>`);
  }
  // mouth + teeth
  s.push(`<path d="M120,306 q30,26 60,0 q-30,8 -60,0z" fill="#5a2018" stroke="${ink}" stroke-width="2.4"/>`);
  if (f.gap_tooth) s.push(`<path d="M128,308 h18 v7 h-18z M154,308 h18 v7 h-18z" fill="#fbf6ea"/>`);
  else s.push(`<path d="M128,308 h44 v7 h-44z" fill="#fbf6ea"/>`);
  s.push(`<rect width="${W}" height="${H}" filter="url(#paper)"/>`);
  s.push('</svg>');
  return s.join('\n');
}

const outFaces = path.join(ROOT, 'public', 'assets', 'faces');
const outPhoto = path.join(ROOT, 'public', 'assets', 'photo');
fs.mkdirSync(outFaces, { recursive: true });
fs.mkdirSync(outPhoto, { recursive: true });
let seed = 7;
for (const c of game.candidates) {
  const svg = face(c.features, seed++, { cap: c.id === 'D', skin: c.isSanjay ? '#c98d5f' : ['#b97c50', '#c48a5a', '#a86f45', '#cf9668', '#b98258'][seed % 5] });
  fs.writeFileSync(path.join(outFaces, `${c.id}.svg`), svg);
  if (c.isSanjay) fs.writeFileSync(path.join(outPhoto, 'sanjay.svg'), svg);
}
// Generic old man for the other_N candidates.
fs.writeFileSync(path.join(outFaces, 'other.svg'), face({ curled_moustache: false }, 99, { skin: '#b98258' }));

// Torn-piece layout (300 x 400 photo space). Each slot owns one polygon; the phone
// tears along these lines with a noisy edge. Features sit well inside their piece.
const photo = {
  image: 'sanjay.svg', width: 300, height: 400, tearAmplitude: 6,
  pieces: {
    red_headcloth: [[0, 0], [300, 0], [300, 180], [244, 180], [210, 160], [150, 152], [92, 160], [60, 180], [0, 180]],
    eyes: [[75, 185], [60, 180], [92, 160], [150, 152], [210, 160], [244, 180], [300, 180], [300, 235], [75, 235]],
    ear_murki: [[0, 180], [60, 180], [75, 185], [75, 400], [0, 400]],
    mole: [[210, 235], [300, 235], [300, 300], [210, 300]],
    moustache: [[75, 235], [210, 235], [210, 300], [75, 300]],
    gap_tooth: [[75, 300], [300, 300], [300, 400], [75, 400]]
  },
  // Key points of each feature as drawn above; tests check each lies well inside its own piece.
  features: {
    red_headcloth: [[58, 170], [92, 150], [150, 142], [210, 150], [244, 170], [150, 46]],
    eyes: [[108, 168], [127, 194], [92, 186], [208, 184], [115, 205], [185, 205]],
    ear_murki: [[50, 268], [58, 260], [66, 268], [58, 276], [62, 212]],
    mole: [[222, 252]],
    moustache: [[100, 262], [200, 262], [150, 262], [110, 282], [190, 282], [150, 290]],
    gap_tooth: [[128, 308], [172, 315], [150, 312]]
  }
};
fs.writeFileSync(path.join(outPhoto, 'photo.json'), JSON.stringify(photo, null, 1));
console.log('faces written:', game.candidates.map((c) => c.id).join(', '), '+ other; photo layout written');
