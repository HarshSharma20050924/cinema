/**
 * ThePirateBay - Posts Module
 * Direct JSON catalog and search API with zero anti-bot barriers
 * Uses apibay.org (official backend) with tpb-google.pages.dev fallback
 */

const APIS = [
  'https://apibay.org',
  'https://tpb-google.pages.dev/api',
];

const SCENE_GROUPS = new Set([
  'megusta', 'cakes', 'rawr', 'grace', 'glxtv', 'galaxytv', 'flux', 'ntb',
  'pahe', 'yify', 'yts', 'eztv', 'proper', 'repack', 'rerip', 'hdtv',
  'btm', 'splice', 'rmteam', 'tgx', 'nogrp', 'd3g', 'ettv', 'ion10',
]);

function detectQuality(filename) {
  const fn = (filename || '').toLowerCase();
  if (fn.includes('2160p') || fn.includes('4k') || fn.includes('uhd')) return '4K';
  if (fn.includes('1080p') || fn.includes('fhd')) return '1080p';
  if (fn.includes('720p') || fn.includes('hd')) return '720p';
  if (fn.includes('480p') || fn.includes('sd')) return '480p';
  return 'HD';
}

function detectLanguage(filename) {
  const fn = (filename || '').toLowerCase();
  if (fn.includes('dual audio') || fn.includes('dual-audio') || (fn.includes('hin') && fn.includes('eng'))) return 'Dual Audio';
  if (fn.includes('hindi') || fn.includes('hin')) return 'Hindi';
  if (fn.includes('tamil') || fn.includes('tam')) return 'Tamil';
  if (fn.includes('telugu') || fn.includes('tel')) return 'Telugu';
  if (fn.includes('korean') || fn.includes('kor')) return 'Korean';
  if (fn.includes('english') || fn.includes('eng')) return 'English';
  return '';
}

function formatSize(bytes) {
  if (!bytes) return '';
  const b = parseInt(bytes, 10);
  if (b >= 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(0)} MB`;
  return `${b} B`;
}

/**
 * Extracts clean show/movie title, year, and series flag from raw torrent filename
 */
function extractTitleAndYear(rawName) {
  let name = (rawName || '')
    .replace(/\[1337x[^\]]*\]/gi, '')
    .replace(/\[eztv[^\]]*\]/gi, '')
    .replace(/\.(mkv|mp4|avi|mov|wmv)$/i, '')
    .trim();

  // Check TV series pattern first (S01E01, S01, Season 1)
  const seriesMatch = name.match(/[\s.(_-][sS](\d{1,2})(?:[eE](\d{1,2}))?[\s.)_-]/i) ||
                      name.match(/[\s.(_-](?:season|series)\s*(\d{1,2})/i);

  let isSeries = false;
  let year = '';
  let cleanTitle = name;

  if (seriesMatch) {
    isSeries = true;
    cleanTitle = name.slice(0, seriesMatch.index).trim();
    const yMatch = cleanTitle.match(/[\s.(_-](19\d\d|20\d\d)[\s.)_-]/);
    if (yMatch) {
      year = yMatch[1];
      cleanTitle = cleanTitle.slice(0, yMatch.index).trim();
    }
  } else {
    const yearMatch = name.match(/[\s.(_-](19\d\d|20\d\d)[\s.)_-]/);
    if (yearMatch) {
      year = yearMatch[1];
      cleanTitle = name.slice(0, yearMatch.index).trim();
    }
  }

  // Strip technical keywords, scene groups, brackets, dots
  cleanTitle = cleanTitle
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\b(2160p|1080p|720p|480p|BluRay|BRRip|BDRip|WEBRip|WEB-DL|HDRip|DVDRip|REMUX|HEVC|x265|x264|AAC|DDP5\.1|Atmos|AMZN|NF|DSNP|MAX|ATVP|HDTV|PROPER|REPACK|HQ|Clean|Uncut)\b/gi, '')
    .replace(/[-_.]{2,}/g, ' ')
    .replace(/[-_.]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Remove trailing release group words (e.g. MeGusta, CAKES)
  const words = cleanTitle.split(' ');
  if (words.length > 1 && SCENE_GROUPS.has(words[words.length - 1].toLowerCase())) {
    words.pop();
    cleanTitle = words.join(' ').trim();
  }

  return { title: cleanTitle || name, year, isSeries };
}

function itemToCard(item) {
  const { title, year } = extractTitleAndYear(item.name);
  const quality = detectQuality(item.name);
  const lang = detectLanguage(item.name);
  const size = formatSize(item.size);
  const seeds = item.seeders ? `▲ ${item.seeders}` : '';
  const label = [quality, size, seeds].filter(Boolean).join(' · ');

  // Direct Metahub official poster if IMDb ID exists
  const poster = item.imdb && /^tt\d+$/.test(item.imdb)
    ? `https://images.metahub.space/poster/medium/${item.imdb}/img`
    : '';

  return {
    title: title,
    link: `tpb:${item.id}:${item.info_hash}:${encodeURIComponent(item.name)}`,
    image: poster,
    quality: quality,
    language: lang,
    fileSize: size,
    seeders: item.seeders,
    leechers: item.leechers,
    infoHash: item.info_hash,
    fileName: item.name,
    imdb: item.imdb || '',
    year: year,
    label: label,
  };
}

async function fetchFromTpbApi(endpoint) {
  const axios = require('axios');
  for (const base of APIS) {
    try {
      const url = `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      const res = await axios.get(url, {
        timeout: 9000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch (_) {}
  }
  return [];
}

async function getPosts({ filter, page = 1, params, providerContext }) {
  const rawFilter = (filter || '').toLowerCase();
  const tab = (params?.tab || '').toLowerCase();
  const niche = (params?.niche || '').toLowerCase();
  const title = (params?.title || '').toLowerCase();

  const isTvRequested =
    tab === 'tv' ||
    niche === 'web-series' ||
    rawFilter === '208' ||
    rawFilter === '205' ||
    rawFilter.includes('tv') ||
    title.includes('tv shows') ||
    title.includes('series');

  const isMovieRequested =
    tab === 'movie' ||
    niche === 'movies' ||
    rawFilter === '207' ||
    rawFilter === '201' ||
    rawFilter.includes('movie') ||
    title.includes('movie');

  try {
    let endpoints = [];

    if (isTvRequested) {
      // Pure TV shows only (HD TV Shows 208 + TV Shows 205)
      endpoints = ['/precompiled/data_top100_208.json', '/precompiled/data_top100_205.json'];
    } else if (isMovieRequested) {
      // Pure Movies only (HD Movies 207 + Movies 201)
      endpoints = ['/precompiled/data_top100_207.json', '/precompiled/data_top100_201.json'];
    } else if (rawFilter === 'recent') {
      endpoints = ['/precompiled/data_top100_recent.json'];
    } else if (rawFilter === '211') {
      endpoints = ['/q.php?q=category:211'];
    } else if (rawFilter === '207') {
      endpoints = ['/precompiled/data_top100_207.json'];
    } else if (rawFilter === '208') {
      endpoints = ['/precompiled/data_top100_208.json'];
    } else {
      endpoints = ['/precompiled/data_top100_200.json'];
    }

    let combinedItems = [];
    for (const ep of endpoints) {
      const items = await fetchFromTpbApi(ep);
      if (items.length > 0) {
        combinedItems.push(...items);
      }
    }

    if (combinedItems.length === 0) {
      combinedItems = await fetchFromTpbApi('/precompiled/data_top100_200.json');
    }

    // Deduplicate cards by normalized title (+ year for movies) to eliminate duplicate cards
    const seen = new Set();
    const cards = [];

    for (const item of combinedItems) {
      if (!item || !item.info_hash || !item.name) continue;
      const card = itemToCard(item);

      // Create aggressive dedupe key ignoring special characters, year, and case
      const normTitle = card.title.toLowerCase().replace(/\b(19\d\d|20\d\d)\b/g, '').replace(/[^a-z0-9]/g, '');
      const dedupeKey = isTvRequested
        ? normTitle
        : `${normTitle}::${card.year || ''}`;

      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        cards.push(card);
      }
    }

    return cards;
  } catch (err) {
    console.warn('[TPB] getPosts error:', err.message);
    return [];
  }
}

async function getSearchPosts({ searchQuery, page = 1, providerContext }) {
  const q = (searchQuery || '').trim();
  if (!q) return [];

  try {
    const rawItems = await fetchFromTpbApi(`/q.php?q=${encodeURIComponent(q)}&cat=200`);
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return [];
    }

    // Deduplicate search results so user gets clean distinct releases
    const seen = new Set();
    const cards = [];

    for (const item of rawItems) {
      if (!item || !item.info_hash || !item.name) continue;
      // Skip "no results" sentinel object if returned by apibay
      if (item.name === 'No results returned' || item.id === '0') continue;

      const card = itemToCard(item);
      const normTitle = card.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const dedupeKey = `${normTitle}::${card.year || ''}::${card.quality}`;

      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        cards.push(card);
      }
    }

    return cards;
  } catch (err) {
    console.warn('[TPB] getSearchPosts error:', err.message);
    return [];
  }
}

module.exports = { getPosts, getSearchPosts };
