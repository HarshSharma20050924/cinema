const { spawn } = require('child_process');

let heartbeatTimer = null;
let currentPublicUrl = process.env.PUBLIC_URL || '';

async function syncToCluster(url) {
  if (!url) return;
  const cleanUrl = url.replace(/\/+$/, '');
  const isCloudHost = Boolean(process.env.RENDER_EXTERNAL_URL || process.env.SPACE_HOST);
  const deviceId = process.env.DEVICE_ID || (isCloudHost ? 'server_247_cloud' : 'server_local_dev');
  const deviceName = process.env.DEVICE_NAME || (isCloudHost ? '24/7 Cloud Engine (WARP Edge)' : 'Antigravity Local Engine');

  try {
    const resp = await fetch('https://cinema-dwh.pages.dev/api/tunnel-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: cleanUrl,
        secret: 'cinema_secret_2026',
        deviceId,
        deviceName,
        isPrimary: !isCloudHost,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    console.log(`[24/7 Server] Cloudflare cluster synced: ${cleanUrl} (${deviceId})`, data?.success ? '✅' : '');
  } catch (e) {
    console.warn('[24/7 Server] Cluster sync notice:', e.message);
  }

  try {
    await fetch('https://cinema-admin.pages.dev/api/runner/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        deviceName,
        tunnelUrl: cleanUrl,
        status: 'running',
      }),
    });
  } catch (_) {}
}

function startAutoTunnel(port) {
  return new Promise((resolve) => {
    // Check if cloud environment already provides a public HTTPS domain
    if (process.env.SPACE_HOST) {
      currentPublicUrl = `https://${process.env.SPACE_HOST}`;
      console.log(`[24/7 Server] Detected Hugging Face Space URL: ${currentPublicUrl}`);
      resolve(currentPublicUrl);
      return;
    }
    if (process.env.RENDER_EXTERNAL_URL) {
      currentPublicUrl = process.env.RENDER_EXTERNAL_URL;
      console.log(`[24/7 Server] Detected Render Public URL: ${currentPublicUrl}`);
      resolve(currentPublicUrl);
      return;
    }
    if (process.env.PUBLIC_URL) {
      currentPublicUrl = process.env.PUBLIC_URL;
      resolve(currentPublicUrl);
      return;
    }

    console.log(`[24/7 Server] Spawning Cloudflare Quick Tunnel on port ${port}...`);
    try {
      const cf = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${port}`], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let resolved = false;
      const parseOutput = (data) => {
        const text = data.toString();
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !resolved) {
          resolved = true;
          currentPublicUrl = match[0];
          console.log(`\n🎉 [24/7 Server] Global Cloudflare Edge Active: ${currentPublicUrl}\n`);
          resolve(currentPublicUrl);
        }
      };

      cf.stdout.on('data', parseOutput);
      cf.stderr.on('data', parseOutput);

      cf.on('close', (code) => {
        console.warn(`[24/7 Server] Cloudflare tunnel closed with code ${code}`);
        currentPublicUrl = '';
        if (heartbeatTimer) clearInterval(heartbeatTimer);
      });

      cf.on('exit', (code) => {
        console.warn(`[24/7 Server] Cloudflare tunnel exited with code ${code}`);
        currentPublicUrl = '';
        if (heartbeatTimer) clearInterval(heartbeatTimer);
      });

      cf.on('error', (err) => {
        console.warn('[24/7 Server] cloudflared not found or error:', err.message);
        currentPublicUrl = '';
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (!resolved) resolve(null);
      });

      setTimeout(() => {
        if (!resolved) resolve(null);
      }, 10000);
    } catch (err) {
      console.warn('[24/7 Server] Could not launch quick tunnel:', err.message);
      resolve(null);
    }
  });
}

async function initClusterSync(port) {
  if (process.env.ENABLE_CLUSTER_SYNC === 'false') return;

  const url = await startAutoTunnel(port);
  if (url) {
    await syncToCluster(url);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (currentPublicUrl) {
        syncToCluster(currentPublicUrl);
      }
    }, 30000);
  }
}

module.exports = {
  initClusterSync,
  syncToCluster,
};
