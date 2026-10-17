#!/bin/bash
set -e

PORT="${PORT:-7860}"
echo "=================================================="
echo "🎬 Starting Cinema 24/7 Cloud Engine on Port $PORT"
echo "=================================================="

# 1. Setup Cloudflare WARP / Edge Egress if enabled
if [ "$ENABLE_WARP" = "true" ]; then
    echo "🛡️ Initializing Cloudflare WARP edge egress to bypass datacenter IP restrictions..."
    if command -v warp-svc >/dev/null 2>&1; then
        warp-svc &
        sleep 2
        warp-cli --accept-tos registration new || true
        warp-cli --accept-tos mode proxy || true
        warp-cli --accept-tos proxy port 40000 || true
        warp-cli --accept-tos connect || true
        export ALL_PROXY="socks5://127.0.0.1:40000"
        echo "✅ Cloudflare WARP connected! Outgoing traffic routed through Cloudflare Anycast edge."
    fi
fi

# 2. Check public URL / Hugging Face Space host
if [ -n "$SPACE_HOST" ]; then
    export PUBLIC_URL="https://${SPACE_HOST}"
    echo "🌐 Hugging Face Space detected: $PUBLIC_URL"
elif [ -n "$RENDER_EXTERNAL_URL" ]; then
    export PUBLIC_URL="$RENDER_EXTERNAL_URL"
    echo "🌐 Render external URL detected: $PUBLIC_URL"
elif [ -n "$KOYEB_PUBLIC_DOMAIN" ]; then
    export PUBLIC_URL="https://${KOYEB_PUBLIC_DOMAIN}"
    echo "🌐 Koyeb domain detected: $PUBLIC_URL"
fi

# 3. Start Node.js Cinema Server
exec node server/index.cjs
