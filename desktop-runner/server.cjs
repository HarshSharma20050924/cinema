const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(cors());
app.use(express.json());

const { playInVlc } = require('./server/controllers/vlcController.cjs');
app.post('/api/play-vlc', playInVlc);
app.get('/api/play-vlc', playInVlc);

const ZENDA_RAW = 'https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main';
const moduleCache = new Map();
const serverCache = require('./server/services/cacheService.cjs');

const PROVIDER_DISPLAY_NAMES = {
  hdhub4u: 'HDHub4u',
  olamovies: 'OlaMovies',
  gramcinema: 'Gram Cinema',
  vega: 'VMovies',
  topmovies: 'TopMovies',
  moviesmod: 'MoviesMod',
  katmovies: 'KatMoviesHD',
  katmoviehd: 'KatMovieHD',
  katmoviefix: 'KatMovieFix',
  kisskh: 'KissKH',
  animepahe: 'AnimePahe',
  luxmovies: 'LuxMovies',
  mod: 'MoviesMod',
  extra: 'ExtraMovies',
  cine: 'Cinevood',
  moviebox: 'MovieBox',
  movieboxweb: 'MovieBox',
  allmoviesforyou: 'AllMoviesForYou',
  tpb: 'ThePirateBay',
  thepiratebay: 'ThePirateBay',
};

function getProviderDisplayName(key) {
  if (!key) return 'Cinema';
  const clean = key.toLowerCase().trim();
  if (PROVIDER_DISPLAY_NAMES[clean]) return PROVIDER_DISPLAY_NAMES[clean];
  return key.charAt(0).toUpperCase() + key.slice(1);
}

const katmoviesProvider = {
  catalog: require('./server/providers/katmovies/catalog.cjs'),
  posts:   require('./server/providers/katmovies/posts.cjs'),
  meta:    require('./server/providers/katmovies/meta.cjs'),
  stream:  require('./server/providers/katmovies/stream.cjs'),
};

// ── GramCinema (bollywood.eu.org) local provider ──────────────────────────────
const LOCAL_PROVIDERS = {
  gramcinema: {
    catalog: require('./server/providers/gramcinema/catalog.cjs'),
    posts:   require('./server/providers/gramcinema/posts.cjs'),
    meta:    require('./server/providers/gramcinema/meta.cjs'),
    stream:  require('./server/providers/gramcinema/stream.cjs'),
  },
  olamovies: {
    catalog: require('./server/providers/olamovies/catalog.cjs'),
    posts:   require('./server/providers/olamovies/posts.cjs'),
    meta:    require('./server/providers/olamovies/meta.cjs'),
    stream:  require('./server/providers/olamovies/stream.cjs'),
  },
  tpb: {
    catalog: require('./server/providers/tpb/catalog.cjs'),
    posts:   require('./server/providers/tpb/posts.cjs'),
    meta:    require('./server/providers/tpb/meta.cjs'),
    stream:  require('./server/providers/tpb/stream.cjs'),
  },
  katmovies: katmoviesProvider,
  katmoviehd: katmoviesProvider,
  katmoviefix: katmoviesProvider,
};

// Bearer token for GramCinema (hardcoded + persisted)
const HARDCODED_GRAMCINEMA_TOKEN =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjQ3MDYwLCJlbWFpbCI6ImJhbmdsYWRlc2hzZXJ2ZXIwMDk3QGdtYWlsLmNvbSIsImV4cCI6MTc5ODk4NTM0OCwiaWF0IjoxNzkxMjA5MzQ4fQ.lIWMqvGQHum90cGTiCilr645wu-UAc7nLf0LHIRNwYY';

const TOKEN_FILE = path.join(__dirname, '.gramcinema_token');
let gramcinemaToken = process.env.GRAMCINEMA_TOKEN || '';
if (!gramcinemaToken && fs.existsSync(TOKEN_FILE)) {
  try {
    gramcinemaToken = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  } catch (_) {}
}
if (!gramcinemaToken) {
  gramcinemaToken = HARDCODED_GRAMCINEMA_TOKEN;
}

// Standard providerContext required by Zenda-Cross scrapers
const providerContext = {
  axios,
  cheerio,
  commonHeaders: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  },
  Aes: {},
  get gramcinemaToken() { return gramcinemaToken; },
  get settings() { return { gramcinemaToken }; },
};



// Helper to get a provider module — checks local providers first, then fetches from Zenda
async function getProviderModule(provider, moduleName) {
  // Local providers (GramCinema etc.) take priority
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

// 0. GramCinema token settings
app.get('/api/settings/gramcinema-token', (req, res) => {
  res.json({ hasToken: !!gramcinemaToken, tokenPreview: gramcinemaToken ? gramcinemaToken.slice(0, 20) + '...' : '' });
});

app.post('/api/settings/gramcinema-token', express.json(), (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token is required' });
  gramcinemaToken = String(token).trim();
  try {
    fs.writeFileSync(TOKEN_FILE, gramcinemaToken, 'utf8');
  } catch (err) {
    console.error('Failed to write TOKEN_FILE:', err.message);
  }
  console.log('🔑 GramCinema token updated');
  res.json({ success: true, hasToken: !!gramcinemaToken });
});

// 1. Live Manifest: 52+ real providers + local providers
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

    // Add local GramCinema provider
    providers.push({
      name: 'GramCinema',
      value: 'gramcinema',
      version: '1.0',
      icon: 'https://bollywood.eu.org/images/favicon.svg',
      type: 'hindi',
      disabled: false,
      description: 'Bollywood, South, Dual Audio — TG Archive (bollywood.eu.org)',
    });

    // Add local OlaMovies provider
    providers.push({
      name: 'OlaMovies',
      value: 'olamovies',
      version: '1.0',
      icon: '/icons/olamovies.svg',
      type: 'hindi',
      disabled: false,
      description: 'Highest Quality 4K UHD, 1080p Movies & Series (v6.olamovies.mov)',
    });

    // Add local ThePirateBay provider
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
    console.error('Failed to fetch manifest:', error.message);
    // Fallback: return only local providers
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

// 2. Real Catalog / Categories for a provider
app.get('/api/catalog', async (req, res) => {
  try {
    const { provider = 'autoEmbed' } = req.query;
    const catalogMod = await getProviderModule(provider, 'catalog');
    let catalog = catalogMod.catalog || [];
    let genres = catalogMod.genres || [];

    // Augment with rich categories if hdhub4u
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
    console.warn(`No catalog found for ${req.query.provider}:`, error.message);
    res.json({ catalog: [{ title: 'Popular', filter: '' }], genres: [] });
  }
});

// 3. Real Posts (Browse category/page)
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
    console.warn(`Posts error (${req.query.provider}), trying fallback search:`, error.message);
    // If static category page failed (e.g. 404 on a genre link), fallback to search for the keyword!
    try {
      const cleanQ = (req.query.filter || '').replace(/^\/category\//, '').replace(/^\//, '').replace(/[-_]/g, ' ').trim();
      if (cleanQ) {
        const postsMod = await getProviderModule(req.query.provider, 'posts');
        if (postsMod && postsMod.getSearchPosts) {
          const fallbackPosts = await postsMod.getSearchPosts({
            searchQuery: cleanQ,
            page: parseInt(req.query.page, 10) || 1,
            providerValue: req.query.provider,
            providerContext,
            signal: new AbortController().signal,
          });
          if (Array.isArray(fallbackPosts) && fallbackPosts.length > 0) {
            const pName = getProviderDisplayName(req.query.provider);
            return res.json(
              fallbackPosts.map((item) => ({
                ...item,
                provider: item.provider || req.query.provider,
                providerName: item.providerName || pName,
              }))
            );
          }
        }
      }
    } catch (fallbackErr) {
      console.warn("Fallback genre search failed:", fallbackErr.message);
    }
    res.json([]);
  }
});

// 4. Real Search (Fast with caching, 5.5s timeout, tagged with provider info)
app.get('/api/search', async (req, res) => {
  try {
    const { provider = 'autoEmbed', q = '', page = 1 } = req.query;
    if (!q || !q.trim()) {
      return res.json([]);
    }

    const normQ = q.trim().toLowerCase();
    const cacheKey = `search:${provider}:${normQ}:${page}`;
    const cached = serverCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const postsMod = await getProviderModule(provider, 'posts');
    if (!postsMod || !postsMod.getSearchPosts) {
      return res.json([]);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5500);

    const posts = await Promise.race([
      postsMod.getSearchPosts({
        searchQuery: q.trim(),
        page: parseInt(page, 10) || 1,
        providerValue: provider,
        providerContext,
        signal: controller.signal,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Search timeout')), 5500)),
    ]);
    clearTimeout(timeoutId);

    const pName = getProviderDisplayName(provider);
    const tagged = Array.isArray(posts)
      ? posts.map((item) => ({
          ...item,
          provider: item.provider || provider,
          providerName: item.providerName || pName,
        }))
      : [];

    if (tagged.length > 0) {
      serverCache.set(cacheKey, tagged, 10 * 60 * 1000);
    }

    res.json(tagged);
  } catch (error) {
    console.warn(`Search error (${req.query.provider}):`, error.message);
    res.json([]);
  }
});

// 4b. Global Search Across Providers
const { globalSearch } = require('./server/controllers/postsController.cjs');
app.get('/api/search/global', globalSearch);
app.get('/api/global-search', globalSearch);

// 5. Real Details / Meta
app.get('/api/meta', async (req, res) => {
  try {
    const { provider = 'autoEmbed', link } = req.query;
    if (!link) {
      return res.status(400).json({ error: 'Missing link parameter' });
    }

    const metaMod = await getProviderModule(provider, 'meta');
    if (!metaMod.getMeta) {
      return res.status(500).json({ error: 'Provider has no getMeta function' });
    }

    let meta = await metaMod.getMeta({
      link,
      providerContext,
    });

    // Universal episode enrichment for providers that return episodesLink (e.g. MovieBoxWeb, Goku, etc.)
    if (meta) {
      meta = await enrichMetaEpisodes(provider, meta);
    }

    // HDHub4u series episode extractor (for Game of Thrones, etc.)
    if (meta && provider.toLowerCase().includes('hdhub')) {
      meta = await enrichHdhubEpisodes(link, meta);
    }

    res.json(meta || null);
  } catch (error) {
    console.error(`Meta error (${req.query.provider}):`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Enrich meta with real episodes if provider uses episodesLink
async function enrichMetaEpisodes(provider, meta) {
  if (!meta) return meta;
  const hasEpisodesLink =
    (Array.isArray(meta.linkList) &&
      meta.linkList.some(
        (g) => g.episodesLink && (!g.directLinks || g.directLinks.length === 0)
      )) ||
    meta.episodesLink;

  if (!hasEpisodesLink) return meta;

  try {
    const epMod = await getProviderModule(provider, 'episodes');
    if (!epMod || !epMod.getEpisodes) return meta;

    const rawGroups =
      Array.isArray(meta.linkList) && meta.linkList.length > 0
        ? meta.linkList
        : [{ title: meta.title || 'Episodes', episodesLink: meta.episodesLink }];

    // Prioritize popular tracks (Hindi first, then Original Audio, then English)
    const preferredLangs = ['hindi', 'original', 'english'];
    const sortedGroups = [...rawGroups].sort((a, b) => {
      const aT = (a.title || '').toLowerCase();
      const bT = (b.title || '').toLowerCase();
      const aP = preferredLangs.findIndex((l) => aT.includes(l));
      const bP = preferredLangs.findIndex((l) => bT.includes(l));
      if (aP !== -1 && bP !== -1) return aP - bP;
      if (aP !== -1) return -1;
      if (bP !== -1) return 1;
      return 0;
    });

    const groupsToProcess = sortedGroups.slice(0, 3);
    const newLinkList = [];

    for (const g of groupsToProcess) {
      if (g.episodesLink && (!g.directLinks || g.directLinks.length === 0)) {
        try {
          const eps = await epMod.getEpisodes({
            url: g.episodesLink,
            providerContext,
          });

          if (Array.isArray(eps) && eps.length > 0) {
            const seasonMap = new Map();
            for (const ep of eps) {
              const sMatch =
                (ep.title || '').match(/S0*(\d+)/i) ||
                (ep.title || '').match(/Season\s*0*(\d+)/i);
              const sNum = sMatch ? parseInt(sMatch[1], 10) : 1;
              const sKey = `Season ${sNum}`;
              if (!seasonMap.has(sKey)) seasonMap.set(sKey, []);
              seasonMap.get(sKey).push(ep);
            }

            if (seasonMap.size > 1) {
              for (const [seasonTitle, sEps] of seasonMap.entries()) {
                const prefix =
                  groupsToProcess.length > 1 && g.title && !g.title.toLowerCase().includes('original')
                    ? `${g.title} - `
                    : '';
                newLinkList.push({
                  title: `${prefix}${seasonTitle}`,
                  directLinks: sEps,
                });
              }
            } else {
              newLinkList.push({
                ...g,
                directLinks: eps,
              });
            }
          } else {
            newLinkList.push(g);
          }
        } catch (epErr) {
          console.warn(`Failed to resolve episodes for ${g.title}:`, epErr.message);
          newLinkList.push(g);
        }
      } else {
        newLinkList.push(g);
      }
    }

    if (newLinkList.length > 0) {
      meta.linkList = newLinkList;
    }
  } catch (err) {
    console.warn(`Episode enrichment error for ${provider}:`, err.message);
  }

  return meta;
}

// Helper: Extract single episodes and preserve packs for HDHub4u series
async function enrichHdhubEpisodes(link, meta) {
  if (!meta) return meta;
  const isSeries =
    meta.type === 'series' ||
    /season|episodes|tvseries|series/i.test(meta.title || '') ||
    /season|episodes|tvseries/i.test(link || '');

  if (!isSeries) return meta;

  try {
    const domainResolver = require('./server/services/domainResolver.cjs');
    await domainResolver.syncUrls();
    const baseUrl = domainResolver.getBaseUrl('hdhub4u') || 'https://new1.hdhub4u.free';
    const pageUrl = link.startsWith('http')
      ? link
      : `${baseUrl.replace(/\/+$/, '')}/${link.replace(/^\/+/, '')}`;

    const res = await axios.get(pageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Cookie: 'xla=s4t',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(res.data);
    const container = $('.entry-content').length ? $('.entry-content') : $('body');
    const singleEpisodes = [];

    container.find('h1, h2, h3, h4, h5, p, div').each((_, el) => {
      const text = $(el).text().trim();
      if (!text) return;

      const epMatch = text.match(/^(E|EP|Episode)\s*0*(\d+)\b/i);
      if (epMatch) {
        const epNum = parseInt(epMatch[2], 10);
        const epTitle = `Episode ${epNum}`;

        const servers = [];
        $(el).find('a').each((_a, aEl) => {
          const href = $(aEl).attr('href');
          const aText = $(aEl).text().trim() || 'Download';
          if (href && (href.startsWith('http') || href.startsWith('/'))) {
            servers.push({
              server: aText,
              link: href,
            });
          }
        });

        if (servers.length > 0 && !singleEpisodes.some((e) => e.title === epTitle)) {
          const primaryLink =
            servers.find((s) => /instant|drive|hubcdn/i.test(s.server))?.link || servers[0].link;
          singleEpisodes.push({
            title: epTitle,
            link: primaryLink,
            servers: servers,
          });
        }
      }
    });

    if (singleEpisodes.length > 0) {
      singleEpisodes.sort((a, b) => {
        const nA = parseInt(a.title.replace(/\D/g, ''), 10) || 0;
        const nB = parseInt(b.title.replace(/\D/g, ''), 10) || 0;
        return nA - nB;
      });

      const existingPacks = Array.isArray(meta.linkList)
        ? meta.linkList.filter(
            (g) =>
              /pack|zip|batch|complete|all episodes/i.test(g.title || '') ||
              (!Array.isArray(g.directLinks) || g.directLinks.length <= 1)
          )
        : [];

      meta.seasonPacks = existingPacks;
      meta.linkList = [
        {
          title: 'Single Episodes',
          quality: 'HD',
          directLinks: singleEpisodes,
        },
        ...existingPacks,
      ];
    }
  } catch (err) {
    console.warn('enrichHdhubEpisodes failed:', err.message);
  }

  return meta;
}

// 6. Real Stream & Direct Download Links
const streamCache = new Map();

app.get('/api/streams', async (req, res) => {
  try {
    const { provider = 'autoEmbed', link, type = 'movie', download = 'false' } = req.query;
    if (!link) {
      return res.status(400).json({ error: 'Missing link parameter' });
    }

    const cacheKey = `${provider}:${link}:${type}:${download}`;
    const cached = streamCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return res.json(cached.data);
    }

    const streamMod = await getProviderModule(provider, 'stream');
    if (!streamMod.getStream) {
      return res.status(500).json({ error: 'Provider has no getStream function' });
    }

    const isDownload = download === 'true' || download === true;
    const streams = await streamMod.getStream({
      link,
      type,
      isDownload,
      providerContext,
      signal: new AbortController().signal,
    });

    const result = streams || [];
    if (result.length > 0) {
      streamCache.set(cacheKey, { data: result, expires: Date.now() + 60 * 60 * 1000 });
    }
    res.json(result);
  } catch (error) {
    console.error(`Stream error (${req.query.provider}):`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Torrent Stream & Download Handlers
app.get('/api/stream/torrent', async (req, res) => {
  const hash = req.query.hash || req.query.infoHash;
  const name = req.query.name || '';
  if (!hash) return res.status(400).send('infoHash parameter required');
  const torrentService = require('./server/services/torrentService.cjs');
  await torrentService.handleStream(req, res, hash, name);
});

app.get('/api/torrent/download', async (req, res) => {
  const hash = req.query.hash || req.query.infoHash;
  const name = req.query.name || '';
  if (!hash) return res.status(400).send('infoHash parameter required');
  const torrentService = require('./server/services/torrentService.cjs');
  await torrentService.handleDownload(req, res, hash, name);
});

// 7. Video Stream / Download Header Proxy
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

// 8. Download Route with Full Mirror & HLS Support
const { downloadFile } = require('./server/controllers/proxyController.cjs');
app.get('/api/download', downloadFile);

// 9. Cinemeta Poster Proxy (solves browser CORS restrictions)
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

// 10. General Image Proxy (solves browser adblockers, Brave Shield ERR_BLOCKED_BY_CLIENT & hotlinking)
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
  console.log(`🎬 Zenda-Cross Real Cinema Engine running on http://0.0.0.0:${PORT}`);

  // Start 24/7 Bulk Channel Auto-Poster when Node Runner is on
  if (process.env.ENABLE_AUTO_POSTER !== 'false') {
    try {
      const { start247AutoPoster } = require('./server/services/channelPosterWorker.cjs');
      start247AutoPoster();
    } catch (err) {
      console.warn('AutoPoster startup notice:', err.message);
    }
  }
});

