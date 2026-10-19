const fs = require('fs');
const path = require('path');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const API_ID = 34834024;
const API_HASH = 'a19dcd8389bf1da64949e97fbcd5064c';
const CONFIG_DIR = path.resolve(__dirname, '../server/config');
const SESSION_FILE = path.join(CONFIG_DIR, 'telegram_session.txt');
const BOTS_CONFIG_FILE = path.join(CONFIG_DIR, 'category_bots.json');

const CATEGORIES = [
  {
    key: '4k',
    name: 'Cinema 4K Bot',
    baseUsername: 'Cinema4K_Ultra_Bot',
    description: 'Direct 4K UHD & HDR Movies from Cinema Network.',
    categories: ['4khdhub', 'uhdmovies', 'cinemaluxe'],
  },
  {
    key: 'desi',
    name: 'Cinema Desi Bot',
    baseUsername: 'CinemaDesi_Movies_Bot',
    description: 'Bollywood, South Hindi Dubbed & Desi Movies.',
    categories: [
      'hdhub4u', 'vega', 'moviesmod', 'drive', 'katmoviehd', 'topmovies',
      'bollyflix', 'moviesflix', 'extramovies', 'world4ufree', 'skymovieshd',
      'filmyfly', 'cinevood', 'luxmovies', 'eonmovies', 'moviezwap', 'zeefliz', 'movies4u'
    ],
  },
  {
    key: 'series',
    name: 'Cinema OTT Series Bot',
    baseUsername: 'CinemaOTT_Series_Bot',
    description: 'Netflix, Prime, HBO Web Series & International Hollywood.',
    categories: ['movieBoxWeb', 'multimovies', 'gokuhd', 'showbox', 'ridomovies', 'flixhq', 'protonmovies'],
  },
  {
    key: 'anime',
    name: 'Cinema Anime Drama Bot',
    baseUsername: 'CinemaAnime_Drama_Bot',
    description: 'Anime Episodes & K-Drama / Asian Cinema.',
    categories: ['hianime', 'gogoanime', 'animerulz', 'animeworld', 'anikoto', 'kisskh', 'dramacool'],
  },
  {
    key: 'torrent',
    name: 'Cinema Torrents Bot',
    baseUsername: 'CinemaTorrent_P2P_Bot',
    description: 'High-Bitrate YTS, 1337x & PirateBay Movies.',
    categories: ['yts', '1337x', 'thepiratebay'],
  },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getLastBotFatherMessage(client) {
  const msgs = await client.getMessages('BotFather', { limit: 1 });
  return msgs[0] ? msgs[0].message : '';
}

async function createBotViaBotFather(client, botDef) {
  console.log(`🤖 Attempting to create: "${botDef.name}"...`);

  // Cancel any ongoing command first
  await client.sendMessage('BotFather', { message: '/cancel' });
  await sleep(1500);

  // Send /newbot
  await client.sendMessage('BotFather', { message: '/newbot' });
  await sleep(2000);

  let reply = await getLastBotFatherMessage(client);
  if (!reply.includes('call it') && !reply.includes('choose a name')) {
    console.warn(`Unexpected BotFather reply after /newbot: ${reply}`);
    return null;
  }

  // Send bot display name
  await client.sendMessage('BotFather', { message: botDef.name });
  await sleep(2000);

  // Try usernames with random digits if taken
  let attempt = 0;
  let token = null;
  let finalUsername = null;

  while (attempt < 5 && !token) {
    const candidate = attempt === 0
      ? botDef.baseUsername
      : botDef.baseUsername.replace(/_Bot$/i, `_${Math.floor(100 + Math.random() * 900)}_bot`);

    console.log(`Trying username: @${candidate}...`);
    await client.sendMessage('BotFather', { message: candidate });
    await sleep(2500);

    reply = await getLastBotFatherMessage(client);

    const tokenMatch = reply.match(/\b\d{8,11}:[A-Za-z0-9_-]{35}\b/);
    if (tokenMatch) {
      token = tokenMatch[0];
      finalUsername = candidate;
      console.log(`🎉 SUCCESS! Bot Created: @${finalUsername} | Token: ${token.slice(0, 10)}...`);
      break;
    } else if (reply.includes('already taken') || reply.includes('occupied')) {
      console.log(`Username @${candidate} is taken. Retrying with variation...`);
      attempt++;
    } else if (reply.includes('too many bots')) {
      console.error('❌ BotFather limit reached: Too many bots on this account.');
      return null;
    } else {
      console.warn(`BotFather response: ${reply}`);
      attempt++;
    }
  }

  if (token && finalUsername) {
    return {
      name: botDef.name,
      username: finalUsername,
      token,
      categories: botDef.categories,
    };
  }

  return null;
}

async function main() {
  const sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
  const client = new TelegramClient(new StringSession(sessionString), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('✅ Connected to Telegram as user.');

  let botConfig = {};
  if (fs.existsSync(BOTS_CONFIG_FILE)) {
    try {
      botConfig = JSON.parse(fs.readFileSync(BOTS_CONFIG_FILE, 'utf8'));
    } catch (_) {}
  }

  for (const botDef of CATEGORIES) {
    if (botConfig[botDef.key]?.token) {
      console.log(`ℹ️ Bot for [${botDef.key}] already configured: @${botConfig[botDef.key].username}`);
      continue;
    }

    const created = await createBotViaBotFather(client, botDef);
    if (created) {
      botConfig[botDef.key] = created;
      fs.writeFileSync(BOTS_CONFIG_FILE, JSON.stringify(botConfig, null, 2), 'utf8');
      console.log(`Saved @${created.username} config.`);
      await sleep(3000); // Flood prevention
    }
  }

  console.log('\n=====================================================');
  console.log('🎉 Category Bots configuration complete!');
  console.log(`Saved to: ${BOTS_CONFIG_FILE}`);
  console.log('=====================================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error in bot setup:', err);
  process.exit(1);
});
