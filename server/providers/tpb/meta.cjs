/**
 * ThePirateBay - Metadata Module
 * Resolves movie / series metadata and lists all available releases & qualities
 * Link format: tpb:{id}:{infoHash}:{encodedFileName}
 */

const APIS = [
  'https://apibay.org',
  'https://tpb-google.pages.dev/api',
];

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
    .replace(/\[eztv[^\]]*\]/gi, '')
    .replace(/\.(mkv|mp4|avi|mov|wmv)$/i, '')
    .trim();

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

  cleanTitle = cleanTitle
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\b(2160p|1080p|720p|480p|BluRay|BRRip|BDRip|WEBRip|WEB-DL|HDRip|DVDRip|REMUX|HEVC|x265|x264|AAC|DDP5\.1|Atmos|AMZN|NF|DSNP|MAX|ATVP|HDTV|PROPER|REPACK|HQ|Clean|Uncut)\b/gi, '')
    .replace(/[-_.]{2,}/g, ' ')
    .replace(/[-_.]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { title: cleanTitle || name, year, isSeries };
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

  const { title, year, isSeries } = extractTitleAndYear(fileName);

  // Search TPB for all quality releases of the same title
  let releases = [];
  for (const base of APIS) {
    try {
      const searchRes = await axios.get(`${base}/q.php?q=${encodeURIComponent(title)}&cat=200`, {
        timeout: 9000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (Array.isArray(searchRes.data)) {
        releases = searchRes.data.filter((item) => item && item.info_hash && item.name && item.id !== '0' && item.name !== 'No results returned');
        if (releases.length > 0) break;
      }
    } catch (_) {}
  }

  // Prepend current release if missing
  if (infoHash && !releases.some((r) => r.info_hash && r.info_hash.toLowerCase() === infoHash.toLowerCase())) {
    releases.unshift({
      id,
      info_hash: infoHash,
      name: fileName || title,
      size: 0,
      seeders: 10,
    });
  }

  // Filter out completely dead releases (0 seeders)
  releases = releases.filter((item) => parseInt(item.seeders || 0, 10) > 0);

  // Sort by highest seeders
  releases.sort((a, b) => parseInt(b.seeders || 0, 10) - parseInt(a.seeders || 0, 10));

  // Build release items with direct internal links already populated
  const linkList = releases.map((item) => {
    const q = detectQuality(item.name);
    const sz = formatSize(item.size);
    const seeds = item.seeders ? `▲ ${item.seeders}` : '';
    const label = [q, sz, seeds].filter(Boolean).join(' · ');

    // Guaranteed clean mp4 download filename
    const cleanDownloadName = `${title} - ${q}`.replace(/[^a-zA-Z0-9._-]/g, '_') + '.mp4';
    const encName = encodeURIComponent(cleanDownloadName);

    return {
      title: label || item.name,
      quality: q,
      size: sz,
      fileName: cleanDownloadName,
      infoHash: item.info_hash,
      seeders: item.seeders,
      link: `tpb:${item.id}:${item.info_hash}:${encName}`,
      directLinks: [
        {
          title: `Direct Download (${q})`,
          link: `/api/torrent/download?hash=${item.info_hash}&name=${encName}`,
          type: 'download',
        },
        {
          title: `Fast P2P Stream (${q})`,
          link: `/api/stream/torrent?hash=${item.info_hash}&name=${encName}`,
          type: 'mkv',
        },
      ],
    };
  });

  // Pre-warm the top 3 high-seeder releases in the background so metadata is cached when user clicks download
  try {
    const torrentService = require('../../services/torrentService.cjs');
    releases.slice(0, 3).forEach((rel) => {
      if (rel.info_hash && parseInt(rel.seeders || 0, 10) > 5) {
        torrentService.getTorrent(rel.info_hash, rel.name).catch(() => {});
      }
    });
  } catch (_) {}

  return {
    title,
    year,
    type: isSeries ? 'series' : 'movie',
    description: `The Pirate Bay High-Speed Swarm · ${releases.length} releases available`,
    linkList,
  };
}

module.exports = { getMeta };
