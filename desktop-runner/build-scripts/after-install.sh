#!/bin/bash
# Fix SUID sandbox permissions for Ubuntu 24.04 and Debian unprivileged users
RUNNER_DIR="/opt/Cinema Node Runner"
if [ -f "$RUNNER_DIR/chrome-sandbox" ]; then
    chmod 4755 "$RUNNER_DIR/chrome-sandbox" 2>/dev/null || true
fi

if [ -d "$RUNNER_DIR" ]; then
    cat << 'EOF' > "$RUNNER_DIR/cinema-runner-launcher"
#!/bin/bash
export ELECTRON_DISABLE_SANDBOX=1
exec "/opt/Cinema Node Runner/cinema-runner" --no-sandbox "$@"
EOF
    chmod +x "$RUNNER_DIR/cinema-runner-launcher" 2>/dev/null || true
    ln -sf "$RUNNER_DIR/cinema-runner-launcher" /usr/bin/cinema-runner 2>/dev/null || true
fi

if hash update-desktop-database 2>/dev/null; then
    update-desktop-database /usr/share/applications 2>/dev/null || true
fi
