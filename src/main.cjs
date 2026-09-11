const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen } = require('electron');
const path = require('path');
const { CodexStatusMonitor } = require('./codex-status.cjs');

let petWindow;
let tray;
let codexMonitor;

function clampToWorkArea(bounds) {
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;
  return {
    x: Math.min(Math.max(bounds.x, area.x - 50), area.x + area.width - 80),
    y: Math.min(Math.max(bounds.y, area.y), area.y + area.height - 120)
  };
}

function createWindow() {
  const primary = screen.getPrimaryDisplay().workArea;
  petWindow = new BrowserWindow({
    width: 275,
    height: 300,
    x: primary.x + primary.width - 300,
    y: primary.y + primary.height - 325,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  petWindow.setAlwaysOnTop(true, 'floating');
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWindow.loadFile(path.join(__dirname, 'index.html'));
  petWindow.once('ready-to-show', () => petWindow.showInactive());
  petWindow.webContents.on('did-finish-load', () => {
    codexMonitor?.stop();
    codexMonitor = new CodexStatusMonitor({
      sessionsRoot: path.join(app.getPath('home'), '.codex', 'sessions'),
      onState: (state) => petWindow?.webContents.send('codex:state', state)
    });
    codexMonitor.start();
  });
  petWindow.on('closed', () => {
    codexMonitor?.stop();
    codexMonitor = null;
    petWindow = null;
  });

  ipcMain.handle('pet:set-size', (_event, compact) => {
    if (!petWindow) return;
    const old = petWindow.getBounds();
    const next = compact ? { width: 275, height: 300 } : { width: 275, height: 445 };
    const point = clampToWorkArea({ ...old, ...next });
    petWindow.setBounds({ ...point, ...next }, true);
  });

  ipcMain.on('pet:quit', () => app.quit());
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'icon.png')).resize({ width: 18, height: 18 });
  tray = new Tray(icon);
  tray.setToolTip('园丁桌宠');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '叫回园丁', click: () => petWindow?.show() },
    { label: '隐藏', click: () => petWindow?.hide() },
    { type: 'separator' },
    { label: '退出园丁桌宠', click: () => app.quit() }
  ]));
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock?.hide();
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!petWindow) createWindow();
  else petWindow.show();
});
