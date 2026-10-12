const axios = require('axios');
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

  getProviderContext(providerValue) {
    return {
      axios,
      cheerio,
      commonHeaders: { ...DEFAULT_HEADERS },
      Aes: {},
      Crypto: CryptoPolyfill,
      openWebView: async (url, options) => {
        try {
          const res = await axios.get(url, {
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
      getBaseUrl: (pVal) => {
        const val = domainResolver.getBaseUrl(pVal || providerValue);
        const p = Promise.resolve(val);
        p.toString = () => val;
        p.valueOf = () => val;
        return p;
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
    const cacheKey = `${provider}:${moduleName}`;
    if (this.moduleCache.has(cacheKey)) {
      return this.moduleCache.get(cacheKey);
    }

    const url = `${ZENDA_RAW}/dist/${provider}/${moduleName}.js`;
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
