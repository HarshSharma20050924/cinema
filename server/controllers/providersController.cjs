const manifestService = require('../services/manifestService.cjs');

async function getProviders(req, res) {
  try {
    const list = await manifestService.getProviders();
    res.json(list);
  } catch (err) {
    console.error('Error fetching providers:', err.message);
    res.json([]);
  }
}

module.exports = { getProviders };
