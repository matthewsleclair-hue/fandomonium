// Assembles the single-file pages: the game (web/index.html) and the phone controller (web/join.html).
// Inlines the fonts, the question bank, the host's lines and gauntlet sets, the realtime relay client and the QR code generator.
const fs = require('fs');
const path = require('path');

const src = (p) => path.join(__dirname, p);
const read = (p) => fs.readFileSync(src(p), 'utf8');
const b64 = (p) => fs.readFileSync(src(p)).toString('base64');

// Max's recorded lines (made by tools/voice.js). The clips sit next to the page in voice/.
const VOICE_DIR = process.env.VOICE_DIR || src('src/voice');
const voiceMap = fs.existsSync(path.join(VOICE_DIR, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(VOICE_DIR, 'manifest.json'), 'utf8')) : {};

const parts = {
  FONTS:
    `@font-face{font-family:'Bungee';src:url(data:font/woff2;base64,${b64('node_modules/@fontsource/bungee/files/bungee-latin-400-normal.woff2')}) format('woff2');font-weight:400;font-display:block}\n` +
    `@font-face{font-family:'Rubik';src:url(data:font/woff2;base64,${b64('node_modules/@fontsource-variable/rubik/files/rubik-latin-wght-normal.woff2')}) format('woff2');font-weight:300 900;font-display:block}`,
  BANK: read('src/bank.js'),
  CATS: read('src/cats.js'),
  SHOW: read('src/show.js'),
  MQTT: read('node_modules/mqtt/dist/mqtt.min.js'),
  QR: read('node_modules/qrcode-generator/dist/qrcode.js'),
  NET: read('src/net.js'),
  VOICE: `const VOICE=${JSON.stringify(voiceMap)};`,
};
for (const [k, v] of Object.entries(parts)) if (/<\/script/i.test(v)) throw new Error(k + ' contains a closing script tag');

function build(from, to, keys) {
  let html = read(from);
  for (const k of keys) {
    const mark = `/*${k}*/`;
    if (!html.includes(mark)) throw new Error(`${from} is missing ${mark}`);
    html = html.replace(mark, () => parts[k]);
  }
  fs.mkdirSync(src('web'), { recursive: true });
  fs.writeFileSync(src(to), html);
  console.log(to, (html.length / 1024).toFixed(0) + ' KB');
}

build('src/game.html', 'web/index.html', ['FONTS', 'CATS', 'BANK', 'SHOW', 'VOICE', 'MQTT', 'QR', 'NET']);
fs.rmSync(src('web/voice'), { recursive: true, force: true });
fs.mkdirSync(src('web/voice'), { recursive: true });
let clips = 0;
for (const f of new Set(Object.values(voiceMap))) if (fs.existsSync(path.join(VOICE_DIR, f))) { fs.copyFileSync(path.join(VOICE_DIR, f), src('web/voice/' + f)); clips++; }
console.log('web/voice', clips, 'clips of Max');
build('src/join.html', 'web/join.html', ['FONTS', 'MQTT', 'NET']);
