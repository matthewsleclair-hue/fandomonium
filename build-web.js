// Assembles the single-file game: inlines the question bank and the two fonts.
const fs = require('fs');
const path = require('path');

const src = (p) => path.join(__dirname, p);
const b64 = (p) => fs.readFileSync(src(p)).toString('base64');

const fonts =
  `@font-face{font-family:'Bungee';src:url(data:font/woff2;base64,${b64('node_modules/@fontsource/bungee/files/bungee-latin-400-normal.woff2')}) format('woff2');font-weight:400;font-display:block}\n` +
  `@font-face{font-family:'Rubik';src:url(data:font/woff2;base64,${b64('node_modules/@fontsource-variable/rubik/files/rubik-latin-wght-normal.woff2')}) format('woff2');font-weight:300 900;font-display:block}`;

let html = fs.readFileSync(src('src/game.html'), 'utf8');
const bank = fs.readFileSync(src('src/bank.js'), 'utf8');
if (!html.includes('/*FONTS*/') || !html.includes('/*BANK*/')) throw new Error('placeholders missing');
html = html.replace('/*FONTS*/', () => fonts).replace('/*BANK*/', () => bank);

fs.mkdirSync(src('web'), { recursive: true });
fs.writeFileSync(src('web/index.html'), html);
console.log('web/index.html', (html.length / 1024).toFixed(0) + ' KB');
