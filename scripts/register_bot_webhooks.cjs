const axios = require('axios');

const BOTS = [
  {
    name: 'Cinema Desi / General Bot',
    username: 'cinemaisherebtw_bot',
    token: '8887103348:AAFYcYbWEm8adSF4fpLUcUliJKTmqGxvEe4',
  },
  {
    name: 'Cinema 4K Ultra Bot',
    username: 'Cinema4K_Ultra_813_bot',
    token: '8777878521:AAFY7HiuwOqIAId8BWrc2F0ejEYK4GML1gA',
  },
  {
    name: 'Cinema OTT Series Bot',
    username: 'CinemaOTT_Series_Bot',
    token: '8920144104:AAHfAYWcZAat4yiesDZ3yU_8BAIEfNzrzPQ',
  },
];

const BASE_WEBHOOK_URL = 'https://cinema-dwh.pages.dev/api/telegram-webhook';

async function registerAll() {
  console.log('🌐 Registering Cloudflare Pages Webhooks for all Category Bots...\n');

  for (const bot of BOTS) {
    const webhookUrl = `${BASE_WEBHOOK_URL}?token=${encodeURIComponent(bot.token)}`;
    console.log(`Setting webhook for [${bot.name}] (@${bot.username})...`);
    console.log(`Target URL: ${webhookUrl}`);

    try {
      // 1. Delete webhook first with drop_pending_updates to clear any stuck backlog
      await axios.post(`https://api.telegram.org/bot${bot.token}/deleteWebhook`, {
        drop_pending_updates: false,
      });

      // 2. Set new webhook with max allowed connections
      const res = await axios.post(`https://api.telegram.org/bot${bot.token}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        max_connections: 40,
      });

      console.log(`setWebhook result:`, res.data);

      // 3. Verify with getWebhookInfo
      const info = await axios.get(`https://api.telegram.org/bot${bot.token}/getWebhookInfo`);
      console.log(`Verified Webhook Info:`, info.data.result);
      console.log('--------------------------------------------------\n');
    } catch (err) {
      console.error(`❌ Failed for ${bot.name}:`, err.response?.data || err.message);
    }
  }

  console.log('🎉 All bot webhooks successfully registered and verified active!');
}

registerAll();
