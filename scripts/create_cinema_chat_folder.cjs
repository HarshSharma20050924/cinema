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

async function main() {
  console.log('🚀 Connecting to Telegram to create "🎬 Cinema" Chat Folder...');
  const sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
  const client = new TelegramClient(new StringSession(sessionString), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('✅ Connected to Telegram as User!\n');

  const mainData = JSON.parse(fs.readFileSync(MAIN_CHANNEL_FILE, 'utf8'));
  const network = JSON.parse(fs.readFileSync(NETWORK_CONFIG_FILE, 'utf8'));
  const categoryBots = JSON.parse(fs.readFileSync(BOTS_CONFIG_FILE, 'utf8'));

  // Main Hub Peer
  const mainPeer = new Api.InputPeerChannel({
    channelId: BigInt(mainData.channelId),
    accessHash: BigInt(mainData.accessHash),
  });

  const includePeers = [mainPeer];
  const pinnedPeers = [mainPeer];

  // Add all 38 extension channels
  for (const [extId, ch] of Object.entries(network)) {
    if (!ch.channelId || !ch.accessHash) continue;
    includePeers.push(
      new Api.InputPeerChannel({
        channelId: BigInt(ch.channelId),
        accessHash: BigInt(ch.accessHash),
      })
    );
  }

  // Add all 5 bots
  for (const [catKey, botDef] of Object.entries(categoryBots)) {
    try {
      const botEntity = await client.getEntity(botDef.username);
      includePeers.push(new Api.InputPeerUser({
        userId: botEntity.id,
        accessHash: botEntity.accessHash,
      }));
    } catch (_) {}
  }

  console.log(`Total peers to include in "🎬 Cinema" folder: ${includePeers.length}`);

  // Create Dialog Filter (Chat Folder) in Telegram client
  const FOLDER_ID = 10;
  const filter = new Api.DialogFilter({
    id: FOLDER_ID,
    title: new Api.TextWithEntities({ text: '🎬 Cinema', entities: [] }),
    emoticon: '🎬',
    pinnedPeers: pinnedPeers,
    includePeers: includePeers,
    excludePeers: [],
  });

  console.log('Setting Telegram Dialog Filter (Chat Folder)...');
  await client.invoke(
    new Api.messages.UpdateDialogFilter({
      id: FOLDER_ID,
      filter: filter,
    })
  );
  console.log('🎉 "🎬 Cinema" Chat Folder successfully created in your Telegram app!');

  // Export Shareable Folder Link (t.me/addlist/...)
  let shareableLink = null;
  try {
    const chatlistPeers = includePeers.filter(p => p.className === 'InputPeerChannel');
    const inviteRes = await client.invoke(
      new Api.chatlists.ExportChatlistInvite({
        chatlist: new Api.InputChatlistDialogFilter({
          filterId: FOLDER_ID,
        }),
        title: 'Cinema Network (All 38 Channels)',
        peers: chatlistPeers,
      })
    );

    if (inviteRes?.invite?.url) {
      shareableLink = inviteRes.invite.url;
      console.log(`\n🔗 Shareable 1-Click Folder Link: ${shareableLink}`);
    }
  } catch (err) {
    console.warn('Note on Shareable Chatlist link export:', err.message);
  }

  // Save folder info
  const folderInfo = {
    folderId: FOLDER_ID,
    title: '🎬 Cinema',
    peerCount: includePeers.length,
    shareableLink: shareableLink,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(CONFIG_DIR, 'telegram_folder.json'), JSON.stringify(folderInfo, null, 2), 'utf8');

  console.log('\n======================================================');
  console.log('✅ Chat Folder Setup Complete!');
  if (shareableLink) {
    console.log(`Share Link: ${shareableLink}`);
  }
  console.log('======================================================\n');

  process.exit(0);
}

main().catch(err => {
  console.error('Failed to create folder:', err);
  process.exit(1);
});
