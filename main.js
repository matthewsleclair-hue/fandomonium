const { app, BrowserWindow, Menu, shell, net, session } = require('electron');
const path = require('path');

// The app plays the latest game from the website, so every update reaches it without a new download.
// Offline, or if the website can't be reached, it plays the copy built into the app.
const LIVE = process.env.FS_URL || 'https://matthewsleclair-hue.github.io/fandomonium/play/';
const LOCAL = path.join(__dirname, 'web', 'index.html');

// Sounds can play straight away, without waiting for a first click.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function loadGame(win) {
  const wc = win.webContents;
  const local = () => win.loadFile(LOCAL);
  // The self-test checks the built-in copy unless it's given a URL.
  if (process.env.FS_OFFLINE || (process.env.FS_SMOKE && !process.env.FS_URL) || !net.isOnline()) return local();

  let settled = false;
  const done = () => { settled = true; clearTimeout(timer); wc.off('did-fail-load', onFail); wc.off('did-navigate', onNav); };
  const fallback = () => { if (settled) return; done(); console.log('LOAD built-in copy'); local(); };
  const onFail = (e, code, desc, url, isMain) => { if (isMain) fallback(); };
  const onNav = (e, url, status) => { if (status >= 400) fallback(); };
  const timer = setTimeout(() => { wc.stop(); fallback(); }, 12000);
  wc.on('did-fail-load', onFail);
  wc.on('did-navigate', onNav);
  wc.once('did-finish-load', async () => {
    if (settled) return;
    // Make sure it's really the game (not a Wi-Fi sign-in page or an error page) before keeping it.
    let ok = false;
    try { ok = await wc.executeJavaScript(`!!document.getElementById('screen')&&!!document.querySelector('.curtains')`); } catch (e) {}
    if (!ok) return fallback();
    done();
    console.log('LOAD live', LIVE);
  });
  win.loadURL(LIVE, { extraHeaders: 'pragma: no-cache\ncache-control: no-cache\n' }).catch(() => {});
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#4c0711',
    title: 'Fandomonium',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: false,
    },
  });

  Menu.setApplicationMenu(null);
  // The game only ever needs full screen.
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(permission === 'fullscreen'));

  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });

  // F11 toggles full screen; Esc leaves it.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    } else if (input.key === 'Escape' && win.isFullScreen()) {
      win.setFullScreen(false);
    }
  });

  // Any outside link opens in the normal browser, never inside the game.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  // Test hook: report page errors and quit (used only by the build check).
  if (process.env.FS_SMOKE) {
    const errs = [];
    win.webContents.on('console-message', (e) => {
      const level = e.level ?? e;
      if (level === 'error' || level === 3) errs.push(e.message);
    });
    let timer = 0;
    // Wait for the last page to finish loading (the live site, or the built-in copy after a fallback).
    win.webContents.on('did-finish-load', () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const info = await win.webContents.executeJavaScript(
          `({title:document.title,url:location.protocol+'//'+location.host+location.pathname,intro:!!document.querySelector('.intro'),font:document.fonts.check('20px Bungee'),bulbs:document.querySelectorAll('svg.lights circle').length})`
        );
        // FS_SMOKE_AUDIO=<clip file> also checks that a voice clip loads.
        if (process.env.FS_SMOKE_AUDIO) {
          info.audio = await win.webContents.executeJavaScript(
            `new Promise((r)=>{const a=new Audio('voice/${process.env.FS_SMOKE_AUDIO}');a.oncanplaythrough=()=>r('ok '+a.duration.toFixed(1)+'s');a.onerror=()=>r('error '+(a.error&&a.error.code));setTimeout(()=>r('timeout'),6000);})`
          );
        }
        await win.webContents.capturePage().then((img) =>
          require('fs').writeFileSync(process.env.FS_SMOKE, img.toPNG())
        );
        console.log('SMOKE', JSON.stringify({ ...info, errs }));
        app.quit();
      }, 3500);
    });
  }

  loadGame(win);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
