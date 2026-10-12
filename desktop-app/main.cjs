const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const express = require('express');
const cors = require('cors');

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}

let mainWindow = null;
let serverInstance = null;
let serverPort = 3001;
let downloadedUpdatePath = null;
let isUpdating = false;

// 1. Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// 2. Self-Contained Local Scraper Server
async function startLocalServer() {
  return new Promise((resolve) => {
    const localApp = express();
    localApp.use(cors());
    localApp.use(express.json());

    // Mount Cinema Scraper Backend Routes
    try {
      const apiRoutes = require('./server/routes/index.cjs');
      localApp.use('/api', apiRoutes);
      console.log('✅ [Engine] Modular Cinema Scraping Routes mounted at /api');
    } catch (err) {
      console.error('❌ [Engine] Failed to mount server/routes:', err.message);
    }

    // Serve Compiled Production Web App (dist/)
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      localApp.use(express.static(distPath));
      localApp.use((req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(path.join(distPath, 'index.html'));
        } else {
          res.status(404).json({ error: 'Not found' });
        }
      });
      console.log('✅ [Engine] Production UI bundle mounted from dist/');
    }

    // Find available port starting from 3001
    const tryListen = (port) => {
      const server = localApp.listen(port, '127.0.0.1', () => {
        serverPort = port;
        serverInstance = server;
        console.log(`🎬 [Engine] Standalone Cinema Engine active on http://127.0.0.1:${serverPort}`);
        resolve(port);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[Engine] Port ${port} occupied, attempting port ${port + 1}...`);
          tryListen(port + 1);
        } else {
          console.error('[Engine] Server error:', err);
          resolve(port);
        }
      });
    };

    tryListen(serverPort);
  });
}

// 3. Create Desktop Window
function createWindow(port) {
  const iconPath = path.join(__dirname, 'public/logo.png');

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 960,
    minHeight: 620,
    title: 'Cinema',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#070709',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows cross-origin video streaming/HLS chunks from third-party media servers
      allowRunningInsecureContent: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 4. In-App Direct Auto-Updater Logic (Zero Redirects)
ipcMain.handle('cinema:check-update', async () => {
  try {
    const currentVersion = app.getVersion(); // '4.0.8'
    const releaseUrl = 'https://api.github.com/repos/HarshSharma20050924/cinema/releases/latest';

    const response = await fetch(releaseUrl, {
      headers: { 'User-Agent': 'Cinema-Desktop-App' },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) return { updateAvailable: false };
    const data = await response.json();
    const remoteVer = (data.tag_name || data.name || '').replace(/^v/i, '').trim();

    if (!remoteVer || !isNewerVersion(remoteVer, currentVersion)) {
      return { updateAvailable: false, currentVersion };
    }

    // Auto-select asset for current OS
    let downloadUrl = null;
    let assetName = '';
    const platform = process.platform;

    if (data.assets && Array.isArray(data.assets)) {
      if (platform === 'win32') {
        const exe = data.assets.find(a => a.name && (a.name.includes('Setup') || a.name.endsWith('.exe')) && !a.name.includes('Runner'));
        if (exe) { downloadUrl = exe.browser_download_url; assetName = exe.name; }
      } else if (platform === 'linux') {
        const appImage = data.assets.find(a => a.name && a.name.endsWith('.AppImage') && !a.name.includes('Runner'));
        if (appImage) { downloadUrl = appImage.browser_download_url; assetName = appImage.name; }
      } else if (platform === 'darwin') {
        const dmg = data.assets.find(a => a.name && a.name.endsWith('.dmg') && !a.name.includes('Runner'));
        if (dmg) { downloadUrl = dmg.browser_download_url; assetName = dmg.name; }
      }
    }

    return {
      updateAvailable: Boolean(downloadUrl),
      version: remoteVer,
      currentVersion,
      notes: data.body || 'New features and improvements ready for install.',
      downloadUrl,
      assetName,
    };
  } catch (err) {
    console.warn('[Updater] Check failed:', err.message);
    return { updateAvailable: false, error: err.message };
  }
});

function isNewerVersion(remote, local) {
  const r = remote.split('.').map(n => parseInt(n, 10) || 0);
  const l = local.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rPart = r[i] || 0;
    const lPart = l[i] || 0;
    if (rPart > lPart) return true;
    if (rPart < lPart) return false;
  }
  return false;
}

// Download Update in Background
ipcMain.handle('cinema:download-update', async (_, url) => {
  if (isUpdating) return { success: false, message: 'Download already in progress' };
  isUpdating = true;

  return new Promise((resolve) => {
    try {
      const ext = process.platform === 'win32' ? '.exe' : process.platform === 'linux' ? '.AppImage' : '.dmg';
      const destPath = path.join(app.getPath('temp'), `Cinema-Update-${Date.now()}${ext}`);
      const fileStream = fs.createWriteStream(destPath);

      const requestClient = url.startsWith('https') ? https : http;

      const getWithRedirects = (reqUrl) => {
        requestClient.get(reqUrl, { headers: { 'User-Agent': 'Cinema-Desktop-App' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return getWithRedirects(res.headers.location);
          }

          if (res.statusCode !== 200) {
            isUpdating = false;
            return resolve({ success: false, error: `Server responded with ${res.statusCode}` });
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
          let receivedBytes = 0;
          let startTime = Date.now();

          res.on('data', (chunk) => {
            receivedBytes += chunk.length;
            fileStream.write(chunk);

            if (totalBytes > 0 && mainWindow && !mainWindow.isDestroyed()) {
              const percent = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
              const elapsedSec = (Date.now() - startTime) / 1000;
              const speedBytesPerSec = elapsedSec > 0 ? (receivedBytes / elapsedSec) : 0;
              const speedMB = (speedBytesPerSec / (1024 * 1024)).toFixed(1);

              mainWindow.webContents.send('cinema:update-progress', {
                percent,
                receivedBytes,
                totalBytes,
                receivedMB: (receivedBytes / (1024 * 1024)).toFixed(1),
                totalMB: (totalBytes / (1024 * 1024)).toFixed(1),
                speedMB: `${speedMB} MB/s`,
              });
            }
          });

          res.on('end', () => {
            fileStream.end();
            downloadedUpdatePath = destPath;
            isUpdating = false;

            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('cinema:update-downloaded', {
                path: destPath,
                version: 'latest',
              });
            }
            resolve({ success: true, path: destPath });
          });

          res.on('error', (err) => {
            fs.unlink(destPath, () => {});
            isUpdating = false;
            resolve({ success: false, error: err.message });
          });
        }).on('error', (err) => {
          fs.unlink(destPath, () => {});
          isUpdating = false;
          resolve({ success: false, error: err.message });
        });
      };

      getWithRedirects(url);
    } catch (err) {
      isUpdating = false;
      resolve({ success: false, error: err.message });
    }
  });
});

// Apply Update and Restart Directly (Zero Redirects)
ipcMain.handle('cinema:apply-update', async () => {
  if (!downloadedUpdatePath || !fs.existsSync(downloadedUpdatePath)) {
    return { success: false, error: 'Update file not found' };
  }

  const platform = process.platform;

  try {
    if (platform === 'linux') {
      fs.chmodSync(downloadedUpdatePath, 0o755);
      const currentAppImage = process.env.APPIMAGE;
      if (currentAppImage && fs.existsSync(currentAppImage)) {
        // Atomic replace running AppImage file
        try {
          fs.copyFileSync(downloadedUpdatePath, currentAppImage);
          app.relaunch({ execPath: currentAppImage });
          app.exit(0);
          return { success: true };
        } catch (_) {}
      }
      // If portable or fallback, spawn downloaded AppImage
      spawn(downloadedUpdatePath, ['--no-sandbox'], { detached: true, stdio: 'ignore' }).unref();
      app.exit(0);
      return { success: true };
    }

    if (platform === 'win32') {
      // Execute NSIS installer silently or run updated executable
      spawn(downloadedUpdatePath, ['/S'], { detached: true, stdio: 'ignore' }).unref();
      app.exit(0);
      return { success: true };
    }

    if (platform === 'darwin') {
      shell.openPath(downloadedUpdatePath);
      app.exit(0);
      return { success: true };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Window Control IPC
ipcMain.on('cinema:window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('cinema:window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});
ipcMain.on('cinema:window-close', () => { if (mainWindow) mainWindow.close(); });
ipcMain.handle('cinema:window-is-maximized', () => mainWindow ? mainWindow.isMaximized() : false);
ipcMain.on('cinema:open-external', (_, url) => { shell.openExternal(url); });

// App Lifecycle
app.whenReady().then(async () => {
  const port = await startLocalServer();
  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
  });
});

app.on('window-all-closed', () => {
  if (serverInstance) {
    try { serverInstance.close(); } catch (_) {}
  }
  if (process.platform !== 'darwin') app.quit();
});
