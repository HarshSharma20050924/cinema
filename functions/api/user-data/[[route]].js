/**
 * Cloudflare Pages Function: /api/user-data/[[route]]
 * Backed by Cloudflare D1 Database (cinema_db)
 * Manages Watchlist, Likes, Interests, Lists, and History per user & profile
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function getBearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

async function authenticate(db, request) {
  const token = getBearerToken(request);
  if (!token) return null;
  const now = Date.now();
  const session = await db.prepare(
    'SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first();
  if (!session) return null;
  const user = await db.prepare('SELECT id, email, name FROM users WHERE id = ?').bind(session.user_id).first();
  return user || null;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const db = env.cinema_db;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (!db) {
    return jsonResponse({ error: 'Cloudflare D1 database (cinema_db) not bound' }, 500);
  }

  const user = await authenticate(db, request);
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const route = (params.route || [])[0] || '';
  const profileId = url.searchParams.get('profileId') || 'default';

  try {
    // 1. GET ALL USER DATA
    if (request.method === 'GET' && !route) {
      // Watchlist
      const { results: rawWatchlist } = await db.prepare(
        'SELECT post_id, title, poster, backdrop, media_type, year, rating, created_at FROM watchlist WHERE user_id = ? AND profile_id = ? ORDER BY created_at DESC'
      ).bind(user.id, profileId).all();

      // Likes / Ratings
      const { results: rawLikes } = await db.prepare(
        'SELECT post_id, title, poster, created_at FROM likes WHERE user_id = ? AND profile_id = ? ORDER BY created_at DESC'
      ).bind(user.id, profileId).all();

      // Interests / Genres
      const interestsRow = await db.prepare(
        'SELECT genres FROM user_interests WHERE user_id = ? AND profile_id = ?'
      ).bind(user.id, profileId).first();

      let genres = [];
      if (interestsRow && interestsRow.genres) {
        try { genres = JSON.parse(interestsRow.genres); } catch (_) {}
      }

      // Custom Lists
      const { results: rawLists } = await db.prepare(
        'SELECT id, name, items, updated_at FROM custom_lists WHERE user_id = ? AND profile_id = ? ORDER BY updated_at DESC'
      ).bind(user.id, profileId).all();

      const customLists = (rawLists || []).map(l => {
        let items = [];
        try { items = JSON.parse(l.items); } catch (_) {}
        return { id: l.id, name: l.name, items, updatedAt: l.updated_at };
      });

      return jsonResponse({
        success: true,
        watchlist: rawWatchlist || [],
        likes: rawLikes || [],
        interests: genres,
        customLists,
      });
    }

    // 2. FULL SYNC / BATCH UPDATE
    if (request.method === 'POST' && route === 'sync') {
      const body = await request.json().catch(() => ({}));
      const pId = body.profileId || profileId;
      const now = Date.now();

      // Sync Interests
      if (Array.isArray(body.interests)) {
        await db.prepare(`
          INSERT INTO user_interests (user_id, profile_id, genres, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, profile_id) DO UPDATE SET
            genres = excluded.genres,
            updated_at = excluded.updated_at
        `).bind(user.id, pId, JSON.stringify(body.interests), now).run();
      }

      // Sync Watchlist items
      if (Array.isArray(body.watchlist)) {
        await db.prepare('DELETE FROM watchlist WHERE user_id = ? AND profile_id = ?').bind(user.id, pId).run();
        for (const it of body.watchlist) {
          const wId = 'wl_' + now + '_' + Math.random().toString(36).slice(2, 6);
          await db.prepare(`
            INSERT INTO watchlist (id, user_id, profile_id, post_id, title, poster, backdrop, media_type, year, rating, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            wId,
            user.id,
            pId,
            String(it.id || it.post_id || ''),
            String(it.title || ''),
            String(it.poster || ''),
            String(it.backdrop || ''),
            String(it.type || it.media_type || 'movie'),
            String(it.year || ''),
            Number(it.rating || 0),
            Number(it.created_at || now)
          ).run();
        }
      }

      // Sync Likes items
      if (Array.isArray(body.likes)) {
        await db.prepare('DELETE FROM likes WHERE user_id = ? AND profile_id = ?').bind(user.id, pId).run();
        for (const lk of body.likes) {
          const lkId = 'lk_' + now + '_' + Math.random().toString(36).slice(2, 6);
          await db.prepare(`
            INSERT INTO likes (id, user_id, profile_id, post_id, title, poster, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            lkId,
            user.id,
            pId,
            String(lk.id || lk.post_id || ''),
            String(lk.title || ''),
            String(lk.poster || ''),
            Number(lk.created_at || now)
          ).run();
        }
      }

      return jsonResponse({ success: true, message: 'Data synced successfully with Cloudflare D1.' });
    }

    // 3. TOGGLE WATCHLIST ITEM
    if (request.method === 'POST' && route === 'watchlist') {
      const body = await request.json().catch(() => ({}));
      const pId = body.profileId || profileId;
      const post = body.post || body;
      const postId = String(post.id || '');

      if (!postId) {
        return jsonResponse({ error: 'Post ID is required' }, 400);
      }

      // Check if already in watchlist
      const existing = await db.prepare('SELECT id FROM watchlist WHERE user_id = ? AND profile_id = ? AND post_id = ?')
        .bind(user.id, pId, postId).first();

      if (existing) {
        await db.prepare('DELETE FROM watchlist WHERE id = ?').bind(existing.id).run();
        return jsonResponse({ success: true, inWatchlist: false });
      } else {
        const id = 'wl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        await db.prepare(`
          INSERT INTO watchlist (id, user_id, profile_id, post_id, title, poster, backdrop, media_type, year, rating, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          user.id,
          pId,
          postId,
          String(post.title || ''),
          String(post.image || post.poster || ''),
          String(post.backdrop || ''),
          String(post.type || 'movie'),
          String(post.year || ''),
          Number(post.imdbRating || post.rating || 0),
          Date.now()
        ).run();
        return jsonResponse({ success: true, inWatchlist: true });
      }
    }

    // 4. TOGGLE LIKE ITEM
    if (request.method === 'POST' && route === 'likes') {
      const body = await request.json().catch(() => ({}));
      const pId = body.profileId || profileId;
      const post = body.post || body;
      const postId = String(post.id || '');

      if (!postId) {
        return jsonResponse({ error: 'Post ID is required' }, 400);
      }

      const existing = await db.prepare('SELECT id FROM likes WHERE user_id = ? AND profile_id = ? AND post_id = ?')
        .bind(user.id, pId, postId).first();

      if (existing) {
        await db.prepare('DELETE FROM likes WHERE id = ?').bind(existing.id).run();
        return jsonResponse({ success: true, liked: false });
      } else {
        const id = 'lk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        await db.prepare(`
          INSERT INTO likes (id, user_id, profile_id, post_id, title, poster, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          user.id,
          pId,
          postId,
          String(post.title || ''),
          String(post.image || post.poster || ''),
          Date.now()
        ).run();
        return jsonResponse({ success: true, liked: true });
      }
    }

    // 5. UPDATE INTERESTS
    if (request.method === 'POST' && route === 'interests') {
      const body = await request.json().catch(() => ({}));
      const pId = body.profileId || profileId;
      const genres = Array.isArray(body.genres) ? body.genres : [];

      await db.prepare(`
        INSERT INTO user_interests (user_id, profile_id, genres, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, profile_id) DO UPDATE SET
          genres = excluded.genres,
          updated_at = excluded.updated_at
      `).bind(user.id, pId, JSON.stringify(genres), Date.now()).run();

      return jsonResponse({ success: true, interests: genres });
    }

    return jsonResponse({ error: 'Route not found' }, 404);
  } catch (err) {
    return jsonResponse({ error: 'Internal Server Error: ' + err.message }, 500);
  }
}
