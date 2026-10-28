const path = require('path');
const zendaEngine = require('../server/services/zendaEngine.cjs');
const { postToDedicatedChannel } = require('../server/services/multiChannelPoster.cjs');
const fs = require('fs');

async function repostNetflix(limit = 10) {
  console.log(`🎬 [Repost Netflix] Fetching latest ${limit} releases from netflixMirror...`);
  
  const netPath = path.resolve(__dirname, '../server/config/channel_network.json');
  const network = JSON.parse(fs.readFileSync(netPath, 'utf8'));
  const ch = network['netflixMirror'];

  if (!ch || !ch.channelId) {
    console.error('❌ Cinema Netflix channel configuration not found!');
    process.exit(1);
  }

  console.log(`📡 Target Channel: ${ch.title} (${ch.channelId})`);

  const mod = await zendaEngine.loadModule('netflixMirror', 'posts');
  if (!mod || !mod.getPosts) {
    console.error('❌ Could not load netflixMirror posts module');
    process.exit(1);
  }

  const ctx = zendaEngine.getProviderContext('netflixMirror');
  const posts = await mod.getPosts({
    page: 1,
    filter: '',
    providerValue: 'netflixMirror',
    providerContext: ctx,
    signal: new AbortController().signal
  });

  if (!Array.isArray(posts) || posts.length === 0) {
    console.error('❌ No posts returned from netflixMirror');
    process.exit(1);
  }

  console.log(`✨ Found ${posts.length} latest Netflix releases. Reposting top ${limit}...`);

  let successCount = 0;
  const itemsToPost = posts.slice(0, limit);

  for (let i = 0; i < itemsToPost.length; i++) {
    const item = itemsToPost[i];
    console.log(`\n[${i + 1}/${itemsToPost.length}] Posting: "${item.title}"...`);
    try {
      const res = await postToDedicatedChannel(item, 'netflixMirror', ch.channelId, { force: true });
      if (res?.ok) {
        console.log(`✅ Success! Message ID: ${res.result?.message_id}`);
        successCount++;
      } else {
        console.warn(`⚠️ Post returned:`, res?.description || res);
      }
    } catch (err) {
      console.error(`❌ Error posting "${item.title}":`, err.message);
    }
    // Rate limit delay between posts
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n🎉 Reposting completed! Successfully posted ${successCount}/${itemsToPost.length} releases to ${ch.title}.`);
}

const count = parseInt(process.argv[2] || '10', 10);
repostNetflix(count).then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal repost error:', err);
  process.exit(1);
});
