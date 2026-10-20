const axios = require('axios');
const { smartAxios } = require('./smartFetcher.cjs');
const cheerio = require('cheerio');
const domainResolver = require('./domainResolver.cjs');
const { ZENDA_RAW, DEFAULT_HEADERS } = require('../config/constants.cjs');

const crypto = require('crypto');

const CryptoPolyfill = {
  digestStringAsync: async (algo, str, opts) => {
    const hash = crypto.createHash(String(algo || 'sha256').toLowerCase().replace(/[^a-z0-9]/g, ''));
    hash.update(str);
    return hash.digest(opts?.encoding === 'base64' ? 'base64' : 'hex');
  },
  randomUUID: () => crypto.randomUUID(),
  getRandomBytes: (n) => crypto.randomBytes(n),
  getRandomBytesAsync: async (n) => crypto.randomBytes(n),
  getRandomValues: (arr) => crypto.getRandomValues(arr),
  CryptoDigestAlgorithm: {
    SHA1: 'SHA-1',
    SHA256: 'SHA-256',
    SHA384: 'SHA-384',
    SHA512: 'SHA-512',
    MD5: 'MD5',
  },
  CryptoEncoding: {
    HEX: 'hex',
    BASE64: 'base64',
  },
};

class ZendaEngine {
  constructor() {
    this.moduleCache = new Map();
    this.kvStorage = new Map();
  }

  normalizeProvider(provider) {
    if (!provider) return '';
    const p = String(provider).trim();
    const map = {
      // 4K UHD
      uhdmovies: 'uhd',
      cinemaluxe: 'uhd',

      // Bollywood & Desi (CinemaWood)
      moviesmod: 'mod',
      modworld: 'mod',
      bollyflix: 'hdhub4u',
      moviesflix: 'vega',
      extramovies: 'world4u',
      world4ufree: 'world4u',
      skymovieshd: 'movies4u',
      filmyfly: 'movies4u',
      topmovies: 'drive',
      katmoviehd: 'drive',
      kat: 'drive',
      cinevood: '1cinevood',
      luxmovies: 'luxMovies',
      eonmovies: 'eonMovies',
      moviezwap: 'moviezwap',
      zeefliz: 'zeefliz',
      movies4u: 'movies4u',
      hdhub: 'hdhub4u',

      // Hollywood & OTT Series
      moviebox: 'movieBoxWeb',
      movieboxweb: 'movieBoxWeb',
      showbox: 'movieBoxWeb',
      multimovies: 'multi',
      gokuhd: 'movieBoxWeb',
      protonmovies: 'protonMovies',
      ridomovies: 'protonMovies',
      flixhq: 'movieBoxWeb',

      // Anime & Asian Drama
      hianime: 'animeworld',
      kisskh: 'animeworld',
      gogoanime: 'animeworld',
      animerulz: 'animesalt',
      anikoto: 'animeworld',
      animeworld: 'animeworld',
      dramacool: 'animeworld',

      // Torrents
      thepiratebay: 'tpb',
      yts: 'tpb',
      '1337x': 'tpb',
    };
    return map[p.toLowerCase()] || p;
  }

  getProviderContext(providerValue) {
    const pVal = this.normalizeProvider(providerValue);
    const resolvedBaseUrl = domainResolver.getBaseUrl(pVal) || '';
    return {
      baseUrl: resolvedBaseUrl,
      axios: smartAxios,
      cheerio,
      commonHeaders: { ...DEFAULT_HEADERS },
      Aes: {},
      Crypto: CryptoPolyfill,
      openWebView: async (url, options) => {
        try {
          const res = await smartAxios.get(url, {
            headers: options?.headers || DEFAULT_HEADERS,
            timeout: options?.timeoutMs || 15000,
          });
          return {
            data: res.data || '',
            cookies: '',
            cookieMap: {},
            userAgent: DEFAULT_HEADERS['User-Agent'],
            url,
          };
        } catch (e) {
          return {
            data: e.response?.data || '',
            cookies: '',
            cookieMap: {},
            userAgent: DEFAULT_HEADERS['User-Agent'],
            url,
          };
        }
      },
      getBaseUrl: (p) => {
        const val = domainResolver.getBaseUrl(p || pVal);
        const prom = Promise.resolve(val);
        prom.toString = () => val;
        prom.valueOf = () => val;
        return prom;
      },
      kvStore: {
        get: async (key) => this.kvStorage.get(key),
        set: async (key, val) => this.kvStorage.set(key, val),
        delete: async (key) => this.kvStorage.delete(key),
        keys: async () => Array.from(this.kvStorage.keys()),
        clear: async () => this.kvStorage.clear(),
      },
    };
  }

  async loadModule(provider, moduleName) {
    const targetProvider = this.normalizeProvider(provider);
    const cacheKey = `${targetProvider}:${moduleName}`;
    if (this.moduleCache.has(cacheKey)) {
      return this.moduleCache.get(cacheKey);
    }

    // 1. Check local provider modules first (e.g. tpb, gramcinema, etc.)
    const fs = require('fs');
    const path = require('path');
    const localPathCjs = path.resolve(__dirname, `../providers/${targetProvider}/${moduleName}.cjs`);
    const localPathJs = path.resolve(__dirname, `../providers/${targetProvider}/${moduleName}.js`);
    if (fs.existsSync(localPathCjs)) {
      const localMod = require(localPathCjs);
      this.moduleCache.set(cacheKey, localMod);
      return localMod;
    }
    if (fs.existsSync(localPathJs)) {
      const localMod = require(localPathJs);
      this.moduleCache.set(cacheKey, localMod);
      return localMod;
    }

    const url = `${ZENDA_RAW}/dist/${targetProvider}/${moduleName}.js`;
    const response = await axios.get(url, { timeout: 12000 });
    const code = response.data;

    const mod = { exports: {} };
    const fn = new Function('exports', 'module', 'require', code);
    fn(mod.exports, mod, require);

    this.moduleCache.set(cacheKey, mod.exports);
    return mod.exports;
  }
}

module.exports = new ZendaEngine();
