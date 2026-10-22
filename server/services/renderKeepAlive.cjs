const axios = require('axios');

const RENDER_CLUSTER = [
  'https://cinema-4h7t.onrender.com',
  'https://cinema-1-zjrx.onrender.com',
  'https://cinema-2-mg14.onrender.com',
  'https://cinema-3-euoh.onrender.com',
  'https://cinema-4-260y.onrender.com',
];

let keepAliveInterval = null;

async function pingAllRenderServers() {
  const currentUrl = (process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || '').replace(/\/+$/, '');

  for (const node of RENDER_CLUSTER) {
    if (currentUrl && node.toLowerCase() === currentUrl.toLowerCase()) {
      // Don't ping self
      continue;
    }

    try {
      const res = await axios.get(`${node}/api/health`, {
        timeout: 10000,
        headers: { 'User-Agent': 'Cinema-Render-KeepAlive/1.0' }
      });
      if (res.status === 200) {
        // Node is awake and healthy
      }
    } catch (_) {
      // Try fallback to /api/providers with longer timeout if cold starting
      try {
        await axios.get(`${node}/api/providers`, {
          timeout: 25000,
          headers: { 'User-Agent': 'Cinema-Render-KeepAlive/1.0' }
        });
      } catch (err) {
        console.warn(`[KeepAlive] Notice: ping to ${node} failed:`, err.message);
      }
    }
  }
}

function startRenderKeepAlive() {
  if (process.env.DISABLE_RENDER_KEEPALIVE === 'true') return;

  console.log('🛡️ [Render KeepAlive] Active: Pinging all 5 Render cluster nodes every 7 minutes to prevent idle sleep.');

  // Initial ping 10s after startup
  setTimeout(pingAllRenderServers, 10000);

  // Ping every 7 minutes (420,000 ms) - well below Render's 15-minute inactivity limit
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  keepAliveInterval = setInterval(pingAllRenderServers, 420000);
}

module.exports = {
  startRenderKeepAlive,
  pingAllRenderServers,
  RENDER_CLUSTER
};
