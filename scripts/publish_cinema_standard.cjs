const fs = require('fs');
const path = require('path');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { CustomFile } = require('telegram/client/uploads');

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

async function publishStandardHub() {
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

  // 1. Clean existing messages in channel first
  console.log('🧹 Clearing channel messages for pristine setup...');
  const wipeIds = [];
  for (let i = 1; i <= 30; i++) wipeIds.push(i);
  try {
    await client.deleteMessages(inputPeer, wipeIds, { revoke: true });
  } catch (_) {}

  // 2. Prepare Message 1: Visual Header + Master Directory
  console.log('🎨 Preparing Visual Header & Master Directory...');

  const directoryCaption = `<b>C I N E M A   N E T W O R K</b>
<i>Official Directory &amp; Channel Index</i>

<blockquote>
<b>Decentralized Multi-Channel Architecture</b>
Direct gigabit cloud streaming (Cloudflare R2, Google CDN, FastDL) across 38 dedicated channels. Zero popups, zero redirects, zero clutter.
</blockquote>

<b>DIRECTORY OVERVIEW</b>
Each provider operates as an isolated high-speed feed. Select any feed below to join directly:

<b>• 4K UHD &amp; REMUX</b>
├ <code>4K HDHub</code> — <a href="${getLink('4khdhub')}">Join Feed</a>
├ <code>UHDMovies</code> — <a href="${getLink('uhdmovies')}">Join Feed</a>
└ <code>CinemaLuxe</code> — <a href="${getLink('cinemaluxe')}">Join Feed</a>

<b>• BOLLYWOOD &amp; SOUTH DUAL AUDIO</b>
├ <code>HDHub4u</code> — <a href="${getLink('hdhub4u')}">Join Feed</a>
├ <code>VegaMovies</code> — <a href="${getLink('vega')}">Join Feed</a>
├ <code>MoviesMod</code> — <a href="${getLink('moviesmod')}">Join Feed</a>
├ <code>MoviesDrive</code> — <a href="${getLink('drive')}">Join Feed</a>
├ <code>KatMovies</code> — <a href="${getLink('katmoviehd')}">Join Feed</a>
├ <code>TopMovies</code> — <a href="${getLink('topmovies')}">Join Feed</a>
├ <code>Bollyflix</code> — <a href="${getLink('bollyflix')}">Join Feed</a>
├ <code>MoviesFlix</code> — <a href="${getLink('moviesflix')}">Join Feed</a>
├ <code>ExtraMovies</code> — <a href="${getLink('extramovies')}">Join Feed</a>
├ <code>SkyMovies</code> — <a href="${getLink('skymovieshd')}">Join Feed</a>
└ <code>Cinevood</code> — <a href="${getLink('cinevood')}">Join Feed</a>

<b>• WEB SERIES &amp; OTT</b>
├ <code>MovieBox</code> — <a href="${getLink('movieBoxWeb')}">Join Feed</a>
├ <code>MultiMovies</code> — <a href="${getLink('multimovies')}">Join Feed</a>
├ <code>GokuHD</code> — <a href="${getLink('gokuhd')}">Join Feed</a>
├ <code>Showbox</code> — <a href="${getLink('showbox')}">Join Feed</a>
├ <code>FlixHQ</code> — <a href="${getLink('flixhq')}">Join Feed</a>
└ <code>RidoMovies</code> — <a href="${getLink('ridomovies')}">Join Feed</a>

<b>• ANIME &amp; ASIAN DRAMA</b>
├ <code>HiAnime</code> — <a href="${getLink('hianime')}">Join Feed</a>
├ <code>GogoAnime</code> — <a href="${getLink('gogoanime')}">Join Feed</a>
├ <code>AnimeRulz</code> — <a href="${getLink('animerulz')}">Join Feed</a>
├ <code>KissKH</code> — <a href="${getLink('kisskh')}">Join Feed</a>
└ <code>DramaCool</code> — <a href="${getLink('dramacool')}">Join Feed</a>

<b>• TORRENTS &amp; P2P ARCHIVES</b>
├ <code>YTS</code> — <a href="${getLink('yts')}">Join Feed</a>
├ <code>1337x</code> — <a href="${getLink('1337x')}">Join Feed</a>
└ <code>PirateBay</code> — <a href="${getLink('thepiratebay')}">Join Feed</a>

<blockquote>
<b>Web Portal:</b> <a href="https://cinema-dwh.pages.dev">cinema-dwh.pages.dev</a>
Direct browser streaming with no third-party installations.
</blockquote>`;

  const bannerCaption = `<b>C I N E M A   N E T W O R K</b>
<i>Official Global Directory &amp; Release Index</i>

<blockquote>
<b>Decentralized Multi-Channel Architecture</b>
Direct gigabit cloud streaming (Cloudflare R2, Google CDN, FastDL) across 38 dedicated feeds. Zero popups, zero redirects, zero clutter.
</blockquote>`;

  console.log('📤 Sending Banner Header...');
  await client.sendFile(inputPeer, {
    file: BANNER_PATH,
    caption: bannerCaption,
    parseMode: 'html',
  });

  await sleep(1500);

  console.log('📤 Sending Master Directory with Inline Keyboard...');
  const inlineKeyboard = [
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
      client.buildReplyMarkup({ text: 'KissKH (Drama)', url: getLink('kisskh') }),
    ],
    [
      client.buildReplyMarkup({ text: 'YTS (Torrents)', url: getLink('yts') }),
      client.buildReplyMarkup({ text: 'Web Portal ↗', url: 'https://cinema-dwh.pages.dev' }),
    ],
  ];

  await client.sendMessage(inputPeer, {
    message: directoryCaption,
    parseMode: 'html',
    buttons: inlineKeyboard,
    linkPreview: false,
  });

  await sleep(2500);

  // 3. Prepare Message 2: Player & Streaming Guide
  console.log('📤 Sending Technical Guide & Tutorials...');
  const guideText = `<b>P L A Y E R   G U I D E   &amp;   T U T O R I A L</b>
<i>Zero Buffering · Hardware Acceleration · Dual Audio</i>

<blockquote>
<b>Native Media Player Recommendation</b>
For optimal bitrate without cloud browser throttling, use hardware-accelerated media players.
</blockquote>

<b>1 · Mobile Playback (Android &amp; iOS)</b>
• Android: Install <b>VLC for Android</b> or <b>Next Player</b> from Google Play.
• iOS: Install <b>VLC for Mobile</b> from the App Store.
• Tap <b>Stream &amp; Download</b> on any post ➔ Choose quality ➔ Tap <b>Open in VLC</b> for immediate hardware-accelerated playback with switchable audio tracks and subtitles.

<b>2 · PC &amp; Laptop Playback</b>
• <b>VLC Player:</b> Press <code>Ctrl + N</code> (Windows) or <code>Cmd + N</code> (Mac) ➔ Paste direct stream URL ➔ Stream immediately.
• <b>Direct Browser:</b> Open <a href="https://cinema-dwh.pages.dev">cinema-dwh.pages.dev</a> for native HTML5 video player.

<b>3 · Local Gigabit Runner (Zero Throttling)</b>
• Running the standalone Cinema Node Runner on your PC unlocks <b>direct local gigabit routing</b> and bypasses all external Cloudflare or IP rate limits.

<blockquote>
<b>Notice &amp; Disclaimer</b>
Cinema operates as a decentralized search index &amp; protocol bridge. No proprietary media files are hosted on our infrastructure. All streams are referenced from publicly accessible third-party protocols.
</blockquote>`;

  await client.sendMessage(inputPeer, {
    message: guideText,
    parseMode: 'html',
    linkPreview: false,
  });

  console.log('\n======================================================');
  console.log('🎉 CINEMA HUB MASTER POST PUBLISHED WITH HIGH-END BRANDING!');
  console.log(`Channel Link: ${mainData.inviteLink}`);
  console.log('======================================================\n');

  process.exit(0);
}

publishStandardHub().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
