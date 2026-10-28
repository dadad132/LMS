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
for SVC in lms lms-website lms-api; do
    systemctl stop "$SVC" 2>/dev/null || true
    systemctl disable "$SVC" 2>/dev/null || true
done
pkill -f "/var/www/html/lms/api.py" 2>/dev/null || true
pkill -f "/usr/local/bin/lms-api.py" 2>/dev/null || true
pkill -f "/opt/LMS/api.py" 2>/dev/null || true

find /etc/systemd/system /usr/lib/systemd/system /lib/systemd/system /run/systemd/system \
    \( -name "lms.service*" -o -name "lms-api*" -o -name "lms-website*" \) -exec rm -rf {} + 2>/dev/null || true
rm -f /usr/local/bin/lms-api.py 2>/dev/null || true
systemctl daemon-reload
systemctl reset-failed 2>/dev/null || true

echo "🧹 Freeing any /tmp RAM usage from previous runs..."
rm -rf /tmp/lms_bkp_check_* /tmp/lms_clone_* /tmp/lms_reinstall_* /tmp/lms_diag_* 2>/dev/null || true

if [ -d "./.git" ]; then
    echo "📥 Updating repository in place from GitHub..."
    git fetch origin main 2>/dev/null && git reset --hard origin/main 2>/dev/null || git pull origin main 2>/dev/null || true
    bash "./install.sh"
elif [ -d "/opt/LMS/.git" ]; then
    echo "📥 Updating /opt/LMS in place from GitHub..."
    cd /opt/LMS
    git fetch origin main 2>/dev/null && git reset --hard origin/main 2>/dev/null || git pull origin main 2>/dev/null || true
    bash "/opt/LMS/install.sh"
elif [ -f "./install.sh" ]; then
    bash "./install.sh"
else
    mkdir -p /opt/LMS
    git clone https://github.com/dadad132/LMS /opt/LMS
    cd /opt/LMS
    bash "/opt/LMS/install.sh"
fi
