/**
 * ThePirateBay (tpb-google.pages.dev) - Stream Module
 * Converts magnet links and infoHash into internal direct HTTP video streams and download links
 */

const PUBLIC_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://tracker.bittor.pw:1337/announce',
  'udp://public.popcorn-tracker.org:6969/announce',
  'udp://tracker.dler.org:6969/announce',
  'udp://exodus.desync.com:6969',
  'udp://open.demonii.com:1337/announce',
];

function buildMagnet(infoHash, name = '') {
  let magnet = `magnet:?xt=urn:btih:${infoHash}`;
  if (name) {
    magnet += `&dn=${encodeURIComponent(name)}`;
  }
  for (const tr of PUBLIC_TRACKERS) {
    magnet += `&tr=${encodeURIComponent(tr)}`;
  }
  return magnet;
}

function detectQuality(filename) {
  const fn = (filename || '').toLowerCase();
  if (fn.includes('2160p') || fn.includes('4k') || fn.includes('uhd')) return '4K';
  if (fn.includes('1080p') || fn.includes('fhd')) return '1080p';
  if (fn.includes('720p') || fn.includes('hd')) return '720p';
  if (fn.includes('480p') || fn.includes('sd')) return '480p';
  return 'HD';
}

async function getStream({ link }) {
  let infoHash = '';
  let fileName = '';

  if (link && link.startsWith('tpb:')) {
    const parts = link.split(':');
    infoHash = parts[2] || '';
    fileName = parts.slice(3).join(':');
    try {
      fileName = decodeURIComponent(fileName);
    } catch (_) {}
  } else if (link && /^[a-fA-F0-9]{32,40}$/.test(link)) {
    infoHash = link;
  }

  if (!infoHash) {
    return [
      {
        server: 'Torrent Error',
        link: '',
        type: 'error',
        message: 'Invalid infoHash or torrent link',
      },
    ];
  }

  const quality = detectQuality(fileName);
  const encodedName = encodeURIComponent(fileName || 'video');
  const magnet = buildMagnet(infoHash, fileName);

  return [
    {
      server: `Cinema P2P Stream · ${quality} (Direct)`,
      link: `/api/stream/torrent?hash=${infoHash}&name=${encodedName}`,
      type: 'mkv',
      quality,
      fileName,
    },
    {
      server: `Direct HTTP Download · ${quality}`,
      link: `/api/torrent/download?hash=${infoHash}&name=${encodedName}`,
      type: 'download',
      quality,
      fileName,
    },
    {
      server: `Magnet URI (External Player)`,
      link: magnet,
      type: 'magnet',
      quality,
      fileName,
    },
  ];
}

module.exports = { getStream };
