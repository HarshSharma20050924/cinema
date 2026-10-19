#!/usr/bin/env node

/**
 * ⚡ Cinema Vega Watcher Daemon
 * Continuously monitors Zenda-Cross/vega-providers for code updates and provider fixes.
 * Fires local Ubuntu desktop notifications (notify-send) immediately on any new commit.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFile, exec } = require('child_process');

const STATE_FILE = path.join(process.env.HOME || '/home/harsh', '.config/cinema/vega-watcher-state.json');
const LOG_FILE = path.join(__dirname, '../logs/vega-updates.log');

const REPOS_TO_WATCH = [
  { owner: 'Zenda-Cross', repo: 'vega-providers', branch: 'main' },
  { owner: 'Zenda-Cross', repo: 'vega-providers', branch: 'with-bundler' }
];

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // Check every 10 minutes

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (_) {}
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Failed to save state:', err.message);
  }
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Cinema-Vega-Watcher/1.0',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 10000
    };

    https.get(url, opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 100)}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function sendDesktopNotification(title, body) {
  const env = {
    ...process.env,
    DISPLAY: process.env.DISPLAY || ':1',
    DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS || 'unix:path=/run/user/1000/bus'
  };

  execFile('/usr/bin/notify-send', [
    '-u', 'critical',
    '-i', 'software-update-available',
    '-a', 'Cinema Vega Watcher',
    title,
    body
  ], { env }, (err) => {
    if (err) console.error('notify-send error:', err.message);
  });

  // Try playing subtle alert sound if available
  exec('canberra-gtk-play -i message || paplay /usr/share/sounds/freedesktop/stereo/message.oga 2>/dev/null', { env }, () => {});
}

async function checkRepo(target, state) {
  const key = `${target.owner}/${target.repo}:${target.branch}`;
  const apiUrl = `https://api.github.com/repos/${target.owner}/${target.repo}/commits?sha=${target.branch}&per_page=3`;

  try {
    const commits = await fetchJson(apiUrl);
    if (!Array.isArray(commits) || commits.length === 0) return;

    const latest = commits[0];
    const sha = latest.sha;
    const prevSha = state[key];

    if (!prevSha) {
      // First run initialization: record current head without spamming notification
      state[key] = sha;
      log(`Initialized tracking for ${key} at ${sha.slice(0, 7)}`);
      return;
    }

    if (sha !== prevSha) {
      log(`🔥 New commit on ${key}: ${sha.slice(0, 7)}`);

      // Fetch commit detail to find changed files
      let changedFiles = [];
      try {
        const detail = await fetchJson(`https://api.github.com/repos/${target.owner}/${target.repo}/commits/${sha}`);
        changedFiles = (detail.files || []).map(f => f.filename);
      } catch (_) {}

      const commitMsg = latest.commit?.message?.split('\n')[0] || 'No message';
      const author = latest.commit?.author?.name || 'Unknown';

      const fileSummary = changedFiles.length > 0
        ? `\nFiles (${changedFiles.length}):\n${changedFiles.slice(0, 5).join('\n')}${changedFiles.length > 5 ? '\n...' : ''}`
        : '';

      const notifTitle = `⚡ Vega Update: ${target.repo} (${target.branch})`;
      const notifBody = `"${commitMsg}" by ${author}${fileSummary}`;

      sendDesktopNotification(notifTitle, notifBody);
      log(`Notified user:\n${notifTitle}\n${notifBody}`);

      state[key] = sha;
    }
  } catch (err) {
    log(`Error checking ${key}: ${err.message}`);
  }
}

async function runCheck() {
  const state = loadState();
  for (const target of REPOS_TO_WATCH) {
    await checkRepo(target, state);
  }
  saveState(state);
}

// Entrypoint
const isOnce = process.argv.includes('--once');

if (isOnce) {
  runCheck().then(() => {
    console.log('Check finished.');
    process.exit(0);
  });
} else {
  console.log('🚀 Vega Watcher running in background. Checking every 10 minutes...');
  runCheck();
  setInterval(runCheck, CHECK_INTERVAL_MS);
}
