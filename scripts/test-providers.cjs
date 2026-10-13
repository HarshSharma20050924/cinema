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

async function test() {
  const providers = ['hdhub4u', 'movieBoxWeb', 'topmovies', 'luxMovies'];
  for (const p of providers) {
    console.log(`\n=== Testing Provider: ${p} ===`);
    try {
      const postsMod = await getProviderModule(p, 'posts');
      let posts = [];
      if (postsMod.getSearchPosts) {
        posts = await postsMod.getSearchPosts({
          searchQuery: 'Squid Game',
          page: 1,
          providerValue: p,
          providerContext,
        });
      }
      console.log(`Found ${posts ? posts.length : 0} posts`);
      if (posts && posts.length > 0) {
        console.log(`First post:`, posts[0].title, posts[0].link);
        const metaMod = await getProviderModule(p, 'meta');
        const meta = await metaMod.getMeta({
          link: posts[0].link,
          providerValue: p,
          providerContext,
        });
        console.log(`Meta title:`, meta?.title, `type:`, meta?.type);
        console.log(`linkList length:`, meta?.linkList?.length);
        if (meta?.linkList && meta.linkList.length > 0) {
          console.log(`Sample linkList item:`, JSON.stringify(meta.linkList[0], null, 2).slice(0, 300));
        }
        if (meta?.episodesLink) {
          console.log(`episodesLink:`, meta.episodesLink);
          const epMod = await getProviderModule(p, 'episodes');
          const eps = await epMod.getEpisodes({
            url: meta.episodesLink,
            providerContext,
          });
          console.log(`eps count:`, eps?.length, `sample ep:`, eps?.[0]);
          if (eps && eps.length > 0) {
            const streamMod = await getProviderModule(p, 'stream');
            const streams = await streamMod.getStream({
              link: eps[0].link,
              type: 'series',
              isDownload: true,
              providerContext,
            });
            console.log(`Streams for ep 0:`, streams);
          }
        } else if (meta?.linkList?.[0]?.directLinks?.[0]?.link) {
          const streamMod = await getProviderModule(p, 'stream');
          const streams = await streamMod.getStream({
            link: meta.linkList[0].directLinks[0].link,
            type: 'series',
            isDownload: true,
            providerContext,
          });
          console.log(`Streams for linkList 0 directLinks 0:`, streams);
        }
      }
    } catch (e) {
      console.error(`Error with ${p}:`, e.message, e.stack?.slice(0, 200));
    }
  }
}

test();
