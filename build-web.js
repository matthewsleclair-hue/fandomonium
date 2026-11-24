// Assembles the single-file pages: the game (web/index.html) and the phone controller (web/join.html).
// Inlines the fonts, the question bank, the realtime relay client and the QR code generator.
const fs = require('fs');
const path = require('path');

const src = (p) => path.join(__dirname, p);
const read = (p) => fs.readFileSync(src(p), 'utf8');
const b64 = (p) => fs.readFileSync(src(p)).toString('base64');

const parts = {
  FONTS:
    `@font-face{font-family:'Bungee';src:url(data:font/woff2;base64,${b64('node_modules/@fontsource/bungee/files/bungee-latin-400-normal.woff2')}) format('woff2');font-weight:400;font-display:block}\n` +
    `@font-face{font-family:'Rubik';src:url(data:font/woff2;base64,${b64('node_modules/@fontsource-variable/rubik/files/rubik-latin-wght-normal.woff2')}) format('woff2');font-weight:300 900;font-display:block}`,
  BANK: read('src/bank.js'),
  MQTT: read('node_modules/mqtt/dist/mqtt.min.js'),
  QR: read('node_modules/qrcode-generator/dist/qrcode.js'),
  NET: read('src/net.js'),
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

build('src/game.html', 'web/index.html', ['FONTS', 'BANK', 'MQTT', 'QR', 'NET']);
build('src/join.html', 'web/join.html', ['FONTS', 'MQTT', 'NET']);
