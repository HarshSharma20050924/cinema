const path = require("path");
const fs = require("fs");
const zendaEngine = require("../services/zendaEngine.cjs");
const manifestService = require("../services/manifestService.cjs");
const serverCache = require("../services/cacheService.cjs");

let ottSeedCache = null;
function getOttSeedPosts(provider, filter) {
  try {
    if (!ottSeedCache) {
      const seedPath = path.resolve(__dirname, "../config/ott_catalog_seed.json");
      if (fs.existsSync(seedPath)) {
        ottSeedCache = JSON.parse(fs.readFileSync(seedPath, "utf8"));
      }
    }
    if (ottSeedCache && ottSeedCache[provider]) {
      const list = ottSeedCache[provider];
      return Array.isArray(list) ? list : [];
    }
  } catch (_) {}
  return [];
}

async function getPosts(req, res) {
  const { provider = "autoEmbed", filter = "", page = 1, tab = "", niche = "" } = req.query;
  const cacheKey = `posts:${provider}:${filter}:${page}:${tab}:${niche}`;
  const cached = serverCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const mod = await zendaEngine.loadModule(provider, "posts");
    if (!mod.getPosts) return res.json([]);

    let activeFilter = filter || "";
    if (provider.toLowerCase() === "kisskh" && (!activeFilter || !activeFilter.startsWith("/"))) {
      activeFilter = `/api/DramaList/List?page=${page}`;
    }

    const context = zendaEngine.getProviderContext(provider);
    const fetchPromise = mod.getPosts({
      filter: activeFilter,
      page: parseInt(page, 10),
      providerValue: provider,
      providerContext: context,
      params: req.query,
      signal: new AbortController().signal,
    });

    let posts = [];
    if (["netflixMirror", "disneyMirror", "primeMirror"].includes(provider)) {
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3500));
      const fastResult = await Promise.race([fetchPromise, timeoutPromise]);
      if (fastResult && Array.isArray(fastResult) && fastResult.length > 0) {
        posts = fastResult;
      } else {
        // Cold start or session unlock in progress: serve seed catalog immediately & cache background result
        fetchPromise
          .then((bgPosts) => {
            if (Array.isArray(bgPosts) && bgPosts.length > 0) {
              serverCache.set(cacheKey, bgPosts, 15 * 60 * 1000);
              serverCache.set(`posts:${provider}:default`, bgPosts, 24 * 60 * 60 * 1000);
            }
          })
          .catch(() => {});
        const seeded = getOttSeedPosts(provider, filter);
        if (seeded.length > 0) {
          return res.json(seeded);
        }
      }
    } else {
      posts = await fetchPromise;
    }

    const result = Array.isArray(posts) ? posts : [];
    if (result.length > 0) {
      serverCache.set(cacheKey, result, 15 * 60 * 1000);
      serverCache.set(`posts:${provider}:default`, result, 24 * 60 * 60 * 1000);
      return res.json(result);
    }

    // Fallback for OTT providers if live fetch returned empty
    if (["netflixMirror", "disneyMirror", "primeMirror"].includes(provider)) {
      const cachedDefault = serverCache.get(`posts:${provider}:default`);
      if (Array.isArray(cachedDefault) && cachedDefault.length > 0) {
        return res.json(cachedDefault);
      }
      const seeded = getOttSeedPosts(provider, filter);
      if (seeded.length > 0) {
        serverCache.set(cacheKey, seeded, 10 * 60 * 1000);
        return res.json(seeded);
      }
    }
    return res.json(result);
  } catch (err) {
    console.error(`Posts error for provider ${provider}:`, err.message);

    if (["netflixMirror", "disneyMirror", "primeMirror"].includes(provider)) {
      const cachedDefault = serverCache.get(`posts:${provider}:default`);
      if (Array.isArray(cachedDefault) && cachedDefault.length > 0) {
        return res.json(cachedDefault);
      }
      const seeded = getOttSeedPosts(provider, filter);
      if (seeded.length > 0) {
        return res.json(seeded);
      }
    }

    // Smart fallback: If category URL failed (e.g. 404 on /category/action), search by clean keyword
    try {
      const cleanQ = (filter || "")
        .replace(/^\/category\//i, "")
        .replace(/^\/categories\//i, "")
        .replace(/^\//, "")
        .replace(/-movies$/i, "")
        .replace(/[-_]/g, " ")
        .trim();

      if (cleanQ) {
        const mod = await zendaEngine.loadModule(provider, "posts");
        if (mod && mod.getSearchPosts) {
          const context = zendaEngine.getProviderContext(provider);
          const fallbackPosts = await mod.getSearchPosts({
            searchQuery: cleanQ,
            page: parseInt(page, 10),
            providerValue: provider,
            providerContext: context,
            signal: new AbortController().signal,
          });
          const result = Array.isArray(fallbackPosts) ? fallbackPosts : [];
          if (result.length > 0) {
            serverCache.set(cacheKey, result, 15 * 60 * 1000);
            return res.json(result);
          }
        }
      }
    } catch (fbErr) {
      console.warn(`Fallback search error for ${provider}:`, fbErr.message);
    }
    res.json([]);
  }
}

async function searchPosts(req, res) {
  const qParam = req.query.q || req.query.query || "";
  const { provider = "autoEmbed", page = 1 } = req.query;
  const q = qParam;
  if (!q) return res.json([]);

  const normQ = q.trim().toLowerCase();
  const cacheKey = `search:${provider}:${normQ}:${page}`;
  const cached = serverCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const mod = await zendaEngine.loadModule(provider, "posts");
    if (!mod.getSearchPosts) return res.json([]);

    const context = zendaEngine.getProviderContext(provider);
    const posts = await mod.getSearchPosts({
      searchQuery: q,
      page: parseInt(page, 10),
      providerValue: provider,
      providerContext: context,
      signal: new AbortController().signal,
    });

    const allProviders = await manifestService.getProviders();
    const provInfo = allProviders.find((p) => p.value === provider);
    const provDisplayName = provInfo ? provInfo.name : provider;

    let result = Array.isArray(posts)
      ? posts.map((item) => ({
          ...item,
          provider: item.provider || provider,
          providerName: item.providerName || provDisplayName,
        }))
      : [];
    
    if (result.length === 0 && ["netflixMirror", "disneyMirror", "primeMirror"].includes(provider)) {
      const seeded = getOttSeedPosts(provider);
      const matched = seeded.filter((p) => (p.title || "").toLowerCase().includes(normQ));
      if (matched.length > 0) {
        result = matched.map((item) => ({
          ...item,
          provider,
          providerName: provDisplayName,
        }));
      }
    }

    if (result.length > 0) {
      serverCache.set(cacheKey, result, 10 * 60 * 1000);
    }
    res.json(result);
  } catch (err) {
    console.error(`Search error for provider ${provider}:`, err.message);
    if (["netflixMirror", "disneyMirror", "primeMirror"].includes(provider)) {
      const seeded = getOttSeedPosts(provider);
      const matched = seeded.filter((p) => (p.title || "").toLowerCase().includes(normQ));
      if (matched.length > 0) {
        return res.json(
          matched.map((item) => ({
            ...item,
            provider,
            providerName: provider,
          }))
        );
      }
    }
    res.json([]);
  }
}

// Smart Relevance Ranking for Search Results
function rankSearchResults(results, query) {
  if (!query || !Array.isArray(results) || results.length <= 1) return results;
  const cleanQ = query.toLowerCase().trim();
  const qWords = cleanQ.split(/\s+/).filter(Boolean);

  const cleanTitle = (raw) => {
    return String(raw || '')
      .replace(/^[\s🎬📺📥⚡📦⬇️▶️]+/gu, '')
      .replace(/^(?:download|watch(?:\s+online)?|stream)\s+/i, '')
      .replace(/\[\s*18\+\s*\]|\(\s*18\+\s*\)/gi, '')
      .replace(/\{[^}]*\}/g, ' ')
      .replace(/\[\s*(?:dual\s*audio|hindi|eng|org|bluray|hevc|x264|x265|720p|1080p|480p|2160p|4k)[^\]]*\]/gi, ' ')
      .split(/\b(?:480p|720p|1080p|2160p|4k)\b/i)[0]
      .trim()
      .toLowerCase();
  };

  const getScore = (item) => {
    const rawTitle = (item.title || '').toLowerCase();
    const cleanT = cleanTitle(rawTitle);

    // 1. Exact match (e.g. "Rear Window")
    if (cleanT === cleanQ || rawTitle === cleanQ) return 1000;

    // 2. Starts with query (e.g. "Rear Window (1954)")
    if (cleanT.startsWith(cleanQ) || rawTitle.startsWith(cleanQ)) return 850;

    // 3. Contains exact query phrase (e.g. "[Hindi] Rear Window")
    if (cleanT.includes(cleanQ) || rawTitle.includes(cleanQ)) return 700;

    // 4. All query words present in title (e.g. both "rear" and "window")
    const allWords = qWords.every(w => cleanT.includes(w) || rawTitle.includes(w));
    if (allWords) {
      const lengthPenalty = Math.abs(cleanT.length - cleanQ.length);
      return 500 - Math.min(lengthPenalty, 200);
    }

    // 5. Some query words present
    let matchedWords = 0;
    qWords.forEach(w => {
      if (cleanT.includes(w) || rawTitle.includes(w)) matchedWords++;
    });
    return matchedWords * 50;
  };

  return [...results].sort((a, b) => getScore(b) - getScore(a));
}

async function globalSearch(req, res) {
  const { q = "", providers = "", page = 1 } = req.query;
  if (!q || !q.trim()) return res.json([]);

  let providerList = [];
  if (providers && providers.trim()) {
    providerList = providers.split(",").map((p) => p.trim()).filter(Boolean);
  }

  const allProviders = await manifestService.getProviders();
  if (providerList.length === 0) {
    providerList = allProviders.filter((p) => !p.disabled).slice(0, 15).map((p) => p.value);
  }

  const sortedList = [...providerList].sort().join(",");
  const normQ = q.trim().toLowerCase();
  const cacheKey = `globalSearch:${normQ}:${sortedList}:${page}`;
  const cached = serverCache.get(cacheKey);
  if (cached) return res.json(cached);

  const providerMap = new Map(allProviders.map((p) => [p.value, p]));

  const searchPromises = providerList.map(async (providerKey) => {
    try {
      const mod = await zendaEngine.loadModule(providerKey, "posts");
      if (!mod || !mod.getSearchPosts) return [];

      const context = zendaEngine.getProviderContext(providerKey);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);

      const posts = await Promise.race([
        mod.getSearchPosts({
          searchQuery: q.trim(),
          page: parseInt(page, 10) || 1,
          providerValue: providerKey,
          providerContext: context,
          signal: controller.signal,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 14000)),
      ]);
      clearTimeout(timeoutId);

      if (!Array.isArray(posts)) return [];
      const provInfo = providerMap.get(providerKey);
      return posts.map((item) => ({
        ...item,
        provider: providerKey,
        providerName: provInfo ? provInfo.name : providerKey,
      }));
    } catch (err) {
      return [];
    }
  });

  const results = await Promise.allSettled(searchPromises);
  let combined = [];
  const seenItems = new Set();

  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      for (const item of r.value) {
        if (item && item.link) {
          const itemKey = (item.provider || "") + "::" + item.link;
          if (!seenItems.has(itemKey)) {
            seenItems.add(itemKey);
            combined.push(item);
          }
        }
      }
    }
  }

  combined = rankSearchResults(combined, q);

  if (combined.length > 0) {
    serverCache.set(cacheKey, combined, 10 * 60 * 1000);
  }

  res.json(combined);
}

module.exports = { getPosts, searchPosts, globalSearch };
