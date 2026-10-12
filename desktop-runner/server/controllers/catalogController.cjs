const zendaEngine = require("../services/zendaEngine.cjs");
const serverCache = require("../services/cacheService.cjs");

async function getCatalog(req, res) {
  const { provider = "autoEmbed" } = req.query;
  const cacheKey = `catalog:${provider}`;
  const cached = serverCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const mod = await zendaEngine.loadModule(provider, "catalog");
    const catalog = mod.catalog || [];
    const genres = mod.genres || [];
    const result = { catalog, genres };
    if (catalog.length > 0) {
      serverCache.set(cacheKey, result, 30 * 60 * 1000);
    }
    res.json(result);
  } catch (err) {
    console.warn(`Catalog not found for ${provider}:`, err.message);
    res.json({ catalog: [{ title: "Popular", filter: "" }], genres: [] });
  }
}

module.exports = { getCatalog };
