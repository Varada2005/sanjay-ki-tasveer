// Test D: UI smoke test. /host + two phones (390 x 844) in TAP MODE, a spectator,
// and one phone in camera mode with a fake camera. Screenshots go to /screenshots.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { start } = require('../server');
const G = require('../server/game');
const { check, section, done } = require('./lib');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'screenshots');
const data = G.loadData();
const T = data.game.puzzles;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright-core')); } catch (e) { console.log('playwright-core not installed: UI test skipped'); return; }
  let browser;
  for (const a of [{ channel: 'msedge' }, { channel: 'chrome' }, {}]) {
    try { browser = await chromium.launch({ ...a, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] }); break; } catch (e) {}
  }
  if (!browser) { console.log('No Chrome/Edge available: UI test skipped'); return; }
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const f of fs.readdirSync(SHOTS)) if (f.endsWith('.png')) fs.rmSync(path.join(SHOTS, f));
  const roomsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sanjay-ui-'));
  const contribDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sanjay-contrib-'));
  const srv = await start({ port: 0, quiet: true, roomsDir, contribDir, timing: { restMs: 4000 } });
  const base = `http://localhost:${srv.port}`;
  const errors = [];
  let n = 0;
  const shot = async (page, name) => { const f = `${String(++n).padStart(2, '0')}-${name}.png`; await page.screenshot({ path: path.join(SHOTS, f) }); return f; };
  const phoneCtx = (extra = {}) => browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...extra });
  const watchErrors = (page, who) => {
    page.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${who} console: ${m.text()}`); });
  };

  try {
    section('Laptop dashboard opens a game and shows its code');
    const LAND = { width: 844, height: 390 }, PORT = { width: 390, height: 844 };
    const phones = {};
    const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const host = await hostCtx.newPage();
    watchErrors(host, 'host');
    await host.goto(`${base}/host`);
    await host.waitForFunction(() => /^[A-Z0-9]{4}$/.test(document.getElementById('code').textContent));
    await host.waitForSelector('#qr svg');
    const room = await host.textContent('#code');
    check(/^[A-Z0-9]{4}$/.test(room), `dashboard opened game ${room} with a QR`);
    check((await host.textContent('#url')).includes('/play?table=' + room), 'the dashboard QR opens the app with the code filled in');

    section('First phone: language, then types the code from the laptop');
    const teenCtx = await phoneCtx();
    const tp = await teenCtx.newPage();
    watchErrors(tp, 'teen');
    await tp.goto(`${base}/play?tap=1&cid=teen-ui&introscale=0.25`);
    await tp.waitForSelector('#s-lang.on');
    await shot(tp, 'app-1-language');
    await tp.click('#langs .lang[data-lang="hi"]');
    await tp.waitForSelector('#s-table.on');
    await shot(tp, 'app-2-enter-code');
    await tp.fill('#table-input', 'ZZZZ');
    await tp.click('#table-join-go');
    await tp.waitForSelector('#table-err:not([hidden])');
    check(await tp.isVisible('#s-table.on'), 'a code the dashboard did not open is refused (no silent split)');
    await shot(tp, 'app-3-wrong-code');
    await tp.fill('#table-input', room.toLowerCase());
    await tp.click('#table-join-go');
    await tp.waitForSelector('#s-home.on');
    check((await tp.textContent('#home-table')).includes(room), 'joined: home shows the game code');
    await wait(300);
    await shot(tp, 'app-4-home');
    check((await tp.textContent('#home-current')).includes('Rakesh') || (await tp.textContent('#home-current')).includes('राकेश'), "home card tells Rakesh's story");
    await tp.click('#s-home [data-nav="profile"]');
    await tp.waitForSelector('#s-profile.on');
    await shot(tp, 'app-4b-profile');
    check(await tp.evaluate(() => document.querySelectorAll('#prof-stats .prof-stat').length) === 3, 'profile shows progress stats');
    await tp.click('#s-profile [data-nav="home"]');
    await tp.waitForSelector('#s-home.on');
    check(await tp.evaluate(() => document.querySelectorAll('#home-previous .fig-mini').length) === 2, 'home shows the resume card and 2 previous books');
    section('Contribute: a word from your language');
    await tp.click('#s-home [data-nav="contribute"]');
    await tp.waitForSelector('#s-contrib.on');
    await wait(300);
    await shot(tp, 'app-3c-contribute');
    await tp.click('#s-contrib [data-kind="word"]');
    await tp.fill('#cf-wordin', 'ढिबरी');
    await tp.fill('#cf-meaning', 'small kerosene lamp');
    await tp.fill('#cf-place', 'Nashik');
    await shot(tp, 'app-3d-contribute-word');
    await tp.click('#cf-send');
    await tp.waitForFunction(() => document.getElementById('contrib-list').textContent.includes('ढिबरी'), null, { timeout: 5000 });
    check(true, 'a word sent from Contribute appears in the list');
    const lib = await (await fetch(base + '/api/contrib')).json();
    check(lib.length === 1 && lib[0].kind === 'word' && lib[0].place === 'Nashik', 'and is saved in the reference library');
    await tp.click('#s-contrib [data-nav="home"]');
    await tp.waitForSelector('#s-home.on');
    await tp.click('#open-current');
    await tp.waitForSelector('#s-book.on');
    await wait(300);
    await shot(tp, 'app-4c-book-spreads');
    check(await tp.evaluate(() => document.querySelectorAll('#book-spreads .spread-row').length) === 5, 'the book lists 5 spreads');
    check(await tp.evaluate(() => [...document.querySelectorAll('#book-spreads .spread-txt b')].every((b) => b.textContent.trim().length > 3)), 'every spread has a title');
    check(await tp.evaluate(() => document.querySelectorAll('#book-spreads .spread-row.playable').length) === 1, 'the mela spread is the playable one');
    check(await tp.isVisible('#story-btn') && await tp.isVisible('#book-start'), 'book page offers "Watch Rakesh\'s story" and a big "Start the book"');

    section('Start the book from scratch: Rakesh\'s story first, with its controls');
    await tp.click('#book-start');
    await tp.waitForSelector('#s-story.on');
    await tp.waitForFunction(() => { const v = document.getElementById('story-video'); return v.readyState >= 2 && v.currentTime > 0.3; }, null, { timeout: 20000 });
    check(true, 'the animatic plays by itself on a first start');
    await wait(400);
    await shot(tp, 'app-4d-story');
    await tp.click('#sv-play');
    check(await tp.evaluate(() => document.getElementById('story-video').paused), 'pause works');
    const t0 = await tp.evaluate(() => document.getElementById('story-video').currentTime);
    await tp.click('#sv-ff');
    check(await tp.evaluate((a) => document.getElementById('story-video').currentTime >= a + 9, t0), 'fast-forward jumps 10 s');
    await tp.click('#sv-play');
    check(await tp.evaluate(() => !document.getElementById('story-video').paused), 'play resumes');
    await tp.click('#sv-skip');
    await tp.waitForSelector('#s-spread.on');
    check(await tp.evaluate(() => document.getElementById('story-video').paused), '"Skip to the game" stops the story');

    section('Pages 1 to 4: "puzzle solved", next');
    for (let i = 1; i <= 4; i++) {
      check((await tp.textContent('#sp-num')).includes(String(i)), `page ${i} card`);
      if (i === 1) { await wait(300); await shot(tp, 'app-4e-page1-solved'); }
      await tp.click('#sp-next');
    }
    await tp.waitForSelector('#s-side.on');
    check(true, 'after page 4, "Go to the mela" opens the side picker');
    // back to the book: the story is not forced again, and the button now says Continue
    await tp.evaluate(() => history.back());
    await tp.waitForSelector('#s-book.on, #s-home.on');
    if (await tp.isVisible('#s-home.on')) await tp.click('#open-current');
    await tp.waitForSelector('#s-book.on');
    check((await tp.textContent('#book-start-label')) === 'किताब आगे बढ़ाएँ', 'Start becomes Continue');
    check(await tp.evaluate(() => document.querySelectorAll('#book-spreads .spread-row.done').length) === 4, 'pages 1 to 4 are ticked');
    await tp.click('#book-start');
    await tp.waitForSelector('#s-side.on');
    check(true, 'continuing goes straight to the mela, no story again');
    await wait(300);
    await shot(tp, 'app-5-pick-side');
    await tp.click('#sides .side-circle[data-side="blue"]');
    await tp.waitForSelector('#s-intro.on');
    // card 1: take your phone in your hands; card 2: the mission
    await tp.waitForSelector('#intro-take:not([hidden])', { timeout: 20000 });
    check((await tp.textContent('#intro-take-text')) === data.game.intro.take.hi, 'first: "take your phone in your hands"');
    await wait(300);
    await shot(tp, 'app-6a-intro-take-phone');
    await tp.waitForSelector('#intro-mission:not([hidden])', { timeout: 20000 });
    check((await tp.textContent('#intro-mission-text')) === data.game.intro.mission.hi, 'then the mission: find Sanjay, look for the santra goli');
    await wait(300);
    await shot(tp, 'app-6b-intro-mission');
    await tp.waitForSelector('#s-play.on', { timeout: 20000 });
    check(true, 'then the scanner starts by itself, with nothing pressed');
    check(await tp.evaluate(() => window.__state().role) === 'teen', 'blue side = teen (jhoola) page');
    check(await tp.textContent('#game-page') === 'पन्ना 9', 'header shows the page number of your side');
    phones.teen = tp;

    section('Dashboard sees the first phone');
    await host.waitForFunction(() => /tap mode/.test(document.getElementById('diag-teen').textContent), null, { timeout: 10000 });
    check(true, 'dashboard shows the blue phone\'s live status (tap mode)');

    section('Second phone joins from the pairing link');
    const dadiCtx = await phoneCtx();
    const dp = await dadiCtx.newPage();
    watchErrors(dp, 'dadi');
    await dp.goto(`${base}/play?table=${room}&tap=1&cid=dadi-ui&introscale=0.04`);
    await dp.waitForSelector('#s-lang.on');
    await dp.click('#langs .lang[data-lang="hi"]');
    await dp.waitForSelector('#s-home.on');
    check(true, 'with the pairing link the second phone skips pairing');
    await dp.click('#open-current');
    await dp.click('#book-spreads .spread-row.playable');
    await dp.waitForSelector('#s-side.on');
    await dp.waitForFunction(() => document.querySelector('#sides [data-side="blue"]').classList.contains('taken'));
    check(true, 'the blue side is shown as taken on the second phone');
    await shot(dp, 'app-6-side-taken');
    await dp.click('#sides .side-circle[data-side="yellow"]');
    await dp.waitForSelector('#s-play.on');
    await wait(300);
    check(await dp.isVisible('#scan-tip') && !(await dp.evaluate(() => document.getElementById('scan-tip').classList.contains('faded'))), 'scan prompt is visible right after the game starts');
    phones.dadi = dp;

    section('Start: landscape game');
    for (const [r, p] of Object.entries(phones)) {
      await p.setViewportSize(LAND);
      await p.waitForFunction(() => window.__tapView && window.__tapView.img.complete);
      await p.evaluate(() => window.__tapView.ready);
      await wait(500);
      check(await p.isHidden('#rotate'), `${r}: landscape, no rotate prompt`);
      const dots = await p.evaluate(() => document.querySelectorAll('#dots .clue-dot.open:not([hidden])').length);
      check(dots === 3, `${r}: 3 glowing dots over its 3 wrappers (${dots})`);
    }
    check((await phones.teen.evaluate(() => document.getElementById('scan-tip').dataset.msg || '')).length > 3, 'scan prompt was shown when the game started');
    for (const id of ['#game-back', '#game-title', '#game-page', '#pp-btn', '#game-menu']) check(await phones.teen.isVisible(id), `bar always shows ${id}`);
    await phones.teen.click('#pp-btn');
    await phones.teen.waitForSelector('#page-preview:not([hidden])');
    await shot(phones.teen, 'game-0-page-preview');
    await phones.teen.click('#page-preview');
    check(await phones.teen.isHidden('#page-preview'), 'Page Preview opens your page; tap closes it');
    await phones.teen.waitForFunction(() => document.getElementById('scan-tip').classList.contains('faded'), null, { timeout: 5000 });
    check(true, 'scan prompt fades away after 3 s');
    await shot(phones.teen, 'game-1-teen-landscape-dots');
    await shot(phones.dadi, 'game-2-dadi-landscape-dots');
    await phones.teen.setViewportSize(PORT);
    await wait(300);
    check(await phones.teen.isVisible('#rotate'), 'portrait during the game: "turn your phone" prompt');
    await shot(phones.teen, 'game-3-rotate-prompt');
    await phones.teen.setViewportSize(LAND);
    await wait(400);
    check(await phones.teen.isHidden('#rotate'), 'back to landscape: prompt gone');

    section('Third device');
    const specCtx = await phoneCtx();
    const spec = await specCtx.newPage();
    watchErrors(spec, 'spectator');
    await spec.goto(`${base}/play?table=${room}&cid=spec-ui&lang=hi&introscale=0.04`);
    await spec.waitForSelector('#s-home.on');
    await spec.click('#open-current');
    await spec.click('#book-spreads .spread-row.playable');
    await spec.waitForFunction(() => document.querySelectorAll('#sides .side-circle.taken').length === 2);
    check(true, 'both sides shown as taken on the third device');
    await spec.waitForSelector('#watch-btn:not([hidden])');
    await spec.click('#watch-btn');
    await spec.waitForSelector('#s-spectator.on');
    await spec.setViewportSize(LAND);

    section('Puzzle 1: scan the wrapper -> riddle, wrong x3 -> picture clue, right -> next');
    const p1 = data.puzzleById.p1;
    const type = async (page, digits) => { for (const k of digits) await page.click(`#lock [data-k="${k}"]`); await page.click('#lock [data-k="ok"]'); };
    await phones.dadi.evaluate((id) => window.__debugDwell(id), p1.wrapperRegionId);
    await phones.dadi.waitForSelector('#lock.open');
    await wait(500);
    const riddle = await phones.dadi.textContent('#riddle');
    check(riddle === p1.lines.hi.riddle, 'the wrapper\'s riddle is written on screen');
    check(await phones.dadi.evaluate(() => document.querySelectorAll('#boxes .box').length) === p1.answer.length, `one box per digit (${p1.answer.length})`);
    await shot(phones.dadi, 'phone-puzzle-riddle');
    check(await phones.dadi.evaluate(() => document.getElementById('lk-swap').classList.contains('locked')), 'Partner\'s view is locked until the two have talked');
    await phones.dadi.click('#lk-swap');
    check(await phones.dadi.isVisible('#toast'), 'tapping it early explains when it opens');
    await phones.dadi.click('#lk-hint');
    await phones.dadi.waitForSelector('#hint-card:not([hidden])');
    check((await phones.dadi.textContent('#hc-text')) === p1.lines.hi.hint, 'Hint shows the clearer hint for this riddle');
    await wait(300);
    await shot(phones.dadi, 'phone-hint');
    await phones.dadi.click('#hc-close');
    await phones.dadi.waitForFunction(() => !document.getElementById('lk-swap').classList.contains('locked'), null, { timeout: 4000 });
    await phones.dadi.click('#lk-swap');
    check(await phones.dadi.isVisible('#swap'), 'after a while, Partner\'s view shows the other page\'s evidence');
    await wait(200);
    await shot(phones.dadi, 'phone-partner-view');
    await phones.dadi.click('#lk-swap');
    for (const [w, h] of [[640, 360], [740, 360], [844, 390], [915, 412], [1024, 480]]) {
      await phones.dadi.setViewportSize({ width: w, height: h });
      await wait(250);
      const fit = await phones.dadi.evaluate(() => {
        const lock = document.getElementById('lock'), ok = document.querySelector('#lock [data-k="ok"]'), one = document.querySelector('#lock [data-k="1"]');
        const r = ok.getBoundingClientRect(), r1 = one.getBoundingClientRect(), riddle = document.getElementById('riddle').getBoundingClientRect();
        return { scroll: lock.scrollHeight - lock.clientHeight, okBottom: r.bottom, okH: r.height, oneTop: r1.top, h: innerHeight, riddleVisible: riddle.height > 20 };
      });
      check(fit.scroll <= 1 && fit.okBottom <= fit.h && fit.okH >= 30 && fit.oneTop > 0 && fit.riddleVisible, `riddle screen fits ${w}x${h} without scrolling (keys ${Math.round(fit.okH)} px tall)`);
      if (w === 640) await shot(phones.dadi, 'phone-puzzle-riddle-640x360');
    }
    await phones.dadi.setViewportSize(LAND);
    await wait(200);
    const stops0 = await phones.dadi.evaluate(() => window.__audioStops || 0);
    await phones.dadi.click('#game-back');
    check(await phones.dadi.evaluate((s0) => !window.__state().lockOpen && (window.__audioStops || 0) > s0, stops0), 'back closes the riddle and stops its voice');
    await phones.dadi.evaluate((id) => window.__debugDwell(id), p1.wrapperRegionId);
    await phones.dadi.waitForSelector('#lock.open');
    await wait(300);
    for (let i = 1; i <= 3; i++) {
      await type(phones.dadi, '99');
      await wait(450);
      const st = await phones.dadi.evaluate(() => window.__state());
      check(st.lockOpen && st.state.pieces.length === 0 && !st.doneShown, `miss ${i}: no piece, puzzle stays open`);
      check(st.clueShown === (i >= 3), `miss ${i}: picture clue ${i >= 3 ? 'shown' : 'not yet'}`);
      check(await phones.dadi.textContent('#riddle') === p1.lines.hi.riddle, `miss ${i}: the same riddle stays`);
    }
    await wait(300);
    await shot(phones.dadi, 'phone-puzzle-picture-clue');
    await type(phones.dadi, p1.answer);
    await phones.dadi.waitForSelector('#done:not([hidden])');
    await phones.dadi.waitForSelector('#reveal .flying');
    await wait(500);
    check((await phones.dadi.textContent('#done-text')).includes(p1.lines.hi.solved), 'success explains what the number meant');
    check((await phones.dadi.textContent('#done-text')).includes(data.game.next.hi.across.p2), 'success asks a "What am I?" riddle about where the next santra goli is');
    await shot(phones.dadi, 'phone-puzzle-solved-next');
    await shot(phones.teen, 'phone-piece-reveal-partner');
    await wait(2200);
    for (const [r, p] of Object.entries(phones)) check(await p.evaluate((s) => window.__state().state.pieces.includes(s) && document.querySelector(`#strip .slot[data-slot="${s}"]`).classList.contains('filled'), p1.photoPiece), `${r}: ${p1.photoPiece} piece in the strip`);
    await phones.dadi.click('#done-hint');
    await phones.dadi.waitForSelector('#hint-card:not([hidden])');
    check((await phones.dadi.textContent('#hc-text')) === data.game.nav.hi.p2, 'Hint on the solved screen says the place plainly (Pappu\'s stall)');
    await wait(300);
    await shot(phones.dadi, 'phone-next-hint');
    await phones.dadi.click('#hc-close');
    await phones.teen.click('#hint-btn');
    await phones.teen.waitForSelector('#hint-card:not([hidden])');
    check((await phones.teen.textContent('#hc-text')) === data.game.nav.hi.p2, 'the partner\'s Hint button gives the same plain "where next"');
    await phones.teen.click('#hc-close');
    await phones.dadi.click('#done-close');
    await shot(phones.teen, 'phone-strip-one-piece');

    section('Follow the chain: p2 .. p6');
    for (const id of data.game.chain.slice(1)) {
      const p = data.puzzleById[id];
      const ph = phones[p.page];
      await ph.evaluate((w) => window.__debugDwell(w), p.wrapperRegionId);
      await ph.waitForSelector('#lock.open');
      await wait(300);
      check(await ph.textContent('#riddle') === p.lines.hi.riddle, `${id}: its own riddle opens on the ${p.page} phone`);
      await type(ph, p.answer);
      await ph.waitForFunction((x) => window.__state().state.solved.includes(x), id);
      await ph.waitForSelector('#done:not([hidden])');
      const nextId = data.game.chain[(data.game.chain.indexOf(id) + 1) % 6];
      const want = id === data.game.chain[5] ? data.game.next.hi.across.final : data.game.next.hi.across[nextId];
      check((await ph.textContent('#done-text')).includes(want), `${id}: answer ${p.answer} -> "${id === data.game.chain[5] ? 'final' : nextId}" next`);
      if (id === 'p6') { await wait(300); await shot(ph, 'phone-puzzle-final-next'); }
      await ph.click('#done-close');
    }
    await wait(2600);
    for (const [r, p] of Object.entries(phones)) check(await p.evaluate(() => window.__state().state.pieces.length === 6 && document.querySelectorAll('#strip .slot.filled').length === 6), `${r}: 6 pieces in the strip`);
    await shot(phones.teen, 'phone-strip-full');
    await shot(spec, 'spectator-photo-full');


    section('Photo view, presenter menu, debug overlay');
    await phones.teen.tap('#strip');
    await phones.teen.waitForSelector('#photo-view:not([hidden])');
    await shot(phones.teen, 'phone-photo-view');
    await phones.teen.click('#photo-view');
    const box = await phones.teen.locator('#strip').boundingBox();
    await phones.teen.mouse.move(box.x + 30, box.y + 20);
    await phones.teen.mouse.down();
    await wait(3200);
    await phones.teen.mouse.up();
    check(await phones.teen.isVisible('#menu'), 'long-press 3 s on the strip opens the presenter menu');
    await shot(phones.teen, 'phone-presenter-menu');
    await phones.teen.click('#menu [data-m="debug"]');
    await phones.teen.click('#menu [data-m="subs"]');
    await phones.teen.click('#menu [data-m="close"]');
    await wait(200);
    await shot(phones.teen, 'phone-debug-overlay-tapmode');

    section('Find Sanjay: wrong man continues, right man ends at sunset');
    await phones.teen.evaluate(() => window.__debugDwell('cand_B'));
    await phones.teen.waitForSelector('#face-bubble:not([hidden])');
    await shot(phones.teen, 'phone-wrong-man');
    await phones.dadi.evaluate(() => window.__debugDwell('cand_A'));
    await wait(600);
    check(await phones.dadi.evaluate(() => document.getElementById('rest').hidden && !window.__state().state.won), 'two wrong men: no pause, the game continues');
    await phones.dadi.click('#find-btn');
    await phones.dadi.waitForSelector('#find-view:not([hidden])');
    const faces = await phones.dadi.evaluate(() => document.querySelectorAll('#fv-grid .fv-face').length);
    check(faces === data.regionsFile.regions.filter((r) => r.type === 'candidate').length, `Find Sanjay shows every face on both pages (${faces})`);
    await wait(300);
    await shot(phones.dadi, 'phone-find-sanjay');
    const sIdx = data.regionsFile.regions.filter((r) => r.type === 'candidate').findIndex((r) => r.candidateId === 'sanjay');
    await phones.dadi.click(`#fv-grid .fv-face:nth-child(${sIdx + 1})`);
    await phones.dadi.waitForSelector('#celebrate:not([hidden])');
    await phones.teen.waitForSelector('#celebrate:not([hidden])');
    check(true, 'celebration on both phones');
    check((await phones.dadi.textContent('#end-title')) === data.game.ending.title.hi && (await phones.dadi.textContent('#end-text')).includes('संतरा गोली'), 'the ending: you found Sanjay, santra goli at sunset');
    await wait(1500);
    await shot(phones.dadi, 'phone-celebration');
    await shot(spec, 'spectator-celebration');
    await wait(300);
    await shot(host, 'host-game-won');
    const sts = await Promise.all([phones.teen, phones.dadi, spec].map((p) => p.evaluate(() => JSON.stringify(window.__state().state))));
    check(sts[0] === sts[1] && sts[1] === sts[2], 'teen, dadi and spectator end with identical state');

    section('Real press-and-hold on every wrapper (new room)');
    {
      const { interiorPoint } = require('./lib');
      const before = await host.textContent('#code');
      await host.click('#new');
      await host.waitForFunction((r) => document.getElementById('code').textContent !== r, before);
      const roomR = await host.textContent('#code');
      const P = {};
      for (const role of ['teen', 'dadi']) {
        const ctx = await phoneCtx();
        const p = await ctx.newPage();
        watchErrors(p, role + '-taps');
        await p.goto(`${base}/play?table=${roomR}&tap=1&lang=hi&side=${role === 'teen' ? 'blue' : 'yellow'}&cid=${role}-taps&introscale=0.04`);
        await p.waitForSelector('#s-play.on');
        await p.setViewportSize({ width: 844, height: 390 });
        await p.waitForFunction(() => window.__tapView && window.__tapView.img.complete);
        P[role] = p;
      }
      // Pan the page so the wrapper sits mid-screen, then hold a finger there for 1.1 s.
      const hold = async (page, regionId) => {
        const r = data.regions[regionId];
        const [u, v] = interiorPoint(r.polygon);
        const xy = await page.evaluate(async ([u, v]) => {
          await window.__tapView.ready; // the first fit() runs when the image is decoded
          const tv = window.__tapView, cv = tv.canvas.getBoundingClientRect();
          tv.view.tx = cv.width / 2 - u * tv.img.naturalWidth * tv.view.s;
          tv.view.ty = cv.height / 2 - v * tv.img.naturalHeight * tv.view.s;
          tv.clamp(); tv.draw();
          return tv.toScreen(u, v);
        }, [u, v]);
        await page.mouse.move(xy[0], xy[1]);
        await page.mouse.down();
        await wait(1100);
        await page.mouse.up();
        await wait(300);
      };
      for (const id of data.game.chain) {
        const p = data.puzzleById[id], ph = P[p.page];
        await hold(ph, p.wrapperRegionId);
        await ph.waitForSelector('#lock.open', { timeout: 5000 });
        check(await ph.evaluate(() => window.__state().puzzle) === id, `${id}: holding on its wrapper opens ${id}`);
        const otherAnswer = data.game.puzzles.find((o) => o.id !== id && o.answer.length === p.answer.length);
        if (otherAnswer) {
          for (const k of otherAnswer.answer) await ph.click(`#lock [data-k="${k}"]`);
          await ph.click('#lock [data-k="ok"]');
          await wait(400);
          check(!(await ph.evaluate((x) => window.__state().state.solved.includes(x), id)), `${id}: ${otherAnswer.answer} (${otherAnswer.id}'s answer) does not solve it`);
        }
        for (const k of p.answer) await ph.click(`#lock [data-k="${k}"]`);
        await ph.click('#lock [data-k="ok"]');
        await ph.waitForFunction((x) => window.__state().state.solved.includes(x), id, { timeout: 5000 });
        await ph.waitForSelector('#done:not([hidden])');
        await ph.click('#done-close');
        await wait(2400);
        for (const r of ['teen', 'dadi']) check(await P[r].evaluate((slot) => document.querySelector(`#strip .slot[data-slot="${slot}"]`).classList.contains('filled'), p.photoPiece), `${id}: ${p.answer} -> ${p.photoPiece} piece on the ${r} phone`);
      }
    }

    section('Camera mode (fake camera)');
    const camCtx = await phoneCtx({ permissions: ['camera'] });
    const cam = await camCtx.newPage();
    watchErrors(cam, 'camera');
    const before2 = await host.textContent("#code");
    await host.click("#new");
    await host.waitForFunction((r) => document.getElementById('code').textContent !== r, before2);
    const room2 = await host.textContent('#code');
    await cam.goto(`${base}/play?table=${room2}&lang=hi&side=blue&cid=cam-ui&introscale=0.04`);
    await cam.waitForSelector('#s-play.on');
    await cam.setViewportSize({ width: 844, height: 390 });
    await cam.waitForSelector('#ar-container video', { timeout: 30000 }).catch(() => {});
    // the tracking file is now several MB: wait until the camera view has really started
    await cam.waitForFunction(() => !!document.querySelector('#ar-container video') && document.getElementById('tap-canvas').hidden && !!document.getElementById('scan-tip').dataset.msg, null, { timeout: 30000 }).catch(() => {});
    await wait(800);
    const camMode = await cam.evaluate(() => !!document.querySelector('#ar-container video') && document.getElementById('tap-canvas').hidden);
    check(camMode, 'camera mode starts MindAR with the teen target');
    await shot(cam, 'phone-camera-untracked-hint');
    check(await cam.textContent('#scan-tip') === 'पन्ना स्कैन कीजिए', 'camera: "Scan the page" shows while the page is not tracked');
  } catch (e) {
    check(false, 'UI flow threw: ' + e.message);
  } finally {
    // MindAR logs harmless warnings under a fake camera; real errors fail the test
    const real = errors.filter((e) => !/favicon|WebGL|GPU stall|tfjs|Tensorflow|backend/i.test(e));
    for (const e of real) console.log('  page error: ' + e);
    check(real.length === 0, 'no page errors');
    await browser.close();
    await srv.close();
    fs.rmSync(roomsDir, { recursive: true, force: true });
  }
  console.log(`  screenshots: ${fs.readdirSync(SHOTS).filter((f) => f.endsWith('.png')).length} files in screenshots/`);
  done('UI');
  process.exit(process.exitCode || 0);
})();
