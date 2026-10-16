const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'link_cache.json');
const linkCache = new Map();
let linkCounter = 1;

if (fs.existsSync(CACHE_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (raw && Array.isArray(raw.items)) {
      linkCounter = raw.counter || 1;
      raw.items.forEach(([k, v]) => linkCache.set(k, v));
    }
  } catch (_) {}
}

let saveCacheTimeout = null;
function persistCacheDebounced() {
  if (saveCacheTimeout) return;
  saveCacheTimeout = setTimeout(() => {
    saveCacheTimeout = null;
    try {
      const items = Array.from(linkCache.entries()).slice(-3000);
      fs.writeFileSync(CACHE_FILE, JSON.stringify({ counter: linkCounter, items }), 'utf8');
    } catch (_) {}
  }, 1000);
}

function storeLink(provider, link, title, extra = {}) {
  const id = String(linkCounter++);
  linkCache.set(id, { provider, link, title, ...extra, time: Date.now() });
  if (linkCache.size > 3000) {
    const oldestKey = linkCache.keys().next().value;
    linkCache.delete(oldestKey);
  }
  persistCacheDebounced();
  return id;
}

function getStoredLink(id) {
  return linkCache.get(id);
}

module.exports = {
  storeLink,
  getStoredLink
};
