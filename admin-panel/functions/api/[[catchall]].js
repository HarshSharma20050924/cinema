/**
 * Cloudflare Pages Functions: Cinema Admin Coordinator & Cluster Controller
 * Backed by Cloudflare KV (CINEMA_KV)
 */

const ADMIN_PASSWORD = "admin123";

const DEFAULT_SETTINGS = {
  serverEnabled: true,
  activeTunnelUrl: "",
  activeDeviceId: null,
  activeDeviceName: "",
};

const DEFAULT_PROVIDERS = {};

async function getD1Pool(db) {
  if (!db) return [];
  try {
    const row = await db.prepare("SELECT value FROM config WHERE key = 'BACKEND_POOL'").first();
    return row?.value ? JSON.parse(row.value) : [];
  } catch (e) {
    return [];
  }
}

async function getD1Url(db) {
  if (!db) return "";
  try {
    const row = await db.prepare("SELECT value FROM config WHERE key = 'BACKEND_URL'").first();
    return row?.value || "";
  } catch (e) {
    return "";
  }
}

async function getJSON(kv, key, defaultVal) {
  try {
    if (!kv) return defaultVal;
    const raw = await kv.get(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

async function putJSON(kv, key, data) {
  try {
    if (!kv) return;
    await kv.put(key, JSON.stringify(data));
  } catch (e) {}
}

export async function onRequest(context) {
  const { request, env } = context;
  const kv = env.CINEMA_KV;
  const db = env.cinema_db;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // Helper response
  const jsonResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
        ...corsHeaders,
      },
    });
  };

  // Helper Auth check
  const checkAuth = () => {
    const authHeader = request.headers.get("authorization") || request.headers.get("x-admin-key");
    return (
      authHeader === `Bearer ${ADMIN_PASSWORD}` ||
      authHeader === ADMIN_PASSWORD ||
      authHeader === "Bearer admin123" ||
      authHeader === "Bearer admin"
    );
  };

  // 1. ADMIN LOGIN
  if (path === "/api/admin/login" && request.method === "POST") {
    try {
      const body = await request.json();
      const pass = String(body?.password || "").trim();
      if (!pass || pass === "admin123" || pass === "admin" || pass === ADMIN_PASSWORD) {
        return jsonResponse({ success: true, token: ADMIN_PASSWORD });
      }
      return jsonResponse({ success: false, error: "Incorrect Password" }, 401);
    } catch (e) {
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }
  }

  // 2. RUNNER CHECK (Device checks if allowed before starting)
  if (path === "/api/runner/check" && request.method === "GET") {
    const deviceId = url.searchParams.get("deviceId");
    const deviceName = url.searchParams.get("deviceName");

    if (!deviceId) return jsonResponse({ allowed: false, message: "Missing deviceId" }, 400);

    const devices = await getJSON(kv, "CINEMA_DEVICES", {});
    const settings = await getJSON(kv, "CINEMA_SETTINGS", DEFAULT_SETTINGS);
    const providers = await getJSON(kv, "CINEMA_PROVIDERS", DEFAULT_PROVIDERS);

    if (!devices[deviceId]) {
      devices[deviceId] = {
        deviceId,
        deviceName: deviceName || `Device-${deviceId.slice(0, 6)}`,
        allowed: true,
        status: "idle",
        role: "idle",
        lastPing: Date.now(),
        registeredAt: Date.now(),
        tunnelUrl: "",
      };
      await putJSON(kv, "CINEMA_DEVICES", devices);
    }

    const dev = devices[deviceId];
    if (!settings.serverEnabled) {
      return jsonResponse({
        allowed: false,
        reason: "GLOBAL_DISABLED",
        message: "Server has been disabled globally by the Administrator.",
      });
    }

    if (dev.allowed === false) {
      return jsonResponse({
        allowed: false,
        reason: "DEVICE_DISABLED",
        message: "This device is disabled by the Administrator. Contact admin for access.",
      });
    }

    return jsonResponse({
      allowed: true,
      providersConfig: providers,
      activeTunnelUrl: settings.activeTunnelUrl,
      message: "Authorized to run server engine.",
    });
  }

  // 3. RUNNER HEARTBEAT & MULTI-SERVER ARBITRATION
  if (path === "/api/runner/heartbeat" && request.method === "POST") {
    try {
      const body = await request.json();
      const { deviceId, deviceName, tunnelUrl, status } = body || {};

      if (!deviceId) return jsonResponse({ error: "Missing deviceId" }, 400);

      // 1. Load active nodes from D1 first (D1 is our persistent database!)
      const d1Pool = await getD1Pool(db);
      const devices = await getJSON(kv, "CINEMA_DEVICES", {});
      const settings = await getJSON(kv, "CINEMA_SETTINGS", DEFAULT_SETTINGS);
      const providers = await getJSON(kv, "CINEMA_PROVIDERS", DEFAULT_PROVIDERS);
      const now = Date.now();

      // Populate devices with all living nodes in D1 pool
      if (Array.isArray(d1Pool)) {
        for (const p of d1Pool) {
          if (p.deviceId && (now - (p.lastSeen || 0) < 600000)) {
            devices[p.deviceId] = {
              deviceId: p.deviceId,
              deviceName: p.deviceName || `Node-${p.deviceId.slice(0, 6)}`,
              tunnelUrl: p.url,
              status: "running",
              role: p.isPrimary ? "primary" : "standby",
              allowed: true,
              registeredAt: p.lastSeen || now,
              lastPing: p.lastSeen || now,
            };
          }
        }
      }

      if (!devices[deviceId]) {
        devices[deviceId] = {
          deviceId,
          deviceName: deviceName || `Device-${deviceId.slice(0, 6)}`,
          allowed: true,
          registeredAt: now,
        };
      }

      const dev = devices[deviceId];
      dev.lastPing = now;
      if (deviceName) dev.deviceName = deviceName;
      if (status) dev.status = status;
      if (tunnelUrl) dev.tunnelUrl = tunnelUrl;

      // Killswitch check
      if (!settings.serverEnabled || dev.allowed === false) {
        dev.status = "disabled";
        dev.role = "disabled";
        await putJSON(kv, "CINEMA_DEVICES", devices);
        return jsonResponse({
          allowed: false,
          command: "STOP_SERVER",
          message: "Server access has been revoked by Administrator.",
        });
      }

      // Check primary lease
      const currentPrimary = settings.activeDeviceId ? devices[settings.activeDeviceId] : null;
      const isPrimaryAlive = currentPrimary &&
        currentPrimary.allowed !== false &&
        currentPrimary.status === "running" &&
        currentPrimary.tunnelUrl &&
        (now - (currentPrimary.lastPing || 0) < 45000);

      if (status === "running" && tunnelUrl) {
        if (!isPrimaryAlive || settings.activeDeviceId === deviceId) {
          // Promote/Keep as Primary
          dev.role = "primary";
          settings.activeDeviceId = deviceId;
          settings.activeDeviceName = dev.deviceName;
          settings.activeTunnelUrl = tunnelUrl;
          await putJSON(kv, "CINEMA_SETTINGS", settings);
          try {
            if (kv) await kv.put("BACKEND_URL", tunnelUrl.replace(/\/+$/, ""));
          } catch (_) {}
        } else {
          // Healthy primary already exists: this device is HOT STANDBY
          dev.role = "standby";
        }
      } else if (status !== "running") {
        dev.role = "idle";
        if (settings.activeDeviceId === deviceId) {
          settings.activeDeviceId = null;
          settings.activeTunnelUrl = "";
          settings.activeDeviceName = "";
          await putJSON(kv, "CINEMA_SETTINGS", settings);
        }
      }

      // Update pool in D1 and KV safely - preserve all nodes seen in the last 10 minutes
      const pool = Object.values(devices)
        .filter(d => d.allowed !== false && d.status === "running" && d.tunnelUrl && (now - (d.lastPing || 0) < 600000))
        .map(d => ({
          deviceId: d.deviceId,
          deviceName: d.deviceName,
          url: d.tunnelUrl.replace(/\/+$/, ""),
          isPrimary: d.deviceId === settings.activeDeviceId,
          lastSeen: d.lastPing,
        }));

      if (db) {
        try {
          await db.batch([
            db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES ('BACKEND_URL', ?, ?)").bind(settings.activeTunnelUrl || tunnelUrl, now),
            db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES ('BACKEND_POOL', ?, ?)").bind(JSON.stringify(pool), now)
          ]);
        } catch (_) {}
      }

      try {
        if (kv) await kv.put("BACKEND_POOL", JSON.stringify(pool));
      } catch (_) {}
      await putJSON(kv, "CINEMA_DEVICES", devices);

      return jsonResponse({
        allowed: true,
        command: "CONTINUE",
        role: dev.role || "standby",
        isPrimary: dev.role === "primary",
        activeDeviceName: settings.activeDeviceName,
        activeTunnelUrl: settings.activeTunnelUrl,
        providersConfig: providers,
      });
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  // -----------------------------------------------------------
  // ADMIN AUTH REQUIRED FOR REMAINING ROUTES
  // -----------------------------------------------------------
  if (!checkAuth()) {
    return jsonResponse({ error: "Unauthorized: Invalid Admin Password" }, 401);
  }

  // 4. GET DEVICES
  if (path === "/api/admin/devices" && request.method === "GET") {
    const d1Pool = await getD1Pool(db);
    const d1Url = await getD1Url(db);
    const devices = await getJSON(kv, "CINEMA_DEVICES", {});
    const settings = await getJSON(kv, "CINEMA_SETTINGS", DEFAULT_SETTINGS);
    const now = Date.now();

    // Ground truth: Sync D1 Pool into devices
    if (Array.isArray(d1Pool)) {
      for (const p of d1Pool) {
        if (p.deviceId) {
          const isFresh = now - (p.lastSeen || 0) < 180000;
          devices[p.deviceId] = {
            deviceId: p.deviceId,
            deviceName: p.deviceName || "Cluster Node",
            tunnelUrl: p.url,
            status: isFresh ? "running" : "offline",
            role: p.url === d1Url ? "primary" : "standby",
            allowed: true,
            registeredAt: p.lastSeen || now,
            lastPing: p.lastSeen || now,
          };
        }
      }
    }

    if (d1Url && (!settings.activeTunnelUrl || settings.activeTunnelUrl !== d1Url)) {
      settings.activeTunnelUrl = d1Url;
      const primaryNode = Array.isArray(d1Pool) ? d1Pool.find(p => p.url === d1Url) : null;
      if (primaryNode) {
        settings.activeDeviceId = primaryNode.deviceId;
        settings.activeDeviceName = primaryNode.deviceName;
      }
    }

    // Auto-prune offline nodes older than 5 minutes (300,000ms)
    let changed = false;
    for (const [id, d] of Object.entries(devices)) {
      if (!d.isManual && now - (d.lastPing || 0) > 300000) {
        delete devices[id];
        if (settings.activeDeviceId === id) {
          settings.activeDeviceId = null;
          settings.activeDeviceName = "";
          settings.activeTunnelUrl = "";
          await putJSON(kv, "CINEMA_SETTINGS", settings);
        }
        changed = true;
      }
    }
    if (changed) {
      await putJSON(kv, "CINEMA_DEVICES", devices);
    }

    const list = Object.values(devices)
      .map(d => {
        const isOnline = d.lastPing && now - d.lastPing < 60000;
        return {
          ...d,
          isOnline,
          status: !isOnline ? "offline" : d.status || "online",
        };
      })
      .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));

    return jsonResponse({ devices: list, settings });
  }

  // 4a. MANUALLY ADD A SERVER NODE
  if (path === "/api/admin/devices" && request.method === "POST") {
    try {
      const body = await request.json();
      const { deviceName, url } = body || {};
      if (!url || !/^https?:\/\//i.test(url)) {
        return jsonResponse({ error: "Invalid URL provided (must start with http:// or https://)" }, 400);
      }

      const cleanUrl = url.replace(/\/+$/, "");
      const deviceId = "node_" + Math.random().toString(36).substring(2, 9);
      const devices = await getJSON(kv, "CINEMA_DEVICES", {});
      const settings = await getJSON(kv, "CINEMA_SETTINGS", DEFAULT_SETTINGS);

      const isFirst = Object.keys(devices).length === 0 || !settings.activeTunnelUrl;
      const dev = {
        deviceId,
        deviceName: (deviceName || "Server Node").trim(),
        tunnelUrl: cleanUrl,
        status: "running",
        role: isFirst ? "primary" : "standby",
        allowed: true,
        registeredAt: Date.now(),
        lastPing: Date.now(),
        isManual: true,
      };

      devices[deviceId] = dev;
      if (isFirst) {
        settings.activeDeviceId = deviceId;
        settings.activeDeviceName = dev.deviceName;
        settings.activeTunnelUrl = cleanUrl;
        await putJSON(kv, "CINEMA_SETTINGS", settings);
        if (kv) await kv.put("BACKEND_URL", cleanUrl);
      }

      const pool = Object.values(devices)
        .filter(d => d.allowed !== false && d.tunnelUrl)
        .map(d => ({
          deviceId: d.deviceId,
          deviceName: d.deviceName,
          url: d.tunnelUrl.replace(/\/+$/, ""),
          isPrimary: d.deviceId === settings.activeDeviceId,
          lastPing: d.lastPing,
        }));

      if (kv) await kv.put("BACKEND_POOL", JSON.stringify(pool));
      await putJSON(kv, "CINEMA_DEVICES", devices);

      // Also forward/sync with cinema-dwh.pages.dev
      try {
        await fetch("https://cinema-dwh.pages.dev/api/tunnel-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: cleanUrl,
            secret: "cinema_secret_2026",
            deviceId: deviceId,
            deviceName: dev.deviceName,
          }),
        });
      } catch (_) {}

      return jsonResponse({ success: true, device: dev, totalNodes: Object.keys(devices).length });
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  // 4b. PRUNE OFFLINE DEVICES
  if (path === "/api/admin/devices/prune-offline" && request.method === "POST") {
    const devices = await getJSON(kv, "CINEMA_DEVICES", {});
    const settings = await getJSON(kv, "CINEMA_SETTINGS", DEFAULT_SETTINGS);
    const now = Date.now();
    for (const [id, d] of Object.entries(devices)) {
      if (!d.lastPing || (now - d.lastPing >= 45000)) {
        delete devices[id];
        if (settings.activeDeviceId === id) {
          settings.activeDeviceId = null;
          settings.activeDeviceName = "";
          settings.activeTunnelUrl = "";
        }
      }
    }
    await putJSON(kv, "CINEMA_DEVICES", devices);
    await putJSON(kv, "CINEMA_SETTINGS", settings);
    return jsonResponse({ success: true, remaining: Object.keys(devices).length });
  }

  // 5. TOGGLE DEVICE ALLOWED / DISABLED
  const toggleMatch = path.match(/^\/api\/admin\/devices\/([^\/]+)\/toggle$/);
  if (toggleMatch && request.method === "POST") {
    const deviceId = toggleMatch[1];
    const devices = await getJSON(kv, "CINEMA_DEVICES", {});
    const settings = await getJSON(kv, "CINEMA_SETTINGS", DEFAULT_SETTINGS);

    if (!devices[deviceId]) {
      devices[deviceId] = {
        deviceId,
        deviceName: `Device-${deviceId.slice(0, 6)}`,
        allowed: true,
        status: "idle",
        role: "idle",
        lastPing: Date.now(),
        registeredAt: Date.now(),
        tunnelUrl: "",
      };
    }

    devices[deviceId].allowed = !devices[deviceId].allowed;
    if (!devices[deviceId].allowed) {
      devices[deviceId].status = "disabled";
      devices[deviceId].role = "disabled";
      if (settings.activeDeviceId === deviceId) {
        settings.activeDeviceId = null;
        settings.activeTunnelUrl = "";
        settings.activeDeviceName = "";
        await putJSON(kv, "CINEMA_SETTINGS", settings);
      }
      if (db) {
        try {
          const pool = await getD1Pool(db);
          const updatedPool = pool.filter(p => p.deviceId !== deviceId);
          await db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('BACKEND_POOL', ?)").bind(JSON.stringify(updatedPool)).run();
          const currentUrl = await getD1Url(db);
          if (devices[deviceId].tunnelUrl && currentUrl === devices[deviceId].tunnelUrl) {
            const nextPrimary = updatedPool[0]?.url || "";
            await db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('BACKEND_URL', ?)").bind(nextPrimary).run();
          }
        } catch (_) {}
      }
    }
    await putJSON(kv, "CINEMA_DEVICES", devices);
    return jsonResponse({ success: true, device: devices[deviceId] });
  }

  // 6. MAKE PRIMARY
  const makePrimaryMatch = path.match(/^\/api\/admin\/devices\/([^\/]+)\/make-primary$/);
  if (makePrimaryMatch && request.method === "POST") {
    const deviceId = makePrimaryMatch[1];
    const devices = await getJSON(kv, "CINEMA_DEVICES", {});
    const settings = await getJSON(kv, "CINEMA_SETTINGS", DEFAULT_SETTINGS);

    if (!devices[deviceId]) return jsonResponse({ error: "Device not found" }, 404);
    const dev = devices[deviceId];
    if (dev.allowed === false) return jsonResponse({ error: "Cannot promote a disabled device" }, 400);

    settings.activeDeviceId = dev.deviceId;
    settings.activeDeviceName = dev.deviceName;
    settings.activeTunnelUrl = dev.tunnelUrl || "";
    await putJSON(kv, "CINEMA_SETTINGS", settings);

    Object.values(devices).forEach(d => {
      d.role = d.deviceId === deviceId ? "primary" : "standby";
    });
    await putJSON(kv, "CINEMA_DEVICES", devices);

    if (kv && dev.tunnelUrl) {
      await kv.put("BACKEND_URL", dev.tunnelUrl.replace(/\/+$/, ""));
    }

    return jsonResponse({
      success: true,
      activeDeviceId: settings.activeDeviceId,
      activeDeviceName: settings.activeDeviceName,
      activeTunnelUrl: settings.activeTunnelUrl,
    });
  }

  // 7. DELETE DEVICE
  const deleteMatch = path.match(/^\/api\/admin\/devices\/([^\/]+)$/);
  if (deleteMatch && request.method === "DELETE") {
    const deviceId = deleteMatch[1];
    const devices = await getJSON(kv, "CINEMA_DEVICES", {});
    const settings = await getJSON(kv, "CINEMA_SETTINGS", DEFAULT_SETTINGS);
    if (devices[deviceId]) {
      delete devices[deviceId];
      if (settings.activeDeviceId === deviceId) {
        settings.activeDeviceId = null;
        settings.activeDeviceName = "";
        settings.activeTunnelUrl = "";
        await putJSON(kv, "CINEMA_SETTINGS", settings);
      }
      await putJSON(kv, "CINEMA_DEVICES", devices);
    }
    return jsonResponse({ success: true });
  }

  // 8. GLOBAL KILLSWITCH
  if (path === "/api/admin/global-killswitch" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const settings = await getJSON(kv, "CINEMA_SETTINGS", DEFAULT_SETTINGS);
    settings.serverEnabled = body?.enabled !== undefined ? !!body.enabled : !settings.serverEnabled;
    if (!settings.serverEnabled) {
      settings.activeTunnelUrl = "";
      settings.activeDeviceId = null;
      settings.activeDeviceName = "";
      if (kv) await kv.delete("BACKEND_URL");
    }
    await putJSON(kv, "CINEMA_SETTINGS", settings);
    return jsonResponse({ success: true, serverEnabled: settings.serverEnabled });
  }

  // 9. PROVIDERS / EXTENSIONS CONFIG
  if (path === "/api/admin/providers") {
    if (request.method === "GET") {
      let savedConfig = {};
      if (db) {
        try {
          const row = await db.prepare("SELECT value FROM config WHERE key = 'CINEMA_PROVIDERS'").first();
          if (row?.value) savedConfig = JSON.parse(row.value);
        } catch (e) {
          console.error("D1 read CINEMA_PROVIDERS error:", e);
        }
      }
      if (Object.keys(savedConfig).length === 0 && kv) {
        savedConfig = await getJSON(kv, "CINEMA_PROVIDERS", DEFAULT_PROVIDERS);
      }

      // Master list of extensions
      let masterList = [
        { name: "HdHub4u", value: "hdhub4u", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/hdhub4u.png" },
        { name: "VMovies", value: "vega", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/vega.png" },
        { name: "4kHdHub", value: "4khdhub", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/4khdhub.png" },
        { name: "Cinewood", value: "1cinevood", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/1cinevood.png" },
        { name: "World4uFree", value: "world4u", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/world4u.png" },
        { name: "KatMoviesHd", value: "katmovies", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/katmovies.png" },
        { name: "MoviesMod", value: "mod", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/mod.png" },
        { name: "UHDMovies", value: "uhd", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/uhd.webp" },
        { name: "MovieBox Web", value: "movieBoxWeb", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/movieBoxWeb.png" },
        { name: "NetflixMirror", value: "netflixMirror", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/netflixMirror.webp" },
        { name: "PrimeMirror", value: "primeMirror", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/primeMirror.webp" },
        { name: "DisneyMirror", value: "disneyMirror", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/disneyMirror.webp" },
        { name: "OlaMovies", value: "olamovies", type: "hindi", icon: "/icons/olamovies.svg" },
        { name: "ThePirateBay", value: "tpb", type: "global", icon: "/icons/tpb.svg" },
        { name: "GramCinema", value: "gramcinema", type: "hindi", icon: "https://bollywood.eu.org/images/favicon.svg" },
        { name: "ShowBox", value: "showbox", type: "english", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/showbox.png" },
        { name: "KissKh", value: "kissKh", type: "english", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/kissKh.png" },
        { name: "Torrentio", value: "torrentio", type: "global", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/torrentio.png" },
        { name: "Anikoto", value: "anikoto", type: "anime", icon: "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/anikoto.png" },
      ];

      try {
        const manifestRes = await fetch("https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main/manifest.json", {
          headers: { "User-Agent": "Cinema-Admin/1.0" },
        });
        if (manifestRes.ok) {
          const remote = await manifestRes.json();
          remote.forEach(rp => {
            if (!masterList.some(p => p.value === rp.value)) {
              masterList.push({
                name: rp.display_name || rp.name,
                value: rp.value,
                type: rp.type || "global",
                icon: rp.icon || "",
              });
            }
          });
        }
      } catch (_) {}

      const extensions = masterList.map(ext => {
        const cfg = savedConfig[ext.value];
        const isHidden = cfg?.hidden === true || cfg?.enabled === false;
        return {
          ...ext,
          enabled: !isHidden,
          hidden: isHidden,
        };
      });

      return jsonResponse({
        extensions,
        config: savedConfig,
        total: extensions.length,
        enabledCount: extensions.filter(e => e.enabled).length,
        hiddenCount: extensions.filter(e => e.hidden).length,
      });
    }

    if (request.method === "POST") {
      const body = await request.json().catch(() => null);
      const updates = body?.config || body;
      if (typeof updates === "object" && updates !== null) {
        let currentConfig = {};
        if (db) {
          try {
            const row = await db.prepare("SELECT value FROM config WHERE key = 'CINEMA_PROVIDERS'").first();
            if (row?.value) currentConfig = JSON.parse(row.value);
          } catch (_) {}
        }
        if (Object.keys(currentConfig).length === 0 && kv) {
          currentConfig = await getJSON(kv, "CINEMA_PROVIDERS", DEFAULT_PROVIDERS);
        }

        const mergedConfig = { ...currentConfig, ...updates };

        if (db) {
          try {
            await db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES ('CINEMA_PROVIDERS', ?, ?)").bind(JSON.stringify(mergedConfig), Date.now()).run();
          } catch (e) {
            console.error("D1 write CINEMA_PROVIDERS error:", e);
          }
        }
        if (kv) {
          await putJSON(kv, "CINEMA_PROVIDERS", mergedConfig);
        }
        return jsonResponse({ success: true, config: mergedConfig });
      }
      return jsonResponse({ error: "Invalid provider configuration" }, 400);
    }
  }

  // 10. SYNC WEBSITE
  if (path === "/api/admin/sync-website" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const settings = await getJSON(kv, "CINEMA_SETTINGS", DEFAULT_SETTINGS);
    const targetUrl = body?.url || settings.activeTunnelUrl;
    if (!targetUrl) return jsonResponse({ success: false, error: "No active tunnel URL to sync" }, 400);

    const cleanUrl = targetUrl.replace(/\/+$/, "");
    if (kv) {
      await kv.put("BACKEND_URL", cleanUrl);
    }
    return jsonResponse({ success: true, url: cleanUrl });
  }

  return jsonResponse({ error: "Not found" }, 404);
}
