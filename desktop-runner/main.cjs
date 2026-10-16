const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, clipboard } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { fork } = require('child_process');
const CloudflaredManager = require('./cloudflared-manager.cjs');

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Register protocols for cross-platform desktop stream handoff
try {
  app.setAsDefaultProtocolClient('cinema');
  app.setAsDefaultProtocolClient('vlc');
} catch (_) {}

function handleProtocolUrl(urlStr) {
  if (!urlStr) return;
  const match = urlStr.match(/^(?:cinema|vlc):\/\/(.+)$/i);
  if (match && match[1]) {
    let rawUrl = match[1].replace(/^\/\//, '');
    if (rawUrl.startsWith('https//')) rawUrl = 'https://' + rawUrl.slice(7);
    else if (rawUrl.startsWith('http//')) rawUrl = 'http://' + rawUrl.slice(6);
    else if (rawUrl.startsWith('https/')) rawUrl = 'https://' + rawUrl.slice(6);
    else if (rawUrl.startsWith('http/')) rawUrl = 'http://' + rawUrl.slice(5);
    else if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) rawUrl = 'https://' + rawUrl;

    try {
      if (rawUrl.includes('%3f') || rawUrl.includes('%3F') || rawUrl.includes('%26')) {
        rawUrl = decodeURIComponent(rawUrl);
      }
    } catch (_) {}

    try {
      const { playInVlc } = require('./server/controllers/vlcController.cjs');
      playInVlc({ body: { streamUrl: rawUrl, title: 'Cinema Stream' } }, { json: () => {}, status: () => ({ json: () => {} }) });
    } catch (_) {}
  }
}

app.on('second-instance', (_, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  const protocolArg = (commandLine || []).find((arg) => /^(?:cinema|vlc):\/\//i.test(arg));
  if (protocolArg) handleProtocolUrl(protocolArg);
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

// Global State
let mainWindow = null;
let tray = null;
let isQuitting = false;
let serverProcess = null;
let tunnelManager = null;
let heartbeatInterval = null;

let isRunning = false;
let currentTunnelUrl = '';
let statusMessage = 'Idle';
let currentRole = 'idle';

// Config
const CONFIG_FILE = path.join(app.getPath('userData'), 'device_config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (_) {}

  const host = os.hostname() || 'Desktop';
  const platformName = process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux';
  const cfg = {
    deviceId: 'dev_' + Math.random().toString(36).substring(2, 10),
    deviceName: `${host} (${platformName} ${process.arch})`,
    autoStart: false,
  };

  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  } catch (_) {}
  return cfg;
}

const config = loadConfig();

// Coordinator Sync
async function syncCoordinator(tunnelUrl) {
  if (!tunnelUrl || !isRunning) return;

  // 1. Sync with Website Coordinator
  try {
    await fetch('https://cinema-dwh.pages.dev/api/tunnel-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: tunnelUrl,
        secret: 'cinema_secret_2026',
        deviceId: config.deviceId,
        deviceName: config.deviceName,
      }),
    });
    console.log(`[Coordinator] Registered tunnel with website: ${tunnelUrl}`);
  } catch (err) {
    console.warn('[Coordinator] Website sync error:', err.message);
  }

  // 2. Sync with Admin Panel Dashboard
  try {
    const res = await fetch('https://cinema-admin.pages.dev/api/runner/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: config.deviceId,
        deviceName: config.deviceName,
        tunnelUrl,
        status: 'running',
      }),
    });
    const data = await res.json();
    if (data && (data.allowed === false || data.command === 'STOP_SERVER')) {
      console.warn('⛔ [Admin] Access remotely REVOKED by Administrator! Halting engine.');
      statusMessage = data.message || 'Access revoked by Administrator';
      stopEngine();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('cinema:revoked', { message: statusMessage });
      }
      return;
    }
  } catch (err) {
    console.warn('[Admin] Dashboard heartbeat error:', err.message);
  }
}

async function notifyOffline() {
  try {
    await fetch('https://cinema-dwh.pages.dev/api/tunnel-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: '',
        secret: 'cinema_secret_2026',
        deviceId: config.deviceId,
        deviceName: config.deviceName,
      }),
    });
  } catch (_) {}
}

// Engine Orchestration
async function startEngine() {
  if (isRunning) return true;

  // Check admin authorization first
  try {
    const chk = await fetch(`https://cinema-admin.pages.dev/api/runner/check?deviceId=${encodeURIComponent(config.deviceId)}&deviceName=${encodeURIComponent(config.deviceName)}`, {
      signal: AbortSignal.timeout(4000)
    });
    if (chk.ok) {
      const chkData = await chk.json();
      if (chkData && chkData.allowed === false) {
        console.warn('⛔ [Admin] Cannot start: Access is revoked by Administrator.');
        statusMessage = chkData.message || 'Access revoked by Administrator';
        updateTray();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('cinema:revoked', { message: statusMessage });
        }
        return false;
      }
    }
  } catch (_) {}

  statusMessage = 'Starting local server...';
  updateTray();

  // 1. Check if an engine is already running on port 3001
  let isPort3001Alive = false;
  try {
    const res = await fetch('http://127.0.0.1:3001/', { signal: AbortSignal.timeout(1200) });
    if (res.status) isPort3001Alive = true;
  } catch (_) {}

  if (isPort3001Alive) {
    console.log('[Engine] Using existing engine running on port 3001');
  } else {
    try {
      const serverScript = path.join(__dirname, 'server.cjs');
      serverProcess = fork(serverScript, [], {
        env: { ...process.env, PORT: '3001', ELECTRON_RUN_AS_NODE: '1' },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      });

      serverProcess.stdout.on('data', (d) => console.log(`[Engine] ${d.toString().trim()}`));
      serverProcess.stderr.on('data', (d) => console.error(`[Engine Error] ${d.toString().trim()}`));

      serverProcess.on('exit', (code) => {
        console.log(`[Engine] Process exited with code ${code}`);
        serverProcess = null;
      });
    } catch (err) {
      statusMessage = `Server launch error: ${err.message}`;
      return false;
    }
  }

  // 2. Start Cloudflare Tunnel
  isRunning = true;
  statusMessage = 'Establishing Cloudflare tunnel...';
  updateTray();

  tunnelManager = new CloudflaredManager({
    port: 3001,
    appDataDir: path.join(app.getPath('userData'), 'tunnel'),
  });

  tunnelManager.on('log', (msg) => console.log(`[Tunnel] ${msg}`));
  tunnelManager.on('status', (st) => {
    statusMessage = st;
    updateTray();
  });

  try {
    const url = await tunnelManager.start();
    if (url) {
      currentTunnelUrl = url;
      statusMessage = 'Active';
      currentRole = 'primary';
      console.log(`[Runner] Live Tunnel: ${url}`);

      // Initial Sync
      await syncCoordinator(url);

      // Periodic Heartbeat
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (isRunning && currentTunnelUrl) {
          syncCoordinator(currentTunnelUrl);
        }
      }, 25000);

      updateTray();
      return true;
    }
  } catch (err) {
    statusMessage = `Tunnel error: ${err.message}`;
    updateTray();
    return false;
  }

  return true;
}

function stopEngine() {
  if (!isRunning && !serverProcess && !tunnelManager) return;

  isRunning = false;
  currentTunnelUrl = '';
  statusMessage = 'Idle';
  currentRole = 'idle';

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (tunnelManager) {
    tunnelManager.stop();
    tunnelManager = null;
  }

  if (serverProcess) {
    try { serverProcess.kill('SIGTERM'); } catch (_) {}
    serverProcess = null;
  }

  notifyOffline();
  updateTray();
}

async function reconnectEngine() {
  if (tunnelManager) {
    tunnelManager.stop();
  }
  if (!serverProcess) {
    return startEngine();
  }

  statusMessage = 'Reconnecting tunnel...';
  updateTray();

  tunnelManager = new CloudflaredManager({
    port: 3001,
    appDataDir: path.join(app.getPath('userData'), 'tunnel'),
  });

  try {
    const url = await tunnelManager.start();
    if (url) {
      currentTunnelUrl = url;
      statusMessage = 'Active';
      await syncCoordinator(url);
      updateTray();
      return true;
    }
  } catch (err) {
    statusMessage = `Reconnect error: ${err.message}`;
    updateTray();
  }
  return false;
}

// Window & Tray Creation
function createWindow() {
  const iconPath = path.join(__dirname, 'public', 'icon.png');
  const appIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;

  mainWindow = new BrowserWindow({
    width: 440,
    height: 780,
    minWidth: 380,
    minHeight: 620,
    backgroundColor: '#070709',
    icon: appIcon,
    autoHideMenuBar: true,
    title: 'Cinema Node Runner',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (appIcon && process.platform === 'linux') {
    mainWindow.setIcon(appIcon);
  }

  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  createTray();
}

function createTray() {
  if (tray) return;

  const iconPath = path.join(__dirname, 'public', 'icon.png');
  let icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  if (!icon.isEmpty()) {
    icon = icon.resize({ width: 18, height: 18 });
  }

  tray = new Tray(icon);
  tray.setToolTip('Cinema Node Runner');

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });

  updateTray();
}

function updateTray() {
  if (!tray) return;

  const statusText = isRunning ? `🟢 Running (${currentTunnelUrl ? 'Live' : 'Connecting'})` : '⚪ Idle';
  tray.setToolTip(`Cinema Node Runner - ${statusText}`);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Cinema Node Runner',
      enabled: false,
    },
    {
      label: `Status: ${statusText}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: isRunning ? 'Stop Server' : 'Start Server',
      click: () => {
        if (isRunning) stopEngine();
        else startEngine();
      },
    },
    {
      label: 'Copy Live Tunnel Link',
      enabled: Boolean(currentTunnelUrl),
      click: () => {
        if (currentTunnelUrl) {
          clipboard.writeText(currentTunnelUrl);
        }
      },
    },
    {
      label: 'Open Cinema Website',
      click: () => shell.openExternal('https://cinema-dwh.pages.dev'),
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        if (mainWindow) mainWindow.show();
      },
    },
    {
      label: 'Run at Startup',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked });
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        stopEngine();
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// IPC Handlers
ipcMain.handle('cinema:start', async () => {
  return await startEngine();
});

ipcMain.handle('cinema:stop', async () => {
  stopEngine();
  return true;
});

ipcMain.handle('cinema:reconnect', async () => {
  return await reconnectEngine();
});

ipcMain.handle('cinema:getStatus', async () => {
  return {
    running: isRunning,
    tunnelUrl: currentTunnelUrl,
    status: statusMessage,
    role: currentRole,
  };
});

ipcMain.handle('cinema:openExternal', async (_, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});

ipcMain.handle('cinema:getDeviceInfo', async () => {
  return {
    deviceId: config.deviceId,
    deviceName: config.deviceName,
    platform: process.platform,
    arch: process.arch,
  };
});

ipcMain.handle('cinema:getAutoStart', async () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('cinema:toggleAutoStart', async (_, enabled) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
  updateTray();
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('cinema:downloadAndInstall', async (_, data) => {
  const url = data?.url || 'https://github.com/HarshSharma20050924/cinema/releases/latest';
  shell.openExternal(url);
  return { success: true };
});

ipcMain.handle('cinema:windowAction', async (_, action) => {
  if (!mainWindow) return;
  if (action === 'minimize') mainWindow.minimize();
  else if (action === 'hide') mainWindow.hide();
  else if (action === 'close') {
    mainWindow.hide();
  }
});

// Second instance focus
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  stopEngine();
});

app.on('window-all-closed', () => {
  // Keep alive in tray on Windows & Linux & Mac
});
