#!/bin/bash
# LMS Complete Setup - Deploy, Configure, Backup, SSL
# Run ONCE: sudo bash complete-setup.sh

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  LMS Complete Setup - Everything in One                      ║"
echo "║  Setting up website, backups, SSL, and more...              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Must run as sudo"
    exit 1
fi

REPO_URL="https://github.com/dadad132/LMS"
INSTALL_DIR="/opt/lms"
WEB_ROOT="/var/www/html/lms"

# ============================================================
# PART 1: DEPLOY
# ============================================================
echo "⏳ PART 1/4: Deploying website..."
if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
fi
git clone "$REPO_URL" "$INSTALL_DIR" > /dev/null 2>&1
cd "$INSTALL_DIR"
chmod +x backup-system.sh restore-from-backup.sh
echo "✓ Repository ready"

# ============================================================
# PART 2: BACKUPS & NGINX
# ============================================================
echo "⏳ PART 2/4: Setting up backups and Nginx..."

# Backups
./backup-system.sh backup > /dev/null
./backup-system.sh schedule > /dev/null 2>&1
echo "✓ Backups configured"

# Nginx
dnf install -y nginx > /dev/null 2>&1
mkdir -p "$WEB_ROOT"
cp -r "$INSTALL_DIR"/* "$WEB_ROOT"/ 2>/dev/null || true
chown -R nginx:nginx "$WEB_ROOT"
chmod -R 755 "$WEB_ROOT"
echo "✓ Nginx installed"

# ============================================================
# PART 3: NGINX CONFIG & FIX
# ============================================================
echo "⏳ PART 3/4: Configuring Nginx..."

# Remove conflicts
rm /etc/nginx/conf.d/default.conf 2>/dev/null || true
rm /etc/nginx/sites-enabled/default 2>/dev/null || true

# Create config
cat > /etc/nginx/conf.d/lms.conf << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/html/lms;
    index index.html index.htm;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    location ~ /\.git { deny all; }
    location ~ /backups { deny all; }
}
EOF

sudo nginx -t > /dev/null 2>&1
systemctl start nginx
systemctl enable nginx > /dev/null 2>&1
echo "✓ Nginx configured and running"

# ============================================================
# PART 4: GETTING INFORMATION
# ============================================================
echo "⏳ PART 4/4: Gathering server information..."

IP_ADDRESS=$(hostname -I | awk '{print $1}')

# ============================================================
# COMPLETE
# ============================================================
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║            ✓✓✓ SETUP COMPLETE ✓✓✓                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Your website is running at:"
echo "   http://$IP_ADDRESS"
echo ""
echo "📋 WHAT'S INSTALLED:"
echo "   ✓ Website deployed to /var/www/html/lms"
echo "   ✓ Nginx web server running"
echo "   ✓ Daily backups at 10 PM"
echo "   ✓ All backups saved locally + GitHub"
echo ""
echo "🔗 DOMAIN SETUP:"
echo "   To make honeypotglobal.co.za work:"
echo "   1. Go to your domain registrar"
echo "   2. Update DNS A record → $IP_ADDRESS"
echo "   3. Wait 5-10 minutes for DNS to update"
echo "   4. Visit https://honeypotglobal.co.za"
echo ""
echo "🔒 HTTPS/SSL (after DNS is working):"
echo "   sudo certbot --nginx -d honeypotglobal.co.za"
echo ""
echo "💾 BACKUP COMMANDS:"
echo "   cd $INSTALL_DIR"
echo "   ./backup-system.sh list         # See all backups"
echo "   ./backup-system.sh backup       # Backup now"
echo "   ./backup-system.sh restore FILE # Restore backup"
echo ""
echo "📖 Full documentation:"
echo "   cat $INSTALL_DIR/BACKUP_RESTORE_README.md"
echo ""
echo "✅ Everything is ready! The website will:"
echo "   - Run automatically"
echo "   - Back up daily at 10 PM"
echo "   - Be restored automatically from backups if needed"
echo ""
