const zendaEngine = require('../server/services/zendaEngine.cjs');
const { postToDedicatedChannel } = require('../server/services/multiChannelPoster.cjs');
const fs = require('fs');
const path = require('path');

const NEW_EXTENSIONS = ['mxplayer', 'castle', 'netflixMirror', 'disneyMirror', 'primeMirror', 'animesalt'];

async function testNewChannels() {
  console.log('Testing new channels posting...');
  const netPath = path.resolve(__dirname, '../server/config/channel_network.json');
  const network = JSON.parse(fs.readFileSync(netPath, 'utf8'));

  for (const extId of NEW_EXTENSIONS) {
    const ch = network[extId];
    if (!ch) {
      console.log(`No channel config for ${extId}`);
      continue;
    }
    console.log(`\nChecking [${extId}] for channel ${ch.title} (${ch.channelId})...`);

    try {
      const mod = await zendaEngine.loadModule(extId, 'posts');
      if (!mod || !mod.getPosts) {
        console.log(`[${extId}] No posts module`);
        continue;
      }

      const ctx = zendaEngine.getProviderContext(extId);
      const posts = await mod.getPosts({
        page: 1,
        filter: '',
        providerValue: extId,
        providerContext: ctx,
        signal: new AbortController().signal
      });

      console.log(`[${extId}] Found ${posts?.length || 0} posts`);
      if (Array.isArray(posts) && posts.length > 0) {
        const first = posts[0];
        console.log(`Posting sample to ${ch.title}: ${first.title}`);
        const res = await postToDedicatedChannel(first, extId, ch.channelId);
        console.log(`Post result:`, res?.ok ? 'SUCCESS' : res?.description || res);
      }
    } catch (err) {
      console.warn(`Error on ${extId}:`, err.message);
    }
  }
}

testNewChannels().then(() => {
  console.log('Finished testing new channels.');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
