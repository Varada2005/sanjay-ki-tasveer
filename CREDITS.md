# Credits and licences

## Libraries (bundled or installed)
| Library | Version | Licence | Use |
|---|---|---|---|
| MindAR (hiukim/mind-ar-js) | 1.2.5 | MIT | image tracking, target compiler (`public/vendor/mindar/`) |
| three.js | 0.160.0 | MIT | camera / pose maths (`public/vendor/three/`) |
| Express | 5.3.0 | MIT | HTTP server |
| Socket.IO | 4.8.4 | MIT | real-time rooms |
| qrcode | 1.5.4 | MIT | host-screen QR (SVG) |
| qrcode-terminal | 0.12.0 | Apache-2.0 | QR in the terminal |
| selfsigned | 5.5.0 | MIT | self-signed HTTPS certificate (mode C) |
| playwright-core (dev) | 1.64.1 | Apache-2.0 | target compiling and UI tests |
| socket.io-client (dev) | 4.8.4 | MIT | integration tests |

## Sounds
All sounds in this prototype are **synthesised at runtime** in the browser with the Web Audio API
(`public/js/audio.js`): wrapper chime, piece bell, and the stall ambiences `kulfi` (hand bell), `potter` (wheel hum
and clay taps), `marbles`, `jar`, `whistle` (clay whistle), `flute`, `pangat` (murmur and steel), `chai`, `bangles`,
`wheel` (creak), `gola` (ice shaving), `bells` (bullock bells). They are original placeholders; no third-party audio
files are included.

To use recorded ambiences, put `audio/ambient/<name>.mp3` files in place and list their sources here. Suggested
free-licence sources: freesound.org (filter by CC0), Pixabay Sound Effects (Pixabay licence), BBC Sound Effects
(RemArc licence, non-commercial only).

Voice lines are spoken by the phone's own Web Speech voice until recordings are added in `audio/{hi,mr,gu}/`.

## Art
- `assets/pages/teen.png`, `assets/pages/dadi.png`: draft artwork supplied by the author.
- Placeholder faces and torn photo (`public/assets/faces/`, `public/assets/photo/`), icons and the diya are original
  SVG drawn in code for this prototype.
