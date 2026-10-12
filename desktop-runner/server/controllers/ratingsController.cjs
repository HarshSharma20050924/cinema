const axios = require("axios");
const cheerio = require("cheerio");
const serverCache = require("../services/cacheService.cjs");

async function getRatings(req, res) {
  const { imdbId, title } = req.query;
  if (!imdbId && !title) {
    return res.json({ letterboxdRating: null, letterboxdUrl: null });
  }

  const cleanImdb = (imdbId || "").trim();
  const cacheKey = `ratings:${cleanImdb || title}`;
  const cached = serverCache.get(cacheKey);
  if (cached) return res.json(cached);

  let letterboxdRating = null;
  let letterboxdUrl = null;

  try {
    let targetImdb = cleanImdb;
    if (!targetImdb && title) {
      // Resolve title to IMDb ID via Cinemeta
      const cleanTitle = title.replace(/\b(?:season\s*\d+|s\d+|1080p|720p|480p|2160p|4k|hindi|dual audio)\b/gi, "").trim();
      const metaRes = await axios.get(
        `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(cleanTitle)}.json`,
        { timeout: 3000 }
      ).catch(() => null);

      if (metaRes && metaRes.data && metaRes.data.metas && metaRes.data.metas.length > 0) {
        targetImdb = metaRes.data.metas[0].imdb_id;
      }
    }

    if (targetImdb && /^tt\d+$/.test(targetImdb)) {
      const lbUrl = `https://letterboxd.com/imdb/${targetImdb}/`;
      const response = await axios.get(lbUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        },
        maxRedirects: 5,
        timeout: 4500,
      });

      if (response && response.data) {
        const $ = cheerio.load(response.data);
        const twitterData2 = $("meta[name='twitter:data2']").attr("content");
        if (twitterData2) {
          const match = twitterData2.match(/([\d.]+)\s*out of\s*5/i);
          if (match) {
            letterboxdRating = parseFloat(match[1]).toFixed(1) + "/5";
          }
        }

        letterboxdUrl = response.request?.res?.responseUrl || lbUrl;
      }
    }
  } catch (err) {
    // If Letterboxd page is not found or times out, fail gracefully
  }

  const result = {
    letterboxdRating,
    letterboxdUrl: letterboxdRating ? letterboxdUrl : null,
  };

  serverCache.set(cacheKey, result, 24 * 60 * 60 * 1000); // 24hr cache
  res.json(result);
}

module.exports = { getRatings };
