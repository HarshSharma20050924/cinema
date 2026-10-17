export async function onRequest(context) {
  const { request } = context;
  const reqUrl = new URL(request.url);
  const streamUrl = reqUrl.searchParams.get('url') || '';
  const title = reqUrl.searchParams.get('title') || 'Cinema Stream';

  const cleanStreamUrl = streamUrl ? decodeURIComponent(streamUrl) : '';
  const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const isMovieBox =
    cleanStreamUrl.includes('hakunaymatata.com') ||
    cleanStreamUrl.includes('moviebox') ||
    cleanStreamUrl.includes('inmoviebox') ||
    cleanStreamUrl.includes('aoneroom') ||
    cleanStreamUrl.includes('sssrr.org');

  const playableStreamUrl = isMovieBox && !cleanStreamUrl.includes('/api/proxy')
    ? `${reqUrl.origin}/api/proxy?url=${encodeURIComponent(cleanStreamUrl)}`
    : cleanStreamUrl;

  const vlcProtocol = 'vlc://' + playableStreamUrl;
  const androidIntent = `intent:${playableStreamUrl}#Intent;action=android.intent.action.VIEW;type=video/*;package=org.videolan.vlc;end`;
  const universalVideoIntent = `intent:${playableStreamUrl}#Intent;action=android.intent.action.VIEW;type=video/*;end`;

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
      background: #161b22;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      max-width: 480px;
      width: 100%;
      padding: 32px 24px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
    }
    .icon { font-size: 36px; margin-bottom: 12px; display: block; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #fff; }
    .title-display { font-size: 14px; color: #94a3b8; margin-bottom: 20px; word-break: break-word; }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      background: rgba(230, 57, 70, 0.15);
      color: #ff6b6b;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 24px;
      border: 1px solid rgba(230, 57, 70, 0.25);
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 14px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: none;
      margin-bottom: 12px;
      transition: all 0.2s ease;
    }
    .btn-primary { background: #e63946; color: #fff; }
    .btn-primary:hover { background: #d62839; }
    .btn-secondary { background: #21262d; color: #c9d1d9; border: 1px solid #30363d; }
    .btn-secondary:hover { background: #30363d; color: #fff; }
    .copy-box {
      margin-top: 16px;
      padding: 12px;
      background: #0d1117;
      border-radius: 8px;
      font-size: 11px;
      color: #8b949e;
      word-break: break-all;
      border: 1px dashed #30363d;
      cursor: pointer;
    }
    .copy-box:hover { border-color: #58a6ff; color: #c9d1d9; }
    .footer { margin-top: 24px; font-size: 12px; color: #64748b; }
    .footer a { color: #e63946; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <span class="icon">🎬</span>
    <h1>Launching VLC Media Player</h1>
    <p class="title-display">${safeTitle}</p>
    <div class="status-badge" id="statusBadge">Handing off to VLC Player...</div>

    <button class="btn btn-primary" id="vlcBtn">
      <span>▶️</span> Launch VLC Media Player
    </button>

    <button class="btn btn-secondary" id="androidVlcBtn" style="display: none;">
      <span>📱</span> Open in VLC App (Android)
    </button>

    <button class="btn btn-secondary" id="anyPlayerBtn" style="display: none;">
      <span>📱</span> Open in Any Video Player (MX / MPV)
    </button>

    <a class="btn btn-secondary" href="https://t.me/cinemaisherebtw_bot" target="_blank">
      <span>🤖</span> Download File on Telegram Bot
    </a>

    <p style="font-size: 12px; color: #94a3b8; margin: 12px 0 4px;">
      💡 Want to download? Open <b>@cinemaisherebtw_bot</b> on Telegram for direct high-speed download mirrors.
    </p>

    <div class="copy-box" id="copyBox" title="Click to copy stream URL">
      <span id="urlPreview">${cleanStreamUrl}</span>
      <div id="copyToast" style="display: none; color: #3fb950; font-weight: 600; margin-top: 4px;">Copied to clipboard!</div>
    </div>

    <div class="footer">
      Powered by <a href="/">Cinema</a> • 100% Ad-Free Native Streaming
    </div>
  </div>

  <script>
    const streamUrl = ${JSON.stringify(cleanStreamUrl)};
    const vlcProtocol = ${JSON.stringify(vlcProtocol)};
    const androidIntent = ${JSON.stringify(androidIntent)};
    const universalIntent = ${JSON.stringify(universalVideoIntent)};
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      document.getElementById('androidVlcBtn').style.display = 'flex';
      document.getElementById('anyPlayerBtn').style.display = 'flex';
      document.getElementById('androidVlcBtn').onclick = () => window.location.href = androidIntent;
      document.getElementById('anyPlayerBtn').onclick = () => window.location.href = universalIntent;
    }

    function triggerLaunch() {
      if (!streamUrl) return;
      if (isAndroid) {
        window.location.href = androidIntent;
      } else {
        window.location.href = vlcProtocol;
      }
    }

    document.getElementById('vlcBtn').onclick = triggerLaunch;

    // Auto trigger once page loads
    setTimeout(triggerLaunch, 300);

    // Copy to clipboard
    const copyBox = document.getElementById('copyBox');
    const copyToast = document.getElementById('copyToast');
    copyBox.onclick = function () {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(streamUrl).then(showToast);
      } else {
        const ta = document.createElement('textarea');
        ta.value = streamUrl;
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
    }
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
