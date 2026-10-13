#!/bin/bash
# Fix SUID sandbox permissions for Ubuntu 24.04 and Debian unprivileged users
if [ -f "/opt/Cinema/chrome-sandbox" ]; then
    chmod 4755 "/opt/Cinema/chrome-sandbox" 2>/dev/null || true
fi

# Ensure launcher wrapper passes --no-sandbox and sets ELECTRON_DISABLE_SANDBOX
if [ -d "/opt/Cinema" ]; then
    cat << 'EOF' > /opt/Cinema/cinema-desktop-launcher
#!/bin/bash
export ELECTRON_DISABLE_SANDBOX=1
exec "/opt/Cinema/cinema-desktop" --no-sandbox "$@"
EOF
    chmod +x /opt/Cinema/cinema-desktop-launcher 2>/dev/null || true
    ln -sf /opt/Cinema/cinema-desktop-launcher /usr/bin/cinema-desktop 2>/dev/null || true
fi

if hash update-desktop-database 2>/dev/null; then
    update-desktop-database /usr/share/applications 2>/dev/null || true
fi
