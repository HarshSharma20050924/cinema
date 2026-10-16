const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { loadConfig } = require('./config.cjs');
const { getLatestProviderPosts, getMeta, getAllProviders } = require('./cinemaApi.cjs');
const { storeLink } = require('./linkStore.cjs');

const HISTORY_FILE = path.join(__dirname, 'posted_history.json');

function getPostedHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (_) {}
  }
  return [];
}

function recordPosted(uniqueKey) {
  const history = getPostedHistory();
  if (!history.includes(uniqueKey)) {
    history.push(uniqueKey);
    // Keep last 1000 IDs to avoid indefinite file growth
    if (history.length > 1000) history.shift();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  }
}

async function postExtensionCardToChannel(post, provInfo) {
  const cfg = loadConfig();
  const botToken = cfg.BOT_TOKEN;
  const channelId = cfg.CHANNEL_ID;

  const provKey = post.provider || provInfo?.value || 'cinema';
  const provDisplayName = post.providerName || provInfo?.name || provKey.toUpperCase();

  // Try to enrich with meta if available
  let synopsis = '';
  let rating = '7.5';
  let genres = 'Movies & Series';
  let posterUrl = post.image;

  try {
    const meta = await getMeta(post.link, provKey);
    if (meta) {
      if (meta.synopsis) synopsis = meta.synopsis;
      if (meta.rating) rating = String(meta.rating);
      if (meta.tags && Array.isArray(meta.tags)) genres = meta.tags.slice(0, 3).join(', ');
      if (meta.image || meta.poster) posterUrl = meta.image || meta.poster;
    }
  } catch (_) {}

  // Truncate overview if too long
  if (synopsis && synopsis.length > 320) {
    synopsis = synopsis.substring(0, 317) + '...';
  }

  // Clean raw title for safe deep link search
  const cleanTitle = (post.title || '')
    .replace(/\b(?:480p|720p|1080p|2160p|4k|bluray|web-dl|webrip|hdrip|hevc|x264|x265|dd5\.1|dual audio|hindi|clean)\b/gi, '')
    .replace(/[\[\]\(\)\|]/g, '')
    .trim();

  const cleanTitleParam = (cleanTitle || post.title)
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 30);

  // Store the exact post so bot opens it directly from this extension without searching all extensions
  const storeId = storeLink(provKey, post.link, post.title);
  const directStartParam = `p_${storeId}_${provKey}_${cleanTitleParam}`;

  let caption = `🎬 <b>${escapeHtml(post.title)}</b>\n\n`;
  caption += `🌐 <b>Extension / Source:</b> <b>${escapeHtml(provDisplayName)}</b>\n`;
  if (rating && rating !== 'N/A') caption += `⭐ <b>Rating:</b> ${escapeHtml(rating)}/10\n`;
  if (genres) caption += `🎭 <b>Genre:</b> ${escapeHtml(genres)}\n\n`;
  if (synopsis) caption += `📝 <i>${escapeHtml(synopsis)}</i>\n\n`;
  caption += `✨ <b>100% Ad-Free • 1-Click Stream & Download</b>`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: `⚡ Stream & Download [${escapeHtml(provDisplayName)}]`,
          url: `https://t.me/cinemaisherebtw_bot?start=${directStartParam}`
        }
      ],
      [
        {
          text: `🤖 Choose Quality [${escapeHtml(provDisplayName)}]`,
          url: `https://t.me/cinemaisherebtw_bot?start=${directStartParam}`
        },
        {
          text: '🌐 Open in Cinema Web',
          url: `${cfg.WEB_URL}`
        }
      ]
    ]
  };

  const payload = {
    chat_id: channelId,
    photo: posterUrl || 'https://cinema-dwh.pages.dev/logo.png',
    caption: caption,
    parse_mode: 'HTML',
    reply_markup: inlineKeyboard
  };

  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  const res = await axios.post(url, payload, { timeout: 15000 });
  recordPosted(`${provKey}:${post.link}`);
  console.log(`[AutoPoster] Successfully posted "${post.title}" from [${provDisplayName}] to channel`);
  return res.data;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function checkEnabledExtensionsAndPost(force = false) {
  try {
    const cfg = loadConfig();
    const enabledProviders = cfg.enabledProviders || [];
    if (enabledProviders.length === 0) {
      console.log('[AutoPoster] No extensions enabled in config.');
      return;
    }

    console.log(`[AutoPoster] Checking ${enabledProviders.length} enabled extensions for new releases: ${enabledProviders.join(', ')}`);
    const history = getPostedHistory();
    const allProvs = await getAllProviders();
    const provMap = new Map(allProvs.map((p) => [p.value, p]));

    let totalPostedThisRun = 0;
    const maxPostsPerCheck = force ? 3 : (cfg.MAX_DAILY_POSTS || 2);

    for (const provKey of enabledProviders) {
      if (totalPostedThisRun >= maxPostsPerCheck) break;

      try {
        const posts = await getLatestProviderPosts(provKey, 1);
        if (!Array.isArray(posts) || posts.length === 0) continue;

        const provInfo = provMap.get(provKey) || { name: provKey, value: provKey };

        for (const post of posts.slice(0, 5)) {
          if (totalPostedThisRun >= maxPostsPerCheck) break;
          const postKey = `${provKey}:${post.link}`;

          if (!force && history.includes(postKey)) {
            continue;
          }

          try {
            await postExtensionCardToChannel(post, provInfo);
            totalPostedThisRun++;
            // Pause 3 seconds between posts to respect Telegram flood limits
            await new Promise((r) => setTimeout(r, 3000));
          } catch (postErr) {
            console.error(`[AutoPoster] Failed posting from ${provKey}:`, postErr.response?.data?.description || postErr.message);
          }
        }
      } catch (err) {
        console.warn(`[AutoPoster] Could not fetch latest from ${provKey}:`, err.message);
      }
    }

    console.log(`[AutoPoster] Completed run. Posted ${totalPostedThisRun} new release(s).`);
  } catch (e) {
    console.error('[AutoPoster] Error during extensions check:', e.message);
  }
}

function startAutoPosterSchedule() {
  const cfg = loadConfig();
  // Check every 30 minutes for new scraper releases
  const intervalMinutes = 30;
  console.log(`[AutoPoster] Scheduled to check enabled extensions every ${intervalMinutes} minutes.`);

  // Initial check after 8 seconds of startup
  setTimeout(() => {
    checkEnabledExtensionsAndPost(false);
  }, 8000);

  // Periodic recurring check
  setInterval(() => {
    checkEnabledExtensionsAndPost(false);
  }, intervalMinutes * 60 * 1000);
}

module.exports = {
  checkEnabledExtensionsAndPost,
  postExtensionCardToChannel,
  startAutoPosterSchedule
};
