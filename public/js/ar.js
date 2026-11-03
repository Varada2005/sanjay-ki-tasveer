// Camera mode: MindAR tracks the whole printed page as ONE image target.
// Every frame we work out which point of the page sits under the screen centre.
import * as THREE from 'three';
import { MindARThree } from '/vendor/mindar/mindar-image-three.prod.js';

/*
  COORDINATE SYSTEMS
  ------------------
  1. Anchor space (MindAR): the target image lies on the plane z = 0, centred on
     the origin, 1 unit wide. So x runs -0.5 .. +0.5 (left to right) and y runs
     -h/2 .. +h/2 with h = imageHeight / imageWidth. MindAR flips the image's y
     axis into OpenGL convention, so +y is the TOP edge of the printed page.
     anchor.group.matrix maps anchor space -> camera/world space every frame.

  2. Page space (ours, used by regions.json): u = 0 .. 1 left to right,
     v = 0 .. 1 top to bottom.
        u = x + 0.5
        v = 0.5 - y / h
     and back again:
        x = u - 0.5
        y = (0.5 - v) * h

  3. Screen: NDC (-1..1) from three.js, converted to CSS pixels for size checks.

  Because the lookup is done in page space, it does not matter how the phone is
  rotated relative to the page.
*/

export class PageTracker {
  constructor({ container, targetUrl, aspect, onFrame, onTracking, camera = {}, onBrokenFeed }) {
    this.container = container;
    this.cameraProfile = camera;    // extra getUserMedia video constraints (size, deviceId)
    this.onBrokenFeed = onBrokenFeed;
    this.targetUrl = targetUrl;
    this.h = aspect;            // imageHeight / imageWidth
    this.onFrame = onFrame;     // (hit|null) per frame; hit = { u, v, matrix }
    this.onTracking = onTracking;
    this.tracking = false;
    this.raycaster = new THREE.Raycaster();
    this.inv = new THREE.Matrix4();
  }

  async start() {
    this.mindar = new MindARThree({
      container: this.container,
      imageTargetSrc: this.targetUrl,
      maxTrack: 1,
      uiLoading: 'no', uiScanning: 'no', uiError: 'no',
      filterMinCF: 0.0005, filterBeta: 0.01, // a bit more smoothing than default: steadier crosshair
      missTolerance: 6, warmupTolerance: 3
    });
    const { renderer, scene, camera } = this.mindar;
    this.renderer = renderer; this.scene = scene; this.camera = camera;
    this.anchor = this.mindar.addAnchor(0);
    this.anchor.onTargetFound = () => { this.tracking = true; this.onTracking && this.onTracking(true); };
    this.anchor.onTargetLost = () => { this.tracking = false; this.onTracking && this.onTracking(false); };
    // MindAR asks only for "a back camera", no size. On some Android phones that default
    // stream arrives corrupted (half green, half grey with coloured stripes). Add an explicit
    // standard size / a chosen lens to MindAR's request, just for this start.
    const md = navigator.mediaDevices;
    const original = md.getUserMedia.bind(md);
    const profile = this.cameraProfile;
    md.getUserMedia = (c) => {
      if (c && c.video && typeof c.video === 'object') {
        const video = { ...c.video, ...profile };
        if (profile.deviceId) delete video.facingMode;
        c = { ...c, video };
      }
      return original(c);
    };
    try { await this.mindar.start(); } finally { md.getUserMedia = original; }
    this.useCanvasPreview();
    this.frames = 0;
    renderer.setAnimationLoop(() => {
      // Nothing 3D is drawn, so the WebGL canvas stays hidden; just keep the camera matrices current.
      camera.updateMatrixWorld(true);
      this.drawPreview();
      this.onFrame(this.tracking ? this.centreHit() : null);
    });
  }

  /*
    Camera preview without the <video> element.
    MindAR shows the live <video> behind the page (z-index -2) with a transparent WebGL canvas
    on top. On many Android phones Chrome turns that video into a hardware overlay and the
    layering breaks: green halves, red/blue stripes. So: keep the video playing but invisible
    (MindAR still reads its frames for tracking), hide MindAR's canvases, and paint each frame
    onto an ordinary 2D canvas at exactly the place MindAR would have shown the video.
  */
  useCanvasPreview() {
    this.video = this.container.querySelector('video');
    for (const el of this.container.children) if (el !== this.video) el.style.display = 'none';
    Object.assign(this.video.style, { opacity: '0', zIndex: '0', pointerEvents: 'none' });
    this.preview = document.createElement('canvas');
    Object.assign(this.preview.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', zIndex: '1' });
    this.container.appendChild(this.preview);
    this.previewCtx = this.preview.getContext('2d', { alpha: false });
  }

  drawPreview() {
    const v = this.video, c = this.preview;
    if (!v || !c || v.readyState < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(this.container.clientWidth * dpr), h = Math.round(this.container.clientHeight * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    // MindAR sizes and offsets the video to "cover" the container; reuse its numbers so the
    // picture lines up with the tracking maths and the debug outlines.
    const left = parseFloat(v.style.left) || 0, top = parseFloat(v.style.top) || 0;
    const vw = parseFloat(v.style.width) || this.container.clientWidth, vh = parseFloat(v.style.height) || this.container.clientHeight;
    this.previewCtx.drawImage(v, left * dpr, top * dpr, vw * dpr, vh * dpr);
    // During the first seconds, check whether the camera feed itself is corrupted.
    this.frames++;
    if (this.frames % 20 === 0 && this.frames <= 160 && !this.reportedBroken && this.feedLooksBroken()) {
      this.reportedBroken = true;
      if (this.onBrokenFeed) this.onBrokenFeed();
    }
  }

  // A corrupted stream shows large areas of pure green (missing colour data). Sample the
  // video at 24 x 24 and call it broken if over a quarter of the samples are pure green.
  feedLooksBroken() {
    try {
      if (!this.probe) { this.probe = document.createElement('canvas'); this.probe.width = this.probe.height = 24; }
      const ctx = this.probe.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(this.video, 0, 0, 24, 24);
      const d = ctx.getImageData(0, 0, 24, 24).data;
      let green = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 150 && d[i] < 70 && d[i + 2] < 70) green++;
      return green / (24 * 24) > 0.25;
    } catch (e) { return false; }
  }

  async stop() {
    try { this.renderer && this.renderer.setAnimationLoop(null); } catch (e) {}
    try { this.mindar && this.mindar.stop(); } catch (e) {}
    try { this.renderer && this.renderer.dispose(); } catch (e) {}
    // MindAR leaves its video + canvases in the container.
    this.container.querySelectorAll('video, canvas, div').forEach((el) => el.remove());
    this.mindar = null;
  }

  // Where does the screen centre land on the page?
  centreHit() {
    const M = this.anchor.group.matrix;          // anchor -> world
    this.inv.copy(M).invert();                   // world -> anchor
    // A ray from the camera through the middle of the screen (NDC 0,0)...
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    // ...expressed in anchor space. Transform two points (not the direction
    // vector) because M contains scale and translation.
    const o = this.raycaster.ray.origin.clone().applyMatrix4(this.inv);
    const p = this.raycaster.ray.origin.clone().add(this.raycaster.ray.direction).applyMatrix4(this.inv);
    const d = p.sub(o);
    if (Math.abs(d.z) < 1e-9) return null;       // looking along the page: no hit
    const t = -o.z / d.z;                        // ray meets the plane z = 0
    if (t <= 0) return null;                     // page is behind the camera
    const x = o.x + t * d.x, y = o.y + t * d.y;
    return { u: x + 0.5, v: 0.5 - y / this.h };
  }

  // Project a page-space point to CSS pixels on screen.
  toScreen(u, v) {
    const pt = new THREE.Vector3(u - 0.5, (0.5 - v) * this.h, 0).applyMatrix4(this.anchor.group.matrix).project(this.camera);
    const r = this.container.getBoundingClientRect();
    return [((pt.x + 1) / 2) * r.width, ((1 - pt.y) / 2) * r.height];
  }
}
