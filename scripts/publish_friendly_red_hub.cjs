const fs = require('fs');
const path = require('path');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const API_ID = 34834024;
const API_HASH = 'a19dcd8389bf1da64949e97fbcd5064c';
const CONFIG_DIR = path.resolve(__dirname, '../server/config');
const SESSION_FILE = path.join(CONFIG_DIR, 'telegram_session.txt');
const MAIN_CHANNEL_FILE = path.join(CONFIG_DIR, 'main_channel.json');
const NETWORK_CONFIG_FILE = path.join(CONFIG_DIR, 'channel_network.json');
const BANNER_PATH = path.resolve(__dirname, '../server/data/cinema_hub_banner.png');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function publishFriendlyRedHub() {
  console.log('🚀 Connecting to Telegram...');
  const sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
  const client = new TelegramClient(new StringSession(sessionString), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('✅ Connected!');

  const mainData = JSON.parse(fs.readFileSync(MAIN_CHANNEL_FILE, 'utf8'));
  const networkConfig = JSON.parse(fs.readFileSync(NETWORK_CONFIG_FILE, 'utf8'));

  const inputPeer = new Api.InputPeerChannel({
    channelId: BigInt(mainData.channelId),
    accessHash: BigInt(mainData.accessHash),
  });

  // Short clean t.me link helper (fits mobile screens in 1 line)
  const getShortLink = (id) => {
    const raw = networkConfig[id]?.inviteLink || '';
    return raw.replace(/^https?:\/\//, '');
  };

  const getFullLink = (id) => networkConfig[id]?.inviteLink || 'https://t.me/+fI8emnNxP7A4NDM1';

  // 1. Wipe existing messages for a clean look
  console.log('🧹 Clearing channel for clean publishing...');
  const wipeIds = [];
  for (let i = 1; i <= 60; i++) wipeIds.push(i);
  try {
    await client.deleteMessages(inputPeer, wipeIds, { revoke: true });
  } catch (_) {}

  await sleep(1000);

  // 2. Message 1: Red Visual Banner + Friendly Intro
  console.log('📤 Sending Red Themed Visual Banner...');
  const bannerCaption = `🔴 <b>CINEMA OFFICIAL CHANNELS</b> 🔴

<blockquote>
<b>Bina Ads aur Popups ke Movies Dekho &amp; Download Karo</b>
Sabhi websites ke alag-alag channels bana diye hain taaki aapko direct fast links mile bina kisi wait ke.
</blockquote>`;

  await client.sendFile(inputPeer, {
    file: BANNER_PATH,
    caption: bannerCaption,
    parseMode: 'html',
  });

  await sleep(1500);

  // 3. Message 2: Mobile-Optimized Directory (Single line per link, friendly names)
  console.log('📤 Sending Mobile-Friendly Channel Directory...');

  const directoryMessage = `🔴 <b>ALL MOVIE &amp; SERIES CHANNELS</b>
━━━━━━━━━━━━━━━━━━━━

<blockquote>
Apni pasand ke channel link par tap karke join kar lo 👇
</blockquote>

🔴 <b>4K ULTRA HD MOVIES</b> (Bot: @Cinema4K_Ultra_813_bot)
• <b>4K HDHub:</b> ${getShortLink('4khdhub')}
• <b>UHDMovies:</b> ${getShortLink('uhdmovies')}
• <b>CinemaLuxe:</b> ${getShortLink('cinemaluxe')}

🔴 <b>CINEMAWOOD (BOLLYWOOD &amp; SOUTH)</b> (Bot: @CinemaBollywood_Ultra_bot)
• <b>HDHub4u:</b> ${getShortLink('hdhub4u')}
• <b>VegaMovies:</b> ${getShortLink('vega')}
• <b>MoviesMod:</b> ${getShortLink('moviesmod')}
• <b>MoviesDrive:</b> ${getShortLink('drive')}
• <b>KatMovies:</b> ${getShortLink('katmoviehd')}
• <b>TopMovies:</b> ${getShortLink('topmovies')}
• <b>Bollyflix:</b> ${getShortLink('bollyflix')}
• <b>MoviesFlix:</b> ${getShortLink('moviesflix')}
• <b>ExtraMovies:</b> ${getShortLink('extramovies')}
• <b>World4uFree:</b> ${getShortLink('world4ufree')}
• <b>SkyMovies:</b> ${getShortLink('skymovieshd')}
• <b>FilmyFly:</b> ${getShortLink('filmyfly')}
• <b>Cinevood:</b> ${getShortLink('cinevood')}
• <b>LuxMovies:</b> ${getShortLink('luxmovies')}
• <b>EonMovies:</b> ${getShortLink('eonmovies')}
• <b>MovieZwap:</b> ${getShortLink('moviezwap')}
• <b>Zeefliz:</b> ${getShortLink('zeefliz')}
• <b>Movies4u:</b> ${getShortLink('movies4u')}

🔴 <b>HOLLYWOOD &amp; WEB SERIES</b> (Bot: @CinemaOTT_Series_Bot)
• <b>MovieBox:</b> ${getShortLink('movieBoxWeb')}
• <b>MultiMovies:</b> ${getShortLink('multimovies')}
• <b>GokuHD:</b> ${getShortLink('gokuhd')}
• <b>Showbox:</b> ${getShortLink('showbox')}
• <b>RidoMovies:</b> ${getShortLink('ridomovies')}
• <b>FlixHQ:</b> ${getShortLink('flixhq')}
• <b>ProtonMovies:</b> ${getShortLink('protonmovies')}

🔴 <b>ANIME &amp; ASIAN DRAMA</b> (Bot: @CinemaAnime_Ultra_bot)
• <b>HiAnime:</b> ${getShortLink('hianime')}
• <b>GogoAnime:</b> ${getShortLink('gogoanime')}
• <b>AnimeRulz:</b> ${getShortLink('animerulz')}
• <b>AnimeWorld:</b> ${getShortLink('animeworld')}
• <b>Anikoto:</b> ${getShortLink('anikoto')}
• <b>KissKH (K-Drama):</b> ${getShortLink('kisskh')}
• <b>DramaCool:</b> ${getShortLink('dramacool')}

🔴 <b>TORRENT CHANNELS</b> (Bot: @cinemaisherebtw_bot)
• <b>YTS Movies:</b> ${getShortLink('yts')}
• <b>1337x:</b> ${getShortLink('1337x')}
• <b>ThePirateBay:</b> ${getShortLink('thepiratebay')}

━━━━━━━━━━━━━━━━━━━━
🌐 <b>Direct Website:</b> https://cinema-dwh.pages.dev`;

  // Clean, big mobile thumb tap buttons for main channels
  const mobileButtons = [
    [
      client.buildReplyMarkup({ text: '🔴 4K HDHub', url: getFullLink('4khdhub') }),
      client.buildReplyMarkup({ text: '🔴 UHDMovies', url: getFullLink('uhdmovies') }),
    ],
    [
      client.buildReplyMarkup({ text: '🔴 HDHub4u', url: getFullLink('hdhub4u') }),
      client.buildReplyMarkup({ text: '🔴 VegaMovies', url: getFullLink('vega') }),
    ],
    [
      client.buildReplyMarkup({ text: '🔴 MoviesMod', url: getFullLink('moviesmod') }),
      client.buildReplyMarkup({ text: '🔴 MoviesDrive', url: getFullLink('drive') }),
    ],
    [
      client.buildReplyMarkup({ text: '🔴 KatMovies', url: getFullLink('katmoviehd') }),
      client.buildReplyMarkup({ text: '🔴 MovieBox', url: getFullLink('movieBoxWeb') }),
    ],
    [
      client.buildReplyMarkup({ text: '🔴 HiAnime', url: getFullLink('hianime') }),
      client.buildReplyMarkup({ text: '🔴 KissKH', url: getFullLink('kisskh') }),
    ],
    [
      client.buildReplyMarkup({ text: '🔴 YTS Torrents', url: getFullLink('yts') }),
      client.buildReplyMarkup({ text: '🌐 Web Player', url: 'https://cinema-dwh.pages.dev' }),
    ],
  ];

  await client.sendMessage(inputPeer, {
    message: directoryMessage,
    parseMode: 'html',
    buttons: mobileButtons,
    linkPreview: false,
  });

  await sleep(1500);

  // 4. Message 3: Simple & Friendly How-to-Watch Guide
  console.log('📤 Sending Simple How-To-Watch Guide...');
  const friendlyGuide = `🔴 <b>HOW TO PLAY MOVIES WITHOUT BUFFERING</b>
━━━━━━━━━━━━━━━━━━━━

<blockquote>
Bina ruke aur bina kisi ad ke dekhne ke liye sabse best tarika:
</blockquote>

📱 <b>Phone me kaise dekhein (Android &amp; iPhone):</b>
1. Play Store ya App Store se <b>VLC Player</b> download kar lo.
2. Channel me kisi bhi movie ke <b>Stream &amp; Download</b> par tap karo.
3. Apni pasand ki quality chuno (720p / 1080p / 4K).
4. <b>Open in VLC</b> select karo — movie turant play ho jayegi, jisme aap Hindi/English audio aur subtitles bhi change kar sakte ho!

💻 <b>Laptop ya PC me kaise dekhein:</b>
• VLC Player kholo ➔ <code>Ctrl + N</code> dabao ➔ link paste karo aur bina download kiye dekho!
• Ya direct browser me https://cinema-dwh.pages.dev khol kar dekho.

━━━━━━━━━━━━━━━━━━━━
❤️ <i>Apne friends ke sath bhi share karo taaki sab free me movies dekh sakein!</i>`;

  await client.sendMessage(inputPeer, {
    message: friendlyGuide,
    parseMode: 'html',
    linkPreview: false,
  });

  console.log('\n======================================================');
  console.log('🎉 MOBILE-FRIENDLY RED THEMED HUB PUBLISHED SUCCESSFULLY!');
  console.log('======================================================\n');

  process.exit(0);
}

publishFriendlyRedHub().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
