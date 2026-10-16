const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'bot_settings.json');

const defaultConfig = {
  BOT_TOKEN: process.env.BOT_TOKEN || '8887103348:AAHjlYSV1s8uFQ2x_6B--3FwNmvlL12GYvk',
  CHANNEL_ID: process.env.CHANNEL_ID || '-1004363607477',
  ADMIN_IDS: [1872734142],
  CINEMA_API: process.env.CINEMA_API || 'https://cinema-dwh.pages.dev/api',
  WEB_URL: process.env.WEB_URL || 'https://cinema-dwh.pages.dev',
  TMDB_API_KEY: process.env.TMDB_API_KEY || 'cfe422613b250f702980a3bbf9e90716',
  // Interval for posting daily trending items (in hours)
  POSTING_INTERVAL_HOURS: 4,
  MAX_DAILY_POSTS: 4,
  // Providers configuration (user togglable via /toggle <provider>)
  enabledProviders: [
    'vega',
    'hdhub4u',
    '4khdhub',
    'movieBoxWeb',
    'autoEmbed',
    'drive'
  ]
};

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return { ...defaultConfig, ...data };
    } catch (e) {
      console.error('Error reading bot_settings.json, using defaults:', e.message);
    }
  }
  saveConfig(defaultConfig);
  return defaultConfig;
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save bot_settings.json:', e.message);
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  CONFIG_FILE
};
