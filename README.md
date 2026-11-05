# Sanjay ki Tasveer: two-phone prototype

The final spread of the phygital storybook. Two players, two printed A4 pages, two phones.
"Teen" holds the jhoola page (`teen.png`), "Dadi" holds the haat page (`dadi.png`). Each phone only
tracks and reacts to its own page. The story, puzzles and answers are in [PUZZLES.md](PUZZLES.md) (data in [data/game.json](data/game.json)); what to
draw is in [ILLUSTRATION-CHECKLIST.md](ILLUSTRATION-CHECKLIST.md). The original design note
[find-sanjay-mela-spread.md](find-sanjay-mela-spread.md) describes an earlier version of the puzzles.

```
server/      Node server: Express + Socket.IO, rooms, rules (game.js), snapshots
public/      phone app (/play), host screen (/host), vendored MindAR 1.2.5 + three 0.160.0
tools/       region editor, target compiler, face generator, lines report
data/        game.json (story, puzzles, riddles, answers), regions.json (page polygons), rooms/ (snapshots)
assets/      pages/teen.png + dadi.png (print files), targets/*.mind (compiled)
audio/       recorded lines go in audio/{hi,mr,gu}/, ambiences in audio/ambient/
tests/       A data, B simulation, C two-client integration, D UI (Playwright)
screenshots/ phone-size screenshots from the UI test
```

Requirements: Node 18 or newer (tested on Node 24), Chrome or Edge on the laptop (for `npm run targets` and the UI test).

```bash
npm install
```

```bash
npm test
```

---

## The app (what the phones show)

The phones run **Kahani Akhbaar**, a placeholder app shell (the UI team's screens will replace the styling):

1. **Language** (first time only): English, हिन्दी, मराठी, ગુજરાતી.
2. **Pair the two phones** (first time only): phone 1 taps "This is the first phone" and shows a 4-letter
   **table code** + QR; phone 2 scans that QR (or types the code). Both phones remember it from then on.
3. **Home**: this month's book ("Book of the month"), previous books below. Open it → the **book page**: 5 spreads,
   each with a title (only spread 5, "Sanjay's Photo", is playable in this prototype; the others say "coming soon").
4. **Choose your side**: the **blue circle** (jhoola page, page 9) or the **orange circle** (haat page, page 10),
   matching the dot printed on the page in front of you. A side your partner already took is greyed out.
5. It then plays by itself, nothing to press: a short **poem card** (four lines, read aloud, about 10 to 12 seconds:
   Sanjay's favourite santra goli, the wrappers he dropped, go and find them), then **"Now take your phone in your
   hands"** (about 6 seconds), then the scanner starts. The game runs **landscape**: camera full screen, a floating bar,
   the photo pieces along the bottom, a **glowing dot on every santra goli**; point the centre circle at one,
   the phone buzzes and its riddle opens.
6. The gear (home or game sidebar) opens **Settings**: language, table, tap mode, switch camera, subtitles,
   restart the spread, leave the game. "Add to Home screen" from the browser menu installs it like an app.

## Hosting: one permanent link (recommended)

A cloud host gives the app one fixed `https://` address. Phones reach it over **any** Wi-Fi or mobile data, so
changing networks (room, class) needs nothing, and there are no certificate warnings. Set up once:

1. Create a free GitHub account, make a new **private** repository, and upload this folder
   (everything except `node_modules`, `tools/bin`, `certs`, `data/rooms`, which `.gitignore` already skips).
2. Create a free account at <https://render.com> (sign in with GitHub) → **New +** → **Blueprint** → pick the
   repository → **Apply**. It reads [render.yaml](render.yaml). After about 3 minutes it shows **Live** with an
   address like `https://sanjay-ki-tasveer.onrender.com`.
3. On each phone, open `https://<your-app>.onrender.com/play` once, then browser menu → **Add to Home screen**.
   From then on, tap the icon: language, table and side are remembered.
4. Projector / laptop: `https://<your-app>.onrender.com/host?room=<table code>`.

Things to know: the free plan sleeps after 15 minutes without use and takes about 50 s to wake, so open the app
a minute before the demo (or use Render's $7 plan, or a free uptime pinger such as UptimeRobot hitting `/healthz`
every 10 minutes). To update after changes (new illustrations, new targets), upload the changed files to GitHub;
Render redeploys by itself.

The laptop modes below (tunnel, hotspot) still work for development, but their address changes with the network.

## Run modes

Camera access on phones needs HTTPS. Tap mode works over plain HTTP too.

### A) Free host with HTTPS (Render.com): the permanent link (see above)

One-time setup (about 10 minutes):

1. Put this folder in a GitHub repository (github.com > New repository > upload, or `git init`, commit and push).
   `node_modules`, `certs` and `data/rooms` are ignored by `.gitignore`.
2. Go to <https://render.com> and sign in with GitHub.
3. Click **New +** > **Blueprint**, pick the repository, click **Apply**. Render reads [render.yaml](render.yaml)
   (free web service, `npm install --omit=dev`, `npm start`, health check `/healthz`).
   Without the blueprint: **New +** > **Web Service** > pick the repo > Runtime **Node** > Build command
   `npm install --omit=dev` > Start command `npm start` > Instance type **Free** > **Create Web Service**.
4. Wait for "Live". Your URL looks like `https://sanjay-ki-tasveer.onrender.com`.
5. On the laptop open `https://<your-app>.onrender.com/host`. The QR on that page already uses the public URL.

Notes: the free plan sleeps after 15 minutes without visitors and takes about 30 to 50 s to wake up, so
open `/host` a few minutes before the demo. Room snapshots on Render are lost on every redeploy (fine for demos).
WebSockets work on Render out of the box.

### B) Laptop + Cloudflare Tunnel (or ngrok)

Install cloudflared once (Windows):

```bash
winget install --id Cloudflare.cloudflared
```

(macOS: `brew install cloudflared`.) Then:

```bash
npm run tunnel
```

The terminal prints the public `https://….trycloudflare.com` URL and a QR code for `/host`. Open that URL's
`/host` on the laptop; the room QR on the host screen points phones at the tunnel. No account is needed for
quick tunnels. Every start gives a new URL.

With ngrok instead (needs a free ngrok account and `ngrok config add-authtoken <token>` once):

```bash
npm run tunnel -- ngrok
```

### C) No internet: laptop hotspot + self-signed HTTPS

1. Turn on the laptop's mobile hotspot (Windows: Settings > Network > Mobile hotspot) and connect both phones to it.
   (Or put laptop and phones on the same Wi-Fi router.)
2. Start the HTTPS server:

   ```bash
   npm run https
   ```

   It creates `certs/key.pem` + `certs/cert.pem` for `localhost` and every LAN address of the laptop
   (remade automatically if the address changes), then prints `https://<laptop-ip>:3443/host`.
3. Open that `/host` URL on the laptop and accept the warning once (Chrome: **Advanced** > **Proceed**).
4. On each phone, scan the room QR, then accept the certificate:
   - **Android Chrome**: "Your connection is not private" > **Advanced** > **Proceed to 192.168.x.x (unsafe)**.
     The camera prompt then appears normally.
   - **iOS Safari**: "This Connection Is Not Private" > **Show Details** > **visit this website** > **Visit Website**.
     Allow the camera when asked. If the page loads but stays on the join screen, reload once (Safari sometimes
     needs the certificate accepted before the WebSocket connects).
5. Everything (MindAR, three.js, fonts, sounds) is served from the laptop; no internet needed.

Trusted certificate instead of warnings (optional, mkcert):

```bash
mkcert -install
```

```bash
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 192.168.137.1
```

Use your laptop's hotspot IP in place of `192.168.137.1`. Then copy mkcert's root CA (`mkcert -CAROOT`, file
`rootCA.pem`) to each phone and trust it: Android: Settings > Security > Encryption & credentials > Install a
certificate > CA certificate. iOS: AirDrop/mail the file, install the profile in Settings, then Settings >
General > About > Certificate Trust Settings > enable full trust. A cert you put in `certs/` yourself is never overwritten.

---

## Swapping in the final print files

1. Replace `assets/pages/teen.png` and `assets/pages/dadi.png` with the final artwork (same layout, any
   resolution; keep the A4 landscape aspect).
2. Run:

   ```bash
   npm run targets
   ```

   This compiles both PNGs into `assets/targets/teen.mind` and `dadi.mind` (about 10 s) using MindAR's own
   compiler in headless Chrome/Edge. `npm run targets -- teen` does one page. If no Chrome/Edge is found, open
   `/tools/compile.html` while the server runs and click the buttons.
3. Region coordinates are normalised (0 to 1), so they stay valid while the layout does not move. If something
   moved, open `/tools/editor.html` (server running), adjust, **Export regions.json**, and replace `data/regions.json`.
   Then run `npm test` (the data test catches overlaps and missing links).
4. Replace the placeholder photo: put the final art at `public/assets/photo/sanjay.svg` (or a PNG and change
   `"image"` in `public/assets/photo/photo.json`). The six tear polygons in `photo.json` are in a 300 x 400 space;
   move them if the features sit elsewhere. Faces for A to E are in `public/assets/faces/` (`npm run faces` regenerates placeholders).
5. Voice recordings: `npm run lines` writes `audio/LINES.csv` (every line, every language, recorded or not).
   Drop mp3s into `audio/hi/<lineId>.mp3` etc.; the phone uses them instead of the speech voice.

## Printing

- A4 landscape, **100% / Actual size** (not "fit to page"), matte paper (gloss reflects projector light and
  breaks tracking). 160 to 200 gsm card stays flat.
- Print the exact file you compiled with `npm run targets`. If you change the artwork, recompile.
- The top edge of each page is the spine; players hold the phone from the bottom edge. Tracking works at any rotation.

## Two-minute setup

1. Start the server (mode A: just open the URL; B: `npm run tunnel`; C: `npm run https`).
2. Laptop: open `/host`. A room is created and its QR shown (projector-friendly).
3. Phone 1 scans the QR > taps the **giant wheel** (Teen) > **हिन्दी** > the big **santra goli** button > allows the camera.
4. Phone 2 scans the same QR > taps the **neem tree** (Dadi) > language > santra goli.
5. Both green dots on the host = ready. Point a phone at a santra goli on its page: the riddle opens.

Turn the phone volume up; the phone's mute switch silences Web Speech on iPhone.

## When something goes wrong

| Problem | Fix |
|---|---|
| A phone locked, lost Wi-Fi or reloaded | Just reopen the page. Room and role are remembered; the phone rejoins and gets the full state. |
| A phone died, using a different phone | After the old phone has been offline 30 s, the new phone can take its role on the join screen. Or host > **Reset + free both phones**. |
| Tracking struggles (projector glare, dim light) | Long-press the photo strip at the top for 3 s > **Tap mode**. The phone shows its page; press and hold on a spot for the same effect. Turn it off the same way. |
| No sound | Presenter menu > **Restart audio**. Check the silent switch. |
| Professors want to read the lines | Presenter menu > **Subtitles**. |
| Check region alignment live | Presenter menu > **Region outlines** (also works on the camera view). |
| Want to start over | Presenter menu > **Reset room** (tap twice), or host > **Reset room**. |
| Server restarted | Rooms resume from `data/rooms/*.json`; phones reconnect by themselves. |

## Ten-minute demo script for professors

1. **(1 min) The story.** Show both printed pages side by side across the fold. "Dadi's brother Sanjay left after
   her wedding in 1982. Every evening he waits at the santra goli stall. Today he left a trail of santra goli
   wrappers, each with a childhood riddle and a piece of his torn photo."
2. **(1 min) Joining.** Show `/host` on the projector. Two volunteers scan the QR, pick Teen (giant wheel) and
   Dadi (neem tree), language, santra goli button.
3. **(2 min) Puzzle 1.** Dadi scans the wrapper on the sack marked PAPPU. Her phone shows and speaks a rhyming
   riddle: Pappu's stall is across, his name in Hindi, type the number beside it. Teen finds **पप्पू २३**.
   Dadi types 23. Sanjay explains (that's Pappu's stall, he bought a pinwheel there) and sends them to Pappu's
   stall on the Teen page. The red head-cloth piece flies into the strip on **both** phones.
4. **(2 min) Puzzle 2, with misses.** Teen scans the wrapper at Pappu's stall: kulfi in red cloth, the price on the
   slate. Type a wrong number on purpose three times: the riddle repeats, then a **picture clue** of the kulfi
   slate on Dadi's page appears. Type 15.
5. **(1 min) Host screen.** Puzzles opened and solved, wrong tries as dots, the torn photo filling, the D→T→D page
   flow, the event log (export JSON). Answers and their meanings are listed for the presenter.
6. **(1 min) Puzzles 3 and 4 quickly.** The torn ticket ("1" + "6" = cabin 16), then cabin 16 → the old mausi's
   price board (40). Point out that every number is part of the story: a stall, a price, a cabin, a year, a time.
7. **(1 min) The photo.** Tap the strip: five of six men wear red, so red alone isn't enough. Point at a wrong man
   (he answers in his own voice); a second wrong guess rests both phones under a sleeping diya for a minute.
8. **(1 min) The finale.** Puzzles 5 (1982) and 6 (5:30), then point at Sanjay at the santra goli stall: his voice,
   his full face, santra goli confetti on both phones.
Questions: [PUZZLES.md](PUZZLES.md) for the logic, region outlines in the presenter menu, `npm test` output.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | HTTP server on port 3000 (Render, tap-mode tests) |
| `npm run https` | HTTPS on port 3443 with a self-signed certificate (mode C) |
| `npm run tunnel` | HTTP server + Cloudflare quick tunnel; `-- ngrok` for ngrok (mode B) |
| `npm run targets` | compile `assets/pages/*.png` into `assets/targets/*.mind` |
| `npm run faces` | regenerate placeholder faces and the photo from the face table |
| `npm run lines` | recording script + missing recordings (`audio/LINES.csv`) |
| `npm test` | data, 100k-run simulation, two-client integration, Playwright UI + screenshots |

Pointer accuracy and what to export for it: [AR-ACCURACY.md](AR-ACCURACY.md). Answers and the step-by-step flow for presenters: [ANSWERS.md](ANSWERS.md).

Pages: `/host` (laptop), `/play?room=XXXX` (phones), `/tools/editor.html` (regions), `/tools/compile.html` (manual target compile).

Privacy: no microphone, no recording, no analytics, no AI. Logs stay in `data/rooms/` until you export them from the host screen.
