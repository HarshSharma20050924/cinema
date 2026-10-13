const axios = require('axios');
const cheerio = require('cheerio');

const ZENDA_RAW = 'https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main';

const providerContext = {
  axios,
  cheerio,
  commonHeaders: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  },
  Aes: {},
};

async function getProviderModule(provider, moduleName) {
  const url = `${ZENDA_RAW}/dist/${provider}/${moduleName}.js`;
  const response = await axios.get(url, { timeout: 12000 });
  const code = response.data;
  const mod = { exports: {} };
  const fn = new Function('exports', 'module', 'require', code);
  fn(mod.exports, mod, require);
  return mod.exports;
}

async function testMovieBox() {
  const p = 'movieBoxWeb';
  console.log(`Testing ${p}`);
  const postsMod = await getProviderModule(p, 'posts');
  const posts = await postsMod.getSearchPosts({
    searchQuery: 'Squid Game',
    page: 1,
    providerValue: p,
    providerContext,
  });
  console.log('Posts:', posts.map(x => ({ title: x.title, link: x.link })));

  const metaMod = await getProviderModule(p, 'meta');
  const meta = await metaMod.getMeta({
    link: posts[0].link,
    providerValue: p,
    providerContext,
  });
  console.log('Meta title:', meta.title);
  console.log('linkList:', JSON.stringify(meta.linkList, null, 2));

  const epMod = await getProviderModule(p, 'episodes');
  const streamMod = await getProviderModule(p, 'stream');

  for (const group of meta.linkList.slice(0, 3)) {
    console.log(`\nFetching episodes for group: ${group.title}`);
    try {
      const eps = await epMod.getEpisodes({
        url: group.episodesLink,
        providerContext,
      });
      console.log(`Episodes count: ${eps?.length}`);
      if (eps && eps.length > 0) {
        console.log(`First episode:`, eps[0]);
        console.log(`Resolving stream for first episode...`);
        try {
          const streams = await streamMod.getStream({
            link: eps[0].link,
            type: 'series',
            isDownload: false,
            providerContext,
          });
          console.log(`Stream result:`, streams);
        } catch (streamErr) {
          console.error(`Stream error:`, streamErr.message);
        }
      }
    } catch (e) {
      console.error(`Episode error:`, e.message);
    }
  }
}

testMovieBox().catch(console.error);
