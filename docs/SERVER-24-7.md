# 🌐 Cinema 24/7 Server (100% Free & Unblockable)

This guide outlines **truly 100% free ways** to run your Cinema backend 24/7 without getting blocked by Cloudflare or movie scraping providers (VegaMovies, MoviesMod, HDHub4u, KatMoviesHD).

---

## 📱 Method 1: Android Phone as a 24/7 Server (Recommended • $0 • 100% Unblockable)

Since movie sites block datacenter IPs (Render, AWS, DigitalOcean) using Cloudflare Bot Protection, **the most powerful, 100% free 24/7 server is an Android phone**.

### Why this is the best setup:
- **Zero Cost**: $0 forever, no sign-ups, no credit cards, no trial limits.
- **Residential IP**: Because the phone is connected to home WiFi / 4G / 5G, movie sites **never block it** (no Cloudflare 403 or Turnstile challenge).
- **Runs 24/7 Forever**: With our updated runner app, the service holds CPU Partial WakeLock, WiFi High-Performance Lock, and Battery Optimization Exemption. It will **never sleep or stop** until you manually tap Stop.
- **Automatic Global Edge**: The phone connects to a Cloudflare Quick Tunnel and automatically syncs to `https://cinema-dwh.pages.dev/api/tunnel-sync` every 25 seconds.

### Setup:
1. Install [`Cinema-Runner.apk`](file:///home/harsh/cinema/Cinema-Runner.apk) on your phone (or a spare Android phone).
2. Open the app, grant notification & battery optimization exemption when prompted.
3. Tap **START**.
4. Leave the phone connected to a charger and WiFi. It now powers your entire Cinema streaming website 24/7!

---

## ⚡ Method 2: Render Free Tier + Free 24/7 Keep-Alive Ping ($0 Cloud)

Render offers **750 free hours every month** (which is 24/7 for the whole 30-31 days). Render normally puts free web services to sleep after 15 minutes of inactivity, but you can keep it awake 24/7 for free using a free uptime monitor.

### Step 1: Deploy to Render
1. Go to [render.com](https://render.com) and create a free account.
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository `cinema`.
4. Name: `cinema-server`
5. Runtime: **Docker** (Render will automatically detect the [Dockerfile](file:///home/harsh/cinema/Dockerfile)).
6. Plan: **Free**.
7. In **Environment Variables**:
   - `PORT`: `10000`
   - `ENABLE_WARP`: `true` (routes scraper requests through Cloudflare Anycast to bypass datacenter blocks)
8. Click **Deploy Web Service**. Render will give you a public URL (e.g. `https://cinema-server.onrender.com`).

### Step 2: Keep it Awake 24/7 (Prevent Sleep)
1. Go to [cron-job.org](https://cron-job.org) or [uptimerobot.com](https://uptimerobot.com) (both 100% free).
2. Create a new monitor/job:
   - URL: `https://your-service.onrender.com/api/providers`
   - Execution interval: **Every 5 minutes**
3. This sends a lightweight ping every 5 minutes, preventing Render from ever sleeping.

---

## 🛡️ Method 3: Serv00 Free Hosting (Free FreeBSD Shell • 24/7 Node.js • No Credit Card)

[Serv00.com](https://www.serv00.com) provides **free hosting accounts forever** with SSH access, cron jobs, and support for running background Node.js processes.

### Setup:
1. Register a free account at [serv00.com](https://www.serv00.com).
2. SSH into your Serv00 server:
   ```bash
   ssh username@sX.serv00.com
   ```
3. Enable Devil background processes in panel:
   ```bash
   devil binexec on
   ```
4. Clone repo and install dependencies:
   ```bash
   git clone https://github.com/HarshSharma20050924/cinema.git
   cd cinema
   npm install --omit=dev
   ```
5. Start server in background with PM2:
   ```bash
   npm install -g pm2
   pm2 start server/index.cjs --name cinema-server
   pm2 save
   ```

---

## 🔄 How the Hybrid Cluster Works

Even if you run a free cloud server (Render / Serv00):
- If the cloud server encounters a provider that blocks datacenter IPs, it falls back to your **residential runner** (mobile or desktop).
- The coordinator at `https://cinema-dwh.pages.dev/api/tunnel-sync` balances traffic between the 24/7 cloud server and your residential devices, ensuring zero downtime!
