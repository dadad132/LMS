#!/bin/bash
# Honeypot Global - One-Click AlmaLinux Installer (with Auto-Backup & Server Persistence)
# Run: sudo bash install.sh

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo:"
    echo "   sudo bash install.sh"
    exit 1
fi

echo "🚀 Starting Honeypot Global Unified Server Installer..."
echo "====================================================="

# Step 1: Clean up old Flask/legacy services if they exist
echo "🧹 Cleaning up legacy services (if any)..."
for SVC in lms-website lms-api; do
    if systemctl is-active --quiet "$SVC" 2>/dev/null; then
        systemctl stop "$SVC" 2>/dev/null || true
    fi
    if systemctl is-enabled --quiet "$SVC" 2>/dev/null; then
        systemctl disable "$SVC" 2>/dev/null || true
    fi
done
rm -f /etc/systemd/system/lms-website.service
systemctl daemon-reload

# Step 2: Install Git, Nginx & Python if they are missing
echo "🔧 Installing system dependencies (git, nginx, python3)..."
if ! command -v git &>/dev/null; then
    echo "👉 Installing git..."
    dnf install -y git &>/dev/null
fi

if ! command -v nginx &>/dev/null; then
    echo "👉 Installing nginx..."
    dnf install -y nginx &>/dev/null
fi

if ! command -v python3 &>/dev/null; then
    echo "👉 Installing python3..."
    dnf install -y python3 &>/dev/null
fi
echo "✅ Dependencies ready."

# Step 3: Deploy the static site & API files to the web root
WEB_ROOT="/var/www/html/lms"

# Migrate existing database/password files to persistent secure directory before web root is wiped/updated
echo "🔄 Migrating any existing database/password files to persistent storage..."
sudo mkdir -p "/var/lib/lms"
sudo chmod 700 "/var/lib/lms"
if [ -f "$WEB_ROOT/team.json" ]; then
    sudo mv "$WEB_ROOT/team.json" "/var/lib/lms/team.json"
    echo "  -> Migrated team.json"
fi
if [ -f "$WEB_ROOT/admin_password.txt" ]; then
    sudo mv "$WEB_ROOT/admin_password.txt" "/var/lib/lms/admin_password.txt"
    echo "  -> Migrated admin_password.txt"
fi

echo "📂 Deploying website files to $WEB_ROOT..."

if [ -f "./index.html" ]; then
    echo "👉 Copying files from current directory..."
    mkdir -p "$WEB_ROOT"
    cp -rf * "$WEB_ROOT/"
else
    echo "👉 Cloning files from GitHub..."
    rm -rf "$WEB_ROOT"
    git clone https://github.com/dadad132/LMS "$WEB_ROOT"
fi

# Fix file ownership and permissions so Nginx can read them
chown -R root:root "$WEB_ROOT"
chmod -R 755 "$WEB_ROOT"
find "$WEB_ROOT" -type f -exec chmod 644 {} \;

# Restore correct SELinux file context so Nginx can serve these files
if command -v restorecon &>/dev/null; then
    restorecon -R "$WEB_ROOT" &>/dev/null
fi
echo "✅ Website files deployed."

# Step 4: Configure the secure Python API Background Daemon
echo "⚙️ Setting up backend API service daemon..."
cat > /etc/systemd/system/lms-api.service << 'SERVICE'
[Unit]
Description=Honeypot Global Server API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/html/lms
ExecStart=/usr/bin/python3 /var/www/html/lms/api.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

chmod 644 /etc/systemd/system/lms-api.service
systemctl daemon-reload
systemctl stop lms-api 2>/dev/null || true
systemctl start lms-api
systemctl enable lms-api &>/dev/null

# Verify the API actually started
sleep 2
if systemctl is-active --quiet lms-api; then
    echo "✅ lms-api.service daemon is active on port 8001."
else
    echo "❌ lms-api.service failed to start. Check logs: journalctl -u lms-api -n 20"
    exit 1
fi

# Step 5: SELinux — allow Nginx to proxy to the local Python backend (AlmaLinux/RHEL)
if command -v getenforce &>/dev/null && [ "$(getenforce)" = "Enforcing" ]; then
    echo "🔒 SELinux is Enforcing — allowing Nginx network connections..."
    setsebool -P httpd_can_network_connect 1
    echo "✅ SELinux: httpd_can_network_connect enabled."
fi

# Step 6: Open HTTP port in firewalld (AlmaLinux has firewalld active by default)
if command -v firewall-cmd &>/dev/null && systemctl is-active --quiet firewalld; then
    echo "🔥 Opening port 80 (HTTP) in firewall..."
    firewall-cmd --permanent --add-service=http &>/dev/null
    firewall-cmd --reload &>/dev/null
    echo "✅ Firewall: port 80 open."
fi

# Step 7: Configure Nginx Server Block with Domain name & API Routing
echo "🌐 Configuring Nginx..."
rm -f /etc/nginx/conf.d/default.conf
rm -f /etc/nginx/conf.d/lms.conf

tee /etc/nginx/conf.d/lms.conf << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name honeypotglobal.co.za www.honeypotglobal.co.za _;

    # Static site files served directly by Nginx (ultra-fast)
    root /var/www/html/lms;
    index index.html;

    # Forward all backend API calls to the local Python daemon
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
echo "✅ Nginx server block and API routing configured."

# Step 8: Test & Restart Nginx
echo "🔄 Starting Nginx web server..."
if nginx -t 2>/dev/null; then
    systemctl restart nginx
    systemctl enable nginx &>/dev/null
    echo "✅ Nginx restarted successfully!"
else
    echo "❌ Nginx configuration test failed!"
    nginx -t
    exit 1
fi

# Step 9: Create the 12-Hour Automated Backup Cron Job
echo "💾 Setting up automated 12-hour server backups..."
BACKUP_DIR="/var/backups/lms"
mkdir -p "$BACKUP_DIR"

cat > /usr/local/bin/backup-lms << 'BACKUP_SCRIPT'
#!/bin/bash
BACKUP_DIR="/var/backups/lms"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")

# Check if team.json exists before backing up
if [ -f "/var/lib/lms/team.json" ] || [ -f "/var/lib/lms/admin_password.txt" ]; then
    tar -czf "$BACKUP_DIR/honeypot_backup_$TIMESTAMP.tar.gz" -C /var/lib/lms team.json admin_password.txt 2>/dev/null
    echo "✅ Backup saved: $BACKUP_DIR/honeypot_backup_$TIMESTAMP.tar.gz"
else
    echo "⚠️ Nothing to backup yet."
fi
BACKUP_SCRIPT

chmod +x /usr/local/bin/backup-lms
echo "0 */12 * * * root /usr/local/bin/backup-lms >/dev/null 2>&1" > /etc/cron.d/lms-backup
echo "✅ Automated backup scheduled every 12 hours."

# Step 10: Final health check
echo ""
echo "🔍 Running final health check..."
sleep 1
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001/api/auth-status 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
    echo "✅ API health check passed (HTTP $API_STATUS)"
else
    echo "⚠️  API health check returned HTTP $API_STATUS — check: journalctl -u lms-api -n 20"
fi

# Step 11: Print Deployment Summary
IP=$(hostname -I | awk '{print $1}')
echo ""
echo "═══════════════════════════════════════════════════════"
echo " 🎉 INSTALLATION COMPLETE WITH AUTO-BACKUPS!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo " 🌐 Domain:    http://honeypotglobal.co.za"
echo " 💻 Server IP: http://$IP"
echo ""
echo " 💾 Backups Directory: $BACKUP_DIR/"
echo " 💡 Runs automatically every 12 hours."
echo "    Run manually at any time with: backup-lms"
echo ""
echo " 🚀 Edits made in the Admin Panel sync to disk"
echo "    and persist for all global visitors!"
echo ""
echo "═══════════════════════════════════════════════════════"
