const { spawn, exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const CONFIG_FILE = path.join(__dirname, 'device_config.json');

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch (e) {}
  }
  // Generate random device ID
  const id = 'dev_' + Math.random().toString(36).substring(2, 10);
  const hostname = os.hostname() || 'Android Phone';
  const cfg = {
    deviceId: id,
    deviceName: `${hostname} (${os.platform()})`,
    coordinatorUrl: process.env.COORDINATOR_URL || 'https://cinema-admin.pages.dev',
    autoStart: false,
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  return cfg;
}

const config = loadConfig();

let serverProcess = null;
let tunnelProcess = null;
let currentTunnelUrl = '';
let runnerState = 'idle'; // 'idle' | 'checking' | 'starting' | 'running' | 'disabled' | 'error'
let runnerRole = 'idle'; // 'primary' | 'standby' | 'idle'
let primaryDeviceName = '';
let statusMessage = 'Server is ready. Tap Start to begin.';
let heartbeatTimer = null;
let initStep = 0;
let initPercent = 0;
let initStatus = 'Ready';

// Helper: Make HTTP request to Coordinator
async function fetchCoordinator(endpoint, method = 'GET', body = null) {
  try {
    const url = new URL(endpoint, config.coordinatorUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const res = await fetch(url.toString(), options);
    return await res.json();
  } catch (err) {
    console.error(`Coordinator request failed (${endpoint}):`, err.message);
    return null;
  }
}

// 1. Check permission with Admin Coordinator
async function checkAdminPermission() {
  const data = await fetchCoordinator(
    `/api/runner/check?deviceId=${encodeURIComponent(config.deviceId)}&deviceName=${encodeURIComponent(config.deviceName)}`
  );

  if (!data) {
    return {
      allowed: false,
      message: 'Cannot reach Admin Coordinator server. Check network connection or Coordinator URL.',
    };
  }

  return data;
}

// 2. Start Local Engine Server
function startEngineServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '..', 'server.cjs');
    console.log(`[Runner] Launching engine at ${serverPath}...`);

    serverProcess = spawn('node', [serverPath], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: '3001' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let started = false;

    serverProcess.stdout.on('data', (d) => {
      const msg = d.toString();
      console.log(`[Server] ${msg.trim()}`);
      if (!started && (msg.includes('3001') || msg.includes('running') || msg.includes('Cinema Engine'))) {
        started = true;
        resolve();
      }
    });

    serverProcess.stderr.on('data', (d) => {
      console.error(`[Server Error] ${d.toString().trim()}`);
    });

    serverProcess.on('exit', (code) => {
      console.log(`[Runner] Engine exited with code ${code}`);
      serverProcess = null;
      if (!started) reject(new Error(`Server exited with code ${code}`));
    });

    // Fallback timer if output string doesn't match
    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 3000);
  });
}

// 3. Connect Public Tunnel Automatically
function startTunnel() {
  return new Promise((resolve) => {
    console.log('[Runner] Starting automated Cloudflare quick tunnel...');

    // Try cloudflared first
    tunnelProcess = spawn('cloudflared', ['tunnel', '--url', 'http://127.0.0.1:3001'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;

    const parseOutput = (data) => {
      const text = data.toString();
      console.log(`[Tunnel] ${text.trim()}`);
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !resolved) {
        resolved = true;
        currentTunnelUrl = match[0];
        console.log(`\n🎉 [Runner] LIVE PUBLIC TUNNEL CONNECTED: ${currentTunnelUrl}\n`);
        resolve(currentTunnelUrl);
      }
    };

    tunnelProcess.stdout.on('data', parseOutput);
    tunnelProcess.stderr.on('data', parseOutput);

    tunnelProcess.on('error', (err) => {
      console.warn('[Runner] cloudflared not found or error, trying fallback tunnel...', err.message);
      startFallbackTunnel().then(resolve);
    });

    // Timeout fallback after 8s
    setTimeout(() => {
      if (!resolved) {
        startFallbackTunnel().then(resolve);
      }
    }, 8000);
  });
}

// Fallback tunnel: Pinggy SSH or localtunnel
function startFallbackTunnel() {
  return new Promise((resolve) => {
    console.log('[Runner] Attempting SSH pinggy quick tunnel...');
    const pinggy = spawn('ssh', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=30',
      '-p', '443',
      '-R0:localhost:3001',
      'a.pinggy.io'
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    tunnelProcess = pinggy;

    pinggy.stdout.on('data', (d) => {
      const match = d.toString().match(/https:\/\/[a-zA-Z0-9-]+\.a\.free\.pinggy\.link/);
      if (match) {
        currentTunnelUrl = match[0];
        resolve(currentTunnelUrl);
      }
    });

    pinggy.stderr.on('data', (d) => {
      const match = d.toString().match(/https:\/\/[a-zA-Z0-9-]+\.a\.free\.pinggy\.link/);
      if (match) {
        currentTunnelUrl = match[0];
        resolve(currentTunnelUrl);
      }
    });

    // If completely offline or no tunnel tool installed, use local network IP
    setTimeout(() => {
      if (!currentTunnelUrl) {
        currentTunnelUrl = 'http://localhost:3001';
        resolve(currentTunnelUrl);
      }
    }, 6000);
  });
}

// 4. Send Periodic Heartbeat to Admin Coordinator
async function sendHeartbeat() {
  if (runnerState !== 'running') return;

  const data = await fetchCoordinator('/api/runner/heartbeat', 'POST', {
    deviceId: config.deviceId,
    deviceName: config.deviceName,
    tunnelUrl: currentTunnelUrl,
    status: runnerState,
  });

  if (!data) return;

  // Check if Admin killed or banned this device!
  if (data.allowed === false || data.command === 'STOP_SERVER') {
    console.warn('\n⛔ [Runner] Admin remotely killed/disabled this server! Shutting down...\n');
    stopServer('Server disabled remotely by Administrator.');
    runnerState = 'disabled';
    runnerRole = 'idle';
    return;
  }

  if (data.role) {
    runnerRole = data.role;
    primaryDeviceName = data.activeDeviceName || '';
    if (runnerRole === 'primary') {
      statusMessage = `🟢 LIVE PRIMARY: Powering website directly`;
    } else {
      statusMessage = `🟡 HOT STANDBY: Master is "${primaryDeviceName || 'Active Host'}". Ready for failover!`;
    }
  }

  if (currentTunnelUrl) {
    syncTunnelToCloudflarePages(currentTunnelUrl).catch(() => {});
  }
}

// Helper: Direct sync to Cloudflare Pages production site
async function syncTunnelToCloudflarePages(tunnelUrl) {
  if (!tunnelUrl || !tunnelUrl.startsWith('http')) return;
  try {
    const cleanUrl = tunnelUrl.replace(/\/+$/, '');
    console.log(`[Runner] Syncing tunnel ${cleanUrl} to https://cinema-dwh.pages.dev/api/tunnel-sync...`);
    const resp = await fetch('https://cinema-dwh.pages.dev/api/tunnel-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: cleanUrl,
        secret: 'cinema_secret_2026',
        deviceId: config.deviceId,
        deviceName: config.deviceName,
      }),
    });
    const data = await resp.json();
    console.log('[Runner] Cloudflare cluster pool sync:', data);
  } catch (err) {
    console.warn('[Runner] Could not reach cinema-dwh.pages.dev directly:', err.message);
  }
}

// 5. Start All (1-Click Main Action)
async function startServer() {
  if (runnerState === 'running' || runnerState === 'starting') return;

  runnerState = 'starting';
  initStep = 1;
  initPercent = 20;
  initStatus = '1/5 Initializing Permissions & Hardware WakeLock...';
  statusMessage = initStatus;
  console.log(`[Runner] ${statusMessage}`);

  // 1. Check with Admin
  initStep = 2;
  initPercent = 40;
  initStatus = '2/5 Verifying Coordinator Node Access...';
  statusMessage = initStatus;
  const check = await checkAdminPermission();
  if (!check.allowed) {
    runnerState = 'disabled';
    initStep = 0;
    initPercent = 0;
    statusMessage = check.message || 'Server disabled by Administrator.';
    console.warn(`[Runner] Access Denied: ${statusMessage}`);
    return { success: false, message: statusMessage };
  }

  // 2. Start Engine
  initStep = 3;
  initPercent = 60;
  initStatus = '3/5 Launching Cinema Engine & Provider Scraper on Port 3001...';
  statusMessage = initStatus;
  try {
    await startEngineServer();
  } catch (err) {
    runnerState = 'error';
    initStep = 0;
    initPercent = 0;
    statusMessage = `Failed to launch server: ${err.message}`;
    return { success: false, message: statusMessage };
  }

  // 3. Connect Tunnel
  initStep = 4;
  initPercent = 80;
  initStatus = '4/5 Establishing Cloudflare Global Edge Tunnel...';
  statusMessage = initStatus;
  await startTunnel();

  // 4. Sync into Distributed Cluster Pool
  initStep = 5;
  initPercent = 100;
  initStatus = '5/5 Syncing Multi-Node Cluster Traffic...';
  statusMessage = initStatus;
  await syncTunnelToCloudflarePages(currentTunnelUrl);

  // 5. Report Active to Coordinator
  runnerState = 'running';
  statusMessage = `Server online & streaming via ${currentTunnelUrl}`;
  console.log(`[Runner] Status: ${statusMessage}`);

  await sendHeartbeat();
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(sendHeartbeat, 15000);

  return { success: true, tunnelUrl: currentTunnelUrl };
}

// 6. Stop Server
function stopServer(customMessage = 'Server stopped.') {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  if (serverProcess) {
    try { serverProcess.kill(); } catch (e) {}
    serverProcess = null;
  }
  if (tunnelProcess) {
    try { tunnelProcess.kill(); } catch (e) {}
    tunnelProcess = null;
  }

  currentTunnelUrl = '';
  runnerState = 'idle';
  runnerRole = 'idle';
  initStep = 0;
  initPercent = 0;
  initStatus = 'Ready';
  statusMessage = customMessage;

  // Notify coordinator of stop
  fetchCoordinator('/api/runner/heartbeat', 'POST', {
    deviceId: config.deviceId,
    deviceName: config.deviceName,
    tunnelUrl: '',
    status: 'stopped',
  }).catch(() => {});

  console.log(`[Runner] ${statusMessage}`);
  return { success: true };
}

// 7. Embedded Control API for Mobile App UI (Port 4001)
const appServer = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const parsedUrl = new URL(req.url, 'http://localhost:4001');

  if (parsedUrl.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      deviceId: config.deviceId,
      deviceName: config.deviceName,
      coordinatorUrl: config.coordinatorUrl,
      state: runnerState,
      role: runnerRole,
      primaryDeviceName,
      statusMessage,
      initStep,
      initPercent,
      initStatus,
      tunnelUrl: currentTunnelUrl,
    }));
  }

  if (parsedUrl.pathname === '/api/start' && req.method === 'POST') {
    const result = await startServer();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result));
  }

  if (parsedUrl.pathname === '/api/stop' && req.method === 'POST') {
    const result = stopServer('Server stopped by user.');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result));
  }

  if (parsedUrl.pathname === '/api/config' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const newCfg = JSON.parse(body);
        if (newCfg.deviceName) config.deviceName = newCfg.deviceName;
        if (newCfg.coordinatorUrl) config.coordinatorUrl = newCfg.coordinatorUrl;
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, config }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Serve static UI and PWA assets
  const publicDir = path.join(__dirname, 'public');
  let relPath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
  const safePath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(publicDir, safePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };
    const mime = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    return res.end(fs.readFileSync(filePath));
  }

  res.writeHead(404);
  res.end('Not found');
});

const APP_PORT = 4001;
appServer.listen(APP_PORT, '0.0.0.0', () => {
  console.log(`📱 Cinema Mobile Runner Controller ready at http://0.0.0.0:${APP_PORT}`);
  console.log(`📱 Device ID: ${config.deviceId}`);
  console.log(`📱 Device Name: ${config.deviceName}`);
  
  if (config.autoStart || process.argv.includes('--start')) {
    console.log('⚡ Auto-starting Cinema Engine and Global Tunnel...');
    startServer().catch(err => console.error('[Runner] Startup error:', err));
  }
});

// Clean exit handlers
process.on('SIGINT', () => {
  stopServer('App process terminated.');
  process.exit();
});
process.on('SIGTERM', () => {
  stopServer('App process terminated.');
  process.exit();
});
