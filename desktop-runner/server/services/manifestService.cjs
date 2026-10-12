const axios = require('axios');
const { ZENDA_RAW } = require('../config/constants.cjs');

class ManifestService {
  constructor() {
    this.cachedProviders = [];
    this.lastFetched = 0;
    this.CACHE_DURATION = 1000 * 60 * 60; // 1 hour
  }

  async getProviders() {
    const now = Date.now();
    if (now - this.lastFetched < this.CACHE_DURATION && this.cachedProviders.length > 0) {
      return this.cachedProviders;
    }

    try {
      const res = await axios.get(`${ZENDA_RAW}/manifest.json`, { timeout: 8000 });
      if (Array.isArray(res.data)) {
        this.cachedProviders = res.data.map((p) => {
          const isLegacyMovieBoxApp = p.value === 'movieBox';
          const isMovieBoxWeb = p.value === 'movieBoxWeb';

          return {
            name: isMovieBoxWeb ? 'MovieBox' : p.display_name,
            value: p.value,
            version: p.version,
            icon: p.icon || '',
            type: p.type || 'global',
            disabled: Boolean(p.disabled) || isLegacyMovieBoxApp,
          };
        });
        this.lastFetched = now;
      }
    } catch (err) {
      console.warn('Failed to load manifest.json:', err.message);
    }
    return this.cachedProviders;
  }
}

module.exports = new ManifestService();
