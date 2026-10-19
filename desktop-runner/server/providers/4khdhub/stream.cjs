/**
 * 4KHDHub - Stream & Download Resolver Module
 * Resolves 4KHDHub releases to direct CF Storage, Pixeldrain, FastDL, CF Worker mirrors
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
    console.warn('[4KHDHub] stream extraction error:', err.message);
  }
  return [];
}

module.exports = {
  getStream,
};
