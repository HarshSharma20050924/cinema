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

async function testAll() {
  const manifest = (await axios.get(ZENDA_RAW + '/manifest.json')).data;
  const activeProviders = manifest.filter(p => !p.disabled);

  console.log(`Testing ${activeProviders.length} active providers for "Squid Game"...`);

  for (const prov of activeProviders) {
    const p = prov.value;
    try {
      const postsMod = await getProviderModule(p, 'posts');
      if (!postsMod.getSearchPosts && !postsMod.getPosts) {
        continue;
      }
      let posts = [];
      if (postsMod.getSearchPosts) {
        posts = await postsMod.getSearchPosts({
          searchQuery: 'Squid Game',
          page: 1,
          providerValue: p,
          providerContext,
        });
      }
      if (!posts || posts.length === 0) continue;

      console.log(`\n========================================`);
      console.log(`[Provider: ${p} (${prov.display_name})] Found ${posts.length} posts`);
      for (const post of posts.slice(0, 3)) {
        console.log(`  -> Title: "${post.title}", Link: "${post.link}"`);
        try {
          const metaMod = await getProviderModule(p, 'meta');
          const meta = await metaMod.getMeta({
            link: post.link,
            providerValue: p,
            providerContext,
          });
          console.log(`     Meta type: ${meta?.type}, LinkList count: ${meta?.linkList?.length}`);
          if (meta?.linkList) {
            for (const g of meta.linkList.slice(0, 2)) {
              console.log(`       Group: "${g.title}", directLinks: ${g.directLinks?.length}, episodesLink: ${!!g.episodesLink}`);
            }
          }
        } catch (mErr) {
          console.log(`     Meta error: ${mErr.message}`);
        }
      }
    } catch (err) {
      // ignore
    }
  }
}

testAll().catch(console.error);
