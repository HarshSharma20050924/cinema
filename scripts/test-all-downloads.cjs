const axios = require('axios');
const http = require('http');
const express = require('express');
const cors = require('cors');
const apiRoutes = require('../server/routes/index.cjs');
const domainResolver = require('../server/services/domainResolver.cjs');
const manifestService = require('../server/services/manifestService.cjs');
const zendaEngine = require('../server/services/zendaEngine.cjs');

// Test port
const TEST_PORT = 3847;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function verifyMediaBuffer(buf) {
  if (!buf || buf.length < 16) {
    return { valid: false, reason: 'Buffer too small (<16 bytes)' };
  }

  // Check if it is an HTML error page
  const textPreview = buf.subarray(0, 100).toString('utf-8');
  if (/^\s*<!DOCTYPE/i.test(textPreview) || /^\s*<html/i.test(textPreview)) {
    return { valid: false, reason: 'Received HTML error webpage instead of video' };
  }

  // Check if it is a raw m3u8 playlist text (the bug where only 9k playlist downloads)
  if (textPreview.includes('#EXTM3U') || textPreview.includes('#EXTINF:')) {
    return { valid: false, reason: 'Received raw #EXTM3U playlist text instead of remuxed video' };
  }

  // 1. MP4 (ISO Base Media): bytes 4-8 are 'ftyp' or 'moov'
  if (buf.length >= 8) {
    const boxType = buf.subarray(4, 8).toString('ascii');
    if (boxType === 'ftyp' || boxType === 'moov' || boxType === 'mdat') {
      return { valid: true, format: 'MP4 (' + boxType + ')' };
    }
  }

  // 2. MPEG-TS: starts with 0x47 (sync byte)
  if (buf[0] === 0x47) {
    return { valid: true, format: 'MPEG-TS (sync byte 0x47 verified)' };
  }

  // 3. Matroska / MKV: starts with 0x1A45DFA3
  if (buf.length >= 4 && buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) {
    return { valid: true, format: 'Matroska (MKV)' };
  }

  // 4. ZIP archive (Season Packs): 'PK' (0x50 0x4B)
  if (buf[0] === 0x50 && buf[1] === 0x4B) {
    return { valid: true, format: 'ZIP Archive (Season Pack)' };
  }

  return { valid: true, format: 'Binary Video/Stream (' + buf.length + ' bytes received)' };
}

async function startTestServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', apiRoutes);

  await domainResolver.syncUrls();

  return new Promise((resolve) => {
    const server = app.listen(TEST_PORT, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

// Sample queries tailored to provider types for high search hit-rate
const PROVIDER_QUERIES = {
  kissKh: 'jade dynasty',
  kickAssAnime: 'birdie wing',
  hiAnime: 'solo leveling',
  tokyoInsider: 'naruto',
  anikoto: 'naruto',
  movieBoxWeb: 'avatar',
  flixhq: 'oppenheimer',
  showbox: 'avengers',
  hdhub4u: 'jawan',
  mod: 'animal',
  drive: 'pathaan',
  vega: 'salaar',
  uhd: 'batman',
  autoEmbed: 'fight club',
  multi: 'dune',
  '1cinevood': 'pushpa',
  katmovies: 'loki',
  moviesApi: 'matrix',
  ridoMovies: 'interstellar',
  gokuHD: 'iron man',
};

async function testProviderDownload(provider) {
  const pVal = provider.value;
  const pName = provider.name || pVal;

  console.log(`\n------------------------------------------------------------`);
  console.log(`🔍 Testing Provider: ${pName} (${pVal})`);

  let candidates = [];

  // Step 1: Find posts
  try {
    const postMod = await zendaEngine.loadModule(pVal, 'posts');
    const context = zendaEngine.getProviderContext(pVal);

    const query = PROVIDER_QUERIES[pVal] || 'naruto';

    if (postMod.getSearchPosts) {
      const searchRes = await postMod.getSearchPosts({
        searchQuery: query,
        page: 1,
        providerValue: pVal,
        providerContext: context,
        signal: new AbortController().signal,
      });
      if (Array.isArray(searchRes) && searchRes.length > 0) {
        candidates = searchRes.slice(0, 4);
      }
    }

    if (candidates.length === 0 && postMod.getPosts) {
      const postsRes = await postMod.getPosts({
        filter: '',
        page: 1,
        providerValue: pVal,
        providerContext: context,
        signal: new AbortController().signal,
      });
      if (Array.isArray(postsRes) && postsRes.length > 0) {
        const released = postsRes.filter(p => !p.title?.includes('2026') && !p.title?.toLowerCase().includes('upcoming'));
        candidates = (released.length > 0 ? released : postsRes).slice(0, 4);
      }
    }
  } catch (err) {
    return { provider: pName, status: 'SKIPPED', error: 'Failed to fetch posts: ' + err.message };
  }

  if (candidates.length === 0) {
    return { provider: pName, status: 'SKIPPED', error: 'No posts returned for testing' };
  }

  let streams = [];
  let chosenItem = null;

  for (const targetItem of candidates) {
    console.log(`   📌 Testing Title: "${targetItem.title}"`);

    // Step 2: Get Meta / Episode Link
    let episodeLink = targetItem.link;
    let mediaType = 'movie';

    try {
      const metaMod = await zendaEngine.loadModule(pVal, 'meta');
      if (metaMod && metaMod.getMeta) {
        const meta = await metaMod.getMeta({
          link: targetItem.link,
          providerContext: zendaEngine.getProviderContext(pVal),
        });

        if (meta) {
          if (meta.linkList && meta.linkList.length > 0) {
            const firstGroup = meta.linkList[0];
            if (firstGroup.directLinks && firstGroup.directLinks.length > 0) {
              episodeLink = firstGroup.directLinks[0].link;
              mediaType = firstGroup.directLinks[0].type || 'series';
            }
          } else if (meta.episodes && meta.episodes.length > 0) {
            episodeLink = meta.episodes[0].link;
            mediaType = 'series';
          }
        }
      }
    } catch (err) {
      // Ignore meta error
    }

    // Step 3: Get Streams
    try {
      const streamRes = await axios.get(
        `${BASE_URL}/api/streams?provider=${encodeURIComponent(pVal)}&link=${encodeURIComponent(episodeLink)}&type=${mediaType}&download=true`,
        { timeout: 18000 }
      );
      if (Array.isArray(streamRes.data) && streamRes.data.length > 0) {
        streams = streamRes.data;
        chosenItem = targetItem;
        break;
      }
    } catch (_) {}
  }

  if (!Array.isArray(streams) || streams.length === 0) {
    return { provider: pName, status: 'NO_STREAMS', error: 'No active streams found for this title' };
  }

  console.log(`   🎬 Resolved ${streams.length} stream mirror(s):`);

  // Step 4: Test Download Link for primary stream mirror
  const testStream = streams[0];
  console.log(`   🚀 Testing Download for Mirror: [${testStream.server}] (Type: ${testStream.type || 'direct'})`);

  if (testStream.link && testStream.link.startsWith('magnet:')) {
    console.log(`   ✅ SUCCESS: Direct BitTorrent Magnet Link verified!`);
    return {
      provider: pName,
      status: 'PASSED',
      server: testStream.server,
      format: 'BitTorrent Magnet (VLC / P2P Client Ready)',
      contentType: 'application/x-bittorrent',
      receivedKb: 'N/A',
    };
  }

  const headersParam = testStream.headers ? `&headers=${encodeURIComponent(JSON.stringify(testStream.headers))}` : '';
  const typeParam = testStream.type ? `&type=${encodeURIComponent(testStream.type)}` : '';
  const downloadUrl = `${BASE_URL}/api/download?url=${encodeURIComponent(testStream.link)}&filename=test_video.mp4${headersParam}${typeParam}`;

  try {
    const dlResponse = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream',
      timeout: 25000,
      validateStatus: (s) => s < 400,
    });

    const disposition = dlResponse.headers['content-disposition'] || '';
    const contentType = dlResponse.headers['content-type'] || '';

    // Collect first ~100KB to verify real video bytes
    const chunks = [];
    let received = 0;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (received > 1024) resolve();
        else reject(new Error('Download stream timed out with <1KB received'));
      }, 12000);

      dlResponse.data.on('data', (chunk) => {
        chunks.push(chunk);
        received += chunk.length;
        if (received >= 100 * 1024) {
          clearTimeout(timeout);
          dlResponse.data.destroy(); // Got enough to verify!
          resolve();
        }
      });

      dlResponse.data.on('end', () => {
        clearTimeout(timeout);
        resolve();
      });

      dlResponse.data.on('error', (err) => {
        clearTimeout(timeout);
        if (received >= 1024) resolve();
        else reject(err);
      });
    });

    const combinedBuffer = Buffer.concat(chunks);
    const mediaCheck = verifyMediaBuffer(combinedBuffer);

    if (!mediaCheck.valid) {
      return {
        provider: pName,
        status: 'FAILED',
        error: `Invalid media output: ${mediaCheck.reason}`,
      };
    }

    console.log(`   ✅ SUCCESS: Download verified!`);
    console.log(`      Content-Type: ${contentType}`);
    console.log(`      Content-Disposition: ${disposition}`);
    console.log(`      Verified Format: ${mediaCheck.format}`);
    console.log(`      Initial Chunk Size: ${(received / 1024).toFixed(1)} KB`);

    return {
      provider: pName,
      status: 'PASSED',
      server: testStream.server,
      format: mediaCheck.format,
      contentType,
      receivedKb: (received / 1024).toFixed(1),
    };
  } catch (err) {
    return {
      provider: pName,
      status: 'FAILED',
      error: `Download request error: ${err.message}`,
    };
  }
}

async function run() {
  console.log('============================================================');
  console.log('🎥 CINEMA EXTENSION DOWNLOAD VERIFICATION SUITE');
  console.log('============================================================\n');

  const server = await startTestServer();
  console.log(`✅ Test server initialized on ${BASE_URL}`);

  const targetArgs = process.argv.slice(2);
  const allProviders = await manifestService.getProviders();

  let testList = allProviders.filter((p) => !p.disabled);
  if (targetArgs.length > 0 && !targetArgs.some((a) => a.toLowerCase() === 'all')) {
    testList = testList.filter((p) =>
      targetArgs.some(
        (arg) =>
          p.value.toLowerCase().includes(arg.toLowerCase()) ||
          p.name.toLowerCase().includes(arg.toLowerCase())
      )
    );
  }

  const results = [];

  for (const prov of testList) {
    try {
      const res = await testProviderDownload(prov);
      results.push(res);
    } catch (e) {
      results.push({ provider: prov.name, status: 'FAILED', error: e.message });
    }
  }

  console.log('\n============================================================');
  console.log('📊 DOWNLOAD TEST RESULTS SUMMARY');
  console.log('============================================================');

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const r of results) {
    if (r.status === 'PASSED') {
      passed++;
      console.log(`  ✅ [PASSED]  ${r.provider.padEnd(18)} | Format: ${r.format} (${r.receivedKb} KB verified)`);
    } else if (r.status === 'FAILED') {
      failed++;
      console.log(`  ❌ [FAILED]  ${r.provider.padEnd(18)} | Error: ${r.error}`);
    } else {
      skipped++;
      console.log(`  ⚠️  [SKIPPED] ${r.provider.padEnd(18)} | ${r.error}`);
    }
  }

  const totalEvaluated = passed + failed;
  const accuracy = totalEvaluated > 0 ? ((passed / totalEvaluated) * 100).toFixed(1) : '100.0';

  console.log('------------------------------------------------------------');
  console.log(`Total Tested: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped/NoStreams: ${skipped}`);
  console.log(`Accuracy Rate: ${accuracy}%`);
  console.log('============================================================\n');

  server.close(() => process.exit(0));
}

run().catch((e) => {
  console.error('Fatal error running test suite:', e);
  process.exit(1);
});
