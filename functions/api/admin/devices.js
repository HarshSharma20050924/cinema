/**
 * GET  /api/admin/devices  — List all registered devices/nodes
 * POST /api/admin/devices  — Revoke/Ban a specific device
 */

const ADMIN_SECRET = "cinema_admin_2026";

function cors(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// GET /api/admin/devices — list all devices
export async function onRequestGet(context) {
  const { env, request } = context;
  const auth = request.headers.get("Authorization") || new URL(request.url).searchParams.get("secret");
  if (auth !== ADMIN_SECRET && auth !== `Bearer ${ADMIN_SECRET}`) {
    return cors({ error: "Unauthorized" }, 401);
  }

  try {
    let pool = [];
    let banned = [];
    let killswitch = null;

    // 1. Query D1 database first
    if (env?.cinema_db) {
      try {
        const poolRow = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'BACKEND_POOL'").first();
        if (poolRow?.value) pool = JSON.parse(poolRow.value);
        const bannedRow = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'BANNED_DEVICES'").first();
        if (bannedRow?.value) banned = JSON.parse(bannedRow.value);
        const ksRow = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'GLOBAL_KILLSWITCH'").first();
        if (ksRow?.value) killswitch = ksRow.value;
      } catch (_) {}
    }

    // 2. KV Fallback
    if (pool.length === 0 && env?.CINEMA_KV) {
      try {
        const poolRaw = await env.CINEMA_KV.get("BACKEND_POOL");
        if (poolRaw) pool = JSON.parse(poolRaw);
      } catch (_) {}
    }
    if (banned.length === 0 && env?.CINEMA_KV) {
      try {
        const bannedRaw = await env.CINEMA_KV.get("BANNED_DEVICES");
        if (bannedRaw) banned = JSON.parse(bannedRaw);
      } catch (_) {}
    }
    if (!killswitch && env?.CINEMA_KV) {
      try {
        killswitch = await env.CINEMA_KV.get("GLOBAL_KILLSWITCH");
      } catch (_) {}
    }

    if (!Array.isArray(pool)) pool = [];
    if (!Array.isArray(banned)) banned = [];
    const now = Date.now();

    const devices = pool.map(d => ({
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      url: d.url,
      lastSeen: d.lastSeen,
      secondsAgo: Math.floor((now - d.lastSeen) / 1000),
      isOnline: now - d.lastSeen < 600000,
      isBanned: banned.includes(d.deviceId),
    }));

    return cors({
      devices,
      totalNodes: devices.length,
      onlineNodes: devices.filter(d => d.isOnline && !d.isBanned).length,
      bannedDevices: banned,
      killswitchActive: killswitch === "true",
    });
  } catch (err) {
    return cors({ error: err.message }, 500);
  }
}

// POST /api/admin/devices — revoke/unrevoke a device
export async function onRequestPost(context) {
  const { env, request } = context;
  const auth = request.headers.get("Authorization") || "";
  if (auth !== ADMIN_SECRET && auth !== `Bearer ${ADMIN_SECRET}`) {
    return cors({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await request.json();
    const { action, deviceId } = body;

    if (!deviceId || !action) return cors({ error: "deviceId and action required" }, 400);

    let banned = [];
    if (env?.cinema_db) {
      try {
        const bannedRow = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'BANNED_DEVICES'").first();
        if (bannedRow?.value) banned = JSON.parse(bannedRow.value);
      } catch (_) {}
    }
    if (banned.length === 0 && env?.CINEMA_KV) {
      try {
        const bannedRaw = await env.CINEMA_KV.get("BANNED_DEVICES");
        if (bannedRaw) banned = JSON.parse(bannedRaw);
      } catch (_) {}
    }

    if (action === "ban") {
      if (!banned.includes(deviceId)) banned.push(deviceId);
      // Also remove from active pool
      let pool = [];
      if (env?.cinema_db) {
        try {
          const poolRow = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'BACKEND_POOL'").first();
          if (poolRow?.value) pool = JSON.parse(poolRow.value);
        } catch (_) {}
      }
      if (pool.length === 0 && env?.CINEMA_KV) {
        try {
          const poolRaw = await env.CINEMA_KV.get("BACKEND_POOL");
          if (poolRaw) pool = JSON.parse(poolRaw);
        } catch (_) {}
      }

      pool = pool.filter(d => d.deviceId !== deviceId);
      const primaryUrl = pool[0]?.url || "";

      if (env?.cinema_db) {
        try {
          await env.cinema_db.batch([
            env.cinema_db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES ('BACKEND_POOL', ?, ?)").bind(JSON.stringify(pool), Date.now()),
            env.cinema_db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES ('BACKEND_URL', ?, ?)").bind(primaryUrl, Date.now()),
          ]);
        } catch (_) {}
      }
      if (env?.CINEMA_KV) {
        try {
          await env.CINEMA_KV.put("BACKEND_POOL", JSON.stringify(pool));
          if (primaryUrl) await env.CINEMA_KV.put("BACKEND_URL", primaryUrl);
          else await env.CINEMA_KV.delete("BACKEND_URL");
        } catch (_) {}
      }
    } else if (action === "unban") {
      banned = banned.filter(id => id !== deviceId);
    } else {
      return cors({ error: `Unknown action: ${action}` }, 400);
    }

    if (env?.cinema_db) {
      try {
        await env.cinema_db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES ('BANNED_DEVICES', ?, ?)").bind(JSON.stringify(banned), Date.now()).run();
      } catch (_) {}
    }
    if (env?.CINEMA_KV) {
      try {
        await env.CINEMA_KV.put("BANNED_DEVICES", JSON.stringify(banned));
      } catch (_) {}
    }

    return cors({ success: true, action, deviceId, banned });
  } catch (err) {
    return cors({ error: err.message }, 500);
  }
}
