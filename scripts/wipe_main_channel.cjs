const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN || '8887103348:AAFYcYbWEm8adSF4fpLUcUliJKTmqGxvEe4';
const CHANNEL_ID = process.env.CHANNEL_ID || '-1004363607477';

async function wipeChannel() {
  console.log(`🧹 Starting full wipe of main cinema channel: ${CHANNEL_ID}...`);

  // Max message ID is ~1550. Let's scan from 1 to 1600 in chunks of 100
  const maxId = 1600;
  const chunkSize = 100;
  let totalDeleted = 0;

  for (let start = 1; start <= maxId; start += chunkSize) {
    const ids = [];
    for (let i = start; i < start + chunkSize && i <= maxId; i++) {
      ids.push(i);
    }

    try {
      // Use Telegram Bot API deleteMessages (batch up to 100)
      const res = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessages`, {
        chat_id: CHANNEL_ID,
        message_ids: ids,
      });

      if (res.data?.ok) {
        console.log(`✅ Deleted batch ${ids[0]} - ${ids[ids.length - 1]}`);
        totalDeleted += ids.length;
      }
    } catch (err) {
      // Fallback: if deleteMessages batch fails (e.g. some invalid IDs), try individually or smaller chunks
      const desc = err.response?.data?.description || err.message;
      if (desc.includes('can\'t be deleted') || desc.includes('MESSAGE_ID_INVALID')) {
        // Try smaller chunks of 20
        for (let subStart = ids[0]; subStart <= ids[ids.length - 1]; subStart += 20) {
          const subIds = [];
          for (let s = subStart; s < subStart + 20 && s <= ids[ids.length - 1]; s++) {
            subIds.push(s);
          }
          try {
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessages`, {
              chat_id: CHANNEL_ID,
              message_ids: subIds,
            });
            totalDeleted += subIds.length;
          } catch (_) {
            // Ignore if messages already don't exist
          }
        }
      } else {
        console.warn(`Batch ${ids[0]}-${ids[ids.length - 1]} notice:`, desc);
      }
    }

    await new Promise((r) => setTimeout(r, 400)); // Respect flood limit
  }

  console.log(`\n🎉 Channel wiped clean! Total processed/deleted: ~${totalDeleted} IDs.`);
}

wipeChannel().catch(console.error);
