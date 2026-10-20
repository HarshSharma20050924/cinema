/**
 * Cloudflare Pages Function: /api/providers
 * Returns all active extensions allowed by the Administrator.
 * Backed by Cloudflare KV (CINEMA_KV)
 */

export async function onRequest(context) {
  const { request, env } = context;
  const kv = env.CINEMA_KV;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    // 1. Load admin configuration from D1, KV, or coordinator fallback
    let adminConfig = {};
    if (env?.cinema_db) {
      try {
        const row = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'CINEMA_PROVIDERS'").first();
        if (row?.value) adminConfig = JSON.parse(row.value);
      } catch (_) {}
    }
    if (Object.keys(adminConfig).length === 0 && env?.CINEMA_KV) {
      try {
        const raw = await env.CINEMA_KV.get("CINEMA_PROVIDERS");
        if (raw) adminConfig = JSON.parse(raw);
      } catch (_) {}
    }
    if (Object.keys(adminConfig).length === 0) {
      try {
        const coordRes = await fetch(`https://cinema-admin.pages.dev/api/admin/providers?_t=${Date.now()}`, {
          headers: { "Authorization": "Bearer admin123" },
          cache: "no-store",
        });
        if (coordRes.ok) {
          const cData = await coordRes.json();
          if (cData?.config) adminConfig = cData.config;
        }
      } catch (_) {}
    }

    // 2. Fetch manifest from Vega repository
    const manifestRes = await fetch(
      "https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main/manifest.json",
      {
        headers: { "User-Agent": "Cinema-Edge/1.0" },
      }
    );

    let providers = [];
    if (manifestRes.ok) {
      const raw = await manifestRes.json();
      providers = raw.map((p) => ({
        name: p.display_name || p.name,
        value: p.value,
        version: p.version,
        icon: p.icon,
        type: p.type || "global",
        disabled: Boolean(p.disabled),
      }));
    }

    // 3. Builtin custom providers
    const customProviders = [
      {
        name: "GramCinema",
        value: "gramcinema",
        version: "1.0",
        icon: "https://bollywood.eu.org/images/favicon.svg",
        type: "hindi",
        disabled: false,
        description: "Bollywood Telegram Archive",
      },
      {
        name: "OlaMovies",
        value: "olamovies",
        version: "1.0",
        icon: "/icons/olamovies.svg",
        type: "hindi",
        disabled: false,
        description: "OlaMovies 4K UHD & 1080p Releases",
      },
      {
        name: "ThePirateBay",
        value: "tpb",
        version: "1.0",
        icon: "/icons/tpb.svg",
        type: "global",
        disabled: false,
        description: "The Pirate Bay Torrents (Movies & TV)",
      },
    ];

    for (const cp of customProviders) {
      if (!providers.some((p) => p.value === cp.value)) {
        providers.push(cp);
      }
    }

    const UNSUPPORTED_PROVIDERS = new Set([
      'katmoviehd', 'bollyflix', 'moviesflix', 'extramovies', 'world4ufree',
      'skymovieshd', 'cinevood', 'luxmovies', 'eonmovies', 'cinemaluxe',
      'gokuhd', 'ridomovies', 'protonmovies', 'kisskh', 'gogoanime',
      'animerulz', 'yts', '1337x', 'moviesapi', 'kartoons', 'cinefreak',
      'everything', 'uniquestream', 'moviebox', 'skymoviehd'
    ]);

    // 4. Filter according to Administrator's config & stream support
    // Admin config in D1/KV has 100% precedence:
    // - If admin explicitly enabled it -> Include it
    // - If admin explicitly hidden/disabled it -> Exclude it
    // - If non-streaming or unsupported -> Exclude it
    const filteredProviders = providers
      .filter((p) => {
        const val = p.value || '';
        const valLower = val.toLowerCase();
        const cfg = adminConfig[val] || adminConfig[valLower];
        if (cfg) {
          if (cfg.hidden === true || cfg.enabled === false) {
            return false;
          }
          if (cfg.enabled === true) {
            return true;
          }
        }
        if (UNSUPPORTED_PROVIDERS.has(valLower)) {
          return false;
        }
        return !p.disabled;
      })
      .map((p) => ({
        ...p,
        disabled: false,
      }));

    return new Response(JSON.stringify(filteredProviders), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err) {
    // Fallback static providers list if remote fails
    const fallback = [
      {
        name: "HdHub4u",
        value: "hdhub4u",
        version: "2.27",
        icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/hdhub4u.png",
        type: "global",
        disabled: false,
      },
      {
        name: "VMovies",
        value: "vega",
        version: "2.46",
        icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/vega.png",
        type: "global",
        disabled: false,
      },
      {
        name: "MoviesMod",
        value: "mod",
        version: "2.0",
        icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/mod.png",
        type: "global",
        disabled: false,
      },
      {
        name: "Cinewood",
        value: "1cinevood",
        version: "1.38",
        icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/1cinevood.png",
        type: "global",
        disabled: false,
      },
    ];

    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  }
}
