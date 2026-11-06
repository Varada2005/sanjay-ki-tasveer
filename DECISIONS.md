# Decisions and assumptions

## Architecture
- **One Node server** (Express 5.3.0 + Socket.IO 4.8.4, latest on npm on 2026-11-03, exact versions pinned).
  Plain HTML/JS/CSS, ES modules, no build step. The phones are thin: they send `hook / open / code / guess /
  ambient` events and the server (`server/game.js`, a pure reducer) decides everything. Phones never receive
  the codes (`/api/client-data` strips them).
- **MindAR 1.2.5 + three.js 0.160.0**, vendored in `public/vendor/` so mode C works offline. three 0.160 is pinned
  on purpose: MindAR 1.2.5 imports `sRGBEncoding`, which three removed in r162.
- **Target compilation** (`npm run targets`) drives MindAR's own browser compiler in headless Chrome/Edge via
  `playwright-core`. MindAR's Node compiler needs native `canvas` and `tfjs-node` builds, which often fail on
  Windows. Fallback: `/tools/compile.html` by hand.
- **Rooms**: 4 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L). Snapshots every 3 s to
  `data/rooms/<CODE>.json`; rooms idle for 7 days are not reloaded.
- **Reconnection**: phone id, room, role, language, tap mode and subtitles live in localStorage (try/catch).
  On every socket (re)connect the phone says `hello` and the server re-binds its role and sends the full state.
  Unsent actions (for example a code typed while offline) are queued and resent after reconnecting.
- **Taking over a role**: a role whose phone has been offline for more than 30 s may be claimed by another phone
  (for a dead battery mid-demo). A third device in a full room becomes a spectator (sees the photo, rest and
  celebration; cannot act).
- **Hosting recommendation**: mode A (Render free web service) for the professors' demo, because phones only need
  mobile data or any Wi-Fi and a trusted HTTPS certificate; mode C as the no-internet backup.

## Hand-drawn teen page (Teen.png, 2178 x 1544)
- `assets/pages/teen.png` is the hand-drawn page. Every teen region was re-placed on it; the three santra goli zones are
  centred on the circles in "with clues.png" (found by comparing it with Teen.png pixel by pixel).
- **Tracking uses the whole page plus five overlapping parts** (four 55 % quarters and a centre part) compiled into one
  `teen.mind`; `assets/targets/teen.json` lists the parts. A close-up that shows only part of the page is recognised through
  the part it contains and mapped back to page coordinates. The tracking file grew from 1 MB to 4.8 MB.
- Words changed to match the drawing: Pappu's stall is a "Toy stop" with a pinwheel (no clay whistles), the "6" ticket half lies
  where the kids pick up santra goli (no queue), the P6 santra goli is on the ground in front of the photo studio.
- **Santra goli** replaces "peppermint" everywhere players can see or hear it (riddles, voices, poem, interface, icon).
  The icon is the illustrator's santra goli drawing (`public/assets/santra-goli.png`, white background removed).
- Teen old men on the new art: B = moustached man with red cloth and ice candy, D = white Gandhi cap, E = the sketched figure
  at Pappu's stall, plus two extra old men (`other_1` glasses, `other_4` orange dupatta). Their faces do not yet show the
  face-table features.

## Hand-drawn haat page (IMG_2171.PNG, 2178 x 1544)
- `assets/pages/dadi.png` is the hand-drawn page; every haat region re-placed. The three santra goli zones are centred on the
  circles in "Frame 47.png" (pixel diff). The bangle-mat zone is smaller (radius 38 px) to stay clear of the grey-turban man.
- **Puzzles changed to what is drawn:** P4's answer is now **50** (the board says ₹50 हर दर्जन, not ₹40); P6 asks when the shop
  opens ("5:30 से खुला"); P2 no longer mentions red cloth on the matka; P3's haat ticket half shows "GIANT WHEEL" with no number,
  so the riddle now says: the half with the number lies where the children play; find the cabin that ends in it (11 to 18 -> 16).
- **Sanjay** = the white-haired man in the white cap and orange kurta behind the santra goli shop counter (the LEFT man, as the
  checklist placed him). A = the man in the red turban beside him. C = grey-turban man crouched over the game on the ground.
  Extra men: `other_5` (grey cap, beard), `other_6` (blue-turban potter).
- The smallest santra goli zone is about 16 px across when the whole page fits a phone in tap mode, so the minimum on-screen
  target size was lowered from 350 to 250 px².

## Spread list and the intro before the scanner
- Home → **book page** (5 spreads with titles, in all four languages) → tap the playable spread → pick a side →
  **poem card** → **"take your phone in your hands"** card → scanner. Exiting the game returns to the book page.
- **The poem** (`data/game.json` → `intro.poem`, four lines, rhymed couplets, hi / en / mr / gu): Sanjay loved santra goli,
  dropped wrappers wherever he went, look where each one lies, each holds a clue. Marathi and Gujarati are drafts that a
  native speaker should check.
- **Timing** (constants in `public/js/play.js`, `INTRO`): lines appear every 1.8 s (all four by about 6 s); the poem card stays
  at least 10.5 s and until the voice has finished (never beyond 22 s), plus a 1.2 s calm beat; the "take your phone" card
  stays at least 4.8 s and until its voice ends (max 9 s), plus 1.2 s. A thin progress bar shows that it is automatic.
- The voice reads both cards, so the speech paces the reading. A tap on the poem skips to the next card; back leaves.
- On **resume** (pieces already won) the poem is skipped; only "take your phone" shows before the scanner.
- `?introscale=0.05` in the page address shortens all pauses (tests).

## Look and pointer
- **Theme** (`public/css/theme.css`): dark maroon-ink base, cream serif headings (Playfair Display, Noto Serif for Devanagari and Gujarati), marigold accents, arch-shaped covers, one thin zigzag band, one sunburst behind the side circles. Cream pills over the camera. Numbers stay in the plain sans.
- **Wrapper hit zones are circles on the wrapper itself** (about 90 px on a 1491 px page) with priority over everything; 220 ms grace for jitter; the glowing dot sits on the wrapper. Details in AR-ACCURACY.md.

## App shell (Kahani Akhbaar)
- Placeholder name and look; screens are plain so the UI team's designs can replace them. Book list lives in
  `public/books.json` (current book + 2 placeholder past books; only spread 5 of the current book is playable).
- **Table code = room.** The two phones at one stand are paired once (QR or 4-letter code) and remember it, so no
  host laptop is needed to start. The projector page can still watch: `/host?room=<table>`.
- **Sides**: blue dot = teen / jhoola page, yellow dot = dadi / haat page (`books.json` → spread.sides).
- **Orientation**: app screens portrait; the game asks for landscape. On Android (Chrome / installed app) the Start
  button goes full screen and locks landscape; iPhone Safari cannot lock, so a "turn your phone" picture shows
  until the phone is sideways, and play is paused meanwhile.
- **Clue dots**: every wrapper on your page gets a glowing dot (camera: while the page is tracked; tap mode:
  always); solved wrappers show a green tick; once the photo is complete, the six old men get blue dots.
- **Vibration**: a light tick when the crosshair lands on a wrapper or a man, a stronger buzz when the riddle opens.
  iPhones do not support web vibration.
- **Keypad digits in landscape** are as large as the height allows (up to 60 pt, about 9.5% of screen height).
- **Languages**: English and Hindi riddles/lines are written (English riddles also rhyme); Marathi and Gujarati
  riddles are TODO and fall back to Hindi. App interface text: English and Hindi final, Marathi and Gujarati drafts.

## Game rules as implemented (riddle-chain version)
- **Redesign on request.** The md's design (wrapper on one page → separate stall lock on the other page, codes built
  from counts, decoy stalls) was replaced by a narrative chain: each of the 6 wrappers opens its own riddle puzzle,
  and its answer is a number printed at the place Sanjay went next (stall number 23, kulfi ₹15, cabin 16, a dozen
  bangles ₹40, wedding year 1982, waiting time 5:30). Full logic in PUZZLES.md. The md is kept for history.
- **Where the code is typed**: on the phone that scanned the wrapper (the riddle is there). The number is always on
  the partner's page, so both players are needed.
- **Wrong answer**: the same riddle is spoken again and stays on screen; the boxes clear with a small wobble.
  From the 3rd wrong answer (`timing.wrongBeforeVisualClue`), a **picture clue** appears: a crop of the partner's
  page around the answer spot, with that page's icon. It stays for that puzzle once earned.
- **Right answer**: the "solved" line says what the number meant, then a "next" line names the place of the next
  wrapper; an arrow and the next page's icon show who scans next. The photo piece goes to both phones.
- **Next pointer**: the next UNSOLVED puzzle along the chain (wrapping round), so any wrapper can be the start; after
  all six, the final line sends players to the santra goli stall. The chain alternates pages, so following it always
  hands the next wrapper to the other phone (verified in the simulation).
- **Answer length**: one box per digit (2, 2, 2, 2, 4, 3 boxes).
- **Clue areas** (`type: "clue"`) are hint pictures only; aiming at them does nothing.
- **Old puzzle spots** (scarecrow, chaupar, kanche, rahat, pangat, photographer) are now sound-only atmosphere.
- **Dwell**: 0.8 s for wrappers and atmosphere. **Candidates use 1.5 s** (`timing.candidateDwellMs`): pointing at a
  man is a final guess, so a slightly longer hold avoids accidental rests.
- After a dwell fires, the same region will not fire again until the crosshair leaves it.
- Regions smaller than about 30 x 30 CSS px on screen (900 px²) are ignored, in both camera and tap mode.
- **Duplicate / simultaneous solves**: the server is single-threaded, so the first correct answer wins and gives the
  piece; the second gets the solved line again and no piece.
- **Final guess**: allowed at any time. Sanjay wins on both phones (voice on both). Any other man counts as a wrong
  guess and answers with his own line. **Rest**: after 2 wrong guesses both phones show the sleeping diya for 60 s and
  all play pauses; the count then resets. The presenter menu stays reachable during a rest.
- **Face table**: murki simplified to "has a murki". Pieces arrive in chain order (red head-cloth, moustache, eyes,
  murki, mole, gap tooth); after 4 of them only Sanjay matches.
- Character consistency: candidate **E** (red cap behind the left toy stall) is Pappu himself.

## Text on screen
- **Riddles are written on screen** (requested), together with the solved and next lines on the puzzle sheet.
  Other spoken lines (the old men) are voice only; subtitles for them are in the presenter menu.
- The puzzle sheet shows a small picture of the scanned wrapper, so players always know which puzzle is open.
- In tap mode the page can always be moved below the photo strip, so regions at the top edge can be pressed.
- The 4-character room code, language buttons and the hidden presenter menu (small English labels) also use text.
- A short tap on the photo strip shows the torn photo so far, large.

## Audio
- Lines are written in Devanagari village Hindi (`data/game.json`). Marathi and Gujarati tables are present with
  every value `"TODO"`; any TODO line falls back to the Hindi text. Recorded mp3s win over speech.
- Web Speech voice choice: exact `hi-IN`/`mr-IN`/`gu-IN`, then same language, then any Hindi voice. Missing
  recordings are logged in the browser console and counted in the presenter menu; `npm run lines` lists them all.
- No line repeats the code or explains a word (tested for matlab / yaani / means / मतलब / यानी / अर्थात).
- Stall ambiences are synthesised in the browser (Web Audio), so no third-party audio files are needed; an
  `audio/ambient/<name>.mp3` overrides each one. See CREDITS.md.

## Data and art
- `game.json` (version 2): `story`, `chain` (order of Sanjay's day), `puzzles` (wrapper region, answer, meaning,
  answer source, items needed on each page, photo piece, riddle + solved lines), `next` lines (across / same page /
  final), candidates. Region types: `hook` (wrapper), `clue` (picture-hint area), `candidate`, `ambient`.
- Sound-only regions: `amb_gola`, `amb_kanche`, `amb_scarecrow`, `amb_camera` (teen); `amb_bullocks`, `amb_chaupar`,
  `amb_rahat`, `amb_pangat` (dadi).
- Placeholder photo and faces are generated by `tools/make-faces.js` from the face table. The photo is torn along six
  polygons (`public/assets/photo/photo.json`) with a noisy paper edge; each feature sits inside its own piece.
- The draft PNGs already show some text (for example "PAPPU 07", पप्पू ३, cabin numbers). As instructed, nothing is
  read from the images; regions were placed where those things are or will be.

## Regions placed by best guess (check these in `/tools/editor.html`)
Every region was checked against a full-resolution overlay of the drafts, but these depend on details not yet final:

| Region | Why it is a guess |
|---|---|
| `clue_p4` (dadi) | NEW art: the "दर्जन ₹४०" board beside the old mausi, placed at the left post of the bangle stall. |
| `clue_p6` (dadi) | NEW art: the "ताज़ी संतरा गोली रोज़ शाम ५:३०" sign, placed on the santra goli stall's awning. |
| `w_kulfi`, `w_bangle`, `w_pappu`, `w_cabin16` | Wrappers here are NEW art; the regions cover the whole stall/cabin, so the wrapper only needs to be inside. |
| `w_pappu` / `cand_E` (teen) | The stall polygon is notched around E (Pappu) so they do not overlap; check E's box covers his face. |
| `clue_p1`, `clue_p2`, `clue_p5` | Pappu's board, the kulfi slate and the year under the photo: placed on the existing art; recheck after redrawing. |
| `other_1` (teen) | Old man with red turban, stick and shoulder bag, bottom-left edge: judged "old"; remove if not. |
| `other_2`, `other_3` (dadi) | White-turban chaupar partner and the bearded man in the pattal row, judged "old men". |

No other old men were found on either page (the kulfi seller, potter, toy sellers, chai seller, server and
photographer read as middle-aged). If the final art adds any, draw a `candidate` region with candidateId
`other_N` and add a line under `otherOldMen` in `game.json`.

## Round: warm restyle, story, hints, Find Sanjay, Contribute
- **Riddles hint, never name.** User testing found them instantly obvious. Rule now (tested): no answer object, no
  digits, at most 40 words. The plain version moved to a Hint button, so stuck players are never stranded.
- **Partner's view unlocks after talking**, not at once: after a first answer or 25 s. This keeps the
  "describe what you see" moment, then rewards it with the full evidence.
- **Find Sanjay any time, no rest after wrong men.** A wrong man answers in character and play continues; the rest
  (diya) pause felt like punishment.
- **Story plays once**, only on a first Start the book; always available from the book page and Profile.
- **Warm palette for two ages**: dark brown text on white/yellow (contrast > 12:1), coral only for the main action,
  18 px+ body type, 56 px+ buttons, one rounded type family for Latin, Devanagari and Gujarati.
- **Indian voices only**; if a phone has none it falls back to hi-IN rather than a western English voice.
