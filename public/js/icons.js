// Inline SVG pictures for the phone. Play screens use pictures, not words.
const I = {};

I.jhoola = `<svg viewBox="0 0 120 120" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round">
<circle cx="60" cy="52" r="36"/><circle cx="60" cy="52" r="7" fill="currentColor"/>
${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = (a * Math.PI) / 180; return `<line x1="60" y1="52" x2="${60 + 36 * Math.cos(r)}" y2="${52 + 36 * Math.sin(r)}"/>`; }).join('')}
<path d="M44 112 L60 52 L76 112"/></g>
${[0, 60, 120, 180, 240, 300].map((a, i) => { const r = (a * Math.PI) / 180; return `<rect x="${52 + 36 * Math.cos(r)}" y="${48 + 36 * Math.sin(r)}" width="16" height="13" rx="3" fill="${['#e94f37', '#f6c445', '#3f88c5', '#e94f37', '#44af69', '#f6c445'][i]}" stroke="currentColor" stroke-width="2.5"/>`; }).join('')}</svg>`;

I.neem = `<svg viewBox="0 0 120 120" aria-hidden="true">
<path d="M58 112 C56 90 60 76 54 62 M62 112 C64 92 60 80 70 64" stroke="#7a4a2a" stroke-width="7" fill="none" stroke-linecap="round"/>
<g fill="#5f9e3b" stroke="currentColor" stroke-width="2.5"><circle cx="40" cy="44" r="20"/><circle cx="62" cy="30" r="22"/><circle cx="84" cy="46" r="19"/><circle cx="60" cy="56" r="16"/></g>
<g transform="translate(18 92)"><rect x="0" y="0" width="84" height="22" rx="4" fill="#d9534f" stroke="currentColor" stroke-width="2.5"/>
<rect x="34" y="0" width="16" height="22" fill="#f4e3c1" stroke="currentColor" stroke-width="2"/><rect x="0" y="7" width="84" height="8" fill="#f4e3c1" stroke="currentColor" stroke-width="2"/>
<ellipse cx="14" cy="11" rx="5" ry="3.5" fill="#fff" stroke="currentColor" stroke-width="1.5"/><ellipse cx="68" cy="11" rx="5" ry="3.5" fill="#fff" stroke="currentColor" stroke-width="1.5"/></g></svg>`;

I.peppermint = `<svg viewBox="0 0 100 60" aria-hidden="true">
<path d="M4 30 L24 14 L24 46 Z M96 30 L76 14 L76 46 Z" fill="#f2f2f2" stroke="#c0262d" stroke-width="3" stroke-linejoin="round"/>
<path d="M8 30 L24 22 M8 30 L24 38 M92 30 L76 22 M92 30 L76 38" stroke="#c0262d" stroke-width="2.5"/>
<circle cx="50" cy="30" r="24" fill="#fff" stroke="#c0262d" stroke-width="3"/>
<path d="M50 6 A24 24 0 0 1 74 30 L50 30Z M50 54 A24 24 0 0 1 26 30 L50 30Z" fill="#d7262e"/>
<path d="M50 30 L50 6 M50 30 L26 30" stroke="#d7262e" stroke-width="0"/></svg>`;

I.hint = `<svg viewBox="0 0 200 200" aria-hidden="true">
<g transform="rotate(-6 100 140)"><rect x="18" y="118" width="164" height="64" rx="4" fill="#f4e7cc" stroke="#fff" stroke-width="3"/>
<g fill="none" stroke="#c9a874" stroke-width="3" stroke-linecap="round"><path d="M36 136h40M36 148h60M110 140h50M110 160h34M36 166h30"/><circle cx="90" cy="160" r="6"/></g></g>
<g class="hint-phone"><rect x="70" y="16" width="62" height="104" rx="10" fill="#222" stroke="#fff" stroke-width="4"/><rect x="77" y="26" width="48" height="80" rx="3" fill="#7fb7e0"/>
<path d="M101 56v20M91 66h20" stroke="#fff" stroke-width="3"/>
<path d="M58 98 q-6 -20 10 -28 l10 -4 q6 0 6 8 l-2 30 q30 6 26 24 l-6 20 h-36 z" fill="#d79a6a" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></g></svg>`;

I.diya = `<svg viewBox="0 0 200 200" aria-hidden="true">
<ellipse cx="100" cy="176" rx="70" ry="8" fill="rgba(0,0,0,.25)"/>
<path class="flame" d="M100 70 C88 92 86 108 100 120 C114 108 112 92 100 70Z" fill="#ffb648"/>
<path class="flame-in" d="M100 92 C94 104 94 112 100 118 C106 112 106 104 100 92Z" fill="#fff1c1"/>
<path d="M30 132 C40 166 160 166 170 132 C150 140 120 142 100 142 C80 142 50 140 30 132Z" fill="#b5532a" stroke="#6b2a12" stroke-width="3"/>
<path d="M150 136 q20 -10 26 -26" fill="none" stroke="#b5532a" stroke-width="8" stroke-linecap="round"/>
<path d="M40 140 q60 18 120 0" fill="none" stroke="#e8a04a" stroke-width="3" opacity=".7"/></svg>`;

I.back = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M18 10h22a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H18L4 24Z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/><path d="M22 18l12 12M34 18L22 30" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>`;
I.play = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M16 10 L38 24 L16 38Z" fill="currentColor"/></svg>`;
I.camera = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 16h8l4-6h12l4 6h8v22H6z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/><circle cx="24" cy="26" r="7" fill="none" stroke="currentColor" stroke-width="3.5"/></svg>`;
I.tap = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M20 22V9a3 3 0 0 1 6 0v12l9 2a4 4 0 0 1 3 5l-3 12H19l-7-11a3 3 0 0 1 5-3l3 3" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/></svg>`;
I.reset = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M38 24a14 14 0 1 1-4-10" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M36 4v12H24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/></svg>`;
I.sound = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 18h8l10-8v28l-10-8H8z" fill="currentColor"/><path d="M32 16a10 10 0 0 1 0 16M36 10a18 18 0 0 1 0 28" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>`;
I.subs = `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="10" width="38" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="3.5"/><path d="M11 26h10M25 26h12M11 32h18" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>`;
I.bug = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 8h32v32H8z" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="5 4"/><path d="M14 30l8-14 6 10 6-6" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/></svg>`;
I.close = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 12l24 24M36 12L12 36" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`;
I.swap = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 16h28l-6-6M40 32H12l6 6" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
I.arrow = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 24h30M26 12l12 12-12 12" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
I.eye = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 24s8-12 20-12 20 12 20 12-8 12-20 12S4 24 4 24z" fill="none" stroke="currentColor" stroke-width="3.5"/><circle cx="24" cy="24" r="6" fill="currentColor"/></svg>`;

I.gear = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 15a9 9 0 1 0 0 18a9 9 0 0 0 0-18z" fill="none" stroke="currentColor" stroke-width="3.5"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.9 9.9l4.2 4.2M33.9 33.9l4.2 4.2M9.9 38.1l4.2-4.2M33.9 14.1l4.2-4.2" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>`;
I.chev = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M30 10L16 24l14 14" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
// An inverted-V stand with a page on it and a phone lying landscape on its ledge.
I.stand = `<svg viewBox="0 0 240 170" aria-hidden="true">
<path d="M60 150 L120 28 L180 150" fill="none" stroke="#2e9b6a" stroke-width="10" stroke-linejoin="round"/>
<path d="M78 120 L120 34 L162 120" fill="#f4e7cc" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
<circle cx="102" cy="96" r="7" fill="#2f6fd6" stroke="#fff" stroke-width="2"/><circle cx="138" cy="96" r="7" fill="#f2b316" stroke="#fff" stroke-width="2"/>
<path d="M30 150 H210" stroke="#2e9b6a" stroke-width="8" stroke-linecap="round"/>
<g class="stand-phone"><rect x="34" y="124" width="58" height="30" rx="5" fill="#222" stroke="#fff" stroke-width="3" transform="rotate(-8 63 139)"/></g>
<g class="stand-phone"><rect x="148" y="124" width="58" height="30" rx="5" fill="#222" stroke="#fff" stroke-width="3" transform="rotate(8 177 139)"/></g></svg>`;
I.rotate = `<svg viewBox="0 0 120 120" aria-hidden="true"><g class="rot-phone"><rect x="40" y="18" width="40" height="72" rx="7" fill="#222" stroke="#fff" stroke-width="4"/><rect x="46" y="26" width="28" height="54" rx="2" fill="#7fb7e0"/></g>
<path d="M96 60a36 36 0 0 1-36 36" fill="none" stroke="#f2b33d" stroke-width="5" stroke-linecap="round"/><path d="M58 88l4 9 9-4" fill="none" stroke="#f2b33d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

I.playSolid = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5z" fill="currentColor"/></svg>`;
I.playLine = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.2v13.6a.8.8 0 0 0 1.2.7l11-6.8a.8.8 0 0 0 0-1.4l-11-6.8A.8.8 0 0 0 7 5.2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
I.home = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.4 12 3.5l8 6.9V19a2 2 0 0 1-2 2h-3.5v-5.5h-5V21H6a2 2 0 0 1-2-2z" fill="currentColor"/></svg>`;
I.search = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
I.user = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 21c.6-4 3.6-6.2 7.5-6.2s6.9 2.2 7.5 6.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

I.bookOpen = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5.2C4.6 4 7.6 4 11 5.4V20c-3.3-1.4-6.4-1.4-9-.2zM22 5.2C19.4 4 16.4 4 13 5.4V20c3.3-1.4 6.4-1.4 9-.2z" fill="currentColor"/></svg>`;

export default I;
