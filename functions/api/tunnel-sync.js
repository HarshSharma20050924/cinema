export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { url, secret } = body || {};

    if (secret !== "cinema_secret_2026") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Block if global killswitch is active
    let killswitch = null;
    if (env?.CINEMA_KV) {
      try { killswitch = await env.CINEMA_KV.get("GLOBAL_KILLSWITCH"); } catch (_) {}
    }
    if (killswitch === "true") {
      return new Response(JSON.stringify({ error: "Service suspended by administrator", killswitchActive: true }), {
        status: 403,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Block banned devices
    const { deviceId, deviceName } = body || {};
    let banned = [];
    if (env?.CINEMA_KV) {
      try {
        const bannedRaw = await env.CINEMA_KV.get("BANNED_DEVICES");
        if (bannedRaw) banned = JSON.parse(bannedRaw);
      } catch (_) {}
    }
    if (deviceId && banned.includes(deviceId)) {
      return new Response(JSON.stringify({ error: "Device banned by administrator", allowed: false }), {
        status: 403,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (!url || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: "Invalid URL provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const cleanUrl = url.replace(/\/+$/, "");

    let pool = [];
    // 1. Try D1 first (100k daily writes free)
    if (env?.cinema_db) {
      try {
        const row = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'BACKEND_POOL'").first();
        if (row?.value) pool = JSON.parse(row.value);
      } catch (_) {}
    }
    // 2. Try KV fallback
    if (pool.length === 0 && env?.CINEMA_KV) {
      try {
        const existing = await env.CINEMA_KV.get("BACKEND_POOL");
        if (existing) pool = JSON.parse(existing);
      } catch (_) {}
    }
    if (!Array.isArray(pool)) pool = [];

    // Filter out stale tunnels older than 10 minutes (600,000ms)
    const now = Date.now();
    pool = pool.filter(p => now - (p.lastSeen || 0) < 600000);

    // Add or update current device in cluster pool
    const devKey = deviceId || cleanUrl;
    const existingIdx = pool.findIndex(p => p.deviceId === devKey || p.url === cleanUrl);
    const entry = {
      deviceId: devKey,
      deviceName: deviceName || `Node-${devKey.slice(0, 6)}`,
      url: cleanUrl,
      lastSeen: now,
    };

    if (existingIdx >= 0) {
      pool[existingIdx] = entry;
    } else {
      pool.push(entry);
    }

    const primaryUrl = pool[0]?.url || cleanUrl;

    // Persist to D1 database (100k daily writes free!)
    if (env?.cinema_db) {
      try {
        await env.cinema_db.batch([
          env.cinema_db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES ('BACKEND_URL', ?, ?)").bind(primaryUrl, now),
          env.cinema_db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES ('BACKEND_POOL', ?, ?)").bind(JSON.stringify(pool), now)
        ]);
      } catch (d1Err) {
        console.warn("D1 write error:", d1Err.message);
      }
    }

    // Persist to KV safely (ignore quota errors if limit hit)
    if (env?.CINEMA_KV) {
      try {
        await env.CINEMA_KV.put("BACKEND_URL", primaryUrl);
        await env.CINEMA_KV.put("BACKEND_POOL", JSON.stringify(pool));
      } catch (kvErr) {
        console.warn("KV put quota reached, D1 used:", kvErr.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      url: cleanUrl,
      activeNodesInCluster: pool.length,
      cluster: pool.map(p => ({ deviceName: p.deviceName, url: p.url })),
      updatedAt: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
