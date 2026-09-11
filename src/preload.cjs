const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  setCompact: (compact) => ipcRenderer.invoke('pet:set-size', compact),
  quit: () => ipcRenderer.send('pet:quit'),
  onCodexState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('codex:state', listener);
    return () => ipcRenderer.removeListener('codex:state', listener);
  }
});
