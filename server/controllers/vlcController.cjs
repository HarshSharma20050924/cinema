/**
 * Direct VLC Launcher Controller
 * Launches VLC directly on the host machine (Windows, Linux, macOS)
 * with the stream location prefilled and playing.
 */
const { spawn, execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

function findVlcBinary(platform) {
  if (platform === 'linux') {
    const linuxBins = ['/usr/bin/vlc', '/usr/local/bin/vlc', '/snap/bin/vlc', '/var/lib/flatpak/exports/bin/org.videolan.VLC'];
    for (const b of linuxBins) {
      if (fs.existsSync(b)) return { bin: b, args: [] };
    }
    // Check PATH
    try {
      execSync('which vlc', { stdio: 'ignore' });
      return { bin: 'vlc', args: [] };
    } catch (_) {}
    // Check Flatpak
    try {
      execSync('flatpak info org.videolan.VLC', { stdio: 'ignore' });
      return { bin: 'flatpak', args: ['run', 'org.videolan.VLC'] };
    } catch (_) {}
    return { bin: 'vlc', args: [] };
  }

  if (platform === 'win32') {
    const progFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env['LOCALAPPDATA'] || '';

    const candidates = [
      path.join(progFiles, 'VideoLAN', 'VLC', 'vlc.exe'),
      path.join(progFilesX86, 'VideoLAN', 'VLC', 'vlc.exe'),
      localAppData ? path.join(localAppData, 'Programs', 'VideoLAN', 'VLC', 'vlc.exe') : '',
      'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
      'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
      'D:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
      'D:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
    ].filter(Boolean);

    // Query Windows Registry
    try {
      const regOut = execSync('reg query "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\vlc.exe" /ve', { encoding: 'utf8', windowsHide: true });
      const match = regOut.match(/REG_SZ\s+(.+)$/m);
      if (match && match[1]) {
        const regPath = match[1].trim().replace(/^"|"$/g, '');
        if (regPath && fs.existsSync(regPath)) {
          return { bin: regPath, args: [] };
        }
      }
    } catch (_) {}

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        return { bin: cand, args: [] };
      }
    }

    // Try PATH
    try {
      execSync('where vlc', { stdio: 'ignore', windowsHide: true });
      return { bin: 'vlc.exe', args: [] };
    } catch (_) {}

    return { bin: 'vlc.exe', args: [] };
  }

  if (platform === 'darwin') {
    const macPaths = [
      '/Applications/VLC.app/Contents/MacOS/VLC',
      path.join(os.homedir(), 'Applications/VLC.app/Contents/MacOS/VLC'),
    ];
    for (const m of macPaths) {
      if (fs.existsSync(m)) return { bin: m, args: [] };
    }
    return { bin: 'open', args: ['-a', 'VLC'] };
  }

  return { bin: 'vlc', args: [] };
}

function playInVlc(req, res) {
  const streamUrl = req.body?.streamUrl || req.query?.streamUrl;
  const title = req.body?.title || req.query?.title || 'Cinema Stream';
  const isMovieBox = req.body?.isMovieBox || req.query?.isMovieBox;

  if (!streamUrl) {
    return res.status(400).json({ error: 'streamUrl required' });
  }

  const cleanTitle = (title || 'Cinema Stream').replace(/[\r\n]/g, ' ').trim();
  const isMb = Boolean(isMovieBox) || /hakunaymatata|moviebox|aoneroom|inmoviebox|sssrr/i.test(streamUrl);
  let m3u = `#EXTM3U\n#EXTINF:-1,${cleanTitle}\n`;
  if (isMb) {
    m3u += '#EXTVLCOPT:http-referrer=https://officialmoviebox.com/\n';
    m3u += '#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\n';
  } else if (streamUrl.includes('mxplayer') || streamUrl.includes('d3sgzbosmwirao.cloudfront.net')) {
    m3u += '#EXTVLCOPT:http-referrer=https://www.mxplayer.in/\n';
    m3u += '#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\n';
  }
  m3u += `${streamUrl}\n`;

  const safeFileName = `cinema_${cleanTitle.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)}_${Date.now()}.m3u`;
  const m3uPath = path.join(os.tmpdir(), safeFileName);
  try {
    fs.writeFileSync(m3uPath, m3u, 'utf-8');
  } catch (writeErr) {
    console.warn('[VLC] Failed to write temp m3u:', writeErr.message);
  }

  const platform = process.platform;
  const { bin, args } = findVlcBinary(platform);

  const spawnEnv = {
    ...process.env,
    DISPLAY: process.env.DISPLAY || ':0',
    WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || 'wayland-0',
    XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || (process.getuid ? `/run/user/${process.getuid()}` : '/tmp'),
  };

  const vlcOptions = [];
  if (isMb) {
    vlcOptions.push(':http-referrer=https://officialmoviebox.com/');
    vlcOptions.push(':http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  } else if (streamUrl.includes('mxplayer') || streamUrl.includes('d3sgzbosmwirao.cloudfront.net')) {
    vlcOptions.push(':http-referrer=https://www.mxplayer.in/');
    vlcOptions.push(':http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  }

  let launched = false;
  try {
    const finalArgs = [...args, m3uPath];
    const child = spawn(bin, finalArgs, {
      detached: true,
      stdio: 'ignore',
      env: spawnEnv,
    });
    child.on('error', (spawnErr) => {
      console.warn('[VLC] Direct spawn error:', spawnErr.message);
      // Secondary fallback per OS
      try {
        if (platform === 'linux') {
          const xdgChild = spawn('xdg-open', [m3uPath], { detached: true, stdio: 'ignore', env: spawnEnv });
          xdgChild.on('error', () => {});
          xdgChild.unref();
        } else if (platform === 'win32') {
          const cmdChild = spawn('cmd.exe', ['/c', 'start', '""', m3uPath], { detached: true, stdio: 'ignore', windowsHide: true });
          cmdChild.on('error', () => {});
          cmdChild.unref();
        } else if (platform === 'darwin') {
          const openChild = spawn('open', [m3uPath], { detached: true, stdio: 'ignore' });
          openChild.on('error', () => {});
          openChild.unref();
        }
      } catch (_) {}
    });
    child.unref();
    launched = true;
  } catch (err) {
    console.warn('[VLC] Spawn threw synchronously:', err.message);
  }

  // Fallback: spawn streamUrl directly if m3u write failed
  if (!launched) {
    try {
      const child = spawn('vlc', [streamUrl, ...vlcOptions], { detached: true, stdio: 'ignore', env: spawnEnv });
      child.on('error', () => {});
      child.unref();
      launched = true;
    } catch (_) {}
  }

  // Clean up temporary m3u playlist file after 60s
  setTimeout(() => {
    try {
      if (fs.existsSync(m3uPath)) fs.unlinkSync(m3uPath);
    } catch (_) {}
  }, 60000);

  return res.json({ success: true, launched });
}

module.exports = { playInVlc };
