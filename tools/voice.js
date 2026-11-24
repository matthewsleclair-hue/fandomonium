#!/usr/bin/env node
// Records Max the host's lines with ElevenLabs, one clip per line, into src/voice/.
// Only lines without a clip are sent, so re-running after you add a line costs just that line.
//
//   node tools/voice.js --check     what would be recorded, and how many characters (no key needed)
//   node tools/voice.js --voices    list the voices on your ElevenLabs account
//   node tools/voice.js             record any missing clips
//
// Needs ELEVENLABS_API_KEY in the environment. Optional: ELEVENLABS_VOICE_ID and ELEVENLABS_MODEL,
// which are saved to src/voice/voice.json so later runs keep the same voice.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__dirname, '..', 'src', 'voice');
const API = 'https://api.elevenlabs.io/v1';
const KEY = process.env.ELEVENLABS_API_KEY || '';
const args = process.argv.slice(2);

// Every spoken line from src/show.js. A line written ["shown", "spoken"] is recorded as "spoken".
function lines() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'show.js'), 'utf8');
  const { HOST } = new Function(code + '\nreturn {HOST};')();
  const out = new Set();
  const add = (arr, where) => arr.forEach((l) => {
    const spoken = Array.isArray(l) ? l[1] : l;
    if (/\{\w\}/.test(spoken)) throw new Error(`${where}: "${spoken}" has a name or number in it. Write it as ["shown", "spoken"].`);
    out.add(spoken);
  });
  for (const [k, v] of Object.entries(HOST)) {
    if (k === 'fan') for (const [f, arr] of Object.entries(v)) add(arr, 'fan.' + f);
    else add(v, k);
  }
  return [...out];
}

function config() {
  const file = path.join(DIR, 'voice.json');
  const saved = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const cfg = {
    // George, the voice in ElevenLabs' own examples. Pick your own with --voices.
    voice: process.env.ELEVENLABS_VOICE_ID || saved.voice || 'JBFqnCBsd6RMkjVDRZzb',
    model: process.env.ELEVENLABS_MODEL || saved.model || 'eleven_multilingual_v2',
    // Lower stability and some style make for a livelier, snarkier read.
    settings: saved.settings || { stability: 0.35, similarity_boost: 0.8, style: 0.4, use_speaker_boost: true },
  };
  return { cfg, file };
}

const fileFor = (cfg, text) =>
  crypto.createHash('sha1').update(JSON.stringify([cfg.voice, cfg.model, cfg.settings, text])).digest('hex').slice(0, 12) + '.mp3';

async function call(url, init, tries = 5) {
  for (let i = 1; ; i++) {
    const res = await fetch(url, init);
    if (res.ok) return res;
    const body = await res.text();
    let msg = body;
    try { const d = JSON.parse(body).detail; msg = (d && (d.message || d.status)) || body; } catch (e) {}
    if (res.status === 401) throw new Error('ElevenLabs rejected the API key (401). Check ELEVENLABS_API_KEY.');
    if ((res.status === 429 || res.status >= 500) && i < tries) {
      const wait = 2000 * i;
      console.log(`  busy (${res.status}), trying again in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    throw new Error(`ElevenLabs said ${res.status}: ${String(msg).slice(0, 300)}`);
  }
}

async function listVoices() {
  const res = await call(`${API}/voices`, { headers: { 'xi-api-key': KEY } });
  const { voices } = await res.json();
  for (const v of voices) {
    const l = v.labels || {};
    console.log(`${v.voice_id}  ${v.name}  ${[l.gender, l.age, l.accent, l.description || l.descriptive, l.use_case].filter(Boolean).join(', ')}`);
  }
  console.log(`\nPick one, then run: ELEVENLABS_VOICE_ID=<id> node tools/voice.js`);
}

async function main() {
  const { cfg, file } = config();
  const all = lines();
  const want = Object.fromEntries(all.map((t) => [t, fileFor(cfg, t)]));
  fs.mkdirSync(DIR, { recursive: true });
  const missing = all.filter((t) => !fs.existsSync(path.join(DIR, want[t])));
  const chars = missing.reduce((s, t) => s + t.length, 0);

  if (args.includes('--check') || (!KEY && !args.includes('--voices'))) {
    console.log(`${all.length} lines, ${missing.length} without a clip (${chars} characters to record).`);
    console.log(`Voice ${cfg.voice}, model ${cfg.model}.`);
    if (!KEY) console.log('Set ELEVENLABS_API_KEY to record them.');
    return;
  }
  if (args.includes('--voices')) return listVoices();

  console.log(`Recording ${missing.length} of ${all.length} lines (${chars} characters) with voice ${cfg.voice}, model ${cfg.model}.`);
  let done = 0;
  const work = missing.slice();
  async function worker() {
    for (let t; (t = work.shift()) !== undefined;) {
      const res = await call(`${API}/text-to-speech/${encodeURIComponent(cfg.voice)}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text: t, model_id: cfg.model, voice_settings: cfg.settings }),
      });
      fs.writeFileSync(path.join(DIR, want[t]), Buffer.from(await res.arrayBuffer()));
      console.log(`  ${++done}/${missing.length}  ${t}`);
    }
  }
  try {
    await Promise.all([worker(), worker()]);
  } finally {
    // Save whatever was recorded, so a run cut short by the quota can pick up where it stopped.
    const have = Object.fromEntries(Object.entries(want).filter(([, f]) => fs.existsSync(path.join(DIR, f))));
    fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(have, null, 1) + '\n');
    fs.writeFileSync(file, JSON.stringify(cfg, null, 1) + '\n');
    // Clips for lines that were removed or recorded with an older voice.
    const keep = new Set(Object.values(want));
    for (const f of fs.readdirSync(DIR)) if (f.endsWith('.mp3') && !keep.has(f)) fs.unlinkSync(path.join(DIR, f));
    console.log(`${Object.keys(have).length} of ${all.length} lines have a clip.`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
