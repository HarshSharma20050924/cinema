const { startBotPolling } = require('./bot.cjs');
const { startAutoPosterSchedule } = require('./autoPoster.cjs');
const { loadConfig } = require('./config.cjs');

async function main() {
  const cfg = loadConfig();
  console.log('==============================================');
  console.log('🚀 Starting Cinema Telegram Ecosystem');
  console.log(`🤖 Bot Username: @cinemaisherebtw_bot`);
  console.log(`📢 Channel ID: ${cfg.CHANNEL_ID}`);
  console.log(`👑 Admin IDs: ${cfg.ADMIN_IDS.join(', ')}`);
  console.log(`⚡ Cinema API: ${cfg.CINEMA_API}`);
  console.log(`🧩 Active Extensions: ${cfg.enabledProviders.join(', ')}`);
  console.log('==============================================');

  // 1. Start Auto Poster Schedule (runs every X hours)
  startAutoPosterSchedule();

  // 2. Start Bot Polling Loop
  startBotPolling();
}

main().catch((err) => {
  console.error('Fatal Telegram Bot error:', err);
  process.exit(1);
});
