const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('Capacitor', {
  isNativePlatform: () => true,
  getPlatform: () => process.platform,
  Plugins: {
    Cinema: {
      start: () => ipcRenderer.invoke('cinema:start'),
      stop: () => ipcRenderer.invoke('cinema:stop'),
      reconnect: () => ipcRenderer.invoke('cinema:reconnect'),
      getStatus: () => ipcRenderer.invoke('cinema:getStatus'),
      openExternal: (url) => ipcRenderer.invoke('cinema:openExternal', url),
      getDeviceInfo: () => ipcRenderer.invoke('cinema:getDeviceInfo'),
      getAutoStart: () => ipcRenderer.invoke('cinema:getAutoStart'),
      toggleAutoStart: (val) => ipcRenderer.invoke('cinema:toggleAutoStart', val),
      downloadAndInstall: (data) => ipcRenderer.invoke('cinema:downloadAndInstall', data),
      getVersion: () => ipcRenderer.invoke('cinema:getVersion'),
      onUpdateProgress: (cb) => ipcRenderer.on('cinema:updateProgress', (_, data) => cb(data)),
      addListener: (event, cb) => {
        if (event === 'updateProgress') {
          ipcRenderer.on('cinema:updateProgress', (_, data) => cb(data));
        }
      },
      windowAction: (action) => ipcRenderer.invoke('cinema:windowAction', action),
      onRevoked: (cb) => ipcRenderer.on('cinema:revoked', (_, data) => cb(data)),
    },
  },
});
