const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { EventEmitter } = require('events');

class CloudflaredManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 3001;
    this.appDataDir = options.appDataDir || path.join(os.homedir(), '.cinema-runner');
    this.binDir = path.join(this.appDataDir, 'bin');
    this.isWin = process.platform === 'win32';
    this.binName = this.isWin ? 'cloudflared.exe' : 'cloudflared';
    this.binPath = path.join(this.binDir, this.binName);

    this.process = null;
    this.currentUrl = null;
    this.isStarting = false;
  }

  getDownloadUrl() {
    const platform = process.platform;
    const arch = process.arch;

    if (platform === 'win32') {
      return 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
    } else if (platform === 'darwin') {
      return arch === 'arm64'
        ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64'
        : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64';
    } else if (platform === 'linux') {
      return arch === 'arm64'
        ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64'
        : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';
    }
    return null;
  }

  findExistingBinary() {
    // 1. Check local app data bin
    if (fs.existsSync(this.binPath)) {
      return this.binPath;
    }

    // 2. Check bundled bin directory if present in package
    const bundledBin = path.join(__dirname, 'bin', this.binName);
    if (fs.existsSync(bundledBin)) {
      return bundledBin;
    }

    // 3. Check system PATH
    try {
      const cmd = this.isWin ? 'where cloudflared' : 'which cloudflared';
      const found = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf-8' }).trim().split('\n')[0];
      if (found && fs.existsSync(found)) {
        return found;
      }
    } catch (_) {}

    return null;
  }

  async downloadBinary(onProgress) {
    const url = this.getDownloadUrl();
    if (!url) {
      throw new Error(`Unsupported platform: ${process.platform} (${process.arch})`);
    }

    if (!fs.existsSync(this.binDir)) {
      fs.mkdirSync(this.binDir, { recursive: true });
    }

    const tempPath = this.binPath + '.tmp';
    this.emit('log', `Downloading cloudflared from ${url}...`);

    return new Promise((resolve, reject) => {
      const requestWithRedirects = (currentUrl) => {
        https.get(currentUrl, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return requestWithRedirects(res.headers.location);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
          let receivedBytes = 0;
          const fileStream = fs.createWriteStream(tempPath);

          res.on('data', (chunk) => {
            receivedBytes += chunk.length;
            if (totalBytes > 0 && onProgress) {
              const pct = Math.round((receivedBytes / totalBytes) * 100);
              onProgress(pct);
            }
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(() => {
              try {
                if (!this.isWin) {
                  fs.chmodSync(tempPath, 0o755);
                }
                fs.renameSync(tempPath, this.binPath);
                resolve(this.binPath);
              } catch (err) {
                reject(err);
              }
            });
          });

          fileStream.on('error', (err) => {
            try { fs.unlinkSync(tempPath); } catch (_) {}
            reject(err);
          });
        }).on('error', reject);
      };

      requestWithRedirects(url);
    });
  }

  async ensureBinary() {
    let binary = this.findExistingBinary();
    if (binary) {
      return binary;
    }

    this.emit('status', 'Setting up Cloudflare tunnel component...');
    binary = await this.downloadBinary((pct) => {
      this.emit('progress', { text: `Downloading Tunnel Core: ${pct}%`, pct });
    });
    return binary;
  }

  async start() {
    if (this.process) {
      return this.currentUrl;
    }

    this.isStarting = true;
    this.currentUrl = null;

    let binary;
    try {
      binary = await this.ensureBinary();
    } catch (err) {
      this.emit('log', `Cloudflared auto-download failed: ${err.message}. Trying fallback tunnel.`);
      return this.startFallbackTunnel();
    }

    return new Promise((resolve, reject) => {
      this.emit('status', 'Connecting Cloudflare Edge Tunnel...');
      this.emit('log', `Spawning ${binary} tunnel --url http://127.0.0.1:${this.port}`);

      const args = ['tunnel', '--url', `http://127.0.0.1:${this.port}`];
      this.process = spawn(binary, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let resolved = false;

      const handleOutput = (data) => {
        const text = data.toString();
        this.emit('log', text.trim());

        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !resolved) {
          resolved = true;
          this.isStarting = false;
          this.currentUrl = match[0];
          this.emit('connected', this.currentUrl);
          this.emit('status', 'Live');
          resolve(this.currentUrl);
        }
      };

      this.process.stdout.on('data', handleOutput);
      this.process.stderr.on('data', handleOutput);

      this.process.on('error', (err) => {
        this.emit('log', `Cloudflared spawn error: ${err.message}`);
        if (!resolved) {
          this.startFallbackTunnel().then(resolve).catch(reject);
        }
      });

      this.process.on('exit', (code) => {
        this.emit('log', `Cloudflared tunnel exited (code: ${code})`);
        this.process = null;
        this.currentUrl = null;
        this.emit('disconnected');
        if (!resolved) {
          this.startFallbackTunnel().then(resolve).catch(reject);
        }
      });

      // Timeout fallback if trycloudflare does not connect in 25s
      setTimeout(() => {
        if (!resolved && this.isStarting) {
          this.emit('log', 'Cloudflare tunnel taking longer than 25s. Attempting fallback SSH tunnel...');
          this.stop();
          this.startFallbackTunnel().then(resolve).catch(reject);
        }
      }, 25000);
    });
  }

  async startFallbackTunnel() {
    this.emit('status', 'Connecting Fallback Tunnel (Pinggy)...');
    return new Promise((resolve) => {
      const pinggy = spawn('ssh', [
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ServerAliveInterval=30',
        '-p', '443',
        `-R0:localhost:${this.port}`,
        'a.pinggy.io'
      ], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });

      this.process = pinggy;
      let resolved = false;

      const handleData = (d) => {
        const text = d.toString();
        this.emit('log', text.trim());
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.(run\.pinggy-free\.link|free\.pinggy\.net|a\.free\.pinggy\.link|a\.pinggy\.link)/);
        if (match && !resolved) {
          resolved = true;
          this.isStarting = false;
          this.currentUrl = match[0];
          this.emit('connected', this.currentUrl);
          this.emit('status', 'Live (Fallback)');
          resolve(this.currentUrl);
        }
      };

      pinggy.stdout.on('data', handleData);
      pinggy.stderr.on('data', handleData);

      pinggy.on('error', () => {
        if (!resolved) {
          resolved = true;
          this.currentUrl = `http://localhost:${this.port}`;
          this.emit('connected', this.currentUrl);
          resolve(this.currentUrl);
        }
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.currentUrl = `http://localhost:${this.port}`;
          this.emit('connected', this.currentUrl);
          resolve(this.currentUrl);
        }
      }, 8000);
    });
  }

  stop() {
    this.isStarting = false;
    this.currentUrl = null;
    if (this.process) {
      try {
        if (this.isWin) {
          spawn('taskkill', ['/pid', this.process.pid, '/f', '/t']);
        } else {
          this.process.kill('SIGTERM');
        }
      } catch (_) {}
      this.process = null;
    }
    this.emit('disconnected');
    this.emit('status', 'Stopped');
  }
}

module.exports = CloudflaredManager;
