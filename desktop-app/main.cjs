try {
  process.chdir(require('os').homedir());
} catch (_) {}

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

    // Listen on dynamic free port (0) to prevent any port collisions with background dev servers
    const server = localApp.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      serverInstance = server;
      console.log(`🎬 [Engine] Standalone Cinema Engine active on http://127.0.0.1:${serverPort}`);
      resolve(serverPort);
    });

    server.on('error', (err) => {
      console.error('[Engine] Server error:', err);
      resolve(serverPort);
    });
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
        // Atomic replace running AppImage using temp file and rename (bypasses ETXTBSY)
        try {
          const tempTarget = `${currentAppImage}.new`;
          fs.copyFileSync(downloadedUpdatePath, tempTarget);
          fs.chmodSync(tempTarget, 0o755);
          fs.renameSync(tempTarget, currentAppImage);
          downloadedUpdatePath = null;
          app.relaunch({ execPath: currentAppImage });
          app.exit(0);
          return { success: true };
        } catch (_) {}
      }
      // If portable or fallback, spawn downloaded AppImage
      spawn(downloadedUpdatePath, ['--no-sandbox'], { detached: true, stdio: 'ignore' }).unref();
      downloadedUpdatePath = null;
      app.exit(0);
      return { success: true };
    }

    if (platform === 'win32') {
      // Execute NSIS installer silently or run updated executable
      spawn(downloadedUpdatePath, ['/S'], { detached: true, stdio: 'ignore' }).unref();
      downloadedUpdatePath = null;
      app.exit(0);
      return { success: true };
    }

    if (platform === 'darwin') {
      shell.openPath(downloadedUpdatePath);
      downloadedUpdatePath = null;
      app.exit(0);
      return { success: true };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Direct Cross-Platform VLC Playback without Location Errors
ipcMain.handle('cinema:play-vlc', async (_, { streamUrl, title, isMovieBox }) => {
  try {
    if (!streamUrl) return { success: false, error: 'No stream URL provided' };

    const cleanTitle = (title || 'Cinema Stream').replace(/[\r\n]/g, ' ').trim() || 'stream';
    let targetUrl = streamUrl.trim();
    let host = '';
    try {
      host = new URL(targetUrl).hostname.toLowerCase();
    } catch (_) {}

    const movieboxCheck =
      Boolean(isMovieBox) ||
      host.includes('hakunaymatata') ||
      host.includes('moviebox') ||
      host.includes('inmoviebox') ||
      host.includes('aoneroom');

    const needsProxy =
      movieboxCheck ||
      host.includes('kisskh') ||
      host.includes('krussdomi') ||
      host.includes('habibikun');

    // Route anti-hotlinking streams through local engine proxy to spoof required Origin/Referer
    let playableUrl = targetUrl;
    if (needsProxy && !targetUrl.includes('/api/proxy')) {
      playableUrl = `http://127.0.0.1:${serverPort}/api/proxy?url=${encodeURIComponent(targetUrl)}`;
      if (movieboxCheck) {
        playableUrl += `&referer=${encodeURIComponent('https://officialmoviebox.com/')}`;
        playableUrl += `&origin=${encodeURIComponent('https://officialmoviebox.com')}`;
      }
    }

    // Ensure media extension exists so media players recognize stream container
    if (!/\.(mkv|mp4|m3u8|webm|avi|mov|flv|ts)(\?|$)/i.test(playableUrl)) {
      playableUrl += playableUrl.includes('?') ? '&file=video.mp4' : '?file=video.mp4';
    }

    // Build .m3u playlist file with VLC headers
    let m3u = `#EXTM3U\n#EXTINF:-1,${cleanTitle}\n`;
    if (movieboxCheck) {
      m3u += '#EXTVLCOPT:http-referrer=https://officialmoviebox.com/\n';
      m3u += '#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\n';
    }
    m3u += `${playableUrl}\n`;

    const tempDir = app.getPath('temp');
    const safeFileName = `${cleanTitle.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)}.m3u`;
    const m3uPath = path.join(tempDir, safeFileName);
    fs.writeFileSync(m3uPath, m3u, 'utf-8');

    const platform = process.platform;
    let launched = false;

    // 1. Launch VLC executable directly
    if (platform === 'linux') {
      const candidates = ['/usr/bin/vlc', '/snap/bin/vlc', '/usr/local/bin/vlc', 'vlc'];
      for (const bin of candidates) {
        try {
          const p = spawn(bin, [m3uPath], { detached: true, stdio: 'ignore' });
          p.unref();
          launched = true;
          break;
        } catch (_) {}
      }
    } else if (platform === 'win32') {
      const winCandidates = [
        'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
        'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
        'vlc.exe',
        'vlc',
      ];
      for (const bin of winCandidates) {
        if (fs.existsSync(bin) || bin.endsWith('.exe')) {
          try {
            const p = spawn(bin, [m3uPath], { detached: true, stdio: 'ignore' });
            p.unref();
            launched = true;
            break;
          } catch (_) {}
        }
      }
    } else if (platform === 'darwin') {
      const macVlc = '/Applications/VLC.app/Contents/MacOS/VLC';
      if (fs.existsSync(macVlc)) {
        try {
          spawn(macVlc, [m3uPath], { detached: true, stdio: 'ignore' }).unref();
          launched = true;
        } catch (_) {}
      }
      if (!launched) {
        try {
          spawn('open', ['-a', 'VLC', m3uPath], { detached: true, stdio: 'ignore' }).unref();
          launched = true;
        } catch (_) {}
      }
    }

    // 2. Fallback: shell.openPath opens default handler for .m3u
    if (!launched) {
      await shell.openPath(m3uPath);
    }

    return { success: true, m3uPath, playableUrl };
  } catch (err) {
    console.error('[VLC] Launch error:', err);
    return { success: false, error: err.message };
  }
});

// Background Downloads Manager with Real-time Progress Tracking
const activeDownloads = new Map();

function pipeDownloadStream(id, res, fileStream, filePath) {
  const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
  let receivedBytes = 0;
  let lastTime = Date.now();
  let lastBytes = 0;

  res.on('data', (chunk) => {
    receivedBytes += chunk.length;
    fileStream.write(chunk);

    const now = Date.now();
    if (now - lastTime >= 400 && mainWindow) {
      const elapsed = (now - lastTime) / 1000;
      const speedBytes = (receivedBytes - lastBytes) / elapsed;
      const speed =
        speedBytes >= 1024 * 1024
          ? `${(speedBytes / (1024 * 1024)).toFixed(1)} MB/s`
          : `${Math.round(speedBytes / 1024)} KB/s`;
      const percent = totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 50;

      mainWindow.webContents.send('cinema:download-progress', {
        id,
        receivedBytes,
        totalBytes,
        percent,
        speed,
        status: 'downloading',
        filePath,
      });

      lastTime = now;
      lastBytes = receivedBytes;
    }
  });

  res.on('end', () => {
    fileStream.end();
    activeDownloads.delete(id);
    if (mainWindow) {
      mainWindow.webContents.send('cinema:download-progress', {
        id,
        receivedBytes,
        totalBytes,
        percent: 100,
        speed: 'Done',
        status: 'completed',
        filePath,
      });
    }
  });

  res.on('error', (err) => {
    fileStream.end();
    activeDownloads.delete(id);
    if (mainWindow) {
      mainWindow.webContents.send('cinema:download-progress', {
        id,
        status: 'error',
        error: err.message,
        filePath,
      });
    }
  });
}

ipcMain.handle('cinema:start-download', async (_, { id, url, title, filename }) => {
  try {
    const downloadsDir = app.getPath('downloads');
    const safeName = (filename || `${title || 'video'}.mp4`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(downloadsDir, safeName);
    const fileStream = fs.createWriteStream(filePath);

    const client = url.startsWith('https') ? https : http;

    const req = client.get(
      url,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          client.get(
            res.headers.location,
            { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
            (redirRes) => {
              pipeDownloadStream(id, redirRes, fileStream, filePath);
            }
          );
          return;
        }
        pipeDownloadStream(id, res, fileStream, filePath);
      }
    );

    req.on('error', (err) => {
      if (mainWindow) {
        mainWindow.webContents.send('cinema:download-progress', { id, status: 'error', error: err.message });
      }
    });

    activeDownloads.set(id, { req, fileStream, filePath });
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cinema:cancel-download', (_, id) => {
  const dl = activeDownloads.get(id);
  if (dl) {
    try { dl.req.destroy(); } catch (_) {}
    try { dl.fileStream.destroy(); } catch (_) {}
    activeDownloads.delete(id);
  }
  return { success: true };
});

ipcMain.handle('cinema:open-download-file', (_, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
  } else {
    shell.openPath(app.getPath('downloads'));
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
// User Settings Persistence IPC
ipcMain.handle('cinema:get-user-settings', () => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'user-settings.json');
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
  } catch (_) {}
  return null;
});

ipcMain.handle('cinema:save-user-settings', (_, settings) => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'user-settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (_) {}
  return false;
});

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
