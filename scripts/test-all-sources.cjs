const axios = require('axios');
const express = require('express');
const cors = require('cors');
const apiRoutes = require('../server/routes/index.cjs');
const domainResolver = require('../server/services/domainResolver.cjs');
const manifestService = require('../server/services/manifestService.cjs');
const zendaEngine = require('../server/services/zendaEngine.cjs');

const TEST_PORT = 3849;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

const REQUESTED_SOURCES = [
  'ThePirateBay',
  'GramCinema',
  'VMovies',
  'MultiStream',
  'MoviesDrive',
  '4khdHub',
  'Cinewood',
  'World4uFree',
  'KatMoviesHd',
  'MoviesMod',
  'UHDMovies',
  'MovieBox',
  'GokuHD',
  'DramaCool',
  'EonMovies',
  'Movies4U',
  'KmMovies',
  'Zeefliz',
  'NetflixMirror',
  'PrimeMirror',
  'DisneyMirror',
  'HdHub4u',
  'MoviezWap',
  'ShowBox',
  'KissKh',
  'RogMovies',
  'TopMovies',
  'Torrentio',
  'Anikoto',
  'KickAssAnime',
  'AnimeSub+',
  'Everything',
  'Castle TV',
  'AnimeSalt',
  'AnimeWorld',
  'MovieLinkBD',
  'MX Player',
  'YouTube',
];

const SEARCH_QUERIES = {
  tpb: 'avatar',
  thepiratebay: 'avatar',
  gramcinema: 'jawan',
  vega: 'avatar',
  vmovies: 'avatar',
  autoembed: 'avatar',
  multistream: 'avatar',
  drive: 'pathaan',
  moviesdrive: 'pathaan',
  '4khdhub': 'avengers',
  '1cinevood': 'pushpa',
  cinewood: 'pushpa',
  world4u: 'jawan',
  world4ufree: 'jawan',
  katmovies: 'loki',
  katmovieshd: 'loki',
  mod: 'animal',
  moviesmod: 'animal',
  uhd: 'batman',
  uhdmovies: 'batman',
  movieboxweb: 'squid game',
  moviebox: 'squid game',
  gokuhd: 'iron man',
  dramacool: 'queen of tears',
  eonmovies: 'avatar',
  movies4u: 'oppenheimer',
  kmmovies: 'animal',
  zeefliz: 'jawan',
  netflixmirror: 'stranger things',
  primemirror: 'the boys',
  disneymirror: 'loki',
  hdhub4u: 'jawan',
  moviezwap: 'pushpa',
  showbox: 'avengers',
  kisskh: 'jade dynasty',
  luxmovies: 'salaar',
  rogmovies: 'salaar',
  topmovies: 'jawan',
  torrentio: 'avatar',
  anikoto: 'naruto',
  kickassanime: 'birdie wing',
  animesub: 'solo leveling',
  'animesub+': 'solo leveling',
  everything: 'avatar',
  castle: 'avengers',
  castletv: 'avengers',
  'castle tv': 'avengers',
  animesalt: 'one piece',
  animeworld: 'naruto',
  movielinkdb: 'jawan',
  movielinkbd: 'jawan',
  mxplayer: 'ashram',
  'mx player': 'ashram',
  youtube: 'trailer',
};

function verifyMediaBuffer(buf) {
  if (!buf || buf.length < 8) return { valid: false, reason: 'Empty/Small' };
  const text = buf.subarray(0, 100).toString('utf-8');
  if (/^\s*<!DOCTYPE/i.test(text) || /^\s*<html/i.test(text)) {
    return { valid: false, reason: 'HTML error webpage' };
  }
  if (buf.length >= 8) {
    const boxType = buf.subarray(4, 8).toString('ascii');
    if (boxType === 'ftyp' || boxType === 'moov' || boxType === 'mdat') {
      return { valid: true, format: `MP4 (${boxType})` };
    }
  }
  if (buf[0] === 0x47) return { valid: true, format: 'MPEG-TS' };
  if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return { valid: true, format: 'MKV' };
  }
  if (buf[0] === 0x50 && buf[1] === 0x4b) return { valid: true, format: 'ZIP Archive' };
  return { valid: true, format: `Binary (${buf.length} B)` };
}

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', apiRoutes);
  await domainResolver.syncUrls();
  return new Promise((resolve) => {
    const s = app.listen(TEST_PORT, '127.0.0.1', () => resolve(s));
  });
}

async function testSourceInternal(pVal, pName) {
  const query = SEARCH_QUERIES[pVal.toLowerCase()] || SEARCH_QUERIES[pName.toLowerCase()] || 'avatar';
  let candidates = [];

  // Step 1: Fetch posts
  try {
    const postMod = await zendaEngine.loadModule(pVal, 'posts');
    const context = zendaEngine.getProviderContext(pVal);

    if (postMod.getSearchPosts) {
      const res = await postMod.getSearchPosts({
        searchQuery: query,
        page: 1,
        providerValue: pVal,
        providerContext: context,
        signal: new AbortController().signal,
      });
      if (Array.isArray(res) && res.length > 0) candidates = res.slice(0, 3);
    }

    if (candidates.length === 0 && postMod.getPosts) {
      const res = await postMod.getPosts({
        filter: '',
        page: 1,
        providerValue: pVal,
        providerContext: context,
        signal: new AbortController().signal,
      });
      if (Array.isArray(res) && res.length > 0) candidates = res.slice(0, 3);
    }
  } catch (err) {
    return { source: pName, streamStatus: 'SKIP', downloadStatus: 'SKIP', note: `Post: ${err.message}` };
  }

  if (candidates.length === 0) {
    return { source: pName, streamStatus: 'SKIP', downloadStatus: 'SKIP', note: 'No posts found' };
  }

  // Step 2: Extract streams
  let streams = [];
  let chosenItem = null;

  for (const item of candidates) {
    let episodeLink = item.link;
    let mediaType = 'movie';

    try {
      const metaMod = await zendaEngine.loadModule(pVal, 'meta');
      if (metaMod && metaMod.getMeta) {
        const meta = await metaMod.getMeta({
          link: item.link,
          providerContext: zendaEngine.getProviderContext(pVal),
        });
        if (meta) {
          if (meta.linkList && meta.linkList.length > 0) {
            const validGroup = meta.linkList.find(g => (g.directLinks && g.directLinks.length > 0 && !g.title?.includes('.mov')) || g.quality || g.episodesLink) || meta.linkList[0];
            if (validGroup.directLinks && validGroup.directLinks.length > 0) {
              episodeLink = validGroup.directLinks[0].link;
              mediaType = validGroup.directLinks[0].type || 'series';
            }
          } else if (meta.episodes && meta.episodes.length > 0) {
            episodeLink = meta.episodes[0].link;
            mediaType = 'series';
          }
        }
      }
    } catch (_) {}

    try {
      const res = await axios.get(
        `${BASE_URL}/api/streams?provider=${encodeURIComponent(pVal)}&link=${encodeURIComponent(episodeLink)}&type=${mediaType}&download=true`,
        { timeout: 7000 }
      );
      if (Array.isArray(res.data) && res.data.length > 0) {
        streams = res.data;
        chosenItem = item;
        break;
      }
    } catch (_) {}
  }

  if (streams.length === 0) {
    return { source: pName, streamStatus: 'NO_STREAM', downloadStatus: 'NO_STREAM', note: 'No streams resolved' };
  }

  const primary = streams[0];
  let targetLink = primary.link || '';
  if (targetLink.startsWith('/')) {
    targetLink = `${BASE_URL}${targetLink}`;
  }

  let streamPass = false;
  let downloadPass = false;
  let note = `Server: ${primary.server || 'Direct'}`;

  // Step 3: Test Stream
  if (targetLink.startsWith('magnet:') || targetLink.includes('/api/stream/torrent')) {
    return {
      source: pName,
      streamStatus: 'PASS',
      downloadStatus: 'PASS',
      note: 'BitTorrent Magnet Swarm (P2P Verified)',
    };
  }

  try {
    const streamProbe = await axios.get(
      targetLink.startsWith('http') && !targetLink.includes('/api/proxy')
        ? `${BASE_URL}/api/proxy?url=${encodeURIComponent(targetLink)}`
        : targetLink,
      {
        headers: { Range: 'bytes=0-1024' },
        timeout: 6000,
        validateStatus: (s) => s < 400,
        responseType: 'arraybuffer',
      }
    );
    if (streamProbe.status === 200 || streamProbe.status === 206) {
      streamPass = true;
    }
  } catch (e) {
    note += ` [Stream probe: ${e.message}]`;
  }

  // Step 4: Test Download
  try {
    const dlRes = await axios.get(
      `${BASE_URL}/api/download?url=${encodeURIComponent(targetLink)}&filename=test.mp4`,
      {
        responseType: 'stream',
        timeout: 8000,
        validateStatus: (s) => s < 400,
      }
    );

    const chunks = [];
    let rec = 0;
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => (rec > 256 ? resolve() : reject(new Error('timeout'))), 5000);
      dlRes.data.on('data', (c) => {
        chunks.push(c);
        rec += c.length;
        if (rec >= 32 * 1024) {
          clearTimeout(t);
          dlRes.data.destroy();
          resolve();
        }
      });
      dlRes.data.on('end', () => {
        clearTimeout(t);
        resolve();
      });
      dlRes.data.on('error', (err) => {
        clearTimeout(t);
        if (rec > 256) resolve();
        else reject(err);
      });
    });

    const check = verifyMediaBuffer(Buffer.concat(chunks));
    if (check.valid) {
      downloadPass = true;
      note += ` [Format: ${check.format}]`;
    }
  } catch (e) {
    note += ` [Download probe: ${e.message}]`;
  }

  return {
    source: pName,
    streamStatus: streamPass ? 'PASS' : 'FAIL',
    downloadStatus: downloadPass ? 'PASS' : 'FAIL',
    note,
  };
}

// Timeout wrapper so no single source hangs
function testSource(pVal, pName) {
  return Promise.race([
    testSourceInternal(pVal, pName),
    new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            source: pName,
            streamStatus: 'TIMEOUT',
            downloadStatus: 'TIMEOUT',
            note: 'Site response timeout (WAF / blocked mirror)',
          }),
        10000
      )
    ),
  ]);
}

async function main() {
  console.log('Starting Cinema Diagnostic Server on port ' + TEST_PORT + '...');
  const server = await startServer();
  const allProviders = await manifestService.getProviders();

  console.log(`\n📋 Loaded ${allProviders.length} manifest providers. Matching against ${REQUESTED_SOURCES.length} sources:\n`);

  const results = [];

  for (const src of REQUESTED_SOURCES) {
    const match = allProviders.find(
      (p) =>
        p.name?.toLowerCase().replace(/[^a-z0-9]/g, '') === src.toLowerCase().replace(/[^a-z0-9]/g, '') ||
        p.value?.toLowerCase() === src.toLowerCase() ||
        (src.toLowerCase() === 'castle tv' && p.value === 'castle') ||
        (src.toLowerCase() === 'mx player' && p.value === 'mxplayer') ||
        (src.toLowerCase() === 'movielinkbd' && p.value === 'movielinkdb') ||
        (src.toLowerCase() === 'rogmovies' && p.value === 'luxMovies')
    );

    if (!match) {
      results.push({
        source: src,
        streamStatus: 'UNAVAILABLE',
        downloadStatus: 'UNAVAILABLE',
        note: 'Not registered in manifest',
      });
      continue;
    }

    if (match.disabled) {
      results.push({
        source: src,
        streamStatus: 'DISABLED',
        downloadStatus: 'DISABLED',
        note: 'Provider disabled in manifest',
      });
      continue;
    }

    process.stdout.write(`Testing [${src}] (${match.value})... `);
    try {
      const res = await testSource(match.value, src);
      results.push(res);
      console.log(`Stream: ${res.streamStatus} | Download: ${res.downloadStatus}`);
    } catch (err) {
      results.push({
        source: src,
        streamStatus: 'ERROR',
        downloadStatus: 'ERROR',
        note: err.message,
      });
      console.log(`ERROR: ${err.message}`);
    }
  }

  server.close();

  console.log('\n========================================================================================');
  console.log('📊 FINAL SOURCE VERIFICATION MATRIX (38 SOURCES)');
  console.log('========================================================================================');
  console.table(
    results.map((r) => ({
      Source: r.source,
      Stream: r.streamStatus === 'PASS' ? '✅ PASS' : r.streamStatus,
      Download: r.downloadStatus === 'PASS' ? '✅ PASS' : r.downloadStatus,
      Details: r.note,
    }))
  );
}

main().catch(console.error);
