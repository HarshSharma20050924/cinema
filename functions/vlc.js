export async function onRequest(context) {
  const { request } = context;
  const reqUrl = new URL(request.url);
  const streamUrl = reqUrl.searchParams.get('url') || '';
  const title = reqUrl.searchParams.get('title') || 'Cinema Stream';

  const cleanStreamUrl = streamUrl ? decodeURIComponent(streamUrl) : '';
  const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const isDirectCors =
    cleanStreamUrl.includes('pixeldrain.dev') ||
    cleanStreamUrl.includes('pixeldrain.com') ||
    cleanStreamUrl.includes('gofile.io') ||
    cleanStreamUrl.includes('r2.dev');

  let defaultReferer = '';
  if (cleanStreamUrl.includes('hakunaymatata.com') || cleanStreamUrl.includes('moviebox') || cleanStreamUrl.includes('inmoviebox') || cleanStreamUrl.includes('aoneroom') || cleanStreamUrl.includes('sssrr.org')) {
    defaultReferer = 'https://officialmoviebox.com/';
  } else if (cleanStreamUrl.includes('zenoak.top') || cleanStreamUrl.includes('paleoak.top') || cleanStreamUrl.includes('vidbolt')) {
    defaultReferer = 'https://vidbolt.net/';
  } else if (cleanStreamUrl.includes('cursed.st') || cleanStreamUrl.includes('cno.to')) {
    defaultReferer = 'https://cno.to/';
  } else if (cleanStreamUrl.includes('multimovies')) {
    defaultReferer = 'https://multimovies.courses/';
  } else if (cleanStreamUrl.includes('mxplayer') || cleanStreamUrl.includes('cloudfront.net/secim/')) {
    defaultReferer = 'https://www.mxplayer.in/';
  }

  const playableStreamUrl = !isDirectCors && !cleanStreamUrl.includes('/api/proxy')
    ? `${reqUrl.origin}/api/proxy?url=${encodeURIComponent(cleanStreamUrl)}${defaultReferer ? `&referer=${encodeURIComponent(defaultReferer)}` : ''}`
    : cleanStreamUrl;

  const playlistUrl = `${reqUrl.origin}/api/playlist.m3u?url=${encodeURIComponent(cleanStreamUrl)}&title=${encodeURIComponent(safeTitle)}`;
  const vlcProtocol = 'vlc://' + playlistUrl;
  const androidIntent = `intent:${playableStreamUrl}#Intent;action=android.intent.action.VIEW;type=video/*;package=org.videolan.vlc;end`;
  const universalVideoIntent = `intent:${playableStreamUrl}#Intent;action=android.intent.action.VIEW;type=video/*;end`;
  const webPlayerUrl = `/?play=${encodeURIComponent(cleanStreamUrl)}&title=${encodeURIComponent(safeTitle)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cinema - Open in VLC Player</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background-color: #0b0c10;
      color: #e0e6ed;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
      text-align: center;
    }
    .card {
      background: #14171e;
      border: 1px solid rgba(229, 9, 20, 0.25);
      border-radius: 16px;
      max-width: 480px;
      width: 100%;
      padding: 32px 24px;
      box-shadow: 0 16px 50px rgba(0, 0, 0, 0.8), 0 0 40px rgba(229, 9, 20, 0.1);
    }
    .icon { font-size: 38px; margin-bottom: 12px; display: block; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #fff; }
    .title-display { font-size: 14px; color: #94a3b8; margin-bottom: 16px; word-break: break-word; font-weight: 600; }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      background: rgba(229, 9, 20, 0.15);
      color: #ff4d5a;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 20px;
      border: 1px solid rgba(229, 9, 20, 0.3);
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 13px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: none;
      margin-bottom: 10px;
      transition: all 0.2s ease;
    }
    .btn-primary { background: #e50914; color: #fff; box-shadow: 0 4px 18px rgba(229, 9, 20, 0.4); }
    .btn-primary:hover { background: #f40612; transform: translateY(-1px); }
    .btn-web { background: rgba(255, 255, 255, 0.1); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2); }
    .btn-web:hover { background: rgba(255, 255, 255, 0.18); }
    .btn-secondary { background: #1c212a; color: #c9d1d9; border: 1px solid #2d333b; }
    .btn-secondary:hover { background: #262c36; color: #fff; }
    .copy-box {
      margin-top: 14px;
      padding: 12px;
      background: #0d1117;
      border-radius: 8px;
      font-size: 11px;
      color: #8b949e;
      word-break: break-all;
      border: 1px dashed rgba(255, 255, 255, 0.15);
      cursor: pointer;
    }
    .copy-box:hover { border-color: #e50914; color: #fff; }
    .footer { margin-top: 20px; font-size: 12px; color: #64748b; }
    .footer a { color: #e50914; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <span class="icon">🎬</span>
    <h1>Launching VLC Media Player</h1>
    <p class="title-display">${safeTitle}</p>
    <div class="status-badge" id="statusBadge">Headers Injected • Zero Buffering</div>

    <button class="btn btn-primary" id="vlcBtn">
      <span>▶️</span> Launch VLC Media Player
    </button>

    <a class="btn btn-web" href="${webPlayerUrl}">
      <span>🌐</span> Play in Web Browser Player
    </a>

    <a class="btn btn-secondary" href="${playlistUrl}" download="${safeTitle}.m3u">
      <span>📥</span> Download .m3u Playlist for VLC
    </a>

    <button class="btn btn-secondary" id="androidVlcBtn" style="display: none;">
      <span>📱</span> Open in VLC Android App
    </button>

    <button class="btn btn-secondary" id="anyPlayerBtn" style="display: none;">
      <span>📱</span> Open in Any Video Player (MX / MPV)
    </button>

    <div class="copy-box" id="copyBox" title="Click to copy stream URL for VLC">
      <span id="urlPreview">${playableStreamUrl}</span>
      <div id="copyToast" style="display: none; color: #4ade80; font-weight: 700; margin-top: 4px;">Copied Playable Stream to clipboard!</div>
    </div>

    <p style="font-size: 11px; color: #94a3b8; margin-top: 14px; line-height: 1.4;">
      💡 <b>Tip:</b> If VLC reports "unable to open MRL", tap <b>Download .m3u Playlist</b> or use <b>Play in Web Browser Player</b> which runs directly in high-speed Cinema player.
    </p>

    <div class="footer">
      Powered by <a href="/">Cinema</a> • 100% Ad-Free Native Streaming
    </div>
  </div>

  <script>
    const vlcProtocol = ${JSON.stringify(vlcProtocol)};
    const androidIntent = ${JSON.stringify(androidIntent)};
    const universalIntent = ${JSON.stringify(universalVideoIntent)};
    const copyTarget = ${JSON.stringify(playableStreamUrl)};
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      document.getElementById('androidVlcBtn').style.display = 'flex';
      document.getElementById('anyPlayerBtn').style.display = 'flex';
      document.getElementById('androidVlcBtn').onclick = () => window.location.href = androidIntent;
      document.getElementById('anyPlayerBtn').onclick = () => window.location.href = universalIntent;
    }

    function triggerLaunch() {
      if (isAndroid) {
        window.location.href = androidIntent;
      } else {
        window.location.href = vlcProtocol;
      }
    }

    document.getElementById('vlcBtn').onclick = triggerLaunch;

    // Auto trigger once page loads
    setTimeout(triggerLaunch, 400);

    // Copy to clipboard
    const copyBox = document.getElementById('copyBox');
    const copyToast = document.getElementById('copyToast');
    copyBox.onclick = function () {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(copyTarget).then(showToast);
      } else {
        const ta = document.createElement('textarea');
        ta.value = copyTarget;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast();
      }
    };
    function showToast() {
      copyToast.style.display = 'block';
      setTimeout(() => { copyToast.style.display = 'none'; }, 2000);
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    }
  });
}
