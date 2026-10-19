/**
 * HDHub4u - Stream & Download Resolver Module
 * Uses robust extractHubCloudMirrors to extract direct CF Storage, Pixeldrain, FastDL, CF Worker mirrors
 */
const { extractHubCloudMirrors } = require('../../controllers/streamController.cjs');

async function getStream({ link, isDownload = false }) {
  if (!link) return [];
  try {
    const mirrors = await extractHubCloudMirrors(link);
    if (mirrors && mirrors.length > 0) {
      return mirrors;
    }
  } catch (err) {
    console.warn('[HDHub4u] stream extraction error:', err.message);
  }
  return [];
}

module.exports = {
  getStream,
};
