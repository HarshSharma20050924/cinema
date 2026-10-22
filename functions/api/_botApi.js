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

  // 1. 🚀 Ultra-Reliable Distributed 5-Node Render Cluster (Round-robin)
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

// 🚀 PARALLEL RACING: Forward to all Cinema Backend Nodes simultaneously.
// First successful response wins — cuts worst-case from 15s (sequential) to ~4s.
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
  if (!candidates.length) {
    console.error(`callCinemaApi [${endpoint}] no backend candidates available`);
    return null;
  }

  // Build URL for a given backend base
  const buildUrl = (base) => {
    const url = new URL(`/api${endpoint}`, base);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    }
    return url.toString();
  };

  // 10s per-node timeout — generous enough for scraper nodes under load
  const NODE_TIMEOUT_MS = 10000;

  const fetchNode = (base) => new Promise((resolve, reject) => {
    const controller = new AbortController();
    const tid = setTimeout(() => { controller.abort(); reject(new Error(`timeout:${base}`)); }, NODE_TIMEOUT_MS);
    fetch(buildUrl(base), {
      headers: { 'User-Agent': 'Cinema-Telegram-Bot/1.0', 'Accept': 'application/json' },
      signal: controller.signal
    })
      .then(res => {
        clearTimeout(tid);
        if (!res.ok) { reject(new Error(`HTTP ${res.status}`)); return; }
        return res.json();
      })
      .then(data => {
        if (data === null || data === undefined) { reject(new Error('null response')); return; }
        resolve(data);
      })
      .catch(err => { clearTimeout(tid); reject(err); });
  });

  let data = null;
  try {
    // Promise.any: first fulfilled value wins; rejects only when ALL nodes fail
    data = await Promise.any(candidates.map(base => fetchNode(base)));
  } catch (_) {
    // AggregateError — every single node rejected
    console.error(`callCinemaApi [${endpoint}] all ${candidates.length} nodes failed`);
    return null;
  }

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
