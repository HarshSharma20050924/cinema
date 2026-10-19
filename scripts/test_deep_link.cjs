const fs = require('fs');
const path = require('path');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const axios = require('axios');

const API_ID = 34834024;
const API_HASH = 'a19dcd8389bf1da64949e97fbcd5064c';
const SESSION_FILE = path.resolve(__dirname, '../server/config/telegram_session.txt');

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
  const client = new TelegramClient(new StringSession(sessionString), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('✅ Connected to Telegram.\n');

  // Let us test deep link on 4K bot:
  const provKey = '4khdhub';
  const testTitle = 'Inception (2010)';
  const testLink = 'https://4khdhub.fans/inception-2010/';
  const storeId = hashString(`${provKey}:${testLink}`);
  const cleanTitle = 'Inception_2010';
  const startParam = `p_${storeId}_${provKey}_${cleanTitle}`;

  // Store in D1
  console.log('Saving test link in D1...');
  await axios.post('https://cinema-dwh.pages.dev/api/store-link', {
    id: storeId,
    provider: provKey,
    link: testLink,
    title: testTitle,
  });

  console.log(`Testing deep link on @Cinema4K_Ultra_813_bot with param: /start ${startParam}...`);
  await client.sendMessage('Cinema4K_Ultra_813_bot', { message: `/start ${startParam}` });

  console.log('Waiting 5s for media card response...');
  await sleep(5500);

  const msgs = await client.getMessages('Cinema4K_Ultra_813_bot', { limit: 3 });
  const reply = msgs.find(m => !m.out);
  if (reply) {
    console.log(`✅ [SUCCESS] Received response from @Cinema4K_Ultra_813_bot:`);
    console.log(`Media: ${reply.media ? 'YES (Poster Photo/Card)' : 'NO'}`);
    console.log(`Buttons: ${reply.replyMarkup?.rows ? reply.replyMarkup.rows.length + ' rows' : 'None'}`);
    console.log(`Text: "${reply.message.slice(0, 180)}..."`);
  } else {
    console.warn('❌ [FAILED] No response received.');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
