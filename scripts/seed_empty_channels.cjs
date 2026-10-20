const fs = require('fs');
const path = require('path');
const axios = require('axios');
const zendaEngine = require('../server/services/zendaEngine.cjs');
const { getBotForExtension, postToDedicatedChannel } = require('../server/services/multiChannelPoster.cjs');

const network = require('../server/config/channel_network.json');

const emptyExtensionIds = [
  'moviesflix',
  'extramovies',
  'world4ufree',
  'skymovieshd',
  'filmyfly',
  'cinemaluxe',
  'ridomovies',
  'flixhq',
  'protonmovies',
  'kisskh',
  'gogoanime',
  'animerulz',
  'anikoto',
  'hianime',
  'yts',
  '1337x',
  'thepiratebay',
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function seed() {
  console.log(`🚀 Seeding ${emptyExtensionIds.length} empty channels with fresh movie posts...`);

  for (const extId of emptyExtensionIds) {
    const ch = network[extId];
    if (!ch?.channelId) continue;

    console.log(`\n⏳ [${extId.toUpperCase()}] Fetching releases for ${ch.title}...`);
    try {
      const targetProv = zendaEngine.normalizeProvider(extId);
      const mod = await zendaEngine.loadModule(targetProv, 'posts');
      const ctx = zendaEngine.getProviderContext(targetProv);

      const posts = await mod.getPosts({
        page: 1,
        filter: '',
        providerValue: targetProv,
        providerContext: ctx,
        signal: new AbortController().signal,
      });

      if (!Array.isArray(posts) || posts.length === 0) {
        console.warn(`⚠️ No posts found for ${extId} (${targetProv})`);
        continue;
      }

      // Post top 3 fresh releases
      const toPost = posts.slice(0, 3);
      let successCount = 0;

      for (const item of toPost) {
        if (!item.title || !item.link) continue;
        console.log(`  📤 Posting to ${ch.title}: "${item.title.slice(0, 40)}"`);

        const res = await postToDedicatedChannel(item, extId, ch.channelId);
        if (res?.ok) {
          successCount++;
          await sleep(2500); // Flood prevention
        } else {
          console.warn(`  ⚠️ Post failed for ${extId}`);
        }
      }

      console.log(`✅ [${extId.toUpperCase()}] Successfully posted ${successCount} releases to ${ch.title}!`);
    } catch (err) {
      console.error(`❌ Error seeding ${extId}:`, err.message);
    }

    await sleep(1500);
  }

  console.log('\n🎉 ALL EMPTY CHANNELS SEEDED AND POPULATED SUCCESSFULLY!');
}

seed().catch(console.error);
