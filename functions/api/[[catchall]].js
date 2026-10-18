/**
 * Cloudflare Pages Function: /api/* Pure Mobile Proxy
 * 100% transparent forwarding directly to the Mobile Backend via Tunnel.
 * Multi-Node Cluster Load Balancing with automatic edge failover.
 */
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const reqUrl = new URL(request.url);

    // Direct Edge Native Handler for The Pirate Bay
    const tpbResp = await handleTpbRequest(reqUrl);
    if (tpbResp) return tpbResp;

    let backendUrl = null;
    let pool = [];

    // 1. Query D1 database first (APAC edge, fast, unlimited reads/writes)
    if (env?.cinema_db) {
      try {
        const urlRow = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'BACKEND_URL'").first();
        if (urlRow?.value) backendUrl = urlRow.value;
        const poolRow = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'BACKEND_POOL'").first();
        if (poolRow?.value) pool = JSON.parse(poolRow.value);
      } catch (_) {}
    }

    // 2. Query KV fallback
    if (!backendUrl && env?.CINEMA_KV) {
      try {
        backendUrl = await env.CINEMA_KV.get("BACKEND_URL");
      } catch (_) {}
    }
    if ((!pool || pool.length === 0) && env?.CINEMA_KV) {
      try {
        const rawPool = await env.CINEMA_KV.get("BACKEND_POOL");
        if (rawPool) pool = JSON.parse(rawPool);
      } catch (_) {}
    }

    // Helper to reject self-referential URLs that cause 502 infinite proxy loops
    const isSelfUrl = (u) => {
      try {
        const parsed = new URL(u);
        return parsed.hostname === reqUrl.hostname || parsed.hostname.includes("cinema-dwh.pages.dev");
      } catch {
        return true;
      }
    };

    // Build candidate URL list: live pool nodes first, then fallback
    const candidates = [];
    const now = Date.now();
    const isRelayOnlyRoute = reqUrl.pathname === "/api/fetch" || reqUrl.pathname === "/fetch";

    if (Array.isArray(pool)) {
      for (const item of pool) {
        const isFresh = !item.lastSeen || (now - item.lastSeen < 180000);
        const u = typeof item === "string" ? item : item?.url;
        const isRelay = (typeof item === "object") && (
          item?.role === "residential_relay" ||
          (item?.deviceName || "").toLowerCase().includes("relay") ||
          (item?.deviceId || "").toLowerCase().includes("relay")
        );

        // Do not route general API endpoints (/meta, /streams, /posts, etc.) to residential relays!
        if (isRelay && !isRelayOnlyRoute) continue;

        if (isFresh && u && /^https?:\/\//i.test(u) && !isSelfUrl(u)) {
          const clean = u.replace(/\/+$/, "");
          if (!candidates.includes(clean)) {
            candidates.push(clean);
          }
        }
      }
    }
    if (backendUrl && /^https?:\/\//i.test(backendUrl) && !isSelfUrl(backendUrl)) {
      const clean = backendUrl.replace(/\/+$/, "");
      if (!candidates.includes(clean)) {
        candidates.push(clean);
      }
    }

    // Always ensure 24/7 Render Cloud Engine is in candidate list
    const RENDER_PRIMARY = "https://cinema-4h7t.onrender.com";
    if (!candidates.includes(RENDER_PRIMARY)) {
      candidates.push(RENDER_PRIMARY);
    }

    // For general API calls, prioritize Render (the 24/7 dedicated compute engine)
    if (!isRelayOnlyRoute && candidates.includes(RENDER_PRIMARY)) {
      const idx = candidates.indexOf(RENDER_PRIMARY);
      candidates.splice(idx, 1);
      candidates.unshift(RENDER_PRIMARY); // Place at top of candidate list
    }

    // Helper to fetch live providers directly from Zenda GitHub manifest
    const getDirectProviders = async () => {
      try {
        const manifestRes = await fetch("https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main/manifest.json", {
          headers: { "User-Agent": "Cinema-Edge/1.0" }
        });
        if (manifestRes.ok) {
          const raw = await manifestRes.json();
          const providers = raw
            .filter(p => !p.disabled)
            .map(p => ({
              name: p.display_name || p.name,
              value: p.value,
              version: p.version,
              icon: p.icon,
              type: p.type || "global",
              disabled: false,
            }));
          providers.push({
            name: "GramCinema",
            value: "gramcinema",
            version: "1.0",
            icon: "https://bollywood.eu.org/images/favicon.svg",
            type: "hindi",
            disabled: false,
            description: "Bollywood, South, Dual Audio — TG Archive",
          });
          providers.push({
            name: "OlaMovies",
            value: "olamovies",
            version: "1.0",
            icon: "/icons/olamovies.svg",
            type: "hindi",
            disabled: false,
            description: "Highest Quality 4K UHD, 1080p Movies & Series",
          });
          providers.push({
            name: "ThePirateBay",
            value: "tpb",
            version: "1.0",
            icon: "/icons/tpb.svg",
            type: "global",
            disabled: false,
            description: "The Pirate Bay (Movies & TV Series)",
          });
          return new Response(JSON.stringify(providers), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=120"
            }
          });
        }
      } catch (_) {}
      return null;
    };

    const isProvidersReq = reqUrl.pathname === "/api/providers" || reqUrl.pathname.endsWith("/providers");

    if (candidates.length === 0) {
      if (isProvidersReq) {
        const direct = await getDirectProviders();
        if (direct) return direct;
      }
      return new Response(
        JSON.stringify({
          error: "Mobile backend cluster is offline. Please start server on your phone.",
          activeNodes: 0,
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    // Multi-Node Parallel Load Balancing
    const orderedCandidates = [...candidates];
    if (orderedCandidates.length > 1 && isRelayOnlyRoute) {
      const shift = Math.floor(Math.random() * orderedCandidates.length);
      for (let s = 0; s < shift; s++) {
        orderedCandidates.push(orderedCandidates.shift());
      }
    }

    // Iterate candidate nodes with fast failover
    let lastError = null;
    for (let i = 0; i < orderedCandidates.length; i++) {
      const candidateUrl = orderedCandidates[i];
      const searchParams = new URLSearchParams(reqUrl.search);
      const qVal = searchParams.get("query") || searchParams.get("q") || "";
      if (qVal) {
        searchParams.set("query", qVal);
        searchParams.set("q", qVal);
      }
      const targetUrl = `${candidateUrl}${reqUrl.pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

      try {
        const controller = new AbortController();
        const isLongReq = reqUrl.pathname.includes("/streams") || reqUrl.pathname.includes("/download") || reqUrl.pathname.includes("/meta");
        const timeoutMs = isLongReq ? 25000 : 8000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const reqHeaders = {
          "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0",
          Accept: request.headers.get("Accept") || "*/*",
        };
        const incomingContentType = request.headers.get("Content-Type");
        if (incomingContentType) reqHeaders["Content-Type"] = incomingContentType;
        const incomingAuth = request.headers.get("Authorization");
        if (incomingAuth) reqHeaders["Authorization"] = incomingAuth;

        const upstreamResp = await fetch(targetUrl, {
          method: request.method,
          headers: reqHeaders,
          body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        // Fail over to next node if an API endpoint returns 404 or >= 500 and more nodes exist
        const isApiEndpoint = reqUrl.pathname.startsWith("/api/");
        const isFailoverStatus = upstreamResp.status >= 500 || (isApiEndpoint && upstreamResp.status === 404);
        const hasMoreCandidates = i < orderedCandidates.length - 1;

        if (!isFailoverStatus || !hasMoreCandidates) {
          const respHeaders = new Headers(upstreamResp.headers);
          // Delete compression headers to avoid Worker decompression mismatches
          respHeaders.delete("content-encoding");
          respHeaders.delete("content-length");
          respHeaders.delete("transfer-encoding");
          respHeaders.set("Access-Control-Allow-Origin", "*");
          respHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          respHeaders.set("X-Cinema-Server-Node", candidateUrl);

          const status = upstreamResp.status;
          const body = (status === 204 || status === 304) ? null : upstreamResp.body;

          return new Response(body, {
            status,
            headers: respHeaders,
          });
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (isProvidersReq) {
      const direct = await getDirectProviders();
      if (direct) return direct;
    }

    return new Response(
      JSON.stringify({
        error: "All phone backends in cluster currently offline or unreachable",
        details: lastError ? lastError.message : "Cluster nodes exhausted",
        nodesAttempted: orderedCandidates.length,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (fatalErr) {
    return new Response(
      JSON.stringify({
        error: fatalErr.message,
        stack: fatalErr.stack,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}

/**
 * High-speed Cloudflare Edge Handler for The Pirate Bay
 */
async function handleTpbRequest(reqUrl) {
  const pathname = reqUrl.pathname;
  const provider = reqUrl.searchParams.get("provider");
  const link = reqUrl.searchParams.get("link") || "";
  const isTpb = provider === "tpb" || link.startsWith("tpb:");

  if (!isTpb) return null;

  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=120",
  };

  // 1. Catalog
  if (pathname === "/api/catalog" || pathname.endsWith("/catalog")) {
    return new Response(JSON.stringify([
      { title: "Top 100 Movies & TV", filter: "top100_video" },
      { title: "Recent Torrents", filter: "recent" },
      { title: "4K / UHD Movies", filter: "211" },
      { title: "HD Movies (1080p)", filter: "207" },
      { title: "HD TV Shows", filter: "208" },
    ]), { status: 200, headers: corsHeaders });
  }

  function detectQuality(fn) {
    const f = (fn || "").toLowerCase();
    if (f.includes("2160p") || f.includes("4k") || f.includes("uhd")) return "4K";
    if (f.includes("1080p") || f.includes("fhd")) return "1080p";
    if (f.includes("720p") || f.includes("hd")) return "720p";
    if (f.includes("480p") || f.includes("sd")) return "480p";
    return "HD";
  }

  function formatSize(bytes) {
    const b = parseInt(bytes, 10);
    if (!b) return "";
    if (b >= 1024 * 1024 * 1024) return (b / (1024 * 1024 * 1024)).toFixed(1) + " GB";
    if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(0) + " MB";
    return b + " B";
  }

  function cleanName(raw) {
    let n = (raw || "")
      .replace(/\[1337x[^\]]*\]/gi, "")
      .replace(/\[eztv[^\]]*\]/gi, "")
      .replace(/\.(mkv|mp4|avi)$/i, "")
      .trim();
    const yMatch = n.match(/[\s.(_-](19\d\d|20\d\d)[\s.)_-]/);
    const year = yMatch ? yMatch[1] : "";
    if (yMatch) n = n.slice(0, yMatch.index).trim();
    n = n.replace(/\[.*?\]/g, "").replace(/\(.*?\)/g, "").replace(/\b(2160p|1080p|720p|480p|BluRay|WEBRip|WEB-DL|HEVC|x265|x264)\b/gi, "").replace(/[-_.]+/g, " ").trim();
    return { title: n || raw, year };
  }

  function itemToCard(item) {
    const { title, year } = cleanName(item.name);
    const q = detectQuality(item.name);
    const sz = formatSize(item.size);
    const seeds = item.seeders ? `▲ ${item.seeders}` : "";
    const label = [q, sz, seeds].filter(Boolean).join(" · ");
    const poster = item.imdb && /^tt\d+$/.test(item.imdb)
      ? `https://images.metahub.space/poster/medium/${item.imdb}/img`
      : "";
    return {
      title,
      link: `tpb:${item.id}:${item.info_hash}:${encodeURIComponent(item.name)}`,
      image: poster,
      quality: q,
      fileSize: sz,
      seeders: item.seeders,
      leechers: item.leechers,
      infoHash: item.info_hash,
      fileName: item.name,
      imdb: item.imdb || "",
      year,
      label,
      provider: "tpb",
      providerName: "ThePirateBay",
    };
  }

  // 2. Posts & Search
  if (pathname === "/api/posts" || pathname.endsWith("/posts") || pathname === "/api/search" || pathname.endsWith("/search")) {
    const q = reqUrl.searchParams.get("query") || reqUrl.searchParams.get("q") || "";
    const filter = reqUrl.searchParams.get("filter") || "";
    let endpoint = "";

    if (q) {
      endpoint = `https://apibay.org/q.php?q=${encodeURIComponent(q)}&cat=200`;
    } else if (filter === "recent") {
      endpoint = "https://apibay.org/precompiled/data_top100_recent.json";
    } else if (filter === "211") {
      endpoint = "https://apibay.org/q.php?q=category:211";
    } else if (filter === "207") {
      endpoint = "https://apibay.org/precompiled/data_top100_207.json";
    } else if (filter === "208") {
      endpoint = "https://apibay.org/precompiled/data_top100_208.json";
    } else {
      endpoint = "https://apibay.org/precompiled/data_top100_200.json";
    }

    try {
      const apiRes = await fetch(endpoint, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (apiRes.ok) {
        const rawItems = await apiRes.json();
        if (Array.isArray(rawItems)) {
          const cards = rawItems.filter(i => i.name && i.name !== "No results returned").map(itemToCard);
          return new Response(JSON.stringify(cards), { status: 200, headers: corsHeaders });
        }
      }
    } catch (_) {}
    return new Response(JSON.stringify([]), { status: 200, headers: corsHeaders });
  }

  // 3. Metadata
  if (pathname === "/api/meta" || pathname.endsWith("/meta")) {
    if (link.startsWith("tpb:")) {
      const parts = link.split(":");
      const id = parts[1] || "";
      const infoHash = parts[2] || "";
      let fileName = parts.slice(3).join(":");
      try { fileName = decodeURIComponent(fileName); } catch (_) {}
      const { title, year } = cleanName(fileName);
      const q = detectQuality(fileName);

      let imdbId = "";
      try {
        const descRes = await fetch(`https://apibay.org/t.php?id=${id}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (descRes.ok) {
          const tData = await descRes.json();
          imdbId = tData.imdb || "";
        }
      } catch (_) {}

      const poster = imdbId && /^tt\d+$/.test(imdbId)
        ? `https://images.metahub.space/poster/medium/${imdbId}/img`
        : "";

      return new Response(JSON.stringify({
        title,
        image: poster,
        synopsis: `${title} (${year || "Release"}) · Torrent Swarm [InfoHash: ${infoHash.slice(0, 8)}...]`,
        year,
        rating: "8.0",
        imdbId,
        tags: ["ThePirateBay", q, "Torrent"],
        type: "movie",
        linkList: [
          {
            title: `${q} Full Torrent Release`,
            directLinks: [
              {
                title: `${q} · Fast Direct Stream`,
                link,
                quality: q,
              },
            ],
          },
        ],
      }), { status: 200, headers: corsHeaders });
    }
  }

  // 4. Streams
  if (pathname === "/api/streams" || pathname.endsWith("/streams")) {
    if (link.startsWith("tpb:")) {
      const parts = link.split(":");
      const infoHash = parts[2] || "";
      let fileName = parts.slice(3).join(":");
      try { fileName = decodeURIComponent(fileName); } catch (_) {}
      const q = detectQuality(fileName);

      return new Response(JSON.stringify([
        {
          server: "The Pirate Bay Fast Stream",
          link: `/api/stream/torrent?hash=${infoHash}&name=${encodeURIComponent(fileName)}`,
          type: "torrent",
          quality: q,
        },
        {
          server: "Torrent Direct Download",
          link: `/api/torrent/download?hash=${infoHash}&name=${encodeURIComponent(fileName)}`,
          type: "download",
          quality: q,
        },
        {
          server: "Raw Torrent Magnet",
          link: `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(fileName)}&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce`,
          type: "magnet",
          quality: q,
        },
      ]), { status: 200, headers: corsHeaders });
    }
  }

  return null;
}
