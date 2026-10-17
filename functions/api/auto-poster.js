/**
 * 24/7 Cloudflare Edge Auto-Poster for Telegram Channel
 * Posts new releases as well as historical archive posts gradually across all extensions.
 * Formats ultra-clean mobile cards with Quality & File Size highlights.
 */

const BOT_TOKEN = "8887103348:AAHjlYSV1s8uFQ2x_6B--3FwNmvlL12GYvk";
const CHANNEL_ID = "-1004363607477";
const DEFAULT_WEB_URL = "https://cinema-dwh.pages.dev";

const DEFAULT_POSTER_PROVIDERS = [
  "drive",
  "vega",
  "hdhub4u",
  "4khdhub",
  "movieBoxWeb",
  "autoEmbed"
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

// Extract clean Quality and Size badges from titles and groups
export function extractQualityBadges(title, linkList = []) {
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

  // Extract file sizes
  const sizes = [];
  const sizeMatches = combined.matchAll(/\b(\d+(?:\.\d+)?\s*(?:GB|MB))\b/gi);
  for (const m of sizeMatches) {
    const s = m[1].toUpperCase().replace(/\s+/, '');
    if (!sizes.includes(s) && sizes.length < 3) sizes.push(s);
  }

  // Audio info
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

// Check if post already in D1 history
async function isAlreadyPosted(db, key) {
  if (!db || !key) return false;
  try {
    const row = await db.prepare("SELECT key FROM posted_history WHERE key = ?").bind(key).first();
    return !!row;
  } catch (_) {
    return false;
  }
}

// Mark post as sent in D1
async function markPosted(db, key) {
  if (!db || !key) return;
  try {
    await db.prepare("INSERT OR REPLACE INTO posted_history (key, created_at) VALUES (?, ?)").bind(key, Date.now()).run();
  } catch (_) {}
}

// Main Poster Runner
export async function runAutoPoster(env, requestUrl, force = false) {
  const db = env?.cinema_db;
  const token = env?.BOT_TOKEN || BOT_TOKEN;
  const channelId = env?.CHANNEL_ID || CHANNEL_ID;

  const origin = new URL(requestUrl).origin;
  const providers = DEFAULT_POSTER_PROVIDERS;

  const results = {
    posted: [],
    skipped: 0,
    errors: []
  };

  // Rapid posting: allow up to 10 releases when forced or requested
  const maxPosts = force ? 10 : 6;
  let postedCount = 0;

  for (const provKey of providers) {
    if (postedCount >= maxPosts) break;

    try {
      // 1. Get current archive page cursor for this extension
      let archivePage = 1;
      if (db) {
        try {
          const row = await db.prepare("SELECT value FROM config WHERE key = ?").bind(`ARCHIVE_PAGE_${provKey}`).first();
          if (row?.value) archivePage = parseInt(row.value, 10) || 1;
        } catch (_) {}
      }

      // Check both page 1 (new latest) and archivePage (historical backfill)
      const pagesToCheck = [1];
      if (archivePage > 1) pagesToCheck.push(archivePage);

      let candidatePost = null;
      let usedPage = 1;

      for (const pNum of pagesToCheck) {
        const postsUrl = new URL("/api/posts", origin);
        postsUrl.searchParams.set("provider", provKey);
        postsUrl.searchParams.set("page", String(pNum));

        const res = await fetch(postsUrl.toString(), {
          headers: { "User-Agent": "Cinema-AutoPoster/1.0" },
          signal: AbortSignal.timeout(5000)
        });

        if (!res.ok) continue;
        const posts = await res.json();
        if (!Array.isArray(posts) || posts.length === 0) continue;

        for (const p of posts) {
          if (!p.link || !p.title) continue;
          const uniqueKey = `${provKey}:${p.link}`;
          const posted = await isAlreadyPosted(db, uniqueKey);
          if (!posted) {
            candidatePost = p;
            usedPage = pNum;
            break;
          }
        }
        if (candidatePost) break;
      }

      // If all items on this archive page were posted, advance cursor to next page for future run
      if (!candidatePost && db) {
        try {
          await db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)")
            .bind(`ARCHIVE_PAGE_${provKey}`, String(archivePage + 1), Date.now()).run();
        } catch (_) {}
        continue;
      }

      if (!candidatePost) continue;

      // 2. Enrich candidate with /api/meta
      let meta = null;
      try {
        const metaUrl = new URL("/api/meta", origin);
        metaUrl.searchParams.set("provider", provKey);
        metaUrl.searchParams.set("link", candidatePost.link);
        const metaRes = await fetch(metaUrl.toString(), {
          headers: { "User-Agent": "Cinema-AutoPoster/1.0" },
          signal: AbortSignal.timeout(4000)
        });
        if (metaRes.ok) meta = await metaRes.json();
      } catch (_) {}

      // 3. Extract quality, file size & audio badges
      const { resolutions, audio } = extractQualityBadges(candidatePost.title, meta?.linkList);

      const title = meta?.title || candidatePost.title;
      const rating = meta?.rating ? `${meta.rating}/10` : '7.8/10';
      const year = meta?.year ? ` (${meta.year})` : '';
      const genres = meta?.tags && Array.isArray(meta.tags) ? meta.tags.slice(0, 3).join(', ') : 'Movies & Series';
      const poster = meta?.poster || meta?.image || candidatePost.image || 'https://cinema-dwh.pages.dev/logo.png';

      let synopsis = meta?.synopsis || candidatePost.synopsis || '';
      if (synopsis.length > 220) {
        synopsis = synopsis.slice(0, 217) + '…';
      }

      // Clean title for deep link parameter
      const cleanTitleParam = (candidatePost.title || '')
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 30);

      // Store in D1 bot_links for 1-click deep-link opening
      const storeId = hashString(`${provKey}:${candidatePost.link}`);
      if (db) {
        try {
          await db.prepare(
            "INSERT OR REPLACE INTO bot_links (id, provider, link, title, created_at) VALUES (?, ?, ?, ?, ?)"
          ).bind(storeId, provKey, candidatePost.link, title, Date.now()).run();
        } catch (_) {}
      }

      const directStartParam = `p_${storeId}_${provKey}_${cleanTitleParam}`;
      const provDisplayName = candidatePost.providerName || provKey.toUpperCase();

      // Mobile-optimized sleek caption
      let caption = `🎬 <b>${escapeHtml(title)}${year}</b>\n`;
      caption += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      caption += `⭐ <b>Rating:</b> ${escapeHtml(rating)} • 🎭 <i>${escapeHtml(genres)}</i>\n`;
      caption += `🌐 <b>Source:</b> <b>${escapeHtml(provDisplayName)}</b> • 🔊 <b>${escapeHtml(audio)}</b>\n`;
      caption += `💿 <b>Available:</b> <code>${escapeHtml(resolutions)}</code>\n\n`;
      if (synopsis) {
        caption += `📝 <i>${escapeHtml(synopsis)}</i>\n\n`;
      }
      caption += `✨ <b>100% Ad-Free • 1-Click Stream & Download</b>`;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: `⚡ Stream & Download [${escapeHtml(provDisplayName)}]`,
              url: `https://t.me/cinemaisherebtw_bot?start=${directStartParam}`
            }
          ]
        ]
      };

      // 4. Send photo to channel
      const tgRes = await tgCall(token, 'sendPhoto', {
        chat_id: channelId,
        photo: poster,
        caption: caption,
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      if (tgRes?.ok) {
        const uniqueKey = `${provKey}:${candidatePost.link}`;
        await markPosted(db, uniqueKey);

        // Advance archive page if we pulled from historical batch
        if (usedPage === archivePage && db) {
          try {
            await db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)")
              .bind(`ARCHIVE_PAGE_${provKey}`, String(archivePage + 1), Date.now()).run();
          } catch (_) {}
        }

        results.posted.push({
          title,
          provider: provKey,
          messageId: tgRes.result?.message_id
        });
        postedCount++;
      } else {
        results.errors.push(`Telegram sendPhoto failed for ${provKey}: ${tgRes?.description}`);
      }
    } catch (err) {
      results.errors.push(`Provider ${provKey} error: ${err.message}`);
    }
  }

  return results;
}

// Endpoint Handlers
export async function onRequestGet(context) {
  const { request, env } = context;
  const res = await runAutoPoster(env, request.url, true);
  return new Response(JSON.stringify(res, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const res = await runAutoPoster(env, request.url, true);
  return new Response(JSON.stringify(res, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
