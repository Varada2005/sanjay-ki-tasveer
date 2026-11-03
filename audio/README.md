# Audio

- Voice lines: `audio/{lang}/{lineId}.mp3` (lang = `hi`, `mr`, `gu`). Example: `audio/hi/t1.siteSolved.mp3`.
  Any line without a file is spoken with the phone's Web Speech voice instead.
- Run `npm run lines` to get `audio/LINES.csv`, the full recording script with what is still missing.
- Stall ambiences: `audio/ambient/{name}.mp3` replaces the built-in synthesised sound of the same name
  (`kulfi, potter, marbles, jar, whistle, flute, pangat, chai, bangles, wheel, gola, bells`).
- Keep files short (1 to 8 s), mono, 64 to 96 kbps mp3.
