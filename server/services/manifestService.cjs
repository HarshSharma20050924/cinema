const axios = require('axios');
const { ZENDA_RAW } = require('../config/constants.cjs');

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
    disabled: false,
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
        const UNSUPPORTED = new Set([
          'katmoviehd', 'bollyflix', 'moviesflix', 'extramovies', 'world4ufree',
          'skymovieshd', 'cinevood', 'luxmovies', 'eonmovies', 'cinemaluxe',
          'gokuhd', 'ridomovies', 'protonmovies', 'kisskh', 'gogoanime',
          'animerulz', 'yts', '1337x', 'moviesapi', 'kartoons', 'cinefreak',
          'everything', 'uniquestream', 'moviebox', 'skymoviehd'
        ]);

        const FORCE_ENABLED = new Set([
          'multi', 'movieBoxWeb', 'netflixMirror', 'disneyMirror', 'primeMirror',
          'castle', 'mxplayer', 'animesalt', 'animeworld', 'hiAnime', '4khdhub',
          'hdhub4u', 'vega', 'drive', 'moviesmod', 'mod', 'uhd', 'movies4u', 'topmovies',
          'tpb', 'gramcinema', 'olamovies', 'showbox', 'flixhq', 'dramacool', 'filmyfly',
          'moviezwap', 'zeefliz', 'torrentio', 'autoEmbed', 'anikoto'
        ]);

        remoteList = res.data.map((p) => {
          const valLower = (p.value || '').toLowerCase();
          const isLegacyMovieBoxApp = p.value === 'movieBox';
          const isMovieBoxWeb = p.value === 'movieBoxWeb';
          const isUnsupported = UNSUPPORTED.has(valLower);
          const isForceEnabled = FORCE_ENABLED.has(valLower) || FORCE_ENABLED.has(p.value);

          let isDisabled = Boolean(p.disabled) || isLegacyMovieBoxApp || isUnsupported;
          if (isForceEnabled) isDisabled = false;

          return {
            name: isMovieBoxWeb ? 'MovieBox' : p.display_name,
            value: p.value,
            version: p.version,
            icon: p.icon || '',
            type: p.type || 'global',
            disabled: isDisabled,
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

    this.cachedProviders = merged;
    this.lastFetched = now;
    return this.cachedProviders;
  }
}

module.exports = new ManifestService();
