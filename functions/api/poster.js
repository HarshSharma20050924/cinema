/**
 * Cloudflare Pages Function: /api/poster
 * Fetches high-res poster and backdrop artwork directly from Cinemeta / Metahub.
 * Runs instantly at Cloudflare Edge with 0 dependency on mobile backend tunnels.
 */
export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("query") || url.searchParams.get("q") || "").trim();
  if (!query) {
    return new Response(JSON.stringify({ poster: null, background: null }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const encoded = encodeURIComponent(query);
  const qLower = query.toLowerCase();

  const findBestArtwork = (metas = []) => {
    if (!Array.isArray(metas) || metas.length === 0) return { poster: null, background: null };
    const exact = metas.find((m) => m.name && m.name.trim().toLowerCase() === qLower);
    if (exact?.poster || exact?.background) {
      return {
        poster: exact.poster || null,
        background: exact.background || (exact.poster && exact.poster.includes("/poster/") ? exact.poster.replace("/poster/", "/background/") : null),
      };
    }
    if (qLower.length >= 2) {
      const contains = metas.find((m) => m.name && m.name.toLowerCase().includes(qLower));
      if (contains?.poster || contains?.background) {
        return {
          poster: contains.poster || null,
          background: contains.background || (contains.poster && contains.poster.includes("/poster/") ? contains.poster.replace("/poster/", "/background/") : null),
        };
      }
      const first = metas[0];
      return {
        poster: first?.poster || null,
        background: first?.background || (first?.poster && first?.poster.includes("/poster/") ? first.poster.replace("/poster/", "/background/") : null),
      };
    }
    return { poster: null, background: null };
  };

  try {
    let art = { poster: null, background: null };
    // 1. Movie search
    const mRes = await fetch(`https://v3-cinemeta.strem.io/catalog/movie/top/search=${encoded}.json`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (mRes.ok) {
      const data = await mRes.json();
      art = findBestArtwork(data?.metas);
    }

    // 2. Series search fallback
    if (!art.poster && !art.background) {
      const sRes = await fetch(`https://v3-cinemeta.strem.io/catalog/series/top/search=${encoded}.json`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (sRes.ok) {
        const data = await sRes.json();
        art = findBestArtwork(data?.metas);
      }
    }

    return new Response(JSON.stringify(art), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ poster: null, background: null }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
