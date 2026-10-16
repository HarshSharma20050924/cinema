/**
 * POST /api/admin/global-killswitch
 * Instantly takes ALL nodes offline — website shows "maintenance" to users.
 * POST body: { secret: "cinema_admin_2026", action: "enable" | "disable" }
 */

const ADMIN_SECRET = "cinema_admin_2026";

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const auth = request.headers.get("Authorization") || "";
  if (auth !== ADMIN_SECRET && auth !== `Bearer ${ADMIN_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const body = await request.json();
    const { action } = body || {};

    if (action === "enable") {
      // Enable killswitch — wipe all backends immediately
      if (env?.cinema_db) {
        try {
          await env.cinema_db.batch([
            env.cinema_db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES ('GLOBAL_KILLSWITCH', 'true', ?)").bind(Date.now()),
            env.cinema_db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES ('BACKEND_POOL', '[]', ?)").bind(Date.now()),
            env.cinema_db.prepare("DELETE FROM config WHERE key = 'BACKEND_URL'"),
          ]);
        } catch (_) {}
      }
      if (env?.CINEMA_KV) {
        try {
          await env.CINEMA_KV.put("GLOBAL_KILLSWITCH", "true");
          await env.CINEMA_KV.put("BACKEND_POOL", JSON.stringify([]));
          await env.CINEMA_KV.delete("BACKEND_URL");
        } catch (_) {}
      }

      return new Response(JSON.stringify({
        success: true,
        killswitchActive: true,
        message: "🔴 All nodes wiped. Website is now in maintenance mode.",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });

    } else if (action === "disable") {
      if (env?.cinema_db) {
        try {
          await env.cinema_db.prepare("DELETE FROM config WHERE key = 'GLOBAL_KILLSWITCH'").run();
        } catch (_) {}
      }
      if (env?.CINEMA_KV) {
        try {
          await env.CINEMA_KV.delete("GLOBAL_KILLSWITCH");
        } catch (_) {}
      }

      return new Response(JSON.stringify({
        success: true,
        killswitchActive: false,
        message: "🟢 Killswitch disabled. Nodes can reconnect normally.",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });

    } else {
      return new Response(JSON.stringify({ error: "action must be 'enable' or 'disable'" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
