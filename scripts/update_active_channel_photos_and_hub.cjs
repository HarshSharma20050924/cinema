const fs = require('fs');
const path = require('path');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { CustomFile } = require('telegram/client/uploads');

const API_ID = 34834024;
const API_HASH = 'a19dcd8389bf1da64949e97fbcd5064c';
const CONFIG_DIR = path.resolve(__dirname, '../server/config');
const LOGO_DIR = path.resolve(__dirname, '../server/data/channel_logos');
const SESSION_FILE = path.join(CONFIG_DIR, 'telegram_session.txt');
const MAIN_CHANNEL_FILE = path.join(CONFIG_DIR, 'main_channel.json');
const NETWORK_CONFIG_FILE = path.join(CONFIG_DIR, 'channel_network.json');

// Exact 26 ACTIVE channels from the "Cinema" folder
const ACTIVE_CHANNELS = [
  // 💎 4K
  { extId: '4khdhub', label: '4K HDHub', section: '4k' },
  { extId: 'uhdmovies', label: 'UHDMovies', section: '4k' },

  // 🎬 CinemaWood (Bollywood & South)
  { extId: 'hdhub4u', label: 'HDHub4u', section: 'desi' },
  { extId: 'vega', label: 'VegaMovies', section: 'desi' },
  { extId: 'moviesmod', label: 'MoviesMod', section: 'desi' },
  { extId: 'drive', label: 'MoviesDrive', section: 'desi' },
  { extId: 'topmovies', label: 'TopMovies', section: 'desi' },
  { extId: 'filmyfly', label: 'FilmyFly', section: 'desi' },
  { extId: 'moviezwap', label: 'MovieZwap', section: 'desi' },
  { extId: 'zeefliz', label: 'ZeeFliz', section: 'desi' },
  { extId: 'movies4u', label: 'Movies4u', section: 'desi' },
  { extId: 'mxplayer', label: 'MX Player', section: 'desi' },
  { extId: 'castle', label: 'Castle', section: 'desi' },

  // 📺 Hollywood & Web Series
  { extId: 'movieBoxWeb', label: 'MovieBox', section: 'series' },
  { extId: 'netflixMirror', label: 'Netflix', section: 'series' },
  { extId: 'primeMirror', label: 'Prime Video', section: 'series' },
  { extId: 'disneyMirror', label: 'Disney+', section: 'series' },
  { extId: 'multimovies', label: 'MultiMovies', section: 'series' },
  { extId: 'showbox', label: 'Showbox', section: 'series' },
  { extId: 'flixhq', label: 'FlixHQ', section: 'series' },

  // ⚡ Anime & Asian Drama
  { extId: 'hianime', label: 'HiAnime', section: 'anime' },
  { extId: 'animeworld', label: 'AnimeWorld', section: 'anime' },
  { extId: 'anikoto', label: 'AniKoto', section: 'anime' },
  { extId: 'animesalt', label: 'AnimeSalt', section: 'anime' },
  { extId: 'dramacool', label: 'DramaCool', section: 'anime' },

  // ⚓ Torrent Archives
  { extId: 'thepiratebay', label: 'PirateBay', section: 'torrent' },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('🚀 Connecting to Telegram...');
  const sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
  const client = new TelegramClient(new StringSession(sessionString), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('✅ Connected!');

  const networkConfig = fs.existsSync(NETWORK_CONFIG_FILE)
    ? JSON.parse(fs.readFileSync(NETWORK_CONFIG_FILE, 'utf8'))
    : {};
  const mainData = JSON.parse(fs.readFileSync(MAIN_CHANNEL_FILE, 'utf8'));

  // 1. Update photos to 2-letter logos for all 26 active channels
  console.log('\n🎨 Updating 2-letter monogram photos on all active channels...');
  for (const item of ACTIVE_CHANNELS) {
    const cfg = networkConfig[item.extId];
    if (!cfg) {
      console.warn(`Configuration missing for ${item.extId}`);
      continue;
    }

    const logoFile = `${item.extId}_logo.png`;
    const logoPath = path.join(LOGO_DIR, logoFile);

    if (!fs.existsSync(logoPath)) {
      console.warn(`File not found: ${logoPath}`);
      continue;
    }

    console.log(`Setting 2-letter logo for [${item.extId}] ${cfg.title}...`);
    try {
      const toUpload = await client.uploadFile({
        file: new CustomFile(logoFile, fs.statSync(logoPath).size, logoPath),
        workers: 1,
      });

      await client.invoke(
        new Api.channels.EditPhoto({
          channel: new Api.InputPeerChannel({
            channelId: BigInt(cfg.channelId),
            accessHash: BigInt(cfg.accessHash),
          }),
          photo: new Api.InputChatUploadedPhoto({ file: toUpload }),
        })
      );
      console.log(`✅ Updated photo for ${cfg.title}`);
      await sleep(2200);
    } catch (err) {
      console.warn(`⚠️ Could not update photo for ${item.extId}: ${err.message}`);
      if (err.message.includes('FLOOD_WAIT') || err.message.includes('wait of')) {
        const m = err.message.match(/wait of (\d+)/);
        const w = m ? parseInt(m[1], 10) : 30;
        console.log(`Flood wait detected, sleeping ${w}s...`);
        await sleep((w + 2) * 1000);
      }
    }
  }

  // 2. Build and publish clean Master Directory with ZERO inactive channels
  console.log('\n📝 Building clean directory matching user screenshot...');

  let msg = `Tap on any channel link below to join instantly:\n\n`;

  // Section 1: 4K
  msg += `💎 <b>4K ULTRA HD MOVIES</b> (Bot: @Cinema4K_Ultra_813_bot)\n`;
  for (const item of ACTIVE_CHANNELS.filter((c) => c.section === '4k')) {
    const link = networkConfig[item.extId]?.inviteLink;
    if (link) msg += `• <b>${item.label}:</b> ${link}\n`;
  }

  // Section 2: CinemaWood
  msg += `\n🎬 <b>CINEMAWOOD (BOLLYWOOD & SOUTH)</b> (Bot: @CinemaBollywood_Ultra_bot)\n`;
  for (const item of ACTIVE_CHANNELS.filter((c) => c.section === 'desi')) {
    const link = networkConfig[item.extId]?.inviteLink;
    if (link) msg += `• <b>${item.label}:</b> ${link}\n`;
  }

  // Section 3: Hollywood & Web Series
  msg += `\n📺 <b>HOLLYWOOD & WEB SERIES</b> (Bot: @CinemaOTT_Series_Bot)\n`;
  for (const item of ACTIVE_CHANNELS.filter((c) => c.section === 'series')) {
    const link = networkConfig[item.extId]?.inviteLink;
    if (link) msg += `• <b>${item.label}:</b> ${link}\n`;
  }

  // Section 4: Anime & Asian Drama
  msg += `\n⚡ <b>ANIME & ASIAN DRAMA</b> (Bot: @CinemaAnime_Ultra_bot)\n`;
  for (const item of ACTIVE_CHANNELS.filter((c) => c.section === 'anime')) {
    const link = networkConfig[item.extId]?.inviteLink;
    if (link) msg += `• <b>${item.label}:</b> ${link}\n`;
  }

  // Section 5: Torrent Archives
  msg += `\n⚓ <b>TORRENT ARCHIVES</b> (Bot: @cinemaisherebtw_bot)\n`;
  for (const item of ACTIVE_CHANNELS.filter((c) => c.section === 'torrent')) {
    const link = networkConfig[item.extId]?.inviteLink;
    if (link) msg += `• <b>${item.label}:</b> ${link}\n`;
  }

  // 1-Click Folder link at bottom
  msg += `\n📁 <b>1-Click All Channels Folder:</b> <a href="https://t.me/addlist/dPkh4Vq3iCg4MWFl">Tap to Add All 26 Channels into 1 Folder</a>`;

  console.log('\n📨 Sending clean directory to Main Channel...');
  const mainInputPeer = new Api.InputPeerChannel({
    channelId: BigInt(mainData.channelId),
    accessHash: BigInt(mainData.accessHash),
  });

  await client.sendMessage(mainInputPeer, {
    message: msg,
    parseMode: 'html',
    linkPreview: false,
  });

  console.log('🎉 Done! Clean directory posted and active channels updated with 2-letter photos.');
  await client.disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
