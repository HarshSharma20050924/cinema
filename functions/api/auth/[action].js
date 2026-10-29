/**
 * Cloudflare Pages Function: /api/auth/:action
 * Backed by Cloudflare D1 Database (cinema_db)
 * Actions: register, login, session, logout
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

async function hashPassword(password) {
  const salt = 'cinema_auth_d1_salt_2026';
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return 'sess_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getBearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
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

  const action = (params.action || '').toLowerCase();

  try {
    // 1. REGISTER
    if (action === 'register' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const name = String(body.name || '').trim();

      if (!email || !email.includes('@')) {
        return jsonResponse({ error: 'Valid email is required.' }, 400);
      }
      if (!password || password.length < 6) {
        return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);
      }
      if (!name) {
        return jsonResponse({ error: 'Name is required.' }, 400);
      }

      // Check if user already exists
      const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
      if (existing) {
        return jsonResponse({ error: 'An account with this email already exists.' }, 409);
      }

      const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      const passwordHash = await hashPassword(password);
      const now = Date.now();

      // Create user
      await db.prepare('INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(userId, email, passwordHash, name, now).run();

      // Create primary profile
      const profileId = 'prof_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      const defaultAvatar = 'leaf';
      const defaultGradient = 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)';
      await db.prepare(
        'INSERT INTO profiles (id, user_id, name, avatar, avatar_color, is_kids, pin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(profileId, userId, name, defaultAvatar, defaultGradient, 0, null, now, now).run();

      // Create session
      const token = generateToken();
      const expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days
      await db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
        .bind(token, userId, now, expiresAt).run();

      const newProfile = {
        id: profileId,
        name,
        email,
        avatar: defaultAvatar,
        avatarColor: defaultGradient,
        isKids: false,
        createdAt: now,
      };

      return jsonResponse({
        success: true,
        token,
        user: { id: userId, email, name },
        profiles: [newProfile],
        activeProfile: newProfile,
      });
    }

    // 2. LOGIN
    if (action === 'login' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!email || !password) {
        return jsonResponse({ error: 'Email and password are required.' }, 400);
      }

      const passwordHash = await hashPassword(password);
      const user = await db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?')
        .bind(email).first();

      if (!user || user.password_hash !== passwordHash) {
        return jsonResponse({ error: 'Incorrect email or password.' }, 401);
      }

      // Fetch profiles
      const { results: rawProfiles } = await db.prepare(
        'SELECT id, name, avatar, avatar_color, is_kids, pin, created_at FROM profiles WHERE user_id = ? ORDER BY created_at ASC'
      ).bind(user.id).all();

      let profiles = (rawProfiles || []).map(p => ({
        id: p.id,
        name: p.name,
        email: user.email,
        avatar: p.avatar,
        avatarColor: p.avatar_color,
        isKids: Boolean(p.is_kids),
        pin: p.pin || undefined,
        createdAt: p.created_at,
      }));

      // If user had no profiles, create default one
      const now = Date.now();
      if (profiles.length === 0) {
        const profileId = 'prof_' + now + '_' + Math.random().toString(36).slice(2, 7);
        const defaultAvatar = 'moon';
        const defaultGradient = 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)';
        await db.prepare(
          'INSERT INTO profiles (id, user_id, name, avatar, avatar_color, is_kids, pin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(profileId, user.id, user.name, defaultAvatar, defaultGradient, 0, null, now, now).run();

        profiles = [{
          id: profileId,
          name: user.name,
          email: user.email,
          avatar: defaultAvatar,
          avatarColor: defaultGradient,
          isKids: false,
          createdAt: now,
        }];
      }

      // Create session
      const token = generateToken();
      const expiresAt = now + (30 * 24 * 60 * 60 * 1000);
      await db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
        .bind(token, user.id, now, expiresAt).run();

      return jsonResponse({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name },
        profiles,
        activeProfile: profiles[0],
      });
    }

    // 3. SESSION VALIDATION
    if (action === 'session' && request.method === 'GET') {
      const token = getBearerToken(request);
      if (!token) {
        return jsonResponse({ authenticated: false, error: 'No session token provided.' }, 401);
      }

      const now = Date.now();
      const session = await db.prepare(
        'SELECT user_id, expires_at FROM sessions WHERE token = ? AND expires_at > ?'
      ).bind(token, now).first();

      if (!session) {
        return jsonResponse({ authenticated: false, error: 'Invalid or expired session.' }, 401);
      }

      const user = await db.prepare('SELECT id, email, name FROM users WHERE id = ?')
        .bind(session.user_id).first();

      if (!user) {
        return jsonResponse({ authenticated: false, error: 'User not found.' }, 401);
      }

      const { results: rawProfiles } = await db.prepare(
        'SELECT id, name, avatar, avatar_color, is_kids, pin, created_at FROM profiles WHERE user_id = ? ORDER BY created_at ASC'
      ).bind(user.id).all();

      const profiles = (rawProfiles || []).map(p => ({
        id: p.id,
        name: p.name,
        email: user.email,
        avatar: p.avatar,
        avatarColor: p.avatar_color,
        isKids: Boolean(p.is_kids),
        pin: p.pin || undefined,
        createdAt: p.created_at,
      }));

      return jsonResponse({
        authenticated: true,
        user: { id: user.id, email: user.email, name: user.name },
        profiles,
        activeProfile: profiles[0] || null,
      });
    }

    // 4. LOGOUT
    if (action === 'logout' && request.method === 'POST') {
      const token = getBearerToken(request);
      if (token) {
        await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run().catch(() => {});
      }
      return jsonResponse({ success: true, message: 'Logged out successfully.' });
    }

    
    // 5. DELETE ACCOUNT
    if (action === 'delete-account' && request.method === 'POST') {
      const token = getBearerToken(request);
      if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);
      const session = await db.prepare('SELECT user_id FROM sessions WHERE token = ?').bind(token).first();
      if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);
      const userId = session.user_id;

      await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
      await db.prepare('DELETE FROM profiles WHERE user_id = ?').bind(userId).run();
      await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
      await db.prepare('DELETE FROM watchlist WHERE user_id = ?').bind(userId).run().catch(() => {});
      await db.prepare('DELETE FROM likes WHERE user_id = ?').bind(userId).run().catch(() => {});
      await db.prepare('DELETE FROM user_interests WHERE user_id = ?').bind(userId).run().catch(() => {});
      await db.prepare('DELETE FROM custom_lists WHERE user_id = ?').bind(userId).run().catch(() => {});

      return jsonResponse({ success: true, message: 'Account permanently deleted from Cloudflare database.' });
    }

    return jsonResponse({ error: 'Action not found or method not allowed.' }, 404);
  } catch (err) {
    return jsonResponse({ error: 'Internal Server Error: ' + err.message }, 500);
  }
}
