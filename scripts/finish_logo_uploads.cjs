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
const NETWORK_CONFIG_FILE = path.join(CONFIG_DIR, 'channel_network.json');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function finishLogos() {
  if (!fs.existsSync(SESSION_FILE)) {
    console.error('Session file not found!');
    return;
  }
  const sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
  const client = new TelegramClient(new StringSession(sessionString), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('Connected to Telegram client.');

  const networkConfig = JSON.parse(fs.readFileSync(NETWORK_CONFIG_FILE, 'utf8'));

  for (const [extId, channel] of Object.entries(networkConfig)) {
    if (channel.logoUploaded) {
      continue;
    }

    const logoPath = path.join(LOGO_DIR, `${extId}_logo.png`);
    if (!fs.existsSync(logoPath)) {
      console.warn(`Logo not found for ${extId}: ${logoPath}`);
      continue;
    }

    console.log(`Uploading logo for [${extId}] (${channel.title})...`);
    try {
      const toUpload = await client.uploadFile({
        file: new CustomFile(`${extId}_logo.png`, fs.statSync(logoPath).size, logoPath),
        workers: 1,
      });

      const inputPeer = new Api.InputPeerChannel({
        channelId: BigInt(channel.channelId),
        accessHash: BigInt(channel.accessHash),
      });

      await client.invoke(
        new Api.channels.EditPhoto({
          channel: inputPeer,
          photo: new Api.InputChatUploadedPhoto({
            file: toUpload,
          }),
        })
      );

      channel.logoUploaded = true;
      networkConfig[extId] = channel;
      fs.writeFileSync(NETWORK_CONFIG_FILE, JSON.stringify(networkConfig, null, 2), 'utf8');
      console.log(`✅ Success for ${extId}!`);
      await sleep(2500);
    } catch (err) {
      console.warn(`⚠️ Failed for ${extId}: ${err.message}`);
      if (err.message.includes('wait of') || err.message.includes('FLOOD_WAIT')) {
        const match = err.message.match(/wait of (\d+) seconds/i);
        const waitSec = match ? parseInt(match[1], 10) : 60;
        console.log(`⏳ FloodWait: Waiting ${waitSec}s...`);
        await sleep((waitSec + 2) * 1000);
      }
    }
  }

  console.log('🎉 Finished logo upload pass!');
  process.exit(0);
}

finishLogos().catch(console.error);
