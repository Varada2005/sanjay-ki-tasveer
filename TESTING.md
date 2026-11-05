# Testing

## Automated

```bash
npm test
```

| Suite | File | What it proves |
|---|---|---|
| A data | `tests/data.test.js` | 6 puzzles, 3 wrappers per page, the chain alternates pages, answers unique with a narrative meaning, every answer is on the other page beside (or naming) the next wrapper, each riddle is 2 rhyming couplets that name where to look, every answer typed at every wrapper (only its own works, gives its own piece, then "next"), wrong answers repeat the riddle and the picture clue appears from the 3rd miss, no overlapping wrappers/candidates, photo features inside their pieces. |
| B simulation | `tests/sim.test.js` | 102,600 random playthroughs (6 starts × "next"-following 100/50/0% × wrong-answer rates 0/30/60% × 1,900), random wrong guesses and rests, duplicate solves: every run reaches 6 pieces, no deadlock, strict teen/dadi alternation when "next" is followed, "next" always points to an unsolved puzzle, picture clue exactly from the 3rd miss, rests block for 60 s and reset the count. Face table: only Sanjay has all 6, red never identifies him, uniqueness counts match the md. |
| C integration | `tests/integration.test.js` | Real server + socket.io clients: 5 full games in random order, disconnect/reconnect mid-puzzle, transport drop, both phones entering codes at once, a double-tapped correct code, a taken role, a third device as spectator, a rest on both phones, server restart resuming from the snapshot, reset. All clients end with identical state. |
| D UI | `tests/ui.test.js` | Edge/Chrome via playwright-core: `/host` + two 390×844 phones in tap mode + spectator + one phone with a fake camera. Riddle on screen, one box per digit, 3 misses then the picture clue, success text with the next place, all 6 puzzles in chain order, plus real press-and-hold taps on every wrapper. Uses `window.__debugDwell(regionId)` and the real keypad. Saves screenshots to `screenshots/`. |

`SIM_RUNS=5000 npm run test:sim` runs a bigger simulation.

## Manual checklist: real phones and real prints

Print both pages at 100% on matte paper first, run `npm run targets` on the exact files you printed.

### Setup
- [ ] `/host` shows a QR; both phones open `/play?room=XXXX` from it.
- [ ] Taken role is greyed on the second phone; two dots show both phones; host shows both green.
- [ ] Start button: iPhone asks for the camera; sound plays (silent switch off!).
- [ ] Lock one phone for 30 s, unlock: it returns to the game with the same pieces, without the join screen.
- [ ] Kill the browser on one phone, reopen the QR link: same role, same state.

### Tracking (each page, each phone)
- [ ] Page found within 2 s at 25 to 35 cm; hint picture disappears when tracked, returns after about 1 s when lost.
- [ ] **Rotation**: page rotated 0°, 90°, 180°, 270° under the phone: the same stall still opens the lock.
- [ ] **Angle**: phone tilted 30° and 45° from straight above: still tracks; crosshair hits the intended stall.
- [ ] **Distance**: 15 cm (only part of the page visible) still tracks once found; 50 cm: small regions (marble
      jar, cabin plates) are ignored until you move closer; that is intended.
- [ ] **Lighting**: daylight, classroom fluorescent, dim room, under the projector beam.
- [ ] **Glare**: tilt until the lamp reflects on the page; if tracking drops, matte paper or a small tilt fixes it.
- [ ] Both pages on the same table: each phone reacts only to its own page.
- [ ] Turn on presenter menu > Region outlines: the coloured outlines sit on the right objects on the print.

### Every region (with Region outlines on)
- [ ] Teen wrappers: Pappu's stall, cabin 16, jaimala photo. Candidates B, D, E, the old man with the stick.
      Sounds: kanche, scarecrow, photographer, gola cart.
- [ ] Dadi wrappers: sack, kulfi, old mausi's bangles. Candidates Sanjay, A, C, chaupar partner, bearded man.
      Sounds: chaupar, rahat, pangat, resting bullocks.

### Game flow
- [ ] Scanning a wrapper: riddle written and spoken, one box per digit, replay button works.
- [ ] Right answer: meaning + "next" line, arrow to the right page, piece on **both** phones, bell, vibration (Android).
- [ ] Wrong answer: the same riddle again; on the 3rd miss the picture of the answer spot appears.
- [ ] Following "next" from any first wrapper alternates the phones and ends at the santra goli stall.
- [ ] Two wrong men: both phones show the diya for a minute, then play resumes.
- [ ] Pointing at Sanjay: voice + celebration on both phones.
- [ ] Host log shows the T→D→T flow; Export log downloads JSON.

### Tap-mode fallback
- [ ] Long-press the strip 3 s > Tap mode: the page appears; drag pans, pinch zooms; hold 0.8 s on a stall opens the lock.
- [ ] Same events appear on the host log as in camera mode (`via: tap`).
- [ ] Switch back to camera from the same menu.

### Audio
- [ ] Hindi speech voice is used (Android: Google Hindi; iPhone: Lekha). If not, install a Hindi voice in the phone's
      text-to-speech settings.
- [ ] Presenter menu > Restart audio recovers sound after a phone call / Bluetooth change.
