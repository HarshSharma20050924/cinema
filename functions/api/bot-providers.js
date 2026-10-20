/**
 * Cloudflare Pages Function: /api/bot-providers
 * Single Source of Truth for Telegram Bot & Auto-Poster Enabled Providers.
 * Backed by Cloudflare D1 Database (cinema_db).
 */

const ALL_EXTENSIONS = [
  { name: "HDHub4u", value: "hdhub4u" },
  { name: "VegaMovies", value: "vega" },
  { name: "4KHDHub", value: "4khdhub" },
  { name: "MoviesDrive", value: "drive" },
  { name: "MoviesMod", value: "moviesmod" },
  { name: "UHDMovies", value: "uhd" },
  { name: "MovieBox", value: "movieBoxWeb" },
  { name: "MultiMovies", value: "multi" },
  { name: "TopMovies", value: "topmovies" },
  { name: "Movies4u", value: "movies4u" },
  { name: "Castle", value: "castle" },
  { name: "MX Player", value: "mxplayer" },
  { name: "AnimeWorld", value: "animeworld" },
  { name: "AnimeSalt", value: "animesalt" },
  { name: "HiAnime", value: "hiAnime" },
  { name: "AniKoto", value: "anikoto" },
  { name: "ThePirateBay", value: "tpb" },
  { name: "Netflix", value: "netflixMirror" },
  { name: "Disney+", value: "disneyMirror" },
  { name: "Prime Video", value: "primeMirror" },
  { name: "ShowBox", value: "showbox" },
  { name: "FlixHQ", value: "flixhq" },
  { name: "DramaCool", value: "dramacool" },
  { name: "FilmyFly", value: "filmyfly" },
  { name: "MovieZwap", value: "moviezwap" },
  { name: "ZeeFliz", value: "zeefliz" }
];

const DEFAULT_BOT_PROVIDERS = [
  "drive",
  "vega",
  "hdhub4u",
  "4khdhub",
  "movieBoxWeb",
  "autoEmbed"
];

export async function onRequestGet(context) {
  const { env } = context;
  const db = env?.cinema_db;

  let enabled = [];
  if (db) {
    try {
      const row = await db.prepare("SELECT value FROM config WHERE key = 'BOT_ENABLED_PROVIDERS'").first();
      if (row?.value) {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed) && parsed.length > 0) enabled = parsed;
      }
    } catch (_) {}
  }

  if (enabled.length === 0) {
    enabled = DEFAULT_BOT_PROVIDERS;
  }

  return new Response(JSON.stringify({
    ok: true,
    scope: "bot",
    enabled,
    all: ALL_EXTENSIONS,
    count: enabled.length,
    updatedAt: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=15"
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env?.cinema_db;

  try {
    const body = await request.json();
    const { providers, secret } = body || {};

    if (secret !== "cinema_secret_2026") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (!Array.isArray(providers)) {
      return new Response(JSON.stringify({ error: "Invalid providers list format" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (db) {
      await db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES ('BOT_ENABLED_PROVIDERS', ?, ?)")
        .bind(JSON.stringify(providers), Date.now()).run();
    }

    return new Response(JSON.stringify({
      ok: true,
      enabled: providers,
      count: providers.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
