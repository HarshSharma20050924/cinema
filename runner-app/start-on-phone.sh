#!/bin/bash
# ========================================================
# 📱 Cinema Automated Mobile Server Launcher for Android
# ========================================================

echo "=========================================="
echo "⚡ Starting Cinema Mobile Runner Engine..."
echo "=========================================="

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/.."

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    pkg update -y && pkg install -y nodejs-lts
fi

# 2. Check cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "🌐 Installing cloudflared tunnel..."
    pkg install -y cloudflared || echo "Fallback tunnel will be used."
fi

# 3. Launch Runner Daemon
echo "🚀 Launching Runner Daemon..."
node runner-app/runner.cjs &
RUNNER_PID=$!

sleep 2

echo ""
echo "=========================================="
echo "✅ Cinema Runner is LIVE on your Phone!"
echo "👉 Open App in Browser: http://localhost:4001"
echo "=========================================="

# Auto-open on Android if 'termux-open-url' or 'xdg-open' exists
if command -v termux-open-url &> /dev/null; then
    termux-open-url http://localhost:4001
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:4001
fi

wait $RUNNER_PID
