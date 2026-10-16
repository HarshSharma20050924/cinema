const axios = require('axios');
const { loadConfig } = require('./config.cjs');

const GENRES_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics'
};

let cachedApiUrl = null;
let lastCheckTime = 0;

async function getEffectiveApiUrl() {
  const cfg = loadConfig();
  const cloudflareApi = `${(cfg.WEB_URL || 'https://cinema-dwh.pages.dev').replace(/\/$/, '')}/api`;

  // 1. If local runner (127.0.0.1:3001) is active, use it for zero-latency testing
  try {
    await axios.get('http://127.0.0.1:3001/api/providers', { timeout: 800 });
    return 'http://127.0.0.1:3001/api';
  } catch (_) {}

  // 2. Otherwise always use Cloudflare Runner Gateway (routes to your Android phone runner)
  return cfg.CINEMA_API || cloudflareApi;
}

async function getAllProviders() {
  const apiUrl = await getEffectiveApiUrl();
  try {
    const res = await axios.get(`${apiUrl}/providers`, { timeout: 6000 });
    return Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    console.error('Failed to get providers:', e.message);
    return [];
  }
}

async function searchGlobal(query, customProviders = null) {
  const cfg = loadConfig();
  const apiUrl = await getEffectiveApiUrl();
  const providers = customProviders || cfg.enabledProviders;
  try {
    const pStr = Array.isArray(providers) ? providers.join(',') : '';
    const res = await axios.get(`${apiUrl}/global-search`, {
      params: { q: query, providers: pStr },
      timeout: 12000
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    console.error(`Global search error for "${query}":`, e.message);
    return [];
  }
}

async function searchSingleProvider(query, provider) {
  const apiUrl = await getEffectiveApiUrl();
  try {
    const res = await axios.get(`${apiUrl}/search`, {
      params: { provider, q: query },
      timeout: 10000
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    console.error(`Search single provider error (${provider}):`, e.message);
    return [];
  }
}

async function getLatestProviderPosts(provider, page = 1) {
  const apiUrl = await getEffectiveApiUrl();
  try {
    const res = await axios.get(`${apiUrl}/posts`, {
      params: { provider, page },
      timeout: 12000
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    console.warn(`Get latest posts error for ${provider}:`, e.message);
    return [];
  }
}

async function getMeta(link, provider = 'autoEmbed') {
  const apiUrl = await getEffectiveApiUrl();
  try {
    const res = await axios.get(`${apiUrl}/meta`, {
      params: { provider, link },
      timeout: 15000
    });
    return res.data || null;
  } catch (e) {
    console.error(`Get meta error for ${provider}:`, e.message);
    return null;
  }
}

async function getStreams(link, provider = 'autoEmbed', isDownload = false) {
  const apiUrl = await getEffectiveApiUrl();
  try {
    const res = await axios.get(`${apiUrl}/streams`, {
      params: {
        provider,
        link,
        download: isDownload ? 'true' : 'false'
      },
      timeout: 15000
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    console.error(`Get streams error for ${provider}:`, e.message);
    return [];
  }
}

async function getTrendingItems() {
  const cfg = loadConfig();
  try {
    const url = `https://api.themoviedb.org/3/trending/all/day?api_key=${cfg.TMDB_API_KEY}`;
    const res = await axios.get(url, { timeout: 10000 });
    const items = res.data?.results || [];

    return items
      .filter((i) => (i.title || i.name) && i.poster_path)
      .map((item) => {
        const title = item.title || item.name;
        const releaseDate = item.release_date || item.first_air_date || 'N/A';
        const year = releaseDate.split('-')[0] || '';
        const genres = (item.genre_ids || [])
          .map((id) => GENRES_MAP[id])
          .filter(Boolean)
          .slice(0, 3)
          .join(', ') || 'Movies/Series';
        const posterUrl = `https://image.tmdb.org/t/p/w780${item.poster_path}`;
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

        return {
          id: item.id,
          mediaType: item.media_type || 'movie',
          title: year ? `${title} (${year})` : title,
          rawTitle: title,
          year,
          rating,
          genres,
          releaseDate,
          overview: item.overview || 'No synopsis available.',
          posterUrl
        };
      });
  } catch (e) {
    console.error('Failed to fetch TMDB trending:', e.message);
    return [];
  }
}

module.exports = {
  getAllProviders,
  searchGlobal,
  searchSingleProvider,
  getLatestProviderPosts,
  getMeta,
  getStreams,
  getTrendingItems,
  GENRES_MAP
};
