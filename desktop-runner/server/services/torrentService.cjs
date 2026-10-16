const path = require('path');
const os = require('os');
const fs = require('fs');

const PUBLIC_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://tracker.bittor.pw:1337/announce',
  'udp://public.popcorn-tracker.org:6969/announce',
  'udp://tracker.dler.org:6969/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://explodie.org:6969/announce',
  'udp://tracker.openbittorrent.com:6969/announce',
  'udp://tracker.coppersurfer.tk:6969/announce',
  'udp://p4p.arenabg.com:1337/announce',
  'udp://movies.zsw.ca:6969/announce',
  'udp://tracker.cyberia.is:6969/announce',
  'udp://retracker.lanta-net.ru:2710/announce',
  'http://tracker.openbittorrent.com:80/announce',
  'udp://tracker.moeking.me:6969/announce',
  'udp://opentor.org:2710/announce',
  'udp://opentracker.i2p.rocks:6969/announce',
  'udp://tracker.tiny-vps.com:6969/announce',
  'https://tracker.tamersunion.org:443/announce',
];

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.webm', '.mov', '.flv', '.wmv', '.m4v', '.ts']);

class TorrentService {
  constructor() {
    this.client = null;
    this.initPromise = null;
    this.activeTorrents = new Map();
    this.downloadPath = path.join(os.tmpdir(), 'cinema-torrent-cache');
    try {
      if (!fs.existsSync(this.downloadPath)) {
        fs.mkdirSync(this.downloadPath, { recursive: true });
      }
    } catch (_) {}
  }

  async getClient() {
    if (this.client) return this.client;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const { default: WebTorrent } = await import('webtorrent');
        this.client = new WebTorrent({
          maxConns: 150,
          dht: true,
          utp: true,
          webSeeds: true,
        });

        this.client.on('error', (err) => {
          console.warn('[TorrentService] WebTorrent client warning:', err.message);
        });

        console.log('[TorrentService] WebTorrent engine initialized successfully');
        return this.client;
      } catch (err) {
        this.initPromise = null;
        console.error('[TorrentService] Failed to initialize WebTorrent:', err.message);
        throw err;
      }
    })();

    return this.initPromise;
  }

  buildMagnetUri(infoHash, name = '') {
    const cleanHash = (infoHash || '').trim().toUpperCase();
    let magnet = `magnet:?xt=urn:btih:${cleanHash}`;
    if (name) {
      magnet += `&dn=${encodeURIComponent(name)}`;
    }
    for (const tr of PUBLIC_TRACKERS) {
      magnet += `&tr=${encodeURIComponent(tr)}`;
    }
    return magnet;
  }

  async getTorrent(magnetOrHash, displayName = '') {
    const client = await this.getClient();
    let magnet = magnetOrHash;

    if (!magnet.startsWith('magnet:?')) {
      magnet = this.buildMagnetUri(magnetOrHash, displayName);
    }

    // Extract infoHash from magnet
    const hashMatch = magnet.match(/urn:btih:([a-zA-Z0-9]{32,40})/i);
    const hash = hashMatch ? hashMatch[1].toLowerCase() : magnet.toLowerCase();

    const findTorrent = () =>
      (client.torrents || []).find(
        (t) => (t.infoHash || "").toLowerCase() === hash
      );

    const existing = findTorrent();
    if (existing) {
      this.activeTorrents.set(hash, Date.now());
      if (existing.files && existing.files.length > 0) {
        return existing;
      }
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const curr = findTorrent();
          if (curr && curr.files && curr.files.length > 0) {
            resolve(curr);
          } else {
            reject(new Error("Torrent metadata timeout"));
          }
        }, 30000);

        existing.once("metadata", () => {
          clearTimeout(timeout);
          resolve(existing);
        });
        existing.once("ready", () => {
          clearTimeout(timeout);
          resolve(existing);
        });
        existing.once("error", (e) => {
          clearTimeout(timeout);
          reject(e);
        });
      });
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const t = findTorrent();
        if (t && t.files && t.files.length > 0) {
          resolve(t);
        } else {
          reject(new Error("Torrent metadata timeout"));
        }
      }, 30000);

      try {
        const torrent = client.add(
          magnet,
          {
            path: this.downloadPath,
            destroyStoreOnDestroy: true,
          },
          (t) => {
            clearTimeout(timeout);
            this.activeTorrents.set(hash, Date.now());
            resolve(t);
          }
        );

        torrent.on("error", (e) => {
          console.warn(`[TorrentService] Torrent ${hash} error:`, e.message);
        });

        torrent.once("metadata", () => {
          clearTimeout(timeout);
          this.activeTorrents.set(hash, Date.now());
          resolve(torrent);
        });
      } catch (err) {
        clearTimeout(timeout);
        const curr = findTorrent();
        if (curr) {
          if (curr.files && curr.files.length > 0) {
            resolve(curr);
          } else {
            curr.once("metadata", () => resolve(curr));
            curr.once("ready", () => resolve(curr));
          }
        } else {
          reject(err);
        }
      }
    });
  }

  findBestVideoFile(torrent) {
    if (!torrent || !Array.isArray(torrent.files) || torrent.files.length === 0) {
      return null;
    }

    // Filter video files
    const videoFiles = torrent.files.filter((f) => {
      const ext = path.extname(f.name).toLowerCase();
      return VIDEO_EXTENSIONS.has(ext);
    });

    if (videoFiles.length > 0) {
      // Pick the largest video file (main feature)
      videoFiles.sort((a, b) => b.length - a.length);
      return videoFiles[0];
    }

    // Fallback: pick the largest file overall
    const sorted = [...torrent.files].sort((a, b) => b.length - a.length);
    return sorted[0];
  }

  detectMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.mp4' || ext === '.m4v') return 'video/mp4';
    if (ext === '.mkv') return 'video/x-matroska';
    if (ext === '.webm') return 'video/webm';
    if (ext === '.avi') return 'video/x-msvideo';
    if (ext === '.mov') return 'video/quicktime';
    return 'application/octet-stream';
  }

  async handleStream(req, res, magnetOrHash, displayName = '') {
    try {
      const torrent = await this.getTorrent(magnetOrHash, displayName);
      const file = this.findBestVideoFile(torrent);

      if (!file) {
        return res.status(404).send('No playable video file found in torrent');
      }

      const total = file.length;
      const range = req.headers.range;
      const contentType = this.detectMimeType(file.name);

      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (!range) {
        res.setHeader('Content-Length', total);
        res.status(200);
        const stream = file.createReadStream();
        stream.on('error', () => {});
        req.on('close', () => {
          try { stream.destroy(); } catch (_) {}
        });
        stream.pipe(res);
        return;
      }

      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;

      if (start >= total || end >= total) {
        res.setHeader('Content-Range', `bytes */${total}`);
        return res.status(416).send('Requested range not satisfiable');
      }

      const chunksize = end - start + 1;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      res.setHeader('Content-Length', chunksize);
      res.status(206);

      const stream = file.createReadStream({ start, end });
      stream.on('error', () => {});
      req.on('close', () => {
        try { stream.destroy(); } catch (_) {}
      });
      stream.pipe(res);
    } catch (err) {
      console.error('[TorrentService] Stream error:', err.message);
      if (!res.headersSent) {
        res.status(502).send(`Torrent stream error: ${err.message}`);
      }
    }
  }

function sanitizeDownloadFilename(name, fallback = 'video.mp4') {
  let clean = (name ? decodeURIComponent(name) : fallback)
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  clean = clean.replace(/\.+$/, '');
  clean = clean.replace(/\.(x264|x265|hevc|1080p|2160p|720p|dks|aac|ddp\d*(?:\.\d*)?)$/i, '');
  clean = clean.replace(/[-_](x264|x265|hevc|1080p|2160p|720p|dks)$/i, '');

  const ext = path.extname(clean).toLowerCase();
  const validExts = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm', '.ts', '.m4v']);

  if (!validExts.has(ext)) {
    clean += '.mp4';
  }
  return clean;
}

  async handleDownload(req, res, magnetOrHash, displayName = '') {
    const cleanName = sanitizeDownloadFilename(displayName);

    let headersSentEarly = false;
    const earlyTimer = setTimeout(() => {
      if (!res.headersSent) {
        headersSentEarly = true;
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cleanName)}"`);
        res.setHeader('Content-Type', this.detectMimeType(cleanName));
        res.setHeader('Access-Control-Allow-Origin', '*');
        if (typeof res.flushHeaders === 'function') {
          res.flushHeaders();
        }
      }
    }, 400);

    try {
      const torrent = await this.getTorrent(magnetOrHash, cleanName);
      clearTimeout(earlyTimer);
      const file = this.findBestVideoFile(torrent);

      if (!file) {
        if (!res.headersSent) {
          return res.status(404).send('No playable file found');
        }
        return res.end();
      }

      const filename = sanitizeDownloadFilename(file.name || cleanName);
      if (!headersSentEarly) {
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Content-Type', this.detectMimeType(filename));
        res.setHeader('Content-Length', file.length);
        res.setHeader('Access-Control-Allow-Origin', '*');
      }

      try {
        file.select();
      } catch (_) {}

      const stream = file.createReadStream();
      stream.on('error', () => {});
      req.on('close', () => {
        try { stream.destroy(); } catch (_) {}
      });
      stream.pipe(res);
    } catch (err) {
      clearTimeout(earlyTimer);
      console.error('[TorrentService] Download error:', err.message);
      if (!res.headersSent) {
        res.status(504).send(`Torrent download error: ${err.message}. Swarm may be slow or unconnectable.`);
      } else {
        res.end();
      }
    }
  }
}

module.exports = new TorrentService();
