/**
 * GramCinema (bollywood.eu.org) - Meta Module
 * Returns metadata and ALL available download/stream links for movies and TV series
 * 
 * Link format: gramcinema:{fileId}:{encodedFileName}
 */

const TG_ARCHIVE = 'https://tga-hd.api.hashhackers.com';

const HARDCODED_TOKEN =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjQ3MDYwLCJlbWFpbCI6ImJhbmdsYWRlc2hzZXJ2ZXIwMDk3QGdtYWlsLmNvbSIsImV4cCI6MTc5ODk4NTM0OCwiaWF0IjoxNzkxMjA5MzQ4fQ.lIWMqvGQHum90cGTiCilr645wu-UAc7nLf0LHIRNwYY';

function getToken(providerContext) {
  return (
    providerContext?.settings?.gramcinemaToken ||
    providerContext?.gramcinemaToken ||
    process.env.GRAMCINEMA_TOKEN ||
    HARDCODED_TOKEN
  );
}

function buildHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Origin': 'https://bollywood.eu.org',
    'Referer': 'https://bollywood.eu.org/',
  };
}

function detectQuality(filename) {
  const fn = filename.toLowerCase();
  if (fn.includes('2160p') || fn.includes('4k') || fn.includes('uhd')) return '4K';
  if (fn.includes('1080p') || fn.includes('fhd')) return '1080p';
  if (fn.includes('720p') || fn.includes('hd')) return '720p';
  if (fn.includes('480p') || fn.includes('sd')) return '480p';
  return 'HD';
}

function detectAudio(fn) {
  const audios = [];
  const f = fn.toLowerCase();
  if (f.includes('hindi')) audios.push('Hindi');
  if (f.includes('dual audio') || f.includes('dual-audio') || f.includes('dual')) audios.push('Dual Audio');
  if (f.includes('multi audio') || f.includes('multi-audio') || f.includes('multiaudio')) audios.push('Multi Audio');
  if (f.includes('telugu')) audios.push('Telugu');
  if (f.includes('tamil')) audios.push('Tamil');
  if (f.includes('kannada')) audios.push('Kannada');
  if (f.includes('malayalam')) audios.push('Malayalam');
  if (f.includes('english') || f.includes('eng')) audios.push('English');
  return audios.length > 0 ? audios.join(', ') : '';
}

function detectSourceCodec(fn) {
  const parts = [];
  const f = fn.toLowerCase();
  if (f.includes('remux')) parts.push('REMUX');
  else if (f.includes('bluray') || f.includes('brrip')) parts.push('BluRay');
  else if (f.includes('web-dl') || f.includes('webdl')) parts.push('WEB-DL');
  else if (f.includes('webrip')) parts.push('WEBRip');
  else if (f.includes('hdrip')) parts.push('HDRip');

  if (f.includes('x265') || f.includes('hevc')) parts.push('x265 HEVC');
  else if (f.includes('x264')) parts.push('x264');

  if (f.includes('10bit')) parts.push('10-bit');
  if (f.includes('hdr')) parts.push('HDR');

  return parts.join(' · ');
}

function formatSize(bytes) {
  if (!bytes) return '';
  const b = parseInt(bytes, 10);
  if (b >= 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(0)} MB`;
  return `${b} B`;
}

function extractTitle(filename) {
  let name = filename
    .replace(/\.(mkv|mp4|avi|mov|wmv|zip|rar|7z|part\d+)(\.\w+)?$/i, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\((?!\d{4})[^)]*\)/g, '')
    .replace(/\d{3,4}p[\w.-]*/gi, '')
    .replace(/BluRay|WEB-DL|WEBRip|HDTV|DVDRip|BrRip|REMUX|HEVC|x265|x264|AVC|AAC|DDP|DTS/gi, '')
    .replace(/[-_.]{2,}/g, ' ')
    .replace(/[-_.]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const yearMatch = name.match(/^(.+?)\s*(\d{4})\s*(.*)$/);
  if (yearMatch) return `${yearMatch[1].trim()} (${yearMatch[2]})`;

  return name;
}

/**
 * Parse series info from filename: S01E05, S02, Season 1, etc.
 */
function parseSeriesInfo(filename) {
  const fn = filename;
  
  // SxxExx pattern
  const epMatch = fn.match(/S(\d{1,2})E(\d{1,2})/i);
  if (epMatch) {
    return {
      isSeries: true,
      season: parseInt(epMatch[1], 10),
      episode: parseInt(epMatch[2], 10),
    };
  }
  
  // Season x only (batch)
  const seasonMatch = fn.match(/Season\s*(\d{1,2})|S(\d{1,2})(?!E)/i);
  if (seasonMatch) {
    return {
      isSeries: true,
      season: parseInt(seasonMatch[1] || seasonMatch[2], 10),
      episode: null,
    };
  }
  
  return { isSeries: false, season: null, episode: null };
}

/**
 * Extract base series/movie title for searching related files
 */
function extractBaseTitle(filename) {
  let name = filename.replace(/\.\w+$/i, '');
  name = name
    .replace(/\s*S\d+E\d+.*/i, '')
    .replace(/\s*Season\s*\d+.*/i, '')
    .replace(/\s*S\d+\s*$/i, '');
  
  name = name
    .replace(/\[.*?\]/g, '')
    .replace(/\((?!\d{4})[^)]*\)/g, '')
    .replace(/\d{3,4}p.*/gi, '')
    .replace(/BluRay|WEB-DL|WEBRip|HDTV|DVDRip|BrRip|REMUX/gi, '')
    .replace(/[-_.]{2,}/g, ' ')
    .replace(/[-_.]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return name;
}

function makeFileLinkItem(file) {
  const q = detectQuality(file.file_name);
  const audio = detectAudio(file.file_name);
  const codec = detectSourceCodec(file.file_name);
  const sz = formatSize(file.file_size);

  const metaParts = [];
  if (q) metaParts.push(q);
  if (codec) metaParts.push(codec);
  if (audio) metaParts.push(`[${audio}]`);
  if (sz) metaParts.push(sz);

  const displayTitle = metaParts.length > 0 ? metaParts.join(' · ') : file.file_name;

  return {
    title: displayTitle,
    link: `gramcinema:${file.id}:${encodeURIComponent(file.file_name)}`,
    fileName: file.file_name,
    quality: q,
    size: sz,
    audio,
  };
}

async function getMeta({ link, providerContext }) {
  const { axios } = providerContext;
  const token = getToken(providerContext);

  if (!token) {
    return {
      title: 'GramCinema (Auth Required)',
      description: 'Please add your GramCinema Bearer token in Settings → Extensions → GramCinema Token.',
      type: 'movie',
      linkList: [],
    };
  }

  // Parse link: gramcinema:{fileId}:{encodedFileName}
  let fileId = link;
  let fileName = '';

  if (link.startsWith('gramcinema:')) {
    const parts = link.split(':');
    fileId = parts[1] || link;
    fileName = parts.slice(2).join(':');
    try { fileName = decodeURIComponent(fileName); } catch (e) { /* ignore */ }
  }

  const title = extractTitle(fileName || fileId);
  const primaryQuality = detectQuality(fileName);
  const { isSeries, season } = parseSeriesInfo(fileName);
  const baseTitle = extractBaseTitle(fileName || title);

  const baseSearch = baseTitle.replace(/[^\w\s]/g, ' ').trim().split(/\s+/).slice(0, 4).join(' ');

  try {
    const searchUrl = `${TG_ARCHIVE}/mix_media_files/search?q=${encodeURIComponent(baseSearch || title)}&page=1`;
    const res = await axios.get(searchUrl, {
      headers: buildHeaders(token),
      timeout: 15000,
    });

    const rawFiles = res.data?.files || [];

    if (isSeries) {
      // ── SERIES: Group by season & episode ───────────────────────────────
      const seasonMap = new Map();
      const seenFiles = new Set();

      // Ensure clicked file is processed
      const allFiles = [{ id: fileId, file_name: fileName }, ...rawFiles];

      for (const file of allFiles) {
        if (!file?.file_name || seenFiles.has(file.id)) continue;
        seenFiles.add(file.id);

        const sInfo = parseSeriesInfo(file.file_name);
        if (!sInfo.isSeries || !sInfo.season) continue;

        const sKey = `Season ${sInfo.season}`;
        if (!seasonMap.has(sKey)) seasonMap.set(sKey, []);

        const epNum = sInfo.episode ? `Episode ${sInfo.episode}` : 'Batch Download';
        const q = detectQuality(file.file_name);
        const sz = formatSize(file.file_size);
        const audio = detectAudio(file.file_name);

        const labelParts = [epNum, q];
        if (audio) labelParts.push(`[${audio}]`);
        if (sz) labelParts.push(sz);

        seasonMap.get(sKey).push({
          title: labelParts.join(' · '),
          link: `gramcinema:${file.id}:${encodeURIComponent(file.file_name)}`,
          fileName: file.file_name,
          quality: q,
          episode: sInfo.episode || 0,
        });
      }

      // Sort episodes inside seasons
      for (const [, eps] of seasonMap) {
        eps.sort((a, b) => a.episode - b.episode);
      }

      const linkList = [];
      const sortedSeasons = [...seasonMap.entries()].sort((a, b) => {
        const sA = parseInt(a[0].replace('Season ', ''), 10) || 0;
        const sB = parseInt(b[0].replace('Season ', ''), 10) || 0;
        return sA - sB;
      });

      for (const [seasonTitle, eps] of sortedSeasons) {
        if (eps.length > 0) {
          linkList.push({
            title: `${seasonTitle} (${eps.length} Files)`,
            directLinks: eps,
          });
        }
      }

      if (linkList.length > 0) {
        return {
          title: baseTitle,
          type: 'series',
          quality: primaryQuality,
          description: `TV Series · Total ${seenFiles.size} release files found on Telegram`,
          linkList,
        };
      }
    } else {
      // ── MOVIE: Fetch all releases and group by quality (4K, 1080p, 720p, 480p) ──
      const titleWords = baseTitle.toLowerCase().replace(/[-_.]/g, ' ').split(/\s+/).filter(w => w.length > 1);

      const matchingFiles = [];
      const seenIds = new Set();

      // Always include clicked file first
      seenIds.add(fileId);
      matchingFiles.push({ id: fileId, file_name: fileName });

      for (const file of rawFiles) {
        if (!file?.file_name || seenIds.has(file.id)) continue;
        const norm = file.file_name.toLowerCase().replace(/[-_.]/g, ' ');
        // Check if file contains key title words
        const matches = titleWords.length === 0 || titleWords.every(w => {
          const reg = new RegExp('(\\b|\\d)' + w + '(\\b|\\d)', 'i');
          return reg.test(norm);
        });

        if (matches) {
          seenIds.add(file.id);
          matchingFiles.push(file);
        }
      }

      // Group by quality categories
      const qualityGroups = {
        '4K': [],
        '1080p': [],
        '720p': [],
        '480p': [],
        'Other': [],
      };

      for (const f of matchingFiles) {
        const item = makeFileLinkItem(f);
        const q = item.quality;
        if (qualityGroups[q]) {
          qualityGroups[q].push(item);
        } else {
          qualityGroups['Other'].push(item);
        }
      }

      const linkList = [];
      const groupLabels = [
        { key: '4K', label: '4K Ultra HD Downloads' },
        { key: '1080p', label: '1080p Full HD Downloads' },
        { key: '720p', label: '720p HD Downloads' },
        { key: '480p', label: '480p Mobile Downloads' },
        { key: 'Other', label: 'Additional Releases' },
      ];

      for (const g of groupLabels) {
        const items = qualityGroups[g.key];
        if (items && items.length > 0) {
          linkList.push({
            title: `${g.label} (${items.length} Files)`,
            quality: g.key,
            directLinks: items,
          });
        }
      }

      return {
        title,
        type: 'movie',
        quality: primaryQuality,
        description: `Movie · ${matchingFiles.length} file releases found across 4K, 1080p, 720p`,
        linkList,
      };
    }
  } catch (err) {
    console.error('[GramCinema] getMeta search error:', err.message);
  }

  // Fallback: Return single clicked file
  return {
    title,
    type: isSeries ? 'series' : 'movie',
    quality: primaryQuality,
    description: `File: ${fileName}\nQuality: ${primaryQuality}`,
    linkList: [
      {
        title: `${primaryQuality} Download`,
        quality: primaryQuality,
        directLinks: [
          {
            title: `${title} ${primaryQuality}`,
            link: `gramcinema:${fileId}:${encodeURIComponent(fileName)}`,
            fileName,
            quality: primaryQuality,
          },
        ],
      },
    ],
  };
}

module.exports = { getMeta };
