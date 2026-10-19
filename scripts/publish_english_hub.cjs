const fs = require('fs');
const path = require('path');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { sanitizeParseMode } = require('telegram/Utils');

const API_ID = 34834024;
const API_HASH = 'a19dcd8389bf1da64949e97fbcd5064c';
const CONFIG_DIR = path.resolve(__dirname, '../server/config');
const SESSION_FILE = path.join(CONFIG_DIR, 'telegram_session.txt');
const MAIN_CHANNEL_FILE = path.join(CONFIG_DIR, 'main_channel.json');
const NETWORK_CONFIG_FILE = path.join(CONFIG_DIR, 'channel_network.json');
const BANNER_PATH = path.resolve(__dirname, '../server/data/cinema_hub_banner.png');

const parser = sanitizeParseMode('html');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function publishCleanClickableHub() {
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

  const getLink = (id) => networkConfig[id]?.inviteLink || 'https://t.me/+fI8emnNxP7A4NDM1';

  // 1. Wipe existing messages in channel
  console.log('🧹 Clearing channel messages for pristine setup...');
  const wipeIds = [];
  for (let i = 1; i <= 60; i++) wipeIds.push(i);
  try {
    await client.deleteMessages(inputPeer, wipeIds, { revoke: true });
  } catch (_) {}

  await sleep(1000);

  // 2. Message 1: Widescreen Visual Banner + Intro
  console.log('📤 Sending Visual Banner...');
  const bannerCaptionHtml = `<b>CINEMA NETWORK</b>
<i>Official Directory &amp; Release Channels</i>

<blockquote>
<b>Fast, Direct &amp; Ad-Free Streaming</b>
Every provider now has its own dedicated channel. Choose your favorite category below and get instant release updates with direct download links.
</blockquote>`;

  const [bText, bEntities] = parser.parse(bannerCaptionHtml);

  await client.sendFile(inputPeer, {
    file: BANNER_PATH,
    caption: bText,
    formattingEntities: bEntities,
    parseMode: false,
  });

  await sleep(1500);

  // 3. Message 2: Clickable Directory
  console.log('📤 Sending Directory with 100% REAL CLICKABLE LINKS...');

  const directoryHtml = `<b>OFFICIAL CHANNEL DIRECTORY</b>
━━━━━━━━━━━━━━━━━━━━

<blockquote>
Tap any channel below or use <b>[Join Channel]</b> to enter its direct feed.
</blockquote>

<b>4K &amp; ULTRA HD MOVIES</b>
• <a href="${getLink('4khdhub')}"><b>4K HDHub</b></a> ➔ <a href="${getLink('4khdhub')}">[Join Channel]</a>
• <a href="${getLink('uhdmovies')}"><b>UHDMovies</b></a> ➔ <a href="${getLink('uhdmovies')}">[Join Channel]</a>
• <a href="${getLink('cinemaluxe')}"><b>CinemaLuxe</b></a> ➔ <a href="${getLink('cinemaluxe')}">[Join Channel]</a>

<b>BOLLYWOOD &amp; SOUTH (HINDI DUBBED)</b>
• <a href="${getLink('hdhub4u')}"><b>HDHub4u</b></a> ➔ <a href="${getLink('hdhub4u')}">[Join Channel]</a>
• <a href="${getLink('vega')}"><b>VegaMovies</b></a> ➔ <a href="${getLink('vega')}">[Join Channel]</a>
• <a href="${getLink('moviesmod')}"><b>MoviesMod</b></a> ➔ <a href="${getLink('moviesmod')}">[Join Channel]</a>
• <a href="${getLink('drive')}"><b>MoviesDrive</b></a> ➔ <a href="${getLink('drive')}">[Join Channel]</a>
• <a href="${getLink('katmoviehd')}"><b>KatMovies</b></a> ➔ <a href="${getLink('katmoviehd')}">[Join Channel]</a>
• <a href="${getLink('topmovies')}"><b>TopMovies</b></a> ➔ <a href="${getLink('topmovies')}">[Join Channel]</a>
• <a href="${getLink('bollyflix')}"><b>Bollyflix</b></a> ➔ <a href="${getLink('bollyflix')}">[Join Channel]</a>
• <a href="${getLink('moviesflix')}"><b>MoviesFlix</b></a> ➔ <a href="${getLink('moviesflix')}">[Join Channel]</a>
• <a href="${getLink('extramovies')}"><b>ExtraMovies</b></a> ➔ <a href="${getLink('extramovies')}">[Join Channel]</a>
• <a href="${getLink('world4ufree')}"><b>World4uFree</b></a> ➔ <a href="${getLink('world4ufree')}">[Join Channel]</a>
• <a href="${getLink('skymovieshd')}"><b>SkyMovies</b></a> ➔ <a href="${getLink('skymovieshd')}">[Join Channel]</a>
• <a href="${getLink('filmyfly')}"><b>FilmyFly</b></a> ➔ <a href="${getLink('filmyfly')}">[Join Channel]</a>
• <a href="${getLink('cinevood')}"><b>Cinevood</b></a> ➔ <a href="${getLink('cinevood')}">[Join Channel]</a>
• <a href="${getLink('luxmovies')}"><b>LuxMovies</b></a> ➔ <a href="${getLink('luxmovies')}">[Join Channel]</a>
• <a href="${getLink('eonmovies')}"><b>EonMovies</b></a> ➔ <a href="${getLink('eonmovies')}">[Join Channel]</a>
• <a href="${getLink('moviezwap')}"><b>MovieZwap</b></a> ➔ <a href="${getLink('moviezwap')}">[Join Channel]</a>
• <a href="${getLink('zeefliz')}"><b>Zeefliz</b></a> ➔ <a href="${getLink('zeefliz')}">[Join Channel]</a>
• <a href="${getLink('movies4u')}"><b>Movies4u</b></a> ➔ <a href="${getLink('movies4u')}">[Join Channel]</a>

<b>HOLLYWOOD &amp; WEB SERIES</b>
• <a href="${getLink('movieBoxWeb')}"><b>MovieBox</b></a> ➔ <a href="${getLink('movieBoxWeb')}">[Join Channel]</a>
• <a href="${getLink('multimovies')}"><b>MultiMovies</b></a> ➔ <a href="${getLink('multimovies')}">[Join Channel]</a>
• <a href="${getLink('gokuhd')}"><b>GokuHD</b></a> ➔ <a href="${getLink('gokuhd')}">[Join Channel]</a>
• <a href="${getLink('showbox')}"><b>Showbox</b></a> ➔ <a href="${getLink('showbox')}">[Join Channel]</a>
• <a href="${getLink('ridomovies')}"><b>RidoMovies</b></a> ➔ <a href="${getLink('ridomovies')}">[Join Channel]</a>
• <a href="${getLink('flixhq')}"><b>FlixHQ</b></a> ➔ <a href="${getLink('flixhq')}">[Join Channel]</a>
• <a href="${getLink('protonmovies')}"><b>ProtonMovies</b></a> ➔ <a href="${getLink('protonmovies')}">[Join Channel]</a>

<b>ANIME &amp; ASIAN DRAMA</b>
• <a href="${getLink('hianime')}"><b>HiAnime</b></a> ➔ <a href="${getLink('hianime')}">[Join Channel]</a>
• <a href="${getLink('gogoanime')}"><b>GogoAnime</b></a> ➔ <a href="${getLink('gogoanime')}">[Join Channel]</a>
• <a href="${getLink('animerulz')}"><b>AnimeRulz</b></a> ➔ <a href="${getLink('animerulz')}">[Join Channel]</a>
• <a href="${getLink('animeworld')}"><b>AnimeWorld</b></a> ➔ <a href="${getLink('animeworld')}">[Join Channel]</a>
• <a href="${getLink('anikoto')}"><b>Anikoto</b></a> ➔ <a href="${getLink('anikoto')}">[Join Channel]</a>
• <a href="${getLink('kisskh')}"><b>KissKH (K-Drama)</b></a> ➔ <a href="${getLink('kisskh')}">[Join Channel]</a>
• <a href="${getLink('dramacool')}"><b>DramaCool</b></a> ➔ <a href="${getLink('dramacool')}">[Join Channel]</a>

<b>TORRENTS &amp; ARCHIVES</b>
• <a href="${getLink('yts')}"><b>YTS Movies</b></a> ➔ <a href="${getLink('yts')}">[Join Channel]</a>
• <a href="${getLink('1337x')}"><b>1337x</b></a> ➔ <a href="${getLink('1337x')}">[Join Channel]</a>
• <a href="${getLink('thepiratebay')}"><b>ThePirateBay</b></a> ➔ <a href="${getLink('thepiratebay')}">[Join Channel]</a>

━━━━━━━━━━━━━━━━━━━━
<b>Web Player:</b> <a href="https://cinema-dwh.pages.dev">cinema-dwh.pages.dev</a>`;

  const [dirText, dirEntities] = parser.parse(directoryHtml);

  // Clean thumb buttons for quick access
  const buttons = [
    [
      client.buildReplyMarkup({ text: '4K HDHub', url: getLink('4khdhub') }),
      client.buildReplyMarkup({ text: 'UHDMovies', url: getLink('uhdmovies') }),
    ],
    [
      client.buildReplyMarkup({ text: 'HDHub4u', url: getLink('hdhub4u') }),
      client.buildReplyMarkup({ text: 'VegaMovies', url: getLink('vega') }),
    ],
    [
      client.buildReplyMarkup({ text: 'MoviesMod', url: getLink('moviesmod') }),
      client.buildReplyMarkup({ text: 'MoviesDrive', url: getLink('drive') }),
    ],
    [
      client.buildReplyMarkup({ text: 'KatMovies', url: getLink('katmoviehd') }),
      client.buildReplyMarkup({ text: 'MovieBox', url: getLink('movieBoxWeb') }),
    ],
    [
      client.buildReplyMarkup({ text: 'HiAnime', url: getLink('hianime') }),
      client.buildReplyMarkup({ text: 'KissKH', url: getLink('kisskh') }),
    ],
    [
      client.buildReplyMarkup({ text: 'YTS Torrents', url: getLink('yts') }),
      client.buildReplyMarkup({ text: 'Web Player ↗', url: 'https://cinema-dwh.pages.dev' }),
    ],
  ];

  await client.sendMessage(inputPeer, {
    message: dirText,
    formattingEntities: dirEntities,
    parseMode: false,
    buttons,
    linkPreview: false,
  });

  await sleep(1500);

  // 4. Message 3: Playback Guide
  console.log('📤 Sending Streaming Guide...');
  const guideHtml = `<b>HOW TO WATCH WITHOUT BUFFERING</b>
━━━━━━━━━━━━━━━━━━━━

<blockquote>
For the best streaming experience with dual audio and subtitles:
</blockquote>

<b>On Mobile (Android &amp; iOS):</b>
1. Install <b>VLC Player</b> from Google Play or App Store.
2. In any channel post, tap <b>Stream &amp; Download</b>.
3. Select your preferred quality (720p, 1080p, or 4K).
4. Tap <b>Open in VLC</b> — the video plays immediately. You can switch audio tracks (Hindi / English) and turn on subtitles anytime.

<b>On PC &amp; Laptop:</b>
• Open VLC ➔ Press <code>Ctrl + N</code> (or <code>Cmd + N</code> on Mac) ➔ Paste the link and watch instantly.
• Or watch directly in your browser at <a href="https://cinema-dwh.pages.dev">cinema-dwh.pages.dev</a>.

━━━━━━━━━━━━━━━━━━━━
<i>Share Cinema with your friends for fast, ad-free streaming!</i>`;

  const [gText, gEntities] = parser.parse(guideHtml);

  await client.sendMessage(inputPeer, {
    message: gText,
    formattingEntities: gEntities,
    parseMode: false,
    linkPreview: false,
  });

  console.log('\n======================================================');
  console.log('🎉 100% BLUE CLICKABLE HYPERLINKS PUBLISHED SUCCESSFULLY!');
  console.log('======================================================\n');

  process.exit(0);
}

publishCleanClickableHub().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
