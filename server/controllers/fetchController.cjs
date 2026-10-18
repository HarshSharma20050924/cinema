const axios = require('axios');

/**
 * Ultra-Lightweight HTTP Fetch Relay
 * Allows the Primary Server (Render) to route an outbound HTTP request
 * through this device's residential IP (Airtel Wi-Fi).
 */
async function relayFetch(req, res) {
  const targetUrl = req.query.url || req.body?.url;
  if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.startsWith('http')) {
    return res.status(400).json({ error: 'Valid URL parameter required' });
  }

  const method = (req.method === 'POST' ? (req.body?.method || 'POST') : 'GET').toLowerCase();
  const customHeaders = req.body?.headers || {};
  const data = req.body?.data || undefined;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
    ...customHeaders
  };

  try {
    const upstream = await axios({
      method,
      url: targetUrl,
      headers,
      data,
      timeout: 18000,
      maxRedirects: 5,
      validateStatus: () => true, // Forward exact HTTP status (200, 404, etc.)
    });

    // Forward status & essential headers
    res.status(upstream.status);
    if (upstream.headers['content-type']) {
      res.setHeader('Content-Type', upstream.headers['content-type']);
    }

    if (typeof upstream.data === 'object' && upstream.data !== null && !Buffer.isBuffer(upstream.data)) {
      return res.json(upstream.data);
    }
    return res.send(upstream.data);
  } catch (err) {
    console.error(`[Relay Error] ${targetUrl}:`, err.message);
    return res.status(502).json({
      error: 'Residential Relay Failed',
      message: err.message,
      url: targetUrl
    });
  }
}

module.exports = {
  relayFetch
};
