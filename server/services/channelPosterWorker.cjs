const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { smartAxios } = require('./smartFetcher.cjs');
const domainResolver = require('./domainResolver.cjs');
const zendaEngine = require('./zendaEngine.cjs');

/**
 * ⚡ 24/7 Rapid Channel Auto-Poster & Archive Backfill Worker
 * ----------------------------------------------------------
 * 1. Keeps Render active 24/7 (no sleep/inactivity).
 * 2. Crawls both latest releases (Page 1) and historical archives (Page 2, 3, 4...).
 * 3. Formats rich media cards with posters, synopsis, quality badges, and direct bot buttons.
 * 4. Respects Telegram rate limits with a safe 35-second cadence.
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
  return dynamicBotProviders.length > 0 ? dynamicBotProviders : ['vega', 'hdhub4u', '4khdhub', 'movieBoxWeb', 'drive', 'autoEmbed'];
}

function getHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch (_) {}
  }
  return [];
}

function saveHistory(history) {
  try {
    if (history.length > 5000) history = history.slice(-5000);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (_) {}
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function tgCall(method, payload) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  try {
    const res = await axios.post(url, payload, { timeout: 15000 });
    return res.data;
  } catch (err) {
    console.error(`[Poster TG Error ${method}]:`, err.response?.data?.description || err.message);
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
  // Deep link directly to this provider's item
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

let currentProviderIndex = 0;
let isJobRunning = false;

// Crawl single page and post 1-2 new/old releases
async function processNextBatch() {
  if (isJobRunning) return;
  isJobRunning = true;

  try {
    const enabled = await getLiveBotProviders();
    if (!enabled || enabled.length === 0) {
      isJobRunning = false;
      return;
    }

    currentProviderIndex = currentProviderIndex % enabled.length;
    const provKey = enabled[currentProviderIndex];
    currentProviderIndex = (currentProviderIndex + 1) % enabled.length;

    const cursors = getCursors();
    const history = getHistory();

    const currentPage = cursors[provKey] || 1;

    // Fetch posts using zendaEngine & smartAxios
    let posts = [];
    try {
      const manifest = await domainResolver.getResolvedManifest();
      const provInfo = manifest.find(p => p.value === provKey);
      if (provInfo && provInfo.postsScript) {
        posts = await zendaEngine.getPosts(provKey, provInfo.postsScript, { page: currentPage, filter: '' });
      }
    } catch (e) {
      // If error on this provider, continue next cycle
    }

    if (!Array.isArray(posts) || posts.length === 0) {
      // If page had no posts, loop back to page 1
      cursors[provKey] = 1;
      saveCursors(cursors);
      isJobRunning = false;
      return;
    }

    let postedCount = 0;
    for (const post of posts) {
      if (!post.title || !post.link) continue;
      const key = `${provKey}:${post.link}`;

      if (history.includes(key)) continue;

      const res = await postCardToChannel(post, provKey);
      if (res?.ok) {
        history.push(key);
        saveHistory(history);
        postedCount++;
        console.log(`📢 [AutoPoster 24/7] Posted "${post.title}" [${provKey} | Page ${currentPage}]`);
        // Telegram rate-limit safety gap between messages
        await new Promise(r => setTimeout(r, 1200));
        if (postedCount >= 2) break; // Post up to 2 per 35-sec tick
      }
    }

    // Advance archive page cursor so older movies/shows are crawled on next cycle
    cursors[provKey] = currentPage + 1;
    saveCursors(cursors);

  } catch (err) {
    console.warn('[AutoPoster 24/7] Loop notice:', err.message);
  } finally {
    isJobRunning = false;
  }
}

function start247AutoPoster() {
  console.log('🚀 [AutoPoster 24/7] Continuous Channel Archive & New Release Poster Started!');
  console.log(`📢 Target Channel: ${CHANNEL_ID}`);
  console.log(`⏱️ Cadence: Active every 35 seconds (24/7 Render Keep-Alive active)`);

  // Initial post after 5 seconds
  setTimeout(processNextBatch, 5000);

  // Rapid recurring tick every 35 seconds
  setInterval(processNextBatch, 35000);
}

module.exports = {
  start247AutoPoster
};
