// npm run targets
// Compiles assets/pages/teen.png and assets/pages/dadi.png into assets/targets/*.mind
// by driving MindAR's own in-browser compiler (tools/compile.html) in a headless
// Chrome/Edge. No native build tools needed. Usage:
//   npm run targets            (both pages)
//   npm run targets -- teen    (one page)
'use strict';
const fs = require('fs');
const path = require('path');
const { start } = require('../server');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'targets');
// Target 0 is the whole page; the others are overlapping parts (fractions of the page) so that a phone
// held close, seeing only part of the page, still recognises it.
const TILES = [
  { x: 0, y: 0, w: 1, h: 1 },
  { x: 0, y: 0, w: 0.55, h: 0.55 }, { x: 0.45, y: 0, w: 0.55, h: 0.55 },
  { x: 0, y: 0.45, w: 0.55, h: 0.55 }, { x: 0.45, y: 0.45, w: 0.55, h: 0.55 },
  { x: 0.225, y: 0.225, w: 0.55, h: 0.55 }
];

async function launchBrowser() {
  let chromium;
  try { ({ chromium } = require('playwright-core')); } catch (e) {
    throw new Error('playwright-core is not installed. Run "npm install" (it is a dev dependency), or open /tools/compile.html in Chrome and click the buttons.');
  }
  const attempts = [{ channel: 'chrome' }, { channel: 'msedge' }, {}];
  for (const a of attempts) {
    try { return await chromium.launch({ ...a, headless: true, args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); } catch (e) { /* try next */ }
  }
  throw new Error('No Chrome or Edge found. Install Google Chrome, or run "npx playwright install chromium", or use /tools/compile.html manually.');
}

(async () => {
  const pages = process.argv.slice(2).filter((a) => ['teen', 'dadi'].includes(a));
  const list = pages.length ? pages : ['teen', 'dadi'];
  for (const p of list) if (!fs.existsSync(path.join(ROOT, 'assets', 'pages', `${p}.png`))) throw new Error(`missing assets/pages/${p}.png`);
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await start({ port: 0, quiet: true, roomsDir: path.join(ROOT, 'data', 'rooms-compile-tmp') });
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    page.on('console', (m) => { if (/%|done|error/i.test(m.text())) console.log('  ' + m.text()); });
    await page.goto(`http://localhost:${srv.port}/tools/compile.html`);
    await page.waitForFunction(() => window.compilerReady === true, null, { timeout: 30000 });
    // compile.html logs to the page; mirror it to the terminal
    await page.exposeFunction('__nodeLog', (s) => console.log('  ' + s));
    await page.evaluate(() => {
      const el = document.getElementById('log');
      new MutationObserver(() => { const lines = el.textContent.split('\n'); window.__nodeLog(lines[lines.length - 1]); }).observe(el, { childList: true, characterData: true, subtree: true });
    });
    for (const p of list) {
      console.log(`Compiling ${p}.png ...`);
      const t0 = Date.now();
      const res = await page.evaluate(([url, name, tiles]) => window.compileTiles(url, name, tiles), [`/assets/pages/${p}.png?${Date.now()}`, p, TILES]);
      const buf = Buffer.from(res.b64, 'base64');
      fs.writeFileSync(path.join(OUT, `${p}.mind`), buf);
      fs.writeFileSync(path.join(OUT, `${p}.json`), JSON.stringify({ page: p, size: [res.width, res.height], tiles: TILES }, null, 1));
      console.log(`  -> assets/targets/${p}.mind (${(buf.length / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
  } finally {
    await browser.close();
    await srv.close();
    fs.rmSync(path.join(ROOT, 'data', 'rooms-compile-tmp'), { recursive: true, force: true });
  }
  console.log('Done. Restart is not needed: phones load the new targets on their next Start.');
})().catch((e) => { console.error('\n' + e.message); process.exit(1); });
