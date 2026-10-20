/**
 * Cloudflare Pages Function: Store Telegram Deep Links in D1 (bot_links)
 * Enables 1-click deep-link opening for movies/series posted by multiChannelPoster.
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env?.cinema_db;

  if (!db) {
    return new Response(JSON.stringify({ error: "cinema_db D1 database binding not found" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const { id, provider, link, title } = body;

    if (!id || !provider || !link) {
      return new Response(JSON.stringify({ error: "Missing required fields: id, provider, link" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const existing = await db.prepare("SELECT id FROM bot_links WHERE id = ?").bind(id).first();
    const alreadyPosted = Boolean(existing);

    const serialized = typeof link === 'string' ? link : JSON.stringify(link);
    await db.prepare(
      "INSERT OR REPLACE INTO bot_links (id, provider, link, title, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, provider, serialized, title || '', Date.now()).run();

    return new Response(JSON.stringify({ ok: true, id, alreadyPosted }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
