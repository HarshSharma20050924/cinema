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

const NEW_CHANNELS = [
  { id: 'mxplayer', name: 'Cinema MX Player', category: 'desi', botUser: 'CinemaBollywood_Ultra_bot' },
  { id: 'castle', name: 'Cinema Castle', category: 'desi', botUser: 'CinemaBollywood_Ultra_bot' },
  { id: 'netflixMirror', name: 'Cinema Netflix', category: 'series', botUser: 'CinemaOTT_Series_Bot' },
  { id: 'disneyMirror', name: 'Cinema Disney+', category: 'series', botUser: 'CinemaOTT_Series_Bot' },
  { id: 'primeMirror', name: 'Cinema Prime Video', category: 'series', botUser: 'CinemaOTT_Series_Bot' },
  { id: 'animesalt', name: 'Cinema AnimeSalt', category: 'anime', botUser: 'CinemaAnime_Ultra_bot' },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  if (!fs.existsSync(SESSION_FILE)) {
    console.error('Session file missing');
    return;
  }

  const session = fs.readFileSync(SESSION_FILE, 'utf8').trim();
  const client = new TelegramClient(new StringSession(session), API_ID, API_HASH, {
    connectionRetries: 3,
  });

  await client.connect();
  console.log('Connected to Telegram User account!');

  let network = {};
  if (fs.existsSync(NETWORK_CONFIG_FILE)) {
    network = JSON.parse(fs.readFileSync(NETWORK_CONFIG_FILE, 'utf8'));
  }

  for (const ch of NEW_CHANNELS) {
    if (network[ch.id]?.channelId) {
      console.log(`Channel ${ch.name} (${ch.id}) already exists: ${network[ch.id].channelId}`);
      continue;
    }

    console.log(`\n📢 Creating channel: "${ch.name}"...`);
    try {
      const result = await client.invoke(
        new Api.channels.CreateChannel({
          title: ch.name,
          about: `Official ${ch.name} Channel. High quality streaming & direct downloads powered by Cinema Engine.`,
          megagroup: false,
          broadcast: true,
        })
      );

      const created = result.chats[0];
      const channelId = created.id.toString();
      const accessHash = created.accessHash?.toString();

      console.log(`✅ Channel created: ID ${channelId}`);
      await sleep(2000);

      // Export invite link
      let inviteLink = '';
      try {
        const exported = await client.invoke(
          new Api.messages.ExportChatInvite({
            peer: new Api.InputPeerChannel({
              channelId: created.id,
              accessHash: created.accessHash,
            }),
          })
        );
        inviteLink = exported.link || '';
        console.log(`🔗 Permanent Invite: ${inviteLink}`);
      } catch (err) {
        console.warn(`Could not export invite for ${ch.name}:`, err.message);
      }

      // Add category bot as Administrator
      try {
        console.log(`🤖 Adding ${ch.botUser} as Administrator...`);
        const botEntity = await client.getEntity(ch.botUser);
        await client.invoke(
          new Api.channels.EditAdmin({
            channel: new Api.InputChannel({
              channelId: created.id,
              accessHash: created.accessHash,
            }),
            userId: botEntity,
            adminRights: new Api.ChatAdminRights({
              changeInfo: true,
              postMessages: true,
              editMessages: true,
              deleteMessages: true,
              banUsers: true,
              inviteUsers: true,
              pinMessages: true,
              addAdmins: false,
              manageCall: true,
            }),
            rank: 'Cinema Bot',
          })
        );
        console.log(`✅ Admin rights granted to @${ch.botUser}!`);
      } catch (err) {
        console.warn(`Admin add warning for ${ch.botUser}:`, err.message);
      }

      network[ch.id] = {
        channelId,
        title: ch.name,
        accessHash,
        inviteLink,
      };

      fs.writeFileSync(NETWORK_CONFIG_FILE, JSON.stringify(network, null, 2), 'utf8');
      console.log(`💾 Saved to ${NETWORK_CONFIG_FILE}`);
      await sleep(3000);
    } catch (e) {
      console.error(`❌ Failed to create channel ${ch.name}:`, e.message);
      await sleep(3000);
    }
  }

  await client.disconnect();
  console.log('\n🎉 Finished creating missing channels!');
}

run().catch((e) => console.error(e));
