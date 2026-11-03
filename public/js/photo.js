// Tears the placeholder photo of Sanjay into 6 pieces with ragged paper edges.
// Layout comes from /assets/photo/photo.json (one polygon per slot).
import { pointInPolygon } from './regions.js';

const SCALE = 2; // render at 2x for crisp phones

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
// Smooth value noise, used to push sample points around so the tear lines wobble.
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => noise(x, y) * 0.6 + noise(x * 2.7, y * 2.7) * 0.3 + noise(x * 7.1, y * 7.1) * 0.1;

export async function loadPhoto(base = '/assets/photo/') {
  const layout = await (await fetch(base + 'photo.json')).json();
  const img = new Image();
  img.src = base + layout.image;
  await img.decode();
  const W = layout.width * SCALE, H = layout.height * SCALE;
  const full = document.createElement('canvas');
  full.width = W; full.height = H;
  full.getContext('2d').drawImage(img, 0, 0, W, H);
  const src = full.getContext('2d').getImageData(0, 0, W, H);

  const slots = Object.keys(layout.pieces);
  const polys = slots.map((s) => layout.pieces[s]);
  const amp = layout.tearAmplitude || 8;
  // label[i] = which piece pixel i belongs to (after a noisy displacement).
  const label = new Int8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = x / SCALE, py = y / SCALE;
      const dx = (fbm(px / 22, py / 22) - 0.5) * 2 * amp;
      const dy = (fbm(px / 22 + 40, py / 22 + 40) - 0.5) * 2 * amp;
      const q = [Math.min(layout.width - 0.01, Math.max(0, px + dx)), Math.min(layout.height - 0.01, Math.max(0, py + dy))];
      let k = polys.findIndex((p) => pointInPolygon(q, p));
      if (k < 0) k = polys.findIndex((p) => pointInPolygon([px, py], p));
      label[y * W + x] = k < 0 ? 0 : k;
    }
  }
  const pieces = {};
  slots.forEach((slot, k) => {
    const out = new ImageData(W, H);
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (label[i] !== k) continue;
        // Near a tear: paint white paper fibre instead of the photo.
        let edge = false;
        const r = 3 + Math.floor(hash(x, y) * 3);
        for (const [ox, oy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
          const xx = x + ox, yy = y + oy;
          if (xx >= 0 && yy >= 0 && xx < W && yy < H && label[yy * W + xx] !== k) edge = true;
        }
        const o = i * 4;
        if (edge) { out.data[o] = 247; out.data[o + 1] = 240; out.data[o + 2] = 225; out.data[o + 3] = 255; }
        else { out.data[o] = src.data[o]; out.data[o + 1] = src.data[o + 1]; out.data[o + 2] = src.data[o + 2]; out.data[o + 3] = 255; }
        if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
      }
    }
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    c.getContext('2d').putImageData(out, 0, 0);
    // Silhouette (for empty slots): same shape, flat colour.
    const sil = document.createElement('canvas');
    sil.width = W; sil.height = H;
    const sctx = sil.getContext('2d');
    sctx.drawImage(c, 0, 0);
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = 'rgba(255,255,255,0.18)';
    sctx.fillRect(0, 0, W, H);
    pieces[slot] = { canvas: c, silhouette: sil, bbox: [x0, y0, x1 - x0 + 1, y1 - y0 + 1] };
  });
  return { layout, W, H, full, pieces, slots };
}

// Draw the photo with only the pieces in `have`; empty places show faint outlines.
export function drawAssembled(ctx, photo, have, { showEmpty = true } = {}) {
  const { W, H } = photo;
  ctx.clearRect(0, 0, W, H);
  for (const s of photo.slots) {
    const p = photo.pieces[s];
    if (have.includes(s)) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.35)';
      ctx.shadowBlur = 8;
      ctx.drawImage(p.canvas, 0, 0);
      ctx.restore();
    } else if (showEmpty) ctx.drawImage(p.silhouette, 0, 0);
  }
}

// A canvas showing just one piece, cropped to its own bounding box.
export function pieceThumb(photo, slot, empty) {
  const p = photo.pieces[slot];
  const [x, y, w, h] = p.bbox;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(empty ? p.silhouette : p.canvas, x, y, w, h, 0, 0, w, h);
  return c;
}
