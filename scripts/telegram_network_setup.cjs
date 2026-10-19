const fs = require('fs');
const path = require('path');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { CustomFile } = require('telegram/client/uploads');
const input = require('input');

const API_ID = 34834024;
const API_HASH = 'a19dcd8389bf1da64949e97fbcd5064c';

const CONFIG_DIR = path.resolve(__dirname, '../server/config');
const LOGO_DIR = path.resolve(__dirname, '../server/data/channel_logos');
const SESSION_FILE = path.join(CONFIG_DIR, 'telegram_session.txt');
const NETWORK_CONFIG_FILE = path.join(CONFIG_DIR, 'channel_network.json');

if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// All active catalog extensions from Vega & Cinema
const EXTENSIONS = [
  // Tier 1: Desi & Bollywood / Hollywood Dual Audio
  { id: 'hdhub4u', name: 'Cinema HDHub4u', botName: 'Cinema HDHub4u Bot' },
  { id: '4khdhub', name: 'Cinema 4KHDHub', botName: 'Cinema 4KHDHub Bot' },
  { id: 'vega', name: 'Cinema Vega', botName: 'Cinema Vega Bot' },
  { id: 'moviesmod', name: 'Cinema MoviesMod', botName: 'Cinema MoviesMod Bot' },
  { id: 'drive', name: 'Cinema Drive', botName: 'Cinema Drive Bot' },
  { id: 'katmoviehd', name: 'Cinema KatMovies', botName: 'Cinema KatMovies Bot' },
  { id: 'topmovies', name: 'Cinema TopMovies', botName: 'Cinema TopMovies Bot' },
  { id: 'uhdmovies', name: 'Cinema UHDMovies', botName: 'Cinema UHDMovies Bot' },
  { id: 'bollyflix', name: 'Cinema Bollyflix', botName: 'Cinema Bollyflix Bot' },
  { id: 'moviesflix', name: 'Cinema MoviesFlix', botName: 'Cinema MoviesFlix Bot' },
  { id: 'extramovies', name: 'Cinema ExtraMovies', botName: 'Cinema ExtraMovies Bot' },
  { id: 'world4ufree', name: 'Cinema World4uFree', botName: 'Cinema World4uFree Bot' },
  { id: 'skymovieshd', name: 'Cinema SkyMovies', botName: 'Cinema SkyMovies Bot' },
  { id: 'filmyfly', name: 'Cinema FilmyFly', botName: 'Cinema FilmyFly Bot' },
  { id: 'cinevood', name: 'Cinema Cinevood', botName: 'Cinema Cinevood Bot' },
  { id: 'luxmovies', name: 'Cinema LuxMovies', botName: 'Cinema LuxMovies Bot' },
  { id: 'eonmovies', name: 'Cinema EonMovies', botName: 'Cinema EonMovies Bot' },
  { id: 'moviezwap', name: 'Cinema MovieZwap', botName: 'Cinema MovieZwap Bot' },
  { id: 'cinemaluxe', name: 'Cinema CinemaLuxe', botName: 'Cinema CinemaLuxe Bot' },
  { id: 'zeefliz', name: 'Cinema Zeefliz', botName: 'Cinema Zeefliz Bot' },
  { id: 'movies4u', name: 'Cinema Movies4u', botName: 'Cinema Movies4u Bot' },

  // Tier 2: OTT & International
  { id: 'movieBoxWeb', name: 'Cinema MovieBox', botName: 'Cinema MovieBox Bot' },
  { id: 'multimovies', name: 'Cinema MultiMovies', botName: 'Cinema MultiMovies Bot' },
  { id: 'gokuhd', name: 'Cinema GokuHD', botName: 'Cinema GokuHD Bot' },
  { id: 'showbox', name: 'Cinema Showbox', botName: 'Cinema Showbox Bot' },
  { id: 'ridomovies', name: 'Cinema RidoMovies', botName: 'Cinema RidoMovies Bot' },
  { id: 'flixhq', name: 'Cinema FlixHQ', botName: 'Cinema FlixHQ Bot' },
  { id: 'protonmovies', name: 'Cinema ProtonMovies', botName: 'Cinema ProtonMovies Bot' },

  // Tier 3: Asian Drama (K-Drama / C-Drama)
  { id: 'dramacool', name: 'Cinema DramaCool', botName: 'Cinema DramaCool Bot' },
  { id: 'kisskh', name: 'Cinema KissKH', botName: 'Cinema KissKH Bot' },

  // Tier 4: Anime
  { id: 'gogoanime', name: 'Cinema GogoAnime', botName: 'Cinema GogoAnime Bot' },
  { id: 'animerulz', name: 'Cinema AnimeRulz', botName: 'Cinema AnimeRulz Bot' },
  { id: 'animeworld', name: 'Cinema AnimeWorld', botName: 'Cinema AnimeWorld Bot' },
  { id: 'anikoto', name: 'Cinema Anikoto', botName: 'Cinema Anikoto Bot' },
  { id: 'hianime', name: 'Cinema HiAnime', botName: 'Cinema HiAnime Bot' },

  // Tier 5: Torrents & P2P High Bitrate
  { id: 'yts', name: 'Cinema YTS', botName: 'Cinema YTS Bot' },
  { id: '1337x', name: 'Cinema 1337x', botName: 'Cinema 1337x Bot' },
  { id: 'thepiratebay', name: 'Cinema PirateBay', botName: 'Cinema PirateBay Bot' },
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=====================================================');
  console.log(`⚡ Cinema Telegram Multi-Channel Network (${EXTENSIONS.length} Channels) ⚡`);
  console.log('=====================================================\n');

  let sessionString = '';
  if (fs.existsSync(SESSION_FILE)) {
    sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
  }

  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text('📱 Enter your Telegram phone number (with country code, e.g. +91...): '),
    password: async () => await input.text('🔒 Enter your 2FA Cloud Password (if enabled, or press enter): '),
    phoneCode: async () => await input.text('🔑 Enter the OTP code received on Telegram: '),
    onError: (err) => console.error('Auth error:', err.message),
  });

  console.log('\n✅ Successfully authenticated with Telegram User Account!');
  const savedSession = client.session.save();
  fs.writeFileSync(SESSION_FILE, savedSession, 'utf8');
  console.log(`💾 Session saved securely to ${SESSION_FILE}\n`);

  let networkConfig = {};
  if (fs.existsSync(NETWORK_CONFIG_FILE)) {
    try {
      networkConfig = JSON.parse(fs.readFileSync(NETWORK_CONFIG_FILE, 'utf8'));
    } catch (_) {}
  }

  console.log(`🚀 Starting channel automation for all ${EXTENSIONS.length} extensions...\n`);

  for (let i = 0; i < EXTENSIONS.length; i++) {
    const ext = EXTENSIONS[i];
    console.log(`-----------------------------------------------------`);
    console.log(`[${i + 1}/${EXTENSIONS.length}] 📦 Processing: ${ext.name} (${ext.id})`);

    let channelData = networkConfig[ext.id] || {};

    // 1. Create Channel if not already exists
    if (!channelData.channelId) {
      try {
        console.log(`📢 Creating Telegram Broadcast Channel: "${ext.name}"...`);
        const result = await client.invoke(
          new Api.channels.CreateChannel({
            title: ext.name,
            about: `Official ${ext.name} Channel. High quality streaming & downloads powered by Cinema Engine.`,
            megagroup: false,
            broadcast: true,
          })
        );
        const channel = result.chats[0];
        channelData.channelId = channel.id.toString();
        channelData.title = ext.name;
        channelData.accessHash = channel.accessHash?.toString();
        console.log(`✅ Channel Created: ID ${channelData.channelId}`);
        await sleep(2500); // Flood prevention
      } catch (err) {
        console.error(`❌ Failed to create channel for ${ext.id}:`, err.message);
        continue;
      }
    } else {
      console.log(`ℹ️ Channel already exists: ID ${channelData.channelId}`);
    }

    // 2. Upload Minimal Logo
    const logoPath = path.join(LOGO_DIR, `${ext.id}_logo.png`);
    if (fs.existsSync(logoPath) && !channelData.logoUploaded) {
      try {
        console.log(`🎨 Uploading minimal logo: ${logoPath}...`);
        const toUpload = await client.uploadFile({
          file: new CustomFile(`${ext.id}_logo.png`, fs.statSync(logoPath).size, logoPath),
          workers: 1,
        });

        await client.invoke(
          new Api.channels.EditPhoto({
            channel: channelData.channelId,
            photo: new Api.InputChatUploadedPhoto({
              file: toUpload,
            }),
          })
        );
        channelData.logoUploaded = true;
        console.log(`✅ Minimal logo set successfully!`);
        await sleep(2000);
      } catch (err) {
        console.warn(`⚠️ Could not set channel photo for ${ext.id}:`, err.message);
      }
    }

    // 3. Export Permanent Invite Link
    if (!channelData.inviteLink) {
      try {
        const linkResult = await client.invoke(
          new Api.messages.ExportChatInvite({
            peer: channelData.channelId,
          })
        );
        channelData.inviteLink = linkResult.link;
        console.log(`🔗 Channel Invite Link: ${channelData.inviteLink}`);
      } catch (err) {
        console.warn(`⚠️ Could not get invite link for ${ext.id}:`, err.message);
      }
    }

    networkConfig[ext.id] = channelData;
    fs.writeFileSync(NETWORK_CONFIG_FILE, JSON.stringify(networkConfig, null, 2), 'utf8');
    await sleep(2000);
  }

  console.log('\n=====================================================');
  console.log(`🎉 All ${EXTENSIONS.length} Channels created & styled with Minimal Logos!`);
  console.log(`Config saved at: ${NETWORK_CONFIG_FILE}`);
  console.log('=====================================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
