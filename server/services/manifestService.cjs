const axios = require('axios');
const { ZENDA_RAW } = require('../config/constants.cjs');

const ACTIVE_TELEGRAM_EXTENSIONS = new Set([
  'movies4u',
  'moviesmod',
  '4khdhub',
  'drive',
  'movieboxweb',
  'moviebox',
  'tpb',
  'multi',
  'castle',
  'vega',
  'hdhub4u',
  'primemirror',
  'disneymirror',
  'netflixmirror',
  'uhd',
  'dramacool',
  'animesalt',
  'anikoto',
  'animeworld',
  'hianime',
  'flixhq',
  'showbox',
  'mxplayer',
  'zeefliz',
  'moviezwap',
  'filmyfly',
  'topmovies',
]);

const LOCAL_PROVIDERS = [
  {
    name: 'ThePirateBay',
    value: 'tpb',
    version: '1.0.0',
    type: 'global',
    icon: '🏴‍☠️',
    disabled: false,
  },
  {
    name: 'GramCinema',
    value: 'gramcinema',
    version: '1.0.0',
    type: 'hindi',
    icon: '🎬',
    disabled: true,
  },
];

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

    let remoteList = [];
    try {
      const res = await axios.get(`${ZENDA_RAW}/manifest.json`, { timeout: 8000 });
      if (Array.isArray(res.data)) {
        remoteList = res.data.map((p) => {
          const valLower = (p.value || '').toLowerCase();
          const isMovieBoxWeb = p.value === 'movieBoxWeb';
          const isActive = ACTIVE_TELEGRAM_EXTENSIONS.has(valLower) || ACTIVE_TELEGRAM_EXTENSIONS.has(p.value);

          return {
            name: isMovieBoxWeb ? 'MovieBox' : (p.display_name || p.name),
            value: p.value,
            version: p.version,
            icon: p.icon || '',
            type: p.type || 'global',
            disabled: !isActive,
          };
        });
      }
    } catch (err) {
      console.warn('Failed to load manifest.json:', err.message);
    }

    // Merge local providers first, then remote providers
    const existingValues = new Set(LOCAL_PROVIDERS.map((p) => p.value));
    const merged = [...LOCAL_PROVIDERS];
    for (const p of remoteList) {
      if (!existingValues.has(p.value)) {
        merged.push(p);
      }
    }

    // Filter to ensure only active ones are prioritized and disabled status is preserved
    this.cachedProviders = merged;
    this.lastFetched = now;
    return this.cachedProviders;
  }
}

module.exports = new ManifestService();
