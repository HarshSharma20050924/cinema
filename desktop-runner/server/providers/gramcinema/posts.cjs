/**
 * GramCinema (bollywood.eu.org) - Posts Module
 * Searches TG Archive API for movie/series files
 * 
 * API: https://tga-hd.api.hashhackers.com/mix_media_files/search?q={query}&page={page}
 * Auth: Bearer token in settings (stored in providerContext.gramcinemaToken)
 */

const TG_ARCHIVE = 'https://tga-hd.api.hashhackers.com';

const HARDCODED_TOKEN =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjQ3MDYwLCJlbWFpbCI6ImJhbmdsYWRlc2hzZXJ2ZXIwMDk3QGdtYWlsLmNvbSIsImV4cCI6MTc5ODk4NTM0OCwiaWF0IjoxNzkxMjA5MzQ4fQ.lIWMqvGQHum90cGTiCilr645wu-UAc7nLf0LHIRNwYY';

/**
 * Get auth token from providerContext settings
 */
function getToken(providerContext) {
  return (
    providerContext?.settings?.gramcinemaToken ||
    providerContext?.gramcinemaToken ||
    process.env.GRAMCINEMA_TOKEN ||
    HARDCODED_TOKEN
  );
}

/**
 * Build headers for TG Archive API
 */
function buildHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Origin': 'https://bollywood.eu.org',
    'Referer': 'https://bollywood.eu.org/',
  };
}

/**
 * Detect quality from filename
 */
function detectQuality(filename) {
  const fn = filename.toLowerCase();
  if (fn.includes('2160p') || fn.includes('4k') || fn.includes('uhd')) return '4K';
  if (fn.includes('1080p') || fn.includes('fhd')) return '1080p';
  if (fn.includes('720p') || fn.includes('hd')) return '720p';
  if (fn.includes('480p') || fn.includes('sd')) return '480p';
  if (fn.includes('360p')) return '360p';
  return 'HD';
}

/**
 * Detect language/audio info from filename
 */
function detectLanguage(filename) {
  const fn = filename.toLowerCase();
  if (fn.includes('dual audio') || (fn.includes('hin') && fn.includes('eng'))) return 'Dual Audio';
  if (fn.includes('hindi') || fn.includes('hin')) return 'Hindi';
  if (fn.includes('tamil') || fn.includes('tam')) return 'Tamil';
  if (fn.includes('telugu') || fn.includes('tel')) return 'Telugu';
  if (fn.includes('korean') || fn.includes('kor')) return 'Korean';
  if (fn.includes('english') || fn.includes('eng')) return 'English';
  return '';
}

/**
 * Extract clean title from filename
 */
/**
 * Extract clean title from filename
 */
function extractTitle(filename) {
  // Remove extension
  let name = filename.replace(/\.(mkv|mp4|avi|mov|wmv|flv|webm|m4v|ts|zip|rar|7z|part\d+)(\.\w+)?$/i, '');
  
  // Remove Telegram @ handles, websites, and ripper group prefixes
  name = name
    .replace(/^@\S+\s*/g, '')
    .replace(/^(?:www\s*\.?\s*\S+|filmy4wap\s*(?:blog)?|tamildbox|bolly4u|cinemavilla)\s*/gi, '')
    .replace(/\[.*?\]/g, '') // remove [CF], [DVDRip], etc.
    .replace(/\((?!\d{4})[^)]*\)/g, '') // remove (stuff) but keep (2010)
    .replace(/\b(480p|720p|1080p|2160p|4k|hd|web-dl|webrip|bluray|x264|x265|hevc|dual audio|hindi|english|tamil|telugu|esub|multi audio|durban|phd|ac|lc|gs|cftd|unrated|extended)\b/gi, '')
    .replace(/BluRay|WEB-DL|WEBRip|HDTV|DVDRip|BrRip|REMUX|HEVC|x265|x264|AVC|AAC|DDP|DTS|HDMA/gi, '')
    .replace(/[-_.]{2,}/g, ' ')
    .replace(/[-_.]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Try to preserve "Title Year" or "Title S01E01" patterns
  const yearMatch = name.match(/^(.+?)\s*(\d{4})\s*(.*)$/);
  if (yearMatch) {
    return `${yearMatch[1].trim()} (${yearMatch[2]})`;
  }

  return name;
}

/**
 * Format file size
 */
function formatSize(bytes) {
  if (!bytes) return '';
  const b = parseInt(bytes, 10);
  if (b >= 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(0)} MB`;
  return `${b} B`;
}

/**
 * Convert search results to catalog card format
 */
function filesToCards(files, query) {
  const seen = new Set();
  return files
    .map((file) => {
      const title = extractTitle(file.file_name);
      const quality = detectQuality(file.file_name);
      const lang = detectLanguage(file.file_name);
      const size = formatSize(file.file_size);
      const label = [quality, lang, size].filter(Boolean).join(' · ');

      return {
        title: title,
        link: `gramcinema:${file.id}:${encodeURIComponent(file.file_name)}`,
        image: '', // Will be resolved dynamically by MediaCard from Cinemeta
        quality: quality,
        language: lang,
        fileSize: size,
        fileName: file.file_name,
        fileId: file.id,
        label: label,
      };
    })
    .filter((card) => {
      // Dedupe by title
      const key = card.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// In-memory cache for fast responses & rate-limit avoidance (5-minute TTL)
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Get posts for a category filter (keyword search)
 */
async function getPosts({ filter, page, providerContext }) {
  const { axios } = providerContext;
  const token = getToken(providerContext);

  if (!token) {
    console.warn('[GramCinema] No auth token set. Add gramcinemaToken to settings.');
    return [];
  }

  const query = filter || 'bollywood hindi 2024';
  const pageNum = parseInt(page, 10) || 1;
  const cacheKey = `posts:${query}:${pageNum}`;
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const url = `${TG_ARCHIVE}/mix_media_files/search?q=${encodeURIComponent(query)}&page=${pageNum}`;

  try {
    const res = await axios.get(url, {
      headers: buildHeaders(token),
      timeout: 4000,
    });

    const files = res.data?.files || [];
    const cards = filesToCards(files, query);
    queryCache.set(cacheKey, { data: cards, timestamp: Date.now() });
    return cards;
  } catch (err) {
    console.error('[GramCinema] getPosts error:', err.message);
    return [];
  }
}

/**
 * Search by movie/show title
 */
async function getSearchPosts({ searchQuery, page, providerContext }) {
  const { axios } = providerContext;
  const token = getToken(providerContext);

  if (!token) {
    console.warn('[GramCinema] No auth token set.');
    return [];
  }

  if (!searchQuery) return [];

  const pageNum = parseInt(page, 10) || 1;
  const cacheKey = `search:${searchQuery}:${pageNum}`;
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const url = `${TG_ARCHIVE}/mix_media_files/search?q=${encodeURIComponent(searchQuery)}&page=${pageNum}`;

  try {
    const res = await axios.get(url, {
      headers: buildHeaders(token),
      timeout: 4000,
    });

    const files = res.data?.files || [];
    const cards = filesToCards(files, searchQuery);
    queryCache.set(cacheKey, { data: cards, timestamp: Date.now() });
    return cards;
  } catch (err) {
    console.error('[GramCinema] getSearchPosts error:', err.message);
    return [];
  }
}

module.exports = { getPosts, getSearchPosts };
