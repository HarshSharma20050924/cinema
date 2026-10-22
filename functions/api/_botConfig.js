/**
 * Telegram Bot Configuration & Provider Registry
 */

export const BOT_TOKEN = ""; // Configured via Cloudflare Pages environment variables (BOT_TOKEN)
export const ADMIN_IDS = [1872734142];
export const DEFAULT_WEB_URL = "https://cinema-dwh.pages.dev";

export const PROVIDER_BASE_URLS = {
  vega: 'https://new1.vegamovies.lease',
  vegamovies: 'https://new1.vegamovies.lease',
  drive: 'https://new3.moviesdrive.beer',
  moviesdrive: 'https://new3.moviesdrive.beer',
  moviesmod: 'https://moviesmod.uk.com',
  mod: 'https://moviesmod.uk.com',
  hdhub: 'https://new8.hdhub4u.cl',
  hdhub4u: 'https://new8.hdhub4u.cl',
  moviebox: 'https://officialmoviebox.com',
  movieboxweb: 'https://officialmoviebox.com',
  '4khdhub': 'https://4khdhub.one',
  kat: 'https://new.katmoviehd.top',
  katmovies: 'https://new.katmoviehd.top',
  katmoviehd: 'https://new.katmoviehd.top',
  multi: 'https://m1.multimovies.courses',
  multimovies: 'https://m1.multimovies.courses',
  topmovies: 'https://moviesleech.club',
  uhdmovies: 'https://uhdmovies.us.org',
  uhd: 'https://uhdmovies.us.org',
  cinemaluxe: 'https://cinemaluxe.one',
  extramovies: 'https://extramovies.ist',
  extra: 'https://extramovies.ist',
  bollyflix: 'https://bollyflix.vip',
  moviesflix: 'https://moviesflix.is',
  world4ufree: 'https://world4ufree.vet',
  world4u: 'https://world4ufree.vet',
  skymovieshd: 'https://skymovieshd.ink',
  luxmovies: 'https://luxmovies.link',
  eonmovies: 'https://eonmovies.ink',
  cinevood: 'https://1cinevood.lol',
  '1cinevood': 'https://1cinevood.lol',
  movies4u: 'https://movies4u.vip',
  netflixmirror: 'https://net52.cc',
  disneymirror: 'https://net52.cc',
  primemirror: 'https://net52.cc',
  castle: 'https://castletv.xyz',
  mxplayer: 'https://www.mxplayer.in',
  animeworld: 'https://animeworld.ac',
  animesalt: 'https://animesalt.cc',
  thepiratebay: 'https://thepiratebay.org',
  tpb: 'https://thepiratebay.org',
};

export function getDirectMovieUrl(provKey, link, defaultWebUrl) {
  if (link && (link.startsWith('http://') || link.startsWith('https://'))) {
    return link;
  }
  const base = PROVIDER_BASE_URLS[(provKey || '').toLowerCase()] || PROVIDER_BASE_URLS['hdhub4u'];
  if (base && link) {
    const cleanPath = link.startsWith('/') ? link : `/${link}`;
    return `${base.replace(/\/+$/, '')}${cleanPath}`;
  }
  return base || defaultWebUrl;
}

// Default enabled extensions (Prioritizing high-reliability providers first)
export const DEFAULT_ENABLED_PROVIDERS = [
  "drive",
  "vega",
  "hdhub4u",
  "4khdhub",
  "movieBoxWeb",
  "autoEmbed"
];

export const BOT_PROFILES = {
  // Cinema 4K Bot
  '8777878521:AAFY7HiuwOqIAId8BWrc2F0ejEYK4GML1gA': {
    key: '4k',
    name: 'Cinema 4K',
    username: 'Cinema4K_Ultra_813_bot',
    defaultProvider: '4khdhub',
    extensions: [
      { name: '4KHDHub', value: '4khdhub' },
      { name: 'UHDMovies', value: 'uhd' }
    ]
  },
  // Cinema OTT Series Bot
  '8920144104:AAHfAYWcZAat4yiesDZ3yU_8BAIEfNzrzPQ': {
    key: 'series',
    name: 'Cinema OTT & Series',
    username: 'CinemaOTT_Series_Bot',
    defaultProvider: 'netflixMirror',
    extensions: [
      { name: 'Netflix', value: 'netflixMirror' },
      { name: 'Disney+ Hotstar', value: 'disneyMirror' },
      { name: 'Prime Video', value: 'primeMirror' },
      { name: 'MovieBox', value: 'movieBoxWeb' },
      { name: 'MultiMovies', value: 'multi' }
    ]
  },
  // CinemaWood (Bollywood & Desi)
  '8760012910:AAF_KZe9G-_vsCMQ_Sa277tEjzN3zfgn_xc': {
    key: 'desi',
    name: 'CinemaWood',
    username: 'CinemaBollywood_Ultra_bot',
    defaultProvider: 'hdhub4u',
    extensions: [
      { name: 'HDHub4u', value: 'hdhub4u' },
      { name: 'VegaMovies', value: 'vega' },
      { name: 'MoviesDrive', value: 'drive' },
      { name: 'MoviesMod', value: 'moviesmod' },
      { name: 'Movies4u', value: 'movies4u' },
      { name: 'Castle', value: 'castle' },
      { name: 'MX Player', value: 'mxplayer' }
    ]
  },
  // Cinema Anime Bot
  '8580045392:AAGIXhweajJXCGVfL05o3xqJhw_6zNBRMm0': {
    key: 'anime',
    name: 'Cinema Anime',
    username: 'CinemaAnime_Ultra_bot',
    defaultProvider: 'animeworld',
    extensions: [
      { name: 'AnimeWorld', value: 'animeworld' },
      { name: 'AnimeSalt', value: 'animesalt' }
    ]
  },
  // Cinema Torrents Bot
  '8887103348:AAFYcYbWEm8adSF4fpLUcUliJKTmqGxvEe4': {
    key: 'torrent',
    name: 'Cinema Torrents',
    username: 'cinemaisherebtw_bot',
    defaultProvider: 'tpb',
    extensions: [
      { name: 'The Pirate Bay', value: 'tpb' }
    ]
  }
};

export function getBotProfile(token) {
  if (token && BOT_PROFILES[token]) {
    return BOT_PROFILES[token];
  }
  // Default fallback to CinemaWood
  return BOT_PROFILES['8760012910:AAF_KZe9G-_vsCMQ_Sa277tEjzN3zfgn_xc'];
}

export const RUNNER_LINKS = {
  android_runner: "https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema-Runner.apk",
  android_app: "https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema.apk",
  windows: "https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema.Node.Runner.Setup.2.2.0.exe",
  linux: "https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema.Node.Runner-2.2.0.AppImage",
  linux_deb: "https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema-Node-Runner.deb",
  mac: "https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema.Node.Runner-2.2.0-arm64.dmg"
};

export const TELEGRAM_APP_FILES = {
  android_runner: "BQACAgUAAxkDAAIBaWrTipCb-_-q012OEDifzt5NG4DEAAKeIQACokyZVixMVT8C3CLYPQQ",
  android_app: "BQACAgUAAxkDAAIBamrTisA9owxvz_qltfrVc6cu9BbOAAKfIQACokyZVhNpasclQJk_PQQ",
  web_app: "BQACAgUAAxkDAAIBa2rTismbICbMl7YhtQS-U3MdNRsEAAKgIQACokyZVpMnnRAIz3UOPQQ"
};

export const VLC_GUIDE_TEXT = `🚀 <b>Cinema Web App & 24/7 Node Runner</b>\n\n` +
  `Keep Cinema active 24/7 or stream ad-free across all devices:\n\n` +
  `🌐 <b>Cinema Web:</b> <a href="${DEFAULT_WEB_URL}">cinema-dwh.pages.dev</a>\n` +
  `📱 <b>Android:</b> <a href="${RUNNER_LINKS.android_runner}">Runner APK (v2.2.1)</a> | <a href="${RUNNER_LINKS.android_app}">Cinema App APK</a>\n` +
  `🪟 <b>Windows:</b> <a href="${RUNNER_LINKS.windows}">Windows Setup (.exe)</a>\n` +
  `🐧 <b>Linux:</b> <a href="${RUNNER_LINKS.linux_deb}">Debian/Ubuntu (.deb)</a> | <a href="${RUNNER_LINKS.linux}">AppImage</a>\n` +
  `🍏 <b>Mac:</b> <a href="${RUNNER_LINKS.mac}">macOS Apple Silicon (.dmg)</a>\n\n` +
  `<i>💡 Tap buttons below to get raw files instantly inside Telegram!</i>`;

export const VLC_GUIDE_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '⚡ Runner APK', callback_data: 'send_file:android_runner' },
      { text: '📱 Cinema App', callback_data: 'send_file:android_app' }
    ],
    [
      { text: '🪟 Windows (.exe)', url: RUNNER_LINKS.windows },
      { text: '🐧 Linux (.deb)', url: RUNNER_LINKS.linux_deb }
    ],
    [
      { text: '🍏 Mac (.dmg)', url: RUNNER_LINKS.mac },
      { text: '🌐 Web APK', callback_data: 'send_file:web_app' }
    ]
  ]
};

export const HELP_TEXT = `🤖 <b>Cinema Streaming Bot - Command Directory</b>\n\n` +
  `Here are all valid commands available on this bot:\n\n` +
  `• 🔍 <b>Search Content:</b> Just type any movie or show title (or <code>/search &lt;name&gt;</code>)\n` +
  `• ⚡ <b>/runner</b> or <b>/apk</b> or <b>/app</b>: Get instant Cinema APKs & Runners directly in chat\n` +
  `• 📖 <b>/vlc</b> or <b>/guide</b>: Setup VLC player handoff & buffer-free streaming guide\n` +
  `• 🧩 <b>/providers</b>: View all 30+ extensions and check enabled scrapers\n` +
  `• 🏠 <b>/start</b>: Launch main interactive menu and quick shortcuts\n` +
  `• ❓ <b>/help</b>: Show this complete command list\n\n` +
  `👑 <b>Admin Controls:</b>\n` +
  `• 🚀 <b>/post_daily</b> or <b>/sync</b>: Rapidly check extensions and post releases to channel\n` +
  `• 🔀 <b>/toggle &lt;name&gt;</b>: Enable or disable an extension (e.g. <code>/toggle vega</code>)\n` +
  `• 📌 <b>/pinvlc</b>: Pin VLC streaming guide to chat or channel`;

export const HELP_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '⚡ Runner APK', callback_data: 'send_file:android_runner' },
      { text: '📱 Cinema App', callback_data: 'send_file:android_app' }
    ],
    [
      { text: '🔍 Search Movie / Show', switch_inline_query_current_chat: '' },
      { text: '🧩 Extensions', callback_data: 'view_providers' }
    ],
    [
      { text: '📖 VLC Guide', callback_data: 'vlc_guide' },
      { text: '⚙️ Settings', callback_data: 'bot_settings' }
    ]
  ]
};
