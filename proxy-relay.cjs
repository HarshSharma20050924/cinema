#!/usr/bin/env node
/**
 * ⚡ Cinema Ultra-Lightweight Residential Proxy Relay
 * ---------------------------------------------------
 * Runs on Android (Termux) or any home device.
 * Memory: ~12 MB | CPU: ~0.1%
 * Purpose: Exposes home Airtel Wi-Fi as a high-speed residential IP pipe for Render.
 */

const http = require('http');
const { spawn } = require('child_process');
const os = require('os');
const axios = require('axios');

const PORT = process.env.PORT || 3005;
const CLUSTER_URL = process.env.CLUSTER_URL || 'https://cinema-dwh.pages.dev/api/tunnel-sync';
const SECRET = 'cinema_secret_2026';
const DEVICE_ID = process.env.DEVICE_ID || `phone_${os.hostname().replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'airtel'}_${Math.random().toString(36).substring(2, 6)}`;
const DEVICE_NAME = process.env.DEVICE_NAME || `Airtel Residential Node (${os.hostname() || 'Android'})`;

let currentPublicUrl = process.env.PUBLIC_URL || '';
let heartbeatTimer = null;

// 1. Ultra-Lightweight Relay Server
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);

  // Health check
  if (reqUrl.pathname === '/' || reqUrl.pathname === '/health' || reqUrl.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'online',
      role: 'residential_relay',
      deviceId: DEVICE_ID,
      deviceName: DEVICE_NAME,
      publicUrl: currentPublicUrl,
      uptime: process.uptime()
    }));
  }

  // Fetch Relay Route
  if (reqUrl.pathname === '/api/fetch' || reqUrl.pathname === '/fetch' || reqUrl.pathname === '/api/relay') {
    let targetUrl = reqUrl.searchParams.get('url');
    let bodyData = null;

    if (req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      try {
        const parsed = JSON.parse(raw);
        if (parsed.url) targetUrl = parsed.url;
        bodyData = parsed;
      } catch (_) {}
    }

    if (!targetUrl || !targetUrl.startsWith('http')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Valid URL parameter required' }));
    }

    try {
      const upstream = await axios({
        method: bodyData?.method || req.method || 'GET',
        url: targetUrl,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
          ...(bodyData?.headers || {})
        },
        data: bodyData?.data,
        timeout: 18000,
        maxRedirects: 5,
        validateStatus: () => true
      });

      res.writeHead(upstream.status, {
        'Content-Type': upstream.headers['content-type'] || 'text/html; charset=utf-8'
      });

      if (typeof upstream.data === 'object' && upstream.data !== null && !Buffer.isBuffer(upstream.data)) {
        return res.end(JSON.stringify(upstream.data));
      }
      return res.end(upstream.data);
    } catch (err) {
      console.error(`[Relay Failed] ${targetUrl}:`, err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message, url: targetUrl }));
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

// 2. Sync to Cloudflare D1 Cluster
async function syncToCluster(url) {
  if (!url) return;
  try {
    const res = await axios.post(CLUSTER_URL, {
      url,
      secret: SECRET,
      deviceId: DEVICE_ID,
      deviceName: DEVICE_NAME
    }, { timeout: 10000 });
    console.log(`📡 [Heartbeat] Synced to Cloudflare: ${url} (Active in Cluster: ${res.data?.activeNodesInCluster || 1})`);
  } catch (err) {
    console.warn(`⚠️ [Heartbeat Notice] Syncing to cluster: ${err.message}`);
  }
}

// 3. Automated Cloudflare Quick Tunnel Spawner
function startTunnel(port) {
  return new Promise((resolve) => {
    if (currentPublicUrl) return resolve(currentPublicUrl);

    console.log(`🚀 [Tunnel] Launching Cloudflare quick tunnel for port ${port}...`);
    try {
      const cf = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${port}`], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let resolved = false;
      const onData = (chunk) => {
        const text = chunk.toString();
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !resolved) {
          resolved = true;
          currentPublicUrl = match[0];
          console.log(`\n🎉 [Tunnel Ready] Residential Node Live: ${currentPublicUrl}\n`);
          resolve(currentPublicUrl);
        }
      };

      cf.stdout.on('data', onData);
      cf.stderr.on('data', onData);

      cf.on('error', (err) => {
        console.warn(`[Tunnel Error] cloudflared not available: ${err.message}`);
        if (!resolved) resolve(null);
      });

      setTimeout(() => {
        if (!resolved) resolve(null);
      }, 12000);
    } catch (e) {
      resolve(null);
    }
  });
}

// 4. Main Bootstrap
server.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`⚡ Cinema Ultra-Lightweight Residential Relay Active`);
  console.log(`📱 Device: ${DEVICE_NAME} [${DEVICE_ID}]`);
  console.log(`🔌 Local Port: ${PORT} (RAM: ~12MB, CPU: ~0.1%)`);
  console.log(`=======================================================`);

  const tunnelUrl = await startTunnel(PORT);
  if (tunnelUrl) {
    await syncToCluster(tunnelUrl);
    heartbeatTimer = setInterval(() => syncToCluster(tunnelUrl), 25000);
  }
});
