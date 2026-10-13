const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('CinemaDesktop', {
  isDesktop: true,
  platform: process.platform,
  version: '4.1.0',

  // Direct VLC Playback (Cross-Platform)
  playInVlc: (streamData) => ipcRenderer.invoke('cinema:play-vlc', streamData),

  // Background Download Manager with Live Progress
  startDownload: (data) => ipcRenderer.invoke('cinema:start-download', data),
  cancelDownload: (id) => ipcRenderer.invoke('cinema:cancel-download', id),
  openDownloadFile: (filePath) => ipcRenderer.invoke('cinema:open-download-file', filePath),
  onDownloadProgress: (cb) => {
    const listener = (_, data) => cb(data);
    ipcRenderer.on('cinema:download-progress', listener);
    return () => ipcRenderer.removeListener('cinema:download-progress', listener);
  },

  // Direct In-App Auto-Updater
  checkForUpdates: () => ipcRenderer.invoke('cinema:check-update'),
  downloadUpdate: (url) => ipcRenderer.invoke('cinema:download-update', url),
  applyUpdate: () => ipcRenderer.invoke('cinema:apply-update'),
  onUpdateAvailable: (cb) => {
    const listener = (_, data) => cb(data);
    ipcRenderer.on('cinema:update-available', listener);
    return () => ipcRenderer.removeListener('cinema:update-available', listener);
  },
  onUpdateProgress: (cb) => {
    const listener = (_, data) => cb(data);
    ipcRenderer.on('cinema:update-progress', listener);
    return () => ipcRenderer.removeListener('cinema:update-progress', listener);
  },
  onUpdateDownloaded: (cb) => {
    const listener = (_, data) => cb(data);
    ipcRenderer.on('cinema:update-downloaded', listener);
    return () => ipcRenderer.removeListener('cinema:update-downloaded', listener);
  },

  // Window Controls
  minimize: () => ipcRenderer.send('cinema:window-minimize'),
  maximize: () => ipcRenderer.send('cinema:window-maximize'),
  close: () => ipcRenderer.send('cinema:window-close'),
  isMaximized: () => ipcRenderer.invoke('cinema:window-is-maximized'),

  // User Settings persistence
  getUserSettings: () => ipcRenderer.invoke('cinema:get-user-settings'),
  saveUserSettings: (settings) => ipcRenderer.invoke('cinema:save-user-settings', settings),

  // Open external links safely if needed
  openExternal: (url) => ipcRenderer.send('cinema:open-external', url),
});
