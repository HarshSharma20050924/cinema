export async function onRequestGet(context) {
  const { env } = context;
  try {
    let backendUrl = null;
    let pool = [];

    // 1. Try D1 first (100k daily writes, 5M reads free)
    if (env?.cinema_db) {
      try {
        const row = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'BACKEND_URL'").first();
        if (row?.value) backendUrl = row.value;
        const poolRow = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'BACKEND_POOL'").first();
        if (poolRow?.value) pool = JSON.parse(poolRow.value);
      } catch (_) {}
    }

    // 2. Try KV
    if (!backendUrl && env?.CINEMA_KV) {
      try {
        backendUrl = await env.CINEMA_KV.get("BACKEND_URL");
      } catch (_) {}
    }
    if ((!pool || pool.length === 0) && env?.CINEMA_KV) {
      try {
        const raw = await env.CINEMA_KV.get("BACKEND_POOL");
        if (raw) pool = JSON.parse(raw);
      } catch (_) {}
    }

    let relayPool = [];
    if (env?.cinema_db) {
      try {
        const relayRow = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'RELAY_POOL'").first();
        if (relayRow?.value) relayPool = JSON.parse(relayRow.value);
      } catch (_) {}
    }

    const now = Date.now();
    const freshPool = (pool || []).filter(p => now - (p.lastSeen || 0) < 180000);
    const freshRelays = (relayPool || []).filter(p => now - (p.lastSeen || 0) < 180000);

    return new Response(JSON.stringify({
      ok: Boolean(backendUrl || freshPool.length > 0 || freshRelays.length > 0),
      backendUrl: backendUrl || (freshPool[0]?.url || "https://cinema-4h7t.onrender.com"),
      pool: freshPool,
      relays: freshRelays
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
