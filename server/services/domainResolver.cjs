const axios = require('axios');
const { ZENDA_RAW } = require('../config/constants.cjs');

class DomainResolver {
  constructor() {
    this.urls = {};
    this.lastFetched = 0;
    this.CACHE_DURATION = 1000 * 60 * 30; // 30 mins
    this.syncUrls().catch(() => {});
  }

  async syncUrls() {
    try {
      const now = Date.now();
      if (now - this.lastFetched < this.CACHE_DURATION && Object.keys(this.urls).length > 0) {
        return this.urls;
      }

      const res = await axios.get(`${ZENDA_RAW}/urls.json`, { timeout: 8000 });
      if (res.data && typeof res.data === 'object') {
        this.urls = res.data;
        this.lastFetched = now;
      }
    } catch (err) {
      // Use latest fallback domains
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
      const mb = this.urls['movieboxWeb']?.url?.replace(/\/+$/, '') || this.urls['movieboxweb']?.url?.replace(/\/+$/, '');
      if (mb) return mb;
    }
    if (key === 'hdhub' || key === 'hdhub4u') {
      const hd = this.urls['hdhub']?.url?.replace(/\/+$/, '') || this.urls['hdhub4u']?.url?.replace(/\/+$/, '');
      if (hd) return hd;
    }
    if (key === 'moviesmod' || key === 'mod') {
      const mm = this.urls['Moviesmod']?.url?.replace(/\/+$/, '') || this.urls['moviesmod']?.url?.replace(/\/+$/, '');
      if (mm) return mm;
    }
    if (key === 'kat' || key === 'katmovies' || key === 'katmoviehd') {
      const km = this.urls['kat']?.url?.replace(/\/+$/, '');
      if (km) return km;
    }

    const FALLBACK_DOMAINS = {
      vega: 'https://new1.vegamovies.lease',
      vegamovies: 'https://new1.vegamovies.lease',
      drive: 'https://new3.moviesdrive.beer',
      moviesdrive: 'https://new3.moviesdrive.beer',
      moviesmod: 'https://moviesmod.uk.com',
      mod: 'https://moviesmod.uk.com',
      hdhub: 'https://new8.hdhub4u.cl',
      hdhub4u: 'https://new8.hdhub4u.cl',
      moviebox: 'https://officialmoviebox.com',
      movieboxweb: 'https://officialmoviebox.com',
      '4khdhub': 'https://4khdhub.one',
      kat: 'https://new.katmoviehd.top',
      katmovies: 'https://new.katmoviehd.top',
      katmoviehd: 'https://new.katmoviehd.top',
      multi: 'https://m1.multimovies.courses',
      multimovies: 'https://m1.multimovies.courses',
      topmovies: 'https://moviesleech.club',
      uhdmovies: 'https://uhdmovies.us.org',
      uhd: 'https://uhdmovies.us.org',
      extramovies: 'https://extramovies.ist',
      extra: 'https://extramovies.ist',
    };

    return FALLBACK_DOMAINS[key] || '';
  }
}

module.exports = new DomainResolver();
