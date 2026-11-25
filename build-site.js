// Builds the GitHub Pages site into site/: landing page, the playable game, screenshots and fonts.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

require('./build-web.js'); // writes web/index.html

const R = (p) => path.join(__dirname, p);
const copy = (from, to) => { fs.mkdirSync(path.dirname(R(to)), { recursive: true }); fs.copyFileSync(R(from), R(to)); };

// Count questions per fandom straight from the bank, so the site never goes stale.
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(R('src/bank.js'), 'utf8') + '\n' + fs.readFileSync(R('src/cats.js'), 'utf8') + '\nthis.BANK = BANK; this.CATS = CATS; this.FICON = FICON;', ctx);
const counts = {};
let total = 0;
let hard = 0;
for (const [key, b] of Object.entries(ctx.BANK)) {
  counts[key] = ['mc', 'odd', 'seq', 'scr', 'who', 'emo'].reduce((s, t) => s + (b[t] || []).length, 0);
  for (const t of ['mc', 'odd', 'seq', 'scr', 'who', 'emo']) for (const q of b[t] || []) if (q[0] === 3) hard++;
  total += counts[key];
}

fs.rmSync(R('site'), { recursive: true, force: true });
fs.mkdirSync(R('site/play'), { recursive: true });
fs.writeFileSync(R('site/play/index.html'), fs.readFileSync(R('web/index.html'), 'utf8').replace('<title>Fandomonium</title>', '<title>Fandomonium</title>\n<link rel="icon" href="../icon.png">'));
fs.mkdirSync(R('site/join'), { recursive: true });
fs.copyFileSync(R('web/join.html'), R('site/join/index.html'));
fs.cpSync(R('web/voice'), R('site/play/voice'), { recursive: true });
copy('icon.png', 'site/icon.png');
copy('node_modules/@fontsource/bungee/files/bungee-latin-400-normal.woff2', 'site/fonts/bungee.woff2');
copy('node_modules/@fontsource-variable/rubik/files/rubik-latin-wght-normal.woff2', 'site/fonts/rubik.woff2');
for (const f of fs.readdirSync(R('docs/screenshots'))) copy(`docs/screenshots/${f}`, `site/img/${f}`);

let html = fs.readFileSync(R('site-src/index.html'), 'utf8').replaceAll('{{TOTAL}}', total.toLocaleString('en-US'));
for (const [k, n] of Object.entries(counts)) html = html.replaceAll(`{{N_${k}}}`, String(n));
html = html.replaceAll('{{HARD}}', String(hard));
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
html = html.replaceAll('{{NFAN}}', String(Object.keys(ctx.CATS).length));
html = html.replace('{{FANDOMS}}', Object.entries(ctx.CATS).map(([k, c]) =>
  `<div class="fan" style="--c:${c.c}"><svg viewBox="0 0 24 24" aria-hidden="true">${ctx.FICON[c.i]}</svg><div><b>${esc(c.n)}</b><span>${counts[k]} questions</span></div></div>`).join('\n      '));
const left = html.match(/\{\{[A-Za-z_]+\}\}/);
if (left) throw new Error('unfilled placeholder ' + left[0]);
fs.writeFileSync(R('site/index.html'), html);
fs.writeFileSync(R('site/.nojekyll'), '');
console.log('site/ built:', total, 'questions', JSON.stringify(counts));
