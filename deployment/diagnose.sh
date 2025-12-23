#!/bin/bash
#
# LMS Website Builder - Server Diagnostics Script
# Run this script on the server to diagnose issues
#
# Usage: sudo ./diagnose.sh
#

set -e

echo "=============================================="
echo "  LMS Website Builder - System Diagnostics"
echo "=============================================="
echo ""

LMS_DIR="/opt/lms-website"
DATA_DIR="$LMS_DIR/data"
DB_FILE="$DATA_DIR/lms.db"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Please run with sudo: sudo ./diagnose.sh"
    exit 1
fi

echo "📋 System Information:"
echo "  - Hostname: $(hostname)"
echo "  - OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2)"
echo "  - Date: $(date)"
echo ""

# Check service status
echo "🔧 LMS Service Status:"
if systemctl is-active --quiet lms-website; then
    echo "  ✅ lms-website service is RUNNING"
    systemctl status lms-website --no-pager | head -10
else
    echo "  ❌ lms-website service is NOT RUNNING"
    echo "  Attempting to check logs..."
    journalctl -u lms-website -n 20 --no-pager
fi
echo ""

# Check nginx
echo "🌐 Nginx Status:"
if systemctl is-active --quiet nginx; then
    echo "  ✅ nginx is RUNNING"
else
    echo "  ❌ nginx is NOT RUNNING"
fi
echo ""

# Check if LMS directory exists
echo "📁 Directory Check:"
if [ -d "$LMS_DIR" ]; then
    echo "  ✅ LMS directory exists: $LMS_DIR"
else
    echo "  ❌ LMS directory NOT FOUND: $LMS_DIR"
    exit 1
fi
echo ""

# Check data directory
echo "📂 Data Directory Check:"
if [ -d "$DATA_DIR" ]; then
    echo "  ✅ Data directory exists: $DATA_DIR"
    echo "  Files in data directory:"
    ls -la "$DATA_DIR" 2>/dev/null || echo "  (unable to list)"
else
    echo "  ❌ Data directory NOT FOUND - Creating..."
    mkdir -p "$DATA_DIR"
    chown lms:lms "$DATA_DIR"
    chmod 755 "$DATA_DIR"
    echo "  ✅ Created data directory"
fi
echo ""

# Check database
echo "🗃️  Database Check:"
if [ -f "$DB_FILE" ]; then
    echo "  ✅ Database file exists: $DB_FILE"
    echo "  Size: $(du -h $DB_FILE | cut -f1)"
    echo "  Permissions: $(ls -la $DB_FILE | awk '{print $1, $3, $4}')"
    
    # Check database tables
    echo ""
    echo "  Tables in database:"
    sudo -u lms $LMS_DIR/venv/bin/python3 -c "
import sqlite3
import os
os.chdir('$LMS_DIR')
conn = sqlite3.connect('$DB_FILE')
cursor = conn.cursor()
cursor.execute(\"SELECT name FROM sqlite_master WHERE type='table'\")
tables = [t[0] for t in cursor.fetchall()]
print('    ' + ', '.join(tables) if tables else '    (no tables found)')
conn.close()
" 2>/dev/null || echo "    (unable to query database)"
    
    # Check users
    echo ""
    echo "  Users in database:"
    sudo -u lms $LMS_DIR/venv/bin/python3 -c "
import sqlite3
import os
os.chdir('$LMS_DIR')
conn = sqlite3.connect('$DB_FILE')
cursor = conn.cursor()
try:
    cursor.execute('SELECT id, username, email, role FROM users')
    users = cursor.fetchall()
    if users:
        for u in users:
            print(f'    ID: {u[0]}, Username: {u[1]}, Email: {u[2]}, Role: {u[3]}')
    else:
        print('    (no users found)')
except Exception as e:
    print(f'    Error: {e}')
conn.close()
" 2>/dev/null || echo "    (unable to query users)"
    
else
    echo "  ❌ Database file NOT FOUND: $DB_FILE"
    echo "  The database will be created on first run."
fi
echo ""

# Check file permissions
echo "🔐 Permissions Check:"
echo "  LMS directory owner: $(ls -la /opt | grep lms-website | awk '{print $3, $4}')"
echo "  Virtual env:"
if [ -d "$LMS_DIR/venv" ]; then
    echo "    ✅ venv exists"
else
    echo "    ❌ venv NOT FOUND"
fi
echo ""

# Check if port 8001 is listening
echo "🔌 Port Check:"
if ss -tlnp | grep -q ":8001"; then
    echo "  ✅ Port 8001 is LISTENING"
    ss -tlnp | grep ":8001"
else
    echo "  ❌ Port 8001 is NOT LISTENING"
fi
echo ""

# Test local connection
echo "🌍 Connection Test:"
echo "  Testing http://127.0.0.1:8001..."
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001 2>/dev/null | grep -q "200\|301\|302"; then
    echo "  ✅ Local connection successful"
else
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001 2>/dev/null)
    echo "  ⚠️  HTTP response code: $HTTP_CODE"
fi
echo ""

# Recent logs
echo "📜 Recent LMS Logs (last 20 lines):"
echo "---"
journalctl -u lms-website -n 20 --no-pager 2>/dev/null || echo "  (no logs available)"
echo "---"
echo ""

echo "=============================================="
echo "  Diagnostics Complete"
echo "=============================================="
echo ""
echo "💡 Common fixes:"
echo "  1. Restart service: sudo systemctl restart lms-website"
echo "  2. Check logs: sudo journalctl -u lms-website -f"
echo "  3. Fix permissions: sudo chown -R lms:lms $LMS_DIR"
echo "  4. Reset database: sudo rm $DB_FILE && sudo systemctl restart lms-website"
echo ""
