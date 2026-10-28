const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const CONFIG_DIR = path.resolve(__dirname, '../server/config');
const LOGO_DIR = path.resolve(__dirname, '../server/data/channel_logos');
const NETWORK_CONFIG_FILE = path.join(CONFIG_DIR, 'channel_network.json');
const CATEGORY_BOTS_FILE = path.join(CONFIG_DIR, 'category_bots.json');

const ACTIVE_CHANNELS = [
  { extId: '4khdhub', label: '4K HDHub', category: '4k' },
  { extId: 'uhdmovies', label: 'UHDMovies', category: '4k' },
  { extId: 'hdhub4u', label: 'HDHub4u', category: 'desi' },
  { extId: 'vega', label: 'VegaMovies', category: 'desi' },
  { extId: 'moviesmod', label: 'MoviesMod', category: 'desi' },
  { extId: 'drive', label: 'MoviesDrive', category: 'desi' },
  { extId: 'topmovies', label: 'TopMovies', category: 'desi' },
  { extId: 'filmyfly', label: 'FilmyFly', category: 'desi' },
  { extId: 'moviezwap', label: 'MovieZwap', category: 'desi' },
  { extId: 'zeefliz', label: 'ZeeFliz', category: 'desi' },
  { extId: 'movies4u', label: 'Movies4u', category: 'desi' },
  { extId: 'mxplayer', label: 'MX Player', category: 'desi' },
  { extId: 'castle', label: 'Castle', category: 'desi' },
  { extId: 'movieBoxWeb', label: 'MovieBox', category: 'series' },
  { extId: 'netflixMirror', label: 'Netflix', category: 'series' },
  { extId: 'primeMirror', label: 'Prime Video', category: 'series' },
  { extId: 'disneyMirror', label: 'Disney+', category: 'series' },
  { extId: 'multimovies', label: 'MultiMovies', category: 'series' },
  { extId: 'showbox', label: 'Showbox', category: 'series' },
  { extId: 'flixhq', label: 'FlixHQ', category: 'series' },
  { extId: 'hianime', label: 'HiAnime', category: 'anime' },
  { extId: 'animeworld', label: 'AnimeWorld', category: 'anime' },
  { extId: 'anikoto', label: 'AniKoto', category: 'anime' },
  { extId: 'animesalt', label: 'AnimeSalt', category: 'anime' },
  { extId: 'dramacool', label: 'DramaCool', category: 'anime' },
  { extId: 'thepiratebay', label: 'PirateBay', category: 'torrent' },
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadLogoForChannel(botTokens, extId, channelConfig, category) {
  const logoPath = path.join(LOGO_DIR, `${extId}_logo.png`);
  if (!fs.existsSync(logoPath)) {
    console.error(`❌ Logo file not found: ${logoPath}`);
    return false;
  }

  const chatId = `-100${channelConfig.channelId}`;
  
  // Try the category bot first, then try the other bots if needed
  const preferredToken = botTokens[category];
  const allTokens = [
    preferredToken,
    ...Object.values(botTokens).filter((t) => t !== preferredToken),
  ].filter(Boolean);

  for (const token of allTokens) {
    try {
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('photo', fs.createReadStream(logoPath));

      const res = await axios.post(`https://api.telegram.org/bot${token}/setChatPhoto`, form, {
        headers: form.getHeaders(),
        timeout: 15000,
      });

      if (res.data?.ok) {
        console.log(`✅ [${extId}] Updated photo for "${channelConfig.title}"`);
        return true;
      }
    } catch (err) {
      const desc = err.response?.data?.description || err.message;
      // If error is CHAT_ADMIN_REQUIRED or not enough rights, we try next bot
      if (desc.includes('CHAT_ADMIN_REQUIRED') || desc.includes('not enough rights') || desc.includes('chat not found')) {
        continue;
      }
      if (desc.includes('FLOOD_WAIT') || desc.includes('Too Many Requests')) {
        const wait = err.response?.data?.parameters?.retry_after || 10;
        console.log(`⏳ Rate limit on bot, waiting ${wait}s...`);
        await sleep(wait * 1000);
      } else {
        // Other error, log and try next bot
        console.log(`ℹ️ [${extId}] Bot attempt note: ${desc}`);
      }
    }
  }

  console.warn(`⚠️ Could not update photo for [${extId}] "${channelConfig.title}" with any category bot.`);
  return false;
}

async function run() {
  console.log('🎬 Starting 2-Letter Logo Upload for All Active Channels...');

  const networkConfig = JSON.parse(fs.readFileSync(NETWORK_CONFIG_FILE, 'utf8'));
  const categoryBots = JSON.parse(fs.readFileSync(CATEGORY_BOTS_FILE, 'utf8'));

  const botTokens = {};
  for (const [cat, bot] of Object.entries(categoryBots)) {
    botTokens[cat] = bot.token;
  }

  let successCount = 0;
  for (const item of ACTIVE_CHANNELS) {
    const channelConfig = networkConfig[item.extId];
    if (!channelConfig) {
      console.warn(`Configuration missing for ${item.extId}`);
      continue;
    }

    console.log(`\nProcessing [${item.extId}] - "${channelConfig.title}" (${item.label})...`);
    const ok = await uploadLogoForChannel(botTokens, item.extId, channelConfig, item.category);
    if (ok) {
      successCount++;
    }
    // Respect Telegram rate limit guidelines
    await sleep(2000);
  }

  console.log(`\n🎉 Finished! Successfully updated ${successCount} / ${ACTIVE_CHANNELS.length} active channels.`);
}

run().catch(console.error);
