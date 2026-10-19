const fs = require('fs');
const path = require('path');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const API_ID = 34834024;
const API_HASH = 'a19dcd8389bf1da64949e97fbcd5064c';
const SESSION_FILE = path.resolve(__dirname, '../server/config/telegram_session.txt');

const BOTS = [
  'cinemaisherebtw_bot',
  'Cinema4K_Ultra_813_bot',
  'CinemaOTT_Series_Bot'
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
  const client = new TelegramClient(new StringSession(sessionString), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('✅ Connected to Telegram as user.\n');

  for (const botUser of BOTS) {
    console.log(`🤖 Testing Bot: @${botUser}...`);
    // Send /start
    await client.sendMessage(botUser, { message: '/start' });
    console.log(`Sent /start to @${botUser}. Waiting 3s for bot response...`);
    await sleep(3500);

    const msgs = await client.getMessages(botUser, { limit: 2 });
    const botReply = msgs.find(m => !m.out);
    if (botReply) {
      console.log(`✅ [SUCCESS] @${botUser} responded:`);
      console.log(`"${botReply.message.slice(0, 120)}..."`);
    } else {
      console.warn(`❌ [NO RESPONSE] @${botUser} did not reply.`);
    }
    console.log('--------------------------------------------------\n');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
