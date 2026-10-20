#!/data/data/com.termux/files/usr/bin/bash
# ================================================================
# 📱 Cinema JioPhone / Android 24/7 Residential Relay Runner
# ================================================================
# Connects home Wi-Fi to Render Cloud Server via Cloudflare Tunnel
# 100% Free • Auto-reconnects on drop • Prevents CPU sleep
# ================================================================

echo "⚡ Initializing Cinema 24/7 Relay on JioPhone..."

# 1. Acquire WakeLock so phone never sleeps when screen turns off
if command -v termux-wake-lock &> /dev/null; then
    termux-wake-lock
    echo "🔒 [Termux WakeLock] Acquired. Phone CPU will stay awake."
fi

# 2. Check Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    pkg update -y && pkg install -y nodejs-lts
fi

# 3. Check cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "🌐 Installing cloudflared tunnel..."
    pkg install -y cloudflared || pkg install -y tur-repo && pkg install -y cloudflared
fi

# 4. Fetch latest proxy-relay.cjs if not in git repo
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RELAY_FILE="$SCRIPT_DIR/../proxy-relay.cjs"
if [ ! -f "$RELAY_FILE" ]; then
    RELAY_FILE="./proxy-relay.cjs"
    if [ ! -f "$RELAY_FILE" ]; then
        echo "📥 Downloading latest proxy-relay.cjs..."
        curl -sSL "https://raw.githubusercontent.com/HarshSharma20050924/cinema/main/proxy-relay.cjs" -o proxy-relay.cjs
    fi
fi

# 5. Continuous Watchdog Supervisor Loop
echo "🚀 Starting Cinema Relay Supervisor (Auto-restarts if disconnected)..."
while true; do
    node "$RELAY_FILE"
    echo "⚠️ Relay exited. Auto-restarting in 3 seconds..."
    sleep 3
done
