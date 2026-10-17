/**
 * 24/7 Serverless Telegram Bot Webhook for Cinema Ecosystem
 * Deployed directly on Cloudflare Pages global edge.
 * Runs 24/7 without needing a laptop or separate VPS.
 */

const BOT_TOKEN = "8887103348:AAHjlYSV1s8uFQ2x_6B--3FwNmvlL12GYvk";
const ADMIN_IDS = [1872734142];
const DEFAULT_WEB_URL = "https://cinema-dwh.pages.dev";

// Default enabled extensions (Prioritizing high-reliability providers first)
const DEFAULT_ENABLED_PROVIDERS = [
  "drive",
  "vega",
  "hdhub4u",
  "4khdhub",
  "movieBoxWeb",
  "autoEmbed"
];

const ALL_EXTENSIONS = [
  { name: "VegaMovies", value: "vega" },
  { name: "HdHub4u", value: "hdhub4u" },
  { name: "4kHdHub", value: "4khdhub" },
  { name: "MovieBox", value: "movieBoxWeb" },
  { name: "AutoEmbed", value: "autoEmbed" },
  { name: "MoviesDrive", value: "drive" },
  { name: "TopMovies", value: "topmovies" },
  { name: "MoviesMod", value: "moviesmod" },
  { name: "KatmovieHD", value: "katmoviehd" },
  { name: "KissKH (Anime/Asian)", value: "kisskh" },
  { name: "MultiStream", value: "multistream" },
  { name: "ModWorld", value: "modworld" },
  { name: "Bollyflix", value: "bollyflix" },
  { name: "UHDMovies", value: "uhd" },
  { name: "MoviesFlix", value: "moviesflix" },
  { name: "ExtraMovies", value: "extramovies" },
  { name: "GogoAnime", value: "gogoanime" },
  { name: "AnimePahe", value: "animepahe" },
  { name: "HiAnime", value: "hianime" },
  { name: "YTS", value: "yts" },
  { name: "TorrentGalaxy", value: "tgx" },
  { name: "1337x", value: "1337x" },
  { name: "ThePirateBay", value: "tpb" },
  { name: "FlixHQ", value: "flixhq" },
  { name: "Vidsrc", value: "vidsrc" },
  { name: "SmashyStream", value: "smashystream" },
  { name: "SuperStream", value: "superstream" },
  { name: "PrimeMirror", value: "primeMirror" },
  { name: "NetflixMirror", value: "netflixMirror" },
  { name: "DisneyMirror", value: "disneyMirror" },
  { name: "FilmClub", value: "filmclub" },
  { name: "Ringz", value: "ringz" },
  { name: "Showbox", value: "showbox" },
  { name: "CinemaTv", value: "cinematv" },
  { name: "Tokybook (Audiobooks)", value: "tokybook" },
  { name: "AudioBB", value: "audiobb" },
  { name: "GramCinema", value: "gramcinema" },
  { name: "OlaMovies", value: "olamovies" }
];

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

// Check for direct downloadable mirrors vs hotlink-protected stream links
function isRealDownloadLink(url) {
  if (!url || typeof url !== 'string') return false;
  const l = url.toLowerCase();
  if (l.includes('hakunaymatata.com') || l.includes('officialmoviebox.com') || l.includes('bcdnxw.')) {
    return false;
  }
  if (l.includes('.m3u8') || l.includes('.mpd') || l.includes('/hls/') || l.includes('/dash/')) {
    return false;
  }
  return (
    l.includes('drive.google.com') ||
    l.includes('pixeldrain.com') ||
    l.includes('r2.cloudflarestorage.com') ||
    l.includes('fastdl') ||
    l.includes('download') ||
    l.includes('hubdrive') ||
    l.includes('gdflix') ||
    l.includes('filebee') ||
    l.includes('droplink') ||
    l.endsWith('.mp4') ||
    l.endsWith('.mkv') ||
    l.endsWith('.zip')
  );
}

// Format compact mobile button label with Resolution, File Size & Audio
function formatQualityButtonLabel(rawTitle, defaultLabel = 'Option') {
  if (!rawTitle) return defaultLabel;
  const str = String(rawTitle);

  // 1. Extract resolution
  let res = '';
  if (/\b(2160p|4k|uhd)\b/i.test(str)) res = '4K UHD';
  else if (/\b1080p\b/i.test(str)) res = '1080p';
  else if (/\b720p\b/i.test(str)) res = '720p';
  else if (/\b480p\b/i.test(str)) res = '480p';

  // 2. Extract codec / source type
  let tech = '';
  if (/10bit/i.test(str)) tech = '10Bit';
  else if (/hevc|x265/i.test(str)) tech = 'HEVC';
  else if (/bluray/i.test(str)) tech = 'BluRay';
  else if (/web-?dl|webrip/i.test(str)) tech = 'WEB-DL';
  else if (/hdtc|cam|hqrip/i.test(str)) tech = 'Pre-HD';

  // 3. Extract file size (e.g. 1.8GB, 450MB, 2.4 GB)
  let size = '';
  const sizeMatch = str.match(/\b(\d+(?:\.\d+)?\s*(?:gb|mb))\b/i);
  if (sizeMatch) {
    size = sizeMatch[1].toUpperCase().replace(/\s+/, ' ');
  }

  // 4. Extract audio/language
  let audio = '';
  if (/dual\s*audio/i.test(str) || (/\bhindi\b/i.test(str) && /\benglish\b/i.test(str))) {
    audio = 'Dual Audio';
  } else if (/\bhindi\b/i.test(str)) {
    audio = 'Hindi';
  } else if (/\benglish\b/i.test(str)) {
    audio = 'English';
  } else if (/multi/i.test(str)) {
    audio = 'Multi';
  }

  const parts = [];
  if (res) parts.push(res);
  if (tech && !res.includes(tech)) parts.push(tech);
  const mainBadge = parts.join(' ') || defaultLabel;

  let label = `⚡ ${mainBadge}`;
  if (size) label += ` (${size})`;
  if (audio) label += ` • ${audio}`;

  if (label.length > 42) {
    label = label.slice(0, 41) + '…';
  }
  return label;
}

function formatEpisodeButtonLabel(rawTitle, epCount) {
  let title = rawTitle || 'Episodes';
  let res = '';
  if (/\b(480p|720p|1080p|4k)\b/i.test(title)) {
    res = title.match(/\b(480p|720p|1080p|4k)\b/i)[1].toUpperCase();
    if (/hevc|10bit/i.test(title)) res += ' HEVC';
  }
  let size = '';
  const sizeMatch = title.match(/\b(\d+(?:\.\d+)?\s*(?:gb|mb))\b/i);
  if (sizeMatch) size = ` (${sizeMatch[1].toUpperCase()})`;

  let label = `📺 ${res ? res + ' ' : ''}Episodes (${epCount} Ep)${size}`;
  if (label.length > 42) label = label.slice(0, 41) + '…';
  return label;
}

// Extract overall badges for item card header
function extractQualityBadges(title, linkList = []) {
  const allTexts = [title || ''];
  if (Array.isArray(linkList)) {
    for (const g of linkList) {
      if (g.title) allTexts.push(g.title);
      if (g.quality) allTexts.push(g.quality);
      if (Array.isArray(g.directLinks)) {
        for (const dl of g.directLinks.slice(0, 5)) {
          if (dl.title) allTexts.push(dl.title);
        }
      }
    }
  }
  const combined = allTexts.join(' ');

  const resolutions = [];
  if (/\b(480p)\b/i.test(combined)) resolutions.push('480p');
  if (/\b(720p)\b/i.test(combined)) {
    const isHevc = /hevc|10bit/i.test(combined);
    resolutions.push(isHevc ? '720p HEVC' : '720p');
  }
  if (/\b(1080p)\b/i.test(combined)) {
    const is10Bit = /10bit|fhd/i.test(combined);
    resolutions.push(is10Bit ? '1080p 10Bit' : '1080p');
  }
  if (/\b(2160p|4k|uhd)\b/i.test(combined)) resolutions.push('4K UHD');

  const sizes = [];
  const sizeMatches = combined.matchAll(/\b(\d+(?:\.\d+)?\s*(?:GB|MB))\b/gi);
  for (const m of sizeMatches) {
    const s = m[1].toUpperCase().replace(/\s+/, '');
    if (!sizes.includes(s) && sizes.length < 3) sizes.push(s);
  }

  let audio = 'Hindi + English';
  if (/dual\s*audio/i.test(combined)) audio = 'Dual Audio [Hin/Eng]';
  else if (/org\s*2\.0/i.test(combined) || /org\s*5\.1/i.test(combined)) audio = 'Hindi (ORG) + English';
  else if (/hindi\s*dub/i.test(combined)) audio = 'Hindi Dubbed';
  else if (/sub|english/i.test(combined) && !/hindi/i.test(combined)) audio = 'English Audio';

  let badgeStr = resolutions.join(' • ');
  if (!badgeStr) badgeStr = 'HD • 720p • 1080p';
  if (sizes.length > 0) {
    badgeStr += ` [${sizes.join(' | ')}]`;
  }

  return { resolutions: badgeStr, audio };
}

// Telegram API Helper
async function tgCall(token, method, payload = {}) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram API [${method}] error:`, err);
    return null;
  }
}

// D1 Database Link Storage
async function storeLink(db, provider, link, title) {
  const serialized = typeof link === 'string' ? link : JSON.stringify(link);
  const id = hashString(`${provider}:${title}:${serialized.slice(0, 100)}`);
  if (db) {
    try {
      await db.prepare(
        "INSERT OR REPLACE INTO bot_links (id, provider, link, title, created_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(id, provider, serialized, title, Date.now()).run();
    } catch (e) {
      console.warn("D1 storeLink error:", e.message);
    }
  }
  return id;
}

async function getStoredLink(db, id) {
  if (!db || !id) return null;
  try {
    const row = await db.prepare("SELECT provider, link, title FROM bot_links WHERE id = ?").bind(id).first();
    if (!row) return null;
    let link = row.link;
    if (typeof link === 'string' && (link.startsWith('[') || link.startsWith('{'))) {
      try { link = JSON.parse(link); } catch (_) {}
    }
    return { provider: row.provider, link, title: row.title };
  } catch (e) {
    console.warn("D1 getStoredLink error:", e.message);
    return null;
  }
}

// Enabled Providers configuration from D1
async function getEnabledProviders(db) {
  if (!db) return DEFAULT_ENABLED_PROVIDERS;
  try {
    const row = await db.prepare("SELECT value FROM config WHERE key = 'BOT_ENABLED_PROVIDERS'").first();
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return DEFAULT_ENABLED_PROVIDERS;
}

async function saveEnabledProviders(db, list) {
  if (!db) return;
  try {
    await db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES ('BOT_ENABLED_PROVIDERS', ?, ?)").bind(JSON.stringify(list), Date.now()).run();
  } catch (_) {}
}

const RUNNER_LINKS = {
  android_runner: "https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema-Runner.apk",
  android_app: "https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema.apk",
  windows: "https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema.Node.Runner.Setup.2.2.0.exe",
  linux: "https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema.Node.Runner-2.2.0.AppImage",
  mac: "https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema.Node.Runner-2.2.0-arm64.dmg"
};

const VLC_GUIDE_TEXT = `🚀 <b>Cinema Apps & 24/7 Node Runner</b>\n\n` +
  `Keep Cinema active 24/7 or stream ad-free across all devices:\n\n` +
  `📱 <b>Android:</b> <a href="${RUNNER_LINKS.android_runner}">Direct Runner APK (v2.2.1)</a> | <a href="${RUNNER_LINKS.android_app}">Cinema App APK</a>\n` +
  `🪟 <b>Windows:</b> <a href="${RUNNER_LINKS.windows}">Windows Setup (.exe)</a>\n` +
  `🐧 <b>Linux:</b> <a href="${RUNNER_LINKS.linux}">Linux AppImage</a>\n` +
  `🍏 <b>Mac:</b> <a href="${RUNNER_LINKS.mac}">macOS Apple Silicon (.dmg)</a>\n\n` +
  `<i>💡 Tap buttons below to get raw files directly inside Telegram!</i>`;

const VLC_GUIDE_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '📱 Send Runner APK', callback_data: 'send_file:android_runner' },
      { text: '📱 Send Cinema App', callback_data: 'send_file:android_app' }
    ],
    [
      { text: '🪟 Windows (.exe)', url: RUNNER_LINKS.windows },
      { text: '🐧 Linux (.AppImage)', url: RUNNER_LINKS.linux }
    ],
    [
      { text: '🍏 Mac (.dmg)', url: RUNNER_LINKS.mac },
      { text: '🌐 Web Downloads', url: `${DEFAULT_WEB_URL}/?tab=downloads` }
    ]
  ]
};

// Forward to Cinema API on the same domain
async function callCinemaApi(requestUrl, endpoint, params = {}) {
  const url = new URL(`/api${endpoint}`, requestUrl);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Cinema-Telegram-Bot/1.0" },
      signal: AbortSignal.timeout(18000)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`API Call [${endpoint}] error:`, err);
    return null;
  }
}

// Main Telegram Webhook Entry Point
export async function onRequestPost(context) {
  const { request, env } = context;
  const token = env?.BOT_TOKEN || BOT_TOKEN;
  const db = env?.cinema_db;

  try {
    const update = await request.json();

    // 1. Handle Messages
    if (update.message) {
      await handleMessage(update.message, token, db, request.url);
    }

    // 2. Handle Callback Queries (Button clicks)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query, token, db, request.url);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200, // Return 200 to Telegram so it doesn't repeatedly retry failing updates
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestGet() {
  return new Response("Cinema Telegram Webhook is Live (Cloudflare Edge 24/7)", {
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
}

// Message Router
async function handleMessage(msg, token, db, requestUrl) {
  const chatId = msg.chat?.id;
  const userId = msg.from?.id;
  const text = (msg.text || '').trim();
  if (!chatId || !text) return;

  const isAdmin = ADMIN_IDS.includes(userId);

  // /start command
  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const param = parts[1];

    if (param) {
      // Direct channel post click: p_<storeId>_<provKey>_<title>
      if (param.startsWith('p_')) {
        const payload = param.slice(2);
        const firstUnderscore = payload.indexOf('_');
        const secondUnderscore = payload.indexOf('_', firstUnderscore + 1);

        let storeId = payload;
        let provKey = null;
        let rawTitle = null;

        if (firstUnderscore > -1) {
          storeId = payload.slice(0, firstUnderscore);
          if (secondUnderscore > -1) {
            provKey = payload.slice(firstUnderscore + 1, secondUnderscore);
            rawTitle = decodeURIComponent(payload.slice(secondUnderscore + 1)).replace(/_/g, ' ');
          } else {
            provKey = payload.slice(firstUnderscore + 1);
          }
        }

        const item = await getStoredLink(db, storeId);
        if (item) {
          // DIRECTLY SHOW MEDIA FROM THIS EXACT EXTENSION
          return showItemDetails(chatId, item, token, db, requestUrl, null);
        }

        // Fallback: search exclusively on the extension that was clicked
        if (provKey && rawTitle) {
          await tgCall(token, 'sendMessage', {
            chat_id: chatId,
            text: `🔍 Finding <b>"${escapeHtml(rawTitle)}"</b> on <b>${escapeHtml(provKey)}</b>...`,
            parse_mode: 'HTML'
          });
          const dataRes = await callCinemaApi(requestUrl, '/search', { provider: provKey, q: rawTitle });
          const results = Array.isArray(dataRes) ? dataRes : [];
          if (results.length > 0) {
            return showItemDetails(chatId, results[0], token, db, requestUrl, null);
          }
          const formatted = await formatSearchResults(results, rawTitle, 1, db);
          return tgCall(token, 'sendMessage', {
            chat_id: chatId,
            text: formatted.text,
            parse_mode: 'HTML',
            reply_markup: formatted.keyboard
          });
        }
      }
    }

    const welcomeText = `🎬 <b>Welcome to Cinema Streaming!</b>\n\n` +
      `Stream and download movies & shows directly via VLC with zero buffering.\n\n` +
      `🔍 <b>Type any name</b> to search active extensions, or choose an option below:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔍 Search Movie / Show', switch_inline_query_current_chat: '' },
          { text: '🧩 Enabled Providers', callback_data: 'view_providers' }
        ],
        [
          { text: '📖 VLC & Download Guide', callback_data: 'vlc_guide' },
          { text: '🌐 Open Web App', url: DEFAULT_WEB_URL }
        ]
      ]
    };

    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: welcomeText,
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // /vlc or /guide
  if (text.startsWith('/vlc') || text.startsWith('/guide')) {
    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: VLC_GUIDE_TEXT,
      parse_mode: 'HTML',
      reply_markup: VLC_GUIDE_KEYBOARD
    });
  }

  // /runner or /apk or /app
  if (text.startsWith('/runner') || text.startsWith('/apk') || text.startsWith('/app')) {
    await tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: VLC_GUIDE_TEXT,
      parse_mode: 'HTML',
      reply_markup: VLC_GUIDE_KEYBOARD
    });
    return tgCall(token, 'sendDocument', {
      chat_id: chatId,
      document: RUNNER_LINKS.android_runner,
      caption: '⚡ <b>Cinema Node Runner APK (v2.2.1)</b>\n\nRaw installer file. Tap to install directly on Android!',
      parse_mode: 'HTML'
    });
  }

  // /providers
  if (text.startsWith('/providers')) {
    return showProvidersMenu(chatId, userId, token, db);
  }

  // /toggle <provider> (Admin Only)
  if (text.startsWith('/toggle')) {
    if (!isAdmin) {
      return tgCall(token, 'sendMessage', { chat_id: chatId, text: '⛔ Admin only command.' });
    }
    const provName = text.replace(/^\/toggle\s*/i, '').trim();
    if (!provName) {
      return tgCall(token, 'sendMessage', { chat_id: chatId, text: '⚠️ Example: <code>/toggle vega</code>', parse_mode: 'HTML' });
    }
    const enabled = await getEnabledProviders(db);
    const idx = enabled.indexOf(provName);
    if (idx >= 0) {
      enabled.splice(idx, 1);
      await saveEnabledProviders(db, enabled);
      return tgCall(token, 'sendMessage', { chat_id: chatId, text: `🔴 Disabled: <b>${escapeHtml(provName)}</b>`, parse_mode: 'HTML' });
    } else {
      enabled.push(provName);
      await saveEnabledProviders(db, enabled);
      return tgCall(token, 'sendMessage', { chat_id: chatId, text: `🟢 Enabled: <b>${escapeHtml(provName)}</b>`, parse_mode: 'HTML' });
    }
  }

  // /post_daily or /sync (Admin Only: Force check enabled extensions & post releases to channel)
  if (text.startsWith('/post_daily') || text.startsWith('/sync')) {
    if (!isAdmin) {
      return tgCall(token, 'sendMessage', { chat_id: chatId, text: '⛔ Admin only command.' });
    }
    await tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: '🚀 Checking active extensions and posting new releases & archive posts to channel...',
      parse_mode: 'HTML'
    });
    try {
      const { runAutoPoster } = await import('./auto-poster.js');
      const posterRes = await runAutoPoster({ cinema_db: db, BOT_TOKEN: token, CHANNEL_ID: '-1004363607477' }, requestUrl, true);
      const count = posterRes?.posted?.length || 0;
      let reply = `✅ <b>Posted ${count} release(s) to channel!</b>\n`;
      if (posterRes?.posted?.length > 0) {
        reply += posterRes.posted.map(p => `• 🎬 <b>${escapeHtml(p.title)}</b> [${escapeHtml(p.provider)}]`).join('\n');
      }
      if (posterRes?.errors?.length > 0) {
        reply += `\n⚠️ Notes: ${escapeHtml(posterRes.errors[0])}`;
      }
      return tgCall(token, 'sendMessage', { chat_id: chatId, text: reply, parse_mode: 'HTML' });
    } catch (e) {
      return tgCall(token, 'sendMessage', { chat_id: chatId, text: `❌ Failed to post: ${escapeHtml(e.message)}` });
    }
  }

  // /search <query> or Plain Text query
  let query = text;
  if (text.startsWith('/search')) {
    query = text.replace(/^\/search\s*/i, '').trim();
  }
  if (!query) return;

  const searchingRes = await tgCall(token, 'sendMessage', {
    chat_id: chatId,
    text: `🔍 Searching <b>"${escapeHtml(query)}"</b> across active extensions...`,
    parse_mode: 'HTML'
  });
  const searchMsgId = searchingRes?.result?.message_id;

  const enabled = await getEnabledProviders(db);
  let results = [];

  // 1. Try global-search first
  try {
    const data = await callCinemaApi(requestUrl, '/global-search', {
      q: query,
      providers: enabled.join(',')
    });
    if (Array.isArray(data) && data.length > 0) {
      results = data;
    }
  } catch (_) {}

  // 2. If global-search returned empty or was unsupported by runner, query active providers in parallel
  if (results.length === 0) {
    const searchTargets = enabled.slice(0, 8);
    const searches = searchTargets.map(prov =>
      callCinemaApi(requestUrl, '/search', { provider: prov, q: query })
        .then(res => (Array.isArray(res) ? res : []))
        .catch(() => [])
    );
    const allRes = await Promise.all(searches);
    const seen = new Set();
    for (const list of allRes) {
      for (const item of list) {
        if (item && item.link) {
          const key = `${item.provider || ''}::${item.link}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push(item);
          }
        }
      }
    }
  }

  const formatted = await formatSearchResults(results, query, 1, db);
  if (searchMsgId) {
    return tgCall(token, 'editMessageText', {
      chat_id: chatId,
      message_id: searchMsgId,
      text: formatted.text,
      parse_mode: 'HTML',
      reply_markup: formatted.keyboard
    });
  } else {
    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: formatted.text,
      parse_mode: 'HTML',
      reply_markup: formatted.keyboard
    });
  }
}

// Callback Query Handler (Inline Buttons)
async function handleCallbackQuery(cq, token, db, requestUrl) {
  const cqId = cq.id;
  const data = cq.data || '';
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  const userId = cq.from?.id;
  const isAdmin = ADMIN_IDS.includes(userId);

  if (data === 'noop') {
    return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId });
  }

  if (data === 'vlc_guide') {
    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId });
    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: VLC_GUIDE_TEXT,
      parse_mode: 'HTML',
      reply_markup: VLC_GUIDE_KEYBOARD
    });
  }

  if (data === 'view_providers') {
    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId });
    return showProvidersMenu(chatId, userId, token, db, messageId);
  }

  // Direct raw APK file push into chat
  if (data.startsWith('send_file:')) {
    const fileType = data.replace('send_file:', '');
    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Sending raw file directly into chat...' });
    const isApp = fileType === 'android_app';
    const docUrl = isApp ? RUNNER_LINKS.android_app : RUNNER_LINKS.android_runner;
    const caption = isApp
      ? '📱 <b>Cinema Mobile App APK</b>\n\nRaw installer file. Tap to install directly and stream ad-free!'
      : '⚡ <b>Cinema Node Runner APK (v2.2.1)</b>\n\nRaw installer file. Keeps background scrapers active 24/7 on Android!';
    return tgCall(token, 'sendDocument', {
      chat_id: chatId,
      document: docUrl,
      caption,
      parse_mode: 'HTML'
    });
  }

  // Toggle Provider from inline menu
  if (data.startsWith('prov_toggle:')) {
    if (!isAdmin) {
      return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Admin only.', show_alert: true });
    }
    const provKey = data.replace('prov_toggle:', '');
    const enabled = await getEnabledProviders(db);
    const idx = enabled.indexOf(provKey);
    if (idx >= 0) enabled.splice(idx, 1);
    else enabled.push(provKey);
    await saveEnabledProviders(db, enabled);
    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: `Updated ${provKey}` });
    return showProvidersMenu(chatId, userId, token, db, messageId);
  }

  // Movie item clicked from search results -> Open qualities as a NEW MESSAGE below
  if (data.startsWith('item:')) {
    const storeId = data.replace('item:', '');
    const item = await getStoredLink(db, storeId);
    if (!item) {
      return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Session expired. Search again.', show_alert: true });
    }
    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Fetching qualities...' });
    // Pass null for messageId so search results remain intact above!
    return showItemDetails(chatId, item, token, db, requestUrl, null, 1, storeId);
  }

  // Search Results Pagination: spage:<searchStoreId>:<page>
  if (data.startsWith('spage:')) {
    const parts = data.replace('spage:', '').split(':');
    const searchStoreId = parts[0];
    const page = parseInt(parts[1], 10) || 1;

    const storedSearch = await getStoredLink(db, searchStoreId);
    if (!storedSearch) {
      return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Session expired. Please search again.', show_alert: true });
    }
    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId });

    const results = Array.isArray(storedSearch.link) ? storedSearch.link : [];
    const formatted = await formatSearchResults(results, storedSearch.title, page, db, searchStoreId);
    return tgCall(token, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: formatted.text,
      parse_mode: 'HTML',
      reply_markup: formatted.keyboard
    });
  }

  // Switch Provider menu
  if (data.startsWith('swprov:')) {
    const query = data.replace('swprov:', '').trim();
    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId });
    const enabled = await getEnabledProviders(db);
    const keyboard = [];
    const chunkSize = 2;
    for (let i = 0; i < enabled.length; i += chunkSize) {
      const row = enabled.slice(i, i + chunkSize).map(p => ({
        text: `🔍 ${p}`,
        callback_data: `sprov:${query.slice(0, 20)}:${p}`
      }));
      keyboard.push(row);
    }
    keyboard.push([{ text: '🌐 Search on Cinema Web', url: `${DEFAULT_WEB_URL}/?search=${encodeURIComponent(query)}` }]);
    return tgCall(token, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: `🔄 <b>Select an Extension to search "${escapeHtml(query)}":</b>`,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Search single provider
  if (data.startsWith('sprov:')) {
    const parts = data.replace('sprov:', '').split(':');
    const query = parts[0];
    const prov = parts[1];
    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId });
    await tgCall(token, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: `🔍 Searching <b>"${escapeHtml(query)}"</b> on <b>${escapeHtml(prov)}</b>...`,
      parse_mode: 'HTML'
    });
    const dataRes = await callCinemaApi(requestUrl, '/search', { provider: prov, q: query });
    const results = Array.isArray(dataRes) ? dataRes : [];
    const formatted = await formatSearchResults(results, query, 1, db);
    return tgCall(token, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: formatted.text,
      parse_mode: 'HTML',
      reply_markup: formatted.keyboard
    });
  }

  // Quality Pagination: qpage:<itemStoreId>:<page>
  if (data.startsWith('qpage:')) {
    const parts = data.replace('qpage:', '').split(':');
    const itemStoreId = parts[0];
    const page = parseInt(parts[1], 10) || 1;
    const item = await getStoredLink(db, itemStoreId);
    if (!item) {
      return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Session expired. Search again.', show_alert: true });
    }
    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId });
    return showItemDetails(chatId, item, token, db, requestUrl, messageId, page, itemStoreId);
  }

  // Episodes Pagination: eps:<storeId> or epage:<storeId>:<page>
  if (data.startsWith('eps:') || data.startsWith('epage:')) {
    let epGroupStoreId;
    let page = 1;
    if (data.startsWith('epage:')) {
      const parts = data.replace('epage:', '').split(':');
      epGroupStoreId = parts[0];
      page = parseInt(parts[1], 10) || 1;
    } else {
      epGroupStoreId = data.replace('eps:', '');
    }

    const groupData = await getStoredLink(db, epGroupStoreId);
    if (!groupData) {
      return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Session expired.', show_alert: true });
    }
    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId });

    const episodes = Array.isArray(groupData.link) ? groupData.link : [];
    const pageSize = 18;
    const totalPages = Math.ceil(episodes.length / pageSize) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));

    let epText = `📺 <b>${escapeHtml(groupData.title)}</b>\n`;
    if (totalPages > 1) {
      epText += `📄 <b>Page ${currentPage} of ${totalPages}</b> (${episodes.length} Episodes)\n`;
    }
    epText += `\n<i>Select an Episode to Stream & Download:</i>`;

    const keyboard = [];
    const startIndex = (currentPage - 1) * pageSize;
    const pageEpisodes = episodes.slice(startIndex, startIndex + pageSize);

    for (let i = 0; i < pageEpisodes.length; i += 3) {
      const chunk = pageEpisodes.slice(i, i + 3);
      const row = [];
      for (let j = 0; j < chunk.length; j++) {
        const ep = chunk[j];
        const epNum = startIndex + i + j + 1;
        const epTitle = ep.title || `Episode ${epNum}`;
        const epStoreId = await storeLink(db, groupData.provider, ep.link, `${groupData.title} - ${epTitle}`);
        row.push({ text: `▶️ Ep ${epNum}`, callback_data: `resopt:${epStoreId}` });
      }
      keyboard.push(row);
    }

    if (totalPages > 1) {
      const navRow = [];
      if (currentPage > 1) {
        navRow.push({ text: '⬅️ Prev', callback_data: `epage:${epGroupStoreId}:${currentPage - 1}` });
      }
      navRow.push({ text: `Ep ${startIndex + 1}–${Math.min(startIndex + pageSize, episodes.length)}`, callback_data: 'noop' });
      if (currentPage < totalPages) {
        navRow.push({ text: 'Next ➡️', callback_data: `epage:${epGroupStoreId}:${currentPage + 1}` });
      }
      keyboard.push(navRow);
    }

    keyboard.push([{ text: '🌐 Open in Cinema Web', url: DEFAULT_WEB_URL }]);

    if (messageId && data.startsWith('epage:')) {
      return tgCall(token, 'editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: epText,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    }

    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: epText,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Quality or Episode Selected -> Extract Stream & Download Mirrors
  if (data.startsWith('resopt:')) {
    const qStoreId = data.replace('resopt:', '');
    const item = await getStoredLink(db, qStoreId);
    if (!item) {
      return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Session expired.', show_alert: true });
    }

    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Extracting mirrors...' });
    await tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: `⏳ Resolving high-speed mirrors for <b>"${escapeHtml(item.title)}"</b>...`,
      parse_mode: 'HTML'
    });

    let mirrors = await callCinemaApi(requestUrl, '/streams', { provider: item.provider, link: item.link, download: true });
    if (!mirrors || mirrors.length === 0) {
      mirrors = await callCinemaApi(requestUrl, '/streams', { provider: item.provider, link: item.link, download: false });
    }

    const uniqueMap = new Map();
    (mirrors || []).forEach(s => {
      const u = s.link || s.url;
      if (u && typeof u === 'string' && u.startsWith('http') && !uniqueMap.has(u)) {
        uniqueMap.set(u, s);
      }
    });

    const validMirrors = Array.from(uniqueMap.values());
    if (validMirrors.length === 0) {
      return tgCall(token, 'sendMessage', {
        chat_id: chatId,
        text: `⚠️ Could not extract streaming mirrors.\nTry choosing another quality option or switching providers.`,
        reply_markup: {
          inline_keyboard: [[{ text: '🔄 Switch Provider', callback_data: `swprov:${item.title.slice(0, 30)}` }]]
        }
      });
    }

    let resMsg = `🎬 <b>${escapeHtml(item.title)}</b>\n`;
    resMsg += `🌐 <b>Provider:</b> ${escapeHtml(item.provider)}\n\n`;
    resMsg += `<i>Tap below to stream directly in VLC or download verified files:</i>\n`;

    const keyboard = [];
    validMirrors.slice(0, 5).forEach((m, idx) => {
      const sName = m.server || `Mirror ${idx + 1}`;
      const url = m.link || m.url;
      const vlcRedirectUrl = `${DEFAULT_WEB_URL}/vlc/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(item.title)}`;

      keyboard.push([{ text: `🎬 Open in VLC Player (${sName})`, url: vlcRedirectUrl }]);
      if (isRealDownloadLink(url)) {
        keyboard.push([{ text: `⬇️ Direct Download (${sName})`, url: url }]);
      }
    });

    keyboard.push([
      { text: '🔄 Switch Provider', callback_data: `swprov:${item.title.slice(0, 30)}` },
      { text: '🌐 View on Web', url: DEFAULT_WEB_URL }
    ]);

    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: resMsg,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Catch-all
  return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId });
}

// Format Search Results with In-Place Pagination
async function formatSearchResults(results, query, page = 1, db, existingStoreId = null) {
  if (!results || results.length === 0) {
    return {
      text: `❌ No results found for <b>"${escapeHtml(query)}"</b> on active extensions.\n\n` +
        `<i>Try another keyword or switch extensions below:</i>`,
      keyboard: {
        inline_keyboard: [[{ text: '🔄 Switch Extension / Provider', callback_data: `swprov:${query.slice(0, 30)}` }]]
      }
    };
  }

  const pageSize = 8;
  const totalPages = Math.ceil(results.length / pageSize) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const searchStoreId = existingStoreId || (await storeLink(db, 'global', results, query));

  let text = `🔍 <b>Results for "${escapeHtml(query)}":</b>\n`;
  if (totalPages > 1) {
    text += `📄 <b>Page ${currentPage} of ${totalPages}</b> (${results.length} total matches)\n`;
  }
  text += `\n<i>Tap any title to view streaming qualities and episodes:</i>\n`;

  const keyboard = [];
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = results.slice(startIndex, startIndex + pageSize);

  for (let i = 0; i < pageItems.length; i++) {
    const item = pageItems[i];
    const prov = item.provider || 'default';
    const storeId = await storeLink(db, prov, item.link, item.title);
    const label = `🎬 ${item.title.slice(0, 34)}${item.title.length > 34 ? '…' : ''} [${prov}]`;
    keyboard.push([{ text: label, callback_data: `item:${storeId}` }]);
  }

  if (totalPages > 1) {
    const navRow = [];
    if (currentPage > 1) {
      navRow.push({ text: '⬅️ Prev', callback_data: `spage:${searchStoreId}:${currentPage - 1}` });
    }
    navRow.push({ text: `📄 ${currentPage}/${totalPages}`, callback_data: 'noop' });
    if (currentPage < totalPages) {
      navRow.push({ text: 'Next ➡️', callback_data: `spage:${searchStoreId}:${currentPage + 1}` });
    }
    keyboard.push(navRow);
  }

  keyboard.push([{ text: '🔄 Search on Another Extension', callback_data: `swprov:${query.slice(0, 30)}` }]);

  return { text, keyboard: { inline_keyboard: keyboard } };
}

// Show Item Qualities / Episodes (Mobile-Optimized Card)
async function showItemDetails(chatId, item, token, db, requestUrl, messageId = null, page = 1, itemStoreIdParam = null) {
  let meta = null;
  if (item.link) {
    meta = await callCinemaApi(requestUrl, '/meta', { provider: item.provider, link: item.link });
  }

  const rawGroups = meta?.linkList || meta?.downloadLinks || meta?.episodes || [];
  const { resolutions, audio } = extractQualityBadges(meta?.title || item.title, rawGroups);

  const yearStr = meta?.year ? ` (${meta.year})` : '';
  const ratingStr = meta?.rating ? `⭐ <b>Rating:</b> ${escapeHtml(meta.rating)}/10 • ` : '';
  const provDisplayName = item.providerName || (item.provider ? item.provider.toUpperCase() : 'CINEMA');

  let itemText = `🎬 <b>${escapeHtml(meta?.title || item.title)}${yearStr}</b>\n`;
  itemText += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  itemText += `${ratingStr}🌐 <b>Source:</b> <b>${escapeHtml(provDisplayName)}</b>\n`;
  itemText += `🔊 <b>Audio:</b> ${escapeHtml(audio)}\n`;
  itemText += `💿 <b>Releases:</b> <code>${escapeHtml(resolutions)}</code>\n`;
  if (meta?.synopsis) {
    let syn = meta.synopsis.trim();
    if (syn.length > 180) syn = syn.slice(0, 177) + '…';
    itemText += `\n📝 <i>${escapeHtml(syn)}</i>\n`;
  }
  itemText += `\n<i>Select Quality / Episode to Stream & Download:</i>`;

  const keyboard = [];

  if (rawGroups.length > 0) {
    const itemStoreId = itemStoreIdParam || (await storeLink(db, item.provider, item.link, item.title));
    const pageSize = 8;
    const totalPages = Math.ceil(rawGroups.length / pageSize) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = rawGroups.slice(startIndex, startIndex + pageSize);

    for (let i = 0; i < pageItems.length; i++) {
      const group = pageItems[i];
      const dLinks = group.directLinks || [];
      if (dLinks.length > 1) {
        const epGroupStoreId = await storeLink(db, item.provider, dLinks, `${item.title} - ${group.title || 'Episodes'}`);
        const label = formatEpisodeButtonLabel(group.title, dLinks.length);
        keyboard.push([{ text: label, callback_data: `eps:${epGroupStoreId}` }]);
      } else {
        const targetLink = dLinks[0]?.link || item.link;
        const qTitle = `${item.title} [${group.title || group.quality || `Quality ${startIndex + i + 1}`}]`;
        const qStoreId = await storeLink(db, item.provider, targetLink, qTitle);
        const label = formatQualityButtonLabel(group.title || group.quality, `Quality ${startIndex + i + 1}`);
        keyboard.push([{ text: label, callback_data: `resopt:${qStoreId}` }]);
      }
    }

    if (totalPages > 1) {
      const navRow = [];
      if (currentPage > 1) navRow.push({ text: '⬅️ Prev', callback_data: `qpage:${itemStoreId}:${currentPage - 1}` });
      navRow.push({ text: `Page ${currentPage}/${totalPages}`, callback_data: 'noop' });
      if (currentPage < totalPages) navRow.push({ text: 'Next ➡️', callback_data: `qpage:${itemStoreId}:${currentPage + 1}` });
      keyboard.push(navRow);
    }
  } else {
    const storeId = await storeLink(db, item.provider, item.link, item.title);
    keyboard.push([{ text: `▶️ Stream & Resolve Mirrors`, callback_data: `resopt:${storeId}` }]);
  }

  keyboard.push([
    { text: '🔄 Switch Extension', callback_data: `swprov:${(item.title || '').slice(0, 30)}` },
    { text: '🌐 Open Web Player', url: DEFAULT_WEB_URL }
  ]);

  if (messageId) {
    return tgCall(token, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: itemText,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  return tgCall(token, 'sendMessage', {
    chat_id: chatId,
    text: itemText,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard }
  });
}

// Providers Menu
async function showProvidersMenu(chatId, userId, token, db, messageId = null) {
  const isAdmin = ADMIN_IDS.includes(userId);
  const enabled = await getEnabledProviders(db);

  let text = `🧩 <b>Cinema Extensions & Scrapers (${ALL_EXTENSIONS.length} Total)</b>\n\n`;
  text += `🟢 = Enabled for searches | 🔴 = Disabled\n`;
  if (isAdmin) {
    text += `<i>👑 Admin: Tap any extension button below to toggle it on/off.</i>`;
  } else {
    text += `<i>Currently active extensions on Cinema.</i>`;
  }

  const keyboard = [];
  for (let i = 0; i < ALL_EXTENSIONS.length; i += 2) {
    const row = [];
    const p1 = ALL_EXTENSIONS[i];
    const isEn1 = enabled.includes(p1.value);
    row.push({
      text: `${isEn1 ? '🟢' : '🔴'} ${p1.name}`,
      callback_data: isAdmin ? `prov_toggle:${p1.value}` : 'noop'
    });

    if (i + 1 < ALL_EXTENSIONS.length) {
      const p2 = ALL_EXTENSIONS[i + 1];
      const isEn2 = enabled.includes(p2.value);
      row.push({
        text: `${isEn2 ? '🟢' : '🔴'} ${p2.name}`,
        callback_data: isAdmin ? `prov_toggle:${p2.value}` : 'noop'
      });
    }
    keyboard.push(row);
  }

  keyboard.push([{ text: '🌐 View on Cinema Web', url: DEFAULT_WEB_URL }]);

  if (messageId) {
    return tgCall(token, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  return tgCall(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard }
  });
}
