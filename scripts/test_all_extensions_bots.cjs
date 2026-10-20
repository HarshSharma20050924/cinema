const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3001';

const EXTENSIONS_TO_TEST = [
  { bot: 'OTT Series Bot', provider: 'movieBoxWeb', query: 'Our Sticky Love', type: 'series' },
  { bot: 'OTT Series Bot', provider: 'netflixMirror', query: 'Stranger Things', type: 'series' },
  { bot: 'OTT Series Bot', provider: 'disneyMirror', query: 'Loki', type: 'series' },
  { bot: 'CinemaWood', provider: 'hdhub4u', query: 'Stree 2', type: 'movie' },
  { bot: 'CinemaWood', provider: 'vega', query: 'Jawan', type: 'movie' },
  { bot: 'CinemaWood', provider: 'moviesmod', query: 'Animal', type: 'movie' },
  { bot: 'CinemaWood', provider: 'mxplayer', query: 'Aashram', type: 'series' },
  { bot: 'Cinema 4K Bot', provider: '4khdhub', query: 'Avatar', type: 'movie' },
  { bot: 'Anime Bot', provider: 'animeworld', query: 'Naruto', type: 'series' },
  { bot: 'Anime Bot', provider: 'hiAnime', query: 'One Piece', type: 'series' },
  { bot: 'Torrents Bot', provider: 'tpb', query: 'Inception', type: 'movie' },
];

async function runTests() {
  console.log('====================================================');
  console.log('   SYSTEM-WIDE EXTENSIONS & BOTS AUDIT REPORT       ');
  console.log('====================================================\n');

  const report = [];

  for (const item of EXTENSIONS_TO_TEST) {
    const entry = {
      bot: item.bot,
      provider: item.provider,
      search: '❌',
      meta: '❌',
      episodesOrQualities: '❌',
      streams: '❌',
      details: ''
    };

    try {
      // 1. Search
      const sRes = await axios.get(`${BASE_URL}/api/search`, {
        params: { provider: item.provider, q: item.query },
        timeout: 12000
      });
      const results = Array.isArray(sRes.data) ? sRes.data : [];
      if (results.length > 0) {
        entry.search = `✅ (${results.length} results)`;
        const first = results[0];

        // 2. Meta
        try {
          const mRes = await axios.get(`${BASE_URL}/api/meta`, {
            params: { provider: item.provider, link: first.link },
            timeout: 15000
          });
          const meta = mRes.data;
          if (meta && (meta.title || meta.linkList || meta.downloadLinks || meta.episodes)) {
            entry.meta = '✅';
            const groups = meta.linkList || meta.downloadLinks || meta.episodes || [];
            entry.episodesOrQualities = `✅ (${groups.length} groups)`;

            // 3. Streams
            let testTarget = '';
            if (groups.length > 0) {
              const g = groups[0];
              if (g.directLinks && g.directLinks.length > 0) {
                testTarget = g.directLinks[0].link;
              } else if (g.episodesLink) {
                testTarget = g.episodesLink;
              } else {
                testTarget = g.link || first.link;
              }
            } else {
              testTarget = first.link;
            }

            if (typeof testTarget === 'object') testTarget = JSON.stringify(testTarget);

            if (testTarget) {
              try {
                const strRes = await axios.get(`${BASE_URL}/api/streams`, {
                  params: { provider: item.provider, link: testTarget, type: item.type },
                  timeout: 18000
                });
                const streams = Array.isArray(strRes.data) ? strRes.data : [];
                if (streams.length > 0) {
                  entry.streams = `✅ (${streams.length} mirrors: ${streams[0].server || 'Direct'})`;
                } else {
                  entry.streams = '⚠️ (0 mirrors resolved)';
                }
              } catch (stErr) {
                entry.streams = `❌ (${stErr.message})`;
              }
            }
          } else {
            entry.meta = '⚠️ Empty meta';
          }
        } catch (mErr) {
          entry.meta = `❌ (${mErr.message})`;
        }
      } else {
        entry.search = '⚠️ 0 results';
      }
    } catch (sErr) {
      entry.search = `❌ (${sErr.message})`;
    }

    report.push(entry);
    console.log(`[${entry.bot}] Provider: ${entry.provider}`);
    console.log(`  - Search: ${entry.search}`);
    console.log(`  - Meta: ${entry.meta}`);
    console.log(`  - Items: ${entry.episodesOrQualities}`);
    console.log(`  - Streams: ${entry.streams}`);
    console.log('----------------------------------------------------');
  }

  console.log('\nAudit complete.');
}

runTests();
