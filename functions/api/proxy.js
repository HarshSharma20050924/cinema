/**
 * Cloudflare Pages Function: /api/proxy
 * Runs on Cloudflare Edge — proxies video/audio streams with correct CORS + Referer headers.
 * Keeps heavy video traffic off phone tunnel for general providers, but routes Moviebox
 * through the residential phone tunnel because Moviebox CDN blocks datacenter IPs with 427.
 */
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (!targetUrl) {
    return new Response('Missing ?url= parameter', { status: 400 });
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

  // Hosts that natively support CORS and strictly block Cloudflare/datacenter IPs:
  if (host.includes('pixeldrain.dev') || host.includes('pixeldrain.com') || host.includes('gofile.io')) {
    return Response.redirect(targetUrl, 302);
  }

  let refererHeader = origin + '/';
  let originHeader = origin;

  const customReferer = url.searchParams.get('referer');
  if (customReferer) {
    refererHeader = customReferer;
    try {
      originHeader = new URL(customReferer).origin;
    } catch (_) {}
  } else if (host.includes('hakunaymatata.com') || host.includes('inmoviebox.com') || host.includes('moviebox')) {
    refererHeader = 'https://officialmoviebox.com/';
    originHeader = 'https://officialmoviebox.com';
  } else if (host.includes('zenoak.top') || host.includes('paleoak.top') || host.includes('vidbolt')) {
    refererHeader = 'https://vidbolt.net/';
    originHeader = 'https://vidbolt.net';
  } else if (host.includes('cursed.st') || host.includes('cno.to')) {
    refererHeader = 'https://cno.to/';
    originHeader = 'https://cno.to';
  } else if (host.includes('multimovies')) {
    refererHeader = 'https://multimovies.courses/';
    originHeader = 'https://multimovies.courses';
  } else if (host.includes('mxplayer') || host.includes('d3sgzbosmwirao.cloudfront.net')) {
    refererHeader = 'https://www.mxplayer.in/';
    originHeader = 'https://www.mxplayer.in';
  }

  const isMovieBox = host.includes('hakunaymatata.com') || host.includes('inmoviebox.com') || host.includes('moviebox');

  const forwardHeaders = {
    'Referer': refererHeader,
    'Origin': originHeader,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };
  if (request.headers.get('Range')) {
    forwardHeaders['Range'] = request.headers.get('Range');
  }

  // Helper to fetch via residential phone backend tunnel cluster
  async function fetchViaTunnel() {
    try {
      const candidates = [];

      // 1. D1 Database query (Primary source of truth)
      if (env?.cinema_db) {
        try {
          const poolRow = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'BACKEND_POOL'").first();
          if (poolRow?.value) {
            const pool = JSON.parse(poolRow.value);
            if (Array.isArray(pool)) {
              const sorted = [...pool].sort((a, b) => {
                if (a?.deviceId === 'server_local_dev') return -1;
                if (b?.deviceId === 'server_local_dev') return 1;
                if (a?.isPrimary && !b?.isPrimary) return -1;
                if (!a?.isPrimary && b?.isPrimary) return 1;
                return (b?.lastSeen || 0) - (a?.lastSeen || 0);
              });
              for (const p of sorted) {
                const u = typeof p === 'string' ? p : p?.url;
                if (u && !candidates.includes(u)) candidates.push(u);
              }
            }
          }
          const urlRow = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'BACKEND_URL'").first();
          if (urlRow?.value && !candidates.includes(urlRow.value)) {
            candidates.push(urlRow.value);
          }
        } catch (_) {}
      }

      // 2. KV Fallback
      if (candidates.length === 0 && env?.CINEMA_KV) {
        try {
          const rawPool = await env.CINEMA_KV.get('BACKEND_POOL');
          if (rawPool) {
            const pool = JSON.parse(rawPool);
            if (Array.isArray(pool)) {
              for (const p of pool) {
                const u = typeof p === 'string' ? p : p?.url;
                if (u && !candidates.includes(u)) candidates.push(u);
              }
            }
          }
          const backendUrl = await env.CINEMA_KV.get('BACKEND_URL').catch?.(() => null);
          if (backendUrl && !candidates.includes(backendUrl)) candidates.push(backendUrl);
        } catch (_) {}
      }

      let lastDebug = '';
      for (const nodeUrl of candidates) {
        try {
          const cleanNode = nodeUrl.replace(/\/+$/, '');
          const tunnelUrl = `${cleanNode}/api/proxy?url=${encodeURIComponent(targetUrl)}&referer=${encodeURIComponent(refererHeader)}`;
          const controller = new AbortController();
          const timerId = setTimeout(() => controller.abort(), 6000);
          const tunnelResp = await fetch(tunnelUrl, {
            method: request.method,
            headers: forwardHeaders,
            signal: controller.signal,
          });
          clearTimeout(timerId);
          lastDebug += `[${cleanNode}: ${tunnelResp.status}] `;
          if (tunnelResp.ok || tunnelResp.status === 206) {
            const respHeaders = new Headers();
            for (const key of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges', 'Last-Modified', 'ETag']) {
              const val = tunnelResp.headers.get(key);
              if (val) respHeaders.set(key, val);
            }
            respHeaders.set('Access-Control-Allow-Origin', '*');
            respHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            respHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
            const respBody = request.method === 'HEAD' ? null : tunnelResp.body;
            return new Response(respBody, {
              status: tunnelResp.status,
              headers: respHeaders,
            });
          }
        } catch (e) {
          lastDebug += `[${nodeUrl}: err ${e.message}] `;
        }
      }
      if (lastDebug) {
        return new Response(JSON.stringify({ error: 'Tunnel candidates failed', candidates, debug: lastDebug }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    } catch (_) {}
    return null;
  }

  // MovieBox CDN blocks datacenter/Cloudflare IPs with 427, fetch via tunnel directly
  if (isMovieBox) {
    const tunnelResult = await fetchViaTunnel();
    if (tunnelResult) return tunnelResult;
  }

  // 1. Try direct fetch first with authentic headers (handles non-blocked CDNs)
  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
    });

    if (upstream.ok || upstream.status === 206) {
      const responseHeaders = new Headers();
      for (const key of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges', 'Last-Modified', 'ETag']) {
        const val = upstream.headers.get(key);
        if (val) responseHeaders.set(key, val);
      }
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      responseHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

      const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
      const isM3u8 = contentType.includes('mpegurl') || targetUrl.includes('.m3u8');

      if (isM3u8 && request.method !== 'HEAD') {
        try {
          let m3u8Text = await upstream.text();
          const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
          const targetOrigin = new URL(targetUrl).origin;
          const currentOrigin = url.origin;

          // Rewrite non-comment lines (URIs) to route through /api/proxy
          m3u8Text = m3u8Text.replace(/^(?!#)(\S+)/gm, (match) => {
            let resolved = match;
            if (match.startsWith('/')) {
              resolved = targetOrigin + match;
            } else if (!match.startsWith('http://') && !match.startsWith('https://')) {
              resolved = baseUrl + match;
            }
            return `${currentOrigin}/api/proxy?url=${encodeURIComponent(resolved)}&referer=${encodeURIComponent(refererHeader)}`;
          });

          // Also rewrite URI="..." inside tag lines (e.g. #EXT-X-KEY, #EXT-X-MEDIA)
          m3u8Text = m3u8Text.replace(/URI="([^"]+)"/g, (match, p1) => {
            let resolved = p1;
            if (p1.startsWith('/')) {
              resolved = targetOrigin + p1;
            } else if (!p1.startsWith('http://') && !p1.startsWith('https://')) {
              resolved = baseUrl + p1;
            }
            return `URI="${currentOrigin}/api/proxy?url=${encodeURIComponent(resolved)}&referer=${encodeURIComponent(refererHeader)}"`;
          });

          responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
          responseHeaders.delete('Content-Length');
          return new Response(m3u8Text, {
            status: 200,
            headers: responseHeaders,
          });
        } catch (_) {}
      }

      return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    // If datacenter block (427, 403), fall back to residential phone tunnel
    if (upstream.status === 427 || upstream.status === 403 || upstream.status === 401 || upstream.status === 429) {
      const tunnelResult = await fetchViaTunnel();
      if (tunnelResult) return tunnelResult;
    }

    // Return upstream error response with CORS rather than 302 redirect which causes VLC location error
    const errHeaders = new Headers();
    errHeaders.set('Access-Control-Allow-Origin', '*');
    return new Response(upstream.body, {
      status: upstream.status,
      headers: errHeaders,
    });
  } catch (err) {
    const tunnelResult = await fetchViaTunnel();
    if (tunnelResult) return tunnelResult;
    return new Response(JSON.stringify({ error: 'Proxy fetch failed', message: err.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
