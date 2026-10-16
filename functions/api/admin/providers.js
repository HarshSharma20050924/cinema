/**
 * Cloudflare Pages Function: /api/admin/providers
 * Admin API to control which extensions are enabled or hidden from users.
 * Backed by Cloudflare KV (CINEMA_KV)
 */

const ADMIN_SECRET = "cinema_admin_2026";
const ADMIN_PASSWORD = "admin123";

function checkAuth(request) {
  const auth = request.headers.get("Authorization") || "";
  const key = request.headers.get("x-admin-key") || "";
  if (key === ADMIN_SECRET) return true;
  if (auth === `Bearer ${ADMIN_SECRET}`) return true;
  if (auth === `Bearer ${ADMIN_PASSWORD}`) return true;
  if (auth === ADMIN_PASSWORD) return true;
  return false;
}

const ALL_BUILTIN_PROVIDERS = [
  {
    name: "HdHub4u",
    value: "hdhub4u",
    version: "2.27",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/hdhub4u.png",
    type: "global",
    disabled: false,
    description: "Bollywood, Hollywood & South Dubbed",
  },
  {
    name: "VMovies",
    value: "vega",
    version: "2.46",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/vega.png",
    type: "global",
    disabled: false,
    description: "VegaMovies Multi-Audio Releases",
  },
  {
    name: "4kHdHub",
    value: "4khdhub",
    version: "1.2",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/4khdhub.png",
    type: "global",
    disabled: false,
    description: "4K UHD Movie Catalog",
  },
  {
    name: "Cinewood",
    value: "1cinevood",
    version: "1.38",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/1cinevood.png",
    type: "global",
    disabled: false,
    description: "Cinevood Movies & Series",
  },
  {
    name: "World4uFree",
    value: "world4u",
    version: "1.8",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/world4u.png",
    type: "global",
    disabled: false,
    description: "World4uFree Dual Audio",
  },
  {
    name: "KatMoviesHd",
    value: "katmovies",
    version: "1.38",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/katmovies.png",
    type: "global",
    disabled: false,
    description: "KatMoviesHD International & Indian",
  },
  {
    name: "MoviesMod",
    value: "mod",
    version: "2.0",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/mod.png",
    type: "global",
    disabled: false,
    description: "MoviesMod High Quality Torrents & Direct",
  },
  {
    name: "UHDMovies",
    value: "uhd",
    version: "2.1",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/uhd.webp",
    type: "global",
    disabled: false,
    description: "UHDMovies 4K & 1080p Releases",
  },
  {
    name: "MovieBox Web",
    value: "movieBoxWeb",
    version: "1.8",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/movieBoxWeb.png",
    type: "global",
    disabled: false,
    description: "MovieBox Streaming Library",
  },
  {
    name: "NetflixMirror",
    value: "netflixMirror",
    version: "2.11",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/netflixMirror.webp",
    type: "global",
    disabled: false,
    description: "Netflix Mirror Catalog",
  },
  {
    name: "PrimeMirror",
    value: "primeMirror",
    version: "2.10",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/primeMirror.webp",
    type: "global",
    disabled: false,
    description: "Prime Video Mirror Catalog",
  },
  {
    name: "DisneyMirror",
    value: "disneyMirror",
    version: "2.2",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/disneyMirror.webp",
    type: "global",
    disabled: false,
    description: "Disney+ Hotstar Mirror Catalog",
  },
  {
    name: "OlaMovies",
    value: "olamovies",
    version: "1.0",
    icon: "/icons/olamovies.svg",
    type: "hindi",
    disabled: false,
    description: "OlaMovies 4K UHD & 1080p Web Series",
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
    name: "ShowBox",
    value: "showbox",
    version: "1.8",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/showbox.png",
    type: "english",
    disabled: false,
    description: "English Shows & Movies",
  },
  {
    name: "KissKh",
    value: "kissKh",
    version: "1.5",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/kissKh.png",
    type: "english",
    disabled: false,
    description: "Asian Drama & Anime with English Subtitles",
  },
  {
    name: "Torrentio",
    value: "torrentio",
    version: "1.21",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/torrentio.png",
    type: "global",
    disabled: false,
    description: "Torrentio Multi-Scraper",
  },
  {
    name: "Anikoto",
    value: "anikoto",
    version: "2.1",
    icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/anikoto.png",
    type: "anime",
    disabled: false,
    description: "Anime Streaming",
  },
];

export async function onRequest(context) {
  const { request, env } = context;
  const kv = env.CINEMA_KV;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Admin authentication check
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid Admin Credentials" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // GET /api/admin/providers -> Returns all extensions + their enabled/hidden status
  if (request.method === "GET") {
    let savedConfig = {};
    try {
      if (kv) {
        const raw = await kv.get("CINEMA_PROVIDERS");
        if (raw) savedConfig = JSON.parse(raw);
      }
    } catch (_) {}

    // Fetch live manifest from GitHub to ensure all remote providers are known
    let masterList = [...ALL_BUILTIN_PROVIDERS];
    try {
      const res = await fetch(
        "https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main/manifest.json",
        { headers: { "User-Agent": "Cinema-Admin/1.0" } }
      );
      if (res.ok) {
        const remote = await res.json();
        remote.forEach((rp) => {
          if (!masterList.some((p) => p.value === rp.value)) {
            masterList.push({
              name: rp.display_name || rp.name,
              value: rp.value,
              version: rp.version,
              icon: rp.icon || "",
              type: rp.type || "global",
              disabled: Boolean(rp.disabled),
              description: rp.description || "",
            });
          }
        });
      }
    } catch (_) {}

    // Map each extension with its active status based on savedConfig
    const extensions = masterList.map((ext) => {
      const cfg = savedConfig[ext.value];
      const isHidden = cfg?.hidden === true || cfg?.enabled === false;
      return {
        ...ext,
        enabled: !isHidden,
        hidden: isHidden,
      };
    });

    return new Response(
      JSON.stringify({
        extensions,
        config: savedConfig,
        total: extensions.length,
        enabledCount: extensions.filter((e) => e.enabled).length,
        hiddenCount: extensions.filter((e) => e.hidden).length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  // POST /api/admin/providers -> Save enabled/hidden overrides
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const updates = body?.config || body;
      if (typeof updates !== "object" || updates === null) {
        return new Response(JSON.stringify({ error: "Invalid configuration body" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      let currentConfig = {};
      try {
        if (kv) {
          const raw = await kv.get("CINEMA_PROVIDERS");
          if (raw) currentConfig = JSON.parse(raw);
        }
      } catch (_) {}

      // Merge updates
      const nextConfig = { ...currentConfig, ...updates };

      if (kv) {
        await kv.put("CINEMA_PROVIDERS", JSON.stringify(nextConfig));
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Extension visibility updated successfully",
          config: nextConfig,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
