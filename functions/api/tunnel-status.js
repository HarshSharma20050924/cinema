export async function onRequestGet(context) {
  const { env } = context;
  try {
    let backendUrl = null;
    // 1. Try D1 first (100k daily writes, 5M reads free)
    if (env?.cinema_db) {
      try {
        const row = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'BACKEND_URL'").first();
        if (row?.value) backendUrl = row.value;
      } catch (_) {}
    }
    // 2. Try KV
    if (!backendUrl && env?.CINEMA_KV) {
      try {
        backendUrl = await env.CINEMA_KV.get("BACKEND_URL");
      } catch (_) {}
    }

    return new Response(JSON.stringify({
      ok: Boolean(backendUrl),
      backendUrl: backendUrl || null
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
