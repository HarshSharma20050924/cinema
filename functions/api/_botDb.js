/**
 * D1 Database Storage & Link Resolution Helper
 */
import { DEFAULT_ENABLED_PROVIDERS } from "./_botConfig.js";

export function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

export async function storeLink(db, provider, link, title) {
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

export async function getStoredLink(db, id) {
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

export async function getEnabledProviders(db) {
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

export async function saveEnabledProviders(db, list) {
  if (!db) return;
  try {
    await db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES ('BOT_ENABLED_PROVIDERS', ?, ?)").bind(JSON.stringify(list), Date.now()).run();
  } catch (_) {}
}

export async function getUserBotSettings(db, userId, botKey, defaultProvider) {
  if (!db || !userId) return { active_provider: defaultProvider, search_mode: 'single' };
  try {
    const row = await db.prepare("SELECT active_provider, search_mode FROM user_bot_settings WHERE user_id = ? AND bot_key = ?").bind(String(userId), botKey).first();
    if (row && row.active_provider) {
      return {
        active_provider: row.active_provider,
        search_mode: row.search_mode || 'single'
      };
    }
  } catch (_) {}
  return { active_provider: defaultProvider, search_mode: 'single' };
}

export async function setUserBotSettings(db, userId, botKey, updates) {
  if (!db || !userId) return;
  try {
    const current = await getUserBotSettings(db, userId, botKey, updates.active_provider || 'hdhub4u');
    const activeProvider = updates.active_provider || current.active_provider;
    const searchMode = updates.search_mode || current.search_mode;
    await db.prepare(`
      INSERT INTO user_bot_settings (user_id, bot_key, active_provider, search_mode, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (user_id, bot_key) DO UPDATE SET
        active_provider = excluded.active_provider,
        search_mode = excluded.search_mode,
        updated_at = excluded.updated_at
    `).bind(String(userId), botKey, activeProvider, searchMode, Date.now()).run();
  } catch (err) {
    console.warn('setUserBotSettings err:', err.message);
  }
}
