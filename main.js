const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// Sounds can play straight away, without waiting for a first click.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

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
    win.webContents.on('did-finish-load', () => {
      setTimeout(async () => {
        const info = await win.webContents.executeJavaScript(
          `({title:document.title,intro:!!document.querySelector('.intro'),font:document.fonts.check('20px Bungee'),bulbs:document.querySelectorAll('svg.lights circle').length})`
        );
        await win.webContents.capturePage().then((img) =>
          require('fs').writeFileSync(process.env.FS_SMOKE, img.toPNG())
        );
        // FS_SMOKE_AUDIO=<clip file> also checks that a voice clip loads from inside the packaged app.
        if (process.env.FS_SMOKE_AUDIO) {
          info.audio = await win.webContents.executeJavaScript(
            `new Promise((r)=>{const a=new Audio('voice/${process.env.FS_SMOKE_AUDIO}');a.oncanplaythrough=()=>r('ok '+a.duration.toFixed(1)+'s');a.onerror=()=>r('error '+(a.error&&a.error.code));setTimeout(()=>r('timeout'),6000);})`
          );
        }
        console.log('SMOKE', JSON.stringify({ ...info, errs }));
        app.quit();
      }, 3500);
    });
  }

  win.loadFile(path.join(__dirname, 'web', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
