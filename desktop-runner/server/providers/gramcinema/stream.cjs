/**
 * GramCinema (bollywood.eu.org) - Stream Module
 * Generates direct CDN download links from TG Archive file IDs
 * 
 * API: GET https://tga-hd.api.hashhackers.com/genLink?type=mix_media&id={fileId}
 * Returns: { success: true, url: "https://cdn2.apranet.eu.org/dl/..." }
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
  const fn = (filename || '').toLowerCase();
  if (fn.includes('2160p') || fn.includes('4k') || fn.includes('uhd')) return '4K';
  if (fn.includes('1080p') || fn.includes('fhd')) return '1080p';
  if (fn.includes('720p') || fn.includes('hd')) return '720p';
  if (fn.includes('480p') || fn.includes('sd')) return '480p';
  return 'HD';
}

/**
 * Get stream/download link for a gramcinema file
 */
async function getStream({ link, providerContext }) {
  const { axios } = providerContext;
  const token = getToken(providerContext);

  if (!token) {
    return [{
      server: 'GramCinema',
      link: '',
      type: 'error',
      quality: 'N/A',
      message: 'Auth token required. Add gramcinemaToken in settings.',
    }];
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

  const quality = detectQuality(fileName);

  try {
    const url = `${TG_ARCHIVE}/genLink?type=mix_media&id=${encodeURIComponent(fileId)}`;
    const res = await axios.get(url, {
      headers: buildHeaders(token),
      timeout: 20000,
    });

    const data = res.data;

    if (!data?.success || !data?.url) {
      throw new Error(data?.error || 'Failed to generate download link');
    }

    const downloadUrl = data.url;

    return [
      {
        server: `GramCinema · ${quality}`,
        link: downloadUrl,
        type: 'direct', // direct video file
        quality,
        fileName: fileName || fileId,
        headers: {
          'Referer': 'https://bollywood.eu.org/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      },
    ];
  } catch (err) {
    console.error('[GramCinema] getStream error:', err.message);
    
    // Return error result
    return [{
      server: 'GramCinema (Error)',
      link: '',
      type: 'error',
      quality,
      message: `Failed to get download link: ${err.message}`,
    }];
  }
}

module.exports = { getStream };
