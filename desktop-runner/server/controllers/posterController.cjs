const axios = require("axios");

const posterMemoryCache = new Map();

/**
 * Searches Cinemeta for high-resolution movie/series poster artwork
 */
async function getPoster(req, res) {
  const query = (req.query.query || req.query.q || "").trim();
  if (!query) return res.json({ poster: null });

  const cacheKey = query.toLowerCase();
  if (posterMemoryCache.has(cacheKey)) {
    const cached = posterMemoryCache.get(cacheKey);
    if (typeof cached === "string") {
      return res.json({ poster: cached, background: null });
    }
    return res.json({ poster: cached?.poster || null, background: cached?.background || null });
  }

  try {
    const encoded = encodeURIComponent(query);
    const mRes = await axios.get(
      `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encoded}.json`,
      {
        timeout: 6000,
        headers: { "User-Agent": "Mozilla/5.0" },
      }
    );
    const qLower = query.toLowerCase();
    const findBestArtwork = (metas = []) => {
      if (!Array.isArray(metas) || metas.length === 0) return { poster: null, background: null };
      const exact = metas.find((m) => m.name && m.name.trim().toLowerCase() === qLower);
      if (exact?.poster || exact?.background) {
        return {
          poster: exact.poster || null,
          background: exact.background || null,
        };
      }
      if (qLower.length >= 4) {
        const contains = metas.find((m) => m.name && m.name.toLowerCase().includes(qLower));
        if (contains?.poster || contains?.background) {
          return {
            poster: contains.poster || null,
            background: contains.background || null,
          };
        }
        return {
          poster: metas[0]?.poster || null,
          background: metas[0]?.background || null,
        };
      }
      return { poster: null, background: null };
    };

    let art = findBestArtwork(mRes.data?.metas);
    if (!art.poster && !art.background) {
      const sRes = await axios.get(
        `https://v3-cinemeta.strem.io/catalog/series/top/search=${encoded}.json`,
        {
          timeout: 6000,
          headers: { "User-Agent": "Mozilla/5.0" },
        }
      );
      art = findBestArtwork(sRes.data?.metas);
    }

    if (art.poster || art.background) {
      posterMemoryCache.set(cacheKey, art);
      return res.json({ poster: art.poster, background: art.background });
    }
  } catch (_) {}

  posterMemoryCache.set(cacheKey, null);
  return res.json({ poster: null, background: null });
}

/**
 * Proxies external images to bypass browser adblocker domain filters (e.g. Brave Shields ERR_BLOCKED_BY_CLIENT)
 * and strip hotlink-blocking referrers.
 */
async function proxyImage(req, res) {
  const imageUrl = (req.query.url || "").trim();
  if (!imageUrl || !imageUrl.startsWith("http")) {
    return res.status(400).send("Invalid url");
  }

  try {
    const upstream = await axios.get(imageUrl, {
      responseType: "stream",
      timeout: 8000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: imageUrl,
      },
    });

    res.setHeader("Content-Type", upstream.headers["content-type"] || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
    upstream.data.pipe(res);
  } catch (err) {
    res.status(502).send("Image proxy error");
  }
}

module.exports = {
  getPoster,
  proxyImage,
};
