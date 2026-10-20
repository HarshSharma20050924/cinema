const fs = require('fs');
const path = require('path');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const API_ID = 34834024;
const API_HASH = 'a19dcd8389bf1da64949e97fbcd5064c';
const CONFIG_DIR = path.resolve(__dirname, '../server/config');
const LOGO_DIR = path.resolve(__dirname, '../server/data/channel_logos');
const SESSION_FILE = path.join(CONFIG_DIR, 'telegram_session.txt');

const BOTS = [
  { username: 'CinemaBollywood_Ultra_bot', logo: 'bot_desi_logo.png', name: 'CinemaWood' },
  { username: 'CinemaOTT_Series_Bot', logo: 'bot_series_logo.png', name: 'Cinema OTT Series Bot' },
  { username: 'Cinema4K_Ultra_813_bot', logo: 'bot_4k_logo.png', name: 'Cinema 4K Bot' },
  { username: 'CinemaAnime_Ultra_bot', logo: 'bot_anime_logo.png', name: 'Cinema Anime Bot' },
  { username: 'cinemaisherebtw_bot', logo: 'bot_cinema_logo.png', name: 'Cinema Main Bot' },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function uploadBotAvatars() {
  const sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
  const client = new TelegramClient(new StringSession(sessionString), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('Connected to Telegram as user.');

  for (const bot of BOTS) {
    const logoPath = path.join(LOGO_DIR, bot.logo);
    if (!fs.existsSync(logoPath)) {
      console.warn(`File not found: ${logoPath}`);
      continue;
    }

    console.log(`\nSetting avatar for @${bot.username} (${bot.name})...`);

    // 1. Send /setuserpic to BotFather
    await client.sendMessage('BotFather', { message: '/setuserpic' });
    await sleep(2000);

    // 2. Send bot username
    await client.sendMessage('BotFather', { message: `@${bot.username}` });
    await sleep(2000);

    // 3. Send photo file
    await client.sendFile('BotFather', {
      file: logoPath,
      caption: '',
    });
    await sleep(3500);

    const msgs = await client.getMessages('BotFather', { limit: 1 });
    const reply = msgs[0]?.message || '';
    console.log(`BotFather response: ${reply.split('\n')[0]}`);
  }

  await client.disconnect();
  console.log('\n🎉 Finished updating all Bot Avatars!');
}

uploadBotAvatars().catch(console.error);
