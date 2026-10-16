/**
 * ThePirateBay (tpb-google.pages.dev) - Posts Module
 * Direct JSON catalog and search API with zero anti-bot barriers
 */

const TPB_API_BASE = 'https://tpb-google.pages.dev/api';

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

function extractTitleAndYear(rawName) {
  let name = (rawName || '')
    .replace(/\[1337x[^\]]*\]/gi, '')
    .replace(/\.(mkv|mp4|avi|mov|wmv)$/i, '')
    .trim();

  // Find 4-digit year between 1900 and 2099
  const yearMatch = name.match(/[\s.(_-](19\d\d|20\d\d)[\s.)_-]/);
  let year = '';
  let cleanTitle = name;

  if (yearMatch) {
    year = yearMatch[1];
    cleanTitle = name.slice(0, yearMatch.index).trim();
  }

  // Clean tags
  cleanTitle = cleanTitle
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\b(2160p|1080p|720p|480p|BluRay|BRRip|BDRip|WEBRip|WEB-DL|HDRip|DVDRip|REMUX|HEVC|x265|x264|AAC|DDP5\.1|Atmos)\b/gi, '')
    .replace(/[-_.]{2,}/g, ' ')
    .replace(/[-_.]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { title: cleanTitle || name, year };
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

async function getPosts({ filter, page = 1, providerContext }) {
  const axios = providerContext?.axios || require('axios');

  try {
    let url = `${TPB_API_BASE}/precompiled/data_top100_200.json`;

    if (filter === 'recent') {
      url = `${TPB_API_BASE}/precompiled/data_top100_recent.json`;
    } else if (filter === '211' || filter === '207' || filter === '208') {
      url = `${TPB_API_BASE}/q.php?q=category:${filter}`;
    }

    const res = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const data = Array.isArray(res.data) ? res.data : [];
    const seen = new Set();
    const cards = [];

    for (const item of data) {
      if (!item || !item.info_hash || !item.name) continue;
      const card = itemToCard(item);
      const dedupeKey = `${card.title.toLowerCase()}::${card.year}`;
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
  const axios = providerContext?.axios || require('axios');
  const q = (searchQuery || '').trim();
  if (!q) return [];

  try {
    const url = `${TPB_API_BASE}/q.php?q=${encodeURIComponent(q)}&cat=200`;
    const res = await axios.get(url, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const data = Array.isArray(res.data) ? res.data : [];
    return data
      .filter((item) => item && item.info_hash && item.name)
      .map(itemToCard);
  } catch (err) {
    console.warn('[TPB] getSearchPosts error:', err.message);
    return [];
  }
}

module.exports = { getPosts, getSearchPosts };
