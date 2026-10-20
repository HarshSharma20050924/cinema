/**
 * Cinema Multi-Node Render Cluster Load Balancer
 * ------------------------------------------------
 * Distributes requests evenly across 5 24/7 Render cloud engines
 * with fast edge failover and residential phone proxying via Jio phone.
 */

export const RENDER_CLUSTER = [
  "https://cinema-4h7t.onrender.com",
  "https://cinema-1-zjrx.onrender.com",
  "https://cinema-2-mg14.onrender.com",
  "https://cinema-3-euoh.onrender.com",
  "https://cinema-4-260y.onrender.com"
];

/**
 * Returns the 5 Render cluster instances rotated with a random offset
 * so each incoming request hits a different server (smooth 20% load distribution).
 */
export function getBalancedRenderCluster() {
  const nodes = [...RENDER_CLUSTER];
  const offset = Math.floor(Math.random() * nodes.length);
  return nodes.slice(offset).concat(nodes.slice(0, offset));
}

/**
 * Merges active dynamic pool nodes (mobile/local runners) with the balanced Render cluster.
 * Dynamic mobile runners are placed first, followed by the balanced 5-node Render cluster.
 */
export function buildBalancedCandidateList(poolCandidates = []) {
  const candidates = [];

  // 1. Dynamic mobile / local dev runners first
  for (const u of poolCandidates) {
    if (u && /^https?:\/\//i.test(u)) {
      const clean = u.replace(/\/+$/, '');
      if (!candidates.includes(clean) && !RENDER_CLUSTER.includes(clean)) {
        candidates.push(clean);
      }
    }
  }

  // 2. Add rotated Render cluster nodes
  const rotatedRender = getBalancedRenderCluster();
  for (const renderNode of rotatedRender) {
    if (!candidates.includes(renderNode)) {
      candidates.push(renderNode);
    }
  }

  return candidates;
}
