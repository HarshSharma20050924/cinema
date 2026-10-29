// Render keepalive completely disabled per configuration
const RENDER_CLUSTER = [];

async function pingAllRenderServers() {
  // Disabled
}

function startRenderKeepAlive() {
  // Disabled
}

module.exports = {
  startRenderKeepAlive,
  pingAllRenderServers,
  RENDER_CLUSTER
};
