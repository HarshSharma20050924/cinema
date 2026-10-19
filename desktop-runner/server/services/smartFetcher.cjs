const axios = require('axios');

/**
 * 🚀 Cinema Smart Resilient Fetcher for Primary Server (Render)
 * -----------------------------------------------------------
 * 1. Executes heavy parsing and compute 100% on Render.
 * 2. Uses residential phone tunnels (Airtel Wi-Fi) purely as an egress IP pipe.
 * 3. Never crashes or blocks if a phone sleeps or changes tunnel URL.
 * 4. Automatic Round-Robin across all 4 phones with 3s failover.
 */

let activePhonePool = [];
let lastPoolSync = 0;
let roundRobinIndex = 0;
const deadPhones = new Map(); // phoneUrl -> deadUntilTimestamp

const CLUSTER_STATUS_URL = process.env.CLUSTER_STATUS_URL || 'https://cinema-dwh.pages.dev/api/tunnel-status';

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
      const u = typeof item === 'string' ? item : item?.url;
      if (u && /^https?:\/\//i.test(u) && !u.includes('pages.dev') && !u.includes('onrender.com')) {
        const clean = u.replace(/\/+$/, '');
        if (!valid.includes(clean)) valid.push(clean);
      }
    }

    if (valid.length > 0) {
      activePhonePool = valid;
      lastPoolSync = now;
      console.log(`📡 [SmartFetcher] Synced ${valid.length} live residential phone node(s) for Render`);
    }
  } catch (err) {
    // Keep using existing pool on temporary network hiccup
  }
  return activePhonePool;
}

// Public APIs that never block datacenter IPs and should never be routed through phone relays
const DIRECT_ONLY_DOMAINS = [
  'theintrodb.org',
  'strem.io',
  'cinemeta',
  'themoviedb.org',
  'tmdb.org',
  'imdb.com',
  'raw.githubusercontent.com',
  'githubusercontent.com'
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
    return null; // Don't clear deadPhones and loop endlessly on dead nodes!
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

/**
 * Smart Resilient Request Function
 * Tries direct or residential relay with seamless multi-phone failover
 */
async function smartRequest(config) {
  const targetUrl = typeof config === 'string' ? config : (config.url || '');
  const method = (config.method || 'GET').toLowerCase();
  const headers = config.headers || {};
  const timeout = config.timeout || 15000;

  // Public APIs should always be fetched direct
  if (isDirectOnly(targetUrl)) {
    return axios({
      ...config,
      timeout: Math.min(timeout, 5000)
    });
  }

  await syncPhonePool();

  const needsResidential = isResidentialPreferred(targetUrl);
  const hasPhones = activePhonePool.length > 0;

  // Direct fetch helper
  const tryDirect = async () => {
    return axios({
      ...config,
      timeout: Math.min(timeout, 6000),
      validateStatus: (status) => status < 500
    });
  };

  // If the target doesn't require residential IP and we want to try direct first:
  if (!needsResidential || !hasPhones) {
    try {
      const directRes = await tryDirect();
      const isCloudflareBlocked = directRes.status === 403 || directRes.status === 503 ||
        (typeof directRes.data === 'string' && (directRes.data.includes('Just a moment...') || directRes.data.includes('Cloudflare Ray ID')));

      // Return immediately for successful responses or standard 404/400 (not a Cloudflare block!)
      if (!isCloudflareBlocked) {
        return directRes;
      }
      console.log(`🛡️ [SmartFetcher] Direct request to ${targetUrl} hit Cloudflare check (${directRes.status}). Routing through residential phone...`);
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
            data: config.data
          },
          timeout: 3000,
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
    ...config,
    timeout,
  });
}

// Create smart Axios instance drop-in
const smartAxios = new Proxy(axios, {
  apply(target, thisArg, argArray) {
    return smartRequest(argArray[0]);
  },
  get(target, propKey) {
    if (propKey === 'get') {
      return (url, config = {}) => smartRequest({ ...config, method: 'get', url });
    }
    if (propKey === 'post') {
      return (url, data, config = {}) => smartRequest({ ...config, method: 'post', url, data });
    }
    return target[propKey];
  }
});

module.exports = {
  smartRequest,
  smartAxios,
  syncPhonePool
};
