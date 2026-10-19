/**
 * 24/7 Serverless Telegram Bot Webhook for Cinema Ecosystem
 * Deployed directly on Cloudflare Pages global edge.
 * Runs 24/7 without needing a laptop or separate VPS.
 */

const BOT_TOKEN = ""; // Configured via Cloudflare Pages environment variables (BOT_TOKEN)
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


function extractActualSeason(str) {
  if (!str) return null;
  const s = String(str);

  // 1. Direct prefix match (e.g. "Season 8 [ORG...]", "S07 1080p...") - not a range
  const startMatch = s.match(/^\s*(?:season\s*(\d{1,2})|s(\d{1,2}))\b(?!\s*[-+–—]\s*\d)/i);
  if (startMatch) return parseInt(startMatch[1] || startMatch[2], 10);

  // 2. Look for season marker after standard delimiters (e.g. " - Season 2", " | S3", " [Season 4]")
  const afterSepParts = s.split(/[-:|–—\[\]()]/).filter(Boolean);
  for (let i = afterSepParts.length - 1; i >= 0; i--) {
    const part = afterSepParts[i].trim();
    if (/1\s*[-+–—]\s*[2-9]/i.test(part) || /[1-9]\s*\+\s*[1-9]/i.test(part)) continue;
    const m = part.match(/\b(?:season\s*(\d{1,2})|s(\d{1,2}))\b/i);
    if (m) {
      return parseInt(m[1] || m[2], 10);
    }
  }

  // 3. Fallback: match all seasons, check if last one is not a range
  const allMatches = [...s.matchAll(/\b(?:season\s*(\d{1,2})|s(\d{1,2}))\b/gi)];
  if (allMatches.length === 1) {
    const m = allMatches[0];
    return parseInt(m[1] || m[2], 10);
  }
  if (allMatches.length > 1) {
    const last = allMatches[allMatches.length - 1];
    return parseInt(last[1] || last[2], 10);
  }
  return null;
}

// Clean raw scraped media titles by stripping garbage tags, codecs, audio info, and repetitive season ranges
function cleanMediaTitle(rawTitle) {
  if (!rawTitle) return '';
  const rawStr = String(rawTitle);

  // Extract Season badge to restore after cleaning (e.g. S1, Season 2, S1-S8)
  let seasonBadge = '';
  const rangeMatch = rawStr.match(/\b(?:season\s*(\d{1,2})\s*[-+–—]\s*(\d{1,2})|s(\d{1,2})\s*[-+–—]\s*s?(\d{1,2}))\b/i);
  if (rangeMatch) {
    const from = rangeMatch[1] || rangeMatch[3];
    const to = rangeMatch[2] || rangeMatch[4];
    seasonBadge = `(S${from}-S${to})`;
  } else {
    const singleMatch = rawStr.match(/\b(?:season\s*(\d{1,2})|s(\d{1,2}))\b/i);
    if (singleMatch) {
      const sNum = parseInt(singleMatch[1] || singleMatch[2], 10);
      if (sNum > 0) seasonBadge = `(Season ${sNum})`;
    }
  }

  let str = rawStr;

  // Strip leading emojis and symbols
  str = str.replace(/^[\s🎬📺📥⚡📦⬇️▶️]+/gu, '').trim();

  // Strip leading keywords
  str = str.replace(/^(?:download|watch(?:\s+online)?|stream)\s+/i, '').trim();

  // Strip age rating like [18+], (18+), [Adult]
  str = str.replace(/\[\s*18\+\s*\]|\(\s*18\+\s*\)|\[Adult\]/gi, '').trim();

  // Strip brackets with audio/codec info like {Hindi ORG 2.0...}, [Dual Audio], etc.
  str = str.replace(/\{[^}]*\}/g, ' ');
  str = str.replace(/\[\s*(?:dual\s*audio|hindi|eng|org|bluray|hevc|x264|x265|720p|1080p|480p|2160p|4k)[^\]]*\]/gi, ' ');

  // Cut off bulk season range patterns like "(Season 1 - 8)" or "Season 1-8"
  str = str.replace(/\((?:season\s*\d+\s*[-+–—]\s*\d+|seasons?\s*\d+[^)]*)\)/gi, ' ');
  str = str.replace(/\b(?:season\s*\d+\s*[-+–—]\s*\d+)\b/gi, ' ');

  // Stop at resolution list pattern like "480p | 720p | 1080p"
  str = str.split(/\b(?:480p|720p|1080p|2160p|4k)\s*[|•·–—-]/i)[0];

  // Stop at Dual Audio / Hindi Dubbed / Multi Audio keywords
  str = str.split(/\b(?:dual\s*audio|multi\s*audio|hindi\s*dubbed|org\s*2\.0|org\s*5\.1|multi\s*sub)\b/i)[0];

  // Stop at trailing resolutions (e.g. 1080p, 720p, 480p, 4k, 2160p)
  str = str.replace(/\b(?:480p|720p|1080p|2160p|4k|bluray|web-dl|webrip|hdrip)\b.*$/i, '');

  // Strip standalone language tags at end like "Hindi English", "Complete", "Hindi"
  str = str.replace(/\b(?:complete|hindi|english|telugu|tamil|malayalam|kannada)\b.*$/i, '');

  // Stop at Series / Movie keywords if used as delimiter
  str = str.replace(/\b(?:series|complete\s*series|all\s*episodes)\b/gi, ' ');

  // Clean trailing delimiters, dashes, pipes, bullet points, stray brackets
  str = str.replace(/[\s|·–—\-_:\]\[{}]+$/g, '').trim();

  // Clean double spaces
  str = str.replace(/\s{2,}/g, ' ').trim();

  // Restore season badge if not already present in cleaned string
  if (seasonBadge && !new RegExp(`\\b(season|s0*\\d)\\b`, 'i').test(str)) {
    str = `${str} ${seasonBadge}`;
  }

  // If title was stripped down too much, fallback to original sans leading emojis
  if (str.length < 2) {
    str = String(rawTitle).replace(/^[\s🎬📺📥⚡📦⬇️▶️]+/gu, '').trim();
    if (str.length > 50) str = str.slice(0, 47) + '…';
  }

  return str.trim();
}

// Smart Relevance Ranking for Search Results
function rankSearchResults(results, query) {
  if (!query || !Array.isArray(results) || results.length <= 1) return results;
  const cleanQ = query.toLowerCase().trim();
  const qWords = cleanQ.split(/\s+/).filter(Boolean);

  const getScore = (item) => {
    const rawTitle = (item.title || '').toLowerCase();
    const cleanT = cleanMediaTitle(rawTitle).toLowerCase();

    // 1. Exact match (e.g. "Rear Window")
    if (cleanT === cleanQ || rawTitle === cleanQ) return 1000;

    // 2. Starts with query (e.g. "Rear Window (1954)")
    if (cleanT.startsWith(cleanQ) || rawTitle.startsWith(cleanQ)) return 850;

    // 3. Contains exact query phrase (e.g. "[Hindi] Rear Window")
    if (cleanT.includes(cleanQ) || rawTitle.includes(cleanQ)) return 700;

    // 4. All query words present in title (e.g. both "rear" and "window")
    const allWords = qWords.every(w => cleanT.includes(w) || rawTitle.includes(w));
    if (allWords) {
      // Shorter title closer to query length gets higher priority
      const lengthPenalty = Math.abs(cleanT.length - cleanQ.length);
      return 500 - Math.min(lengthPenalty, 200);
    }

    // 5. Some query words present
    let matchedWords = 0;
    qWords.forEach(w => {
      if (cleanT.includes(w) || rawTitle.includes(w)) matchedWords++;
    });
    return matchedWords * 50;
  };

  return [...results].sort((a, b) => getScore(b) - getScore(a));
}

function extractCleanResolution(str) {
  if (!str) return '';
  const s = String(str);
  let res = '';
  if (/\b(2160p|4k|uhd)\b/i.test(s)) res = '4K';
  else if (/\b1080p\b/i.test(s)) res = '1080p';
  else if (/\b720p\b/i.test(s)) res = '720p';
  else if (/\b480p\b/i.test(s)) res = '480p';
  else if (/\b360p\b/i.test(s)) res = '360p';

  let codec = '';
  if (/hevc|10bit|x265/i.test(s)) codec = 'HEVC';

  let size = '';
  const sizeMatch = s.match(/\[?\b(\d+(?:\.\d+)?\s*(?:gb|mb)(?:\/[a-z]+)?)\b\]?/i);
  if (sizeMatch) size = sizeMatch[1].toUpperCase().replace(/\s+/, '');

  if (res && codec && !res.includes('HEVC')) res += ` ${codec}`;
  if (size) res += ` [${size}]`;
  return res;
}

// Cleanly format individual episode titles (e.g. "Game of Thrones • S8 Ep 1 [720p]")
function formatCleanEpisodeTitle(seriesTitle, groupTitle, epTitle, epNum) {
  const cleanSeries = cleanMediaTitle(seriesTitle) || 'Series';
  
  // Extract season number from groupTitle, epTitle, or seriesTitle
  const seasonNum = extractActualSeason(groupTitle) || extractActualSeason(epTitle) || extractActualSeason(seriesTitle) || 1;
  
  // Extract episode number
  let epNumber = epNum;
  if (!epNumber && epTitle) {
    const epMatch = String(epTitle).match(/(?:ep(?:isode)?\.?\s*|e)(\d{1,3})\b/i);
    if (epMatch) epNumber = parseInt(epMatch[1], 10);
  }
  const epStr = epNumber ? `Ep ${epNumber}` : (epTitle || 'Episode');

  // Extract clean resolution if present (e.g. 720p, 1080p, 4K, 480p)
  let res = '';
  const rMatch = (String(groupTitle || '') + ' ' + String(epTitle || '')).match(/\b(4k|2160p|1080p|720p|480p)\b/i);
  if (rMatch) {
    res = rMatch[1].toUpperCase();
    if (res === '2160P') res = '4K';
  }

  let formatted = `${cleanSeries} • S${seasonNum} ${epStr}`;
  if (res) formatted += ` [${res}]`;
  return formatted;
}

function formatPackButtonLabel(rawTitle, defaultLabel = 'Season Pack') {
  const str = String(rawTitle || defaultLabel);
  const seasonNum = extractActualSeason(str);
  const season = seasonNum !== null ? `S${seasonNum}` : '';

  let res = extractCleanResolution(str);
  const parts = [];
  if (season) parts.push(season);
  if (res) parts.push(res);
  else parts.push('Pack');

  let lbl = `📦 ${parts.join(' ')}`;
  if (lbl.length > 28) lbl = lbl.slice(0, 27) + '…';
  return lbl;
}

// Cleanly extract Resolution, Codec, File Size and Episode badge for compact mobile buttons
function formatQualityButtonLabel(rawTitle, defaultLabel = 'Option') {
  if (!rawTitle) return `⚡ ${defaultLabel}`;
  const str = String(rawTitle);

  // If this is a pack
  if (/(pack|zip|batch|complete\s*pack|all\s*episodes\s*pack)/i.test(str)) {
    return formatPackButtonLabel(str, defaultLabel);
  }

  // 1. Extract resolution (4K, 1080p, 720p, 480p, 360p)
  let res = '';
  if (/\b(2160p|4k|uhd)\b/i.test(str)) res = '4K';
  else if (/\b1080p\b/i.test(str)) res = '1080p';
  else if (/\b720p\b/i.test(str)) res = '720p';
  else if (/\b480p\b/i.test(str)) res = '480p';
  else if (/\b360p\b/i.test(str)) res = '360p';

  // 2. Extract codec / quality tag (HEVC, HQ-Rip, HQ, HDR, 10Bit)
  let tech = '';
  if (/hevc|x265|10bit/i.test(str)) tech = 'HEVC';
  else if (/hq[- ]?rip/i.test(str)) tech = 'HQ-Rip';
  else if (/\bhq\b/i.test(str) && !/hq-hdtc/i.test(str)) tech = 'HQ';
  else if (/hdr/i.test(str)) tech = 'HDR';

  // 3. Extract file size (e.g. [200MB/E], 470MB, 1.1GB, 7GB, 13.8GB, 450 MB)
  let size = '';
  const sizeMatch = str.match(/\[?\b(\d+(?:\.\d+)?\s*(?:gb|mb)(?:\/[a-z]+)?)\b\]?/i);
  if (sizeMatch) {
    size = sizeMatch[1].toUpperCase().replace(/\s+/, '');
  }

  const parts = [];
  if (res) parts.push(res);
  if (tech) parts.push(tech);

  const main = parts.join(' ');
  let lbl = '⚡ ' + (main || 'Quality');
  if (size) lbl += ` [${size}]`;

  if (!main && !size) {
    let clean = str.replace(/.*?\[/g, '[').trim();
    if (clean.length > 20) clean = clean.slice(-20).trim();
    lbl = '⚡ ' + (clean || defaultLabel);
  }

  if (lbl.length > 28) lbl = lbl.slice(0, 27) + '…';
  return lbl;
}

function formatEpisodeButtonLabel(rawTitle, epCount, rawQuality = '', groupIndex = 0) {
  const str = String(rawTitle || 'Episodes');
  const qStr = String(rawQuality || '');

  const isPack = /(pack|zip|batch|complete\s*pack|all\s*episodes\s*pack)/i.test(str) || qStr.toLowerCase() === 'pack';
  if (isPack) {
    return formatPackButtonLabel(str, `Season Pack ${groupIndex + 1}`);
  }

  const seasonNum = extractActualSeason(str) || extractActualSeason(qStr);
  const season = seasonNum !== null ? `S${seasonNum}` : '';

  // Priority for resolution: rawQuality first if valid, then after separator, then str
  let res = '';
  const qResMatch = qStr.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i);
  if (qResMatch) {
    res = qResMatch[1].toUpperCase();
    if (res === '2160P') res = '4K';
  } else {
    const afterSep = str.split(/[-:|–—\[\]()]/).filter(Boolean).pop() || '';
    const sepResMatch = afterSep.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i) || str.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i);
    if (sepResMatch) {
      res = sepResMatch[1].toUpperCase();
      if (res === '2160P') res = '4K';
    }
  }

  let codec = '';
  if (/hevc|10bit|x265/i.test(str) || /hevc|10bit|x265/i.test(qStr)) codec = 'HEVC';

  let lang = '';
  if (/dual\s*audio/i.test(str) || (/\bhindi\b/i.test(str) && /\benglish\b/i.test(str))) lang = 'Dual';
  else if (/hindi\s*dub|\bhindi\b/i.test(str)) lang = 'Hin';
  else if (/english|\boriginal\b/i.test(str)) lang = 'Orig';

  let size = '';
  const sizeMatch = str.match(/\[?\b(\d+(?:\.\d+)?\s*(?:gb|mb)(?:\/[a-z]+)?)\b\]?/i);
  if (sizeMatch) size = sizeMatch[1].toUpperCase().replace(/\s+/, '');

  const parts = [];
  if (season) parts.push(season);
  if (res) parts.push(res);
  if (codec && !res.includes('HEVC')) parts.push(codec);
  if (!season && !res && lang) parts.push(lang);

  const main = parts.join(' • ') || (season || (epCount > 0 ? `Eps` : `Quality ${groupIndex + 1}`));
  let lbl = `📺 ${main}`;
  if (size) lbl += ` [${size}]`;
  if (epCount > 0) lbl += ` (${epCount})`;
  if (lbl.length > 28) lbl = lbl.slice(0, 27) + '…';
  return lbl;
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
  if (!token) {
    console.error(`Telegram API [${method}] FAILED: No BOT_TOKEN found in env!`);
    return null;
  }
  const url = `https://api.telegram.org/bot${token}/${method}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) {
      console.error(`Telegram API [${method}] returned !ok:`, JSON.stringify(data));
    }
    return data;
  } catch (err) {
    console.error(`Telegram API [${method}] fetch error:`, err);
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
  linux_deb: "https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema-Node-Runner.deb",
  mac: "https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema.Node.Runner-2.2.0-arm64.dmg"
};

// Raw Telegram persistent file_ids uploaded directly to Telegram servers
const TELEGRAM_APP_FILES = {
  android_runner: "BQACAgUAAxkDAAIBaWrTipCb-_-q012OEDifzt5NG4DEAAKeIQACokyZVixMVT8C3CLYPQQ",
  android_app: "BQACAgUAAxkDAAIBamrTisA9owxvz_qltfrVc6cu9BbOAAKfIQACokyZVhNpasclQJk_PQQ",
  web_app: "BQACAgUAAxkDAAIBa2rTismbICbMl7YhtQS-U3MdNRsEAAKgIQACokyZVpMnnRAIz3UOPQQ"
};

const VLC_GUIDE_TEXT = `🚀 <b>Cinema Web App & 24/7 Node Runner</b>\n\n` +
  `Keep Cinema active 24/7 or stream ad-free across all devices:\n\n` +
  `🌐 <b>Cinema Web:</b> <a href="${DEFAULT_WEB_URL}">cinema-dwh.pages.dev</a>\n` +
  `📱 <b>Android:</b> <a href="${RUNNER_LINKS.android_runner}">Runner APK (v2.2.1)</a> | <a href="${RUNNER_LINKS.android_app}">Cinema App APK</a>\n` +
  `🪟 <b>Windows:</b> <a href="${RUNNER_LINKS.windows}">Windows Setup (.exe)</a>\n` +
  `🐧 <b>Linux:</b> <a href="${RUNNER_LINKS.linux_deb}">Debian/Ubuntu (.deb)</a> | <a href="${RUNNER_LINKS.linux}">AppImage</a>\n` +
  `🍏 <b>Mac:</b> <a href="${RUNNER_LINKS.mac}">macOS Apple Silicon (.dmg)</a>\n\n` +
  `<i>💡 Tap buttons below to get raw files instantly inside Telegram!</i>`;

const VLC_GUIDE_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '🌐 Cinema Web App', url: DEFAULT_WEB_URL },
      { text: '📱 Runner APK', callback_data: 'send_file:android_runner' }
    ],
    [
      { text: '📱 Cinema App', callback_data: 'send_file:android_app' },
      { text: '🌐 Web APK', callback_data: 'send_file:web_app' }
    ],
    [
      { text: '🪟 Windows (.exe)', url: RUNNER_LINKS.windows },
      { text: '🐧 Linux (.deb)', url: RUNNER_LINKS.linux_deb }
    ],
    [
      { text: '🍏 Mac (.dmg)', url: RUNNER_LINKS.mac },
      { text: '📥 Web Downloads', url: `${DEFAULT_WEB_URL}/?tab=downloads` }
    ]
  ]
};

const HELP_TEXT = `🤖 <b>Cinema Streaming Bot - Command Directory</b>\n\n` +
  `Here are all valid commands available on this bot:\n\n` +
  `• 🔍 <b>Search Content:</b> Just type any movie or show title (or <code>/search &lt;name&gt;</code>)\n` +
  `• 🌐 <b>/web</b>: Open Cinema Web tab directly (${DEFAULT_WEB_URL})\n` +
  `• ⚡ <b>/runner</b> or <b>/apk</b> or <b>/app</b>: Get instant Cinema APKs & Runners directly in chat\n` +
  `• 📖 <b>/vlc</b> or <b>/guide</b>: Setup VLC player handoff & buffer-free streaming guide\n` +
  `• 🧩 <b>/providers</b>: View all 30+ extensions and check enabled scrapers\n` +
  `• 🏠 <b>/start</b>: Launch main interactive menu and quick shortcuts\n` +
  `• ❓ <b>/help</b>: Show this complete command list\n\n` +
  `👑 <b>Admin Controls:</b>\n` +
  `• 🚀 <b>/post_daily</b> or <b>/sync</b>: Rapidly check extensions and post releases to channel\n` +
  `• 🔀 <b>/toggle &lt;name&gt;</b>: Enable or disable an extension (e.g. <code>/toggle vega</code>)\n` +
  `• 📌 <b>/pinvlc</b>: Pin VLC streaming guide to chat or channel`;

const HELP_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '🌐 Cinema Web', url: DEFAULT_WEB_URL },
      { text: '⚡ Runner APK', callback_data: 'send_file:android_runner' }
    ],
    [
      { text: '🔍 Search Movie / Show', switch_inline_query_current_chat: '' },
      { text: '🧩 Extensions', callback_data: 'view_providers' }
    ],
    [
      { text: '📖 VLC Guide', callback_data: 'vlc_guide' },
      { text: '📱 Cinema App', callback_data: 'send_file:android_app' }
    ]
  ]
};

const PRIMARY_RENDER_BACKEND = "https://cinema-4h7t.onrender.com";
let currentDb = null;

async function getCandidateBackends(db) {
  const candidates = [];
  if (db) {
    try {
      const urlRow = await db.prepare("SELECT value FROM config WHERE key = 'BACKEND_URL'").first();
      if (urlRow?.value && /^https?:\/\//i.test(urlRow.value) && !urlRow.value.includes('pages.dev')) {
        candidates.push(urlRow.value.replace(/\/+$/, ''));
      }
      const poolRow = await db.prepare("SELECT value FROM config WHERE key = 'BACKEND_POOL'").first();
      if (poolRow?.value) {
        const pool = JSON.parse(poolRow.value);
        if (Array.isArray(pool)) {
          const now = Date.now();
          for (const item of pool) {
            const isFresh = !item.lastSeen || (now - item.lastSeen < 180000);
            const u = typeof item === 'string' ? item : item?.url;
            if (isFresh && u && /^https?:\/\//i.test(u) && !u.includes('pages.dev')) {
              const clean = u.replace(/\/+$/, '');
              if (!candidates.includes(clean)) candidates.push(clean);
            }
          }
        }
      }
    } catch (_) {}
  }
  if (!candidates.includes(PRIMARY_RENDER_BACKEND)) {
    candidates.push(PRIMARY_RENDER_BACKEND);
  }
  return candidates;
}

// Forward to active Cinema Backend Nodes with automatic cluster failover
async function callCinemaApi(requestUrl, endpoint, params = {}) {
  const candidates = await getCandidateBackends(currentDb);
  let lastError = null;

  for (const base of candidates) {
    try {
      const url = new URL(`/api${endpoint}`, base);
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
          url.searchParams.set(k, val);
        }
      });

      const controller = new AbortController();
      const isSlowEndpoint = endpoint.includes('/streams') || endpoint.includes('/search') || endpoint.includes('/meta');
      const timeoutMs = isSlowEndpoint ? 35000 : 12000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url.toString(), {
        headers: { "User-Agent": "Cinema-Telegram-Bot/1.0", "Accept": "application/json" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {
      lastError = err;
    }
  }

  console.error(`callCinemaApi [${endpoint}] all candidates failed:`, lastError ? lastError.message : 'Nodes exhausted');
  return null;
}

// Main Telegram Webhook Entry Point
export async function onRequestPost(context) {
  const { request, env } = context;
  const token = env?.BOT_TOKEN || BOT_TOKEN;
  const db = env?.cinema_db;
  currentDb = db;

  if (!token) {
    console.error("FATAL: Webhook received update but env.BOT_TOKEN is missing!");
    return new Response(JSON.stringify({ error: "BOT_TOKEN not configured in env" }), {
      status: 200, // Return 200 to prevent Telegram retry storm while diagnosing
      headers: { "Content-Type": "application/json" }
    });
  }

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

export async function onRequestGet(context) {
  const { env } = context || {};
  const tok = env?.BOT_TOKEN || BOT_TOKEN;
  const db = env?.cinema_db ? 'CONNECTED' : 'MISSING';
  const status = tok ? `OK (Prefix: ${tok.slice(0, 8)}...)` : 'MISSING';
  return new Response(`Cinema Telegram Webhook is Live (Cloudflare Edge 24/7)\nBOT_TOKEN: ${status}\nDATABASE: ${db}\n`, {
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

        // Provide instant interactive loading feedback to the user
        await tgCall(token, 'sendChatAction', { chat_id: chatId, action: 'upload_photo' });
        const loadingMsgRes = await tgCall(token, 'sendMessage', {
          chat_id: chatId,
          text: `⏳ Loading media details from <b>${escapeHtml(provKey || 'extension')}</b>...`,
          parse_mode: 'HTML'
        });
        const loadingMsgId = loadingMsgRes?.result?.message_id;

        const item = await getStoredLink(db, storeId);
        if (item) {
          if (loadingMsgId) {
            tgCall(token, 'deleteMessage', { chat_id: chatId, message_id: loadingMsgId }).catch(() => {});
          }
          // DIRECTLY SHOW MEDIA FROM THIS EXACT EXTENSION WITH POSTER
          return showItemDetails(chatId, item, token, db, requestUrl, null);
        }

        // Fallback: search exclusively on the extension that was clicked
        if (provKey && rawTitle) {
          if (loadingMsgId) {
            await tgCall(token, 'editMessageText', {
              chat_id: chatId,
              message_id: loadingMsgId,
              text: `🔍 Fetching <b>"${escapeHtml(rawTitle)}"</b> on <b>${escapeHtml(provKey)}</b>...`,
              parse_mode: 'HTML'
            });
          }
          const dataRes = await callCinemaApi(requestUrl, '/search', { provider: provKey, q: rawTitle });
          const results = Array.isArray(dataRes) ? dataRes : [];
          if (results.length > 0) {
            if (loadingMsgId) {
              tgCall(token, 'deleteMessage', { chat_id: chatId, message_id: loadingMsgId }).catch(() => {});
            }
            return showItemDetails(chatId, results[0], token, db, requestUrl, null);
          }
          const formatted = await formatSearchResults(results, rawTitle, 1, db);
          if (loadingMsgId) {
            return tgCall(token, 'editMessageText', {
              chat_id: chatId,
              message_id: loadingMsgId,
              text: formatted.text,
              parse_mode: 'HTML',
              reply_markup: formatted.keyboard
            });
          }
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
          { text: '❓ Help & Commands', callback_data: 'help_guide' }
        ],
        [
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

  // /help command
  if (text.startsWith('/help') || text === 'help') {
    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: HELP_TEXT,
      parse_mode: 'HTML',
      reply_markup: HELP_KEYBOARD
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

  // /web command
  if (text.startsWith('/web') || text === 'web') {
    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: `🌐 <b>Cinema Web App:</b> <a href="${DEFAULT_WEB_URL}">${DEFAULT_WEB_URL}</a>\n\nStream movies & series 100% ad-free directly in your browser!`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🌐 Open Cinema Web', url: DEFAULT_WEB_URL },
            { text: '📱 Runner APK', callback_data: 'send_file:android_runner' }
          ]
        ]
      }
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
      document: TELEGRAM_APP_FILES.android_runner || RUNNER_LINKS.android_runner,
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

  const ranked = rankSearchResults(results, query);
  const formatted = await formatSearchResults(ranked, query, 1, db);
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

  if (data === 'help_guide') {
    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId });
    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: HELP_TEXT,
      parse_mode: 'HTML',
      reply_markup: HELP_KEYBOARD
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
    
    let fileDoc = TELEGRAM_APP_FILES[fileType] || RUNNER_LINKS[fileType];
    let caption = '⚡ <b>Cinema Node Runner APK (v2.2.1)</b>\n\nRaw installer file. Keeps background scrapers active 24/7 on Android!';
    
    if (fileType === 'android_app') {
      fileDoc = TELEGRAM_APP_FILES.android_app || RUNNER_LINKS.android_app;
      caption = '📱 <b>Cinema Mobile App APK</b>\n\nRaw installer file. Tap to install directly and stream ad-free!';
    } else if (fileType === 'web_app') {
      fileDoc = TELEGRAM_APP_FILES.web_app;
      caption = '🌐 <b>Cinema Web App APK</b>\n\nDirect progressive web container for Android!';
    }

    return tgCall(token, 'sendDocument', {
      chat_id: chatId,
      document: fileDoc,
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
    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId });
    await tgCall(token, 'sendChatAction', { chat_id: chatId, action: 'upload_photo' });

    const cleanTitle = cleanMediaTitle(item.title);
    const loadMsg = await tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: `⚡ <b>Fetching Media Details...</b>\n` +
            `🎬 <b>${escapeHtml(cleanTitle)}</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `⏳ <code>[▰▰▰▰▰▱▱▱▱▱] Loading...</code>\n` +
            `🔍 <i>Retrieving seasons, episodes & available qualities...</i>`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '⏳ Loading media details...', callback_data: 'noop' }]]
      }
    });
    const loadMsgId = loadMsg?.result?.message_id;

    // Pass loadMsgId so showItemDetails deletes it smoothly once the photo card arrives
    return showItemDetails(chatId, item, token, db, requestUrl, null, 1, storeId, loadMsgId);
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
    const ranked = rankSearchResults(results, query);
    const formatted = await formatSearchResults(ranked, query, 1, db);
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

    const groupDataObj = typeof groupData.link === 'object' && !Array.isArray(groupData.link) ? groupData.link : null;
    const episodes = Array.isArray(groupData.link) ? groupData.link : (groupDataObj?.episodes || []);
    const allGroups = groupDataObj?.allGroups || [];
    const seriesTitle = groupDataObj?.seriesTitle || groupData.title;
    const groupSubTitle = groupDataObj?.groupTitle || '';

    const pageSize = 18;
    const totalPages = Math.ceil(episodes.length / pageSize) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));

    const cleanSeries = cleanMediaTitle(seriesTitle);
    const seasonNum = extractActualSeason(groupSubTitle) || extractActualSeason(groupData.title);
    const resLabel = extractCleanResolution(groupSubTitle);

    let epHeader = cleanSeries;
    if (seasonNum) epHeader += ` • Season ${seasonNum}`;
    if (resLabel) epHeader += ` [${resLabel}]`;

    let epText = `📺 <b>${escapeHtml(epHeader)}</b>\n`;
    if (totalPages > 1) {
      epText += `📄 <b>Page ${currentPage} of ${totalPages}</b> (${episodes.length} Episodes)\n`;
    }
    epText += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    epText += `<i>Select an Episode to stream or download:</i>`;

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

        const cleanEpTitle = formatCleanEpisodeTitle(seriesTitle, groupSubTitle || groupData.title, epTitle, epNum);
        const epStoreId = await storeLink(db, groupData.provider, ep.link, cleanEpTitle);
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

  // Episode Quality Picker (epq:<epqStoreId>)
  if (data.startsWith('epq:')) {
    const epqStoreId = data.replace('epq:', '');
    const epqData = await getStoredLink(db, epqStoreId);
    if (!epqData) {
      return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Session expired.', show_alert: true });
    }
    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId });

    const info = epqData.link || {};
    const qualities = info.qualities || [];
    const epNum = info.epNum || 1;
    const seriesTitle = info.seriesTitle || epqData.title;

    let qText = `📺 <b>${escapeHtml(seriesTitle)} - Episode ${epNum}</b>\n\n`;
    qText += `<i>Select your preferred resolution/quality for this episode:</i>\n`;

    const keyboard = [];
    const qButtons = [];
    for (const q of qualities) {
      const qStoreId = await storeLink(db, epqData.provider, q.link, q.title);
      const cleanLabel = extractCleanResolution(q.quality) || formatQualityButtonLabel(q.quality, 'Stream');
      const label = cleanLabel.startsWith('⚡') ? cleanLabel : `⚡ ${cleanLabel}`;
      qButtons.push({ text: label, callback_data: `resopt:${qStoreId}` });
    }

    // Group into 2 buttons per row for mobile
    for (let i = 0; i < qButtons.length; i += 2) {
      keyboard.push(qButtons.slice(i, i + 2));
    }

    keyboard.push([{ text: '🌐 Open in Cinema Web', url: DEFAULT_WEB_URL }]);

    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: qText,
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

    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId });
    await tgCall(token, 'sendChatAction', { chat_id: chatId, action: 'upload_document' });

    const cleanTitle = cleanMediaTitle(item.title);
    const initialLoader = `⚡ <b>Resolving Stream Mirrors...</b>\n` +
      `🎬 <b>${escapeHtml(cleanTitle)}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⏳ <code>[▰▰▰▰▰▱▱▱▱▱] Connecting (50%)...</code>\n` +
      `📡 <i>Searching high-speed cloud mirrors & bypasses...</i>`;

    const waitMsg = await tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: initialLoader,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '⏳ Extracting Streams... Please Wait', callback_data: 'noop' }]]
      }
    });
    const waitMsgId = waitMsg?.result?.message_id;

    // Start extraction with robust timeout and fallback (try stream first, then download)
    const fetchPromise = (async () => {
      const mediaType = item.type || (/episode|season|\bs\d+/i.test(item.title) ? 'series' : 'movie');
      let targetLink = item.link;
      if (typeof targetLink === 'object' && targetLink !== null) {
        targetLink = JSON.stringify(targetLink);
      }
      let m = await callCinemaApi(requestUrl, '/streams', { provider: item.provider, link: targetLink, type: mediaType, download: false });
      if (!m || m.length === 0) {
        m = await callCinemaApi(requestUrl, '/streams', { provider: item.provider, link: targetLink, type: mediaType, download: true });
      }
      return m;
    })();

    // Dynamic animated stage 2 if extraction takes > 1.4s
    const timerPromise = new Promise(resolve => setTimeout(resolve, 1400));
    const raceRes = await Promise.race([
      fetchPromise.then(res => ({ done: true, res })),
      timerPromise.then(() => ({ done: false }))
    ]);

    if (!raceRes.done && waitMsgId) {
      await tgCall(token, 'sendChatAction', { chat_id: chatId, action: 'upload_document' });
      await tgCall(token, 'editMessageText', {
        chat_id: chatId,
        message_id: waitMsgId,
        text: `⚡ <b>Bypassing Cloud Gates & Verifying Mirrors...</b>\n` +
          `🎬 <b>${escapeHtml(cleanTitle)}</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `⏳ <code>[▰▰▰▰▰▰▰▰▱▱] Decrypting Cloud Mirrors (85%)...</code>\n` +
          `🚀 <i>Direct stream links found. Finalizing player handoffs...</i>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '⚡ Connecting to Stream Nodes...', callback_data: 'noop' }]]
        }
      });
    }

    const mirrors = raceRes.done ? raceRes.res : await fetchPromise;

    const uniqueMap = new Map();
    (mirrors || []).forEach(s => {
      const u = s.link || s.url;
      if (u && typeof u === 'string' && u.startsWith('http') && !uniqueMap.has(u)) {
        uniqueMap.set(u, s);
      }
    });

    const validMirrors = Array.from(uniqueMap.values());

    if (validMirrors.length === 0) {
      const errText = `⚠️ <b>Could not extract streaming mirrors.</b>\n\n` +
            `🎬 <b>${escapeHtml(cleanTitle)}</b>\n` +
            `<i>Cloud nodes were slow or link was blocked.</i>\n\n` +
            `Please <b>tap again on the episode to retry</b>, or choose another extension below:`;
      const errMarkup = {
        inline_keyboard: [
          [
            { text: '🔁 Tap Again to Retry', callback_data: `resopt:${qStoreId}` },
            { text: '🔄 Switch Extension', callback_data: `swprov:${(cleanTitle || '').slice(0, 30)}` }
          ]
        ]
      };

      if (waitMsgId) {
        return tgCall(token, 'editMessageText', {
          chat_id: chatId,
          message_id: waitMsgId,
          text: errText,
          parse_mode: 'HTML',
          reply_markup: errMarkup
        });
      }
      return tgCall(token, 'sendMessage', {
        chat_id: chatId,
        text: errText,
        parse_mode: 'HTML',
        reply_markup: errMarkup
      });
    }

    let resMsg = `🎬 <b>${escapeHtml(cleanTitle)}</b>\n`;
    resMsg += `🌐 <b>Source:</b> <b>${escapeHtml(item.provider ? item.provider.toUpperCase() : 'CINEMA')}</b>\n`;
    resMsg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    resMsg += `<i>Tap below to stream directly in VLC or download:</i>\n`;

    // Deduplicate mirrors and pair VLC + Download symmetrically
    const uniqueMirrors = [];
    const seenDedupe = new Set();
    const seenNames = new Set();

    validMirrors.forEach((m) => {
      const url = m.link || m.url;
      if (!url || typeof url !== 'string' || !url.startsWith('http')) return;

      // Deduplicate Pixeldrain / GDrive tokens so there are no duplicate buttons
      let dedupeKey = url;
      if (url.includes('pixeldrain.com') || url.includes('pixeldrain.dev')) {
        const pdId = url.split('/file/')[1]?.split('?')[0] || url.split('/u/')[1]?.split('?')[0];
        if (pdId) dedupeKey = `pixeldrain:${pdId}`;
      } else if (url.includes('drive.google.com') || url.includes('googleusercontent')) {
        const gdId = url.match(/[-\w]{25,}/)?.[0];
        if (gdId) dedupeKey = `gdrive:${gdId}`;
      }

      if (seenDedupe.has(dedupeKey)) return;
      seenDedupe.add(dedupeKey);

      let rawServer = (m.server || 'Direct Mirror').trim();
      let sName = rawServer.replace(/\s*\(download\s*only\)/i, '').replace(/^Server\s*/i, '').trim();
      if (!sName || sName.toLowerCase() === 'mirror') sName = 'Cloud Mirror';
      sName = sName.slice(0, 12);

      if (seenNames.has(sName)) {
        sName = `${sName} ${uniqueMirrors.length + 1}`;
      }
      seenNames.add(sName);

      uniqueMirrors.push({
        sName,
        url,
        server: m.server
      });
    });

    const keyboard = [];
    uniqueMirrors.slice(0, 4).forEach((m) => {
      const vlcRedirectUrl = `${DEFAULT_WEB_URL}/vlc/?url=${encodeURIComponent(m.url)}&title=${encodeURIComponent(cleanTitle)}`;
      let dlUrl = m.url;
      if (dlUrl.includes('pixeldrain.dev/api/file/') || dlUrl.includes('pixeldrain.com/api/file/')) {
        const t = dlUrl.split('/file/')[1]?.split('?')[0];
        if (t) dlUrl = `https://pixeldrain.com/u/${t}`;
      }

      // Always pair VLC and Download together symmetrically in the same row!
      keyboard.push([
        { text: `🎬 VLC (${m.sName})`, url: vlcRedirectUrl },
        { text: `⬇️ Download (${m.sName})`, url: dlUrl }
      ]);
    });

    keyboard.push([
      { text: '🌐 Cinema Web', url: DEFAULT_WEB_URL },
      { text: '🔄 Switch Extension', callback_data: `swprov:${(cleanTitle || '').slice(0, 30)}` }
    ]);

    if (waitMsgId) {
      return tgCall(token, 'editMessageText', {
        chat_id: chatId,
        message_id: waitMsgId,
        text: resMsg,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    }

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
    const clean = cleanMediaTitle(item.title);
    const label = `🎬 ${clean.slice(0, 32)}${clean.length > 32 ? '…' : ''} [${prov}]`;
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

// Show Item Qualities / Episodes (Mobile-Optimized Card with Poster)
async function showItemDetails(chatId, item, token, db, requestUrl, messageId = null, page = 1, itemStoreIdParam = null, loadMsgId = null) {
  let meta = null;
  const itemLinkObj = typeof item.link === 'object' && !Array.isArray(item.link) ? item.link : null;
  const actualLink = itemLinkObj?.url || (typeof item.link === 'string' ? item.link : null);

  if (itemLinkObj?.cachedMeta) {
    meta = itemLinkObj.cachedMeta;
  } else if (actualLink) {
    meta = await callCinemaApi(requestUrl, '/meta', { provider: item.provider, link: actualLink });
  }

  const rawGroups = meta?.linkList || meta?.downloadLinks || meta?.episodes || [];
  const { resolutions, audio } = extractQualityBadges(meta?.title || item.title, rawGroups);

  const cleanTitle = cleanMediaTitle(meta?.title || item.title);
  const yearStr = meta?.year ? ` (${meta.year})` : '';
  const ratingStr = meta?.rating ? `⭐ <b>Rating:</b> ${escapeHtml(meta.rating)}/10 • ` : '';
  const provDisplayName = item.providerName || (item.provider ? item.provider.toUpperCase() : 'CINEMA');
  const posterUrl = meta?.poster || meta?.image || item.image || item.poster || null;

  let itemText = `🎬 <b>${escapeHtml(cleanTitle)}${yearStr}</b>\n`;
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
    const itemStoreId = itemStoreIdParam || (await storeLink(db, item.provider, {
      url: actualLink,
      cachedMeta: meta
    }, item.title));
    const pageSize = 8;
    const totalPages = Math.ceil(rawGroups.length / pageSize) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = rawGroups.slice(startIndex, startIndex + pageSize);

    // Render quality / episode batches in compact mobile rows (up to 2 per row)
    const rowBatch = [];
    for (let i = 0; i < pageItems.length; i++) {
      const group = pageItems[i];
      const dLinks = group.directLinks || [];
      const isPackGroup = group.quality === 'Pack' || /(full\s*season\s*packs?|season\s*packs?|batch\s*packs?|all\s*episodes\s*zip)/i.test(group.title || '');

      if (isPackGroup && dLinks.length > 0) {
        // Render each full season pack as an individual pack button
        for (const pack of dLinks) {
          const cleanBase = cleanMediaTitle(meta?.title || item.title);
          const seasonNum = extractActualSeason(pack.title) || extractActualSeason(item.title);
          const sStr = seasonNum ? `S${seasonNum} ` : '';
          const pTitle = `${cleanBase} • ${sStr}Season Pack`;
          const pStoreId = await storeLink(db, item.provider, pack.link, pTitle);
          const pLabel = formatPackButtonLabel(pack.title);
          rowBatch.push({ text: pLabel, callback_data: `resopt:${pStoreId}` });
        }
      } else if (dLinks.length > 1) {
        // Group contains multiple single episodes
        const cleanBase = cleanMediaTitle(meta?.title || item.title);
        const seasonNum = extractActualSeason(group.title) || extractActualSeason(item.title);
        const sStr = seasonNum ? `Season ${seasonNum}` : (group.title || 'Episodes');
        const groupStoredTitle = `${cleanBase} • ${sStr}`;
        const epGroupStoreId = await storeLink(db, item.provider, {
          episodes: dLinks,
          allGroups: rawGroups,
          groupTitle: group.title,
          seriesTitle: meta?.title || item.title
        }, groupStoredTitle);
        const label = formatEpisodeButtonLabel(group.title, dLinks.length, group.quality, startIndex + i);
        rowBatch.push({ text: label, callback_data: `eps:${epGroupStoreId}` });
      } else {
        const targetLink = dLinks[0]?.link || actualLink;
        const cleanBase = cleanMediaTitle(meta?.title || item.title);
        const resLabel = extractCleanResolution(group.title || group.quality);
        const qTitle = resLabel ? `${cleanBase} [${resLabel}]` : cleanBase;
        const qStoreId = await storeLink(db, item.provider, targetLink, qTitle);
        const label = formatQualityButtonLabel(group.title || group.quality, `Quality ${startIndex + i + 1}`);
        rowBatch.push({ text: label, callback_data: `resopt:${qStoreId}` });
      }
    }

    for (let i = 0; i < rowBatch.length; i += 2) {
      keyboard.push(rowBatch.slice(i, i + 2));
    }

    if (totalPages > 1) {
      const navRow = [];
      if (currentPage > 1) navRow.push({ text: '⬅️ Prev', callback_data: `qpage:${itemStoreId}:${currentPage - 1}` });
      navRow.push({ text: `Page ${currentPage}/${totalPages}`, callback_data: 'noop' });
      if (currentPage < totalPages) navRow.push({ text: 'Next ➡️', callback_data: `qpage:${itemStoreId}:${currentPage + 1}` });
      keyboard.push(navRow);
    }
  } else {
    const cleanBase = cleanMediaTitle(meta?.title || item.title);
    const storeId = await storeLink(db, item.provider, actualLink, cleanBase);
    keyboard.push([{ text: `▶️ Stream & Resolve Mirrors`, callback_data: `resopt:${storeId}` }]);
  }

  keyboard.push([
    { text: '🌐 Cinema Web', url: DEFAULT_WEB_URL },
    { text: '🔄 Switch Extension', callback_data: `swprov:${(cleanTitle || '').slice(0, 30)}` }
  ]);

  // If editing an existing message (e.g. Next / Prev page pagination on poster card)
  if (messageId) {
    const markupRes = await tgCall(token, 'editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: keyboard }
    });
    if (markupRes?.ok) return markupRes;

    const capRes = await tgCall(token, 'editMessageCaption', {
      chat_id: chatId,
      message_id: messageId,
      caption: itemText,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
    if (capRes?.ok) return capRes;

    return tgCall(token, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: itemText,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  let sendRes = null;
  // If item has a poster image, send photo card with poster
  if (posterUrl && (posterUrl.startsWith('http://') || posterUrl.startsWith('https://'))) {
    const photoRes = await tgCall(token, 'sendPhoto', {
      chat_id: chatId,
      photo: posterUrl,
      caption: itemText,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
    if (photoRes?.ok) sendRes = photoRes;
  }

  // Fallback to text message
  if (!sendRes) {
    sendRes = await tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: itemText,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Delete the temporary loader message now that the poster card has arrived
  if (loadMsgId) {
    await tgCall(token, 'deleteMessage', { chat_id: chatId, message_id: loadMsgId });
  }

  return sendRes;
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
