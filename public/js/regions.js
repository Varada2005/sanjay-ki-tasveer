// Region lookup in normalised page coordinates: (0,0) = top-left of the printed
// page, (1,1) = bottom-right. Shared by camera mode, tap mode and the debug overlay.

// Even-odd ray casting: count how many polygon edges a horizontal ray from pt crosses.
export function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Shoelace formula. Works for any simple polygon in any units.
export function polygonArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  return Math.abs(a / 2);
}

export function centroid(poly) {
  return [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
}

// The region of `page` containing (u, v), or null. If polygons ever overlap
// (the data tests forbid it, but the editor allows it while drawing) the smallest wins.
export function regionAt(regions, page, u, v) {
  if (u < 0 || v < 0 || u > 1 || v > 1) return null;
  let best = null, bestArea = Infinity;
  for (const r of regions) {
    // 'clue' areas only supply the picture hint after 3 misses; they never react to aiming.
    if (r.page !== page || r.type === 'clue') continue;
    if (!pointInPolygon([u, v], r.polygon)) continue;
    const a = polygonArea(r.polygon);
    if (a < bestArea) { best = r; bestArea = a; }
  }
  return best;
}

// A point well inside a polygon (farthest from its edges on a coarse grid). Used to place
// the glowing clue dot even on notched shapes whose centroid falls outside.
export function interiorPoint(poly) {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let best = centroid(poly), bestD = -1;
  for (let i = 1; i < 24; i++) for (let j = 1; j < 24; j++) {
    const p = [x0 + ((x1 - x0) * i) / 24, y0 + ((y1 - y0) * j) / 24];
    if (!pointInPolygon(p, poly)) continue;
    let d = Infinity;
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      d = Math.min(d, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
    }
    if (d > bestD) { bestD = d; best = p; }
  }
  return best;
}
