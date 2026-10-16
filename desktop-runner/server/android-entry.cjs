// Polyfills for Node 18 (libnode.so)
const { Blob } = require('buffer');
const { ReadableStream } = require('stream/web');
const { MessagePort } = require('worker_threads');
if (typeof globalThis.Blob === 'undefined') globalThis.Blob = Blob;
if (typeof globalThis.ReadableStream === 'undefined') globalThis.ReadableStream = ReadableStream;
if (typeof globalThis.MessagePort === 'undefined') globalThis.MessagePort = MessagePort;
if (typeof globalThis.File === 'undefined') {
  class File extends Blob {
    constructor(fileBits, fileName, options = {}) {
      super(fileBits, options);
      this.name = String(fileName);
      this.lastModified = options.lastModified || Date.now();
    }
    get [Symbol.toStringTag]() {
      return 'File';
    }
  }
  globalThis.File = File;
}

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Log helper to file & console
const LOG_FILE = path.join(__dirname, '..', 'server.log');
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch (_) {}
  console.log(...args);
}

const ZENDA_RAW = 'https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main';
const moduleCache = new Map();
const serverCache = require('./services/cacheService.cjs');

const PROVIDER_DISPLAY_NAMES = {
  hdhub4u: 'HDHub4u',
  olamovies: 'OlaMovies',
  gramcinema: 'Gram Cinema',
  vega: 'VMovies',
  topmovies: 'TopMovies',
  moviesmod: 'MoviesMod',
  katmoviehd: 'KatMovieHD',
  kisskh: 'KissKH',
  animepahe: 'AnimePahe',
  luxmovies: 'LuxMovies',
  mod: 'MoviesMod',
  extra: 'ExtraMovies',
  cine: 'Cinevood',
  moviebox: 'MovieBox',
  movieboxweb: 'MovieBox',
  allmoviesforyou: 'AllMoviesForYou',
};

function getProviderDisplayName(key) {
  if (!key) return 'Cinema';
  const clean = key.toLowerCase().trim();
  if (PROVIDER_DISPLAY_NAMES[clean]) return PROVIDER_DISPLAY_NAMES[clean];
  return key.charAt(0).toUpperCase() + clean.slice(1);
}

const LOCAL_PROVIDERS = {
  gramcinema: {
    catalog: require('./providers/gramcinema/catalog.cjs'),
    posts:   require('./providers/gramcinema/posts.cjs'),
    meta:    require('./providers/gramcinema/meta.cjs'),
    stream:  require('./providers/gramcinema/stream.cjs'),
  },
  olamovies: {
    catalog: require('./providers/olamovies/catalog.cjs'),
    posts:   require('./providers/olamovies/posts.cjs'),
    meta:    require('./providers/olamovies/meta.cjs'),
    stream:  require('./providers/olamovies/stream.cjs'),
  },
  tpb: {
    catalog: require('./providers/tpb/catalog.cjs'),
    posts:   require('./providers/tpb/posts.cjs'),
    meta:    require('./providers/tpb/meta.cjs'),
    stream:  require('./providers/tpb/stream.cjs'),
  },
};

let currentTunnelUrl = '';
let DEVICE_NAME = process.env.DEVICE_NAME || 'Cinema Mobile Node';

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

const kvMemoryStore = new Map();

const HARDCODED_GRAMCINEMA_TOKEN =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjQ3MDYwLCJlbWFpbCI6ImJhbmdsYWRlc2hzZXJ2ZXIwMDk3QGdtYWlsLmNvbSIsImV4cCI6MTc5ODk4NTM0OCwiaWF0IjoxNzkxMjA5MzQ4fQ.lIWMqvGQHum90cGTiCilr645wu-UAc7nLf0LHIRNwYY';

let gramcinemaToken = process.env.GRAMCINEMA_TOKEN || HARDCODED_GRAMCINEMA_TOKEN;

const providerContext = {
  axios,
  cheerio,
  commonHeaders: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  },
  Aes: {},
  Crypto: CryptoPolyfill,
  openWebView: async (url, options) => {
    try {
      const res = await axios.get(url, {
        headers: options?.headers || {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        timeout: options?.timeoutMs || 15000,
      });
      return {
        data: res.data || '',
        cookies: '',
        cookieMap: {},
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        url,
      };
    } catch (e) {
      return {
        data: e.response?.data || '',
        cookies: '',
        cookieMap: {},
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        url,
      };
    }
  },
  getBaseUrl: (pVal) => {
    const known = {
      hdhub4u: 'https://hdhub4u.tienda',
      vega: 'https://vegamovies.im',
      topmovies: 'https://topmovies.dad',
      katmoviehd: 'https://katmoviehd.mom',
      kisskh: 'https://kisskh.co',
      mod: 'https://moviesmod.day',
      moviesmod: 'https://moviesmod.day',
      luxmovies: 'https://new2.rogmovies.click',
      movieboxweb: 'https://officialmoviebox.com',
      kmMovies: 'https://kmmovies.cyou',
    };
    const val = known[pVal] || `https://${pVal}.com`;
    const p = Promise.resolve(val);
    p.toString = () => val;
    p.valueOf = () => val;
    return p;
  },
  kvStore: {
    get: async (k) => kvMemoryStore.get(k),
    set: async (k, v) => kvMemoryStore.set(k, v),
    delete: async (k) => kvMemoryStore.delete(k),
    keys: async () => Array.from(kvMemoryStore.keys()),
    clear: async () => kvMemoryStore.clear(),
  },
  get gramcinemaToken() { return gramcinemaToken; },
  get settings() { return { gramcinemaToken }; },
};

async function getProviderModule(provider, moduleName) {
  if (LOCAL_PROVIDERS[provider.toLowerCase()]) {
    const mod = LOCAL_PROVIDERS[provider.toLowerCase()][moduleName];
    if (mod) return mod;
  }

  const cacheKey = `${provider}:${moduleName}`;
  if (moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey);
  }

  const url = `${ZENDA_RAW}/dist/${provider}/${moduleName}.js`;
  const response = await axios.get(url, { timeout: 12000 });
  const code = response.data;

  const mod = { exports: {} };
  const fn = new Function('exports', 'module', 'require', code);
  fn(mod.exports, mod, require);

  moduleCache.set(cacheKey, mod.exports);
  return mod.exports;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

// Health check endpoint for NodeJSService.java & status polling
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    running: true,
    tunnelUrl: currentTunnelUrl || '',
    device: DEVICE_NAME,
  });
});

app.get('/api/settings/gramcinema-token', (req, res) => {
  res.json({ hasToken: !!gramcinemaToken, tokenPreview: gramcinemaToken ? gramcinemaToken.slice(0, 20) + '...' : '' });
});

app.get('/api/providers', async (req, res) => {
  try {
    const response = await axios.get(`${ZENDA_RAW}/manifest.json`, { timeout: 8000 });
    const providers = response.data
      .filter(p => !p.disabled)
      .map(p => ({
        name: p.display_name,
        value: p.value,
        version: p.version,
        icon: p.icon,
        type: p.type || 'global',
        disabled: false,
      }));

    providers.push({
      name: 'GramCinema',
      value: 'gramcinema',
      version: '1.0',
      icon: 'https://bollywood.eu.org/images/favicon.svg',
      type: 'hindi',
      disabled: false,
      description: 'Bollywood, South, Dual Audio — TG Archive',
    });

    providers.push({
      name: 'OlaMovies',
      value: 'olamovies',
      version: '1.0',
      icon: '/icons/olamovies.svg',
      type: 'hindi',
      disabled: false,
      description: 'Highest Quality 4K UHD, 1080p Movies & Series',
    });

    providers.push({
      name: 'ThePirateBay',
      value: 'tpb',
      version: '1.0',
      icon: '/icons/tpb.svg',
      type: 'global',
      disabled: false,
      description: 'The Pirate Bay (Movies & TV Series)',
    });

    res.json(providers);
  } catch (error) {
    log('Failed to fetch manifest:', error.message);
    res.json([{
      name: 'GramCinema',
      value: 'gramcinema',
      version: '1.0',
      icon: 'https://bollywood.eu.org/images/favicon.svg',
      type: 'hindi',
      disabled: false,
    }]);
  }
});

app.get('/api/catalog', async (req, res) => {
  try {
    const { provider = 'autoEmbed' } = req.query;
    const catalogMod = await getProviderModule(provider, 'catalog');
    let catalog = catalogMod.catalog || [];
    let genres = catalogMod.genres || [];

    if (provider.toLowerCase() === 'hdhub4u') {
      const extraCategories = [
        { title: 'Bollywood Movies', filter: '/category/bollywood-movies' },
        { title: 'Hindi Dubbed', filter: '/category/hindi-dubbed' },
        { title: 'Anime', filter: '/category/anime' },
      ];
      for (const extra of extraCategories) {
        if (!catalog.some(c => c.filter === extra.filter)) {
          catalog.push(extra);
        }
      }
    }

    res.json({ catalog, genres });
  } catch (error) {
    log(`No catalog found for ${req.query.provider}:`, error.message);
    res.json({ catalog: [{ title: 'Popular', filter: '' }], genres: [] });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const { provider = 'autoEmbed', filter = '', page = 1 } = req.query;
    const postsMod = await getProviderModule(provider, 'posts');

    if (!postsMod.getPosts) {
      return res.json([]);
    }

    const posts = await postsMod.getPosts({
      filter: filter || '',
      page: parseInt(page, 10),
      providerValue: provider,
      providerContext,
      signal: new AbortController().signal,
    });

    const pName = getProviderDisplayName(provider);
    const tagged = Array.isArray(posts)
      ? posts.map((item) => ({
          ...item,
          provider: item.provider || provider,
          providerName: item.providerName || pName,
        }))
      : [];

    res.json(tagged);
  } catch (error) {
    log(`Posts error (${req.query.provider}):`, error.message);
    try {
      const cleanQ = (req.query.filter || '').replace(/^\/category\//, '').replace(/^\//, '').replace(/[-_]/g, ' ').trim();
      if (cleanQ) {
        const postsMod = await getProviderModule(req.query.provider, 'posts');
        if (postsMod && postsMod.getSearchPosts) {
          const posts = await postsMod.getSearchPosts({
            searchQuery: cleanQ,
            page: parseInt(req.query.page || 1, 10),
            providerValue: req.query.provider,
            providerContext,
            signal: new AbortController().signal,
          });
          const pName = getProviderDisplayName(req.query.provider);
          return res.json(Array.isArray(posts) ? posts.map(item => ({ ...item, provider: item.provider || req.query.provider, providerName: item.providerName || pName })) : []);
        }
      }
    } catch (_) {}
    res.json([]);
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const provider = req.query.provider || 'autoEmbed';
    const query = (req.query.query || req.query.q || '').trim();
    const page = parseInt(req.query.page || 1, 10);
    if (!query) return res.json([]);

    const postsMod = await getProviderModule(provider, 'posts');
    if (!postsMod.getSearchPosts) return res.json([]);

    const posts = await postsMod.getSearchPosts({
      searchQuery: query,
      page,
      providerValue: provider,
      providerContext,
      signal: new AbortController().signal,
    });

    const pName = getProviderDisplayName(provider);
    const tagged = Array.isArray(posts)
      ? posts.map((item) => ({
          ...item,
          provider: item.provider || provider,
          providerName: item.providerName || pName,
        }))
      : [];

    res.json(tagged);
  } catch (error) {
    log(`Search error (${req.query.provider}):`, error.message);
    res.json([]);
  }
});

async function resolveProviderEpisodes(provider, meta, context) {
  const hasEpisodesLink =
    (Array.isArray(meta?.linkList) && meta.linkList.some((g) => g && g.episodesLink)) ||
    meta?.episodesLink;

  if (!hasEpisodesLink) return null;

  try {
    const epMod = await getProviderModule(provider, 'episodes');
    if (!epMod || !epMod.getEpisodes) return null;

    const rawGroups =
      Array.isArray(meta.linkList) && meta.linkList.length > 0
        ? meta.linkList
        : [{ title: meta.title || 'Episodes', episodesLink: meta.episodesLink }];

    // Sort to prioritize popular tracks (Hindi, Original, English)
    const preferredLangs = ['hindi', 'original', 'english'];
    const sortedGroups = [...rawGroups].sort((a, b) => {
      const aT = (a.title || a.language || '').toLowerCase();
      const bT = (b.title || b.language || '').toLowerCase();
      const aP = preferredLangs.findIndex((l) => aT.includes(l));
      const bP = preferredLangs.findIndex((l) => bT.includes(l));
      if (aP !== -1 && bP !== -1) return aP - bP;
      if (aP !== -1) return -1;
      if (bP !== -1) return 1;
      return aT.localeCompare(bT);
    });

    const resolvedGroups = [];
    await Promise.all(
      sortedGroups.map(async (g) => {
        if (g.episodesLink) {
          try {
            const eps = await epMod.getEpisodes({
              url: g.episodesLink,
              providerContext: context,
            });

            if (Array.isArray(eps) && eps.length > 0) {
              const seasonMap = new Map();
              for (const ep of eps) {
                let seasonNum = 1;
                let epTitle = ep.title || 'Episode';

                if (typeof ep.link === 'string' && ep.link.startsWith('{')) {
                  try {
                    const parsed = JSON.parse(ep.link);
                    if (parsed.season) seasonNum = Number(parsed.season);
                    if (parsed.episode && (!epTitle || epTitle === 'Episode')) {
                      epTitle = `Episode ${parsed.episode}`;
                    }
                  } catch (_) {}
                }

                if (seasonNum === 1) {
                  const sMatch = epTitle.match(/S0*(\d+)/i) || epTitle.match(/Season\s*0*(\d+)/i);
                  if (sMatch) seasonNum = parseInt(sMatch[1], 10);
                }

                if (!seasonMap.has(seasonNum)) seasonMap.set(seasonNum, []);
                seasonMap.get(seasonNum).push({
                  title: epTitle,
                  link: ep.link,
                });
              }

              const sortedSeasons = Array.from(seasonMap.keys()).sort((a, b) => a - b);
              for (const sNum of sortedSeasons) {
                resolvedGroups.push({
                  title: `Season ${sNum}`,
                  season: sNum,
                  dub: g.title || g.language || 'Default Audio',
                  quality: g.quality || 'HD',
                  directLinks: seasonMap.get(sNum),
                });
              }
            } else if (Array.isArray(g.directLinks)) {
              resolvedGroups.push(g);
            }
          } catch (epErr) {
            log(`Failed to resolve episodes for ${g.title}:`, epErr.message);
            if (Array.isArray(g.directLinks)) resolvedGroups.push(g);
          }
        } else if (Array.isArray(g.directLinks)) {
          resolvedGroups.push(g);
        }
      })
    );

    return resolvedGroups.length > 0 ? resolvedGroups : null;
  } catch (err) {
    log(`resolveProviderEpisodes error for ${provider}:`, err.message);
    return null;
  }
}

app.get('/api/meta', async (req, res) => {
  try {
    const { provider = 'autoEmbed', link } = req.query;
    if (!link) return res.status(400).json({ error: 'Missing link parameter' });

    const metaMod = await getProviderModule(provider, 'meta');
    if (!metaMod.getMeta) return res.status(500).json({ error: 'Provider has no getMeta function' });

    let meta = await metaMod.getMeta({
      link,
      providerValue: provider,
      providerContext,
      signal: new AbortController().signal,
    });

    if (meta) {
      const resolvedEpisodes = await resolveProviderEpisodes(provider, meta, providerContext);
      if (resolvedEpisodes) {
        meta.linkList = resolvedEpisodes;
      }
    }

    res.json(meta);
  } catch (error) {
    log(`Meta error (${req.query.provider}):`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Universal stream extractor for common video hosts / direct files
async function extractUniversalStreams(link, context) {
  if (!link || typeof link !== 'string') return [];
  const streams = [];

  // 1. Direct video URL (.mp4, .mkv, .m3u8, .webm)
  if (/\.(mp4|mkv|m3u8|webm)(\?.*)?$/i.test(link)) {
    const isM3u8 = link.includes('.m3u8');
    streams.push({
      server: 'Direct High-Speed CDN',
      link,
      type: isM3u8 ? 'm3u8' : 'mp4',
      quality: '1080p',
    });
    return streams;
  }

  // 2. Pixeldrain (/u/ID)
  const pdMatch = link.match(/pixeldrain\.(com|dev)\/u\/([a-zA-Z0-9]+)/i);
  if (pdMatch) {
    const fileId = pdMatch[2];
    streams.push({
      server: 'Pixeldrain Mirror',
      link: `https://pixeldrain.com/api/file/${fileId}?download`,
      type: 'mkv',
      quality: 'HD',
    });
    return streams;
  }

  // 3. MovieBoxWeb JSON link (contains detailPath or subjectId)
  if (link.startsWith('{') && (link.includes('detailPath') || link.includes('subjectId'))) {
    try {
      const mbStreamMod = await getProviderModule('movieBoxWeb', 'stream');
      if (mbStreamMod && mbStreamMod.getStream) {
        const mbStreams = await mbStreamMod.getStream({
          link,
          type: 'series',
          isDownload: false,
          providerContext: context,
        });
        if (Array.isArray(mbStreams) && mbStreams.length > 0) return mbStreams;
      }
    } catch (e) {
      log('MovieBox JSON extraction failed:', e.message);
    }
  }

  // 4. Hubcloud / Hubdrive / Greenmotors / Kmhd link
  if (
    link.includes('hubcloud') ||
    link.includes('gamerxyt.com') ||
    link.includes('vcloud') ||
    link.includes('hubdrive') ||
    link.includes('greenmotors') ||
    link.includes('kmhd')
  ) {
    try {
      const hcMod = await getProviderModule('katmovies', 'stream') || await getProviderModule('hdhub4u', 'stream');
      if (hcMod && hcMod.getStream) {
        const hcStreams = await hcMod.getStream({
          link,
          type: 'movie',
          isDownload: true,
          providerContext: context,
        });
        if (Array.isArray(hcStreams) && hcStreams.length > 0) return hcStreams;
      }
    } catch (e) {
      log('Hubcloud extraction failed:', e.message);
    }
  }

  return streams;
}

// Cross-provider backup search for working episode/movie streams
async function findBackupStreams(title, season, episode, context) {
  if (!title) return [];
  const cleanTitle = title.replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').replace(/S\d+.*$/i, '').trim();
  if (!cleanTitle) return [];

  log(`Searching cross-provider backup streams for: "${cleanTitle}" S${season || 1}E${episode || 1}`);

  try {
    const mbPosts = await getProviderModule('movieBoxWeb', 'posts');
    const searchRes = await mbPosts.getSearchPosts({
      searchQuery: cleanTitle,
      page: 1,
      providerValue: 'movieBoxWeb',
      providerContext: context,
    });
    if (Array.isArray(searchRes) && searchRes.length > 0) {
      const targetPost = searchRes[0];
      const mbMeta = await getProviderModule('movieBoxWeb', 'meta');
      const meta = await mbMeta.getMeta({
        link: targetPost.link,
        providerValue: 'movieBoxWeb',
        providerContext: context,
      });

      if (meta?.linkList && meta.linkList.length > 0) {
        const targetGroup = meta.linkList.find(g => (g.title || '').toLowerCase().includes('hindi')) || meta.linkList[0];
        if (targetGroup?.episodesLink) {
          const mbEps = await getProviderModule('movieBoxWeb', 'episodes');
          const eps = await mbEps.getEpisodes({
            url: targetGroup.episodesLink,
            providerContext: context,
          });
          if (Array.isArray(eps) && eps.length > 0) {
            const sTarget = Number(season || 1);
            const epTarget = Number(episode || 1);
            let matchedEp = eps.find(e => {
              if (typeof e.link === 'string' && e.link.startsWith('{')) {
                try {
                  const p = JSON.parse(e.link);
                  return Number(p.season) === sTarget && Number(p.episode) === epTarget;
                } catch (_) {}
              }
              return (e.title || '').includes(`E0${epTarget}`) || (e.title || '').includes(`E${epTarget}`);
            });
            if (!matchedEp) matchedEp = eps[0];

            if (matchedEp) {
              const mbStream = await getProviderModule('movieBoxWeb', 'stream');
              const streams = await mbStream.getStream({
                link: matchedEp.link,
                type: 'series',
                isDownload: false,
                providerContext: context,
              });
              if (Array.isArray(streams) && streams.length > 0) {
                return streams;
              }
            }
          }
        }
      }
    }
  } catch (err) {
    log('MovieBox backup search failed:', err.message);
  }

  return [];
}

const streamCache = new Map();
app.get('/api/streams', async (req, res) => {
  try {
    const { provider = 'autoEmbed', link, type = 'movie', download = 'false', title = '', season = '1', episode = '1' } = req.query;
    if (!link) return res.status(400).json({ error: 'Missing link parameter' });

    const cacheKey = `${provider}:${link}:${type}:${download}`;
    const cached = streamCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return res.json(cached.data);
    }

    let streams = [];
    try {
      const streamMod = await getProviderModule(provider, 'stream');
      if (streamMod && streamMod.getStream) {
        const isDownload = download === 'true' || download === true;
        streams = await streamMod.getStream({
          link,
          type,
          isDownload,
          providerContext,
          signal: new AbortController().signal,
        });
      }
    } catch (e) {
      log(`Primary stream resolution failed for ${provider}:`, e.message);
    }

    if (!Array.isArray(streams) || streams.length === 0) {
      log(`Primary stream returned 0 results for ${provider}. Trying universal extractors...`);
      streams = await extractUniversalStreams(link, providerContext);
    }

    if (!Array.isArray(streams) || streams.length === 0) {
      if (title) {
        log(`No universal streams found. Trying cross-provider backup search for "${title}"...`);
        streams = await findBackupStreams(title, season, episode, providerContext);
      }
    }

    const result = Array.isArray(streams) ? streams : [];
    if (result.length > 0) {
      streamCache.set(cacheKey, { data: result, expires: Date.now() + 60 * 60 * 1000 });
    }
    res.json(result);
  } catch (error) {
    log(`Stream error (${req.query.provider}):`, error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/proxy', async (req, res) => {
  try {
    const { url, referer } = req.query;
    if (!url) return res.status(400).send('URL required');

    const headers = {
      'User-Agent': providerContext.commonHeaders['User-Agent'],
    };
    if (url.includes('hakunaymatata.com') || url.includes('moviebox') || url.includes('inmoviebox.com')) {
      headers['Origin'] = 'https://officialmoviebox.com';
      headers['Referer'] = 'https://officialmoviebox.com/';
    } else if (referer) {
      headers['Referer'] = referer;
    }

    const response = await axios({
      method: 'get',
      url,
      headers,
      responseType: 'stream',
      timeout: 15000,
    });

    if (response.headers['content-type']) res.set('Content-Type', response.headers['content-type']);
    if (response.headers['content-length']) res.set('Content-Length', response.headers['content-length']);

    response.data.pipe(res);
  } catch (error) {
    res.status(500).send(`Proxy failed: ${error.message}`);
  }
});

// 8. Download Route with streaming support
app.get('/api/download', async (req, res) => {
  try {
    const { url, filename } = req.query;
    if (!url) return res.status(400).send('URL required');

    const headers = {
      'User-Agent': providerContext.commonHeaders['User-Agent'],
    };
    if (url.includes('hakunaymatata.com') || url.includes('moviebox') || url.includes('inmoviebox.com')) {
      headers['Origin'] = 'https://officialmoviebox.com';
      headers['Referer'] = 'https://officialmoviebox.com/';
    }

    const response = await axios({
      method: 'get',
      url,
      headers,
      responseType: 'stream',
      timeout: 30000,
    });

    if (filename) {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    }
    if (response.headers['content-type']) res.set('Content-Type', response.headers['content-type']);
    if (response.headers['content-length']) res.set('Content-Length', response.headers['content-length']);

    response.data.pipe(res);
  } catch (err) {
    log('Download proxy failed:', err.message);
    res.status(500).send(`Download failed: ${err.message}`);
  }
});

const posterMemoryCache = new Map();
app.get('/api/poster', async (req, res) => {
  const query = (req.query.query || '').trim();
  if (!query) return res.json({ poster: null });

  const cacheKey = query.toLowerCase();
  if (posterMemoryCache.has(cacheKey)) {
    return res.json({ poster: posterMemoryCache.get(cacheKey) });
  }

  try {
    const encoded = encodeURIComponent(query);
    const mRes = await axios.get(`https://v3-cinemeta.strem.io/catalog/movie/top/search=${encoded}.json`, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    let poster = mRes.data?.metas?.[0]?.poster;
    if (!poster) {
      const sRes = await axios.get(`https://v3-cinemeta.strem.io/catalog/series/top/search=${encoded}.json`, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      poster = sRes.data?.metas?.[0]?.poster;
    }

    if (poster) {
      posterMemoryCache.set(cacheKey, poster);
      return res.json({ poster });
    }
  } catch (_) {}

  posterMemoryCache.set(cacheKey, null);
  return res.json({ poster: null });
});

// General Image Proxy (solves browser adblockers, Brave Shield ERR_BLOCKED_BY_CLIENT & hotlinking)
app.get('/api/image-proxy', async (req, res) => {
  const imageUrl = (req.query.url || '').trim();
  if (!imageUrl || !imageUrl.startsWith('http')) {
    return res.status(400).send('Invalid url');
  }

  try {
    const upstream = await axios.get(imageUrl, {
      responseType: 'stream',
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': imageUrl,
      },
    });

    res.setHeader('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    upstream.data.pipe(res);
  } catch (err) {
    res.status(502).send('Image proxy error');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  log(`[CINEMA] 🚀 Server running on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  log('[CINEMA] Uncaught Exception:', err.message, err.stack);
});
