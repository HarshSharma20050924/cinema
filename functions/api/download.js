import { getBalancedRenderCluster } from "./_cluster.js";

/**
 * Cloudflare Pages Function: /api/download
 * Proxies file downloads with proper disposition and headers.
 * Bypasses datacenter 427 blocks (such as Moviebox) by routing through residential phone cluster.
 * Prevents HTML landing pages from being saved as fake video files.
 */
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  const filename = url.searchParams.get('filename') || 'video';

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      },
    });
  }

  if (!targetUrl) {
    return new Response('Missing ?url= parameter', { status: 400 });
  }

  // Never stream raw HTML landing/protector pages as video files
  if (
    /links\.(kmhd|kmphotos)\.[a-z]+/i.test(targetUrl) ||
    /\/locked\?redirect=/i.test(targetUrl) ||
    /katdrive\.click\/file/i.test(targetUrl) ||
    /goflix\.sbs\/en\/mirror/i.test(targetUrl) ||
    /send\.cm\//i.test(targetUrl) ||
    /1fichier\.com\//i.test(targetUrl) ||
    /links\.ol-am\.top/i.test(targetUrl) ||
    /links\.olamovies/i.test(targetUrl) ||
    /ol-am\.top/i.test(targetUrl)
  ) {
    return Response.redirect(targetUrl, 302);
  }

  let origin = '';
  let host = '';
  try {
    const parsed = new URL(targetUrl);
    origin = parsed.origin;
    host = parsed.hostname.toLowerCase();
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }

  let refererHeader = origin + '/';
  let originHeader = origin;

  if (host.includes('hakunaymatata.com') || host.includes('inmoviebox.com') || host.includes('moviebox')) {
    refererHeader = 'https://officialmoviebox.com/';
    originHeader = 'https://officialmoviebox.com';
  } else if (
    host.includes('net52.cc') ||
    host.includes('freecdn') ||
    host.includes('netflixmirror') ||
    host.includes('primemirror') ||
    host.includes('disneymirror')
  ) {
    refererHeader = 'https://net52.cc/home';
    originHeader = 'https://net52.cc';
  }

  const isMovieBox = host.includes('hakunaymatata.com') || host.includes('inmoviebox.com') || host.includes('moviebox');

  const forwardHeaders = {
    'Referer': refererHeader,
    'Origin': originHeader,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };

  // Special anti-bot credentials for NetMirror / Prime / Netflix / Disney
  if (
    host.includes('net52.cc') ||
    host.includes('freecdn') ||
    host.includes('netflixmirror') ||
    host.includes('primemirror') ||
    host.includes('disneymirror')
  ) {
    forwardHeaders['User-Agent'] = 'Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.132 Safari/537.36 /OS.Gatu v3.0';
    forwardHeaders['Referer'] = 'https://net52.cc/home';
    forwardHeaders['Origin'] = 'https://net52.cc';
    const ott = host.includes('prime') || targetUrl.includes('t=pv') ? 'pv' : (host.includes('disney') || targetUrl.includes('t=ds') || targetUrl.includes('t=dp') ? 'ds' : 'nf');
    forwardHeaders['Cookie'] = `hd=on; ott=${ott}`;
  }

  // Merge any explicitly passed JSON headers
  const customHeadersParam = url.searchParams.get('headers');
  if (customHeadersParam) {
    try {
      const parsedH = JSON.parse(customHeadersParam);
      if (typeof parsedH === 'object' && parsedH !== null) {
        Object.assign(forwardHeaders, parsedH);
        if (parsedH['Referer']) refererHeader = parsedH['Referer'];
        if (parsedH['Origin']) originHeader = parsedH['Origin'];
      }
    } catch (_) {}
  }

  if (request.headers.get('Range')) {
    forwardHeaders['Range'] = request.headers.get('Range');
  }

  const ext = targetUrl.includes('.mkv') ? '.mkv' : targetUrl.includes('.zip') ? '.zip' : '.mp4';
  const cleanBaseName = filename.replace(/\.(mp4|mkv|zip)$/i, '');
  const safeFilename = `${cleanBaseName}${ext}`;

  // Helper: Retrieve all active mobile/cluster backend URLs (D1 first, then KV)
  async function getActiveBackendCandidates() {
    let backendUrl = null;
    let pool = [];
    if (env?.cinema_db) {
      try {
        const row = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'BACKEND_URL'").first();
        if (row?.value) backendUrl = row.value;
        const poolRow = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'BACKEND_POOL'").first();
        if (poolRow?.value) pool = JSON.parse(poolRow.value);
      } catch (_) {}
    }
    if (!backendUrl && env?.CINEMA_KV) {
      try {
        backendUrl = await env.CINEMA_KV.get('BACKEND_URL');
      } catch (_) {}
    }
    if ((!pool || pool.length === 0) && env?.CINEMA_KV) {
      try {
        const rawPool = await env.CINEMA_KV.get('BACKEND_POOL');
        if (rawPool) pool = JSON.parse(rawPool);
      } catch (_) {}
    }

    const candidates = [];
    if (Array.isArray(pool)) {
      const sorted = [...pool].sort((a, b) => {
        if (a?.deviceId === 'server_local_dev') return -1;
        if (b?.deviceId === 'server_local_dev') return 1;
        if (a?.isPrimary && !b?.isPrimary) return -1;
        if (!a?.isPrimary && b?.isPrimary) return 1;
        return (b?.lastSeen || 0) - (a?.lastSeen || 0);
      });
      for (const item of sorted) {
        const u = typeof item === 'string' ? item : item?.url;
        if (u && /^https?:\/\//i.test(u)) {
          const clean = u.replace(/\/+$/, '');
          if (!candidates.includes(clean)) candidates.push(clean);
        }
      }
    }
    if (backendUrl && /^https?:\/\//i.test(backendUrl)) {
      const clean = backendUrl.replace(/\/+$/, '');
      if (!candidates.includes(clean)) candidates.push(clean);
    }

    // Add balanced 5-node Render cluster fallbacks
    const renderNodes = getBalancedRenderCluster();
    for (const node of renderNodes) {
      if (!candidates.includes(node)) candidates.push(node);
    }

    return candidates;
  }

  // Helper to stream file via residential phone/cluster backend tunnel
  async function fetchDownloadViaTunnel() {
    const candidates = await getActiveBackendCandidates();
    if (candidates.length === 0) return null;

    for (const backendUrl of candidates) {
      try {
        const tunnelDownloadUrl = `${backendUrl}/api/download?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(safeFilename)}&referer=${encodeURIComponent(refererHeader)}&origin=${encodeURIComponent(originHeader)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const reqMethod = request.method === 'HEAD' ? 'HEAD' : 'GET';
        const tunnelResp = await fetch(tunnelDownloadUrl, {
          method: reqMethod,
          headers: forwardHeaders,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (tunnelResp.ok || tunnelResp.status === 206) {
          const contentType = (tunnelResp.headers.get('Content-Type') || '').toLowerCase();
          if (contentType.includes('text/html')) continue;

          const responseHeaders = new Headers();
          for (const key of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) {
            const val = tunnelResp.headers.get(key);
            if (val) responseHeaders.set(key, val);
          }
          if (!responseHeaders.has('Content-Type')) {
            responseHeaders.set('Content-Type', ext === '.mkv' ? 'video/x-matroska' : 'video/mp4');
          }
          responseHeaders.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
          responseHeaders.set('Access-Control-Allow-Origin', '*');
          return new Response(request.method === 'HEAD' ? null : tunnelResp.body, {
            status: tunnelResp.status,
            headers: responseHeaders,
          });
        }
      } catch (_) {}
    }
    return null;
  }

  // Moviebox Alibaba CDN blocks datacenter IPs with 427, fetch via residential cluster directly
  if (isMovieBox) {
    const tunnelResult = await fetchDownloadViaTunnel();
    if (tunnelResult) return tunnelResult;
  }

  try {
    const reqMethod = request.method === 'HEAD' ? 'HEAD' : 'GET';
    const upstream = await fetch(targetUrl, {
      method: reqMethod,
      headers: forwardHeaders,
    });

    if (!upstream.ok) {
      // Cloudflare edge got blocked (e.g. 427/403/429), try through cluster
      const tunnelResult = await fetchDownloadViaTunnel();
      if (tunnelResult) return tunnelResult;

      return new Response(`Upstream error: ${upstream.status}`, { status: upstream.status });
    }

    const contentType = (upstream.headers.get('Content-Type') || '').toLowerCase();
    // Prevent streaming HTML pages as video downloads
    if (contentType.includes('text/html')) {
      return Response.redirect(targetUrl, 302);
    }

    const responseHeaders = new Headers();
    for (const key of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) {
      const val = upstream.headers.get(key);
      if (val) responseHeaders.set(key, val);
    }
    responseHeaders.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(request.method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const tunnelResult = await fetchDownloadViaTunnel();
    if (tunnelResult) return tunnelResult;
    return new Response('Download proxy error: ' + err.message, { status: 502 });
  }
}
