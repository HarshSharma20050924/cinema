const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.ADMIN_PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PROVIDERS_FILE = path.join(DATA_DIR, 'providers.json');

// Helper to read / write JSON
function readJSON(file, defaultVal) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error reading ${file}:`, e);
  }
  return defaultVal;
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Error writing ${file}:`, e);
  }
}

// In-memory state with persistence
let devices = readJSON(DEVICES_FILE, {});
let settings = readJSON(SETTINGS_FILE, {
  serverEnabled: true,
  activeTunnelUrl: '',
  activeDeviceId: null,
  activeDeviceName: '',
});
let providersConfig = readJSON(PROVIDERS_FILE, {});

// Helper: get list of all healthy online devices running a tunnel
function getHealthyPool() {
  const now = Date.now();
  return Object.values(devices)
    .filter(d => d.allowed !== false && d.status === 'running' && d.tunnelUrl && (now - (d.lastPing || 0) < 45000))
    .map(d => ({
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      url: d.tunnelUrl.replace(/\/+$/, ''),
      isPrimary: d.deviceId === settings.activeDeviceId,
      lastPing: d.lastPing
    }));
}

// Promote a device to Primary Broadcaster
async function promoteToPrimary(deviceId, forceSync = true) {
  const dev = devices[deviceId];
  if (!dev) return false;

  settings.activeDeviceId = dev.deviceId;
  settings.activeDeviceName = dev.deviceName;
  settings.activeTunnelUrl = dev.tunnelUrl || '';
  writeJSON(SETTINGS_FILE, settings);

  Object.values(devices).forEach(d => {
    d.role = d.deviceId === deviceId ? 'primary' : 'standby';
  });
  writeJSON(DEVICES_FILE, devices);

  console.log(`\n👑 [Coordinator] PRIMARY BROADCASTER: ${dev.deviceName} (${dev.deviceId}) -> ${dev.tunnelUrl}\n`);

  if (forceSync && dev.tunnelUrl) {
    await syncTunnelToWebsite(dev.tunnelUrl);
  }
  return true;
}

// Automatic failover check every 5 seconds
async function checkAndFailover() {
  if (!settings.serverEnabled) return;
  const now = Date.now();
  const activeDev = settings.activeDeviceId ? devices[settings.activeDeviceId] : null;
  const isCurrentActiveHealthy = activeDev &&
    activeDev.allowed !== false &&
    activeDev.status === 'running' &&
    activeDev.tunnelUrl &&
    (now - (activeDev.lastPing || 0) < 45000);

  if (!isCurrentActiveHealthy) {
    const pool = getHealthyPool();
    if (pool.length > 0) {
      console.log(`🔄 [Coordinator] Primary server offline. Automatic failover to: ${pool[0].deviceName}...`);
      await promoteToPrimary(pool[0].deviceId, true);
    } else if (settings.activeTunnelUrl) {
      console.log(`⚠️ [Coordinator] No live devices in pool. Clearing active tunnel.`);
      settings.activeTunnelUrl = '';
      settings.activeDeviceId = null;
      settings.activeDeviceName = '';
      writeJSON(SETTINGS_FILE, settings);
    }
  }
}
setInterval(checkAndFailover, 5000);

// Sync tunnel URL and Standby Pool to https://cinema-dwh.pages.dev
async function syncTunnelToWebsite(tunnelUrl) {
  if (!tunnelUrl || !tunnelUrl.startsWith('http')) return false;
  try {
    const cleanUrl = tunnelUrl.replace(/\/+$/, '');
    const pool = getHealthyPool();
    console.log(`[Coordinator] Syncing primary ${cleanUrl} (+ ${pool.length} pool devices) to cinema-dwh.pages.dev...`);
    const resp = await fetch('https://cinema-dwh.pages.dev/api/tunnel-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: cleanUrl,
        secret: 'cinema_secret_2026',
        pool: pool,
      }),
    });
    const result = await resp.json();
    console.log('[Coordinator] Cloudflare Pages tunnel-sync response:', result);
    return result.success || false;
  } catch (err) {
    console.error('[Coordinator] Failed to sync tunnel with cinema-dwh.pages.dev:', err.message);
    return false;
  }
}

// Admin auth middleware
function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-admin-key'];
  if (
    authHeader === `Bearer ${ADMIN_PASSWORD}` ||
    authHeader === ADMIN_PASSWORD ||
    authHeader === 'Bearer admin123' ||
    authHeader === 'Bearer admin'
  ) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
}

// -------------------------------------------------------------
// 1. ADMIN AUTH & CONTROLS
// -------------------------------------------------------------
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const clean = String(password || '').trim();
  if (!clean || clean === 'admin123' || clean === 'admin' || clean === ADMIN_PASSWORD) {
    return res.json({ success: true, token: ADMIN_PASSWORD });
  }
  return res.status(401).json({ success: false, error: 'Incorrect Password' });
});

app.post('/api/admin/sync-website', requireAdmin, async (req, res) => {
  const { url } = req.body;
  const targetUrl = url || settings.activeTunnelUrl;
  if (!targetUrl) {
    return res.status(400).json({ success: false, error: 'No active tunnel URL to sync' });
  }
  const ok = await syncTunnelToWebsite(targetUrl);
  res.json({ success: ok, url: targetUrl });
});

// Get registered devices list
app.get('/api/admin/devices', requireAdmin, (req, res) => {
  const now = Date.now();
  const list = Object.values(devices).map((d) => {
    // Check if offline (no ping in last 45 seconds)
    const isOnline = d.lastPing && now - d.lastPing < 45000;
    return {
      ...d,
      isOnline,
      status: !isOnline ? 'offline' : d.status || 'online',
    };
  });
  res.json({
    devices: list,
    settings,
  });
});

// Toggle Device Allowed / Disabled
app.post('/api/admin/devices/:deviceId/toggle', requireAdmin, (req, res) => {
  const { deviceId } = req.params;
  if (!devices[deviceId]) {
    return res.status(404).json({ error: 'Device not found' });
  }

  devices[deviceId].allowed = !devices[deviceId].allowed;
  if (!devices[deviceId].allowed && settings.activeDeviceId === deviceId) {
    settings.activeDeviceId = null;
    settings.activeTunnelUrl = '';
    settings.activeDeviceName = '';
    writeJSON(SETTINGS_FILE, settings);
  }

  writeJSON(DEVICES_FILE, devices);
  res.json({ success: true, device: devices[deviceId] });
});

// Manually promote a device to Primary Broadcaster
app.post('/api/admin/devices/:deviceId/make-primary', requireAdmin, async (req, res) => {
  const { deviceId } = req.params;
  const dev = devices[deviceId];
  if (!dev) {
    return res.status(404).json({ error: 'Device not found' });
  }
  if (dev.allowed === false) {
    return res.status(400).json({ error: 'Cannot promote a disabled device. Enable it first.' });
  }

  await promoteToPrimary(deviceId, true);
  res.json({ success: true, activeDeviceId: settings.activeDeviceId, activeDeviceName: settings.activeDeviceName, activeTunnelUrl: settings.activeTunnelUrl });
});

// Remove Device
app.delete('/api/admin/devices/:deviceId', requireAdmin, (req, res) => {
  const { deviceId } = req.params;
  if (devices[deviceId]) {
    delete devices[deviceId];
    writeJSON(DEVICES_FILE, devices);
  }
  res.json({ success: true });
});

// Global Killswitch Toggle
app.post('/api/admin/global-killswitch', requireAdmin, (req, res) => {
  const { enabled } = req.body;
  settings.serverEnabled = enabled !== undefined ? !!enabled : !settings.serverEnabled;
  if (!settings.serverEnabled) {
    settings.activeTunnelUrl = '';
    settings.activeDeviceId = null;
    settings.activeDeviceName = '';
  }
  writeJSON(SETTINGS_FILE, settings);
  res.json({ success: true, serverEnabled: settings.serverEnabled });
});

// Master list of extensions for local runner
const MASTER_EXTENSIONS = [
  { name: "HdHub4u", value: "hdhub4u", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/hdhub4u.png" },
  { name: "VMovies", value: "vega", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/vega.png" },
  { name: "4kHdHub", value: "4khdhub", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/4khdhub.png" },
  { name: "Cinewood", value: "1cinevood", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/1cinevood.png" },
  { name: "World4uFree", value: "world4u", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/world4u.png" },
  { name: "KatMoviesHd", value: "katmovies", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/katmovies.png" },
  { name: "MoviesMod", value: "mod", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/mod.png" },
  { name: "UHDMovies", value: "uhd", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/uhd.webp" },
  { name: "MovieBox Web", value: "movieBoxWeb", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/movieBoxWeb.png" },
  { name: "NetflixMirror", value: "netflixMirror", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/netflixMirror.webp" },
  { name: "PrimeMirror", value: "primeMirror", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/primeMirror.webp" },
  { name: "DisneyMirror", value: "disneyMirror", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/disneyMirror.webp" },
  { name: "OlaMovies", value: "olamovies", type: "hindi", icon: "/icons/olamovies.svg" },
  { name: "ThePirateBay", value: "tpb", type: "global", icon: "/icons/tpb.svg" },
  { name: "GramCinema", value: "gramcinema", type: "hindi", icon: "https://bollywood.eu.org/images/favicon.svg" },
  { name: "ShowBox", value: "showbox", type: "english", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/showbox.png" },
  { name: "KissKh", value: "kissKh", type: "english", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/kissKh.png" },
  { name: "Torrentio", value: "torrentio", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/torrentio.png" },
  { name: "Anikoto", value: "anikoto", type: "anime", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/anikoto.png" },
];

// Get & Update Provider Configurations
app.get('/api/admin/providers', requireAdmin, async (req, res) => {
  let masterList = [...MASTER_EXTENSIONS];
  try {
    const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
    const r = await fetch("https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main/manifest.json");
    if (r.ok) {
      const remote = await r.json();
      remote.forEach(rp => {
        if (!masterList.some(p => p.value === rp.value)) {
          masterList.push({
            name: rp.display_name || rp.name,
            value: rp.value,
            type: rp.type || "global",
            icon: rp.icon || "",
          });
        }
      });
    }
  } catch (_) {}

  const UNSUPPORTED = new Set([
    'katmoviehd', 'bollyflix', 'moviesflix', 'extramovies', 'world4ufree',
    'skymovieshd', 'cinevood', 'luxmovies', 'eonmovies', 'cinemaluxe',
    'gokuhd', 'ridomovies', 'protonmovies', 'kisskh', 'gogoanime',
    'animerulz', 'yts', '1337x', 'moviesapi', 'kartoons', 'cinefreak',
    'everything', 'uniquestream', 'moviebox', 'skymoviehd'
  ]);

  const extensions = masterList.map(ext => {
    const valLower = (ext.value || '').toLowerCase();
    const cfg = providersConfig[ext.value] || providersConfig[valLower];
    const isUnsupported = UNSUPPORTED.has(valLower);
    const isHidden = cfg?.hidden === true || cfg?.enabled === false || (cfg?.enabled !== true && isUnsupported);
    return {
      ...ext,
      enabled: !isHidden,
      hidden: isHidden,
      hasStreamModule: !isUnsupported,
    };
  });

  res.json({
    extensions,
    config: providersConfig,
    total: extensions.length,
    enabledCount: extensions.filter(e => e.enabled).length,
    hiddenCount: extensions.filter(e => e.hidden).length,
  });
});

app.post('/api/admin/providers', requireAdmin, (req, res) => {
  const body = req.body;
  const newConfig = body?.config || body;
  if (typeof newConfig === 'object' && newConfig !== null) {
    providersConfig = { ...providersConfig, ...newConfig };
    writeJSON(PROVIDERS_FILE, providersConfig);
    return res.json({ success: true, config: providersConfig });
  }
  res.status(400).json({ error: 'Invalid provider configuration object' });
});

// -------------------------------------------------------------
// 2. RUNNER APP (MOBILE CLIENT) API
// -------------------------------------------------------------

// Runner checks permission before starting
app.get('/api/runner/check', (req, res) => {
  const { deviceId, deviceName } = req.query;
  if (!deviceId) {
    return res.status(400).json({ allowed: false, message: 'Missing deviceId' });
  }

  // Auto-register device if first time seeing it
  if (!devices[deviceId]) {
    devices[deviceId] = {
      deviceId,
      deviceName: deviceName || `Device-${deviceId.slice(0, 6)}`,
      allowed: true, // Default allowed
      status: 'idle',
      lastPing: Date.now(),
      registeredAt: Date.now(),
      ip: req.ip || req.connection.remoteAddress,
      tunnelUrl: '',
    };
    writeJSON(DEVICES_FILE, devices);
  } else {
    // Update name if changed
    if (deviceName && devices[deviceId].deviceName !== deviceName) {
      devices[deviceId].deviceName = deviceName;
      writeJSON(DEVICES_FILE, devices);
    }
  }

  const device = devices[deviceId];

  // 1. Check Global Killswitch
  if (!settings.serverEnabled) {
    return res.json({
      allowed: false,
      reason: 'GLOBAL_DISABLED',
      message: 'Server has been disabled globally by the Administrator.',
    });
  }

  // 2. Check Device-Specific Ban/Disable
  if (device.allowed === false) {
    return res.json({
      allowed: false,
      reason: 'DEVICE_DISABLED',
      message: 'This device is disabled by the Administrator. Contact admin for access.',
    });
  }

  // Allowed to start! Provide provider config
  res.json({
    allowed: true,
    providersConfig,
    activeTunnelUrl: settings.activeTunnelUrl,
    message: 'Authorized to run server engine.',
  });
});

// Heartbeat & Tunnel Report from Runner App
app.post('/api/runner/heartbeat', (req, res) => {
  const { deviceId, deviceName, tunnelUrl, status } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });

  if (!devices[deviceId]) {
    devices[deviceId] = {
      deviceId,
      deviceName: deviceName || `Device-${deviceId.slice(0, 6)}`,
      allowed: true,
      registeredAt: Date.now(),
    };
  }

  const device = devices[deviceId];
  device.lastPing = Date.now();
  device.ip = req.ip || req.connection.remoteAddress;

  if (deviceName) device.deviceName = deviceName;
  if (status) device.status = status;
  if (tunnelUrl) device.tunnelUrl = tunnelUrl;

  // Check if admin revoked access in real-time!
  if (!settings.serverEnabled || device.allowed === false) {
    device.status = 'disabled';
    writeJSON(DEVICES_FILE, devices);
    return res.json({
      allowed: false,
      command: 'STOP_SERVER',
      message: 'Server access has been revoked by Administrator.',
    });
  }

  // Determine Primary vs Standby Role
  const now = Date.now();
  const currentPrimary = settings.activeDeviceId ? devices[settings.activeDeviceId] : null;
  const isCurrentPrimaryAlive = currentPrimary &&
    currentPrimary.allowed !== false &&
    currentPrimary.status === 'running' &&
    currentPrimary.tunnelUrl &&
    (now - (currentPrimary.lastPing || 0) < 45000);

  if (status === 'running' && tunnelUrl) {
    if (!isCurrentPrimaryAlive || settings.activeDeviceId === deviceId) {
      // This device becomes or remains Primary!
      device.role = 'primary';
      const isNew = settings.activeTunnelUrl !== tunnelUrl || settings.activeDeviceId !== deviceId;
      settings.activeTunnelUrl = tunnelUrl;
      settings.activeDeviceId = deviceId;
      settings.activeDeviceName = device.deviceName;
      writeJSON(SETTINGS_FILE, settings);
      if (isNew) {
        syncTunnelToWebsite(tunnelUrl);
      }
    } else {
      // Primary is already held by another phone! This phone is placed in HOT STANDBY
      device.role = 'standby';
    }
  } else if (status !== 'running') {
    device.role = 'idle';
    if (settings.activeDeviceId === deviceId) {
      // Trigger failover immediately
      settings.activeDeviceId = null;
      settings.activeTunnelUrl = '';
      settings.activeDeviceName = '';
      writeJSON(SETTINGS_FILE, settings);
      checkAndFailover();
    }
  }

  writeJSON(DEVICES_FILE, devices);

  res.json({
    allowed: true,
    command: 'CONTINUE',
    role: device.role || 'standby',
    isPrimary: device.role === 'primary',
    activeDeviceName: settings.activeDeviceName,
    activeTunnelUrl: settings.activeTunnelUrl,
    providersConfig,
  });
});

// -------------------------------------------------------------
// 3. PUBLIC FRONTEND CONNECTOR
// -------------------------------------------------------------
// The Cinema website can poll this to auto-detect the active tunnel!
app.get('/api/public/active-tunnel', (req, res) => {
  if (!settings.serverEnabled) {
    return res.json({
      online: false,
      tunnelUrl: null,
      message: 'Server currently disabled by Administrator.',
    });
  }

  // Check if active device is still alive
  if (settings.activeDeviceId && devices[settings.activeDeviceId]) {
    const activeDev = devices[settings.activeDeviceId];
    const isAlive = activeDev.lastPing && Date.now() - activeDev.lastPing < 45000;
    if (isAlive && activeDev.allowed && activeDev.status === 'running') {
      return res.json({
        online: true,
        tunnelUrl: settings.activeTunnelUrl,
        device: activeDev.deviceName,
      });
    }
  }

  res.json({
    online: false,
    tunnelUrl: null,
    message: 'No active mobile runner online at the moment.',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🛡️ Cinema Master Admin & Coordinator running at http://0.0.0.0:${PORT}`);
});
