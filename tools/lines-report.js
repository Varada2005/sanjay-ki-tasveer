// npm run lines
// Lists every spoken line and which recordings exist, and writes audio/LINES.csv
// (lineId, language, recorded?, text) as a recording script for voice actors.
'use strict';
const fs = require('fs');
const path = require('path');
const G = require('../server/game');

const ROOT = path.join(__dirname, '..');
const { game } = G.loadData();
const L = G.lineTable(game);
const rows = [['lineId', 'lang', 'file', 'recorded', 'text']];
let missing = 0, total = 0;
for (const lang of game.languages) {
  for (const [id, v] of Object.entries(L)) {
    const text = v[lang] && !/^TODO/.test(v[lang]) ? v[lang] : `TODO (falls back to Hindi): ${v.hi}`;
    const file = `audio/${lang}/${id}.mp3`;
    const rec = fs.existsSync(path.join(ROOT, file));
    total++; if (!rec) missing++;
    rows.push([id, lang, file, rec ? 'yes' : 'no', text]);
  }
}
const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
fs.writeFileSync(path.join(ROOT, 'audio', 'LINES.csv'), '﻿' + csv);
console.log(`${Object.keys(L).length} lines x ${game.languages.length} languages = ${total} recordings; ${missing} still need recording.`);
console.log('Hindi lines:');
for (const [id, v] of Object.entries(L)) console.log(`  ${fs.existsSync(path.join(ROOT, 'audio', 'hi', id + '.mp3')) ? '[x]' : '[ ]'} ${id.padEnd(28)} ${v.hi}`);
console.log('\nWrote audio/LINES.csv (open in Excel/Sheets as a recording script).');
