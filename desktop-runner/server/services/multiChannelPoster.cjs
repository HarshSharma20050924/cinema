const fs = require('fs');
const path = require('path');
const axios = require('axios');
const domainResolver = require('./domainResolver.cjs');
const zendaEngine = require('./zendaEngine.cjs');

/**
 * ⚡ Multi-Channel Isolated Auto-Poster (Latest Releases Only)
 * -------------------------------------------------------------
 * 1. Monitors Page 1 (latest releases) of all enabled extensions.
 * 2. Routes each movie/series directly into that specific extension's dedicated Telegram Channel.
 * 3. Never posts duplicates to the same extension's channel.
 * 4. Never does infinite deep pagination spam (Page 1 monitor only).
 */

const CONFIG_DIR = path.resolve(__dirname, '../config');
const DATA_DIR = path.resolve(__dirname, '../data');
const NETWORK_CONFIG_FILE = path.join(CONFIG_DIR, 'channel_network.json');
const BOTS_CONFIG_FILE = path.join(CONFIG_DIR, 'category_bots.json');
const HISTORY_FILE = path.join(DATA_DIR, 'posted_history.json');

// Default fallback bot if specific category bot not yet created
const DEFAULT_BOT_TOKEN = process.env.BOT_TOKEN || '8887103348:AAFYcYbWEm8adSF4fpLUcUliJKTmqGxvEe4';
const DEFAULT_BOT_USER = 'cinemaisherebtw_bot';
const WEB_URL = process.env.WEB_URL || 'https://cinema-dwh.pages.dev';

if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

let historySet = null;

function loadHistory() {
  if (historySet) return historySet;
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const arr = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      if (Array.isArray(arr)) {
        historySet = new Set(arr);
        return historySet;
      }
    } catch (_) {}
  }
  historySet = new Set();
  return historySet;
}

let saveHistoryTimeout = null;
function recordHistory(key) {
  loadHistory().add(key);
  if (!saveHistoryTimeout) {
    saveHistoryTimeout = setTimeout(() => {
      saveHistoryTimeout = null;
      try {
        const arr = Array.from(historySet);
        const trimmed = arr.length > 30000 ? arr.slice(-30000) : arr;
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed), 'utf8');
      } catch (_) {}
    }, 1500);
  }
}

function getNetworkChannels() {
  if (fs.existsSync(NETWORK_CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(NETWORK_CONFIG_FILE, 'utf8'));
    } catch (_) {}
  }
  return {};
}

function getCategoryBots() {
  if (fs.existsSync(BOTS_CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(BOTS_CONFIG_FILE, 'utf8'));
    } catch (_) {}
  }
  return {};
}

function getBotForExtension(extId) {
  const bots = getCategoryBots();
  if (bots['4k']?.categories?.includes(extId)) {
    return { token: bots['4k'].token, username: bots['4k'].username };
  }
  if (bots['series']?.categories?.includes(extId)) {
    return { token: bots['series'].token, username: bots['series'].username };
  }
  if (bots['anime']?.categories?.includes(extId)) {
    return { token: bots['anime'].token, username: bots['anime'].username };
  }
  if (bots['torrent']?.categories?.includes(extId)) {
    return { token: bots['torrent'].token, username: bots['torrent'].username };
  }
  if (bots['desi']?.categories?.includes(extId)) {
    return { token: bots['desi'].token, username: bots['desi'].username };
  }
  return { token: DEFAULT_BOT_TOKEN, username: DEFAULT_BOT_USER };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function tgCall(token, method, data) {
  try {
    const res = await axios.post(`https://api.telegram.org/bot${token}/${method}`, data, {
      timeout: 10000,
    });
    return res.data;
  } catch (err) {
    const retryAfter = err.response?.data?.parameters?.retry_after;
    if (retryAfter && retryAfter > 0) {
      console.log(`⏳ Telegram Flood Wait: sleeping ${retryAfter}s...`);
      await sleep(retryAfter * 1000 + 500);
      try {
        const retryRes = await axios.post(`https://api.telegram.org/bot${token}/${method}`, data, { timeout: 10000 });
        return retryRes.data;
      } catch (_) {}
    }
    console.warn(`[TG API ${method}] Error:`, err.response?.data?.description || err.message);
    return null;
  }
}

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function cleanDisplayTitle(rawTitle) {
  if (!rawTitle) return 'Untitled Release';
  return String(rawTitle)
    .replace(/^[\s🎬📺📥⚡📦⬇️▶️]+/gu, '')
    .replace(/\[\s*(?:dual\s*audio|hindi|eng|org|bluray|hevc|x264|x265|720p|1080p|480p|2160p|4k)[^\]]*\]/gi, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\((?:season\s*\d+\s*[-+–—]\s*\d+|seasons?\s*\d+[^)]*)\)/gi, '')
    .replace(/\b(?:480p|720p|1080p|2160p|4k|bluray|web-dl|webrip|hdrip|hevc|x264|x265|dd5\.1|dual audio|full show|full movie|clean)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function postToDedicatedChannel(item, provKey, channelId) {
  const bot = getBotForExtension(provKey);
  const displayTitle = escapeHtml(cleanDisplayTitle(item.title));
  const targetChatId = channelId.startsWith('-100') ? channelId : `-100${channelId}`;

  // Clean title for deep link parameter (max 24 chars to stay well within Telegram 64 char limit)
  const cleanTitleParam = (item.title || '')
    .replace(/\b(?:480p|720p|1080p|2160p|4k|bluray|web-dl|webrip|hdrip|hevc|x264|x265|dd5\.1|dual audio|hindi|clean)\b/gi, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 24);

  const storeId = hashString(`${provKey}:${item.link || ''}`);
  const directStartParam = `p_${storeId}_${provKey}_${cleanTitleParam}`;

  // Sync to D1 bot_links in background for instant opening
  axios.post(`${WEB_URL}/api/store-link`, {
    id: storeId,
    provider: provKey,
    link: item.link || '',
    title: item.title || '',
  }, { timeout: 4000 }).catch(() => {});

  const text = `🎬 <b>${displayTitle}</b>\n\n` +
    `📦 <b>Source:</b> <code>${provKey.toUpperCase()}</code>\n` +
    `⚡ <b>Quality:</b> Cloud Streaming &amp; Direct Downloads\n\n` +
    `👇 <i>Tap below to stream or download in VLC / Web Player:</i>`;

  const posterUrl = item.image || item.poster || null;
  const openInWebUrl = `${WEB_URL}/?provider=${encodeURIComponent(provKey)}&title=${encodeURIComponent(cleanDisplayTitle(item.title) || item.title || '')}&link=${encodeURIComponent(item.link || '')}${posterUrl ? `&poster=${encodeURIComponent(posterUrl)}` : ''}`;

  // Stacked buttons: 100% full width on mobile, perfectly fit without splitting or overflowing
  const keyboard = {
    inline_keyboard: [
      [
        { text: 'Stream & Download', url: `https://t.me/${bot.username}?start=${directStartParam}` },
      ],
    ],
  };

  if (posterUrl && (posterUrl.startsWith('http://') || posterUrl.startsWith('https://'))) {
    const photoRes = await tgCall(bot.token, 'sendPhoto', {
      chat_id: targetChatId,
      photo: posterUrl,
      caption: text,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    if (photoRes?.ok) {
      return photoRes;
    }
  }

  return await tgCall(bot.token, 'sendMessage', {
    chat_id: targetChatId,
    text,
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

let isScanning = false;

async function checkLatestReleases() {
  if (isScanning) return;
  isScanning = true;

  try {
    const network = getNetworkChannels();
    const extensions = Object.keys(network);

    console.log(`\n🔍 [Multi-Channel Poster] Scanning Page 1 across ${extensions.length} extensions...`);
    loadHistory();

    for (const extId of extensions) {
      const channel = network[extId];
      if (!channel?.channelId) continue;

      let mod = null;
      try {
        mod = await zendaEngine.loadModule(extId, 'posts');
      } catch (_) {}

      if (!mod || typeof mod.getPosts !== 'function') continue;

      const ctx = zendaEngine.getProviderContext(extId);

      try {
        // Query Page 1 only (latest releases)
        const posts = await mod.getPosts({
          page: 1,
          filter: '',
          providerValue: extId,
          providerContext: ctx,
          signal: new AbortController().signal,
        });

        if (!Array.isArray(posts) || posts.length === 0) continue;

        let newInExt = 0;
        for (const post of posts) {
          if (!post.title || !post.link) continue;
          const key = `${extId}:${post.link}`;

          // Isolated deduplication per extension
          if (historySet.has(key)) continue;

          console.log(`📢 [New Release] Posting to ${channel.title}: "${post.title}"`);
          const res = await postToDedicatedChannel(post, extId, channel.channelId);

          if (res?.ok) {
            recordHistory(key);
            newInExt++;
            await sleep(2500); // Flood prevention
          }
        }

        if (newInExt > 0) {
          console.log(`✅ [${extId.toUpperCase()}] Posted ${newInExt} fresh releases to ${channel.title}`);
        }
      } catch (err) {
        console.warn(`[${extId}] Page 1 check notice:`, err.message);
      }

      await sleep(1000);
    }
  } catch (err) {
    console.error('[Multi-Channel Poster] Scan error:', err);
  } finally {
    isScanning = false;
  }
}

function startMultiChannelPoster() {
  console.log('🚀 Starting Multi-Channel Dedicated Auto-Poster (Every 3 minutes)...');
  // Initial run after 5s startup delay
  setTimeout(checkLatestReleases, 5000);
  // Interval every 3 minutes (180,000ms)
  setInterval(checkLatestReleases, 180000);
}

module.exports = {
  startMultiChannelPoster,
  checkLatestReleases,
  getBotForExtension,
  postToDedicatedChannel,
};

// Always start daemon when launched via PM2 or node directly
if (!process.env.DO_NOT_AUTOSTART) {
  startMultiChannelPoster();
}
