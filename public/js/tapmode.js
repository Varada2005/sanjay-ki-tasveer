// Tap mode: the player's own page drawn full-screen. Drag to pan, pinch to zoom,
// press and hold on something for the dwell time = the same as aiming the camera at it.
export class TapView {
  constructor({ canvas, imageUrl, onPoint, drawOverlay, insetTop = 0, insetLeft = 0 }) {
    this.insetTop = insetTop;      // px hidden under the photo strip: the page can always be moved clear of it
    this.insetLeft = insetLeft;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onPoint = onPoint;          // ({u,v,x,y}|null) while a finger rests on the page
    this.drawOverlay = drawOverlay;  // (ctx, view) for the debug outlines
    this.img = new Image();
    this.img.src = imageUrl;
    this.view = { s: 1, tx: 0, ty: 0 }; // page px -> css px: x = tx + s * px
    this.pointers = new Map();
    this.panning = false;
    this.ready = this.img.decode().then(() => { this.fit(); this.draw(); });
    this._bind();
  }

  fit() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.dpr = dpr;
    const W = this.img.naturalWidth, H = this.img.naturalHeight;
    // The whole page fits in the free area (the game runs landscape, like the page).
    const aw = r.width - this.insetLeft, ah = r.height - this.insetTop;
    const s = Math.min(aw / W, ah / H);
    this.view = { s, tx: this.insetLeft + (aw - W * s) / 2, ty: this.insetTop + (ah - H * s) / 2 };
    this.clamp();
  }

  clamp() {
    const r = this.canvas.getBoundingClientRect();
    const W = this.img.naturalWidth * this.view.s, H = this.img.naturalHeight * this.view.s;
    const cl = (t, size, start, vp) => (size <= vp - start ? start + (vp - start - size) / 2 : Math.min(start, Math.max(vp - size, t)));
    this.view.tx = cl(this.view.tx, W, this.insetLeft, r.width);
    this.view.ty = cl(this.view.ty, H, this.insetTop, r.height);
  }

  // css px on screen -> normalised page coords
  toPage(x, y) {
    const { s, tx, ty } = this.view;
    return { u: (x - tx) / s / this.img.naturalWidth, v: (y - ty) / s / this.img.naturalHeight };
  }
  toScreen(u, v) {
    const { s, tx, ty } = this.view;
    return [tx + u * this.img.naturalWidth * s, ty + v * this.img.naturalHeight * s];
  }

  draw() {
    const c = this.ctx, { s, tx, ty } = this.view;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = '#1b1510';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.img.complete) c.drawImage(this.img, tx, ty, this.img.naturalWidth * s, this.img.naturalHeight * s);
    if (this.drawOverlay) this.drawOverlay(c, this);
  }

  _local(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _bind() {
    // One AbortController removes every listener when this view is replaced (tap mode toggled, restart).
    this.abort = new AbortController();
    const opt = { signal: this.abort.signal };
    const cv = this.canvas;
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      const p = this._local(e);
      this.pointers.set(e.pointerId, { ...p, x0: p.x, y0: p.y });
      if (this.pointers.size === 1) { this.panning = false; this._emit(p); }
      else { this.panning = true; this.onPoint(null); this._pinch = null; }
    }, opt);
    cv.addEventListener('pointermove', (e) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      const p = this._local(e);
      if (this.pointers.size === 1) {
        // Small wobble while holding is fine; a real drag pans and cancels the dwell.
        if (!this.panning && Math.hypot(p.x - prev.x0, p.y - prev.y0) > 12) { this.panning = true; this.onPoint(null); }
        if (this.panning) { this.view.tx += p.x - prev.x; this.view.ty += p.y - prev.y; this.clamp(); this.draw(); }
        else this._emit(p);
      } else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const other = a === prev ? b : a;
        const dist = Math.hypot(p.x - other.x, p.y - other.y);
        const mid = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
        if (this._pinch) {
          const k = dist / this._pinch.dist;
          const s = Math.min(4, Math.max(0.2, this.view.s * k));
          const real = s / this.view.s;
          this.view.tx = mid.x - (this._pinch.mid.x - this.view.tx) * real + (mid.x - this._pinch.mid.x);
          this.view.ty = mid.y - (this._pinch.mid.y - this.view.ty) * real + (mid.y - this._pinch.mid.y);
          this.view.s = s;
          this.clamp(); this.draw();
        }
        this._pinch = { dist, mid };
      }
      Object.assign(prev, p);
    }, opt);
    const up = (e) => {
      this.pointers.delete(e.pointerId);
      this._pinch = null;
      if (this.pointers.size === 0) { this.panning = false; this.onPoint(null); }
    };
    cv.addEventListener('pointerup', up, opt);
    cv.addEventListener('pointercancel', up, opt);
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = this._local(e);
      const k = Math.exp(-e.deltaY * 0.0015);
      const s = Math.min(4, Math.max(0.2, this.view.s * k)), real = s / this.view.s;
      this.view.tx = p.x - (p.x - this.view.tx) * real;
      this.view.ty = p.y - (p.y - this.view.ty) * real;
      this.view.s = s; this.clamp(); this.draw();
    }, { passive: false, signal: this.abort.signal });
    this._onResize = () => { this.fit(); this.draw(); };
    window.addEventListener('resize', this._onResize, opt);
  }

  _emit(p) {
    const { u, v } = this.toPage(p.x, p.y);
    this.onPoint({ u, v, x: p.x, y: p.y });
  }

  destroy() { this.abort.abort(); this.dead = true; }
}
