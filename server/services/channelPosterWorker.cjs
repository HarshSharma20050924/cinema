const fs = require('fs');
const path = require('path');
const axios = require('axios');
const domainResolver = require('./domainResolver.cjs');
const zendaEngine = require('./zendaEngine.cjs');

/**
 * ⚡ Continuous Channel Auto-Poster & Bulk Archive Crawler Worker
 * -------------------------------------------------------------
 * 1. Crawls all enabled extensions and websites in bulk with NO limit.
 * 2. Pushes every movie, series, and episode directly into the Telegram channel.
 * 3. Handles automatic 429 backoff and fallback to text message if poster image fails.
 * 4. Advances archive page cursors so the entire catalog is backfilled without duplicates.
 */

const BOT_TOKEN = process.env.BOT_TOKEN || '8887103348:AAFYcYbWEm8adSF4fpLUcUliJKTmqGxvEe4';
const CHANNEL_ID = process.env.CHANNEL_ID || '-1004363607477';
const WEB_URL = process.env.WEB_URL || 'https://cinema-dwh.pages.dev';

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

const HISTORY_FILE = path.join(DATA_DIR, 'posted_history.json');
const CURSOR_FILE = path.join(DATA_DIR, 'archive_cursors.json');

// In-memory set for O(1) deduplication
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
        const trimmed = arr.length > 25000 ? arr.slice(-25000) : arr;
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed), 'utf8');
      } catch (_) {}
    }, 2000);
  }
}

function getCursors() {
  if (fs.existsSync(CURSOR_FILE)) {
    try { return JSON.parse(fs.readFileSync(CURSOR_FILE, 'utf8')); } catch (_) {}
  }
  return {};
}

function saveCursors(cursors) {
  try { fs.writeFileSync(CURSOR_FILE, JSON.stringify(cursors, null, 2), 'utf8'); } catch (_) {}
}

// Dynamic Provider Pool (Synced from Cloudflare D1 /api/bot-providers)
let dynamicBotProviders = [];
let lastProviderSync = 0;

async function getLiveBotProviders() {
  const now = Date.now();
  if (now - lastProviderSync < 30000 && dynamicBotProviders.length > 0) {
    return dynamicBotProviders;
  }
  try {
    const res = await axios.get(`${WEB_URL}/api/bot-providers`, { timeout: 6000 });
    if (Array.isArray(res.data?.enabled) && res.data.enabled.length > 0) {
      dynamicBotProviders = res.data.enabled;
      lastProviderSync = now;
      return dynamicBotProviders;
    }
  } catch (_) {}
  return dynamicBotProviders.length > 0 ? dynamicBotProviders : ['drive', 'hdhub4u', '4khdhub', 'movieBoxWeb', 'vega', 'moviesmod', 'topmovies', 'katmoviehd'];
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function tgCall(method, payload) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  try {
    const res = await axios.post(url, payload, { timeout: 15000 });
    return res.data;
  } catch (err) {
    const retryAfter = err.response?.data?.parameters?.retry_after;
    if (retryAfter) {
      console.warn(`⏳ [AutoPoster] Telegram 429 Rate Limit. Sleeping ${retryAfter + 1}s...`);
      await sleep((retryAfter + 1) * 1000);
      try {
        const retryRes = await axios.post(url, payload, { timeout: 15000 });
        return retryRes.data;
      } catch (_) {}
    }

    // If sendPhoto failed (e.g. hotlink blocked, broken image URL, size exceeded), fallback to sendMessage
    if (method === 'sendPhoto') {
      try {
        const fallbackRes = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          chat_id: payload.chat_id,
          text: payload.caption || payload.text,
          parse_mode: 'HTML',
          reply_markup: payload.reply_markup
        }, { timeout: 15000 });
        return fallbackRes.data;
      } catch (fbErr) {
        console.error(`[AutoPoster Fallback Error]:`, fbErr.response?.data?.description || fbErr.message);
      }
    }

    console.error(`[AutoPoster TG Error ${method}]:`, err.response?.data?.description || err.message);
    return null;
  }
}

// Post single movie/series card to Telegram channel
async function postCardToChannel(item, providerKey) {
  const cleanTitle = (item.title || '')
    .replace(/\b(?:480p|720p|1080p|2160p|4k|bluray|web-dl|webrip|hdrip|hevc|x264|x265|dd5\.1|dual audio|hindi|clean)\b/gi, '')
    .replace(/[\[\]\(\)\|]/g, '')
    .trim();

  const titleParam = (cleanTitle || item.title)
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 30);

  const botUsername = 'cinemaisherebtw_bot';
  const botDeepLink = `https://t.me/${botUsername}?start=p_arch_${providerKey}_${encodeURIComponent(titleParam)}`;

  let text = `🎬 <b>${escapeHtml(item.title)}</b>\n\n`;
  text += `🌐 <b>Source:</b> <code>${escapeHtml(providerKey.toUpperCase())}</code>\n`;
  text += `⚡ <b>Fast Streaming:</b> <code>VLC & Direct Web-Player</code>\n\n`;
  text += `👇 <i>Tap below to choose Quality, Episodes & Stream:</i>`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '▶️ Stream & Download', url: botDeepLink },
        { text: '🌐 Watch on Web', url: `${WEB_URL}/?search=${encodeURIComponent(cleanTitle || item.title)}` }
      ]
    ]
  };

  const posterUrl = item.image || item.poster || null;

  if (posterUrl && (posterUrl.startsWith('http://') || posterUrl.startsWith('https://'))) {
    return tgCall('sendPhoto', {
      chat_id: CHANNEL_ID,
      photo: posterUrl,
      caption: text,
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  return tgCall('sendMessage', {
    chat_id: CHANNEL_ID,
    text,
    parse_mode: 'HTML',
    reply_markup: keyboard
  });
}

let isJobRunning = false;

// Crawl all enabled providers and push EVERYTHING in bulk with no limit
async function processBulkBatch() {
  if (isJobRunning) return;
  isJobRunning = true;

  try {
    const enabled = await getLiveBotProviders();
    if (!enabled || enabled.length === 0) {
      isJobRunning = false;
      return;
    }

    const cursors = getCursors();
    loadHistory();

    console.log(`📢 [AutoPoster Bulk] Starting bulk crawl across ${enabled.length} enabled extensions: ${enabled.join(', ')}`);

    for (const provKey of enabled) {
      const currentPage = cursors[provKey] || 1;
      let posts = [];

      try {
        const mod = await zendaEngine.loadModule(provKey, 'posts');
        if (!mod || typeof mod.getPosts !== 'function') {
          continue;
        }

        const ctx = zendaEngine.getProviderContext(provKey);
        posts = await mod.getPosts({
          page: currentPage,
          filter: '',
          providerValue: provKey,
          providerContext: ctx,
          signal: new AbortController().signal
        });
      } catch (err) {
        console.warn(`[AutoPoster Bulk] Error fetching ${provKey} page ${currentPage}:`, err.message);
      }

      if (!Array.isArray(posts) || posts.length === 0) {
        // If page has no posts and was beyond page 1, reset back to page 1 for new releases
        if (currentPage > 1) {
          cursors[provKey] = 1;
          saveCursors(cursors);
        }
        continue;
      }

      console.log(`📢 [AutoPoster Bulk] Found ${posts.length} posts on ${provKey} [Page ${currentPage}]. Posting unposted items...`);

      let provPosted = 0;
      for (const post of posts) {
        if (!post.title || !post.link) continue;
        const key = `${provKey}:${post.link}`;

        if (historySet.has(key)) continue;

        const res = await postCardToChannel(post, provKey);
        if (res?.ok) {
          recordHistory(key);
          provPosted++;
          console.log(`📢 [AutoPoster Bulk] Posted "${post.title}" [${provKey} | Page ${currentPage}]`);
          // Telegram channel rate-limit spacing (~1.2s between posts)
          await sleep(1200);
        }
      }

      // Advance to next archive page so older movies & shows continue getting pushed
      cursors[provKey] = currentPage + 1;
      saveCursors(cursors);

      console.log(`✅ [AutoPoster Bulk] Finished ${provKey} [Page ${currentPage}]: ${provPosted} new items posted. Advanced to Page ${currentPage + 1}.`);
    }

  } catch (err) {
    console.warn('[AutoPoster Bulk] Loop notice:', err.message);
  } finally {
    isJobRunning = false;
  }
}

let workerStarted = false;

function start247AutoPoster() {
  if (workerStarted) return;
  workerStarted = true;

  console.log('🚀 [AutoPoster 24/7] Continuous Bulk Channel Poster Initialized!');
  console.log(`📢 Target Channel: ${CHANNEL_ID}`);
  console.log(`⚡ Mode: UNLIMITED BULK POSTING across ALL enabled extensions`);

  // Start continuous loop
  (async () => {
    // Initial delay to allow network and providers to initialize
    await sleep(4000);

    while (true) {
      try {
        await processBulkBatch();
      } catch (loopErr) {
        console.error('[AutoPoster Bulk Loop Error]:', loopErr.message);
      }
      // Brief 5-second rest between full-pool sweeps
      await sleep(5000);
    }
  })();
}

module.exports = {
  start247AutoPoster,
  processBulkBatch,
  postCardToChannel
};
