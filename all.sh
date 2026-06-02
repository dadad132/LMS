#!/bin/bash
# JP's Complete LMS Setup - ONE FILE ONLY
# This is all you need. Run once: sudo bash all.sh

set -e

if [ "$EUID" -ne 0 ]; then
    echo "Run with: sudo bash all.sh"
    exit 1
fi

clear
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         JP's Website - Complete Setup (One File)              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# DEPLOY
echo "📥 Deploying website..."
rm -rf /opt/lms-website 2>/dev/null || true
git clone --quiet https://github.com/dadad132/LMS /opt/lms-website 2>/dev/null
cd /opt/lms-website
git checkout --quiet 0928042 2>/dev/null
rm -rf .git

# INSTALL
echo "📦 Installing Python, Nginx..."
dnf install -y python3 python3-pip nginx > /dev/null 2>&1
pip3 install --quiet flask flask-cors 2>/dev/null || true

# FLASK SERVICE
echo "⚙️  Setting up Flask service..."
cat > /etc/systemd/system/lms-website.service << 'SERVICE'
[Unit]
Description=LMS Website
After=network.target
[Service]
Type=simple
User=root
WorkingDirectory=/opt/lms-website
ExecStart=/usr/bin/python3 /opt/lms-website/run.py
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
SERVICE

# NGINX
echo "🌐 Configuring Nginx..."
rm /etc/nginx/conf.d/default.conf 2>/dev/null || true
cat > /etc/nginx/conf.d/lms.conf << 'NGINX'
server {
    listen 80 default_server;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX

# START SERVICES
echo "🚀 Starting services..."
systemctl daemon-reload
systemctl restart lms-website > /dev/null 2>&1
systemctl restart nginx > /dev/null 2>&1
systemctl enable lms-website > /dev/null 2>&1
systemctl enable nginx > /dev/null 2>&1

# BACKUPS
echo "💾 Setting up backups..."
mkdir -p /var/backups/lms
cat > /usr/local/bin/backup-lms << 'BACKUP'
#!/bin/bash
tar -czf /var/backups/lms/backup_$(date +%Y-%m-%d_%H%M%S).tar.gz /opt/lms-website 2>/dev/null
echo "✓ Backup created"
BACKUP
chmod +x /usr/local/bin/backup-lms
/usr/local/bin/backup-lms > /dev/null

echo "0 22 * * * root /usr/local/bin/backup-lms >/dev/null 2>&1" > /etc/cron.d/lms-backup

# GET INFO
sleep 2
IP=$(hostname -I | awk '{print $1}')
DOMAIN="honeypotglobal.co.za"

# DISPLAY
clear
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ SETUP COMPLETE ✅                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 YOUR SERVER IP:"
echo "   $IP"
echo ""
echo "📋 WHAT'S INSTALLED:"
echo "   ✓ Website deployed and running"
echo "   ✓ Nginx web server"
echo "   ✓ Python Flask app"
echo "   ✓ Daily backups at 10 PM"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 TO MAKE DOMAIN WORK:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to: https://www.domains.co.za/"
echo "2. Log in to your account"
echo "3. Select: $DOMAIN"
echo "4. Go to: DNS Records or Manage DNS"
echo "5. Create/Edit A Record:"
echo ""
echo "   Type:  A"
echo "   Name:  @"
echo "   Value: $IP"
echo "   TTL:   3600"
echo ""
echo "6. Save and wait 5-30 minutes"
echo "7. Visit: https://$DOMAIN"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 BACKUP COMMANDS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   backup-lms                  # Backup now"
echo "   ls /var/backups/lms/        # List all backups"
echo "   tar -xzf /var/backups/lms/backup_FILE.tar.gz -C /  # Restore"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Everything is ready!"
echo ""
