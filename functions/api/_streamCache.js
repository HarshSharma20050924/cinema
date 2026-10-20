/**
 * High-Speed Cloudflare D1 / KV Stream Caching Engine
 * ----------------------------------------------------
 * Caches resolved direct stream links (m3u8, pixeldrain, gdrive, mp4, etc.)
 * for 6 hours (21,600,000 ms) across APAC / global Cloudflare edge.
 *
 * CRITICAL SAFETY RULES:
 * 1. ONLY valid, working stream links (array length > 0, valid http/https URLs) are cached.
 * 2. NEVER cache null, empty array [], undefined, error messages, or "no stream found".
 * 3. Cache hits return in ~30-50ms without invoking scrapers.
 */

export const STREAM_CACHE_TTL_MS = 6 * 3600 * 1000; // 6 hours in milliseconds
export const STREAM_CACHE_TTL_SEC = 6 * 3600;       // 6 hours in seconds

let tableInitialized = false;

/**
 * Initializes the stream_cache table in D1 if not already created.
 */
export async function ensureStreamCacheTable(db) {
  if (tableInitialized || !db) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS stream_cache (
        cache_key TEXT PRIMARY KEY,
        streams TEXT NOT NULL,
        title TEXT,
        provider TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_stream_cache_exp ON stream_cache (expires_at)
    `).run();

    tableInitialized = true;
  } catch (err) {
    // Table might already exist or concurrent write
    tableInitialized = true;
  }
}

/**
 * Generates a normalized, collision-resistant cache key.
 */
export async function generateStreamCacheKey(provider, link, type = 'movie', isDownload = false, title = '') {
  const normProv = String(provider || '').trim().toLowerCase();
  const normType = String(type || 'movie').trim().toLowerCase();
  const normDl = (isDownload === true || isDownload === 'true' || isDownload === 1 || isDownload === '1') ? '1' : '0';

  let cleanLink = '';
  if (typeof link === 'object' && link !== null) {
    try {
      cleanLink = JSON.stringify(link);
    } catch {
      cleanLink = String(link);
    }
  } else {
    cleanLink = String(link || '').trim();
  }
  cleanLink = cleanLink.replace(/\/+$/, '');

  // For long links or complex JSON payloads, hash the link portion for key compactness
  let linkPart = cleanLink;
  if (cleanLink.length > 80) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(cleanLink);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      linkPart = hashArray.map(b => b.toString(16).padStart(2, '0')).slice(0, 24).join('');
    } catch {
      linkPart = cleanLink.slice(0, 80);
    }
  }

  return `str:${normProv}:${linkPart}:${normType}:dl${normDl}`;
}

/**
 * Validates if the stream array contains actual, usable stream links.
 * Returns FALSE for null, undefined, empty arrays, or error objects.
 */
export function isValidStreamResult(streams) {
  if (!streams) return false;
  if (!Array.isArray(streams)) return false;
  if (streams.length === 0) return false;

  const validItems = streams.filter(s => {
    if (!s || typeof s !== 'object') return false;
    const url = s.link || s.url || s.file || s.streamUrl;
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;

    const lower = trimmed.toLowerCase();
    if (lower === 'about:blank' || lower === 'javascript:void(0)') return false;
    if (lower.includes('error') && lower.includes('notfound')) return false;
    return true;
  });

  return validItems.length > 0;
}

/**
 * Retrieves cached streams from D1 or KV.
 * Returns null if not cached, expired, or invalid.
 */
export async function getCachedStreams(env, cacheKey) {
  if (!cacheKey) return null;
  const now = Date.now();

  // 1. Check Cloudflare D1 first (fast APAC edge SQLite, unlimited reads)
  if (env?.cinema_db) {
    try {
      const row = await env.cinema_db.prepare(
        'SELECT streams, expires_at FROM stream_cache WHERE cache_key = ? AND expires_at > ?'
      ).bind(cacheKey, now).first();

      if (row?.streams) {
        const parsed = JSON.parse(row.streams);
        if (isValidStreamResult(parsed)) {
          return {
            streams: parsed,
            source: 'd1',
            expiresAt: row.expires_at,
            ttlRemainingMs: row.expires_at - now
          };
        }
      }
    } catch (err) {
      // Table might not exist yet; attempt creation lazily
      ensureStreamCacheTable(env.cinema_db).catch(() => {});
    }
  }

  // 2. Check Cloudflare KV as fallback
  if (env?.CINEMA_KV) {
    try {
      const raw = await env.CINEMA_KV.get(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidStreamResult(parsed)) {
          return {
            streams: parsed,
            source: 'kv',
            expiresAt: now + STREAM_CACHE_TTL_MS,
            ttlRemainingMs: STREAM_CACHE_TTL_MS
          };
        }
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Stores valid streams into Cloudflare D1 and KV for 6 hours.
 * Strictly skips storing if streams are invalid or empty.
 */
export async function setCachedStreams(env, cacheKey, streams, title = '', provider = '') {
  // CRITICAL: NEVER cache null, empty array, or invalid streams!
  if (!isValidStreamResult(streams)) {
    return false;
  }

  const now = Date.now();
  const expiresAt = now + STREAM_CACHE_TTL_MS;
  const serialized = JSON.stringify(streams);
  let saved = false;

  // 1. Save to D1 database
  if (env?.cinema_db) {
    try {
      await ensureStreamCacheTable(env.cinema_db);
      await env.cinema_db.prepare(`
        INSERT OR REPLACE INTO stream_cache (cache_key, streams, title, provider, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(cacheKey, serialized, String(title || '').slice(0, 200), String(provider || '').slice(0, 50), now, expiresAt).run();
      saved = true;

      // Clean up old expired entries opportunistically (1% chance to keep table lean)
      if (Math.random() < 0.02) {
        env.cinema_db.prepare('DELETE FROM stream_cache WHERE expires_at < ?').bind(now).run().catch(() => {});
      }
    } catch (d1Err) {
      console.warn('D1 stream_cache write failed:', d1Err.message);
    }
  }

  // 2. Save to KV (6-hour native TTL)
  if (env?.CINEMA_KV) {
    try {
      await env.CINEMA_KV.put(cacheKey, serialized, { expirationTtl: STREAM_CACHE_TTL_SEC });
      saved = true;
    } catch (kvErr) {
      console.warn('KV stream_cache write failed:', kvErr.message);
    }
  }

  return saved;
}
