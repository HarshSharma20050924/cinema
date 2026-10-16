/**
 * ThePirateBay (tpb-google.pages.dev) - Metadata Module
 * Resolves movie / series metadata and lists all available releases & qualities
 * 
 * Link format: tpb:{id}:{infoHash}:{encodedFileName}
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

  const yearMatch = name.match(/[\s.(_-](19\d\d|20\d\d)[\s.)_-]/);
  let year = '';
  let cleanTitle = name;

  if (yearMatch) {
    year = yearMatch[1];
    cleanTitle = name.slice(0, yearMatch.index).trim();
  }

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

function parseSeriesInfo(filename) {
  const fn = (filename || '').toLowerCase();
  const match = fn.match(/s(\d{1,2})e(\d{1,2})/i) || fn.match(/season\s*(\d{1,2})\s*episode\s*(\d{1,2})/i);
  if (match) {
    return {
      isSeries: true,
      season: parseInt(match[1], 10),
      episode: parseInt(match[2], 10),
    };
  }
  return { isSeries: false, season: 1, episode: 1 };
}

async function getMeta({ link, providerContext }) {
  const axios = providerContext?.axios || require('axios');

  let id = '';
  let infoHash = '';
  let fileName = '';

  if (link && link.startsWith('tpb:')) {
    const parts = link.split(':');
    id = parts[1] || '';
    infoHash = parts[2] || '';
    fileName = parts.slice(3).join(':');
    try {
      fileName = decodeURIComponent(fileName);
    } catch (_) {}
  }

  const { title, year } = extractTitleAndYear(fileName);
  const { isSeries } = parseSeriesInfo(fileName);

  // Search TPB for other quality releases of the same title
  let releases = [];
  try {
    const searchRes = await axios.get(`${TPB_API_BASE}/q.php?q=${encodeURIComponent(title)}&cat=200`, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (Array.isArray(searchRes.data)) {
      releases = searchRes.data.filter((item) => item && item.info_hash && item.name);
    }
  } catch (_) {}

  // If search didn't find anything or current item isn't in it, prepend current
  if (!releases.some((r) => r.info_hash && r.info_hash.toLowerCase() === infoHash.toLowerCase())) {
    releases.unshift({
      id,
      info_hash: infoHash,
      name: fileName || title,
      size: 0,
      seeders: 10,
    });
  }

  // Sort by highest seeders
  releases.sort((a, b) => parseInt(b.seeders || 0, 10) - parseInt(a.seeders || 0, 10));

  const linkList = releases.map((item) => {
    const q = detectQuality(item.name);
    const sz = formatSize(item.size);
    const seeds = item.seeders ? `▲ ${item.seeders}` : '';
    const label = [q, sz, seeds].filter(Boolean).join(' · ');

    return {
      title: label || item.name,
      link: `tpb:${item.id}:${item.info_hash}:${encodeURIComponent(item.name)}`,
      quality: q,
      size: sz,
      fileName: item.name,
      infoHash: item.info_hash,
      seeders: item.seeders,
    };
  });

  return {
    title,
    year,
    type: isSeries ? 'series' : 'movie',
    description: `The Pirate Bay High-Speed Torrents · Top swarm peers available`,
    linkList,
  };
}

module.exports = { getMeta };
