const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  ipcMain.handle('pet:set-size', () => true);
  ipcMain.on('pet:quit', () => {});
  const win = new BrowserWindow({
    width: 275,
    height: 445,
    show: false,
    webPreferences: {
      offscreen: true,
      preload: path.join(__dirname, '..', 'src', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  await new Promise((resolve) => setTimeout(resolve, 800));

  const result = await win.webContents.executeJavaScript(`(async () => {
    const sample = () => {
      const canvas = document.querySelector('#pet-canvas');
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let hash = 2166136261;
      for (let i = 0; i < pixels.length; i += 4096) hash = Math.imul(hash ^ pixels[i], 16777619);
      return hash >>> 0;
    };
    const idleHash = sample();
    return { idleHash };
  })()`);

  win.webContents.send('codex:state', 'working');
  await new Promise((resolve) => setTimeout(resolve, 400));
  result.working = await win.webContents.executeJavaScript(`({
    classApplied: document.querySelector('#pet-app').classList.contains('working'),
    label: document.querySelector('#status-label').textContent,
    bubbleVisible: document.querySelector('#speech').classList.contains('visible'),
    bubbleText: document.querySelector('#speech-text').textContent,
    hash: (() => {
      const canvas = document.querySelector('#pet-canvas');
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let hash = 2166136261;
      for (let i = 0; i < pixels.length; i += 4096) hash = Math.imul(hash ^ pixels[i], 16777619);
      return hash >>> 0;
    })()
  })`);

  win.webContents.send('codex:state', 'complete');
  await new Promise((resolve) => setTimeout(resolve, 400));
  result.complete = await win.webContents.executeJavaScript(`({
    classApplied: document.querySelector('#pet-app').classList.contains('complete'),
    label: document.querySelector('#status-label').textContent,
    bubbleVisible: document.querySelector('#speech').classList.contains('visible'),
    bubbleText: document.querySelector('#speech-text').textContent,
    hash: (() => {
      const canvas = document.querySelector('#pet-canvas');
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let hash = 2166136261;
      for (let i = 0; i < pixels.length; i += 4096) hash = Math.imul(hash ^ pixels[i], 16777619);
      return hash >>> 0;
    })()
  })`);

  const passed = result.working.classApplied
    && result.working.label === '任务进行中'
    && result.working.bubbleVisible
    && result.working.bubbleText.length > 0
    && result.working.hash !== result.idleHash
    && result.complete.classApplied
    && result.complete.label === '任务完成'
    && result.complete.bubbleVisible
    && result.complete.bubbleText.length > 0
    && result.complete.bubbleText !== result.working.bubbleText
    && result.complete.hash !== result.working.hash;

  process.stdout.write(`${JSON.stringify({ passed, ...result }, null, 2)}\n`);
  app.exit(passed ? 0 : 1);
});
