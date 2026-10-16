const path = require("path");
const { execFile } = require("child_process");
const serverCache = require("../services/cacheService.cjs");

const SCRIPT_PATH = path.join(__dirname, "../services/letterboxdScraper.py");

async function getLetterboxdFilms(req, res) {
  const {
    decade = "all",
    genre = "all",
    sort = "rating-highest",
    page = 1,
    search = "",
    list = "",
  } = req.query;

  const cleanSearch = (search || "").trim();
  const cleanList = (list || "").trim();
  const cacheKey = cleanList
    ? `letterboxd:list:${cleanList}:${page}`
    : cleanSearch
    ? `letterboxd:search:${cleanSearch.toLowerCase()}:${page}`
    : `letterboxd:${decade}:${genre}:${sort}:${page}`;
  const cached = serverCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const args = [
    SCRIPT_PATH,
    "--decade", String(decade),
    "--genre", String(genre),
    "--sort", String(sort),
    "--page", String(page),
  ];
  if (cleanSearch) {
    args.push("--search", cleanSearch);
  }
  if (cleanList) {
    args.push("--list", cleanList);
  }

  execFile("python3", args, { maxBuffer: 10 * 1024 * 1024, timeout: 18000 }, (err, stdout, stderr) => {
    if (err) {
      console.warn("Letterboxd scraper error:", err.message);
      return res.json([]);
    }

    try {
      const parsed = JSON.parse(stdout);
      if (Array.isArray(parsed) && parsed.length > 0) {
        serverCache.set(cacheKey, parsed, 30 * 60 * 1000);
        return res.json(parsed);
      }
      return res.json([]);
    } catch (parseErr) {
      console.warn("Letterboxd scraper JSON parse error:", parseErr.message);
      return res.json([]);
    }
  });
}

module.exports = { getLetterboxdFilms };
