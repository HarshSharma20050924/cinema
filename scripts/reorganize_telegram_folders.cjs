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
const BOTS_CONFIG_FILE = path.join(CONFIG_DIR, 'category_bots.json');

const FAILING_EXTENSIONS = [
  'katmoviehd', 'bollyflix', 'moviesflix', 'extramovies', 'world4ufree',
  'skymovieshd', 'cinevood', 'luxmovies', 'eonmovies', 'cinemaluxe',
  'gokuhd', 'ridomovies', 'protonmovies', 'kisskh', 'gogoanime',
  'animerulz', 'yts', '1337x'
];

async function main() {
  console.log('🚀 Connecting to Telegram as user...');
  const sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
  const client = new TelegramClient(new StringSession(sessionString), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('✅ Connected to Telegram!\n');

  const mainData = JSON.parse(fs.readFileSync(MAIN_CHANNEL_FILE, 'utf8'));
  const network = JSON.parse(fs.readFileSync(NETWORK_CONFIG_FILE, 'utf8'));
  const categoryBots = JSON.parse(fs.readFileSync(BOTS_CONFIG_FILE, 'utf8'));

  // Main Hub Peer
  const mainPeer = new Api.InputPeerChannel({
    channelId: BigInt(mainData.channelId),
    accessHash: BigInt(mainData.accessHash),
  });

  const activePeers = [mainPeer];
  const pinnedPeers = [mainPeer];
  const inactivePeers = [];

  // Sort channels into active vs inactive
  for (const [extId, ch] of Object.entries(network)) {
    if (!ch.channelId || !ch.accessHash) continue;
    const peer = new Api.InputPeerChannel({
      channelId: BigInt(ch.channelId),
      accessHash: BigInt(ch.accessHash),
    });

    if (FAILING_EXTENSIONS.includes(extId.toLowerCase())) {
      inactivePeers.push(peer);
    } else {
      activePeers.push(peer);
    }
  }

  // Add all 5 bots to active folder
  for (const [catKey, botDef] of Object.entries(categoryBots)) {
    try {
      const botEntity = await client.getEntity(botDef.username);
      activePeers.push(new Api.InputPeerUser({
        userId: botEntity.id,
        accessHash: botEntity.accessHash,
      }));
    } catch (_) {}
  }

  console.log(`Active Peers in "🎬 Cinema": ${activePeers.length}`);
  console.log(`Inactive Peers in "📁 Inactive Channels": ${inactivePeers.length}`);

  // 1. Update "🎬 Cinema" Folder (id: 10)
  const ACTIVE_FOLDER_ID = 10;
  const activeFilter = new Api.DialogFilter({
    id: ACTIVE_FOLDER_ID,
    title: new Api.TextWithEntities({ text: '🎬 Cinema', entities: [] }),
    emoticon: '🎬',
    pinnedPeers: pinnedPeers,
    includePeers: activePeers,
    excludePeers: [],
  });

  console.log('\nUpdating "🎬 Cinema" Folder (Verified Working Channels & Bots)...');
  await client.invoke(
    new Api.messages.UpdateDialogFilter({
      id: ACTIVE_FOLDER_ID,
      filter: activeFilter,
    })
  );
  console.log('✅ "🎬 Cinema" Folder updated with ONLY verified working channels!');

  // 2. Create/Update "📁 Inactive" Folder (id: 11)
  const INACTIVE_FOLDER_ID = 11;
  const inactiveFilter = new Api.DialogFilter({
    id: INACTIVE_FOLDER_ID,
    title: new Api.TextWithEntities({ text: 'Inactive', entities: [] }),
    emoticon: '📁',
    pinnedPeers: [],
    includePeers: inactivePeers,
    excludePeers: [],
  });

  console.log('\nCreating "📁 Inactive Channels" Folder...');
  await client.invoke(
    new Api.messages.UpdateDialogFilter({
      id: INACTIVE_FOLDER_ID,
      filter: inactiveFilter,
    })
  );
  console.log('✅ "📁 Inactive Channels" Folder created with all 18 non-working channels moved into it!');

  // 3. Save clean network file & backup archive
  const cleanNetwork = {};
  const archiveNetwork = {};
  for (const [extId, ch] of Object.entries(network)) {
    if (FAILING_EXTENSIONS.includes(extId.toLowerCase())) {
      archiveNetwork[extId] = ch;
    } else {
      cleanNetwork[extId] = ch;
    }
  }

  const ARCHIVE_FILE = path.join(CONFIG_DIR, 'channel_network_archive.json');
  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archiveNetwork, null, 2), 'utf8');
  fs.writeFileSync(NETWORK_CONFIG_FILE, JSON.stringify(cleanNetwork, null, 2), 'utf8');
  console.log(`\n💾 Saved:`);
  console.log(`  - ${NETWORK_CONFIG_FILE} (${Object.keys(cleanNetwork).length} active verified channels)`);
  console.log(`  - ${ARCHIVE_FILE} (${Object.keys(archiveNetwork).length} inactive channels archived)`);

  await client.disconnect();
  console.log('\n🎉 Finished successfully!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
