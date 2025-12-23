#!/bin/bash
#
# LMS Website Builder - Quick Fix Script
# Automatically repairs common issues
#
# Usage: sudo ./fix_lms.sh
#

set -e

echo "=============================================="
echo "  LMS Website Builder - Quick Fix"
echo "=============================================="
echo ""

LMS_DIR="/opt/lms-website"
DATA_DIR="$LMS_DIR/data"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Please run with sudo: sudo ./fix_lms.sh"
    exit 1
fi

echo "🔧 Applying fixes..."
echo ""

# 1. Fix permissions
echo "1️⃣  Fixing file permissions..."
chown -R lms:lms "$LMS_DIR"
chmod -R 755 "$LMS_DIR"
echo "   ✅ Permissions fixed"

# 2. Ensure data directory exists
echo "2️⃣  Ensuring data directory exists..."
mkdir -p "$DATA_DIR"
chown lms:lms "$DATA_DIR"
chmod 755 "$DATA_DIR"
echo "   ✅ Data directory ready"

# 3. Ensure uploads directory exists
echo "3️⃣  Ensuring upload directories exist..."
mkdir -p "$LMS_DIR/uploads/general"
mkdir -p "$LMS_DIR/uploads/site"
mkdir -p "$LMS_DIR/uploads/Video"
mkdir -p "$LMS_DIR/uploads/Info"
chown -R lms:lms "$LMS_DIR/uploads"
echo "   ✅ Upload directories ready"

# 4. Ensure logs directory exists
echo "4️⃣  Ensuring logs directory exists..."
mkdir -p "$LMS_DIR/logs"
chown lms:lms "$LMS_DIR/logs"
echo "   ✅ Logs directory ready"

# 5. Reload systemd and restart service
echo "5️⃣  Restarting LMS service..."
systemctl daemon-reload
systemctl restart lms-website
sleep 2
echo "   ✅ Service restarted"

# 6. Check service status
echo "6️⃣  Checking service status..."
if systemctl is-active --quiet lms-website; then
    echo "   ✅ LMS service is running"
else
    echo "   ❌ LMS service failed to start"
    echo "   Checking logs..."
    journalctl -u lms-website -n 10 --no-pager
fi

# 7. Test connection
echo "7️⃣  Testing local connection..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "   ✅ LMS is responding (HTTP $HTTP_CODE)"
else
    echo "   ⚠️  LMS returned HTTP $HTTP_CODE"
fi

echo ""
echo "=============================================="
echo "  Quick Fix Complete!"
echo "=============================================="
echo ""
echo "🌐 Access your site at: http://$(hostname -I | awk '{print $1}'):8001"
echo ""
