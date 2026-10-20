/**
 * Cloudflare Pages Function: /api/playlist.m3u
 * Serves dynamic .m3u playlist with inline headers for direct VLC / external player handoff.
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  const title = url.searchParams.get('title') || 'Cinema Stream';

  if (!targetUrl) {
    return new Response('Missing ?url= parameter', { status: 400 });
  }

  const origin = url.origin;
  let host = '';
  try {
    host = new URL(targetUrl).hostname.toLowerCase();
  } catch (_) {}

  const isDirectCors =
    host.includes('pixeldrain.dev') ||
    host.includes('pixeldrain.com') ||
    host.includes('gofile.io') ||
    host.includes('r2.dev');

  let referer = '';
  if (host.includes('hakunaymatata.com') || host.includes('moviebox') || host.includes('inmoviebox.com') || host.includes('aoneroom.com') || host.includes('sssrr.org')) {
    referer = 'https://officialmoviebox.com/';
  } else if (host.includes('zenoak.top') || host.includes('paleoak.top') || host.includes('vidbolt')) {
    referer = 'https://vidbolt.net/';
  } else if (host.includes('cursed.st') || host.includes('cno.to')) {
    referer = 'https://cno.to/';
  } else if (host.includes('multimovies')) {
    referer = 'https://multimovies.courses/';
  } else if (host.includes('mxplayer') || host.includes('d3sgzbosmwirao.cloudfront.net') || (host.includes('cloudfront.net') && targetUrl.includes('/secim/'))) {
    referer = 'https://www.mxplayer.in/';
  }

  const cleanTitle = title.replace(/[\r\n]/g, ' ').trim() || 'stream';

  let m3u = '#EXTM3U\n';
  m3u += `#EXTINF:-1,${cleanTitle}\n`;
  if (referer) {
    m3u += `#EXTVLCOPT:http-referrer=${referer}\n`;
  }
  m3u += '#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\n';

  let streamTarget = targetUrl;
  if (!isDirectCors && !targetUrl.includes('/api/proxy')) {
    streamTarget = `${origin}/api/proxy?url=${encodeURIComponent(targetUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`;
  }
  m3u += `${streamTarget}\n`;

  const safeName = cleanTitle.replace(/[^a-zA-Z0-9_-]/g, '_');

  return new Response(m3u, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-mpegurl; charset=utf-8',
      'Content-Disposition': `inline; filename="${safeName}.m3u"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Cache-Control': 'no-cache',
    },
  });
}
