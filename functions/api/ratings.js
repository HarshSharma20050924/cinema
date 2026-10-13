/**
 * Cloudflare Pages Function: /api/ratings
 * Scrapes and serves Letterboxd ratings directly from the edge.
 * Fast, serverless, and caches at the edge worldwide.
 */
export async function onRequest(context) {
  const { request } = context;

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

  const url = new URL(request.url);
  const imdbId = (url.searchParams.get("imdbId") || "").trim();
  const title = (url.searchParams.get("title") || "").trim();

  if (!imdbId && !title) {
    return new Response(
      JSON.stringify({ letterboxdRating: null, letterboxdUrl: null }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  let targetImdb = imdbId;

  // If no IMDb ID provided, resolve title via Cinemeta
  if (!targetImdb && title) {
    try {
      const cleanTitle = title
        .replace(/\b(?:season\s*\d+|s\d+|1080p|720p|480p|2160p|4k|hindi|dual audio)\b/gi, "")
        .trim();
      const metaRes = await fetch(
        `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(cleanTitle)}.json`,
        { headers: { "User-Agent": "Cinema-Edge/1.0" } }
      );
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        if (metaData?.metas?.[0]?.imdb_id) {
          targetImdb = metaData.metas[0].imdb_id;
        }
      }
    } catch (_) {}
  }

  let letterboxdRating = null;
  let letterboxdUrl = null;

  if (targetImdb && /^tt\d+$/.test(targetImdb)) {
    try {
      const lbUrl = `https://letterboxd.com/imdb/${targetImdb}/`;
      const lbRes = await fetch(lbUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        },
        redirect: "follow",
      });

      if (lbRes.ok) {
        letterboxdUrl = lbRes.url || lbUrl;
        const html = await lbRes.text();

        // 1. Check meta twitter:data2
        const matchData2 = html.match(/name=["']twitter:data2["'][^>]*content=["']([^"']+)["']/i) ||
          html.match(/content=["']([^"']+)["'][^>]*name=["']twitter:data2["']/i);
        if (matchData2) {
          const m = matchData2[1].match(/([\d.]+)\s*out of\s*5/i);
          if (m) {
            letterboxdRating = parseFloat(m[1]).toFixed(1) + "/5";
          }
        }

        // 2. Check JSON-LD aggregateRating ratingValue fallback
        if (!letterboxdRating) {
          const matchRating = html.match(/"ratingValue"\s*:\s*([\d.]+)/);
          if (matchRating) {
            letterboxdRating = parseFloat(matchRating[1]).toFixed(1) + "/5";
          }
        }

        // 3. Fallback to url in JSON-LD if present
        if (!letterboxdUrl || letterboxdUrl.includes("/imdb/")) {
          const matchUrl = html.match(/"url"\s*:\s*"(https:\/\/letterboxd\.com\/film\/[^"]+\/)"/);
          if (matchUrl) {
            letterboxdUrl = matchUrl[1];
          }
        }
      }
    } catch (_) {}
  }

  return new Response(
    JSON.stringify({
      letterboxdRating,
      letterboxdUrl: letterboxdRating ? letterboxdUrl : null,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400", // 24 hours
      },
    }
  );
}
