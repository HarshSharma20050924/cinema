const zendaEngine = require('../services/zendaEngine.cjs');

async function getEpisodes(req, res) {
  const { provider, url, link } = req.query;
  const targetUrl = url || link;

  if (!provider || !targetUrl) {
    return res.status(400).json({ error: 'provider and url/link required' });
  }

  try {
    const provKey = zendaEngine.normalizeProvider(provider);
    const mod = await zendaEngine.loadModule(provKey, 'episodes');

    if (!mod || typeof mod.getEpisodes !== 'function') {
      return res.status(404).json({ error: `Provider ${provider} does not support episodes module` });
    }

    const ctx = zendaEngine.getProviderContext(provKey);
    const episodes = await mod.getEpisodes({
      url: targetUrl,
      providerContext: ctx,
      signal: new AbortController().signal,
    });

    return res.json(Array.isArray(episodes) ? episodes : []);
  } catch (err) {
    console.error(`[EpisodesController] Error for ${provider}:`, err.message);
    return res.status(500).json({ error: err.message, episodes: [] });
  }
}

module.exports = { getEpisodes };
