const fs = require('fs');
const path = require('path');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const API_ID = 34834024;
const API_HASH = 'a19dcd8389bf1da64949e97fbcd5064c';
const CONFIG_DIR = path.resolve(__dirname, '../server/config');
const SESSION_FILE = path.join(CONFIG_DIR, 'telegram_session.txt');
const NETWORK_CONFIG_FILE = path.join(CONFIG_DIR, 'channel_network.json');
const BOTS_CONFIG_FILE = path.join(CONFIG_DIR, 'category_bots.json');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function addAdmins() {
  console.log('🚀 Connecting to Telegram to promote bots as Channel Admins...');
  const sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
  const client = new TelegramClient(new StringSession(sessionString), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('✅ Connected!');

  const networkConfig = JSON.parse(fs.readFileSync(NETWORK_CONFIG_FILE, 'utf8'));
  const categoryBots = JSON.parse(fs.readFileSync(BOTS_CONFIG_FILE, 'utf8'));

  // Default bot for Desi/others until more are created
  const defaultBot = '@cinemaisherebtw_bot';

  for (const [extId, channel] of Object.entries(networkConfig)) {
    if (!channel.channelId || !channel.accessHash) continue;

    // Determine which bot to add
    let targetBot = defaultBot;
    if (categoryBots['4k']?.categories?.includes(extId)) {
      targetBot = `@${categoryBots['4k'].username}`;
    } else if (categoryBots['series']?.categories?.includes(extId)) {
      targetBot = `@${categoryBots['series'].username}`;
    } else if (categoryBots['desi']?.categories?.includes(extId)) {
      targetBot = `@${categoryBots['desi'].username}`;
    } else if (categoryBots['anime']?.categories?.includes(extId)) {
      targetBot = `@${categoryBots['anime'].username}`;
    }

    const inputPeer = new Api.InputPeerChannel({
      channelId: BigInt(channel.channelId),
      accessHash: BigInt(channel.accessHash),
    });

    console.log(`Adding ${targetBot} as Admin to: ${channel.title}...`);

    try {
      await client.invoke(
        new Api.channels.EditAdmin({
          channel: inputPeer,
          userId: targetBot,
          adminRights: new Api.ChatAdminRights({
            changeInfo: true,
            postMessages: true,
            editMessages: true,
            deleteMessages: true,
            banUsers: true,
            inviteUsers: true,
            pinMessages: true,
            addAdmins: false,
            anonymous: false,
            manageCall: false,
            other: true,
          }),
          rank: 'Poster Bot',
        })
      );
      console.log(`✅ Success for ${channel.title}!`);
      await sleep(2000); // Flood prevention
    } catch (err) {
      console.warn(`⚠️ Could not add admin to ${channel.title}:`, err.message);
      if (err.message.includes('FLOOD_WAIT') || err.message.includes('wait of')) {
        const m = err.message.match(/wait of (\d+) seconds/i);
        const wait = m ? parseInt(m[1], 10) : 30;
        console.log(`⏳ Waiting ${wait}s...`);
        await sleep((wait + 2) * 1000);
      }
    }
  }

  console.log('\n🎉 Finished promoting bots to Channel Administrators!');
  process.exit(0);
}

addAdmins().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
