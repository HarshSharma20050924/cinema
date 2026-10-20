const axios = require('axios');
const dns = require('dns');
const https = require('https');

/**
 * 🚀 Cinema Smart Resilient Fetcher for Primary Server (Render & Desktop)
 * ---------------------------------------------------------------------
 * 1. Handles both axios(url, config) and axios(config) calling signatures.
 * 2. Automatic Relative URL tracking & resolution.
 * 3. Custom DNS (1.1.1.1, 8.8.8.8) to bypass Indian ISP RPZ DNS poisoning.
 * 4. Residential phone pool failover when Cloudflare Turnstile blocks datacenter IPs.
 */

let activePhonePool = [];
let lastPoolSync = 0;
let roundRobinIndex = 0;
const deadPhones = new Map(); // phoneUrl -> deadUntilTimestamp

const CLUSTER_STATUS_URL = process.env.CLUSTER_STATUS_URL || 'https://cinema-dwh.pages.dev/api/tunnel-status';

// Custom DNS Resolver for ISP bypass
const resolver = new dns.promises.Resolver();
try {
  resolver.setServers(['1.1.1.1', '8.8.8.8', '1.0.0.1']);
} catch (_) {}

const dnsCache = new Map();

function customLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (options && options.all) {
      return callback(null, [{ address: hostname, family: 4 }]);
    }
    return callback(null, hostname, 4);
  }

  if (dnsCache.has(hostname)) {
    const cachedIp = dnsCache.get(hostname);
    if (options && options.all) {
      return callback(null, [{ address: cachedIp, family: 4 }]);
    }
    return callback(null, cachedIp, 4);
  }

  resolver.resolve4(hostname).then(addresses => {
    if (addresses && addresses.length > 0) {
      const ip = addresses[0];
      dnsCache.set(hostname, ip);
      if (options && options.all) {
        return callback(null, [{ address: ip, family: 4 }]);
      }
      return callback(null, ip, 4);
    }
    dns.lookup(hostname, options, callback);
  }).catch(() => {
    dns.lookup(hostname, options, callback);
  });
}

const secureAgent = new https.Agent({
  lookup: customLookup,
  keepAlive: true,
  rejectUnauthorized: false
});

// Domains known to enforce Cloudflare Turnstile or aggressively block datacenter IPs
const RESIDENTIAL_PREFERRED_DOMAINS = [
  'vegamovies',
  'hdhub4u',
  '4khdhub',
  'moviesmod',
  'topmovies',
  'katmovie',
  'bollyflix'
];

function isResidentialPreferred(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return RESIDENTIAL_PREFERRED_DOMAINS.some(d => lower.includes(d));
}

// 1. Sync live residential phone tunnels from Cloudflare D1
async function syncPhonePool() {
  const now = Date.now();
  if (now - lastPoolSync < 30000 && activePhonePool.length > 0) {
    return activePhonePool;
  }

  try {
    const res = await axios.get(CLUSTER_STATUS_URL, { timeout: 6000 });
    const pool = [...(res.data?.relays || []), ...(res.data?.pool || [])];
    const valid = [];

    for (const item of pool) {
      const devId = item?.deviceId || '';
      if (devId.startsWith('server_') || devId === 'server_local_dev' || devId === 'server_247_cloud') {
        continue;
      }
      const u = typeof item === 'string' ? item : item?.url;
      if (u && /^https?:\/\//i.test(u) && !u.includes('pages.dev') && !u.includes('onrender.com')) {
        const clean = u.replace(/\/+$/, '');
        if (!valid.includes(clean)) valid.push(clean);
      }
    }

    if (valid.length > 0) {
      activePhonePool = valid;
      lastPoolSync = now;
    }
  } catch (err) {
    // Keep using existing pool on temporary network hiccup
  }
  return activePhonePool;
}

// Public APIs that never block datacenter IPs
const DIRECT_ONLY_DOMAINS = [
  'theintrodb.org',
  'strem.io',
  'cinemeta',
  'themoviedb.org',
  'tmdb.org',
  'imdb.com',
  'raw.githubusercontent.com',
  'githubusercontent.com',
  'gofile.io',
  'pixeldrain.com',
  'fuckingfast.net',
  'cloudflarestorage.com',
  'workers.dev',
  'googleusercontent.com'
];

function isDirectOnly(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return DIRECT_ONLY_DOMAINS.some(d => lower.includes(d));
}

// 2. Get next available healthy phone tunnel
function getNextHealthyPhone() {
  const now = Date.now();
  const healthy = activePhonePool.filter(url => {
    const deadUntil = deadPhones.get(url) || 0;
    return now > deadUntil;
  });

  if (healthy.length === 0) {
    return null;
  }

  roundRobinIndex = (roundRobinIndex + 1) % healthy.length;
  return healthy[roundRobinIndex];
}

function markPhoneFailed(url) {
  if (url) {
    deadPhones.set(url, Date.now() + 5 * 60 * 1000); // Back off this phone for 5 minutes
    console.warn(`⚠️ [SmartFetcher] Phone node ${url} timed out/failed. Backing off for 5 mins.`);
  }
}

let lastBaseUrl = '';

/**
 * Smart Resilient Request Function
 */
async function smartRequest(rawConfig) {
  let cfg = typeof rawConfig === 'string' ? { url: rawConfig } : { ...rawConfig };
  let targetUrl = cfg.url || '';

  // Track & Resolve relative URLs automatically
  const providerBase = cfg.baseURL || lastBaseUrl || '';
  if ((targetUrl.startsWith('/') || targetUrl.startsWith('?')) && providerBase) {
    const baseClean = providerBase.replace(/\/+$/, '');
    const pathClean = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`;
    targetUrl = `${baseClean}${pathClean}`;
    cfg.url = targetUrl;
  } else if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
    try {
      lastBaseUrl = new URL(targetUrl).origin;
    } catch (_) {}
  }

  const method = (cfg.method || 'GET').toLowerCase();
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    ...(cfg.headers || {})
  };
  cfg.headers = headers;
  const timeout = cfg.timeout || 15000;

  // Add custom secure DNS agent to avoid ISP poisoning
  if (targetUrl.startsWith('https://')) {
    cfg.httpsAgent = secureAgent;
  }

  // Direct fetch helper
  const tryDirect = async (directTimeout = 6000) => {
    return axios({
      ...cfg,
      url: targetUrl,
      timeout: directTimeout,
      validateStatus: (status) => status < 500
    });
  };

  // Direct-only domains (APIs, Google CDN, Cloudflare Storage, Pixeldrain, Gofile)
  if (isDirectOnly(targetUrl)) {
    return tryDirect(Math.min(timeout, 12000));
  }

  await syncPhonePool();

  const needsResidential = isResidentialPreferred(targetUrl);
  const hasPhones = activePhonePool.length > 0;

  // Try direct first if not residential preferred or no phone pool available
  if (!needsResidential || !hasPhones) {
    try {
      const directRes = await tryDirect(6000);
      const isCloudflareBlocked = directRes.status === 403 || directRes.status === 503 ||
        (typeof directRes.data === 'string' && (directRes.data.includes('Just a moment...') || directRes.data.includes('Cloudflare Ray ID')));

      if (!isCloudflareBlocked) {
        return directRes;
      }
      console.log(`🛡️ [SmartFetcher] Cloudflare WAF on direct ${targetUrl} (${directRes.status}). Routing via phone pool...`);
    } catch (e) {
      if (!hasPhones) throw e;
    }
  }

  // Route through live residential phone pool
  if (hasPhones) {
    const phonesToTry = [...activePhonePool];

    for (let attempt = 0; attempt < Math.min(phonesToTry.length, 2); attempt++) {
      const phoneUrl = getNextHealthyPhone();
      if (!phoneUrl) break;

      try {
        const relayEndpoint = `${phoneUrl}/api/fetch`;
        const res = await axios({
          method: 'POST',
          url: relayEndpoint,
          headers: { 'Content-Type': 'application/json' },
          data: {
            url: targetUrl,
            method,
            headers,
            data: cfg.data
          },
          timeout: 4000,
          validateStatus: (status) => status < 500
        });

        const isInvalidData = !res.data || (typeof res.data === 'string' && (res.data.includes('Cannot POST') || res.data.includes('Error code 52')));
        if (res.status === 200 && !isInvalidData) {
          return res;
        }

        markPhoneFailed(phoneUrl);
        continue;
      } catch (err) {
        markPhoneFailed(phoneUrl);
      }
    }
  }

  // Final fallback: execute direct
  return axios({
    ...cfg,
    url: targetUrl,
    timeout,
  });
}

// Create smart Axios instance drop-in
const smartAxios = new Proxy(axios, {
  apply(target, thisArg, argArray) {
    const arg0 = argArray[0];
    const arg1 = argArray[1] || {};
    let cfg = {};
    if (typeof arg0 === 'string') {
      cfg = { ...arg1, url: arg0, method: arg1.method || 'get' };
    } else if (arg0 && typeof arg0 === 'object') {
      cfg = { ...arg0 };
    }
    return smartRequest(cfg);
  },
  get(target, propKey) {
    if (propKey === 'get') {
      return (url, config = {}) => smartRequest({ ...config, method: 'get', url });
    }
    if (propKey === 'post') {
      return (url, data, config = {}) => smartRequest({ ...config, method: 'post', url, data });
    }
    if (propKey === 'head') {
      return (url, config = {}) => smartRequest({ ...config, method: 'head', url });
    }
    if (propKey === 'delete') {
      return (url, config = {}) => smartRequest({ ...config, method: 'delete', url });
    }
    return target[propKey];
  }
});

module.exports = {
  smartRequest,
  smartAxios,
  syncPhonePool
};
