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

async function publishRealLinksHub() {
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

  const getLink = (id) => networkConfig[id]?.inviteLink || '';

  // 1. Wipe existing messages in channel
  console.log('🧹 Clearing channel for clean publishing...');
  const wipeIds = [];
  for (let i = 1; i <= 50; i++) wipeIds.push(i);
  try {
    await client.deleteMessages(inputPeer, wipeIds, { revoke: true });
  } catch (_) {}

  await sleep(1000);

  // 2. Message 1: Widescreen Brand Banner
  console.log('📤 Sending Visual Banner...');
  const bannerCaption = `<b>C I N E M A   N E T W O R K</b>
<i>Official Global Directory &amp; Channel Index</i>

<blockquote>
<b>Decentralized Multi-Channel Architecture</b>
Direct cloud streaming across 38 dedicated channels. Find your category and join its direct feed below.
</blockquote>`;

  await client.sendFile(inputPeer, {
    file: BANNER_PATH,
    caption: bannerCaption,
    parseMode: 'html',
  });

  await sleep(1500);

  // 3. Message 2: Master Directory with Explicit REAL Links for ALL 38 Channels
  console.log('📤 Sending Directory with explicit REAL channel links...');

  const directoryMessage = `<b>C I N E M A   C H A N N E L   D I R E C T O R Y</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━

<blockquote>
Tap any direct channel link below to join its dedicated instant feed.
</blockquote>

<b>4K UHD &amp; HIGH BITRATE</b>
• <b>Cinema 4K HDHub</b> ➔ ${getLink('4khdhub')}
• <b>Cinema UHDMovies</b> ➔ ${getLink('uhdmovies')}
• <b>Cinema CinemaLuxe</b> ➔ ${getLink('cinemaluxe')}

<b>BOLLYWOOD &amp; SOUTH DUAL AUDIO</b>
• <b>Cinema HDHub4u</b> ➔ ${getLink('hdhub4u')}
• <b>Cinema VegaMovies</b> ➔ ${getLink('vega')}
• <b>Cinema MoviesMod</b> ➔ ${getLink('moviesmod')}
• <b>Cinema MoviesDrive</b> ➔ ${getLink('drive')}
• <b>Cinema KatMovies</b> ➔ ${getLink('katmoviehd')}
• <b>Cinema TopMovies</b> ➔ ${getLink('topmovies')}
• <b>Cinema Bollyflix</b> ➔ ${getLink('bollyflix')}
• <b>Cinema MoviesFlix</b> ➔ ${getLink('moviesflix')}
• <b>Cinema ExtraMovies</b> ➔ ${getLink('extramovies')}
• <b>Cinema World4uFree</b> ➔ ${getLink('world4ufree')}
• <b>Cinema SkyMovies</b> ➔ ${getLink('skymovieshd')}
• <b>Cinema FilmyFly</b> ➔ ${getLink('filmyfly')}
• <b>Cinema Cinevood</b> ➔ ${getLink('cinevood')}
• <b>Cinema LuxMovies</b> ➔ ${getLink('luxmovies')}
• <b>Cinema EonMovies</b> ➔ ${getLink('eonmovies')}
• <b>Cinema MovieZwap</b> ➔ ${getLink('moviezwap')}
• <b>Cinema Zeefliz</b> ➔ ${getLink('zeefliz')}
• <b>Cinema Movies4u</b> ➔ ${getLink('movies4u')}

<b>WEB SERIES &amp; OTT (HOLLYWOOD)</b>
• <b>Cinema MovieBox</b> ➔ ${getLink('movieBoxWeb')}
• <b>Cinema MultiMovies</b> ➔ ${getLink('multimovies')}
• <b>Cinema GokuHD</b> ➔ ${getLink('gokuhd')}
• <b>Cinema Showbox</b> ➔ ${getLink('showbox')}
• <b>Cinema RidoMovies</b> ➔ ${getLink('ridomovies')}
• <b>Cinema FlixHQ</b> ➔ ${getLink('flixhq')}
• <b>Cinema ProtonMovies</b> ➔ ${getLink('protonmovies')}

<b>ANIME &amp; ASIAN DRAMA</b>
• <b>Cinema HiAnime</b> ➔ ${getLink('hianime')}
• <b>Cinema GogoAnime</b> ➔ ${getLink('gogoanime')}
• <b>Cinema AnimeRulz</b> ➔ ${getLink('animerulz')}
• <b>Cinema AnimeWorld</b> ➔ ${getLink('animeworld')}
• <b>Cinema Anikoto</b> ➔ ${getLink('anikoto')}
• <b>Cinema KissKH (Drama)</b> ➔ ${getLink('kisskh')}
• <b>Cinema DramaCool</b> ➔ ${getLink('dramacool')}

<b>TORRENTS &amp; P2P ARCHIVES</b>
• <b>Cinema YTS</b> ➔ ${getLink('yts')}
• <b>Cinema 1337x</b> ➔ ${getLink('1337x')}
• <b>Cinema PirateBay</b> ➔ ${getLink('thepiratebay')}

━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 <b>Official Web Player:</b> https://cinema-dwh.pages.dev`;

  // Inline Quick-Access Buttons for popular feeds
  const inlineButtons = [
    [
      client.buildReplyMarkup({ text: 'Cinema 4K HDHub', url: getLink('4khdhub') }),
      client.buildReplyMarkup({ text: 'Cinema UHDMovies', url: getLink('uhdmovies') }),
    ],
    [
      client.buildReplyMarkup({ text: 'Cinema HDHub4u', url: getLink('hdhub4u') }),
      client.buildReplyMarkup({ text: 'Cinema Vega', url: getLink('vega') }),
    ],
    [
      client.buildReplyMarkup({ text: 'Cinema MoviesMod', url: getLink('moviesmod') }),
      client.buildReplyMarkup({ text: 'Cinema Drive', url: getLink('drive') }),
    ],
    [
      client.buildReplyMarkup({ text: 'Cinema KatMovies', url: getLink('katmoviehd') }),
      client.buildReplyMarkup({ text: 'Cinema MovieBox', url: getLink('movieBoxWeb') }),
    ],
    [
      client.buildReplyMarkup({ text: 'Cinema HiAnime', url: getLink('hianime') }),
      client.buildReplyMarkup({ text: 'Cinema KissKH', url: getLink('kisskh') }),
    ],
    [
      client.buildReplyMarkup({ text: 'Cinema YTS', url: getLink('yts') }),
      client.buildReplyMarkup({ text: 'Web Player ↗', url: 'https://cinema-dwh.pages.dev' }),
    ],
  ];

  await client.sendMessage(inputPeer, {
    message: directoryMessage,
    parseMode: 'html',
    buttons: inlineButtons,
    linkPreview: false,
  });

  await sleep(2000);

  // 4. Message 3: Streaming Guide & Player Tutorial
  console.log('📤 Sending Streaming Guide...');
  const guideText = `<b>P L A Y E R   G U I D E   &amp;   S T R E A M I N G</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━

<blockquote>
<b>Recommended Native Media Players</b>
For zero buffering, high bitrate and multi-audio support, stream directly in native players.
</blockquote>

<b>1 · Mobile Playback (Android &amp; iOS)</b>
• Android: Install <b>VLC for Android</b> or <b>Next Player</b> from Google Play.
• iOS: Install <b>VLC for Mobile</b> from the App Store.
• Tap <b>Stream &amp; Download</b> in any movie card ➔ Select resolution ➔ Tap <b>Open in VLC</b> for immediate playback with switchable audio tracks and subtitles.

<b>2 · PC &amp; Laptop Playback (Windows / macOS / Linux)</b>
• <b>VLC Player:</b> Press <code>Ctrl + N</code> (Windows) or <code>Cmd + N</code> (Mac) ➔ Paste direct stream link ➔ Stream immediately.
• <b>Web Player:</b> Open https://cinema-dwh.pages.dev for instant native browser playback.

<b>3 · Local Gigabit Runner (Zero Throttling)</b>
• Run the Cinema Desktop Runner on your PC to unlock direct local gigabit routing and bypass any third-party rate limits.

<blockquote>
<b>Notice &amp; Disclaimer</b>
Cinema Network operates as a decentralized search index &amp; protocol bridge. No proprietary media files are hosted on our infrastructure. All streams are referenced from publicly accessible third-party protocols.
</blockquote>`;

  await client.sendMessage(inputPeer, {
    message: guideText,
    parseMode: 'html',
    linkPreview: false,
  });

  console.log('\n======================================================');
  console.log('🎉 DIRECTORY UPDATED WITH REAL VISIBLE CHANNEL LINKS FOR ALL 38 CHANNELS!');
  console.log('======================================================\n');

  process.exit(0);
}

publishRealLinksHub().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
