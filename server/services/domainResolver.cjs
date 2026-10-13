const axios = require('axios');
const { ZENDA_RAW } = require('../config/constants.cjs');

class DomainResolver {
  constructor() {
    this.urls = {};
    this.lastFetched = 0;
    this.CACHE_DURATION = 1000 * 60 * 30; // 30 mins
  }

  async syncUrls() {
    try {
      const now = Date.now();
      if (now - this.lastFetched < this.CACHE_DURATION && Object.keys(this.urls).length > 0) {
        return this.urls;
      }

      console.log('🔄 Fetching updated domain mirrors from Zenda urls.json...');
      const res = await axios.get(`${ZENDA_RAW}/urls.json`, { timeout: 8000 });
      if (res.data && typeof res.data === 'object') {
        this.urls = res.data;
        this.lastFetched = now;
      }
    } catch (err) {
      console.warn('⚠️ Failed to sync urls.json, using fallback domains:', err.message);
    }
    return this.urls;
  }

  getBaseUrl(providerValue) {
    if (!providerValue) return '';
    const key = providerValue.toLowerCase().trim();

    // Match directly or by name key
    for (const [entryKey, entryVal] of Object.entries(this.urls)) {
      if (
        entryKey.toLowerCase() === key ||
        (entryVal.name && entryVal.name.toLowerCase() === key)
      ) {
        return entryVal.url?.replace(/\/+$/, '') || '';
      }
    }

    // Aliases
    if (key === 'moviebox' || key === 'movieboxapp') {
      return this.urls['movieboxweb']?.url?.replace(/\/+$/, '') || '';
    }
    if (key === 'hdhub' || key === 'hdhub4u') {
      return this.urls['hdhub']?.url?.replace(/\/+$/, '') || this.urls['hdhub4u']?.url?.replace(/\/+$/, '') || 'https://hdhub4u.com.se';
    }

    return '';
  }
}

module.exports = new DomainResolver();
