const fs = require('fs');
const path = require('path');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const API_ID = 34834024;
const API_HASH = 'a19dcd8389bf1da64949e97fbcd5064c';
const SESSION_FILE = path.resolve(__dirname, '../server/config/telegram_session.txt');

async function findMainChannel() {
  const sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
  const client = new TelegramClient(new StringSession(sessionString), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('Connected to Telegram.');

  const dialogs = await client.getDialogs({});
  console.log('Searching for main Cinema channel in dialogs...');

  for (const d of dialogs) {
    const id = d.id?.toString();
    const title = d.title || '';
    if (title.toLowerCase().trim() === 'cinema' || id.includes('4363607477')) {
      console.log(`🎯 FOUND MAIN CHANNEL: "${title}" | ID: ${id} | AccessHash: ${d.entity?.accessHash}`);
      return { client, entity: d.entity, id, title };
    }
  }

  console.log('Channel matching "Cinema" or "4363607477" not found in top dialogs. Listing all channels:');
  for (const d of dialogs) {
    if (d.isChannel) {
      console.log(`- ${d.title} (ID: ${d.id})`);
    }
  }
  process.exit(0);
}

findMainChannel().catch(console.error);
