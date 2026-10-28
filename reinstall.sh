#!/bin/bash
# Honeypot Global - Clean Service Reinstaller (Keeps /var/backups/lms & /var/lib/lms Safe)
# Run: sudo bash reinstall.sh

if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo:"
    echo "   sudo bash reinstall.sh"
    exit 1
fi

if ! pwd >/dev/null 2>&1; then
    cd /tmp || cd /
fi

if ! getent hosts github.com >/dev/null 2>&1; then
    printf "nameserver 8.8.8.8\nnameserver 1.1.1.1\n" >> /etc/resolv.conf
fi

echo "🧹 Removing old LMS service files across the server (keeping /var/backups/lms safe)..."
for SVC in lms-website lms-api; do
    systemctl stop "$SVC" 2>/dev/null || true
    systemctl disable "$SVC" 2>/dev/null || true
done
pkill -f "/var/www/html/lms/api.py" 2>/dev/null || true
pkill -f "/usr/local/bin/lms-api.py" 2>/dev/null || true

find /etc/systemd/system /usr/lib/systemd/system /lib/systemd/system /run/systemd/system \
    \( -name "lms-api*" -o -name "lms-website*" \) -exec rm -rf {} + 2>/dev/null || true
rm -f /usr/local/bin/lms-api.py 2>/dev/null || true
systemctl daemon-reload
systemctl reset-failed 2>/dev/null || true

echo "📥 Pulling latest LMS code from GitHub..."
TMP_REPO="/tmp/lms_reinstall_$$"
rm -rf "$TMP_REPO"
(cd /tmp && git clone https://github.com/dadad132/LMS "$TMP_REPO")

if [ -f "$TMP_REPO/install.sh" ]; then
    cd "$TMP_REPO"
    bash "$TMP_REPO/install.sh"
    rm -rf "$TMP_REPO"
elif [ -f "./install.sh" ]; then
    bash "./install.sh"
else
    echo "❌ Failed to pull repository from GitHub."
    exit 1
fi
