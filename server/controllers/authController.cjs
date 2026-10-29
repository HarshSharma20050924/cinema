/**
 * Local Node.js Express Auth Controller
 * SQLite Backed (server/data/cinema.db)
 * Mirrors Cloudflare D1 Auth & Profiles API perfectly for local dev
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '../data/cinema.db');
const db = new DatabaseSync(dbPath);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    avatar_color TEXT NOT NULL,
    is_kids INTEGER NOT NULL DEFAULT 0,
    pin TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
`);

function hashPassword(password) {
  const salt = 'cinema_auth_d1_salt_2026';
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function generateToken() {
  return 'sess_' + crypto.randomBytes(32).toString('hex');
}

function getBearerToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

function authenticate(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  const now = Date.now();
  const stmt = db.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?');
  const session = stmt.get(token, now);
  if (!session) return null;
  const userStmt = db.prepare('SELECT id, email, name FROM users WHERE id = ?');
  return userStmt.get(session.user_id) || null;
}

// 1. REGISTER
exports.register = (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '');
    const cleanName = String(name || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }
    if (!cleanPass || cleanPass.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (!cleanName) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const existingStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    if (existingStmt.get(cleanEmail)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const passwordHash = hashPassword(cleanPass);
    const now = Date.now();

    const insertUser = db.prepare('INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)');
    insertUser.run(userId, cleanEmail, passwordHash, cleanName, now);

    const profileId = 'prof_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const defaultAvatar = 'leaf';
    const defaultGradient = 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)';
    const insertProfile = db.prepare(
      'INSERT INTO profiles (id, user_id, name, avatar, avatar_color, is_kids, pin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertProfile.run(profileId, userId, cleanName, defaultAvatar, defaultGradient, 0, null, now, now);

    const token = generateToken();
    const expiresAt = now + (30 * 24 * 60 * 60 * 1000);
    const insertSession = db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)');
    insertSession.run(token, userId, now, expiresAt);

    const newProfile = {
      id: profileId,
      name: cleanName,
      email: cleanEmail,
      avatar: defaultAvatar,
      avatarColor: defaultGradient,
      isKids: false,
      createdAt: now,
    };

    return res.json({
      success: true,
      token,
      user: { id: userId, email: cleanEmail, name: cleanName },
      profiles: [newProfile],
      activeProfile: newProfile,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
};

// 2. LOGIN
exports.login = (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '');

    if (!cleanEmail || !cleanPass) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const passwordHash = hashPassword(cleanPass);
    const userStmt = db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?');
    const user = userStmt.get(cleanEmail);

    if (!user || user.password_hash !== passwordHash) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const profStmt = db.prepare('SELECT id, name, avatar, avatar_color, is_kids, pin, created_at FROM profiles WHERE user_id = ? ORDER BY created_at ASC');
    let rawProfiles = profStmt.all(user.id);

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

    const now = Date.now();
    if (profiles.length === 0) {
      const profileId = 'prof_' + now + '_' + Math.random().toString(36).slice(2, 7);
      const defaultAvatar = 'moon';
      const defaultGradient = 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)';
      const insertProfile = db.prepare(
        'INSERT INTO profiles (id, user_id, name, avatar, avatar_color, is_kids, pin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      insertProfile.run(profileId, user.id, user.name, defaultAvatar, defaultGradient, 0, null, now, now);

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

    const token = generateToken();
    const expiresAt = now + (30 * 24 * 60 * 60 * 1000);
    const insertSession = db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)');
    insertSession.run(token, user.id, now, expiresAt);

    return res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name },
      profiles,
      activeProfile: profiles[0],
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
};

// 3. SESSION VALIDATION
exports.getSession = (req, res) => {
  try {
    const user = authenticate(req);
    if (!user) {
      return res.status(401).json({ authenticated: false, error: 'Invalid or expired session.' });
    }

    const profStmt = db.prepare('SELECT id, name, avatar, avatar_color, is_kids, pin, created_at FROM profiles WHERE user_id = ? ORDER BY created_at ASC');
    const rawProfiles = profStmt.all(user.id);

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

    return res.json({
      authenticated: true,
      user: { id: user.id, email: user.email, name: user.name },
      profiles,
      activeProfile: profiles[0] || null,
    });
  } catch (err) {
    console.error('Session error:', err);
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
};

// 4. LOGOUT
exports.logout = (req, res) => {
  try {
    const token = getBearerToken(req);
    if (token) {
      const delStmt = db.prepare('DELETE FROM sessions WHERE token = ?');
      delStmt.run(token);
    }
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
};

// 5. GET PROFILES
exports.getProfiles = (req, res) => {
  try {
    const user = authenticate(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const profStmt = db.prepare('SELECT id, name, avatar, avatar_color, is_kids, pin, created_at FROM profiles WHERE user_id = ? ORDER BY created_at ASC');
    const rawProfiles = profStmt.all(user.id);

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

    return res.json({ success: true, profiles });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
};

// 6. CREATE PROFILE
exports.createProfile = (req, res) => {
  try {
    const user = authenticate(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { name, avatar, avatarColor, isKids, pin } = req.body || {};
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      return res.status(400).json({ error: 'Profile name is required.' });
    }

    const countStmt = db.prepare('SELECT count(*) as total FROM profiles WHERE user_id = ?');
    const countRow = countStmt.get(user.id);
    if (countRow && countRow.total >= 6) {
      return res.status(400).json({ error: 'Maximum 6 profiles allowed per account.' });
    }

    const id = 'prof_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const now = Date.now();
    const cleanAvatar = String(avatar || 'moon');
    const cleanColor = String(avatarColor || 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)');
    const cleanPin = pin ? String(pin).trim() : null;

    const insertStmt = db.prepare(
      'INSERT INTO profiles (id, user_id, name, avatar, avatar_color, is_kids, pin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertStmt.run(id, user.id, cleanName, cleanAvatar, cleanColor, isKids ? 1 : 0, cleanPin, now, now);

    const newProfile = {
      id,
      name: cleanName,
      email: user.email,
      avatar: cleanAvatar,
      avatarColor: cleanColor,
      isKids: Boolean(isKids),
      pin: cleanPin || undefined,
      createdAt: now,
    };

    return res.json({ success: true, profile: newProfile });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
};

// 7. UPDATE PROFILE
exports.updateProfile = (req, res) => {
  try {
    const user = authenticate(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const profileId = req.params.id;
    const checkStmt = db.prepare('SELECT id FROM profiles WHERE id = ? AND user_id = ?');
    const existing = checkStmt.get(profileId, user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const { name, avatar, avatarColor, isKids, pin } = req.body || {};
    let query = 'UPDATE profiles SET updated_at = ?';
    const params = [Date.now()];

    if (name !== undefined && String(name).trim().length > 0) {
      query += ', name = ?';
      params.push(String(name).trim());
    }
    if (avatar !== undefined) {
      query += ', avatar = ?';
      params.push(String(avatar));
    }
    if (avatarColor !== undefined) {
      query += ', avatar_color = ?';
      params.push(String(avatarColor));
    }
    if (isKids !== undefined) {
      query += ', is_kids = ?';
      params.push(isKids ? 1 : 0);
    }
    if (pin !== undefined) {
      query += ', pin = ?';
      params.push(pin ? String(pin).trim() : null);
    }

    query += ' WHERE id = ? AND user_id = ?';
    params.push(profileId, user.id);

    const updateStmt = db.prepare(query);
    updateStmt.run(...params);

    const getStmt = db.prepare('SELECT id, name, avatar, avatar_color, is_kids, pin, created_at FROM profiles WHERE id = ?');
    const updated = getStmt.get(profileId);

    return res.json({
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
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
};

// 8. DELETE PROFILE
exports.deleteProfile = (req, res) => {
  try {
    const user = authenticate(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const profileId = req.params.id;
    const countStmt = db.prepare('SELECT count(*) as total FROM profiles WHERE user_id = ?');
    const countRow = countStmt.get(user.id);
    if (countRow && countRow.total <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only profile.' });
    }

    const delStmt = db.prepare('DELETE FROM profiles WHERE id = ? AND user_id = ?');
    delStmt.run(profileId, user.id);

    return res.json({ success: true, message: 'Profile deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
};

// Initialize user_data tables in local SQLite
db.exec(`
  CREATE TABLE IF NOT EXISTS watchlist (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    title TEXT NOT NULL,
    poster TEXT,
    backdrop TEXT,
    media_type TEXT,
    year TEXT,
    rating REAL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    title TEXT NOT NULL,
    poster TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_interests (
    user_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    genres TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, profile_id)
  );
  CREATE TABLE IF NOT EXISTS custom_lists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    name TEXT NOT NULL,
    items TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_watchlist_prof ON watchlist(user_id, profile_id);
  CREATE INDEX IF NOT EXISTS idx_likes_prof ON likes(user_id, profile_id);
`);

// 9. GET USER DATA (Watchlist, Likes, Interests)
exports.getUserData = (req, res) => {
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const profileId = req.query.profileId || 'default';
    const wlStmt = db.prepare('SELECT post_id, title, poster, backdrop, media_type, year, rating, created_at FROM watchlist WHERE user_id = ? AND profile_id = ? ORDER BY created_at DESC');
    const rawWatchlist = wlStmt.all(user.id, profileId);

    const lkStmt = db.prepare('SELECT post_id, title, poster, created_at FROM likes WHERE user_id = ? AND profile_id = ? ORDER BY created_at DESC');
    const rawLikes = lkStmt.all(user.id, profileId);

    const intStmt = db.prepare('SELECT genres FROM user_interests WHERE user_id = ? AND profile_id = ?');
    const intRow = intStmt.get(user.id, profileId);
    let genres = [];
    if (intRow && intRow.genres) {
      try { genres = JSON.parse(intRow.genres); } catch (_) {}
    }

    const listStmt = db.prepare('SELECT id, name, items, updated_at FROM custom_lists WHERE user_id = ? AND profile_id = ? ORDER BY updated_at DESC');
    const rawLists = listStmt.all(user.id, profileId);
    const customLists = (rawLists || []).map(l => {
      let items = [];
      try { items = JSON.parse(l.items); } catch (_) {}
      return { id: l.id, name: l.name, items, updatedAt: l.updated_at };
    });

    return res.json({
      success: true,
      watchlist: rawWatchlist || [],
      likes: rawLikes || [],
      interests: genres,
      customLists,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 10. SYNC USER DATA
exports.syncUserData = (req, res) => {
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { profileId, watchlist, likes, interests } = req.body || {};
    const pId = profileId || 'default';
    const now = Date.now();

    if (Array.isArray(interests)) {
      const stmt = db.prepare(`
        INSERT INTO user_interests (user_id, profile_id, genres, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, profile_id) DO UPDATE SET
          genres = excluded.genres,
          updated_at = excluded.updated_at
      `);
      stmt.run(user.id, pId, JSON.stringify(interests), now);
    }

    if (Array.isArray(watchlist)) {
      db.prepare('DELETE FROM watchlist WHERE user_id = ? AND profile_id = ?').run(user.id, pId);
      const insertWl = db.prepare(`
        INSERT INTO watchlist (id, user_id, profile_id, post_id, title, poster, backdrop, media_type, year, rating, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const it of watchlist) {
        insertWl.run(
          'wl_' + now + '_' + Math.random().toString(36).slice(2, 6),
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
        );
      }
    }

    if (Array.isArray(likes)) {
      db.prepare('DELETE FROM likes WHERE user_id = ? AND profile_id = ?').run(user.id, pId);
      const insertLk = db.prepare(`
        INSERT INTO likes (id, user_id, profile_id, post_id, title, poster, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const lk of likes) {
        insertLk.run(
          'lk_' + now + '_' + Math.random().toString(36).slice(2, 6),
          user.id,
          pId,
          String(lk.id || lk.post_id || ''),
          String(lk.title || ''),
          String(lk.poster || ''),
          Number(lk.created_at || now)
        );
      }
    }

    return res.json({ success: true, message: 'Synced successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 11. DELETE ACCOUNT
exports.deleteAccount = (req, res) => {
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    db.prepare('DELETE FROM profiles WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    try { db.prepare('DELETE FROM watchlist WHERE user_id = ?').run(user.id); } catch (_) {}
    try { db.prepare('DELETE FROM likes WHERE user_id = ?').run(user.id); } catch (_) {}
    try { db.prepare('DELETE FROM user_interests WHERE user_id = ?').run(user.id); } catch (_) {}
    try { db.prepare('DELETE FROM custom_lists WHERE user_id = ?').run(user.id); } catch (_) {}

    return res.json({ success: true, message: 'Account permanently deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
