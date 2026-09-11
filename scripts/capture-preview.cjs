const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1800, height: 1200, show: false, webPreferences: { offscreen: true } });
  await win.loadFile(path.join(__dirname, '..', 'preview', 'index.html'));
  await win.webContents.executeJavaScript(`new Promise(resolve => {
    const done = () => document.documentElement.dataset.ready === 'true';
    if (done()) return resolve();
    const timer = setInterval(() => { if (done()) { clearInterval(timer); resolve(); } }, 50);
  })`);
  await new Promise((resolve) => setTimeout(resolve, 800));
  const image = await win.webContents.capturePage();
  const outputDir = path.join(__dirname, '..', 'preview');
  fs.writeFileSync(path.join(outputDir, 'gardener-all-states.png'), image.toPNG());
  await win.webContents.insertCSS(`
    .art-wrap {
      overflow: hidden;
      border: 1px solid #9d8f83;
      border-radius: 22px;
      background: linear-gradient(90deg, #f5efe4 0 50%, #273b38 50%);
    }
    .art-wrap::before { display: none; }
  `);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const transparencyCheck = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, 'gardener-transparency-check.png'), transparencyCheck.toPNG());
  app.quit();
});
