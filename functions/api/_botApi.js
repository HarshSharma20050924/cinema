/**
 * Telegram API & Cinema Backend Cluster Client
 */
import { generateStreamCacheKey, getCachedStreams, setCachedStreams, isValidStreamResult } from "./_streamCache.js";
import { getBalancedRenderCluster } from "./_cluster.js";

// Telegram API Helper
export async function tgCall(token, method, payload = {}) {
  if (!token) {
    console.error(`Telegram API [${method}] FAILED: No BOT_TOKEN found!`);
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
    console.error(`Telegram API [${method}] fetch error:`, err.message);
    return null;
  }
}

// Robust helper to edit existing message or send a fresh one
export async function sendOrEdit(token, chatId, messageId, payload) {
  if (messageId) {
    if (payload.text) {
      const res = await tgCall(token, 'editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        ...payload
      });
      if (res && res.ok) return res;
    }
    if (payload.caption) {
      const res = await tgCall(token, 'editMessageCaption', {
        chat_id: chatId,
        message_id: messageId,
        ...payload
      });
      if (res && res.ok) return res;
    }
  }
  return tgCall(token, 'sendMessage', {
    chat_id: chatId,
    text: payload.text || payload.caption || 'Details:',
    parse_mode: payload.parse_mode || 'HTML',
    reply_markup: payload.reply_markup
  });
}

export async function getCandidateBackends(db) {
  const candidates = [];

  // 1. 🚀 Ultra-Reliable Distributed 5-Node Render Cluster First (Round-robin)
  const balancedRenderNodes = getBalancedRenderCluster();
  for (const renderUrl of balancedRenderNodes) {
    if (!candidates.includes(renderUrl)) {
      candidates.push(renderUrl);
    }
  }

  // 2. Active Dynamic Mobile / Local Dev Runners (Secondary)
  if (db) {
    try {
      const poolRow = await db.prepare("SELECT value FROM config WHERE key = 'BACKEND_POOL'").first();
      if (poolRow?.value) {
        const pool = JSON.parse(poolRow.value);
        if (Array.isArray(pool)) {
          const now = Date.now();
          // Filter out stale nodes not seen in last 90 seconds
          const active = pool.filter(n => {
            const last = n?.lastSeen || 0;
            return !n.lastSeen || (now - last < 90000);
          });

          for (const item of active) {
            const u = typeof item === 'string' ? item : item?.url;
            if (u && /^https?:\/\//i.test(u) && !u.includes('pages.dev')) {
              const clean = u.replace(/\/+$/, '');
              if (!candidates.includes(clean)) {
                candidates.push(clean);
              }
            }
          }
        }
      }

      const urlRow = await db.prepare("SELECT value FROM config WHERE key = 'BACKEND_URL'").first();
      if (urlRow?.value && /^https?:\/\//i.test(urlRow.value) && !urlRow.value.includes('pages.dev')) {
        const clean = urlRow.value.replace(/\/+$/, '');
        if (!candidates.includes(clean)) candidates.push(clean);
      }
    } catch (_) {}
  }

  return candidates;
}

// Forward to active Cinema Backend Nodes with automatic cluster failover & edge caching
export async function callCinemaApi(requestUrl, endpoint, params = {}, db = null) {
  const isStreams = endpoint.includes('/streams');
  let streamCacheKey = null;

  // ⚡ 50ms Edge Stream Cache Lookup for Telegram
  if (isStreams && params.provider && params.link) {
    try {
      streamCacheKey = await generateStreamCacheKey(
        params.provider,
        params.link,
        params.type || 'movie',
        params.download || false,
        params.title || ''
      );
      if (db) {
        const cached = await getCachedStreams({ cinema_db: db }, streamCacheKey);
        if (cached && isValidStreamResult(cached.streams)) {
          return cached.streams;
        }
      }
    } catch (_) {}
  }

  const candidates = await getCandidateBackends(db);
  let lastError = null;
  let renderAttempts = 0;

  for (const base of candidates) {
    const isRender = base.includes('onrender.com');
    if (isRender) {
      if (renderAttempts >= 2) continue; // Maximum 2 Render nodes attempted to prevent timeout cascade
      renderAttempts++;
    }

    try {
      const url = new URL(`/api${endpoint}`, base);
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
          url.searchParams.set(k, val);
        }
      });

      const controller = new AbortController();
      const isTunnel = base.includes('trycloudflare.com');
      // 12s timeout for Render scrapers (providers like hdhub4u/vega need 6-8s); 2.5s for residential phone tunnels
      const timeoutMs = isTunnel ? 2500 : 12000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url.toString(), {
        headers: { "User-Agent": "Cinema-Telegram-Bot/1.0", "Accept": "application/json" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        // ⚡ Cache valid stream results for 6 hours (NEVER cache empty or error)
        if (isStreams && streamCacheKey && isValidStreamResult(data) && db) {
          setCachedStreams(
            { cinema_db: db },
            streamCacheKey,
            data,
            params.title || '',
            params.provider || ''
          ).catch(() => {});
        }
        return data;
      }
    } catch (err) {
      lastError = err;
    }
  }

  console.error(`callCinemaApi [${endpoint}] all candidates failed:`, lastError ? lastError.message : 'Nodes exhausted');
  return null;
}
