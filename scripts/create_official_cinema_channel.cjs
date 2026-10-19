const fs = require('fs');
const path = require('path');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { CustomFile } = require('telegram/client/uploads');

const API_ID = 34834024;
const API_HASH = 'a19dcd8389bf1da64949e97fbcd5064c';
const SESSION_FILE = path.resolve(__dirname, '../server/config/telegram_session.txt');
const MAIN_CHANNEL_FILE = path.resolve(__dirname, '../server/config/main_channel.json');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createOfficialCinemaChannel() {
  console.log('🚀 Connecting to Telegram to create official Cinema channel...');
  const sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
  const client = new TelegramClient(new StringSession(sessionString), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('✅ Connected to Telegram!');

  // 1. Create Broadcast Channel
  console.log('📢 Creating Broadcast Channel: "Cinema"...');
  const createResult = await client.invoke(
    new Api.channels.CreateChannel({
      title: 'Cinema',
      about: 'Official Cinema Hub — High Quality Streaming, 4K UHD Movies, Series, Anime, Tutorials & Guides.',
      megagroup: false,
      broadcast: true,
    })
  );

  const channel = createResult.chats[0];
  const channelId = channel.id.toString();
  const accessHash = channel.accessHash.toString();
  console.log(`✅ Cinema Channel Created! ID: ${channelId} | AccessHash: ${accessHash}`);

  await sleep(2000);

  // 2. Upload Logo
  const logoPath = path.resolve(__dirname, '../public/logo.png');
  let logoSet = false;
  if (fs.existsSync(logoPath)) {
    console.log(`🎨 Uploading official logo from ${logoPath}...`);
    try {
      const toUpload = await client.uploadFile({
        file: new CustomFile('logo.png', fs.statSync(logoPath).size, logoPath),
        workers: 1,
      });

      const inputPeer = new Api.InputPeerChannel({
        channelId: BigInt(channelId),
        accessHash: BigInt(accessHash),
      });

      await client.invoke(
        new Api.channels.EditPhoto({
          channel: inputPeer,
          photo: new Api.InputChatUploadedPhoto({
            file: toUpload,
          }),
        })
      );
      logoSet = true;
      console.log('✅ Official Cinema Logo uploaded and set successfully!');
    } catch (err) {
      console.warn('⚠️ Logo upload notice:', err.message);
      if (err.message.includes('wait of')) {
        console.log('⏳ Telegram has a temporary photo cooldown. You can retry setting photo shortly.');
      }
    }
  }

  // 3. Export Permanent Invite Link
  console.log('🔗 Exporting permanent invite link...');
  const linkRes = await client.invoke(
    new Api.messages.ExportChatInvite({
      peer: new Api.InputPeerChannel({
        channelId: BigInt(channelId),
        accessHash: BigInt(accessHash),
      }),
    })
  );

  const inviteLink = linkRes.link;
  console.log(`🎉 Permanent Invite Link: ${inviteLink}`);

  // 4. Save to config
  const mainChannelData = {
    title: 'Cinema',
    channelId,
    telegramChatId: `-100${channelId}`,
    accessHash,
    inviteLink,
    logoSet,
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(MAIN_CHANNEL_FILE, JSON.stringify(mainChannelData, null, 2), 'utf8');
  console.log(`💾 Saved config to ${MAIN_CHANNEL_FILE}`);

  console.log('\n======================================================');
  console.log('🎉 OFFICIAL CINEMA CHANNEL CREATED & CONFIGURED!');
  console.log(`Channel Title:  Cinema`);
  console.log(`Channel ID:     ${channelId} (API: -100${channelId})`);
  console.log(`Invite Link:    ${inviteLink}`);
  console.log(`Logo Status:    ${logoSet ? 'SET ✅' : 'PENDING COOLDOWN ⏳'}`);
  console.log('======================================================\n');

  process.exit(0);
}

createOfficialCinemaChannel().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
