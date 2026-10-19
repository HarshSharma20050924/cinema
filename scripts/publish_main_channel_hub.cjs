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

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function publishHub() {
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

  // Try setting photo if not set
  const logoPath = path.resolve(__dirname, '../public/logo.png');
  if (fs.existsSync(logoPath) && !mainData.logoSet) {
    try {
      console.log('🎨 Attempting logo upload for main channel...');
      const toUpload = await client.uploadFile({
        file: new CustomFile('logo.png', fs.statSync(logoPath).size, logoPath),
        workers: 1,
      });
      await client.invoke(
        new Api.channels.EditPhoto({
          channel: inputPeer,
          photo: new Api.InputChatUploadedPhoto({ file: toUpload }),
        })
      );
      mainData.logoSet = true;
      fs.writeFileSync(MAIN_CHANNEL_FILE, JSON.stringify(mainData, null, 2), 'utf8');
      console.log('✅ Main channel logo updated successfully!');
    } catch (e) {
      console.warn('Logo notice:', e.message);
    }
  }

  // Helper function to get link
  const link = (id, fallback) => networkConfig[id]?.inviteLink || fallback || 'https://t.me/+fI8emnNxP7A4NDM1';

  // ==========================================
  // POST 1: Welcome & Grand Announcement
  // ==========================================
  console.log('📨 Sending Post 1: Welcome & Announcement...');
  const post1 = `🎬 <b>WELCOME TO THE OFFICIAL CINEMA NETWORK</b> 🎬
━━━━━━━━━━━━━━━━━━━━━━━━━━
Your high-speed, ad-free gateway to direct streaming and high-bitrate media.

Cinema has evolved into a <b>Multi-Channel High-Speed Network</b>. Instead of waiting for slow multi-scraping or mixed feeds, every major provider now has its own <b>dedicated, ultra-fast channel</b> with instant direct streaming links!

⚡ <b>What Makes Cinema Network Different?</b>
• <b>Direct Fast Streams:</b> Cloudflare R2, Google CDN, Pixeldrain & FastDL.
• <b>Zero Spam & Zero Ads:</b> Clean, direct links with no endless popups.
• <b>Dedicated Channels:</b> Bollywood, Hollywood 4K, Anime, K-Drama & OTT.
• <b>Multi-Platform Support:</b> Web Player, Mobile App & Desktop Runner.

🌐 <b>Official Web Portal:</b> <a href="https://cinema-dwh.pages.dev">cinema-dwh.pages.dev</a>
📢 <b>Main Announcement Channel:</b> <a href="${mainData.inviteLink}">Join Cinema Hub</a>

<i>Stay tuned below for the Master Channel Directory and Player Setup Guide!</i> 👇`;

  await client.sendMessage(inputPeer, { message: post1, parseMode: 'html' });
  await sleep(2000);

  // ==========================================
  // POST 2: Streaming Tutorials & VLC Player Guide
  // ==========================================
  console.log('📨 Sending Post 2: Player & Streaming Guide (PINNED)...');
  const post2 = `📱 <b>HOW TO STREAM WITH ZERO BUFFERING & DUAL AUDIO</b> ⚡
━━━━━━━━━━━━━━━━━━━━━━━━━━

Follow these simple steps for the smoothest playback experience:

📱 <b>For Mobile Users (Android & iOS):</b>
1️⃣ <b>Install VLC or Next Player:</b>
   • Android: Download <b>VLC for Android</b> or <b>Next Player</b> from Play Store.
   • iOS / iPhone: Download <b>VLC for Mobile</b> from App Store.
2️⃣ In any movie post, tap <b>Stream & Download</b>.
3️⃣ Choose your preferred Quality (480p / 720p / 1080p / 4K).
4️⃣ Select <b>Open in VLC</b> — playback starts instantly with subtitle & audio track selection support!

💻 <b>For PC / Laptop Users (Windows, Mac & Linux):</b>
• <b>Option A (Browser):</b> Tap <b>Watch on Web</b> for instant browser playback.
• <b>Option B (VLC Media Player):</b> Copy the direct stream link ➔ Open VLC ➔ Press <code>Ctrl + N</code> (Open Network Stream) ➔ Paste & Play!

🚀 <b>Desktop Node Runner (Power Users):</b>
• Running the local Cinema Runner unlocks <b>100% full unthrottled gigabit speeds</b> and automatically bypasses any cloud rate limits.
• Download and run the one-click Cinema Desktop Runner directly from our GitHub releases!

💡 <b>Pro Tip:</b> For high-bitrate 1080p and 4K movies, always use <b>VLC Media Player</b> for flawless hardware acceleration.`;

  const sentGuide = await client.sendMessage(inputPeer, { message: post2, parseMode: 'html' });
  await sleep(1500);

  // Pin the Guide post
  try {
    await client.invoke(
      new Api.messages.UpdatePinnedMessage({
        peer: inputPeer,
        id: sentGuide.id,
        silent: false,
      })
    );
    console.log('📌 Guide successfully pinned!');
  } catch (e) {
    console.warn('Pin notice:', e.message);
  }
  await sleep(2000);

  // ==========================================
  // POST 3: The Complete 38-Channel Network Directory
  // ==========================================
  console.log('📨 Sending Post 3: Master Channel Directory...');
  const post3 = `🌟 <b>OFFICIAL CINEMA MASTER CHANNEL DIRECTORY</b> 🌟
━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Join the dedicated channels for your favorite content:</i>

💎 <b>ULTRA HD 4K & HIGH BITRATE</b>
├ 🌟 <a href="${link('4khdhub')}">Cinema 4K HDHub</a> (True 4K UHD & HDR)
├ 🌟 <a href="${link('uhdmovies')}">Cinema UHDMovies</a> (4K Remux & 10-Bit)
└ 🌟 <a href="${link('cinemaluxe')}">Cinema CinemaLuxe</a> (High Quality Multi)

🔥 <b>BOLLYWOOD, SOUTH HINDI DUBBED & DESI</b>
├ 🎬 <a href="${link('hdhub4u')}">Cinema HDHub4u</a> (Latest Bollywood & South)
├ 🎬 <a href="${link('vega')}">Cinema VegaMovies</a> (Fast Mega/Gofile)
├ 🎬 <a href="${link('moviesmod')}">Cinema MoviesMod</a> (Clean Fast DLs)
├ 🎬 <a href="${link('drive')}">Cinema MoviesDrive</a> (HubCloud Direct)
├ 🎬 <a href="${link('katmoviehd')}">Cinema KatMovies</a> (Multi-Audio Specialists)
├ 🎬 <a href="${link('topmovies')}">Cinema TopMovies</a> (Direct Cloud)
├ 🎬 <a href="${link('bollyflix')}">Cinema Bollyflix</a> (Bolly Hits)
├ 🎬 <a href="${link('moviesflix')}">Cinema MoviesFlix</a> (Hollywood Dubbed)
├ 🎬 <a href="${link('extramovies')}">Cinema ExtraMovies</a> (Daily Hindi Releases)
├ 🎬 <a href="${link('world4ufree')}">Cinema World4uFree</a> (Archive Classics)
├ 🎬 <a href="${link('skymovieshd')}">Cinema SkyMovies</a> (Regional & Bengali/South)
├ 🎬 <a href="${link('filmyfly')}">Cinema FilmyFly</a> (Desi Releases)
├ 🎬 <a href="${link('cinevood')}">Cinema Cinevood</a> (South Hindi Masala)
├ 🎬 <a href="${link('luxmovies')}">Cinema LuxMovies</a> (Direct Mirrors)
├ 🎬 <a href="${link('eonmovies')}">Cinema EonMovies</a> (Fast Web-DL)
├ 🎬 <a href="${link('moviezwap')}">Cinema MovieZwap</a> (South Regional)
├ 🎬 <a href="${link('zeefliz')}">Cinema Zeefliz</a> (Web Series & Movies)
└ 🎬 <a href="${link('movies4u')}">Cinema Movies4u</a> (All-in-One Catalog)

🍿 <b>OTT, WEB SERIES & INTERNATIONAL HOLLYWOOD</b>
├ 📺 <a href="${link('movieBoxWeb')}">Cinema MovieBox</a> (Netflix / Prime / HBO)
├ 📺 <a href="${link('multimovies')}">Cinema MultiMovies</a> (Complete Seasons)
├ 📺 <a href="${link('gokuhd')}">Cinema GokuHD</a> (English 1080p)
├ 📺 <a href="${link('showbox')}">Cinema Showbox</a> (Trending Global)
├ 📺 <a href="${link('ridomovies')}">Cinema RidoMovies</a> (English HD)
├ 📺 <a href="${link('flixhq')}">Cinema FlixHQ</a> (Global Streaming)
└ 📺 <a href="${link('protonmovies')}">Cinema ProtonMovies</a> (Fast Cloud)

🎎 <b>ASIAN DRAMA (K-DRAMA & C-DRAMA)</b>
├ 🌸 <a href="${link('dramacool')}">Cinema DramaCool</a> (Korean & Asian TV)
└ 🌸 <a href="${link('kisskh')}">Cinema KissKH</a> (K-Drama & Subtitles)

⚡ <b>ANIME & JAPANESE ANIMATION</b>
├ ⛩️ <a href="${link('gogoanime')}">Cinema GogoAnime</a> (Subbed & Dubbed)
├ ⛩️ <a href="${link('animerulz')}">Cinema AnimeRulz</a> (Latest Anime Episodes)
├ ⛩️ <a href="${link('animeworld')}">Cinema AnimeWorld</a> (HD Anime Stream)
├ ⛩️ <a href="${link('anikoto')}">Cinema Anikoto</a> (Seasonal Anime)
└ ⛩️ <a href="${link('hianime')}">Cinema HiAnime</a> (Top-Tier Quality)

📦 <b>TORRENTS, SEEDBOX & P2P</b>
├ ⚡ <a href="${link('yts')}">Cinema YTS</a> (Compressed 720p/1080p)
├ ⚡ <a href="${link('1337x')}">Cinema 1337x</a> (High Bitrate & Remux)
└ ⚡ <a href="${link('thepiratebay')}">Cinema PirateBay</a> (Complete Archives)
━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Tap any link to join its dedicated instant-update channel!</i>`;

  await client.sendMessage(inputPeer, { message: post3, parseMode: 'html', linkPreview: false });
  await sleep(2000);

  // ==========================================
  // POST 4: Community Guidelines & Notice
  // ==========================================
  console.log('📨 Sending Post 4: Community Guidelines & Notice...');
  const post4 = `🛡️ <b>COMMUNITY GUIDELINES & DISCLAIMER NOTICE</b> 🛡️
━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 <b>Channel Rules & Information:</b>
• <b>No Spamming:</b> All channels are clean, isolated broadcast streams.
• <b>Dead Link Reporting:</b> If any direct stream expires, our automatic link resolver refreshes it every 30 minutes.
• <b>Movie Requests:</b> Join our official Movie Request discussion to request titles!

⚖️ <b>Disclaimer:</b>
Cinema Network operates as a decentralized search index & scraper bridge. We do not host, store, or upload copyrighted video media files on any proprietary servers. All links are indexed from publicly accessible third-party web services.

📢 <b>Keep Notifications ON to receive the latest updates & releases!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
❤️ <i>Thank you for being part of Cinema Community!</i>`;

  await client.sendMessage(inputPeer, { message: post4, parseMode: 'html' });

  console.log('\n======================================================');
  console.log('🎉 ALL 4 MASTER POSTS PUBLISHED & PINNED TO MAIN CHANNEL!');
  console.log(`Channel Link: ${mainData.inviteLink}`);
  console.log('======================================================\n');

  process.exit(0);
}

publishHub().catch((err) => {
  console.error('Fatal error publishing hub:', err);
  process.exit(1);
});
