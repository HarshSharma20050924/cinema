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
      '4k': '4khdhub',

      // CinemaWood (Bollywood & Desi)
      moviesmod: 'mod',
      modworld: 'mod',
      hdhub: 'hdhub4u',
      moviesdrive: 'drive',
      mx: 'mxplayer',

      // Hollywood & OTT Series
      moviebox: 'movieBoxWeb',
      movieboxweb: 'movieBoxWeb',
      multimovies: 'multi',
      netflix: 'netflixMirror',
      disney: 'disneyMirror',
      prime: 'primeMirror',

      // Anime
      hianime: 'hiAnime',

      // Torrents
      thepiratebay: 'tpb',
      piratebay: 'tpb',
    };
    return map[p.toLowerCase()] || p;
  }

  getProviderContext(providerValue) {
    const pVal = this.normalizeProvider(providerValue);
    const resolvedBaseUrl = domainResolver.getBaseUrl(pVal) || '';

    const scopedAxios = (urlOrConfig, config) => {
      let merged = {};
      if (typeof urlOrConfig === 'string') {
        merged = { ...(config || {}), url: urlOrConfig };
      } else {
        merged = { ...(urlOrConfig || {}) };
      }
      if (!merged.baseURL && resolvedBaseUrl) {
        merged.baseURL = resolvedBaseUrl;
      }
      return smartAxios(merged);
    };
    scopedAxios.get = (url, cfg) => scopedAxios(url, { ...(cfg || {}), method: 'GET' });
    scopedAxios.post = (url, data, cfg) => scopedAxios(url, { ...(cfg || {}), method: 'POST', data });
    scopedAxios.put = (url, data, cfg) => scopedAxios(url, { ...(cfg || {}), method: 'PUT', data });
    scopedAxios.delete = (url, cfg) => scopedAxios(url, { ...(cfg || {}), method: 'DELETE' });
    scopedAxios.defaults = { baseURL: resolvedBaseUrl, headers: { ...DEFAULT_HEADERS } };

    return {
      baseUrl: resolvedBaseUrl,
      axios: scopedAxios,
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
