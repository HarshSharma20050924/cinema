/**
 * Cloudflare Pages Function: /api/profiles/[[route]]
 * Backed by Cloudflare D1 Database (cinema_db)
 * Handles GET, POST, PUT, DELETE for user profiles
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (!db) {
    return jsonResponse({ error: 'Cloudflare D1 database (cinema_db) not bound' }, 500);
  }

  const user = await authenticate(db, request);
  if (!user) {
    return jsonResponse({ error: 'Unauthorized. Please sign in.' }, 401);
  }

  const routeParams = params.route || [];
  const profileId = routeParams[0]; // e.g. /api/profiles/:id

  try {
    // 1. GET /api/profiles
    if (request.method === 'GET' && !profileId) {
      const { results } = await db.prepare(
        'SELECT id, name, avatar, avatar_color, is_kids, pin, created_at FROM profiles WHERE user_id = ? ORDER BY created_at ASC'
      ).bind(user.id).all();

      const profiles = (results || []).map(p => ({
        id: p.id,
        name: p.name,
        email: user.email,
        avatar: p.avatar,
        avatarColor: p.avatar_color,
        isKids: Boolean(p.is_kids),
        pin: p.pin || undefined,
        createdAt: p.created_at,
      }));

      return jsonResponse({ success: true, profiles });
    }

    // 2. POST /api/profiles (Create)
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const name = String(body.name || '').trim();
      const avatar = String(body.avatar || 'moon');
      const avatarColor = String(body.avatarColor || 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)');
      const isKids = Boolean(body.isKids);
      const pin = body.pin ? String(body.pin).trim() : null;

      if (!name) {
        return jsonResponse({ error: 'Profile name is required.' }, 400);
      }

      // Check max profiles limit (e.g. 6)
      const countRow = await db.prepare('SELECT count(*) as total FROM profiles WHERE user_id = ?').bind(user.id).first();
      if (countRow && countRow.total >= 6) {
        return jsonResponse({ error: 'Maximum 6 profiles allowed per account.' }, 400);
      }

      const id = 'prof_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      const now = Date.now();

      await db.prepare(
        'INSERT INTO profiles (id, user_id, name, avatar, avatar_color, is_kids, pin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, user.id, name, avatar, avatarColor, isKids ? 1 : 0, pin, now, now).run();

      const newProfile = {
        id,
        name,
        email: user.email,
        avatar,
        avatarColor,
        isKids,
        pin: pin || undefined,
        createdAt: now,
      };

      return jsonResponse({ success: true, profile: newProfile });
    }

    // 3. PUT /api/profiles/:id (Update)
    if (request.method === 'PUT' && profileId) {
      const body = await request.json().catch(() => ({}));
      const existing = await db.prepare('SELECT id FROM profiles WHERE id = ? AND user_id = ?')
        .bind(profileId, user.id).first();

      if (!existing) {
        return jsonResponse({ error: 'Profile not found.' }, 404);
      }

      const name = body.name !== undefined ? String(body.name).trim() : undefined;
      const avatar = body.avatar !== undefined ? String(body.avatar) : undefined;
      const avatarColor = body.avatarColor !== undefined ? String(body.avatarColor) : undefined;
      const isKids = body.isKids !== undefined ? (Boolean(body.isKids) ? 1 : 0) : undefined;
      const pin = body.pin !== undefined ? (body.pin ? String(body.pin).trim() : null) : undefined;

      let query = 'UPDATE profiles SET updated_at = ?';
      const bindings = [Date.now()];

      if (name !== undefined && name.length > 0) {
        query += ', name = ?';
        bindings.push(name);
      }
      if (avatar !== undefined) {
        query += ', avatar = ?';
        bindings.push(avatar);
      }
      if (avatarColor !== undefined) {
        query += ', avatar_color = ?';
        bindings.push(avatarColor);
      }
      if (isKids !== undefined) {
        query += ', is_kids = ?';
        bindings.push(isKids);
      }
      if (pin !== undefined) {
        query += ', pin = ?';
        bindings.push(pin);
      }

      query += ' WHERE id = ? AND user_id = ?';
      bindings.push(profileId, user.id);

      await db.prepare(query).bind(...bindings).run();

      const updated = await db.prepare('SELECT id, name, avatar, avatar_color, is_kids, pin, created_at FROM profiles WHERE id = ?')
        .bind(profileId).first();

      return jsonResponse({
        success: true,
        profile: {
          id: updated.id,
          name: updated.name,
          email: user.email,
          avatar: updated.avatar,
          avatarColor: updated.avatar_color,
          isKids: Boolean(updated.is_kids),
          pin: updated.pin || undefined,
          createdAt: updated.created_at,
        },
      });
    }

    // 4. DELETE /api/profiles/:id
    if (request.method === 'DELETE' && profileId) {
      const countRow = await db.prepare('SELECT count(*) as total FROM profiles WHERE user_id = ?').bind(user.id).first();
      if (countRow && countRow.total <= 1) {
        return jsonResponse({ error: 'Cannot delete the only profile.' }, 400);
      }

      const res = await db.prepare('DELETE FROM profiles WHERE id = ? AND user_id = ?').bind(profileId, user.id).run();
      if (res.changes === 0) {
        return jsonResponse({ error: 'Profile not found.' }, 404);
      }

      return jsonResponse({ success: true, message: 'Profile deleted successfully.' });
    }

    return jsonResponse({ error: 'Method not allowed.' }, 405);
  } catch (err) {
    return jsonResponse({ error: 'Internal Server Error: ' + err.message }, 500);
  }
}
